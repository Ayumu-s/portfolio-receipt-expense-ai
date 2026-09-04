import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles

from database import Base, SessionLocal, engine
from models import User
from routers import receipts
from services.auth import hash_password, normalize_email, normalize_username


SESSION_SECRET = os.getenv("SESSION_SECRET")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
APP_ENV = os.getenv("APP_ENV", "development").lower()
PORTFOLIO_DEMO_MODE = os.getenv("PORTFOLIO_DEMO_MODE", "false").lower() == "true" and APP_ENV != "test"
MAX_REQUEST_BODY_BYTES = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(110 * 1024 * 1024)))

if not SESSION_SECRET or len(SESSION_SECRET) < 32:
    raise RuntimeError("SESSION_SECRET must be a random value of at least 32 characters.")


class RequestBodyLimitMiddleware:
    def __init__(self, app, max_body_size: int):
        self.app = app
        self.max_body_size = max_body_size

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") != "POST" or scope.get("path") != "/upload":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.max_body_size:
                    await Response("リクエストサイズが上限を超えています。", status_code=413)(scope, receive, send)
                    return
            except ValueError:
                await Response("不正なContent-Lengthです。", status_code=400)(scope, receive, send)
                return

        received = 0

        class RequestBodyTooLarge(Exception):
            pass

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body_size:
                    raise RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLarge:
            await Response("リクエストサイズが上限を超えています。", status_code=413)(scope, receive, send)


production = APP_ENV == "production"
app = FastAPI(
    title="経費管理Webアプリ",
    docs_url=None if production else "/docs",
    redoc_url=None if production else "/redoc",
    openapi_url=None if production else "/openapi.json",
)
app.add_middleware(RequestBodyLimitMiddleware, max_body_size=MAX_REQUEST_BODY_BYTES)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="__Host-receipt_csrf_session" if COOKIE_SECURE else "receipt_csrf_session",
    same_site="lax",
    https_only=COOKIE_SECURE,
    max_age=60 * 60 * 12,
)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")


def initialize_portfolio_demo() -> None:
    """Prepare the ignored local SQLite store for the public Mock demo."""
    if not PORTFOLIO_DEMO_MODE:
        return

    if os.getenv("DATABASE_URL", "").startswith("sqlite:///./"):
        Path(".runtime").mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    username, username_normalized = normalize_username(os.getenv("APP_USERNAME", "demo"))
    email, email_normalized = normalize_email(os.getenv("APP_EMAIL", "demo@example.invalid"))
    password = os.getenv("APP_PASSWORD", "portfolio-demo-password-change-me")

    with SessionLocal() as db:
        user = db.query(User).filter(User.username_normalized == username_normalized).first()
        if user is None:
            db.add(
                User(
                    username=username,
                    username_normalized=username_normalized,
                    email=email,
                    email_normalized=email_normalized,
                    password_hash=hash_password(password),
                    role="admin",
                    is_active=True,
                    must_change_password=False,
                )
            )
            db.commit()
        elif user.must_change_password or not user.is_active:
            user.must_change_password = False
            user.is_active = True
            db.commit()


initialize_portfolio_demo()


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    )
    if COOKIE_SECURE:
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response


@app.get("/health")
async def healthcheck():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return PlainTextResponse("ok")
    except Exception:
        return PlainTextResponse("database unavailable", status_code=503)


app.include_router(receipts.router)
