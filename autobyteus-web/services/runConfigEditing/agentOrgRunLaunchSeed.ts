import type { AgentOrgExecutionTreeDto } from '@autobyteus/collaboration-stream-contracts'
import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { AgentOrgDefinitionReferences } from '~/services/agentOrgDefinition/agentOrgDefinitionReferences'
import type { AgentOrgRunLaunchSeed } from '~/types/agent/AgentOrgRunLaunchSeed'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import { canonicalizeAgentOrgPlacementLaunchPatch, agentOrgPlacementLaunchPatchesEqual } from '~/utils/agentOrgLaunchPatch'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'

type Launch = AgentOrgExecutionTreeDto['rootOrg']['defaultLaunchConfiguration']
const assertAuthorable = (config: Launch, address: string) => {
  if (config.skillAccessMode !== 'PRELOADED_ONLY') throw new Error(`Unsupported source skill policy at ${address}.`)
}
const relativePatch = (config: Launch, parent: Launch): AgentConfigOverride => {
  const patch: AgentConfigOverride = {}
  if (config.runtimeKind !== parent.runtimeKind) patch.runtimeKind = config.runtimeKind
  if (config.llmModelIdentifier !== parent.llmModelIdentifier) patch.llmModelIdentifier = config.llmModelIdentifier
  if (config.autoExecuteTools !== parent.autoExecuteTools) patch.autoExecuteTools = config.autoExecuteTools
  if (patch.runtimeKind !== undefined || patch.llmModelIdentifier !== undefined
    || !agentOrgPlacementLaunchPatchesEqual({ llmConfig: config.llmConfig }, { llmConfig: parent.llmConfig })) {
    patch.llmConfig = config.llmConfig
  }
  return canonicalizeAgentOrgPlacementLaunchPatch(patch)
}

/** Validated inspection + current exact graph -> isolated, parent-relative new draft. No IO. */
export const buildEditableAgentOrgRunSeed = (
  tree: AgentOrgExecutionTreeDto,
  definition: Pick<AgentOrgDefinition, 'id' | 'members'>,
  references: AgentOrgDefinitionReferences,
  workspaces: readonly WorkspaceMetadata[] = [],
): AgentOrgRunLaunchSeed => {
  const root = tree.rootOrg
  if (root.orgDefinitionId !== definition.id || references.unavailable.length) throw new Error('Source Org definition is unavailable or changed.')
  const selection = (path: string | null): WorkspaceSelectionState => {
    const known = workspaces.find(workspace => workspace.workspaceRootPath === path)
    return known ? { mode: 'existing', existingWorkspaceId: known.workspaceId, newWorkspacePath: '' }
      : { mode: 'new', existingWorkspaceId: null, newWorkspacePath: path ?? '' }
  }
  const config = root.defaultLaunchConfiguration
  assertAuthorable(config, '/')
  const seed: AgentOrgRunLaunchSeed = {
    definitionId: definition.id, runtimeKind: config.runtimeKind, llmModelIdentifier: config.llmModelIdentifier,
    llmConfig: config.llmConfig, autoExecuteTools: config.autoExecuteTools,
    workspaceSelection: selection(config.workspaceRootPath), teamOverrides: {}, agentOverrides: {}, teamWorkspaceSelections: {},
  }
  const mismatch = (address: string): never => { throw new Error(`Source placement ${address} no longer matches the current definition.`) }
  const agent = (source: typeof root.members[number], id: string, address: string, parent: Launch) => {
    if (!('agentRunId' in source) || source.address !== address || source.agentDefinitionId !== id || !references.agents[id]) mismatch(address)
    if (!('agentRunId' in source)) return
    const launch = source.launchConfiguration
    assertAuthorable(launch, address)
    if (launch.workspaceRootPath !== parent.workspaceRootPath) throw new Error(`Unsupported per-Agent source workspace at ${address}.`)
    const patch = relativePatch(launch, parent)
    if (Object.keys(patch).length) seed.agentOverrides[address] = patch
  }
  if (root.members.length !== definition.members.length) mismatch('/')
  for (const member of definition.members) {
    const address = `/${member.memberName}`
    const source = root.members.find(item => item.address === address) ?? mismatch(address)
    if (member.refType === 'AGENT') { agent(source, member.ref, address, config); continue }
    const team = references.teams[member.ref]
    if (!('teamRunId' in source) || source.teamDefinitionId !== member.ref || !team) mismatch(address)
    if (!('teamRunId' in source)) continue
    if (source.members.length !== team.nodes.length || source.coordinatorAddress !== `${address}/${team.coordinatorMemberName}`) mismatch(address)
    const launch = source.defaultLaunchConfiguration
    assertAuthorable(launch, address)
    const patch = relativePatch(launch, config)
    if (launch.workspaceRootPath !== config.workspaceRootPath) {
      const workspace = selection(launch.workspaceRootPath)
      seed.teamWorkspaceSelections[address] = workspace
      seed.teamOverrides[address] = { ...patch, workspace: {
        workspaceId: workspace.existingWorkspaceId,
        workspaceMetadata: workspaces.find(item => item.workspaceId === workspace.existingWorkspaceId) ?? null,
      } }
    } else if (Object.keys(patch).length) seed.teamOverrides[address] = patch
    for (const node of team.nodes) {
      const childAddress = `${address}/${node.memberName}`
      const child = source.members.find(item => item.address === childAddress) ?? mismatch(childAddress)
      agent(child, node.refScope === 'TEAM_LOCAL' ? buildTeamLocalAgentDefinitionId(team.id, node.ref) : node.ref, childAddress, launch)
    }
  }
  return JSON.parse(JSON.stringify(seed))
}
