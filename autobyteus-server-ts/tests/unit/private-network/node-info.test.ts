import "reflect-metadata";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerPrivateNetworkRoutes } from "../../../src/api/rest/private-network.js";
import { routeAccessFor } from "../../../src/api/security/node-route-permissions.js";
import { NodeInfoResponder } from "../../../src/private-network/node-info-responder.js";
import { LOCAL_NETWORK_VISIBLE_SETTING, NodeVisibility, PRIVATE_NETWORK_VISIBLE_SETTING } from "../../../src/private-network/node-visibility.js";
import { PrivateNetworkListener } from "../../../src/private-network/private-network-listener.js";
import { registerTestNodeAccess } from "../../helpers/node-access-test-gate.js";

/**
 * autobyteus-661 contract §1, §2, §4, §4b (REQ-004, REQ-005, REQ-018): the two visibility switches, off by default, and
 * `POST /rest/remote/info`, which answers who this node is only on a network it is visible on, and otherwise exactly as a
 * server without the route.
 */

const SELF = "srv_self_node_000000000000000000000000";
const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

const settingsStore = (initial: Record<string, boolean> = {}) => {
  const values = new Map(Object.entries(initial));
  return { values, settings: { getBooleanSetting: (key: string) => values.get(key) ?? null, setBooleanSetting: (key: string, on: boolean) => { values.set(key, on); } } };
};

describe("NodeVisibility", () => {
  it("REQ-005 REQ-018 both switches are off by default and set one at a time", async () => {
    const f = settingsStore();
    const visibility = new NodeVisibility({ settings: f.settings, localNetworkAllowed: async () => true });
    expect(visibility.state()).toEqual({ privateNetwork: false, localNetwork: false });
    await expect(visibility.set({ privateNetwork: true })).resolves.toEqual({ privateNetwork: true, localNetwork: false });
    await expect(visibility.set({ localNetwork: true })).resolves.toEqual({ privateNetwork: true, localNetwork: true });
    expect(Object.fromEntries(f.values)).toEqual({ [PRIVATE_NETWORK_VISIBLE_SETTING]: true, [LOCAL_NETWORK_VISIBLE_SETTING]: true });
  });

  it("REQ-018 the local switch turns on only while this node accepts connections from its local network; off is always allowed", async () => {
    const f = settingsStore({ [LOCAL_NETWORK_VISIBLE_SETTING]: true });
    const visibility = new NodeVisibility({ settings: f.settings, localNetworkAllowed: async () => false });
    await expect(visibility.set({ localNetwork: true })).rejects.toMatchObject({ code: "LOCAL_NETWORK_NOT_ALLOWED" });
    await expect(visibility.set({ localNetwork: false, privateNetwork: true })).resolves.toEqual({ privateNetwork: true, localNetwork: false });
  });
});

describe("NodeInfoResponder", () => {
  it("REQ-004 REQ-005 answers on the private network only while visible there, and elsewhere only while visible on the local network", async () => {
    const state = { privateNetwork: false, localNetwork: false };
    const responder = new NodeInfoResponder({ visibility: { state: () => state }, ownNodeId: async () => SELF, ownName: async () => "home-mac" });
    const caller = { machine: "m", account: null, ip: "100.1.1.1" };
    await expect(responder.answer(caller)).resolves.toBeNull();
    await expect(responder.answer(null)).resolves.toBeNull();
    state.privateNetwork = true;
    await expect(responder.answer(caller)).resolves.toEqual({ nodeId: SELF, name: "home-mac" });
    await expect(responder.answer(null)).resolves.toBeNull();
    state.localNetwork = true; state.privateNetwork = false;
    await expect(responder.answer(null)).resolves.toEqual({ nodeId: SELF, name: "home-mac" });
    await expect(responder.answer(caller)).resolves.toBeNull();
  });
});

