import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataCapability,
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../../domain/app-data-migration-types.js";
import {
  RELEASED_MEMORY_HUB_BOUND_SOURCE_ID_FIELD,
  RELEASED_MEMORY_IMPORT_SOURCE_METADATA_FILE_NAME,
  RELEASED_MEMORY_SYNC_SOURCE_ID_FIELD,
  type ReleasedMemoryHubCredentialRecord,
  type ReleasedMemorySyncConfig,
} from "../../frozen/released-memory-sync-files.js";

const MIGRATION_ID = "20261024_memory_sync_source_id_names";
/** The current names (`src/memory-sync/`), as this migration writes them. */
const SOURCE_ID_FIELD = "memorySyncSourceId";
const BOUND_SOURCE_ID_FIELD = "boundMemorySyncSourceId";
const SOURCE_METADATA_FILE_NAME = "memory-sync-source.json";

type JsonObject = Record<string, unknown>;
type Decision = { kind: "current" } | { kind: "convert"; value: unknown } | { kind: "failed"; message: string };
type ReadOutcome = { kind: "absent" } | { kind: "unreadable"; message: string } | { kind: "read"; value: unknown };

const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = async (filePath: string): Promise<ReadOutcome> => {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { kind: "absent" };
    return { kind: "unreadable", message: error instanceof Error ? error.message : String(error) };
  }
  try {
    return { kind: "read", value: JSON.parse(raw) };
  } catch (error) {
    return { kind: "unreadable", message: error instanceof Error ? error.message : String(error) };
  }
};

const writeJsonAtomically = async (filePath: string, value: unknown): Promise<void> => {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  await fs.rename(temporary, filePath);
};

