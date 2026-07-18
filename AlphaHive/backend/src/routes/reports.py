"""Report listing and download."""
import asyncio
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse
from src.utils.logger import get_logger
from src.utils.repo_root import get_repo_root, repo_root_cwd

router = APIRouter()
logger = get_logger(__name__)


def _user_report_dir(user_handle: str) -> Path:
    with repo_root_cwd():
        try:
            import config
            base = config.REPORT_DIR
        except Exception:
            base = get_repo_root() / "reports"
        return Path(base) / user_handle


@router.get("/{user_handle}")
async def list_reports(user_handle: str):
    try:
        def _list():
            report_dir = _user_report_dir(user_handle)
            if not report_dir.exists():
                return []
            files = []
            for p in sorted(report_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
                if p.suffix.lower() in (".pdf", ".html", ".txt"):
                    mtime = p.stat().st_mtime
                    files.append({
                        "filename": p.name,
                        "type": p.suffix.lower().lstrip("."),
                        "size_bytes": p.stat().st_size,
                        "modified": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M"),
                        "modified_ts": mtime,
                    })
            return files

        return {"reports": await asyncio.to_thread(_list)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/{user_handle}/{filename}")
async def download_report(user_handle: str, filename: str):
    try:
        report_dir = _user_report_dir(user_handle)
        path = report_dir / filename
        if not path.exists() or not path.is_file():
            return JSONResponse(status_code=404, content={"error": "Report not found"})
        media = {
            ".pdf": "application/pdf",
            ".html": "text/html; charset=utf-8",
            ".txt": "text/plain; charset=utf-8",
        }.get(path.suffix.lower(), "application/octet-stream")
        suffix = path.suffix.lower()
        if suffix == ".html":
            return FileResponse(
                path,
                media_type=media,
                headers={"Content-Disposition": f'inline; filename="{filename}"'},
            )
        return FileResponse(path, media_type=media, filename=filename)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
