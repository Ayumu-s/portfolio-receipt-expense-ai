export function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined && options.text !== null) node.textContent = String(options.text);
    if (options.value !== undefined) node.value = String(options.value ?? "");
    if (options.checked !== undefined) node.checked = Boolean(options.checked);
    if (options.disabled !== undefined) node.disabled = Boolean(options.disabled);
    if (options.attrs) {
        for (const [name, value] of Object.entries(options.attrs)) {
            if (value === null || value === undefined || value === false) continue;
            node.setAttribute(name, value === true ? "" : String(value));
        }
    }
    const childNodes = Array.isArray(children) ? children : [children];
    for (const child of childNodes.flat(Infinity)) {
        if (child instanceof Node) node.appendChild(child);
        else if (child !== null && child !== undefined) node.appendChild(document.createTextNode(String(child)));
    }
    return node;
}

export function link(text, href, className = "") {
    return el("a", { className, text, attrs: { href } });
}

export function button(text, className = "", attrs = {}) {
    return el("button", { className, text, attrs: { type: "button", ...attrs } });
}

export function alertBox(message, kind = "error") {
    const classes = kind === "success"
        ? "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        : kind === "warning"
            ? "mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            : "mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700";
    return el("div", { className: classes, text: message, attrs: { role: kind === "success" ? "status" : "alert" } });
}

export function field(labelText, input) {
    const label = el("label", { className: "mb-1 block text-sm font-medium text-slate-700", text: labelText, attrs: { for: input.id } });
    return el("div", {}, [label, input]);
}

export function setHidden(node, hidden) {
    node.classList.toggle("hidden", Boolean(hidden));
}
