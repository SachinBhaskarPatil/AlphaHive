import config
from src.state import AgentState
from src.utils.db_manager import db
from src.utils.logger import get_logger

logger = get_logger(__name__)


def _short(ticker: str) -> str:
    return str(ticker or "").replace(".NS", "").replace(".BO", "")


def _format_technical(rows: list) -> str:
    if not rows:
        return "- No technical data available."
    lines = []
    for row in rows:
        ticker = _short(row.get("ticker", "?"))
        concordance = row.get("concordance", "N/A")
        mtc = row.get("mtc_score", "N/A")
        patterns = row.get("patterns", "No patterns detected.")
        if isinstance(mtc, str) and len(mtc) > 120:
            mtc = mtc[:117] + "..."
        if isinstance(patterns, str) and len(patterns) > 120:
            patterns = patterns[:117] + "..."
        lines.append(f"- **{ticker}**: Concordance {concordance}")
        lines.append(f"  - MTC: {mtc}")
        lines.append(f"  - Patterns: {patterns}")
    return "\n".join(lines)


def _format_fundamentals(rows: list) -> str:
    if not rows:
        return "- No fundamental data available."
    lines = []
    for row in rows:
        ticker = _short(row.get("ticker", "?"))
        if row.get("status"):
            lines.append(f"- **{ticker}**: {row['status']}")
            continue
        value_tag = "Undervalued" if row.get("is_undervalued") else "Fair / Rich"
        lines.append(
            f"- **{ticker}**: P/E {row.get('pe', 'N/A')} · PEG {row.get('peg', 'N/A')} · "
            f"P/B {row.get('pb', 'N/A')} · {value_tag}"
        )
    return "\n".join(lines)


def _format_dividends(rows: list) -> str:
    if not rows:
        return "- No dividend data available."
    lines = []
    for row in rows:
        ticker = _short(row.get("ticker", "?"))
        payout = row.get("payout_ratio", "N/A")
        if isinstance(payout, float):
            payout = f"{payout:.0%}"
        lines.append(f"- **{ticker}**: Yield {row.get('yield', 'N/A')} · Payout {payout}")
    return "\n".join(lines)


def _format_sectors(rows: list) -> str:
    if not rows:
        return "- No sector data available."
    lines = []
    for row in rows:
        report = row.get("report") or "No sector flow report."
        lines.append(f"- Flow summary: {report}")
        ticker_map = row.get("ticker_map") or {}
        if ticker_map:
            lines.append("- Holdings by sector:")
            for ticker, sector in ticker_map.items():
                lines.append(f"  - **{_short(ticker)}** → {sector}")
    return "\n".join(lines)


def _format_shadow(signals: list) -> str:
    if not signals:
        return "- No major divergences detected."
    return "\n".join(f"- {s}" for s in signals)


def _stance_for_ticker(
    ticker: str,
    shadow_signals: list,
    intent: str,
    regime: str,
    forensic_report: dict | None = None,
) -> tuple[str, str]:
    """Map shadow signal text to per-ticker stance for history display."""
    short = ticker.replace(".NS", "").replace(".BO", "")
    ticker_shadows = [
        sig for sig in shadow_signals
        if ticker in sig or short in sig
    ]

    for sig in ticker_shadows:
        upper = sig.upper()
        if "ABSORPTION" in upper or "ACCUMULATION" in upper:
            return "ACCUMULATION", sig
        if "DISTRIBUTION" in upper:
            return "DISTRIBUTION", sig
        if "FORENSIC" in upper or "WARNING" in upper or "GHOST" in upper:
            return "WARNING", sig

    forensic_status = (forensic_report or {}).get("status", "HEALTHY")
    forensic_flags = (forensic_report or {}).get("red_flags", 0)
    forensic_summary = (forensic_report or {}).get("summary", "")

    if forensic_status == "CRITICAL":
        return "WARNING", f"Forensic CRITICAL ({forensic_flags} flags): {forensic_summary}"
    if forensic_status == "CAUTION":
        return "WARNING", f"Forensic CAUTION: {forensic_summary}"

    if intent and intent != "NEUTRAL":
        detail = ticker_shadows[0] if ticker_shadows else f"Intent {intent} in {regime} regime"
        return intent, detail

    parts = [f"Analyzed in {regime} regime."]
    if ticker_shadows:
        parts.append(f"Shadow signals: {len(ticker_shadows)}.")
    else:
        parts.append("No shadow divergence.")
    parts.append(f"Forensic: {forensic_status}")
    if forensic_flags:
        parts.append(f"({forensic_flags} flags)")
    elif forensic_summary and forensic_summary != "No major accounting red flags.":
        parts.append(f"— {forensic_summary[:100]}")
    return "NEUTRAL", " ".join(parts)


async def reporting_node(state: AgentState) -> dict:
    """
    Node: Intelligence Synthesis & Reporting
    The final point of the graph. Compiles all data into a cohesive report.
    Triggers the 'Final Success' celebration and feedback loops.
    """
    logger.info("Executing Reporting Node...")

    regime = state.get("regime", "NEUTRAL")
    shadow_signals = state.get("shadow_signals", [])
    intent = state.get("institutional_intent", "NEUTRAL")
    forensic_reports = state.get("forensic_reports", [])
    traditional = state.get("traditional_insights") or ["No traditional data available."]

    # 1. Compile Final Report (human-readable, not raw JSON)
    report_title = f"{config.APP_DISPLAY_NAME} Intelligence Report: {regime} Protocol"
    final_report = f"""
# {report_title}
## Institutional Stance: {intent}

### Macro Summary
{state.get('macro_context', 'No macro context available.')}

### Technical Snapshot
{_format_technical(state.get('technical_data', []))}

### Fundamental Ratios
{_format_fundamentals(state.get('fundamental_data', []))}

### Dividend Yields
{_format_dividends(state.get('dividend_data', []))}

### Sector Rotation & Alpha Discovery
{_format_sectors(state.get('sector_data', []))}

### Forensic Signals (Shadow Analyst)
{_format_shadow(shadow_signals)}

### Auspicious Timing (Traditional)
{traditional[0]}

---
*Disclaimer: AI-generated analysis is for informational purposes only.*
"""

    # 2. Interactive UX Trigger: Final Success
    celebrations = [{
        "type": "FINAL_CONFETTI_BURST",
        "message": "Analysis Complete! Your institutional intelligence report is ready.",
        "context": "report_ready"
    }]

    # 3. Interactive UX Trigger: Final Feedback
    feedback_prompts = [{
        "type": "RATE_REPORT",
        "message": "How helpful was this specific analysis? (Selecting a reaction improves my future accuracy).",
        "choices": ["Stellar", "Helpful", "Standard", "Needs Work"]
    }]

    # 4. Long-Term Memory (LTM) Storage
    user_handle = state.get("discoverable_handle", "anonymous_user")
    tickers = state.get("tickers", [])

    if await db.try_connect():
        for ticker in tickers:
            f_item = next((f for f in forensic_reports if f.get("ticker") == ticker), None)
            stance, logic = _stance_for_ticker(ticker, shadow_signals, intent, regime, f_item)
            await db.store_memory(
                user_handle=user_handle,
                ticker=ticker,
                stance=stance,
                logic=logic,
            )
        await db.log_activity(user_handle, "GENERATED_INTEL_REPORT")
    else:
        logger.warning("Skipping LTM storage — database unavailable")

    return {
        "final_report": final_report,
        "celebrations": celebrations,
        "feedback_prompts": feedback_prompts,
        "current_node": "reporting"
    }
