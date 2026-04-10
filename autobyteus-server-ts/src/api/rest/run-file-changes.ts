import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
} from "../../run-history/services/run-file-change-projection-service.js";

const isUnsupportedBinaryPreviewMime = (mimeType: string): boolean => {
  return (
    mimeType.startsWith("image/")
    || mimeType.startsWith("audio/")
    || mimeType.startsWith("video/")
    || mimeType === "application/pdf"
    || mimeType === "application/zip"
    || mimeType === "application/octet-stream"
    || mimeType === "application/vnd.ms-excel"
    || mimeType.includes("spreadsheetml")
  );
};

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

    const entry = await projectionService.getEntry(runId, rawPath);
    if (!entry) {
      return reply.code(404).send({ detail: "File change not found" });
    }

    const mimeType = (lookupMime(entry.path) || "text/plain").toString();

    if (entry.status === "pending" || entry.status === "streaming") {
      return reply.code(409).send({ detail: "File change content is not ready yet" });
    }

    if (isUnsupportedBinaryPreviewMime(mimeType)) {
      return reply.code(415).send({ detail: "Preview is not available for non-text file changes" });
    }

    if (typeof entry.content !== "string") {
      return reply.code(404).send({ detail: "File change content is not available" });
    }

    reply.header("cache-control", "no-store");
    reply.type(mimeType);
    return reply.send(entry.content);
  });
}
