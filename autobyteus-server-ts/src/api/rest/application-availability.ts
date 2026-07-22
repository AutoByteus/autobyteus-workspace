import type { FastifyInstance } from "fastify";
import { getApplicationBackendApiGatewayService } from "../../application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import { getApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import { sendApplicationRouteError } from "./application-route-error.js";

const BASE = "/applications/:applicationId/backend";

export async function registerApplicationAvailabilityRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { applicationId: string } }>(`${BASE}/status`, async (request, reply) => {
    try { return reply.send(await getApplicationBackendApiGatewayService().getApplicationEngineStatus(request.params.applicationId)); }
    catch (error) { return sendApplicationRouteError(reply, error); }
  });
  app.post<{ Params: { applicationId: string } }>(`${BASE}/ensure-ready`, async (request, reply) => {
    try { return reply.send(await getApplicationBackendApiGatewayService().ensureApplicationReady(request.params.applicationId)); }
    catch (error) { return sendApplicationRouteError(reply, error); }
  });
  app.post<{ Params: { applicationId: string } }>(`${BASE}/reload`, async (request, reply) => {
    try { return reply.send(await getApplicationAvailabilityService().reloadAndReenter(request.params.applicationId)); }
    catch (error) { return sendApplicationRouteError(reply, error); }
  });
}
