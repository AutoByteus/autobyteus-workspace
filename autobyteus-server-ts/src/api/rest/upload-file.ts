import "@fastify/multipart";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { extension as mimeExtension } from "mime-types";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getMediaStorageService } from "../../services/media-storage-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/xml",
  "text/html",
  "text/x-python",
  "application/javascript",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/ogg",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
]);

function getCategoryFromMimetype(mimeType: string): string {
  if (mimeType.startsWith("image/")) {
    return "images";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (
    mimeType.startsWith("text/") ||
    ["application/json", "application/xml", "text/html", "text/x-python", "application/javascript"].includes(
      mimeType,
    )
  ) {
    return "texts";
  }
  if (
    [
      "application/pdf",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(mimeType)
  ) {
    return "documents";
  }
  return "others";
}

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/upload-file", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ detail: "No file uploaded." });
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      logger.error(`Unsupported file type: ${file.mimetype}`);
      return reply.code(400).send({ detail: `Unsupported file type: ${file.mimetype}` });
    }

    const category = getCategoryFromMimetype(file.mimetype);
    const mediaStorageService = getMediaStorageService();
    const storageDir = mediaStorageService.getStorageDirByCategory(category);
    const ext = mimeExtension(file.mimetype) ?? path.extname(file.filename) ?? "";
    const fileExtension = ext ? `.${ext}`.replace(/\.\./g, ".") : "";
    const uniqueFilename = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(storageDir, uniqueFilename);

    try {
      await pipeline(file.file, fs.createWriteStream(filePath));
      if (file.file.truncated) {
        logger.error(`Uploaded file exceeded multipart size limit and was truncated: ${file.filename}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return reply.code(413).send({ detail: "Uploaded file is too large." });
      }
      logger.info(`File saved successfully to persistent storage: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to save uploaded file: ${String(error)}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return reply.code(500).send({ detail: `Failed to save file: ${String(error)}` });
    }

    const baseUrl = appConfigProvider.config.getBaseUrl();
    const relativePath = path
      .relative(mediaStorageService.getMediaRoot(), filePath)
      .split(path.sep)
      .join("/");
    const fileUrl = `${baseUrl}/rest/files/${relativePath}`;

    logger.info(`Returning file URL: ${fileUrl}`);
    return reply.send({ fileUrl });
  });
}
