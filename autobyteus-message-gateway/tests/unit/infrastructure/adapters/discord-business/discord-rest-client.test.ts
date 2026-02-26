import { describe, expect, it, vi } from "vitest";
import {
  DiscordRestClient,
  DiscordRestClientError,
} from "../../../../../src/infrastructure/adapters/discord-business/discord-rest-client.js";

describe("DiscordRestClient", () => {
  it("sends chunked channel messages", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "msg-1",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "msg-2",
          }),
          { status: 200 },
        ),
      );
    const client = new DiscordRestClient({
      botToken: "bot-token",
      baseUrl: "https://discord.example/api/v10",
      fetchImpl,
    });

    const result = await client.sendMessage({
      target: {
        targetType: "CHANNEL",
        channelId: "channel-1",
        threadId: "thread-1",
      },
      chunks: ["hello", "world"],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://discord.example/api/v10/channels/channel-1/messages?thread_id=thread-1",
    );
    expect(result.providerMessageId).toBe("msg-2");
  });

  it("resolves DM channel for user targets before sending", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "dm-channel-1",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "dm-msg-1",
          }),
          { status: 200 },
        ),
      );
    const client = new DiscordRestClient({
      botToken: "bot-token",
      baseUrl: "https://discord.example/api/v10",
      fetchImpl,
    });

    await client.sendMessage({
      target: {
        targetType: "USER",
        userId: "123",
        threadId: null,
      },
      chunks: ["dm text"],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://discord.example/api/v10/users/@me/channels");
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      "https://discord.example/api/v10/channels/dm-channel-1/messages",
    );
  });

  it("marks 429 as retryable rate limit errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          retry_after: 1.5,
        }),
        { status: 429 },
      ),
    );
    const client = new DiscordRestClient({
      botToken: "bot-token",
      baseUrl: "https://discord.example/api/v10",
      fetchImpl,
    });

    await expect(
      client.sendMessage({
        target: {
          targetType: "CHANNEL",
          channelId: "channel-1",
          threadId: null,
        },
        chunks: ["hello"],
      }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
      retryAfterMs: 1500,
    });
  });
});
