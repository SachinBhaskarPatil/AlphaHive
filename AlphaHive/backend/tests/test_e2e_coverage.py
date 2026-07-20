"""
test_e2e_coverage.py — End-to-end route coverage for the modular FastAPI backend.

These tests exercise the route modules that were added after the Streamlit→React
migration (market, portfolio, brain, health, reports, calendar, profile helpers)
plus the json_safe utility. External I/O (DB, yfinance, NSE, rover_tools) is stubbed
so the suite stays hermetic and fast.

The tests assert the REAL, current API contracts consumed by the React frontend.
"""
import enum
import io
import os
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Importing the server wires repo-root onto sys.path and mounts every /api router.
from src.server import app

client = TestClient(app)


# ════════════════════════════════════════════════════════════════
# json_safe utility  (src/utils/json_sanitize.py)
# ════════════════════════════════════════════════════════════════

def test_json_safe_scalars():
    from src.utils.json_sanitize import json_safe

    assert json_safe(None) is None
    assert json_safe(float("nan")) is None
    assert json_safe(float("inf")) is None
    assert json_safe(np.float64("nan")) is None
    assert json_safe(np.int64(5)) == 5.0
    assert json_safe(np.float64(2.5)) == 2.5
    assert json_safe(3.14) == 3.14
    assert json_safe("hello") == "hello"
    assert json_safe(7) == 7


def test_json_safe_containers():
    from src.utils.json_sanitize import json_safe

    assert json_safe(np.array([1.0, 2.0])) == [1.0, 2.0]
    assert json_safe({"a": float("nan"), "b": 1}) == {"a": None, "b": 1}
    assert json_safe([1, float("inf"), "x"]) == [1, None, "x"]
    assert json_safe((1, 2)) == [1, 2]
    assert json_safe(pd.DataFrame({"x": [1, 2]})) == [{"x": 1}, {"x": 2}]
    assert json_safe(pd.Series({"a": 1})) == {"a": 1}


# ════════════════════════════════════════════════════════════════
# Calendar routes  (src/routes/calendar.py)
# ════════════════════════════════════════════════════════════════

def test_calendar_overview_and_static():
    r = client.get("/api/calendar/overview")
    assert r.status_code == 200
    assert "patterns" in r.json() and "windows" in r.json()

    r = client.get("/api/calendar/overview", params={"year": 2026})
    assert r.json()["year"] == 2026

    r = client.get("/api/calendar/muhurtham/2026")
    assert r.json()["count"] == 7
    # Unknown year falls back to the current-year window set.
    assert client.get("/api/calendar/muhurtham/1990").status_code == 200
    assert len(client.get("/api/calendar/seasonal").json()["patterns"]) == 6


def test_calendar_ticker_dependency_failure_returns_500():
    # rover_tools.market_data is unavailable in the test env → handled as 500.
    r = client.get("/api/calendar/ticker/TCS")
    assert r.status_code == 500


# ════════════════════════════════════════════════════════════════
# Health routes  (src/routes/health.py)
# ════════════════════════════════════════════════════════════════

def test_health_overview():
    wf = [
        {"type": "start", "session_id": "s1"},
        {"type": "end", "session_id": "s1", "status": "success"},
        {"type": "start", "session_id": "s2"},
        {"type": "end", "session_id": "s2", "status": "failed"},
    ]
    eng = [{"status": "success"}, {"status": "failed"}]
    errs = [{"timestamp": "2026-01-01"}]

    def fake(prefix):
        return {"workflow_events": wf, "engagement": eng, "errors": errs}.get(prefix, [])

    with patch("src.routes.health._load_jsonl", side_effect=fake):
        r = client.get("/api/health/overview")
        assert r.status_code == 200
        d = r.json()
        assert d["workflow_sessions"] == 2
        assert d["success_rate_pct"] == 50.0
        assert d["engagement_success"] == 1
        assert d["engagement_failures"] == 1
        assert d["error_count"] == 1


def test_health_lists():
    rows = [{"timestamp": "2026-01-02"}, {"timestamp": "2026-01-01"}]
    with patch("src.routes.health._load_jsonl", return_value=rows):
        assert client.get("/api/health/workflows").status_code == 200
        assert client.get("/api/health/engagement").status_code == 200
        r = client.get("/api/health/errors", params={"limit": 1})
        assert r.status_code == 200
        assert len(r.json()["errors"]) == 1


def test_health_load_jsonl_real_empty():
    from src.routes.health import _load_jsonl

    assert isinstance(_load_jsonl("nonexistent_prefix_zzz"), list)


