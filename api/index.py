"""Vercel entrypoint for the portfolio FastAPI demo."""

import os
import secrets


# Vercel Functions have an ephemeral writable /tmp directory.  The public
# portfolio demo is intentionally disposable, so it does not require a
# persistent database or a repository-local secret. Keep local imports on
# Windows unchanged so this entrypoint can still be smoke-tested locally.
if os.getenv("VERCEL") == "1":
    os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/receipt-expense-ai.db")
    os.environ.setdefault("PORTFOLIO_DEMO_MODE", "true")
    os.environ.setdefault("APP_ENV", "development")
    os.environ.setdefault("COOKIE_SECURE", "true")
    os.environ.setdefault("SESSION_SECRET", secrets.token_urlsafe(32))

from main import app

__all__ = ["app"]
