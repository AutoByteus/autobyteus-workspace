import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteMethod,
  ApplicationRouteRequest,
} from "@autobyteus/application-sdk-contracts";
import { getApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import { sendApplicationRouteError } from "./application-route-error.js";

const apiGateway = () => getApplicationBackendApiGatewayService();
const APPLICATION_BACKEND_ROUTE_BASE = "/applications/:applicationId/backend";
const readRequestContext = (
  applicationId: string,
  _request: FastifyRequest,
  _bodyRequestContext?: unknown,
): ApplicationRequestContext => ({ applicationId });

const toQueryRecord = (value: unknown): Record<string, string | string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string | string[]> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue === "string") result[key] = rawValue;
    else if (Array.isArray(rawValue) && rawValue.every((entry) => typeof entry === "string")) result[key] = rawValue as string[];
  }
  return result;
};

const toHeaderRecord = (headers: FastifyRequest["headers"]): Record<string, string | string[] | undefined> => {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string" || Array.isArray(value) || value === undefined) result[key] = value;
  }
  return result;
};

export async function registerApplicationBackendRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { applicationId: string; queryName: string };
    Body: { requestContext?: ApplicationRequestContext | null; input?: unknown };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/queries/:queryName`, async (request, reply) => {
    try {
      const result = await apiGateway().invokeApplicationQuery(
        request.params.applicationId,
        request.params.queryName,
        readRequestContext(request.params.applicationId, request, request.body?.requestContext),
        request.body?.input ?? null,
      );
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });

  app.post<{
    Params: { applicationId: string; commandName: string };
    Body: { requestContext?: ApplicationRequestContext | null; input?: unknown };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/commands/:commandName`, async (request, reply) => {
    try {
      const result = await apiGateway().invokeApplicationCommand(
        request.params.applicationId,
        request.params.commandName,
        readRequestContext(request.params.applicationId, request, request.body?.requestContext),
        request.body?.input ?? null,
      );
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });

  app.post<{
    Params: { applicationId: string };
    Body: { requestContext?: ApplicationRequestContext | null; request: ApplicationGraphqlRequest };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/graphql`, async (request, reply) => {
    try {
      const result = await apiGateway().executeApplicationGraphql(
        request.params.applicationId,
        readRequestContext(request.params.applicationId, request, request.body?.requestContext),
        request.body.request,
      );
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });

  app.route<{
    Params: { applicationId: string } & Record<string, string>;
  }>({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    url: `${APPLICATION_BACKEND_ROUTE_BASE}/routes/*`,
    handler: async (request, reply) => {
      const routePath = `/${request.params["*"] ?? ""}`.replace(/\/+/g, "/");
      const applicationId = request.params.applicationId;
      try {
        const result = await apiGateway().routeApplicationRequest(
          applicationId,
          readRequestContext(applicationId, request),
          {
            method: request.method as ApplicationRouteMethod,
            path: routePath,
            headers: toHeaderRecord(request.headers),
            query: toQueryRecord(request.query),
            params: {},
            body: request.body ?? null,
          } satisfies ApplicationRouteRequest,
        );

        const routeResponse = result as { status?: number; headers?: Record<string, string>; body?: unknown };
        if (routeResponse.headers) {
          for (const [key, value] of Object.entries(routeResponse.headers)) {
            reply.header(key, value);
          }
        }
        reply.code(routeResponse.status ?? 200);
        return reply.send(routeResponse.body ?? null);
      } catch (error) {
        return sendApplicationRouteError(reply, error);
      }
    },
  });
}
