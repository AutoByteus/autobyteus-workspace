import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerPrivateNetworkRoutes } from "../../../src/api/rest/private-network.js";
import { FoundNodes } from "../../../src/private-network/found-nodes.js";
import { NodeInfoResponder } from "../../../src/private-network/node-info-responder.js";
import { PrivateNetworkListener } from "../../../src/private-network/private-network-listener.js";
import { PrivateNetworkUnavailableError, type PrivateNetworkMachine } from "../../../src/private-network/private-network-role.js";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { PeerConnector } from "../../../src/remote-collaboration/channel/peer-connector.js";
import { startFakeNetworkRelay } from "../../helpers/fake-network-relay.js";
import { registerTestNodeAccess } from "../../helpers/node-access-test-gate.js";
import { testSigner } from "../../helpers/peer-node-keys.js";

/**
 * autobyteus-661 design DS-3, contract §4 and §4b (REQ-004, REQ-018, AC-003): the Found lists. Every online machine of
 * the private network but this one is asked who it is through the network relay; visible AutoByteus nodes answer.
 */

const SELF = "srv_self_node_000000000000000000000000";
const B = "srv_node_b_00000000000000000000000000";
const C = "srv_node_c_00000000000000000000000000";
const PAIRED = "srv_paired_000000000000000000000000000";
const machine = (id: string, ip: string, overrides: Partial<PrivateNetworkMachine> = {}): PrivateNetworkMachine =>
  ({ name: id.replace("machine-", ""), ip, id, account: "ryan@example.com", sharedBy: null, online: true, ...overrides });
const JOINED = { state: "joined" as const, machine: { name: "home-mac", ip: "100.88.10.10", id: "machine-self", account: "ryan@example.com" }, message: "Connected as home-mac." };

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

const found = (input: {
  status?: () => Promise<typeof JOINED | { state: "expired"; machine: null; message: string }>;
  machines?: PrivateNetworkMachine[];
  answers?: Record<string, { nodeId: string; name: string } | null>;
  local?: { nodeId: string; name: string; address: string }[];
}) => {
  const fetchNodeInfo = vi.fn(async (address: string, _machine: string, _timeoutMs: number) => input.answers?.[address] ?? null);
  return {
    fetchNodeInfo,
    found: new FoundNodes({
      role: { status: input.status ?? (async () => JOINED), machines: async () => input.machines ?? [] },
      info: { fetchNodeInfo },
      peers: { list: async () => [{ nodeId: PAIRED }] },
      ownNodeId: async () => SELF,
      ...(input.local ? { localNetwork: { found: () => input.local! } } : {}),
    }),
  };
};

describe("FoundNodes", () => {
  it("REQ-004 asks each online machine but this one at its private address; lists visible nodes that are neither this node nor paired, marked yours or someone else's", async () => {
    const f = found({
      machines: [
        machine("machine-self", "100.88.10.10"),
        machine("machine-linux", "100.88.80.80"),
        machine("machine-bob", "100.88.80.81", { account: "bob@example.com" }),
        machine("machine-shared", "100.88.80.82", { account: "carol@example.com", sharedBy: "carol@example.com" }),
        machine("machine-off", "100.88.80.83", { online: false }),
        machine("machine-printer", "100.88.80.84"),
        machine("machine-paired", "100.88.80.85"),
      ],
      answers: {
        "http://100.88.80.80:8000": { nodeId: B, name: "linux-box" },
        "http://100.88.80.81:8000": { nodeId: C, name: "bob-laptop" },
        "http://100.88.80.82:8000": { nodeId: "srv_node_d_00000000000000000000000000", name: "carol-nas" },
        "http://100.88.80.85:8000": { nodeId: PAIRED, name: "already" },
      },
    });
    const list = await f.found.list();
    expect(list.privateNetwork.state).toBe("joined");
    expect(list.privateNetwork.nodes).toEqual([
      { nodeId: B, name: "linux-box", address: "http://100.88.80.80:8000", machine: { id: "machine-linux", name: "linux", account: "ryan@example.com", sharedBy: null }, mine: true },
      { nodeId: C, name: "bob-laptop", address: "http://100.88.80.81:8000", machine: { id: "machine-bob", name: "bob", account: "bob@example.com", sharedBy: null }, mine: false },
      { nodeId: "srv_node_d_00000000000000000000000000", name: "carol-nas", address: "http://100.88.80.82:8000",
        machine: { id: "machine-shared", name: "shared", account: "carol@example.com", sharedBy: "carol@example.com" }, mine: false },
    ]);
    expect(f.fetchNodeInfo.mock.calls.map(([address, machineId]) => `${machineId}@${address}`)).toEqual([
      "machine-linux@http://100.88.80.80:8000", "machine-bob@http://100.88.80.81:8000", "machine-shared@http://100.88.80.82:8000",
      "machine-printer@http://100.88.80.84:8000", "machine-paired@http://100.88.80.85:8000",
    ]);
  });

  it("REQ-004 lists nothing found on the private network unless joined; says so without Private Network or when the extension cannot answer", async () => {
    await expect(found({ status: async () => ({ state: "expired", machine: null, message: "Sign in again." }) }).found.list())
      .resolves.toMatchObject({ privateNetwork: { state: "expired", message: "Sign in again.", nodes: [] } });
    await expect(found({ status: async () => { throw new PrivateNetworkUnavailableError("PRIVATE_NETWORK_NOT_SET_UP", "Private Network is not set up on this node."); } }).found.list())
      .resolves.toMatchObject({ privateNetwork: { state: "notSetUp", nodes: [] } });
    await expect(found({ status: async () => { throw new Error("the program is not running"); } }).found.list())
      .resolves.toMatchObject({ privateNetwork: { state: "unreachable", message: "the program is not running", nodes: [] } });
  });

  it("REQ-018 local network: leaves out this node, paired nodes and a node already found on the private network (shown once, from there)", async () => {
    const f = found({
      machines: [machine("machine-linux", "100.88.80.80")],
      answers: { "http://100.88.80.80:8000": { nodeId: B, name: "linux-box" } },
      local: [
        { nodeId: B, name: "linux-box", address: "http://192.168.2.124:29695" },
        { nodeId: C, name: "office-pc", address: "http://192.168.2.40:29695" },
        { nodeId: C, name: "office-pc", address: "http://192.168.2.41:29695" },
        { nodeId: SELF, name: "home-mac", address: "http://192.168.2.10:29695" },
        { nodeId: PAIRED, name: "already", address: "http://192.168.2.50:29695" },
      ],
    });
    const list = await f.found.list();
    expect(list.privateNetwork.nodes.map((node) => node.nodeId)).toEqual([B]);
    expect(list.localNetwork).toEqual([{ nodeId: C, name: "office-pc", address: "http://192.168.2.40:29695" }]);
  });
});

