import type { FastifyInstance } from "fastify";
import {
  TeamCommunicationContentService,
  TeamCommunicationReferenceContentError,
  getTeamCommunicationContentService,
} from "../../services/team-communication/team-communication-content-service.js";

const statusForReferenceContentError = (error: TeamCommunicationReferenceContentError): number => {
  switch (error.code) {
    case "REFERENCE_NOT_FOUND":
    case "REFERENCE_CONTENT_UNAVAILABLE":
      return 404;
    case "INVALID_REFERENCE_PATH":
      return 400;
    case "REFERENCE_CONTENT_FORBIDDEN":
      return 403;
    default:
      return 500;
  }
};

export async function registerTeamCommunicationRoutes(
  app: FastifyInstance,
  options: {
    contentService?: TeamCommunicationContentService;
  } = {},
): Promise<void> {
  const contentService = options.contentService ?? getTeamCommunicationContentService();

  app.get<{
    Params: { teamRunId: string; messageId: string; referenceId: string };
  }>(
    "/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content",
    async (request, reply) => {
      const { teamRunId, messageId, referenceId } = request.params;
      try {
        const resolved = await contentService.resolveContent({ teamRunId, messageId, referenceId });
        reply.header("cache-control", "no-store");
        reply.type(resolved.mimeType);
        return reply.send(resolved.stream);
      } catch (error) {
        if (error instanceof TeamCommunicationReferenceContentError) {
          return reply
            .code(statusForReferenceContentError(error))
            .send({ detail: error.message, code: error.code });
        }
        throw error;
      }
    },
  );
}
