import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { RunPassRegistry } from "../../../src/credential-proxy/run-pass-registry.js";
import { RegistryRunPassRevocation } from "../../../src/credential-proxy/run-pass-revocation.js";
import { CredentialProxyForwarder } from "../../../src/credential-proxy/credential-proxy-forwarder.js";
import { AnthropicMessagesStreamReader } from "../../../src/credential-proxy/provider-relays/anthropic-messages-stream-reader.js";
import {
  DefaultProviderRelayAccess,
  ProviderCallObservers,
  ProviderRelayKeyMissingError,
  ProviderRelayUnavailableError,
} from "../../../src/credential-proxy/provider-relays/provider-relay-access.js";
import { ProviderRelays } from "../../../src/credential-proxy/provider-relays/provider-relays.js";
import type { ProviderCallObservation } from "../../../src/credential-proxy/provider-relays/provider-call-observation.js";

const RUN = { runId: "run-1", agentDefinitionId: "agent-a" };
const GRANT = { integrationId: "github", skillName: "github-integration", sourceId: "local:/tmp/integrations" };

describe("run passes with a provider relay grant", () => {
  it("keeps the relay grant (with its kind) when integrations are issued or cleared, and ends it with the pass (AR-008)", () => {
    const passes = new RunPassRegistry();
    const pass = passes.grantProviderRelay(RUN, "deepseek", "apiKey");
    expect(passes.lookup(pass)).toMatchObject({ kind: "run", runId: "run-1", providerRelays: new Map([["deepseek", "apiKey"]]), grants: new Map() });
    expect(passes.issue(RUN, [GRANT])).toBe(pass);
    expect(passes.lookup(pass)).toMatchObject({ providerRelays: new Map([["deepseek", "apiKey"]]) });
    const holder = passes.lookup(pass);
    expect(holder?.kind === "run" && holder.grants.get("github")).toEqual(GRANT);
    passes.clearGrants("run-1");
    expect(passes.lookup(pass)).toMatchObject({ providerRelays: new Map([["deepseek", "apiKey"]]), grants: new Map() });
    expect(passes.grantProviderRelay(RUN, "anthropic", "loginToken")).toBe(pass);
    expect(passes.lookup(pass)?.providerRelays).toEqual(new Map([["deepseek", "apiKey"], ["anthropic", "loginToken"]]));

    const revocation = new RegistryRunPassRevocation(passes);
    revocation.revokeForRun("run-1");
    revocation.revokeForRun("run-1");
    expect(passes.lookup(pass)).toBeNull();
  });

  it("issues an integration-only pass without a relay", () => {
    const passes = new RunPassRegistry();
    expect(passes.lookup(passes.issue(RUN, [GRANT]))?.providerRelays.size).toBe(0);
  });

  it("keeps one node pass for the node's shared processes, holding no integration (C1)", () => {
    const passes = new RunPassRegistry();
    const pass = passes.grantNodeProviderRelay("openai", "apiKey");
    expect(passes.grantNodeProviderRelay("anthropic", "loginToken")).toBe(pass);
    expect(passes.lookup(pass)).toEqual({ kind: "node", providerRelays: new Map([["openai", "apiKey"], ["anthropic", "loginToken"]]) });
  });
});

describe("provider call observers", () => {
  it("removes exactly one registration: a later generation survives the earlier one's late unsubscribe", () => {
    const observers = new ProviderCallObservers();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = observers.add("run-1", first);
    observers.add("run-1", second);
    unsubscribeFirst();
    unsubscribeFirst();
    const observation: ProviderCallObservation = { kind: "activity", callId: "c-1" };
    observers.notify("run-1", observation);
    observers.notify("run-2", observation);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith(observation);
  });

  it("keeps delivering when one listener throws", () => {
    const observers = new ProviderCallObservers();
    const after = vi.fn();
    observers.add("run-1", () => { throw new Error("boom"); });
    observers.add("run-1", after);
    observers.notify("run-1", { kind: "activity", callId: "c-1" });
    expect(after).toHaveBeenCalledOnce();
  });
});

