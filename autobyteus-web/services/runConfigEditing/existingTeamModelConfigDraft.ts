import type {
  AgentLaunchConfigurationDto,
  ConfiguredMemberExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import { existingRunModelConfigsEqual, cloneExistingRunModelConfig } from './existingAgentModelConfigDraft'

export type ExistingTeamModelConfigScopeKind = 'CONFIGURED_TEAM' | 'CONFIGURED_AGENT'

export type ExistingTeamModelConfigScope = Readonly<{
  scopeKind: ExistingTeamModelConfigScopeKind
  address: string
  parentAddress: string | null
  runtimeKind: string
  llmModelIdentifier: string
  originalLlmConfig: Record<string, unknown> | null
  draftLlmConfig: Record<string, unknown> | null
  linkedToParentAtDraftStart: boolean
  directlyEdited: boolean
}>

export type ExistingTeamModelConfigDraft = Readonly<{
  scopesByAddress: Readonly<Record<string, ExistingTeamModelConfigScope>>
  childAddressesByParent: Readonly<Record<string, readonly string[]>>
}>

export type ExistingTeamModelConfigPatch = Readonly<{
  scopeKind: ExistingTeamModelConfigScopeKind
  scopeAddress: string
  llmConfig: Record<string, unknown> | null
}>

const fixedAndConfigEqual = (
  child: AgentLaunchConfigurationDto,
  parent: AgentLaunchConfigurationDto,
): boolean => child.runtime_kind === parent.runtime_kind &&
  child.llm_model_identifier === parent.llm_model_identifier &&
  existingRunModelConfigsEqual(child.llm_config, parent.llm_config)

export const createExistingTeamModelConfigDraft = (
  tree: TeamRunExecutionTreeDto,
): ExistingTeamModelConfigDraft => {
  const scopes: Record<string, ExistingTeamModelConfigScope> = {}
  const children: Record<string, string[]> = {}
  const add = (
    kind: ExistingTeamModelConfigScopeKind,
    address: string,
    parentAddress: string | null,
    launch: AgentLaunchConfigurationDto,
    parentLaunch: AgentLaunchConfigurationDto | null,
  ) => {
    scopes[address] = {
      scopeKind: kind,
      address,
      parentAddress,
      runtimeKind: launch.runtime_kind,
      llmModelIdentifier: launch.llm_model_identifier,
      originalLlmConfig: cloneExistingRunModelConfig(launch.llm_config),
      draftLlmConfig: cloneExistingRunModelConfig(launch.llm_config),
      linkedToParentAtDraftStart: Boolean(parentLaunch && fixedAndConfigEqual(launch, parentLaunch)),
      directlyEdited: false,
    }
    if (parentAddress) (children[parentAddress] ??= []).push(address)
  }
  const visit = (
    members: readonly ConfiguredMemberExecutionDto[],
    parentAddress: string,
    parentLaunch: AgentLaunchConfigurationDto,
  ) => {
    members.forEach((member) => {
      const launch = member.kind === 'configured_agent'
        ? member.launch_configuration
        : member.default_launch_configuration
      add(member.kind === 'configured_agent' ? 'CONFIGURED_AGENT' : 'CONFIGURED_TEAM', member.address, parentAddress, launch, parentLaunch)
      if (member.kind === 'configured_team') visit(member.members, member.address, launch)
    })
  }
  add('CONFIGURED_TEAM', '/', null, tree.root_team.default_launch_configuration, null)
  visit(tree.root_team.members, '/', tree.root_team.default_launch_configuration)
  return { scopesByAddress: scopes, childAddressesByParent: children }
}

export const updateExistingTeamScopeModelConfig = (
  draft: ExistingTeamModelConfigDraft,
  address: string,
  llmConfig: Record<string, unknown> | null,
): ExistingTeamModelConfigDraft => {
  if (!draft.scopesByAddress[address]) throw new Error(`Configured Team scope '${address}' was not found.`)
  const scopes: Record<string, ExistingTeamModelConfigScope> = { ...draft.scopesByAddress }
  const target = scopes[address]!
  scopes[address] = { ...target, draftLlmConfig: cloneExistingRunModelConfig(llmConfig), directlyEdited: true }
  const propagate = (parentAddress: string, inherited: Record<string, unknown> | null): void => {
    for (const childAddress of draft.childAddressesByParent[parentAddress] ?? []) {
      const child = scopes[childAddress]!
      if (!child.linkedToParentAtDraftStart || child.directlyEdited) continue
      scopes[childAddress] = { ...child, draftLlmConfig: cloneExistingRunModelConfig(inherited) }
      propagate(childAddress, inherited)
    }
  }
  propagate(address, llmConfig)
  return { ...draft, scopesByAddress: scopes }
}

export const planExistingTeamModelConfigPatches = (
  draft: ExistingTeamModelConfigDraft,
): ExistingTeamModelConfigPatch[] => Object.values(draft.scopesByAddress)
  .filter((scope) => !existingRunModelConfigsEqual(scope.originalLlmConfig, scope.draftLlmConfig))
  .sort((left, right) => left.address.localeCompare(right.address))
  .map((scope) => ({
    scopeKind: scope.scopeKind,
    scopeAddress: scope.address,
    llmConfig: cloneExistingRunModelConfig(scope.draftLlmConfig),
  }))
