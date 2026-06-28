import type { FastifyInstance } from "fastify";
import {
  getTaskDelegationReferenceContentService,
  TaskDelegationReferenceContentError,
  TaskDelegationReferenceContentService,
} from "../../agent-team-execution/task-delegation/task-delegation-reference-content-service.js";

const statusForReferenceContentError = (error: TaskDelegationReferenceContentError): number => {
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

export async function registerTaskDelegationRoutes(
  app: FastifyInstance,
  options: { contentService?: TaskDelegationReferenceContentService } = {},
): Promise<void> {
  const contentService = options.contentService ?? getTaskDelegationReferenceContentService();

  app.get<{
    Params: { teamRunId: string; taskId: string; referenceId: string };
  }>(
    "/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content",
    async (request, reply) => {
      const { teamRunId, taskId, referenceId } = request.params;
      try {
        const resolved = await contentService.resolveContent({ teamRunId, taskId, referenceId });
        reply.header("cache-control", "no-store");
        reply.type(resolved.mimeType);
        return reply.send(resolved.stream);
      } catch (error) {
        if (error instanceof TaskDelegationReferenceContentError) {
          return reply
            .code(statusForReferenceContentError(error))
            .send({ detail: error.message, code: error.code });
        }
        throw error;
      }
    },
  );
}
