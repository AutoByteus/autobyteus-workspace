import type { FastifyRequest } from "fastify";
import { getNodeBrowserAccess } from "../../api/security/node-browser-access.js";
import { isLoopbackClientAddress } from "../../api/security/remote-access-local-trust.js";
import {
  createToolEndpointOriginPolicy,
  type RequestOriginPolicy,
} from "../../api/security/remote-access-request-origin.js";
import { parseRequestHostName } from "../../api/security/request-host-name.js";

export type AgentToolsMcpLocalAccessDecision =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false }>;

/**
 * The gate of the node's loopback tool listeners (agent tools MCP, credential proxy): a loopback client,
 * a loopback `Host` (rebinding-safe) and the tool-endpoint origin rule.
 */
export class AgentToolsMcpLocalAccessGate {
  private readonly originPolicy: RequestOriginPolicy =
    createToolEndpointOriginPolicy(getNodeBrowserAccess().allowedOrigins);

  validateRequest(request: FastifyRequest): AgentToolsMcpLocalAccessDecision {
    if (!isLoopbackClientAddress(request.raw.socket.remoteAddress)) {
      return { ok: false };
    }
    const host = readSingleHeader(request.headers.host);
    if (!host || !isLoopbackHostHeader(host)) {
      return { ok: false };
    }
    if (!this.originPolicy.isAllowed(request.headers)) {
      return { ok: false };
    }
    return { ok: true };
  }
}

export const isLoopbackHostHeader = (value: string): boolean => {
  const hostname = parseRequestHostName(value);
  if (!hostname) return false;
  return hostname === "localhost" || isLoopbackClientAddress(hostname);
};

const readSingleHeader = (
  value: string | string[] | undefined,
): string | null => {
  if (Array.isArray(value)) return value.length === 1 ? value[0] ?? null : null;
  return value ?? null;
};
