export type WorkspaceSelectionMode = 'existing' | 'new'

export interface WorkspaceSelectionState {
  mode: WorkspaceSelectionMode
  existingWorkspaceId: string | null
  newWorkspacePath: string
}
