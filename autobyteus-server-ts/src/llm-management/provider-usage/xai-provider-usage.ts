import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import {
  asRecord, fetchProviderAnswer, providerUsageFailure, providerUsageRead, unexpectedProviderAnswer,
  type ProviderUsageAccess, type ProviderUsageReader,
} from "./provider-usage-reader.js";

const API_KEY_URL = "https://api.x.ai/v1/api-key";

/** The key's own flags, in the order they are reported. */
const BLOCKING_FLAGS: ReadonlyArray<readonly [string, string]> = [
  ["api_key_blocked", "API key blocked"],
  ["api_key_disabled", "API key disabled"],
  ["team_blocked", "team blocked"],
];

/** xAI `GET /v1/api-key`: the key's status flags only (no balance); a blocked or disabled key blocks the provider. */
export const createXaiProviderUsageReader = (access: ProviderUsageAccess): ProviderUsageReader => ({
  async read(_provider, _models, { signal }) {
    try {
      const key = await access.resolveApiKey(LLMProvider.GROK);
      const answer = await fetchProviderAnswer(access, API_KEY_URL, { headers: { Authorization: `Bearer ${key}` } }, signal);
      const body = asRecord(answer.body);
      if (answer.status !== 200 || !body) return unexpectedProviderAnswer(answer.status);
      return providerUsageRead(null, BLOCKING_FLAGS.find(([flag]) => body[flag] === true)?.[1] ?? null);
    } catch {
      return providerUsageFailure(signal);
    }
  },
});
