export class ApplicationWebSocketUrlError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "ApplicationWebSocketUrlError";
    }
}
export const parseApplicationWebSocketPath = (path) => {
    const value = path.trim();
    if (!value || value.includes("?") || value.includes("#") || value.includes("://")) {
        throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application backend WebSocket path is invalid.");
    }
    const segments = value.replace(/^\/+/, "").split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
        throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application backend WebSocket path is invalid.");
    }
    return segments;
};
export const composeApplicationWebSocketUrl = (input) => {
    let url;
    try {
        url = new URL(input.baseUrl);
    }
    catch {
        throw new ApplicationWebSocketUrlError("INVALID_BASE", "The application WebSocket base URL is invalid.");
    }
    if (url.protocol !== "ws:" && url.protocol !== "wss:") {
        throw new ApplicationWebSocketUrlError("INVALID_BASE", "The application WebSocket base URL is invalid.");
    }
    if (input.pathSegments.length === 0 || input.pathSegments.some((segment) => !segment.trim())) {
        throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application WebSocket path is invalid.");
    }
    const basePath = url.pathname.replace(/\/+$/, "");
    url.pathname = `${basePath}/${input.pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
    for (const [key, value] of Object.entries(input.query ?? {})) {
        for (const entry of Array.isArray(value) ? value : [value])
            url.searchParams.append(key, entry);
    }
    return url.toString();
};
//# sourceMappingURL=application-websocket-url.js.map