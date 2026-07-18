import asyncio
import yfinance as yf
from src.state import AgentState
from src.utils.logger import get_logger

logger = get_logger(__name__)

BULLISH_KEYWORDS = [
    "gain", "buy", "growth", "positive", "surge", "high", "profit", "expansion",
]
BEARISH_KEYWORDS = [
    "fall", "loss", "sell", "warning", "decline", "low", "debt", "cut",
]


def _headline_from_item(item: dict) -> str:
    """Yahoo Finance news may put title at top level or under content.title."""
    if not isinstance(item, dict):
        return ""
    title = item.get("title") or ""
    if not title:
        content = item.get("content")
        if isinstance(content, dict):
            title = content.get("title") or ""
    return str(title).strip()


async def get_ticker_sentiment(ticker: str):
    """Fetches and analyzes sentiment for a single ticker in a thread."""
    try:
        # Wrap synchronous yfinance call in to_thread
        stock = yf.Ticker(ticker)
        news = await asyncio.to_thread(lambda: stock.news) or []

        # Simple keyword-based sentiment on recent headlines
        headlines = [h for h in (_headline_from_item(n) for n in news[:5]) if h]

        score = 0
        for h in headlines:
            lower = h.lower()
            for w in BULLISH_KEYWORDS:
                if w in lower:
                    score += 1
            for w in BEARISH_KEYWORDS:
                if w in lower:
                    score -= 1

        final_sentiment = "neutral"
        if score > 0:
            final_sentiment = "positive"
        elif score < 0:
            final_sentiment = "negative"

        return {
            "ticker": ticker,
            "sentiment": final_sentiment,
            "news_count": len(news),
            "summary": headlines[0] if headlines else "No recent news.",
        }
    except Exception as e:
        logger.error(f"Sentiment error for {ticker}: {e}")
        return {"ticker": ticker, "sentiment": "Data Unavailable"}

async def sentiment_node(state: AgentState) -> dict:
    """
    Node: Sentiment Analysis (Parallel)
    Classifies news as Fear/Greed. Identifies hype clusters.
    """
    logger.info("Executing Sentiment Node (Async/Parallel)...")
    tickers = state.get("tickers", [])

    if not tickers:
        return {"sentiment_data": []}

    # Run all ticker sentiment checks in parallel
    results = await asyncio.gather(*[get_ticker_sentiment(t) for t in tickers])

    bullish_count = sum(1 for r in results if r.get("sentiment") == "positive")
    celebrations = []

    # Interactive UX Trigger: Bullish Consensus
    if len(tickers) > 0 and (bullish_count / len(tickers)) >= 0.7:
        celebrations.append({
            "type": "CROWD_CHEER",
            "message": "SENTIMENT ALERT: 70%+ of your portfolio has a Strong Bullish Consensus! Institutional absorption likely.",
            "context": "sentiment_bullish_cluster"
        })

    return {
        "sentiment_data": results,
        "celebrations": celebrations,
    }
