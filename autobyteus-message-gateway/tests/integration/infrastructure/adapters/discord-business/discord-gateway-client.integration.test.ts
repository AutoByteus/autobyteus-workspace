import { describe, expect, it, vi } from "vitest";
import type { DiscordGatewayConnectorInput } from "../../../../../src/infrastructure/adapters/discord-business/discord-gateway-client.js";
import { DiscordGatewayClient } from "../../../../../src/infrastructure/adapters/discord-business/discord-gateway-client.js";

describe("DiscordGatewayClient integration", () => {
  it("reconnects after connector-reported disconnect", async () => {
    const disconnect = vi.fn(async () => undefined);
    const connector = vi.fn(async (_input: DiscordGatewayConnectorInput) => ({
      disconnect,
    }));
    const client = new DiscordGatewayClient({
      botToken: "bot-token",
      connector,
    });
    const disconnected = vi.fn();
    client.onDisconnected(disconnected);

    await client.connect();
    const firstInput = connector.mock.calls[0]?.[0] as DiscordGatewayConnectorInput | undefined;
    if (!firstInput?.onSocketClosed) {
      throw new Error("expected connector onSocketClosed hook");
    }
    firstInput.onSocketClosed("CLOSE_1006");
    expect(disconnected).toHaveBeenCalledWith("CLOSE_1006");

    await client.connect();
    expect(connector).toHaveBeenCalledTimes(2);
    await client.disconnect();
  });
});