describe.skipIf(process.platform === "win32")("FoundNodes over a network", () => {
  it("AC-003 finds the other node through the relay and its caller socket while it is visible, and not after it turns Visible off", async () => {
    // Node B: its HTTP server, its caller socket, its /rest/remote/info.
    const visible = { privateNetwork: true, localNetwork: false };
    const appB = fastify();
    await registerTestNodeAccess(appB, { ownNodeId: B });
    await appB.register(async (rest) => registerPrivateNetworkRoutes(rest, {
      info: new NodeInfoResponder({ visibility: { state: () => visible }, ownNodeId: async () => B, ownName: async () => "linux-box" }),
      role: { relay: async () => { throw new Error("not asked"); } },
    }), { prefix: "/rest" });
    await appB.listen({ host: "127.0.0.1", port: 0 });
    const dataDir = fs.mkdtempSync(path.join("/tmp", "pnf-"));
    const listenerB = new PrivateNetworkListener({ dataDir, httpServer: () => appB.server });
    await listenerB.start();
    cleanups.push(() => fs.rmSync(dataDir, { recursive: true, force: true }), () => appB.close(), () => listenerB.close());

    // The network: this node's relay reaches B's machine and hands the connection to B as coming from this machine.
    const relay = await startFakeNetworkRelay({ route: (authority) => (authority === "100.88.80.80:8000"
      ? { callerSocket: listenerB.socketPath()!, caller: { machine: "machine-self", account: "ryan@example.com", ip: "100.88.10.10" } } : null) });
    const connector = new PeerConnector({ networkRelay: async () => ({ port: relay.port, credential: relay.credential }) });
    cleanups.push(() => relay.close(), () => connector.close());
    const client = new PeerClient({ peers: { findByName: async () => null, findByNodeId: async () => null }, signer: testSigner(), connector, ownNodeId: async () => SELF });
    const foundHere = new FoundNodes({
      role: { status: async () => JOINED, machines: async () => [machine("machine-linux", "100.88.80.80"), machine("machine-empty", "100.88.80.99")] },
      info: client, peers: { list: async () => [] }, ownNodeId: async () => SELF,
    });

    await expect(foundHere.list()).resolves.toMatchObject({ privateNetwork: { state: "joined", nodes: [
      { nodeId: B, name: "linux-box", address: "http://100.88.80.80:8000", machine: { id: "machine-linux" }, mine: true }] } });
    visible.privateNetwork = false;
    await expect(foundHere.list()).resolves.toMatchObject({ privateNetwork: { nodes: [] } });
    // Both machines asked at each refresh (at the same time, so in either order); nothing went around the relay.
    expect([...relay.asked].sort()).toEqual(["100.88.80.80:8000", "100.88.80.80:8000", "100.88.80.99:8000", "100.88.80.99:8000"]);
  });
});
