import type { FastifyInstance } from "fastify";
import type { ApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import type { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import type { ApplicationPlatformLifecycle } from "../../application-platform/runtime/application-platform-lifecycle.js";
import { sendApplicationRouteError } from "./application-route-error.js";

const BASE = "/applications/:applicationId/backend";

export async function registerApplicationAvailabilityRoutes(
  app: FastifyInstance,
  dependencies: {
    gateway: ApplicationBackendApiGatewayService;
    availabilityService: ApplicationAvailabilityService;
    lifecycle: ApplicationPlatformLifecycle;
  },
): Promise<void> {
  app.get<{ Params: { applicationId: string } }>(`${BASE}/status`, async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      return reply.send(await dependencies.gateway.getApplicationEngineStatus(request.params.applicationId));
    }
    catch (error) { return sendApplicationRouteError(reply, error); }
  });
  app.post<{ Params: { applicationId: string } }>(`${BASE}/ensure-ready`, async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      return reply.send(await dependencies.gateway.ensureApplicationReady(request.params.applicationId));
    }
    catch (error) { return sendApplicationRouteError(reply, error); }
  });
  app.post<{ Params: { applicationId: string } }>(`${BASE}/reload`, async (request, reply) => {
    try {
      await dependencies.lifecycle.awaitReady();
      return reply.send(await dependencies.availabilityService.reloadAndReenter(request.params.applicationId));
    }
    catch (error) { return sendApplicationRouteError(reply, error); }
  });
}
