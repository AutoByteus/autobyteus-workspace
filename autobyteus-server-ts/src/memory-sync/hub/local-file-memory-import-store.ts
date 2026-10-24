import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { updateJsonFile as updateLockedJsonFile } from "../../persistence/file/store-utils.js";
import {
  createEmptyMemorySyncManifest,
  normalizeMemorySyncManifest,
  recomputeMemorySyncManifestTotals,
} from "../shared/memory-sync-manifest.js";
import { normalizeMemorySyncFileKind, normalizeMemorySyncRelativePath, resolveKindRelativePathUnderRoot, resolveUnderRoot, toMemorySyncFileKey } from "../shared/memory-sync-path-policy.js";
import { digestMemorySyncOperations, validateMemorySyncBatchId } from "./memory-sync-batch-identity.js";
import type { MemoryFileOperation, MemorySyncBatch, MemorySyncBatchCommitResult, MemorySyncManifest, MemorySyncSourceMetadata } from "../shared/memory-sync-types.js";
import { normalizeMemorySyncSourceId } from "../shared/memory-sync-source-id.js";
import { requireMemorySyncReady } from "../shared/memory-sync-capability.js";
import type { MemoryImportStore } from "./memory-import-store.js";

type AppConfigLike = { getMemoryDir(): string };

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
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  /** Every path into the imports goes through here, so nothing reads or writes them while Memory Sync is held back. */
  getImportsRootDir(): string {
    requireMemorySyncReady();
    return path.join(this.config.getMemoryDir(), "imports");
  }

  getImportRootDir(memorySyncSourceId: string): string {
    return resolveUnderRoot(this.getImportsRootDir(), normalizeMemorySyncSourceId(memorySyncSourceId));
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
    const filePath = path.join(this.getImportRootDir(normalizedMemorySyncSourceId), "sync-manifest.json");
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
    const manifestPath = path.join(importRoot, "sync-manifest.json");
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

        const committedAt = nowIso();
        for (const operation of batch.operations) {
          await this.commitReplaceOperation(importRoot, operation);
          const kind = normalizeMemorySyncFileKind(operation.kind);
          const relativePath = normalizeMemorySyncRelativePath(operation.relativePath);
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

  private async commitReplaceOperation(importRoot: string, operation: MemoryFileOperation): Promise<void> {
    if (operation.operation !== "replace") {
      throw new Error("Memory Sync v1 supports only full-file replace operations.");
    }
    if (operation.contentEncoding !== "base64") {
      throw new Error("Memory Sync JSON ingestion requires base64 content.");
    }
    const kind = normalizeMemorySyncFileKind(operation.kind);
    const relativePath = normalizeMemorySyncRelativePath(operation.relativePath);
    const targetPath = resolveKindRelativePathUnderRoot(importRoot, kind, relativePath);
    const content = Buffer.from(operation.contentBase64, "base64");
    if (content.byteLength !== operation.size) {
      throw new Error(`Uploaded file size mismatch for ${kind}/${relativePath}.`);
    }
    const actualHash = sha256Buffer(content);
    if (actualHash !== operation.sha256) {
      throw new Error(`Uploaded file hash mismatch for ${kind}/${relativePath}.`);
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    await fs.writeFile(tempPath, content);
    await fs.rename(tempPath, targetPath);
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
