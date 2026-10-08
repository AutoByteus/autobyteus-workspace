/**
 * Frozen Project target reader/types from project-store.ts and domain/models.ts at
 * 5316a0cad19498819a8a50c594b72c0197d8b6a1 (before path-only associations).
 * Keeps projects-per-folder-v1 equality, conflict and retry classification stable.
 * Historical knowledge belongs only to this migration; do not import current Project types.
 */
/** A workspace link as persisted inside a Project record. */
export interface ReleasedProjectWorkspaceLink {
  workspaceId: string;
  /** Root path snapshot taken when the link was created. */
  workspaceRootPath: string;
  description: string;
  addedAt: string;
}

/** A Project as persisted in `<appDataDir>/projects/<projectId>/project.json`; its Tasks live in their own folders. */
export interface ReleasedProject {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workspaces: ReleasedProjectWorkspaceLink[];
}


const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isValidLink = (link: unknown): link is ReleasedProjectWorkspaceLink => {
  const c = link as Partial<ReleasedProjectWorkspaceLink> | null;
  return Boolean(c) && isNonEmptyString(c?.workspaceId) && isNonEmptyString(c?.workspaceRootPath)
    && typeof c?.description === "string" && isNonEmptyString(c?.addedAt);
};

/** Frozen released reader of `project.json`: known fields only; an invalid file is not a Project. */
export const readReleasedProjectFolderV1 = (raw: unknown, projectId: string): ReleasedProject | null => {
  const c = raw as Partial<ReleasedProject> | null;
  if (!c || c.projectId !== projectId || !isNonEmptyString(c.name) || typeof c.description !== "string"
    || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt) || !Array.isArray(c.workspaces)) return null;
  return { projectId, name: c.name, description: c.description, createdAt: c.createdAt, updatedAt: c.updatedAt,
    workspaces: c.workspaces.filter(isValidLink).map((l) => ({
      workspaceId: l.workspaceId, workspaceRootPath: l.workspaceRootPath, description: l.description, addedAt: l.addedAt })) };
};

/*
 * Frozen Task target reader from project-store.ts (`readTaskFile`), domain/models.ts and
 * domain/project-task-context.ts at 3a2496c95b16b0f7e0cedc7afdf615ada00b2267 (before the CLOSED
 * status). Keeps the Task CURRENT/CONFLICT classification and post-write validation stable.
 */
/** A saved Task context file as persisted inside a released Task record. */
export interface ReleasedFolderTaskContextFile {
  storedFilename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
}

/** A Task as persisted in `<projectId>/tasks/<taskId>/task.json` by the released per-folder layout. */
export interface ReleasedFolderTask {
  taskId: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  contextFiles?: ReleasedFolderTaskContextFile[];
  createdAt: string;
  updatedAt: string;
}

const RELEASED_TASK_STATUSES: ReadonlySet<string> = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const isReleasedContextFilename = (name: unknown): name is string =>
  typeof name === "string" && /^ctx_[a-zA-Z0-9_-]+__[a-zA-Z0-9._-]+$/.test(name);
const normalizeReleasedContextFiles = (files: unknown): ReleasedFolderTaskContextFile[] =>
  Array.isArray(files) ? files.filter((f) => f && isReleasedContextFilename(f.storedFilename)
    && typeof f.displayName === "string" && typeof f.mimeType === "string"
    && Number.isSafeInteger(f.sizeBytes) && f.sizeBytes >= 0).map((f) => ({
      storedFilename: f.storedFilename, displayName: f.displayName, mimeType: f.mimeType, sizeBytes: f.sizeBytes,
    })) : [];

/** Frozen released reader of `task.json`; its ids must match its folders. */
export const readReleasedTaskFileV1 = (raw: unknown, projectId: string, taskId: string): ReleasedFolderTask | null => {
  const c = raw as (Partial<ReleasedFolderTask> & { projectId?: unknown }) | null;
  if (!c || c.taskId !== taskId || c.projectId !== projectId || !isNonEmptyString(c.description)
    || !RELEASED_TASK_STATUSES.has(c.status as string) || !isNonEmptyString(c.createdAt) || !isNonEmptyString(c.updatedAt)) return null;
  return { taskId, description: c.description, status: c.status as ReleasedFolderTask["status"], createdAt: c.createdAt, updatedAt: c.updatedAt,
    contextFiles: normalizeReleasedContextFiles(c.contextFiles) };
};
