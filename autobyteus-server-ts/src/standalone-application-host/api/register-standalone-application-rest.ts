import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApplicationGraphqlRequest } from "@autobyteus/application-sdk-contracts";
import type { ApplicationPlatformLifecycle } from "../../application-platform/runtime/application-platform-lifecycle.js";
import type { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import type { StandaloneApplicationSelection } from "../domain/standalone-application-selection.js";
import { StandaloneApplicationBootstrapService } from "../services/standalone-application-bootstrap-service.js";
import {
  invokeApplicationCommand,
  invokeApplicationGraphql,
  invokeApplicationQuery,
  invokeApplicationRoute,
} from "../../api/rest/application-backend-route-handlers.js";
import { sendApplicationRouteError } from "../../api/rest/application-route-error.js";

const applyRouteResponse = (
  reply: FastifyReply,
  result: unknown,
) => {
  const response = result as {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
  for (const [name, value] of Object.entries(response.headers ?? {})) {
    reply.header(name, value);
  }
  return reply.code(response.status ?? 200).send(response.body ?? null);
};

export const registerStandaloneApplicationRest = async (
  app: FastifyInstance,
  dependencies: {
    selection: StandaloneApplicationSelection;
    lifecycle: ApplicationPlatformLifecycle;
    gateway: ApplicationBackendApiGatewayService;
  },
): Promise<void> => {
  const { applicationId } = dependencies.selection;
  const bootstrapService = new StandaloneApplicationBootstrapService(dependencies);

  app.get("/_autobyteus/health", async (_request, reply) => {
    const state = dependencies.lifecycle.getState();
    const failure = dependencies.lifecycle.getFailure();
    return reply.code(state === "ready" ? 200 : state === "failed" ? 503 : 202).send({
      state,
      ready: state === "ready",
      detail: failure?.message ?? null,
    });
  });
  app.get("/_autobyteus/bootstrap", async (_request, reply) => {
    try {
      return reply.send(await bootstrapService.getBootstrap());
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });
  app.post<{
    Params: { queryName: string };
    Body: { input?: unknown };
  }>("/_autobyteus/backend/queries/:queryName", async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      const result = await invokeApplicationQuery({
        gateway: dependencies.gateway,
        applicationId,
        queryName: request.params.queryName,
        value: request.body?.input ?? null,
      });
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });
  app.post<{
    Params: { commandName: string };
    Body: { input?: unknown };
  }>("/_autobyteus/backend/commands/:commandName", async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      const result = await invokeApplicationCommand({
        gateway: dependencies.gateway,
        applicationId,
        commandName: request.params.commandName,
        value: request.body?.input ?? null,
      });
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });
  app.post<{
    Body: { request: ApplicationGraphqlRequest };
  }>("/_autobyteus/backend/graphql", async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      const result = await invokeApplicationGraphql({
        gateway: dependencies.gateway,
        applicationId,
        request: request.body.request,
      });
      return reply.send({ result });
    } catch (error) {
      return sendApplicationRouteError(reply, error);
    }
  });
  app.route<{ Params: { "*": string } }>({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    url: "/_autobyteus/backend/routes/*",
    handler: async (request, reply) => {
      try {
        await dependencies.lifecycle.awaitReady();
        return applyRouteResponse(reply, await invokeApplicationRoute({
          gateway: dependencies.gateway,
          applicationId,
          routePath: `/${request.params["*"] ?? ""}`.replace(/\/+/g, "/"),
          request,
        }));
      } catch (error) {
        return sendApplicationRouteError(reply, error);
      }
    },
  });
};
