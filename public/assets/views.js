import { alertBox, button, el, field, link } from "./dom.js";

const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100";

export function pageHeader(kicker, title, description, actions = []) {
    const intro = el("div", {}, [
        el("p", { className: "mb-3 text-sm font-bold text-blue-700", text: kicker }),
        el("h1", { className: "text-3xl font-bold text-slate-900", text: title }),
        el("p", { className: "mt-2 text-sm leading-6 text-slate-600", text: description }),
    ]);
    const children = [intro];
    if (actions.length) children.push(el("div", { className: "flex flex-wrap gap-2" }, actions));
    return el("div", { className: "mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" }, children);
}

function authCard(kicker, title, help, form, width = "max-w-md") {
    return el("main", { className: "ui-auth-page flex items-center justify-center px-4 py-10" }, [
        el("div", { className: `w-full ${width} rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-9` }, [
            el("div", { className: "mb-7 flex items-center gap-3" }, [
                el("span", { className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm", text: "経" }),
                el("div", {}, [
                    el("p", { className: "text-xs font-bold uppercase text-blue-700", text: kicker }),
                    el("p", { className: "text-sm font-semibold text-slate-700", text: "レシート管理" }),
                ]),
            ]),
            el("h1", { className: "text-3xl font-bold text-slate-900", text: title }),
            help ? el("p", { className: "mt-2 text-sm leading-6 text-slate-500", text: help }) : null,
            form,
        ]),
    ]);
}

function passwordInput(id, name, labelText, autocomplete, options = {}) {
    const input = el("input", {
        className: inputClass,
        attrs: {
            id,
            name,
            type: "password",
            autocomplete,
            minlength: options.minlength,
            maxlength: options.maxlength || 128,
            required: true,
        },
    });
    return field(labelText, input);
}

export function homeView(session) {
    const demo = Boolean(session?.demo_mode);
    const uploadCard = link("", "/upload", "group relative overflow-hidden rounded-3xl bg-blue-600 p-7 text-white shadow-[0_18px_45px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:p-8");
    uploadCard.append(
        el("p", { className: "mb-3 text-sm font-bold text-blue-100", text: "まずはこちら" }),
        el("h2", { className: "text-2xl font-bold", text: "レシート画像を追加" }),
        el("p", { className: "mt-3 text-sm leading-6 text-blue-100", text: "画像を選ぶだけでAI解析を開始できます。複数枚にも対応しています。" }),
        el("span", { className: "mt-7 inline-flex items-center gap-2 text-sm font-bold", text: "アップロード画面へ →" }),
    );
    uploadCard.setAttribute("aria-label", "レシート画像を追加");

    const listCard = link("", "/receipts", "group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 sm:p-8");
    listCard.append(
        el("p", { className: "mb-3 text-sm font-semibold text-slate-500", text: "確認・修正はこちら" }),
        el("h2", { className: "text-2xl font-bold text-slate-900", text: "レシート一覧を見る" }),
        el("p", { className: "mt-3 text-sm leading-6 text-slate-600", text: "解析済みの内容を確認し、必要な項目を編集できます。" }),
        el("span", { className: "mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-700", text: "一覧画面へ →" }),
    );
    listCard.setAttribute("aria-label", "レシート一覧を見る");

    return el("main", { className: "mx-auto max-w-5xl px-4 py-12 sm:px-6 ui-home-spacing" }, [
        el("div", { className: "mx-auto max-w-2xl" }, [
            el("p", { className: "mb-3 text-sm font-bold text-blue-700", text: "RECEIPT DESK" }),
            el("h1", { className: demo ? "sr-only" : "text-3xl font-bold text-slate-900 sm:text-5xl", text: demo ? "経費管理アプリ" : "レシートを、ためずに整理する" }),
            el("p", { className: `${demo ? "" : "mt-4 "}max-w-xl text-base leading-7 text-slate-600`, text: "画像を追加すると、AIが内容を読み取り、確認・修正・集計まで続けて行えます。" }),
        ]),
        el("div", { className: "mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" }, [uploadCard, listCard]),
    ]);
}

export function loginView(query) {
    const form = el("form", { className: "mt-7 space-y-5", attrs: { id: "loginForm" } }, [
        field("ユーザー名またはメールアドレス", el("input", {
            className: inputClass,
            attrs: { id: "identifier", name: "identifier", type: "text", autocomplete: "username", maxlength: 320, required: true, autofocus: true },
        })),
        field("パスワード", el("input", {
            className: inputClass,
            attrs: { id: "password", name: "password", type: "password", autocomplete: "current-password", required: true },
        })),
        el("button", { className: "w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200", text: "ログイン", attrs: { type: "submit" } }),
    ]);
    const view = authCard("RECEIPT DESK", "ログイン", "ユーザー名またはメールアドレスでログインします。", form);
    const card = view.querySelector("main > div");
    if (query.get("registered") === "1") {
        card.insertBefore(alertBox("登録が完了しました。作成した情報でログインしてください。", "success"), form);
    }
    card.appendChild(el("p", { className: "mt-6 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500", text: "新規登録には管理者が発行した招待リンクが必要です。" }));
    return view;
}

export function registerView(invitation, token) {
    if (!invitation || !token) {
        const invalid = el("div", {}, [
            el("h1", { className: "text-2xl font-bold", text: "この招待リンクは利用できません" }),
            el("p", { className: "mt-3 text-sm leading-6 text-slate-600", text: "有効期限切れ、使用済み、またはURLが正しくない可能性があります。管理者へ新しい招待リンクを依頼してください。" }),
            link("ログイン画面へ", "/login", `${primaryButton} mt-7`),
        ]);
        return authCard("INVITED ACCESS", "招待ユーザー登録", "", invalid, "max-w-lg");
    }
    const form = el("form", { className: "mt-7 space-y-5", attrs: { id: "registerForm" } }, [
        el("input", { attrs: { type: "hidden", name: "invite_token", value: token } }),
        field("ユーザー名", el("input", {
            className: inputClass,
            attrs: { id: "username", name: "username", type: "text", autocomplete: "username", minlength: 3, maxlength: 32, pattern: "[A-Za-z0-9][A-Za-z0-9._\\-]{2,31}", required: true, autofocus: true },
        })),
        el("p", { className: "-mt-4 text-xs text-slate-500", text: "半角英数字と . _ - が使えます。先頭は英数字です。" }),
        passwordInput("password", "password", "パスワード", "new-password", { minlength: 6 }),
        el("p", { className: "-mt-4 text-xs text-slate-500", text: "6文字以上。長いパスフレーズを推奨します。" }),
        passwordInput("passwordConfirm", "password_confirm", "パスワード（確認）", "new-password", { minlength: 6 }),
        el("button", { className: "w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200", text: "登録する", attrs: { type: "submit" } }),
    ]);
    const view = authCard("INVITED ACCESS", "アカウントを作成", "招待ユーザー登録", form, "max-w-lg");
    const card = view.querySelector("main > div");
    card.querySelector(".mb-7").lastElementChild.lastElementChild.textContent = "招待ユーザー登録";
    const invitationText = el("p", { className: "mt-2 text-sm leading-6 text-slate-500" });
    invitationText.append(document.createTextNode("この招待は "));
    invitationText.append(el("span", { className: "font-semibold text-slate-700", text: invitation.email || "" }));
    invitationText.append(document.createTextNode(" 専用です。"));
    card.insertBefore(invitationText, form);
    return view;
}

export function passwordView(session) {
    const form = el("form", { className: "mt-7 space-y-5", attrs: { id: "passwordForm" } }, [
        passwordInput("currentPassword", "current_password", "現在のパスワード", "current-password"),
        passwordInput("newPassword", "new_password", "新しいパスワード", "new-password", { minlength: 6 }),
        passwordInput("newPasswordConfirm", "new_password_confirm", "新しいパスワード（確認）", "new-password", { minlength: 6 }),
        el("button", { className: "w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200", text: "変更してセッションを更新", attrs: { type: "submit" } }),
    ]);
    const main = el("main", { className: "mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14" }, [
        el("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" }, [
            el("p", { className: "text-sm font-bold text-blue-700", text: "ACCOUNT SECURITY" }),
            el("h1", { className: "mt-3 text-3xl font-bold", text: "パスワード変更" }),
            ...(session.user?.must_change_password ? [alertBox("初回ログインのため、6文字以上の新しいパスワードへ変更してください。変更後にレシートを利用できます。", "warning")] : []),
            form,
        ]),
    ]);
    return main;
}

function sampleCard(sample, index, selected) {
    const imageUrl = typeof sample.image_url === "string" && /^\/assets\/demo\/receipts\/[A-Za-z0-9._-]+$/.test(sample.image_url)
        ? sample.image_url
        : "";
    const imageWrap = el("span", { className: "demo-receipt-image-wrap" }, [
        el("img", { attrs: { src: imageUrl, alt: `${sample.label}の架空レシートサンプル`, loading: index === 0 ? "eager" : "lazy" } }),
    ]);
    if (selected) imageWrap.appendChild(el("span", { className: "demo-receipt-check", text: "✓", attrs: { "aria-hidden": "true" } }));
    return el("button", {
        className: `demo-receipt-card${selected ? " is-selected" : ""}`,
        attrs: { type: "button", "data-action": "sample-select", "data-sample-index": index, "aria-pressed": String(selected), "aria-label": `${sample.label}のサンプルを選択` },
    }, [
        imageWrap,
        el("span", { className: "demo-receipt-copy" }, [
            el("strong", { text: sample.label }),
            el("small", { text: sample.filename }),
        ]),
    ]);
}

export function uploadView(session) {
    const samples = Array.isArray(session.samples) ? session.samples : [];
    const input = el("input", { attrs: { id: "fileInput", name: "files", type: "file", accept: "image/*", multiple: true, required: true, class: "sr-only" } });
    const dropZone = el("label", {
        className: "group mt-6 block cursor-pointer rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/50 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 sm:p-12",
        attrs: { id: "dropZone", for: "fileInput", "aria-describedby": "uploadHelp" },
    }, [
        el("div", { className: "flex flex-col items-center gap-3" }, [
            el("span", { className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600", text: "↑", attrs: { "aria-hidden": "true" } }),
            el("p", { className: "font-semibold text-slate-800", text: session.demo_mode ? "自分のレシート画像を選ぶ" : "クリックまたはドラッグ＆ドロップ" }),
            el("p", { className: "text-sm text-slate-500", text: "JPG / PNG / WEBP / HEIC などの画像" }),
            el("p", { className: "text-xs text-slate-400", text: "", attrs: { id: "uploadHelp" } }),
        ]),
        input,
    ]);

    const children = [
        pageHeader("UPLOAD", "レシート画像を追加", session.demo_mode
            ? "架空のサンプルを選ぶか、自分の画像をアップロードして解析の流れを確認できます。"
            : "画像を選択すると、内容を読み取って一覧に登録します。登録前にファイル名と枚数を確認できます。"),
    ];
    if (session.demo_mode) {
        const panel = el("section", { className: "portfolio-demo-panel", attrs: { "aria-labelledby": "demoSamplesTitle" } }, [
            el("div", { className: "portfolio-demo-header" }, [
                el("div", {}, [el("p", { className: "portfolio-demo-kicker", text: "PORTFOLIO DEMO" }), el("h2", { text: "架空レシートで試してみる", attrs: { id: "demoSamplesTitle" } })]),
                el("span", { className: "portfolio-demo-badge", text: "Mock / 外部AIなし" }),
            ]),
            el("p", { className: "portfolio-demo-description", text: "サンプルを選ぶだけで解析対象にセットできます。表示される店舗名・金額は公開用の架空データです。" }),
            el("div", { className: "demo-receipt-grid", attrs: { id: "demoSampleGrid" } }, samples.map((sample, index) => sampleCard(sample, index, index === 0))),
            el("p", { className: "portfolio-demo-status", text: samples.length ? "サンプルを読み込んでいます…" : "サンプルを利用できません。画像を選択してください。", attrs: { id: "selectedSampleStatus", role: "status", "aria-live": "polite" } }),
        ]);
        children.push(panel);
    }

    const uploadForm = el("form", { attrs: { id: "uploadForm", enctype: "multipart/form-data" } }, [
        el("div", { className: "mb-4 hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800", attrs: { id: "uploadError", role: "alert" } }),
        dropZone,
        el("div", { className: "mt-5 hidden space-y-2", attrs: { id: "fileList", "aria-live": "polite" } }),
        el("button", { className: `${primaryButton} mt-6 flex w-full gap-2 rounded-2xl px-6 py-3.5`, text: "画像を選択すると解析できます", disabled: true, attrs: { id: "submitBtn", type: "submit" } }),
    ]);
    children.push(uploadForm);
    children.push(el("div", { className: "mt-5 hidden rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-blue-800", attrs: { id: "loading", role: "status", "aria-live": "polite" } }, [
        el("p", { className: "font-semibold", text: session.demo_mode ? "Mock解析中です" : "AI解析中です" }),
        el("p", { className: "mt-1 text-sm text-blue-700", text: "選択した画像を解析し、完了後に一覧へ反映します。画面を閉じずにお待ちください。" }),
    ]));
    const main = el("main", { className: "mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14" }, children);
    const limits = Number.isSafeInteger(Number(session.max_files_per_upload)) ? Number(session.max_files_per_upload) : 1;
    const bytes = Number.isSafeInteger(Number(session.max_upload_bytes)) ? Number(session.max_upload_bytes) : 1;
    main.dataset.maxFiles = String(Math.max(1, limits));
    main.dataset.maxUploadBytes = String(Math.max(1, bytes));
    main.querySelector("#uploadHelp").textContent = `最大 ${Math.max(1, limits)} 件・1ファイル ${Math.max(1, Math.floor(bytes / (1024 * 1024)))}MB まで`;
    return main;
}

function filterLink(text, href, active = false, tone = "blue") {
    const activeClasses = tone === "slate" ? "bg-slate-800 text-white" : "bg-blue-600 text-white";
    const inactiveClasses = "bg-slate-100 text-slate-600 hover:bg-slate-200";
    const anchor = link(text, href, `ui-filter-link rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? activeClasses : inactiveClasses}`);
    anchor.setAttribute("aria-current", active ? "page" : "false");
    return anchor;
}

function monthFilterTotals(value) {
    if (typeof value === "number" && Number.isFinite(value)) return `¥${Math.round(value).toLocaleString("ja-JP")}`;
    return typeof value === "string" && value ? value : "－";
}

function displayField(value) {
    return value === null || value === undefined || value === "" || value === "－" ? "未取得" : String(value);
}

function formatJstDateTime(value) {
    if (!value) return "－";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "－";
    return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function validId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? String(id) : "";
}

function receiptDetail(id, item, mobile = false) {
    const detailId = mobile ? `detail-mobile-${id}` : `detail-${id}`;
    const trigger = button("詳細", "inline-flex min-h-10 items-center rounded-lg px-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-100", {
        "data-action": "toggle-detail",
        "aria-expanded": "false",
        "aria-controls": detailId,
    });
    const detail = el("div", { className: `mt-4 ${mobile ? "rounded-2xl border border-slate-200 bg-white p-3" : ""} hidden`, attrs: { id: detailId } }, [
        button("", "block w-full text-left focus:outline-none focus:ring-4 focus:ring-blue-100", { "data-action": "open-image", "data-image-url": `/receipts/${id}/image` }),
        el("pre", { className: "mt-3 max-h-72 overflow-auto whitespace-pre-wrap border-t border-slate-100 pt-3 font-sans text-xs leading-6 text-slate-700", text: item.result || "" }),
    ]);
    const previewButton = detail.firstElementChild;
    previewButton.append(
        el("img", { className: mobile ? "max-h-64 w-full rounded-xl object-contain" : "h-40 w-auto rounded-xl border border-slate-200 object-contain shadow-sm transition hover:opacity-80", attrs: { src: `/receipts/${id}/image`, alt: item.filename || "レシート画像" } }),
        el("span", { className: "mt-2 block text-center text-xs font-semibold text-blue-700", text: "画像を拡大" }),
    );
    return { trigger, detail };
}

function toggleExpenseForm(id, isExpense, mobile = false) {
    const form = el("form", { className: "inline", attrs: { "data-action": "toggle-expense", "data-receipt-id": id } });
    form.appendChild(button(isExpense ? (mobile ? "経費対象" : "✓ 経費") : (mobile ? "対象外" : "× 対象外"),
        `inline-flex min-h-10 items-center rounded-xl px-3 text-xs font-bold transition-colors ${isExpense ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`,
        { type: "submit", "aria-label": isExpense ? "経費対象。クリックで対象外に変更" : "経費対象外。クリックで対象に戻す" }));
    return form;
}

function receiptRow(item, mobile = false) {
    const id = validId(item.id);
    if (!id) return null;
    const needsReview = [item.date_str, item.store, item.category, item.total].some(value => !value || value === "－");
    const isExpense = Boolean(item.is_expense);
    const rowClass = `transition-colors hover:bg-slate-50 ${needsReview ? "bg-amber-50/40" : ""} ${isExpense ? "" : "opacity-60"}`;
    const selection = el("input", {
        className: `row-check h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${mobile ? "mt-1 shrink-0" : ""}`,
        attrs: { type: "checkbox", value: id, "aria-label": `${displayField(item.store)}を選択` },
    });
    const { trigger, detail } = receiptDetail(id, item, mobile);
    if (!mobile) {
        const date = el("td", { className: "whitespace-nowrap px-4 py-4 font-semibold text-slate-800", text: displayField(item.date_str) });
        const store = el("td", { className: "max-w-[220px] truncate px-4 py-4 text-slate-700", text: displayField(item.store) });
        const category = el("td", { className: "px-4 py-4" }, [el("span", { className: "rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700", text: displayField(item.category) })]);
        const total = el("td", { className: `whitespace-nowrap px-4 py-4 text-right font-bold ${isExpense ? "text-slate-900" : "text-slate-400 line-through"}`, text: displayField(item.total) });
        const actionCell = el("td", { className: "whitespace-nowrap px-4 py-4 text-center" }, [
            link("編集", `/receipts/${id}/edit`, "inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"),
            trigger,
        ]);
        const row = el("tr", { className: rowClass }, [
            el("td", { className: "px-4 py-4 text-center" }, [selection]),
            date,
            store,
            category,
            total,
            el("td", { className: "px-3 py-4 text-center" }, [toggleExpenseForm(id, isExpense)]),
            el("td", { className: "hidden whitespace-nowrap px-4 py-4 text-xs text-slate-400 lg:table-cell", text: formatJstDateTime(item.uploaded_at), attrs: { "data-col": "uploaded-at" } }),
            actionCell,
        ]);
        const detailRow = el("tr", { className: "hidden bg-slate-50", attrs: { id: `detail-${id}` } }, [
            el("td", { className: "px-6 py-5", attrs: { colspan: 8 } }, [
                el("div", { className: "flex flex-col gap-4 md:flex-row" }, [
                    el("div", { className: "shrink-0" }, [
                        button("", "text-left focus:outline-none focus:ring-4 focus:ring-blue-100", { "data-action": "open-image", "data-image-url": `/receipts/${id}/image` }),
                    ]),
                    el("pre", { className: "min-w-0 flex-1 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 font-sans text-xs leading-6 text-slate-700", text: item.result || "" }),
                ]),
            ]),
        ]);
        const imageButton = detailRow.querySelector("button");
        imageButton.append(el("img", { className: "h-40 w-auto rounded-xl border border-slate-200 object-contain shadow-sm", attrs: { src: `/receipts/${id}/image`, alt: item.filename || "レシート画像" } }), el("span", { className: "mt-2 block text-center text-xs font-semibold text-blue-700", text: "画像を拡大" }));
        return [row, detailRow];
    }

    const card = el("article", { className: `border-b border-slate-100 px-4 py-5 ${needsReview ? "bg-amber-50/40" : ""} ${isExpense ? "" : "opacity-60"}` }, [
        el("div", { className: "flex items-start justify-between gap-3" }, [
            el("label", { className: "flex min-w-0 items-start gap-3" }, [selection, el("span", { className: "min-w-0" }, [el("span", { className: "block text-xs font-semibold text-slate-500", text: "レシート日付" }), el("span", { className: "mt-1 block truncate text-sm font-bold text-slate-900", text: displayField(item.date_str) })])]),
            el("span", { className: `shrink-0 text-lg font-bold ${isExpense ? "text-slate-900" : "text-slate-400 line-through"}`, text: displayField(item.total) }),
        ]),
        el("div", { className: "mt-4 grid grid-cols-[1fr_auto] items-end gap-3" }, [
            el("div", { className: "min-w-0" }, [el("p", { className: "text-xs font-semibold text-slate-500", text: "店舗名" }), el("p", { className: "mt-1 truncate text-sm font-semibold text-slate-700", text: displayField(item.store) })]),
            el("span", { className: "rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700", text: displayField(item.category) }),
        ]),
        ...(needsReview ? [el("p", { className: "mt-3 text-xs font-semibold text-amber-700", text: "読み取り内容を確認してください" })] : []),
        el("div", { className: "mt-4 flex flex-wrap items-center gap-2" }, [toggleExpenseForm(id, isExpense, true), link("編集", `/receipts/${id}/edit`, "inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600"), trigger]),
        detail,
    ]);
    return [card];
}

function emptyState(title, description, actionLabel = "レシートを追加", actionHref = "/upload") {
    return el("div", { className: "rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center text-slate-500" }, [
        el("p", { className: "text-lg font-semibold text-slate-700", text: title }),
        el("p", { className: "mt-2 text-sm", text: description }),
        link(actionLabel, actionHref, `${primaryButton} mt-6`),
    ]);
}

function groupItems(receipts) {
    const groups = [];
    for (const item of receipts) {
        const key = typeof item.month_group === "string" ? item.month_group : "日付未登録";
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
            group = { key, items: [] };
            groups.push(group);
        }
        group.items.push(item);
    }
    return groups;
}

function receiptsTable(receipts, monthTotals) {
    const desktopBody = el("tbody", { className: "divide-y divide-slate-100" });
    const mobileList = el("div", { className: "md:hidden" });
    for (const group of groupItems(receipts)) {
        desktopBody.appendChild(el("tr", { className: "border-y border-blue-100 bg-blue-50" }, [
            el("td", { className: "px-5 py-3 text-sm font-bold text-blue-800", text: group.key, attrs: { colspan: 4 } }),
            el("td", { className: "px-4 py-3 text-right text-sm font-bold text-blue-800", text: `月合計 ${monthFilterTotals(monthTotals?.[group.key])}`, attrs: { colspan: 4 } }),
        ]));
        const mobileHeader = el("div", { className: "flex items-center justify-between border-y border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800" }, [el("span", { text: group.key }), el("span", { text: monthFilterTotals(monthTotals?.[group.key]) })]);
        mobileList.appendChild(mobileHeader);
        for (const item of group.items) {
            const rows = receiptRow(item);
            if (rows) desktopBody.append(...rows);
            const cards = receiptRow(item, true);
            if (cards) mobileList.append(...cards);
        }
    }
    const table = el("table", { className: "w-full text-sm" }, [
        el("thead", {}, [el("tr", { className: "border-b border-slate-200 bg-slate-50" }, [
            el("th", { className: "w-12 px-4 py-3 text-center" }, [el("input", { attrs: { id: "selectAll", type: "checkbox", "aria-label": "すべて選択" } })]),
            ...[
                { name: "レシート日付" },
                { name: "店舗名" },
                { name: "勘定科目" },
                { name: "合計金額" },
                { name: "経費" },
                { name: "アップロード日時", className: "hidden whitespace-nowrap lg:table-cell", attrs: { "data-col": "uploaded-at" } },
                { name: "操作" },
            ].map(({ name, className = "", attrs }) => el("th", { className: `px-4 py-3 text-left font-semibold text-slate-600 ${className}`, text: name, attrs })),
        ])]),
        desktopBody,
    ]);
    const desktop = el("div", { className: "hidden overflow-x-auto md:block" }, [table]);
    mobileList.prepend(el("div", { className: "flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3" }, [
        el("span", { className: "text-xs font-semibold text-slate-500", text: "カード表示" }),
        el("label", { className: "flex min-h-10 items-center gap-2 text-xs font-bold text-slate-600" }, [el("input", { attrs: { id: "selectAllMobile", type: "checkbox", "aria-label": "すべて選択" } }), "全選択"]),
    ]));
    return el("div", { className: "ui-table-wrap shadow-sm" }, [desktop, mobileList]);
}

function updateQuery(changes) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
    }
    const query = params.toString();
    return `/receipts${query ? `?${query}` : ""}`;
}

