import { isIP } from "node:net";

export type NormalizedPeerAddress = {
  raw: string;
  normalized: string;
  family: "ipv4" | "ipv6";
};

const stripIpv6Brackets = (value: string): string =>
  value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;

const stripIpv6Zone = (value: string): string => value.split("%", 1)[0] ?? value;

const normalizeIpv4MappedAddress = (value: string): string | null => {
  const lower = value.toLowerCase();
  const prefix = "::ffff:";
  if (!lower.startsWith(prefix)) {
    return null;
  }
  return value.slice(prefix.length);
};

export const normalizePeerAddress = (address: string | undefined): NormalizedPeerAddress | null => {
  const trimmed = String(address ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const unwrapped = stripIpv6Zone(stripIpv6Brackets(trimmed));
  const mappedIpv4 = normalizeIpv4MappedAddress(unwrapped);
  if (mappedIpv4 && isIP(mappedIpv4) === 4) {
    return { raw: trimmed, normalized: mappedIpv4, family: "ipv4" };
  }

  const ipFamily = isIP(unwrapped);
  if (ipFamily === 4) {
    return { raw: trimmed, normalized: unwrapped, family: "ipv4" };
  }
  if (ipFamily === 6) {
    return { raw: trimmed, normalized: unwrapped.toLowerCase(), family: "ipv6" };
  }
  return null;
};

export const isLoopbackPeerAddress = (address: string | undefined): boolean => {
  const normalized = normalizePeerAddress(address);
  if (!normalized) {
    return false;
  }
  if (normalized.family === "ipv6") {
    return normalized.normalized === "::1";
  }
  return normalized.normalized.startsWith("127.");
};
