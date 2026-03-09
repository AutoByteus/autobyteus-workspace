export type WeChatSetupMode = "WECOM_APP_BRIDGE" | "DIRECT_PERSONAL_SESSION";
export type GatewayCapabilities = {
    wechatModes: WeChatSetupMode[];
    defaultWeChatMode: WeChatSetupMode | null;
    wecomAppEnabled: boolean;
    wechatPersonalEnabled: boolean;
    discordEnabled: boolean;
    discordAccountId: string | null;
    telegramEnabled: boolean;
    telegramAccountId: string | null;
};
export type GatewayCapabilityServiceOptions = {
    wecomAppEnabled: boolean;
    wechatPersonalEnabled: boolean;
    defaultWeChatMode?: WeChatSetupMode;
    discordEnabled: boolean;
    discordAccountId?: string | null;
    telegramEnabled: boolean;
    telegramAccountId?: string | null;
};
export declare class GatewayCapabilityService {
    private readonly options;
    constructor(options: GatewayCapabilityServiceOptions);
    getCapabilities(): GatewayCapabilities;
}
//# sourceMappingURL=gateway-capability-service.d.ts.map