function exportLink(label, href) {
    const anchor = link(label, href, secondaryButton);
    anchor.dataset.action = "download-export";
    anchor.dataset.downloadLabel = label;
    return anchor;
}

export function receiptsView(data, query) {
    const receipts = Array.isArray(data.receipts) ? data.receipts : [];
    const year = data.selected_year ?? query.get("year") ?? "";
    const month = data.selected_month ?? query.get("month") ?? "";
    const sort = data.sort || query.get("sort") || "uploaded_at";
    const actions = [
        exportLink("ZIPで書き出す", `/api/receipts/export${query.toString() ? `?${query.toString()}` : ""}`),
        link("レシートを追加", "/upload", primaryButton),
    ];
    const main = el("main", { className: "mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14" }, [
        pageHeader("RECEIPTS", "レシート一覧", "解析結果を確認し、経費対象や内容を整理します。", actions),
    ]);
    if (query.get("updated") === "1") main.appendChild(alertBox("レシート内容を保存しました。", "success"));
    if (query.get("password_updated") === "1") main.appendChild(alertBox("パスワードを変更し、ほかのログインセッションを失効しました。", "success"));
    const duplicateCount = Number(query.get("duplicate_count") || 0);
    if (duplicateCount > 0) main.appendChild(alertBox(`同じ画像のレシート${duplicateCount}件は、重複のため追加登録しませんでした。`, "warning"));

    const filters = el("section", { className: "mb-5 space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", attrs: { "aria-label": "レシート表示条件" } }, [
        el("fieldset", { className: "flex flex-wrap items-center gap-2" }, [
            el("legend", { className: "w-16 shrink-0 text-xs font-bold text-slate-500", text: "並び順" }),
            filterLink("アップロード順", updateQuery({ sort: "uploaded_at" }), sort !== "receipt_date", "slate"),
            filterLink("レシート日付順", updateQuery({ sort: "receipt_date" }), sort === "receipt_date", "slate"),
        ]),
        el("fieldset", { className: "flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4" }, [
            el("legend", { className: "w-16 shrink-0 text-xs font-bold text-slate-500", text: "年" }),
            filterLink("すべて", updateQuery({ year: "", month: "" }), !year),
            ...(Array.isArray(data.available_years) ? data.available_years : []).map((value) => {
                const yearValue = Number(value);
                return Number.isSafeInteger(yearValue) ? filterLink(`${yearValue}年`, updateQuery({ year: yearValue, month: "" }), String(yearValue) === String(year)) : null;
            }).filter(Boolean),
            ...(!data.available_years?.length ? [el("span", { className: "text-xs text-slate-400", text: "レシート日付が未登録のデータは「すべて」に含まれます。" })] : []),
        ]),
    ]);
    if (year) {
        filters.appendChild(el("fieldset", { className: "flex flex-wrap items-center gap-2" }, [
            el("legend", { className: "w-16 shrink-0 text-xs font-bold text-slate-500", text: "月" }),
            filterLink("すべて", updateQuery({ month: "" }), !month),
            ...Array.from({ length: 12 }, (_, index) => filterLink(`${index + 1}月`, updateQuery({ month: index + 1 }), Number(month) === index + 1)),
        ]));
    }
    main.appendChild(filters);
    if (receipts.length > 0 && year) {
        main.appendChild(el("div", { className: "mb-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4" }, [
            el("span", { className: "text-sm font-semibold text-blue-800", text: `${year}年${month ? `${month}月` : ""}の経費合計` }),
            el("span", { className: "text-xl font-bold text-slate-900", text: monthFilterTotals(data.year_total) }),
        ]));
    }

    const bulkBar = el("div", { className: "hidden mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3", attrs: { id: "bulkBar", role: "status" } }, [
        el("span", { className: "text-sm font-semibold text-red-800", text: "0件選択中", attrs: { id: "selectedCount" } }),
        button("選択したレシートを削除", "min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200", { "data-action": "delete-selected", "aria-label": "選択したレシートを削除" }),
    ]);
    main.appendChild(bulkBar);
    if (receipts.length) {
        main.appendChild(receiptsTable(receipts, data.month_totals || {}));
        main.appendChild(el("p", { className: "mt-3 text-right text-xs text-slate-400", text: `${receipts.length} 件`, attrs: { id: "receiptCount" } }));
    } else {
        main.appendChild(emptyState("該当するレシートがありません", "条件を変えるか、新しいレシートを追加してください。"));
    }

    const modal = el("div", { className: "fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/85 p-4", attrs: { id: "imageModal", role: "dialog", "aria-modal": "true", "aria-labelledby": "imageModalTitle" } }, [
        el("div", { className: "relative max-h-full max-w-4xl rounded-3xl bg-slate-900/40 p-2" }, [
            el("p", { className: "sr-only", text: "レシート画像の拡大表示", attrs: { id: "imageModalTitle" } }),
            el("img", { className: "max-h-[88vh] max-w-full rounded-2xl object-contain shadow-2xl", attrs: { id: "modalImage", src: "", alt: "レシート拡大" } }),
            button("×", "absolute -right-2 -top-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-600 shadow-md transition hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-200", { id: "modalClose", "data-action": "close-image", "aria-label": "画像を閉じる" }),
        ]),
    ]);
    modal.dataset.backdropClose = "true";
    main.appendChild(modal);
    return main;
}

