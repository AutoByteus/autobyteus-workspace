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
  /** Number of this Project's open Tasks (status not DONE or CANCELLED). */
  taskCount: number
  openTaskCount: number
}

/** CANCELLED: dropped as not needed, not completed. DONE and CANCELLED end the Task's work; only agents set status. */
export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

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

/** A Project Task: its title is its one-line name (given by its writer), its description its content. */
export interface ProjectTask {
  contextFiles: ProjectTaskContextFile[]
  taskId: string
  projectId: string
  /** The Task's one-line name, shown wherever the Task is listed; trimmed and not blank, no length limit. */
  title: string
  description: string
  status: ProjectTaskStatus
  createdAt: string
  updatedAt: string
  root: TaskRootView | null
  /**
   * The readable key `<prefix>-<number>` (e.g. `autobyteus-42`): numbered per Project in creation order,
   * never changed, also after a Project rename. It is the agent-facing and Task page URL ID; `taskId` stays the
   * stored identity used in requests and the change feed.
   */
  taskKey: string
  /** Tasks of the same Project this Task depends on (informs only). An ID that names no current Task is ignored. */
  dependsOnTaskIds: string[]
  /** The Task of the same Project this Task is a part of (its parent), or null. One level only; an ID that names no current Task is ignored. */
  partOfTaskId: string | null
  /** The comment thread, oldest first; add only (task-comments). */
  comments: ProjectTaskComment[]
}

/** One comment of a Project Task: its number within the Task, the server time it was added (ISO), its text. */
export interface ProjectTaskComment {
  id: number
  createdAt: string
  text: string
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

/** A Task worker: a delegated task Agent or task Team copy that is a Task's latest assignment (its root). */
export type TaskWorkerRef = { kind: 'agent'; agentRunId: string } | { kind: 'team'; teamRunId: string }

/** A Task worker's current Task, from the server: a Project Task with its title, or (`projectId` null) a Temp task, which has none. */
export type TaskWorkerTask = {
  taskId: string
  description: string
  status: ProjectTaskStatus
} & ({ projectId: string; title: string } | { projectId: null; title: null })

/** Where a Task lives in the change feed. */
export type TaskScope = { kind: 'project'; projectId: string } | { kind: 'no_project' }

/** A Project Task search match: an exact text match, or related by meaning. */
export interface ProjectTaskSearchMatch { taskId: string; match: 'EXACT' | 'MEANING' }
/**
 * Readiness of meaning search for a Project. While preparing, `done`/`total` count bytes when downloading the model
 * and Tasks when indexing; `reason` says why it is unavailable.
 */
export interface MeaningSearchStatus {
  state: 'READY' | 'PREPARING' | 'UNAVAILABLE'
  phase: 'DOWNLOADING' | 'LOADING' | 'INDEXING' | null
  done: number | null
  total: number | null
  reason: string | null
}
export interface ProjectTaskSearchResult { matches: ProjectTaskSearchMatch[]; meaningSearch: MeaningSearchStatus }

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
  | 'TASK_TITLE_REQUIRED'
  | 'TASK_DESCRIPTION_REQUIRED'
  | 'TASK_NOT_FOUND'
