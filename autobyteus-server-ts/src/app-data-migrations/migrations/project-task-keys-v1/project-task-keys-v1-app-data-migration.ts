import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { writeJsonFile } from "../../frozen/server/persistence/file/store-utils.js";
import { ProjectsLayout } from "../../frozen/server/projects/stores/projects-layout.js";
import { readProjectFile, readTaskFile } from "../../frozen/server/projects/stores/project-store.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationItemStatus,
} from "../../domain/app-data-migration-types.js";
import { readReleasedProjectFileV2, readReleasedTaskFileV2, type ReleasedProjectV2 } from "./released-project-files-v2.js";
import { formatTaskKeyV1, taskKeyPrefixOfV1, uniqueTaskKeyPrefixV1 } from "./task-key-prefix-v1.js";
const PROJECTS_PER_FOLDER_V1_MIGRATION_ID = "20261005_projects_per_folder_v1";

export const PROJECT_TASK_KEYS_V1_MIGRATION_ID = "20261017_project_task_keys_v1";

type Disposition =
  | "MIGRATED"
  | "SKIPPED_ALREADY_CURRENT"
  | "SKIPPED_INVALID_PROJECT_WARNING"
  | "SKIPPED_INVALID_TASK_WARNING"
  | "FAILED_OPERATION";
const MESSAGES: Record<Disposition, string> = {
  MIGRATED: "Gave the Project its Task key prefix and every valid Task its key, in creation order.",
  SKIPPED_ALREADY_CURRENT: "The Project already has its Task keys; left unchanged.",
  SKIPPED_INVALID_PROJECT_WARNING: "A project.json is not a valid Project; it was preserved unchanged (it is not shown by the app).",
  SKIPPED_INVALID_TASK_WARNING: "A task.json is not a valid Task; it was preserved unchanged and not numbered (it is not shown by the app).",
  FAILED_OPERATION: "A Project could not be keyed (a write, a validation, or a Task already holding a different key); its marker was not written and a restart retries.",
};
const WARNING_DISPOSITIONS = new Set<Disposition>(["SKIPPED_INVALID_PROJECT_WARNING", "SKIPPED_INVALID_TASK_WARNING"]);
const MAX_EXAMPLES = 5;
const status = (d: Disposition): AppDataMigrationItemStatus => d === "MIGRATED" ? "MIGRATED" : d === "FAILED_OPERATION" ? "FAILED" : "SKIPPED";

type RawRecord = Record<string, unknown>;
type Candidate = { projectId: string; raw: RawRecord; project: ReleasedProjectV2 };
type PlannedTask = { taskId: string; raw: RawRecord; taskKey: string };

/** Frozen target classifier: a Project that already holds valid key allocation state (`taskKeys`). */
const keyedPrefixOf = (raw: RawRecord): string | null => {
  const keys = raw.taskKeys as { prefix?: unknown; lastNumber?: unknown } | null | undefined;
  return keys && typeof keys.prefix === "string" && keys.prefix.length > 0 && Number.isSafeInteger(keys.lastNumber)
    && (keys.lastNumber as number) >= 0 ? keys.prefix : null;
};
/** Creation order: `createdAt`, then the id (plain code-unit order, independent of locale). */
const byCreation = (a: { createdAt: string; id: string }, b: { createdAt: string; id: string }): number =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * One-time keying of released Projects data. Every valid Project gets `taskKeys` (its prefix, derived from
 * its name, and the highest number assigned) and every valid Task its `taskKey`, numbered from 1 in creation
 * order (`createdAt`, then `taskId`). Projects reserve prefixes in creation order (`createdAt`, then
 * `projectId`) after the prefixes of Projects already keyed, so the older Project keeps the plain prefix.
 * Writes only add these fields to the parsed file and replace it atomically; the Project's `taskKeys`
 * is written last as its marker. Retry recognizes Tasks already carrying their planned key.
 * Old-shape reading lives only in the frozen `released-project-files-v2.ts` and `task-key-prefix-v1.ts`.
 */
