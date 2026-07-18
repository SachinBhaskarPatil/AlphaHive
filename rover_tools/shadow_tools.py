"""
Shadow Tools - Unconventional Institutional Analytics
"""
import yfinance as yf
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
from config import resolve_ticker
try:
    from nselib import capital_market, derivatives
except ImportError:
    capital_market = None
    derivatives = None
    import sys
    print("⚠️ WARNING: nselib could not be imported. NSE data tools will be disabled.", file=sys.stderr)

from rover_tools.ticker_resources import NIFTY_50_SECTOR_MAP
from utils.logger import get_logger
try:
    from crewai.tools import tool
except ImportError:
    # Fallback if crewai is not installed (e.g. in lightweight CI scripts)
    def tool(name_or_func):
        def decorator(func):
            return func
        return decorator

logger = get_logger(__name__)


def _close_prices_from_download(data, tickers):
    """Normalize yf.download output to a DataFrame of close prices (columns = tickers)."""
    if data is None or (hasattr(data, "empty") and data.empty):
        return pd.DataFrame()

    close_data = pd.DataFrame()
    if isinstance(data.columns, pd.MultiIndex):
        if "Close" in data.columns.get_level_values(0):
            close_data = data.xs("Close", axis=1, level=0)
        elif "Close" in data.columns.get_level_values(1):
            close_data = data.xs("Close", axis=1, level=1)
        elif "Adj Close" in data.columns.get_level_values(0):
            close_data = data.xs("Adj Close", axis=1, level=0)
    elif "Close" in data.columns:
        close_data = data["Close"]
        if isinstance(close_data, pd.Series):
            close_data = close_data.to_frame()
    else:
        common = [t for t in tickers if t in data.columns]
        if common:
            close_data = data[common]

    if isinstance(close_data, pd.Series):
        close_data = close_data.to_frame()
    return close_data


# --- 1. THE SPIDER WEB (Sector Rotation) ---
def analyze_sector_flow():
    """
    Analyzes relative strength of major sectors to detect rotation.
    Returns a DataFrame with 1W, 1M performance and Relative Strength Ranking.
    """
    sectors = {
        "Nifty Bank": "^NSEBANK",
        "Nifty Auto": "^CNXAUTO",
        "Nifty IT": "^CNXIT",
        "Nifty Metal": "^CNXMETAL",
        "Nifty Pharma": "^CNXPHARMA",
        "Nifty FMCG": "^CNXFMCG",
        "Nifty Energy": "^CNXENERGY",
        "Nifty Infra": "^CNXINFRA",
        "Nifty Realty": "^CNXREALTY",
        "Nifty PSU Bank": "^CNXPSUBANK"
    }
    
    results = []
    
    try:
        # Fetch last 30 days of data for all sectors
        tickers = list(sectors.values())
        raw = yf.download(tickers, period="1mo", progress=False, auto_adjust=True)
        data = _close_prices_from_download(raw, tickers)

        if data.empty:
            logger.error("No sector data fetched")
            return pd.DataFrame()

        for name, ticker in sectors.items():
            if ticker not in data.columns:
                continue

            series = data[ticker].dropna()
            if series.empty:
                continue
                
            current_price = series.iloc[-1]
            week_ago = series.iloc[-5] if len(series) >= 5 else series.iloc[0]
            month_ago = series.iloc[0]
            
            pct_1w = ((current_price - week_ago) / week_ago) * 100
            pct_1m = ((current_price - month_ago) / month_ago) * 100
            
            # Simple Momentum Score
            momentum = (pct_1w * 0.4) + (pct_1m * 0.6)
            
            results.append({
                "Sector": name,
                "Ticker": ticker,
                "1W %": round(pct_1w, 2),
                "1M %": round(pct_1m, 2),
                "Momentum Score": round(momentum, 2)
            })
            
        df = pd.DataFrame(results).sort_values(by="Momentum Score", ascending=False)
        df = df.reset_index(drop=True)
        df['Rank'] = df.index + 1
        return df
        
    except Exception as e:
        logger.warning(f"Sector Analysis Failed: {e}")
        return None


