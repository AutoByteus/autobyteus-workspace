/**
 * Masks secrets in what memory search shows (R-008): API keys, tokens, passwords and private keys. IP
 * addresses, domains and paths stay visible (UD-002). The index itself is not masked.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g,
  /((?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*)\S+/gi,
  /\b[A-Za-z0-9+/]{40,}={0,2}/g,
];

export const maskSecrets = (text: string): string =>
  SECRET_PATTERNS.reduce((masked, pattern) => masked.replace(pattern, (_match, prefix?: string) =>
    `${typeof prefix === "string" ? prefix : ""}[masked]`), text);
