import { RemoteAccessError } from "../domain/models.js";
import { normalizeNodeBaseUrl, RemoteAccessUrlError } from "./url-normalization.js";

export type PairingUrlTransportSecurity = "https" | "trusted_private_http";

export type PairingServerBaseUrlPolicyDecision = {
  normalizedBaseUrl: string;
  transportSecurity: PairingUrlTransportSecurity;
  trustedPrivateHttpAcknowledgementRequired: boolean;
};

export type PairingServerBaseUrlPolicyOptions = {
  trustedPrivateHttpAcknowledged?: boolean | null;
};

const normalizeHostname = (hostname: string): string =>
  hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");

const parseIpv4Address = (hostname: string): [number, number, number, number] | null => {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const octets = parts.map((part) => Number(part));
  if (!octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    return null;
  }
  return octets as [number, number, number, number];
};

const firstIpv6Hextet = (hostname: string): number | null => {
  if (!hostname.includes(":")) {
    return null;
  }
  const first = hostname.split(":", 1)[0];
  if (!first) {
    return 0;
  }
  const parsed = Number.parseInt(first, 16);
  return Number.isFinite(parsed) ? parsed : null;
};

const isIpv4LoopbackOrUnspecified = (octets: [number, number, number, number]): boolean =>
  octets[0] === 127 || octets[0] === 0;

const isIpv4PrivateOrLocal = (octets: [number, number, number, number]): boolean =>
  octets[0] === 10
  || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  || (octets[0] === 192 && octets[1] === 168)
  || (octets[0] === 169 && octets[1] === 254)
  || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127);

const isIpv6LoopbackOrUnspecified = (hostname: string): boolean =>
  hostname === "::1"
  || hostname === "::"
  || hostname === "0:0:0:0:0:0:0:1"
  || hostname === "0:0:0:0:0:0:0:0";

const isIpv6PrivateOrLocal = (hostname: string): boolean => {
  const firstHextet = firstIpv6Hextet(hostname);
  if (firstHextet === null) {
    return false;
  }
  return (firstHextet >= 0xfc00 && firstHextet <= 0xfdff)
    || (firstHextet >= 0xfe80 && firstHextet <= 0xfebf);
};

export const isPhoneUnreachableLocalOnlyHost = (hostname: string): boolean => {
  const normalized = normalizeHostname(hostname);
  const ipv4 = parseIpv4Address(normalized);
  if (ipv4) {
    return isIpv4LoopbackOrUnspecified(ipv4);
  }
  return normalized === "localhost"
    || normalized === "host.docker.internal"
    || normalized.endsWith(".localhost")
    || isIpv6LoopbackOrUnspecified(normalized);
};

export const isTrustedPrivateHttpHost = (hostname: string): boolean => {
  const normalized = normalizeHostname(hostname);
  const ipv4 = parseIpv4Address(normalized);
  if (ipv4) {
    return !isIpv4LoopbackOrUnspecified(ipv4) && isIpv4PrivateOrLocal(ipv4);
  }
  if (normalized.includes(":")) {
    return !isIpv6LoopbackOrUnspecified(normalized) && isIpv6PrivateOrLocal(normalized);
  }
  return !isPhoneUnreachableLocalOnlyHost(normalized)
    && (normalized.endsWith(".local")
      || normalized.endsWith(".lan")
      || normalized.endsWith(".home.arpa")
      || !normalized.includes("."));
};

export const validatePairingServerBaseUrl = (
  rawServerBaseUrl: string,
  options: PairingServerBaseUrlPolicyOptions = {},
): PairingServerBaseUrlPolicyDecision => {
  let normalizedBaseUrl: string;
  try {
    normalizedBaseUrl = normalizeNodeBaseUrl(rawServerBaseUrl);
  } catch (error) {
    if (error instanceof RemoteAccessUrlError || error instanceof TypeError || error instanceof Error) {
      throw new RemoteAccessError(
        "REMOTE_ACCESS_PAIRING_URL_INVALID",
        error.message || "Invalid Phone Access pairing URL.",
        400,
      );
    }
    throw error;
  }

  const parsed = new URL(normalizedBaseUrl);
  if (isPhoneUnreachableLocalOnlyHost(parsed.hostname)) {
    throw new RemoteAccessError(
      "REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY",
      "Phone Access pairing URL must be reachable from the phone; do not use localhost, loopback, 0.0.0.0, host.docker.internal, or another local-only host.",
      400,
    );
  }

  if (parsed.protocol === "https:") {
    return {
      normalizedBaseUrl,
      transportSecurity: "https",
      trustedPrivateHttpAcknowledgementRequired: false,
    };
  }

  if (parsed.protocol !== "http:") {
    throw new RemoteAccessError(
      "REMOTE_ACCESS_PAIRING_URL_INVALID",
      "Phone Access pairing URL must use http or https.",
      400,
    );
  }

  if (!isTrustedPrivateHttpHost(parsed.hostname)) {
    throw new RemoteAccessError(
      "REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED",
      "HTTP Phone Access pairing is allowed only for trusted private LAN, tailnet IP, or local hostname URLs. Use HTTPS for public hostnames.",
      400,
    );
  }

  if (options.trustedPrivateHttpAcknowledged !== true) {
    throw new RemoteAccessError(
      "REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED",
      "Trusted private HTTP pairing requires acknowledgement before creating a QR code.",
      400,
    );
  }

  return {
    normalizedBaseUrl,
    transportSecurity: "trusted_private_http",
    trustedPrivateHttpAcknowledgementRequired: true,
  };
};
