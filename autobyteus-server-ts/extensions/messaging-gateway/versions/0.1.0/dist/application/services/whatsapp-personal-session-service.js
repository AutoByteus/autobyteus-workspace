export class PersonalSessionFeatureDisabledError extends Error {
    constructor() {
        super("WhatsApp personal session feature is disabled.");
        this.name = "PersonalSessionFeatureDisabledError";
    }
}
export class WhatsAppPersonalSessionService {
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
            throw new PersonalSessionFeatureDisabledError();
        }
    }
}
//# sourceMappingURL=whatsapp-personal-session-service.js.map