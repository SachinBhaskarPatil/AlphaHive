"""Run repo-root utilities (JSON data files, reports) with correct working directory."""
import os
import sys
from contextlib import contextmanager
from functools import wraps
from pathlib import Path

_BACKEND_SRC = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_SRC.parent.parent.parent

if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def get_repo_root() -> Path:
    return _REPO_ROOT


@contextmanager
def repo_root_cwd():
    prev = os.getcwd()
    os.chdir(_REPO_ROOT)
    try:
        yield _REPO_ROOT
    finally:
        os.chdir(prev)


def in_repo_root(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        with repo_root_cwd():
            return fn(*args, **kwargs)
    return wrapper