function summaryCategory(category) {
    const pct = Math.min(100, Math.max(0, Number(category.pct) || 0));
    return { pct };
}

export function summaryView(data) {
    const year = data.selected_year ?? "";
    const categories = Array.isArray(data.category_list) ? data.category_list : [];
    const months = Array.isArray(data.month_list) ? data.month_list : [];
    const exportQuery = year ? `?year=${encodeURIComponent(year)}` : "";
    const main = el("main", { className: "mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" }, [
        pageHeader("SUMMARY", "経費集計", `対象期間：${year ? `${year}年` : "全期間"} ／ 経費対象のみ`, [exportLink("ZIP", `/api/receipts/export${exportQuery}`)]),
    ]);
    const years = el("fieldset", { className: "mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" }, [
        el("legend", { className: "sr-only", text: "集計する年" }),
        el("span", { className: "w-8 text-xs font-bold text-slate-500", text: "年" }),
        filterLink("すべて", "/summary", !year),
        ...(Array.isArray(data.available_years) ? data.available_years : []).map((value) => {
            const yearValue = Number(value);
            return Number.isSafeInteger(yearValue) ? filterLink(`${yearValue}年`, `/summary?year=${yearValue}`, String(yearValue) === String(year)) : null;
        }).filter(Boolean),
    ]);
    main.appendChild(years);
    if (!categories.length) {
        main.appendChild(emptyState("集計データがありません", "経費対象のレシートをアップロードすると、ここに表示されます。"));
        return main;
    }
    main.appendChild(el("div", { className: "mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3" }, [
        el("div", { className: "rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm" }, [el("p", { className: "mb-1 text-xs font-semibold text-blue-700", text: "経費合計" }), el("p", { className: "text-2xl font-bold text-slate-900", text: data.grand_total || "¥0" })]),
        el("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" }, [el("p", { className: "mb-1 text-xs font-semibold text-slate-500", text: "レシート件数" }), el("p", { className: "text-2xl font-bold text-slate-900", text: `${Number(data.receipt_count) || 0} 件` })]),
        el("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" }, [el("p", { className: "mb-1 text-xs font-semibold text-slate-500", text: "勘定科目数" }), el("p", { className: "text-2xl font-bold text-slate-900", text: `${categories.length} 種` })]),
    ]));

    const categoryRows = categories.map((category) => {
        const { pct } = summaryCategory(category);
        return el("tr", { className: "border-b border-slate-100" }, [
            el("td", { className: "px-5 py-3" }, [el("span", { className: "rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700", text: category.category || "未分類" })]),
            el("td", { className: "px-3 py-3 text-center text-slate-500", text: Number(category.count) || 0 }),
            el("td", { className: "px-5 py-3 text-right font-semibold text-slate-800", text: category.total_fmt || `¥${(Number(category.total) || 0).toLocaleString("ja-JP")}` }),
            el("td", { className: "px-4 py-3 text-right text-xs text-slate-400", text: `${pct}%` }),
        ]);
    });
    const categorySection = el("section", { className: "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" }, [
        el("div", { className: "border-b border-slate-100 px-5 py-4" }, [el("h2", { className: "font-semibold text-slate-800", text: "勘定科目別内訳" }), el("p", { className: "mt-1 text-xs text-slate-500", text: "経費対象のみ集計" })]),
        el("div", { className: "hidden overflow-x-auto md:block" }, [el("table", { className: "w-full text-sm" }, [
            el("thead", {}, [el("tr", { className: "border-b border-slate-100 bg-slate-50" }, ["勘定科目", "件数", "合計金額", "割合"].map((text) => el("th", { className: "px-4 py-3 text-left font-semibold text-slate-500", text })))]),
            el("tbody", { className: "divide-y divide-slate-100" }, categoryRows),
            el("tfoot", {}, [el("tr", { className: "border-t-2 border-slate-200 bg-slate-50" }, [el("td", { className: "px-5 py-3 font-bold", text: "合計" }), el("td", { className: "px-3 py-3 text-center font-bold", text: Number(data.receipt_count) || 0 }), el("td", { className: "px-5 py-3 text-right text-base font-bold", text: data.grand_total || "¥0" }), el("td", { className: "px-4 py-3 text-right text-xs text-slate-400", text: "100%" })])]),
        ])]),
        el("div", { className: "divide-y divide-slate-100 md:hidden" }, [
            ...categories.map((category) => {
                const { pct } = summaryCategory(category);
                return el("div", { className: "px-5 py-4" }, [
                    el("div", { className: "flex items-center justify-between gap-3" }, [el("span", { className: "rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700", text: category.category || "未分類" }), el("span", { className: "text-base font-bold text-slate-900", text: category.total_fmt || "¥0" })]),
                    el("div", { className: "mt-3 flex items-center justify-between text-xs text-slate-500" }, [el("span", { text: `${Number(category.count) || 0}件` }), el("span", { text: `${pct}%` })]),
                    el("div", { className: "mt-2 h-2 rounded-full bg-slate-100", attrs: { role: "progressbar", "aria-label": `${category.category || ""}の割合`, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct } }, [el("div", { className: "h-2 rounded-full bg-blue-500", attrs: { style: `width: ${pct}%` } })]),
                ]);
            }),
            el("div", { className: "flex items-center justify-between bg-slate-50 px-5 py-4 font-bold text-slate-800" }, [el("span", { text: `合計 ${Number(data.receipt_count) || 0}件` }), el("span", { text: data.grand_total || "¥0" })]),
        ]),
    ]);
    const categoryBars = el("div", { className: "hidden space-y-2 px-5 pb-5 pt-4 md:block" }, categories.map((category) => {
        const pct = Math.min(100, Math.max(0, Number(category.pct) || 0));
        return el("div", { className: "flex items-center gap-3 text-xs" }, [
            el("span", { className: "w-24 truncate text-slate-500", text: category.category || "未分類" }),
            el("div", { className: "h-2 flex-1 rounded-full bg-slate-100", attrs: { role: "progressbar", "aria-label": `${category.category || ""}の割合`, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct } }, [el("div", { className: "h-2 rounded-full bg-blue-500", attrs: { style: `width: ${pct}%` } })]),
            el("span", { className: "w-10 text-right text-slate-400", text: `${pct}%` }),
        ]);
    }));
    categorySection.appendChild(categoryBars);
    const maxMonth = Math.max(1, ...months.map((item) => Number(item.total) || 0));
    const monthSection = el("section", { className: "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" }, [
        el("div", { className: "border-b border-slate-100 px-5 py-4" }, [el("h2", { className: "font-semibold text-slate-800", text: "月別推移" }), el("p", { className: "mt-1 text-xs text-slate-500", text: "経費対象のみ集計" })]),
        months.length ? el("div", { className: "space-y-4 p-5" }, months.map((item) => {
            const total = Math.max(0, Number(item.total) || 0);
            const pct = Math.min(100, total / maxMonth * 100);
            return el("div", { className: "flex items-center gap-3 text-sm" }, [
                el("span", { className: "w-20 shrink-0 text-xs text-slate-500", text: item.month || "" }),
                el("div", { className: "relative h-5 flex-1 rounded-full bg-slate-100", attrs: { role: "progressbar", "aria-label": `${item.month || ""}の経費`, "aria-valuemin": 0, "aria-valuemax": maxMonth, "aria-valuenow": total } }, [el("div", { className: "h-5 rounded-full bg-emerald-400 transition-all", attrs: { style: `width: ${pct}%` } })]),
                el("span", { className: "w-24 shrink-0 text-right text-xs font-semibold text-slate-800", text: item.total_fmt || `¥${total.toLocaleString("ja-JP")}` }),
            ]);
        })) : el("p", { className: "p-5 text-sm text-slate-500", text: "この期間の集計データがありません。" }),
    ]);
    main.appendChild(el("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2" }, [categorySection, monthSection]));
    return main;
}

