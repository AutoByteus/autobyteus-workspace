const DISCORD_SNOWFLAKE_PATTERN = /^[0-9]+$/;

export type DiscordPeerTarget =
  | {
      targetType: "USER";
      id: string;
    }
  | {
      targetType: "CHANNEL";
      id: string;
    };

export class DiscordTargetCodecError extends Error {
  readonly code: "INVALID_DISCORD_PEER_ID";
  readonly retryable = false;

  constructor(detail: string) {
    super(detail);
    this.name = "DiscordTargetCodecError";
    this.code = "INVALID_DISCORD_PEER_ID";
  }
}

export function encodeDiscordPeerId(target: DiscordPeerTarget): string {
  if (!DISCORD_SNOWFLAKE_PATTERN.test(target.id)) {
    throw new DiscordTargetCodecError("Discord peer target id must be a snowflake string.");
  }

  if (target.targetType === "USER") {
    return `user:${target.id}`;
  }
  return `channel:${target.id}`;
}

export function decodeDiscordPeerId(peerId: string): DiscordPeerTarget {
  const normalized = peerId.trim();
  if (!normalized.startsWith("user:") && !normalized.startsWith("channel:")) {
    throw new DiscordTargetCodecError(
      "Discord peerId must match user:<snowflake> or channel:<snowflake>.",
    );
  }

  const [prefix, rawId] = normalized.split(":", 2);
  if (!rawId || !DISCORD_SNOWFLAKE_PATTERN.test(rawId)) {
    throw new DiscordTargetCodecError(
      "Discord peerId must match user:<snowflake> or channel:<snowflake>.",
    );
  }

  if (prefix === "user") {
    return {
      targetType: "USER",
      id: rawId,
    };
  }

  return {
    targetType: "CHANNEL",
    id: rawId,
  };
}
