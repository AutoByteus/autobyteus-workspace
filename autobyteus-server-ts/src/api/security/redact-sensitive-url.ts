const SENSITIVE_QUERY_KEYS = new Set([
  "access_token",
  "token",
  "auth",
  "authorization",
  "code",
  "pairing",
  "pairing_code",
  "pairingcode",
]);

const REDACTED_VALUE = "[REDACTED]";

const redactSearchParams = (params: URLSearchParams): URLSearchParams => {
  const redacted = new URLSearchParams();
  params.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    redacted.append(key, SENSITIVE_QUERY_KEYS.has(normalizedKey) ? REDACTED_VALUE : value);
  });
  return redacted;
};

const rebuildRelativeUrl = (input: string): string => {
  const [beforeHash = "", hash = ""] = input.split("#", 2);
  const [path = "", query = ""] = beforeHash.split("?", 2);
  if (!query) {
    return input;
  }
  const redactedQuery = redactSearchParams(new URLSearchParams(query)).toString();
  return `${path}${redactedQuery ? `?${redactedQuery}` : ""}${hash ? `#${hash}` : ""}`;
};

export const redactSensitiveUrl = (url: string): string => {
  const raw = String(url ?? "");
  if (!raw.includes("?")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    parsed.search = redactSearchParams(parsed.searchParams).toString();
    return parsed.toString();
  } catch {
    return rebuildRelativeUrl(raw);
  }
};
