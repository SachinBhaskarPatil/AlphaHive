"""Agent Brain — roster, memory, autonomy events."""
import asyncio
import datetime as dt

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)

MARKET_ROVER_AGENTS = [
    {"id": "A", "role": "Portfolio Manager", "emoji": "📁", "platform": "Market-Rover",
     "model": "gemini-3-flash-preview", "goal": "Read and process user's stock portfolio from CSV.",
     "tools": ["read_portfolio", "calculate_portfolio_risk_tool"], "status": "Active"},
    {"id": "B", "role": "Market Impact Strategist", "emoji": "🌐", "platform": "Market-Rover",
     "model": "gemini-3-flash-preview", "goal": "Monitor macro events, global cues, corporate actions & news.",
     "tools": ["search_market_news", "get_global_cues", "get_corporate_actions"], "status": "Active"},
    {"id": "G", "role": "Institutional Shadow Analyst", "emoji": "🕵️", "platform": "Market-Rover",
     "model": "gemini-3-flash-preview", "goal": "Detect accumulation/distribution traps.",
     "tools": ["analyze_sector_flow_tool", "fetch_block_deals_tool"], "status": "Active"},
    {"id": "H", "role": "Traditional Timing Analyst", "emoji": "🪔", "platform": "Market-Rover",
     "model": "gemini-3-flash-preview", "goal": "Subha Muhurtham and seasonal timing windows.",
     "tools": ["fetch_subha_muhurtham_tool", "analyze_traditional_calendar_tool"], "status": "Active"},
]


def _memory_stats(memories: list[dict]) -> dict:
    if not memories:
        return {}
    completed = [m for m in memories if m.get("outcome") and m.get("outcome") != "Pending"]
    directional = [m for m in completed if "Neutral" not in str(m.get("outcome", ""))]
    wins = [m for m in directional if "Success" in str(m.get("outcome", ""))]
    pending = [m for m in memories if not m.get("outcome") or m.get("outcome") == "Pending"]
    return {
        "total": len(memories),
        "validated": len(completed),
        "directional": len(directional),
        "neutral": len(completed) - len(directional),
        "pending": len(pending),
        "wins": len(wins),
        "win_rate_pct": round(len(wins) / len(directional) * 100, 1) if directional else None,
        "source": memories[0].get("source", "unknown"),
    }


def _stance_direction(stance: str) -> str:
    s = str(stance or "").upper()
    if any(k in s for k in ("ACCUMULATION", "BUY", "BULL")):
        return "buy"
    if any(k in s for k in ("DISTRIBUTION", "SELL", "BEAR", "WARNING", "TRAP")):
        return "sell"
    return "neutral"


def _evaluate_db_row(row) -> dict:
    """Map LTM row → Brain UI memory shape; judge outcome vs price when old enough."""
    ticker = str(row["ticker"] or "")
    stance = str(row["stance"] or "NEUTRAL")
    analysis_date = row["analysis_date"]
    if hasattr(analysis_date, "date"):
        pred_date = analysis_date.date() if isinstance(analysis_date, dt.datetime) else analysis_date
        date_str = pred_date.isoformat()
    else:
        date_str = str(analysis_date)[:10]
        try:
            pred_date = dt.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            pred_date = dt.date.today()

    direction = _stance_direction(stance)
    outcome = "Pending"
    confidence = "High"

    if direction == "neutral":
        outcome = "Neutral (No Direction)"
    elif (dt.date.today() - pred_date).days >= 3:
        try:
            import yfinance as yf

            hist = yf.Ticker(ticker).history(start=pred_date.isoformat(), end=dt.date.today().isoformat())
            if hist is not None and not hist.empty and len(hist) > 1:
                price_then = float(hist["Close"].iloc[0])
                price_now = float(hist["Close"].iloc[-1])
                if price_then > 0:
                    moved_up = price_now > price_then
                    if direction == "buy":
                        outcome = "Success" if moved_up else "Failed"
                    else:
                        outcome = "Success" if not moved_up else "Failed"
        except Exception as e:
            logger.debug("Outcome eval failed for %s: %s", ticker, e)
            outcome = "Pending"

    return {
        "date": date_str,
        "ticker": ticker,
        "signal": stance,
        "confidence": confidence,
        "outcome": outcome,
        "logic": (row["logic_summary"] if "logic_summary" in row.keys() else "") or "",
        "source": "db",
    }


def _load_file_memories() -> list[dict]:
    from rover_tools.memory_tool import evaluate_pending_predictions, read_memory

    try:
        evaluate_pending_predictions()
    except Exception as ev:
        logger.warning("evaluate_pending_predictions failed: %s", ev)
    memories = read_memory() or []
    for m in memories:
        m["source"] = "file"
    return memories


@router.get("/agents")
async def list_agents(platform: str | None = None):
    all_agents = MARKET_ROVER_AGENTS
    agents = all_agents
    if platform and platform != "All":
        agents = [a for a in all_agents if a["platform"] == platform]
    # Counts always reflect the global roster so the summary cards stay stable
    # regardless of the active platform filter.
    return {
        "agents": agents,
        "counts": {
            "total": len(all_agents),
            "market_rover": len(MARKET_ROVER_AGENTS),
        },
    }


@router.get("/memory")
async def get_memory(user_handle: str | None = Query(None)):
    """Active Memory + win rate from Postgres LTM (fallback: legacy memory.json)."""
    try:
        from src.utils.db_manager import db

        memories: list[dict] = []
        if await db.try_connect():
            rows = await db.list_memories(user_handle=user_handle or None, limit=50)
            if rows:
                memories = await asyncio.to_thread(
                    lambda: [_evaluate_db_row(r) for r in rows]
                )

        if not memories:
            memories = await asyncio.to_thread(in_repo_root(_load_file_memories))

        return {"memories": memories, "stats": _memory_stats(memories)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/autonomy")
async def get_autonomy_events():
    try:
        from utils.autonomy_logger import read_autonomy_events

        events = await asyncio.to_thread(in_repo_root(read_autonomy_events))
        return {"events": events}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
