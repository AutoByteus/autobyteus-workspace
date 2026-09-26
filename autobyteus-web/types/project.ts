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
}

export type ProjectErrorCode =
  | 'PROJECT_NAME_REQUIRED'
  | 'PROJECT_NAME_TAKEN'
  | 'PROJECT_NOT_FOUND'
  | 'WORKSPACE_NOT_REGISTERED'
  | 'WORKSPACE_ALREADY_LINKED'
  | 'WORKSPACE_LINK_NOT_FOUND'
