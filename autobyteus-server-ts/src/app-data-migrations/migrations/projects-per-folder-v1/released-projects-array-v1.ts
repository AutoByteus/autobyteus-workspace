/**
 * FROZEN copy of the released (`10fb69504`) Projects source shapes: the `projects.json` row filter and
 * normalizers from `project-store.ts`, the context-filename rule, and `segment()` from
 * `project-task-context-layout.ts`. Only the `projects-per-folder-v1` migration reads the released
 * layout; current runtime code never imports this file. Do not change it to follow current shapes.
 */
export type ReleasedContextFile = { storedFilename: string; displayName: string; mimeType: string; sizeBytes: number };
export type ReleasedWorkspaceLink = { workspaceId: string; workspaceRootPath: string; description: string; addedAt: string };
export type ReleasedTask = {
  taskId: string; description: string; status: "TODO" | "IN_PROGRESS" | "DONE";
  createdAt: string; updatedAt: string; contextFiles: ReleasedContextFile[];
};
export type ReleasedProject = {
  projectId: string; name: string; description: string; createdAt: string; updatedAt: string;
  workspaces: ReleasedWorkspaceLink[]; tasks: unknown[];
};

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const STATUSES = new Set(["TODO", "IN_PROGRESS", "DONE"]);

export const isReleasedContextFilename = (name: unknown): name is string =>
  typeof name === "string" && /^ctx_[a-zA-Z0-9_-]+__[a-zA-Z0-9._-]+$/.test(name);

const isValidLink = (link: unknown): link is ReleasedWorkspaceLink => {
  const c = link as Partial<ReleasedWorkspaceLink> | null;
  return Boolean(c) && isNonEmptyString(c?.workspaceId) && isNonEmptyString(c?.workspaceRootPath)
    && typeof c?.description === "string" && isNonEmptyString(c?.addedAt);
};

/** Released `isValidProject` (row-level; `tasks` optional). */
export const isReleasedProjectRow = (row: unknown): row is ReleasedProject => {
  const c = row as Partial<ReleasedProject> | null;
  return Boolean(c) && isNonEmptyString(c?.projectId) && isNonEmptyString(c?.name) && typeof c?.description === "string"
    && isNonEmptyString(c?.createdAt) && isNonEmptyString(c?.updatedAt) && Array.isArray(c?.workspaces);
};
/** Released `isValidTask`. */
export const isReleasedTask = (task: unknown): task is Omit<ReleasedTask, "contextFiles"> & { contextFiles?: unknown } => {
  const c = task as Partial<ReleasedTask> | null;
  return Boolean(c) && isNonEmptyString(c?.taskId) && isNonEmptyString(c?.description) && STATUSES.has(c?.status as string)
    && isNonEmptyString(c?.createdAt) && isNonEmptyString(c?.updatedAt);
};
/** The unshipped dev `{taskLifetimes}` row written by pre-release ticket builds: known residue, not a Project. */
export const isDevLifetimeResidueRow = (row: unknown): boolean =>
  Boolean(row) && typeof row === "object" && !Array.isArray(row) && Object.hasOwn(row as object, "taskLifetimes")
  && !Object.hasOwn(row as object, "projectId");

const normalizeContextFiles = (files: unknown): ReleasedContextFile[] =>
  Array.isArray(files) ? files.filter((f) => f && isReleasedContextFilename(f.storedFilename)
    && typeof f.displayName === "string" && typeof f.mimeType === "string"
    && Number.isSafeInteger(f.sizeBytes) && f.sizeBytes >= 0).map((f) => ({
      storedFilename: f.storedFilename, displayName: f.displayName, mimeType: f.mimeType, sizeBytes: f.sizeBytes,
    })) : [];

/** Released normalization of a valid row's known fields. */
export const normalizeReleasedProject = (row: ReleasedProject): Omit<ReleasedProject, "tasks"> => ({
  projectId: row.projectId, name: row.name, description: row.description, createdAt: row.createdAt, updatedAt: row.updatedAt,
  workspaces: row.workspaces.filter(isValidLink).map((l) => ({
    workspaceId: l.workspaceId, workspaceRootPath: l.workspaceRootPath, description: l.description, addedAt: l.addedAt })),
});
export const normalizeReleasedTask = (task: Omit<ReleasedTask, "contextFiles"> & { contextFiles?: unknown }): ReleasedTask => ({
  taskId: task.taskId, description: task.description, status: task.status, createdAt: task.createdAt, updatedAt: task.updatedAt,
  contextFiles: normalizeContextFiles(task.contextFiles),
});

/** Released `segment()`: the encoded folder name, or `null` where the released code would have thrown. */
export const releasedSegment = (value: unknown): string | null =>
  typeof value !== "string" || !value.trim() || value === "." || value === ".." || /[\\/\0]/.test(value) ? null : encodeURIComponent(value);
/** Released draft-id rule. */
export const isReleasedDraftId = (value: string): boolean => /^[a-f0-9-]{36}$/.test(value);
