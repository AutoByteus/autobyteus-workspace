import { describe, expect, it } from "vitest";
import {
  DiscordBindingIdentityValidationError,
  DiscordBindingIdentityValidator,
} from "../../../../src/external-channel/services/discord-binding-identity-validator.js";

describe("DiscordBindingIdentityValidator", () => {
  it("accepts valid Discord channel + thread identity", () => {
    const validator = new DiscordBindingIdentityValidator();

    expect(() =>
      validator.validate({
        accountId: "123456",
        peerId: "channel:987654321",
        threadId: "222333444",
      }),
    ).not.toThrow();
  });

  it("accepts valid Discord DM identity without thread", () => {
    const validator = new DiscordBindingIdentityValidator();

    expect(() =>
      validator.validate({
        accountId: "123456",
        peerId: "user:999888777",
        threadId: null,
      }),
    ).not.toThrow();
  });

  it("rejects invalid peer format with typed error payload", () => {
    const validator = new DiscordBindingIdentityValidator();

    try {
      validator.validate({
        accountId: "123456",
        peerId: "bad-peer",
        threadId: null,
      });
      throw new Error("Expected validator to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DiscordBindingIdentityValidationError);
      const typedError = error as DiscordBindingIdentityValidationError;
      expect(typedError.code).toBe("INVALID_DISCORD_PEER_ID");
      expect(typedError.field).toBe("peerId");
      expect(typedError.toPayload()).toEqual({
        code: "INVALID_DISCORD_PEER_ID",
        field: "peerId",
        detail: "Discord peerId must match user:<snowflake> or channel:<snowflake>.",
      });
    }
  });

  it("rejects invalid thread-target pairing with typed threadId issue", () => {
    const validator = new DiscordBindingIdentityValidator();

    try {
      validator.validate({
        accountId: "123456",
        peerId: "user:999888777",
        threadId: "222333444",
      });
      throw new Error("Expected validator to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DiscordBindingIdentityValidationError);
      const typedError = error as DiscordBindingIdentityValidationError;
      expect(typedError.code).toBe("INVALID_DISCORD_THREAD_TARGET_COMBINATION");
      expect(typedError.field).toBe("threadId");
    }
  });

  it("rejects account mismatch when expectedAccountId is provided", () => {
    const validator = new DiscordBindingIdentityValidator();

    try {
      validator.validate({
        accountId: "account-1",
        expectedAccountId: "account-2",
        peerId: "channel:999888777",
        threadId: null,
      });
      throw new Error("Expected validator to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DiscordBindingIdentityValidationError);
      const typedError = error as DiscordBindingIdentityValidationError;
      expect(typedError.code).toBe("INVALID_DISCORD_ACCOUNT_ID");
      expect(typedError.field).toBe("accountId");
    }
  });
});
