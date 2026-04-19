import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteMethod,
  ApplicationRouteRequest,
} from "@autobyteus/application-sdk-contracts";
import { getApplicationBackendGatewayService } from "../../application-backend-gateway/services/application-backend-gateway-service.js";

const gateway = () => getApplicationBackendGatewayService();
const APPLICATION_BACKEND_ROUTE_BASE = "/applications/:applicationId/backend";
const LAUNCH_INSTANCE_HEADER = "x-autobyteus-launch-instance-id";

const readRequestContext = (
  applicationId: string,
  request: FastifyRequest,
  bodyRequestContext?: unknown,
): ApplicationRequestContext | null => {
  if (bodyRequestContext && typeof bodyRequestContext === "object" && !Array.isArray(bodyRequestContext)) {
    return {
      applicationId,
      launchInstanceId:
        typeof (bodyRequestContext as Record<string, unknown>).launchInstanceId === "string"
          ? ((bodyRequestContext as Record<string, unknown>).launchInstanceId as string)
          : null,
    };
  }

  const headerLaunchInstanceId = request.headers[LAUNCH_INSTANCE_HEADER];
  if (typeof headerLaunchInstanceId === "string" && headerLaunchInstanceId.trim().length > 0) {
    return {
      applicationId,
      launchInstanceId: headerLaunchInstanceId.trim(),
    };
  }

  const queryLaunchInstanceId = (request.query as Record<string, unknown> | undefined)?.launchInstanceId;
  if (typeof queryLaunchInstanceId === "string" && queryLaunchInstanceId.trim().length > 0) {
    return {
      applicationId,
      launchInstanceId: queryLaunchInstanceId.trim(),
    };
  }

  return {
    applicationId,
    launchInstanceId: null,
  };
};

const toQueryRecord = (value: unknown): Record<string, string | string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string | string[]> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue === "string") {
      result[key] = rawValue;
      continue;
    }
    if (Array.isArray(rawValue) && rawValue.every((entry) => typeof entry === "string")) {
      result[key] = rawValue as string[];
    }
  }
  return result;
};

const toHeaderRecord = (headers: FastifyRequest["headers"]): Record<string, string | string[] | undefined> => {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string" || Array.isArray(value) || value === undefined) {
      result[key] = value;
    }
  }
  return result;
};

const sendGatewayError = (reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("was not found")) {
    return reply.code(404).send({ detail: message });
  }
  if (
    message.includes("must match")
    || message.includes("No application route matched")
  ) {
    return reply.code(400).send({ detail: message });
  }
  return reply.code(500).send({ detail: message });
};

export async function registerApplicationBackendRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { applicationId: string } }>(
    `${APPLICATION_BACKEND_ROUTE_BASE}/status`,
    async (request, reply) => {
      try {
        const status = await gateway().getApplicationEngineStatus(request.params.applicationId);
        return reply.send(status);
      } catch (error) {
        return sendGatewayError(reply, error);
      }
    },
  );

  app.post<{ Params: { applicationId: string } }>(
    `${APPLICATION_BACKEND_ROUTE_BASE}/ensure-ready`,
    async (request, reply) => {
      try {
        const status = await gateway().ensureApplicationReady(request.params.applicationId);
        return reply.send(status);
      } catch (error) {
        return sendGatewayError(reply, error);
      }
    },
  );

  app.post<{
    Params: { applicationId: string; queryName: string };
    Body: { requestContext?: ApplicationRequestContext | null; input?: unknown };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/queries/:queryName`, async (request, reply) => {
    try {
      const result = await gateway().invokeApplicationQuery(
        request.params.applicationId,
        request.params.queryName,
        readRequestContext(request.params.applicationId, request, request.body?.requestContext),
        request.body?.input ?? null,
      );
      return reply.send({ result });
    } catch (error) {
      return sendGatewayError(reply, error);
    }
  });

  app.post<{
    Params: { applicationId: string; commandName: string };
    Body: { requestContext?: ApplicationRequestContext | null; input?: unknown };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/commands/:commandName`, async (request, reply) => {
    try {
      const result = await gateway().invokeApplicationCommand(
        request.params.applicationId,
        request.params.commandName,
        readRequestContext(request.params.applicationId, request, request.body?.requestContext),
        request.body?.input ?? null,
      );
      return reply.send({ result });
    } catch (error) {
      return sendGatewayError(reply, error);
    }
  });

  app.post<{
    Params: { applicationId: string };
    Body: { requestContext?: ApplicationRequestContext | null; request: ApplicationGraphqlRequest };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/graphql`, async (request, reply) => {
    try {
      const result = await gateway().executeApplicationGraphql(
        request.params.applicationId,
        readRequestContext(request.params.applicationId, request, request.body?.requestContext),
        request.body.request,
      );
      return reply.send({ result });
    } catch (error) {
      return sendGatewayError(reply, error);
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
        const result = await gateway().routeApplicationRequest(
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
        return sendGatewayError(reply, error);
      }
    },
  });
}
