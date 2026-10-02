export type ProjectWorkspaceAvailability = 'AVAILABLE' | 'UNREGISTERED'

/** A workspace linked to a Project, with availability resolved by the server at read time. */
export interface ProjectWorkspace {
  workspaceId: string
  workspaceRootPath: string
  displayName: string
  description: string
  addedAt: string
  availability: ProjectWorkspaceAvailability
}

export interface Project {
  projectId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  workspaces: ProjectWorkspace[]
  /** Number of this Project's Tasks whose status is not DONE. */
  taskCount: number
  openTaskCount: number
}

export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export const PROJECT_TASK_STATUSES: readonly ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

/** A Project Task. It has no title: the description is its content, and its first line is its summary. */
export interface ProjectTaskContextFile { storedFilename: string; displayName: string; mimeType: string; sizeBytes: number; locator?: string }
export interface ProjectTaskContextDraft { draftId: string; storedFilenames: string[] }
export interface ProjectTaskContextChanges { draftId?: string; addStoredFilenames?: string[]; removeStoredFilenames?: string[] }
export interface ProjectWorkspaceInput { workspaceId: string; description: string }
export interface ProjectTask {
  contextFiles: ProjectTaskContextFile[]
  taskId: string
  projectId: string
  description: string
  status: ProjectTaskStatus
  createdAt: string
  updatedAt: string
}

export type ProjectErrorCode =
  | 'PROJECT_NAME_REQUIRED'
  | 'PROJECT_NAME_TAKEN'
  | 'PROJECT_NOT_FOUND'
  | 'WORKSPACE_NOT_REGISTERED'
  | 'WORKSPACE_ALREADY_LINKED'
  | 'WORKSPACE_LINK_NOT_FOUND'
  | 'TASK_DESCRIPTION_REQUIRED'
  | 'TASK_NOT_FOUND'
