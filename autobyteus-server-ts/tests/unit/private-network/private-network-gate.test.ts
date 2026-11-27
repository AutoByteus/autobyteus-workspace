import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { getClientIdentity, getPrivateNetworkCaller } from "../../../src/api/security/node-access-gate.js";
import { PrivateNetworkListener } from "../../../src/private-network/private-network-listener.js";
import { NodeKeyPeerVerifier } from "../../../src/remote-collaboration/channel/node-key-peer-verifier.js";
import { registerTestNodeAccess } from "../../helpers/node-access-test-gate.js";
import { testNodeKey, testSigner } from "../../helpers/peer-node-keys.js";

/**
 * autobyteus-661 REQ-003, contract §5: a connection the network program hands over is a private-network connection:
 * admitted by that fact (never as this computer), its caller readable by routes, and a peer request on it accepted
 * only from the peer's paired machine (NAS-47). The node's own TCP port keeps today's admission.
 */

const SELF = "srv_self_node_000000000000000000000000";
const PEER_ON_NETWORK = "srv_peer_network_0000000000000000000000";
const PEER_BY_ADDRESS = "srv_peer_address_0000000000000000000000";
const KEY_NETWORK = testNodeKey();
const KEY_ADDRESS = testNodeKey();

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

const startNode = async () => {
  const dataDir = fs.mkdtempSync(path.join(os.platform() === "win32" ? os.tmpdir() : "/tmp", "png-"));
  const app: FastifyInstance = fastify();
  await registerTestNodeAccess(app, {
    ownNodeId: SELF,
    // Admission refuses every address: only the private network's own admission lets a connection in.
    admission: { admits: async (connection) => connection.privateNetwork === true },
    peerVerifier: new NodeKeyPeerVerifier({
      ownNodeId: async () => SELF,
      peerKey: async (nodeId) => nodeId === PEER_ON_NETWORK ? { publicKey: KEY_NETWORK.publicKeyText, machine: "machine-peer" }
        : nodeId === PEER_BY_ADDRESS ? { publicKey: KEY_ADDRESS.publicKeyText, machine: null } : null,
    }),
  });
  app.post("/rest/remote/availability", async (request) => ({ identity: getClientIdentity(request), caller: getPrivateNetworkCaller(request) }));
  app.post("/rest/remote/pair", async (request) => ({ caller: getPrivateNetworkCaller(request) }));
  await app.listen({ host: "127.0.0.1", port: 0 });
  const listener = new PrivateNetworkListener({ dataDir, httpServer: () => app.server });
  await listener.start();
  cleanups.push(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  cleanups.push(() => app.close());
  cleanups.push(() => listener.close());
  return { app, listener, port: (app.server.address() as net.AddressInfo).port };
};

/** A POST over a raw socket: through the caller socket with a preamble, or to the TCP port. */
const post = (connect: () => net.Socket, preamble: string, route: string, headers: Record<string, string>, body = "{}") =>
  new Promise<{ status: number; body: Record<string, unknown> }>((resolve) => {
    const socket = connect();
    let received = "";
    socket.on("connect", () => {
      const head = [`POST ${route} HTTP/1.1`, "Host: 100.88.80.80:8000", "Content-Type: application/json", `Content-Length: ${Buffer.byteLength(body)}`,
        "Connection: close", ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`)].join("\r\n");
      socket.write(`${preamble}${head}\r\n\r\n${body}`);
    });
    socket.on("data", (chunk) => { received += chunk.toString("utf8"); });
    socket.on("error", () => undefined);
    socket.on("close", () => {
      const status = Number(received.slice(9, 12));
      const text = received.slice(received.indexOf("\r\n\r\n") + 4);
      const json = text.match(/\{.*\}/s)?.[0];
      resolve({ status, body: json ? JSON.parse(json) : {} });
    });
  });
const preambleOf = (machine: string) => `AUTOBYTEUS-CALLER ${JSON.stringify({ machine, account: "ryan@example.com", ip: "100.88.80.81" })}\n`;
const signed = (key: ReturnType<typeof testNodeKey>, from: string, route: string) =>
  testSigner(key).headers({ method: "POST", pathWithQuery: route, fromNodeId: from, toNodeId: SELF, body: "{}" });

describe.skipIf(process.platform === "win32")("the gate and private-network connections", () => {
  it("NAS-47 a peer paired on the private network is admitted from its machine only; its caller is readable by the route", async () => {
    const node = await startNode();
    const viaNetwork = () => net.createConnection(node.listener.socketPath()!);
    const route = "/rest/remote/availability";
    const fromMachine = await post(viaNetwork, preambleOf("machine-peer"), route, await signed(KEY_NETWORK, PEER_ON_NETWORK, route));
    expect(fromMachine).toEqual({ status: 200, body: { identity: { kind: "peer", nodeId: PEER_ON_NETWORK },
      caller: { machine: "machine-peer", account: "ryan@example.com", ip: "100.88.80.81" } } });
    const otherMachine = await post(viaNetwork, preambleOf("machine-thief"), route, await signed(KEY_NETWORK, PEER_ON_NETWORK, route));
    expect(otherMachine).toMatchObject({ status: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
    // A peer paired by plain address is not taken from the private network.
    const byAddress = await post(viaNetwork, preambleOf("machine-peer"), route, await signed(KEY_ADDRESS, PEER_BY_ADDRESS, route));
    expect(byAddress).toMatchObject({ status: 401 });
  });

  it("REQ-003 the private network's admission is its own: the TCP port from this computer is refused here, a handed-over connection is not", async () => {
    const node = await startNode();
    const route = "/rest/remote/availability";
    // This computer (127.0.0.1) is not let in by the private network's rule: loopback gets no special treatment.
    const overTcp = await post(() => net.createConnection(node.port, "127.0.0.1"), "", route, await signed(KEY_NETWORK, PEER_ON_NETWORK, route));
    expect(overTcp).toMatchObject({ status: 403, body: { code: "NODE_NETWORK_REFUSED" } });
    // An exempt pairing message on the private network reaches its route with the caller.
    const pair = await post(() => net.createConnection(node.listener.socketPath()!), preambleOf("machine-asker"), "/rest/remote/pair", {});
    expect(pair).toEqual({ status: 200, body: { caller: { machine: "machine-asker", account: "ryan@example.com", ip: "100.88.80.81" } } });
  });

  it("credentials still apply on the private network: an unsigned request to a peer route is refused", async () => {
    const node = await startNode();
    const unsigned = await post(() => net.createConnection(node.listener.socketPath()!), preambleOf("machine-peer"), "/rest/remote/availability", {});
    expect(unsigned).toMatchObject({ status: 401, body: { code: "NODE_CREDENTIAL_REQUIRED" } });
  });
});
