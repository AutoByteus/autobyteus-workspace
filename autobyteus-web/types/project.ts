export type ProjectWorkspaceAvailability = 'AVAILABLE' | 'UNREGISTERED'

/** A workspace linked to a Project, with availability resolved by the server at read time. */
export interface ProjectWorkspace {
  workspaceRootPath: string
  displayName: string
  description: string
  availability: ProjectWorkspaceAvailability
}

export interface Project {
  projectId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  workspaces: ProjectWorkspace[]
  /** Number of this Project's open Tasks (status not DONE or CLOSED). */
  taskCount: number
  openTaskCount: number
}

/** CLOSED: dropped as not needed, not completed. DONE and CLOSED end the Task's work; only agents set status. */
export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CLOSED'

/** A Project Task. It has no title: the description is its content, and its first line is its summary. */
export interface ProjectTaskContextFile { storedFilename: string; displayName: string; mimeType: string; sizeBytes: number; locator?: string }
export interface ProjectTaskContextDraft { draftId: string; storedFilenames: string[] }
export interface ProjectTaskContextChanges { draftId?: string; addStoredFilenames?: string[]; removeStoredFilenames?: string[] }
export interface ProjectWorkspaceInput { workspaceRootPath: string; description: string }
/** The live status words of a Task's root: the worker's own status (the left panel's words). */
export type TaskRootStatus = 'running' | 'initializing' | 'idle' | 'error' | 'offline'

/**
 * A Task's root: the one agent or team it was handed to (its latest assignment). `status` is the
 * worker's own live status from its hosting run; it is `offline` when closed (DONE), failed to start,
 * or the hosting run is not active.
 */
export interface TaskRootView {
  kind: 'agent' | 'team'
  /** The address it was delegated to (its display name); null for assignments recorded before it was kept. */
  recipientAddress: string | null
  /** The agent run, or the team's coordinator: the run that opens it. */
  ingressAgentRunId: string
  teamRunId: string | null
  hostRoot: { kind: 'agent' | 'agent_team' | 'agent_org'; runId: string }
  start: 'starting' | 'started' | 'failed'
  startError: { code: string; message: string } | null
  closed: boolean
  status: TaskRootStatus
}

export interface ProjectTask {
  contextFiles: ProjectTaskContextFile[]
  taskId: string
  projectId: string
  description: string
  status: ProjectTaskStatus
  createdAt: string
  updatedAt: string
  root: TaskRootView | null
}

/** A Task with no Project ("Temp task"): created by an agent's described delegation; read only. */
export interface TaskWithoutProject {
  taskId: string
  description: string
  status: ProjectTaskStatus
  referenceFiles: string[]
  createdAt: string
  updatedAt: string
  root: TaskRootView | null
}

/** Where a Task lives in the change feed. */
export type TaskScope = { kind: 'project'; projectId: string } | { kind: 'no_project' }

/** One `/ws/projects` change-feed message (mirrors the server contract). */
export type ProjectChangeMessage =
  | { type: 'connected' }
  | { type: 'project_upserted'; project: Project }
  | { type: 'project_removed'; projectId: string }
  | { type: 'task_upserted'; scope: { kind: 'project'; projectId: string }; task: ProjectTask }
  | { type: 'task_upserted'; scope: { kind: 'no_project' }; task: TaskWithoutProject }
  | { type: 'task_removed'; scope: TaskScope; taskId: string }
  | { type: 'task_worker_status'; scope: TaskScope; taskId: string; status: TaskRootStatus }

export type ProjectErrorCode =
  | 'PROJECT_NAME_REQUIRED'
  | 'PROJECT_NAME_TAKEN'
  | 'PROJECT_NOT_FOUND'
  | 'WORKSPACE_PATH_INVALID'
  | 'WORKSPACE_ALREADY_LINKED'
  | 'WORKSPACE_LINK_NOT_FOUND'
  | 'TASK_DESCRIPTION_REQUIRED'
  | 'TASK_NOT_FOUND'
