import type { FastifyRequest } from "fastify";
import type {
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteMethod,
  ApplicationRouteRequest,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBackendRestContract } from "../../application-platform/runtime/application-platform-runtime-contracts.js";

export const buildApplicationRequestContext = (
  applicationId: string,
): ApplicationRequestContext => ({ applicationId });

export const toApplicationQueryRecord = (
  value: unknown,
): Record<string, string | string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string | string[]> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
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

export const toApplicationHeaderRecord = (
  headers: FastifyRequest["headers"],
): Record<string, string | string[] | undefined> => {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string" || Array.isArray(value) || value === undefined) {
      result[key] = value;
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
