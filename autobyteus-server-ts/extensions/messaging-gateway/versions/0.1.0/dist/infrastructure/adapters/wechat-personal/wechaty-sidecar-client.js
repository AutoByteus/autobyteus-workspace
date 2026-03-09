export class HttpWechatySidecarClient {
    baseUrl;
    fetchImpl;
    constructor(config) {
        this.baseUrl = normalizeBaseUrl(config.baseUrl);
        this.fetchImpl = config.fetchImpl ?? fetch;
    }
    async openSession(input) {
        const response = await this.request("POST", "/api/wechaty/v1/sessions/open", input);
        return {
            status: response.status,
            qr: response.qr ?? null,
        };
    }
    async closeSession(sessionId) {
        await this.request("DELETE", `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}`);
    }
    async getSessionStatus(sessionId) {
        return this.request("GET", `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}/status`);
    }
    async getSessionQr(sessionId) {
        const response = await this.request("GET", `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}/qr`);
        return response.qr ?? null;
    }
    async listPeerCandidates(sessionId, options) {
        const query = new URLSearchParams();
        if (typeof options?.limit === "number") {
            query.set("limit", String(options.limit));
        }
        if (typeof options?.includeGroups === "boolean") {
            query.set("includeGroups", options.includeGroups ? "true" : "false");
        }
        const suffix = query.size > 0 ? `?${query.toString()}` : "";
        const response = await this.request("GET", `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}/peer-candidates${suffix}`);
        return response.items ?? [];
    }
    async sendText(input) {
        return this.request("POST", `/api/wechaty/v1/sessions/${encodeURIComponent(input.sessionId)}/messages`, {
            peerId: input.peerId,
            threadId: input.threadId,
            text: input.text,
        });
    }
    async request(method, path, body) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method,
            headers: {
                "content-type": "application/json",
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const payloadText = await response.text();
        const payload = payloadText.length > 0 ? safeJsonParse(payloadText) : null;
        if (!response.ok) {
            const detail = typeof payload === "object" &&
                payload !== null &&
                "detail" in payload &&
                typeof payload.detail === "string"
                ? payload.detail
                : `Wechaty sidecar request failed (${response.status}).`;
            throw new Error(detail);
        }
        return payload;
    }
}
const normalizeBaseUrl = (value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        throw new Error("Wechaty sidecar base URL cannot be empty.");
    }
    return trimmed.replace(/\/+$/, "");
};
const safeJsonParse = (value) => {
    try {
        return JSON.parse(value);
    }
    catch {
        return {
            detail: value,
        };
    }
};
//# sourceMappingURL=wechaty-sidecar-client.js.map