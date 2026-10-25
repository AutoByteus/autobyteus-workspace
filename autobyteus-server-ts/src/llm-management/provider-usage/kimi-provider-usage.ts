import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import {
  asRecord, fetchProviderAnswer, providerUsageRead, unexpectedProviderAnswer,
  type ProviderUsageAccess, type ProviderUsageReader,
} from "./provider-usage-reader.js";

/** The host AutoByteus' Kimi models call (`kimi-llm.ts`); its balances are in US dollars. */
const BALANCE_URL = "https://api.moonshot.ai/v1/users/me/balance";
const HOST_CURRENCY = "USD";

/** Kimi `GET /v1/users/me/balance`: `available_balance`; at or below 0 → no balance left. */
export const createKimiProviderUsageReader = (access: ProviderUsageAccess): ProviderUsageReader => ({
  async read(_provider, _models, { signal }) {
    const key = await access.resolveApiKey(LLMProvider.KIMI);
    const answer = await fetchProviderAnswer(access, BALANCE_URL, { headers: { Authorization: `Bearer ${key}` } }, signal);
    const data = asRecord(asRecord(answer.body)?.data);
    const available = typeof data?.available_balance === "number" ? data.available_balance : null;
    if (answer.status !== 200 || available === null) throw unexpectedProviderAnswer(answer.status);
    const currency = typeof data?.currency === "string" && data.currency.trim() ? data.currency.trim() : HOST_CURRENCY;
    return providerUsageRead({ amount: String(available), currency }, available <= 0 ? "no balance left" : null);
  },
});
