import { describe, expect, it, vi } from "vitest";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { createProviderUsageReaders } from "../../../../src/llm-management/provider-usage/provider-usage-readers.js";
import { ProviderUsageUnreadableError } from "../../../../src/llm-management/provider-usage/provider-usage-reader.js";
import type { LlmProviderDescriptor } from "../../../../src/llm-management/llm-providers/domain/models.js";

const KEY = "sk-test-secret-key";
const provider = (id: string): LlmProviderDescriptor =>
  ({ id, name: id, providerType: id as LLMProvider, isCustom: false, baseUrl: null, catalogMode: "STATIC" });
const anthropicModel = { model_identifier: "claude-sonnet-5-5", value: "claude-sonnet-5-5" } as ModelInfo;

/** Readers over a fake `fetch` that answers per URL and records every request (no network, no real key). */
const readersAnswering = (answers: Record<string, { status: number; body: unknown } | "hang" | "throw">) => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetch = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    requests.push({ url: String(url), init });
    const answer = answers[String(url)];
    if (answer === "throw") throw new Error(`connect failed with key ${KEY}`);
    if (answer === "hang" || !answer) {
      // As the real fetch: the request rejects with the signal's reason (a TimeoutError for AbortSignal.timeout).
      return new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal!.reason)));
    }
    return new Response(JSON.stringify(answer.body), { status: answer.status });
  });
  const resolveApiKey = vi.fn(async () => KEY);
  return { readers: createProviderUsageReaders({ resolveApiKey, fetch: fetch as typeof globalThis.fetch }), requests, resolveApiKey };
};

const read = (readers: ReturnType<typeof createProviderUsageReaders>, id: string, models: ModelInfo[] = [], ms = 2_000) =>
  readers.readerFor(id)!.read(provider(id), models, { signal: AbortSignal.timeout(ms) });

describe("provider usage readers (AC-007, AC-009)", () => {
  it("DeepSeek: the balance, or no balance left when not available", async () => {
    const url = "https://api.deepseek.com/user/balance";
    let { readers, requests } = readersAnswering({ [url]: { status: 200, body: { is_available: true,
      balance_infos: [{ currency: "USD", total_balance: "0.14", granted_balance: "0.13", topped_up_balance: "0.01" }] } } });
    await expect(read(readers, LLMProvider.DEEPSEEK)).resolves.toEqual({
      state: "read", balance: { amount: "0.14", currency: "USD" }, blockedReason: null });
    expect(requests[0]!.init.headers).toEqual({ Authorization: `Bearer ${KEY}` });
    ({ readers } = readersAnswering({ [url]: { status: 200, body: { is_available: false, balance_infos: [{ currency: "CNY", total_balance: "0.00" }] } } }));
    await expect(read(readers, LLMProvider.DEEPSEEK)).resolves.toEqual({
      state: "read", balance: { amount: "0.00", currency: "CNY" }, blockedReason: "no balance left" });
  });

  it("Kimi: available balance 0 → no balance left", async () => {
    const { readers } = readersAnswering({ "https://api.moonshot.ai/v1/users/me/balance": { status: 200, body: {
      code: 0, data: { available_balance: 0, voucher_balance: 0, cash_balance: -0.012 }, scode: "0x0", status: true } } });
    await expect(read(readers, LLMProvider.KIMI)).resolves.toEqual({
      state: "read", balance: { amount: "0", currency: "USD" }, blockedReason: "no balance left" });
  });

  it("Anthropic: only the free count_tokens call; 400 credit balance → credit balance too low; 200 → no block", async () => {
    const url = "https://api.anthropic.com/v1/messages/count_tokens";
    let { readers, requests } = readersAnswering({ [url]: { status: 400, body: { type: "error",
      error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } } } });
    await expect(read(readers, LLMProvider.ANTHROPIC, [anthropicModel])).resolves.toEqual({
      state: "read", balance: null, blockedReason: "credit balance too low" });
    expect(requests.map((request) => request.url)).toEqual([url]);
    expect(JSON.parse(String(requests[0]!.init.body))).toMatchObject({ model: "claude-sonnet-5-5" });
    ({ readers } = readersAnswering({ [url]: { status: 200, body: { input_tokens: 8 } } }));
    await expect(read(readers, LLMProvider.ANTHROPIC, [anthropicModel])).resolves.toEqual({ state: "read", balance: null, blockedReason: null });
  });

  it("xAI: a blocked or disabled key blocks; a clean key does not", async () => {
    const url = "https://api.x.ai/v1/api-key";
    let { readers } = readersAnswering({ [url]: { status: 200, body: { api_key_blocked: false, api_key_disabled: true, team_blocked: false, name: "<redacted>" } } });
    await expect(read(readers, LLMProvider.GROK)).resolves.toEqual({ state: "read", balance: null, blockedReason: "API key disabled" });
    ({ readers } = readersAnswering({ [url]: { status: 200, body: { api_key_blocked: false, api_key_disabled: false, team_blocked: false } } }));
    await expect(read(readers, LLMProvider.GROK)).resolves.toEqual({ state: "read", balance: null, blockedReason: null });
  });

  it("a failure throws (SR-007): an unusable answer with a short classified reason, a time-out with the signal's reason", async () => {
    const { readers } = readersAnswering({
      "https://api.deepseek.com/user/balance": "throw",
      "https://api.moonshot.ai/v1/users/me/balance": "hang",
      "https://api.x.ai/v1/api-key": { status: 401, body: { error: `bad key ${KEY}` } },
      "https://api.anthropic.com/v1/messages/count_tokens": { status: 500, body: { error: { message: "overloaded" } } },
    });
    const [deepseek, kimi, xai, anthropic] = await Promise.allSettled([
      read(readers, LLMProvider.DEEPSEEK), read(readers, LLMProvider.KIMI, [], 100), read(readers, LLMProvider.GROK),
      read(readers, LLMProvider.ANTHROPIC, [anthropicModel]),
    ]);
    // A transport failure passes through; the service drops its text ("… could not be read").
    expect(deepseek).toMatchObject({ status: "rejected" });
    expect(kimi).toMatchObject({ status: "rejected", reason: { name: "TimeoutError" } });
    expect(xai).toMatchObject({ status: "rejected", reason: new ProviderUsageUnreadableError("the API key was not accepted") });
    expect((xai as PromiseRejectedResult).reason.reason).toBe("the API key was not accepted");
    expect((anthropic as PromiseRejectedResult).reason.reason).toBe("unexpected answer (500)");
    await expect(read(readers, LLMProvider.ANTHROPIC, [])).rejects.toMatchObject({ reason: "no model to check with" });
  });

  it("has readers only for DeepSeek, Kimi, Anthropic and xAI; other providers are not reported (REQ-005)", () => {
    const { readers } = readersAnswering({});
    expect([LLMProvider.DEEPSEEK, LLMProvider.KIMI, LLMProvider.ANTHROPIC, LLMProvider.GROK].every((id) => readers.readerFor(id)))
      .toBe(true);
    for (const id of [LLMProvider.OPENAI, LLMProvider.GEMINI, LLMProvider.MISTRAL, LLMProvider.QWEN, LLMProvider.MINIMAX,
      LLMProvider.GLM, LLMProvider.OLLAMA, LLMProvider.LMSTUDIO, "custom-provider-1"]) {
      expect(readers.readerFor(id)).toBeNull();
    }
  });
});
