import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import {
  asRecord, fetchProviderAnswer, providerUsageRead, unexpectedProviderAnswer,
  type ProviderUsageAccess, type ProviderUsageReader,
} from "./provider-usage-reader.js";

const BALANCE_URL = "https://api.deepseek.com/user/balance";

/** DeepSeek `GET /user/balance`: the first balance's total and currency; `is_available` false → no balance left. */
export const createDeepSeekProviderUsageReader = (access: ProviderUsageAccess): ProviderUsageReader => ({
  async read(_provider, _models, { signal }) {
    const key = await access.resolveApiKey(LLMProvider.DEEPSEEK);
    const answer = await fetchProviderAnswer(access, BALANCE_URL, { headers: { Authorization: `Bearer ${key}` } }, signal);
    const body = asRecord(answer.body);
    if (answer.status !== 200 || !body || typeof body.is_available !== "boolean") throw unexpectedProviderAnswer(answer.status);
    const first = asRecord(Array.isArray(body.balance_infos) ? body.balance_infos[0] : null);
    const amount = first?.total_balance;
    const balance = (typeof amount === "string" || typeof amount === "number") && typeof first?.currency === "string"
      ? { amount: String(amount), currency: first.currency }
      : null;
    return providerUsageRead(balance, body.is_available ? null : "no balance left");
  },
});
