// The node access model (autobyteus-437, contract docs/design/node_access_model.md) on the real studio server: one
// test per server-checkable scenario of the contract's table, named by its ID. The server is composed in this process
// on a loopback port with its own data folder; the test is its owner desktop (it holds the launch credential).
// Requests from other networks use `fastify.inject` with the client address; WebSocket refusals are read from a raw
// upgrade over TCP, so no credential is attached that the case does not name.
// Networks: this computer (127.0.0.1) and 198.51.100.0/24 (listed in AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS, the owner's
// allowed network) are admitted; 203.0.113.9 (a café Wi-Fi) is not.
// Peers: two paired peers and one paired before this model (no secret) are in the node's peers.json before it starts.
// Run (clean environment, TESTING.md):
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/node-access/node-access-model.e2e.test.ts --no-watch
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { configureMemorySyncCapability } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import { requestSetupCode } from "../../../src/node-access/services/local-control-socket.js";
import type { PairingExchangeResult } from "../../../src/remote-access/domain/models.js";
import { configureNodeIdentityCapability } from "../../../src/remote-access/services/node-identity-service.js";
import { signPeerRequest } from "../../../src/remote-collaboration/channel/peer-request-signature.js";
import {
  startStudioE2eRuntimeServer,
  type StartedStudioE2eRuntimeServer,
} from "../helpers/studio-runtime-test-server.js";

const THIS_COMPUTER = "127.0.0.1";
const ALLOWED_NETWORK_CLIENT = "198.51.100.7";
const CAFE_CLIENT = "203.0.113.9";
const MADE_UP_OWNER_CREDENTIAL = `own_${randomBytes(32).toString("base64url")}`;

const PEER_A = { nodeId: "srv_nas_peer_alpha_00000000000000000000", secret: randomBytes(32).toString("base64url") };
const PEER_B = { nodeId: "srv_nas_peer_bravo_00000000000000000000", secret: randomBytes(32).toString("base64url") };
const PEER_BEFORE_MODEL = { nodeId: "srv_nas_peer_legacy_0000000000000000000" };

type Answer = { statusCode: number; body: Record<string, any> };
type UpgradeOutcome =
  | { kind: "refused"; status: number }
  | { kind: "closed"; code: number; reason: string }
  | { kind: "open" };

