"""
Configuration settings for Market Rover system.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def _setting(name: str, default: str = "") -> str:
    """Read config from environment variables."""
    value = os.getenv(name, "")
    if value:
        return value
    return default


# Project Root
PROJECT_ROOT = Path(__file__).parent

# API Keys
GOOGLE_API_KEY = _setting("GOOGLE_API_KEY")
OPENAI_API_KEY = _setting("OPENAI_API_KEY")
NEWS_API_KEY = _setting("NEWS_API_KEY")

# LLM provider: "openai" (default) or "gemini"
LLM_PROVIDER = _setting("LLM_PROVIDER", "openai").strip().lower()
if LLM_PROVIDER not in ("gemini", "openai"):
    LLM_PROVIDER = "openai"

_LLM_DEFAULTS = {
    "gemini": {"flash": "gemini-3-flash-preview", "pro": "gemini-3-flash-preview"},
    "openai": {"flash": "gpt-4o-mini", "pro": "gpt-4o"},
}
_llm_defaults = _LLM_DEFAULTS[LLM_PROVIDER]
LLM_FLASH_MODEL = _setting("LLM_FLASH_MODEL", _llm_defaults["flash"])
LLM_PRO_MODEL = _setting("LLM_PRO_MODEL", _llm_defaults["pro"])

# System Settings
MAX_ITERATIONS = int(os.getenv("MAX_ITERATIONS", "5"))
LOOKBACK_DAYS = int(os.getenv("LOOKBACK_DAYS", "7"))
PORTFOLIO_FILE = os.getenv("PORTFOLIO_FILE", "Portfolio.csv")

# Report Settings
APP_DISPLAY_NAME = _setting("APP_DISPLAY_NAME", "AlphaHive")
REPORT_FILE_PREFIX = _setting("REPORT_FILE_PREFIX", "alphahive_report")
# In production (Cloud Run), /app is read-only. Use /tmp instead for ephemeral files.
if os.getenv("K_SERVICE"): # Standard Cloud Run env var
    REPORT_DIR = Path("/tmp/reports")
else:
    REPORT_DIR = PROJECT_ROOT / os.getenv("REPORT_DIR", "reports")

CONVERT_TO_CRORES = os.getenv("CONVERT_TO_CRORES", "true").lower() == "true"

# Create reports directory if it doesn't exist (Defensive check)
try:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    # Fallback to /tmp if still failing
    REPORT_DIR = Path("/tmp/reports")
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

# NSE Stock Symbol Settings
NSE_SUFFIX = ".NS"
BSE_SUFFIX = ".BO"

# Renamed / delisted tickers -> current Yahoo Finance symbols
TICKER_ALIASES = {
    "ZOMATO": "ETERNAL",
    "ZOMATO.NS": "ETERNAL.NS",
    "ZOMATO.BO": "ETERNAL.BO",
}


def resolve_ticker(symbol: str) -> str:
    """Map legacy symbols to their current NSE/BSE tickers."""
    if not symbol or not isinstance(symbol, str):
        return symbol
    key = symbol.replace("$", "").strip().upper()
    return TICKER_ALIASES.get(key, key)

# Sentiment Thresholds
SENTIMENT_POSITIVE_THRESHOLD = 0.3
SENTIMENT_NEGATIVE_THRESHOLD = -0.3

# Parallel Execution Settings (Market-Rover 2.0)
MAX_PARALLEL_STOCKS = int(os.getenv("MAX_PARALLEL_STOCKS", "5"))
RATE_LIMIT_DELAY = float(os.getenv("RATE_LIMIT_DELAY", "1.0"))

# Web UI Settings (Market-Rover 2.0)
if os.getenv("K_SERVICE"):
    UPLOAD_DIR = Path("/tmp/uploads")
else:
    UPLOAD_DIR = PROJECT_ROOT / os.getenv("UPLOAD_DIR", "uploads")

WEB_PORT = int(os.getenv("WEB_PORT", "8501"))
WEB_HOST = os.getenv("WEB_HOST", "0.0.0.0")

# Create upload directory if it doesn't exist
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    UPLOAD_DIR = Path("/tmp/uploads")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# News Sources
MONEYCONTROL_BASE_URL = "https://www.moneycontrol.com"

ONE_LAKH = 100_000
ONE_CRORE = 10_000_000
THOUSAND_CRORE = 10_000_000_000


def convert_to_crores(amount: float) -> str:
    """
    Convert amount to Crores format.

    Args:
        amount: Amount in regular units

    Returns:
        Formatted string in Crores
    """
    if amount >= THOUSAND_CRORE:
        return f"₹{amount / THOUSAND_CRORE:.2f} Thousand Crore"
    elif amount >= ONE_CRORE:
        return f"₹{amount / ONE_CRORE:.2f} Crore"
    elif amount >= ONE_LAKH:
        return f"₹{amount / ONE_LAKH:.2f} Lakh"
    else:
        return f"₹{amount:,.2f}"

def ensure_nse_suffix(symbol: str) -> str:
    """
    Ensure stock symbol has .NS suffix for NSE.

    Args:
        symbol: Stock symbol

    Returns:
        Symbol with .NS suffix
    """
    symbol = resolve_ticker(symbol.replace("$", "").strip().upper())
    if not symbol.endswith(NSE_SUFFIX) and not symbol.endswith(BSE_SUFFIX):
        symbol += NSE_SUFFIX
    return resolve_ticker(symbol)


# Issue triage defaults
# Mapping of keyword -> list of GitHub usernames to assign
ISSUE_OWNERS = {
    'Visualizer': ['SankarGaneshb'],
    'OptionChain': ['SankarGaneshb'],
    'Gemini': ['SankarGaneshb'],
    'Network': ['SankarGaneshb'],
    'MarketData': ['SankarGaneshb'],
    'Investbrand': ['SankarGaneshb', 'Jayasreesankarganesh'],
    'PledgeRover': ['SankarGaneshb'],
    'HILRover': ['SankarGaneshb', 'Jayasreesankarganesh'],
}

# Label rules: substring -> label
LABEL_RULES = [
    ('Visualizer', 'area:visualizer'),
    ('OptionChain', 'area:options'),
    ('nse_option', 'area:options'),
    ('Gemini', 'area:llm'),
    ('Investbrand', 'module:investbrand'),
    ('PledgeRover', 'module:pledgerover'),
    ('HILRover', 'module:hilrover'),
    ('timeout', 'type:timeout'),
    ('ConnectionError', 'type:network'),
    ('ValueError', 'type:data'),
    ('KeyError', 'type:data'),
]

# Application Limits
MAX_STOCKS_PER_PORTFOLIO = int(os.getenv("MAX_STOCKS_PER_PORTFOLIO", "20"))
MAX_PORTFOLIOS_PER_USER = int(os.getenv("MAX_PORTFOLIOS_PER_USER", "0"))  # 0 = unlimited
