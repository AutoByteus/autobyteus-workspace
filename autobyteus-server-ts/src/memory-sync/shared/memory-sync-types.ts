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

export type MemoryFileDescriptor = MemoryFileFingerprint & {
  absolutePath: string;
};

export type MemoryFileOperation = MemoryFileFingerprint & {
  opId: string;
  operation: "replace";
  contentEncoding: "base64";
  contentBase64: string;
};

export type MemorySyncBatch = {
  protocolVersion: 1;
  batchId: string;
  sourceId: string;
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

export type SourceMetadata = {
  schemaVersion: 1;
  sourceId: string;
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
  sourceId: string;
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

export type MemorySyncSourceState = {
  schemaVersion: 1;
  hubKey: string;
  hubBaseUrl: string;
  sourceId: string;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
  lastJobState: MemorySyncJobState;
  files: Record<string, MemorySyncSourceFileState>;
};

export type MemoryHubSourceCredentialRecord = {
  credentialId: string;
  label: string | null;
  credentialHash: string;
  boundSourceId: string | null;
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
    sourceId: string | null;
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
  sourceId: string;
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
  | { type: "IMPORTED"; sourceId: string };

export type MemoryExplorerSourceOption = {
  key: "local" | `imported:${string}`;
  type: "LOCAL" | "IMPORTED";
  label: string;
  sourceId: string | null;
  displayName: string | null;
  readOnly: boolean;
  lastImportedAt: string | null;
  lastSyncStatus: string | null;
};
