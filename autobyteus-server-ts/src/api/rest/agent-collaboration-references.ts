import type { FastifyInstance } from "fastify";
import {
  AgentOrgReferenceContentError,
  AgentOrgReferenceContentService,
} from "../../agent-org-execution/services/agent-org-reference-content-service.js";
import { getStandaloneAgentRunRootManager } from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

/**
 * Reference files of messages between the children of a standalone Agent run's collaboration
 * root. Reads the live or stored package; never restores the host.
 */
export async function registerAgentCollaborationReferenceRoutes(
  app: FastifyInstance,
  options: { contentService?: AgentOrgReferenceContentService } = {},
): Promise<void> {
  const content = options.contentService ?? new AgentOrgReferenceContentService({
    getCollaborationRecordsSnapshot: async (hostRunId) => {
      const inspection = await getStandaloneAgentRunRootManager().getInspection(hostRunId);
      if (!inspection) throw new AgentOrgReferenceContentError("REFERENCE_NOT_FOUND", "Agent collaboration reference was not found.");
      return { messages: inspection.snapshot.messages };
    },
  });
  app.get<{ Params: { hostRunId: string; messageId: string; referenceId: string } }>(
    "/agent-collaborations/:hostRunId/communication/messages/:messageId/references/:referenceId/content",
    async (request, reply) => {
      try {
        const resolved = await content.resolveCommunication({
          orgRunId: request.params.hostRunId, messageId: request.params.messageId, referenceId: request.params.referenceId,
        });
        reply.header("cache-control", "no-store");
        reply.type(resolved.mimeType);
        return reply.send(resolved.stream);
      } catch (error) {
        if (error instanceof AgentOrgReferenceContentError) {
          const status = error.code === "INVALID_REFERENCE_PATH" ? 400 : error.code === "REFERENCE_CONTENT_FORBIDDEN" ? 403 : 404;
          return reply.code(status).send({ detail: error.message, code: error.code });
        }
        throw error;
      }
    },
  );
}
