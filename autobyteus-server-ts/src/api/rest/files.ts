import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import { getMediaStorageService } from "../../services/media-storage-service.js";
import { sendUserFile } from "./user-file-reply.js";

export async function registerFileRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { category: string; filename: string };
  }>("/files/:category/:filename", async (request, reply) => {
    const { category, filename } = request.params;
    const mediaStorageService = getMediaStorageService();
    const mediaRoot = mediaStorageService.getMediaRoot();

    if (
      category.includes("..") ||
      category.includes("/") ||
      category.includes("\\") ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return reply.code(400).send({ detail: "Invalid path components." });
    }

    const filePath = path.join(mediaRoot, category, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(mediaRoot);

    if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
      return reply.code(400).send({ detail: "Invalid path components." });
    }

    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return reply.code(404).send({ detail: "File not found." });
    }

    return sendUserFile(reply, {
      mimeType: (lookupMime(resolvedPath) || "application/octet-stream").toString(),
      body: fs.createReadStream(resolvedPath),
    });
  });
}
