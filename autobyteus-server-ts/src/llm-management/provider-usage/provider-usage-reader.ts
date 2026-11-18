import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LlmProviderDescriptor } from "../llm-providers/domain/models.js";

/**
 * One AutoByteus provider's usage, read with its API key and without a completion request. `balance`: the provider's
 * money balance (its limit), when it reports one. `blockedReason`: set when the provider cannot run now; the only
 * blocked form (the service blocks the provider's models with it). A read that fails throws (SR-007, AR-008).
 */
export type ProviderUsageReading =
  | Readonly<{ state: "read"; balance: Readonly<{ amount: string; currency: string }> | null; blockedReason: string | null }>
  | Readonly<{ state: "not_reported" }>;

/** An answer a reader cannot use. `reason`: short and classified, never provider text or the key. */
export class ProviderUsageUnreadableError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "ProviderUsageUnreadableError";
  }
}

/**
 * How one provider reports its usage. Throws when it cannot be read (an unusable answer: `ProviderUsageUnreadableError`;
 * the signal's time-out: the fetch's abort error); the caller words it. Never logs or returns the key or account data.
 */
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

export const providerUsageRead = (
  balance: Readonly<{ amount: string; currency: string }> | null,
  blockedReason: string | null,
): ProviderUsageReading => Object.freeze({ state: "read", balance, blockedReason });

/** The reason for an answer that is not the expected one, by its HTTP status only. */
export const unexpectedProviderAnswer = (status: number): ProviderUsageUnreadableError =>
  new ProviderUsageUnreadableError(status === 401 || status === 403 ? "the API key was not accepted" : `unexpected answer (${status})`);

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
