import fs from "node:fs/promises";
import { readJsonFile, updateJsonFile } from "../../persistence/file/store-utils.js";
import type { TaskLocation } from "../domain/models.js";
import { emptyTaskAgentResourceFile, type TaskAgentResourceFile } from "../domain/task-agent-resources.js";
import { AdHocTasksLayout } from "./ad-hoc-tasks-layout.js";
import { ProjectsLayout } from "./projects-layout.js";
import { parseTaskAgentResourceFile, serializeTaskAgentResourceFile } from "./task-agent-resource-schema.js";

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
export class TaskAgentResourceStore {
  constructor(readonly layout = new ProjectsLayout(), readonly adHocLayout = new AdHocTasksLayout()) {}

  filePath(location: TaskLocation): string {
    return location.projectId === null
      ? this.adHocLayout.agentRunResourcesFile(location.taskId)
      : this.layout.agentRunResourcesFile(location.projectId, location.taskId);
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
  async read(location: TaskLocation): Promise<TaskAgentResourceFile> {
    const raw = await readJsonFile<unknown>(this.filePath(location), null);
    return raw === null ? emptyTaskAgentResourceFile(location.taskId) : parseTaskAgentResourceFile(raw, location.taskId);
  }
  /** The updater sees the content read under the file lock; `onCommitted` runs synchronously after the atomic replace. */
  async update(location: TaskLocation, updater: (file: TaskAgentResourceFile) => TaskAgentResourceFile,
    onCommitted: (file: TaskAgentResourceFile) => void): Promise<TaskAgentResourceFile> {
    let next!: TaskAgentResourceFile;
    await updateJsonFile<unknown>(this.filePath(location), null, (raw) => {
      const current = raw === null ? emptyTaskAgentResourceFile(location.taskId) : parseTaskAgentResourceFile(raw, location.taskId);
      next = updater(current);
      const physical = serializeTaskAgentResourceFile(next);
      parseTaskAgentResourceFile(physical, location.taskId); // invariants hold before replacement
      return physical;
    }, () => onCommitted(next));
    return next;
  }
}
