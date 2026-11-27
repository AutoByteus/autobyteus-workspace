import { createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";

/**
 * Pairing by request across real servers over HTTP (autobyteus-661 contract §2, §3 case 2, §1 key rule; node access
 * model NAS-49…NAS-51, NAS-53). Three built servers (`dist/app.js`), each with its own data root and port on
 * 127.0.0.1: alpha and gamma ask, beta answers. Every step enters where its user does: the owners' GraphQL (the Nodes
 * page's API: Pair, the pending and outstanding lists, Accept, Reject, Cancel, a grant) and, for the impostor of
 * NAS-53, a raw `POST /rest/remote/pair` (the route is exempt: any admitted caller can send it). The cases run in order
 * on the same three nodes:
 *
 * - PRQ-01 Pair → Accept by plain address (AC-005, AC-007): a waiting request on each side, nothing stored until Accept;
 *   then both hold the other (`teammate`) with the other's actual node key, and signed requests work both ways.
 * - PRQ-02 Reject: "declined" on the asking node, nothing stored on either.
 * - PRQ-03 Cancel: a later Accept is refused as withdrawn, and the accepting node removes the record it had saved.
 * - PRQ-04 NAS-53 without a grant: a request naming paired alpha's node ID with another key is refused 409
 *   `PEER_KEY_CONFLICT`; no pending request, alpha's record and key unchanged.
 * - PRQ-05 NAS-53 with a grant: the same with a grant made for alpha (409 `PEER_KEY_CONFLICT`); the grant presented by
 *   another node (gamma, its own key) is refused 403 `PAIRING_GRANT_INVALID` over HTTP and through gamma's Pair; alpha,
 *   whose key it is, then pairs again with the grant (same key: renewed, relation `own`), and a second use is refused.
 *
 * Prerequisite: `pnpm -C autobyteus-server-ts build`. No provider, model or network beyond loopback.
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/pairing-requests-real-servers.e2e.test.ts --no-watch
 */

const serverRoot = path.resolve(import.meta.dirname, "../../..");
const appEntry = path.join(serverRoot, "dist", "app.js");

type Json = Record<string, any>;
type Node = { name: string; port: number; baseUrl: string; dataDir: string; nodeId: string; child: ChildProcessWithoutNullStreams | null; logs: string[] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise<number>((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(typeof address === "object" && address ? address.port : 0));
  });
});

const createNode = async (name: string, root: string): Promise<Node> => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = path.join(root, name);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  return { name, port, baseUrl, dataDir, nodeId: "", child: null, logs: [] };
};

