/**
 * /rest/node-desktop and /ws/node-desktop on a test-owned Fastify server with the Remote Access
 * policy, the shared WebSocket authorization and a fake RFB desktop that counts its connections
 * (AC-003, AC-005; REQ-002, REQ-003). No Xvnc, no Docker.
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/node-desktop --no-watch
 */
import "reflect-metadata";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance, type InjectOptions } from "fastify";
import websocket from "@fastify/websocket";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { registerNodeDesktopRoutes } from "../../../src/api/rest/node-desktop.js";
import { registerRemoteAccessRoutes } from "../../../src/api/rest/remote-access.js";
import { registerRemoteAccessPolicyPlugin } from "../../../src/api/security/remote-access-policy-plugin.js";
import { resetRemoteAccessRoutePolicyForTests } from "../../../src/api/security/remote-access-route-policy.js";
import { registerNodeDesktopWebsocket } from "../../../src/api/websocket/node-desktop.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { STARTER_SOCKET_ENV } from "../../../src/node-update/starter-client.js";
import type { CreatePairingSessionResult, PairingExchangeResult } from "../../../src/remote-access/domain/models.js";
import { resetRemoteAccessAuthServiceForTests } from "../../../src/remote-access/services/remote-access-auth-service.js";
import {
  configureNodeIdentityCapability,
  resetNodeIdentityServiceForTests,
} from "../../../src/remote-access/services/node-identity-service.js";
import { resetPairedDeviceServiceForTests } from "../../../src/remote-access/services/paired-device-service.js";
import { resetRemoteAccessPairingServiceForTests } from "../../../src/remote-access/services/remote-access-pairing-service.js";
import { resetRemoteAccessSettingsServiceForTests } from "../../../src/remote-access/services/remote-access-settings-service.js";
import { resetPairedDeviceStoreForTests } from "../../../src/remote-access/stores/paired-device-store.js";
import { resetRemoteAccessSettingsStoreForTests } from "../../../src/remote-access/stores/remote-access-settings-store.js";

const RFB_VERSION = Buffer.from("RFB 003.008\n", "latin1");
const OWNER_ADDRESS = "100.64.1.2";

type Outcome =
  | { kind: "open-then-closed"; firstMessage: Buffer | null; code: number; reason: string }
  | { kind: "http"; statusCode: number };

