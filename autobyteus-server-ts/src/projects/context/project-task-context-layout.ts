import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { assertContainedContextFile } from "../../context-files/services/context-file-path-validation.js";
import { ProjectError } from "../domain/project-errors.js";
import { isSafeContextFilename } from "../domain/project-task-context.js";

const segment = (value: string): string => {
  if (typeof value !== "string" || !value.trim() || value === "." || value === ".." || /[\\/\0]/.test(value)) {
    throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid context owner identity.");
  }
  return encodeURIComponent(value);
};
export class ProjectTaskContextLayout {
  constructor(readonly root = path.join(appConfigProvider.config.getAppDataDir(), "projects")) {}
  draftDir(projectId: string, draftId: string): string {
    if (!/^[a-f0-9-]{36}$/.test(draftId)) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid draft identity.");
    return path.join(this.root, "task_context_drafts", segment(projectId), draftId);
  }
  taskDir(projectId: string, taskId: string): string {
    return path.join(this.root, "task_context_files", segment(projectId), segment(taskId));
  }
  projectDir(projectId: string, kind: "task_context_drafts" | "task_context_files"): string {
    return path.join(this.root, kind, segment(projectId));
  }
  file(dir: string, name: string): string {
    if (!isSafeContextFilename(name)) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid context filename.");
    return path.join(dir, name);
  }
  /** Configured root may redirect; no descendant directory may do so, even during writes/cleanup. */
  async directory(dir: string, create = false): Promise<void> {
    const relative = path.relative(this.root, dir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid context directory.");
    if (create) await fs.mkdir(this.root, { recursive: true });
    const realRoot = await fs.realpath(this.root);
    let current = this.root;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if (create) await fs.mkdir(current).catch((e) => { if (e.code !== "EEXIST") throw e; });
      const stat = await fs.lstat(current);
      const actual = await fs.realpath(current);
      if (!stat.isDirectory() || stat.isSymbolicLink() || actual !== path.resolve(realRoot, path.relative(this.root, current))) {
        throw new ProjectError("TASK_CONTEXT_INVALID", "Context directory is unavailable.");
      }
    }
  }
  async regular(file: string): Promise<void> { await assertContainedContextFile(this.root, file); }
}
