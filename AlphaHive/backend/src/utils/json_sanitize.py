"""Recursively convert API payloads to JSON-safe Python values (no NaN/Inf)."""
from __future__ import annotations

import math

import numpy as np
import pandas as pd


def _is_nullish(value) -> bool:
    if value is None:
        return True
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def json_safe(obj):
    """Replace NaN/Inf and numpy/pandas scalars so FastAPI can serialize responses."""
    if _is_nullish(obj):
        return None
    if isinstance(obj, (np.floating, np.integer)):
        val = float(obj)
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, np.ndarray):
        return [json_safe(v) for v in obj.tolist()]
    if isinstance(obj, pd.DataFrame):
        return json_safe(obj.to_dict(orient="records"))
    if isinstance(obj, pd.Series):
        return json_safe(obj.to_dict())
    if isinstance(obj, dict):
        return {str(k): json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [json_safe(v) for v in obj]
    return obj
