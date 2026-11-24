import type { FastifyInstance } from "fastify";
import { collaborationRootKindSchema } from "@autobyteus/collaboration-stream-contracts";
import {
  MessageReferenceContentError,
  getMessageReferenceContentReader,
  type MessageReferenceContentErrorCode,
} from "../../run-history/services/message-reference-content-reader.js";
import { sendUserFile } from "./user-file-reply.js";

const STATUS: Readonly<Record<MessageReferenceContentErrorCode, number>> = Object.freeze({
  REFERENCE_NOT_FOUND: 404,
  INVALID_REFERENCE_PATH: 400,
  REFERENCE_CONTENT_UNAVAILABLE: 404,
  REFERENCE_CONTENT_FORBIDDEN: 403,
});

/**
 * A reference file of a message of a run's view (autobyteus-615), by the identity its message list was read with
 * (`collaborationParticipantMessages`: root kind and run ID): the one route for every root kind, standalone, Team and Org
 * alike. A refusal answers `{ detail, code }`. The process reader is read per request, as the GraphQL resolver does.
 */
export async function registerCollaborationMessageReferenceRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { rootKind: string; rootRunId: string; messageId: string; referenceId: string } }>(
    "/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content",
    async (request, reply) => {
      const { rootRunId, messageId, referenceId } = request.params;
      const rootKind = collaborationRootKindSchema.safeParse(request.params.rootKind);
      if (!rootKind.success) {
        return reply.code(400).send({ detail: `Unknown collaboration root kind '${request.params.rootKind}'.`, code: "INVALID_ROOT_KIND" });
      }
      try {
        const content = await getMessageReferenceContentReader().resolve({ rootKind: rootKind.data, rootRunId, messageId, referenceId });
        reply.header("cache-control", "no-store");
        return sendUserFile(reply, { kind: "stream", mimeType: content.mimeType, body: content.stream, size: null }, request);
      } catch (error) {
        if (error instanceof MessageReferenceContentError) {
          return reply.code(STATUS[error.code]).send({ detail: error.message, code: error.code });
        }
        throw error;
      }
    },
  );
}