# ════════════════════════════════════════════════════════════════
# Reports routes  (src/routes/reports.py)
# ════════════════════════════════════════════════════════════════

def test_reports_list_and_download(tmp_path):
    d = tmp_path / "user@test.com"
    d.mkdir()
    (d / "r1.html").write_text("<html>hi</html>", encoding="utf-8")
    (d / "r2.txt").write_text("plain", encoding="utf-8")
    (d / "ignore.log").write_text("x", encoding="utf-8")

    with patch("src.routes.reports._user_report_dir", return_value=d):
        r = client.get("/api/reports/user@test.com")
        assert r.status_code == 200
        names = [f["filename"] for f in r.json()["reports"]]
        assert "r1.html" in names
        assert "r2.txt" in names
        assert "ignore.log" not in names

        assert client.get("/api/reports/user@test.com/r1.html").status_code == 200
        assert client.get("/api/reports/user@test.com/r2.txt").status_code == 200
        assert client.get("/api/reports/user@test.com/nope.pdf").status_code == 404


def test_reports_list_missing_dir(tmp_path):
    with patch("src.routes.reports._user_report_dir", return_value=tmp_path / "ghost"):
        r = client.get("/api/reports/ghost@test.com")
        assert r.json()["reports"] == []


def test_user_report_dir_real():
    from src.routes.reports import _user_report_dir

    p = _user_report_dir("someone@test.com")
    assert str(p).endswith("someone@test.com")


# ════════════════════════════════════════════════════════════════
# Portfolio CRUD  (src/routes/portfolio.py)
# ════════════════════════════════════════════════════════════════

