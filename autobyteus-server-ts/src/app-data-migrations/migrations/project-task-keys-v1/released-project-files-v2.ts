/**
 * FROZEN copy of the released per-folder Projects readers: `readProjectFile` / `readTaskFile` from
 * `projects/stores/project-store.ts`, with the types from `projects/domain/models.ts`,
 * `task-status.ts` and the context-filename rule from `project-task-context.ts`, at
 * c600028072 (path-only workspace links; statuses TODO / IN_PROGRESS / DONE / CANCELLED; no Task keys).
 * Only `project-task-keys-v1` reads these shapes, to classify its candidates; current runtime code never
 * imports this file. Do not change it to follow current shapes.
 */
export interface ReleasedProjectWorkspaceLinkV2 {
  workspaceRootPath: string;
  description: string;
}

export interface ReleasedProjectV2 {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workspaces: ReleasedProjectWorkspaceLinkV2[];
}

export interface ReleasedTaskContextFileV2 {
  storedFilename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ReleasedProjectTaskV2 {
  taskId: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  contextFiles?: ReleasedTaskContextFileV2[];
  createdAt: string;
  updatedAt: string;
}

const RELEASED_TASK_STATUSES: ReadonlySet<unknown> = new Set(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isReleasedContextFilename = (name: unknown): name is string =>
  typeof name === "string" && /^ctx_[a-zA-Z0-9_-]+__[a-zA-Z0-9._-]+$/.test(name);
const isValidLink = (link: unknown): link is ReleasedProjectWorkspaceLinkV2 => {
  const c = link as Partial<ReleasedProjectWorkspaceLinkV2> | null;
  return Boolean(c) && isNonEmptyString(c?.workspaceRootPath)
    && typeof c?.description === "string";
};
const normalizeContextFiles = (files: unknown): ReleasedTaskContextFileV2[] =>
  Array.isArray(files) ? files.filter((f) => f && isReleasedContextFilename(f.storedFilename)
    && typeof f.displayName === "string" && typeof f.mimeType === "string"
    && Number.isSafeInteger(f.sizeBytes) && f.sizeBytes >= 0).map((f) => ({
      storedFilename: f.storedFilename, displayName: f.displayName, mimeType: f.mimeType, sizeBytes: f.sizeBytes,
    })) : [];

/** Frozen released reader of `project.json`: known fields only; an invalid file is not a Project. */
export const readReleasedProjectFileV2 = (raw: unknown, projectId: string): ReleasedProjectV2 | null => {
  const c = raw as Partial<ReleasedProjectV2> | null;
  if (!c || c.projectId !== projectId || !isNonEmptyString(c.name) || typeof c.description !== "string"
    || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt) || !Array.isArray(c.workspaces)) return null;
  return { projectId, name: c.name, description: c.description, createdAt: c.createdAt, updatedAt: c.updatedAt,
    workspaces: c.workspaces.filter(isValidLink).map((l) => ({
      workspaceRootPath: l.workspaceRootPath, description: l.description })) };
};

/** Frozen released reader of `task.json`; its ids must match its folders. */
export const readReleasedTaskFileV2 = (raw: unknown, projectId: string, taskId: string): ReleasedProjectTaskV2 | null => {
  const c = raw as (Partial<ReleasedProjectTaskV2> & { projectId?: unknown }) | null;
  if (!c || c.taskId !== taskId || c.projectId !== projectId || !isNonEmptyString(c.description)
    || !RELEASED_TASK_STATUSES.has(c.status) || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt)) return null;
  return { taskId, description: c.description, status: c.status as ReleasedProjectTaskV2["status"], createdAt: c.createdAt, updatedAt: c.updatedAt,
    contextFiles: normalizeContextFiles(c.contextFiles) };
};
