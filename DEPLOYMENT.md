# Deploying AlphaHive (v5 Stack)

AlphaHive v5 is a decoupled application:

- **Backend** — FastAPI + LangGraph API (`AlphaHive/backend`), runs on port `8080`.
- **Frontend** — React 19 + Vite SPA (`AlphaHive/frontend`), built to static files and served via nginx.
- **Shared library** — `rover_tools/`, `utils/`, `config.py`, `agents.py`, `crew_engine.py` at the repo root, consumed by the backend agent nodes and automation scripts.

Production is hosted on **[Render](https://render.com/)** via `render.yaml` (`alphahive-web`, `alphahive-api`, `alphahive-db`).

🌐 **Live UI:** https://alphahive-web.onrender.com/  
🔌 **API:** https://alphahive-api.onrender.com/

---

## Prerequisites

1. Python 3.13
2. Node.js 20+
3. Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))
4. AlphaHive code (this repository)

---

## 1. Local Development

### 1.1 Backend (FastAPI + LangGraph)

```bash
cd AlphaHive/backend
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
cd AlphaHive/frontend
npm install
cp .env.example .env
npm run dev
```

The Vite dev server proxies `/api` requests to the backend on port `8080`.

### 1.3 Docker (optional, full stack)

```bash
cd AlphaHive
docker-compose up --build
```

This brings up the backend, frontend, and a local PostgreSQL instance.

---

## 2. Production Deployment (Render)

Production is defined in root `render.yaml` and auto-redeploys on each push to the connected branch (`main`).

### 2.1 Services

| Service | Render name | URL |
|---------|-------------|-----|
| Frontend (static) | `alphahive-web` | https://alphahive-web.onrender.com/ |
| Backend (FastAPI) | `alphahive-api` | https://alphahive-api.onrender.com/ |
| Database | `alphahive-db` | (internal Postgres) |

The frontend proxies `/api/*` to `alphahive-api` (see `render.yaml` routes).

### 2.2 Deploying

```bash
git add .
git commit -m "feat: your change"
git push origin main
```

Render rebuilds `alphahive-api` and `alphahive-web` automatically.

### 2.3 Required Render Secrets

Set these in the **Render dashboard** (Environment → secrets; `sync: false` in `render.yaml`):

| Secret | Service | Purpose |
|--------|---------|---------|
| `OPENAI_API_KEY` | `alphahive-api` | LLM access |
| `GOOGLE_CLIENT_ID` | `alphahive-api` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `alphahive-api` | Google OAuth |
| `JWT_SECRET` | `alphahive-api` | JWT signing (if used) |
| `VITE_GOOGLE_CLIENT_ID` | `alphahive-web` | Frontend OAuth client ID |

`GOOGLE_REDIRECT_URI` is set in `render.yaml` to:

`https://alphahive-web.onrender.com/auth/callback`

(also add this URI in Google Cloud Console → OAuth client → Authorized redirect URIs)

### 2.4 CI

GitHub Actions (`.github/workflows/ci.yml`) runs tests/coverage on push. Deploy itself is handled by Render, not Cloud Run.

---

## 3. Related Modules (optional)

Beyond the AlphaHive backend and frontend, the repo may include satellite modules (e.g. InvestBrand, Pledge-Rover). Deploy those separately if present.

---

## 4. Troubleshooting

### Issue: CI Fails on Tests
- Run the backend suite locally: `cd AlphaHive/backend && pytest`.
- Fix failures and confirm the coverage gate passes before re-pushing.

### Issue: Service Fails to Start on Render
- Ensure the backend binds to `0.0.0.0:$PORT` (Render injects `PORT`).
- Check the Render **Logs** tab for `alphahive-api` / `alphahive-web`.

### Issue: API Key / Auth Not Working
- Confirm `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are set on `alphahive-api`.
- Verify the OAuth redirect URI is exactly `https://alphahive-web.onrender.com/auth/callback`.

### Issue: Security Vulnerabilities
```bash
pip install safety
safety check
pip install --upgrade PACKAGE_NAME
```

---

## 5. Cost Estimate

**Free Tier (Recommended for Personal Use)**:
- Render (`alphahive-web` + `alphahive-api` + `alphahive-db`): **$0** (free plan)
- Gemini / OpenAI: depends on usage
- Total: **$0/month** on Render free tier ✅

**Paid Tier (If Scaling)**:
- Render paid plans: see [Render pricing](https://render.com/pricing)
- LLM API: ~$1-5+/month depending on volume

---

## 6. Post-Deploy Verification

1. Open https://alphahive-web.onrender.com/
2. Verify the frontend loads and the login flow completes.
3. Run a sample ticker analysis to confirm the backend and LangGraph pipeline respond.

---

**AlphaHive v5 — live on Render. 🚀**
