import { randomUUID } from "node:crypto";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { workspaceDisplayNameFromRootPath } from "../../workspaces/workspace-path-utils.js";
import type {
  AddProjectWorkspaceCommand,
  CreateProjectCommand,
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
import { getProjectStore, type ProjectStore } from "../stores/project-store.js";

type WorkspaceRegistrationLookup = Pick<WorkspaceManager, "getRegisteredWorkspaceRootPath">;
type ProjectPersistence = Pick<ProjectStore, "listProjects" | "readProject" | "listTasks" | "createProject" | "updateProject" | "deleteProject">;

type ProjectServiceDependencies = {
  store?: ProjectPersistence;
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

const findLinkIndex = (project: Project, workspaceId: string): number => {
  const index = project.workspaces.findIndex((link) => link.workspaceId === workspaceId);
  if (index < 0) {
    throw new ProjectError(
      "WORKSPACE_LINK_NOT_FOUND",
      `Workspace '${workspaceId}' is not linked to project '${project.projectId}'.`,
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
    const views = await Promise.all(records.map((record) => this.toView(record)));
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

    await this.store.createProject(async (records) => {
      assertNameAvailable(records, name);
      created.workspaces = await this.resolveFormLinks(created, command.workspaces ?? []);
      return created;
    });

    return this.toView(created);
  }

  async updateProject(command: UpdateProjectCommand): Promise<ProjectView> {
    const name = normalizeName(command.name);
    const description = normalizeDescription(command.description);

    const updated = await this.updateProjectRecord(command.projectId, async (project, records) => {
      assertNameAvailable(records, name, project.projectId);
      const workspaces = command.workspaces == null ? project.workspaces : await this.resolveFormLinks(project, command.workspaces);
      return { ...project, name, description, workspaces };
    });
    return this.toView(updated);
  }

  /**
   * Removes the Project with its links, drafts and its Tasks' metadata and context.
   * Agent run resources stay, so closed work stays closed. Returns `false` when it does not exist.
   */
  async deleteProject(projectId: string): Promise<boolean> {
    return this.store.deleteProject(projectId);
  }

  async addWorkspaceLink(command: AddProjectWorkspaceCommand): Promise<ProjectView> {
    const workspaceId = command.workspaceId.trim();
    const description = normalizeDescription(command.description);

    const updated = await this.updateProjectRecord(command.projectId, async (project) => {
      if (project.workspaces.some((link) => link.workspaceId === workspaceId)) {
        throw new ProjectError(
          "WORKSPACE_ALREADY_LINKED",
          `Workspace '${workspaceId}' is already linked to this project.`,
        );
      }
      const workspaceRootPath = await this.workspaceLookup.getRegisteredWorkspaceRootPath(workspaceId);
      if (!workspaceRootPath) {
        throw new ProjectError(
          "WORKSPACE_NOT_REGISTERED",
          `Workspace '${workspaceId}' is not a registered workspace.`,
        );
      }
      const link: ProjectWorkspaceLink = {
        workspaceId,
        workspaceRootPath,
        description,
        addedAt: this.nowIso(),
      };
      return { ...project, workspaces: [...project.workspaces, link] };
    });
    return this.toView(updated);
  }

  async updateWorkspaceLink(command: UpdateProjectWorkspaceCommand): Promise<ProjectView> {
    const description = normalizeDescription(command.description);
    const updated = await this.updateProjectRecord(command.projectId, (project) => {
      const index = findLinkIndex(project, command.workspaceId);
      const workspaces = [...project.workspaces];
      workspaces[index] = { ...workspaces[index], description };
      return { ...project, workspaces };
    });
    return this.toView(updated);
  }

  async removeWorkspaceLink(command: RemoveProjectWorkspaceCommand): Promise<ProjectView> {
    const updated = await this.updateProjectRecord(command.projectId, (project) => {
      findLinkIndex(project, command.workspaceId);
      return {
        ...project,
        workspaces: project.workspaces.filter((link) => link.workspaceId !== command.workspaceId),
      };
    });
    return this.toView(updated);
  }

  private async resolveFormLinks(project: Project, rows: ProjectWorkspaceInput[]): Promise<ProjectWorkspaceLink[]> {
    const ids = rows.map((r) => r.workspaceId.trim());
    if (new Set(ids).size !== ids.length) throw new ProjectError("WORKSPACE_ALREADY_LINKED", "Duplicate workspace links are not allowed.");
    return Promise.all(rows.map(async (row, index) => {
      const workspaceId = ids[index];
      const existing = project.workspaces.find((l) => l.workspaceId === workspaceId);
      if (existing) return { ...existing, description: normalizeDescription(row.description) };
      const workspaceRootPath = await this.workspaceLookup.getRegisteredWorkspaceRootPath(workspaceId);
      if (!workspaceRootPath) throw new ProjectError("WORKSPACE_NOT_REGISTERED", `Workspace '${workspaceId}' is not registered.`);
      return {workspaceId, workspaceRootPath, description: normalizeDescription(row.description), addedAt: this.nowIso()};
    }));
  }

  private async updateProjectRecord(
    projectId: string,
    change: (project: Project, records: Project[]) => Project | Promise<Project>,
  ): Promise<Project> {
    return this.store.updateProject(projectId, async (project, all) => ({ ...(await change(project, all)), updatedAt: this.nowIso() }));
  }

  private async toView(project: Project): Promise<ProjectView> {
    const { workspaces: storedLinks, ...fields } = project;
    const tasks = await this.store.listTasks(project.projectId);
    const links = [...storedLinks].sort((left, right) => left.addedAt.localeCompare(right.addedAt));
    const workspaces = await Promise.all(links.map((link) => this.toWorkspaceView(link)));
    return {
      ...fields,
      workspaces,
      taskCount: tasks.length,
      openTaskCount: tasks.filter((task) => task.status !== "DONE").length,
    };
  }

  private async toWorkspaceView(link: ProjectWorkspaceLink): Promise<ProjectWorkspaceView> {
    const registeredRootPath = await this.workspaceLookup.getRegisteredWorkspaceRootPath(link.workspaceId);
    return {
      ...link,
      displayName: workspaceDisplayNameFromRootPath(link.workspaceRootPath),
      availability: registeredRootPath ? "AVAILABLE" : "UNREGISTERED",
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
