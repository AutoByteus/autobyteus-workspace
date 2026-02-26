import { describe, expect, it } from "vitest";
import {
  DefaultDiscordThreadContextResolver,
  DiscordThreadContextResolverError,
} from "../../../../../src/infrastructure/adapters/discord-business/discord-thread-context-resolver.js";
import type { DiscordGatewayMessageCreateEvent } from "../../../../../src/infrastructure/adapters/discord-business/discord-gateway-client.js";

describe("DefaultDiscordThreadContextResolver", () => {
  it("returns non-thread context for DM events", async () => {
    const resolver = new DefaultDiscordThreadContextResolver();
    const result = await resolver.resolveThreadContext(buildEvent({
      guildId: null,
      channelId: "dm-channel-1",
      threadId: null,
      raw: {},
    }));

    expect(result).toEqual({
      canonicalChannelId: "dm-channel-1",
      canonicalThreadId: null,
    });
  });

  it("returns canonical parent/thread for thread-origin events", async () => {
    const resolver = new DefaultDiscordThreadContextResolver();
    const result = await resolver.resolveThreadContext(buildEvent({
      guildId: "guild-1",
      channelId: "thread-1",
      threadId: "thread-1",
      raw: {
        parent_id: "parent-1",
      },
    }));

    expect(result).toEqual({
      canonicalChannelId: "parent-1",
      canonicalThreadId: "thread-1",
    });
  });

  it("throws typed error when thread parent is unresolved", async () => {
    const resolver = new DefaultDiscordThreadContextResolver();

    await expect(
      resolver.resolveThreadContext(buildEvent({
        guildId: "guild-1",
        channelId: "thread-1",
        threadId: "thread-1",
        raw: {},
      })),
    ).rejects.toMatchObject({
      code: "DISCORD_THREAD_PARENT_UNRESOLVED",
    } satisfies Partial<DiscordThreadContextResolverError>);
  });
});

const buildEvent = (
  overrides: Partial<DiscordGatewayMessageCreateEvent>,
): DiscordGatewayMessageCreateEvent => ({
  id: "msg-1",
  authorId: "author-1",
  authorDisplayName: "Alice",
  authorIsBot: false,
  channelId: "channel-1",
  guildId: "guild-1",
  threadId: null,
  content: "hello",
  timestamp: "2026-02-10T00:00:00.000Z",
  mentionsAgent: true,
  mentioned: true,
  attachments: [],
  raw: {},
  ...overrides,
});
