import fs from "node:fs/promises";
import { readJsonFile, updateJsonFile, withFilePathLock } from "../../persistence/file/store-utils.js";
import type { AdHocTask } from "../domain/ad-hoc-task.js";
import type { ProjectTaskStatus } from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import { AdHocTasksLayout } from "./ad-hoc-tasks-layout.js";
import { isSafeSegment } from "./projects-layout.js";

const STATUSES: ReadonlySet<ProjectTaskStatus> = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/** Current tolerant reader of an ad-hoc `task.json`; its id must match its folder. */
export const readAdHocTaskFile = (raw: unknown, taskId: string): AdHocTask | null => {
  const c = raw as Partial<AdHocTask> | null;
  if (!c || c.taskId !== taskId || !isNonEmptyString(c.description) || !STATUSES.has(c.status as ProjectTaskStatus)
    || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt)) return null;
  return { taskId, description: c.description, status: c.status as ProjectTaskStatus, createdAt: c.createdAt, updatedAt: c.updatedAt,
    referenceFiles: Array.isArray(c.referenceFiles) ? c.referenceFiles.filter(isNonEmptyString) : [] };
};
/** Exact writer shape. */
export const adHocTaskFileContent = (t: AdHocTask) => ({ taskId: t.taskId, description: t.description,
  referenceFiles: [...t.referenceFiles], status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt });

const taskNotFound = (taskId: string) => new ProjectError("TASK_NOT_FOUND", `Task '${taskId}' was not found.`);

/**
 * `<appData>/ad-hoc-tasks/<taskId>/task.json`: direct reads by id (no scan, no Projects gate),
 * create-once, locked read-modify-write, and folder removal (with the Task's agent run resources).
 */
export class AdHocTaskStore {
  constructor(readonly layout = new AdHocTasksLayout()) {}

  /** The ad-hoc Task with this id; null when there is none (or the id cannot name one). */
  async read(taskId: string): Promise<AdHocTask | null> {
    if (!isSafeSegment(taskId)) return null;
    return readAdHocTaskFile(await readJsonFile<unknown>(this.layout.taskFile(taskId), null).catch(() => null), taskId);
  }
  /** Writes a new `task.json`; an existing one is never replaced. */
  async create(task: AdHocTask): Promise<void> {
    const file = this.layout.taskFile(task.taskId);
    await fs.mkdir(this.layout.taskDir(task.taskId), { recursive: true });
    await withFilePathLock(file, async () => {
      if (await readJsonFile<unknown>(file, null) !== null) throw new ProjectError("TASK_CONTEXT_INVALID", "Task identity already exists.");
      const temporary = `${file}.${process.pid}.${Date.now()}.create.tmp`;
      await fs.writeFile(temporary, `${JSON.stringify(adHocTaskFileContent(task), null, 2)}\n`, "utf-8");
      await fs.rename(temporary, file);
    });
  }
  /** Locked read-modify-write of one `task.json`; a throwing updater writes nothing. */
  async update(taskId: string, updater: (task: AdHocTask) => AdHocTask): Promise<AdHocTask> {
    if (!(await this.read(taskId))) throw taskNotFound(taskId);
    let updated!: AdHocTask;
    await updateJsonFile<unknown>(this.layout.taskFile(taskId), null, (raw) => {
      const current = readAdHocTaskFile(raw, taskId);
      if (!current) throw taskNotFound(taskId);
      updated = { ...updater(current), taskId };
      return adHocTaskFileContent(updated);
    });
    return updated;
  }
  /** Removes the Task's folder: its `task.json` and its `agent_run_resources.json`. */
  async delete(taskId: string): Promise<void> {
    await fs.rm(this.layout.taskDir(taskId), { recursive: true, force: true });
  }
}
