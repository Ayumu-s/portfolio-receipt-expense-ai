import { ApiError, formDataFrom, getDownload, getJson, postForm, setCsrfToken } from "./api.js";
import { alertBox, button, el, link, setHidden } from "./dom.js";
import {
    adminView,
    editView,
    errorView,
    homeView,
    loginView,
    passwordView,
    receiptsView,
    registerView,
    summaryView,
    uploadView,
} from "./views.js";

const body = document.body;
const appView = document.getElementById("appView");
const viewStatus = document.getElementById("viewStatus");
const globalAlert = document.getElementById("globalAlert");
const siteNav = document.getElementById("siteNav");
const desktopLinks = document.getElementById("desktopLinks");
const mobileLinks = document.getElementById("mobileLinks");
const state = { session: null, currentView: "" };

function setViewState(value, message = "") {
    body.dataset.viewState = value;
    appView.setAttribute("aria-busy", value === "loading" ? "true" : "false");
    setHidden(appView, value === "loading");
    setHidden(viewStatus, !message);
    viewStatus.textContent = message;
}

function render(view, title) {
    appView.replaceChildren(view);
    document.title = `${title} | 経費管理アプリ`;
    appView.classList.remove("hidden");
    appView.setAttribute("aria-busy", "false");
    setHidden(viewStatus, true);
    setHidden(globalAlert, true);
    globalAlert.replaceChildren();
    body.dataset.viewState = "ready";
    if (state.currentView === "upload") initializeUpload();
    if (state.currentView === "edit") initializeEdit();
    if (state.currentView === "receipts") initializeReceipts();
}

function localRedirect(value, fallback) {
    if (typeof value === "string" && value.startsWith("/")) {
        try {
            const url = new URL(value, window.location.origin);
            if (url.origin === window.location.origin) return `${url.pathname}${url.search}${url.hash}`;
        } catch {
            // Fall through to the local fallback for malformed URLs.
        }
    }
    return fallback;
}

function setNavigationItem(container, label, href, active, options = {}) {
    const anchor = link(label, href, `${options.mobile ? "block rounded-lg px-3 py-3 text-sm font-semibold" : "rounded-lg px-3 py-2 text-sm font-semibold transition-colors"} ui-nav-link ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"}`);
    anchor.setAttribute("aria-current", active ? "page" : "false");
    container.appendChild(anchor);
}

function renderNavigation(session, pathname) {
    desktopLinks.replaceChildren();
    mobileLinks.replaceChildren();
    const demo = Boolean(session.demo_mode);
    const user = session.user || null;
    const authPage = pathname === "/login" || pathname === "/register";
    setHidden(siteNav, authPage);
    setHidden(document.getElementById("demoNotice"), !demo);
    body.dataset.demoMode = String(demo);
    const demoStylesheet = document.getElementById("demoStylesheet");
    if (demo) {
        demoStylesheet.href = "/assets/demo.css";
        demoStylesheet.disabled = false;
    } else {
        demoStylesheet.disabled = true;
        demoStylesheet.removeAttribute("href");
    }

    if (authPage) return;
    const items = [
        ["アップロード", "/upload", pathname === "/upload"],
        ["一覧", "/receipts", pathname.startsWith("/receipts")],
        ["集計", "/summary", pathname === "/summary"],
    ];
    if (!demo && user?.role === "admin") items.push(["ユーザー管理", "/admin/users", pathname.startsWith("/admin")]);
    for (const [label, href, active] of items) {
        setNavigationItem(desktopLinks, label, href, active);
        setNavigationItem(mobileLinks, label, href, active, { mobile: true });
    }

    if (demo) return;
    if (user) {
        const desktopAccount = link(user.username || "アカウント", "/account/password", "ml-2 border-l border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-blue-700");
        desktopLinks.appendChild(desktopAccount);
        const mobileAccount = link("アカウント・パスワード変更", "/account/password", "block rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50");
        mobileLinks.appendChild(mobileAccount);
        const logoutButton = button("ログアウト", "rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700", { "data-action": "logout" });
        const logoutWrapper = el("div", { className: "ml-2 border-l border-slate-200 pl-3" }, [logoutButton]);
        desktopLinks.appendChild(logoutWrapper);
        mobileLinks.appendChild(el("div", { className: "mt-3 border-t border-slate-100 pt-3" }, [button("ログアウト", "block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700", { "data-action": "logout" })]));
    } else {
        setNavigationItem(desktopLinks, "ログイン", "/login", false);
        setNavigationItem(mobileLinks, "ログイン", "/login", false, { mobile: true });
    }
}