export function editView(data, receiptId) {
    const receipt = data.receipt || {};
    const values = data.edit_fields || {};
    const form = el("form", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7", attrs: { id: "editForm", "data-receipt-id": receiptId } }, [
        el("div", { className: "grid gap-5 sm:grid-cols-2" }, [
            field("日付", el("input", { className: inputClass, value: values.date_str || "", attrs: { id: "dateStr", name: "date_str", autocomplete: "off" } })),
            field("お店・会社名", el("input", { className: inputClass, value: values.store || "", attrs: { id: "store", name: "store", autocomplete: "organization" } })),
            field("勘定科目", el("input", { className: inputClass, value: values.category || "", attrs: { id: "category", name: "category", autocomplete: "off" } })),
            field("合計金額", el("input", { className: inputClass, value: values.total || "", attrs: { id: "total", name: "total", inputmode: "decimal", autocomplete: "off" } })),
        ]),
        el("details", { className: "mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4" }, [
            el("summary", { className: "cursor-pointer text-sm font-semibold text-slate-700", text: "商品明細・OCRテキストを編集" }),
            el("label", { className: "sr-only", text: "商品明細・OCRテキスト", attrs: { for: "details" } }),
            el("textarea", { className: "mt-4 w-full resize-y rounded-xl border border-slate-300 bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100", value: data.edit_details || "", attrs: { id: "details", name: "details", rows: 14 } }),
            el("p", { className: "mt-2 text-xs leading-5 text-slate-500", text: "日付・店舗名・勘定科目・合計金額は上の入力欄が保存されます。" }),
        ]),
        el("div", { className: "mt-5 hidden rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800", text: "変更を保存しています…", attrs: { id: "editStatus", role: "status" } }),
        el("div", { className: "mt-6 flex flex-col-reverse gap-3 sm:flex-row" }, [
            el("button", { className: "inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200", text: "変更を保存", attrs: { type: "submit" } }),
            link("キャンセル", "/receipts", "inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-100 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100"),
        ]),
    ]);
    const imageUrl = `/receipts/${receiptId}/image`;
    return el("main", { className: "mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" }, [
        pageHeader("REVIEW", "レシート内容を確認", "読み取り結果を項目ごとに確認し、必要な箇所だけ修正できます。", [link("一覧に戻る", "/receipts", secondaryButton)]),
        el("div", { className: "grid gap-6 lg:grid-cols-[minmax(220px,280px)_1fr]" }, [
            el("div", { className: "lg:sticky lg:top-24 lg:self-start" }, [
                el("p", { className: "mb-2 text-sm font-semibold text-slate-700", text: "元のレシート画像" }),
                el("div", { className: "rounded-3xl border border-slate-200 bg-white p-3 shadow-sm" }, [el("img", { className: "max-h-[32rem] w-full rounded-2xl object-contain", attrs: { src: imageUrl, alt: receipt.filename || "レシート画像" } })]),
                el("p", { className: "mt-2 break-all text-center text-xs text-slate-400", text: receipt.filename || "" }),
            ]),
            el("div", { className: "min-w-0" }, [form]),
        ]),
    ]);
}

