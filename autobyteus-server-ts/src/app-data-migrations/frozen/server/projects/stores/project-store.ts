import type { Project, ProjectTask, ProjectTaskComment, ProjectTaskKeys, ProjectWorkspaceLink } from "../domain/models.js";
import { isProjectTaskStatus } from "../domain/task-status.js";
import { isSafeContextFilename, type ProjectTaskContextFile } from "../domain/project-task-context.js";

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
/** Absent means no dependencies; only Task ID strings are kept. */
const normalizeDependsOn = (ids: unknown): string[] => Array.isArray(ids) ? ids.filter(isNonEmptyString) : [];
/** Absent means no comments; only well-formed entries are kept, in ID order. */
const normalizeComments = (comments: unknown): ProjectTaskComment[] => Array.isArray(comments)
  ? comments.filter((c) => c && Number.isSafeInteger(c.id) && c.id > 0 && isNonEmptyString(c.createdAt) && isNonEmptyString(c.text))
    .map((c) => ({ id: c.id, createdAt: c.createdAt, text: c.text })).sort((a, b) => a.id - b.id) : [];

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
/** Current tolerant reader of `task.json`; its ids must match its folders. An absent `partOfTaskId` means no parent, absent `comments` none. */
export const readTaskFile = (raw: unknown, projectId: string, taskId: string): ProjectTask | null => {
  const c = raw as (Partial<ProjectTask> & { projectId?: unknown }) | null;
  if (!c || c.taskId !== taskId || c.projectId !== projectId || !isNonEmptyString(c.taskKey) || !isNonEmptyString(c.description)
    || !isProjectTaskStatus(c.status) || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt)) return null;
  return { taskId, taskKey: c.taskKey, description: c.description, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt,
    contextFiles: normalizeContextFiles(c.contextFiles), dependsOnTaskIds: normalizeDependsOn(c.dependsOnTaskIds),
    partOfTaskId: isNonEmptyString(c.partOfTaskId) ? c.partOfTaskId : null, comments: normalizeComments(c.comments) };
};