function showFormError(form, message) {
    let node = form.querySelector("[data-form-error]");
    if (!node) {
        node = alertBox(message);
        node.dataset.formError = "true";
        form.insertBefore(node, form.firstChild);
    } else {
        node.textContent = message;
    }
}

function clearFormError(form) {
    form.querySelector("[data-form-error]")?.remove();
}

function showGlobalError(message) {
    globalAlert.replaceChildren(alertBox(message));
    globalAlert.classList.remove("hidden");
}

function errorMessage(error) {
    if (error instanceof ApiError) return error.message;
    return "処理に失敗しました。時間をおいて再度お試しください。";
}

function errorPage(error, pathname) {
    if (error.status === 403 && pathname.startsWith("/admin")) {
        render(errorView("このページを表示できません", "ユーザー管理には管理者権限が必要です。", "/receipts"), "アクセスできません");
        return;
    }
    if (error.status === 404 && /^\/receipts\/\d+\/edit$/.test(pathname)) {
        render(errorView("レシートが見つかりません", "対象のレシートが存在しないか、表示する権限がありません。", "/receipts"), "レシートが見つかりません");
        return;
    }
    if (error.status === 400 && pathname === "/register") {
        state.currentView = "register";
        render(registerView(null, ""), "招待リンクを確認できません");
        return;
    }
    render(errorView("データを読み込めませんでした", errorMessage(error), pathname === "/login" ? "/login" : "/"), "読み込みエラー");
    body.dataset.viewState = "error";
}

function currentReceiptQuery() {
    return new URLSearchParams(window.location.search);
}

async function loadCurrentView(pathname = window.location.pathname) {
    const session = state.session;
    const query = currentReceiptQuery();
    const isPublic = pathname === "/login" || pathname === "/register";
    const demo = Boolean(session.demo_mode);
    if (!session.user && !demo && !isPublic) {
        const next = `${pathname}${window.location.search}`;
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
    }
    if (session.user?.must_change_password && pathname !== "/account/password" && pathname !== "/register") {
        window.location.replace("/account/password");
        return;
    }
    if (demo && ["/login", "/account/password", "/admin/users", "/register"].includes(pathname)) {
        const titles = {
            "/login": "ログイン機能はデモでは利用できません",
            "/account/password": "アカウント設定はデモでは利用できません",
            "/admin/users": "ユーザー管理はデモでは利用できません",
            "/register": "招待登録はデモでは利用できません",
        };
        state.currentView = "error";
        render(errorView(titles[pathname], "この機能は公開デモでは無効です。", "/"), "デモでは利用できません");
        return;
    }
    if (session.user && pathname === "/login") {
        window.location.replace(session.user.must_change_password ? "/account/password" : "/receipts");
        return;
    }

    try {
        setViewState("loading", "読み込み中…");
        if (pathname === "/login") {
            state.currentView = "login";
            render(loginView(query), "ログイン");
            return;
        }
        if (pathname === "/register") {
            const token = query.get("token") || "";
            const invitation = token ? await getJson(`/api/register?token=${encodeURIComponent(token)}`, { redirectOnAuth: false }) : null;
            state.currentView = "register";
            render(registerView(invitation, token), "招待ユーザー登録");
            return;
        }
        if (pathname === "/account/password") {
            state.currentView = "password";
            render(passwordView(session), "パスワード変更");
            return;
        }
        if (pathname === "/admin/users") {
            const data = await getJson("/api/admin/users");
            state.currentView = "admin";
            render(adminView(data, session), "ユーザー管理");
            return;
        }
        if (pathname === "/upload") {
            state.currentView = "upload";
            render(uploadView(session), "レシート画像を追加");
            return;
        }
        if (pathname === "/receipts") {
            const data = await getJson(`/api/receipts${query.size ? `?${query.toString()}` : ""}`);
            state.currentView = "receipts";
            render(receiptsView(data, query), "レシート一覧");
            return;
        }
        if (pathname === "/summary") {
            const summaryQuery = new URLSearchParams();
            if (query.get("year")) summaryQuery.set("year", query.get("year"));
            const data = await getJson(`/api/summary${summaryQuery.size ? `?${summaryQuery.toString()}` : ""}`);
            state.currentView = "summary";
            render(summaryView(data), "経費集計");
            return;
        }
        const editMatch = pathname.match(/^\/receipts\/(\d+)\/edit$/);
        if (editMatch) {
            const data = await getJson(`/api/receipts/${editMatch[1]}`);
            state.currentView = "edit";
            render(editView(data, editMatch[1]), "レシート内容を確認");
            return;
        }
        if (pathname === "/") {
            state.currentView = "home";
            render(homeView(session), "レシートを整理");
            return;
        }
        state.currentView = "notFound";
        render(errorView("ページが見つかりません", "指定されたページはありません。", "/"), "ページが見つかりません");
    } catch (error) {
        errorPage(error, pathname);
    }
}

