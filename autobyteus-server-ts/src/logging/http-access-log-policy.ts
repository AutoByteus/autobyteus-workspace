import type { FastifyInstance } from "fastify";
import type { HttpAccessLogMode } from "../config/logging-config.js";

export type HttpAccessLogPolicyConfig = {
  mode: HttpAccessLogMode;
  includeNoisyRoutes: boolean;
};

type HttpAccessLogDecision = {
  shouldLog: boolean;
  level: "error" | "warn" | "info" | null;
};

const NOISY_HTTP_ACCESS_ROUTE_KEYS = new Set<string>([
  "GET:/rest/node-discovery/peers",
  "POST:/rest/node-discovery/heartbeat",
  "GET:/rest/health",
  "OPTIONS:/graphql",
  "POST:/graphql",
]);

const buildAccessRouteKey = (method: string, url: string): string => {
  const pathOnly = String(url || "").split("?", 1)[0] ?? "";
  return `${String(method || "").toUpperCase()}:${pathOnly}`;
};

const isNoisyHttpAccessRoute = (method: string, url: string): boolean =>
  NOISY_HTTP_ACCESS_ROUTE_KEYS.has(buildAccessRouteKey(method, url));

const resolveHttpAccessLogDecision = (
  config: HttpAccessLogPolicyConfig,
  method: string,
  url: string,
  statusCode: number,
): HttpAccessLogDecision => {
  if (config.mode === "off") {
    return { shouldLog: false, level: null };
  }

  if (config.mode === "errors" && statusCode < 400) {
    return { shouldLog: false, level: null };
  }

  if (config.mode === "all" && !config.includeNoisyRoutes && isNoisyHttpAccessRoute(method, url)) {
    return { shouldLog: false, level: null };
  }

  if (statusCode >= 500) {
    return { shouldLog: true, level: "error" };
  }
  if (statusCode >= 400) {
    return { shouldLog: true, level: "warn" };
  }
  return { shouldLog: true, level: "info" };
};

export const registerHttpAccessLogPolicy = (
  app: FastifyInstance,
  config: HttpAccessLogPolicyConfig,
): void => {
  if (config.mode === "off") {
    return;
  }

  app.addHook("onResponse", async (request, reply) => {
    const statusCode = reply.statusCode;
    const decision = resolveHttpAccessLogDecision(
      config,
      request.method,
      request.url,
      statusCode,
    );

    if (!decision.shouldLog || !decision.level) {
      return;
    }

    const payload = {
      method: request.method,
      url: request.url,
      statusCode,
      elapsedMs: Number(reply.elapsedTime ?? 0),
    };

    request.log[decision.level](payload, "http request completed");
  });
};

export const __testOnly = {
  isNoisyHttpAccessRoute,
  resolveHttpAccessLogDecision,
  buildAccessRouteKey,
};
