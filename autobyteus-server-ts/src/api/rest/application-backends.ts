import type { FastifyInstance } from "fastify";
import type {
  ApplicationGraphqlRequest,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBackendRestContract, ApplicationPlatformLifecycleReadiness } from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import { sendApplicationRouteError } from "./application-route-error.js";
import {
  invokeApplicationCommand,
  invokeApplicationGraphql,
  invokeApplicationQuery,
  invokeApplicationRoute,
} from "./application-backend-route-handlers.js";

const APPLICATION_BACKEND_ROUTE_BASE = "/applications/:applicationId/backend";

export async function registerApplicationBackendRoutes(
  app: FastifyInstance,
  dependencies: {
    gateway: ApplicationBackendRestContract;
    lifecycle: ApplicationPlatformLifecycleReadiness;
  },
): Promise<void> {
  app.post<{
    Params: { applicationId: string; queryName: string };
    Body: { requestContext?: unknown; input?: unknown };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/queries/:queryName`, async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      const result = await invokeApplicationQuery({
        gateway: dependencies.gateway,
        applicationId: request.params.applicationId,
        queryName: request.params.queryName,
        value: request.body?.input ?? null,
      });
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });

  app.post<{
    Params: { applicationId: string; commandName: string };
    Body: { requestContext?: unknown; input?: unknown };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/commands/:commandName`, async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      const result = await invokeApplicationCommand({
        gateway: dependencies.gateway,
        applicationId: request.params.applicationId,
        commandName: request.params.commandName,
        value: request.body?.input ?? null,
      });
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });

  app.post<{
    Params: { applicationId: string };
    Body: { requestContext?: unknown; request: ApplicationGraphqlRequest };
  }>(`${APPLICATION_BACKEND_ROUTE_BASE}/graphql`, async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      const result = await invokeApplicationGraphql({
        gateway: dependencies.gateway,
        applicationId: request.params.applicationId,
        request: request.body.request,
      });
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
        await dependencies.lifecycle.awaitReady();
        const result = await invokeApplicationRoute({
          gateway: dependencies.gateway,
          applicationId,
          routePath,
          request,
        });

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
