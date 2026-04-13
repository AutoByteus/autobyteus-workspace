import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContextFileDraftOwnerDescriptor,
  ContextFileFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import {
  assertStoredFilename,
  buildFinalContextFileLocator,
} from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";
import { ContextFileDraftCleanupService } from "./context-file-draft-cleanup-service.js";

const normalizeDisplayName = (displayName: string): string => {
  if (!displayName.trim()) {
    throw new Error("displayName is required.");
  }
  return displayName;
};

const moveFileSafely = async (sourcePath: string, destinationPath: string): Promise<void> => {
  try {
    await fs.rename(sourcePath, destinationPath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      throw error;
    }
  }

  await fs.copyFile(sourcePath, destinationPath);
  await fs.unlink(sourcePath);
};

export type FinalizedContextFile = {
  storedFilename: string;
  displayName: string;
  locator: string;
  phase: "final";
};

type FinalizeContextFileDescriptor = {
  storedFilename: string;
  displayName: string;
};

export class ContextFileFinalizationService {
  constructor(
    private readonly layout: ContextFileLayout,
    private readonly cleanupService: ContextFileDraftCleanupService,
  ) {}

  async finalizeDraftAttachments(input: {
    draftOwner: ContextFileDraftOwnerDescriptor;
    finalOwner: ContextFileFinalOwnerDescriptor;
    attachments: FinalizeContextFileDescriptor[];
  }): Promise<FinalizedContextFile[]> {
    await this.cleanupService.cleanupExpiredDrafts();
    await this.layout.ensureFinalOwnerDir(input.finalOwner);

    const finalizedFiles: FinalizedContextFile[] = [];
    const uniqueAttachments = Array.from(
      input.attachments.reduce<Map<string, FinalizeContextFileDescriptor>>((deduped, attachment) => {
        const storedFilename = assertStoredFilename(attachment.storedFilename);
        if (deduped.has(storedFilename)) {
          return deduped;
        }

        deduped.set(storedFilename, {
          storedFilename,
          displayName: normalizeDisplayName(attachment.displayName),
        });
        return deduped;
      }, new Map()).values(),
    );

    for (const attachment of uniqueAttachments) {
      const { storedFilename, displayName } = attachment;
      const draftFilePath = this.layout.getDraftFilePath(input.draftOwner, storedFilename);
      const finalFilePath = this.layout.getFinalFilePath(input.finalOwner, storedFilename);

      const draftExists = await this.fileExists(draftFilePath);
      const finalExists = await this.fileExists(finalFilePath);

      if (!draftExists && !finalExists) {
        throw new Error(`Draft attachment '${storedFilename}' was not found.`);
      }

      if (!finalExists && draftExists) {
        await fs.mkdir(path.dirname(finalFilePath), { recursive: true });
        await moveFileSafely(draftFilePath, finalFilePath);
      } else if (draftExists && draftFilePath !== finalFilePath) {
        await fs.rm(draftFilePath, { force: true });
      }

      finalizedFiles.push({
        storedFilename,
        displayName,
        locator: buildFinalContextFileLocator(input.finalOwner, storedFilename),
        phase: "final",
      });
    }

    await this.cleanupService.pruneDraftOwnerDirectories(input.draftOwner);
    return finalizedFiles;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }
}
