"""Ticker analysis bundle — market analysis service."""
import numpy as np
import pandas as pd

from utils.security import sanitize_ticker
from src.utils.json_sanitize import json_safe as _json_safe


def _matrix_payload(df: pd.DataFrame | None) -> dict | None:
    if df is None or df.empty:
        return None
    values = []
    for row in df.values:
        values.append([None if pd.isna(v) else round(float(v), 2) for v in row])
    return {
        "index": [int(i) if isinstance(i, (int, np.integer)) else str(i) for i in df.index.tolist()],
        "columns": [str(c) for c in df.columns.tolist()],
        "values": values,
    }


def _seasonality_payload(df: pd.DataFrame | None) -> list[dict]:
    if df is None or df.empty:
        return []
    out = df.reset_index()
    rows = []
    for _, row in out.iterrows():
        rows.append({
            "month": int(row.get("Month", row.name) or 0),
            "month_name": str(row.get("Month_Name", "")),
            "avg_return": round(float(row.get("Avg_Return", 0)), 2),
            "win_rate": round(float(row.get("Win_Rate", 0)), 1),
            "count": int(row.get("Count", 0)),
        })
    return rows


def _normalize_ticker_symbol(ticker: str) -> str:
    if not ticker or ticker.startswith("^"):
        return ticker
    if "." not in ticker:
        return f"{ticker}.NS"
    return ticker


def _apply_lookback(history: pd.DataFrame, lookback: str) -> pd.DataFrame:
    if lookback == "5y+ (Max)" or not lookback:
        return history
    years_map = {"1y": 1, "3y": 3, "5y": 5}
    years = years_map.get(lookback, 5)
    cutoff = pd.Timestamp.now() - pd.DateOffset(years=years)
    if history.index.tz is not None and cutoff.tz is None:
        cutoff = cutoff.tz_localize(history.index.tz)
    return history[history.index >= cutoff]


def _serialize_projection(path) -> list[dict]:
    if not path:
        return []
    out = []
    for pt in path:
        d = pt.get("date")
        if hasattr(d, "strftime"):
            ds = d.strftime("%Y-%m-%d")
        else:
            ds = str(d)[:10]
        out.append({"date": ds, "price": round(float(pt["price"]), 2)})
    return out


def _build_forecast_scenarios(history, backtest, forecast_median, forecast_sd) -> dict | None:
    if not forecast_median or not forecast_sd:
        return None

    current_price = float(history["Close"].iloc[-1])
    today = history.index[-1]
    if getattr(today, "tz", None) is not None:
        today = today.tz_localize(None)

    winner = backtest.get("winner", "median")
    if winner == "sd":
        active_res, alt_res = forecast_sd, forecast_median
        active_name, alt_name = "SD Strategy", "Median Strategy"
    else:
        active_res, alt_res = forecast_median, forecast_sd
        active_name, alt_name = "Median Strategy", "SD Strategy"

    baseline_growth = float(active_res["annualized_growth"])
    forecast_baseline = float(active_res["forecast_price"])

    if baseline_growth > 0:
        conservative_growth = baseline_growth * 0.8
        aggressive_growth = baseline_growth * 1.2
    else:
        conservative_growth = baseline_growth * 1.2
        aggressive_growth = baseline_growth * 0.8

    end_of_2026 = pd.Timestamp("2026-12-31")
    dates_range = pd.date_range(today, end_of_2026, freq="ME")
    dates = [today] + list(dates_range)
    date_strs = [d.strftime("%Y-%m-%d") for d in dates]

    cons_vals = []
    aggr_vals = []
    base_vals = []
    for d in dates:
        frac = max(0, (d - today).days / 365.25)
        cons_vals.append(round(current_price * (1 + conservative_growth / 100) ** frac, 2))
        aggr_vals.append(round(current_price * (1 + aggressive_growth / 100) ** frac, 2))
        base_vals.append(round(current_price * (1 + baseline_growth / 100) ** frac, 2))

    years_fraction = (end_of_2026 - today).days / 365.25
    forecast_conservative = current_price * (1 + conservative_growth / 100) ** years_fraction
    forecast_aggressive = current_price * (1 + aggressive_growth / 100) ** years_fraction

    acc = min(float(backtest.get("median_avg_error", 100)), float(backtest.get("sd_avg_error", 100)))

    return {
        "active_name": active_name,
        "alt_name": alt_name,
        "accuracy_pct": round(acc, 1),
        "conservative": {
            "price": round(float(forecast_conservative), 2),
            "growth_pct": round(float(conservative_growth), 1),
        },
        "baseline": {
            "price": round(float(forecast_baseline), 2),
            "growth_pct": round(float(baseline_growth), 1),
        },
        "aggressive": {
            "price": round(float(forecast_aggressive), 2),
            "growth_pct": round(float(aggressive_growth), 1),
        },
        "active_description": active_res.get("strategy_description", ""),
        "alt_description": alt_res.get("strategy_description", ""),
        "confidence": backtest.get("confidence", "High"),
        "years_tested": list(backtest.get("years_tested", [])),
        "range_dates": date_strs,
        "conservative_path": cons_vals,
        "aggressive_path": aggr_vals,
        "baseline_path": base_vals,
        "active_path": _serialize_projection(active_res.get("projection_path")),
        "alt_path": _serialize_projection(alt_res.get("projection_path")),
    }


def run_ticker_analysis(ticker_raw: str, lookback: str = "5y+ (Max)", exclude_outliers: bool = False) -> dict:
    from rover_tools.market_data import MarketDataFetcher
    from rover_tools.market_analytics import MarketAnalyzer

    ticker = sanitize_ticker(ticker_raw)
    if not ticker:
        raise ValueError(f"Invalid ticker: {ticker_raw}")
    ticker = _normalize_ticker_symbol(ticker)

    fetcher = MarketDataFetcher()
    analyzer = MarketAnalyzer()
    history = fetcher.fetch_full_history(ticker)
    if history.empty:
        raise ValueError(f"No data for {ticker}")

    history = _apply_lookback(history, lookback)
    returns_matrix = analyzer.calculate_monthly_returns_matrix(history, exclude_outliers=exclude_outliers)
    seasonality = analyzer.calculate_seasonality(history, exclude_outliers=exclude_outliers)
    backtest = analyzer.backtest_strategies(history, exclude_outliers=exclude_outliers)
    forecast_median = analyzer.calculate_median_strategy_forecast(history, exclude_outliers=exclude_outliers)
    forecast_sd = analyzer.calculate_sd_strategy_forecast(history, exclude_outliers=exclude_outliers)
    forecast_2026 = analyzer.calculate_2026_forecast(history, exclude_outliers=exclude_outliers)
    forecast_scenarios = _build_forecast_scenarios(history, backtest, forecast_median, forecast_sd)
    ltp = float(history["Close"].iloc[-1])

    winner = backtest.get("winner", "median")
    active = forecast_sd if winner == "sd" and forecast_sd else forecast_median

    return _json_safe({
        "ticker": ticker,
        "ltp": ltp,
        "lookback": lookback,
        "exclude_outliers": exclude_outliers,
        "history_days": len(history),
        "returns_matrix": _matrix_payload(returns_matrix),
        "seasonality": _seasonality_payload(seasonality),
        "backtest": {k: v for k, v in backtest.items() if k != "details"},
        "forecast": active,
        "forecast_median": forecast_median,
        "forecast_sd": forecast_sd,
        "forecast_2026": forecast_2026,
        "forecast_scenarios": forecast_scenarios,
        "winner_strategy": winner,
    })
