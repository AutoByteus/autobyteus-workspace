/**
 * Why a request to another node got no answer (one-nodes-tab REQ-707), from the error Node's `fetch` throws:
 * - `refused`: nothing listens at that address and port (`ECONNREFUSED`; for `localhost`, an `AggregateError` of attempts);
 * - `timeout`: no answer within the bound (`TimeoutError`/`AbortError` of the request signal, or a connect timeout);
 * - `not_found`: the host name cannot be resolved (`ENOTFOUND`, `EAI_AGAIN`);
 * - `unreachable`: any other transport failure.
 */
export type TransportFailureReason = "refused" | "timeout" | "not_found" | "unreachable";

type ErrorLike = { name?: unknown; code?: unknown; cause?: unknown; errors?: unknown } | null | undefined;

const TIMEOUT_CODES = new Set(["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT"]);
const NOT_FOUND_CODES = new Set(["ENOTFOUND", "EAI_AGAIN"]);

/** Every error code in the error, its cause and an aggregate's errors. */
const codesOf = (error: ErrorLike): string[] => {
  if (!error || typeof error !== "object") return [];
  const own = typeof error.code === "string" ? [error.code] : [];
  const nested = Array.isArray(error.errors) ? error.errors.flatMap((entry) => codesOf(entry as ErrorLike)) : [];
  return [...own, ...nested, ...codesOf(error.cause as ErrorLike)];
};

export const transportFailureReason = (error: unknown): TransportFailureReason => {
  const name = (error as ErrorLike)?.name;
  if (name === "TimeoutError" || name === "AbortError") return "timeout";
  const codes = codesOf(error as ErrorLike);
  if (codes.includes("ECONNREFUSED")) return "refused";
  if (codes.some((code) => NOT_FOUND_CODES.has(code))) return "not_found";
  if (codes.some((code) => TIMEOUT_CODES.has(code))) return "timeout";
  return "unreachable";
};