const backUp = async (filePath: string): Promise<string> => {
  const backupPath = `${filePath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
};

const listEntries = async (dir: string): Promise<Dirent[]> => {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

/**
 * One stored name, by structure: the old name absent is current; old present and new absent is renamed in place (key
 * order kept, the value unchanged); both present with the same value drops the old one; with different values fails.
 */
const renameKey = (record: JsonObject, oldKey: string, newKey: string): Decision => {
  if (!(oldKey in record)) return { kind: "current" };
  if (newKey in record) {
    if (record[newKey] !== record[oldKey]) {
      return { kind: "failed", message: `holds both ${oldKey} and ${newKey} with different values` };
    }
    const { [oldKey]: _old, ...rest } = record;
    return { kind: "convert", value: rest };
  }
  return { kind: "convert", value: Object.fromEntries(Object.entries(record).map(([key, value]) => [key === oldKey ? newKey : key, value])) };
};

const renameMemorySyncSourceIdIn = (value: unknown): Decision =>
  isObject(value) ? renameKey(value, RELEASED_MEMORY_SYNC_SOURCE_ID_FIELD, SOURCE_ID_FIELD) : { kind: "current" };

/** SM-2: `source.sourceNodeId` in the config. */
const decideConfig = (value: unknown): Decision => {
  const config = value as ReleasedMemorySyncConfig;
  if (!isObject(config) || !isObject(config.source)) return { kind: "current" };
  const decision = renameMemorySyncSourceIdIn(config.source);
  return decision.kind === "convert" ? { kind: "convert", value: { ...config, source: decision.value } } : decision;
};

/** SM-4: `boundSourceNodeId` on every credential record. */
const decideCredentials = (value: unknown): Decision => {
  if (!Array.isArray(value)) return { kind: "current" };
  let changed = false;
  const records: unknown[] = [];
  for (const record of value as ReleasedMemoryHubCredentialRecord[]) {
    const decision = isObject(record)
      ? renameKey(record, RELEASED_MEMORY_HUB_BOUND_SOURCE_ID_FIELD, BOUND_SOURCE_ID_FIELD)
      : { kind: "current" as const };
    if (decision.kind === "failed") return decision;
    changed ||= decision.kind === "convert";
    records.push(decision.kind === "convert" ? decision.value : record);
  }
  return changed ? { kind: "convert", value: records } : { kind: "current" };
};

/**
 * SM-2 … SM-5 (autobyteus-290): Memory Sync's stored names follow the code (`sourceNodeId` → `memorySyncSourceId`,
 * `boundSourceNodeId` → `boundMemorySyncSourceId`, `source-node.json` → `memory-sync-source.json`). Values, folder names and file names
 * derived from a Memory Sync source ID are unchanged. Each rewritten file is backed up next to itself first. A failed item keeps
 * its file and holds back `memory_sync` until a later start converts it.
 */
export class MemorySyncSourceIdNamesMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Memory Sync source ID names migration";
  readonly description =
    "Renames Memory Sync's stored sourceNodeId to memorySyncSourceId (config, source state, hub credentials, imports) and source-node.json to memory-sync-source.json.";
  readonly requiredOnStartup = true;
  /** Hub ingestion may write these files while the server runs, so the rename runs only at startup. */
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly holdsBackCapabilities: readonly AppDataCapability[] = ["memory_sync"];

  constructor(private readonly appDataDir: string, private readonly memoryDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const syncDir = path.join(this.appDataDir, "memory-sync");
    const details: AppDataMigrationItemDetail[] = [];
    details.push(await this.rewrite(path.join(syncDir, "memory-sync-config.json"), "memory-sync/config", decideConfig));
    for (const entry of await listEntries(path.join(syncDir, "source-state"))) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      details.push(await this.rewrite(path.join(syncDir, "source-state", entry.name), `memory-sync/source-state/${entry.name}`, renameMemorySyncSourceIdIn));
    }
    details.push(await this.rewrite(path.join(syncDir, "hub-credentials.json"), "memory-sync/hub-credentials", decideCredentials));
    const importsDir = path.join(this.memoryDir, "imports");
    for (const entry of await listEntries(importsDir)) {
      if (!entry.isDirectory()) continue;
      const folder = path.join(importsDir, entry.name);
      details.push(await this.renameMemorySyncSourceMetadata(folder, `imports/${entry.name}/source`));
      details.push(await this.rewrite(path.join(folder, "sync-manifest.json"), `imports/${entry.name}/sync-manifest`, renameMemorySyncSourceIdIn));
    }
    const failed = details.filter((detail) => detail.status === "FAILED");
    return {
      status: failed.length ? "FAILED" : "SUCCEEDED",
      summary: {
        scannedCount: details.length,
        migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
        skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
        failedCount: failed.length,
        details,
      },
      errorMessage: failed.length ? failed.map((detail) => detail.message).join(" ") : null,
    };
  }

  /** A field rename inside one file, in place. */
  private async rewrite(filePath: string, itemId: string, decide: (value: unknown) => Decision): Promise<AppDataMigrationItemDetail> {
    const read = await readJson(filePath);
    if (read.kind === "absent") return { itemId, filePath, status: "SKIPPED", message: `${filePath} does not exist.` };
    if (read.kind === "unreadable") return { itemId, filePath, status: "FAILED", message: `${filePath} could not be read: ${read.message}. It was kept.` };
    const decision = decide(read.value);
    if (decision.kind === "current") return { itemId, filePath, status: "SKIPPED", message: `${filePath} already has the current names.` };
    if (decision.kind === "failed") return { itemId, filePath, status: "FAILED", message: `${filePath} ${decision.message}. It was kept.` };
    const backupPath = await backUp(filePath);
    await writeJsonAtomically(filePath, decision.value);
    return { itemId, filePath, backupPath, status: "MIGRATED", message: `${filePath} now uses the current names (backup ${backupPath}).` };
  }

  /** SM-5: `source-node.json` `{sourceNodeId}` → `memory-sync-source.json` `{memorySyncSourceId}`; new file first, the old one removed last. */
  private async renameMemorySyncSourceMetadata(folder: string, itemId: string): Promise<AppDataMigrationItemDetail> {
    const oldPath = path.join(folder, RELEASED_MEMORY_IMPORT_SOURCE_METADATA_FILE_NAME);
    const newPath = path.join(folder, SOURCE_METADATA_FILE_NAME);
    const old = await readJson(oldPath);
    if (old.kind === "absent") return { itemId, filePath: oldPath, status: "SKIPPED", message: `${oldPath} does not exist.` };
    if (old.kind === "unreadable") return { itemId, filePath: oldPath, status: "FAILED", message: `${oldPath} could not be read: ${old.message}. It was kept.` };
    if (!isObject(old.value)) return { itemId, filePath: oldPath, status: "FAILED", message: `${oldPath} is not a source record. It was kept.` };
    const decision = renameMemorySyncSourceIdIn(old.value);
    if (decision.kind === "failed") return { itemId, filePath: oldPath, status: "FAILED", message: `${oldPath} ${decision.message}. It was kept.` };
    const converted = (decision.kind === "convert" ? decision.value : old.value) as JsonObject;

    const current = await readJson(newPath);
    if (current.kind === "unreadable") {
      return { itemId, filePath: oldPath, status: "FAILED", message: `${newPath} could not be read: ${current.message}. Both files were kept.` };
    }
    if (current.kind === "read") {
      if (!isObject(current.value) || current.value[SOURCE_ID_FIELD] !== converted[SOURCE_ID_FIELD]) {
        return { itemId, filePath: oldPath, status: "FAILED", message: `${oldPath} and ${newPath} name different sources. Both files were kept.` };
      }
      const backupPath = await backUp(oldPath);
      await fs.rm(oldPath);
      return { itemId, filePath: oldPath, backupPath, status: "MIGRATED", message: `${newPath} already holds the same source; ${oldPath} was removed (backup ${backupPath}).` };
    }
    const backupPath = await backUp(oldPath);
    await writeJsonAtomically(newPath, converted);
    await fs.rm(oldPath);
    return { itemId, filePath: oldPath, backupPath, status: "MIGRATED", message: `${oldPath} was renamed to ${newPath} (backup ${backupPath}).` };
  }
}

export const MEMORY_SYNC_SOURCE_ID_NAMES_MIGRATION_ID = MIGRATION_ID;