def test_portfolio_crud_happy_path():
    mock_pm = MagicMock()
    mock_pm.get_portfolio_names.return_value = ["My PF"]
    mock_pm.get_portfolio.return_value = pd.DataFrame(
        [{"Symbol": "TCS.NS", "Quantity": 10, "Company Name": "TCS"}]
    )
    mock_pm.save_portfolio.return_value = (True, "Saved")
    mock_pm.delete_portfolio.return_value = (True, "Deleted")

    with patch("utils.portfolio_manager.PortfolioManager", return_value=mock_pm):
        assert client.get("/api/portfolios/u@t.com").json()["portfolios"] == ["My PF"]

        r = client.get("/api/portfolios/u@t.com/My PF")
        assert r.status_code == 200
        assert r.json()["holdings"][0]["Symbol"] == "TCS.NS"

        r = client.post(
            "/api/portfolios/u@t.com",
            json={"name": "My PF", "holdings": [{"Symbol": "TCS.NS", "Quantity": 5}]},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "success"

        # lowercase "symbol" is normalized to "Symbol"
        r = client.post(
            "/api/portfolios/u@t.com",
            json={"name": "Lower", "holdings": [{"symbol": "INFY.NS"}]},
        )
        assert r.status_code == 200

        assert client.delete("/api/portfolios/u@t.com/My PF").status_code == 200


def test_portfolio_error_paths():
    mock_pm = MagicMock()
    mock_pm.get_portfolio.return_value = None
    mock_pm.save_portfolio.return_value = (False, "bad name")
    mock_pm.delete_portfolio.return_value = (False, "missing")

    with patch("utils.portfolio_manager.PortfolioManager", return_value=mock_pm):
        assert client.get("/api/portfolios/u@t.com/Ghost").status_code == 404
        r = client.post(
            "/api/portfolios/u@t.com",
            json={"name": "x", "holdings": [{"Symbol": "A"}]},
        )
        assert r.status_code == 400
        assert client.delete("/api/portfolios/u@t.com/Ghost").status_code == 404


# ════════════════════════════════════════════════════════════════
# Brain routes  (src/routes/brain.py)
# ════════════════════════════════════════════════════════════════

def test_brain_agents():
    r = client.get("/api/brain/agents")
    assert r.status_code == 200
    assert r.json()["counts"]["total"] == 4
    assert len(client.get("/api/brain/agents", params={"platform": "AlphaHive"}).json()["agents"]) == 4
    assert len(client.get("/api/brain/agents", params={"platform": "Other"}).json()["agents"]) == 0


def test_brain_memory_stats():
    from src.utils import db_manager as db_mod

    class FakeDB:
        async def try_connect(self):
            return True

        async def list_memories(self, user_handle=None, limit=50):
            return [
                {
                    "user_id": "u",
                    "ticker": "TCS.NS",
                    "stance": "ACCUMULATION",
                    "logic_summary": "up",
                    "analysis_date": __import__("datetime").datetime(2020, 1, 1),
                },
                {
                    "user_id": "u",
                    "ticker": "INFY.NS",
                    "stance": "DISTRIBUTION",
                    "logic_summary": "down",
                    "analysis_date": __import__("datetime").datetime(2020, 1, 1),
                },
                {
                    "user_id": "u",
                    "ticker": "ITC.NS",
                    "stance": "NEUTRAL",
                    "logic_summary": "flat",
                    "analysis_date": __import__("datetime").datetime(2020, 1, 1),
                },
            ]

    with patch.object(db_mod, "db", FakeDB()):
        with patch("src.routes.brain._evaluate_db_row", side_effect=[
            {"ticker": "TCS.NS", "signal": "ACCUMULATION", "outcome": "Success", "date": "2020-01-01", "confidence": "High", "source": "db"},
            {"ticker": "INFY.NS", "signal": "DISTRIBUTION", "outcome": "Failed", "date": "2020-01-01", "confidence": "High", "source": "db"},
            {"ticker": "ITC.NS", "signal": "NEUTRAL", "outcome": "Neutral (No Direction)", "date": "2020-01-01", "confidence": "High", "source": "db"},
        ]):
            r = client.get("/api/brain/memory")
            assert r.status_code == 200
            stats = r.json()["stats"]
            assert stats["total"] == 3
            assert stats["directional"] == 2
            assert stats["wins"] == 1
            assert stats["win_rate_pct"] == 50.0
            assert stats["source"] == "db"


def test_brain_autonomy():
    fake = types.ModuleType("utils.autonomy_logger")
    fake.read_autonomy_events = MagicMock(return_value=[{"event": "x"}])
    with patch.dict(sys.modules, {"utils.autonomy_logger": fake}):
        r = client.get("/api/brain/autonomy")
        assert r.status_code == 200
        assert r.json()["events"] == [{"event": "x"}]


# ════════════════════════════════════════════════════════════════
# Market routes  (src/routes/market.py)
# ════════════════════════════════════════════════════════════════

def test_market_analysis_success_and_valueerror():
    with patch("src.routes.market.run_ticker_analysis", return_value={"ticker": "TCS.NS", "ltp": 100}):
        r = client.get("/api/market/analysis/TCS")
        assert r.status_code == 200
        assert r.json()["ltp"] == 100

    with patch("src.routes.market.run_ticker_analysis", side_effect=ValueError("bad ticker")):
        assert client.get("/api/market/analysis/BAD").status_code == 400

    with patch("src.routes.market.run_ticker_analysis", side_effect=Exception("boom")):
        assert client.get("/api/market/analysis/ERR").status_code == 500


def test_market_tickers():
    mod = sys.modules["rover_tools.ticker_resources"]
    with patch.multiple(
        mod,
        NIFTY_50_SECTOR_MAP={"TCS.NS": "IT"},
        NIFTY_NEXT_50_SECTOR_MAP={},
        NIFTY_MIDCAP_SECTOR_MAP={},
        get_common_tickers=MagicMock(return_value=["TCS.NS"]),
        get_ticker_name=MagicMock(return_value="TCS"),
        parse_ticker_entry=MagicMock(side_effect=lambda e: e),
        create=True,
    ):
        r = client.get("/api/market/tickers", params={"category": "Nifty 50"})
        assert r.status_code == 200
        assert r.json()["tickers"][0]["ticker"] == "TCS.NS"


def test_market_stars():
    fake = types.ModuleType("rover_tools.analytics.win_rate")
    fake.get_performance_stars = MagicMock(return_value=[{"ticker": "TCS.NS"}])
    with patch.dict(sys.modules, {"rover_tools.analytics.win_rate": fake}):
        r = client.get("/api/market/stars")
        assert r.status_code == 200
        assert r.json()["stars"][0]["ticker"] == "TCS.NS"


def test_market_quotes():
    fake = types.ModuleType("rover_tools.market_data")

    class F:
        def fetch_ltp(self, t):
            return 100.0

    fake.MarketDataFetcher = F
    with patch.dict(sys.modules, {"rover_tools.market_data": fake}):
        r = client.get("/api/market/quotes", params={"tickers": "TCS.NS,INFY.NS"})
        assert r.status_code == 200
        assert r.json()["TCS.NS"] == 100.0


def test_market_snapshot_pdf():
    fake = types.ModuleType("rover_tools.visualizer_tool")
    fake.run_snapshot_logic = MagicMock(return_value={"pdf_buffer": io.BytesIO(b"%PDF-1.4 test")})
    with patch.dict(sys.modules, {"rover_tools.visualizer_tool": fake}):
        r = client.get("/api/market/snapshot/TCS/pdf")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"

    fake2 = types.ModuleType("rover_tools.visualizer_tool")
    fake2.run_snapshot_logic = MagicMock(return_value="Error: no data")
    with patch.dict(sys.modules, {"rover_tools.visualizer_tool": fake2}):
        assert client.get("/api/market/snapshot/BAD/pdf").status_code == 500


def test_market_correlation():
    # validation: fewer than 2 tickers
    assert client.post("/api/market/analytics/correlation", json={"tickers": ["TCS"]}).status_code == 400

    fake = types.ModuleType("rover_tools.analytics.portfolio_engine")

    class FakeEngine:
        def calculate_correlation_matrix(self, tickers):
            return pd.DataFrame(
                {"TCS.NS": [1.0, 0.5], "INFY.NS": [0.5, 1.0]},
                index=["TCS.NS", "INFY.NS"],
            )

    fake.AnalyticsPortfolio = FakeEngine
    with patch.dict(sys.modules, {"rover_tools.analytics.portfolio_engine": fake}):
        r = client.post("/api/market/analytics/correlation", json={"tickers": ["TCS", "INFY"]})
        assert r.status_code == 200
        assert "matrix" in r.json()

    fake_empty = types.ModuleType("rover_tools.analytics.portfolio_engine")

    class EmptyEngine:
        def calculate_correlation_matrix(self, tickers):
            return pd.DataFrame()

    fake_empty.AnalyticsPortfolio = EmptyEngine
    with patch.dict(sys.modules, {"rover_tools.analytics.portfolio_engine": fake_empty}):
        assert client.post(
            "/api/market/analytics/correlation", json={"tickers": ["TCS", "INFY"]}
        ).status_code == 400


def test_market_rebalance():
    assert client.post("/api/market/analytics/rebalance", json={"tickers": []}).status_code == 400

    fake = types.ModuleType("rover_tools.market_analytics")

    class FakeAnalyzer:
        def analyze_rebalance(self, data, mode="safety"):
            df = pd.DataFrame([{
                "ticker": "TCS.NS", "current_weight": 0.5, "target_weight": 0.4,
                "volatility": 0.2, "return": 0.1, "action": "Sell",
            }])
            return df, ["a note"]

    fake.MarketAnalyzer = FakeAnalyzer
    with patch.dict(sys.modules, {"rover_tools.market_analytics": fake}):
        r = client.post(
            "/api/market/analytics/rebalance",
            json={"tickers": ["TCS", "INFY"], "quantities": [10], "mode": "growth"},
        )
        assert r.status_code == 200
        assert r.json()["rows"][0]["ticker"] == "TCS.NS"

    fake_empty = types.ModuleType("rover_tools.market_analytics")

    class EmptyAnalyzer:
        def analyze_rebalance(self, data, mode="safety"):
            return pd.DataFrame(), ["warn"]

    fake_empty.MarketAnalyzer = EmptyAnalyzer
    with patch.dict(sys.modules, {"rover_tools.market_analytics": fake_empty}):
        r = client.post("/api/market/analytics/rebalance", json={"tickers": ["TCS", "INFY"]})
        assert r.status_code == 200
        assert r.json()["rows"] == []


def test_market_portfolio_visuals():
    assert client.post("/api/market/analytics/portfolio-visuals", json={"tickers": []}).status_code == 400

    fake = types.ModuleType("src.services.portfolio_visuals")
    fake.build_portfolio_visuals = MagicMock(return_value={"ok": True})
    with patch.dict(sys.modules, {"src.services.portfolio_visuals": fake}):
        r = client.post("/api/market/analytics/portfolio-visuals", json={"tickers": ["TCS"]})
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ════════════════════════════════════════════════════════════════
# Analyze routes  (src/routes/analyze.py)
# ════════════════════════════════════════════════════════════════

def test_analyze_validation_and_status():
    assert client.post(
        "/api/analyze", json={"tickers": [], "discoverable_handle": "u@t.com"}
    ).status_code == 400
    assert client.get("/api/analyze/status/does_not_exist").status_code == 404


# ════════════════════════════════════════════════════════════════
# Profile routes  (src/routes/profile.py)
# ════════════════════════════════════════════════════════════════

def test_profile_update():
    mock_um = MagicMock()
    mock_um.get_user_profile.return_value = {"persona": "The Hunter", "brands": []}
    mock_um.profiles = {}
    with patch("utils.user_manager.UserProfileManager", return_value=mock_um), \
         patch("src.routes.profile.db") as mock_db:
        mock_db.try_connect = AsyncMock(return_value=False)
        r = client.post("/api/profile", json={
            "user_handle": "u@t.com",
            "persona": "The Hunter",
            "brands": ["TCS.NS"],
            "growth_brands": ["X"],
            "alpha_brands": ["Y"],
            "onboarding_complete": True,
        })
        assert r.status_code == 200
        assert r.json()["status"] == "success"


def test_profile_analyze_persist():
    mock_um = MagicMock()
    with patch("utils.user_manager.UserProfileManager", return_value=mock_um), \
         patch("src.routes.profile.db") as mock_db:
        mock_db.try_connect = AsyncMock(return_value=False)
        r = client.post("/api/profile/analyze", json={"q1": 3, "q2": 3, "q3": 3, "user_handle": "u@t.com"})
        assert r.status_code == 200
        assert r.json()["persona"] == "The Hunter"


def test_profile_reset_and_onboarding():
    mock_um = MagicMock()
    with patch("utils.user_manager.UserProfileManager", return_value=mock_um):
        assert client.post("/api/profile/u@t.com/reset").status_code == 200
        assert client.post("/api/profile/u@t.com/complete-onboarding").status_code == 200


def test_profile_status():
    mock_um = MagicMock()
    mock_um.get_profile_status.return_value = {"exists": True}
    mock_um.get_user_profile.return_value = {"persona": "The Hunter"}
    with patch("utils.user_manager.UserProfileManager", return_value=mock_um):
        r = client.get("/api/profile/u@t.com/status")
        assert r.status_code == 200
        assert r.json()["status"]["exists"] is True


def test_profile_meta_brands():
    mod = sys.modules["rover_tools.ticker_resources"]
    with patch.multiple(
        mod,
        NIFTY_50_SECTOR_MAP={"TCS.NS": "IT"},
        NIFTY_NEXT_50_SECTOR_MAP={},
        NIFTY_MIDCAP_SECTOR_MAP={},
        brand_icon_data_url=MagicMock(return_value="data:image/png;base64,x"),
        get_brand_meta=MagicMock(return_value={"name": "TCS", "color": "#111"}),
        get_common_tickers=MagicMock(return_value=["TCS.NS"]),
        parse_ticker_entry=MagicMock(side_effect=lambda e: e),
        create=True,
    ):
        r = client.get("/api/profile/meta/brands", params={"category": "Nifty 50"})
        assert r.status_code == 200
        assert r.json()["brands"][0]["ticker"] == "TCS.NS"


def test_profile_smart_portfolio():
    fake = types.ModuleType("rover_tools.analytics.investor_profiler")

    class InvestorPersona(enum.Enum):
        DEFENDER = "The Defender"
        HUNTER = "The Hunter"

    class Validator:
        def validate_holdings(self, holdings):
            return []

    class InvestorProfiler:
        def __init__(self):
            self.validator = Validator()

        def generate_smart_portfolio(self, persona, user_picked_brands=None,
                                     user_growth_brands=None, user_alpha_brands=None):
            return [{"Symbol": "TCS.NS", "Quantity": 10}]

    fake.InvestorPersona = InvestorPersona
    fake.InvestorProfiler = InvestorProfiler

    mock_um = MagicMock()
    mock_um.get_user_profile.return_value = {"persona": "The Defender"}
    mock_pm = MagicMock()
    mock_pm.get_portfolio_names.return_value = []

    with patch.dict(sys.modules, {"rover_tools.analytics.investor_profiler": fake}), \
         patch("utils.user_manager.UserProfileManager", return_value=mock_um), \
         patch("utils.portfolio_manager.PortfolioManager", return_value=mock_pm):
        r = client.post("/api/profile/smart-portfolio", json={
            "user_handle": "u@t.com",
            "brands": ["TCS.NS"],
            "save": True,
        })
        assert r.status_code == 200
        assert r.json()["saved_portfolio"] == "Smart The Defender Portfolio"


# ════════════════════════════════════════════════════════════════
# Shadow routes  (src/routes/shadow.py) — degraded (no DB) paths
# ════════════════════════════════════════════════════════════════

def test_shadow_market_and_user_no_db():
    with patch("src.routes.shadow.db") as mock_db:
        mock_db.try_connect = AsyncMock(return_value=False)
        assert client.get("/api/shadow/market").json()["shadow_signals"] == []
        assert client.get("/api/shadow/u@t.com").json()["shadow_signals"] == []
