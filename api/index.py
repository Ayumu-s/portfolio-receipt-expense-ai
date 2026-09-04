"""Vercel entrypoint for the portfolio FastAPI demo."""

import os
import secrets
import tempfile
from pathlib import Path


# This file is the Vercel-only entrypoint. Configure the public demo against
# Vercel's disposable /tmp directory even when platform system variables are
# not present during module import. Local development starts main.app directly
# and therefore keeps its normal database and environment settings.
# The public portfolio deployment must never depend on values accidentally
# imported into Vercel from a local .env file. Force the disposable Mock
# configuration so the FastAPI module cannot connect to a local/production DB
# or enable the real login flow on Vercel.
runtime_db_path = Path(tempfile.gettempdir()) / "receipt-expense-ai.db"
os.environ["DATABASE_URL"] = f"sqlite:///{runtime_db_path.as_posix()}"
os.environ["PORTFOLIO_DEMO_MODE"] = "true"
os.environ["APP_ENV"] = "development"
os.environ["COOKIE_SECURE"] = "true"
os.environ["SESSION_SECRET"] = secrets.token_urlsafe(32)

from main import app

__all__ = ["app"]