export class ProjectTaskKeysV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = PROJECT_TASK_KEYS_V1_MIGRATION_ID;
  readonly displayName = "Give Project Tasks readable keys";
  readonly description = "Gives every existing Project a Task key prefix and every existing Project Task its key (e.g. autobyteus-42), numbered in creation order.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [PROJECTS_PER_FOLDER_V1_MIGRATION_ID] as const;

  private readonly layout: ProjectsLayout;
  private readonly dispositions = new Map<Disposition, { count: number; examples: string[] }>();
  private scannedCount = 0;

  constructor(appDataDir: string) {
    this.layout = new ProjectsLayout(path.join(appDataDir, "projects"));
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.dispositions.clear();
    this.scannedCount = 0;
    const reserved = new Set<string>();
    const candidates: Candidate[] = [];
    for (const projectId of await this.folderIds(this.layout.root)) {
      const file = this.layout.projectFile(projectId);
      if (!(await exists(file))) continue; // a deleted Project's residue folder is not a Project
      this.scannedCount += 1;
      const raw = await readRecord(file);
      const keyedPrefix = raw && keyedPrefixOf(raw);
      if (keyedPrefix) { reserved.add(keyedPrefix); this.record("SKIPPED_ALREADY_CURRENT", projectId); continue; }
      const project = raw && readReleasedProjectFileV2(raw, projectId);
      if (!raw || !project) { this.record("SKIPPED_INVALID_PROJECT_WARNING", projectId); continue; }
      candidates.push({ projectId, raw, project });
    }
    candidates.sort((a, b) => byCreation({ createdAt: a.project.createdAt, id: a.projectId }, { createdAt: b.project.createdAt, id: b.projectId }));
    for (const candidate of candidates) {
      const prefix = uniqueTaskKeyPrefixV1(taskKeyPrefixOfV1(candidate.project.name), reserved);
      reserved.add(prefix);
      try { this.record(await this.keyProject(candidate, prefix), candidate.projectId); }
      catch (error) { this.record("FAILED_OPERATION", `${candidate.projectId}: ${message(error)}`); }
    }
    return this.result();
  }

  /** Plans every Task, refuses a conflicting key before any write, writes the Tasks, then the marker; validates with the current readers. */
  private async keyProject({ projectId, raw }: Candidate, prefix: string): Promise<Disposition> {
    const valid: Array<{ id: string; raw: RawRecord; createdAt: string }> = [];
    for (const taskId of await this.folderIds(this.layout.tasksDir(projectId))) {
      const file = this.layout.taskFile(projectId, taskId);
      if (!(await exists(file))) continue; // a deleted Task's kept agent run resources
      const taskRaw = await readRecord(file);
      const task = taskRaw && readReleasedTaskFileV2(taskRaw, projectId, taskId);
      if (!taskRaw || !task) { this.record("SKIPPED_INVALID_TASK_WARNING", `${projectId}/${taskId}`); continue; }
      valid.push({ id: taskId, raw: taskRaw, createdAt: task.createdAt });
    }
    const planned: PlannedTask[] = valid.sort(byCreation)
      .map((task, index) => ({ taskId: task.id, raw: task.raw, taskKey: formatTaskKeyV1(prefix, index + 1) }));
    const conflict = planned.find((task) => Object.hasOwn(task.raw, "taskKey") && task.raw.taskKey !== task.taskKey);
    if (conflict) throw new Error(`Task '${conflict.taskId}' already holds key '${String(conflict.raw.taskKey)}', not '${conflict.taskKey}'.`);

    for (const task of planned) {
      if (task.raw.taskKey === task.taskKey) continue; // keyed by an interrupted earlier attempt
      const file = this.layout.taskFile(projectId, task.taskId);
      await writeJsonFile(file, { ...task.raw, taskKey: task.taskKey });
      if (readTaskFile(await readRecord(file), projectId, task.taskId)?.taskKey !== task.taskKey) {
        throw new Error(`task.json for '${task.taskId}' does not validate after writing.`);
      }
    }
    const taskKeys = { prefix, lastNumber: planned.length };
    await writeJsonFile(this.layout.projectFile(projectId), { ...raw, taskKeys });
    const written = readProjectFile(await readRecord(this.layout.projectFile(projectId)), projectId)?.taskKeys;
    if (written?.prefix !== taskKeys.prefix || written.lastNumber !== taskKeys.lastNumber) throw new Error("project.json does not validate after writing.");
    return "MIGRATED";
  }

  /** The ids of a directory's valid encoded sub-folders; a missing directory has none. */
  private async folderIds(dir: string): Promise<string[]> {
    let entries: Dirent[];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    return entries.filter((entry) => entry.isDirectory()).map((entry) => this.layout.idOfFolder(entry.name))
      .filter((id): id is string => id !== null).sort();
  }

  private record(disposition: Disposition, example: string): void {
    const entry = this.dispositions.get(disposition) ?? { count: 0, examples: [] };
    entry.count += 1;
    if (entry.examples.length < MAX_EXAMPLES) entry.examples.push(example);
    this.dispositions.set(disposition, entry);
  }
  private result(): AppDataMigrationExecutionResult {
    const details: AppDataMigrationItemDetail[] = [...this.dispositions].map(([disposition, { count, examples }]) => ({
      itemId: disposition, status: status(disposition),
      message: `${MESSAGES[disposition]} Count: ${count}. Examples: ${examples.join(", ")}`,
    }));
    const count = (filter: (d: Disposition) => boolean) => [...this.dispositions].filter(([d]) => filter(d)).reduce((n, [, e]) => n + e.count, 0);
    const failed = count((d) => d === "FAILED_OPERATION");
    const warned = count((d) => WARNING_DISPOSITIONS.has(d));
    return {
      status: failed ? "FAILED" : warned ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount: this.scannedCount, migratedCount: count((d) => d === "MIGRATED"),
        skippedCount: count((d) => status(d) === "SKIPPED"), failedCount: failed, details },
      ...(failed ? { errorMessage: [...(this.dispositions.get("FAILED_OPERATION")?.examples ?? [])].join("; ") } : {}),
    };
  }
}

const exists = (file: string): Promise<boolean> => fs.lstat(file).then(() => true, () => false);
/** The parsed JSON object of a file; null when it is unreadable, not JSON, or not an object. */
const readRecord = async (file: string): Promise<RawRecord | null> => {
  try {
    const value: unknown = JSON.parse(await fs.readFile(file, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as RawRecord : null;
  } catch { return null; }
};
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
