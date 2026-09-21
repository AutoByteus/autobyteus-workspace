import type { FastifyInstance, FastifyReply } from "fastify";
import {
  AgentOrgReferenceContentError,
  AgentOrgReferenceContentService,
  getAgentOrgReferenceContentService,
} from "../../agent-org-execution/services/agent-org-reference-content-service.js";

const status = (error: AgentOrgReferenceContentError): number => {
  if (error.code === "INVALID_REFERENCE_PATH") return 400;
  if (error.code === "REFERENCE_CONTENT_FORBIDDEN") return 403;
  return 404;
};

const send = async (
  reply: FastifyReply,
  resolve: () => Promise<Readonly<{ mimeType: string; stream: NodeJS.ReadableStream }>>,
) => {
  try {
    const content = await resolve();
    reply.header("cache-control", "no-store");
    reply.type(content.mimeType);
    return reply.send(content.stream);
  } catch (error) {
    if (error instanceof AgentOrgReferenceContentError) {
      return reply.code(status(error)).send({ detail: error.message, code: error.code });
    }
    throw error;
  }
};

export async function registerAgentOrgReferenceRoutes(
  app: FastifyInstance,
  options: { contentService?: AgentOrgReferenceContentService } = {},
): Promise<void> {
  const content = options.contentService ?? getAgentOrgReferenceContentService();
  app.get<{ Params: { orgRunId: string; messageId: string; referenceId: string } }>(
    "/agent-org-runs/:orgRunId/communication/messages/:messageId/references/:referenceId/content",
    (request, reply) => send(reply, () => content.resolveCommunication(request.params)),
  );
  app.get<{ Params: { orgRunId: string; taskId: string; referenceId: string } }>(
    "/agent-org-runs/:orgRunId/task-delegations/:taskId/references/:referenceId/content",
    (request, reply) => send(reply, () => content.resolveTask(request.params)),
  );
}
