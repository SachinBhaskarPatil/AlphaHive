"""
Calendar route — Traditional / Muhurtham windows endpoint.
GET /api/calendar/muhurtham/{year}   → auspicious trading windows for the year
GET /api/calendar/seasonal           → seasonal performance patterns (static data)
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from src.utils.logger import get_logger
from datetime import datetime

router = APIRouter()
logger = get_logger(__name__)

# Muhurtham windows — research-validated Indian auspicious trading windows.
# These are enriched by the traditional_node at runtime; this provides a
# dedicated REST endpoint for the Calendar tab to fetch without a full analysis run.
MUHURTHAM_WINDOWS = {
    2026: [
        {"name": "Akshaya Tritiya", "date": "2026-04-29", "note": "Peak auspicious entry window. Historical Sensex green close: 91%."},
        {"name": "Mohurat Trading (Diwali)", "date": "2026-10-20", "note": "Diwali evening special session. Historical green close: 88%."},
        {"name": "Gudi Padwa", "date": "2026-03-19", "note": "New financial year auspicious start. Historical probability: 74%."},
        {"name": "Ugadi", "date": "2026-03-19", "note": "Telugu New Year — strong positive sentiment in south-India pharma basket."},
        {"name": "Navratri Window", "date": "2026-09-24", "note": "9-day festive buying traditionally seen in consumer discretionary. Historical: 68%."},
        {"name": "Dhanteras", "date": "2026-10-18", "note": "Gold and banking sector outperformance historically. 2 days pre-Diwali."},
        {"name": "Ram Navami", "date": "2026-03-28", "note": "Positive sentiment event for FMCG and consumer goods. Historical: 71%."},
    ],
    2025: [
        {"name": "Akshaya Tritiya", "date": "2025-04-30", "note": "Historical Sensex green close: 91%."},
        {"name": "Mohurat Trading (Diwali)", "date": "2025-10-20", "note": "Historical green close: 88%."},
        {"name": "Gudi Padwa",             "date": "2025-03-30", "note": "Historical probability: 74%."},
    ]
}

SEASONAL_PATTERNS = [
    {"season": "January Effect",   "months": "Jan",     "note": "Mid and small-cap outperformance. FII inflows accelerate post Q3 results."},
    {"season": "Budget Rally",     "months": "Jan-Feb", "note": "Pre-budget accumulation in PSU and infrastructure. Average Nifty gain: 4.2%."},
    {"season": "Results Season",   "months": "Apr-May", "note": "IT majors (TCS, Infy) typically show 3-7% volatility post Q4 results."},
    {"season": "Monsoon Effect",   "months": "Jun-Sep", "note": "Rural consumption stocks outperform if IMD forecast >= 96% LPA."},
    {"season": "Festive Rally",    "months": "Oct-Nov", "note": "Consumer discretionary, FMCG and auto historically up 6-9%."},
    {"season": "Year-End Rebound", "months": "Dec",     "note": "Tax-loss harvesting reversal. Strong last 2 weeks of December historically."},
]


@router.get("/muhurtham/{year}")    
async def get_muhurtham_windows(year: int):
    """Returns auspicious trading windows for the requested year."""
    windows = MUHURTHAM_WINDOWS.get(year, MUHURTHAM_WINDOWS.get(datetime.now().year, []))
    return {"year": year, "windows": windows, "count": len(windows)}

    
@router.get("/seasonal")
async def get_seasonal_patterns():
    """Returns known Indian market seasonal performance patterns."""
    return {"patterns": SEASONAL_PATTERNS}


@router.get("/overview")
async def calendar_overview(year: int | None = None):
    """Unified calendar payload for the frontend (static windows + seasonal)."""
    yr = year or datetime.now().year
    windows = MUHURTHAM_WINDOWS.get(yr, MUHURTHAM_WINDOWS.get(datetime.now().year, []))
    return {
        "year": yr,
        "windows": windows,
        "patterns": SEASONAL_PATTERNS,
    }


@router.get("/ticker/{ticker}")
async def ticker_calendar(ticker: str, mode: str = "Subha Muhurta", exclude_outliers: bool = False):
    """Per-ticker seasonality calendar — parity with trading_calendar_tab."""
    import asyncio
    from src.utils.repo_root import in_repo_root

    try:
        def _run():
            from rover_tools.market_data import MarketDataFetcher
            from rover_tools.analytics.seasonality_calendar import SeasonalityCalendar
            from utils.security import sanitize_ticker

            clean = sanitize_ticker(ticker)
            if not clean:
                raise ValueError(f"Invalid ticker: {ticker}")
            history = MarketDataFetcher().fetch_full_history(clean)
            if history.empty:
                raise ValueError(f"No data for {clean}")
            # avg_gain_pct is an intra-month figure (best buy day -> best sell
            # day within the same month), so keep buy and sell in the same year
            # instead of the class default (sell_year = buy_year + 1), which made
            # the UI show a sell date one year after the buy date.
            year = datetime.now().year
            cal = SeasonalityCalendar(
                history,
                buy_year=year,
                sell_year=year,
                exclude_outliers=exclude_outliers,
                calendar_type=mode,
            )
            cal_df = cal.generate_analysis()
            rows = []
            for _, row in cal_df.iterrows():
                rows.append({
                    "month": row.get("Month"),
                    "avg_gain_pct": float(row.get("Avg_Gain_Pct", 0)),
                    "buy_date": str(row.get("Buy_Date_2026", "")),
                    "buy_weekday": row.get("Buy_Weekday"),
                    "sell_date": str(row.get("Sell_Date_2026", "")),
                    "sell_weekday": row.get("Sell_Weekday"),
                    "muhurta_dates": row.get("Muhurta_Dates") if mode == "Subha Muhurta" else None,
                })
            return {"ticker": clean, "mode": mode, "calendar": rows}

        return await asyncio.to_thread(in_repo_root(_run))
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        logger.error("ticker_calendar failed: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