describe("Node access model (NA-1…NA-15): every request needs a key", () => {
  let dataDir: string;
  let outsideDir: string;
  let started: StartedStudioE2eRuntimeServer;
  let ownNodeId: string;
  /** Every credential, code and secret the suite saw: none may appear in any output line (NAS-29). */
  const secrets: string[] = [PEER_A.secret, PEER_B.secret, MADE_UP_OWNER_CREDENTIAL];
  const output: string[] = [];

  const inject = async (options: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    url: string;
    from?: string;
    credential?: string;
    headers?: Record<string, string>;
    payload?: unknown;
  }): Promise<Answer> => {
    const response = await started.fastify.inject({
      method: options.method,
      url: options.url,
      remoteAddress: options.from ?? THIS_COMPUTER,
      headers: {
        ...(options.payload === undefined ? {} : { "content-type": "application/json" }),
        ...(options.credential ? { authorization: `Bearer ${options.credential}` } : {}),
        ...options.headers,
      },
      ...(options.payload === undefined ? {} : { payload: typeof options.payload === "string" ? options.payload : JSON.stringify(options.payload) }),
    } as never);
    let body: Record<string, any> = {};
    try { body = response.json() as Record<string, any>; } catch { body = { text: response.body }; }
    return { statusCode: response.statusCode, body };
  };

  const graphql = (query: string, variables: Record<string, unknown> = {}, options: { from?: string; credential?: string } = {}) =>
    inject({ method: "POST", url: "/graphql", payload: { query, variables }, ...options });

  const asOwner = (options: Parameters<typeof inject>[0]) => inject({ credential: started.ownerCredential, ...options });

  /** A WebSocket upgrade over plain TCP: the status of a refused upgrade, or the close frame of an accepted one. */
  const rawUpgrade = (pathname: string, headers: Record<string, string> = {}): Promise<UpgradeOutcome> =>
    new Promise((resolve) => {
      const port = Number(started.mainUrl.port);
      const socket = net.connect(port, THIS_COMPUTER, () => {
        socket.write([
          `GET ${pathname} HTTP/1.1`,
          `Host: 127.0.0.1:${port}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          "Sec-WebSocket-Version: 13",
          `Sec-WebSocket-Key: ${randomBytes(16).toString("base64")}`,
          ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`),
          "",
          "",
        ].join("\r\n"));
      });
      let buffer = Buffer.alloc(0);
      const finish = (outcome: UpgradeOutcome) => { clearTimeout(timer); socket.destroy(); resolve(outcome); };
      const timer = setTimeout(() => finish({ kind: "open" }), 1_500);
      socket.on("error", () => undefined);
      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        const end = buffer.indexOf("\r\n\r\n");
        if (end < 0) return;
        const status = Number(buffer.subarray(0, buffer.indexOf("\r\n")).toString("latin1").split(" ")[1]);
        if (status !== 101) { finish({ kind: "refused", status }); return; }
        const frame = buffer.subarray(end + 4);
        if (frame.length < 2) return;
        const length = frame[1]! & 0x7f;
        if ((frame[0]! & 0x0f) !== 0x8 || frame.length < 2 + length) return;
        const payload = frame.subarray(2, 2 + length);
        finish({ kind: "closed", code: payload.readUInt16BE(0), reason: payload.subarray(2).toString("utf8") });
      });
    });

  /** A real WebSocket held open with the given headers; resolves its close. */
  const holdSocket = async (pathname: string, headers: Record<string, string>) => {
    const url = new URL(pathname, started.mainUrl);
    url.protocol = "ws:";
    const socket = new WebSocket(url, { headers });
    socket.on("error", () => undefined);
    const closed = new Promise<{ code: number; reason: string; at: number }>((resolve) => {
      socket.once("close", (code, reason) => resolve({ code, reason: reason.toString(), at: Date.now() }));
    });
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("unexpected-response", (_request, response) => reject(new Error(`upgrade refused ${response.statusCode}`)));
    });
    return { socket, closed };
  };

  const issueOwnerCredential = async (setupCode: string, desktopName: string) => {
    secrets.push(setupCode);
    const exchange = await inject({ method: "POST", url: "/rest/node-access/setup-exchanges", payload: { setupCode, desktopName } });
    expect(exchange.statusCode, JSON.stringify(exchange.body)).toBe(201);
    const issued = exchange.body as { credentialId: string; credential: string };
    expect(issued.credential).toMatch(/^own_/);
    secrets.push(issued.credential);
    return issued;
  };

  const setupCodeFromLocalSocket = async () => (await requestSetupCode(appConfigProvider.config.getAppDataDir())).setupCode;

  const pairPhone = async (deviceName: string): Promise<PairingExchangeResult> => {
    const session = await asOwner({
      method: "POST",
      url: "/rest/remote-access/pairing-sessions",
      payload: { connectionWay: "tailscale", serverBaseUrl: "https://desktop.tailnet.ts.net/mobile", serverName: "NAS Node" },
    });
    expect(session.statusCode, JSON.stringify(session.body)).toBe(201);
    secrets.push(session.body.payload.pairingCode);
    const exchange = await inject({
      method: "POST",
      url: "/rest/remote-access/pairing-exchanges",
      payload: { pairingCode: session.body.payload.pairingCode, serverBaseUrl: String(session.body.mobileUrl).split("?", 1)[0], deviceName },
    });
    expect(exchange.statusCode, JSON.stringify(exchange.body)).toBe(201);
    const phone = exchange.body as unknown as PairingExchangeResult;
    secrets.push(phone.credential);
    return phone;
  };

  const signedHeaders = (peer: { nodeId: string; secret: string }, method: string, pathWithQuery: string, body: string | null,
    overrides: { toNodeId?: string; now?: Date } = {}) => signPeerRequest({
    secret: peer.secret,
    method,
    pathWithQuery,
    fromNodeId: peer.nodeId,
    toNodeId: overrides.toNodeId ?? ownNodeId,
    body,
    now: overrides.now,
  });

  const peerMessage = (fromNodeId: string, messageId: string) => JSON.stringify({
    fromNodeId, toNodeId: ownNodeId, kind: "message", messageId,
    targetRoot: { kind: "agent", runId: "agent_nas_target" }, sender: { agentRunId: "agent_nas_sender" },
    target: { agentRunId: "agent_nas_target" }, content: "x", messageType: "agent_message", createdAt: new Date().toISOString(),
  });

  const capture = (...args: unknown[]) => { output.push(args.map(String).join(" ")); };

  beforeAll(async () => {
    for (const method of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, method).mockImplementation(capture);
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "nas-")));
    outsideDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "nas-outside-")));
    await fs.writeFile(path.join(outsideDir, "secret.txt"), "NAS-NOT-A-SECRET\n");
    await fs.writeFile(path.join(dataDir, ".env"), [
      "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000",
      "APP_ENV=test",
      "AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS=198.51.100.0/24",
      "",
    ].join("\n"), "utf-8");
    const addedAt = new Date().toISOString();
    await fs.mkdir(path.join(dataDir, "remote-collaboration"), { recursive: true });
    await fs.writeFile(path.join(dataDir, "remote-collaboration", "peers.json"), JSON.stringify({ peers: [
      { nodeId: PEER_A.nodeId, name: "peer-alpha", baseUrl: "http://127.0.0.1:9", addedAt, peerSecret: PEER_A.secret },
      { nodeId: PEER_B.nodeId, name: "peer-bravo", baseUrl: "http://127.0.0.1:9", addedAt, peerSecret: PEER_B.secret },
      { nodeId: PEER_BEFORE_MODEL.nodeId, name: "peer-legacy", baseUrl: "http://127.0.0.1:9", addedAt },
    ] }), { mode: 0o600 });
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    // A fresh data folder has nothing to migrate: startup marks both ready (as the other route E2Es do).
    configureNodeIdentityCapability(true);
    configureMemorySyncCapability(true);
    started = await startStudioE2eRuntimeServer(THIS_COMPUTER);
    secrets.push(started.ownerCredential);
    ownNodeId = (await inject({ method: "GET", url: "/rest/remote-access/status" })).body.nodeId;
    expect(ownNodeId).toMatch(/^srv_/);
    expect((await asOwner({ method: "PUT", url: "/rest/remote-access/settings", payload: { phoneAccessEnabled: true } })).statusCode).toBe(200);
  }, 90_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await started?.fastify.close();
    await fs.rm(dataDir, { recursive: true, force: true });
    await fs.rm(outsideDir, { recursive: true, force: true });
  });

  it("NAS-01 the launch owner credential opens GraphQL, REST and a WebSocket route", async () => {
    expect((await graphql("{ __typename }", {}, { credential: started.ownerCredential })).statusCode).toBe(200);
    const owners = await asOwner({ method: "GET", url: "/rest/node-access/owner-credentials" });
    expect(owners.statusCode).toBe(200);
    expect(await rawUpgrade("/ws/projects", { Authorization: `Bearer ${started.ownerCredential}` })).toEqual({ kind: "open" });
  });

  it("NAS-02 NAS-14 NAS-16 without a credential, a program or browser page on this computer gets 401 NODE_CREDENTIAL_REQUIRED on every non-exempt route", async () => {
    const graphqlAnswer = await graphql("{ __typename }");
    expect(graphqlAnswer).toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_REQUIRED" } });
    expect(await inject({ method: "GET", url: "/rest/workspaces/ws_any/content?path=a.txt" }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_REQUIRED" } });
    expect(await inject({ method: "GET", url: "/rest/node-access/owner-credentials" }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_REQUIRED" } });
    // GraphQL subscriptions get an HTTP refusal; /ws/* routes close with 4401 and the code.
    expect(await rawUpgrade("/graphql")).toEqual({ kind: "refused", status: 401 });
    expect(await rawUpgrade("/ws/terminal/session_any")).toEqual({ kind: "closed", code: 4401, reason: "NODE_CREDENTIAL_REQUIRED" });
    expect(await rawUpgrade("/ws/projects", { Authorization: `Bearer ${MADE_UP_OWNER_CREDENTIAL}` }))
      .toEqual({ kind: "closed", code: 4401, reason: "NODE_CREDENTIAL_INVALID" });
    // The exempt endpoints answer without one.
    expect((await inject({ method: "GET", url: "/rest/health" })).statusCode).toBe(200);
    expect((await inject({ method: "GET", url: "/rest/remote-access/status" })).statusCode).toBe(200);
  });

  it("NAS-03 NAS-32 a setup code from the node's local control socket gets a desktop an owner credential, once; the node keeps its owners from before", async () => {
    const before = (await asOwner({ method: "GET", url: "/rest/node-access/owner-credentials" })).body.credentials as Array<{ credentialId: string }>;
    const setupCode = await setupCodeFromLocalSocket();
    const issued = await issueOwnerCredential(setupCode, "Reinstalled Desktop");
    expect((await graphql("{ __typename }", {}, { credential: issued.credential })).statusCode).toBe(200);
    const again = await inject({ method: "POST", url: "/rest/node-access/setup-exchanges", payload: { setupCode, desktopName: "Replay" } });
    expect(again).toMatchObject({ statusCode: 401, body: { code: "NODE_SETUP_CODE_INVALID" } });
    const after = (await asOwner({ method: "GET", url: "/rest/node-access/owner-credentials" })).body.credentials as Array<{ credentialId: string }>;
    expect(after.map((row) => row.credentialId)).toEqual(expect.arrayContaining([...before.map((row) => row.credentialId), issued.credentialId]));
  });

  it("NAS-04 an owner desktop creates a setup code for a second desktop, which gets its own owner credential", async () => {
    const created = await asOwner({ method: "POST", url: "/rest/node-access/setup-codes" });
    expect(created.statusCode).toBe(201);
    const second = await issueOwnerCredential(created.body.setupCode, "Second Desktop");
    expect((await graphql("{ __typename }", {}, { credential: second.credential })).statusCode).toBe(200);
    const listed = (await asOwner({ method: "GET", url: "/rest/node-access/owner-credentials" })).body.credentials as Array<Record<string, unknown>>;
    expect(listed.find((row) => row.credentialId === second.credentialId)).toBeDefined();
    expect(JSON.stringify(listed)).not.toContain(second.credential);
  });

  it("NAS-33 NAS-37 a desktop that disconnects is refused at once, its open sockets close with 4403 NODE_CREDENTIAL_REVOKED, and a new setup code connects it again", async () => {
    const issued = await issueOwnerCredential(await setupCodeFromLocalSocket(), "Only Owner Desktop");
    const held = await holdSocket("/ws/projects", { authorization: `Bearer ${issued.credential}` });
    const launchHeld = await holdSocket("/ws/projects", { authorization: `Bearer ${started.ownerCredential}` });
    const revokedAt = Date.now();
    const disconnect = await inject({ method: "DELETE", url: `/rest/node-access/owner-credentials/${issued.credentialId}`, credential: issued.credential });
    expect(disconnect.statusCode).toBe(204);
    const closed = await held.closed;
    expect({ code: closed.code, reason: closed.reason }).toEqual({ code: 4403, reason: "NODE_CREDENTIAL_REVOKED" });
    expect(closed.at - revokedAt).toBeLessThanOrEqual(2_000);
    expect(launchHeld.socket.readyState).toBe(WebSocket.OPEN);
    launchHeld.socket.close();
    expect(await graphql("{ __typename }", {}, { credential: issued.credential })).toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
    const reconnected = await issueOwnerCredential(await setupCodeFromLocalSocket(), "Only Owner Desktop");
    expect((await graphql("{ __typename }", {}, { credential: reconnected.credential })).statusCode).toBe(200);
  });

  it("NAS-05 NAS-06 NAS-28 a phone credential works from this computer and from a network listed in AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS", async () => {
    const phone = await pairPhone("Allowed Network Phone");
    for (const from of [THIS_COMPUTER, ALLOWED_NETWORK_CLIENT]) {
      expect((await graphql("{ __typename }", {}, { from, credential: phone.credential })).statusCode, from).toBe(200);
    }
  });

  it("NAS-07 NAS-11 from a network the node does not admit, every request is refused 403 NODE_NETWORK_REFUSED before any credential is checked, exempt endpoints included", async () => {
    const phone = await pairPhone("Cafe Phone");
    const refused = { statusCode: 403, body: { code: "NODE_NETWORK_REFUSED" } };
    expect(await graphql("{ __typename }", {}, { from: CAFE_CLIENT, credential: phone.credential })).toMatchObject(refused);
    expect(await graphql("{ __typename }", {}, { from: CAFE_CLIENT, credential: started.ownerCredential })).toMatchObject(refused);
    expect(await graphql("{ __typename }", {}, { from: CAFE_CLIENT, credential: MADE_UP_OWNER_CREDENTIAL })).toMatchObject(refused);
    expect(await graphql("{ __typename }", {}, { from: CAFE_CLIENT })).toMatchObject(refused);
    expect(await inject({ method: "GET", url: "/rest/health", from: CAFE_CLIENT })).toMatchObject(refused);
    expect(await inject({ method: "GET", url: "/rest/remote-access/status", from: CAFE_CLIENT })).toMatchObject(refused);
    expect(await inject({ method: "POST", url: "/rest/node-access/setup-exchanges", from: CAFE_CLIENT, payload: { setupCode: "x" } })).toMatchObject(refused);
    expect(await inject({ method: "POST", url: "/rest/remote-access/pairing-exchanges", from: CAFE_CLIENT, payload: { pairingCode: "x" } })).toMatchObject(refused);
    expect(await inject({ method: "POST", url: "/rest/remote/peer-pairing-exchanges", from: CAFE_CLIENT, payload: {} })).toMatchObject(refused);
  });

  it("NAS-08 a phone credential is refused the owner's actions with 403 NODE_ROUTE_NOT_PERMITTED", async () => {
    const phone = await pairPhone("Curious Phone");
    const notPermitted = { statusCode: 403, body: { code: "NODE_ROUTE_NOT_PERMITTED" } };
    expect(await inject({ method: "PUT", url: "/rest/remote-access/settings", credential: phone.credential, payload: { phoneAccessEnabled: false } })).toMatchObject(notPermitted);
    expect(await inject({ method: "POST", url: "/rest/remote-access/pairing-sessions", credential: phone.credential, payload: {} })).toMatchObject(notPermitted);
    expect(await inject({ method: "POST", url: "/rest/node-access/setup-codes", credential: phone.credential })).toMatchObject(notPermitted);
    expect(await inject({ method: "GET", url: "/rest/node-access/owner-credentials", credential: phone.credential })).toMatchObject(notPermitted);
    expect(await inject({ method: "GET", url: "/rest/mcp-gateway/token", credential: phone.credential })).toMatchObject(notPermitted);
    const invite = await graphql("mutation { createPeerInvite { inviteText } }", {}, { credential: phone.credential });
    expect(invite.body.errors?.[0]?.extensions?.code).toBe("NODE_ROUTE_NOT_PERMITTED");
  });

  it("NAS-10 a revoked phone is refused 403 REMOTE_ACCESS_DEVICE_REVOKED", async () => {
    const phone = await pairPhone("Lost Phone");
    expect((await asOwner({ method: "DELETE", url: `/rest/remote-access/devices/${encodeURIComponent(phone.device.deviceId)}` })).statusCode).toBe(200);
    expect(await graphql("{ __typename }", {}, { credential: phone.credential }))
      .toMatchObject({ statusCode: 403, body: { code: "REMOTE_ACCESS_DEVICE_REVOKED" } });
  });

  it("NAS-12 a stranger on the owner's allowed network, without or with a made-up credential, gets 401 and nothing runs (autobyteus-436 PROBE-01 P3)", async () => {
    const createWorkspace = "mutation($input: CreateWorkspaceInput!) { createWorkspace(input: $input) { workspaceId } }";
    for (const credential of [undefined, MADE_UP_OWNER_CREDENTIAL]) {
      const expected = credential ? "NODE_CREDENTIAL_INVALID" : "NODE_CREDENTIAL_REQUIRED";
      expect(await graphql("{ __typename }", {}, { from: ALLOWED_NETWORK_CLIENT, credential }))
        .toMatchObject({ statusCode: 401, body: { code: expected } });
      expect(await graphql(createWorkspace, { input: { rootPath: outsideDir } }, { from: ALLOWED_NETWORK_CLIENT, credential }))
        .toMatchObject({ statusCode: 401, body: { code: expected } });
      expect(await inject({ method: "GET", url: "/rest/workspaces/ws_any/content?path=secret.txt", from: ALLOWED_NETWORK_CLIENT, credential }))
        .toMatchObject({ statusCode: 401, body: { code: expected } });
    }
    const workspaces = await graphql("{ workspaces { workspaceRootPath } }", {}, { credential: started.ownerCredential });
    expect(JSON.stringify(workspaces.body)).not.toContain(outsideDir);
  });

  it("NAS-13 guessed setup, phone pairing and peer invite codes are refused 401", async () => {
    expect((await graphql("mutation { setRemoteCollaborationEnabled(enabled: true) { enabled } }", {}, { credential: started.ownerCredential })).statusCode).toBe(200);
    const guess = randomBytes(18).toString("base64url");
    expect(await inject({ method: "POST", url: "/rest/node-access/setup-exchanges", from: ALLOWED_NETWORK_CLIENT, payload: { setupCode: guess, desktopName: "x" } }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_SETUP_CODE_INVALID" } });
    const phoneGuess = await inject({ method: "POST", url: "/rest/remote-access/pairing-exchanges", from: ALLOWED_NETWORK_CLIENT,
      payload: { pairingCode: guess, serverBaseUrl: "https://desktop.tailnet.ts.net/mobile", deviceName: "Guess" } });
    expect(phoneGuess.statusCode, JSON.stringify(phoneGuess.body)).toBe(401);
    expect(await inject({ method: "POST", url: "/rest/remote/peer-pairing-exchanges", from: ALLOWED_NETWORK_CLIENT,
      payload: { inviteCode: guess, fromNodeId: "srv_guesser_000000000000000000000000", fromName: "guesser", addressCandidates: [] } }))
      .toMatchObject({ statusCode: 401, body: { code: "PEER_INVITE_INVALID" } });
  });

  it("NAS-20 a paired peer's signed request passes the gate to the peer gateway", async () => {
    const body = peerMessage(PEER_A.nodeId, "collabmsg_nas_20");
    const answer = await inject({ method: "POST", url: "/rest/remote/messages", payload: body, headers: signedHeaders(PEER_A, "POST", "/rest/remote/messages", body) });
    expect(answer.statusCode, JSON.stringify(answer.body)).toBe(200);
    expect(answer.body).toMatchObject({ nodeId: ownNodeId });
  });

  it("NAS-21 a request claiming a peer's node ID without its signature, or signed with another secret, gets 401", async () => {
    const body = peerMessage(PEER_A.nodeId, "collabmsg_nas_21");
    expect(await inject({ method: "POST", url: "/rest/remote/messages", payload: body }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_REQUIRED" } });
    const forged = signedHeaders({ nodeId: PEER_A.nodeId, secret: randomBytes(32).toString("base64url") }, "POST", "/rest/remote/messages", body);
    expect(await inject({ method: "POST", url: "/rest/remote/messages", payload: body, headers: forged }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
  });

  it("NAS-22 a replayed peer request, or one signed more than 300 s ago, gets 401", async () => {
    const body = peerMessage(PEER_A.nodeId, "collabmsg_nas_22");
    const headers = signedHeaders(PEER_A, "POST", "/rest/remote/messages", body);
    expect((await inject({ method: "POST", url: "/rest/remote/messages", payload: body, headers })).statusCode).toBe(200);
    expect(await inject({ method: "POST", url: "/rest/remote/messages", payload: body, headers }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
    const stale = signedHeaders(PEER_A, "POST", "/rest/remote/messages", body, { now: new Date(Date.now() - 301_000) });
    expect(await inject({ method: "POST", url: "/rest/remote/messages", payload: body, headers: stale }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
  });

  it("NAS-23 a peer paired before this model (no peer secret) gets 401 until it pairs again", async () => {
    const body = peerMessage(PEER_BEFORE_MODEL.nodeId, "collabmsg_nas_23");
    const headers = signedHeaders({ nodeId: PEER_BEFORE_MODEL.nodeId, secret: randomBytes(32).toString("base64url") }, "POST", "/rest/remote/messages", body);
    expect(await inject({ method: "POST", url: "/rest/remote/messages", payload: body, headers }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
    const peers = await graphql("{ peerNodes { nodeId paired } }", {}, { credential: started.ownerCredential });
    expect(peers.body.data.peerNodes).toEqual(expect.arrayContaining([{ nodeId: PEER_BEFORE_MODEL.nodeId, paired: false }, { nodeId: PEER_A.nodeId, paired: true }]));
  });

  it("NAS-24 a peer's signature opens only /rest/remote/*: elsewhere 403 NODE_ROUTE_NOT_PERMITTED", async () => {
    const query = JSON.stringify({ query: "{ __typename }" });
    expect(await inject({ method: "POST", url: "/graphql", payload: query, headers: signedHeaders(PEER_A, "POST", "/graphql", query) }))
      .toMatchObject({ statusCode: 403, body: { code: "NODE_ROUTE_NOT_PERMITTED" } });
    expect(await inject({ method: "GET", url: "/rest/node-access/owner-credentials", headers: signedHeaders(PEER_A, "GET", "/rest/node-access/owner-credentials", null) }))
      .toMatchObject({ statusCode: 403, body: { code: "NODE_ROUTE_NOT_PERMITTED" } });
  });

  it("NAS-36 a request signed for another node, presented to this node, gets 401", async () => {
    const body = peerMessage(PEER_A.nodeId, "collabmsg_nas_36");
    const headers = signedHeaders(PEER_A, "POST", "/rest/remote/messages", body, { toNodeId: "srv_someone_else_000000000000000000000" });
    expect(await inject({ method: "POST", url: "/rest/remote/messages", payload: body, headers }))
      .toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
  });

  it("NAS-38 a peer request whose body changed in transit gets 401 before any handler runs", async () => {
    const signedBody = peerMessage(PEER_A.nodeId, "collabmsg_nas_38");
    const changedBody = signedBody.replace('"content":"x"', '"content":"changed in transit"');
    expect(changedBody).not.toBe(signedBody);
    const answer = await inject({ method: "POST", url: "/rest/remote/messages", payload: changedBody, headers: signedHeaders(PEER_A, "POST", "/rest/remote/messages", signedBody) });
    expect(answer).toMatchObject({ statusCode: 401, body: { code: "NODE_CREDENTIAL_INVALID" } });
    expect(answer.body.nodeId, "the peer gateway did not answer").toBeUndefined();
  });

  it("NAS-37 removing a peer closes its open run-observation socket at once with 4403 PEER_UNPAIRED", async () => {
    const held = await holdSocket("/rest/remote/run-observations", signedHeaders(PEER_B, "GET", "/rest/remote/run-observations", null));
    const removedAt = Date.now();
    const removed = await graphql("mutation($id: String!) { removePeerNode(nodeId: $id) }", { id: PEER_B.nodeId }, { credential: started.ownerCredential });
    expect(removed.body.data?.removePeerNode, JSON.stringify(removed.body)).toBe(true);
    const closed = await held.closed;
    expect({ code: closed.code, reason: closed.reason }).toEqual({ code: 4403, reason: "PEER_UNPAIRED" });
    expect(closed.at - removedAt).toBeLessThanOrEqual(2_000);
  });

  it("NAS-26 a memory sync source credential opens the memory sync hub routes and nothing else", async () => {
    const hub = await graphql(
      "mutation($input: UpdateMemoryHubConfigInput!) { updateMemoryHubConfig(input: $input) { oneTimePlaintextToken } }",
      { input: { enabled: true, advertisedHubBaseUrl: "http://127.0.0.1:8000" } },
      { credential: started.ownerCredential },
    );
    expect(hub.body.errors, JSON.stringify(hub.body)).toBeUndefined();
    const token = String(hub.body.data?.updateMemoryHubConfig?.oneTimePlaintextToken);
    expect(token).toMatch(/^mhub_/);
    secrets.push(token);
    const health = await inject({ method: "GET", url: "/rest/memory-sync/v1/health?memorySyncSourceId=nas-source", credential: token });
    expect([401, 403], JSON.stringify(health.body)).not.toContain(health.statusCode);
    expect(await graphql("{ __typename }", {}, { credential: token })).toMatchObject({ statusCode: 403, body: { code: "NODE_ROUTE_NOT_PERMITTED" } });
    expect(await inject({ method: "GET", url: "/rest/node-access/owner-credentials", credential: token }))
      .toMatchObject({ statusCode: 403, body: { code: "NODE_ROUTE_NOT_PERMITTED" } });
  });

  it("NAS-31 the node keeps no credential in its environment: a process it spawns sees none", () => {
    expect(process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL).toBeUndefined();
    const child = spawnSync(process.execPath, ["-e", "process.stdout.write(JSON.stringify(process.env))"], { env: process.env, encoding: "utf8" });
    expect(child.status).toBe(0);
    expect(child.stdout).not.toContain("AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL");
    for (const secret of secrets) expect(child.stdout.includes(secret)).toBe(false);
  });

  it("NAS-29 every refusal was logged as one line with its code, redacted route and client address, and no credential, code or secret is in any output line", () => {
    const refusals = output.filter((line) => line.startsWith("Node request refused "));
    expect(refusals.length).toBeGreaterThan(10);
    for (const line of refusals) expect(line).toMatch(/^Node request refused [A-Z_]+ \S+ from \S+/);
    expect(refusals.some((line) => line.includes(`NODE_NETWORK_REFUSED /graphql from ${CAFE_CLIENT}`))).toBe(true);
    expect(refusals.some((line) => line.includes(`NODE_CREDENTIAL_REQUIRED /graphql from ${ALLOWED_NETWORK_CLIENT}`))).toBe(true);
    const leaked = secrets.filter((secret) => output.some((line) => line.includes(secret)));
    expect(leaked.length, "secrets found in output").toBe(0);
  });
});
