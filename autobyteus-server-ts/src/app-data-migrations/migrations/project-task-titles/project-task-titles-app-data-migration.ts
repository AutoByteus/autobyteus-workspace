import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { writeJsonFile } from "../../frozen/server/persistence/file/store-utils.js";
import { ProjectsLayout } from "../../frozen/server/projects/stores/projects-layout.js";
import { readTaskFile as readTaskFileBeforeTitles } from "../../frozen/server/projects/stores/project-store.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationItemStatus,
} from "../../domain/app-data-migration-types.js";
import { titleFromFirstLine } from "./title-from-first-line.js";

const PROJECT_TASK_KEYS_V1_MIGRATION_ID = "20261017_project_task_keys_v1";

export const PROJECT_TASK_TITLES_MIGRATION_ID = "20261025_project_task_titles";

type Disposition =
  | "MIGRATED"
  | "SKIPPED_ALREADY_CURRENT"
  | "SKIPPED_INVALID_TASK_WARNING"
  | "SKIPPED_NO_TITLE_LINE_WARNING"
  | "FAILED_OPERATION";
const MESSAGES: Record<Disposition, string> = {
  MIGRATED: "Gave the Task its title from its description's first line.",
  SKIPPED_ALREADY_CURRENT: "The Task already has a title; left unchanged.",
  SKIPPED_INVALID_TASK_WARNING: "A task.json is not a valid Task; it was preserved unchanged (it is not shown by the app).",
  SKIPPED_NO_TITLE_LINE_WARNING: "A Task's description has no non-empty line to take a title from; it was preserved unchanged (it is not shown by the app until it has a title).",
  FAILED_OPERATION: "A Task could not be given its title (a write or its validation failed); the other Tasks continue and a restart retries.",
};
const WARNING_DISPOSITIONS = new Set<Disposition>(["SKIPPED_INVALID_TASK_WARNING", "SKIPPED_NO_TITLE_LINE_WARNING"]);
const MAX_EXAMPLES = 5;
const status = (d: Disposition): AppDataMigrationItemStatus => d === "MIGRATED" ? "MIGRATED" : d === "FAILED_OPERATION" ? "FAILED" : "SKIPPED";

type RawRecord = Record<string, unknown>;

/** Frozen target classifier: a Task file that already holds a title (a non-blank string). */
const hasTitle = (raw: RawRecord): boolean => typeof raw.title === "string" && raw.title.trim().length > 0;

/**
 * One-time titling of Project Tasks saved before Tasks had titles (autobyteus-260, DEC-009 (a)). Every Task file that
 * the pre-title reader accepts and that has no title gets `title` from its description's first non-empty line
 * (`title-from-first-line.ts`); nothing else in the file changes. Each file is replaced atomically and re-read: the
 * planned title and every other key and value must be as before. A failed Task does not stop the others; a restart
 * retries and skips the Tasks already titled. Classification uses the frozen pre-title `readTaskFile`, so every Task
 * the app listed before this change is titled. Runs after `project-task-keys-v1`, so unkeyed Tasks are keyed first.
 */
export class ProjectTaskTitlesAppDataMigration implements AppDataMigrationDefinition {
  readonly id = PROJECT_TASK_TITLES_MIGRATION_ID;
  readonly displayName = "Give Project Tasks titles";
  readonly description = "Gives every existing Project Task a title, taken from the first line of its description (at most 200 characters).";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [PROJECT_TASK_KEYS_V1_MIGRATION_ID] as const;

  private readonly layout: ProjectsLayout;
  private readonly dispositions = new Map<Disposition, { count: number; examples: string[] }>();
  private scannedCount = 0;

  constructor(appDataDir: string) {
    this.layout = new ProjectsLayout(path.join(appDataDir, "projects"));
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.dispositions.clear();
    this.scannedCount = 0;
    for (const projectId of await this.folderIds(this.layout.root)) {
      if (!(await exists(this.layout.projectFile(projectId)))) continue; // a deleted Project's residue folder is not a Project
      for (const taskId of await this.folderIds(this.layout.tasksDir(projectId))) {
        const file = this.layout.taskFile(projectId, taskId);
        if (!(await exists(file))) continue; // a deleted Task's kept agent run resources
        this.scannedCount += 1;
        const item = `${projectId}/${taskId}`;
        try { this.record(await this.titleTask(file, projectId, taskId), item); }
        catch (error) { this.record("FAILED_OPERATION", `${item}: ${message(error)}`); }
      }
    }
    return this.result();
  }

  private async titleTask(file: string, projectId: string, taskId: string): Promise<Disposition> {
    const raw = await readRecord(file);
    if (raw && hasTitle(raw)) return "SKIPPED_ALREADY_CURRENT";
    const task = raw && readTaskFileBeforeTitles(raw, projectId, taskId);
    if (!raw || !task) return "SKIPPED_INVALID_TASK_WARNING";
    const title = titleFromFirstLine(task.description);
    if (title === null) return "SKIPPED_NO_TITLE_LINE_WARNING";
    const planned = { ...raw, title };
    await writeJsonFile(file, planned);
    if (!isDeepStrictEqual(await readRecord(file), planned)) throw new Error(`task.json for '${taskId}' does not validate after writing.`);
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
