import fs from "node:fs/promises";
import path from "node:path";
import type { ContextFileDraftOwnerDescriptor } from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";

const DEFAULT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class ContextFileDraftCleanupService {
  constructor(
    private readonly layout: ContextFileLayout,
    private readonly draftTtlMs: number = DEFAULT_DRAFT_TTL_MS,
  ) {}

  async cleanupExpiredDrafts(): Promise<void> {
    const draftRootDir = this.layout.getDraftRootDirPath();
    await this.cleanupDirectory(draftRootDir, Date.now() - this.draftTtlMs, true);
  }

  async pruneDraftOwnerDirectories(owner: ContextFileDraftOwnerDescriptor): Promise<void> {
    await this.pruneEmptyAncestors(
      this.layout.getDraftOwnerDirPath(owner),
      this.layout.getDraftRootDirPath(),
    );
  }

  private async cleanupDirectory(
    directoryPath: string,
    expiryCutoffMs: number,
    isRoot: boolean,
  ): Promise<boolean> {
    let entries;
    try {
      entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return true;
      }
      throw error;
    }

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await this.cleanupDirectory(entryPath, expiryCutoffMs, false);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      try {
        const stat = await fs.stat(entryPath);
        if (stat.mtimeMs < expiryCutoffMs) {
          await fs.unlink(entryPath);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.warn(`Failed to cleanup expired draft attachment '${entryPath}': ${String(error)}`);
        }
      }
    }

    let remainingEntries;
    try {
      remainingEntries = await fs.readdir(directoryPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return true;
      }
      throw error;
    }

    if (remainingEntries.length === 0 && !isRoot) {
      try {
        await fs.rmdir(directoryPath);
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.warn(`Failed to prune empty draft directory '${directoryPath}': ${String(error)}`);
        }
      }
    }

    return remainingEntries.length === 0;
  }

  private async pruneEmptyAncestors(startDir: string, stopDir: string): Promise<void> {
    const resolvedStopDir = path.resolve(stopDir);
    let currentDir = path.resolve(startDir);

    while (currentDir.startsWith(resolvedStopDir) && currentDir !== resolvedStopDir) {
      try {
        const entries = await fs.readdir(currentDir);
        if (entries.length > 0) {
          return;
        }
        await fs.rmdir(currentDir);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.error(`Failed to prune draft directory '${currentDir}': ${String(error)}`);
        }
        return;
      }

      currentDir = path.dirname(currentDir);
    }
  }
}
