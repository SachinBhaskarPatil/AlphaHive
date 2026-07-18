import json
import os
from datetime import datetime
from utils.logger import logger

DATA_FILE = "data/user_profiles.json"
SMART_PORTFOLIO_PREFIX = "Smart "
SMART_PORTFOLIO_SUFFIX = " Portfolio"


class UserProfileManager:
    """
    Manages user profile metadata to enforce flow.
    Tracks if a user has completed the Investor Profile and when.
    Uses local JSON for storage.
    """
    def __init__(self):
        self._ensure_data_dir()
        self.profiles = self._load_profiles()

    def _ensure_data_dir(self):
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

    def _load_profiles(self) -> dict:
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("profiles", {})
            except Exception as e:
                logger.error(f"Error loading user profiles: {e}")
        return {}

    def _save_profiles(self):
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump({"profiles": self.profiles}, f, indent=4)
        except Exception as e:
            logger.error(f"Error saving user profiles: {e}")

    def _has_smart_profiler_portfolio(self, username: str) -> bool:
        """True only when the user saved a portfolio from the Investor Profiler flow."""
        try:
            from utils.portfolio_manager import PortfolioManager

            for name in PortfolioManager(username).get_portfolio_names():
                if name.startswith(SMART_PORTFOLIO_PREFIX) and name.endswith(SMART_PORTFOLIO_SUFFIX):
                    return True
        except Exception as e:
            logger.error(f"Error checking profiler portfolio for {username}: {e}")
        return False

    def _normalize_onboarding_complete(self, username: str, profile: dict) -> bool:
        """
        Onboarding is only complete when explicitly flagged AND a Smart Portfolio was saved.
        Manual portfolios from other tabs do not count.
        """
        flagged = bool(profile.get("onboarding_complete", False))
        if not flagged:
            return False
        if self._has_smart_profiler_portfolio(username):
            return True
        profile["onboarding_complete"] = False
        self.profiles[username] = profile
        self._save_profiles()
        return False

    def get_profile_status(self, username: str) -> dict:
        """
        Check if profile exists and onboarding is fully complete.
        Returns: {'exists': bool, 'last_updated': datetime_obj, 'days_old': int, 'needs_update': bool}
        """
        profile = self.profiles.get(username)

        if not profile:
            return {
                'exists': False,
                'last_updated': None,
                'days_old': 9999,
                'needs_update': True,
                'onboarding_complete': False,
            }

        last_updated_str = profile.get('last_updated')
        onboarding_complete = self._normalize_onboarding_complete(username, profile)

        try:
            last_updated = datetime.fromisoformat(last_updated_str)
            days_old = (datetime.now() - last_updated).days
            needs_update = (not onboarding_complete) or (days_old > 365)

            return {
                'exists': True,
                'last_updated': last_updated,
                'days_old': days_old,
                'needs_update': needs_update,
                'onboarding_complete': onboarding_complete,
                'persona': profile.get('persona'),
            }
        except Exception:
             return {
                'exists': True,
                'last_updated': None,
                'days_old': 9999,
                'needs_update': True,
                'onboarding_complete': False,
            }

    def update_profile_timestamp(self, username: str):
        """
        Updates the last_updated timestamp for a user.
        """
        if username in self.profiles:
            self.profiles[username]['last_updated'] = datetime.now().isoformat()
            self._save_profiles()

    def save_user_profile(
        self,
        username: str,
        persona_val: str,
        scores: dict,
        brands: list = None,
        onboarding_complete: bool = False,
    ):
        """
        Saves Investor Profile quiz answers and results.
        onboarding_complete should only be True after the full profiler flow finishes.
        """
        existing = self.profiles.get(username, {})
        self.profiles[username] = {
            'persona': persona_val,
            'scores': scores,
            'brands': brands if brands is not None else existing.get('brands', []),
            'onboarding_complete': onboarding_complete,
            'last_updated': datetime.now().isoformat(),
        }
        self._save_profiles()

    def mark_onboarding_complete(self, username: str):
        """Marks full Investor Profiler onboarding as finished."""
        if username not in self.profiles:
            self.profiles[username] = {}
        self.profiles[username]['onboarding_complete'] = True
        self.profiles[username]['last_updated'] = datetime.now().isoformat()
        self._save_profiles()

    def update_auth_identity(
        self,
        username: str,
        *,
        name: str | None = None,
        picture: str | None = None,
        provider: str | None = None,
    ):
        """Persist OAuth display name and avatar without touching profiler fields."""
        profile = self.profiles.setdefault(username, {})
        if name:
            profile['auth_name'] = name
        if picture:
            profile['auth_picture'] = picture
        if provider:
            profile['auth_provider'] = provider
        profile['last_updated'] = datetime.now().isoformat()
        self._save_profiles()

    def reset_profiler_progress(self, username: str):
        """Clears saved quiz progress and all Smart Profiler portfolios for a fresh start."""
        if username in self.profiles:
            del self.profiles[username]
            self._save_profiles()
        try:
            from utils.portfolio_manager import PortfolioManager

            pm = PortfolioManager(username)
            for name in list(pm.get_portfolio_names()):
                if name.startswith(SMART_PORTFOLIO_PREFIX) and name.endswith(SMART_PORTFOLIO_SUFFIX):
                    pm.delete_portfolio(name)
        except Exception as e:
            logger.error(f"Error clearing smart portfolios for {username}: {e}")

    def has_incomplete_profiler_setup(self, username: str) -> bool:
        """Quiz was saved but full profiler onboarding (brand shop + portfolio) was not finished."""
        profile = self.profiles.get(username)
        if not profile or not profile.get("persona") or not profile.get("scores"):
            return False
        return not self._normalize_onboarding_complete(username, profile)

    def get_user_profile(self, username: str) -> dict:
        """
        Retrieves the full profile data.
        """
        return self.profiles.get(username)
