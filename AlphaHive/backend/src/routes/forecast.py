"""Forecast routes — price forecast tracker + agent stance history."""
import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.utils.db_manager import db
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)


class ForecastSaveRequest(BaseModel):
    user_handle: str
    ticker: str
    current_price: float
    target_price: float
    target_date: str = "2026-12-31"
    strategy: str = "median"
    confidence: str = "Medium"
    years_tested: int = 5


class ForecastDeleteRequest(BaseModel):
    user_handle: str
    timestamps: list[str]


@router.get("/{user_handle}")
async def get_forecasts(user_handle: str, live: bool = False):
    try:
        history = await asyncio.to_thread(
            in_repo_root(__import__("utils.forecast_tracker", fromlist=["get_forecast_history"]).get_forecast_history),
            user_handle,
        )
        result = {"forecasts": history}

        if live and history:
            tickers = list({h["ticker"] for h in history})
            quotes = await asyncio.to_thread(in_repo_root(_fetch_quotes), tickers)
            enriched = []
            for h in history:
                row = dict(h)
                curr = quotes.get(h["ticker"])
                row["current_price_live"] = curr
                if curr and h.get("current_price"):
                    row["change_pct"] = round((curr - h["current_price"]) / h["current_price"] * 100, 2)
                else:
                    row["change_pct"] = None
                enriched.append(row)
            result["forecasts"] = enriched

        result["stances"] = []
        if await db.try_connect():
            stances = await db.get_forecast_history(user_handle)
            result["stances"] = [
                {**dict(r), "analysis_date": r["analysis_date"].isoformat() if r.get("analysis_date") else None}
                for r in stances
            ]
        return result
    except Exception as e:
        logger.error("get_forecasts failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("")
async def save_forecast(body: ForecastSaveRequest):
    try:
        from utils.forecast_tracker import save_forecast

        await asyncio.to_thread(
            in_repo_root(save_forecast),
            body.ticker,
            body.current_price,
            body.target_price,
            body.target_date,
            body.strategy,
            body.confidence,
            body.years_tested,
            body.user_handle,
        )
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/{user_handle}/delete")
async def delete_forecasts(user_handle: str, body: ForecastDeleteRequest):
    try:
        from utils.forecast_tracker import delete_forecasts

        ok = await asyncio.to_thread(in_repo_root(delete_forecasts), body.timestamps, user_handle)
        if not ok:
            return JSONResponse(status_code=400, content={"error": "Nothing deleted"})
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/generate")
async def generate_and_save(body: ForecastSaveRequest):
    """Analyze ticker and save forecast (untracked portfolio flow)."""
    try:
        from src.services.market_analysis import run_ticker_analysis
        from utils.forecast_tracker import save_forecast

        def _run():
            analysis = run_ticker_analysis(body.ticker)
            scenarios = analysis.get("forecast_scenarios") or {}
            fc = analysis.get("forecast") or {}
            ltp = analysis["ltp"]
            # The forecast object exposes "forecast_price" (not "target_price"),
            # and strategy/confidence/years live on forecast_scenarios — mirror the
            # Market Analysis "Save forecast" flow so tracked holdings get real data.
            target = (scenarios.get("baseline") or {}).get("price") or fc.get("forecast_price") or ltp
            strategy = scenarios.get("active_name") or "Median Strategy"
            confidence = scenarios.get("confidence") or "Medium"
            years_tested = len(scenarios.get("years_tested") or []) or 5
            save_forecast(
                analysis["ticker"],
                ltp,
                target,
                body.target_date,
                strategy,
                confidence,
                years_tested,
                body.user_handle,
            )
            return analysis

        analysis = await asyncio.to_thread(in_repo_root(_run))
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


def _fetch_quotes(tickers: list[str]) -> dict:
    """Fetch live prices via the shared fetcher (NSE/BSE fallback + retry).

    Using ``MarketDataFetcher.fetch_ltp`` avoids the modern-yfinance gotcha where
    ``yf.download`` returns MultiIndex columns, which made ``float(data["Close"])``
    raise for every ticker and left the tracker with no live prices.
    """
    from rover_tools.market_data import MarketDataFetcher

    fetcher = MarketDataFetcher()
    out: dict[str, float | None] = {}
    for t in tickers:
        try:
            price = fetcher.fetch_ltp(t)
            out[t] = float(price) if price is not None else None
        except Exception as e:
            logger.warning("live quote fetch failed for %s: %s", t, e)
            out[t] = None
    return out
