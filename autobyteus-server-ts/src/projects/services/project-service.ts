import path from "node:path";
import { randomUUID } from "node:crypto";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { canonicalizeWorkspaceRootPath, workspaceDisplayNameFromRootPath } from "../../workspaces/workspace-path-utils.js";
import type {
  AddProjectWorkspaceCommand,
  CreateProjectCommand,
  PatchProjectCommand,
  Project,
  ProjectView,
  ProjectWorkspaceLink,
  ProjectWorkspaceView,
  ProjectWorkspaceInput,
  RemoveProjectWorkspaceCommand,
  UpdateProjectCommand,
  UpdateProjectWorkspaceCommand,
} from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import { isTerminalTaskStatus } from "../domain/task-status.js";
import { getProjectStore, type ProjectStore } from "../stores/project-store.js";
import { getProjectChangePublisher, type ProjectChangeMarks } from "../changes/project-change-publisher.js";

type WorkspaceRegistrationLookup = Pick<WorkspaceManager, "listRegisteredWorkspaceRootPaths">;
type ProjectPersistence = Pick<ProjectStore, "listProjects" | "readProject" | "listTasks" | "createProject" | "updateProject" | "deleteProject">;

type ProjectServiceDependencies = {
  store?: ProjectPersistence;
  /** Told after each committed Project write (the `/ws/projects` feed); defaults to the process publisher. */
  changes?: Pick<ProjectChangeMarks, "projectChanged" | "projectRemoved">;
  workspaceLookup?: WorkspaceRegistrationLookup;
  now?: () => Date;
  createId?: () => string;
};

const normalizeName = (name: string | null | undefined): string => {
  const normalized = (name ?? "").trim();
  if (!normalized) {
    throw new ProjectError("PROJECT_NAME_REQUIRED", "Project name is required.");
  }
  return normalized;
};

const normalizeDescription = (description: string | null | undefined): string =>
  (description ?? "").trim();

/** Metadata reference validation only: never resolve symlinks, inspect or create a folder. */
const normalizeWorkspacePath = (input: string): string => {
  if (typeof input !== "string" || !input.trim() || input.includes("\0") || !path.isAbsolute(input.trim())) {
    throw new ProjectError("WORKSPACE_PATH_INVALID", "Workspace path must be an absolute folder path on this node (without NUL characters).");
  }
  return canonicalizeWorkspaceRootPath(input);
};

const nameKey = (name: string): string => name.toLocaleLowerCase();

const compareByName = (left: Pick<ProjectView, "name" | "projectId">, right: Pick<ProjectView, "name" | "projectId">): number => {
  const byKey = nameKey(left.name).localeCompare(nameKey(right.name));
  return byKey !== 0 ? byKey : left.projectId.localeCompare(right.projectId);
};

const assertNameAvailable = (records: Project[], name: string, exceptProjectId?: string): void => {
  const key = nameKey(name);
  const taken = records.some(
    (record) => record.projectId !== exceptProjectId && nameKey(record.name) === key,
  );
  if (taken) {
    throw new ProjectError("PROJECT_NAME_TAKEN", `A project named '${name}' already exists.`);
  }
};

const findLinkIndex = (project: Project, workspaceRootPath: string): number => {
  const index = project.workspaces.findIndex((link) => link.workspaceRootPath === workspaceRootPath);
  if (index < 0) {
    throw new ProjectError(
      "WORKSPACE_LINK_NOT_FOUND",
      `Workspace '${workspaceRootPath}' is not linked to project '${project.projectId}'.`,
    );
  }
  return index;
};

/**
 * Governing owner of Project invariants: name normalisation and uniqueness,
 * identity/timestamps, workspace-link validation, and read-time availability.
 * Every validation that depends on stored Projects runs inside the store's
 * serialized Project write, so a rejected change never writes.
 */
export class ProjectService {
  constructor(private readonly deps: ProjectServiceDependencies = {}) {}

  private get store(): ProjectPersistence {
    return this.deps.store ?? getProjectStore();
  }

