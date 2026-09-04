from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import deferred
from datetime import datetime, timezone
from database import Base


def utcnow() -> datetime:
    """DBのnaive UTC列へ保存する、タイムゾーン変換済みの現在時刻。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(32), nullable=False)
    username_normalized = Column(String(32), nullable=False, unique=True, index=True)
    email = Column(String(320), nullable=False)
    email_normalized = Column(String(320), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user", server_default="user")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    must_change_password = Column(Boolean, nullable=False, default=False, server_default="false")
    email_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    last_login_at = Column(DateTime, nullable=True)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    ip_hash = Column(String(64), nullable=True)
    user_agent_hash = Column(String(64), nullable=True)


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True)
    email = Column(String(320), nullable=False)
    email_normalized = Column(String(320), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True)
    event_type = Column(String(50), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    identifier_hash = Column(String(64), nullable=True, index=True)
    ip_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (
        UniqueConstraint("owner_id", "image_hash", name="uq_receipts_owner_image_hash"),
    )

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=True)
    image_hash = Column(String(64), nullable=True, index=True)
    result = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, default=utcnow)
    receipt_date = Column(Date, nullable=True)
    is_expense = Column(Boolean, default=True, nullable=False, server_default="true")
    image_data = deferred(Column(LargeBinary, nullable=True))  # 明示アクセス時のみ読み込む
    image_content_type = Column(String(50), nullable=True)
