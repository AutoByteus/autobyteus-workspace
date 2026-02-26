import { describe, expect, it, vi } from "vitest";
import type {
  DiscordGatewayConnectorInput,
  DiscordGatewayMessageCreateEvent,
} from "../../../../../src/infrastructure/adapters/discord-business/discord-gateway-client.js";
import { DiscordGatewayClient } from "../../../../../src/infrastructure/adapters/discord-business/discord-gateway-client.js";

describe("DiscordGatewayClient", () => {
  it("forwards MESSAGE_CREATE events from connector dispatch to subscribers", async () => {
    const disconnect = vi.fn(async () => undefined);
    const connector = vi.fn(async (_input: DiscordGatewayConnectorInput) => {
      return {
        disconnect,
      };
    });

    const client = new DiscordGatewayClient({
      botToken: "bot-token",
      connector,
    });
    const received: DiscordGatewayMessageCreateEvent[] = [];
    client.onMessageCreate(async (event) => {
      received.push(event);
    });

    await client.connect();
    const connectorInput = (connector as any).mock.calls[0]?.[0] as
      | DiscordGatewayConnectorInput
      | undefined;
    if (!connectorInput) {
      throw new Error("connector input was not passed");
    }
    await connectorInput.dispatchMessageCreate({
      id: "msg-1",
      authorId: "author-1",
      authorDisplayName: "Author One",
      authorIsBot: false,
      channelId: "channel-1",
      guildId: "guild-1",
      threadId: null,
      content: "hello",
      timestamp: "2026-02-10T17:00:00.000Z",
      mentionsAgent: true,
      mentioned: true,
      attachments: [],
      raw: {},
    });
    await client.disconnect();

    expect(connector).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(received).toHaveLength(1);
    expect(received[0]?.content).toBe("hello");
  });

  it("avoids duplicate connector sessions across repeated connect calls", async () => {
    const disconnect = vi.fn(async () => undefined);
    const connector = vi.fn(async () => ({
      disconnect,
    }));
    const client = new DiscordGatewayClient({
      botToken: "bot-token",
      connector,
    });

    await client.connect();
    await client.connect();
    await client.disconnect();

    expect(connector).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("emits disconnected callback when connector reports socket close", async () => {
    const disconnect = vi.fn(async () => undefined);
    const connector = vi.fn(async (_input: DiscordGatewayConnectorInput) => ({
      disconnect,
    }));
    const client = new DiscordGatewayClient({
      botToken: "bot-token",
      connector,
    });
    const onDisconnected = vi.fn();
    client.onDisconnected(onDisconnected);

    await client.connect();
    const connectorInput = (connector as any).mock.calls[0]?.[0] as
      | DiscordGatewayConnectorInput
      | undefined;
    if (!connectorInput?.onSocketClosed) {
      throw new Error("onSocketClosed callback not wired");
    }

    connectorInput.onSocketClosed("CLOSE_1006");
    expect(onDisconnected).toHaveBeenCalledWith("CLOSE_1006");

    await client.disconnect();
  });
});
