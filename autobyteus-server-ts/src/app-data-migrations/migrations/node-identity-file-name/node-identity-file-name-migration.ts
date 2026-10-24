import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataCapability,
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from "../../domain/app-data-migration-types.js";
import {
  isReleasedNodeId,
  RELEASED_NODE_IDENTITY_FILE_NAME,
  type ReleasedNodeIdentityFile,
} from "../../frozen/released-node-identity-file.js";

const MIGRATION_ID = "20261024_node_identity_file_name";
/** The current file and field (`NodeIdentityService`), as this migration writes them. */
const NODE_IDENTITY_FILE_NAME = "node-identity.json";
const ITEM_ID = "remote-access/node-identity";

type ReadOutcome = { kind: "absent" } | { kind: "unreadable"; message: string } | { kind: "read"; value: unknown };

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

/** Writes the file atomically: a temporary file in the same folder, then a rename over the target. */
const writeJsonAtomically = async (filePath: string, value: unknown): Promise<void> => {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  await fs.rename(temporary, filePath);
};

/** A copy of the released file, kept next to it (`<file>.backup-<timestamp>`), taken before the file is removed. */
const backUp = async (filePath: string): Promise<string> => {
  const backupPath = `${filePath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
};

const result = (detail: AppDataMigrationItemDetail): AppDataMigrationExecutionResult => ({
  status: detail.status === "FAILED" ? "FAILED" : "SUCCEEDED",
  summary: {
    scannedCount: 1,
    migratedCount: detail.status === "MIGRATED" ? 1 : 0,
    skippedCount: detail.status === "SKIPPED" ? 1 : 0,
    failedCount: detail.status === "FAILED" ? 1 : 0,
    details: [detail],
  },
  errorMessage: detail.status === "FAILED" ? detail.message : null,
});

/**
 * SM-1 (autobyteus-290): the node identity file follows the code's name. `server-instance.json` `{serverInstanceId}`
 * becomes `node-identity.json` `{nodeId}` with the same value and its `createdAt`. The old file is copied to a backup
 * first, the new file is written next and the old one removed last, so a crash in between re-runs safely. Recognition is by structure: the old file present.
 * Both present with the same value keeps the new one; with different values is a failure that keeps both and holds back
 * `node_identity`, so no reader ever sees a second identity.
 */
export class NodeIdentityFileNameMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Node identity file name migration";
  readonly description = "Renames remote-access/server-instance.json {serverInstanceId} to remote-access/node-identity.json {nodeId}.";
  readonly requiredOnStartup = true;
  readonly holdsBackCapabilities: readonly AppDataCapability[] = ["node_identity"];

  constructor(private readonly appDataDir: string) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const folder = path.join(this.appDataDir, "remote-access");
    const oldPath = path.join(folder, RELEASED_NODE_IDENTITY_FILE_NAME);
    const newPath = path.join(folder, NODE_IDENTITY_FILE_NAME);
    const detail = (status: AppDataMigrationItemDetail["status"], message: string, backupPath?: string): AppDataMigrationExecutionResult =>
      result({ itemId: ITEM_ID, filePath: oldPath, status, message, ...(backupPath ? { backupPath } : {}) });

    const old = await readJson(oldPath);
    if (old.kind === "absent") return detail("SKIPPED", "No released identity file; the identity is current (or not created yet).");
    if (old.kind === "unreadable") return detail("FAILED", `${oldPath} could not be read: ${old.message}. It was kept.`);
    const released = (old.value ?? {}) as ReleasedNodeIdentityFile;
    if (!isReleasedNodeId(released.serverInstanceId)) {
      return detail("FAILED", `${oldPath} holds no node ID. It was kept.`);
    }
    const nodeId = released.serverInstanceId;

    const current = await readJson(newPath);
    if (current.kind === "unreadable") {
      return detail("FAILED", `${newPath} could not be read: ${current.message}. Both files were kept.`);
    }
    if (current.kind === "read") {
      const currentId = (current.value as { nodeId?: unknown } | null)?.nodeId;
      if (currentId !== nodeId) {
        return detail("FAILED", `${oldPath} and ${newPath} name different node IDs. Both files were kept.`);
      }
      const backupPath = await backUp(oldPath);
      await fs.rm(oldPath);
      return detail("MIGRATED", `${newPath} already holds the same node ID; ${oldPath} was removed (backup ${backupPath}).`, backupPath);
    }

    const backupPath = await backUp(oldPath);
    await writeJsonAtomically(newPath, {
      nodeId,
      ...(typeof released.createdAt === "string" ? { createdAt: released.createdAt } : {}),
    });
    await fs.rm(oldPath);
    return detail("MIGRATED", `${oldPath} was renamed to ${newPath} (backup ${backupPath}).`, backupPath);
  }
}

export const NODE_IDENTITY_FILE_NAME_MIGRATION_ID = MIGRATION_ID;
