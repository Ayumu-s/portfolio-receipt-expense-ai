import html
import os
import re
import tempfile
import unittest
from pathlib import Path


TEST_DB_FILE = Path(tempfile.gettempdir()) / "receipt_security_tests.sqlite3"
if TEST_DB_FILE.exists():
    TEST_DB_FILE.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE.as_posix()}"
os.environ["SESSION_SECRET"] = "test-only-session-secret-with-more-than-32-characters"
os.environ["COOKIE_SECURE"] = "false"
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from database import Base, SessionLocal, engine  # noqa: E402
from main import app  # noqa: E402
from models import Invitation, Receipt, User  # noqa: E402
from services.auth import hash_password, token_hash, utcnow, validate_password  # noqa: E402


def csrf_token_from(response) -> str:
    match = re.search(r'name="csrf_token" value="([^"]+)"', response.text)
    if not match:
        raise AssertionError("CSRF token was not rendered")
    return html.unescape(match.group(1))


class SecurityFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        with SessionLocal() as db:
            for model in (Receipt, Invitation, User):
                db.query(model).delete()
            db.commit()
            admin = User(
                username="admin",
                username_normalized="admin",
                email="admin@example.com",
                email_normalized="admin@example.com",
                password_hash=hash_password("admin test password 123"),
                role="admin",
            )
            alice = User(
                username="alice",
                username_normalized="alice",
                email="alice@example.com",
                email_normalized="alice@example.com",
                password_hash=hash_password("alice test password 123"),
            )
            bob = User(
                username="bob",
                username_normalized="bob",
                email="bob@example.com",
                email_normalized="bob@example.com",
                password_hash=hash_password("bob test password 12345"),
            )
            db.add_all([admin, alice, bob])
            db.flush()
            db.add_all(
                [
                    Receipt(owner_id=alice.id, filename="alice.png", image_hash="a" * 64, result="合計金額：100円", image_data=b"alice", image_content_type="image/png"),
                    Receipt(owner_id=bob.id, filename="bob.png", image_hash="b" * 64, result="合計金額：200円", image_data=b"bob", image_content_type="image/png"),
                ]
            )
            db.commit()
            self.alice_receipt_id = db.query(Receipt.id).filter(Receipt.owner_id == alice.id).scalar()
            self.bob_receipt_id = db.query(Receipt.id).filter(Receipt.owner_id == bob.id).scalar()

    def test_password_requires_at_least_six_characters(self):
        validate_password("123456")
        with self.assertRaisesRegex(ValueError, "6文字以上"):
            validate_password("12345")

    def login(self, client: TestClient, identifier: str, password: str):
        page = client.get("/login")
        token = csrf_token_from(page)
        return client.post(
            "/login",
            data={"identifier": identifier, "password": password, "csrf_token": token},
            follow_redirects=False,
        )

    def test_login_accepts_email_and_uses_server_session(self):
        with TestClient(app) as client:
            response = self.login(client, "alice@example.com", "alice test password 123")
            self.assertEqual(response.status_code, 303)
            self.assertIn("receipt_session", response.headers.get("set-cookie", ""))
            self.assertEqual(client.get("/receipts").status_code, 200)

    def test_user_cannot_read_another_users_receipt(self):
        with TestClient(app) as client:
            self.login(client, "alice", "alice test password 123")
            listing = client.get("/receipts")
            self.assertIn("alice.png", listing.text)
            self.assertNotIn("bob.png", listing.text)
            self.assertEqual(client.get(f"/receipts/{self.bob_receipt_id}/image").status_code, 404)
            self.assertEqual(client.get(f"/receipts/{self.alice_receipt_id}/image").content, b"alice")

    def test_state_change_requires_csrf(self):
        with TestClient(app) as client:
            self.login(client, "alice", "alice test password 123")
            response = client.post(
                f"/receipts/{self.alice_receipt_id}/toggle-expense",
                data={"csrf_token": "invalid"},
                follow_redirects=False,
            )
            self.assertEqual(response.status_code, 403)

    def test_invitation_is_single_use(self):
        with TestClient(app) as admin_client:
            self.login(admin_client, "admin", "admin test password 123")
            admin_page = admin_client.get("/admin/users")
            token = csrf_token_from(admin_page)
            created = admin_client.post(
                "/admin/invitations",
                data={"email": "new-user@example.com", "csrf_token": token},
            )
            match = re.search(r'id="invitePath"[^>]+value="([^"]+)"', created.text)
            self.assertIsNotNone(match)
            invite_path = html.unescape(match.group(1))

        with TestClient(app) as new_client:
            register_page = new_client.get(invite_path)
            token = csrf_token_from(register_page)
            raw_invite_token = invite_path.split("token=", 1)[1]
            registered = new_client.post(
                "/register",
                data={
                    "invite_token": raw_invite_token,
                    "username": "new_user",
                    "password": "new user test password 123",
                    "password_confirm": "new user test password 123",
                    "csrf_token": token,
                },
                follow_redirects=False,
            )
            self.assertEqual(registered.status_code, 303)
            self.assertEqual(new_client.get(invite_path).status_code, 400)


if __name__ == "__main__":
    unittest.main()
