
import json
import os
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
FORECAST_FILE = DATA_DIR / "forecast_history.json"

def _ticker_key(ticker: str) -> str:
    return str(ticker or "").strip().upper()


def _dedupe_latest(records: list) -> list:
    """Keep the newest forecast per ticker."""
    by_ticker: dict[str, dict] = {}
    for row in records:
        key = _ticker_key(row.get("ticker"))
        if not key:
            continue
        prev = by_ticker.get(key)
        if not prev or str(row.get("timestamp", "")) >= str(prev.get("timestamp", "")):
            by_ticker[key] = row
    return sorted(by_ticker.values(), key=lambda x: str(x.get("timestamp", "")), reverse=True)


def _load_db():
    """
    Loads the database, handling migration from legacy list format to user-dict format.
    Returns: {"users": { "username": [records...] }}
    """
    if not FORECAST_FILE.exists():
        return {"users": {}}
        
    try:
        with open(FORECAST_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # MIGRATION: If it's a list, it's the old format
        if isinstance(data, list):
            # Migrate legacy data to 'guest' or 'legacy'
            # We'll use 'guest' as the default bucket for untagged data
            return {"users": {"guest": data}}
            
        return data
        
    except Exception:
        return {"users": {}}

def _save_db(db):
    """Saves the database to disk."""
    with open(FORECAST_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)

def save_forecast(ticker, current_price, target_price, target_date, strategy_name, confidence, years_tested, username="guest"):
    """
    Saves a forecast record to JSON for future validation.
    Now supports username isolation.
    """
    # Create directory if needed
    if not DATA_DIR.exists():
        DATA_DIR.mkdir()

    record = {
        "timestamp": datetime.now().isoformat(),
        "ticker": ticker,
        "current_price": float(current_price),
        "target_price": float(target_price),
        "target_date": target_date,
        "strategy": strategy_name,
        "confidence": confidence,
        "years_tested": years_tested,
        "status": "active"
    }

    db = _load_db()
    
    # Ensure users dict exists (double safety)
    if not isinstance(db, dict) or "users" not in db:
        if isinstance(db, list): db = {"users": {"guest": db}} # Should be caught by load_db but safety first
        else: db = {"users": {}}
        
    if username not in db["users"]:
        db["users"][username] = []

    history = db["users"][username]
    ticker_key = _ticker_key(ticker)
    history = [h for h in history if _ticker_key(h.get("ticker")) != ticker_key]
    history.append(record)
    db["users"][username] = history
    
    _save_db(db)
    return True

def get_forecast_history(username="guest", unique=True):
    """Retrieve saved forecasts for a user (newest per ticker by default)."""
    db = _load_db()
    records = db.get("users", {}).get(username, [])
    if unique:
        deduped = _dedupe_latest(records)
        if len(deduped) < len(records):
            db["users"][username] = deduped
            _save_db(db)
        return deduped
    return sorted(records, key=lambda x: str(x.get("timestamp", "")), reverse=True)

def delete_forecasts(timestamps_to_delete, username="guest"):
    """
    Deletes forecasts with matching timestamps for a specific user.
    """
    if not FORECAST_FILE.exists():
        return False
        
    try:
        db = _load_db()
        users = db.get("users", {})
        
        if username not in users:
            return False
            
        history = users[username]
        initial_len = len(history)
        
        # Filter out the items to delete (match by timestamp; tolerate duplicate tickers)
        ts_set = set(timestamps_to_delete)
        new_history = [h for h in history if h.get("timestamp") not in ts_set]
        
        if len(new_history) == initial_len:
            return False # Nothing deleted
            
        users[username] = new_history
        db["users"] = users
        
        _save_db(db)
            
        return True
    except Exception as e:
        print(f"Error deleting forecasts: {e}")
        return False
