"""System health metrics — workflow, engagement, errors."""
import asyncio
import json
from pathlib import Path

import pandas as pd
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from src.utils.logger import get_logger
from src.utils.repo_root import get_repo_root, repo_root_cwd

router = APIRouter()
logger = get_logger(__name__)


def _load_jsonl(prefix: str) -> list[dict]:
    with repo_root_cwd():
        metrics_dir = get_repo_root() / "metrics"
        data = []
        for file_path in metrics_dir.glob(f"{prefix}_*.jsonl"):
            with open(file_path, encoding="utf-8") as f:
                for line in f:
                    try:
                        data.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        return data


@router.get("/overview")
async def health_overview():
    try:
        def _build():
            workflow = _load_jsonl("workflow_events")
            engagement = _load_jsonl("engagement")
            errors = _load_jsonl("errors")

            wf_df = pd.DataFrame(workflow) if workflow else pd.DataFrame()
            success_rate = 0.0
            total_sessions = 0
            if not wf_df.empty and "type" in wf_df.columns:
                starts = wf_df[wf_df["type"] == "start"]
                ends = wf_df[wf_df["type"] == "end"]
                total_sessions = len(starts)
                if total_sessions:
                    end_by_session = {}
                    if "session_id" in ends.columns:
                        for _, row in ends.iterrows():
                            sid = row.get("session_id")
                            if sid:
                                end_by_session[sid] = row
                    successful = 0
                    for _, start in starts.iterrows():
                        sid = start.get("session_id")
                        end_row = end_by_session.get(sid)
                        if end_row is not None and end_row.get("status") == "success":
                            successful += 1
                    success_rate = successful / total_sessions * 100

            eng_success = len(engagement)
            eng_fail = 0
            if engagement and "status" in engagement[0]:
                eng_fail = len([e for e in engagement if e.get("status") == "failed"])
                eng_success = len(engagement) - eng_fail

            return {
                "success_rate_pct": round(success_rate, 1),
                "workflow_sessions": total_sessions,
                "engagement_success": eng_success,
                "engagement_failures": eng_fail,
                "error_count": len(errors),
            }

        return await asyncio.to_thread(_build)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/workflows")
async def workflow_metrics():
    try:
        return {"events": await asyncio.to_thread(_load_jsonl, "workflow_events")}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/engagement")
async def engagement_metrics():
    try:
        return {"events": await asyncio.to_thread(_load_jsonl, "engagement")}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/errors")
async def error_log(limit: int = 10):
    try:
        errors = await asyncio.to_thread(_load_jsonl, "errors")
        errors.sort(key=lambda x: x.get("timestamp") or x.get("ts", ""), reverse=True)
        return {"errors": errors[:limit]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
