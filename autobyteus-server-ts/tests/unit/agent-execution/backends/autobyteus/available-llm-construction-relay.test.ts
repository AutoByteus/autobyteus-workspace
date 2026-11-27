/**
 * autobyteus-581 DS-001 (native) / FU-003: on a relayed node a native LLM calls its provider's relay with the run's
 * pass as its key, through the real autobyteus-ts client; a provider the relay node offers no key for refuses before
 * any call. Only `fetch` and model availability are doubled.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import { providerRelayAccessDouble } from "../../../../helpers/provider-relay-access-double.js";

vi.mock("../../../../../src/llm-management/services/model-availability-service.js", () => ({
  getModelAvailabilityService: () => ({ ensureModelAvailable: async () => undefined }),
}));

const { createAvailableLlm } = await import("../../../../../src/agent-execution/backends/autobyteus/available-llm-construction.js");

const RUN = { runId: "run-native", agentDefinitionId: "agent-n" };
let anthropicModel = "";

beforeAll(async () => {
  anthropicModel = (await LLMFactory.listModelsByProvider(LLMProvider.ANTHROPIC))[0]!.model_identifier;
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("native LLM construction on a relayed node", () => {
  it("calls the relay under Anthropic's own path with the run's pass in x-api-key", async () => {
    const prepareForRun = vi.fn(async () => ({ baseUrl: "http://127.0.0.1:45123/relay/anthropic", pass: "rp_run_pass", relayCredentialKind: "apiKey" as const }));
    const access = providerRelayAccessDouble({
      isRelayed: () => true,
      routeForNativeProvider: () => ({ kind: "relay" as const, relayId: "anthropic", relayCredentialKind: "apiKey" as const }),
      prepareForRun,
    });
    const seen: Array<{ url: string; headers: Headers }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(input instanceof Request ? input.url : input), headers: new Headers(init?.headers) });
      return new Response('{"type":"error","error":{"type":"invalid_request_error","message":"synthetic"}}', { status: 400, headers: { "content-type": "application/json" } });
    }));
    const llm = await createAvailableLlm(anthropicModel, undefined, { run: RUN, providerRelayAccess: access });
    await expect(llm.sendMessages([new Message(MessageRole.USER, { content: "hi" })], {}, { retryMode: "single_attempt" })).rejects.toThrow();
    expect(prepareForRun).toHaveBeenCalledWith(RUN, "anthropic", "autobyteus");
    expect(seen[0]!.url).toBe("http://127.0.0.1:45123/relay/anthropic/v1/messages");
    expect(seen[0]!.headers.get("x-api-key")).toBe("rp_run_pass");
  });

  it("refuses a provider the relay node offers no key for, before any call", async () => {
    const access = providerRelayAccessDouble({
      isRelayed: () => true,
      routeForNativeProvider: () => ({ kind: "unavailable" as const, reason: "The relay node offers no Anthropic credential." }),
    });
    await expect(createAvailableLlm(anthropicModel, undefined, { run: RUN, providerRelayAccess: access })).rejects.toThrow("RELAY_NOT_LISTED");
  });
});