const start = async (node: Node) => {
  node.logs = [];
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
    AUTOBYTEUS_SERVER_HOST: node.baseUrl, APP_ENV: "test", LOG_LEVEL: "WARN", HTTP_ACCESS_LOG_MODE: "off" };
  const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(node.port), "--data-dir", node.dataDir],
    { cwd: serverRoot, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
  const collect = (chunk: Buffer) => node.logs.push(...chunk.toString("utf-8").split(/\r?\n/).filter(Boolean));
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  node.child = child;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${node.name} exited ${child.exitCode}:\n${node.logs.slice(-40).join("\n")}`);
    if (await fetch(`${node.baseUrl}/rest/health`).then((response) => response.ok).catch(() => false)) {
      node.nodeId = (await (await fetch(`${node.baseUrl}/rest/remote-access/status`)).json() as Json).nodeId;
      return;
    }
    await sleep(300);
  }
  throw new Error(`${node.name} did not become healthy:\n${node.logs.slice(-40).join("\n")}`);
};

const stop = async (node: Node) => {
  const child = node.child;
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(15_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
  node.child = null;
};

/** The owner's GraphQL on a node (the test process carries the launch credential): the answer's data and errors. */
const gqlRaw = async (node: Node, query: string, variables?: Json): Promise<{ data?: Json; errors?: Array<{ message: string; extensions?: Json }> }> =>
  (await fetch(`${node.baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json();
const gql = async (node: Node, query: string, variables?: Json): Promise<Json> => {
  const body = await gqlRaw(node, query, variables);
  if (body.errors?.length) throw new Error(`${node.name}: ${JSON.stringify(body.errors)}`);
  return body.data as Json;
};

const PEER_FIELDS = "nodeId name address relation paired";
const peers = async (node: Node): Promise<Json[]> => (await gql(node, `query{ peerNodes{ ${PEER_FIELDS} } }`)).peerNodes;
const peerOf = async (node: Node, other: Node) => (await peers(node)).find((peer) => peer.nodeId === other.nodeId) ?? null;
const pending = async (node: Node): Promise<Json[]> =>
  (await gql(node, "query{ pendingPairRequests{ id nodeId name address machine account } }")).pendingPairRequests;
const outstanding = async (node: Node): Promise<Json[]> =>
  (await gql(node, "query{ outstandingPairRequests{ requestId address state } }")).outstandingPairRequests;
const PAIR = `mutation($address:String!,$addresses:[String!],$grant:String,$nodeId:String,$name:String){
  pairWithNode(address:$address,addresses:$addresses,grant:$grant,nodeId:$nodeId,name:$name){ state requestId peer{ ${PEER_FIELDS} } } }`;
const availability = async (from: Node, to: Node) =>
  (await gql(from, "query($n:String!){ peerNodeAvailability(nodeId:$n){ available refusalCode } }", { n: to.nodeId })).peerNodeAvailability;
/** The public half of a node's own key, as it sends it when pairing (base64 SPKI DER), read from its key file. */
const nodePublicKey = (node: Node): string => createPublicKey(createPrivateKey(fs.readFileSync(path.join(node.dataDir, "remote-collaboration", "node-key.pem"))))
  .export({ type: "spki", format: "der" }).toString("base64");
/** This node's stored record of another node, as written in its peers file. */
const storedRecord = (node: Node, other: Node): Json | null => {
  const file = path.join(node.dataDir, "remote-collaboration", "peers.json");
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  const rows: Json[] = Array.isArray(parsed) ? parsed : parsed.peers ?? [];
  return rows.find((row) => row.nodeId === other.nodeId) ?? null;
};
/** Another Ed25519 key, in the form a pair message carries (base64 SPKI DER). */
const foreignKey = () => generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" }).toString("base64");
/** A raw `POST /rest/remote/pair` as any admitted caller sends it (the route is exempt). */
const rawPair = async (to: Node, body: Json) => {
  const response = await fetch(`${to.baseUrl}/rest/remote/pair`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json().catch(() => null) as Json | null };
};
const errorOf = (answer: { errors?: Array<{ message: string; extensions?: Json }> }) =>
  answer.errors?.[0] ? { code: answer.errors[0].extensions?.code, message: answer.errors[0].message } : null;

describe("pairing by request across real servers (autobyteus-661 contract §3 case 2, NAS-49…51, NAS-53)", () => {
  let root = "";
  const nodes: Node[] = [];
  let alpha: Node, beta: Node, gamma: Node;

  beforeAll(async () => {
    if (!fs.existsSync(appEntry)) throw new Error(`Build the server first (pnpm -C autobyteus-server-ts build): ${appEntry} is missing`);
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "pairing-requests-")));
    alpha = await createNode("alpha", root);
    beta = await createNode("beta", root);
    gamma = await createNode("gamma", root);
    nodes.push(alpha, beta, gamma);
    await Promise.all(nodes.map(start));
  }, 300_000);

  afterAll(async () => {
    await Promise.all(nodes.map(stop));
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }, 120_000);

  it("PRQ-01 AC-005/AC-007, NAS-49: Pair by plain address waits for the other owner; Accept pairs both as teammates with each other's actual key; signed requests work both ways", async () => {
    const asked = (await gql(alpha, PAIR, { address: beta.baseUrl, name: "beta-here" })).pairWithNode;
    expect(asked).toMatchObject({ state: "waiting", peer: null });
    expect(asked.requestId).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(await outstanding(alpha)).toEqual([{ requestId: asked.requestId, address: beta.baseUrl, state: "waiting" }]);
    const waiting = await pending(beta);
    expect(waiting).toHaveLength(1);
    // "<name> at <address> wants to pair": beta reaches alpha at the first of alpha's addresses that answers as alpha.
    expect(waiting[0]).toMatchObject({ nodeId: alpha.nodeId, address: alpha.baseUrl, machine: null, account: null });
    expect(await peerOf(alpha, beta)).toBeNull();
    expect(await peerOf(beta, alpha)).toBeNull();

    const accepted = (await gql(beta, "mutation($id:String!,$name:String){ acceptPairRequest(id:$id,name:$name){ nodeId name address relation paired } }",
      { id: waiting[0].id, name: "alpha-here" })).acceptPairRequest;
    expect(accepted).toEqual({ nodeId: alpha.nodeId, name: "alpha-here", address: alpha.baseUrl, relation: "teammate", paired: true });
    expect(await peerOf(alpha, beta)).toEqual({ nodeId: beta.nodeId, name: "beta-here", address: beta.baseUrl, relation: "teammate", paired: true });
    expect(await outstanding(alpha)).toEqual([]);
    expect(await pending(beta)).toEqual([]);
    // Each holds the other's actual node key (contract §1), not a copy of its own.
    expect(storedRecord(beta, alpha)?.publicKey).toBe(nodePublicKey(alpha));
    expect(storedRecord(alpha, beta)?.publicKey).toBe(nodePublicKey(beta));
    expect(nodePublicKey(alpha)).not.toBe(nodePublicKey(beta));
    expect(await availability(alpha, beta)).toEqual({ available: true, refusalCode: null });
    expect(await availability(beta, alpha)).toEqual({ available: true, refusalCode: null });
  }, 120_000);

  it("PRQ-02 AC-005, NAS-50: Reject tells the asking node (\"declined\") and stores nothing on either side", async () => {
    const asked = (await gql(gamma, PAIR, { address: beta.baseUrl })).pairWithNode;
    expect(asked.state).toBe("waiting");
    const waiting = (await pending(beta)).filter((request) => request.nodeId === gamma.nodeId);
    expect(waiting).toHaveLength(1);
    expect((await gql(beta, "mutation($id:String!){ rejectPairRequest(id:$id) }", { id: waiting[0].id })).rejectPairRequest).toBe(true);
    expect(await outstanding(gamma)).toEqual([{ requestId: asked.requestId, address: beta.baseUrl, state: "declined" }]);
    expect(await pending(beta)).toEqual([]);
    expect(await peerOf(beta, gamma)).toBeNull();
    expect(await peerOf(gamma, beta)).toBeNull();
    expect(storedRecord(beta, gamma)).toBeNull();
  }, 120_000);

  it("PRQ-03 AC-005, NAS-51: after Cancel, the other owner's Accept is refused as withdrawn and nothing stays stored", async () => {
    const asked = (await gql(gamma, PAIR, { address: beta.baseUrl })).pairWithNode;
    const waiting = (await pending(beta)).filter((request) => request.nodeId === gamma.nodeId);
    expect(waiting).toHaveLength(1);
    expect((await gql(gamma, "mutation($r:String!){ cancelPairRequest(requestId:$r) }", { r: asked.requestId })).cancelPairRequest).toBe(true);
    expect((await outstanding(gamma)).some((request) => request.requestId === asked.requestId)).toBe(false);
    const refused = await gqlRaw(beta, "mutation($id:String!){ acceptPairRequest(id:$id){ nodeId } }", { id: waiting[0].id });
    expect(errorOf(refused)).toEqual({ code: "PEER_PAIRING_REFUSED", message: "This node did not ask to pair, or withdrew it." });
    expect(await peerOf(beta, gamma)).toBeNull();
    expect(storedRecord(beta, gamma)).toBeNull();
    expect(await peerOf(gamma, beta)).toBeNull();
    expect(await pending(beta)).toEqual([]);
  }, 120_000);

  it("PRQ-04 NAS-53: without a grant, a pair request naming paired alpha's node ID with another key is refused 409 PEER_KEY_CONFLICT; no request waits and alpha's record is unchanged", async () => {
    const before = storedRecord(beta, alpha);
    const answer = await rawPair(beta, { nodeId: alpha.nodeId, name: "alpha", publicKey: foreignKey(), addresses: [gamma.baseUrl],
      requestId: randomBytes(16).toString("base64url") });
    expect(answer).toEqual({ status: 409, body: { code: "PEER_KEY_CONFLICT", message: "This node is already paired with that node under another key: Unpair it first." } });
    expect(await pending(beta)).toEqual([]);
    expect(storedRecord(beta, alpha)).toEqual(before);
    expect(await availability(alpha, beta)).toEqual({ available: true, refusalCode: null });
    expect(await availability(beta, alpha)).toEqual({ available: true, refusalCode: null });
  }, 120_000);

  it("PRQ-05 NAS-53, CR-001: with a grant made for alpha, another key is refused 409 PEER_KEY_CONFLICT; the grant presented by another node is refused 403 PAIRING_GRANT_INVALID; alpha (same key) pairs again with it, once (its row keeps its name)", async () => {
    const grant = (await gql(beta, "mutation($n:String!){ createPairingGrant(relation:\"own\",forNodeId:$n,nameForAsker:\"alpha-own\"){ grant addresses } }",
      { n: alpha.nodeId })).createPairingGrant;
    expect(grant.addresses[0]).toBe(beta.baseUrl);
    const before = storedRecord(beta, alpha);

    const impostor = await rawPair(beta, { nodeId: alpha.nodeId, name: "alpha", publicKey: foreignKey(), addresses: [gamma.baseUrl], grant: grant.grant });
    expect(impostor).toEqual({ status: 409, body: { code: "PEER_KEY_CONFLICT", message: "This node is already paired with that node under another key: Unpair it first." } });
    expect(storedRecord(beta, alpha)).toEqual(before);

    // Another node presents alpha's grant: refused over HTTP with its own identity, and through its owner's Pair.
    const otherNode = await rawPair(beta, { nodeId: gamma.nodeId, name: "gamma", publicKey: nodePublicKey(gamma), addresses: [gamma.baseUrl], grant: grant.grant });
    expect(otherNode).toEqual({ status: 403, body: { code: "PAIRING_GRANT_INVALID", message: "This pairing grant is not valid here. Pair again." } });
    const throughPair = await gqlRaw(gamma, PAIR, { address: beta.baseUrl, addresses: grant.addresses, grant: grant.grant, nodeId: beta.nodeId });
    expect(errorOf(throughPair)).toEqual({ code: "PEER_PAIRING_REFUSED", message: "This pairing grant is not valid here. Pair again." });
    expect(await peerOf(beta, gamma)).toBeNull();
    expect(await peerOf(gamma, beta)).toBeNull();

    // The node the grant is for, with its own key: Pair again renews its record in place (contract §1: the same key
    // re-pairs); the row keeps the name its owner gave it ("alpha-here"), the relation is the grant's.
    const again = (await gql(alpha, PAIR, { address: beta.baseUrl, addresses: grant.addresses, grant: grant.grant, nodeId: beta.nodeId, name: "beta-here" })).pairWithNode;
    expect(again).toMatchObject({ state: "paired", peer: { nodeId: beta.nodeId, relation: "own", paired: true } });
    expect(await peerOf(beta, alpha)).toEqual({ nodeId: alpha.nodeId, name: "alpha-here", address: alpha.baseUrl, relation: "own", paired: true });
    expect(storedRecord(beta, alpha)?.publicKey).toBe(nodePublicKey(alpha));
    expect(await availability(beta, alpha)).toEqual({ available: true, refusalCode: null });
    const reused = await gqlRaw(alpha, PAIR, { address: beta.baseUrl, addresses: grant.addresses, grant: grant.grant, nodeId: beta.nodeId });
    expect(errorOf(reused)).toEqual({ code: "PEER_PAIRING_REFUSED", message: "This pairing grant is not valid here. Pair again." });
  }, 120_000);
});
