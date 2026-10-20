import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20261020_remove_skill_improvement_data";

/**
 * Frozen names of the removed Skill Improvement feature's data, and of its earlier name "self evolution".
 * Only this migration knows them; no current code reads or writes any of them.
 */
const RECORD_ROOTS = [
  { dirName: "skill_improvement", runsDirName: "improvement_runs", helperRunIdField: "improverRunId" },
  { dirName: "self_evolution", runsDirName: "evolution_runs", helperRunIdField: "evolverRunId" },
] as const;
const RECORD_INDEX_FILE_NAME = "index.json";
const RECORD_FILE_NAME = "record.json";
const SESSION_FOLDERS = [
  { dirName: "skill_improvement", stateFileName: "improver_session.json" },
  { dirName: "self_evolution", stateFileName: "evolver_session.json" },
] as const;
const IMPROVER_AGENT_DEFINITION_ID = "autobyteus-retrospective-skill-improver";
const HELPER_LAUNCH_PURPOSE = "server_helper";
const RUN_METADATA_FILE_NAME = "run_metadata.json";
const RUN_HISTORY_INDEX_FILE_NAME = "run_history_index.json";
const STANDALONE_RUNS_DIR_NAME = "agents";
const MEMORY_SYNC_IMPORTS_DIR_NAME = "imports";

type RecordRoot = (typeof RECORD_ROOTS)[number];
type Json = Record<string, unknown>;
/** What one record root names: the helper runs, and whether every source in it could be read. */
type RootSources = { root: RecordRoot; dirPath: string; runIds: Set<string>; fullyRead: boolean };

const messageFromError = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const isNotFound = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const isObject = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** A run id usable as a folder name directly under `memory/agents/` (the rule run history uses). */
const canonicalRunId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const runId = value.trim();
  if (!runId || runId !== value || /[\\/]/.test(runId) || runId === "." || runId === "..") return null;
  return runId;
};

type JsonRead = { kind: "missing" } | { kind: "unreadable"; error: string } | { kind: "present"; value: unknown };
const readJson = async (filePath: string): Promise<JsonRead> => {
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    return isNotFound(error) ? { kind: "missing" } : { kind: "unreadable", error: messageFromError(error) };
  }
  try {
    return { kind: "present", value: JSON.parse(text) as unknown };
  } catch (error) {
    return { kind: "unreadable", error: messageFromError(error) };
  }
};