function validSampleUrl(value) {
    if (typeof value !== "string" || !/^\/assets\/demo\/receipts\/[A-Za-z0-9._-]+$/.test(value)) return "";
    return value;
}

function uploadLimits() {
    const main = appView.querySelector("main[data-max-files]");
    return {
        maxFiles: Number(main?.dataset.maxFiles) || 1,
        maxBytes: Number(main?.dataset.maxUploadBytes) || 1,
    };
}

function setUploadError(message) {
    const node = appView.querySelector("#uploadError");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("hidden", !message);
}

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function updateFileList() {
    const input = appView.querySelector("#fileInput");
    const list = appView.querySelector("#fileList");
    const submit = appView.querySelector("#submitBtn");
    const limits = uploadLimits();
    if (!input || !list || !submit) return;
    const files = Array.from(input.files || []);
    const tooMany = files.length > limits.maxFiles;
    const tooLarge = files.filter((file) => file.size > limits.maxBytes);
    setUploadError(tooMany
        ? `選択できる画像は${limits.maxFiles}件までです。`
        : tooLarge.length ? `${tooLarge.map((file) => file.name).join("、")} はファイル容量の上限を超えています。` : "");
    list.replaceChildren();
    for (const file of files) {
        const invalid = file.size > limits.maxBytes;
        list.appendChild(el("div", {
            className: `flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${invalid ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-700"}`,
        }, [
            el("span", { className: "min-w-0 flex-1 truncate", text: file.name }),
            el("span", { className: "shrink-0 text-xs text-slate-400", text: formatFileSize(file.size) }),
        ]));
    }
    list.classList.toggle("hidden", files.length === 0);
    submit.disabled = files.length === 0 || tooMany || tooLarge.length > 0;
    submit.textContent = files.length && !submit.disabled ? `${files.length}件を解析する` : "画像を選択すると解析できます";
}

function setSampleSelection(selectedButton) {
    for (const sampleButton of appView.querySelectorAll(".demo-receipt-card")) {
        const selected = sampleButton === selectedButton;
        sampleButton.classList.toggle("is-selected", selected);
        sampleButton.setAttribute("aria-pressed", String(selected));
        sampleButton.querySelector(".demo-receipt-check")?.remove();
        if (selected) {
            const imageWrap = sampleButton.querySelector(".demo-receipt-image-wrap");
            imageWrap?.appendChild(el("span", { className: "demo-receipt-check", text: "✓", attrs: { "aria-hidden": "true" } }));
        }
    }
}

function clearSampleSelection() {
    for (const sampleButton of appView.querySelectorAll(".demo-receipt-card")) {
        sampleButton.classList.remove("is-selected");
        sampleButton.setAttribute("aria-pressed", "false");
        sampleButton.querySelector(".demo-receipt-check")?.remove();
    }
    const status = appView.querySelector("#selectedSampleStatus");
    if (status) status.textContent = "自分の画像を解析対象にセットしています。";
}

