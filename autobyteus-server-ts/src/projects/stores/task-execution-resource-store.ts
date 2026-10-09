import fs from "node:fs/promises";
import { readJsonFile, updateJsonFile } from "../../persistence/file/store-utils.js";
import type { TaskLocation } from "../domain/models.js";
import { emptyTaskExecutionResourceFile, type TaskExecutionResourceFile } from "../domain/task-execution-resources.js";
import { AdHocTasksLayout } from "./ad-hoc-tasks-layout.js";
import { ProjectsLayout } from "./projects-layout.js";
import { parseTaskExecutionResourceFile, serializeTaskExecutionResourceFile } from "./task-execution-resource-schema.js";

const entries = async (dir: string): Promise<string[]> => {
  try { return (await fs.readdir(dir, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
};

/**
 * Every Task's `agent_run_resources.json`, in both Task roots: `projects/<projectId>/tasks/<taskId>/`
 * and `ad-hoc-tasks/<taskId>/`. Enumeration (independent of whether the Project or Task metadata
 * still exists, so closed stays closed after Delete), strict reads, and per-file locked atomic
 * replacement with a synchronous commit observer.
 */
export class TaskExecutionResourceStore {
  constructor(readonly layout = new ProjectsLayout(), readonly adHocLayout = new AdHocTasksLayout()) {}

  filePath(location: TaskLocation): string {
    return location.projectId === null
      ? this.adHocLayout.taskExecutionResourcesFile(location.taskId)
      : this.layout.taskExecutionResourcesFile(location.projectId, location.taskId);
  }
  async list(): Promise<TaskLocation[]> {
    const found: TaskLocation[] = [];
    const add = async (location: TaskLocation) => {
      if (await this.exists(location)) found.push(location);
    };
    for (const projectFolder of await entries(this.layout.root)) {
      const projectId = this.layout.idOfFolder(projectFolder);
      if (!projectId) continue;
      for (const taskFolder of await entries(this.layout.tasksDir(projectId))) {
        const taskId = this.layout.idOfFolder(taskFolder);
        if (taskId) await add({ projectId, taskId });
      }
    }
    for (const taskFolder of await entries(this.adHocLayout.root)) {
      const taskId = this.adHocLayout.idOfFolder(taskFolder);
      if (taskId) await add({ projectId: null, taskId });
    }
    return found;
  }
  async exists(location: TaskLocation): Promise<boolean> {
    return fs.access(this.filePath(location)).then(() => true, () => false);
  }
  /** Throws for unreadable or invalid content. */
  async read(location: TaskLocation): Promise<TaskExecutionResourceFile> {
    const raw = await readJsonFile<unknown>(this.filePath(location), null);
    return raw === null ? emptyTaskExecutionResourceFile(location.taskId) : parseTaskExecutionResourceFile(raw, location.taskId);
  }
  /** The updater sees the content read under the file lock; `onCommitted` runs synchronously after the atomic replace. */
  async update(location: TaskLocation, updater: (file: TaskExecutionResourceFile) => TaskExecutionResourceFile,
    onCommitted: (file: TaskExecutionResourceFile) => void): Promise<TaskExecutionResourceFile> {
    let next!: TaskExecutionResourceFile;
    await updateJsonFile<unknown>(this.filePath(location), null, (raw) => {
      const current = raw === null ? emptyTaskExecutionResourceFile(location.taskId) : parseTaskExecutionResourceFile(raw, location.taskId);
      next = updater(current);
      const physical = serializeTaskExecutionResourceFile(next);
      parseTaskExecutionResourceFile(physical, location.taskId); // invariants hold before replacement
      return physical;
    }, () => onCommitted(next));
    return next;
  }
}
