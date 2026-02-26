import type { DiscordGatewayMessageCreateEvent } from "./discord-gateway-client.js";

export class DiscordThreadContextResolverError extends Error {
  readonly code: string;

  constructor(code: string, detail: string) {
    super(detail);
    this.name = "DiscordThreadContextResolverError";
    this.code = code;
  }
}

export type DiscordResolvedThreadContext = {
  canonicalChannelId: string;
  canonicalThreadId: string | null;
};

export type DiscordThreadContextResolver = {
  resolveThreadContext: (
    event: DiscordGatewayMessageCreateEvent,
  ) => Promise<DiscordResolvedThreadContext>;
};

export class DefaultDiscordThreadContextResolver implements DiscordThreadContextResolver {
  async resolveThreadContext(
    event: DiscordGatewayMessageCreateEvent,
  ): Promise<DiscordResolvedThreadContext> {
    if (event.guildId === null) {
      return {
        canonicalChannelId: event.channelId,
        canonicalThreadId: null,
      };
    }

    const threadChannelId = normalizeOptionalString(event.threadId);
    if (!threadChannelId) {
      return {
        canonicalChannelId: event.channelId,
        canonicalThreadId: null,
      };
    }

    const parentChannelId =
      normalizeOptionalString(readPath(event.raw, ["parent_id"])) ??
      normalizeOptionalString(readPath(event.raw, ["channel", "parent_id"])) ??
      normalizeOptionalString(readPath(event.raw, ["thread", "parent_id"])) ??
      normalizeOptionalString(readPath(event.raw, ["message_reference", "channel_id"]));

    if (!parentChannelId) {
      throw new DiscordThreadContextResolverError(
        "DISCORD_THREAD_PARENT_UNRESOLVED",
        "Unable to resolve Discord parent channel for thread-origin message.",
      );
    }

    return {
      canonicalChannelId: parentChannelId,
      canonicalThreadId: threadChannelId,
    };
  }
}

const readPath = (value: unknown, path: string[]): unknown => {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
