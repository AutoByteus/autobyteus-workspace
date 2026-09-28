/** A workspace link as persisted inside a Project record. */
export interface ProjectWorkspaceLink {
  workspaceId: string;
  /** Root path snapshot taken when the link was created. */
  workspaceRootPath: string;
  description: string;
  addedAt: string;
}

export type ProjectTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

/** A Task as persisted inside its Project record. It has no title; the description is the content. */
export interface ProjectTask {
  taskId: string;
  description: string;
  status: ProjectTaskStatus;
  createdAt: string;
  updatedAt: string;
}

/** A Project as persisted in `<appDataDir>/projects/projects.json`. */
export interface Project {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workspaces: ProjectWorkspaceLink[];
  tasks: ProjectTask[];
}

export type ProjectWorkspaceAvailability = "AVAILABLE" | "UNREGISTERED";

/** A stored link plus fields resolved at read time; never persisted. */
export interface ProjectWorkspaceView extends ProjectWorkspaceLink {
  displayName: string;
  availability: ProjectWorkspaceAvailability;
}

export interface ProjectView extends Omit<Project, "workspaces" | "tasks"> {
  workspaces: ProjectWorkspaceView[];
  /** Number of Tasks whose status is not `DONE`; computed at read time. */
  openTaskCount: number;
}

/** A Task as returned to clients; `projectId` is added for client keying and is not stored in the Task. */
export interface ProjectTaskView extends ProjectTask {
  projectId: string;
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

export interface CreateProjectTaskCommand {
  projectId: string;
  description: string;
}

export interface UpdateProjectTaskCommand {
  projectId: string;
  taskId: string;
  description: string;
}

export interface DeleteProjectTaskCommand {
  projectId: string;
  taskId: string;
}
