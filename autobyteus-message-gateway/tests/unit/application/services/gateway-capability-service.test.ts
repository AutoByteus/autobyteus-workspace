import { describe, expect, it } from "vitest";
import { GatewayCapabilityService } from "../../../../src/application/services/gateway-capability-service.js";

describe("GatewayCapabilityService", () => {
  it("returns wecom bridge as default when both modes are available", () => {
    const service = new GatewayCapabilityService({
      wecomAppEnabled: true,
      wechatPersonalEnabled: true,
      discordEnabled: true,
      discordAccountId: "discord-acct-1",
      telegramEnabled: true,
      telegramAccountId: "telegram-acct-1",
    });

    expect(service.getCapabilities()).toEqual({
      wechatModes: ["WECOM_APP_BRIDGE", "DIRECT_PERSONAL_SESSION"],
      defaultWeChatMode: "WECOM_APP_BRIDGE",
      wecomAppEnabled: true,
      wechatPersonalEnabled: true,
      discordEnabled: true,
      discordAccountId: "discord-acct-1",
      telegramEnabled: true,
      telegramAccountId: "telegram-acct-1",
    });
  });

  it("returns null default when no mode is enabled", () => {
    const service = new GatewayCapabilityService({
      wecomAppEnabled: false,
      wechatPersonalEnabled: false,
      discordEnabled: false,
      telegramEnabled: false,
    });

    expect(service.getCapabilities()).toEqual({
      wechatModes: [],
      defaultWeChatMode: null,
      wecomAppEnabled: false,
      wechatPersonalEnabled: false,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: false,
      telegramAccountId: null,
    });
  });

  it("respects preferred default mode when available", () => {
    const service = new GatewayCapabilityService({
      wecomAppEnabled: true,
      wechatPersonalEnabled: true,
      defaultWeChatMode: "DIRECT_PERSONAL_SESSION",
      discordEnabled: true,
      discordAccountId: "discord-acct-1",
      telegramEnabled: false,
    });

    expect(service.getCapabilities().defaultWeChatMode).toBe("DIRECT_PERSONAL_SESSION");
  });
});
