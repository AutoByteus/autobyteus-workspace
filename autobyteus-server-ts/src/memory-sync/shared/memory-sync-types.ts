import type { MemorySyncFileKind } from "./memory-sync-path-policy.js";

export type MemorySyncRoleState = "disabled" | "enabled";
export type MemorySyncJobState = "idle" | "running" | "success" | "error";
export type MemoryHubCredentialStatus = "active" | "revoked";

export type MemoryFileFingerprint = {
  kind: MemorySyncFileKind;
  relativePath: string;
  size: number;
  sha256: string;
  mtimeMs?: number | null;
};

/** A file the scanner listed: its stat, not its content. */
export type MemoryFileEntry = {
  kind: MemorySyncFileKind;
  relativePath: string;
  absolutePath: string;
  size: number;
  mtimeMs: number;
};

/** A listed file whose content differs from the last synced record, with its streamed SHA-256. */
export type ChangedMemoryFile = MemoryFileEntry & { sha256: string };

type MemoryFileOperationBase = MemoryFileFingerprint & {
  opId: string;
  operation: "replace";
};

/** A file up to the inline threshold: its content travels in the batch. */
export type MemoryFileInlineOperation = MemoryFileOperationBase & {
  contentEncoding: "base64";
  contentBase64: string;
};

/** A larger file: its content was uploaded to the hub's staging area (named by `sha256`) before the batch. */
export type MemoryFileStagedOperation = MemoryFileOperationBase & {
  contentEncoding: "staged";
};

export type MemoryFileOperation = MemoryFileInlineOperation | MemoryFileStagedOperation;

export type MemorySyncBatch = {
  protocolVersion: 1;
  batchId: string;
  memorySyncSourceId: string;
  sourceDisplayName?: string | null;
  sourceEndpoint?: string | null;
  generatedAt: string;
  operations: MemoryFileOperation[];
};

export type MemorySyncBatchCommitResult = {
  accepted: boolean;
  duplicate: boolean;
  batchId: string;
  committedAt: string;
  operationCount: number;
};

export type MemorySyncSourceMetadata = {
  schemaVersion: 1;
  memorySyncSourceId: string;
  displayName: string | null;
  firstImportedAt: string;
  lastImportedAt: string;
  lastKnownEndpoint: string | null;
  sourceServerVersion?: string | null;
  lastSyncStatus: "success" | "error";
  lastError?: string | null;
};

export type MemorySyncManifestFileRecord = MemoryFileFingerprint & {
  lastBatchId: string;
  lastSyncedAt?: string | null;
};

export type MemorySyncManifestBatchRecord = {
  batchId: string;
  digest: string;
  committedAt: string;
  operationCount: number;
};

export type MemorySyncManifest = {
  schemaVersion: 1;
  memorySyncSourceId: string;
  lastCommittedBatchId: string | null;
  lastCommittedAt: string | null;
  batchDigests: Record<string, MemorySyncManifestBatchRecord>;
  recentBatches: MemorySyncManifestBatchRecord[];
  totals: {
    fileCount: number;
    totalBytes: number;
  };
  files: Record<string, MemorySyncManifestFileRecord>;
};

export type MemorySyncSourceFileState = MemoryFileFingerprint & {
  lastSyncedAt: string;
  lastBatchId: string;
};

/** A file-level problem: the file is retried at `nextAttemptAt`, or at once when its size or mtime changes. */
export type MemorySyncFileFailure = {
  kind: MemorySyncFileKind;
  relativePath: string;
  size: number;
  mtimeMs: number;
  reason: string;
  attempts: number;
  lastFailedAt: string;
  nextAttemptAt: string;
};

export type MemorySyncSourceState = {
  schemaVersion: 1;
  hubKey: string;
  hubBaseUrl: string;
  memorySyncSourceId: string;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
  lastJobState: MemorySyncJobState;
  files: Record<string, MemorySyncSourceFileState>;
  fileFailures: Record<string, MemorySyncFileFailure>;
};

export type MemoryHubSourceCredentialRecord = {
  credentialId: string;
  label: string | null;
  credentialHash: string;
  boundMemorySyncSourceId: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type MemoryHubSourceCredentialSummary = Omit<MemoryHubSourceCredentialRecord, "credentialHash"> & {
  status: MemoryHubCredentialStatus;
};

export type MemorySyncConfig = {
  schemaVersion: 1;
  hub: {
    enabled: boolean;
    advertisedHubBaseUrl: string | null;
    updatedAt: string | null;
  };
  source: {
    enabled: boolean;
    memorySyncSourceId: string | null;
    displayName: string | null;
    hubBaseUrl: string | null;
    hubToken: string | null;
    backgroundEnabled: boolean;
    intervalMs: number;
    batchSize: number;
    updatedAt: string | null;
  };
};

export type MemorySyncPublicConfig = Omit<MemorySyncConfig, "source"> & {
  source: Omit<MemorySyncConfig["source"], "hubToken"> & {
    hubTokenConfigured: boolean;
    hubTokenPreview: string | null;
  };
};

export type MemoryImportSummary = {
  memorySyncSourceId: string;
  displayName: string | null;
  lastKnownEndpoint: string | null;
  firstImportedAt: string | null;
  lastImportedAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  fileCount: number;
  totalBytes: number;
  lastCommittedBatchId: string | null;
  lastCommittedAt: string | null;
};

export type MemoryExplorerSourceInput =
  | { type: "LOCAL" }
  | { type: "IMPORTED"; memorySyncSourceId: string };

export type MemoryExplorerSourceOption = {
  key: "local" | `imported:${string}`;
  type: "LOCAL" | "IMPORTED";
  label: string;
  memorySyncSourceId: string | null;
  displayName: string | null;
  readOnly: boolean;
  lastImportedAt: string | null;
  lastSyncStatus: string | null;
};
