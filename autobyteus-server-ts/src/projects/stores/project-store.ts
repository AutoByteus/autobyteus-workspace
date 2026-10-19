import fs from "node:fs/promises";
import path from "node:path";
import { readJsonFile, updateJsonFile, withFilePathLock, writeJsonFile } from "../../persistence/file/store-utils.js";
import type { Project, ProjectTask, ProjectTaskKeys, ProjectWorkspaceLink } from "../domain/models.js";
import { isProjectTaskStatus } from "../domain/task-status.js";
import { isSafeContextFilename, type ProjectTaskContextFile } from "../domain/project-task-context.js";
import { ProjectError } from "../domain/project-errors.js";
import { formatTaskKey } from "../domain/task-keys.js";
import { isSafeSegment, ProjectsLayout } from "./projects-layout.js";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isValidLink = (link: unknown): link is ProjectWorkspaceLink => {
  const c = link as Partial<ProjectWorkspaceLink> | null;
  return Boolean(c) && isNonEmptyString(c?.workspaceRootPath)
    && typeof c?.description === "string";
};
const normalizeContextFiles = (files: unknown): ProjectTaskContextFile[] =>
  Array.isArray(files) ? files.filter((f) => f && isSafeContextFilename(f.storedFilename)
    && typeof f.displayName === "string" && typeof f.mimeType === "string"
    && Number.isSafeInteger(f.sizeBytes) && f.sizeBytes >= 0).map((f) => ({
      storedFilename: f.storedFilename, displayName: f.displayName, mimeType: f.mimeType, sizeBytes: f.sizeBytes,
    })) : [];
const isValidTaskKeys = (keys: unknown): keys is ProjectTaskKeys => {
  const c = keys as Partial<ProjectTaskKeys> | null;
  return Boolean(c) && isNonEmptyString(c?.prefix) && Number.isSafeInteger(c?.lastNumber) && c!.lastNumber! >= 0;
};
/** Current tolerant reader of `retired-task-key-prefixes.json`; a missing file means none (deleted pre-key Projects had none). */
export const readRetiredTaskKeyPrefixesFile = (raw: unknown): string[] => {
  const prefixes = (raw as { prefixes?: unknown } | null)?.prefixes;
  return Array.isArray(prefixes) ? prefixes.filter(isNonEmptyString) : [];
};
/** Absent means no dependencies; only Task ID strings are kept. */
const normalizeDependsOn = (ids: unknown): string[] => Array.isArray(ids) ? ids.filter(isNonEmptyString) : [];

/** Current tolerant reader of `project.json`: known fields only; an invalid file is not a Project. */
export const readProjectFile = (raw: unknown, projectId: string): Project | null => {
  const c = raw as Partial<Project> | null;
  if (!c || c.projectId !== projectId || !isNonEmptyString(c.name) || typeof c.description !== "string"
    || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt) || !Array.isArray(c.workspaces) || !isValidTaskKeys(c.taskKeys)) return null;
  return { projectId, name: c.name, description: c.description, createdAt: c.createdAt, updatedAt: c.updatedAt,
    workspaces: c.workspaces.filter(isValidLink).map((l) => ({
      workspaceRootPath: l.workspaceRootPath, description: l.description })),
    taskKeys: { prefix: c.taskKeys.prefix, lastNumber: c.taskKeys.lastNumber } };
};
/** Current tolerant reader of `task.json`; its ids must match its folders. An absent `partOfTaskId` means no parent. */
export const readTaskFile = (raw: unknown, projectId: string, taskId: string): ProjectTask | null => {
  const c = raw as (Partial<ProjectTask> & { projectId?: unknown }) | null;
  if (!c || c.taskId !== taskId || c.projectId !== projectId || !isNonEmptyString(c.taskKey) || !isNonEmptyString(c.description)
    || !isProjectTaskStatus(c.status) || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt)) return null;
  return { taskId, taskKey: c.taskKey, description: c.description, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt,
    contextFiles: normalizeContextFiles(c.contextFiles), dependsOnTaskIds: normalizeDependsOn(c.dependsOnTaskIds),
    partOfTaskId: isNonEmptyString(c.partOfTaskId) ? c.partOfTaskId : null };
};
/** Exact writer shapes. */
export const projectFileContent = (p: Project) => ({ projectId: p.projectId, name: p.name, description: p.description,
  createdAt: p.createdAt, updatedAt: p.updatedAt, workspaces: p.workspaces.map((l) => ({
    workspaceRootPath: l.workspaceRootPath, description: l.description })),
  taskKeys: { prefix: p.taskKeys.prefix, lastNumber: p.taskKeys.lastNumber } });
