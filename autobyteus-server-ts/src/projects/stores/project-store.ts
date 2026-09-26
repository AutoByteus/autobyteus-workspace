import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonArrayFile, updateJsonArrayFile } from "../../persistence/file/store-utils.js";
import type { Project, ProjectTask, ProjectTaskStatus, ProjectWorkspaceLink } from "../domain/models.js";

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
const normalizeRecords = (rows: unknown[]): Project[] =>
  rows.filter(isValidProject).map((project) => ({
    ...project,
    workspaces: project.workspaces.filter(isValidLink),
    tasks: Array.isArray(project.tasks) ? project.tasks.filter(isValidTask) : [],
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
    return updateJsonArrayFile<Project>(this.getFilePath(), async (rows) =>
      updater(normalizeRecords(rows)),
    );
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
