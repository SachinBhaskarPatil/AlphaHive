"""
Auth routes — Google OAuth 2.0 flow.
Extracted from server.py (was inline endpoints).
Redirect URI must match Vite port (3000) and Google Cloud Console."""
import asyncio
import os
import urllib.parse
from datetime import datetime
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import httpx
from src.utils.logger import get_logger
from src.utils.repo_root import in_repo_root

router = APIRouter()
logger = get_logger(__name__)

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
# Must match Vite dev server port (vite.config.js) and Google Console authorized URIs
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")


def _persist_google_identity(email: str, name: str | None, picture: str | None) -> None:
    from utils.user_manager import UserProfileManager

    UserProfileManager().update_auth_identity(
        email,
        name=name,
        picture=picture,
        provider="Google",
    )


@router.get("/google/url")
async def get_google_auth_url():
    import urllib.parse

    params = {
        "response_type": "code",
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": "google"
    }

    query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
    return {"url": url}

@router.post("/google/callback")
async def google_callback(request: Request):
    data = await request.json()
    code = data.get("code")

    if not code:
        return JSONResponse(status_code=400, content={"error": "Missing code"})

    # Dev bypass
    if code == "mock_code":
        return {
            "handle": "dev.analyst@market-rover.com",
            "name": "Dev Analyst",
            "picture": None,
            "provider": "Google",
        }

    async with httpx.AsyncClient() as client:
        token_res = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        })
        tokens = token_res.json()

        if "error" in tokens:
            error_msg = f"OAUTH ERROR [{datetime.now()}]: {tokens.get('error_description', tokens.get('error'))}"
            logger.error(error_msg)
            return JSONResponse(status_code=400, content=tokens)

        access_token = tokens.get("access_token")
        if not access_token:
            logger.error("OAUTH ERROR: token response missing access_token: %s", tokens)
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_token_response", "error_description": "No access token returned by Google."},
            )

        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_info = user_res.json()
        email = user_info.get("email")
        if not email:
            logger.error("OAUTH ERROR: userinfo missing email: %s", user_info)
            return JSONResponse(
                status_code=400,
                content={"error": "no_email", "error_description": "Google account did not return an email address."},
            )

        logger.info(f"AUTH SUCCESS: {email}")
        name = user_info.get("name")
        picture = user_info.get("picture")
        await asyncio.to_thread(
            in_repo_root(_persist_google_identity),
            email,
            name,
            picture,
        )
        return {
            "handle": email,
            "name": name,
            "picture": picture,
            "provider": "Google",
        }
