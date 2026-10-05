import type { Project, ProjectTask, ProjectTaskStatus, ProjectWorkspaceLink } from "../domain/models.js";
import { isSafeContextFilename, type ProjectTaskContextFile } from "../domain/project-task-context.js";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isValidLink = (link: unknown): link is ProjectWorkspaceLink => {
  const candidate = link as Partial<ProjectWorkspaceLink> | null;
  return Boolean(candidate)
    && isNonEmptyString(candidate?.workspaceId)
    && isNonEmptyString(candidate?.workspaceRootPath)
    && typeof candidate?.description === "string"
    && isNonEmptyString(candidate?.addedAt);
};

const PROJECT_TASK_STATUSES: ReadonlySet<ProjectTaskStatus> = new Set(["TODO", "IN_PROGRESS", "DONE"]);

const isValidTask = (task: unknown): task is ProjectTask => {
  const candidate = task as Partial<ProjectTask> | null;
  return Boolean(candidate)
    && isNonEmptyString(candidate?.taskId)
    && isNonEmptyString(candidate?.description)
    && PROJECT_TASK_STATUSES.has(candidate?.status as ProjectTaskStatus)
    && isNonEmptyString(candidate?.createdAt)
    && isNonEmptyString(candidate?.updatedAt);
};

type StoredProjectRow = Omit<Project, "tasks"> & { tasks?: unknown };

const isValidProject = (record: unknown): record is StoredProjectRow => {
  const candidate = record as Partial<StoredProjectRow> | null;
  return Boolean(candidate)
    && isNonEmptyString(candidate?.projectId)
    && isNonEmptyString(candidate?.name)
    && typeof candidate?.description === "string"
    && isNonEmptyString(candidate?.createdAt)
    && isNonEmptyString(candidate?.updatedAt)
    && Array.isArray(candidate?.workspaces);
};

/**
 * Projects each valid row onto the current model. A row without a `tasks` array
 * (for example one written before Tasks existed) has no Tasks.
 */
const normalizeContextFiles = (files: unknown): ProjectTaskContextFile[] =>
  Array.isArray(files) ? files.filter((f) => f && isSafeContextFilename(f.storedFilename)
    && typeof f.displayName === "string" && typeof f.mimeType === "string"
    && Number.isSafeInteger(f.sizeBytes) && f.sizeBytes >= 0).map((f) => ({
      storedFilename: f.storedFilename, displayName: f.displayName, mimeType: f.mimeType, sizeBytes: f.sizeBytes,
    })) : [];
export const normalizeProjects = (rows: unknown[]): Project[] =>
  rows.filter(isValidProject).map((p) => ({
    projectId: p.projectId, name: p.name, description: p.description, createdAt: p.createdAt, updatedAt: p.updatedAt,
    workspaces: p.workspaces.filter(isValidLink).map((l) => ({
      workspaceId: l.workspaceId, workspaceRootPath: l.workspaceRootPath, description: l.description, addedAt: l.addedAt,
    })),
    tasks: Array.isArray(p.tasks) ? p.tasks.filter(isValidTask).map((t) => ({
      taskId: t.taskId, description: t.description, status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt,
      contextFiles: normalizeContextFiles(t.contextFiles),
    })) : [],
  }));

