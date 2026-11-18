/**
 * Memory Sync's stored files as released before autobyteus-290 (frozen; `origin/personal` c78ffb15a2,
 * `src/memory-sync/`). Only migrations import this file.
 *
 * - `<appData>/memory-sync/memory-sync-config.json`: `source.sourceNodeId` (`memory-sync-config-service.ts`);
 * - `<appData>/memory-sync/source-state/<hubKey>--<id>.json`: `sourceNodeId` (`local-file-memory-sync-state-store.ts`);
 * - `<appData>/memory-sync/hub-credentials.json`: an array of records with `boundSourceNodeId`
 *   (`local-file-memory-hub-credential-store.ts`);
 * - `<memory>/imports/<id>/source-node.json` `{schemaVersion, sourceNodeId, displayName, …}` and
 *   `<memory>/imports/<id>/sync-manifest.json` with `sourceNodeId` (`local-file-memory-import-store.ts`).
 *
 * The values (the Memory Sync source IDs, and the folder and file names derived from them) are not part of the rename.
 */
export const RELEASED_MEMORY_SYNC_SOURCE_ID_FIELD = "sourceNodeId";
export const RELEASED_MEMORY_HUB_BOUND_SOURCE_ID_FIELD = "boundSourceNodeId";
export const RELEASED_MEMORY_IMPORT_SOURCE_METADATA_FILE_NAME = "source-node.json";

export type ReleasedMemorySyncConfig = {
  schemaVersion?: number;
  source?: { sourceNodeId?: string | null; [field: string]: unknown };
  [field: string]: unknown;
};

export type ReleasedMemorySyncSourceState = { sourceNodeId?: string; [field: string]: unknown };

export type ReleasedMemoryHubCredentialRecord = { boundSourceNodeId?: string | null; [field: string]: unknown };

export type ReleasedMemoryImportSourceMetadata = { sourceNodeId?: string; [field: string]: unknown };

export type ReleasedMemorySyncManifest = { sourceNodeId?: string; [field: string]: unknown };
