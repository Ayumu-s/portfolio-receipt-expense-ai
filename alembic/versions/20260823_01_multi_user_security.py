"""Add multi-user authentication, ownership and security records.

Revision ID: 20260823_01
Revises: None
Create Date: 2026-08-23
"""

import os
import unicodedata
from datetime import datetime

from alembic import op
from argon2 import PasswordHasher
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260823_01"
down_revision = None
branch_labels = None
depends_on = None


def _has_index(inspector, table: str, name: str) -> bool:
    return any(index["name"] == name for index in inspector.get_indexes(table))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("username", sa.String(32), nullable=False),
            sa.Column("username_normalized", sa.String(32), nullable=False),
            sa.Column("email", sa.String(320), nullable=False),
            sa.Column("email_normalized", sa.String(320), nullable=False),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("role", sa.String(20), nullable=False, server_default="user"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("email_verified_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("last_login_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("username_normalized", name="uq_users_username_normalized"),
            sa.UniqueConstraint("email_normalized", name="uq_users_email_normalized"),
        )
        op.create_index("ix_users_username_normalized", "users", ["username_normalized"])
        op.create_index("ix_users_email_normalized", "users", ["email_normalized"])

    if "user_sessions" not in tables:
        op.create_table(
            "user_sessions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("ip_hash", sa.String(64), nullable=True),
            sa.Column("user_agent_hash", sa.String(64), nullable=True),
            sa.UniqueConstraint("token_hash", name="uq_user_sessions_token_hash"),
        )
        op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
        op.create_index("ix_user_sessions_token_hash", "user_sessions", ["token_hash"])
        op.create_index("ix_user_sessions_expires_at", "user_sessions", ["expires_at"])

    if "invitations" not in tables:
        op.create_table(
            "invitations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(320), nullable=False),
            sa.Column("email_normalized", sa.String(320), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("token_hash", name="uq_invitations_token_hash"),
        )
        op.create_index("ix_invitations_email_normalized", "invitations", ["email_normalized"])
        op.create_index("ix_invitations_token_hash", "invitations", ["token_hash"])
        op.create_index("ix_invitations_expires_at", "invitations", ["expires_at"])

    if "security_events" not in tables:
        op.create_table(
            "security_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("event_type", sa.String(50), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("identifier_hash", sa.String(64), nullable=True),
            sa.Column("ip_hash", sa.String(64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        for column in ("event_type", "user_id", "identifier_hash", "ip_hash", "created_at"):
            op.create_index(f"ix_security_events_{column}", "security_events", [column])

    inspector = inspect(bind)
    if "receipts" not in inspector.get_table_names():
        op.create_table(
            "receipts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("owner_id", sa.Integer(), nullable=True),
            sa.Column("filename", sa.String(255), nullable=False),
            sa.Column("stored_filename", sa.String(255), nullable=True),
            sa.Column("image_hash", sa.String(64), nullable=True),
            sa.Column("result", sa.Text(), nullable=False),
            sa.Column("uploaded_at", sa.DateTime(), nullable=True),
            sa.Column("receipt_date", sa.Date(), nullable=True),
            sa.Column("is_expense", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("image_data", sa.LargeBinary(), nullable=True),
            sa.Column("image_content_type", sa.String(50), nullable=True),
        )
    else:
        receipt_columns = {column["name"] for column in inspector.get_columns("receipts")}
        if "owner_id" not in receipt_columns:
            op.add_column("receipts", sa.Column("owner_id", sa.Integer(), nullable=True))

    user_count = bind.execute(sa.text("SELECT COUNT(*) FROM users")).scalar_one()
    if user_count == 0:
        username = unicodedata.normalize("NFKC", os.getenv("APP_USERNAME", "admin").strip()) or "admin"
        email = unicodedata.normalize("NFKC", os.getenv("APP_EMAIL", "admin@local.invalid").strip())
        password = os.getenv("APP_PASSWORD")
        if not password:
            raise RuntimeError("APP_PASSWORD is required to create the initial administrator.")
        now = datetime.utcnow()
        password_hash = PasswordHasher(time_cost=2, memory_cost=19 * 1024, parallelism=1).hash(password)
        admin_id = bind.execute(
            sa.text(
                """
                INSERT INTO users
                    (username, username_normalized, email, email_normalized, password_hash,
                     role, is_active, must_change_password, created_at, updated_at)
                VALUES
                    (:username, :username_normalized, :email, :email_normalized, :password_hash,
                     'admin', TRUE, TRUE, :created_at, :updated_at)
                RETURNING id
                """
            ),
            {
                "username": username,
                "username_normalized": username.casefold(),
                "email": email,
                "email_normalized": email.casefold(),
                "password_hash": password_hash,
                "created_at": now,
                "updated_at": now,
            },
        ).scalar_one()
    else:
        admin_id = bind.execute(
            sa.text("SELECT id FROM users ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, id LIMIT 1")
        ).scalar_one()

    bind.execute(sa.text("UPDATE receipts SET owner_id = :admin_id WHERE owner_id IS NULL"), {"admin_id": admin_id})
    op.alter_column("receipts", "owner_id", existing_type=sa.Integer(), nullable=False)

    inspector = inspect(bind)
    if not any(fk.get("constrained_columns") == ["owner_id"] for fk in inspector.get_foreign_keys("receipts")):
        op.create_foreign_key(
            "fk_receipts_owner_id_users",
            "receipts",
            "users",
            ["owner_id"],
            ["id"],
            ondelete="RESTRICT",
        )
    inspector = inspect(bind)
    if not _has_index(inspector, "receipts", "ix_receipts_owner_id"):
        op.create_index("ix_receipts_owner_id", "receipts", ["owner_id"])
    constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("receipts")}
    if "uq_receipts_owner_image_hash" not in constraints:
        op.create_unique_constraint("uq_receipts_owner_image_hash", "receipts", ["owner_id", "image_hash"])


def downgrade() -> None:
    raise RuntimeError("This migration contains user ownership data and cannot be downgraded automatically.")
