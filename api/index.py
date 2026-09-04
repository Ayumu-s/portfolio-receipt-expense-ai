"""Vercel entrypoint for the portfolio FastAPI demo."""

import os
import secrets


# This file is the Vercel-only entrypoint. Configure the public demo against
# Vercel's disposable /tmp directory even when platform system variables are
# not present during module import. Local development starts main.app directly
# and therefore keeps its normal database and environment settings.
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/receipt-expense-ai.db")
os.environ.setdefault("PORTFOLIO_DEMO_MODE", "true")
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("COOKIE_SECURE", "true")
os.environ.setdefault("SESSION_SECRET", secrets.token_urlsafe(32))

from main import app

__all__ = ["app"]