export const taskFileContent = (projectId: string, t: ProjectTask) => ({ taskId: t.taskId, projectId, taskKey: t.taskKey, description: t.description,
  status: t.status, dependsOnTaskIds: [...t.dependsOnTaskIds], partOfTaskId: t.partOfTaskId, createdAt: t.createdAt, updatedAt: t.updatedAt,
  contextFiles: normalizeContextFiles(t.contextFiles ?? []) });

const notFound = (projectId: string) => new ProjectError("PROJECT_NOT_FOUND", `Project '${projectId}' was not found.`);
const taskNotFound = (taskId: string) => new ProjectError("TASK_NOT_FOUND", `Task '${taskId}' was not found in this project.`);
const subdirectories = async (dir: string): Promise<string[]> => {
  try { return (await fs.readdir(dir, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
};
const removeIfEmpty = (dir: string) => fs.rmdir(dir).catch(() => undefined);

/**
 * Per-Project folder persistence: `<projectId>/project.json` and `<projectId>/tasks/<taskId>/task.json`,
 * read tolerantly and written exactly, one file at a time. A Task is admitted only under a valid
 * `project.json`. Task keys are allocated here, from the Project's `taskKeys`, under the catalog lock.
 * Delete removes metadata and context but keeps every `agent_run_resources.json`.
 * While the released `projects.json` still exists, every operation rejects PROJECTS_MIGRATION_PENDING.
 */
export class ProjectStore {
  constructor(readonly layout = new ProjectsLayout()) {}

  async listProjects(): Promise<Project[]> {
    await this.assertMigrated();
    const projects = await Promise.all((await subdirectories(this.layout.root)).map(async (name) => {
      const projectId = this.layout.idOfFolder(name);
      return projectId ? this.readProjectFile(projectId) : null;
    }));
    return projects.filter((p): p is Project => p !== null);
  }
  async readProject(projectId: string): Promise<Project | null> {
    await this.assertMigrated();
    return isSafeSegment(projectId) ? this.readProjectFile(projectId) : null;
  }
  async listTasks(projectId: string): Promise<ProjectTask[]> {
    await this.requireProject(projectId);
    const tasks = await Promise.all((await subdirectories(this.layout.tasksDir(projectId))).map(async (name) => {
      const taskId = this.layout.idOfFolder(name);
      return taskId ? this.readTaskFile(projectId, taskId) : null;
    }));
    return tasks.filter((t): t is ProjectTask => t !== null);
  }
  async readTask(projectId: string, taskId: string): Promise<ProjectTask | null> {
    await this.requireProject(projectId);
    return isSafeSegment(taskId) ? this.readTaskFile(projectId, taskId) : null;
  }
  /** Node-local lookup of a Task by id across every valid Project. */
  async findTask(taskId: string): Promise<Array<{ projectId: string; task: ProjectTask }>> {
    const projects = await this.listProjects();
    if (!isSafeSegment(taskId)) return [];
    const found = await Promise.all(projects.map(async ({ projectId }) => {
      const task = await this.readTaskFile(projectId, taskId);
      return task ? [{ projectId, task }] : [];
    }));
    return found.flat();
  }

  /** The Task with this exact key: the Project owning the key's prefix (the part before its last "-"), then its Task. */
  async findTaskByKey(taskKey: string): Promise<{ projectId: string; task: ProjectTask } | null> {
    const prefix = taskKey.slice(0, taskKey.lastIndexOf("-"));
    const project = prefix ? (await this.listProjects()).find((p) => p.taskKeys.prefix === prefix) : undefined;
    const task = project && (await this.listTasks(project.projectId)).find((t) => t.taskKey === taskKey);
    return project && task ? { projectId: project.projectId, task } : null;
  }

  /**
   * Project writes are serialized so name and key-prefix uniqueness are checked against every Project;
   * `retiredPrefixes` are the key prefixes of deleted Projects, which stay reserved.
   */
  async createProject(check: (existing: Project[], retiredPrefixes: string[]) => Promise<Project> | Project): Promise<Project> {
    return this.withProjectsCatalog(async () => {
      const created = await check(await this.listProjects(), await this.readRetiredTaskKeyPrefixes());
      await this.layout.directory(this.layout.projectDir(created.projectId), true);
      await writeJsonFile(this.layout.projectFile(created.projectId), projectFileContent(created));
      return created;
    });
  }
  async updateProject(projectId: string, change: (project: Project, all: Project[]) => Promise<Project> | Project): Promise<Project> {
    return this.withProjectsCatalog(async () => {
      const all = await this.listProjects();
      const current = all.find(p => p.projectId === projectId);
      if (!current) throw notFound(projectId);
      // Key allocation state is never changed by a Project edit (a rename keeps its prefix).
      const next = { ...(await change(current, all)), projectId, taskKeys: current.taskKeys };
      await writeJsonFile(this.layout.projectFile(projectId), projectFileContent(next));
      return next;
    });
  }
  /**
   * Retires the Project's key prefix, then removes `project.json`, then drafts and every Task's metadata and
   * context; keeps agent run resources.
   */
  async deleteProject(projectId: string): Promise<boolean> {
    return this.withProjectsCatalog(async () => {
      const project = await this.readProject(projectId);
      if (!project) return false;
      const retired = await this.readRetiredTaskKeyPrefixes();
      if (!retired.includes(project.taskKeys.prefix)) {
        await writeJsonFile(this.layout.retiredTaskKeyPrefixesFile(), { prefixes: [...retired, project.taskKeys.prefix] });
      }
      await fs.unlink(this.layout.projectFile(projectId));
      await this.removeDirectory(this.layout.draftsDir(projectId));
      for (const name of await subdirectories(this.layout.tasksDir(projectId))) {
        const taskId = this.layout.idOfFolder(name);
        if (taskId) await this.removeTaskFiles(projectId, taskId);
      }
      await removeIfEmpty(this.layout.tasksDir(projectId));
      await removeIfEmpty(this.layout.projectDir(projectId));
      return true;
    });
  }

  /**
   * Writes a new `task.json`; `prepare` runs under the file lock once the parent Project is proven. The
   * Task's key is allocated after `prepare` succeeds, in the same first write; a number spent by a later
   * failure stays a gap and is never reused.
   */
  async createTask(projectId: string, taskId: string, prepare: () => Promise<Omit<ProjectTask, "taskKey">>): Promise<ProjectTask> {
    await this.requireProject(projectId);
    const file = this.layout.taskFile(projectId, taskId);
    await this.layout.directory(this.layout.taskDir(projectId, taskId), true);
    return this.withCommitLock(file, async () => {
      if (await readJsonFile<unknown>(file, null) !== null) throw new ProjectError("TASK_CONTEXT_INVALID", "Task identity already exists.");
      const prepared = await prepare();
      const created: ProjectTask = { ...prepared, taskId, taskKey: await this.allocateTaskKey(projectId) };
      const temporary = `${file}.${process.pid}.${Date.now()}.create.tmp`;
      await fs.writeFile(temporary, `${JSON.stringify(taskFileContent(projectId, created), null, 2)}\n`, "utf-8");
      await fs.rename(temporary, file);
      return created;
    });
  }
  /** Locked read-modify-write of one `task.json`; a throwing updater writes nothing. */
  async updateTask(projectId: string, taskId: string, updater: (task: ProjectTask) => Promise<ProjectTask> | ProjectTask): Promise<ProjectTask> {
    if (!(await this.readTask(projectId, taskId))) throw taskNotFound(taskId);
    let updated!: ProjectTask, committed = false;
    try {
      await updateJsonFile<unknown>(this.layout.taskFile(projectId, taskId), null, async (raw) => {
        const current = readTaskFile(raw, projectId, taskId);
        if (!current) throw taskNotFound(taskId);
        // A Task's key never changes.
        updated = { ...(await updater(current)), taskId, taskKey: current.taskKey };
        return taskFileContent(projectId, updated);
      }, () => { committed = true; });
    } catch (error) {
      if (!committed) throw error;
      console.warn("Project Task committed; lock finalization failed.", error);
    }
    return updated;
  }
  /** Serializes relation-changing Task writes (dependencies, parent) of one Project, so validation and write see no concurrent change. */
  async withTaskRelations<T>(projectId: string, operation: () => Promise<T>): Promise<T> {
    await this.requireProject(projectId);
    return withFilePathLock(path.join(this.layout.projectDir(projectId), ".task-relations"), operation);
  }
  /** Removes `task.json` and `context/`; keeps `agent_run_resources.json`. */
  async deleteTask(projectId: string, taskId: string): Promise<ProjectTask | undefined> {
    const task = await this.readTask(projectId, taskId);
    if (!task) return undefined;
    await this.removeTaskFiles(projectId, taskId);
    return task;
  }

  /**
   * The Project's next Task number under the catalog lock (shared by every `project.json` writer). Only
   * `taskKeys.lastNumber` changes: allocation is not an edit of the Project, so `updatedAt` stays.
   */
  private async allocateTaskKey(projectId: string): Promise<string> {
    return this.withProjectsCatalog(async () => {
      const project = await this.readProjectFile(projectId);
      if (!project) throw notFound(projectId);
      const taskKeys = { prefix: project.taskKeys.prefix, lastNumber: project.taskKeys.lastNumber + 1 };
      await writeJsonFile(this.layout.projectFile(projectId), projectFileContent({ ...project, taskKeys }));
      return formatTaskKey(taskKeys.prefix, taskKeys.lastNumber);
    });
  }
  private async removeTaskFiles(projectId: string, taskId: string): Promise<void> {
    await fs.unlink(this.layout.taskFile(projectId, taskId)).catch((e) => { if (e.code !== "ENOENT") throw e; });
    await this.removeDirectory(this.layout.contextDir(projectId, taskId));
    await removeIfEmpty(this.layout.taskDir(projectId, taskId));
  }
  private async removeDirectory(dir: string): Promise<void> {
    try { await this.layout.directory(dir); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return; throw e; }
    // Containment proved above; never follow descendant links.
    await fs.rm(dir, { recursive: true, force: true });
  }
  private async requireProject(projectId: string): Promise<Project> {
    const project = await this.readProject(projectId);
    if (!project) throw notFound(projectId);
    return project;
  }
  private async readRetiredTaskKeyPrefixes(): Promise<string[]> {
    return readRetiredTaskKeyPrefixesFile(await readJsonFile<unknown>(this.layout.retiredTaskKeyPrefixesFile(), null).catch(() => null));
  }
  private async readProjectFile(projectId: string): Promise<Project | null> {
    return readProjectFile(await readJsonFile<unknown>(this.layout.projectFile(projectId), null).catch(() => null), projectId);
  }
  private async readTaskFile(projectId: string, taskId: string): Promise<ProjectTask | null> {
    return readTaskFile(await readJsonFile<unknown>(this.layout.taskFile(projectId, taskId), null).catch(() => null), projectId, taskId);
  }
  private async withProjectsCatalog<T>(operation: () => Promise<T>): Promise<T> {
    await this.assertMigrated();
    await fs.mkdir(this.layout.root, { recursive: true });
    return this.withCommitLock(path.join(this.layout.root, ".projects-catalog"), operation);
  }
  /** A write proven committed is returned even if releasing its lock afterwards fails. */
  private async withCommitLock<T>(file: string, operation: () => Promise<T>): Promise<T> {
    let done = false, result!: T;
    try {
      return await withFilePathLock(file, async () => { result = await operation(); done = true; return result; });
    } catch (error) {
      if (!done) throw error;
      console.warn("Projects data committed; lock finalization failed.", error);
      return result;
    }
  }
  /** Narrow upgrade gate: existence check only; the released file is never read by current code. */
  private async assertMigrated(): Promise<void> {
    try { await fs.access(this.layout.releasedProjectsFile()); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return; throw e; }
    throw new ProjectError("PROJECTS_MIGRATION_PENDING", "Projects data is being upgraded; restart the app to finish. Other features keep working.");
  }
}

let singleton: ProjectStore | null = null;
export const getProjectStore = (): ProjectStore => singleton ??= new ProjectStore();
export const resetProjectStoreForTests = (): void => { singleton = null; };
