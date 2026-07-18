# Deploying Market-Rover (v5 Stack)

Market-Rover v5 is a decoupled application:

- **Backend** — FastAPI + LangGraph API (`market_rover/backend`), runs on port `8080`.
- **Frontend** — React 19 + Vite SPA (`market_rover/frontend`), built to static files and served via nginx.
- **Shared library** — `rover_tools/`, `utils/`, `config.py`, `agents.py`, `crew_engine.py` at the repo root, consumed by the backend agent nodes and automation scripts.

Production is hosted on **Google Cloud Run** (project `market-rover`, region `us-central1`) and deployed automatically via **GitHub Actions**.

🌐 **Live UI:** https://market-rover-ui-9514347926.us-central1.run.app/

---

## Prerequisites

1. Python 3.13
2. Node.js 20+
3. Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))
4. Market-Rover code (this repository)

---

## 1. Local Development

### 1.1 Backend (FastAPI + LangGraph)

```bash
cd market_rover/backend
pip install -r requirements.txt
# Copy the env template and fill in secrets (GOOGLE_API_KEY, DATABASE_URL,
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, ...)
cp .env.example .env
python src/server.py
```

The API is now available at `http://localhost:8080`.

### 1.2 Frontend (React + Vite)

In a separate terminal:

```bash
cd market_rover/frontend
npm install
cp .env.example .env
npm run dev
```

The Vite dev server proxies `/api` requests to the backend on port `8080`.

### 1.3 Docker (optional, full stack)

```bash
cd market_rover
docker-compose up --build
```

This brings up the backend, frontend, and a local PostgreSQL instance.

---

## 2. Production Deployment (Google Cloud Run)

Deployment is fully automated through GitHub Actions — there are no manual `gcloud` steps required for the main app.

### 2.1 How It Works

The workflow at `.github/workflows/market_rover_deploy.yml` triggers when you push to `main` with changes under:

- `market_rover/**`, or
- any of the shared root libraries (`rover_tools/`, `utils/`, `scripts/`, `agents.py`, `config.py`).

On trigger, the pipeline:

1. Runs the **backend test suite** (with the coverage gate).
2. Builds the backend and frontend images via **Cloud Build**.
   - Backend Dockerfile: `market_rover/Dockerfile`
   - Frontend Dockerfile: `market_rover/frontend/Dockerfile`
3. Deploys two **Cloud Run** services in `us-central1`:
   - `market-rover-api` — FastAPI backend
   - `market-rover-ui` — React frontend (nginx)

### 2.2 Deploying

```bash
git add .
git commit -m "feat: your change"
git push origin main
```

That's it — pushing to `main` kicks off tests, build, and Cloud Run deploy.

### 2.3 Required GitHub Secrets

Configure these in **Repo → Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `GCP_SA_KEY` | GCP service-account key for Cloud Build / Cloud Run deploy |
| `OPENAI_API_KEY` | LLM API access |
| `PROD_DB_PASSWORD` | Cloud SQL database password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (backend auth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (backend auth) |
| `JWT_SECRET` | Signing secret for backend-issued JWTs |
| `CODECOV_TOKEN` | Upload backend coverage reports |

---

## 3. Other Microservices (Cloud Run)

Beyond the Market-Rover backend and frontend, the platform runs specialized microservices for gamification and AI council scanning.

### 3.1 Services List
1. **InvestBrand API**: Node.js/Express service for the "Brand to Stock" game.
2. **Pledge-Rover**: Python/FastAPI service for the AI Governance Council.

### 3.2 Automatic Deployment
These services are automatically built and deployed via **GitHub Actions** when changes are pushed to their respective directories:
- `investbrand/` -> Deploy to Cloud Run (Node 20)
- `pledge_rover/` -> Deploy to Cloud Run (Python 3.13)

### 3.3 Manual Deployment (Optional)
If you need to deploy manually from your local machine:
```bash
# Deploy InvestBrand
cd investbrand/backend
gcloud builds submit --tag gcr.io/PROJECT_ID/investbrand-api
gcloud run deploy investbrand-api --image gcr.io/PROJECT_ID/investbrand-api

# Deploy Pledge-Rover
cd pledge_rover
gcloud builds submit --tag gcr.io/PROJECT_ID/pledge-rover
gcloud run deploy pledge-rover --image gcr.io/PROJECT_ID/pledge-rover
```

---

## 4. Troubleshooting

### Issue: Deploy Workflow Fails on Tests
- Run the backend suite locally: `cd market_rover/backend && pytest`.
- Fix failures and confirm the coverage gate passes before re-pushing.

### Issue: Container Fails to Start on Cloud Run
- Ensure the backend binds to `0.0.0.0:8080` (Cloud Run injects `PORT=8080`).
- Verify no `google-cloud-sql-connector` is instantiated at import time (build-time imports must pass without credentials).
- Check the Cloud Run **Logs** tab for the failing service.

### Issue: API Key / Auth Not Working
- Confirm `GOOGLE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `JWT_SECRET` are set as Cloud Run env vars / GitHub secrets.
- Verify the OAuth redirect URI matches the deployed frontend URL.

### Issue: Security Vulnerabilities
```bash
pip install safety
safety check
pip install --upgrade PACKAGE_NAME
```

---

## 5. Cost Estimate

**Free Tier (Recommended for Personal Use)**:
- Google Cloud Run: **$0** (scale-to-zero, generous free tier)
- Gemini API: **FREE** (light usage)
- Total: **$0/month** ✅

**Paid Tier (If Scaling)**:
- Cloud Run: ~$5-15/month (sustained traffic / higher CPU-memory)
- Gemini API: ~$1-5/month (light-moderate usage)

---

## 6. Post-Deploy Verification

1. Open https://market-rover-ui-9514347926.us-central1.run.app/
2. Verify the frontend loads and the login flow completes.
3. Run a sample ticker analysis to confirm the backend and LangGraph pipeline respond.

---

**Market-Rover v5 — deployed to Google Cloud Run. 🚀**
