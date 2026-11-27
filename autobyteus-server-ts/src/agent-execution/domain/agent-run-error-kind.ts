/**
 * The run `ERROR` (and `ERROR_CLASSIFIED`) payload's `error_kind` for a usage limit (autobyteus-646 C-4, R-13, R-16):
 * set by each runtime's backend, its own classification; read by the usage-limit detector.
 */
export const USAGE_LIMIT_ERROR_KIND = "usage_limit";
