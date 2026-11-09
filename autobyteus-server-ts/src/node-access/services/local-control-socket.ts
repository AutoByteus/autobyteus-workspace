import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import type { CreatedSetupCode } from "./setup-code-service.js";

/**
 * The node's local control socket (NA-5, design M-2): reachable only on the node's own computer by the data folder's
 * user (Unix socket with mode 0600 in a 0700 folder; on Windows a named pipe), or by `docker exec` into its
 * container. Protocol: one line in, one JSON line out, then the socket closes.
 *
 *   → `setup-code\n`
 *   ← `{"setupCode":"…","expiresAt":"…"}\n` (a fresh code, valid 30 minutes, single use)
 *   ← `{"error":"UNKNOWN_REQUEST"}\n` for anything else
 *
 * The code is written only to the client that asked; never to a file or a log.
 */
export const SETUP_CODE_REQUEST = "setup-code";

/** The longest Unix socket path the platforms accept (macOS: 104 bytes including the terminator; Linux: 108). */
const MAX_UNIX_SOCKET_PATH_BYTES = 103;
const MAX_REQUEST_BYTES = 64;

export type LocalControlSocketPath =
  | Readonly<{ ok: true; path: string }>
  | Readonly<{ ok: false; message: string }>;

/** Where the node with this data folder listens. Both the node and its clients (the CLI, the launcher) use it. */
export const localControlSocketPath = (dataDir: string, platform: NodeJS.Platform = process.platform): LocalControlSocketPath => {
  const resolvedDataDir = path.resolve(dataDir);
  if (platform === "win32") {
    const id = createHash("sha256").update(resolvedDataDir.toLowerCase(), "utf8").digest("hex").slice(0, 24);
    return { ok: true, path: `\\\\.\\pipe\\autobyteus-node-${id}` };
  }
  const socketPath = path.join(resolvedDataDir, "node-access", "local-control.sock");
  if (Buffer.byteLength(socketPath, "utf8") > MAX_UNIX_SOCKET_PATH_BYTES) {
    return {
      ok: false,
      message: `The node's local control socket path is ${Buffer.byteLength(socketPath, "utf8")} bytes, longer than the `
        + `${MAX_UNIX_SOCKET_PATH_BYTES} bytes a Unix socket path may have: ${socketPath}. Use a shorter data folder path.`,
    };
  }
  return { ok: true, path: socketPath };
};

export class LocalControlSocket {
  private server: net.Server | null = null;

  constructor(
    private readonly dataDir: string,
    private readonly setupCodes: Readonly<{ create(): CreatedSetupCode }>,
  ) {}

  /** Opens the socket. A path the platform cannot use is reported and the node starts without the socket. */
  async start(): Promise<void> {
    const location = localControlSocketPath(this.dataDir);
    if (!location.ok) {
      console.error(`Node access: local control socket not opened. ${location.message}`);
      return;
    }
    if (process.platform !== "win32") {
      await fs.mkdir(path.dirname(location.path), { recursive: true, mode: 0o700 });
      await fs.chmod(path.dirname(location.path), 0o700);
      await fs.rm(location.path, { force: true });
    }
    const server = net.createServer((socket) => this.answer(socket));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(location.path, () => {
        server.off("error", reject);
        resolve();
      });
    });
    if (process.platform !== "win32") {
      await fs.chmod(location.path, 0o600);
    }
    this.server = server;
  }

  async close(): Promise<void> {
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private answer(socket: net.Socket): void {
    let received = "";
    socket.setEncoding("utf8");
    socket.setTimeout(5_000, () => socket.destroy());
    socket.on("error", () => undefined);
    socket.on("data", (chunk: string) => {
      received += chunk;
      const newline = received.indexOf("\n");
      if (newline < 0 && received.length < MAX_REQUEST_BYTES) return;
      socket.removeAllListeners("data");
      const request = (newline < 0 ? received : received.slice(0, newline)).trim();
      const reply = request === SETUP_CODE_REQUEST ? this.setupCodes.create() : { error: "UNKNOWN_REQUEST" };
      socket.end(`${JSON.stringify(reply)}\n`);
    });
  }
}

/** The client side: asks the node with this data folder for a setup code. Used by the node-access CLI. */
export const requestSetupCode = async (dataDir: string): Promise<CreatedSetupCode> => {
  const location = localControlSocketPath(dataDir);
  if (!location.ok) throw new Error(location.message);
  return new Promise<CreatedSetupCode>((resolve, reject) => {
    let received = "";
    const socket = net.createConnection(location.path, () => socket.write(`${SETUP_CODE_REQUEST}\n`));
    socket.setEncoding("utf8");
    socket.setTimeout(5_000, () => socket.destroy(new Error("The node did not answer in time.")));
    socket.on("data", (chunk: string) => { received += chunk; });
    socket.on("error", (error) => reject(new Error(`The node is not reachable at ${location.path}: ${error.message}`)));
    socket.on("end", () => {
      try {
        const reply = JSON.parse(received) as Partial<CreatedSetupCode> & { error?: string };
        if (typeof reply.setupCode === "string" && typeof reply.expiresAt === "string") {
          resolve({ setupCode: reply.setupCode, expiresAt: reply.expiresAt });
        } else {
          reject(new Error(`The node refused the request: ${reply.error ?? "no setup code"}`));
        }
      } catch {
        reject(new Error("The node's answer could not be read."));
      }
    });
  });
};
