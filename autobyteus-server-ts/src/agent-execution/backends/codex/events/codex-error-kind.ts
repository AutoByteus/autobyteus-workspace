import { USAGE_LIMIT_ERROR_KIND } from "../../../domain/agent-run-error-kind.js";

/**
 * The `error_kind` field a Codex error adds to its run `ERROR` (C-4): `usage_limit` when Codex says so itself
 * (`codexErrorInfo` = `usageLimitExceeded`, a plain value or, in the generated schema's object form, its key); otherwise
 * nothing. `error` is the error object of an `error` notification or of a failed turn.
 */
export const codexErrorKindFields = (error: unknown): Readonly<{ error_kind?: typeof USAGE_LIMIT_ERROR_KIND }> => {
  const info = (error as { codexErrorInfo?: unknown } | null)?.codexErrorInfo;
  const usageLimit = info === "usageLimitExceeded"
    || (typeof info === "object" && info !== null && Object.prototype.hasOwnProperty.call(info, "usageLimitExceeded"));
  return usageLimit ? { error_kind: USAGE_LIMIT_ERROR_KIND } : {};
};
