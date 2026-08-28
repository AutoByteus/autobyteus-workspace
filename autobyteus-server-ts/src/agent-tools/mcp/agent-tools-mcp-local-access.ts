import { isIP } from "node:net";
import type { FastifyRequest } from "fastify";
import { isLoopbackPeerAddress } from "../../api/security/remote-access-local-trust.js";

export type AgentToolsMcpLocalAccessDecision =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false }>;

export class AgentToolsMcpLocalAccessGate {
  validateRequest(request: FastifyRequest): AgentToolsMcpLocalAccessDecision {
    if (!isLoopbackPeerAddress(request.raw.socket.remoteAddress)) {
      return { ok: false };
    }
    const host = readSingleHeader(request.headers.host);
    if (!host || !isLoopbackHostHeader(host)) {
      return { ok: false };
    }
    const origin = readSingleHeader(request.headers.origin);
    if (!isAllowedOrigin(origin)) {
      return { ok: false };
    }
    return { ok: true };
  }
}

export const isLoopbackHostHeader = (value: string): boolean => {
  const hostname = parseHostHeader(value);
  if (!hostname) return false;
  if (hostname.toLowerCase() === "localhost") return true;
  return isLoopbackPeerAddress(hostname);
};

export const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol)
      && isCurrentLoopbackOriginHost(parsed.hostname);
  } catch {
    return false;
  }
};

const readSingleHeader = (
  value: string | string[] | undefined,
): string | null => {
  if (Array.isArray(value)) return value.length === 1 ? value[0] ?? null : null;
  return value ?? null;
};

const parseHostHeader = (value: string): string | null => {
  const host = value.trim();
  if (!host || /[\s/@?#]/.test(host)) return null;

  if (host.startsWith("[")) {
    const closingBracket = host.indexOf("]");
    if (closingBracket <= 1) return null;
    const hostname = host.slice(1, closingBracket);
    const suffix = host.slice(closingBracket + 1);
    return isIP(hostname) === 6 && isValidOptionalPortSuffix(suffix)
      ? hostname
      : null;
  }

  if (isIP(host) === 6) return host;
  const separator = host.lastIndexOf(":");
  if (separator < 0) return host;
  if (host.indexOf(":") !== separator) return null;
  const hostname = host.slice(0, separator);
  const suffix = host.slice(separator);
  return hostname && isValidOptionalPortSuffix(suffix) ? hostname : null;
};

const isValidOptionalPortSuffix = (suffix: string): boolean => {
  if (!suffix) return true;
  if (!/^:\d+$/.test(suffix)) return false;
  const port = Number(suffix.slice(1));
  return Number.isInteger(port) && port >= 1 && port <= 65_535;
};

const isCurrentLoopbackOriginHost = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "::1";
};
