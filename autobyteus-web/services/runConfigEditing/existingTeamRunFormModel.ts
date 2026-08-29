import type {
  AgentLaunchConfigurationDto,
  ConfiguredMemberExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import type { AgentRuntimeKind, SkillAccessMode } from '~/types/agent/AgentRunConfig'
import type {
  ExistingTeamFormMemberNode,
  ExistingTeamRunFormModel,
  ExistingTeamScopeFormModel,
  ExistingWorkspaceDisplay,
} from '~/types/agent/ExistingTeamRunFormModel'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { ResolvedTeamRunLaunchConfig } from '~/types/agent/TeamRunConfig'
import type { ExistingTeamModelConfigDraft } from './existingTeamModelConfigDraft'

const nameAt = (address: string): string => address.split('/').filter(Boolean).at(-1) ?? address
const workspace = (launch: AgentLaunchConfigurationDto): ExistingWorkspaceDisplay | null => {
  const rootPath = launch.workspace_root_path?.trim() ?? ''
  return rootPath ? { workspaceId: null, displayName: rootPath, rootPath, availability: 'historical-only' } : null
}
const resolved = (
  launch: AgentLaunchConfigurationDto,
  llmConfig: Record<string, unknown> | null,
): Readonly<ResolvedTeamRunLaunchConfig> => ({
  runtimeKind: launch.runtime_kind as AgentRuntimeKind,
  workspaceId: null,
  workspaceMetadata: null,
  workspaceRootPath: launch.workspace_root_path,
  llmModelIdentifier: launch.llm_model_identifier,
  llmConfig,
  autoExecuteTools: launch.auto_execute_tools,
  skillAccessMode: launch.skill_access_mode as SkillAccessMode,
})

export const projectExistingTeamRunFormModel = (input: {
  tree: TeamRunExecutionTreeDto
  planner: ExistingTeamModelConfigDraft
  isActive: boolean
  modelConfigEditable: boolean
  modelConfigReason: string | null
  saving: boolean
}): ExistingTeamRunFormModel => {
  const scope = (
    address: AgentTeamAddress,
    displayName: string,
    launch: AgentLaunchConfigurationDto,
  ): ExistingTeamScopeFormModel => {
    const draft = input.planner.scopesByAddress[address]
    if (!draft) throw new Error(`Existing Team draft is missing configured scope '${address}'.`)
    return {
      mode: 'existing',
      address,
      displayName,
      effectiveConfig: resolved(launch, draft.draftLlmConfig),
      isCustomized: address !== '/' && (!draft.linkedToParentAtDraftStart || draft.directlyEdited),
      directlyEdited: draft.directlyEdited,
      storedWorkspace: workspace(launch),
    }
  }
  const visit = (
    members: readonly ConfiguredMemberExecutionDto[],
    coordinatorAddress: string,
  ): readonly ExistingTeamFormMemberNode[] => members.map((member) => {
    if (member.kind === 'configured_team') {
      return {
        mode: 'existing',
        kind: 'agent_team',
        address: member.address as AgentTeamAddress,
        scope: scope(member.address as AgentTeamAddress, nameAt(member.address), member.default_launch_configuration),
        children: visit(member.members, member.coordinator_address),
      }
    }
    const draft = input.planner.scopesByAddress[member.address]
    if (!draft) throw new Error(`Existing Team draft is missing configured Agent '${member.address}'.`)
    return {
      mode: 'existing',
      kind: 'agent',
      address: member.address as AgentTeamAddress,
      displayName: nameAt(member.address),
      isCoordinator: member.address === coordinatorAddress,
      isCustomized: !draft.linkedToParentAtDraftStart || draft.directlyEdited,
      directlyEdited: draft.directlyEdited,
      effectiveConfig: resolved(member.launch_configuration, draft.draftLlmConfig),
      storedWorkspace: workspace(member.launch_configuration),
    }
  })

  return {
    mode: 'existing',
    definitionLabel: input.tree.root_team.team_definition_name,
    root: scope('/', input.tree.root_team.team_definition_name, input.tree.root_team.default_launch_configuration),
    members: visit(input.tree.root_team.members, input.tree.root_team.coordinator_address),
    isActive: input.isActive,
    modelConfigEditable: input.modelConfigEditable,
    modelConfigReason: input.modelConfigReason,
    saving: input.saving,
  }
}