async function selectSample(sampleButton) {
    const index = Number(sampleButton?.dataset.sampleIndex);
    const sample = state.session.samples?.[index];
    const imageUrl = validSampleUrl(sample?.image_url);
    if (!sample || !imageUrl) {
        setUploadError("サンプル画像を利用できません。自分の画像を選択してください。");
        return;
    }
    const buttons = [...appView.querySelectorAll(".demo-receipt-card")];
    const status = appView.querySelector("#selectedSampleStatus");
    buttons.forEach((node) => { node.disabled = true; });
    if (status) status.textContent = "サンプル画像を読み込んでいます…";
    setUploadError("");
    try {
        const response = await fetch(imageUrl, { credentials: "same-origin" });
        if (!response.ok) throw new Error("sample image request failed");
        const blob = await response.blob();
        const filename = typeof sample.filename === "string" && sample.filename.trim()
            ? sample.filename
            : "portfolio-demo-receipt.png";
        const file = new File([blob], filename, { type: blob.type || "image/png", lastModified: Date.now() });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        const input = appView.querySelector("#fileInput");
        input.files = transfer.files;
        setSampleSelection(sampleButton);
        if (status) status.textContent = `${sample.label}の架空サンプルを解析対象にセットしました。Mock解析を開始できます。`;
        updateFileList();
    } catch {
        setUploadError("サンプル画像を読み込めませんでした。自分の画像を選択してください。");
        if (status) status.textContent = "サンプルを読み込めませんでした。";
    } finally {
        buttons.forEach((node) => { node.disabled = false; });
    }
}

function initializeUpload() {
    const input = appView.querySelector("#fileInput");
    const dropZone = appView.querySelector("#dropZone");
    if (!input || !dropZone) return;
    input.addEventListener("change", () => {
        clearSampleSelection();
        updateFileList();
    });
    for (const eventName of ["dragenter", "dragover"]) {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add("border-blue-500", "bg-blue-50");
        });
    }
    for (const eventName of ["dragleave", "drop"]) {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("border-blue-500", "bg-blue-50");
        });
    }
    dropZone.addEventListener("drop", (event) => {
        const droppedFiles = event.dataTransfer?.files;
        if (!droppedFiles?.length) return;
        input.files = droppedFiles;
        clearSampleSelection();
        updateFileList();
    });
    if (state.session.demo_mode && state.session.samples?.length) {
        const first = appView.querySelector(".demo-receipt-card");
        if (first) void selectSample(first);
    }
}

function updateReceiptSelection() {
    const allRows = [...appView.querySelectorAll(".row-check")];
    const ids = new Set(allRows.map((node) => node.value));
    const checked = new Set(allRows.filter((node) => node.checked).map((node) => node.value));
    const bulkBar = appView.querySelector("#bulkBar");
    const selectedCount = appView.querySelector("#selectedCount");
    if (!bulkBar || !selectedCount) return;
    bulkBar.classList.toggle("hidden", checked.size === 0);
    selectedCount.textContent = `${checked.size}件選択中`;
    for (const selectAll of appView.querySelectorAll("#selectAll, #selectAllMobile")) {
        selectAll.checked = ids.size > 0 && checked.size === ids.size;
        selectAll.indeterminate = checked.size > 0 && checked.size < ids.size;
    }
}

function initializeReceipts() {
    updateReceiptSelection();
}

function initializeEdit() {
    const form = appView.querySelector("#editForm");
    if (!form) return;
    form.dataset.dirty = "false";
    form.addEventListener("input", () => { form.dataset.dirty = "true"; });
}

function summarizeUpload(data) {
    const candidates = [data.created_count, data.uploaded_count, data.success_count, data.processed_count];
    const count = candidates.map(Number).find((value) => Number.isFinite(value) && value >= 0);
    const parts = [];
    if (count !== undefined) parts.push(`登録処理 ${count}件`);
    const duplicates = Number(data.duplicate_count);
    if (Number.isFinite(duplicates) && duplicates > 0) parts.push(`重複 ${duplicates}件`);
    const errors = Number(data.error_count);
    if (Number.isFinite(errors) && errors > 0) parts.push(`エラー ${errors}件`);
    return parts.length ? `${parts.join("・")}。` : "アップロード処理が完了しました。";
}

