"""
Profile routes — full Investor Profiler API.
"""
import asyncio
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.utils.db_manager import db
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)


class ProfileUpdateRequest(BaseModel):
    user_handle: str
    persona: str | None = None
    scores: dict | None = None
    brands: list | None = None
    growth_brands: list | None = None
    alpha_brands: list | None = None
    onboarding_complete: bool | None = None


class PersonaAnalysisRequest(BaseModel):
    q1: int
    q2: int
    q3: int
    user_handle: str | None = None


class SmartPortfolioRequest(BaseModel):
    user_handle: str
    brands: list[str] = []
    growth_brands: list[str] = []
    alpha_brands: list[str] = []
    save: bool = True


class ValidateHoldingsRequest(BaseModel):
    holdings: list[dict[str, Any]]


def _um():
    from utils.user_manager import UserProfileManager
    return UserProfileManager()


def _persona_from_scores(q1: int, q2: int, q3: int) -> str:
    total = q1 + q2 + q3
    if total <= 4:
        return "The Preserver"
    if total <= 6:
        return "The Defender"
    if total <= 7:
        return "The Compounder"
    return "The Hunter"


async def _sync_persona_db(user_handle: str, persona: str) -> None:
    """Best-effort Postgres sync — never blocks JSON-based profile flow."""
    if await db.try_connect():
        await db.set_user_persona(user_handle, persona)


@router.post("")
async def update_profile(request: ProfileUpdateRequest):
    try:
        if request.persona:
            await _sync_persona_db(request.user_handle, request.persona)

        def _save():
            um = _um()
            existing = um.get_user_profile(request.user_handle) or {}
            persona = request.persona or existing.get("persona", "Not Set")
            scores = request.scores if request.scores is not None else existing.get("scores", {})
            brands = request.brands if request.brands is not None else existing.get("brands", [])
            onboarding = (
                request.onboarding_complete
                if request.onboarding_complete is not None
                else existing.get("onboarding_complete", False)
            )
            um.save_user_profile(
                request.user_handle, persona, scores, brands, onboarding_complete=onboarding
            )
            if request.growth_brands is not None:
                prof = um.get_user_profile(request.user_handle) or {}
                prof["growth_brands"] = request.growth_brands
                um.profiles[request.user_handle] = prof
                um._save_profiles()
            if request.alpha_brands is not None:
                prof = um.get_user_profile(request.user_handle) or {}
                prof["alpha_brands"] = request.alpha_brands
                um.profiles[request.user_handle] = prof
                um._save_profiles()
            return um.get_user_profile(request.user_handle)

        profile = await asyncio.to_thread(in_repo_root(_save))
        return {"status": "success", "profile": profile}
    except Exception as e:
        logger.error("update_profile failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/analyze")
async def analyze_persona(request: PersonaAnalysisRequest):
    persona = _persona_from_scores(request.q1, request.q2, request.q3)
    total = request.q1 + request.q2 + request.q3
    scores = {"q1": request.q1, "q2": request.q2, "q3": request.q3}

    if request.user_handle:
        def _persist():
            _um().save_user_profile(
                request.user_handle, persona, scores, brands=[], onboarding_complete=False
            )
        await asyncio.to_thread(in_repo_root(_persist))
        await _sync_persona_db(request.user_handle, persona)

    return {"persona": persona, "score": total, "scores": scores}


