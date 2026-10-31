/**
 * REQ-001 / AC-001, AC-008 (autobyteus-339): closing a server never waits on a client beyond a short
 * grace. From probes P-003 (a connection that never sends a request holds Fastify's default close) and
 * P-004 (destroy never-used connections, let requests in progress finish within the grace, then close
 * the rest). Real sockets on 127.0.0.1.
 */
import net from "node:net";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IN_FLIGHT_REQUEST_GRACE_MS, installClientConnectionClose } from "../../../src/shutdown/client-connection-close.js";

const sockets: net.Socket[] = [];
const apps: FastifyInstance[] = [];
afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy();
  await Promise.all(apps.splice(0).map((app) => app.close().catch(() => undefined)));
});

const serverConnections = (app: FastifyInstance) =>
  new Promise<number>((resolve, reject) => app.server.getConnections((error, n) => error ? reject(error) : resolve(n)));

/** Opens a raw connection and waits until the server has accepted it (only then can it hold a close). */
const connect = async (app: FastifyInstance): Promise<net.Socket> => {
  const before = await serverConnections(app);
  const socket = net.connect((app.server.address() as net.AddressInfo).port, "127.0.0.1");
  sockets.push(socket);
  socket.on("error", () => undefined);
  await new Promise<void>((resolve) => socket.once("connect", () => resolve()));
  await vi.waitFor(async () => expect(await serverConnections(app)).toBe(before + 1));
  return socket;
};

/** Sends one keep-alive request on `socket`; resolves with the status code, or `cut` when the connection closes first. */
const request = (socket: net.Socket, path: string): Promise<number | "cut"> => new Promise((resolve) => {
  let data = "";
  const onData = (chunk: Buffer) => {
    data += chunk.toString();
    const match = /^HTTP\/1\.1 (\d{3})/.exec(data);
    if (match && data.includes("\r\n\r\n")) { socket.off("data", onData); socket.off("close", onClose); resolve(Number(match[1])); }
  };
  const onClose = () => { socket.off("data", onData); resolve("cut"); };
  socket.on("data", onData);
  socket.once("close", onClose);
  socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n\r\n`);
});

const closed = (socket: net.Socket) => socket.destroyed || socket.readyState === "closed"
  ? Promise.resolve() : new Promise<void>((resolve) => socket.once("close", () => resolve()));

const startApp = async (configure: (app: FastifyInstance) => void, options?: Parameters<typeof installClientConnectionClose>[1]) => {
  const app = fastify({ logger: false });
  apps.push(app);
  const events: string[] = [];
  app.get("/x", async () => "ok");
  app.get("/slow", async (req) => {
    await new Promise((resolve) => setTimeout(resolve, Number((req.query as { ms?: string }).ms ?? 300)));
    return "done";
  });
  app.addHook("onClose", async () => { events.push("onClose"); });
  configure(app);
  installClientConnectionClose(app, options);
  await app.listen({ host: "127.0.0.1", port: 0 });
  return { app, events };
};

describe("client connection close", () => {
  it("uses a 2 s grace by default", () => {
    expect(IN_FLIGHT_REQUEST_GRACE_MS).toBe(2_000);
  });

  it("AC-001/AC-008: closes never-used and idle connections, lets a 300 ms request finish, then onClose runs", async () => {
    const { app, events } = await startApp(() => undefined);
    const idle = await connect(app);
    expect(await request(idle, "/x")).toBe(200);
    const neverUsed = await connect(app);
    const busy = await connect(app);
    const slow = request(busy, "/slow?ms=300");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const startedAt = Date.now();
    await app.close();
    const closeMs = Date.now() - startedAt;

    expect(await slow).toBe(200);
    expect(events).toEqual(["onClose"]);
    expect(closeMs).toBeLessThan(1_000);
    await Promise.all([closed(neverUsed), closed(idle)]);
  });

  it("AC-008: a request outlasting the grace is cut at the grace", async () => {
    let endGrace!: () => void;
    const timers = { setTimeout: vi.fn((callback: () => void) => { endGrace = callback; return 1; }), clearTimeout: vi.fn() };
    const { app, events } = await startApp(() => undefined, { graceMs: 500, timers });
    const busy = await connect(app);
    const slow = request(busy, "/slow?ms=5000");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const closing = app.close();
    await vi.waitFor(() => expect(timers.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500));
    expect(events).toEqual([]);
    endGrace();
    await closing;

    expect(await slow).toBe("cut");
    expect(events).toEqual(["onClose"]);
  });

  it("a new request on an open keep-alive connection during the grace gets 503", async () => {
    const { app } = await startApp(() => undefined);
    const keepAlive = await connect(app);
    expect(await request(keepAlive, "/x")).toBe(200);
    const busy = await connect(app);
    const slow = request(busy, "/slow?ms=400");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const closing = app.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await request(keepAlive, "/x")).toBe(503);
    expect(await slow).toBe(200);
    await closing;
  });

  it("a connection opened during the grace is destroyed on arrival", async () => {
    const { app } = await startApp(() => undefined);
    const busy = await connect(app);
    const slow = request(busy, "/slow?ms=600");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const closing = app.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const late = net.connect((app.server.address() as net.AddressInfo).port, "127.0.0.1");
    sockets.push(late);
    late.on("error", () => undefined);
    const lateClosedAt = await closed(late).then(() => Date.now());
    const slowEndedAt = await slow.then(() => Date.now());

    expect(lateClosedAt).toBeLessThan(slowEndedAt);
    expect(await slow).toBe(200);
    await closing;
  });

  it("AR-003: a never-used connection opened while an earlier, slow preClose hook runs does not hold the close", async () => {
    let earlierHookStarted!: () => void;
    const started = new Promise<void>((resolve) => { earlierHookStarted = resolve; });
    const { app, events } = await startApp((fastifyApp) => {
      fastifyApp.addHook("preClose", async () => { earlierHookStarted(); await new Promise((resolve) => setTimeout(resolve, 300)); });
    });

    const closing = app.close();
    await started;
    const neverUsed = await connect(app);
    const outcome = await Promise.race([closing.then(() => "closed"), new Promise((resolve) => setTimeout(() => resolve("still waiting"), 2_000))]);

    expect(outcome).toBe("closed");
    expect(events).toEqual(["onClose"]);
    await closed(neverUsed);
  });

  it("leaves an upgraded socket to its owner", async () => {
    let upgraded: net.Socket | null = null;
    let upgradedOpenAfterHook: boolean | null = null;
    const app = fastify({ logger: false });
    apps.push(app);
    app.server.on("upgrade", (_request, socket: net.Socket) => {
      upgraded = socket;
      socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: test\r\nConnection: Upgrade\r\n\r\n");
    });
    installClientConnectionClose(app);
    // Runs after the hook under test; stands in for the owner closing its upgraded socket.
    app.addHook("preClose", async () => { upgradedOpenAfterHook = !upgraded!.destroyed; upgraded!.destroy(); });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const client = await connect(app);
    client.write("GET /ws HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: Upgrade\r\nUpgrade: test\r\n\r\n");
    await vi.waitFor(() => expect(upgraded).not.toBeNull());

    await app.close();

    expect(upgradedOpenAfterHook).toBe(true);
  });
});
