import { readReleasedProjectFolderV1, readReleasedTaskFileV1 } from "./released-project-folder-v1.js";
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { writeJsonFile } from "../../../persistence/file/store-utils.js";
import { ProjectsLayout } from "../../../projects/stores/projects-layout.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationItemStatus,
} from "../../domain/app-data-migration-types.js";
import {
  isDevLifetimeResidueRow, isReleasedDraftId, isReleasedProjectRow, isReleasedTask, normalizeReleasedProject,
  normalizeReleasedTask, releasedSegment, type ReleasedTask,
} from "./released-projects-array-v1.js";

export const PROJECTS_PER_FOLDER_V1_MIGRATION_ID = "20261005_projects_per_folder_v1";

type Disposition =
  | "MIGRATED"
  | "SKIPPED_ALREADY_CURRENT"
  | "SKIPPED_INVALID_ROW_WARNING"
  | "SKIPPED_UNSAFE_ID_WARNING"
  | "SKIPPED_DUPLICATE_PROJECT_WARNING"
  | "SKIPPED_INVALID_TASK_WARNING"
  | "SKIPPED_TARGET_CONFLICT_WARNING"
  | "PRESERVED_DIRECTORY_CONFLICT_WARNING"
  | "MISSING_CONTEXT_FILE_WARNING"
  | "PRESERVED_RESIDUE_WARNING"
  | "FAILED_OPERATION";
const MESSAGES: Record<Disposition, string> = {
  MIGRATED: "Moved the Project, its Tasks, context and drafts into its per-Project folder.",
  SKIPPED_ALREADY_CURRENT: "The per-Project folder target already validated; left unchanged.",
  SKIPPED_INVALID_ROW_WARNING: "A released row is not a valid Project; it was not migrated and stays in the retained original.",
  SKIPPED_UNSAFE_ID_WARNING: "A Project or Task id cannot be a safe folder name; it was not migrated and stays in the retained original.",
  SKIPPED_DUPLICATE_PROJECT_WARNING: "A later row repeats an earlier projectId; the first was migrated, the later one stays in the retained original.",
  SKIPPED_INVALID_TASK_WARNING: "A released Task entry is invalid or repeated; it was not migrated and stays in the retained original.",
  SKIPPED_TARGET_CONFLICT_WARNING: "A different per-Project file already exists; the Project was preserved and not overwritten.",
  PRESERVED_DIRECTORY_CONFLICT_WARNING: "Both the released and the per-Project context or draft directory exist; nothing was overwritten.",
  MISSING_CONTEXT_FILE_WARNING: "A saved context file referenced by a Task is missing (it was already unreadable before the move).",
  PRESERVED_RESIDUE_WARNING: "Released context or draft directories still hold entries; they were left in place.",
  FAILED_OPERATION: "A write, rename or validation failed; the released sources were kept and a restart retries.",
};
const WARNING_DISPOSITIONS = new Set<Disposition>([
  "SKIPPED_INVALID_ROW_WARNING", "SKIPPED_UNSAFE_ID_WARNING", "SKIPPED_DUPLICATE_PROJECT_WARNING", "SKIPPED_INVALID_TASK_WARNING",
  "SKIPPED_TARGET_CONFLICT_WARNING", "PRESERVED_DIRECTORY_CONFLICT_WARNING", "MISSING_CONTEXT_FILE_WARNING", "PRESERVED_RESIDUE_WARNING",
]);
const MAX_EXAMPLES = 5;
const status = (d: Disposition): AppDataMigrationItemStatus => d === "MIGRATED" ? "MIGRATED" : d === "FAILED_OPERATION" ? "FAILED" : "SKIPPED";
type EntryState = "MISSING" | "DIRECTORY" | "UNSUPPORTED";

/**
 * One-time relayout of released Projects data (`projects.json` + `task_context_files/` +
 * `task_context_drafts/`) into per-Project folders. Old-shape reading lives only in the frozen
 * `released-projects-array-v1.ts`; the Project target classifier is frozen alongside it before the
 * source is retired as `projects.pre-folders.json`. Retry recognizes completed targets.
 */
