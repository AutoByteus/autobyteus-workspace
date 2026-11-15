import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { withFilePathLock } from "../../persistence/file/store-utils.js";
import { requireMemorySyncReady } from "../shared/memory-sync-capability.js";
import { hashFile } from "../shared/memory-sync-file-hash.js";
import { resolveMemorySyncImportRootDir, resolveMemorySyncManifestPath } from "../shared/memory-sync-manifest.js";
import { resolveUnderRoot } from "../shared/memory-sync-path-policy.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
import { MEMORY_SYNC_STAGED_FILE_MAX_AGE_MS } from "../shared/memory-sync-transfer-limits.js";

type AppConfigLike = { getMemoryDir(): string };

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const PARTIAL_SUFFIX = ".partial";

/** A piece was sent at an offset other than the hub's current length of that staged file. */
export class MemoryStagedFileOffsetMismatchError extends Error {
  constructor(public readonly receivedBytes: number) {
    super(`Staged file piece offset does not match the ${receivedBytes} bytes the hub holds.`);
    this.name = "MemoryStagedFileOffsetMismatchError";
  }
}

/** A staged file cannot be committed: missing, or its size or SHA-256 differs from what the batch declares. */
export class MemoryStagedFileVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryStagedFileVerificationError";
  }
}

const tempSiblingPath = (targetPath: string): string =>
  `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === "ENOENT";

/**
 * Content of large changed files while it is being uploaded to the hub, outside `imports/` so no reader ever sees
 * them: `<memoryDir>/memory-sync-staging/<memorySyncSourceId>/<sha256>.partial`. The name is the content's SHA-256,
 * so an interrupted upload resumes without a session id.
 */
export class MemoryHubStagedFileStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  /** Every path into the staging area goes through here, so nothing reads or writes it while Memory Sync is held back. */
  private getStagingRootDir(): string {
    requireMemorySyncReady();
    return path.join(this.config.getMemoryDir(), "memory-sync-staging");
  }

  private getPartialPath(memorySyncSourceId: string, sha256: string): string {
    if (!SHA256_PATTERN.test(sha256)) {
      throw new Error("sha256 must be 64 lowercase hex characters.");
    }
    return resolveUnderRoot(
      this.getStagingRootDir(),
      normalizeMemorySyncSourceId(memorySyncSourceId),
      `${sha256}${PARTIAL_SUFFIX}`,
    );
  }

  async receivedBytes(memorySyncSourceId: string, sha256: string): Promise<number> {
    try {
      return (await fs.stat(this.getPartialPath(memorySyncSourceId, sha256))).size;
    } catch (error) {
      if (isMissing(error)) {
        return 0;
      }
      throw error;
    }
  }

  /** Appends `bytes` when `offset` equals the current length; returns the new length. */
  async appendPiece(memorySyncSourceId: string, sha256: string, offset: number, bytes: Buffer): Promise<number> {
    const partialPath = this.getPartialPath(memorySyncSourceId, sha256);
    await fs.mkdir(path.dirname(partialPath), { recursive: true });
    const handle = await fs.open(partialPath, "a");
    try {
      const current = (await handle.stat()).size;
      if (current !== offset) {
        throw new MemoryStagedFileOffsetMismatchError(current);
      }
      await handle.write(bytes, 0, bytes.byteLength);
      return current + bytes.byteLength;
    } finally {
      await handle.close();
    }
  }

  /** Checks the staged file has exactly `size` bytes of content with this SHA-256; a file that fails is removed. */
  async verifyStagedFile(memorySyncSourceId: string, sha256: string, size: number): Promise<void> {
    const partialPath = this.getPartialPath(memorySyncSourceId, sha256);
    let stagedSize: number;
    try {
      stagedSize = (await fs.stat(partialPath)).size;
    } catch (error) {
      if (isMissing(error)) {
        throw new MemoryStagedFileVerificationError("Uploaded file is missing");
      }
      throw error;
    }
    if (stagedSize !== size) {
      await fs.rm(partialPath, { force: true });
      throw new MemoryStagedFileVerificationError("Uploaded file size mismatch");
    }
    if (await hashFile(partialPath) !== sha256) {
      await fs.rm(partialPath, { force: true });
      throw new MemoryStagedFileVerificationError("Uploaded file hash mismatch");
    }
  }

  /**
   * Puts one verified staged content at every target path. Each target but the last receives a copy written to a
   * temporary sibling and renamed into place; the last takes the staged file itself by rename. A reader of a target
   * never sees a partly written file. Called only inside the source's manifest lock, after verification.
   */
  async placeStagedFile(memorySyncSourceId: string, sha256: string, targetPaths: string[]): Promise<void> {
    if (targetPaths.length === 0) {
      return;
    }
    const partialPath = this.getPartialPath(memorySyncSourceId, sha256);
    const lastTarget = targetPaths[targetPaths.length - 1] as string;
    for (const targetPath of targetPaths.slice(0, -1)) {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const tempPath = tempSiblingPath(targetPath);
      await fs.copyFile(partialPath, tempPath);
      await fs.rename(tempPath, targetPath);
    }
    await fs.mkdir(path.dirname(lastTarget), { recursive: true });
    await fs.rename(partialPath, lastTarget);
  }

  /**
   * Removes partials untouched for 24 h in every source folder, and the folder once empty. Each source folder is
   * handled under that source's manifest lock, one at a time, so a sweep never removes a staged file between a
   * commit's verification and its write. Called only by `MemoryHubIngestionService.requestStagingSweep`.
   */
  async sweepStale(): Promise<void> {
    const stagingRoot = this.getStagingRootDir();
    let folders: string[];
    try {
      folders = (await fs.readdir(stagingRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (error) {
      if (isMissing(error)) {
        return;
      }
      throw error;
    }
    for (const folder of folders) {
      let memorySyncSourceId: string;
      try {
        memorySyncSourceId = normalizeMemorySyncSourceId(folder);
      } catch {
        continue;
      }
      const sweepFolder = (): Promise<void> => this.sweepSourceFolder(path.join(stagingRoot, folder));
      const importRoot = resolveMemorySyncImportRootDir(this.config.getMemoryDir(), memorySyncSourceId);
      // A source that never committed has no imports folder and no commit to order against; taking the lock would create it.
      if (await fs.stat(importRoot).then((stat) => stat.isDirectory(), () => false)) {
        await withFilePathLock(resolveMemorySyncManifestPath(importRoot), sweepFolder);
      } else {
        await sweepFolder();
      }
    }
  }

  private async sweepSourceFolder(folderPath: string): Promise<void> {
    const cutoff = Date.now() - MEMORY_SYNC_STAGED_FILE_MAX_AGE_MS;
    for (const name of await fs.readdir(folderPath)) {
      if (!name.endsWith(PARTIAL_SUFFIX)) {
        continue;
      }
      const partialPath = path.join(folderPath, name);
      try {
        if ((await fs.stat(partialPath)).mtimeMs < cutoff) {
          await fs.rm(partialPath, { force: true });
        }
      } catch (error) {
        if (!isMissing(error)) {
          throw error;
        }
      }
    }
    if ((await fs.readdir(folderPath)).length === 0) {
      await fs.rmdir(folderPath).catch(() => undefined);
    }
  }
}

let singleton: MemoryHubStagedFileStore | null = null;

export const getMemoryHubStagedFileStore = (): MemoryHubStagedFileStore => {
  singleton ??= new MemoryHubStagedFileStore();
  return singleton;
};

export const resetMemoryHubStagedFileStoreForTests = (): void => {
  singleton = null;
};
