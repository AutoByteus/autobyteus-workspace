import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LlmProviderDescriptor } from "../llm-providers/domain/models.js";

/**
 * One AutoByteus provider's usage, read with its API key and without a completion request. `balance`: the provider's
 * money balance (its limit), when it reports one. `blockedReason`: set when the provider cannot run now; the only
 * blocked form (the service blocks the provider's models with it).
 */
export type ProviderUsageReading =
  | Readonly<{ state: "read"; balance: Readonly<{ amount: string; currency: string }> | null; blockedReason: string | null }>
  | Readonly<{ state: "not_reported" }>
  | Readonly<{ state: "unknown"; reason: string }>;

/** How one provider reports its usage. Never throws; never logs or returns the key or account data. */
export interface ProviderUsageReader {
  read(
    provider: LlmProviderDescriptor,
    models: readonly ModelInfo[],
    options: Readonly<{ signal: AbortSignal }>,
  ): Promise<ProviderUsageReading>;
}

/** What a reader uses: the provider's key from the server's secret resolver, and `fetch`. */
export type ProviderUsageAccess = Readonly<{
  resolveApiKey: (providerId: string) => Promise<string>;
  fetch: typeof fetch;
}>;

/** A provider answer: its status and its JSON body (null when the body is not JSON). */
export type ProviderAnswer = Readonly<{ status: number; body: unknown }>;

export const fetchProviderAnswer = async (
  access: ProviderUsageAccess,
  url: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<ProviderAnswer> => {
  const response = await access.fetch(url, { ...init, signal });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status, body };
};

/**
 * A reader's failure as a short classified reason; the error's own text (which may echo a request) is never kept.
 */
export const providerUsageFailure = (signal: AbortSignal): ProviderUsageReading =>
  Object.freeze({ state: "unknown", reason: signal.aborted ? "timed out" : "could not be read" });

export const providerUsageRead = (
  balance: Readonly<{ amount: string; currency: string }> | null,
  blockedReason: string | null,
): ProviderUsageReading => Object.freeze({ state: "read", balance, blockedReason });

export const unexpectedProviderAnswer = (status: number): ProviderUsageReading =>
  Object.freeze({ state: "unknown", reason: status === 401 || status === 403 ? "the API key was not accepted" : `unexpected answer (${status})` });

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
