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

export class GatewayCapabilityService {
  private readonly options: GatewayCapabilityServiceOptions;

  constructor(options: GatewayCapabilityServiceOptions) {
    this.options = options;
  }

  getCapabilities(): GatewayCapabilities {
    const modes: WeChatSetupMode[] = [];
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

const resolveDefaultMode = (
  modes: WeChatSetupMode[],
  preferred?: WeChatSetupMode,
): WeChatSetupMode | null => {
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
