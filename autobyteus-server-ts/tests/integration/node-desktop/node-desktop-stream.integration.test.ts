/**
 * NodeDesktopStream between a real `ws` WebSocket and a local fake RFB TCP server (no Xvnc):
 * both directions through the filter, close propagation, a refused desktop, and the 8 MiB bound
 * with a viewer that stops reading (REQ-008, REQ-010, REQ-011).
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/integration/node-desktop --no-watch
 */
import net from "node:net";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import {
  NodeDesktopStream,
  VIEWER_HIGH_WATERMARK_BYTES,
  type NodeDesktopViewerSocket,
} from "../../../src/node-desktop/node-desktop-stream.js";
import type { NodeDesktopMode } from "../../../src/node-desktop/rfb-viewer-input-filter.js";

const RFB_VERSION = Buffer.from("RFB 003.008\n", "latin1");
const HANDSHAKE = Buffer.concat([RFB_VERSION, Buffer.from([1, 0])]);
const POINTER_EVENT = Buffer.from([5, 1, 0, 10, 0, 20]);
const UPDATE_REQUEST = Buffer.from([3, 1, 0, 0, 0, 0, 7, 128, 4, 56]);
const EIGHT_MIB = 8 * 1024 * 1024;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (condition: () => boolean, timeoutMs = 3_000, label = "condition"): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await sleep(5);
  }
};

type FakeDesktop = {
  port: number;
  received: () => Buffer;
  connections: net.Socket[];
  closedAt: number[];
  close: () => Promise<void>;
};

