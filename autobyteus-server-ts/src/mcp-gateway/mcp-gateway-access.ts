import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { extractBearerToken, readSingleHeader } from "./mcp-gateway-http-helpers.js";

export const MCP_GATEWAY_TOKEN_ENV_VAR = "AUTOBYTEUS_MCP_GATEWAY_TOKEN";

export type McpGatewayAccessDecision =
  | { ok: true }
  | { ok: false; statusCode: 401; error: "unauthorized"; message: string };

export type McpGatewayAccessConfig = {
  bearerToken: string | null;
};

export type McpGatewayAccessDeps = {
  readConfiguredToken?: () => string | null | undefined;
};

export class McpGatewayAccessGate {
  private readonly readConfiguredToken: () => string | null | undefined;

  constructor(deps: McpGatewayAccessDeps = {}) {
    this.readConfiguredToken = deps.readConfiguredToken ?? (() => process.env[MCP_GATEWAY_TOKEN_ENV_VAR]);
  }

  resolveConfig(): McpGatewayAccessConfig {
    return { bearerToken: normalizeToken(this.readConfiguredToken()) };
  }

  validateRequest(request: FastifyRequest): McpGatewayAccessDecision {
    const configuredToken = this.resolveConfig().bearerToken;
    if (!configuredToken) {
      return isLocalLoopbackRequest(request)
        ? { ok: true }
        : { ok: false, statusCode: 401, error: "unauthorized", message: "Gateway bearer token is required for non-local access." };
    }

    const requestToken = extractBearerToken(readSingleHeader(request.headers.authorization));
    if (!requestToken || !tokensMatch(requestToken, configuredToken)) {
      return { ok: false, statusCode: 401, error: "unauthorized", message: "Unauthorized" };
    }
    return { ok: true };
  }
}

export const getMcpGatewayAccessGate = (): McpGatewayAccessGate => new McpGatewayAccessGate();

const normalizeToken = (value: string | null | undefined): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
};

const tokensMatch = (actual: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
};

const isLocalLoopbackRequest = (request: FastifyRequest): boolean =>
  isLoopbackAddress(request.ip) && isLoopbackHostHeader(readSingleHeader(request.headers.host));

const isLoopbackAddress = (address: string | null | undefined): boolean => {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith("::ffff:")) {
    return isLoopbackAddress(normalized.slice("::ffff:".length));
  }
  return normalized === "::1" || normalized === "localhost" || normalized === "127.0.0.1" || normalized.startsWith("127.");
};

const isLoopbackHostHeader = (hostHeader: string | null): boolean => {
  const host = parseHostHeader(hostHeader);
  return isLoopbackAddress(host);
};

const parseHostHeader = (hostHeader: string | null): string | null => {
  const normalized = hostHeader?.trim() ?? "";
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("[")) {
    const closeIndex = normalized.indexOf("]");
    return closeIndex > 0 ? normalized.slice(1, closeIndex) : null;
  }
  return normalized.split(":")[0] ?? null;
};

const normalizeAddress = (address: string | null | undefined): string | null => {
  const normalized = address?.trim().replace(/^\[|\]$/g, "").toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
};
