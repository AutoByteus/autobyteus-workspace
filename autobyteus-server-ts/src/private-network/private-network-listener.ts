import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import type http from "node:http";
import net from "node:net";
import path from "node:path";

/** The machine and account the network program proved for a connection over the private network, and its address. */
export type PrivateNetworkCaller = Readonly<{ machine: string; account: string | null; ip: string }>;

/** The first line the network program writes on every connection it hands over (design § Data Contract). */
export const CALLER_PREAMBLE_PREFIX = "AUTOBYTEUS-CALLER ";
const MAX_PREAMBLE_BYTES = 2048;
const PREAMBLE_TIMEOUT_MS = 5_000;
/** The longest Unix socket path the platforms accept (macOS: 104 bytes including the terminator; Linux: 108). */
const MAX_UNIX_SOCKET_PATH_BYTES = 103;

const callers = new WeakMap<net.Socket, PrivateNetworkCaller>();

/**
 * The caller of a connection the network program handed over, or `null` for any other connection (the node's TCP
 * port, this computer's own clients). Only `PrivateNetworkListener` marks a socket; nothing a client sends on the TCP
 * port can (design § Key Tradeoffs: a header there would be forgeable by any local process).
 */
export const privateNetworkCallerOf = (socket: net.Socket | null | undefined): PrivateNetworkCaller | null =>
  (socket ? callers.get(socket) : undefined) ?? null;

const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length > 0 && value.length <= max;

/** The caller in a preamble line, read strictly; `null` when it is not one. */
export const parseCallerPreamble = (line: string): PrivateNetworkCaller | null => {
  if (!line.startsWith(CALLER_PREAMBLE_PREFIX)) return null;
  let value: unknown;
  try { value = JSON.parse(line.slice(CALLER_PREAMBLE_PREFIX.length)); } catch { return null; }
  const caller = value as { machine?: unknown; account?: unknown; ip?: unknown } | null;
  if (!caller || typeof caller !== "object" || !text(caller.machine, 256) || !text(caller.ip, 64)) return null;
  if (caller.account !== null && caller.account !== undefined && !text(caller.account, 320)) return null;
  return Object.freeze({ machine: caller.machine, account: (caller.account as string | null | undefined) ?? null, ip: caller.ip });
};

export type CallerSocketLocation = Readonly<{ ok: true; path: string }> | Readonly<{ ok: false; message: string }>;

/**
 * Where the network program hands connections over (design AR-005): on macOS and Linux the Unix socket
 * `<data>/private-network/caller.sock` (mode 0600 in a 0700 folder); on Windows a named pipe with a name new at every
 * start, with the default security (the current user).
 */
export const callerSocketLocation = (dataDir: string, platform: NodeJS.Platform = process.platform): CallerSocketLocation => {
  if (platform === "win32") return { ok: true, path: `\\\\.\\pipe\\autobyteus-private-network-${randomBytes(12).toString("hex")}` };
  const socketPath = path.join(path.resolve(dataDir), "private-network", "caller.sock");
  if (Buffer.byteLength(socketPath, "utf8") > MAX_UNIX_SOCKET_PATH_BYTES) {
    return { ok: false, message: `The private network's caller socket path is ${Buffer.byteLength(socketPath, "utf8")} bytes, longer than the `
      + `${MAX_UNIX_SOCKET_PATH_BYTES} bytes a Unix socket path may have: ${socketPath}. Use a shorter data folder path.` };
  }
  return { ok: true, path: socketPath };
};

/**
 * The node's end of the private network (design DS-2, `PrivateNetworkListener`). The network program, which holds
 * the node's tailnet membership, hands every connection that arrives for the node over this socket: first one line
 * `AUTOBYTEUS-CALLER {"machine","account","ip"}\n`, then the connection's bytes. The listener reads that line, marks
 * the socket with the caller, puts the rest back, and gives the socket to the node's HTTP server, so the gate sees a
 * private-network connection with its caller (REQ-003). A connection without a valid line within 5 s is closed.
 */
export class PrivateNetworkListener {
  private server: net.Server | null = null;
  private location: string | null = null;

  constructor(private readonly dependencies: Readonly<{
    dataDir: string;
    /** The node's HTTP server (Fastify's `app.server`), which serves the handed-over connections. */
    httpServer(): http.Server;
    platform?: NodeJS.Platform;
  }>) {}

  /** Where the network program connects (the extension's `ctx.privateNetwork.callerSocketPath`); `null` before start. */
  socketPath(): string | null {
    return this.location;
  }

  /** Opens the socket. A path the platform cannot use is reported and the node starts without it. */
  async start(): Promise<void> {
    const platform = this.dependencies.platform ?? process.platform;
    const location = callerSocketLocation(this.dependencies.dataDir, platform);
    if (!location.ok) {
      console.error(`Private network: caller socket not opened. ${location.message}`);
      return;
    }
    if (platform !== "win32") {
      await fs.mkdir(path.dirname(location.path), { recursive: true, mode: 0o700 });
      await fs.chmod(path.dirname(location.path), 0o700);
      await fs.rm(location.path, { force: true });
    }
    const server = net.createServer((socket) => this.handOver(socket));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(location.path, () => {
        server.off("error", reject);
        resolve();
      });
    });
    if (platform !== "win32") await fs.chmod(location.path, 0o600);
    this.server = server;
    this.location = location.path;
  }

  async close(): Promise<void> {
    const server = this.server;
    this.server = null;
    this.location = null;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private handOver(socket: net.Socket): void {
    let received = Buffer.alloc(0);
    socket.on("error", () => undefined);
    socket.setTimeout(PREAMBLE_TIMEOUT_MS, () => socket.destroy());
    const onData = (chunk: Buffer): void => {
      received = Buffer.concat([received, chunk]);
      const newline = received.indexOf(0x0a);
      if (newline < 0) {
        if (received.length > MAX_PREAMBLE_BYTES) socket.destroy();
        return;
      }
      socket.off("data", onData);
      socket.pause();
      const caller = newline <= MAX_PREAMBLE_BYTES ? parseCallerPreamble(received.subarray(0, newline).toString("utf8").replace(/\r$/, "")) : null;
      if (!caller) { socket.destroy(); return; }
      socket.setTimeout(0);
      callers.set(socket, caller);
      const rest = received.subarray(newline + 1);
      if (rest.length) socket.unshift(rest);
      this.dependencies.httpServer().emit("connection", socket);
      socket.resume();
    };
    socket.on("data", onData);
  }
}
