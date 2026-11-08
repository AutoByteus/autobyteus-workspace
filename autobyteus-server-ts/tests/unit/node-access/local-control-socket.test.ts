import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LocalControlSocket,
  localControlSocketPath,
  requestSetupCode,
} from "../../../src/node-access/services/local-control-socket.js";

/** Design M-2: setup codes on demand through the node's local control socket, never in a file or a log. */

const roots: string[] = [];
const sockets: LocalControlSocket[] = [];
afterEach(async () => {
  await Promise.all(sockets.splice(0).map((socket) => socket.close()));
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
// A short folder: Unix socket paths are limited to about 104 bytes.
const dataDir = async () => { const dir = await fs.mkdtemp(path.join("/tmp", "ab-lcs-")); roots.push(dir); return dir; };

describe.skipIf(process.platform === "win32")("LocalControlSocket", () => {
  it("NAS-32 answers `setup-code` with a fresh code on the node's own computer; the socket is mode 0600 in a 0700 folder", async () => {
    const dir = await dataDir();
    const create = vi.fn(() => ({ setupCode: "code-one", expiresAt: "2026-11-08T10:30:00.000Z" }));
    const socket = new LocalControlSocket(dir, { create });
    sockets.push(socket);
    await socket.start();
    const socketPath = path.join(dir, "node-access", "local-control.sock");
    expect((await fs.stat(socketPath)).mode & 0o777).toBe(0o600);
    expect((await fs.stat(path.dirname(socketPath))).mode & 0o777).toBe(0o700);
    await expect(requestSetupCode(dir)).resolves.toEqual({ setupCode: "code-one", expiresAt: "2026-11-08T10:30:00.000Z" });
    expect(create).toHaveBeenCalledOnce();
    expect(await fs.readdir(path.join(dir, "node-access"))).toEqual(["local-control.sock"]);
  });

  it("refuses any other request, and a client of a node that is not running is told so", async () => {
    const dir = await dataDir();
    const socket = new LocalControlSocket(dir, { create: () => ({ setupCode: "x", expiresAt: "y" }) });
    sockets.push(socket);
    await socket.start();
    const net = await import("node:net");
    const answer = await new Promise<string>((resolve) => {
      let received = "";
      const client = net.createConnection(path.join(dir, "node-access", "local-control.sock"), () => client.write("owner-credential\n"));
      client.on("data", (chunk) => { received += chunk.toString(); });
      client.on("end", () => resolve(received));
    });
    expect(JSON.parse(answer)).toEqual({ error: "UNKNOWN_REQUEST" });
    await socket.close();
    await expect(requestSetupCode(dir)).rejects.toThrow(/not reachable/);
  });

  it("a data folder whose socket path is too long gets a clear error, and the node starts without the socket", async () => {
    const longDir = path.join("/tmp", "a".repeat(90));
    expect(localControlSocketPath(longDir)).toMatchObject({ ok: false, message: expect.stringContaining("Use a shorter data folder path") });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await new LocalControlSocket(longDir, { create: () => ({ setupCode: "x", expiresAt: "y" }) }).start();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("local control socket not opened"));
    error.mockRestore();
    await expect(requestSetupCode(longDir)).rejects.toThrow(/shorter data folder/);
  });
});

describe("localControlSocketPath", () => {
  it("uses a current-user named pipe derived from the data folder on Windows", () => {
    const pipe = localControlSocketPath("C:\\Users\\me\\AppData\\autobyteus", "win32");
    expect(pipe).toMatchObject({ ok: true, path: expect.stringMatching(/^\\\\\.\\pipe\\autobyteus-node-[0-9a-f]{24}$/) });
  });
});
