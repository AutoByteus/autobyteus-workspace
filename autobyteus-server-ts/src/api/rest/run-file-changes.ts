import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
} from "../../run-history/services/run-file-change-projection-service.js";

export async function registerRunFileChangeRoutes(
  app: FastifyInstance,
  options: {
    projectionService?: RunFileChangeProjectionService;
  } = {},
): Promise<void> {
  const projectionService = options.projectionService ?? getRunFileChangeProjectionService();

  app.get<{
    Params: { runId: string };
    Querystring: { path?: string };
  }>("/runs/:runId/file-change-content", async (request, reply) => {
    const { runId } = request.params;
    const rawPath = request.query?.path?.trim();

    if (!rawPath) {
      return reply.code(400).send({ detail: "Missing required query parameter: path" });
    }

    const resolvedEntry = await projectionService.resolveEntry(runId, rawPath);
    if (!resolvedEntry) {
      return reply.code(404).send({ detail: "File change not found" });
    }

    const { entry, absolutePath, isActiveRun } = resolvedEntry;
    const fileExists = Boolean(
      absolutePath
      && fs.existsSync(absolutePath)
      && fs.statSync(absolutePath).isFile(),
    );

    if (!fileExists) {
      if (isActiveRun && (entry.status === "pending" || entry.status === "streaming")) {
        return reply.code(409).send({ detail: "File change content is not ready yet" });
      }
      return reply.code(404).send({ detail: "File change content is not available" });
    }

    const mimeType = (lookupMime(absolutePath!) || (entry.type === "file" ? "text/plain" : "application/octet-stream")).toString();
    reply.header("cache-control", "no-store");
    reply.type(mimeType);
    return reply.send(fs.createReadStream(absolutePath!));
  });
}
