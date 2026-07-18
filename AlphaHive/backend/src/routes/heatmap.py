"""
Heatmap route — monthly returns matrix for a given ticker.
GET /api/heatmap/{ticker}

Uses the same MarketAnalyzer pipeline as /api/market/analysis for reliability.
"""
import asyncio

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.services.market_analysis import run_ticker_analysis
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)

MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def _legacy_matrix_payload(matrix: dict | None) -> tuple[dict[str, dict[str, float | None]], list[int]]:
    data: dict[str, dict[str, float | None]] = {}
    years: list[int] = []
    if not matrix or not matrix.get("values"):
        return data, years

    for i, year in enumerate(matrix.get("index", [])):
        year_key = str(year)
        if year_key not in data:
            data[year_key] = {}
            try:
                years.append(int(year))
            except (TypeError, ValueError):
                pass
        for j, month in enumerate(matrix.get("columns", [])):
            row = matrix["values"][i] if i < len(matrix["values"]) else []
            val = row[j] if j < len(row) else None
            data[year_key][month] = val

    return data, sorted(set(years))


def _best_worst(data: dict[str, dict[str, float | None]]) -> tuple[dict, dict]:
    best = {"month": "", "return": float("-inf")}
    worst = {"month": "", "return": float("inf")}
    for year, months in data.items():
        for month, val in months.items():
            if val is None:
                continue
            label = f"{month} {year}"
            if val > best["return"]:
                best = {"month": label, "return": val}
            if val < worst["return"]:
                worst = {"month": label, "return": val}
    if best["return"] == float("-inf"):
        best = {"month": "", "return": 0}
    if worst["return"] == float("inf"):
        worst = {"month": "", "return": 0}
    return best, worst


@router.get("/{ticker}")
async def get_heatmap(
    ticker: str,
    lookback: str = Query("5y+ (Max)"),
    exclude_outliers: bool = False,
):
    """
    Monthly returns matrix plus optional seasonality / forecast bundle.

    Legacy fields: years, months, data, best, worst
    Extended fields: returns_matrix, seasonality, forecast_scenarios, ltp
    """
    try:
        result = await asyncio.to_thread(
            in_repo_root(run_ticker_analysis),
            ticker,
            lookback,
            exclude_outliers,
        )
        matrix = result.get("returns_matrix")
        if not matrix or not matrix.get("values"):
            return JSONResponse(
                status_code=404,
                content={"error": f"No heatmap data for {result.get('ticker', ticker)}"},
            )

        data, years = _legacy_matrix_payload(matrix)
        best, worst = _best_worst(data)
        months = list(matrix.get("columns") or MONTH_LABELS)

        return {
            "ticker": result["ticker"],
            "years": years,
            "months": months,
            "data": data,
            "best": best,
            "worst": worst,
            "ltp": result.get("ltp"),
            "lookback": lookback,
            "exclude_outliers": exclude_outliers,
            "history_days": result.get("history_days"),
            "returns_matrix": matrix,
            "seasonality": result.get("seasonality"),
            "forecast_scenarios": result.get("forecast_scenarios"),
        }
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        logger.error("Heatmap failed for %s: %s", ticker, e, exc_info=True)
        return JSONResponse(status_code=500, content={"error": str(e)})
