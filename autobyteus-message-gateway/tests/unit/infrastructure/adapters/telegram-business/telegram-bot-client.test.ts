import { describe, expect, it, vi } from "vitest";
import { TelegramBotClient } from "../../../../../src/infrastructure/adapters/telegram-business/telegram-bot-client.js";

describe("TelegramBotClient", () => {
  it("sends outbound messages through Telegram Bot API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/sendMessage")) {
        return jsonResponse({
          ok: true,
          result: {
            message_id: 12345,
          },
        });
      }
      if (url.endsWith("/getMe")) {
        return jsonResponse({
          ok: true,
          result: {
            id: 1001,
            is_bot: true,
            username: "autobyteus_bot",
          },
        });
      }
      return jsonResponse({ ok: true, result: [] });
    }) as unknown as typeof fetch;

    const client = new TelegramBotClient({
      botToken: "telegram-token",
      fetchImpl: fetchMock,
    });

    const result = await client.sendMessage({
      chatId: "100200300",
      threadId: "11",
      text: "hello from test",
    });

    expect(result.providerMessageId).toBe("12345");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock as any).mock.calls[0]?.[0])).toContain("/sendMessage");
  });

  it("forwards polling updates to subscribers and emits disconnect on polling errors", async () => {
    let getUpdatesCall = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/getMe")) {
        return jsonResponse({
          ok: true,
          result: {
            id: 1001,
            is_bot: true,
            username: "autobyteus_bot",
          },
        });
      }
      if (url.endsWith("/getUpdates")) {
        getUpdatesCall += 1;
        if (getUpdatesCall === 1) {
          return jsonResponse({
            ok: true,
            result: [
              {
                update_id: 5001,
                message: {
                  message_id: 7001,
                  date: 1739420400,
                  text: "hello from telegram",
                  chat: {
                    id: -100123,
                    type: "supergroup",
                    title: "Engineering",
                  },
                  from: {
                    id: 445566,
                    is_bot: false,
                    first_name: "Alice",
                  },
                },
              },
            ],
          });
        }
        throw new Error("network down");
      }

      return jsonResponse({ ok: true, result: [] });
    }) as unknown as typeof fetch;

    const client = new TelegramBotClient({
      botToken: "telegram-token",
      fetchImpl: fetchMock,
    });

    const received: string[] = [];
    client.onUpdate(async (update) => {
      received.push(update.message.text);
    });
    const disconnected = vi.fn();
    client.onDisconnected(disconnected);

    await client.startPolling();
    await waitFor(() => received.length === 1 && disconnected.mock.calls.length === 1);

    expect(received).toEqual(["hello from telegram"]);
    expect(disconnected).toHaveBeenCalledTimes(1);
  });
});

const waitFor = async (predicate: () => boolean, timeoutMs = 1500): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("waitFor timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const jsonResponse = (value: unknown): Response =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