export function adminView(data, session) {
    const invitationList = Array.isArray(data.invitations) ? data.invitations : [];
    const users = Array.isArray(data.users) ? data.users : [];
    const inviteForm = el("form", { className: "mt-5 space-y-4", attrs: { id: "inviteForm" } }, [
        field("招待するメールアドレス", el("input", { className: inputClass, attrs: { id: "inviteEmail", name: "email", type: "email", autocomplete: "email", maxlength: 320, required: true } })),
        el("button", { className: "w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700", text: "招待リンクを発行", attrs: { type: "submit" } }),
    ]);
    const invitePanel = el("section", { className: "hidden mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6", attrs: { id: "inviteCreated", "aria-labelledby": "inviteCreatedTitle" } }, [
        el("h2", { className: "font-bold text-emerald-950", text: "招待リンクを発行しました", attrs: { id: "inviteCreatedTitle" } }),
        el("p", { className: "mt-1 text-sm text-emerald-800", text: "安全な方法で共有してください。この画面を離れるとリンクは再表示できません。", attrs: { id: "inviteEmailNotice" } }),
        el("div", { className: "mt-4 flex flex-col gap-2 sm:flex-row" }, [
            el("input", { className: "min-w-0 flex-1 rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-xs text-slate-700", attrs: { id: "invitePath", type: "text", readonly: true } }),
            button("招待URLをコピー", "rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800", { id: "copyInvite", "data-action": "copy-invite" }),
        ]),
        el("p", { className: "mt-2 text-xs text-emerald-800", attrs: { id: "copyStatus", "aria-live": "polite" } }),
    ]);
    const activeInvitations = invitationList.length ? invitationList.map((invite) => el("div", { className: "rounded-xl bg-slate-50 px-3 py-2 text-xs" }, [
        el("p", { className: "font-semibold text-slate-700", text: invite.email || "" }),
        el("p", { className: "mt-0.5 text-slate-500", text: `期限 ${formatJstDateTime(invite.expires_at)}` }),
    ])) : [el("p", { className: "text-xs text-slate-400", text: "有効な招待はありません。" })];
    const userRows = users.map((user) => {
        const admin = user.role === "admin";
        const active = Boolean(user.is_active);
        const userId = validId(user.id);
        const userEntry = el("div", { className: "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" }, [
            el("div", { className: "min-w-0" }, [
                el("div", { className: "flex flex-wrap items-center gap-2" }, [
                    el("p", { className: "font-bold text-slate-800", text: user.username || "" }),
                    el("span", { className: `rounded-full px-2 py-0.5 text-[11px] font-bold ${admin ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`, text: admin ? "管理者" : "ユーザー" }),
                    el("span", { className: `rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`, text: active ? "有効" : "停止中" }),
                ]),
                el("p", { className: "mt-1 truncate text-sm text-slate-500", text: user.email || "" }),
            ]),
        ]);
        if (userId && String(user.id) !== String(session.user?.id)) {
            userEntry.appendChild(el("form", { attrs: { "data-action": "toggle-user", "data-user-id": userId } }, [
                el("button", { className: `min-h-10 rounded-xl border px-3 text-xs font-bold ${active ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`, text: active ? "利用停止" : "再開", attrs: { type: "submit" } }),
            ]));
        }
        return userEntry;
    });
    return el("main", { className: "mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14" }, [
        pageHeader("CONTROLLED ACCESS", "ユーザー管理", "登録は一度だけ使える招待リンク経由に限定されています。"),
        el("div", { attrs: { id: "adminAlert" } }),
        invitePanel,
        el("div", { className: "grid gap-6 lg:grid-cols-[0.9fr_1.4fr]" }, [
            el("section", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" }, [
                el("h2", { className: "text-lg font-bold", text: "新しい招待" }),
                el("p", { className: "mt-1 text-xs leading-5 text-slate-500", text: "リンクは7日間有効で、一度登録すると無効になります。" }),
                inviteForm,
                el("div", { className: "mt-7 border-t border-slate-100 pt-5" }, [
                    el("h3", { className: "text-sm font-bold text-slate-700", text: "有効な招待" }),
                    el("div", { className: "mt-3 space-y-2" }, activeInvitations),
                ]),
            ]),
            el("section", { className: "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" }, [
                el("div", { className: "border-b border-slate-100 px-5 py-4 sm:px-6" }, [el("h2", { className: "text-lg font-bold", text: "登録ユーザー" })]),
                el("div", { className: "divide-y divide-slate-100", attrs: { id: "userList" } }, userRows.length ? userRows : [el("p", { className: "px-5 py-5 text-sm text-slate-500", text: "登録ユーザーがありません。" })]),
            ]),
        ]),
    ]);
}

export function errorView(title, message, actionHref = "/") {
    return el("main", { className: "mx-auto max-w-3xl px-4 ui-error-spacing sm:px-6" }, [
        el("section", { className: "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm ui-error-panel-spacing" }, [
            el("h1", { className: "text-2xl font-bold text-slate-900", text: title }),
            el("p", { className: "mt-3 text-sm leading-6 text-slate-600", text: message }),
            link("戻る", actionHref, `${primaryButton} mt-7`),
        ]),
    ]);
}
