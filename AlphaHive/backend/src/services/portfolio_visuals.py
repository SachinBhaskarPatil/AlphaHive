"""Portfolio visual analytics — chart data for the portfolio dashboard."""
from __future__ import annotations

from typing import Any

from src.utils.json_sanitize import json_safe


def _normalize_tickers(raw: list[str]) -> list[str]:
    from utils.security import sanitize_ticker

    out: list[str] = []
    for t in raw:
        s = (t or "").strip()
        if not s:
            continue
        candidate = f"{s.upper()}.NS" if "." not in s else s.upper()
        clean = sanitize_ticker(candidate)
        if clean and clean not in out:
            out.append(clean)
    return out


def _holding_value(row: dict[str, Any]) -> float:
    qty = float(row.get("Quantity", row.get("quantity", 10)) or 10)
    price = float(row.get("Average Price", row.get("Average_Price", 0)) or 0)
    if price <= 0:
        price = 1000.0
    return qty * price


def _rows_to_json(df) -> list[dict]:
    if df is None or df.empty:
        return []
    rows = df.to_dict(orient="records")
    for row in rows:
        for key in ("current_weight", "target_weight", "volatility", "return"):
            if key in row and row[key] is not None:
                try:
                    row[key] = round(float(row[key]), 4)
                except (TypeError, ValueError):
                    row[key] = None
    return json_safe(rows)


def build_portfolio_visuals(tickers: list[str], holdings: list[dict] | None = None) -> dict:
    from rover_tools.analytics.portfolio_engine import AnalyticsPortfolio
    from rover_tools.market_analytics import MarketAnalyzer
    from rover_tools.ticker_resources import get_ticker_name

    normalized = _normalize_tickers(tickers)
    engine = AnalyticsPortfolio()
    analyzer = MarketAnalyzer()

    stock_risk_data: list[dict] = []
    for sym in normalized:
        short = sym.split(".")[0]
        try:
            risk_score = engine.calculate_risk_score(sym)
        except Exception:
            risk_score = 50
        stock_risk_data.append({
            "symbol": short,
            "ticker": sym,
            "company": get_ticker_name(sym),
            "risk_score": int(risk_score),
            "sentiment": "neutral",
            "shadow_score": 0,
        })

    corr_matrix: dict = {}
    if len(normalized) >= 2:
        matrix = engine.calculate_correlation_matrix(normalized)
        if matrix is not None and not matrix.empty:
            corr_matrix = matrix.round(3).to_dict()

    if holdings:
        portfolio_data = []
        for h in holdings:
            sym_raw = h.get("Symbol") or h.get("symbol") or ""
            normed = _normalize_tickers([sym_raw])
            if not normed:
                continue
            portfolio_data.append({"symbol": normed[0], "value": _holding_value(h)})
    else:
        portfolio_data = [{"symbol": t, "value": 10.0} for t in normalized]

    rebalance_safety = {"rows": [], "warnings": [], "mode": "safety"}
    rebalance_growth = {"rows": [], "warnings": [], "mode": "growth"}

    if portfolio_data:
        safe_df, safe_warn = analyzer.analyze_rebalance(portfolio_data, mode="safety")
        growth_df, growth_warn = analyzer.analyze_rebalance(portfolio_data, mode="growth")
        rebalance_safety = {"rows": _rows_to_json(safe_df), "warnings": safe_warn, "mode": "safety"}
        rebalance_growth = {"rows": _rows_to_json(growth_df), "warnings": growth_warn, "mode": "growth"}

    return json_safe({
        "stock_risk_data": stock_risk_data,
        "correlation_matrix": corr_matrix,
        "rebalance_safety": rebalance_safety,
        "rebalance_growth": rebalance_growth,
        "tickers": normalized,
    })
