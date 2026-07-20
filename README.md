# 🔍 AlphaHive - AI Stock Intelligence Platform for Indian Markets - Your personal quant researcher

**Multi-agent AI that reads your Indian equity portfolio like a research desk – portfolios, heatmaps, institutional flows, and forecasts in one place.**

> [!TIP]
> **NEW TO ALPHAHIVE?** Check out our [User Guide](USER_GUIDE.md) for a full onboarding to our AI Agents and Shadow Analysis tools.

**Your complete toolkit for smart investing decisions powered by cutting-edge AI**


![Security](https://img.shields.io/badge/Security-100%2F100-success)
![Cost](https://img.shields.io/badge/Cost-$0%2Fmonth-success)
![Status](https://img.shields.io/badge/Status-Production-brightgreen)
![Process Efficiency](https://img.shields.io/badge/Process%20Efficiency-82.6%25-blue)

## Why AlphaHive?

- Built **for Indian markets**: Nifty, Sensex, sector indices, NSE symbols, and block deals – not generic US-only tooling.
- **Enterprise v5 Stack**: Decoupled **FastAPI Backend** and **React 19 (Vite) Frontend** for maximum performance and scalability.
- **LangGraph Intelligence**: 10+ specialized nodes orchestrated via **Gemini 2.0-Flash** for news, sentiment, seasonality, MTC technicals, and forensic signals.
- **Production-ready**: Hosted on **[Render](https://alphahive-web.onrender.com/)** (`alphahive-web` + `alphahive-api` + Postgres) with CI/CD coverage gates (70%).

🌐 **Live UI:** https://alphahive-web.onrender.com/

---

## 🚀 Quick Start

### Prerequisites

- Python 3.13 (Global requirement for multi-module parity)
- Google Gemini API key ([Get free key](https://makersuite.google.com/app/apikey))

### Local Development (v5)

#### 1. Backend (FastAPI)
```bash
cd AlphaHive/backend
pip install -r requirements.txt
# Set GOOGLE_API_KEY and DATABASE_URL in .env
python src/server.py
```

#### 2. Frontend (React)
```bash
cd AlphaHive/frontend
npm install
npm run dev
```

---

## ✨ Features at a Glance

AlphaHive is an AI-powered platform with a **comprehensive suite of intelligence tools**:

| Feature | Description | Tech Highlights |
|---------|-------------|-----------------|
| **📤 Portfolio Analysis** | AI-driven multi-stock analysis with news & sentiment | CrewAI, Gemini, Parallel Processing |
| **📈 Market Visualizer** | High-fidelity dashboards & Monthly Heatmaps | Plotly, PNG export, IQR Filtering |
| **📊 Benchmark Analysis** | Benchmark Deep-dives (Nifty, Sensex, Bank Nifty) | Shared Analysis pipe, React filter chips |
| **🧩 InvestBrand** | **Brand to Stock Puzzle Game** with AI Word Clouds | React, Node.js, Gemini API |
| **⚖️ Smart Rebalancer** | Growth vs Safety modes with Corporate Action Auto-Fix | Sharpe Ratio, Risk Parity |
| **🕵️ Shadow Tracker** | **Real Institutional Data** (Block Deals, FII Traps) | nselib, Real-time NSE Data |
| **🎯 Forecast Tracker** | Real-time tracking & management of AI results | yfinance, Interactive React data grid |
| **👤 Investor Profiler** | **Model Portfolio Generator** with "Sleep Test" | Asset Allocation, Composite Benchmarking |
| **🧠 Agent Brain** | **Agent Observability** (Memory, Logic, Pivots) | JSON Ledger, Autonomy Logger |
| **📢 Automated Intel** | **Daily Markets & Weekly Backtests** (Discussions) | GitHub Actions, gh-cli, Dependabot |

---

## 🚀 All Features

### **📤 Portfolio Analysis**
*(Sidebar Menu: Portfolio Analysis)*

Upload your portfolio and get comprehensive AI-powered insights:

- ✅ **Multi-Stock Analysis** - Process multiple stocks simultaneously (5x faster with parallel processing)
- ✅ **News Scraping** - Auto-scrape latest news from Moneycontrol using Newspaper3k
- ✅ **Sentiment Analysis** - AI-powered classification (Positive/Negative/Neutral)
- ✅ **Market Context** - Analyze Nifty 50 and sector trends
- ✅ **Weekly Intelligence Reports** - Comprehensive briefings with risk highlights
- ✅ **View Report History** - Browse, search, and download past analyses
- ✅ **Export Options** - HTML format

### **📈 Market Snapshot **

Generate professional market snapshots for sharing:

- ✅ **Price Charts** - Real-time stock price movements with volatility bands
- ✅ **Scenario Targets** - Bull/Bear/Neutral price predictions
- ✅ **Monthly Heatmap** - Historical performance view
- ✅ **AI-Powered Insights** - Gemini-generated market analysis
- ✅ **PNG Export** - Download professional high-res composite dashboard

**Security:** Input sanitization, rate limiting (30 req/min)

### **🔥 Monthly Heatmap **

Deep-dive into historical patterns and future predictions for individual stocks:

- ✅ **Stock Selection Filters** - Instantly filter lists by **Nifty 50**, **Sensex**, or **Bank Nifty**
- ✅ **Centered Heatmap** - Balanced Green-Red color scale for instant pattern recognition
- ✅ **🚫 Outlier Filter** - Exclude extreme market anomalies (>1.5x IQR) for trend accuracy
- ✅ **Interactive Heatmap** - Monthly returns (Year × Month) since IPO
- ✅ **Seasonality Analysis** - Identify best/worst months with **Win Rate %**
- ✅ **3 Forecast Scenarios** - Conservative, Baseline, Aggressive 2026 projections
- ✅ **Iterative Monthly Forecasting** - AI applies strategy month-by-month for granularity.
- ✅ **Continuous Forecast Paths** - Seamless projection from history to current date to 2026 target.

### **📊 Benchmark Analysis **

Specialized focus on major market indices:

- ✅ **Index Deep-Dive** - Analyze Nifty 50, Sensex, Bank Nifty, and Sector Indices
- ✅ **Consolidated Logic** - Uses the same high-fidelity analysis as individual stocks
- ✅ **Market Sentiment** - Assess broader market trends before stock picking

### **⚖️ Smart Portfolio Rebalancer **

Advanced optimization engine to balance Risk and Reward:

- ✅ **Dual Strategy Modes**:
    - **Safe Mode 🛡️**: Risk Parity (Inverse Volatility) for steady growth.
    - **Growth Mode 🚀**: Sharpe Ratio Optimization (Risk-Adjusted Return) for maximum alpha.
- ✅ **Auto-Correction 🧠**: Automatically detects and fixes price anomalies like **Corporate Actions/Demergers** (e.g., ABFRL).
- ✅ **Intelligent Grading**:
    - **Overweight/Underweight**: Exact percentage drift calculation.
    - **Actionable Advice**: "Buy", "Sell", or "Hold" with transparent "Why?" comments.
- ✅ **Resilience**: Handles missing data, new IPOs, and negative return assets gracefully.

### **🕵️ Shadow Tracker (Institutional Spy)**
Track the "Smart Money" with **Real Market Data**:

- ✅ **Whale Alerts 🐋** - Live feed of **Block Deals** (> ₹1 Crore) fetched directly from NSE.
- ✅ **Bull/Bear Trap Detector 🪤** - Analyzes FII Index Futures Long/Short ratios to detect market euphoria or panic.
- ✅ **Silent Accumulation** - Identifies stocks with low volatility + high delivery volume (Pre-breakout signals).
- ✅ **Sector Rotation** - Tracks changes in sector momentum over 1W/1M periods.
- **Tech**: Powered by `nselib` for direct NSE connectivity.

### **🎯 Forecast Tracker **

Monitor your predictions against real market movement:

- ✅ **Live Tracking** - Real-time price updates via `yfinance`
- ✅ **Entry vs. Current** - Automatic calculation of % gains/losses
- ✅ **Portfolio Metrics** - Instant average performance across all saved forecasts
- ✅ **🗑️ Deletion Capability** - Clean up old or inaccurate forecasts through an interactive editor

### **👤 Investor Profiler & Model Portfolio**
*(Sidebar Menu: Investor Profile)*

Scientific asset allocation based on your psychological risk tolerance:

- ✅ **The "Sleep Test"** - 3-step psychometric quiz to determine your Investor Persona (Conservative/Moderate/Aggressive).
- ✅ **Asset Allocation Engine** - Suggests exact % split between Equity (Large/Mid/Small), Debt, and Gold.
- ✅ **🤖 Model Portfolio Generator** - Auto-generates a high-quality stock list matching your allocated percentages.
- ✅ **🚀 Comparison Simulation** - Backtests your generated model portfolio against a **Composite Benchmark** (weighted average of Nifty/Gold/Bonds) to prove Alpha.


### **⚙️ System Health (New)**

Monitor the efficiency of the development cycle itself:

- ✅ **Cycle Time Tracking** - Measure how long features take to build.
- ✅ **Exception Audit** - Track every "Emergency Override" or broken rule.
- ✅ **Stability Score** - Dynamic score based on protocol adherence.

### **🧠 Agent Brain (Autonomy Monitor)**
*(Sidebar Menu: Agent Brain)*

Visualize the **internal thought process** of your AI agents:

- ✅ **Active Memory Viewer** - See the exact "Past Predictions" the agents are recalling.
- ✅ **Autonomy Event Stream** - Track real-time decisions like "Regime Changes" and "Tool Pivots".
- ✅ **Live Logic Matrix** - Understand WHY the agent switched to "Defensive Mode".

**Security:** Input sanitization, rate limiting (20 req/min), persistent server-side state.

---

## 🏗️ Architecture

### Multi-Agent AI System

AlphaHive uses **5 specialized AI agents** orchestrated by CrewAI:

```mermaid
graph TD
    User((User)) -->|Uploads Portfolio| A[Portfolio Manager]

    subgraph "Hybrid Intelligence Funnel"
        A -->|Validated Tickers| B[Market Strategist]
        B -.->|Calls Integrity Shield| B1[Forensic Check]
        B -->|Macro & News Context| C[Sentiment Analyzer]
        A -->|Tickers| D[Technical Analyst]

        B -->|Strategic Report| E[Report Generator]
        C -->|Sentiment Flags| G[Shadow Analyst]
        D -->|Trend & Levels| G

        G -->|Trap Signals| E
        D -->|Technical Report| E
        C -->|Sentiment Report| E
    end

    subgraph "Visualizers"
        User -->|Request Snapshot| F[Data Visualizer]
    end

    E -->|Final Intelligence Report| User
    F -->|Visual Dashboard| User
```

**Key Technologies:**
- **LangGraph**: Stateful, multi-node orchestration
- **FastAPI**: High-performance async backend
- **React 19 + Vite**: Modern, responsive frontend
- **Google Gemini 2.0 Flash**: Core LLM reasoning engine
- **PostgreSQL (Cloud SQL)**: Consolidated database for all modules
- **yfinance / nselib**: Real-time Asian & Indian market data

## 📊 Usage Guide

### **Portfolio Analysis**

1. **Upload Portfolio CSV**
   ```csv
   Symbol,Company Name,Quantity,Average Price
   RELIANCE,Reliance Industries Ltd,10,2450.50
   TCS,Tata Consultancy Services,5,3550.00
   INFY,Infosys Ltd,15,1450.75
   ```

2. **Click "Analyze Portfolio"**
   - AI agents scrape news, analyze sentiment
   - Generate comprehensive intelligence report
   - View charts and download results

3. **Browse Previous Reports**
   - Scroll down to see report history
   - Filter and search
   - Download in multiple formats

### **Market Snapshot**

1. Enter stock ticker (e.g., `SBIN`, `TCS`, `RELIANCE`)
2. Click **"Generate Snapshot"**
3. Wait ~30 seconds for the high-fidelity composite image
4. **Download PNG** to share with colleagues or save for records

### **Monthly Heatmap & 2026 Forecast**

1. Select/Search for a stock or enter a custom ticker
2. **Filter by Index**: Use "Nifty 50" or "Bank Nifty" to narrow down major stocks
3. Click **"📊 Analyze"**
4. Explore interactive Plotly charts:
   - **Outlier Filtering**: Toggle "Exclude Outliers" to strip anomalies
   - **Centered Heatmap**: Unified color scale for gains vs losses
   - **2026 Forecast**: AI predicts 3 scenarios (Conservative/Baseline/Aggressive)
5. **Save Forecast**: Click "Save" to track performance in Forecast Tracker

### **Benchmark Index Analysis**

1. Select a major index (Nifty 50, Sensex, Bank Nifty, etc.)
2. Click **"🚀 Analyze Index"**
3. View high-level market sentiment and seasonal trends

### **Forecast Tracker**

1. Monitor your saved predictions against live market prices
2. **🗑️ Manage List**: Use checkboxes and the "Delete Selected" button to clean up your dashboard


---

## 🔐 Security Features

AlphaHive includes enterprise-grade security:

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Input Sanitization** | Regex validation, injection prevention | ✅ Active |
| **Rate Limiting** | 20-30 requests/minute per features | ✅ Active |
| **Investment Disclaimer** | Bottom status bar, always visible | ✅ Active |
| **Secure API Keys** | Environment variables, Render secrets | ✅ Active |
| **Timezone Handling** | Project-wide timezone-aware operations | ✅ Active |

**Security Score:** 100/100 🟢

 > **Why 100%?** We have now implemented **User Authentication (Login)**, strong internal defenses, and **Automated Security CI/CD Pipelines** (Safety Check).

| Feature | Status |
| :--- | :--- |
| **User Authentication** | ✅ Active (Login Required) |
| **Input Sanitization** | ✅ Active |
| **Rate Limiting** | ✅ Active |
| **Investment Disclaimer** | ✅ Active |

---

## 💰 Cost Breakdown

### **Free Tier (Recommended)**

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Render (Web + API) | Hosting (free tier) | **$0** |
| Gemini 1.5 Flash | <400K tokens/day | **$0** |
| yfinance | Stock data | **$0** |
| Newspaper3k | News scraping | **$0** |
| **Total** | | **$0/month** ✅ |

### **Cost Estimates (If Scaling)**

**Expected Usage (Free Tier):**
- ~10-20 analyses/day
- ~5,000-10,000 tokens/day
- **Well within limits** ✅

**If Exceeding Free Tier:**
- Gemini Paid: ~$1-5/month (500K+ tokens/day)
- Render: ~$7+/month (if upgrading off free tier)

---

## 🛠️ Technology Stack

### Core Backend
- **CrewAI** - Multi-agent orchestration
- **Google Gemini 2.0-flash** - Latest LLM reasoning engine
- **langchain-google-genai** - LLM integration
- **Python 3.13** - Universal production standard
- **Pandas / Numpy** - Data manipulation (IQR statistical filtering)

### Web UI & Visualization
- **React 19 + Vite** - Modern SPA frontend (interactive data grids, filter chips, client-side routing)
- **FastAPI** - High-performance async API serving the React frontend
- **Plotly** - High-fidelity interactive charts
- **Matplotlib/Pillow** - Image generation for snapshots

### Security & Utilities
- **Input validation** - Custom regex sanitization
- **Rate limiting** - Time-window based throttling
- **Persistent Tracker** - JSON-based forecast history management


---

## 📁 Project Structure

```
AlphaHive/
├── AlphaHive/               # v5 Cloud-Native application
│   ├── Dockerfile                 # Backend image (FastAPI + LangGraph)
│   ├── docker-compose.yml         # Local dev: backend + frontend + postgres
│   ├── backend/                   # FastAPI + LangGraph API service
│   │   ├── requirements.txt          # Backend Python dependencies
│   │   └── src/
│   │       ├── server.py                # FastAPI entrypoint (python src/server.py, port 8080)
│   │       ├── alphahive_graph.py       # 10-node parallel LangGraph
│   │       ├── agents/                  # Async agent nodes
│   │       ├── routes/                  # Modular API routers
│   │       └── utils/                   # DB manager, logger, helpers
│   └── frontend/                  # React 19 + Vite SPA
│       ├── Dockerfile                # Frontend image (static build + nginx)
│       ├── nginx.conf                # SPA routing + /api proxy
│       ├── vite.config.js
│       └── src/                      # Tabs, components, context, API client
│
├── rover_tools/                # Shared analysis library (used by backend nodes & automation)
│   ├── market_data.py             # Stock & Option data fetcher
│   ├── ticker_resources.py        # Categorized stock indices (Nifty/Sensex)
│   ├── shadow_tools.py            # Institutional / block-deal signals
│   ├── visualizer_tool.py         # Chart generation
│   └── analytics/                 # Forensic, portfolio, profiler, seasonality engines
│
├── utils/                      # Shared utilities (used by backend & scripts)
│   ├── forecast_tracker.py        # Persistence logic for Forecast Tracker
│   ├── security.py                # Input sanitization, rate limiting
│   ├── report_visualizer.py       # Portfolio charts
│   ├── portfolio_manager.py       # Portfolio parsing & management
│   └── user_manager.py            # User records
│
├── agents.py                   # AI agent definitions (shared)
├── crew_engine.py              # Orchestration engine (shared)
├── config.py                   # Configuration (shared)
├── scripts/                    # Automation (daily reports, backtests, SRE sentinel)
├── requirements.txt            # Root shared-library dependencies
├── .env.example                # Environment template
│
├── render.yaml                 # Render blueprint (alphahive-web + alphahive-api + DB)
├── .github/workflows/          # CI (tests / coverage)
├── reports/                    # Intelligence reports
├── logs/                       # Application logs
└── metrics/                    # Performance metrics
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

```bash
# Required
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional
MAX_PARALLEL_STOCKS=5          # Concurrent analysis
LOOKBACK_DAYS=7                # News lookback period
CONVERT_TO_CRORES=true         # Currency formatting
MAX_ITERATIONS=5               # Max agent reasoning loops
PORTFOLIO_FILE=Portfolio.csv   # Default portfolio filename
RATE_LIMIT_DELAY=1.0           # Delay between API calls
```

The FastAPI backend listens on port `8080` by default (`python src/server.py`); the React frontend dev server runs via `npm run dev`.

### 🔐 Google Login & Authentication (Production)

Authentication is handled by the **FastAPI backend** via **Google OAuth** and signed JWTs. Configure the following environment variables (locally in the backend `.env`, and as Render / GitHub secrets in production):

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-signing-secret
```

The backend exchanges the OAuth code, verifies the Google identity, and issues a JWT that the React frontend stores and sends on subsequent API calls.

---

### 🤖 Automated Market Intelligence

- **Daily Report**: The system generates a comprehensive market report every day at 00:00 UTC and posts it to **GitHub Discussions**.
- **Weekly Backtest**: Every Sunday, it backtests strategy performance and posts a **Summary Report** to Discussions.
- **Failures**: Critical system failures are still logged as Issues.

```toml
GOOGLE_API_KEY = "your-key-here"
```

---

## 🎯 Use Cases

1. **Weekly Portfolio Review**
   - Upload portfolio every Monday
   - Review AI-generated intelligence
   - Track sentiment trends

2. **Pre-Earnings Analysis**
   - Generate market snapshot before earnings
   - Assess bull/bear scenarios

3. **Historical Pattern Analysis**
   - Use monthly heatmap for seasonality
   - Identify best months for specific stocks
   - Plan entry/exit based on trends

4. **2026 Planning**
   - View AI-powered price forecasts
   - Compare conservative vs aggressive scenarios
   - Make informed long-term decisions

---

## 🔧 Troubleshooting

### Common Issues

**"No module named 'crewai'"**
```bash
pip install -r requirements.txt
```

**"GOOGLE_API_KEY not found"**
1. Create `.env` file in project root
2. Add: `GOOGLE_API_KEY=your_key_here`
3. Get free key: https://makersuite.google.com/app/apikey

**"Invalid ticker format"**
- Use NSE symbols: `SBIN`, `TCS`, `RELIANCE` (without .NS)
- System auto-adds .NS suffix

**"Rate limit exceeded"**
- Market Snapshot: Wait 60 seconds (30 req/min limit)
- Monthly Heatmap: Wait 60 seconds (20 req/min limit)

**News scraping fails (Windows)**
```bash
pip install lxml lxml_html_clean
```

---

## 📚 Documentation

- `DEPLOYMENT.md` - Local dev & Render deployment guide
- `SECURITY_FIXES_SUMMARY.md` - Security implementation details
- `SESSION_SUMMARY_DEC22.md` - Latest development session
- `FINAL_AUDIT_CHECKLIST.md` - Comprehensive audit report
- `AI_AGENTS.md` - Detailed Agentic AI Architecture & Roles

---

## 🎓 Best Practices

### For Monthly Analysis :
- **🚫 Filter Anomalies**: Use the "Exclude Outliers" toggle for stocks with a history of extreme spikes (e.g. IPO years or black-swan events) to see the true seasonal trend.
- **🔍 Use Index Filters**: Start with "Nifty 50" or "Bank Nifty" pills to find liquid stocks before moving to custom tickers.
- **📊 Benchmark First**: Always analyze the Benchmark Index before individual stocks to understand overall market direction.
- **💎 Check Confidence**: Look for "High Confidence" (3+ years data) before trusting a 2026 forecast.

### For Forecast Tracking :
- **⛳ Save Iteratively**: Save forecasts for multiple stocks to look for sector-wide performance trends.
- **🗑️ Audit Weekly**: Use the Deletion Capability to remove "noise" and focus on your highest-conviction predictions.
- **📈 Veracity Check**: Compare Entry vs. Current price regularly to see which AI strategy (Median vs Std Dev) is winning.


---

## 🚢 Deployment

### Local Development
```bash
# Backend (FastAPI + LangGraph)
cd AlphaHive/backend
pip install -r requirements.txt
python src/server.py            # http://localhost:8080

# Frontend (React + Vite) — separate terminal
cd AlphaHive/frontend
npm install
npm run dev
```

### Production (Render)

1. Push code to `main` — Render auto-deploys services defined in `render.yaml`.
2. Services: `alphahive-api` (FastAPI backend) and `alphahive-web` (React frontend), plus `alphahive-db` (Postgres).
3. Set secrets in the Render dashboard: `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET` (and `VITE_GOOGLE_CLIENT_ID` on the web service).
4. Google OAuth redirect URI must be: `https://alphahive-web.onrender.com/auth/callback`

**Current Production:** https://alphahive-web.onrender.com/

See `DEPLOYMENT.md` and `render.yaml` for the full guide.

---

## 🤝 Contributing

This is a personal project, but feel free to:
- Fork for your own use
- Report issues on GitHub
- Sort pull requests

---

## ⚠️ Disclaimer

**AlphaHive is for informational purposes only.** Not financial advice. Past performance ≠ future results. Consult a qualified advisor. No liability for losses. By using this app, you accept these terms.

---

## 📝 License

Personal use. Ensure compliance with data source terms of service:
- yfinance: Check Yahoo Finance TOS
- Newspaper3k: Respect robots.txt
- NSE data: For informational purposes

---

## 🎖️ Credits

**Built with:**
- [CrewAI](https://www.crewai.com/) - Multi-agent framework
- [Google Gemini](https://ai.google.dev/) - Large language model
- [React](https://react.dev/) - Frontend UI library
- [FastAPI](https://fastapi.tiangolo.com/) - Backend web framework
- [Plotly](https://plotly.com/) - Visualization library
- [yfinance](https://github.com/ranaroussi/yfinance) - Financial data
- [Newspaper3k](https://newspaper.readthedocs.io/) - News scraping

---

**AlphaHive** - Your intelligent stock companion 🚀

*Last Updated: July 20, 2026 (AlphaHive rebrand)*

---

## ⚠️ Investment Disclaimer

**AlphaHive is for informational and educational purposes only.**

- This application does NOT provide investment, financial, legal, or tax advice.
- All analyses, forecasts, and recommendations are automated and may be inaccurate.
- Past performance does not guarantee future results.
- You should consult with a qualified financial advisor before making investment decisions.
- The creators of AlphaHive assume no liability for financial losses.
- By using this application, you acknowledge these risks and agree to use at your own discretion.

**NSE Data Disclaimer:**
This application uses publicly available data from NSE and Yahoo Finance. We do not guarantee the accuracy, completeness, or timeliness of this data.
