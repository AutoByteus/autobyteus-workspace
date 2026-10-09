import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { assertContainedContextFile } from "../../context-files/services/context-file-path-validation.js";
import { ProjectError } from "../domain/project-errors.js";
import { isSafeContextFilename } from "../domain/project-task-context.js";

/** Safe-segment rule for an id used as a folder name: no separators, NUL or dot segments; encoded. */
export const isSafeSegment = (value: unknown): value is string =>
  typeof value === "string" && Boolean(value.trim()) && value !== "." && value !== ".." && !/[\\/\0]/.test(value);
/** The encoded folder name of an id; rejects unsafe ids. */
export const segment = (value: string): string => {
  if (!isSafeSegment(value)) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid Project or Task identity.");
  return encodeURIComponent(value);
};
/** The id a folder name stands for, when it is a valid encoded segment. */
export const idOfSegmentFolder = (name: string): string | null => {
  try {
    const id = decodeURIComponent(name);
    return isSafeSegment(id) && encodeURIComponent(id) === name ? id : null;
  } catch { return null; }
};
const DRAFT_ID = /^[a-f0-9-]{36}$/;

/**
 * The single path owner for `<appData>/projects/`:
 * `<projectId>/project.json`, `<projectId>/drafts/<draftId>/`,
 * `<projectId>/tasks/<taskId>/{task.json, context/, agent_run_resources.json}`.
 */
export class ProjectsLayout {
  constructor(readonly root = path.join(appConfigProvider.config.getAppDataDir(), "projects")) {}

  /** The released single-file source; current code only tests that it exists (migration gate). */
  releasedProjectsFile(): string { return path.join(this.root, "projects.json"); }

  projectDir(projectId: string): string { return path.join(this.root, segment(projectId)); }
  projectFile(projectId: string): string { return path.join(this.projectDir(projectId), "project.json"); }
  draftsDir(projectId: string): string { return path.join(this.projectDir(projectId), "drafts"); }
  draftDir(projectId: string, draftId: string): string {
    if (!DRAFT_ID.test(draftId)) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid draft identity.");
    return path.join(this.draftsDir(projectId), draftId);
  }
  isDraftId(value: string): boolean { return DRAFT_ID.test(value); }
  tasksDir(projectId: string): string { return path.join(this.projectDir(projectId), "tasks"); }
  taskDir(projectId: string, taskId: string): string { return path.join(this.tasksDir(projectId), segment(taskId)); }
  taskFile(projectId: string, taskId: string): string { return path.join(this.taskDir(projectId, taskId), "task.json"); }
  contextDir(projectId: string, taskId: string): string { return path.join(this.taskDir(projectId, taskId), "context"); }
  taskExecutionResourcesFile(projectId: string, taskId: string): string {
    return path.join(this.taskDir(projectId, taskId), "agent_run_resources.json");
  }
  /** The id a folder name stands for, when it is a valid encoded segment. */
  idOfFolder(name: string): string | null { return idOfSegmentFolder(name); }

  file(dir: string, name: string): string {
    if (!isSafeContextFilename(name)) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid context filename.");
    return path.join(dir, name);
  }
  /** Configured root may redirect; no descendant directory may do so, even during writes/cleanup. */
  async directory(dir: string, create = false): Promise<void> {
    const relative = path.relative(this.root, dir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid Projects directory.");
    if (create) await fs.mkdir(this.root, { recursive: true });
    const realRoot = await fs.realpath(this.root);
    let current = this.root;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if (create) await fs.mkdir(current).catch((e) => { if (e.code !== "EEXIST") throw e; });
      const stat = await fs.lstat(current);
      const actual = await fs.realpath(current);
      if (!stat.isDirectory() || stat.isSymbolicLink() || actual !== path.resolve(realRoot, path.relative(this.root, current))) {
        throw new ProjectError("TASK_CONTEXT_INVALID", "Projects directory is unavailable.");
      }
    }
  }
  async regular(file: string): Promise<void> { await assertContainedContextFile(this.root, file); }
}