function uploadMessages(data) {
    const items = [];
    const seen = new Set();
    if (typeof data.error === "string" && data.error) {
        seen.add(data.error);
        items.push(data.error);
    }
    for (const value of [data.messages, data.duplicates, data.errors]) {
        if (!Array.isArray(value)) continue;
        for (const item of value) {
            const message = typeof item === "string"
                ? item
                : item && typeof item === "object"
                    ? [item.filename, item.reason || item.message || item.error].filter((part) => typeof part === "string" && part).join(": ") || "処理結果を確認してください。"
                    : "";
            if (message && !seen.has(message)) {
                seen.add(message);
                items.push(message);
            }
        }
    }
    return items;
}

function showUploadResult(data, failed = false) {
    appView.querySelector("#uploadResult")?.remove();
    const messages = uploadMessages(data);
    const panel = el("section", {
        className: `mt-5 rounded-2xl border ${failed ? "border-red-200" : "border-blue-100"} bg-white px-4 py-4 shadow-sm`,
        attrs: { id: "uploadResult", role: failed ? "alert" : "status", "aria-live": failed ? "assertive" : "polite" },
    }, [
        el("h2", { className: "font-semibold text-slate-900", text: "アップロード結果" }),
        el("p", { className: `mt-1 text-sm ${failed ? "text-red-700" : "text-slate-700"}`, text: summarizeUpload(data) }),
    ]);
    if (messages.length) panel.appendChild(el("ul", { className: "mt-3 ui-result-list space-y-1 text-sm text-slate-600" }, messages.map((message) => el("li", { text: message }))));
    panel.appendChild(link("レシート一覧を見る", "/receipts", `${primaryLinkClass()} mt-4`));
    appView.querySelector("#uploadForm")?.after(panel);
}

function primaryLinkClass() {
    return "inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200";
}

async function handleLogin(form) {
    clearFormError(form);
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
        const response = await postForm("/api/login", formDataFrom(form), { redirectOnAuth: false });
        const session = await getJson("/api/session", { redirectOnAuth: false });
        state.session = session;
        setCsrfToken(session.csrf_token);
        renderNavigation(session, "/receipts");
        const fallback = session.user?.must_change_password ? "/account/password" : (new URLSearchParams(location.search).get("next") || "/receipts");
        window.location.assign(localRedirect(response.redirect_url, localRedirect(fallback, "/receipts")));
    } catch (error) {
        showFormError(form, errorMessage(error));
        submit.disabled = false;
    }
}

async function handleRegister(form) {
    clearFormError(form);
    if (form.elements.password.value !== form.elements.password_confirm.value) {
        showFormError(form, "パスワードが一致しません。");
        return;
    }
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
        const response = await postForm("/api/register", formDataFrom(form), { redirectOnAuth: false });
        window.location.assign(localRedirect(response.redirect_url, "/login?registered=1"));
    } catch (error) {
        showFormError(form, errorMessage(error));
        submit.disabled = false;
    }
}

async function handlePassword(form) {
    clearFormError(form);
    if (form.elements.new_password.value !== form.elements.new_password_confirm.value) {
        showFormError(form, "新しいパスワードが一致しません。");
        return;
    }
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
        const response = await postForm("/api/account/password", formDataFrom(form));
        window.location.assign(localRedirect(response.redirect_url, "/receipts?password_updated=1"));
    } catch (error) {
        showFormError(form, errorMessage(error));
        submit.disabled = false;
    }
}

async function handleInvite(form) {
    const alertRoot = appView.querySelector("#adminAlert");
    alertRoot.replaceChildren();
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
        const result = await postForm("/api/admin/invitations", formDataFrom(form));
        const invitePath = typeof result.invite_url === "string" ? result.invite_url : "";
        const emailNotice = appView.querySelector("#inviteEmailNotice");
        emailNotice.textContent = `${result.invite_email || form.elements.email.value} へ安全な方法で共有してください。この画面を離れるとリンクは再表示できません。`;
        appView.querySelector("#invitePath").value = invitePath;
        appView.querySelector("#copyStatus").textContent = "";
        appView.querySelector("#inviteCreated").classList.remove("hidden");
        form.reset();
    } catch (error) {
        alertRoot.replaceChildren(alertBox(errorMessage(error)));
    } finally {
        submit.disabled = false;
    }
}

