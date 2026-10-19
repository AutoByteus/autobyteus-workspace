import type { ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import type {
  AgentLaunchConfigurationDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import { existingRunModelConfigsEqual, cloneExistingRunSelection } from './existingAgentModelConfigDraft'
import {
  createExistingHierarchicalModelConfigDraft,
  planExistingHierarchicalModelConfigPatches,
  updateExistingHierarchicalScopeModelConfig,
  type ExistingHierarchicalModelConfigDraft,
  type ExistingHierarchicalModelConfigPatch,
  type ExistingHierarchicalModelConfigScope,
} from './existingHierarchicalModelConfigDraft'

export type ExistingTeamModelConfigScopeKind = 'CONFIGURED_TEAM' | 'CONFIGURED_AGENT'

export type ExistingTeamModelConfigScope = ExistingHierarchicalModelConfigScope<ExistingTeamModelConfigScopeKind>
export type ExistingTeamModelConfigDraft = ExistingHierarchicalModelConfigDraft<ExistingTeamModelConfigScopeKind>
export type ExistingTeamModelConfigPatch = ExistingHierarchicalModelConfigPatch<ExistingTeamModelConfigScopeKind>

const fixedAndConfigEqual = (
  child: AgentLaunchConfigurationDto,
  parent: AgentLaunchConfigurationDto,
): boolean => child.runtime_kind === parent.runtime_kind &&
  child.llm_model_identifier === parent.llm_model_identifier &&
  existingRunModelConfigsEqual(child.llm_config, parent.llm_config)

export const createExistingTeamModelConfigDraft = (
  tree: TeamRunExecutionTreeDto,
): ExistingTeamModelConfigDraft => {
  const scopes: Omit<ExistingTeamModelConfigScope, 'draftSelection' | 'directlyEdited'>[] = []
  const add = (
    kind: ExistingTeamModelConfigScopeKind,
    address: string,
    parentAddress: string | null,
    launch: AgentLaunchConfigurationDto,
    parentLaunch: AgentLaunchConfigurationDto | null,
  ) => {
    scopes.push({
      scopeKind: kind,
      address,
      parentAddress,
      runtimeKind: launch.runtime_kind,
      originalSelection: cloneExistingRunSelection({ llmModelIdentifier: launch.llm_model_identifier, llmConfig: launch.llm_config }),
      linkedToParentAtDraftStart: Boolean(parentLaunch && fixedAndConfigEqual(launch, parentLaunch)),
    })
  }
  add('CONFIGURED_TEAM', '/', null, tree.root_team.default_launch_configuration, null)
  // Teams are flat: the root Team's members are its Agents.
  for (const member of tree.root_team.members) {
    add('CONFIGURED_AGENT', member.address, '/', member.launch_configuration, tree.root_team.default_launch_configuration)
  }
  return createExistingHierarchicalModelConfigDraft(scopes)
}

export const updateExistingTeamScopeModelConfig = (
  draft: ExistingTeamModelConfigDraft,
  address: string,
  selection: ExistingRunModelSelection,
  directlyEdited = true,
): ExistingTeamModelConfigDraft => updateExistingHierarchicalScopeModelConfig(draft, address, selection, directlyEdited)

export const planExistingTeamModelConfigPatches = (
  draft: ExistingTeamModelConfigDraft,
): ExistingTeamModelConfigPatch[] => planExistingHierarchicalModelConfigPatches(draft)