@router.post("/{user_handle}/reset")
async def reset_profile(user_handle: str):
    try:
        await asyncio.to_thread(in_repo_root(_um().reset_profiler_progress), user_handle)
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/{user_handle}/complete-onboarding")
async def complete_onboarding(user_handle: str):
    try:
        await asyncio.to_thread(in_repo_root(_um().mark_onboarding_complete), user_handle)
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/meta/brands")
async def get_brand_metadata(category: str = "Nifty 50"):
    try:
        def _meta():
            from rover_tools.ticker_resources import (
                NIFTY_50_SECTOR_MAP,
                NIFTY_NEXT_50_SECTOR_MAP,
                NIFTY_MIDCAP_SECTOR_MAP,
                brand_icon_data_url,
                get_brand_meta,
                get_common_tickers,
                parse_ticker_entry,
            )
            sector_map = {
                "Nifty 50": NIFTY_50_SECTOR_MAP,
                "Nifty Next 50": NIFTY_NEXT_50_SECTOR_MAP,
                "Midcap": NIFTY_MIDCAP_SECTOR_MAP,
            }.get(category, NIFTY_50_SECTOR_MAP)
            brands = []
            for entry in get_common_tickers(category):
                t = parse_ticker_entry(entry)
                meta = get_brand_meta(t, category=category, sector=sector_map.get(t, "Other"))
                color = meta.get("color", "#334155")
                brands.append({
                    "ticker": t,
                    "ticker_short": t.split(".")[0],
                    "name": meta.get("name", t.split(".")[0]),
                    "sector": sector_map.get(t, "Other"),
                    "color": color,
                    "logo": brand_icon_data_url(t, color),
                })
            sectors = sorted({b["sector"] for b in brands if b["sector"] != "Other"})
            return {"category": category, "brands": brands, "sectors": sectors}

        return await asyncio.to_thread(in_repo_root(_meta))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/smart-portfolio")
async def generate_smart_portfolio(body: SmartPortfolioRequest):
    try:
        def _gen():
            from rover_tools.analytics.investor_profiler import InvestorProfiler, InvestorPersona
            import pandas as pd
            from utils.portfolio_manager import PortfolioManager

            um = _um()
            profile = um.get_user_profile(body.user_handle) or {}
            persona_name = profile.get("persona", "The Defender")
            persona = InvestorPersona.DEFENDER
            for p in InvestorPersona:
                if p.value == persona_name:
                    persona = p
                    break

            profiler = InvestorProfiler()
            holdings = profiler.generate_smart_portfolio(
                persona,
                user_picked_brands=body.brands,
                user_growth_brands=body.growth_brands,
                user_alpha_brands=body.alpha_brands,
            )
            flags = profiler.validator.validate_holdings(holdings)
            result = {"holdings": holdings, "validation": flags, "persona": persona.value}

            if body.save and holdings:
                pm = PortfolioManager(body.user_handle)
                pf_name = f"Smart {persona.value} Portfolio"
                for name in list(pm.get_portfolio_names()):
                    if name.startswith("Smart ") and name.endswith(" Portfolio"):
                        pm.delete_portfolio(name)
                df = pd.DataFrame(holdings)
                pm.save_portfolio(pf_name, df)
                um.mark_onboarding_complete(body.user_handle)
                prof = um.get_user_profile(body.user_handle) or {}
                prof["last_validation"] = flags
                um.profiles[body.user_handle] = prof
                um._save_profiles()
                result["saved_portfolio"] = pf_name
            return result

        return await asyncio.to_thread(in_repo_root(_gen))
    except Exception as e:
        logger.error("smart_portfolio failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/validate-holdings")
async def validate_holdings(body: ValidateHoldingsRequest):
    """Re-run health checks on saved holdings (used when reloading a completed profile)."""
    try:
        def _validate():
            from rover_tools.analytics.investor_profiler import InvestorProfiler

            normalized = []
            for h in body.holdings:
                sym = h.get("Symbol") or h.get("symbol")
                if sym:
                    normalized.append({"Symbol": str(sym)})
            if not normalized:
                return {}
            return InvestorProfiler().validator.validate_holdings(normalized)

        validation = await asyncio.to_thread(in_repo_root(_validate))
        return {"validation": validation}
    except Exception as e:
        logger.error("validate_holdings failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/{user_handle}/simulation")