  private get changes(): Pick<ProjectChangeMarks, "projectChanged" | "projectRemoved"> {
    return this.deps.changes ?? getProjectChangePublisher();
  }

  private get workspaceLookup(): WorkspaceRegistrationLookup {
    return this.deps.workspaceLookup ?? getWorkspaceManager();
  }

  private nowIso(): string {
    return (this.deps.now?.() ?? new Date()).toISOString();
  }

  private createProjectId(): string {
    return this.deps.createId?.() ?? `project_${randomUUID()}`;
  }

  async listProjects(): Promise<ProjectView[]> {
    const records = await this.store.listProjects();
    const registeredRoots = await this.registeredRootsFor(records);
    const views = await Promise.all(records.map((record) => this.toView(record, registeredRoots)));
    return views.sort(compareByName);
  }

  async listProjectSummaries(): Promise<Array<Pick<ProjectView, "projectId" | "name" | "description">>> {
    return (await this.store.listProjects()).map(({projectId, name, description}) => ({projectId, name, description})).sort(compareByName);
  }

  async getProject(projectId: string): Promise<ProjectView | null> {
    const record = await this.store.readProject(projectId);
    return record ? this.toView(record) : null;
  }

  async createProject(command: CreateProjectCommand): Promise<ProjectView> {
    return this.toView(await this.createProjectRecord(command));
  }

  /** Returns the committed record without Task or availability enrichment. */
  async createProjectRecord(command: CreateProjectCommand): Promise<Project> {
    const name = normalizeName(command.name);
    const description = normalizeDescription(command.description);
    const timestamp = this.nowIso();
    const created: Project = {
      projectId: this.createProjectId(),
      name,
      description,
      createdAt: timestamp,
      updatedAt: timestamp,
      workspaces: [],
    };

    const committed = await this.store.createProject(async (records) => {
      assertNameAvailable(records, name);
      created.workspaces = this.resolveWorkspaceLinks(created, command.workspaces ?? [], "clear");
      return created;
    });
    this.changes.projectChanged(committed.projectId);
    return committed;
  }

  async updateProject(command: UpdateProjectCommand): Promise<ProjectView> {
    const name = normalizeName(command.name);
    const description = normalizeDescription(command.description);

    const updated = await this.updateProjectRecord(command.projectId, async (project, records) => {
      assertNameAvailable(records, name, project.projectId);
      const workspaces = command.workspaces == null ? project.workspaces : this.resolveWorkspaceLinks(project, command.workspaces, "clear");
      return { ...project, name, description, workspaces };
    });
    return this.toView(updated);
  }

  /** Merge against the current record under the existing catalog write lock. */
  async patchProjectRecord(command: PatchProjectCommand): Promise<Project> {
    if (command.name === undefined && command.description === undefined && command.workspaces === undefined) {
      throw new ProjectError("PROJECT_PATCH_REQUIRED", "Supply name, description and/or workspaces to update a Project.");
    }
    return this.updateProjectRecord(command.projectId, async (project, records) => {
      const name = command.name === undefined ? project.name : normalizeName(command.name);
      const description = command.description === undefined ? project.description : normalizeDescription(command.description);
      assertNameAvailable(records, name, project.projectId);
      const workspaces = command.workspaces === undefined
        ? project.workspaces
        : this.resolveWorkspaceLinks(project, command.workspaces, "preserve");
      return { ...project, name, description, workspaces };
    });
  }

  /**
   * Removes the Project with its links, drafts and its Tasks' metadata and context.
   * Agent run resources stay, so closed work stays closed. Returns `false` when it does not exist.
   */
  async deleteProject(projectId: string): Promise<boolean> {
    const deleted = await this.store.deleteProject(projectId);
    if (deleted) this.changes.projectRemoved(projectId);
    return deleted;
  }