# --- 2. WHALE ALERT (Block Deals) ---
def fetch_block_deals(symbol=None):
    """
    Fetches recent Block/Bulk deals using nselib.
    If symbol is provided, filters for that specific stock.
    """
    # Retry mechanism for robustness
    max_retries = 3
    for attempt in range(max_retries):
        try:
            if capital_market is None:
                return None
            # Fetch data for the last 1M to ensure we get something
            raw_data = capital_market.block_deals_data(period='1M')
            
            if raw_data.empty:
                return []

            # Normalize columns
            raw_data.columns = [c.strip() for c in raw_data.columns]
            
            # Filter by symbol if provided
            if symbol:
                # Handle symbol formatting (NSE:RELIANCE or RELIANCE.NS -> RELIANCE)
                clean_symbol = symbol.split('.')[0].split(':')[-1].upper()
                raw_data = raw_data[raw_data['Symbol'].str.upper() == clean_symbol]

            deals = []
            for idx, row in raw_data.iterrows():
                try:
                    qty_str = str(row.get('Quantity', '0')).replace(',', '')
                    price_str = str(row.get('Trade Price/Wght. Avg. Price', '0')).replace(',', '')
                    qty = float(qty_str)
                    price = float(price_str)
                    value_lac = (qty * price) / 100000
                    
                    if value_lac > 100: # Show only deals > 1 Cr for relevance
                        deals.append({
                            "Date": row.get('Date', ''),
                            "Symbol": row.get('Symbol', ''),
                            "Client": row.get('Client Name', 'Unknown'),
                            "Type": row.get('Buy/Sell', 'Unknown'),
                            "Qty": f"{qty/100000:.2f}L",
                            "Price": price
                        })
                except Exception:
                    continue
                    
            # Return top 5 most recent
            return deals[:5]
            
        except Exception as e:
            if attempt < max_retries - 1:
                import time
                time.sleep(2 * (attempt + 1)) # Backoff: 2s, 4s
                logger.warning(f"Block deals fetch failed (Attempt {attempt+1}/{max_retries}), retrying... Error: {e}")
            else:
                logger.error(f"Failed to fetch block deals after {max_retries} attempts: {e}")
                return None


# --- 3. SILENT ACCUMULATION (Delivery + IV) ---
def detect_silent_accumulation(ticker):
    """
    Calculates a 'Shadow Score' (0-100) indicating likely institutional accumulation.
    Based on:
    1. Low Volatility (Consolidation)
    2. Rising Volume/Delivery (Simulated via Volume trend if Delivery unavailable)
    3. Put Call Ratio (PCR) > 1 (Bullish)
    """
    score = 0
    signals = []
    
    try:
        ticker = resolve_ticker(ticker.replace("$", "").strip().upper())
        if not ticker.endswith(('.NS', '.BO')) and '^' not in ticker:
             ticker += ".NS"
        ticker = resolve_ticker(ticker)
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1mo")
        
        if hist.empty:
            return {"score": 0, "signals": ["No Data"]}
            
        # 1. Price Consolidation Check (Low ADR)
        # Calculate Average Daily Range %
        last_10 = hist.tail(10)
        daily_range_pct = ((last_10['High'] - last_10['Low']) / last_10['Low']).mean() * 100
        
        if daily_range_pct < 2.0: # Very tight consolidation
            score += 30
            signals.append("Price Squeeze (Tight Consolidation)")
            
        # 2. Volume Anomaly (Rising Volume during flat price)
        avg_vol_30 = hist['Volume'].mean()
        avg_vol_5 = last_10['Volume'].mean()
        
        if avg_vol_5 > (avg_vol_30 * 1.2): # 20% higher volume recently
            score += 30
            signals.append("Volume Spike (Possible Accumulation)")
            
        # 3. Option Chain (PCR) - via yfinance directly is hard, we use a heuristic
        # We'll check if close > 20DMA (Trend) as a proxy for "smart money support"
        ma_20 = hist['Close'].rolling(20).mean().iloc[-1]
        current = hist['Close'].iloc[-1]
        
        if current > ma_20:
            score += 20
            signals.append("Above 20-DMA (Institutional Support)")
        
        # 4. Delivery Proxy (close near high usually means delivery buying)
        # If today's close is in the top 25% of the daily range
        todays = hist.iloc[-1]
        range_len = todays['High'] - todays['Low']
        if range_len > 0:
            pos = (todays['Close'] - todays['Low']) / range_len
            if pos > 0.75:
                score += 20
                signals.append("Strong Close (High Buying Pressure)")
                
        return {"score": score, "signals": signals}

    except Exception as e:
        logger.error(f"Silent Accumulation Check Failed for {ticker}: {e}")
        return {"score": 0, "signals": ["Error analyzing data"]}


# --- 3.5 SECTOR ACCUMULATION STATS ---
_SECTOR_ALIASES = {
    "power": "Energy",
    "oil gas & consumable fuels": "Energy",
    "information technology": "IT",
    "fast moving consumer goods": "FMCG",
    "fmcg": "FMCG",
    "automobile and auto components": "Automobile",
    "metals & mining": "Metals",
    "construction materials": "Construction Mat",
    "telecommunication": "Telecom",
}


