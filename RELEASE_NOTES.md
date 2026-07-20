# 🚀 AlphaHive v4.3 - Release Notes

**Release Date:** Feb 07, 2026
**Version:** v4.3.2
**Status:** **Stable / Production Release**

---

## 🌟 Highlights

**AlphaHive v4.3.2** is a hotfix release addressing a crash in the Portfolio Analysis tab.

### 🛠️ **Fixes**
- **Portfolio Tab Crash**: Resolved `AttributeError: get_property_status` caused by a deprecated method call in the user profile check.

---

## 🌟 Highlights (v4.3.1)

**AlphaHive v4.3** introduces a **Strategic 2-Year Trading Calendar** and now includes **Average Annual Gain %** metrics.

### 📅 **Strategic Trading Calendar (New)**
- **Dual-Year Strategy**: Buying opportunities are now mapped to **2026**, with corresponding Selling targets in **2027**.
- **Metrics**: Added **Avg Annual Gain %** to the detailed table for better return expectations.
- **Holiday-Aware**: Dates are automatically adjusted for **NSE Holidays** and weekends for both 2026 and 2027.

---


### 📅 **Strategic Trading Calendar (New)**
- **Dual-Year Strategy**: Buying opportunities are now mapped to **2026**, with corresponding Selling targets in **2027**.
- **Holiday-Aware**: Dates are automatically adjusted for **NSE Holidays** and weekends for both 2026 and 2027.
- **Enhanced Visualization**: Side-by-side annual calendars for clear Entry (Green) and Exit (Red) planning.

---

# 🚀 AlphaHive v4.2 - Release Notes

**Release Date:** Jan 26, 2026
**Version:** v4.2.0
**Status:** **Stable / Archived**

---

## 🌟 Highlights

**AlphaHive v4.2** introduces enterprise-grade resilience to its data pipeline. We have hardened the market data fetching process to handle exchange outages gracefull by treating BSE as a first-class fallback for NSE.

### 🛡️ **Data Resilience (New)**
- **Exchange Fallback**: Automatically switches to BSE (`.BO`) if NSE (`.NS`) data is unavailable.
- **Smart Retries**: Implemented exponential backoff for network requests to prevent API throttling failures.
- **Test Coverage**: Achieved ~80% test coverage for core analytical engines (`Portfolio`, `Forensic`, `Profiler`).

### 📊 **Institutional Analytics**
- **Forensic Engine**: Validated fraud detection algorithms (Satyam, CWIP, Revenue Quality).
- **Investor Profiler**: Validated "Sleep Test" logic and asset allocation strategies.

---

## 🛠️ Key Fixes & Improvements

1.  **Simulation Graph Fix**: Resolved "No Data" errors for the Hunter/Preserver personas by replacing hollow ETF proxies with reliable liquid assets (GOLDBEES, TRENT).
2.  **Profile Lock**: Fixed a critical bug where the app trapped users in the profile setup screen.
3.  **System Health**: Patched crash report handling (`KeyError` in logs).
4.  **UI/UX**: Removed outdated "v2.0" labels; Unified branding to "AlphaHive".
5.  **Security**: Implemented Rate Limiting and Input Sanitization for tickers.
6.  **Integrity Shield**: Fixed invalid tool definition preventing the Agent from initializing (Switched to CrewAI native tools).
7.  **Shadow Score Integration**: Integrated "Shadow Score" (Institutional Accumulation) directly into the Portfolio Analysis Heatmap for instant visibility.
8.  **Code Hygiene**: Removed ~800 lines of unused "dead code" scripts to improve maintenance and test coverage accuracy.

---

## 📦 Deployment

This version deploys to **Google Cloud Run** via **GitHub Actions**.

**Deployment Steps:**
1.  Push the `main` branch to GitHub.
2.  The `render.yaml` blueprint auto-deploys `alphahive-api` and `alphahive-web` on Render.
3.  Ensure the required GitHub secrets (e.g. `GCP_SA_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`) are configured.

*(See `DEPLOYMENT.md` for full guide)*

---

## 🔮 What's Next (v5.0 Map)
- **Sector Rotation Dashboard**
- **Automated Weekly Email Reports**
- **User Authentication (Multi-User)**

---

*AlphaHive Team*
