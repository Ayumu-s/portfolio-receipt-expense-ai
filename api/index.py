"""Vercel entrypoint for the portfolio FastAPI demo."""

import os
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
# Keep the public Mock session signature stable across Vercel instances so a
# CSRF token generated on the upload page can be verified on form submission.
# This is intentionally a demo-only key; the public deployment has no real
# user accounts or private data and must not be used as a production service.
os.environ["SESSION_SECRET"] = "portfolio-demo-session-secret-not-for-production-2026"
# Vercel can retain blank variables imported from a local environment file.
# Set every value parsed during module import so an empty dashboard variable
# cannot prevent the public Mock demo from starting.
os.environ["APP_USERNAME"] = "portfolio-demo"
os.environ["APP_EMAIL"] = "portfolio-demo@example.invalid"
os.environ["APP_PASSWORD"] = "portfolio-demo-password"
os.environ["AUTH_SESSION_HOURS"] = "12"
os.environ["LOGIN_FAILURE_LIMIT"] = "5"
os.environ["LOGIN_RATE_LIMIT_MINUTES"] = "10"
os.environ["MAX_REQUEST_BODY_BYTES"] = str(110 * 1024 * 1024)
os.environ["MAX_UPLOAD_BYTES"] = str(10 * 1024 * 1024)
os.environ["MAX_FILES_PER_UPLOAD"] = "10"
os.environ["MAX_CONCURRENT_ANALYSES"] = "5"
os.environ["ANALYSIS_TIMEOUT_SECONDS"] = "50"
os.environ["MAX_IMAGE_PIXELS"] = "25000000"
os.environ["INVITATION_VALID_HOURS"] = str(7 * 24)

from main import app

__all__ = ["app"]
