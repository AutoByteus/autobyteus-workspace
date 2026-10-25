import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import {
  asRecord, fetchProviderAnswer, providerUsageFailure, providerUsageRead, unexpectedProviderAnswer,
  type ProviderUsageAccess, type ProviderUsageReader,
} from "./provider-usage-reader.js";

const COUNT_TOKENS_URL = "https://api.anthropic.com/v1/messages/count_tokens";

/**
 * Anthropic has no balance endpoint. Its free `count_tokens` call (no completion, no tokens billed) on the provider's
 * first offered model answers 400 "credit balance is too low" when the account is out of credits, else 200.
 */
export const createAnthropicProviderUsageReader = (access: ProviderUsageAccess): ProviderUsageReader => ({
  async read(_provider, models, { signal }) {
    const model = models[0]?.value;
    if (!model) return Object.freeze({ state: "unknown", reason: "no model to check with" });
    try {
      const key = await access.resolveApiKey(LLMProvider.ANTHROPIC);
      const answer = await fetchProviderAnswer(access, COUNT_TOKENS_URL, {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }] }),
      }, signal);
      if (answer.status === 200) return providerUsageRead(null, null);
      const message = asRecord(asRecord(answer.body)?.error)?.message;
      if (answer.status === 400 && typeof message === "string" && /credit balance/i.test(message)) {
        return providerUsageRead(null, "credit balance too low");
      }
      return unexpectedProviderAnswer(answer.status);
    } catch {
      return providerUsageFailure(signal);
    }
  },
});
