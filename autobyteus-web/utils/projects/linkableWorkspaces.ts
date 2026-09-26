const REGISTERED_FILESYSTEM_WORKSPACE_ID_PREFIX = 'agent_ws_'

interface WorkspaceCandidate {
  workspaceId: string
  kind?: string
  isTemp?: boolean
}

/**
 * Client-side link-candidate policy for a Project: registered filesystem
 * workspaces only (no temp, skill or transient workspaces), excluding those
 * already linked to the Project. Order follows `workspaces`.
 * Presentation aid only — the server re-validates every link.
 */
export const selectLinkableWorkspaceIds = (
  workspaces: readonly WorkspaceCandidate[],
  linked: readonly { workspaceId: string }[],
): string[] => {
  const linkedIds = new Set(linked.map((link) => link.workspaceId))
  return workspaces
    .filter((workspace) => (
      workspace.kind === 'filesystem'
      && workspace.isTemp !== true
      && workspace.workspaceId.startsWith(REGISTERED_FILESYSTEM_WORKSPACE_ID_PREFIX)
      && !linkedIds.has(workspace.workspaceId)
    ))
    .map((workspace) => workspace.workspaceId)
}
