import type { FastifyRequest } from "fastify";
import type {
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteMethod,
  ApplicationRouteRequest,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBackendRestContract } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import { WEBSOCKET_ACCESS_TOKEN_QUERY_KEY } from "../security/node-access-gate.js";

/** The node credential's request header; it is the node's, never an application backend's (node access model NA-8). */
const NODE_CREDENTIAL_HEADER = "authorization";

export const buildApplicationRequestContext = (
  applicationId: string,
): ApplicationRequestContext => ({ applicationId });

/** The request's query for an application backend, without the browser WebSocket credential (`access_token`). */
export const toApplicationQueryRecord = (
  value: unknown,
): Record<string, string | string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string | string[]> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (key === WEBSOCKET_ACCESS_TOKEN_QUERY_KEY) {
      continue;
    }
    if (typeof rawValue === "string") {
      result[key] = rawValue;
    } else if (
      Array.isArray(rawValue)
      && rawValue.every((entry) => typeof entry === "string")
    ) {
      result[key] = rawValue as string[];
    }
  }
  return result;
};

/** The request's headers for an application backend (lower-case names), without the node credential. */
export const toApplicationHeaderRecord = (
  headers: FastifyRequest["headers"],
): Record<string, string | string[] | undefined> => {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    const name = key.toLowerCase();
    if (name === NODE_CREDENTIAL_HEADER) {
      continue;
    }
    if (typeof value === "string" || value === undefined) {
      result[name] = value;
    } else if (Array.isArray(value)) {
      result[name] = [...value];
    }
  }
  return result;
};

export const invokeApplicationQuery = (input: {
  gateway: ApplicationBackendRestContract;
  applicationId: string;
  queryName: string;
  value: unknown;
}): Promise<unknown> => input.gateway.invokeApplicationQuery(
  input.applicationId,
  input.queryName,
  buildApplicationRequestContext(input.applicationId),
  input.value,
);

export const invokeApplicationCommand = (input: {
  gateway: ApplicationBackendRestContract;
  applicationId: string;
  commandName: string;
  value: unknown;
}): Promise<unknown> => input.gateway.invokeApplicationCommand(
  input.applicationId,
  input.commandName,
  buildApplicationRequestContext(input.applicationId),
  input.value,
);

export const invokeApplicationGraphql = (input: {
  gateway: ApplicationBackendRestContract;
  applicationId: string;
  request: ApplicationGraphqlRequest;
}): Promise<unknown> => input.gateway.executeApplicationGraphql(
  input.applicationId,
  buildApplicationRequestContext(input.applicationId),
  input.request,
);

export const invokeApplicationRoute = (input: {
  gateway: ApplicationBackendRestContract;
  applicationId: string;
  routePath: string;
  request: FastifyRequest;
}): Promise<unknown> => input.gateway.routeApplicationRequest(
  input.applicationId,
  buildApplicationRequestContext(input.applicationId),
  {
    method: input.request.method as ApplicationRouteMethod,
    path: input.routePath,
    headers: toApplicationHeaderRecord(input.request.headers),
    query: toApplicationQueryRecord(input.request.query),
    params: {},
    body: input.request.body ?? null,
  } satisfies ApplicationRouteRequest,
);