async function handleEdit(form) {
    clearFormError(form);
    const status = appView.querySelector("#editStatus");
    const submit = form.querySelector("button[type=submit]");
    status?.classList.remove("hidden");
    if (status) status.textContent = "変更を保存しています…";
    submit.disabled = true;
    try {
        const result = await postForm(`/api/receipts/${form.dataset.receiptId}/edit`, formDataFrom(form));
        form.dataset.dirty = "false";
        window.location.assign(localRedirect(result.redirect_url, "/receipts?updated=1"));
    } catch (error) {
        status?.classList.add("hidden");
        showFormError(form, errorMessage(error));
        submit.disabled = false;
    }
}

async function handleUpload(form) {
    clearFormError(form);
    const input = form.querySelector("#fileInput");
    const files = Array.from(input.files || []);
    if (!files.length) {
        setUploadError("画像を選択してください。");
        return;
    }
    const submit = form.querySelector("#submitBtn");
    const loading = appView.querySelector("#loading");
    submit.disabled = true;
    submit.textContent = "解析中です…";
    loading?.classList.remove("hidden");
    setUploadError("");
    try {
        const result = await postForm("/api/receipts/upload", formDataFrom(form));
        showUploadResult(result);
    } catch (error) {
        const payload = error instanceof ApiError && error.payload && typeof error.payload === "object"
            ? (error.payload.detail && typeof error.payload.detail === "object" ? error.payload.detail : error.payload)
            : null;
        const hasDiagnostics = payload && (
            error.code === "no_valid_uploads"
            || ["messages", "duplicates", "errors"].some((key) => Array.isArray(payload[key]))
            || ["uploaded_count", "duplicate_count", "error_count"].some((key) => Number.isInteger(payload[key]))
        );
        if (hasDiagnostics) {
            setUploadError("");
            showUploadResult(payload, true);
        } else {
            setUploadError(errorMessage(error));
        }
    } finally {
        loading?.classList.add("hidden");
        updateFileList();
    }
}

async function handleExportDownload(anchor) {
    if (anchor.dataset.pending === "true") return;
    const label = anchor.dataset.downloadLabel || anchor.textContent;
    anchor.dataset.pending = "true";
    anchor.setAttribute("aria-busy", "true");
    anchor.setAttribute("aria-disabled", "true");
    anchor.setAttribute("aria-live", "polite");
    anchor.textContent = "ZIPを準備中…";
    try {
        const { blob, filename } = await getDownload(anchor.href);
        const objectUrl = URL.createObjectURL(blob);
        const downloadAnchor = el("a", { attrs: { href: objectUrl, download: filename } });
        downloadAnchor.hidden = true;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
        if (!(error instanceof ApiError && (error.status === 401 || error.code === "password_change_required"))) {
            showGlobalError(errorMessage(error));
        }
    } finally {
        delete anchor.dataset.pending;
        anchor.removeAttribute("aria-busy");
        anchor.removeAttribute("aria-disabled");
        anchor.textContent = label;
    }
}

async function handleToggleExpense(form) {
    const receiptId = form.dataset.receiptId;
    await postForm(`/api/receipts/${receiptId}/toggle-expense`, new FormData());
    await loadCurrentView("/receipts");
}

async function handleDeleteSelected() {
    const selected = [...new Set([...appView.querySelectorAll(".row-check:checked")].map((node) => node.value))];
    if (!selected.length || !window.confirm(`${selected.length}件のレシートを削除しますか？この操作は取り消せません。`)) return;
    const formData = new FormData();
    for (const id of selected) if (/^\d+$/.test(id)) formData.append("ids", id);
    try {
        const result = await postForm("/api/receipts/delete", formData);
        window.location.assign(localRedirect(result.redirect_url, `${location.pathname}${location.search}`));
    } catch (error) {
        showGlobalError(errorMessage(error));
    }
}

async function handleLogout() {
    try {
        const result = await postForm("/api/logout", new FormData(), { redirectOnAuth: false });
        window.location.assign(localRedirect(result.redirect_url, "/login"));
    } catch (error) {
        showGlobalError(errorMessage(error));
    }
}

