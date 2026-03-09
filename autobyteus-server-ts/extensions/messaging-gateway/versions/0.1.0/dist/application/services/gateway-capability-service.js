export class GatewayCapabilityService {
    options;
    constructor(options) {
        this.options = options;
    }
    getCapabilities() {
        const modes = [];
        if (this.options.wecomAppEnabled) {
            modes.push("WECOM_APP_BRIDGE");
        }
        if (this.options.wechatPersonalEnabled) {
            modes.push("DIRECT_PERSONAL_SESSION");
        }
        return {
            wechatModes: modes,
            defaultWeChatMode: resolveDefaultMode(modes, this.options.defaultWeChatMode),
            wecomAppEnabled: this.options.wecomAppEnabled,
            wechatPersonalEnabled: this.options.wechatPersonalEnabled,
            discordEnabled: this.options.discordEnabled,
            discordAccountId: this.options.discordAccountId ?? null,
            telegramEnabled: this.options.telegramEnabled,
            telegramAccountId: this.options.telegramAccountId ?? null,
        };
    }
}
const resolveDefaultMode = (modes, preferred) => {
    if (modes.length === 0) {
        return null;
    }
    if (preferred && modes.includes(preferred)) {
        return preferred;
    }
    if (modes.includes("WECOM_APP_BRIDGE")) {
        return "WECOM_APP_BRIDGE";
    }
    return modes[0] ?? null;
};
//# sourceMappingURL=gateway-capability-service.js.map