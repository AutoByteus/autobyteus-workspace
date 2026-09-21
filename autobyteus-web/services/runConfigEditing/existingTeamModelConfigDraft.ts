import type { ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import type {
  AgentLaunchConfigurationDto,
  ConfiguredMemberExecutionDto,
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
  const visit = (
    members: readonly ConfiguredMemberExecutionDto[],
    parentAddress: string,
    parentLaunch: AgentLaunchConfigurationDto,
  ): void => {
    for (const member of members) {
      if (member.kind === 'configured_agent') {
        add('CONFIGURED_AGENT', member.address, parentAddress, member.launch_configuration, parentLaunch)
        continue
      }
      add('CONFIGURED_TEAM', member.address, parentAddress, member.default_launch_configuration, parentLaunch)
      visit(member.members, member.address, member.default_launch_configuration)
    }
  }
  visit(tree.root_team.members, '/', tree.root_team.default_launch_configuration)
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
