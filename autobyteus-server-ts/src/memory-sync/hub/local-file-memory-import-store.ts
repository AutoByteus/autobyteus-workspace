import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { updateJsonFile as updateLockedJsonFile } from "../../persistence/file/store-utils.js";
import {
  createEmptyMemorySyncManifest,
  normalizeMemorySyncManifest,
  recomputeMemorySyncManifestTotals,
  resolveMemorySyncImportRootDir,
  resolveMemorySyncManifestPath,
} from "../shared/memory-sync-manifest.js";
import type { MemorySyncFileKind } from "../shared/memory-sync-path-policy.js";
import { normalizeMemorySyncFileKind, normalizeMemorySyncRelativePath, resolveKindRelativePathUnderRoot, toMemorySyncFileKey } from "../shared/memory-sync-path-policy.js";
import { digestMemorySyncOperations, validateMemorySyncBatchId } from "./memory-sync-batch-identity.js";
import type { MemoryFileOperation, MemorySyncBatch, MemorySyncBatchCommitResult, MemorySyncManifest, MemorySyncSourceMetadata } from "../shared/memory-sync-types.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
import { requireMemorySyncReady } from "../shared/memory-sync-capability.js";
import type { MemoryImportStore } from "./memory-import-store.js";
import {
  getMemoryHubStagedFileStore,
  MemoryStagedFileVerificationError,
  type MemoryHubStagedFileStore,
} from "./memory-hub-staged-file-store.js";

type AppConfigLike = { getMemoryDir(): string };

/** One operation of a batch, validated: where it goes and, for an inline operation, its decoded content. */
type VerifiedOperation = {
  operation: MemoryFileOperation;
  kind: MemorySyncFileKind;
  relativePath: string;
  targetPath: string;
  content: Buffer | null;
};

const RECENT_BATCH_LIMIT = 50;

const nowIso = (): string => new Date().toISOString();

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const writeJsonFile = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  await fs.rename(tempPath, filePath);
};

const sha256Buffer = (buffer: Buffer): string => createHash("sha256").update(buffer).digest("hex");

export class LocalFileMemoryImportStore implements MemoryImportStore {
  constructor(
    private readonly config: AppConfigLike = appConfigProvider.config,
    private readonly stagedFiles: MemoryHubStagedFileStore = getMemoryHubStagedFileStore(),
  ) {}

  /** Every path into the imports goes through here, so nothing reads or writes them while Memory Sync is held back. */
  getImportsRootDir(): string {
    requireMemorySyncReady();
    return path.join(this.config.getMemoryDir(), "imports");
  }

  getImportRootDir(memorySyncSourceId: string): string {
    requireMemorySyncReady();
    return resolveMemorySyncImportRootDir(this.config.getMemoryDir(), memorySyncSourceId);
  }