def _resolve_sector_name(sector_name: str) -> str:
    if not sector_name:
        return sector_name
    trimmed = sector_name.strip()
    alias = _SECTOR_ALIASES.get(trimmed.lower())
    return alias or trimmed


def list_nifty50_sectors():
    """Unique sector labels used by NIFTY_50_SECTOR_MAP."""
    return sorted(set(NIFTY_50_SECTOR_MAP.values()))


def get_sector_stocks_accumulation(sector_name):
    """
    Aggregates accumulation scores for all stocks in a sector.
    """
    try:
        sector_name = _resolve_sector_name(sector_name)
        # Get stocks for sector
        sector_stocks = [t for t, s in NIFTY_50_SECTOR_MAP.items() if s == sector_name]
        
        if not sector_stocks:
            return pd.DataFrame()
            
        results = []
        for ticker in sector_stocks:
            res = detect_silent_accumulation(ticker)
            results.append({
                "Symbol": ticker.replace(".NS", ""),
                "Shadow Score": res.get('score', 0),
                "Signals": ", ".join(res.get('signals', []))
            })
            
        df = pd.DataFrame(results).sort_values(by="Shadow Score", ascending=False)
        return df
    except Exception as e:
        logger.warning(f"Sector Accumulation Stats Failed for {sector_name}: {e}")
        return None


# --- 4. TRAP DETECTOR (FII Sentiment) ---
def _fetch_fii_derivatives_df(max_lookback_days: int = 14):
    """Try recent trade dates until nselib returns FII derivatives data."""
    if derivatives is None:
        return None, None

    for offset in range(max_lookback_days):
        trade_date = (datetime.now() - timedelta(days=offset)).strftime("%d-%m-%Y")
        try:
            df = derivatives.fii_derivatives_statistics(trade_date=trade_date)
            if df is not None and not df.empty:
                return df, trade_date
        except Exception as e:
            err = str(e).lower()
            if "xlrd" in err:
                logger.error("FII fetch needs xlrd: pip install xlrd>=2.0.1")
                return None, None
            continue

    return None, None


def _fii_long_pct_from_df(df: pd.DataFrame) -> float | None:
    """Parse nselib FII derivatives table (legacy and current column layouts)."""
    if df is None or df.empty:
        return None

    work = df.copy()
    work.columns = [str(c).strip() for c in work.columns]

    # Current nselib (2025+): fii_derivatives, buy_contracts, sell_contracts
    if "fii_derivatives" in work.columns and "buy_contracts" in work.columns:
        label_col = "fii_derivatives"
        buy_col, sell_col = "buy_contracts", "sell_contracts"
        idx_rows = work[work[label_col].astype(str).str.contains("NIFTY FUTURES", case=False, na=False)]
        if idx_rows.empty:
            idx_rows = work[work[label_col].astype(str).str.contains("INDEX FUTURES", case=False, na=False)]
        if idx_rows.empty:
            idx_rows = work[work[label_col].astype(str).str.endswith("FUTURES", na=False)].head(1)
        if idx_rows.empty:
            return None
        row = idx_rows.iloc[0]
        buy = float(row[buy_col] or 0)
        sell = float(row[sell_col] or 0)
        total = buy + sell
        return round((buy / total) * 100, 1) if total > 0 else None

    # Legacy nselib layout
    if "Date" not in work.columns:
        for c in work.columns:
            if "date" in c.lower():
                work.rename(columns={c: "Date"}, inplace=True)
                break

    if "Date" not in work.columns or "Instrument Type" not in work.columns:
        return None

    latest_date = work["Date"].iloc[-1]
    day_data = work[work["Date"] == latest_date]
    idx_fut = day_data[day_data["Instrument Type"].astype(str).str.contains("Index Futures", case=False, na=False)]
    if idx_fut.empty:
        return None
    row = idx_fut.iloc[0]
    buy_col = next((c for c in work.columns if "Buy" in c and "Contract" in c), None)
    sell_col = next((c for c in work.columns if "Sell" in c and "Contract" in c), None)
    if not buy_col or not sell_col:
        return None
    buy = float(str(row[buy_col]).replace(",", "") or 0)
    sell = float(str(row[sell_col]).replace(",", "") or 0)
    total = buy + sell
    return round((buy / total) * 100, 1) if total > 0 else None


