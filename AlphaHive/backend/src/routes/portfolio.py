"""Portfolio CRUD — backed by the shared PortfolioManager."""
import asyncio
from typing import Any

import pandas as pd
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from src.utils.json_sanitize import json_safe
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)


class HoldingRow(BaseModel):
    Symbol: str
    Quantity: float = 10
    Average_Price: float = Field(0, alias="Average Price")
    Company_Name: str | None = Field(None, alias="Company Name")

    class Config:
        populate_by_name = True


class PortfolioSaveRequest(BaseModel):
    name: str
    holdings: list[dict[str, Any]]


def _pm(user: str):
    from utils.portfolio_manager import PortfolioManager
    return PortfolioManager(user)


def _list_names(user: str) -> list[str]:
    return _pm(user).get_portfolio_names()


def _get_holdings(user: str, name: str):
    return _pm(user).get_portfolio(name)


def _save_holdings(user: str, name: str, df: pd.DataFrame):
    return _pm(user).save_portfolio(name, df)


def _delete_holdings(user: str, name: str):
    return _pm(user).delete_portfolio(name)


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    if df is None or df.empty:
        return []
    out = df.copy()
    if "Company Name" not in out.columns:
        from rover_tools.ticker_resources import get_ticker_name
        out["Company Name"] = out["Symbol"].apply(get_ticker_name)
    # pandas leaves NaN for blank cells; json.dumps rejects those floats
    return json_safe(out.to_dict(orient="records"))


@router.get("/{user_handle}")
async def list_portfolios(user_handle: str):
    try:
        names = await asyncio.to_thread(in_repo_root(_list_names), user_handle)
        return {"portfolios": names}
    except Exception as e:
        logger.error("list_portfolios failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/{user_handle}/{portfolio_name}")
async def get_portfolio(user_handle: str, portfolio_name: str):
    try:
        df = await asyncio.to_thread(in_repo_root(_get_holdings), user_handle, portfolio_name)
        if df is None:
            return JSONResponse(status_code=404, content={"error": "Portfolio not found"})
        return {"name": portfolio_name, "holdings": _df_to_records(df)}
    except Exception as e:
        logger.error("get_portfolio failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/{user_handle}")
async def save_portfolio(user_handle: str, body: PortfolioSaveRequest):
    try:
        df = pd.DataFrame(body.holdings)
        if "Symbol" not in df.columns and "symbol" in df.columns:
            df = df.rename(columns={"symbol": "Symbol"})
        ok, msg = await asyncio.to_thread(
            in_repo_root(_save_holdings), user_handle, body.name.strip(), df
        )
        if not ok:
            return JSONResponse(status_code=400, content={"error": msg})
        return {"status": "success", "message": msg, "name": body.name}
    except Exception as e:
        logger.error("save_portfolio failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.delete("/{user_handle}/{portfolio_name}")
async def delete_portfolio(user_handle: str, portfolio_name: str):
    try:
        ok, msg = await asyncio.to_thread(in_repo_root(_delete_holdings), user_handle, portfolio_name)
        if not ok:
            return JSONResponse(status_code=404, content={"error": msg})
        return {"status": "success"}
    except Exception as e:
        logger.error("delete_portfolio failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
