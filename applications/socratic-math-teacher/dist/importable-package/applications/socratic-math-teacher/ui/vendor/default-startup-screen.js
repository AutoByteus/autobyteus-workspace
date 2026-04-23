const escapeHtml = (value) => (value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;"));
const readCopy = (state, errorMessage) => {
    switch (state) {
        case "unsupported_entry":
            return {
                eyebrow: "Hosted application",
                title: "Open this application from AutoByteus",
                description: "Direct bundle entry is unsupported. Launch the application from the AutoByteus host so it can provide the required startup context.",
                detail: null,
            };
        case "waiting_for_bootstrap":
            return {
                eyebrow: "Hosted application",
                title: "Preparing hosted application",
                description: "Waiting for the AutoByteus host to deliver the application bootstrap payload.",
                detail: null,
            };
        case "starting_app":
            return {
                eyebrow: "Hosted application",
                title: "Starting hosted application",
                description: "The bundle received bootstrap data and is finishing local startup before business UI takes over.",
                detail: null,
            };
        case "startup_failed":
            return {
                eyebrow: "Hosted application",
                title: "Application failed to start",
                description: "The AutoByteus host delivered startup data, but the bundle did not finish startup successfully.",
                detail: errorMessage?.trim() || null,
            };
        default:
            return {
                eyebrow: "Hosted application",
                title: "",
                description: "",
                detail: null,
            };
    }
};
export const renderDefaultStartupScreen = (input) => {
    if (input.state === "handoff_complete") {
        return;
    }
    const copy = readCopy(input.state, input.errorMessage);
    const detailHtml = copy.detail
        ? `<div style="margin-top:16px;border-radius:12px;background:rgba(15,23,42,0.72);padding:14px 16px;color:#cbd5e1;font-size:13px;line-height:1.5;word-break:break-word;">${escapeHtml(copy.detail)}</div>`
        : "";
    const spinnerHtml = input.state === "waiting_for_bootstrap" || input.state === "starting_app"
        ? `<div aria-hidden="true" style="height:28px;width:28px;border-radius:999px;border:3px solid rgba(96,165,250,0.2);border-top-color:#60a5fa;animation:autobyteus-hosted-app-spin 1s linear infinite;"></div>`
        : `<div aria-hidden="true" style="display:flex;height:28px;width:28px;align-items:center;justify-content:center;border-radius:999px;background:rgba(96,165,250,0.12);color:#93c5fd;font-size:18px;line-height:1;">!</div>`;
    input.rootElement.innerHTML = `
    <section style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top, #172554 0%, #020617 55%, #020617 100%);padding:32px;font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;color:#e2e8f0;box-sizing:border-box;">
      <div style="width:min(100%, 560px);border:1px solid rgba(148,163,184,0.18);border-radius:24px;background:rgba(15,23,42,0.88);box-shadow:0 24px 60px rgba(2,6,23,0.4);padding:28px 28px 24px;backdrop-filter:blur(8px);">
        <style>
          @keyframes autobyteus-hosted-app-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
        <div style="display:flex;align-items:center;gap:14px;">
          ${spinnerHtml}
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
//# sourceMappingURL=default-startup-screen.js.map