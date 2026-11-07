import { isIP } from "node:net";

const isValidOptionalPortSuffix = (suffix: string): boolean => {
  if (!suffix) return true;
  if (!/^:\d+$/.test(suffix)) return false;
  const port = Number(suffix.slice(1));
  return Number.isInteger(port) && port >= 1 && port <= 65_535;
};

const splitHostAndPort = (host: string): string | null => {
  if (host.startsWith("[")) {
    const closingBracket = host.indexOf("]");
    if (closingBracket <= 1) return null;
    const hostname = host.slice(1, closingBracket);
    return isIP(hostname) === 6 && isValidOptionalPortSuffix(host.slice(closingBracket + 1)) ? hostname : null;
  }
  if (isIP(host) === 6) return host;
  const separator = host.lastIndexOf(":");
  if (separator < 0) return host;
  if (host.indexOf(":") !== separator) return null;
  const hostname = host.slice(0, separator);
  return hostname && isValidOptionalPortSuffix(host.slice(separator)) ? hostname : null;
};

/**
 * Normalizes a host name as a node compares it: lowercased, IPv6 brackets and one trailing dot removed.
 * Used for `Host` headers and for hosts read from stored or configured URLs, so both compare equal.
 */
export const normalizeHostName = (hostname: string): string | null => {
  const unbracketed = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  const normalized = unbracketed.toLowerCase().replace(/\.$/, "");
  return normalized || null;
};

/** The normalized host name of a stored or configured URL; `null` when it is not a URL with a host. */
export const hostNameOfUrl = (value: string): string | null => {
  try {
    return normalizeHostName(new URL(value).hostname);
  } catch {
    return null;
  }
};

/** Parses a `Host` header value (`name[:port]`, `[v6][:port]`) into its normalized name; `null` when malformed. */
export const parseRequestHostName = (hostHeader: string): string | null => {
  const host = hostHeader.trim();
  if (!host || /[\s/@?#\\]/.test(host)) return null;
  const hostname = splitHostAndPort(host);
  return hostname === null ? null : normalizeHostName(hostname);
};
