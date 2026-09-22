import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

export type TeamWorkspacePatch = Readonly<{ teamAddress: string; workspaceRootPath: string }>
type KnownWorkspace = Readonly<{ workspaceId: string; workspaceRootPath?: string | null; absolutePath?: string | null }>
export type ExistingAgentOrgWorkspaceDraft = Readonly<Record<string, Readonly<{
  selection: WorkspaceSelectionState
  rootPath: string | null
}>>>

export const createExistingAgentOrgWorkspaceDraft = (
  tree: AgentOrgExecutionTree, known: readonly KnownWorkspace[],
): ExistingAgentOrgWorkspaceDraft => Object.fromEntries(tree.rootOrg.members.flatMap(member => {
  if (!('teamRunId' in member)) return []
  const rootPath = member.defaultLaunchConfiguration.workspaceRootPath
  const match = known.find(workspace => (workspace.workspaceRootPath ?? workspace.absolutePath) === rootPath)
  return [[member.address, { rootPath, selection: match
    ? { mode: 'existing', existingWorkspaceId: match.workspaceId, newWorkspacePath: rootPath ?? '' }
    : { mode: 'new', existingWorkspaceId: null, newWorkspacePath: rootPath ?? '' } }]]
}))

export const updateExistingAgentOrgWorkspaceDraft = (
  draft: ExistingAgentOrgWorkspaceDraft, address: string, selection: WorkspaceSelectionState, known: readonly KnownWorkspace[],
): ExistingAgentOrgWorkspaceDraft => {
  if (!draft[address]) throw new Error(`Configured Team '${address}' was not found.`)
  const workspace = selection.mode === 'existing' ? known.find(item => item.workspaceId === selection.existingWorkspaceId) : null
  const rootPath = (selection.mode === 'new' ? selection.newWorkspacePath : workspace?.workspaceRootPath ?? workspace?.absolutePath)?.trim() || null
  return { ...draft, [address]: { selection: { ...selection }, rootPath } }
}

export const planExistingAgentOrgWorkspacePatches = (
  tree: AgentOrgExecutionTree, draft: ExistingAgentOrgWorkspaceDraft,
): readonly TeamWorkspacePatch[] => tree.rootOrg.members.flatMap(member => {
  if (!('teamRunId' in member)) return []
  const rootPath = draft[member.address]?.rootPath
  return rootPath && rootPath !== member.defaultLaunchConfiguration.workspaceRootPath
    ? [{ teamAddress: member.address, workspaceRootPath: rootPath }] : []
})

export const existingAgentOrgWorkspacesValid = (tree: AgentOrgExecutionTree, draft: ExistingAgentOrgWorkspaceDraft): boolean =>
  tree.rootOrg.members.every(member => !('teamRunId' in member) || Boolean(draft[member.address]?.rootPath)
    || draft[member.address]?.rootPath === member.defaultLaunchConfiguration.workspaceRootPath)

export const existingAgentOrgWorkspacesDirty = (tree: AgentOrgExecutionTree, draft: ExistingAgentOrgWorkspaceDraft): boolean =>
  tree.rootOrg.members.some(member => 'teamRunId' in member
    && draft[member.address]?.rootPath !== member.defaultLaunchConfiguration.workspaceRootPath)

/** Preview only changed Team intentions: opening an old distinct child path never repairs it. */
export const previewExistingAgentOrgWorkspaces = (tree: AgentOrgExecutionTree, draft: ExistingAgentOrgWorkspaceDraft): AgentOrgExecutionTree => {
  const patches = new Map(planExistingAgentOrgWorkspacePatches(tree, draft).map(patch => [patch.teamAddress, patch.workspaceRootPath]))
  return { ...tree, rootOrg: { ...tree.rootOrg, members: tree.rootOrg.members.map(member => {
    const root = patches.get(member.address)
    if (!root || !('teamRunId' in member)) return member
    return { ...member, defaultLaunchConfiguration: { ...member.defaultLaunchConfiguration, workspaceRootPath: root },
      members: member.members.map(agent => ({ ...agent, launchConfiguration: { ...agent.launchConfiguration, workspaceRootPath: root } })) }
  }) } }
}
