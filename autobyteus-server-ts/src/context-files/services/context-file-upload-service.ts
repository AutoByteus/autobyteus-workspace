import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import type { MultipartFile } from "@fastify/multipart";
import { extension as mimeExtension } from "mime-types";
import type { ContextFileDraftOwnerDescriptor } from "../domain/context-file-owner-types.js";
import { buildDraftContextFileLocator } from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";
import { ContextFileDraftCleanupService } from "./context-file-draft-cleanup-service.js";

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

const sanitizeFilenameStem = (filename: string): string => {
  const stem = path.parse(filename).name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[-_.]+|[-_.]+$/g, "");
  return stem || "file";
};

const sanitizeFilenameExtension = (filename: string, mimetype: string): string => {
  const preferredExtension = mimeExtension(mimetype) ?? path.extname(filename).replace(/^\./, "");
  const normalizedExtension = String(preferredExtension || "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
  return normalizedExtension ? `.${normalizedExtension}` : "";
};

const buildStoredFilename = (filename: string, mimetype: string): string => {
  const token = randomUUID().replace(/-/g, "").slice(0, 12);
  const stem = sanitizeFilenameStem(filename).slice(0, 80);
  const extension = sanitizeFilenameExtension(filename, mimetype);
  return `ctx_${token}__${stem}${extension}`;
};

export type UploadedDraftContextFile = {
  storedFilename: string;
  displayName: string;
  locator: string;
  phase: "draft";
};

export class ContextFileUploadService {
  constructor(
    private readonly layout: ContextFileLayout,
    private readonly cleanupService: ContextFileDraftCleanupService,
  ) {}

  async uploadDraftAttachment(
    owner: ContextFileDraftOwnerDescriptor,
    file: MultipartFile,
  ): Promise<UploadedDraftContextFile> {
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    await this.cleanupService.cleanupExpiredDrafts();
    await this.layout.ensureDraftOwnerDir(owner);

    const storedFilename = buildStoredFilename(file.filename, file.mimetype);
    const filePath = this.layout.getDraftFilePath(owner, storedFilename);

    try {
      await pipeline(file.file, fs.createWriteStream(filePath));
      if (file.file.truncated) {
        await fs.promises.rm(filePath, { force: true });
        throw new Error("Uploaded file is too large.");
      }
    } catch (error) {
      await fs.promises.rm(filePath, { force: true });
      throw error;
    }

    return {
      storedFilename,
      displayName: file.filename,
      locator: buildDraftContextFileLocator(owner, storedFilename),
      phase: "draft",
    };
  }
}
