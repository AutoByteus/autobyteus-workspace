import type { MultipartFile } from "@fastify/multipart";
import { allowedMimeTypes, buildStoredFilename } from "../domain/context-file-upload-policy.js";
import { writeContextFileUpload } from "./context-file-upload-writer.js";
import type { ContextFileDraftOwnerDescriptor } from "../domain/context-file-owner-types.js";
import { buildDraftContextFileLocator } from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";
import { ContextFileDraftCleanupService } from "./context-file-draft-cleanup-service.js";

import { ContextFileOwnerResolver } from "./context-file-owner-resolver.js";

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
    private readonly ownerResolver: ContextFileOwnerResolver,
  ) {}

  async uploadDraftAttachment(
    owner: ContextFileDraftOwnerDescriptor,
    file: MultipartFile,
  ): Promise<UploadedDraftContextFile> {
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    await this.ownerResolver.validateDraftOwner(owner);
    await this.cleanupService.cleanupExpiredDrafts();
    await this.layout.ensureDraftOwnerDir(owner);

    const storedFilename = buildStoredFilename(file.filename, file.mimetype);
    const filePath = this.layout.getDraftFilePath(owner, storedFilename);

    await writeContextFileUpload(file, filePath);

    return {
      storedFilename,
      displayName: file.filename,
      locator: buildDraftContextFileLocator(owner, storedFilename),
      phase: "draft",
    };
  }
}
