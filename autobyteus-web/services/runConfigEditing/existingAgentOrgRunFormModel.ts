import { previewExistingAgentOrgWorkspaces, type ExistingAgentOrgWorkspaceDraft } from './existingAgentOrgWorkspaceDraft'
import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { ExistingRunModelOptionsState, ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import type {
  ExistingTeamFormAgentNode,
  ExistingTeamFormMemberNode,
  ExistingTeamFormTeamNode,
  ExistingTeamRunFormModel,
  ExistingTeamScopeFormModel,
  ExistingWorkspaceDisplay,
} from '~/types/agent/ExistingTeamRunFormModel'
import type { ResolvedTeamRunLaunchConfig } from '~/types/agent/TeamRunConfig'
import type { AgentRuntimeKind, SkillAccessMode } from '~/types/agent/AgentRunConfig'
import type { ExistingAgentOrgModelConfigDraft } from './existingAgentOrgModelConfigDraft'
import type { AgentOrgConfiguredAgentNode, AgentOrgConfiguredMember } from '~/types/collaboration/agentOrgExecution'

type Launch = AgentOrgExecutionTree['rootOrg']['defaultLaunchConfiguration']
const nameAt = (address: string): string => address.split('/').filter(Boolean).at(-1) ?? address
const workspace = (launch: Launch): ExistingWorkspaceDisplay | null => {
  const rootPath = launch.workspaceRootPath?.trim() ?? ''
  return rootPath ? { workspaceId: null, displayName: rootPath, rootPath, availability: 'historical-only' } : null
}
const resolved = (launch: Launch, selection: ExistingRunModelSelection): Readonly<ResolvedTeamRunLaunchConfig> => ({
  runtimeKind: launch.runtimeKind as AgentRuntimeKind,
  workspaceId: null,
  workspaceMetadata: null,
  workspaceRootPath: launch.workspaceRootPath,
  ...selection,
  autoExecuteTools: launch.autoExecuteTools,
  skillAccessMode: launch.skillAccessMode as SkillAccessMode,
})

export const projectExistingAgentOrgRunFormModel = (input: {
  tree: AgentOrgExecutionTree
  workspaceDraft: ExistingAgentOrgWorkspaceDraft
  planner: ExistingAgentOrgModelConfigDraft
  isActive: boolean
  modelConfigEditable: boolean
  modelConfigReason: string | null
  modelOptionsByAddress?: Readonly<Record<string, ExistingRunModelOptionsState>>
  saving: boolean
}): ExistingTeamRunFormModel => {
  const tree = previewExistingAgentOrgWorkspaces(input.tree, input.workspaceDraft)
  const scope = (address: AgentTeamAddress, displayName: string, launch: Launch): ExistingTeamScopeFormModel => {
    const draft = input.planner.scopesByAddress[address]
    if (!draft) throw new Error(`Existing AgentOrg draft is missing configured scope '${address}'.`)
    return { mode: 'existing', address, displayName, effectiveConfig: resolved(launch, draft.draftSelection),
      isCustomized: address !== '/' && (!draft.linkedToParentAtDraftStart || draft.directlyEdited || launch.workspaceRootPath !== tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath),
      directlyEdited: draft.directlyEdited, originalModelIdentifier: draft.originalSelection.llmModelIdentifier,
      modelOptions: input.modelOptionsByAddress?.[address], workspacePresentation: { kind: 'selector', model: input.workspaceDraft[address]
        ? { mode: 'editable', selection: input.workspaceDraft[address]!.selection, isLoading: false, error: null }
        : { mode: 'stored', workspace: workspace(launch) } } }
  }
  const agent = (node: AgentOrgConfiguredAgentNode,
    coordinatorAddress: string | null): ExistingTeamFormAgentNode => {
    const draft = input.planner.scopesByAddress[node.address]
    if (!draft) throw new Error(`Existing AgentOrg draft is missing configured Agent '${node.address}'.`)
    return { mode: 'existing', kind: 'agent', address: node.address as AgentTeamAddress,
      displayName: node.role || nameAt(node.address), isCoordinator: node.address === coordinatorAddress,
      isCustomized: !draft.linkedToParentAtDraftStart || draft.directlyEdited,
      directlyEdited: draft.directlyEdited, effectiveConfig: resolved(node.launchConfiguration, draft.draftSelection),
      originalModelIdentifier: draft.originalSelection.llmModelIdentifier,
      modelOptions: input.modelOptionsByAddress?.[node.address], workspacePresentation: {
        kind: 'selector', model: { mode: 'stored', workspace: workspace(node.launchConfiguration) },
      } }
  }
  const members: ExistingTeamFormMemberNode[] = tree.rootOrg.members.map((member: AgentOrgConfiguredMember) => {
    if ('agentRunId' in member) return agent(member, null)
    const team: ExistingTeamFormTeamNode = { mode: 'existing', kind: 'agent_team',
      address: member.address as AgentTeamAddress,
      scope: scope(member.address as AgentTeamAddress, member.role || nameAt(member.address), member.defaultLaunchConfiguration),
      children: member.members.map((child: AgentOrgConfiguredAgentNode) => agent(child, member.coordinatorAddress)) }
    return team
  })
  return { mode: 'existing', definitionLabel: tree.rootOrg.orgDefinitionName,
    root: scope('/', tree.rootOrg.orgDefinitionName, tree.rootOrg.defaultLaunchConfiguration),
    members, isActive: input.isActive, modelConfigEditable: input.modelConfigEditable,
    modelConfigReason: input.modelConfigReason, saving: input.saving }
}
