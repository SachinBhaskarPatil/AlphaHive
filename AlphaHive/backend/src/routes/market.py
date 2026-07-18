"""Market data routes — analysis bundle, tickers, quotes, performance stars."""
import asyncio
from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from src.services.market_analysis import run_ticker_analysis
from src.utils.json_sanitize import json_safe
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)


class CorrelationRequest(BaseModel):
    tickers: list[str]


class RebalanceRequest(BaseModel):
    tickers: list[str]
    quantities: list[float] | None = None
    mode: str = "safety"


class PortfolioVisualsRequest(BaseModel):
    tickers: list[str]
    holdings: list[dict[str, Any]] | None = None


def _normalize_tickers(raw: list[str]) -> list[str]:
    from utils.security import sanitize_ticker

    out: list[str] = []
    for t in raw:
        s = (t or "").strip()
        if not s:
            continue
        candidate = f"{s.upper()}.NS" if "." not in s else s.upper()
        clean = sanitize_ticker(candidate)
        if clean and clean not in out:
            out.append(clean)
    return out


@router.get("/analysis/{ticker}")
async def get_ticker_analysis(
    ticker: str,
    lookback: str = Query("5y+ (Max)"),
    exclude_outliers: bool = False,
):
    try:
        result = await asyncio.to_thread(
            in_repo_root(run_ticker_analysis), ticker, lookback, exclude_outliers
        )
        return result
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        logger.error("analysis failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/tickers")
async def list_tickers(category: str = "Nifty 50"):
    try:
        def _load():
            from rover_tools.ticker_resources import (
                NIFTY_50_SECTOR_MAP,
                NIFTY_NEXT_50_SECTOR_MAP,
                NIFTY_MIDCAP_SECTOR_MAP,
                get_common_tickers,
                get_ticker_name,
                parse_ticker_entry,
            )
            sector_map = {
                "Nifty 50": NIFTY_50_SECTOR_MAP,
                "Nifty Next 50": NIFTY_NEXT_50_SECTOR_MAP,
                "Midcap": NIFTY_MIDCAP_SECTOR_MAP,
                "All": {},
            }.get(category, NIFTY_50_SECTOR_MAP)
            return {
                "category": category,
                "tickers": [
                    {
                        "ticker": parse_ticker_entry(entry),
                        "name": get_ticker_name(entry),
                        "sector": sector_map.get(parse_ticker_entry(entry), "Other"),
                    }
                    for entry in get_common_tickers(category)
                ],
            }

        return await asyncio.to_thread(in_repo_root(_load))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/stars")
async def performance_stars(category: str = "Nifty 50", period: str = "1y", top_n: int = 5):
    try:
        from rover_tools.analytics.win_rate import get_performance_stars

        stars = await asyncio.to_thread(in_repo_root(get_performance_stars), category, period, top_n)
        return {"stars": stars, "category": category, "period": period}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/quotes")
async def get_quotes(tickers: str):
    try:
        ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]

        def _quotes():
            from rover_tools.market_data import MarketDataFetcher

            fetcher = MarketDataFetcher()
            out = {}
            for t in ticker_list:
                try:
                    price = fetcher.fetch_ltp(t)
                    out[t] = float(price) if price is not None else None
                except Exception:
                    out[t] = None
            return out

        return await asyncio.to_thread(in_repo_root(_quotes))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/snapshot/{ticker}/pdf")
async def snapshot_pdf(ticker: str):
    try:
        def _pdf():
            from rover_tools.visualizer_tool import run_snapshot_logic

            result = run_snapshot_logic(ticker)
            if isinstance(result, str):
                raise ValueError(result)
            return result["pdf_buffer"]

        buf = await asyncio.to_thread(in_repo_root(_pdf))
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{ticker}_report.pdf"'},
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/analytics/correlation")
async def correlation_matrix(body: CorrelationRequest):
    try:
        tickers = _normalize_tickers(body.tickers)
        if len(tickers) < 2:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Enter at least 2 stock symbols (e.g. TCS, INFY or TCS.NS, RELIANCE.NS).",
                },
            )

        def _corr():
            from rover_tools.analytics.portfolio_engine import AnalyticsPortfolio

            engine = AnalyticsPortfolio()
            matrix = engine.calculate_correlation_matrix(tickers)
            if matrix.empty:
                return None
            return matrix.round(3).to_dict()

        result = await asyncio.to_thread(in_repo_root(_corr))
        if not result:
            return JSONResponse(
                status_code=400,
                content={"error": "Could not fetch price data for those symbols. Check tickers and try again."},
            )
        return json_safe({"matrix": result, "tickers": tickers})
    except Exception as e:
        logger.error("correlation failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/analytics/rebalance")
async def rebalance_analysis(body: RebalanceRequest):
    try:
        tickers = _normalize_tickers(body.tickers)
        if not tickers:
            return JSONResponse(status_code=400, content={"error": "No valid tickers provided."})

        quantities = list(body.quantities or [])
        while len(quantities) < len(tickers):
            quantities.append(10.0)

        mode = body.mode if body.mode in ("safety", "growth") else "safety"

        def _rebal():
            from rover_tools.market_analytics import MarketAnalyzer

            portfolio_data = [
                {"symbol": t, "value": float(q)}
                for t, q in zip(tickers, quantities[: len(tickers)])
            ]
            analyzer = MarketAnalyzer()
            result, warnings = analyzer.analyze_rebalance(portfolio_data, mode=mode)
            if result.empty:
                return {"rows": [], "warnings": warnings}
            rows = result.to_dict(orient="records")
            for row in rows:
                for key in ("current_weight", "target_weight", "volatility", "return"):
                    if key in row and row[key] is not None:
                        try:
                            row[key] = round(float(row[key]), 4)
                        except (TypeError, ValueError):
                            row[key] = None
            return json_safe({"rows": rows, "warnings": warnings, "mode": mode})

        payload = await asyncio.to_thread(in_repo_root(_rebal))
        return json_safe(payload)
    except Exception as e:
        logger.error("rebalance failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/analytics/portfolio-visuals")
async def portfolio_visuals(body: PortfolioVisualsRequest):
    try:
        tickers = _normalize_tickers(body.tickers)
        if not tickers:
            return JSONResponse(status_code=400, content={"error": "No valid tickers provided."})

        def _build():
            from src.services.portfolio_visuals import build_portfolio_visuals

            return build_portfolio_visuals(tickers, body.holdings)

        return await asyncio.to_thread(in_repo_root(_build))
    except Exception as e:
        logger.error("portfolio_visuals failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
