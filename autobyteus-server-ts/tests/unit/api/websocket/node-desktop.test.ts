import { EventEmitter } from "node:events";
import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseNodeDesktopStreamQuery,
  registerNodeDesktopWebsocket,
} from "../../../../src/api/websocket/node-desktop.js";
import { admitRequest, setWebSocketRefusal } from "../../../../src/api/security/node-access-gate.js";
import { OpenSocketRegistry } from "../../../../src/api/security/open-socket-registry.js";
import { NODE_ACCESS_REFUSALS } from "../../../../src/node-access/domain/node-access-refusal.js";

type Handler = (socket: unknown, request: { url: string; raw: object }) => void;

class FakeSocket extends EventEmitter {
  bufferedAmount = 0;
  close = vi.fn();
  send = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
}

const routeHandler = async (resolveTarget: () => { host: string; port: number } | null): Promise<Handler> => {
  let handler: Handler | null = null;
  const app = {
    get: (_path: string, _options: unknown, route: Handler) => { handler = route; },
    addHook: () => undefined,
  };
  await registerNodeDesktopWebsocket(app as unknown as FastifyInstance, resolveTarget);
  return handler!;
};

/** An upgrade the node access gate admitted (its hook ran before the route). */
const admitted = (url: string) => {
  const request = { url, raw: {} };
  admitRequest(request as never, { kind: "owner", credentialId: "launch" }, new OpenSocketRegistry());
  return request;
};

describe("/ws/node-desktop route (behind the node access gate)", () => {
  it("NAS-09 a refused upgrade is closed with the gate's code before the route reads anything", async () => {
    const resolveTarget = vi.fn(() => ({ host: "127.0.0.1", port: 5900 }));
    const socket = new FakeSocket();
    const request = { url: "/ws/node-desktop?mode=view&access_token=mra_x", raw: {} };
    setWebSocketRefusal(request as never, NODE_ACCESS_REFUSALS.phoneRouteRefused);
    (await routeHandler(resolveTarget))(socket, request);

    expect(socket.close).toHaveBeenCalledWith(4403, "PHONE_ACCESS_ROUTE_REFUSED");
    expect(resolveTarget).not.toHaveBeenCalled();
  });

  it("validates the query before it resolves the desktop", async () => {
    const resolveTarget = vi.fn(() => ({ host: "127.0.0.1", port: 5900 }));
    const socket = new FakeSocket();
    (await routeHandler(resolveTarget))(socket, admitted("/ws/node-desktop?mode=view&port=5901"));

    expect(socket.close).toHaveBeenCalledWith(4400, "NODE_DESKTOP_INVALID_REQUEST");
    expect(resolveTarget).not.toHaveBeenCalled();
  });

  it("closes 4404 when the node has no desktop", async () => {
    const socket = new FakeSocket();
    (await routeHandler(() => null))(socket, admitted("/ws/node-desktop?mode=view"));
    expect(socket.close).toHaveBeenCalledWith(4404, "NODE_DESKTOP_UNAVAILABLE");
  });
});

describe("parseNodeDesktopStreamQuery", () => {
  it("accepts exactly one mode and at most one access token", () => {
    expect(parseNodeDesktopStreamQuery("/ws/node-desktop?mode=view")).toBe("view");
    expect(parseNodeDesktopStreamQuery("/ws/node-desktop?mode=control&access_token=mra_x")).toBe("control");
    expect(parseNodeDesktopStreamQuery("/ws/node-desktop?access_token=mra_x&mode=view")).toBe("view");
  });

  it("refuses a missing, repeated or unknown mode and any other parameter", () => {
    for (const query of ["", "?mode=", "?mode=edit", "?mode=view&mode=view", "?mode=view&target=x", "?mode=view&Mode=view",
      "?mode=view&access_token=a&access_token=b"]) {
      expect(parseNodeDesktopStreamQuery(`/ws/node-desktop${query}`), query).toBeNull();
    }
  });
});