async function handleUserToggle(form) {
    const userId = form.dataset.userId;
    try {
        await postForm(`/api/admin/users/${userId}/toggle-active`, new FormData());
        await loadCurrentView("/admin/users");
    } catch (error) {
        showGlobalError(errorMessage(error));
    }
}

async function copyInvite() {
    const value = appView.querySelector("#invitePath")?.value || "";
    const status = appView.querySelector("#copyStatus");
    try {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin) throw new Error("external invite URL");
        await navigator.clipboard.writeText(url.href);
        status.textContent = "コピーしました。";
    } catch {
        status.textContent = "コピーできませんでした。URL欄を選択してコピーしてください。";
    }
}

function openImage(url, trigger) {
    if (typeof url !== "string" || !/^\/receipts\/\d+\/image$/.test(url)) return;
    const modal = appView.querySelector("#imageModal");
    const image = appView.querySelector("#modalImage");
    if (!modal || !image) return;
    state.imageTrigger = trigger || document.activeElement;
    image.src = url;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
    appView.querySelector("#modalClose")?.focus();
}

function closeImage() {
    const modal = appView.querySelector("#imageModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
    state.imageTrigger?.focus?.();
}

appView.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === "loginForm") {
        event.preventDefault();
        void handleLogin(form);
    } else if (form.id === "registerForm") {
        event.preventDefault();
        void handleRegister(form);
    } else if (form.id === "passwordForm") {
        event.preventDefault();
        void handlePassword(form);
    } else if (form.id === "inviteForm") {
        event.preventDefault();
        void handleInvite(form);
    } else if (form.id === "editForm") {
        event.preventDefault();
        void handleEdit(form);
    } else if (form.id === "uploadForm") {
        event.preventDefault();
        void handleUpload(form);
    } else if (form.dataset.action === "toggle-expense") {
        event.preventDefault();
        void handleToggleExpense(form).catch((error) => showGlobalError(errorMessage(error)));
    } else if (form.dataset.action === "toggle-user") {
        event.preventDefault();
        void handleUserToggle(form);
    }
});

appView.addEventListener("change", (event) => {
    if (state.currentView !== "receipts") return;
    const target = event.target;
    if (target.matches("#selectAll, #selectAllMobile")) {
        appView.querySelectorAll(".row-check").forEach((node) => { node.checked = target.checked; });
        updateReceiptSelection();
    } else if (target.matches(".row-check")) {
        updateReceiptSelection();
    }
});

appView.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
    if (!target) {
        if (event.target === appView.querySelector("#imageModal")) closeImage();
        return;
    }
    const action = target.dataset.action;
    if (action === "sample-select") {
        void selectSample(target);
    } else if (action === "download-export") {
        event.preventDefault();
        void handleExportDownload(target);
    } else if (action === "toggle-detail") {
        const detail = document.getElementById(target.getAttribute("aria-controls"));
        if (!detail) return;
        const expanded = detail.classList.toggle("hidden") === false;
        target.setAttribute("aria-expanded", String(expanded));
    } else if (action === "open-image") {
        openImage(target.dataset.imageUrl, target);
    } else if (action === "close-image") {
        closeImage();
    } else if (action === "delete-selected") {
        void handleDeleteSelected();
    } else if (action === "copy-invite") {
        void copyInvite();
    }
});

document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-action='logout']") : null;
    if (target) void handleLogout();
});

document.getElementById("navToggle").addEventListener("click", (event) => {
    const toggle = event.currentTarget;
    const menu = document.getElementById("mobileMenu");
    const open = menu.classList.toggle("hidden") === false;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeImage();
});

window.addEventListener("beforeunload", (event) => {
    const form = appView.querySelector("#editForm[data-dirty='true']");
    if (!form) return;
    event.preventDefault();
    event.returnValue = "";
});

async function bootstrap() {
    try {
        const session = await getJson("/api/session", { redirectOnAuth: false });
        state.session = session;
        setCsrfToken(session.csrf_token);
        renderNavigation(session, window.location.pathname);
        await loadCurrentView();
    } catch (error) {
        state.currentView = "error";
        render(errorView("アプリを読み込めませんでした", errorMessage(error), "/"), "読み込みエラー");
        body.dataset.viewState = "error";
    }
}

void bootstrap();
