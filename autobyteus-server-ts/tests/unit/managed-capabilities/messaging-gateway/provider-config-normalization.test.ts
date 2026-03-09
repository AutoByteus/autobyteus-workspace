import { describe, expect, it } from "vitest";
import {
  normalizeManagedMessagingProviderConfig,
} from "../../../../src/managed-capabilities/messaging-gateway/types.js";
import {
  buildManagedMessagingProviderStatuses,
} from "../../../../src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.js";

describe("managed messaging provider normalization", () => {
  it("coerces non-WeChat provider flags into the inferred-enable model", () => {
    const normalized = normalizeManagedMessagingProviderConfig({
      whatsappBusinessEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: false,
      telegramEnabled: false,
      telegramPollingEnabled: false,
      telegramWebhookEnabled: true,
      telegramWebhookSecretToken: "legacy-secret",
    });

    expect(normalized.whatsappBusinessEnabled).toBe(true);
    expect(normalized.wecomAppEnabled).toBe(true);
    expect(normalized.discordEnabled).toBe(true);
    expect(normalized.telegramEnabled).toBe(true);
    expect(normalized.telegramPollingEnabled).toBe(true);
    expect(normalized.telegramWebhookEnabled).toBe(false);
    expect(normalized.telegramWebhookSecretToken).toBeNull();
  });

  it("treats valid saved config as effectively enabled without a second toggle", () => {
    const statuses = buildManagedMessagingProviderStatuses(
      normalizeManagedMessagingProviderConfig({
        discordEnabled: false,
        discordBotToken: "discord-token",
        discordAccountId: "discord-main",
        telegramEnabled: false,
        telegramBotToken: "telegram-token",
        telegramAccountId: "telegram-main",
      }),
    );

    const discord = statuses.find((entry) => entry.provider === "DISCORD");
    const telegram = statuses.find((entry) => entry.provider === "TELEGRAM");

    expect(discord?.configured).toBe(true);
    expect(discord?.effectivelyEnabled).toBe(true);
    expect(discord?.blockedReason).toBeNull();

    expect(telegram?.configured).toBe(true);
    expect(telegram?.effectivelyEnabled).toBe(true);
    expect(telegram?.blockedReason).toBeNull();
  });
});
