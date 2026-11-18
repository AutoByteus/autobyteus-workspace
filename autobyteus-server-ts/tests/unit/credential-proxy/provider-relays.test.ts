import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { RunPassRegistry } from "../../../src/credential-proxy/run-pass-registry.js";
import { RegistryRunPassRevocation } from "../../../src/credential-proxy/run-pass-revocation.js";
import { CredentialProxyForwarder } from "../../../src/credential-proxy/credential-proxy-forwarder.js";
import { AnthropicMessagesStreamReader } from "../../../src/credential-proxy/provider-relays/anthropic-messages-stream-reader.js";
import {
  DefaultProviderRelayAccess,
  ProviderCallObservers,
  ProviderRelayKeyMissingError,
} from "../../../src/credential-proxy/provider-relays/provider-relay-access.js";
import { createDeepSeekProviderRelay, ProviderRelays } from "../../../src/credential-proxy/provider-relays/provider-relays.js";
import type { ProviderCallObservation } from "../../../src/credential-proxy/provider-relays/provider-call-observation.js";

const RUN = { runId: "run-1", agentDefinitionId: "agent-a" };
const GRANT = { integrationId: "github", skillName: "github-integration", sourceId: "local:/tmp/integrations" };

describe("run passes with a provider relay grant", () => {
  it("keeps the relay grant when integrations are issued or cleared, and ends it with the pass (AR-008)", () => {
    const passes = new RunPassRegistry();
    const pass = passes.grantProviderRelay(RUN, "deepseek");
    expect(passes.lookup(pass)).toMatchObject({ runId: "run-1", providerRelayId: "deepseek", grants: new Map() });
    expect(passes.issue(RUN, [GRANT])).toBe(pass);
    expect(passes.lookup(pass)).toMatchObject({ providerRelayId: "deepseek" });
    expect(passes.lookup(pass)!.grants.get("github")).toEqual(GRANT);
    passes.clearGrants("run-1");
    expect(passes.lookup(pass)).toMatchObject({ providerRelayId: "deepseek", grants: new Map() });
    expect(passes.grantProviderRelay(RUN, "deepseek")).toBe(pass);

    const revocation = new RegistryRunPassRevocation(passes);
    revocation.revokeForRun("run-1");
    revocation.revokeForRun("run-1");
    expect(passes.lookup(pass)).toBeNull();
  });

  it("issues an integration-only pass without a relay", () => {
    const passes = new RunPassRegistry();
    expect(passes.lookup(passes.issue(RUN, [GRANT]))?.providerRelayId).toBeNull();
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
  const accessWith = (status: "CONFIGURED" | "MISSING") => {
    const passes = new RunPassRegistry();
    const management = { getStatusForConsumer: vi.fn(async () => status) };
    const access = new DefaultProviderRelayAccess({
      relays: new ProviderRelays(), passes, observers: new ProviderCallObservers(),
      management: () => management as never, proxyBaseUrl: () => "http://127.0.0.1:5000",
    });
    return { access, passes, management };
  };

  it("grants the relay on the run's pass and gives its base URL without the pass", async () => {
    const { access, passes, management } = accessWith("CONFIGURED");
    const granted = await access.prepareForRun(RUN, "deepseek");
    expect(granted.baseUrl).toBe("http://127.0.0.1:5000/relay/deepseek");
    expect(granted.baseUrl).not.toContain(granted.apiKey);
    expect(passes.lookup(granted.apiKey)?.providerRelayId).toBe("deepseek");
    expect(management.getStatusForConsumer).toHaveBeenCalledWith(
      { kind: "agentRuntime", runtimeKind: "deepseek_harness", credentialSlot: "apiKey" });
    expect(access.relayBaseUrl("deepseek")).toBe("http://127.0.0.1:5000/relay/deepseek");
  });

  it("refuses a run when the vault holds no key, granting nothing", async () => {
    const { access, passes } = accessWith("MISSING");
    const failure = await access.prepareForRun(RUN, "deepseek").catch((error) => error);
    expect(failure).toBeInstanceOf(ProviderRelayKeyMissingError);
    expect((failure as Error).message)
      .toBe("RELAY_KEY_NOT_SET: The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys.");
    expect(passes.grantProviderRelay(RUN, "deepseek")).toMatch(/^rp_/);
  });

  it("refuses an unknown relay", async () => {
    await expect(accessWith("CONFIGURED").access.prepareForRun(RUN, "other")).rejects.toThrow("PROVIDER_RELAY_UNKNOWN: other");
  });
});

describe("the DeepSeek relay definition", () => {
  it("allows only POST to the Messages path on DeepSeek's Anthropic API, with the key in x-api-key (QR-002)", () => {
    const { route } = createDeepSeekProviderRelay();
    expect(route).toMatchObject({
      origin: "https://api.deepseek.com", basePath: "/anthropic", auth: "x-api-key",
      buffersRequestBody: false, redactsTextBodies: false, mapsUnauthorizedToForbidden: false,
    });
    expect(route.allows("POST", "/anthropic/v1/messages")).toBe(true);
    expect(route.allows("GET", "/anthropic/v1/messages")).toBe(false);
    expect(route.allows("POST", "/anthropic/v1/models")).toBe(false);
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
    const response = await forwarder.forward({
      route: createDeepSeekProviderRelay().route,
      token: SecretValue.fromString("sk-vault-key"),
      request: {
        method: "POST", rawPathAndQuery: "/v1/messages",
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