const lstatOrNull = async (targetPath: string) => {
  try {
    return await fs.lstat(targetPath);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

const readDirectoryEntries = async (dirPath: string): Promise<Dirent[]> => {
  try {
    return (await fs.readdir(dirPath, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
};

/** Writes JSON the way run history writes its index (two-space indent, trailing newline), atomically. */
const writeJsonAtomically = async (filePath: string, value: unknown): Promise<void> => {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

/**
 * Deletes the removed Skill Improvement feature's data once (design DS-003, DEC-001 C), in this order:
 * M1 collect the helper run ids (records, the improver's runs, `server_helper` runs); M2 remove their
 * run-history rows; M3 delete their run folders, only once their rows are gone (so a failed M2 leaves every
 * source for the next start); M4 delete the per-run session folders; M5 delete the
 * record roots, only when every source in a root was read and M2/M3 succeeded for every run it names;
 * M6 delete the built-in improver's installed folder. Memory Sync mirrors (`memory/imports/`) and every
 * other run, agent and row stay untouched. A source that cannot be read is kept and reported; a step that
 * fails is reported and retried on the next start. Settings are retired by `retiredSettingNames`.
 */
export class RemoveSkillImprovementDataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove Skill Improvement data";
  readonly description =
    "Permanently deletes the removed Skill Improvement feature's records, session folders, helper runs (with their history entries) and the built-in Retrospective Skill Improver agent. No backup is made.";
  readonly requiredOnStartup = true;
  // The agent catalog and run history are loaded once at startup, so the removal takes effect through a restart.
  readonly executionPolicy = "STARTUP_ONLY" as const;

  private readonly details: AppDataMigrationItemDetail[] = [];

  constructor(
    private readonly memoryDir: string,
    private readonly agentsDir: string,
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.details.length = 0;
    const roots = await this.collectRecordRoots();
    const helperRunIds = new Set<string>(roots.flatMap((root) => [...root.runIds]));
    for (const runId of await this.collectHelperRunsByMetadata()) helperRunIds.add(runId);

    const removedRows = await this.removeHistoryRows(helperRunIds);
    // A run folder goes only after its row: if the rows could not be written, every source stays for the next start.
    const deletedRuns = new Set<string>();
    for (const runId of [...helperRunIds].sort()) {
      if (removedRows.has(runId) && await this.deleteRunFolder(runId)) deletedRuns.add(runId);
    }
    await this.deleteSessionFolders(this.memoryDir, true);
    for (const root of roots) await this.deleteRecordRoot(root, removedRows, deletedRuns);
    await this.deleteImproverDefinition();

    const summary = buildSummary([...this.details]);
    const preserved = summary.details.some((detail) => detail.message.startsWith("PRESERVED_UNREADABLE"));
    return {
      status: summary.failedCount > 0 ? "FAILED" : preserved ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} Skill Improvement item${summary.failedCount === 1 ? "" : "s"} could not be removed; the next start continues.`
        : null,
    };
  }

  /** M1 (records): each record root and the helper runs its index and records name. */
  private async collectRecordRoots(): Promise<RootSources[]> {
    const roots: RootSources[] = [];
    for (const root of RECORD_ROOTS) {
      const dirPath = path.join(this.memoryDir, root.dirName);
      const index = await readJson(path.join(dirPath, RECORD_INDEX_FILE_NAME));
      const runsDir = path.join(dirPath, root.runsDirName);
      const runsDirStat = await this.inspect(runsDir);
      // A root is the feature's only when it holds its index or its records folder.
      if (index.kind === "missing" && !runsDirStat?.isDirectory()) continue;
      const sources: RootSources = { root, dirPath, runIds: new Set(), fullyRead: true };
      if (index.kind === "unreadable" || (index.kind === "present" && !isObject(index.value))) {
        this.preserveUnreadable(path.join(dirPath, RECORD_INDEX_FILE_NAME), index.kind === "unreadable" ? index.error : "It is not a JSON object.");
        sources.fullyRead = false;
      } else if (index.kind === "present") {
        for (const entry of Object.values(index.value as Json)) this.addNamedRun(sources, entry);
      }
      if (runsDirStat?.isDirectory()) {
        for (const entry of await readDirectoryEntries(runsDir)) {
          if (!entry.isDirectory()) continue;
          const recordPath = path.join(runsDir, entry.name, RECORD_FILE_NAME);
          const record = await readJson(recordPath);
          if (record.kind === "missing") continue;
          if (record.kind === "unreadable" || !isObject(record.value)) {
            this.preserveUnreadable(recordPath, record.kind === "unreadable" ? record.error : "It is not a JSON object.");
            sources.fullyRead = false;
            continue;
          }
          this.addNamedRun(sources, record.value);
        }
      }
      roots.push(sources);
    }
    return roots;
  }

  private addNamedRun(sources: RootSources, entry: unknown): void {
    if (!isObject(entry)) return;
    const runId = canonicalRunId(entry[sources.root.helperRunIdField]);
    if (runId) sources.runIds.add(runId);
  }

  /**
   * M1 (runs): standalone runs of the built-in improver, and runs launched as server helpers. A delegated
   * copy's own file (it has a `taskAgent` section) belongs to its coordinating run and is never a helper run.
   */
  private async collectHelperRunsByMetadata(): Promise<string[]> {
    const runsDir = path.join(this.memoryDir, STANDALONE_RUNS_DIR_NAME);
    const helperRunIds: string[] = [];
    for (const entry of await readDirectoryEntries(runsDir)) {
      const runId = canonicalRunId(entry.name);
      if (!entry.isDirectory() || !runId) continue;
      const metadataPath = path.join(runsDir, entry.name, RUN_METADATA_FILE_NAME);
      const metadata = await readJson(metadataPath);
      if (metadata.kind === "missing") continue;
      if (metadata.kind === "unreadable" || !isObject(metadata.value)) {
        this.preserveUnreadable(metadataPath, metadata.kind === "unreadable" ? metadata.error : "It is not a JSON object.");
        continue;
      }
      if ("taskAgent" in metadata.value) continue;
      if (metadata.value.agentDefinitionId === IMPROVER_AGENT_DEFINITION_ID || metadata.value.launchPurpose === HELPER_LAUNCH_PURPOSE) {
        helperRunIds.push(runId);
      }
    }
    return helperRunIds;
  }

  /** M2: the run-history index without the helper runs' rows. Returns the ids whose rows are gone. */
  private async removeHistoryRows(helperRunIds: ReadonlySet<string>): Promise<ReadonlySet<string>> {
    const indexPath = path.join(this.memoryDir, RUN_HISTORY_INDEX_FILE_NAME);
    const index = await readJson(indexPath);
    if (index.kind === "missing") return helperRunIds;
    if (index.kind === "unreadable" || !Array.isArray(index.value)) {
      this.detail("history-index", indexPath, "FAILED",
        `The run history index cannot be read (${index.kind === "unreadable" ? index.error : "it is not a JSON array"}); the helper runs are kept, and the next start retries.`);
      return new Set();
    }
    const rows = index.value as unknown[];
    const kept = rows.filter((row) => !(isObject(row) && typeof row.runId === "string" && helperRunIds.has(row.runId)));
    if (kept.length === rows.length) return helperRunIds;
    try {
      await writeJsonAtomically(indexPath, kept);
      const reread = await readJson(indexPath);
      if (reread.kind !== "present" || !Array.isArray(reread.value) || reread.value.length !== kept.length) {
        throw new Error("The written index does not read back.");
      }
    } catch (error) {
      this.detail("history-index", indexPath, "FAILED",
        `Could not remove the helper runs' history rows: ${messageFromError(error)}; the helper runs are kept, and the next start retries.`);
      return new Set();
    }
    this.detail("history-index", indexPath, "MIGRATED", `Removed ${rows.length - kept.length} helper run history row(s).`);
    return helperRunIds;
  }

  /** M3: one helper run's folder directly under `memory/agents/`. True when it is gone. */
  private async deleteRunFolder(runId: string): Promise<boolean> {
    const runDir = path.join(this.memoryDir, STANDALONE_RUNS_DIR_NAME, runId);
    return this.removePath(`helper-run:${runId}`, runDir, "the helper run folder");
  }

  /** M4: per-run session folders, recognized by their state file, anywhere under memory except Memory Sync mirrors. */
  private async deleteSessionFolders(dirPath: string, isMemoryRoot: boolean): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readDirectoryEntries(dirPath);
    } catch (error) {
      this.detail(`walk:${this.relative(dirPath)}`, dirPath, "FAILED", `Could not list the folder: ${messageFromError(error)}`);
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;  // never follows a symbolic link
      if (isMemoryRoot && entry.name === MEMORY_SYNC_IMPORTS_DIR_NAME) continue;
      const entryPath = path.join(dirPath, entry.name);
      const session = SESSION_FOLDERS.find((folder) => folder.dirName === entry.name);
      if (session && (await this.inspect(path.join(entryPath, session.stateFileName)))?.isFile()) {
        await this.removePath(`session:${this.relative(entryPath)}`, entryPath, "the session folder");
        continue;
      }
      await this.deleteSessionFolders(entryPath, false);
    }
  }

  /** M5: a record root, only when all of it was read and every helper run it names is fully removed. */
  private async deleteRecordRoot(sources: RootSources, removedRows: ReadonlySet<string>, deletedRuns: ReadonlySet<string>): Promise<void> {
    const itemId = `records:${sources.root.dirName}`;
    if (!sources.fullyRead) {
      this.detail(itemId, sources.dirPath, "SKIPPED",
        "PRESERVED_UNREADABLE: kept with the helper runs only it names, because a source in it could not be read.");
      return;
    }
    const pending = [...sources.runIds].filter((runId) => !removedRows.has(runId) || !deletedRuns.has(runId));
    if (pending.length > 0) {
      this.detail(itemId, sources.dirPath, "FAILED",
        `Kept until its helper runs are removed (${pending.join(", ")}); the next start continues.`);
      return;
    }
    await this.removePath(itemId, sources.dirPath, "the records folder");
  }

  /** M6: the built-in improver's installed definition folder. */
  private async deleteImproverDefinition(): Promise<void> {
    const dirPath = path.join(this.agentsDir, IMPROVER_AGENT_DEFINITION_ID);
    await this.removePath(`built-in:${IMPROVER_AGENT_DEFINITION_ID}`, dirPath, "the built-in agent folder");
  }

  /** Removes a path (a symbolic link itself, never its target). True when it is absent afterwards. */
  private async removePath(itemId: string, targetPath: string, label: string): Promise<boolean> {
    try {
      if (!(await lstatOrNull(targetPath))) return true;
      await fs.rm(targetPath, { recursive: true, force: true });
      if (await lstatOrNull(targetPath)) throw new Error("It is still present.");
      this.detail(itemId, targetPath, "MIGRATED", `Removed ${label}.`);
      return true;
    } catch (error) {
      this.detail(itemId, targetPath, "FAILED", `Could not remove ${label}: ${messageFromError(error)}; the next start retries.`);
      return false;
    }
  }

  private async inspect(targetPath: string) {
    try {
      return await lstatOrNull(targetPath);
    } catch {
      return null;
    }
  }

  private preserveUnreadable(filePath: string, reason: string): void {
    this.detail(`source:${this.relative(filePath)}`, filePath, "SKIPPED", `PRESERVED_UNREADABLE: left untouched, it cannot be read (${reason}).`);
  }

  private detail(itemId: string, filePath: string, status: AppDataMigrationItemDetail["status"], message: string): void {
    this.details.push({ itemId, filePath, status, message });
  }

  private relative(targetPath: string): string {
    return path.relative(this.memoryDir, targetPath).split(path.sep).join("/") || ".";
  }
}

export const REMOVE_SKILL_IMPROVEMENT_DATA_MIGRATION_ID = MIGRATION_ID;