  async sourceExists(memorySyncSourceId: string): Promise<boolean> {
    try {
      const stat = await fs.stat(this.getImportRootDir(memorySyncSourceId));
      return stat.isDirectory();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }

  async listMemorySyncSourceIds(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.getImportsRootDir(), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => {
          try {
            normalizeMemorySyncSourceId(name);
            return true;
          } catch {
            return false;
          }
        })
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async readMemorySyncSourceMetadata(memorySyncSourceId: string): Promise<MemorySyncSourceMetadata | null> {
    const normalizedMemorySyncSourceId = normalizeMemorySyncSourceId(memorySyncSourceId);
    return readJsonFile<MemorySyncSourceMetadata>(path.join(this.getImportRootDir(normalizedMemorySyncSourceId), "memory-sync-source.json"));
  }

  async readManifest(memorySyncSourceId: string): Promise<MemorySyncManifest> {
    const normalizedMemorySyncSourceId = normalizeMemorySyncSourceId(memorySyncSourceId);
    const filePath = resolveMemorySyncManifestPath(this.getImportRootDir(normalizedMemorySyncSourceId));
    const raw = await readJsonFile<Partial<MemorySyncManifest>>(filePath);
    return normalizeMemorySyncManifest(normalizedMemorySyncSourceId, raw);
  }

  async commitBatch(batch: MemorySyncBatch): Promise<MemorySyncBatchCommitResult> {
    const memorySyncSourceId = normalizeMemorySyncSourceId(batch.memorySyncSourceId);
    const batchId = validateMemorySyncBatchId(batch.batchId);
    if (batch.protocolVersion !== 1) {
      throw new Error("Unsupported Memory Sync protocol version.");
    }
    if (!Array.isArray(batch.operations)) {
      throw new Error("Memory Sync batch operations must be an array.");
    }

    const importRoot = this.getImportRootDir(memorySyncSourceId);
    const manifestPath = resolveMemorySyncManifestPath(importRoot);
    const digest = digestMemorySyncOperations(batch.operations);
    let result: MemorySyncBatchCommitResult | null = null;

    await updateLockedJsonFile<MemorySyncManifest>(
      manifestPath,
      createEmptyMemorySyncManifest(memorySyncSourceId),
      async (existing) => {
        let manifest = normalizeMemorySyncManifest(memorySyncSourceId, existing);
        const existingBatch = manifest.batchDigests[batchId];
        if (existingBatch) {
          if (existingBatch.digest !== digest) {
            throw new Error(`Memory Sync batchId '${batchId}' was already committed with different content.`);
          }
          result = {
            accepted: true,
            duplicate: true,
            batchId,
            committedAt: existingBatch.committedAt,
            operationCount: existingBatch.operationCount,
          };
          return manifest;
        }

        // Verify every operation before writing any, so a batch that cannot be written is refused as a whole.
        const verified = await this.verifyOperations(memorySyncSourceId, importRoot, batch.operations);
        await this.writeOperations(memorySyncSourceId, verified);

        const committedAt = nowIso();
        for (const { operation, kind, relativePath } of verified) {
          const key = toMemorySyncFileKey(kind, relativePath);
          manifest.files[key] = {
            kind,
            relativePath,
            size: operation.size,
            sha256: operation.sha256,
            mtimeMs: operation.mtimeMs ?? null,
            lastBatchId: batchId,
            lastSyncedAt: committedAt,
          };
        }

        const batchRecord = { batchId, digest, committedAt, operationCount: batch.operations.length };
        manifest = recomputeMemorySyncManifestTotals({
          ...manifest,
          memorySyncSourceId,
          lastCommittedBatchId: batchId,
          lastCommittedAt: committedAt,
          batchDigests: {
            ...manifest.batchDigests,
            [batchId]: batchRecord,
          },
          recentBatches: [
            batchRecord,
            ...manifest.recentBatches.filter((recent) => recent.batchId !== batchId),
          ].slice(0, RECENT_BATCH_LIMIT),
        });
        await this.writeMemorySyncSourceMetadata(batch, committedAt);

        result = {
          accepted: true,
          duplicate: false,
          batchId,
          committedAt,
          operationCount: batch.operations.length,
        };
        return manifest;
      },
    );

    if (!result) {
      throw new Error("Memory Sync batch commit did not produce a result.");
    }
    return result;
  }

  /**
   * Inline operations: decode, check size and SHA-256. Staged operations: grouped by SHA-256, each distinct staged
   * content verified once (the same attachment under two runs is one content at two targets).
   */
  private async verifyOperations(
    memorySyncSourceId: string,
    importRoot: string,
    operations: MemoryFileOperation[],
  ): Promise<VerifiedOperation[]> {
    const verified: VerifiedOperation[] = [];
    const stagedBySha256 = new Map<string, VerifiedOperation[]>();
    for (const operation of operations) {
      if (operation.operation !== "replace") {
        throw new Error("Memory Sync supports only full-file replace operations.");
      }
      const kind = normalizeMemorySyncFileKind(operation.kind);
      const relativePath = normalizeMemorySyncRelativePath(operation.relativePath);
      const targetPath = resolveKindRelativePathUnderRoot(importRoot, kind, relativePath);
      if (operation.contentEncoding === "staged") {
        const entry: VerifiedOperation = { operation, kind, relativePath, targetPath, content: null };
        verified.push(entry);
        stagedBySha256.set(operation.sha256, [...(stagedBySha256.get(operation.sha256) ?? []), entry]);
        continue;
      }
      if (operation.contentEncoding !== "base64") {
        throw new Error(`Unsupported Memory Sync content encoding for ${kind}/${relativePath}.`);
      }
      const content = Buffer.from(operation.contentBase64, "base64");
      if (content.byteLength !== operation.size) {
        throw new Error(`Uploaded file size mismatch for ${kind}/${relativePath}.`);
      }
      if (sha256Buffer(content) !== operation.sha256) {
        throw new Error(`Uploaded file hash mismatch for ${kind}/${relativePath}.`);
      }
      verified.push({ operation, kind, relativePath, targetPath, content });
    }
    for (const [sha256, group] of stagedBySha256) {
      const first = group[0] as VerifiedOperation;
      const name = `${first.kind}/${first.relativePath}`;
      if (group.some((entry) => entry.operation.size !== first.operation.size)) {
        throw new Error(`Uploaded file size mismatch for ${name}.`);
      }
      try {
        await this.stagedFiles.verifyStagedFile(memorySyncSourceId, sha256, first.operation.size);
      } catch (error) {
        if (error instanceof MemoryStagedFileVerificationError) {
          throw new Error(`${error.message} for ${name}.`);
        }
        throw error;
      }
    }
    return verified;
  }

  private async writeOperations(memorySyncSourceId: string, verified: VerifiedOperation[]): Promise<void> {
    const stagedTargets = new Map<string, string[]>();
    for (const { operation, targetPath, content } of verified) {
      if (!content) {
        stagedTargets.set(operation.sha256, [...(stagedTargets.get(operation.sha256) ?? []), targetPath]);
        continue;
      }
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
      await fs.writeFile(tempPath, content);
      await fs.rename(tempPath, targetPath);
    }
    for (const [sha256, targetPaths] of stagedTargets) {
      await this.stagedFiles.placeStagedFile(memorySyncSourceId, sha256, targetPaths);
    }
  }

  private async writeMemorySyncSourceMetadata(batch: MemorySyncBatch, importedAt: string): Promise<void> {
    const memorySyncSourceId = normalizeMemorySyncSourceId(batch.memorySyncSourceId);
    const existing = await this.readMemorySyncSourceMetadata(memorySyncSourceId);
    const metadata: MemorySyncSourceMetadata = {
      schemaVersion: 1,
      memorySyncSourceId,
      displayName: batch.sourceDisplayName?.trim() || existing?.displayName || null,
      firstImportedAt: existing?.firstImportedAt ?? importedAt,
      lastImportedAt: importedAt,
      lastKnownEndpoint: batch.sourceEndpoint?.trim() || existing?.lastKnownEndpoint || null,
      sourceServerVersion: existing?.sourceServerVersion ?? null,
      lastSyncStatus: "success",
      lastError: null,
    };
    await writeJsonFile(path.join(this.getImportRootDir(memorySyncSourceId), "memory-sync-source.json"), metadata);
  }
}

let singleton: LocalFileMemoryImportStore | null = null;

export const getLocalFileMemoryImportStore = (): LocalFileMemoryImportStore => {
  singleton ??= new LocalFileMemoryImportStore();
  return singleton;
};

export const resetLocalFileMemoryImportStoreForTests = (): void => {
  singleton = null;
};