/** A fake Xvnc: sends the RFB version on connect and records what it receives. */
const startFakeDesktop = async (onConnection?: (socket: net.Socket) => void): Promise<FakeDesktop> => {
  const chunks: Buffer[] = [];
  const connections: net.Socket[] = [];
  const closedAt: number[] = [];
  const server = net.createServer((socket) => {
    connections.push(socket);
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.on("close", () => closedAt.push(Date.now()));
    socket.on("error", () => undefined);
    socket.write(RFB_VERSION);
    onConnection?.(socket);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    port: (server.address() as AddressInfo).port,
    received: () => Buffer.concat(chunks),
    connections,
    closedAt,
    close: () => new Promise((resolve) => {
      for (const socket of connections) socket.destroy();
      server.close(() => resolve());
    }),
  };
};

type Viewer = {
  client: WebSocket;
  received: () => Buffer;
  closed: Promise<{ code: number; reason: string }>;
  /** Peak `bufferedAmount` of the server-side socket, read right after each send. */
  peakBufferedAmount: () => number;
  serverSocket: () => WebSocket;
};

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/** A WebSocket server whose every connection becomes a NodeDesktopStream to `targetPort`. */
const openViewer = async (targetPort: number, mode: NodeDesktopMode): Promise<Viewer> => {
  const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise<void>((resolve) => wss.once("listening", () => resolve()));
  let peak = 0;
  let server: WebSocket | null = null;
  wss.on("connection", (socket) => {
    server = socket;
    const measured: NodeDesktopViewerSocket = {
      get bufferedAmount() { return socket.bufferedAmount; },
      send: (data, callback) => {
        socket.send(data, callback);
        peak = Math.max(peak, socket.bufferedAmount);
      },
      close: (code, reason) => socket.close(code, reason),
      pause: () => socket.pause(),
      resume: () => socket.resume(),
      on: ((event: string, listener: (...args: any[]) => void) => socket.on(event, listener)) as NodeDesktopViewerSocket["on"],
    };
    new NodeDesktopStream({ socket: measured, target: { host: "127.0.0.1", port: targetPort }, mode, viewerKind: "trusted_network" }).start();
  });
  const client = new WebSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`);
  const chunks: Buffer[] = [];
  client.on("message", (data: Buffer) => chunks.push(data));
  const closed = new Promise<{ code: number; reason: string }>((resolve) => {
    client.on("close", (code, reason) => resolve({ code, reason: reason.toString() }));
  });
  client.on("error", () => undefined);
  await new Promise<void>((resolve, reject) => {
    client.once("open", () => resolve());
    client.once("error", reject);
  });
  // Waits for the server side to close, so that each stream has ended (and logged) inside its own test.
  cleanups.push(async () => {
    const serverSocket = server as WebSocket | null;
    const serverClosed = !serverSocket || serverSocket.readyState === WebSocket.CLOSED
      ? Promise.resolve()
      : new Promise<void>((resolve) => serverSocket.once("close", () => resolve()));
    client.terminate();
    await serverClosed;
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });
  return {
    client,
    received: () => Buffer.concat(chunks),
    closed,
    peakBufferedAmount: () => peak,
    serverSocket: () => server!,
  };
};

describe("NodeDesktopStream", () => {
  it("carries the desktop's bytes to the viewer and Control input to the desktop", async () => {
    const desktop = await startFakeDesktop();
    cleanups.push(() => desktop.close());
    const viewer = await openViewer(desktop.port, "control");

    await waitFor(() => viewer.received().equals(RFB_VERSION), 3_000, "RFB version at the viewer");
    viewer.client.send(Buffer.concat([HANDSHAKE, POINTER_EVENT, UPDATE_REQUEST]));
    const expected = Buffer.concat([RFB_VERSION, Buffer.from([1, 1]), POINTER_EVENT, UPDATE_REQUEST]);
    await waitFor(() => desktop.received().equals(expected), 3_000, "control bytes at the desktop");
  });

  it("delivers no View only input to the desktop", async () => {
    const desktop = await startFakeDesktop();
    cleanups.push(() => desktop.close());
    const viewer = await openViewer(desktop.port, "view");

    await waitFor(() => viewer.received().length > 0, 3_000, "RFB version at the viewer");
    viewer.client.send(Buffer.concat([HANDSHAKE, POINTER_EVENT, Buffer.from([4, 1, 0, 0, 0, 0, 0, 0x61]), UPDATE_REQUEST]));
    const expected = Buffer.concat([RFB_VERSION, Buffer.from([1, 1]), UPDATE_REQUEST]);
    await waitFor(() => desktop.received().length >= expected.length, 3_000, "view bytes at the desktop");
    await sleep(50);
    expect(desktop.received()).toEqual(expected);
  });

  it("closes the desktop connection within 2 s of the viewer closing, and logs metadata only", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const desktop = await startFakeDesktop();
    cleanups.push(() => desktop.close());
    const viewer = await openViewer(desktop.port, "control");
    await waitFor(() => viewer.received().length > 0, 3_000, "RFB version at the viewer");
    viewer.client.send(Buffer.concat([HANDSHAKE, Buffer.from([6, 0, 0, 0, 0, 0, 0, 6]), Buffer.from("secret")]));
    await waitFor(() => desktop.received().includes(Buffer.from("secret")), 3_000, "cut text at the desktop");

    const closedByViewerAt = Date.now();
    viewer.client.close(1000);
    await waitFor(() => desktop.closedAt.length === 1, 2_000, "desktop connection closed");
    expect(desktop.closedAt[0]! - closedByViewerAt).toBeLessThanOrEqual(2_000);

    const lines = info.mock.calls.map((call) => String(call[0]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(
      /^\[node-desktop\] stream ended mode=control viewer=trusted_network durationMs=\d+ toViewer=12 fromViewer=28 reason=viewer-closed$/,
    );
    expect(lines[0]).not.toContain("secret");
  });

  it("closes the viewer with 4502 when the desktop refuses or ends the connection", async () => {
    const vacant = net.createServer();
    await new Promise<void>((resolve) => vacant.listen(0, "127.0.0.1", resolve));
    const vacantPort = (vacant.address() as AddressInfo).port;
    await new Promise<void>((resolve) => vacant.close(() => resolve()));
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const refused = await openViewer(vacantPort, "view");
    expect(await refused.closed).toEqual({ code: 4502, reason: "NODE_DESKTOP_DISCONNECTED" });

    const desktop = await startFakeDesktop((socket) => setTimeout(() => socket.end(), 50));
    cleanups.push(() => desktop.close());
    const ended = await openViewer(desktop.port, "view");
    expect(await ended.closed).toEqual({ code: 4502, reason: "NODE_DESKTOP_DISCONNECTED" });
  });

  it("closes the viewer with 4400 on a message the filter rejects", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const desktop = await startFakeDesktop();
    cleanups.push(() => desktop.close());
    const viewer = await openViewer(desktop.port, "control");
    await waitFor(() => viewer.received().length > 0, 3_000, "RFB version at the viewer");
    viewer.client.send(Buffer.concat([HANDSHAKE, Buffer.from([9, 9, 9, 9])]));
    expect(await viewer.closed).toEqual({ code: 4400, reason: "NODE_DESKTOP_VIEWER_PROTOCOL" });
    await waitFor(() => desktop.closedAt.length === 1, 2_000, "desktop connection closed");
  });

  it("keeps at most 8 MiB buffered for a viewer that stops reading, and resumes when it reads again", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const total = 48 * 1024 * 1024;
    const block = Buffer.alloc(256 * 1024, 7);
    let written = 0;
    let desktopSocket: net.Socket | null = null;
    const writeAll = (socket: net.Socket) => {
      while (written < total) {
        written += block.length;
        if (!socket.write(block)) {
          socket.once("drain", () => writeAll(socket));
          return;
        }
      }
    };
    const desktop = await startFakeDesktop((socket) => {
      desktopSocket = socket;
    });
    cleanups.push(() => desktop.close());
    const viewer = await openViewer(desktop.port, "view");
    await waitFor(() => viewer.received().length > 0, 3_000, "RFB version at the viewer");
    viewer.client.pause();
    writeAll(desktopSocket!);

    await waitFor(() => viewer.peakBufferedAmount() >= VIEWER_HIGH_WATERMARK_BYTES, 10_000, "high watermark reached");
    await sleep(500);
    expect(viewer.peakBufferedAmount()).toBeLessThanOrEqual(EIGHT_MIB);
    expect(written).toBeLessThan(total);
    expect(viewer.serverSocket().readyState).toBe(WebSocket.OPEN);

    viewer.client.resume();
    await waitFor(() => viewer.received().length === RFB_VERSION.length + total, 20_000, "all desktop bytes at the viewer");
    expect(viewer.peakBufferedAmount()).toBeLessThanOrEqual(EIGHT_MIB);
  });
});
