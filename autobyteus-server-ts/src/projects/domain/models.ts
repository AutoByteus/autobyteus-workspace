/** A workspace link as persisted inside a Project record. */
export interface ProjectWorkspaceLink {
  workspaceId: string;
  /** Root path snapshot taken when the link was created. */
  workspaceRootPath: string;
  description: string;
  addedAt: string;
}

/** A Project as persisted in `<appDataDir>/projects/projects.json`. */
export interface Project {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workspaces: ProjectWorkspaceLink[];
}

export type ProjectWorkspaceAvailability = "AVAILABLE" | "UNREGISTERED";

/** A stored link plus fields resolved at read time; never persisted. */
export interface ProjectWorkspaceView extends ProjectWorkspaceLink {
  displayName: string;
  availability: ProjectWorkspaceAvailability;
}

export interface ProjectView extends Omit<Project, "workspaces"> {
  workspaces: ProjectWorkspaceView[];
}

export interface CreateProjectCommand {
  name: string;
  description?: string | null;
}

export interface UpdateProjectCommand {
  projectId: string;
  name: string;
  description?: string | null;
}

export interface AddProjectWorkspaceCommand {
  projectId: string;
  workspaceId: string;
  description?: string | null;
}

export interface UpdateProjectWorkspaceCommand {
  projectId: string;
  workspaceId: string;
  description?: string | null;
}

export interface RemoveProjectWorkspaceCommand {
  projectId: string;
  workspaceId: string;
}
