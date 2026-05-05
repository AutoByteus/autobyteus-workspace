import type { FastifyInstance } from "fastify";
import {
  MessageFileReferenceContentError,
  MessageFileReferenceContentService,
  getMessageFileReferenceContentService,
} from "../../services/message-file-references/message-file-reference-content-service.js";

const statusForReferenceContentError = (error: MessageFileReferenceContentError): number => {
  switch (error.code) {
    case "INVALID_REFERENCE_PATH":
      return 400;
    case "REFERENCE_CONTENT_FORBIDDEN":
      return 403;
    case "REFERENCE_NOT_FOUND":
    case "REFERENCE_CONTENT_UNAVAILABLE":
    default:
      return 404;
  }
};

export async function registerMessageFileReferenceRoutes(
  app: FastifyInstance,
  options: {
    contentService?: MessageFileReferenceContentService;
  } = {},
): Promise<void> {
  const contentService = options.contentService ?? getMessageFileReferenceContentService();

  app.get<{
    Params: { teamRunId: string; referenceId: string };
  }>(
    "/team-runs/:teamRunId/message-file-references/:referenceId/content",
    async (request, reply) => {
      try {
        const resolved = await contentService.resolveContent({
          teamRunId: request.params.teamRunId,
          referenceId: request.params.referenceId,
        });
        reply.header("cache-control", "no-store");
        reply.type(resolved.mimeType);
        return reply.send(resolved.stream);
      } catch (error) {
        if (error instanceof MessageFileReferenceContentError) {
          return reply.code(statusForReferenceContentError(error)).send({ detail: error.message });
        }
        return reply.code(500).send({ detail: "An internal server error occurred." });
      }
    },
  );
}
