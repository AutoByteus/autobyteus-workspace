const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeIp = (value: string | null | undefined): string | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("::ffff:")) {
    return normalized.slice("::ffff:".length);
  }

  return normalized;
};

const isLoopbackHost = (hostname: string): boolean => {
  const lowered = hostname.toLowerCase();
  return LOOPBACK_HOSTS.has(lowered);
};

const normalizeBaseUrl = (value: string): URL => {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Discovery endpoint must use http or https protocol.");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed;
};

export const resolveEffectiveBaseUrl = (
  advertisedBaseUrl: string,
  requestIp: string | null | undefined,
): string => {
  const parsed = normalizeBaseUrl(advertisedBaseUrl);
  if (!isLoopbackHost(parsed.hostname)) {
    return parsed.toString().replace(/\/+$/, "");
  }

  const senderIp = normalizeIp(requestIp);
  if (!senderIp) {
    throw new Error("Loopback discovery endpoint is not allowed without sender IP context.");
  }

  if (isLoopbackHost(senderIp)) {
    return parsed.toString().replace(/\/+$/, "");
  }

  parsed.hostname = senderIp;
  return parsed.toString().replace(/\/+$/, "");
};