export class ProjectsPerFolderV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = PROJECTS_PER_FOLDER_V1_MIGRATION_ID;
  readonly displayName = "Move Projects into per-Project folders";
  readonly description = "Moves released Projects, Tasks, saved Task files and drafts from projects.json into one folder per Project and Task.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;

  private readonly layout: ProjectsLayout;
  private readonly dispositions = new Map<Disposition, { count: number; examples: string[] }>();
  private scannedCount = 0;

  constructor(appDataDir: string) {
    this.layout = new ProjectsLayout(path.join(appDataDir, "projects"));
  }

  private get root() { return this.layout.root; }
  private get source() { return this.layout.releasedProjectsFile(); }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.dispositions.clear();
    this.scannedCount = 0;
    if (!(await this.exists(this.source))) return this.result(); // fresh install or already migrated
    let rows: unknown;
    try { rows = JSON.parse(await fs.readFile(this.source, "utf8")); }
    catch (error) { return this.failure(`projects.json could not be parsed: ${message(error)}`); }
    if (!Array.isArray(rows)) return this.failure("projects.json is not an array of Projects.");

    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      if (isDevLifetimeResidueRow(row)) continue; // unshipped dev residue; kept in the retained original
      this.scannedCount += 1;
      if (!isReleasedProjectRow(row)) { this.record("SKIPPED_INVALID_ROW_WARNING", `row ${index}`); continue; }
      if (!releasedSegment(row.projectId)) { this.record("SKIPPED_UNSAFE_ID_WARNING", `project ${index}`); continue; }
      if (seen.has(row.projectId)) { this.record("SKIPPED_DUPLICATE_PROJECT_WARNING", row.projectId); continue; }
      seen.add(row.projectId);
      try { this.record(await this.migrateProject(row.projectId, normalizeReleasedProject(row), Array.isArray(row.tasks) ? row.tasks : []), row.projectId); }
      catch (error) { this.record("FAILED_OPERATION", `${row.projectId}: ${message(error)}`); }
    }
    if (this.dispositions.has("FAILED_OPERATION")) return this.result();
    try { await this.retireSources(); }
    catch (error) { this.record("FAILED_OPERATION", `retire sources: ${message(error)}`); }
    return this.result();
  }

  private async migrateProject(projectId: string, project: ReturnType<typeof normalizeReleasedProject>, rawTasks: unknown[]): Promise<Disposition> {
    const tasks: ReleasedTask[] = [];
    const taskIds = new Set<string>();
    for (const raw of rawTasks) {
      if (!isReleasedTask(raw)) { this.record("SKIPPED_INVALID_TASK_WARNING", `${projectId}/task`); continue; }
      if (!releasedSegment(raw.taskId)) { this.record("SKIPPED_UNSAFE_ID_WARNING", `${projectId}/task`); continue; }
      if (taskIds.has(raw.taskId)) { this.record("SKIPPED_INVALID_TASK_WARNING", `${projectId}/${raw.taskId}`); continue; }
      taskIds.add(raw.taskId);
      tasks.push(normalizeReleasedTask(raw));
    }
    const projectFile = this.layout.projectFile(projectId);
    const projectContent = { projectId, name: project.name, description: project.description,
      createdAt: project.createdAt, updatedAt: project.updatedAt, workspaces: project.workspaces };
    const taskContent = (t: ReleasedTask) => ({ taskId: t.taskId, projectId, description: t.description, status: t.status,
      createdAt: t.createdAt, updatedAt: t.updatedAt, contextFiles: t.contextFiles });

    // Conflicts are detected before anything is written for this Project.
    const projectState = await this.targetState(projectFile, raw => readReleasedProjectFolderV1(raw, projectId), readReleasedProjectFolderV1(projectContent, projectId));
    const taskStates = await Promise.all(tasks.map(t => this.targetState(this.layout.taskFile(projectId, t.taskId),
      raw => readReleasedTaskFileV1(raw, projectId, t.taskId), readReleasedTaskFileV1(taskContent(t), projectId, t.taskId))));
    if (projectState === "CONFLICT" || taskStates.includes("CONFLICT")) return "SKIPPED_TARGET_CONFLICT_WARNING";

    let wrote = false;
    for (const [i, task] of tasks.entries()) {
      if (taskStates[i] === "CURRENT") continue;
      await this.layout.directory(this.layout.taskDir(projectId, task.taskId), true);
      await writeJsonFile(this.layout.taskFile(projectId, task.taskId), taskContent(task));
      wrote = true;
    }
    if (projectState !== "CURRENT") {
      await this.layout.directory(this.layout.projectDir(projectId), true);
      await writeJsonFile(projectFile, projectContent);
      wrote = true;
    }
    for (const task of tasks) {
      if (await this.moveDirectory(["task_context_files", releasedSegment(projectId)!, releasedSegment(task.taskId)!],
        this.layout.contextDir(projectId, task.taskId), this.layout.taskDir(projectId, task.taskId))) wrote = true;
      for (const file of task.contextFiles) {
        if (!(await this.exists(path.join(this.layout.contextDir(projectId, task.taskId), file.storedFilename)))) {
          this.record("MISSING_CONTEXT_FILE_WARNING", `${projectId}/${task.taskId}/${file.storedFilename}`);
        }
      }
    }
    const draftsParent = ["task_context_drafts", releasedSegment(projectId)!];
    if (await this.directoryState(draftsParent) === "DIRECTORY") {
      for (const draftId of await fs.readdir(path.join(this.root, ...draftsParent))) {
        if (!isReleasedDraftId(draftId)) continue;
        if (await this.moveDirectory([...draftsParent, draftId], this.layout.draftDir(projectId, draftId), this.layout.draftsDir(projectId))) wrote = true;
      }
    }
    // Validate the whole Project with the fixed target readers before the source can be retired.
    if (!isDeepStrictEqual(readReleasedProjectFolderV1(await readJson(projectFile), projectId), readReleasedProjectFolderV1(projectContent, projectId))) {
      throw new Error("project.json does not validate after writing.");
    }
    for (const task of tasks) {
      const written = readReleasedTaskFileV1(await readJson(this.layout.taskFile(projectId, task.taskId)), projectId, task.taskId);
      if (!isDeepStrictEqual(written, readReleasedTaskFileV1(taskContent(task), projectId, task.taskId))) throw new Error(`task.json for '${task.taskId}' does not validate after writing.`);
    }
    return wrote ? "MIGRATED" : "SKIPPED_ALREADY_CURRENT";
  }

  /** `MISSING`, `CURRENT` (validates and equals the expected content) or `CONFLICT`. */
  private async targetState<T>(file: string, read: (raw: unknown) => T | null, expected: T | null): Promise<"MISSING" | "CURRENT" | "CONFLICT"> {
    if (!(await this.exists(file))) return "MISSING";
    const current = read(await readJson(file).catch(() => null));
    return current !== null && isDeepStrictEqual(current, expected) ? "CURRENT" : "CONFLICT";
  }

  /** Renames a released directory into place; already-moved is recognized; both present is a preserved conflict. */
  private async moveDirectory(sourceParts: string[], target: string, targetParent: string): Promise<boolean> {
    const source = await this.directoryState(sourceParts);
    const targetState = await this.directoryState(path.relative(this.root, target).split(path.sep));
    if (source === "MISSING") return false;
    if (source === "UNSUPPORTED" || targetState !== "MISSING") {
      this.record("PRESERVED_DIRECTORY_CONFLICT_WARNING", path.relative(this.root, target));
      return false;
    }
    await this.layout.directory(targetParent, true);
    await fs.rename(path.join(this.root, ...sourceParts), target);
    return true;
  }

  /** Retains the released file under a new name and removes the released directories only if empty. */
  private async retireSources(): Promise<void> {
    const retained = path.join(this.root, "projects.pre-folders.json");
    if (await this.exists(retained)) throw new Error("projects.pre-folders.json already exists; the released source was kept.");
    await fs.rename(this.source, retained);
    for (const name of ["task_context_files", "task_context_drafts"]) {
      if (await this.directoryState([name]) !== "DIRECTORY") continue;
      if (!(await this.pruneEmpty(path.join(this.root, name)))) this.record("PRESERVED_RESIDUE_WARNING", name);
    }
  }
  /** Removes empty real directories bottom-up; never follows links. Returns whether `dir` is gone. */
  private async pruneEmpty(dir: string): Promise<boolean> {
    let empty = true;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.isSymbolicLink() && await this.pruneEmpty(path.join(dir, entry.name))) continue;
      empty = false;
    }
    if (empty) await fs.rmdir(dir);
    return empty;
  }
  /** Each component under the Projects root must be a real directory (no symlink following). */
  private async directoryState(parts: string[]): Promise<EntryState> {
    let current = this.root;
    for (const part of parts) {
      current = path.join(current, part);
      try {
        const stat = await fs.lstat(current);
        if (!stat.isDirectory() || stat.isSymbolicLink()) return "UNSUPPORTED";
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return "MISSING";
        throw error;
      }
    }
    return "DIRECTORY";
  }
  private exists(file: string): Promise<boolean> { return fs.lstat(file).then(() => true, () => false); }

  private record(disposition: Disposition, example: string): void {
    const entry = this.dispositions.get(disposition) ?? { count: 0, examples: [] };
    entry.count += 1;
    if (entry.examples.length < MAX_EXAMPLES) entry.examples.push(example);
    this.dispositions.set(disposition, entry);
  }
  private failure(reason: string): AppDataMigrationExecutionResult {
    this.record("FAILED_OPERATION", reason);
    return { ...this.result(), errorMessage: reason };
  }
  private result(): AppDataMigrationExecutionResult {
    const details: AppDataMigrationItemDetail[] = [...this.dispositions].map(([disposition, { count, examples }]) => ({
      itemId: disposition, status: status(disposition),
      message: `${MESSAGES[disposition]} Count: ${count}. Examples: ${examples.join(", ")}`,
    }));
    const count = (filter: (d: Disposition) => boolean) => [...this.dispositions].filter(([d]) => filter(d)).reduce((n, [, e]) => n + e.count, 0);
    const failed = count(d => d === "FAILED_OPERATION");
    const warned = count(d => WARNING_DISPOSITIONS.has(d));
    return {
      status: failed ? "FAILED" : warned ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount: this.scannedCount, migratedCount: count(d => d === "MIGRATED"),
        skippedCount: count(d => status(d) === "SKIPPED"), failedCount: failed, details },
      ...(failed ? { errorMessage: [...(this.dispositions.get("FAILED_OPERATION")?.examples ?? [])].join("; ") } : {}),
    };
  }
}

const readJson = async (file: string): Promise<unknown> => JSON.parse(await fs.readFile(file, "utf8"));
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
