"""
Unified Operational Support Agent (SRE) for Market-Rover (Python).
Analyzes system errors and provides mitigation strategies.
"""
import json
import logging
from typing import Optional, Dict, Any

from config import LLM_PROVIDER, OPENAI_API_KEY, GOOGLE_API_KEY, LLM_FLASH_MODEL

logger = logging.getLogger(__name__)

_DIAGNOSTIC_PROMPT = """You are the Market-Rover Operational Support Agent (SRE).
A system error has occurred in the {context} phase.

ERROR DETAILS:
- Type: {error_type}
- Message: {error_msg}

TASK:
1. Identify the likely root cause (e.g. Rate Limit, Dependency issue, Threading conflict).
2. Recommend a GRACEFUL DEGRADATION strategy for the UI.
3. Suggest a quick fix for the developer.

Respond ONLY with a JSON object:
{{
  "rootCause": "brief explanation",
  "mitigation": "how to respond to user",
  "developerFix": "code or infrastructure fix suggestion",
  "severity": "low" | "medium" | "high" | "critical"
}}"""


def _parse_diagnostic(raw_content: str) -> Dict[str, Any]:
    clean_content = raw_content.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean_content)
    except json.JSONDecodeError:
        logger.error("SRE Ops Agent: Failed to parse JSON: %s", clean_content)
        return {
            "rootCause": "Complex system failure",
            "mitigation": "Please try again later or contact support.",
            "severity": "high",
        }


def _analyze_with_openai(error_type: str, error_msg: str, context: str) -> Optional[Dict[str, Any]]:
    if not OPENAI_API_KEY:
        logger.warning("SRE Ops Agent: OPENAI_API_KEY not found.")
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=LLM_FLASH_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": _DIAGNOSTIC_PROMPT.format(
                        context=context,
                        error_type=error_type,
                        error_msg=error_msg,
                    ),
                }
            ],
            temperature=0.2,
        )
        raw_content = response.choices[0].message.content or ""
        return _parse_diagnostic(raw_content)
    except Exception as e:
        logger.error("SRE Ops Agent (OpenAI) failed: %s", e)
        return None


def _analyze_with_gemini(error_type: str, error_msg: str, context: str) -> Optional[Dict[str, Any]]:
    if not GOOGLE_API_KEY:
        logger.warning("SRE Ops Agent: GOOGLE_API_KEY not found.")
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel("gemini-3-flash-preview")
        response = model.generate_content(
            _DIAGNOSTIC_PROMPT.format(
                context=context,
                error_type=error_type,
                error_msg=error_msg,
            )
        )
        raw_content = response.text if hasattr(response, "text") else str(response)
        return _parse_diagnostic(raw_content)
    except Exception as e:
        logger.error("SRE Ops Agent (Gemini) failed: %s", e)
        return None


def analyze_error(error: Exception, context: str = "general") -> Optional[Dict[str, Any]]:
    """Analyze an error with the configured LLM provider and return a JSON diagnostic."""
    error_msg = str(error)
    error_type = type(error).__name__

    if LLM_PROVIDER == "openai":
        return _analyze_with_openai(error_type, error_msg, context)
    return _analyze_with_gemini(error_type, error_msg, context)
