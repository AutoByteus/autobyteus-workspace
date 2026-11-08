import type { FastifyInstance } from "fastify";
import {
  AgentOrgReferenceContentError,
  AgentOrgReferenceContentService,
} from "../../agent-org-execution/services/agent-org-reference-content-service.js";
import {
  StandaloneRootUnavailableError,
  getStandaloneAgentRunRootManager,
} from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { sendUserFile } from "./user-file-reply.js";

/**
 * Reference files of messages between the children of a standalone Agent run's collaboration
 * root. Reads the live or stored package; never restores the host.
 */
export async function registerAgentCollaborationReferenceRoutes(
  app: FastifyInstance,
  options: { contentService?: AgentOrgReferenceContentService } = {},
): Promise<void> {
  const content = options.contentService ?? new AgentOrgReferenceContentService({
    // The hub's records owner (autobyteus-358): its live messages, or its stored log; never its view.
    getCollaborationRecordsSnapshot: async (hostRunId) => {
      try {
        return await getStandaloneAgentRunRootManager().getCollaborationRecordsSnapshot(hostRunId);
      } catch (error) {
        if (error instanceof StandaloneRootUnavailableError) {
          throw new AgentOrgReferenceContentError("REFERENCE_NOT_FOUND", "Agent collaboration reference was not found.");
        }
        throw error;
      }
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
        return sendUserFile(reply, { mimeType: resolved.mimeType, body: resolved.stream });
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
