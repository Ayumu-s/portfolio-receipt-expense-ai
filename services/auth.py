import hashlib
import hmac
import os
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Request
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from models import SecurityEvent, User, UserSession


SESSION_SECRET = os.getenv("SESSION_SECRET")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
AUTH_SESSION_HOURS = int(os.getenv("AUTH_SESSION_HOURS", "12"))
AUTH_COOKIE_NAME = "__Host-receipt_session" if COOKIE_SECURE else "receipt_session"
LOGIN_FAILURE_LIMIT = int(os.getenv("LOGIN_FAILURE_LIMIT", "5"))
LOGIN_RATE_LIMIT_MINUTES = int(os.getenv("LOGIN_RATE_LIMIT_MINUTES", "10"))

if not SESSION_SECRET or len(SESSION_SECRET) < 32:
    raise RuntimeError("SESSION_SECRET must be a random value of at least 32 characters.")


# OWASPの最小推奨値（19MiB、2 iterations、parallelism 1）に合わせる。
PASSWORD_HASHER = PasswordHasher(
    time_cost=2,
    memory_cost=19 * 1024,
    parallelism=1,
    hash_len=32,
    salt_len=16,
)
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash(secrets.token_urlsafe(32))
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$")
EMAIL_LOCAL_PATTERN = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$")


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_username(value: str) -> tuple[str, str]:
    display = unicodedata.normalize("NFKC", (value or "").strip())
    if not USERNAME_PATTERN.fullmatch(display):
        raise ValueError("ユーザー名は3〜32文字の半角英数字、ピリオド、ハイフン、アンダースコアで入力してください。")
    return display, display.casefold()


def normalize_email(value: str) -> tuple[str, str]:
    display = unicodedata.normalize("NFKC", (value or "").strip())
    if len(display) > 320 or display.count("@") != 1:
        raise ValueError("有効なメールアドレスを入力してください。")
    local, domain = display.rsplit("@", 1)
    if not local or len(local) > 64 or not EMAIL_LOCAL_PATTERN.fullmatch(local):
        raise ValueError("有効なメールアドレスを入力してください。")
    try:
        ascii_domain = domain.rstrip(".").encode("idna").decode("ascii").lower()
    except UnicodeError as exc:
        raise ValueError("有効なメールアドレスを入力してください。") from exc
    labels = ascii_domain.split(".")
    if (
        len(ascii_domain) > 255
        or len(labels) < 2
        or any(not label or len(label) > 63 or label.startswith("-") or label.endswith("-") for label in labels)
        or any(not re.fullmatch(r"[a-z0-9-]+", label) for label in labels)
    ):
        raise ValueError("有効なメールアドレスを入力してください。")
    normalized = f"{local.casefold()}@{ascii_domain}"
    return display, normalized


def validate_password(password: str) -> None:
    if len(password or "") < 6:
        raise ValueError("パスワードは6文字以上で入力してください。")
    if len(password) > 128:
        raise ValueError("パスワードは128文字以内で入力してください。")
    if password.strip() != password:
        raise ValueError("パスワードの先頭・末尾に空白は使用できません。")


def hash_password(password: str) -> str:
    validate_password(password)
    return PASSWORD_HASHER.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return PASSWORD_HASHER.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def private_fingerprint(value: str) -> str:
    return hmac.new(
        SESSION_SECRET.encode("utf-8"),
        (value or "unknown").encode("utf-8", errors="replace"),
        hashlib.sha256,
    ).hexdigest()


def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def request_fingerprints(request: Request) -> tuple[str, str]:
    ip_hash = private_fingerprint(get_client_ip(request))
    user_agent_hash = private_fingerprint(request.headers.get("user-agent", "unknown"))
    return ip_hash, user_agent_hash


def record_security_event(
    db: Session,
    event_type: str,
    request: Request,
    *,
    user_id: int | None = None,
    identifier: str | None = None,
) -> None:
    ip_hash, _ = request_fingerprints(request)
    db.add(
        SecurityEvent(
            event_type=event_type,
            user_id=user_id,
            identifier_hash=private_fingerprint(identifier.casefold()) if identifier else None,
            ip_hash=ip_hash,
        )
    )


def login_is_rate_limited(db: Session, request: Request, identifier: str) -> bool:
    since = utcnow() - timedelta(minutes=LOGIN_RATE_LIMIT_MINUTES)
    ip_hash, _ = request_fingerprints(request)
    identifier_hash = private_fingerprint((identifier or "").casefold())
    base = db.query(func.count(SecurityEvent.id)).filter(
        SecurityEvent.event_type == "login_failure",
        SecurityEvent.created_at >= since,
    )
    ip_failures = base.filter(SecurityEvent.ip_hash == ip_hash).scalar() or 0
    identifier_failures = base.filter(SecurityEvent.identifier_hash == identifier_hash).scalar() or 0
    return ip_failures >= LOGIN_FAILURE_LIMIT or identifier_failures >= LOGIN_FAILURE_LIMIT


def find_user_for_login(db: Session, identifier: str) -> User | None:
    normalized = unicodedata.normalize("NFKC", (identifier or "").strip()).casefold()
    return (
        db.query(User)
        .filter(or_(User.username_normalized == normalized, User.email_normalized == normalized))
        .first()
    )


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    user = find_user_for_login(db, identifier)
    password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    password_ok = verify_password(password, password_hash)
    if not user or not password_ok or not user.is_active:
        return None
    if PASSWORD_HASHER.check_needs_rehash(user.password_hash):
        user.password_hash = PASSWORD_HASHER.hash(password)
    return user


def create_user_session(db: Session, user: User, request: Request) -> str:
    db.query(UserSession).filter(UserSession.expires_at <= utcnow()).delete(synchronize_session=False)
    db.query(SecurityEvent).filter(SecurityEvent.created_at < utcnow() - timedelta(days=90)).delete(synchronize_session=False)
    raw_token = secrets.token_urlsafe(48)
    ip_hash, user_agent_hash = request_fingerprints(request)
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=token_hash(raw_token),
            expires_at=utcnow() + timedelta(hours=AUTH_SESSION_HOURS),
            ip_hash=ip_hash,
            user_agent_hash=user_agent_hash,
        )
    )
    return raw_token


def get_authenticated_user(db: Session, request: Request) -> User | None:
    raw_token = request.cookies.get(AUTH_COOKIE_NAME)
    if not raw_token:
        return None
    session = (
        db.query(UserSession)
        .filter(
            UserSession.token_hash == token_hash(raw_token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > utcnow(),
        )
        .first()
    )
    if not session:
        return None
    user = db.query(User).filter(User.id == session.user_id, User.is_active.is_(True)).first()
    if not user:
        session.revoked_at = utcnow()
        db.commit()
        return None
    return user


def revoke_current_session(db: Session, request: Request) -> None:
    raw_token = request.cookies.get(AUTH_COOKIE_NAME)
    if not raw_token:
        return
    db.query(UserSession).filter(
        UserSession.token_hash == token_hash(raw_token),
        UserSession.revoked_at.is_(None),
    ).update({UserSession.revoked_at: utcnow()}, synchronize_session=False)


def revoke_all_user_sessions(db: Session, user_id: int) -> None:
    db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.revoked_at.is_(None),
    ).update({UserSession.revoked_at: utcnow()}, synchronize_session=False)


def set_auth_cookie(response, raw_token: str) -> None:
    response.set_cookie(
        AUTH_COOKIE_NAME,
        raw_token,
        max_age=AUTH_SESSION_HOURS * 60 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def clear_auth_cookie(response) -> None:
    response.delete_cookie(
        AUTH_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
