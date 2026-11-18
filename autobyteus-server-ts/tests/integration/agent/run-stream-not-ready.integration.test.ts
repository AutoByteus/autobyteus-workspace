import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";

/**
 * autobyteus-500 FU-036 (REQ-009, AC-006): every run stream answers a command sent before its session is ready with
 * `SESSION_NOT_READY` and drops none; a socket closed while its session connects ends that session once it exists.
 * The handlers are fakes whose `connect` resolves only when the test says so, so "before ready" is exact, not timed.
 */
type Message = { type: string; payload: Record<string, unknown> };

const fakeHandler = () => {
  let finish: (sessionId: string | null) => void = () => undefined;
  const connecting = new Promise<string | null>((resolve) => { finish = resolve; });
  const handler = {
    connect: vi.fn((connection: { send(data: string): void }) => connecting.then((sessionId) => {
      if (sessionId) connection.send(JSON.stringify({ type: "CONNECTED", payload: { session_id: sessionId } }));
      return sessionId;
    })),
    handleMessage: vi.fn(async (_sessionId: string, _raw: string) => undefined),
    disconnect: vi.fn(async (_sessionId: string) => undefined),
  };
  return { handler, connected: (sessionId: string | null) => finish(sessionId) };
};

const STREAMS = [
  { label: "org", path: "/ws/agent-org/org-run-1", slot: 2 },
  { label: "agent collaboration", path: "/ws/agent-collaboration/agent-run-1", slot: 3 },
  { label: "agent", path: "/ws/agent/agent-run-1", slot: 0 },
  { label: "team", path: "/ws/agent-team/team-run-1", slot: 1 },
] as const;

let app: FastifyInstance | null = null;
afterEach(async () => {
  await app?.close();
  app = null;
});

const serve = async (slot: number) => {
  const fakes = [fakeHandler(), fakeHandler(), fakeHandler(), fakeHandler()];
  app = fastify();
  await app.register(websocket);
  await registerAgentWebsocket(app, fakes[0]!.handler as never, fakes[1]!.handler as never, fakes[2]!.handler as never,
    fakes[3]!.handler as never);
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP address");
  return { port: address.port, fake: fakes[slot]! };
};

const open = async (port: number, path: string) => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  const received: Message[] = [];
  const waiters: Array<() => void> = [];
  socket.on("message", (raw) => { received.push(JSON.parse(raw.toString()) as Message); waiters.splice(0).forEach((wake) => wake()); });
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  const next = async (count: number): Promise<Message[]> => {
    while (received.length < count) await new Promise<void>((wake) => waiters.push(wake));
    return received.slice(0, count);
  };
  return { socket, received, next };
};

describe("run streams before their session is ready (FU-036)", () => {
  for (const stream of STREAMS) {
    it(`${stream.label}: a command sent on open gets SESSION_NOT_READY; after CONNECTED it reaches the session`, async () => {
      const { port, fake } = await serve(stream.slot);
      const client = await open(port, stream.path);
      client.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "early" } }));
      const [early] = await client.next(1);
      expect(early).toMatchObject({ type: "ERROR", payload: { code: "SESSION_NOT_READY" } });
      expect(fake.handler.handleMessage).not.toHaveBeenCalled();

      fake.connected("session-1");
      const [, connected] = await client.next(2);
      expect(connected).toMatchObject({ type: "CONNECTED" });
      client.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "ready" } }));
      await vi.waitFor(() => expect(fake.handler.handleMessage).toHaveBeenCalledWith("session-1", expect.stringContaining("ready")));
      client.socket.close();
      await vi.waitFor(() => expect(fake.handler.disconnect).toHaveBeenCalledWith("session-1"));
    });

    it(`${stream.label}: a socket closed while its session connects ends the session once it exists`, async () => {
      const { port, fake } = await serve(stream.slot);
      const client = await open(port, stream.path);
      const closed = new Promise<void>((resolve) => client.socket.once("close", () => resolve()));
      client.socket.close();
      await closed;
      await vi.waitFor(() => expect(fake.handler.connect).toHaveBeenCalled());
      fake.connected("session-late");
      await vi.waitFor(() => expect(fake.handler.disconnect).toHaveBeenCalledWith("session-late"));
      expect(fake.handler.handleMessage).not.toHaveBeenCalled();
    });
  }

  it("a refused connection (null) is left to the handler: later messages are not handled", async () => {
    const { port, fake } = await serve(2);
    const client = await open(port, STREAMS[0].path);
    fake.connected(null);
    await vi.waitFor(() => expect(fake.handler.connect).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    client.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "after refusal" } }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fake.handler.handleMessage).not.toHaveBeenCalled();
    expect(client.received.some((message) => message.type === "ERROR")).toBe(false);
  });
});
