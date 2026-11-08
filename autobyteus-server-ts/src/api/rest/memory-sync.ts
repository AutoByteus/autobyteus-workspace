import type { FastifyInstance, FastifyRequest } from "fastify";
import { getMemoryHubIngestionService, MemoryHubIngestionError } from "../../memory-sync/hub/memory-hub-ingestion-service.js";
import { MemoryHubCredentialError } from "../../memory-sync/hub/memory-hub-credential-service.js";
import { getClientIdentity } from "../security/node-access-gate.js";
import type { MemorySyncBatch } from "../../memory-sync/shared/memory-sync-types.js";
import { MemorySyncNotMigratedError } from "../../memory-sync/shared/memory-sync-capability.js";

const sendMemorySyncError = (
  reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } },
  error: unknown,
) => {
  // While Memory Sync is held back (autobyteus-290 `memory_sync`), the hub answers its sources that it is unavailable.
  if (error instanceof MemorySyncNotMigratedError) {
    return reply.code(503).send({ error: error.code, message: error.message });
  }
  if (error instanceof MemoryHubIngestionError || error instanceof MemoryHubCredentialError) {
    return reply.code(error.statusCode).send({ error: error.name, message: error.message });
  }
  return reply.code(400).send({ error: "MemorySyncRequestError", message: error instanceof Error ? error.message : String(error) });
};

/** The memory sync source credential the node access gate verified (these routes admit only that kind, NA-7). */
const sourceCredentialId = (request: FastifyRequest): string => {
  const identity = getClientIdentity(request);
  if (identity?.kind !== "memory_sync_source") throw new MemoryHubCredentialError("Memory Hub source token is required.");
  return identity.credentialId;
};

export async function registerMemorySyncRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { memorySyncSourceId?: string } }>("/memory-sync/v1/health", async (request, reply) => {
    try {
      return await getMemoryHubIngestionService().health({
        credentialId: sourceCredentialId(request),
        memorySyncSourceId: request.query.memorySyncSourceId ?? "",
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
          credentialId: sourceCredentialId(request),
          batch: request.body,
        });
      } catch (error) {
        return sendMemorySyncError(reply, error);
      }
    },
  );
}
