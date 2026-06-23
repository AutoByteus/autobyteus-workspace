import type { FastifyInstance } from "fastify";
import { getMemoryHubIngestionService, MemoryHubIngestionError } from "../../memory-sync/hub/memory-hub-ingestion-service.js";
import { MemoryHubCredentialError } from "../../memory-sync/hub/memory-hub-credential-service.js";
import { readBearerToken } from "../../memory-sync/hub/memory-hub-auth.js";
import type { MemorySyncBatch } from "../../memory-sync/shared/memory-sync-types.js";

const sendMemorySyncError = (
  reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } },
  error: unknown,
) => {
  if (error instanceof MemoryHubIngestionError || error instanceof MemoryHubCredentialError) {
    return reply.code(error.statusCode).send({ error: error.name, message: error.message });
  }
  return reply.code(400).send({ error: "MemorySyncRequestError", message: error instanceof Error ? error.message : String(error) });
};

export async function registerMemorySyncRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { sourceNodeId?: string } }>("/memory-sync/v1/health", async (request, reply) => {
    try {
      return await getMemoryHubIngestionService().health({
        token: readBearerToken(request.headers.authorization),
        sourceNodeId: request.query.sourceNodeId ?? "",
      });
    } catch (error) {
      return sendMemorySyncError(reply, error);
    }
  });

  app.post<{ Body: MemorySyncBatch }>(
    "/memory-sync/v1/batches",
    { bodyLimit: 50 * 1024 * 1024 },
    async (request, reply) => {
      try {
        return await getMemoryHubIngestionService().commitBatch({
          token: readBearerToken(request.headers.authorization),
          batch: request.body,
        });
      } catch (error) {
        return sendMemorySyncError(reply, error);
      }
    },
  );
}
