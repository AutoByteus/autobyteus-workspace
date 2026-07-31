import type { FastifyInstance } from "fastify";
import type {
  ApplicationAvailabilityRestContract,
  ApplicationBackendRestContract,
  ApplicationPlatformLifecycleReadiness,
} from "../../application-platform/runtime/application-platform-runtime-contracts.js";
import { sendApplicationRouteError } from "./application-route-error.js";

const BASE = "/applications/:applicationId/backend";

export async function registerApplicationAvailabilityRoutes(
  app: FastifyInstance,
  dependencies: {
    gateway: ApplicationBackendRestContract;
    availabilityService: ApplicationAvailabilityRestContract;
    lifecycle: ApplicationPlatformLifecycleReadiness;
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