describe("node desktop routes", () => {
  let app: FastifyInstance;
  let appDataDir: string;
  let baseUrl: string;
  let desktop: net.Server;
  let desktopConnections: number;
  let nodeHasDesktop: boolean;

  beforeEach(async () => {
    appDataDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-node-desktop-routes-"));
    resetRemoteAccessSingletons();
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir });
    configureNodeIdentityCapability(true);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    desktopConnections = 0;
    desktop = net.createServer((socket) => {
      desktopConnections += 1;
      socket.on("error", () => undefined);
      socket.write(RFB_VERSION);
    });
    await new Promise<void>((resolve) => desktop.listen(0, "127.0.0.1", resolve));
    const desktopPort = (desktop.address() as AddressInfo).port;
    nodeHasDesktop = true;

    app = fastify();
    await app.register(websocket);
    await registerRemoteAccessPolicyPlugin(app);
    await app.register(async (restApp) => {
      await registerRemoteAccessRoutes(restApp);
      await registerNodeDesktopRoutes(restApp);
    }, { prefix: "/rest" });
    await registerNodeDesktopWebsocket(app, () => (nodeHasDesktop ? { host: "127.0.0.1", port: desktopPort } : null));
    await app.listen({ host: "127.0.0.1", port: 0 });
    baseUrl = `ws://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env[STARTER_SOCKET_ENV];
    await app.close();
    await new Promise<void>((resolve) => desktop.close(() => resolve()));
    await rm(appDataDir, { recursive: true, force: true });
    resetRemoteAccessSingletons();
    appConfigProvider.resetForTests();
  });

  const connect = (pathAndQuery: string): Promise<Outcome> =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(`${baseUrl}${pathAndQuery}`);
      let firstMessage: Buffer | null = null;
      let opened = false;
      socket.on("open", () => { opened = true; });
      socket.on("message", (data: Buffer) => {
        firstMessage ??= data;
        socket.close(1000);
      });
      socket.on("unexpected-response", (_request, response) => {
        resolve({ kind: "http", statusCode: response.statusCode ?? 0 });
        socket.terminate();
      });
      socket.on("close", (code, reason) => {
        if (opened) resolve({ kind: "open-then-closed", firstMessage, code, reason: reason.toString() });
      });
      socket.on("error", (error) => {
        if (!opened) return;
        reject(error);
      });
    });

  it("GET /rest/node-desktop reports a node desktop exactly on a Docker node", async () => {
    const withoutStarter = await app.inject({ method: "GET", url: "/rest/node-desktop" });
    expect(withoutStarter.statusCode).toBe(200);
    expect(withoutStarter.json()).toEqual({ available: false });

    process.env[STARTER_SOCKET_ENV] = "/run/autobyteus/starter.sock";
    const withStarter = await app.inject({ method: "GET", url: "/rest/node-desktop" });
    expect(withStarter.json()).toEqual({ available: true });
  });

  it("streams the node desktop to a trusted viewer in either mode", async () => {
    for (const mode of ["view", "control"]) {
      const outcome = await connect(`/ws/node-desktop?mode=${mode}`);
      expect(outcome).toMatchObject({ kind: "open-then-closed", code: 1000 });
      expect((outcome as { firstMessage: Buffer }).firstMessage).toEqual(RFB_VERSION);
    }
    expect(desktopConnections).toBe(2);
  });

  it("refuses every other query with 4400 before any desktop connection (AC-003)", async () => {
    const queries = [
      "",
      "?mode=",
      "?mode=edit",
      "?mode=VIEW",
      "?mode=view&mode=control",
      "?mode=view&host=10.0.0.5&port=5900",
      "?mode=view&target=10.0.0.5:5900",
      "?mode=view&url=ws://10.0.0.5:6080",
      "?mode=view&password=x",
      "?mode=view&access_token=a&access_token=b",
    ];
    for (const query of queries) {
      expect(await connect(`/ws/node-desktop${query}`), query).toEqual({
        kind: "open-then-closed",
        firstMessage: null,
        code: 4400,
        reason: "NODE_DESKTOP_INVALID_REQUEST",
      });
    }
    for (const variant of ["/ws/node-desktop/", "/ws/node-desktop/5900?mode=view", "/ws/node-desktop/10.0.0.5:5900?mode=view"]) {
      expect(await connect(variant), variant).toEqual({ kind: "http", statusCode: 404 });
    }
    expect(desktopConnections).toBe(0);
  });

  it("answers 4404 NODE_DESKTOP_UNAVAILABLE on a node without a node desktop", async () => {
    nodeHasDesktop = false;
    expect(await connect("/ws/node-desktop?mode=view")).toEqual({
      kind: "open-then-closed",
      firstMessage: null,
      code: 4404,
      reason: "NODE_DESKTOP_UNAVAILABLE",
    });
    expect(desktopConnections).toBe(0);
  });

  it("refuses invalid, revoked and disabled phone credentials before any desktop connection (AC-005)", async () => {
    expect(await connect("/ws/node-desktop?mode=view&access_token=mra_not-a-real-credential")).toMatchObject({
      kind: "open-then-closed",
      code: 4401,
    });

    await setPhoneAccess(true);
    const revoked = await pairPhone("Revoked Phone");
    const active = await pairPhone("Active Phone");
    await revokeDevice(revoked.device.deviceId);
    expect(await connect(`/ws/node-desktop?mode=control&access_token=${encodeURIComponent(revoked.credential)}`))
      .toEqual({ kind: "open-then-closed", firstMessage: null, code: 4403, reason: "REMOTE_ACCESS_DEVICE_REVOKED" });

    // The shared policy admits a paired phone (DEC-S1-1)...
    const admitted = await connect(`/ws/node-desktop?mode=view&access_token=${encodeURIComponent(active.credential)}`);
    expect(admitted).toMatchObject({ kind: "open-then-closed", code: 1000 });
    expect(desktopConnections).toBe(1);

    // ...until Phone Access is turned off.
    await setPhoneAccess(false);
    expect(await connect(`/ws/node-desktop?mode=view&access_token=${encodeURIComponent(active.credential)}`))
      .toEqual({ kind: "open-then-closed", firstMessage: null, code: 4403, reason: "PHONE_ACCESS_DISABLED" });
    expect(desktopConnections).toBe(1);
  });

  type HeldStream = { socket: WebSocket; closed: Promise<{ code: number; reason: string; at: number }> };

  /** Opens a stream and keeps it open once the desktop's RFB version has arrived. */
  const hold = (query: string): Promise<HeldStream> =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(`${baseUrl}/ws/node-desktop${query}`);
      held.push(socket);
      const closed = new Promise<{ code: number; reason: string; at: number }>((done) => {
        socket.on("close", (code, reason) => done({ code, reason: reason.toString(), at: Date.now() }));
      });
      socket.on("error", () => undefined);
      socket.once("message", () => resolve({ socket, closed }));
      closed.then((close) => reject(new Error(`closed before streaming: ${close.code} ${close.reason}`)));
    });
  const held: WebSocket[] = [];
  afterEach(() => {
    for (const socket of held.splice(0)) socket.terminate();
  });

  it("refuses a 5th stream node-wide with 4429 before any desktop connection (AC-021)", async () => {
    for (let index = 0; index < 4; index += 1) await hold("?mode=view");
    expect(desktopConnections).toBe(4);
    expect(await connect("/ws/node-desktop?mode=control")).toEqual({
      kind: "open-then-closed", firstMessage: null, code: 4429, reason: "NODE_DESKTOP_TOO_MANY_VIEWERS",
    });
    expect(desktopConnections).toBe(4);

    // A place frees up when a stream ends.
    held[0]!.close(1000);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await connect("/ws/node-desktop?mode=view")).toMatchObject({ kind: "open-then-closed", code: 1000 });
  });

  it("refuses a 3rd stream from one phone with 4429 while other viewers still fit (AC-021)", async () => {
    await setPhoneAccess(true);
    const phone = await pairPhone("Busy Phone");
    const token = encodeURIComponent(phone.credential);
    await hold(`?mode=view&access_token=${token}`);
    await hold(`?mode=view&access_token=${token}`);
    expect(await connect(`/ws/node-desktop?mode=view&access_token=${token}`)).toEqual({
      kind: "open-then-closed", firstMessage: null, code: 4429, reason: "NODE_DESKTOP_TOO_MANY_VIEWERS",
    });
    expect(desktopConnections).toBe(2);
    expect(await connect("/ws/node-desktop?mode=view")).toMatchObject({ kind: "open-then-closed", code: 1000 });
    expect(desktopConnections).toBe(3);
  });

  it("ends an open phone stream within 25 s of its revocation; a reconnect is refused (AC-012)", { timeout: 40_000 }, async () => {
    await setPhoneAccess(true);
    const phone = await pairPhone("Revoked While Watching");
    const other = await pairPhone("Still Paired");
    const stream = await hold(`?mode=view&access_token=${encodeURIComponent(phone.credential)}`);
    const otherStream = await hold(`?mode=view&access_token=${encodeURIComponent(other.credential)}`);
    const trustedStream = await hold("?mode=view");

    const revokedAt = Date.now();
    await revokeDevice(phone.device.deviceId);
    const close = await stream.closed;

    expect({ code: close.code, reason: close.reason }).toEqual({ code: 4403, reason: "REMOTE_ACCESS_DEVICE_REVOKED" });
    expect(close.at - revokedAt).toBeLessThanOrEqual(25_000);
    expect(otherStream.socket.readyState).toBe(WebSocket.OPEN);
    expect(trustedStream.socket.readyState).toBe(WebSocket.OPEN);
    expect(await connect(`/ws/node-desktop?mode=view&access_token=${encodeURIComponent(phone.credential)}`))
      .toEqual({ kind: "open-then-closed", firstMessage: null, code: 4403, reason: "REMOTE_ACCESS_DEVICE_REVOKED" });
  });

  it("ends open phone streams within 25 s of Phone Access being turned off (AC-012)", { timeout: 40_000 }, async () => {
    await setPhoneAccess(true);
    const phone = await pairPhone("Watching Phone");
    const stream = await hold(`?mode=control&access_token=${encodeURIComponent(phone.credential)}`);
    const trustedStream = await hold("?mode=view");

    const disabledAt = Date.now();
    await setPhoneAccess(false);
    const close = await stream.closed;

    expect({ code: close.code, reason: close.reason }).toEqual({ code: 4403, reason: "PHONE_ACCESS_DISABLED" });
    expect(close.at - disabledAt).toBeLessThanOrEqual(25_000);
    expect(trustedStream.socket.readyState).toBe(WebSocket.OPEN);
  });

  async function setPhoneAccess(enabled: boolean): Promise<void> {
    const response = await inject("PUT", "/rest/remote-access/settings", { phoneAccessEnabled: enabled });
    expect(response.statusCode).toBe(200);
  }

  async function pairPhone(deviceName: string): Promise<PairingExchangeResult> {
    const session = (await inject("POST", "/rest/remote-access/pairing-sessions", {
      connectionWay: "tailscale",
      serverBaseUrl: "https://desktop.tailnet.ts.net/mobile",
      serverName: "AutoByteus Desktop",
    })).json() as CreatePairingSessionResult;
    const exchange = await inject("POST", "/rest/remote-access/pairing-exchanges", {
      pairingCode: session.payload.pairingCode,
      serverBaseUrl: session.mobileUrl.split("?", 1)[0],
      deviceName,
    });
    expect(exchange.statusCode).toBe(201);
    return exchange.json() as PairingExchangeResult;
  }

  async function revokeDevice(deviceId: string): Promise<void> {
    const response = await inject("DELETE", `/rest/remote-access/devices/${encodeURIComponent(deviceId)}`);
    expect(response.statusCode).toBe(200);
  }

  function inject(method: InjectOptions["method"], url: string, payload?: InjectOptions["payload"]) {
    return app.inject({ method, url, payload, remoteAddress: OWNER_ADDRESS });
  }
});

function resetRemoteAccessSingletons(): void {
  resetRemoteAccessRoutePolicyForTests();
  resetRemoteAccessAuthServiceForTests();
  resetRemoteAccessPairingServiceForTests();
  resetRemoteAccessSettingsServiceForTests();
  resetNodeIdentityServiceForTests();
  resetPairedDeviceServiceForTests();
  resetRemoteAccessSettingsStoreForTests();
  resetPairedDeviceStoreForTests();
}
