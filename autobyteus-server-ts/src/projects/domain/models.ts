import type { ProjectTaskContextFile, ProjectTaskContextFileView, ProjectTaskContextDraft, ProjectTaskContextChanges } from "./project-task-context.js";

/** A workspace link as persisted inside a Project record. */
export interface ProjectWorkspaceLink {
  /** Canonical absolute folder path on this node; registration is not required. */
  workspaceRootPath: string;
  description: string;
}

export type ProjectTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

/** A Task as persisted in `<projectId>/tasks/<taskId>/task.json` (which also records its `projectId`). It has no title; the description is the content. */
export interface ProjectTask {
  taskId: string;
  description: string;
  status: ProjectTaskStatus;
  contextFiles?: ProjectTaskContextFile[];
  createdAt: string;
  updatedAt: string;
}

/** Where a Task lives: under its Project, or (`projectId: null`) as an ad-hoc Task with no Project. */
export type TaskLocation = Readonly<{ projectId: string | null; taskId: string }>;

/** The recorded identity and status of a Task after an update by its unique id. */
export interface TaskAcknowledgementView {
  projectId: string | null;
  taskId: string;
  status: ProjectTaskStatus;
}

/** A Project as persisted in `<appDataDir>/projects/<projectId>/project.json`; its Tasks live in their own folders. */
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
  /** Number of Tasks whose status is not `DONE`; computed at read time. */
  openTaskCount: number;
  taskCount: number;
}

/** The live status words of a Task's root (the worker's own status). */
export type TaskRootStatus = "running" | "initializing" | "idle" | "error" | "offline";

/**
 * A Task's root: its latest `assigned` entry, i.e. the one agent or team the Task was handed to.
 * `status` is the worker's own live status; it is `offline` when the assignment is closed (DONE),
 * failed to start, or its hosting run is not active.
 */
export interface TaskRootView {
  kind: "agent" | "team";
  /** The address it was delegated to (its display name); null when recorded before it was kept. */
  recipientAddress: string | null;
  /** The agent run, or the team's coordinator: the run that opens it. */
  ingressAgentRunId: string;
  teamRunId: string | null;
  hostRoot: { kind: "agent" | "agent_team" | "agent_org"; runId: string };
  start: "starting" | "started" | "failed";
  startError: { code: string; message: string } | null;
  closed: boolean;
  status: TaskRootStatus;
}

/** A Task as returned to clients; `projectId` is added for client keying and is not stored in the Task. */
export interface ProjectTaskView extends Omit<ProjectTask, "contextFiles"> {
  contextFiles: ProjectTaskContextFileView[];
  projectId: string;
  root: TaskRootView | null;
}

/** A Task with no Project ("Temp task") as returned to clients; read only. */
export interface TaskWithoutProjectView {
  taskId: string;
  description: string;
  status: ProjectTaskStatus;
  referenceFiles: string[];
  createdAt: string;
  updatedAt: string;
  root: TaskRootView | null;
}

export interface ProjectWorkspaceInput { workspaceRootPath: string; description?: string | null }

export interface CreateProjectCommand {
  workspaces?: ProjectWorkspaceInput[] | null;
  name: string;
  description?: string | null;
}

export interface UpdateProjectCommand {
  workspaces?: ProjectWorkspaceInput[] | null;
  projectId: string;
  name: string;
  description?: string | null;
}

/** Omission-preserving command, distinct from the active full-form update. */
export interface PatchProjectCommand {
  projectId: string;
  name?: string;
  description?: string;
  workspaces?: ProjectWorkspaceInput[];
}

export interface AddProjectWorkspaceCommand {
  projectId: string;
  workspaceRootPath: string;
  description?: string | null;
}

export interface UpdateProjectWorkspaceCommand {
  projectId: string;
  workspaceRootPath: string;
  description?: string | null;
}

export interface RemoveProjectWorkspaceCommand {
  projectId: string;
  workspaceRootPath: string;
}

export interface CreateProjectTaskCommand {
  contextDraft?: ProjectTaskContextDraft | null;
  projectId: string;
  description: string;
}

export interface UpdateProjectTaskCommand {
  projectId: string;
  taskId: string;
  description?: string;
  status?: ProjectTaskStatus;
  contextChanges?: ProjectTaskContextChanges | null;
}

/** A patch of any Task (Project or ad-hoc) by its unique id; never touches saved context. */
export interface UpdateTaskByIdCommand {
  taskId: string;
  description?: string;
  status?: ProjectTaskStatus;
}

export interface DeleteProjectTaskCommand {
  projectId: string;
  taskId: string;
}
