import { EventEmitter } from "node:events";
import type { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  authorize: vi.fn(),
  closeForRejection: vi.fn(),
}));

vi.mock("../../../../src/api/websocket/remote-access-websocket-auth.js", () => ({
  authorizeRemoteAccessWebSocket: auth.authorize,
  closeSocketForRemoteAccessRejection: auth.closeForRejection,
}));

import {
  parseNodeDesktopStreamQuery,
  registerNodeDesktopWebsocket,
} from "../../../../src/api/websocket/node-desktop.js";

type Handler = (socket: unknown, request: { url: string }) => void;

class FakeSocket extends EventEmitter {
  bufferedAmount = 0;
  close = vi.fn();
  send = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

const routeHandler = async (resolveTarget: () => { host: string; port: number } | null): Promise<Handler> => {
  let handler: Handler | null = null;
  const app = {
    get: (_path: string, _options: unknown, route: Handler) => { handler = route; },
    addHook: () => undefined,
  };
  await registerNodeDesktopWebsocket(app as unknown as FastifyInstance, resolveTarget);
  return handler!;
};

describe("/ws/node-desktop route", () => {
  beforeEach(() => {
    auth.authorize.mockReset();
    auth.closeForRejection.mockReset();
  });

  it("closes 4400 on viewer bytes before the stream starts, without resolving the desktop", async () => {
    let admit: (value: unknown) => void = () => undefined;
    auth.authorize.mockReturnValue(new Promise((resolve) => { admit = resolve; }));
    const resolveTarget = vi.fn(() => ({ host: "127.0.0.1", port: 5900 }));
    const socket = new FakeSocket();
    (await routeHandler(resolveTarget))(socket, { url: "/ws/node-desktop?mode=view" });

    socket.emit("message", Buffer.from("RFB 003.008\n"));
    expect(socket.close).toHaveBeenCalledWith(4400, "NODE_DESKTOP_VIEWER_PROTOCOL");
    admit({ mode: "trusted_network", isAuthenticated: false });
    await flush();
    expect(resolveTarget).not.toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it("authorizes before it reads the query or resolves the desktop", async () => {
    auth.authorize.mockRejectedValue({ code: 4401, reason: "REMOTE_ACCESS_AUTH_INVALID" });
    const resolveTarget = vi.fn(() => ({ host: "127.0.0.1", port: 5900 }));
    const socket = new FakeSocket();
    (await routeHandler(resolveTarget))(socket, { url: "/ws/node-desktop?mode=view&host=10.0.0.5" });
    await flush();

    expect(auth.closeForRejection).toHaveBeenCalledWith(socket, { code: 4401, reason: "REMOTE_ACCESS_AUTH_INVALID" }, expect.anything());
    expect(socket.close).not.toHaveBeenCalled();
    expect(resolveTarget).not.toHaveBeenCalled();
  });

  it("validates the query before it resolves the desktop", async () => {
    auth.authorize.mockResolvedValue({ mode: "loopback", isAuthenticated: true });
    const resolveTarget = vi.fn(() => ({ host: "127.0.0.1", port: 5900 }));
    const socket = new FakeSocket();
    (await routeHandler(resolveTarget))(socket, { url: "/ws/node-desktop?mode=view&port=5901" });
    await flush();

    expect(socket.close).toHaveBeenCalledWith(4400, "NODE_DESKTOP_INVALID_REQUEST");
    expect(resolveTarget).not.toHaveBeenCalled();
  });

  it("does nothing more when the viewer leaves during authorization", async () => {
    let admit: (value: unknown) => void = () => undefined;
    auth.authorize.mockReturnValue(new Promise((resolve) => { admit = resolve; }));
    const resolveTarget = vi.fn(() => ({ host: "127.0.0.1", port: 5900 }));
    const socket = new FakeSocket();
    (await routeHandler(resolveTarget))(socket, { url: "/ws/node-desktop?mode=view" });
    socket.emit("close");
    admit({ mode: "loopback", isAuthenticated: true });
    await flush();

    expect(resolveTarget).not.toHaveBeenCalled();
    expect(socket.close).not.toHaveBeenCalled();
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
