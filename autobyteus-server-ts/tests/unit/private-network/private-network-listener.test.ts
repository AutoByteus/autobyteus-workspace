import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  callerSocketLocation,
  parseCallerPreamble,
  PrivateNetworkListener,
  privateNetworkCallerOf,
} from "../../../src/private-network/private-network-listener.js";

/**
 * autobyteus-661 DS-2, REQ-003: the network program hands each private-network connection to the node over the caller
 * socket with one preamble line; the node's HTTP server then serves it, and only such a connection carries a caller.
 * The hand-over runs on every platform: a Unix socket (a short temp folder keeps its path under the platform limit), and
 * on Windows a named pipe (AR-005; run on a GitHub Actions Windows runner, check 12 of PoC 2a).
 */

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

const CALLER = { machine: "nKxQ7-stable", account: "ryan@example.com", ip: "100.88.80.80" };

const startNode = async () => {
  const dataDir = fs.mkdtempSync(path.join(os.platform() === "win32" ? os.tmpdir() : "/tmp", "pn-"));
  // The node's HTTP server: answers with the caller its gate would see.
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ caller: privateNetworkCallerOf(request.socket), url: request.url }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const listener = new PrivateNetworkListener({ dataDir, httpServer: () => server });
  await listener.start();
  cleanups.push(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  cleanups.push(() => new Promise<void>((resolve) => server.close(() => resolve())));
  cleanups.push(() => listener.close());
  cleanups.push(() => { server.closeAllConnections(); });
  return { dataDir, server, listener, port: (server.address() as net.AddressInfo).port };
};

/** One raw exchange: what the network program would write, and everything the node answers. */
const exchange = (connect: () => net.Socket, payload: string) => new Promise<{ answer: string; closed: boolean }>((resolve) => {
  const socket = connect();
  let answer = "";
  socket.on("connect", () => socket.write(payload));
  socket.on("data", (chunk) => { answer += chunk.toString("utf8"); if (answer.includes("}") && answer.includes("\r\n\r\n")) socket.end(); });
  socket.on("error", () => undefined);
  socket.on("close", () => resolve({ answer, closed: true }));
});
const request = (url = "/rest/health") => `GET ${url} HTTP/1.1\r\nHost: 100.88.80.80:8000\r\nConnection: close\r\n\r\n`;
const bodyOf = (answer: string) => JSON.parse(answer.slice(answer.indexOf("\r\n\r\n") + 4).match(/\{.*\}/s)![0]);

describe("PrivateNetworkListener (Unix socket; named pipe on Windows)", () => {
  it("REQ-003 AR-005: a handed-over connection is served by the node's HTTP server, with the caller its preamble names", async () => {
    const node = await startNode();
    if (process.platform === "win32") {
      expect(node.listener.socketPath()).toMatch(/^\\\\\.\\pipe\\autobyteus-private-network-[0-9a-f]{24}$/);
    } else {
      expect(node.listener.socketPath()).toBe(path.join(path.resolve(node.dataDir), "private-network", "caller.sock"));
      expect(fs.statSync(node.listener.socketPath()!).mode & 0o777).toBe(0o600);
      expect(fs.statSync(path.dirname(node.listener.socketPath()!)).mode & 0o777).toBe(0o700);
    }
    const { answer } = await exchange(() => net.createConnection(node.listener.socketPath()!),
      `AUTOBYTEUS-CALLER ${JSON.stringify(CALLER)}\n${request("/rest/remote/info?x=1")}`);
    expect(answer).toMatch(/^HTTP\/1\.1 200/);
    expect(bodyOf(answer)).toEqual({ caller: CALLER, url: "/rest/remote/info?x=1" });
  });

  it("REQ-003: the node's TCP port gives no caller, whatever the client writes (a forged preamble or header)", async () => {
    const node = await startNode();
    const forged = `GET /rest/health HTTP/1.1\r\nHost: x\r\nX-AutoByteus-Caller: ${JSON.stringify(CALLER)}\r\nConnection: close\r\n\r\n`;
    const { answer } = await exchange(() => net.createConnection(node.port, "127.0.0.1"), forged);
    expect(bodyOf(answer)).toEqual({ caller: null, url: "/rest/health" });
  });

  it("a connection without a valid preamble is closed before the HTTP server sees it", async () => {
    const node = await startNode();
    for (const payload of [request(), `AUTOBYTEUS-CALLER {"account":"x","ip":"100.1.1.1"}\n${request()}`, `AUTOBYTEUS-CALLER not json\n${request()}`,
      `AUTOBYTEUS-CALLER ${"x".repeat(3000)}`]) {
      const { answer } = await exchange(() => net.createConnection(node.listener.socketPath()!), payload);
      expect(answer).toBe("");
    }
  });

  it("a preamble split across writes, and a request body right after it, are read intact", async () => {
    const node = await startNode();
    const answer = await new Promise<string>((resolve) => {
      const socket = net.createConnection(node.listener.socketPath()!);
      let received = "";
      socket.on("connect", async () => {
        const line = `AUTOBYTEUS-CALLER ${JSON.stringify({ ...CALLER, account: null })}\n`;
        socket.write(line.slice(0, 10));
        await new Promise((r) => setTimeout(r, 20));
        socket.write(line.slice(10) + request("/split"));
      });
      socket.on("data", (chunk) => { received += chunk.toString("utf8"); });
      socket.on("close", () => resolve(received));
    });
    expect(bodyOf(answer)).toEqual({ caller: { ...CALLER, account: null }, url: "/split" });
  });

  it("a data folder path too long for a Unix socket is reported, and the node starts without the socket", () => {
    expect(callerSocketLocation(`/tmp/${"d".repeat(120)}`, "linux")).toMatchObject({ ok: false, message: expect.stringContaining("longer than") });
  });
});

describe("caller preamble and socket location", () => {
  it("reads only a well-formed preamble", () => {
    expect(parseCallerPreamble(`AUTOBYTEUS-CALLER ${JSON.stringify(CALLER)}`)).toEqual(CALLER);
    expect(parseCallerPreamble(`AUTOBYTEUS-CALLER {"machine":"m","ip":"100.1.1.1"}`)).toEqual({ machine: "m", account: null, ip: "100.1.1.1" });
    for (const line of ["", "AUTOBYTEUS-CALLER", `CALLER ${JSON.stringify(CALLER)}`, 'AUTOBYTEUS-CALLER {"machine":"","ip":"x"}',
      'AUTOBYTEUS-CALLER {"machine":"m","ip":"x","account":7}', "AUTOBYTEUS-CALLER []"]) {
      expect(parseCallerPreamble(line)).toBeNull();
    }
  });

  it("AR-005: on Windows a named pipe, new at every start; elsewhere <data>/private-network/caller.sock", () => {
    const first = callerSocketLocation("C:\\data", "win32");
    const second = callerSocketLocation("C:\\data", "win32");
    expect(first).toMatchObject({ ok: true, path: expect.stringMatching(/^\\\\\.\\pipe\\autobyteus-private-network-[0-9a-f]{24}$/) });
    expect(first).not.toEqual(second);
    expect(callerSocketLocation("/srv/data", "linux")).toEqual({ ok: true, path: "/srv/data/private-network/caller.sock" });
  });
});