describe("provider relay access", () => {
  const RELAYED = {
    relayPeerNodeId: "srv_relay",
    relays: new Set(["anthropic", "openai", "deepseek"]),
    loginTokenRuntimes: new Set(["claude_agent_sdk" as const]),
  };
  const accessWith = (status: "CONFIGURED" | "MISSING", relayed: typeof RELAYED | null = null) => {
    const passes = new RunPassRegistry();
    const management = { getStatusForConsumer: vi.fn(async () => status) };
    const access = new DefaultProviderRelayAccess({
      relayed, relays: new ProviderRelays(), passes, observers: new ProviderCallObservers(),
      management: () => management as never, proxyBaseUrl: () => "http://127.0.0.1:5000",
    });
    return { access, passes, management };
  };

  it("grants the relay on the run's pass and gives its base URL without the pass", async () => {
    const { access, passes, management } = accessWith("CONFIGURED");
    const granted = await access.prepareForRun(RUN, "deepseek", "deepseek_harness");
    expect(granted.baseUrl).toBe("http://127.0.0.1:5000/relay/deepseek");
    expect(granted.relayCredentialKind).toBe("apiKey");
    expect(granted.baseUrl).not.toContain(granted.pass);
    expect(passes.lookup(granted.pass)?.providerRelays.get("deepseek")).toBe("apiKey");
    expect(management.getStatusForConsumer).toHaveBeenCalledWith({ kind: "providerRelay", relayId: "deepseek", relayCredentialKind: "apiKey" });
    expect(access.relayBaseUrl("deepseek")).toBe("http://127.0.0.1:5000/relay/deepseek");
  });

  it("refuses a run when the vault holds no key, granting nothing", async () => {
    const { access, passes } = accessWith("MISSING");
    const failure = await access.prepareForRun(RUN, "deepseek", "deepseek_harness").catch((error) => error);
    expect(failure).toBeInstanceOf(ProviderRelayKeyMissingError);
    expect((failure as Error).message)
      .toBe("RELAY_KEY_NOT_SET: The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys.");
    expect(passes.grantProviderRelay(RUN, "deepseek", "apiKey")).toMatch(/^rp_/);
  });

  it("refuses an unknown relay", async () => {
    await expect(accessWith("CONFIGURED").access.prepareForRun(RUN, "other", "deepseek_harness")).rejects.toThrow("PROVIDER_RELAY_UNKNOWN: other");
  });

  it("unrelayed: every runtime direct except DeepSeek Harness, every native provider direct, no node pass", () => {
    const { access } = accessWith("CONFIGURED");
    expect(access.isRelayed()).toBe(false);
    expect(access.routeFor("claude_agent_sdk")).toEqual({ kind: "direct" });
    expect(access.routeFor("grok_build")).toEqual({ kind: "direct" });
    expect(access.routeFor("deepseek_harness")).toEqual({ kind: "relay", relayId: "deepseek", relayCredentialKind: "apiKey" });
    expect(access.routeForNativeProvider("ANTHROPIC")).toEqual({ kind: "direct" });
    expect(() => access.prepareForNode("openai", "codex_app_server")).toThrow("PROVIDER_RELAY_NODE_PASS_UNRELAYED");
  });

  it("relayed: the kind per runtime by C1 (AR-003): Claude login token, native Anthropic API key, Grok unavailable", async () => {
    const { access, passes, management } = accessWith("MISSING", RELAYED);
    expect(access.isRelayed()).toBe(true);
    expect(access.routeFor("claude_agent_sdk")).toEqual({ kind: "relay", relayId: "anthropic", relayCredentialKind: "loginToken" });
    expect(access.routeFor("codex_app_server")).toEqual({ kind: "relay", relayId: "openai", relayCredentialKind: "apiKey" });
    expect(access.routeFor("grok_build")).toMatchObject({ kind: "unavailable" });
    expect(access.routeForNativeProvider("ANTHROPIC")).toEqual({ kind: "relay", relayId: "anthropic", relayCredentialKind: "apiKey" });
    expect(access.routeForNativeProvider("GEMINI")).toMatchObject({ kind: "unavailable" });
    expect(access.routeForNativeProvider("OLLAMA")).toEqual({ kind: "direct" });
    expect(access.statusOf("claude_agent_sdk")).toEqual({ state: "signedIn" });
    expect(access.statusOf("grok_build")).toMatchObject({ state: "signedOut", detail: expect.stringContaining("xai") });

    // No local vault check on a relayed node (AR-002): the relay node holds the keys.
    const claude = await access.prepareForRun(RUN, "anthropic", "claude_agent_sdk");
    const native = await access.prepareForRun({ runId: "run-2", agentDefinitionId: "a" }, "anthropic", "autobyteus");
    expect(claude.relayCredentialKind).toBe("loginToken");
    expect(native.relayCredentialKind).toBe("apiKey");
    expect(management.getStatusForConsumer).not.toHaveBeenCalled();
    await expect(access.prepareForRun(RUN, "xai", "grok_build")).rejects.toBeInstanceOf(ProviderRelayUnavailableError);
    await expect(access.prepareForRun(RUN, "gemini", "autobyteus")).rejects.toThrow("RELAY_NOT_LISTED");

    const node = access.prepareForNode("openai", "codex_app_server");
    expect(passes.lookup(node.pass)).toEqual({ kind: "node", providerRelays: new Map([["openai", "apiKey"]]) });
  });
});

