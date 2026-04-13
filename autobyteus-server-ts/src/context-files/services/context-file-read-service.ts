import fs from "node:fs/promises";
import type {
  ContextFileDraftOwnerDescriptor,
  ContextFileFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import { assertStoredFilename } from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";
import { ContextFileDraftCleanupService } from "./context-file-draft-cleanup-service.js";

export class ContextFileReadService {
  constructor(
    private readonly layout: ContextFileLayout,
    private readonly cleanupService: ContextFileDraftCleanupService,
  ) {}

  async getDraftFilePath(
    owner: ContextFileDraftOwnerDescriptor,
    storedFilename: string,
  ): Promise<string | null> {
    await this.cleanupService.cleanupExpiredDrafts();
    return this.resolveExistingFilePath(this.layout.getDraftFilePath(owner, storedFilename));
  }

  async getFinalFilePath(
    owner: ContextFileFinalOwnerDescriptor,
    storedFilename: string,
  ): Promise<string | null> {
    await this.cleanupService.cleanupExpiredDrafts();
    return this.resolveExistingFilePath(this.layout.getFinalFilePath(owner, storedFilename));
  }

  async deleteDraftFile(
    owner: ContextFileDraftOwnerDescriptor,
    storedFilename: string,
  ): Promise<boolean> {
    await this.cleanupService.cleanupExpiredDrafts();
    const draftFilePath = this.layout.getDraftFilePath(owner, assertStoredFilename(storedFilename));

    try {
      await fs.unlink(draftFilePath);
      await this.cleanupService.pruneDraftOwnerDirectories(owner);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await this.cleanupService.pruneDraftOwnerDirectories(owner);
        return false;
      }
      throw error;
    }
  }

  private async resolveExistingFilePath(filePath: string): Promise<string | null> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile() ? filePath : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
}
