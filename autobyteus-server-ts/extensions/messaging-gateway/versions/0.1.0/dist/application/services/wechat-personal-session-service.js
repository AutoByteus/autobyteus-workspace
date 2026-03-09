export class WechatPersonalFeatureDisabledError extends Error {
    constructor() {
        super("WeChat personal session feature is disabled.");
        this.name = "WechatPersonalFeatureDisabledError";
    }
}
export class WechatPersonalSessionService {
    adapter;
    config;
    constructor(adapter, config) {
        this.adapter = adapter;
        this.config = config;
    }
    async startPersonalSession(accountLabel) {
        this.assertEnabled();
        return this.adapter.startSession({
            accountLabel,
            qrTtlSeconds: this.config.qrTtlSeconds,
        });
    }
    async getPersonalSessionQr(sessionId) {
        this.assertEnabled();
        return this.adapter.getSessionQr(sessionId);
    }
    async getPersonalSessionStatus(sessionId) {
        this.assertEnabled();
        return this.adapter.getSessionStatus(sessionId);
    }
    async listPersonalSessionPeerCandidates(sessionId, options) {
        this.assertEnabled();
        return this.adapter.listSessionPeerCandidates(sessionId, options);
    }
    async stopPersonalSession(sessionId) {
        this.assertEnabled();
        await this.adapter.stopSession(sessionId);
    }
    assertEnabled() {
        if (!this.config.enabled) {
            throw new WechatPersonalFeatureDisabledError();
        }
    }
}
//# sourceMappingURL=wechat-personal-session-service.js.map