describe("the relay table (C3)", () => {
  const relays = new ProviderRelays();
  it("DeepSeek: dsh's Messages path and native DeepSeek's chat path, POST only, the key in x-api-key", () => {
    const route = relays.get("deepseek")!.routes.apiKey;
    expect(route.route).toMatchObject({ origin: "https://api.deepseek.com", basePath: "", buffersRequestBody: false });
    expect(route.route.allows("POST", "/anthropic/v1/messages")).toBe(true);
    expect(route.route.allows("POST", "/chat/completions")).toBe(true);
    expect(route.route.allows("GET", "/anthropic/v1/messages")).toBe(false);
    expect(route.route.allows("POST", "/anthropic/v1/models")).toBe(false);
    expect(route.attach({ secret: "k", accountId: null })).toEqual({ "x-api-key": "k" });
    expect(relays.get("deepseek")!.routes.loginToken).toBeNull();
    expect(relays.get("deepseek")!.observation).toEqual({ streamReader: "anthropic-messages", compactionHeader: "x-deepseek-harness-compact" });
  });

  it("per-kind routes: Anthropic key vs login token; OpenAI key vs ChatGPT login with the account (P-4, P-6)", () => {
    const anthropic = relays.get("anthropic")!;
    expect(anthropic.routes.apiKey.attach({ secret: "k", accountId: null })).toEqual({ "x-api-key": "k" });
    expect(anthropic.routes.loginToken!.attach({ secret: "t", accountId: null })).toEqual({ authorization: "Bearer t" });
    expect(anthropic.routes.loginToken!.source).toEqual({ kind: "vault", consumer: { kind: "providerRelay", relayId: "anthropic", relayCredentialKind: "loginToken" } });
    const chatgpt = relays.get("openai")!.routes.loginToken!;
    expect(chatgpt.route.origin).toBe("https://chatgpt.com");
    expect(chatgpt.route.allows("POST", "/backend-api/codex/responses")).toBe(true);
    expect(chatgpt.route.allows("GET", "/backend-api/wham/accounts/check")).toBe(true);
    expect(chatgpt.route.allows("POST", "/backend-api/conversation")).toBe(false);
    expect(chatgpt.attach({ secret: "t", accountId: "acct" })).toEqual({ authorization: "Bearer t", "chatgpt-account-id": "acct" });
    expect(chatgpt.dropFromCaller).toEqual(["chatgpt-account-id"]);
    expect(relays.get("openai")!.routes.apiKey.route.allows("POST", "/v1/files")).toBe(false);
    expect(relays.get("gemini")!.routes.apiKey.attach({ secret: "g", accountId: null })).toEqual({ "x-goog-api-key": "g" });
  });
});

describe("Anthropic Messages stream reader", () => {
  const sse = (events: Array<[string, Record<string, unknown>]>) =>
    events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");

  it("reads the call's usage and stop reason across chunk boundaries (RT-021)", () => {
    const stream = sse([
      ["message_start", { type: "message_start", message: { usage: {
        input_tokens: 1200, cache_read_input_tokens: 4096, cache_creation_input_tokens: 0, output_tokens: 1 } } }],
      ["content_block_delta", { type: "content_block_delta", delta: { type: "text_delta", text: "hi" } }],
      ["message_delta", { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 57 } }],
      ["message_stop", { type: "message_stop" }],
    ]).replace(/\n/g, "\r\n");
    const reader = new AnthropicMessagesStreamReader();
    const bytes = Buffer.from(stream, "utf8");
    for (let at = 0; at < bytes.length; at += 7) reader.push(bytes.subarray(at, at + 7));
    expect(reader.usage()).toEqual({ inputTokens: 1200, outputTokens: 57, cacheReadInputTokens: 4096, cacheCreationInputTokens: 0 });
    expect(reader.stopReason()).toBe("tool_use");
  });

  it("reports no usage for a stream without counts", () => {
    const reader = new AnthropicMessagesStreamReader();
    reader.push(Buffer.from('{"type":"error","error":{"type":"overloaded_error"}}'));
    expect(reader.usage()).toBeNull();
    expect(reader.stopReason()).toBeNull();
  });
});

describe("credential proxy forwarder with an x-api-key route", () => {
  it("sends the key alone in x-api-key, never the caller's x-api-key or authorization, and streams the body", async () => {
    const fetchImpl = vi.fn(async (_url: URL, _init: RequestInit) => new Response("data: {}\n\n", {
      status: 200, headers: { "content-type": "text/event-stream" },
    }));
    const forwarder = new CredentialProxyForwarder(fetchImpl as unknown as typeof fetch);
    const route = new ProviderRelays().get("deepseek")!.routes.apiKey;
    const response = await forwarder.forward({
      route: route.route,
      credential: { headers: route.attach({ secret: "sk-vault-key", accountId: null }), secrets: ["sk-vault-key"] },
      request: {
        method: "POST", rawPathAndQuery: "/anthropic/v1/messages",
        headers: { "x-api-key": "rp_pass", authorization: "Bearer other", "content-type": "application/json", "anthropic-version": "2023-06-01" },
        body: Readable.from([Buffer.from('{"model":"deepseek-v4-flash","dsh_session_log":{}}')]),
      },
      proxyRouteBase: "http://127.0.0.1:5000/relay/deepseek",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://api.deepseek.com/anthropic/v1/messages");
    const headers = new Headers(init.headers);
    expect(headers.get("x-api-key")).toBe("sk-vault-key");
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("anthropic-version")).toBe("2023-06-01");
    expect((init as { duplex?: string }).duplex).toBe("half");
    expect(response.body).toBeInstanceOf(Readable);
  });
});
