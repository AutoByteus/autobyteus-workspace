export class WeComAppOutboundStrategy {
    sendImpl;
    constructor(config = {}) {
        this.sendImpl =
            config.sendImpl ??
                (async () => ({
                    providerMessageId: null,
                    deliveredAt: new Date().toISOString(),
                    metadata: {
                        mode: "APP",
                    },
                }));
    }
    async send(payload) {
        return this.sendImpl(payload);
    }
}
//# sourceMappingURL=wecom-app-outbound-strategy.js.map