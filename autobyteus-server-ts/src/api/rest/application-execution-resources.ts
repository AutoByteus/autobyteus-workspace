import type { FastifyInstance } from "fastify";
import type { ApplicationConfiguredLaunchProfile } from "@autobyteus/application-sdk-contracts";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import { sendApplicationRouteError } from "./application-route-error.js";

export async function registerApplicationExecutionResourceRoutes(
  app: FastifyInstance,
  orchestration: ApplicationOrchestrationHostService,
): Promise<void> {
  app.get<{ Params: { applicationId: string } }>(
    "/applications/:applicationId/execution-resource-configurations",
    async (request, reply) => {
      try { return reply.send(await orchestration.listExecutionResourceConfigurations(request.params.applicationId)); }
      catch (error) { return sendApplicationRouteError(reply, error); }
    },
  );
  app.get<{ Params: { applicationId: string } }>(
    "/applications/:applicationId/available-execution-resources",
    async (request, reply) => {
      try { return reply.send(await orchestration.listAvailableExecutionResources(request.params.applicationId)); }
      catch (error) { return sendApplicationRouteError(reply, error); }
    },
  );
  app.put<{
    Params: { applicationId: string; slotKey: string };
    Body: { executionResourceRef?: unknown; launchProfile?: ApplicationConfiguredLaunchProfile | null };
  }>(
    "/applications/:applicationId/execution-resource-configurations/:slotKey",
    async (request, reply) => {
      try {
        return reply.send(await orchestration.upsertExecutionResourceConfiguration(
          request.params.applicationId,
          request.params.slotKey,
          { executionResourceRef: request.body?.executionResourceRef as never, launchProfile: request.body?.launchProfile ?? null },
        ));
      } catch (error) { return sendApplicationRouteError(reply, error); }
    },
  );
}