def get_trap_indicator():
    """
    Returns FII Sentiment Status based on Index Futures using nselib.
    """
    try:
        if derivatives is None:
            return {
                "status": "Unknown",
                "fii_long_pct": 50,
                "message": "nselib not installed — FII trap detector unavailable in this environment.",
            }

        df, trade_date = _fetch_fii_derivatives_df()
        if df is None or df.empty:
            return {
                "status": "Unknown",
                "fii_long_pct": 50,
                "message": (
                    "FII data unavailable. Install xlrd (pip install xlrd>=2.0.1), "
                    "or try again on a trading day if NSE is down."
                ),
            }

        long_pct = _fii_long_pct_from_df(df)
        if long_pct is None:
            return {
                "status": "Unknown",
                "fii_long_pct": 50,
                "message": "FII feed returned an unexpected format from NSE.",
            }

        status = "Neutral"
        msg = f"FIIs have {long_pct}% long exposure on Nifty futures (as of {trade_date})."

        if long_pct > 70:
            status = "Euphoria"
            msg += " Risk of bull trap."
        elif long_pct < 30:
            status = "Panic"
            msg += " Risk of bear trap (reversal possible)."
        else:
            msg += " Balanced positioning."

        return {
            "status": status,
            "fii_long_pct": long_pct,
            "trade_date": trade_date,
            "message": msg,
        }

    except Exception as e:
        import traceback
        logger.error(f"Trap Detector Failed: {traceback.format_exc()}")
        return {
            "status": "Error",
            "fii_long_pct": 50,
            "message": (
                "Could not fetch FII data from NSE. "
                "This often happens on weekends/holidays or when the NSE feed is down."
            ),
        }

# ==============================================================================
# WRAPPER TOOLS FOR AGENTS (Decorated for CrewAI)
# ==============================================================================

@tool("Analyze Sector Flow")
def analyze_sector_flow_tool() -> str:
    """
    Analyzes relative strength of major sectors (Bank, Auto, IT, etc.) to detect rotation.
    Returns a text summary of top performing sectors and their momentum.
    """
    df = analyze_sector_flow()
    
    if df is None:
        return "⚠️ Connection Error: Unable to fetch sector data."
        
    if df.empty:
        return "Sector analysis unavailable."
    
    # Format as string
    output = "📊 **Sector Rotation Analysis**:\n"
    # Take top 3 and bottom 3
    top = df.head(3)
    output += "Top Sectors (Inflow):\n"
    for _, row in top.iterrows():
        output += f"- {row['Sector']}: Momentum {row['Momentum Score']}, 1W: {row['1W %']}%\n"
        
    return output

@tool("Fetch Block Deals")
def fetch_block_deals_tool(symbol: str = None) -> str:
    """
    Fetches recent large 'Block Deals' or 'Bulk Deals' from the market.
    Useful for identifying what Smart Money (Institutions) are buying or selling.
    
    Args:
        symbol: Optional stock symbol to filter (e.g., RELIANCE.NS)
    """
    deals = fetch_block_deals(symbol=symbol)
    
    if deals is None:
        return "⚠️ Connection Error: Unable to fetch whale data from exchange. Please try again later."
        
    if not deals:
        return "No recent block deals found."
        
    output = f"🐋 **Whale Alerts (Block Deals)**{f' for {symbol}' if symbol else ''}:\n"
    for deal in deals:
        output += f"- {deal['Symbol']}: {deal['Type']} {deal['Qty']} @ {deal['Price']} ({deal['Client']})\n"
    return output

@tool("Detect Silent Accumulation")
def detect_silent_accumulation_tool(ticker: str) -> str:
    """
    Analyzes a specific stock for signs of 'Silent Accumulation' by institutions.
    Checks for Price Squeezes, Volume Spikes, and Strong Closes.
    
    Args:
        ticker: The stock symbol (e.g., HDFCBANK.NS)
    """
    res = detect_silent_accumulation(ticker)
    output = f"🕵️ **Shadow Scan for {ticker}**:\n"
    output += f"Shadow Score: {res['score']}/100\n"
    output += "Signals detected:\n"
    for sig in res['signals']:
        output += f"- {sig}\n"
    return output

@tool("Get Trap Indicator")
def get_trap_indicator_tool() -> str:
    """
    Checks the overall FII (Foreign Institutional Investor) positioning in Index Futures.
    Useful for detecting 'Bull Traps' (if FIIs are short) or 'Bear Traps'.
    """
    res = get_trap_indicator()
    return f"🕸️ **Trap Detector**: Status is {res['status']}. {res['message']} (FII Longs: {res['fii_long_pct']}%)"
