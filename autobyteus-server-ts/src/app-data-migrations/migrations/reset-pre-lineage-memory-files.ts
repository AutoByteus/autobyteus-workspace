import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { AppDataMigrationItemDetail } from "../domain/app-data-migration-types.js";

export const PRE_LINEAGE_DERIVED_MEMORY_FILE_NAMES = [
  "episodic.jsonl",
  "semantic.jsonl",
  "working_context_snapshot.json",
  "compacted_memory_manifest.json",
] as const;

const RUN_MARKER_FILE_NAMES = new Set([
  ...PRE_LINEAGE_DERIVED_MEMORY_FILE_NAMES,
  "raw_traces_active.jsonl",
  "raw_traces_manifest.json",
  "raw_traces_archive_manifest.json",
  "compaction_lineage.jsonl",
]);

export type ResetPreLineageRunDirectory = {
  itemId: string;
  runDir: string;
};

export type ResetPreLineageDiscoveryResult = {
  runDirectories: ResetPreLineageRunDirectory[];
  failures: AppDataMigrationItemDetail[];
};

const readDirectory = async (
  dirPath: string,
  memoryDir: string,
  failures: AppDataMigrationItemDetail[],
): Promise<Dirent[] | null> => {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    failures.push({
      itemId: `discovery:${path.relative(memoryDir, dirPath) || "."}`,
      filePath: dirPath,
      status: "FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const addCandidate = (
  runDir: string,
  memoryDir: string,
  output: Map<string, ResetPreLineageRunDirectory>,
): void => {
  output.set(runDir, {
    itemId: path.relative(memoryDir, runDir).split(path.sep).join("/") || ".",
    runDir,
  });
};

const collectTeamMemberRunDirectories = async (
  dirPath: string,
  memoryDir: string,
  output: Map<string, ResetPreLineageRunDirectory>,
  failures: AppDataMigrationItemDetail[],
): Promise<void> => {
  const entries = await readDirectory(dirPath, memoryDir, failures);
  if (entries === null) return;
  const names = new Set(entries.map(({ name }) => name));
  const isTeamDirectory = names.has("team_run_metadata.json");
  const hasRunMarker = entries.some(
    (entry) => entry.isFile() && RUN_MARKER_FILE_NAMES.has(entry.name),
  );
  if (!isTeamDirectory && hasRunMarker) addCandidate(dirPath, memoryDir, output);
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await collectTeamMemberRunDirectories(
        path.join(dirPath, entry.name),
        memoryDir,
        output,
        failures,
      );
    }
  }
};

export const discoverPreLineageMemoryRunDirectories = async (
  memoryDir: string,
): Promise<ResetPreLineageDiscoveryResult> => {
  const output = new Map<string, ResetPreLineageRunDirectory>();
  const failures: AppDataMigrationItemDetail[] = [];
  const standaloneRoot = path.join(memoryDir, "agents");
  const standaloneEntries = await readDirectory(standaloneRoot, memoryDir, failures);
  if (standaloneEntries) {
    standaloneEntries
      .filter((entry) => entry.isDirectory())
      .forEach((entry) => addCandidate(path.join(standaloneRoot, entry.name), memoryDir, output));
  }
  await collectTeamMemberRunDirectories(
    path.join(memoryDir, "agent_teams"),
    memoryDir,
    output,
    failures,
  );
  return {
    runDirectories: [...output.values()].sort((left, right) =>
      left.itemId.localeCompare(right.itemId)),
    failures,
  };
};

const isAbsent = async (filePath: string): Promise<boolean> => {
  try {
    await fs.lstat(filePath);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }
};

export const removePreLineageDerivedMemoryFiles = async (
  candidate: ResetPreLineageRunDirectory,
): Promise<AppDataMigrationItemDetail[]> => {
  const details: AppDataMigrationItemDetail[] = [];
  for (const fileName of PRE_LINEAGE_DERIVED_MEMORY_FILE_NAMES) {
    const filePath = path.join(candidate.runDir, fileName);
    try {
      if (await isAbsent(filePath)) {
        details.push({
          itemId: `${candidate.itemId}:${fileName}`,
          filePath,
          status: "SKIPPED",
          message: "Derived-memory target was already absent.",
        });
        continue;
      }
      await fs.unlink(filePath);
      if (!(await isAbsent(filePath))) {
        throw new Error("Derived-memory target still exists after deletion.");
      }
      details.push({
        itemId: `${candidate.itemId}:${fileName}`,
        filePath,
        status: "MIGRATED",
        message: "Deleted obsolete pre-lineage derived-memory state.",
      });
    } catch (error) {
      details.push({
        itemId: `${candidate.itemId}:${fileName}`,
        filePath,
        status: "FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return details;
};