async def portfolio_simulation(user_handle: str, portfolio_name: str = "Smart The Defender Portfolio"):
    try:
        def _sim():
            import pandas as pd
            import yfinance as yf
            from utils.portfolio_manager import PortfolioManager

            pm = PortfolioManager(user_handle)
            df = pm.get_portfolio(portfolio_name)
            if df is None or df.empty:
                return {"error": "Portfolio not found"}

            ticker_weights: dict[str, float] = {}
            if "Weight (%)" in df.columns:
                for _, row in df.iterrows():
                    sym = str(row["Symbol"])
                    if not sym.endswith(".NS") and not sym.endswith(".BO"):
                        sym = f"{sym}.NS"
                    ticker_weights[sym] = ticker_weights.get(sym, 0.0) + float(row["Weight (%)"]) / 100.0
            else:
                total_qty = df["Quantity"].sum() if "Quantity" in df.columns else len(df)
                for _, row in df.iterrows():
                    sym = str(row["Symbol"])
                    if not sym.endswith(".NS") and not sym.endswith(".BO"):
                        sym = f"{sym}.NS"
                    qty = row.get("Quantity", 1)
                    ticker_weights[sym] = ticker_weights.get(sym, 0.0) + (qty / total_qty if total_qty else 1 / len(df))

            unique_tickers = list(ticker_weights.keys())
            if not unique_tickers:
                return {"error": "No tickers in portfolio"}

            raw = yf.download(unique_tickers + ["^NSEI"], period="1y", progress=False, auto_adjust=True)
            if raw.empty:
                return {"error": "No price data"}

            close = raw["Close"] if "Close" in raw.columns else raw
            if isinstance(close.columns, pd.MultiIndex):
                close.columns = close.columns.droplevel(0)

            bench_col = "^NSEI" if "^NSEI" in close.columns else None
            bench = close[bench_col].pct_change().fillna(0) if bench_col else pd.Series(0, index=close.index)
            bench_cum = (1 + bench).cumprod()

            valid = [t for t in unique_tickers if t in close.columns]
            if not valid:
                return {"error": "Could not fetch data for selected stocks"}

            stock_returns = close[valid].pct_change().fillna(0)
            port_ret = pd.Series(0.0, index=stock_returns.index)
            total_w = 0.0
            for t in valid:
                w = ticker_weights.get(t, 0.0)
                total_w += w
                port_ret += stock_returns[t] * w
            if total_w > 0:
                port_ret = port_ret / total_w
            port_cum = (1 + port_ret).cumprod()

            port_total = float((port_cum.iloc[-1] - 1) * 100)
            bench_total = float((bench_cum.iloc[-1] - 1) * 100)
            dates = [d.strftime("%Y-%m-%d") for d in port_cum.index]
            return {
                "portfolio_return_1y_pct": round(port_total, 2),
                "benchmark_return_1y_pct": round(bench_total, 2),
                "delta_vs_index_pct": round(port_total - bench_total, 2),
                "benchmark": "Nifty 50",
                "series": {
                    "dates": dates,
                    "portfolio": [round(float(v), 4) for v in port_cum.tolist()],
                    "benchmark": [round(float(v), 4) for v in bench_cum.reindex(port_cum.index).ffill().tolist()],
                },
            }

        return await asyncio.to_thread(in_repo_root(_sim))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/{user_handle}/status")
async def get_profile_status(user_handle: str):
    try:
        status = await asyncio.to_thread(in_repo_root(_um().get_profile_status), user_handle)
        profile = await asyncio.to_thread(in_repo_root(_um().get_user_profile), user_handle)
        return {"status": status, "profile": profile}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/{user_handle}")
async def get_profile(user_handle: str):
    try:
        db_persona = None
        if await db.try_connect():
            db_persona = await db.get_user_persona(user_handle)

        def _load():
            um = _um()
            profile = um.get_user_profile(user_handle)
            status = um.get_profile_status(user_handle)
            return profile, status

        profile, status = await asyncio.to_thread(in_repo_root(_load))
        persona = "Not Set"
        if profile and profile.get("persona"):
            persona = profile["persona"]
        elif db_persona and db_persona not in ("Neutral", "Not Set"):
            persona = db_persona

        return {
            "user_handle": user_handle,
            "persona": persona,
            "profile": profile,
            "status": {
                "exists": status.get("exists", False),
                "needs_update": status.get("needs_update", True),
                "onboarding_complete": status.get("onboarding_complete", False),
                "days_old": status.get("days_old", 9999),
            },
        }
    except Exception as e:
        logger.error("get_profile failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
