import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonArrayFile, updateJsonArrayFile } from "../../persistence/file/store-utils.js";
import type { Project, ProjectTask, ProjectTaskStatus, ProjectWorkspaceLink } from "../domain/models.js";

import { isSafeContextFilename, type ProjectTaskContextFile } from "../domain/project-task-context.js";

type AppConfigLike = {
  getAppDataDir(): string;
};

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
const normalizeRecords = (rows: unknown[]): Project[] =>
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

/**
 * Persistence for Project records. Reads and locked atomic updates of
 * `<appDataDir>/projects/projects.json`; malformed rows are dropped.
 * Holds no business rules.
 */
export class ProjectStore {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  getFilePath(): string {
    return path.join(this.config.getAppDataDir(), "projects", "projects.json");
  }

  async listRecords(): Promise<Project[]> {
    return normalizeRecords(await readJsonArrayFile<unknown>(this.getFilePath()));
  }

  /**
   * Runs `updater` under the file lock and persists its result atomically.
   * A throwing updater aborts the write and leaves the previous file intact.
   */
  async updateRecords(
    updater: (records: Project[]) => Project[] | Promise<Project[]>,
  ): Promise<Project[]> {
    let committed: Project[] | undefined;
    try {
      return await updateJsonArrayFile<Project>(this.getFilePath(), async (rows) =>
        normalizeRecords(await updater(normalizeRecords(rows))),
        (rows) => { committed = rows; },
      );
    } catch (error) {
      if (!committed) throw error;
      console.warn("Project metadata committed; lock finalization failed.", error);
      return committed;
    }
  }
}

let singleton: ProjectStore | null = null;

export const getProjectStore = (): ProjectStore => {
  singleton ??= new ProjectStore();
  return singleton;
};

export const resetProjectStoreForTests = (): void => {
  singleton = null;
};