  async addWorkspaceLink(command: AddProjectWorkspaceCommand): Promise<ProjectView> {
    const workspaceRootPath = normalizeWorkspacePath(command.workspaceRootPath);
    const description = normalizeDescription(command.description);

    const updated = await this.updateProjectRecord(command.projectId, async (project) => {
      if (project.workspaces.some((link) => link.workspaceRootPath === workspaceRootPath)) {
        throw new ProjectError(
          "WORKSPACE_ALREADY_LINKED",
          `Workspace '${workspaceRootPath}' is already linked to this project.`,
        );
      }
      const link: ProjectWorkspaceLink = { workspaceRootPath, description };
      return { ...project, workspaces: [...project.workspaces, link] };
    });
    return this.toView(updated);
  }

  async updateWorkspaceLink(command: UpdateProjectWorkspaceCommand): Promise<ProjectView> {
    const workspaceRootPath = normalizeWorkspacePath(command.workspaceRootPath);
    const description = normalizeDescription(command.description);
    const updated = await this.updateProjectRecord(command.projectId, (project) => {
      const index = findLinkIndex(project, workspaceRootPath);
      const workspaces = [...project.workspaces];
      workspaces[index] = { ...workspaces[index], description };
      return { ...project, workspaces };
    });
    return this.toView(updated);
  }

  async removeWorkspaceLink(command: RemoveProjectWorkspaceCommand): Promise<ProjectView> {
    const workspaceRootPath = normalizeWorkspacePath(command.workspaceRootPath);
    const updated = await this.updateProjectRecord(command.projectId, (project) => {
      findLinkIndex(project, workspaceRootPath);
      return {
        ...project,
        workspaces: project.workspaces.filter((link) => link.workspaceRootPath !== workspaceRootPath),
      };
    });
    return this.toView(updated);
  }

  private resolveWorkspaceLinks(
    project: Project, rows: ProjectWorkspaceInput[], omittedDescription: "clear" | "preserve",
  ): ProjectWorkspaceLink[] {
    const paths = rows.map((row) => normalizeWorkspacePath(row.workspaceRootPath));
    if (new Set(paths).size !== paths.length) throw new ProjectError("WORKSPACE_ALREADY_LINKED", "Duplicate workspace links are not allowed.");
    return rows.map((row, index) => {
      const workspaceRootPath = paths[index];
      const existing = project.workspaces.find((link) => link.workspaceRootPath === workspaceRootPath);
      return { workspaceRootPath, description: existing && omittedDescription === "preserve" && row.description === undefined
        ? existing.description : normalizeDescription(row.description) };
    });
  }

  private async updateProjectRecord(
    projectId: string,
    change: (project: Project, records: Project[]) => Project | Promise<Project>,
  ): Promise<Project> {
    const updated = await this.store.updateProject(projectId, async (project, all) => ({ ...(await change(project, all)), updatedAt: this.nowIso() }));
    this.changes.projectChanged(updated.projectId);
    return updated;
  }

  private async registeredRootsFor(projects: Project[]): Promise<Set<string>> {
    return new Set(projects.some((project) => project.workspaces.length > 0)
      ? await this.workspaceLookup.listRegisteredWorkspaceRootPaths() : []);
  }

  private async toView(project: Project, registeredRoots?: Set<string>): Promise<ProjectView> {
    const { workspaces: storedLinks, ...fields } = project;
    const tasks = await this.store.listTasks(project.projectId);
    const roots = registeredRoots ?? await this.registeredRootsFor([project]);
    const workspaces: ProjectWorkspaceView[] = storedLinks.map((link) => ({
      ...link,
      displayName: workspaceDisplayNameFromRootPath(link.workspaceRootPath),
      availability: roots.has(link.workspaceRootPath) ? "AVAILABLE" : "UNREGISTERED",
    }));
    return {
      ...fields,
      workspaces,
      taskCount: tasks.length,
      openTaskCount: tasks.filter((task) => !isTerminalTaskStatus(task.status)).length,
    };
  }
}

let singleton: ProjectService | null = null;

export const getProjectService = (): ProjectService => {
  singleton ??= new ProjectService();
  return singleton;
};

export const resetProjectServiceForTests = (): void => {
  singleton = null;
};
