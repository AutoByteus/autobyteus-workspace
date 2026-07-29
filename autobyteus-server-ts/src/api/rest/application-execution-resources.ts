import type { FastifyInstance } from "fastify";
import type {
  ApplicationExecutionResourceRef,
  ApplicationLaunchOverride,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import { sendApplicationRouteError } from "./application-route-error.js";

export async function registerApplicationExecutionResourceRoutes(
  app: FastifyInstance,
  orchestration: ApplicationOrchestrationHostService,
): Promise<void> {
  app.get<{ Params: { applicationId: string } }>(
    "/applications/:applicationId/execution-resource-configurations",
    async (request, reply) => {
      try { return reply.send(await orchestration.getApplicationLaunchConfigurationView(request.params.applicationId)); }
      catch (error) { return sendApplicationRouteError(reply, error); }
    },
  );
  app.post<{
    Params: { applicationId: string; slotKey: string };
    Body: { executionResourceRef: ApplicationExecutionResourceRef };
  }>(
    "/applications/:applicationId/execution-resource-configurations/:slotKey/selection-preview",
    async (request, reply) => {
      try {
        return reply.send(await orchestration.previewSelectedApplicationResource(
          request.params.applicationId,
          request.params.slotKey,
          request.body.executionResourceRef,
        ));
      } catch (error) { return sendApplicationRouteError(reply, error); }
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
    Body: { executionResourceRef?: unknown; launchOverride?: ApplicationLaunchOverride | null };
  }>(
    "/applications/:applicationId/execution-resource-configurations/:slotKey",
    async (request, reply) => {
      try {
        return reply.send(await orchestration.upsertApplicationLaunchOverride(
          request.params.applicationId,
          request.params.slotKey,
          {
            executionResourceRef: request.body?.executionResourceRef as never,
            launchOverride: request.body?.launchOverride ?? null,
          },
        ));
      } catch (error) { return sendApplicationRouteError(reply, error); }
    },
  );
  app.delete<{ Params: { applicationId: string; slotKey: string } }>(
    "/applications/:applicationId/execution-resource-configurations/:slotKey",
    async (request, reply) => {
      try {
        return reply.send(await orchestration.removeApplicationLaunchOverride(
          request.params.applicationId,
          request.params.slotKey,
        ));
      } catch (error) { return sendApplicationRouteError(reply, error); }
    },
  );
}
