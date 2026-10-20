import asyncio
import io
import json
import os
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit


TEST_DB_FILE = Path(tempfile.gettempdir()) / f"receipt_demo_api_tests_{uuid.uuid4().hex}.sqlite3"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE.as_posix()}"
os.environ["SESSION_SECRET"] = "test-only-session-secret-with-more-than-32-characters"
os.environ["COOKIE_SECURE"] = "false"
os.environ["APP_ENV"] = "test"
os.environ["APP_USERNAME"] = "demo"
os.environ["APP_EMAIL"] = "demo@example.invalid"

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from database import Base, SessionLocal, engine  # noqa: E402
from main import RequestBodyLimitMiddleware, _api_error_payload, app  # noqa: E402
from models import Invitation, Receipt, SecurityEvent, User, UserSession  # noqa: E402
from routers import receipts as receipt_router  # noqa: E402
from services.auth import hash_password  # noqa: E402


class DemoSecurityFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        with SessionLocal() as db:
            for model in (Receipt, Invitation, UserSession, SecurityEvent, User):
                db.query(model).delete()
            db.add(
                User(
                    username="demo",
                    username_normalized="demo",
                    email="demo@example.invalid",
                    email_normalized="demo@example.invalid",
                    password_hash=hash_password("demo test password 123"),
                    role="admin",
                    is_active=True,
                    must_change_password=False,
                )
            )
            db.commit()

    def demo_client(self):
        return patch.object(receipt_router, "PORTFOLIO_DEMO_MODE", True)

    def test_session_bootstrap_is_read_only_and_receipt_list_seeds_samples(self):
        with self.demo_client(), TestClient(app) as client:
            response = client.get("/api/session")
            self.assertEqual(response.status_code, 200, response.text)
            payload = response.json()
            self.assertTrue(payload["demo_mode"])
            self.assertEqual(payload["user"]["username"], "demo")
            self.assertNotIn("password_hash", payload["user"])
            self.assertEqual(len(payload["samples"]), 5)
            self.assertEqual(payload["samples"][0]["filename"], "portfolio-demo-grocery.png")
            self.assertTrue(payload["samples"][0]["image_url"].startswith("/assets/demo/receipts/"))
            with SessionLocal() as db:
                self.assertEqual(db.query(Receipt).count(), 0)

            listing = client.get("/api/receipts")
            self.assertEqual(listing.status_code, 200, listing.text)
            self.assertEqual(len(listing.json()["receipts"]), 5)
            for receipt in listing.json()["receipts"]:
                self.assertNotIn("stored_filename", receipt)
                self.assertNotIn("image_hash", receipt)

    def test_session_then_sample_upload_succeeds_before_receipt_list_seeds(self):
        sample_filename = "portfolio-demo-grocery.png"
        sample_path = Path(__file__).resolve().parents[1] / "assets" / "demo" / "receipts" / "receipt-grocery.png"
        with self.demo_client(), TestClient(app) as client:
            session = client.get("/api/session")
            self.assertEqual(session.status_code, 200, session.text)
            self.assertEqual(session.json()["samples"][0]["filename"], sample_filename)
            with SessionLocal() as db:
                self.assertEqual(db.query(Receipt).count(), 0)

            response = client.post(
                "/api/receipts/upload",
                data={"csrf_token": session.json()["csrf_token"]},
                files={"files": (sample_filename, sample_path.read_bytes(), "image/png")},
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["uploaded_count"], 1)
            self.assertEqual(response.json()["duplicate_count"], 0)
            with SessionLocal() as db:
                receipt = db.query(Receipt).filter(Receipt.filename == sample_filename).one()
                self.assertIn("Mock解析", receipt.result)

    def test_pending_invitation_can_be_reissued_and_registered_email_is_rejected(self):
        with patch.object(receipt_router, "PORTFOLIO_DEMO_MODE", False), TestClient(app) as client:
            csrf = client.get("/api/session").json()["csrf_token"]
            login = client.post(
                "/api/login",
                data={"identifier": "demo", "password": "demo test password 123", "csrf_token": csrf},
            )
            self.assertEqual(login.status_code, 200, login.text)
            csrf = login.json()["csrf_token"]

            first = client.post(
                "/api/admin/invitations",
                data={"email": "Reissue@example.com", "csrf_token": csrf},
            )
            self.assertEqual(first.status_code, 200, first.text)
            old_token = parse_qs(urlsplit(first.json()["invite_url"]).query)["token"][0]

            reissued = client.post(
                "/api/admin/invitations",
                data={"email": " REISSUE@EXAMPLE.COM ", "csrf_token": first.json()["csrf_token"]},
            )
            self.assertEqual(reissued.status_code, 200, reissued.text)
            new_token = parse_qs(urlsplit(reissued.json()["invite_url"]).query)["token"][0]
            self.assertNotEqual(old_token, new_token)
            self.assertEqual(client.get(f"/api/register?token={old_token}").json()["code"], "invalid_invitation")
            self.assertEqual(client.get(f"/api/register?token={new_token}").status_code, 200)
            self.assertEqual(len(client.get("/api/admin/users").json()["invitations"]), 1)

            existing_user = client.post(
                "/api/admin/invitations",
                data={"email": " DEMO@EXAMPLE.INVALID ", "csrf_token": reissued.json()["csrf_token"]},
            )
            self.assertEqual(existing_user.status_code, 400)
            self.assertEqual(existing_user.json()["code"], "email_already_registered")

    def test_direct_summary_request_seeds_demo_samples(self):
        with self.demo_client(), TestClient(app) as client:
            client.get("/api/session")
            summary = client.get("/api/summary")
            self.assertEqual(summary.status_code, 200, summary.text)
            self.assertEqual(summary.json()["receipt_count"], 5)
            with SessionLocal() as db:
                self.assertEqual(db.query(Receipt).count(), 5)

    def test_public_demo_blocks_account_registration_and_admin_capabilities(self):
        with self.demo_client(), TestClient(app) as client:
            client.get("/api/session")
            get_admin = client.get("/api/admin/users")
            self.assertEqual(get_admin.status_code, 403)
            self.assertEqual(get_admin.json()["code"], "demo_capability_disabled")

            register_info = client.get("/api/register?token=unused")
            self.assertEqual(register_info.status_code, 403)
            self.assertEqual(register_info.json()["code"], "demo_capability_disabled")

            password = client.post(
                "/api/account/password",
                data={
                    "current_password": "demo test password 123",
                    "new_password": "another demo password 123",
                    "new_password_confirm": "another demo password 123",
                },
            )
            self.assertEqual(password.status_code, 403)
            self.assertEqual(password.json()["code"], "demo_capability_disabled")

            csrf = client.get("/api/session").json()["csrf_token"]
            invitation = client.post(
                "/api/admin/invitations",
                data={"email": "not-created@example.invalid", "csrf_token": csrf},
            )
            self.assertEqual(invitation.status_code, 403)
            self.assertEqual(invitation.json()["code"], "demo_capability_disabled")

    def test_demo_upload_uses_mock_analysis_and_csrf(self):
        output = io.BytesIO()
        Image.new("RGB", (3, 3), "white").save(output, format="PNG")
        with self.demo_client(), TestClient(app) as client:
            csrf = client.get("/api/session").json()["csrf_token"]
            response = client.post(
                "/api/receipts/upload",
                data={"csrf_token": csrf},
                files={"files": ("mock-upload.png", output.getvalue(), "image/png")},
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["uploaded_count"], 1)
            receipts = client.get("/api/receipts").json()["receipts"]
            uploaded = next(item for item in receipts if item["filename"] == "mock-upload.png")
            self.assertIn("Mock解析", uploaded["result"])

    def test_all_invalid_upload_preserves_safe_error_diagnostics(self):
        with self.demo_client(), TestClient(app) as client:
            csrf = client.get("/api/session").json()["csrf_token"]
            response = client.post(
                "/api/receipts/upload",
                data={"csrf_token": csrf},
                files=[("files", ("invalid.txt", b"not an image", "text/plain"))],
            )
            self.assertEqual(response.status_code, 400)
            payload = response.json()
            self.assertEqual(payload["code"], "no_valid_uploads")
            self.assertEqual(payload["uploaded_count"], 0)
            self.assertEqual(payload["duplicate_count"], 0)
            self.assertEqual(payload["error_count"], 1)
            self.assertEqual(payload["duplicates"], [])
            self.assertEqual(payload["messages"], payload["errors"])
            self.assertTrue(all(isinstance(message, str) for message in payload["errors"]))

    def test_api_error_payload_only_keeps_typed_allowlisted_fields(self):
        payload = _api_error_payload(
            {
                "error": "failed",
                "code": "no_valid_uploads",
                "uploaded_count": 0,
                "duplicate_count": True,
                "error_count": 1,
                "duplicates": ["already uploaded", object()],
                "errors": ["invalid.txt: not an image"],
                "messages": ["invalid.txt: not an image"],
                "secret": "do not serialize",
                "submitted_password": "do not serialize",
            }
        )
        self.assertEqual(
            payload,
            {
                "error": "failed",
                "code": "no_valid_uploads",
                "uploaded_count": 0,
                "error_count": 1,
                "errors": ["invalid.txt: not an image"],
                "messages": ["invalid.txt: not an image"],
            },
        )

    def test_request_body_limit_returns_json_on_api_upload_path(self):
        called_downstream = False
        sent = []

        async def downstream(scope, receive, send):
            nonlocal called_downstream
            called_downstream = True

        async def receive():
            return {"type": "http.request", "body": b"x", "more_body": False}

        async def send(message):
            sent.append(message)

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/receipts/upload",
            "raw_path": b"/api/receipts/upload",
            "query_string": b"",
            "headers": [(b"content-length", b"17")],
            "server": ("testserver", 80),
            "client": ("testclient", 12345),
        }
        asyncio.run(RequestBodyLimitMiddleware(downstream, max_body_size=16)(scope, receive, send))
        response_start = next(message for message in sent if message["type"] == "http.response.start")
        response_body = next(message["body"] for message in sent if message["type"] == "http.response.body")
        self.assertFalse(called_downstream)
        self.assertEqual(response_start["status"], 413)
        self.assertEqual(json.loads(response_body), {"error": "リクエストサイズが上限を超えています。", "code": "request_too_large"})


if __name__ == "__main__":
    unittest.main()
