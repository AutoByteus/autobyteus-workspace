import { describe, expect, it } from "vitest";
import {
  decodeDiscordPeerId,
  DiscordTargetCodecError,
  encodeDiscordPeerId,
} from "../../../../../src/infrastructure/adapters/discord-business/discord-target-codec.js";

describe("discord-target-codec", () => {
  it("encodes and decodes user targets", () => {
    const peerId = encodeDiscordPeerId({
      targetType: "USER",
      id: "1234567890",
    });
    expect(peerId).toBe("user:1234567890");
    expect(decodeDiscordPeerId(peerId)).toEqual({
      targetType: "USER",
      id: "1234567890",
    });
  });

  it("encodes and decodes channel targets", () => {
    const peerId = encodeDiscordPeerId({
      targetType: "CHANNEL",
      id: "9876543210",
    });
    expect(peerId).toBe("channel:9876543210");
    expect(decodeDiscordPeerId(peerId)).toEqual({
      targetType: "CHANNEL",
      id: "9876543210",
    });
  });

  it("rejects malformed peer ids", () => {
    expect(() => decodeDiscordPeerId("discord:123")).toThrowError(DiscordTargetCodecError);
    expect(() => decodeDiscordPeerId("user:not-a-snowflake")).toThrowError(
      DiscordTargetCodecError,
    );
  });
});
