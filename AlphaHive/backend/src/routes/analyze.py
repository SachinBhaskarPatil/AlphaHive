"""
Analyze route — LangGraph portfolio intelligence run.
POST /api/analyze  →  runs the 10-node parallel graph and returns taskId.
GET  /api/analyze/status/{taskId} → returns result or pending status.
"""
import os
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from src.alphahive_graph import create_alphahive_graph
from src.utils.logger import get_logger
from src.utils.db_manager import db
from src.utils.json_sanitize import json_safe

router = APIRouter()
logger = get_logger(__name__)

# Graph is compiled once at import time
_graph = create_alphahive_graph()

# In-memory task store (should be Redis for horizontal scaling, but using global dict for now)
active_tasks = {}

class AnalysisRequest(BaseModel):
    tickers: List[str]
    discoverable_handle: str
    holdings: List[dict] | None = None


@router.post("")
async def analyze_portfolio(request: AnalysisRequest):
    """Submits a batch portfolio analysis asynchronously."""
    from src.routes.market import _normalize_tickers

    tickers = _normalize_tickers(request.tickers)
    if not tickers:
        return JSONResponse(status_code=400, content={"error": "No valid tickers provided."})

    task_id = "task_" + os.urandom(8).hex()
    active_tasks[task_id] = {"status": "pending"}

    async def run_analysis(tickers, handle, holdings, t_id):
        try:
            initial_state = {
                "tickers":              tickers,
                "discoverable_handle":  handle,
                "session_id":           t_id,
                "celebrations":         [],
                "feedback_prompts":     [],
                "sentiment_data":       [],
                "technical_data":       [],
                "traditional_insights": [],
                "dividend_data":        [],
                "sector_data":          [],
                "errors":               []
            }
            config = {"configurable": {"thread_id": handle}}
            final_state = await _graph.ainvoke(initial_state, config)

            # Store in DB if needed (e.g. for shadow discovery)
            try:
                if await db.try_connect():
                    await db.store_memory(handle, "PORTFOLIO", "COMPLETED", f"Analyzed {len(tickers)} tickers.")
            except Exception as e:
                logger.error(f"Failed to store memory in DB: {e}")

            saved_reports = {}
            try:
                from src.services.report_export import save_analysis_report
                final_state["tickers"] = tickers
                saved_reports = await asyncio.to_thread(
                    save_analysis_report, handle, final_state, holdings
                )
            except Exception as e:
                logger.warning(f"Report export failed for {t_id}: {e}")

            # Sanitize before storing: the graph state can carry numpy/pandas
            # scalars and NaN/Inf from the analytics tools, which would make the
            # status endpoint's JSON serialization raise a 500 on poll.
            active_tasks[t_id] = json_safe({
                "status": "completed",
                "result": final_state,
                "saved_reports": saved_reports,
            })
        except Exception as e:
            logger.error(f"Analysis failed for {t_id}: {e}", exc_info=True)
            active_tasks[t_id] = {"status": "failed", "error": str(e)}

    # Fire and forget
    asyncio.create_task(run_analysis(tickers, request.discoverable_handle, request.holdings, task_id))

    return {"task_id": task_id, "status": "pending"}


@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Poll for the result of an analysis task."""
    task = active_tasks.get(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    return task
