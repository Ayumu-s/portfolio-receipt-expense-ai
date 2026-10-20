export class ApiError extends Error {
    constructor(message, status, code, payload) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.payload = payload;
    }
}

let csrfToken = "";

export function setCsrfToken(value) {
    if (typeof value === "string") csrfToken = value;
}

export function getCsrfToken() {
    return csrfToken;
}

function redirectForAuth(error) {
    if (error.code === "password_change_required") {
        window.location.assign(error.payload?.redirect_url || "/account/password");
        return;
    }
    if (error.status === 401) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
    }
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    let body = options.body;
    const { redirectOnAuth = true, ...requestOptions } = options;
    if (body instanceof FormData && !body.has("csrf_token") && csrfToken) {
        body.append("csrf_token", csrfToken);
    }

    let response;
    try {
        response = await fetch(path, {
            ...requestOptions,
            body,
            headers,
            credentials: "same-origin",
        });
    } catch {
        throw new ApiError("サーバーに接続できませんでした。通信状態を確認してください。", 0, "network_error", null);
    }

    let payload = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
    }
    if (!response.ok) {
        const error = new ApiError(
            payload?.error || payload?.detail || `リクエストに失敗しました (${response.status})`,
            response.status,
            payload?.code,
            payload,
        );
        if (redirectOnAuth) redirectForAuth(error);
        throw error;
    }
    if (payload && typeof payload.csrf_token === "string") setCsrfToken(payload.csrf_token);
    return payload ?? {};
}

export function getJson(path, options = {}) {
    return request(path, { method: "GET", ...options });
}

function filenameFromDisposition(value) {
    if (typeof value !== "string") return "receipts.zip";
    let candidate = "";
    const extended = value.match(/filename\*\s*=\s*([^;]+)/i);
    if (extended) {
        const encoded = extended[1].trim().replace(/^\"|\"$/g, "");
        const parts = encoded.match(/^[^']*'[^']*'(.*)$/);
        try {
            candidate = decodeURIComponent(parts ? parts[1] : encoded);
        } catch {
            candidate = parts ? parts[1] : encoded;
        }
    } else {
        const plain = value.match(/filename\s*=\s*(?:\"([^\"]*)\"|([^;]+))/i);
        candidate = plain ? (plain[1] || plain[2] || "").trim() : "";
    }
    const safe = candidate.replace(/\\/g, "/").split("/").pop()
        .replace(/[\u0000-\u001f\u007f<>:\"|?*]/g, "_").replace(/[ .]+$/g, "");
    return safe || "receipts.zip";
}

export async function getDownload(path) {
    let response;
    try {
        response = await fetch(path, {
            method: "GET",
            headers: { Accept: "application/zip, application/octet-stream, application/json" },
            credentials: "same-origin",
        });
    } catch {
        throw new ApiError("サーバーに接続できませんでした。通信状態を確認してください。", 0, "network_error", null);
    }

    const contentType = response.headers.get("content-type") || "";
    let payload = null;
    if (contentType.includes("application/json")) {
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
    }
    const redirectedToLogin = response.redirected && (() => {
        try {
            return new URL(response.url, window.location.origin).pathname === "/login";
        } catch {
            return false;
        }
    })();
    if (!response.ok || contentType.includes("application/json") || redirectedToLogin) {
        const error = new ApiError(
            (typeof payload?.error === "string" && payload.error)
                || (typeof payload?.detail === "string" && payload.detail)
                || "ZIPファイルを取得できませんでした。",
            redirectedToLogin ? 401 : response.status,
            payload?.code || (redirectedToLogin ? "authentication_required" : undefined),
            payload,
        );
        if (redirectedToLogin) window.location.assign(response.url);
        else redirectForAuth(error);
        throw error;
    }
    if (contentType.includes("text/html")) {
        throw new ApiError("ZIPファイルを取得できませんでした。", response.status, "invalid_download_response", null);
    }

    const blob = await response.blob();
    if (!blob.size) throw new ApiError("ZIPファイルが空でした。再度お試しください。", response.status, "empty_download", null);
    return { blob, filename: filenameFromDisposition(response.headers.get("content-disposition")) };
}

export function postForm(path, formData, options = {}) {
    return request(path, { method: "POST", body: formData, ...options });
}

export function formDataFrom(form) {
    return new FormData(form);
}
