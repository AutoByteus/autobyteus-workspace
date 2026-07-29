const escapeHtml = (value) => (value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;"));
const readCopy = (state, errorMessage) => {
    if (state === "startup_failed") {
        return {
            eyebrow: "AutoByteus application",
            title: "Application failed to start",
            description: "The application could not complete runtime startup.",
            detail: errorMessage?.trim() || null,
        };
    }
    const copyByState = {
        resolving_provider: {
            eyebrow: "AutoByteus application",
            title: "Resolving application host",
            description: "Selecting the runtime bootstrap provider for this application document.",
            detail: null,
        },
        acquiring_bootstrap: {
            eyebrow: "AutoByteus application",
            title: "Preparing application",
            description: "Waiting for the host to finish runtime preparation.",
            detail: null,
        },
        starting_application: {
            eyebrow: "AutoByteus application",
            title: "Starting application",
            description: "Runtime bootstrap is complete and the business interface is starting.",
            detail: null,
        },
    };
    return copyByState[state] ?? {
        eyebrow: "AutoByteus application",
        title: "",
        description: "",
        detail: null,
    };
};
export const renderDefaultApplicationStartupScreen = (input) => {
    if (input.state === "handoff_complete" || input.state === "disposed") {
        return;
    }
    const copy = readCopy(input.state, input.errorMessage);
    const detailHtml = copy.detail
        ? `<div style="margin-top:16px;border-radius:12px;background:rgba(15,23,42,0.72);padding:14px 16px;color:#cbd5e1;font-size:13px;line-height:1.5;word-break:break-word;">${escapeHtml(copy.detail)}</div>`
        : "";
    const loading = input.state !== "startup_failed";
    const statusHtml = loading
        ? `<div aria-hidden="true" style="height:28px;width:28px;border-radius:999px;border:3px solid rgba(96,165,250,0.2);border-top-color:#60a5fa;animation:autobyteus-app-spin 1s linear infinite;"></div>`
        : `<div aria-hidden="true" style="display:flex;height:28px;width:28px;align-items:center;justify-content:center;border-radius:999px;background:rgba(96,165,250,0.12);color:#93c5fd;font-size:18px;line-height:1;">!</div>`;
    input.rootElement.innerHTML = `
    <section style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top, #172554 0%, #020617 55%, #020617 100%);padding:32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;box-sizing:border-box;">
      <div style="width:min(100%,560px);border:1px solid rgba(148,163,184,0.18);border-radius:24px;background:rgba(15,23,42,0.88);box-shadow:0 24px 60px rgba(2,6,23,0.4);padding:28px 28px 24px;backdrop-filter:blur(8px);">
        <style>@keyframes autobyteus-app-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
        <div style="display:flex;align-items:center;gap:14px;">
          ${statusHtml}
          <div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#93c5fd;">${escapeHtml(copy.eyebrow)}</div>
            <h1 style="margin:6px 0 0;font-size:28px;line-height:1.2;font-weight:700;color:#f8fafc;">${escapeHtml(copy.title)}</h1>
          </div>
        </div>
        <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#cbd5e1;">${escapeHtml(copy.description)}</p>
        ${detailHtml}
      </div>
    </section>
  `;
};
//# sourceMappingURL=default-application-startup-screen.js.map