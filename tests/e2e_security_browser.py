import base64
import os
from pathlib import Path
import sys

from playwright.sync_api import expect, sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import SessionLocal
from models import Invitation, Receipt, SecurityEvent, User, UserSession
from services.auth import hash_password, normalize_email, normalize_username


BASE_URL = os.getenv("E2E_BASE_URL", "http://127.0.0.1:8002")
ADMIN_USERNAME = "security_e2e_admin"
ADMIN_EMAIL = "security-e2e-admin@example.invalid"
MEMBER_USERNAME = "security_e2e_member"
MEMBER_EMAIL = "security-e2e-member@example.invalid"
TEST_PASSWORD = "Security-e2e-passphrase-2026!"
MARKER_FILENAME = "security-e2e-admin-only.png"
MARKER_STORE = "E2E ADMIN ONLY"
ARTIFACT_DIR = Path("tests/e2e_artifacts")


def remove_test_data(db) -> None:
    test_users = db.query(User).filter(User.username.in_([ADMIN_USERNAME, MEMBER_USERNAME])).all()
    user_ids = [user.id for user in test_users]
    if user_ids:
        db.query(Receipt).filter(Receipt.owner_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(UserSession).filter(UserSession.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(SecurityEvent).filter(SecurityEvent.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(Invitation).filter(Invitation.created_by_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
    db.query(Invitation).filter(Invitation.email_normalized.in_([ADMIN_EMAIL, MEMBER_EMAIL])).delete(
        synchronize_session=False
    )
    db.commit()


def seed_admin() -> int:
    with SessionLocal() as db:
        remove_test_data(db)
        username, username_normalized = normalize_username(ADMIN_USERNAME)
        email, email_normalized = normalize_email(ADMIN_EMAIL)
        admin = User(
            username=username,
            username_normalized=username_normalized,
            email=email,
            email_normalized=email_normalized,
            password_hash=hash_password(TEST_PASSWORD),
            role="admin",
            is_active=True,
            must_change_password=False,
            email_verified_at=None,
        )
        db.add(admin)
        db.flush()
        png_1x1 = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nH0AAAAASUVORK5CYII="
        )
        receipt = Receipt(
            owner_id=admin.id,
            filename=MARKER_FILENAME,
            stored_filename=MARKER_FILENAME,
            image_hash="e2e-admin-only-image",
            result=f"日付：2026年08月23日\nお店、会社名：{MARKER_STORE}\n勘定科目：消耗品費\n合計金額：1円",
            image_data=png_1x1,
            image_content_type="image/png",
        )
        db.add(receipt)
        db.commit()
        return receipt.id


def cleanup() -> None:
    with SessionLocal() as db:
        remove_test_data(db)


def main() -> None:
    admin_receipt_id = seed_admin()
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    browser_errors: list[str] = []

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)

            admin_context = browser.new_context(viewport={"width": 1440, "height": 1000})
            admin_page = admin_context.new_page()
            admin_page.on(
                "console",
                lambda message: browser_errors.append(message.text) if message.type == "error" else None,
            )
            admin_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
            expect(admin_page.get_by_role("heading", name="ログイン")).to_be_visible()
            admin_page.screenshot(path=str(ARTIFACT_DIR / "login-desktop.png"), full_page=True)

            admin_page.locator("#identifier").fill(ADMIN_EMAIL)
            admin_page.locator("#password").fill(TEST_PASSWORD)
            admin_page.get_by_role("button", name="ログイン").click()
            admin_page.wait_for_url(f"{BASE_URL}/receipts", wait_until="networkidle")
            expect(admin_page.get_by_role("cell", name=MARKER_STORE, exact=True)).to_be_visible()

            auth_cookie = next(
                cookie for cookie in admin_context.cookies() if cookie["name"] == "receipt_session"
            )
            assert auth_cookie["httpOnly"] is True
            assert auth_cookie["sameSite"] == "Lax"

            admin_page.get_by_role("link", name="ユーザー管理").first.click()
            admin_page.wait_for_url(f"{BASE_URL}/admin/users", wait_until="networkidle")
            expect(admin_page.get_by_role("heading", name="ユーザー管理")).to_be_visible()
            admin_page.locator("#inviteEmail").fill(MEMBER_EMAIL)
            admin_page.get_by_role("button", name="招待リンクを発行").click()
            admin_page.wait_for_load_state("networkidle")
            invite_path = admin_page.locator("#invitePath").input_value()
            assert invite_path.startswith("/register?token=")
            admin_page.locator("section[aria-labelledby='inviteCreatedTitle']").screenshot(
                path=str(ARTIFACT_DIR / "admin-invite-panel.png")
            )

            member_context = browser.new_context(viewport={"width": 390, "height": 844})
            member_page = member_context.new_page()
            member_page.on(
                "console",
                lambda message: browser_errors.append(message.text) if message.type == "error" else None,
            )
            member_page.goto(f"{BASE_URL}{invite_path}", wait_until="networkidle")
            expect(member_page.get_by_role("heading", name="アカウントを作成")).to_be_visible()
            member_page.locator("#username").fill(MEMBER_USERNAME)
            member_page.locator("#password").fill(TEST_PASSWORD)
            member_page.locator("#passwordConfirm").fill(TEST_PASSWORD)
            member_page.get_by_role("button", name="登録する").click()
            member_page.wait_for_url(f"{BASE_URL}/login?registered=1", wait_until="networkidle")
            expect(member_page.get_by_text("登録が完了しました")).to_be_visible()

            reused = member_context.new_page()
            reused_response = reused.goto(f"{BASE_URL}{invite_path}", wait_until="networkidle")
            assert reused_response is not None and reused_response.status == 400
            expect(reused.get_by_role("heading", name="この招待リンクは利用できません")).to_be_visible()
            reused.close()

            member_page.locator("#identifier").fill(MEMBER_USERNAME)
            member_page.locator("#password").fill(TEST_PASSWORD)
            member_page.get_by_role("button", name="ログイン").click()
            member_page.wait_for_url(f"{BASE_URL}/receipts", wait_until="networkidle")
            expect(member_page.get_by_text(MARKER_STORE)).to_have_count(0)
            forbidden_response = member_context.request.get(
                f"{BASE_URL}/receipts/{admin_receipt_id}/image"
            )
            assert forbidden_response.status == 404
            member_page.screenshot(path=str(ARTIFACT_DIR / "member-receipts-mobile.png"), full_page=True)

            assert browser_errors == [], f"Browser console errors: {browser_errors}"
            member_context.close()
            admin_context.close()
            browser.close()
    finally:
        cleanup()

    print("E2E_SECURITY_OK")


if __name__ == "__main__":
    main()
