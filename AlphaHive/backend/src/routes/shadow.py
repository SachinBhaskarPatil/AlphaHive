"""Shadow live tools + historical stance signals."""
import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from src.utils.db_manager import db
from src.utils.json_sanitize import json_safe
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)

_MARKET_SHADOW_QUERY = """
    SELECT ticker, stance, logic_summary, analysis_date, user_id
    FROM (
        SELECT DISTINCT ON (ticker)
            ticker, stance, logic_summary, analysis_date, user_id
        FROM public.agent_memory_ltm
        WHERE ticker != 'PORTFOLIO'
        ORDER BY ticker, analysis_date DESC
    ) latest
    ORDER BY analysis_date DESC
    LIMIT 30
"""

_USER_SHADOW_QUERY = """
    SELECT ticker, stance, logic_summary, analysis_date
    FROM (
        SELECT DISTINCT ON (ticker)
            ticker, stance, logic_summary, analysis_date
        FROM public.agent_memory_ltm
        WHERE user_id = $1
          AND ticker != 'PORTFOLIO'
        ORDER BY ticker, analysis_date DESC
    ) latest
    ORDER BY analysis_date DESC
    LIMIT 50
"""


@router.get("/sectors")
async def list_sectors():
    try:
        from rover_tools.shadow_tools import list_nifty50_sectors

        return {"sectors": await asyncio.to_thread(in_repo_root(list_nifty50_sectors))}
    except Exception as e:
        logger.error("list_sectors failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/live/sector-flow")
async def sector_flow():
    try:
        from rover_tools.shadow_tools import analyze_sector_flow

        df = await asyncio.to_thread(in_repo_root(analyze_sector_flow))
        if df is None or df.empty:
            return {"sectors": [], "message": "No sector data"}
        return json_safe({"sectors": df.to_dict(orient="records")})
    except Exception as e:
        logger.error("sector_flow failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/live/trap-indicator")
async def trap_indicator():
    """FII index-futures positioning from NSE (via nselib + xlrd)."""
    try:
        from rover_tools.shadow_tools import get_trap_indicator

        return await asyncio.to_thread(in_repo_root(get_trap_indicator))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/live/sector/{sector_name}/accumulation")
async def sector_accumulation(sector_name: str):
    try:
        from rover_tools.shadow_tools import get_sector_stocks_accumulation

        df = await asyncio.to_thread(in_repo_root(get_sector_stocks_accumulation), sector_name)
        if df is None or df.empty:
            return {"stocks": []}
        return json_safe({"stocks": df.to_dict(orient="records")})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/live/stock/{ticker}/scan")
async def stock_scan(ticker: str):
    try:
        from rover_tools.shadow_tools import detect_silent_accumulation, fetch_block_deals

        def _scan():
            sym = ticker.strip().upper()
            if not sym.endswith(('.NS', '.BO')) and not sym.startswith('^'):
                sym = f"{sym}.NS"
            accumulation = detect_silent_accumulation(sym)
            blocks = fetch_block_deals(sym) or []
            return {
                "ticker": sym,
                "accumulation": accumulation,
                "block_deals": blocks,
            }

        return await asyncio.to_thread(in_repo_root(_scan))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/market")
async def get_market_shadow():
    try:
        if not await db.try_connect():
            return {"shadow_signals": []}
        async with db.pool.acquire() as conn:
            rows = await conn.fetch(_MARKET_SHADOW_QUERY)
        result = []
        for r in rows:
            item = dict(r)
            if item.get("analysis_date"):
                item["analysis_date"] = item["analysis_date"].isoformat()
            result.append(item)
        return {"shadow_signals": result}
    except Exception as e:
        logger.error("get_market_shadow failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/{user_handle}")
async def get_user_shadow(user_handle: str):
    try:
        if not await db.try_connect():
            return {"shadow_signals": []}
        async with db.pool.acquire() as conn:
            rows = await conn.fetch(_USER_SHADOW_QUERY, user_handle)
        result = []
        for r in rows:
            item = dict(r)
            if item.get("analysis_date"):
                item["analysis_date"] = item["analysis_date"].isoformat()
            result.append(item)
        return {"shadow_signals": result}
    except Exception as e:
        logger.error("get_user_shadow failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
