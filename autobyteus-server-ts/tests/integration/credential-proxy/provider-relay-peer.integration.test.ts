/**
 * autobyteus-581 C4 end to end in one process, two nodes: a relayed node (the real credential proxy host with C1, its
 * local relay route and peer forwarder, the real `PeerRelayClient` signing with the pair's secret) and a relay node
 * (a Fastify app with the real node access gate verifying the signature and body hash, the real remote routes and
 * `ProviderRelayPeerHandler`), and a fake provider on 127.0.0.1 standing in for every provider origin. A "runtime" is a
 * `fetch` to the relayed node's local relay with its pass in the provider's own credential header.
 *
 * Covers: the credential attached per declared kind (API key; Claude login token with its OAuth beta; Codex's ChatGPT
 * login with its account, the caller's placeholder account dropped), the body and the streamed reply unchanged, the
 * query kept without the peer envelope, the reply marking (a provider 401 stays the provider's), every refusal before a
 * provider call (relay node's switch off, an expired login, a missing key, unpaired on either side, a wrong secret,
 * remote collaboration off, the relay node unreachable), one C5 line per call with no secret in any line or log.
 * Dummy values only.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { registerRemoteCollaborationRoutes } from "../../../src/api/rest/remote.js";
import { createCredentialProxyHost, type CredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import { CredentialProxyForwarder } from "../../../src/credential-proxy/credential-proxy-forwarder.js";
import { ProviderRelayActivityLog } from "../../../src/credential-proxy/provider-relay-peer/provider-relay-activity-log.js";
import { ProviderRelayPeerHandler } from "../../../src/credential-proxy/provider-relay-peer/provider-relay-peer-handler.js";
import type { RelayLoginRead } from "../../../src/credential-proxy/provider-relay-peer/relay-login-token-reader.js";
import type { RelayedNodeSettings } from "../../../src/credential-proxy/provider-relays/provider-relay-settings.js";
import { createProviderRelayTable, ProviderRelays } from "../../../src/credential-proxy/provider-relays/provider-relays.js";
import { PeerRelayClient } from "../../../src/remote-collaboration/channel/peer-relay-client.js";
import { registerTestNodeAccess } from "../../helpers/node-access-test-gate.js";

const RELAYED = "srv_relayed_00000000000000000000000000000";
const RELAY = "srv_relaynode_000000000000000000000000000";
const SECRET = "peer-secret-581";
const ANTHROPIC_KEY = "sk-relay-anthropic-dummy-581";
const CLAUDE_LOGIN_TOKEN = "oat-relay-login-dummy-581";
const CODEX_ACCESS = "codex-access-dummy-581";
const CODEX_ACCOUNT = "acct-relay-dummy-581";
const GEMINI_KEY = "gemini-relay-dummy-581";
const SECRETS = [ANTHROPIC_KEY, CLAUDE_LOGIN_TOKEN, CODEX_ACCESS, GEMINI_KEY, SECRET];
const BODY = JSON.stringify({ model: "claude-sonnet-5", stream: true, messages: [{ role: "user", content: "hi" }] });
const SSE = ['event: message_start\ndata: {"type":"message_start"}\n\n', 'event: message_stop\ndata: {"type":"message_stop"}\n\n'];

type Seen = { method: string; url: string; headers: http.IncomingHttpHeaders; body: string };

describe("provider relay through a paired relay node (C4)", () => {
  let provider: http.Server;
  let providerOrigin = "";
  const seen: Seen[] = [];
  let relayApp: FastifyInstance;
  let relayBaseUrl = "";
  let relayPeerSecrets: Record<string, string> = {};
  let loginTokensOn = false;
  let claudeLoginStored = true;
  let codexLogin: RelayLoginRead = { kind: "found", credential: { secret: CODEX_ACCESS, accountId: CODEX_ACCOUNT } };
  let activityDir = "";
  let host: CredentialProxyHost;
  let remoteOn = true;
  let pairedHere = true;
  let ownSecret = SECRET;
  let relayAddress = "";
  let consoleLines: string[] = [];

  beforeAll(async () => {
    provider = http.createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        seen.push({ method: request.method ?? "", url: request.url ?? "", headers: request.headers, body: Buffer.concat(chunks).toString("utf8") });
        if ((request.url ?? "").includes("count_tokens")) {
          response.writeHead(401, { "content-type": "application/json" });
          response.end('{"type":"error","error":{"type":"authentication_error","message":"provider says no"}}');
          return;
        }
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write(SSE[0]);
        response.end(SSE[1]);
      });
    });
    await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", resolve));
    providerOrigin = `http://127.0.0.1:${(provider.address() as AddressInfo).port}`;

    activityDir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-activity-"));
    relayApp = fastify();
    await registerTestNodeAccess(relayApp, { ownNodeId: RELAY, peerSecrets: new Proxy({}, {
      get: (_target, key: string) => relayPeerSecrets[key],
    }) });
    const handler = new ProviderRelayPeerHandler({
      relays: new ProviderRelays(createProviderRelayTable(() => providerOrigin)),
      forwarder: new CredentialProxyForwarder(),
      management: () => ({
        resolveForUse: async (consumer: { kind: string; relayId?: string; relayCredentialKind?: string }) => {
          if (consumer.kind === "providerRelay" && consumer.relayId === "anthropic" && consumer.relayCredentialKind === "apiKey") {
            return SecretValue.fromString(ANTHROPIC_KEY);
          }
          if (consumer.kind === "providerRelay" && consumer.relayId === "anthropic" && claudeLoginStored) return SecretValue.fromString(CLAUDE_LOGIN_TOKEN);
          if (consumer.kind === "providerRelay" && consumer.relayId === "gemini") return SecretValue.fromString(GEMINI_KEY);
          throw new Error("SECRET_NOT_FOUND");
        },
      }) as never,
      logins: { readCodexLogin: async () => codexLogin, readGrokLogin: async () => ({ kind: "missing" }) },
      activity: new ProviderRelayActivityLog(activityDir),
      loginTokensEnabled: () => loginTokensOn,
    });
    await relayApp.register(async (rest) => registerRemoteCollaborationRoutes(rest, { gateway: {}, pairing: {} } as never, handler), { prefix: "/rest" });
    await relayApp.listen({ host: "127.0.0.1", port: 0 });
    relayBaseUrl = `http://127.0.0.1:${(relayApp.server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await relayApp.close();
    provider.closeAllConnections();
    await new Promise<void>((resolve) => provider.close(() => resolve()));
    fs.rmSync(activityDir, { recursive: true, force: true });
  });

  const relayed = (loginTokenRuntimes: RelayedNodeSettings["loginTokenRuntimes"] = new Set()): RelayedNodeSettings => ({
    relayPeerNodeId: RELAY, relays: new Set(["anthropic", "openai", "gemini"]), loginTokenRuntimes,
    codexAccountId: loginTokenRuntimes.has("codex_app_server") ? CODEX_ACCOUNT : null,
  });

  const startRelayedNode = async (settings: RelayedNodeSettings) => {
    host = createCredentialProxyHost({
      relays: new ProviderRelays(createProviderRelayTable(() => "http://127.0.0.1:9")),
      relayed: settings,
      access: { grantsForAgent: async () => [], allowsCall: async () => false },
      catalog: { entries: () => [], isSourceRegistered: () => true, describe: () => null,
        sourceRemoving: async () => undefined, sourceChanging: async () => undefined },
      skillSources: null,
      // A relayed node holds no keys: any vault read would fail the test.
      management: () => { throw new Error("the relayed node read its vault"); },
      appDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "relayed-node-")),
      peerRelayClient: () => new PeerRelayClient({
        capability: { isEnabled: () => remoteOn },
        peers: {
          findByNodeId: async (nodeId) => (nodeId === RELAY && pairedHere
            ? { nodeId: RELAY, name: "host", baseUrl: relayAddress, addedAt: "2026-11-26T00:00:00.000Z", paired: true, role: null }
            : null),
          peerSecret: async (nodeId) => (nodeId === RELAY && pairedHere ? ownSecret : null),
        },
        ownNodeId: async () => RELAYED,
      }),
    });
    await host.listen();
  };

  beforeEach(() => {
    seen.length = 0;
    relayPeerSecrets = { [RELAYED]: SECRET };
    loginTokensOn = false;
    claudeLoginStored = true;
    codexLogin = { kind: "found", credential: { secret: CODEX_ACCESS, accountId: CODEX_ACCOUNT } };
    remoteOn = true;
    pairedHere = true;
    ownSecret = SECRET;
    relayAddress = relayBaseUrl;
    fs.rmSync(path.join(activityDir, "provider-relays"), { recursive: true, force: true });
    consoleLines = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { consoleLines.push(args.map(String).join(" ")); });
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await host?.close();
  });

  const activity = (): Array<Record<string, unknown>> => {
    const file = path.join(activityDir, "provider-relays", "activity.jsonl");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
  };
  const expectNoSecretAnywhere = (pass: string) => {
    const logged = [JSON.stringify(activity()), consoleLines.join("\n")].join("\n");
    for (const secret of [...SECRETS, pass]) expect(logged).not.toContain(secret);
  };
  const run = { runId: "run-581", agentDefinitionId: "agent-a" };

  it("NAS-42 native Anthropic (API key): the relay node attaches its key; body, stream and C5 line (AC-001, AC-006)", async () => {
    await startRelayedNode(relayed());
    const access = await host.providerRelayAccess.prepareForRun(run, "anthropic", "autobyteus");
    expect(access.relayCredentialKind).toBe("apiKey");
    const response = await fetch(`${access.baseUrl}/v1/messages`, {
      method: "POST", body: BODY,
      headers: { "content-type": "application/json", "x-api-key": access.pass, "anthropic-version": "2023-06-01" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-autobyteus-relay-reply")).toBeNull();
    expect(await response.text()).toBe(SSE.join(""));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ method: "POST", url: "/v1/messages", body: BODY });
    expect(seen[0]!.headers["x-api-key"]).toBe(ANTHROPIC_KEY);
    expect(seen[0]!.headers.authorization).toBeUndefined();
    expect(seen[0]!.headers["anthropic-version"]).toBe("2023-06-01");
    expect(Object.keys(seen[0]!.headers).filter((name) => name.startsWith("x-autobyteus-"))).toEqual([]);
    expect(activity()).toEqual([expect.objectContaining({
      peerNodeId: RELAYED, relayId: "anthropic", relayCredentialKind: "apiKey", method: "POST", path: "/v1/messages", status: 200,
    })]);
    expectNoSecretAnywhere(access.pass);
  });

  it("with the switch off and a Claude login token stored, Claude in API-key shape gets the API key (AC-004)", async () => {
    await startRelayedNode(relayed());
    const access = await host.providerRelayAccess.prepareForRun(run, "anthropic", "claude_agent_sdk");
    expect(access.relayCredentialKind).toBe("apiKey");
    const response = await fetch(`${access.baseUrl}/v1/messages`, { method: "POST", body: BODY, headers: { "x-api-key": access.pass } });
    expect(response.status).toBe(200);
    expect(seen[0]!.headers["x-api-key"]).toBe(ANTHROPIC_KEY);
    expect(activity()[0]).toMatchObject({ relayCredentialKind: "apiKey", status: 200 });
  });

  it("Claude login token: Bearer from the vault, Claude Code's OAuth beta kept, no key (AC-005, P-4)", async () => {
    loginTokensOn = true;
    await startRelayedNode(relayed(new Set(["claude_agent_sdk"])));
    const access = await host.providerRelayAccess.prepareForRun(run, "anthropic", "claude_agent_sdk");
    expect(access.relayCredentialKind).toBe("loginToken");
    const response = await fetch(`${access.baseUrl}/v1/messages`, {
      method: "POST", body: BODY, headers: { authorization: `Bearer ${access.pass}`, "anthropic-beta": "oauth-2025-04-20" },
    });
    expect(response.status).toBe(200);
    expect(seen[0]!.headers.authorization).toBe(`Bearer ${CLAUDE_LOGIN_TOKEN}`);
    expect(seen[0]!.headers["anthropic-beta"]).toBe("oauth-2025-04-20");
    expect(seen[0]!.headers["x-api-key"]).toBeUndefined();
    expect(activity()[0]).toMatchObject({ relayCredentialKind: "loginToken", status: 200 });
    expectNoSecretAnywhere(access.pass);
  });

  it("refuses a login-token call when the relay node's switch is off, never swapping in the key (DEC-109)", async () => {
    await startRelayedNode(relayed(new Set(["claude_agent_sdk"])));
    const access = await host.providerRelayAccess.prepareForRun(run, "anthropic", "claude_agent_sdk");
    const response = await fetch(`${access.baseUrl}/v1/messages`, { method: "POST", body: BODY, headers: { authorization: `Bearer ${access.pass}` } });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ type: "error", error: { type: "permission_error", code: "RELAY_LOGIN_TOKENS_OFF" } });
    expect(seen).toHaveLength(0);
    expect(activity()).toEqual([expect.objectContaining({ relayCredentialKind: "loginToken", error: "RELAY_LOGIN_TOKENS_OFF" })]);
  });

  it("refuses a login token that is not stored, and an expired Codex login (RELAY_LOGIN_TOKEN_NOT_SET, RELAY_LOGIN_EXPIRED)", async () => {
    loginTokensOn = true;
    claudeLoginStored = false;
    codexLogin = { kind: "expired" };
    await startRelayedNode(relayed(new Set(["claude_agent_sdk", "codex_app_server"])));
    const claude = await host.providerRelayAccess.prepareForRun(run, "anthropic", "claude_agent_sdk");
    const noToken = await fetch(`${claude.baseUrl}/v1/messages`, { method: "POST", body: BODY, headers: { authorization: `Bearer ${claude.pass}` } });
    expect(await noToken.json()).toMatchObject({ error: { code: "RELAY_LOGIN_TOKEN_NOT_SET" } });
    const codex = host.providerRelayAccess.prepareForNode("openai", "codex_app_server");
    const expired = await fetch(`${codex.baseUrl}/backend-api/codex/responses`, { method: "POST", body: "{}", headers: { authorization: `Bearer ${codex.pass}` } });
    const answer = await expired.json() as { error: { code: string; message: string } };
    expect(answer.error.code).toBe("RELAY_LOGIN_EXPIRED");
    expect(answer.error.message).toContain("sign in again in Codex");
    expect(seen).toHaveLength(0);
  });

  it("Codex ChatGPT mode with the node pass: the relay node's access token and account, the caller's account dropped (P-6)", async () => {
    loginTokensOn = true;
    await startRelayedNode(relayed(new Set(["codex_app_server"])));
    const codex = host.providerRelayAccess.prepareForNode("openai", "codex_app_server");
    expect(codex.relayCredentialKind).toBe("loginToken");
    const response = await fetch(`${codex.baseUrl}/backend-api/codex/responses`, {
      method: "POST", body: '{"model":"gpt-6.1-terra"}',
      headers: { authorization: `Bearer ${codex.pass}`, "chatgpt-account-id": "autobyteus-relay", "content-type": "application/json" },
    });
    expect(response.status).toBe(200);
    expect(seen[0]).toMatchObject({ url: "/backend-api/codex/responses" });
    expect(seen[0]!.headers.authorization).toBe(`Bearer ${CODEX_ACCESS}`);
    expect(seen[0]!.headers["chatgpt-account-id"]).toBe(CODEX_ACCOUNT);
    expectNoSecretAnywhere(codex.pass);
  });

  it("keeps the provider's query (Gemini `alt=sse`) without the peer envelope, and a provider 401 stays the provider's (AR-004)", async () => {
    await startRelayedNode(relayed());
    const gemini = await host.providerRelayAccess.prepareForRun(run, "gemini", "autobyteus");
    const streamed = await fetch(`${gemini.baseUrl}/v1beta/models/gemini-x:streamGenerateContent?alt=sse`, {
      method: "POST", body: "{}", headers: { "x-goog-api-key": gemini.pass, "content-type": "application/json" },
    });
    expect(streamed.status).toBe(200);
    expect(seen[0]!.url).toBe("/v1beta/models/gemini-x:streamGenerateContent?alt=sse");
    expect(seen[0]!.headers["x-goog-api-key"]).toBe(GEMINI_KEY);
    const anthropic = await host.providerRelayAccess.prepareForRun(run, "anthropic", "autobyteus");
    const providerRefusal = await fetch(`${anthropic.baseUrl}/v1/messages/count_tokens`, { method: "POST", body: BODY, headers: { "x-api-key": anthropic.pass } });
    expect(providerRefusal.status).toBe(401);
    expect(await providerRefusal.json()).toEqual({ type: "error", error: { type: "authentication_error", message: "provider says no" } });
  });

  it("NAS-43 refuses before any provider call when the relay node does not accept this node: unpaired there, a wrong secret (AC-003)", async () => {
    await startRelayedNode(relayed());
    const access = await host.providerRelayAccess.prepareForRun(run, "anthropic", "autobyteus");
    const call = () => fetch(`${access.baseUrl}/v1/messages`, { method: "POST", body: BODY, headers: { "x-api-key": access.pass } });
    relayPeerSecrets = {};
    expect(await (await call()).json()).toMatchObject({ error: { code: "RELAY_PEER_NOT_ACCEPTED" } });
    relayPeerSecrets = { [RELAYED]: SECRET };
    ownSecret = "a-different-secret";
    expect(await (await call()).json()).toMatchObject({ error: { code: "RELAY_PEER_NOT_ACCEPTED" } });
    expect(seen).toHaveLength(0);
    expect(activity()).toEqual([]);
  });

  it("refuses locally, never falling back to local credentials: not paired here, remote collaboration off, relay node unreachable", async () => {
    await startRelayedNode(relayed());
    const access = await host.providerRelayAccess.prepareForRun(run, "anthropic", "autobyteus");
    const call = () => fetch(`${access.baseUrl}/v1/messages`, { method: "POST", body: BODY, headers: { "x-api-key": access.pass } });
    pairedHere = false;
    expect(await (await call()).json()).toMatchObject({ error: { code: "RELAY_PEER_UNAVAILABLE" } });
    pairedHere = true;
    remoteOn = false;
    expect(await (await call()).json()).toMatchObject({ error: { code: "RELAY_PEER_UNAVAILABLE" } });
    remoteOn = true;
    relayAddress = "http://127.0.0.1:9";
    const unreachable = await call();
    expect(unreachable.status).toBe(502);
    expect(await unreachable.json()).toMatchObject({ error: { code: "RELAY_PEER_UNREACHABLE" } });
    expect(seen).toHaveLength(0);
  });

  it("refuses a relay C1 does not list, before anything is sent (RELAY_NOT_LISTED)", async () => {
    await startRelayedNode(relayed());
    await expect(host.providerRelayAccess.prepareForRun(run, "xai", "grok_build")).rejects.toThrow("RELAY_NOT_LISTED");
    await expect(host.providerRelayAccess.prepareForRun(run, "kimi", "autobyteus")).rejects.toThrow("RELAY_NOT_LISTED");
  });
});