describe.skipIf(process.platform === "win32")("POST /rest/remote/info", () => {
  it("is exempt (no credential: an asking node is no peer yet), and answers over each network by its own switch", async () => {
    expect(routeAccessFor({ method: "POST", route: "/rest/remote/info", isWebSocketUpgrade: false }).kind).toBe("exempt");
    const state = { privateNetwork: true, localNetwork: false };
    const app = fastify();
    await registerTestNodeAccess(app, { ownNodeId: SELF });
    await app.register(async (rest) => registerPrivateNetworkRoutes(rest, {
      info: new NodeInfoResponder({ visibility: { state: () => state }, ownNodeId: async () => SELF, ownName: async () => "home-mac" }),
      role: { relay: async () => { throw new Error("not asked here"); } },
    }), { prefix: "/rest" });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const dataDir = fs.mkdtempSync(path.join("/tmp", "pni-"));
    const listener = new PrivateNetworkListener({ dataDir, httpServer: () => app.server });
    await listener.start();
    cleanups.push(() => fs.rmSync(dataDir, { recursive: true, force: true }), () => app.close(), () => listener.close());

    const ask = (connect: () => net.Socket, preamble = "") => new Promise<{ status: number; body: unknown }>((resolve) => {
      const socket = connect();
      let received = "";
      socket.on("connect", () => socket.write(`${preamble}POST /rest/remote/info HTTP/1.1\r\nHost: x\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`));
      socket.on("data", (chunk) => { received += chunk.toString("utf8"); });
      socket.on("close", () => resolve({ status: Number(received.slice(9, 12)), body: JSON.parse(received.slice(received.indexOf("\r\n\r\n") + 4).match(/\{.*\}/s)![0]) }));
    });
    const overNetwork = () => ask(() => net.createConnection(listener.socketPath()!), `AUTOBYTEUS-CALLER ${JSON.stringify({ machine: "m", account: null, ip: "100.1.1.2" })}\n`);
    const overLan = () => ask(() => net.createConnection((app.server.address() as net.AddressInfo).port, "127.0.0.1"));
    await expect(overNetwork()).resolves.toEqual({ status: 200, body: { nodeId: SELF, name: "home-mac" } });
    // Not visible on the local network: the answer of a server without the route (Fastify's own "not found" shape).
    await expect(overLan()).resolves.toEqual({ status: 404, body: { message: "Route POST:/rest/remote/info not found", error: "Not Found", statusCode: 404 } });
    state.privateNetwork = false; state.localNetwork = true;
    await expect(overNetwork()).resolves.toMatchObject({ status: 404 });
    await expect(overLan()).resolves.toEqual({ status: 200, body: { nodeId: SELF, name: "home-mac" } });
  });
});

describe("GET /rest/private-network/relay", () => {
  const OWNER = `own_${"o".repeat(43)}`;
  const PHONE = `mra_${"p".repeat(43)}`;
  const withRole = async (relay: () => Promise<{ port: number; credential: string }>) => {
    const app = fastify();
    await registerTestNodeAccess(app, {
      launchCredential: OWNER,
      verifiers: [{ prefix: "mra_", verify: (credential) => credential === PHONE
        ? { ok: true, identity: { kind: "phone", deviceId: "phone-1" } }
        : { ok: false, refusal: { code: "NODE_CREDENTIAL_INVALID", message: "no" } as never } }],
    });
    await app.register(async (rest) => registerPrivateNetworkRoutes(rest, {
      info: new NodeInfoResponder({ visibility: { state: () => ({ privateNetwork: false, localNetwork: false }) }, ownNodeId: async () => SELF, ownName: async () => "x" }),
      role: { relay },
    }), { prefix: "/rest" });
    cleanups.push(() => app.close());
    return (authorization?: string) => app.inject({ method: "GET", url: "/rest/private-network/relay", headers: authorization ? { authorization: `Bearer ${authorization}` } : {} });
  };

  it("NAS-54 gives the network relay's port and credential to the owner only (the desktop's proxy); a phone or no credential is refused", async () => {
    const access = routeAccessFor({ method: "GET", route: "/rest/private-network/relay", isWebSocketUpgrade: false });
    expect(access.kind === "clients" ? [...access.permitted] : access.kind).toEqual(["owner"]);
    const get = await withRole(async () => ({ port: 41000, credential: "relay-credential" }));
    const answer = await get(OWNER);
    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toEqual({ port: 41000, credential: "relay-credential" });
    expect(answer.headers["cache-control"]).toBe("no-store");
    expect((await get(PHONE)).statusCode).toBe(403);
    expect((await get()).statusCode).toBe(401);
  });

  it("says Private Network is not set up (409), and passes on an extension that cannot answer (502)", async () => {
    const { PrivateNetworkUnavailableError } = await import("../../../src/private-network/private-network-role.js");
    const { ExtensionError } = await import("../../../src/extensions/domain/extension-error.js");
    const notSetUp = await withRole(async () => { throw new PrivateNetworkUnavailableError("PRIVATE_NETWORK_NOT_SET_UP", "Private Network is not set up on this node."); });
    expect((await notSetUp(OWNER)).statusCode).toBe(409);
    expect((await notSetUp(OWNER)).json()).toEqual({ code: "PRIVATE_NETWORK_NOT_SET_UP", message: "Private Network is not set up on this node." });
    const stopped = await withRole(async () => { throw new ExtensionError("ACTION_FAILED", "the program is not running"); });
    expect((await stopped(OWNER)).statusCode).toBe(502);
    expect((await stopped(OWNER)).json()).toEqual({ code: "ACTION_FAILED", message: "the program is not running" });
  });
});
