---
description: Pre-flight checklist and command flow for deploying to Render
---

# Deployment Workflow

AlphaHive auto-deploys on **Render** via `render.yaml` when changes are pushed to the connected branch (`main`). Services: `alphahive-api`, `alphahive-web`, and `alphahive-db`. GitHub Actions (`.github/workflows/ci.yml`) runs tests. This checklist ensures that push is safe.

1.  **⏱️ Start Timer**
    - [ ] Run: `python -m utils.tracking start deployment`
    - [ ] Save the Session ID for the end.

2.  **Codebase Integrity & Hygiene**
    - [ ] **Cleanup**: Remove `print()` statements.
    - [ ] **No Dead Code**: Remove commented-out blocks.
    - [ ] Secrets stay in Render dashboard / `.env` — never commit `.env`.

3.  **Local Verification**
    - [ ] Backend starts: `cd AlphaHive/backend && python src.server` (or `uvicorn src.server:app`).
    - [ ] Frontend builds: `cd AlphaHive/frontend && npm run build`.
    - [ ] Backend tests pass: `cd AlphaHive/backend && pytest`.

4.  **Auth / Env Sanity**
    - [ ] `GOOGLE_REDIRECT_URI` matches `https://alphahive-web.onrender.com/auth/callback`.
    - [ ] Render secrets set: `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_CLIENT_ID`.

5.  **Push & Verify**
    - [ ] Push to `main`.
    - [ ] Confirm Render deploy for `alphahive-api` / `alphahive-web` succeeded.
    - [ ] Confirm CI (`.github/workflows/ci.yml`) is green.
    - [ ] Open https://alphahive-web.onrender.com/
    - [ ] Smoke-test login + one portfolio / ticker analysis.

6.  **⏱️ End Timer**
    - [ ] Run: `python -m utils.tracking end <SESSION_ID>`
