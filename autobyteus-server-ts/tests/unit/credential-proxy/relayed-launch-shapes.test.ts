/**
 * autobyteus-581 DS-001 / DS-005: each runtime's launch shape on a relayed node, by relay credential kind (P-3, P-4,
 * P-5, P-6, P-13), with none of the node's own credentials; relayed sign-in from C1 alone; and Claude's API-key mode
 * signed in from the vault (FU-001). Request shapes on the wire are proven by the two-node relay test and the live
 * checks; here the launch inputs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildClaudeRelayedSpawnEnvironment } from "../../../src/runtime-management/claude/client/claude-sdk-spawn-environment.js";
import { resolveCodexAppServerLaunch } from "../../../src/runtime-management/codex/client/codex-app-server-launch-config.js";
import { AgentRuntimeSignInReader } from "../../../src/runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import { createClaudeAgentRuntimeStrategy } from "../../../src/runtime-management/agent-runtimes/strategies/claude-agent-runtime-strategy.js";
import { parseRelayedNodeSettings } from "../../../src/credential-proxy/provider-relays/provider-relay-settings.js";
import type { AgentRuntimeStrategy } from "../../../src/runtime-management/agent-runtimes/agent-runtime-strategy.js";
import { providerRelayAccessDouble } from "../../helpers/provider-relay-access-double.js";
import type { SecretConsumerIdentity } from "../../../src/secret-management/domain/secret-id.js";
import { readRelayOffer } from "../../../src/credential-proxy/provider-relay-peer/relay-offer.js";
import { ProviderRelays } from "../../../src/credential-proxy/provider-relays/provider-relays.js";

const RELAY = { baseUrl: "http://127.0.0.1:5000/relay/anthropic", pass: "rp_node_pass", relayCredentialKind: "apiKey" as const };
const NODE_ID = "srv_relaynode_000000000000000000000000000";

afterEach(() => { vi.unstubAllEnvs(); });

describe("C1 relayed-node settings", () => {
  const parse = (values: Record<string, string>) => parseRelayedNodeSettings((key) => values[key]);
  it("reads the relay peer, its relays and the login-token runtimes; empty peer means not relayed", () => {
    expect(parse({})).toBeNull();
    expect(parse({
      AUTOBYTEUS_PROVIDER_RELAY_PEER: NODE_ID,
      AUTOBYTEUS_PROVIDER_RELAYS: "anthropic, openai,deepseek",
      AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "claude_agent_sdk",
    })).toEqual({ relayPeerNodeId: NODE_ID, relays: new Set(["anthropic", "openai", "deepseek"]), loginTokenRuntimes: new Set(["claude_agent_sdk"]), codexAccountId: null });
    expect(parse({
      AUTOBYTEUS_PROVIDER_RELAY_PEER: NODE_ID,
      AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "codex_app_server",
      AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID: "acct-relay",
    })?.codexAccountId).toBe("acct-relay");
  });

  it("stops startup with the reason on a malformed value, never reading it as not relayed", () => {
    expect(() => parse({ AUTOBYTEUS_PROVIDER_RELAY_PEER: "http://host:8000" })).toThrow("PROVIDER_RELAY_SETTINGS_INVALID");
    expect(() => parse({ AUTOBYTEUS_PROVIDER_RELAY_PEER: NODE_ID, AUTOBYTEUS_PROVIDER_RELAYS: "anthropic,antigravity" })).toThrow("unknown relay 'antigravity'");
    expect(() => parse({ AUTOBYTEUS_PROVIDER_RELAY_PEER: NODE_ID, AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "autobyteus" })).toThrow("names 'autobyteus'");
    expect(() => parse({ AUTOBYTEUS_PROVIDER_RELAYS: "anthropic" })).toThrow("need AUTOBYTEUS_PROVIDER_RELAY_PEER");
    // DEC-115: Codex's account ID comes exactly with Codex on the login token.
    expect(() => parse({ AUTOBYTEUS_PROVIDER_RELAY_PEER: NODE_ID, AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "codex_app_server" })).toThrow("AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID");
    expect(() => parse({ AUTOBYTEUS_PROVIDER_RELAY_PEER: NODE_ID, AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID: "acct" })).toThrow("AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID");
  });
});

describe("Claude's relayed spawn environment (P-3, P-4)", () => {
  const own = { ANTHROPIC_API_KEY: "sk-own", CLAUDE_CODE_OAUTH_TOKEN: "own-token", CLAUDE_AGENT_SDK_AUTH_MODE: "api-key", ANTHROPIC_AUTH_TOKEN: "x", PATH: "/bin" };
  it("API key: the relay as base URL and the pass in ANTHROPIC_API_KEY; no own credential", () => {
    const env = buildClaudeRelayedSpawnEnvironment(own, RELAY);
    expect(env).toMatchObject({ ANTHROPIC_BASE_URL: RELAY.baseUrl, ANTHROPIC_API_KEY: "rp_node_pass", PATH: "/bin" });
    expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(env.CLAUDE_AGENT_SDK_AUTH_MODE).toBeUndefined();
  });
  it("login token: the pass in CLAUDE_CODE_OAUTH_TOKEN, so Claude Code sends Bearer with its OAuth beta", () => {
    const env = buildClaudeRelayedSpawnEnvironment(own, { ...RELAY, relayCredentialKind: "loginToken" });
    expect(env).toMatchObject({ ANTHROPIC_BASE_URL: RELAY.baseUrl, CLAUDE_CODE_OAUTH_TOKEN: "rp_node_pass" });
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(Object.values(env)).not.toContain("sk-own");
  });
});

describe("Codex's relayed app-server launch (P-5, P-6, P-13)", () => {
  it("unrelayed: as configured, in the server's environment", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-own");
    const launch = resolveCodexAppServerLaunch(null);
    expect(launch.args).toEqual(["app-server", "-c", "agents.enabled=false"]);
    expect(launch.env.OPENAI_API_KEY).toBe("sk-own");
  });

  it("API key: a custom provider on the relay with the node pass as its bearer, and no own key", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-own");
    const launch = resolveCodexAppServerLaunch({ ...RELAY, baseUrl: "http://127.0.0.1:5000/relay/openai" });
    expect(launch.args).toEqual([
      "app-server", "-c", "agents.enabled=false",
      "-c", 'model_providers.autobyteus_relay={name="AutoByteus relay",base_url="http://127.0.0.1:5000/relay/openai/v1",experimental_bearer_token="rp_node_pass",wire_api="responses"}',
      "-c", "model_provider=autobyteus_relay",
    ]);
    expect(launch.env.OPENAI_API_KEY).toBeUndefined();
  });

  it("login token: ChatGPT and model calls on the relay, with the relay node's account and the node pass in its own CODEX_HOME, never ~/.codex (DEC-115)", () => {
    vi.stubEnv("CODEX_HOME", path.join(os.homedir(), ".codex"));
    const appData = fs.mkdtempSync(path.join(os.tmpdir(), "codex-relay-"));
    try {
      const launch = resolveCodexAppServerLaunch(
        { baseUrl: "http://127.0.0.1:5000/relay/openai", pass: "rp_node_pass", relayCredentialKind: "loginToken" }, () => appData, () => "acct-relay");
      expect(launch.args.slice(-4)).toEqual([
        "-c", 'chatgpt_base_url="http://127.0.0.1:5000/relay/openai/backend-api/"',
        "-c", 'openai_base_url="http://127.0.0.1:5000/relay/openai/backend-api/codex"',
      ]);
      expect(launch.env.CODEX_HOME).toBe(path.join(appData, "codex-relay-home"));
      const auth = JSON.parse(fs.readFileSync(path.join(appData, "codex-relay-home", "auth.json"), "utf8"));
      expect(auth).toMatchObject({ auth_mode: "chatgpt", tokens: { access_token: "rp_node_pass", account_id: "acct-relay" } });
      const claims = JSON.parse(Buffer.from(String(auth.tokens.id_token).split(".")[1], "base64url").toString("utf8"));
      expect(claims["https://api.openai.com/auth"].chatgpt_account_id).toBe("acct-relay");
      expect(() => resolveCodexAppServerLaunch(
        { baseUrl: "http://127.0.0.1:5000/relay/openai", pass: "rp_node_pass", relayCredentialKind: "loginToken" }, () => appData, () => null))
        .toThrow("AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID");
      expect(fs.statSync(path.join(appData, "codex-relay-home", "auth.json")).mode & 0o777).toBe(0o600);
    } finally {
      fs.rmSync(appData, { recursive: true, force: true });
    }
  });
});

describe("runtime sign-in on a relayed node (DS-005)", () => {
  const strategy = (runtimeKind: string): AgentRuntimeStrategy => ({
    runtimeKind, readSignIn: vi.fn(async () => ({ state: "signedIn" as const })),
    resolveExecutable: () => runtimeKind,
  }) as unknown as AgentRuntimeStrategy;
  const strategies = ["codex_app_server", "claude_agent_sdk", "antigravity_cli", "grok_build", "deepseek_harness"].map(strategy);

  it("unrelayed: each runtime's own reading", async () => {
    const reader = new AgentRuntimeSignInReader(strategies, () => providerRelayAccessDouble());
    expect(await reader.read("grok_build" as never, { cwd: "/" })).toEqual({ state: "signedIn" });
    expect(strategies[3]!.readSignIn).toHaveBeenCalled();
  });

  it("relayed: C1 decides; Antigravity cannot run there (DEC-101); the runtimes' own logins are never asked", async () => {
    vi.mocked(strategies[3]!.readSignIn).mockClear();
    const access = providerRelayAccessDouble({
      isRelayed: () => true,
      statusOf: (kind: string) => (kind === "grok_build"
        ? { state: "signedOut" as const, detail: "The relay node offers no xAI credential." } : { state: "signedIn" as const }),
    });
    const reader = new AgentRuntimeSignInReader(strategies, () => access);
    expect(await reader.read("claude_agent_sdk" as never, { cwd: "/" })).toEqual({ state: "signedIn" });
    expect(await reader.read("grok_build" as never, { cwd: "/" })).toEqual({ state: "signedOut", detail: "The relay node offers no xAI credential." });
    expect(await reader.read("antigravity_cli" as never, { cwd: "/" })).toMatchObject({ state: "signedOut" });
    expect(strategies[3]!.readSignIn).not.toHaveBeenCalled();
  });
});

describe("Claude in API-key mode reads its sign-in from the vault (FU-001)", () => {
  it("signed in with the vault key, signed out with the reason without it; never `claude auth status`", async () => {
    const configured = createClaudeAgentRuntimeStrategy({
      env: { CLAUDE_AGENT_SDK_AUTH_MODE: "api-key" }, management: () => ({ getStatusForConsumer: async () => "CONFIGURED" as const }),
    });
    expect(await configured.readSignIn("/nonexistent/claude", "/")).toEqual({ state: "signedIn" });
    const missing = createClaudeAgentRuntimeStrategy({
      env: { CLAUDE_AGENT_SDK_AUTH_MODE: "api-key" }, management: () => ({ getStatusForConsumer: async () => "MISSING" as const }),
    });
    expect(await missing.readSignIn("/nonexistent/claude", "/")).toMatchObject({ state: "signedOut", detail: expect.stringContaining("Anthropic API key") });
  });
});

describe("the relay offer a new sandbox gets (DEC-109, DEC-115)", () => {
  const relays = new ProviderRelays();
  const management = (configured: string[]) => () => ({
    getStatusForConsumer: async (consumer: SecretConsumerIdentity) =>
      (consumer.kind === "providerRelay" && configured.includes(`${consumer.relayId}/${consumer.relayCredentialKind}`) ? "CONFIGURED" as const : "MISSING" as const),
  });
  const logins = (codex: "found" | "missing") => ({
    readCodexLogin: async () => (codex === "found" ? { kind: "found" as const, credential: { secret: "t", accountId: "acct-relay" } } : { kind: "missing" as const }),
    readGrokLogin: async () => ({ kind: "expired" as const }),
  });
  it("lists API-key relays; with the switch on the login-token runtimes, and Codex's account ID beside Codex", async () => {
    expect(await readRelayOffer({ relays, management: management(["anthropic/apiKey", "openai/apiKey", "anthropic/loginToken"]), logins: logins("found"), loginTokensEnabled: () => false }))
      .toEqual({ AUTOBYTEUS_PROVIDER_RELAYS: "anthropic,openai", AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "" });
    expect(await readRelayOffer({ relays, management: management(["anthropic/apiKey", "anthropic/loginToken"]), logins: logins("found"), loginTokensEnabled: () => true }))
      .toEqual({ AUTOBYTEUS_PROVIDER_RELAYS: "anthropic", AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "claude_agent_sdk,codex_app_server", AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID: "acct-relay" });
    expect(await readRelayOffer({ relays, management: management([]), logins: logins("missing"), loginTokensEnabled: () => true }))
      .toEqual({ AUTOBYTEUS_PROVIDER_RELAYS: "", AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "" });
  });
});
