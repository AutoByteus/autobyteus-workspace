import fs from "node:fs/promises";
import path from "node:path";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./team-run-execution-tree-v1-constants.js";

export type TeamRunPredecessorSources = Readonly<{
  provenance: "LIVE" | "PROTECTED_V1_BACKUP";
  taskRecordsPath: string;
  communicationPath: string;
  backupDirectory: string | null;
}>;

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const requiredText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
};

const readBackupManifest = async (manifestPath: string): Promise<Record<string, unknown>> => {
  const raw = JSON.parse(await fs.readFile(manifestPath, "utf8")) as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Protected predecessor manifest '${manifestPath}' must be an object.`);
  }
  return raw as Record<string, unknown>;
};

export class TeamRunPredecessorSourceResolver {
  constructor(private readonly backupRoot: string) {}

  async resolve(rootTeamRunId: string, rootDir: string): Promise<TeamRunPredecessorSources> {
    const live = Object.freeze({
      provenance: "LIVE" as const,
      taskRecordsPath: path.join(rootDir, "task_delegation_records.json"),
      communicationPath: path.join(rootDir, "team_communication_messages.json"),
      backupDirectory: null,
    });
    try {
      await fs.access(path.join(rootDir, "team_run_execution_tree.json"));
    } catch (error) {
      if (missing(error)) return live;
      throw error;
    }

    const rootBackups = path.join(this.backupRoot, rootTeamRunId);
    let attempts: import("node:fs").Dirent[];
    try {
      attempts = await fs.readdir(rootBackups, { withFileTypes: true });
    } catch (error) {
      if (missing(error)) {
        throw new Error(
          `Interrupted TeamRun V1 root '${rootTeamRunId}' has no protected predecessor backup.`,
        );
      }
      throw error;
    }

    for (const attempt of attempts
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => right.name.localeCompare(left.name))) {
      const directory = path.join(rootBackups, attempt.name);
      const manifestPath = path.join(directory, "manifest.json");
      let manifest: Record<string, unknown>;
      try {
        manifest = await readBackupManifest(manifestPath);
      } catch (error) {
        if (missing(error)) continue;
        throw new Error(
          `Protected predecessor manifest for root '${rootTeamRunId}' is invalid: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      const migrationId = requiredText(manifest.migrationId, "migrationId");
      const manifestRootId = requiredText(manifest.rootTeamRunId, "rootTeamRunId");
      const sourceRootDir = requiredText(manifest.sourceRootDir, "sourceRootDir");
      if (migrationId !== TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID) {
        throw new Error(
          `Protected predecessor manifest for root '${rootTeamRunId}' has migration '${migrationId}'.`,
        );
      }
      if (manifestRootId !== rootTeamRunId) {
        throw new Error(
          `Protected predecessor manifest root '${manifestRootId}' does not match '${rootTeamRunId}'.`,
        );
      }
      if (path.resolve(sourceRootDir) !== path.resolve(rootDir)) {
        throw new Error(
          `Protected predecessor source root '${sourceRootDir}' does not match '${rootDir}'.`,
        );
      }
      return Object.freeze({
        provenance: "PROTECTED_V1_BACKUP" as const,
        taskRecordsPath: path.join(directory, "task_delegation_records.json"),
        communicationPath: path.join(directory, "team_communication_messages.json"),
        backupDirectory: directory,
      });
    }
    throw new Error(
      `Interrupted TeamRun V1 root '${rootTeamRunId}' has no usable protected predecessor backup.`,
    );
  }
}
