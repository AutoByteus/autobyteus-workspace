import { autoExecuteForNewRuntimeSelection, withNewRuntimeOverridePolicy } from '~/utils/agentRunRuntimeDraftPolicy'
import { cloneTeamConfig } from '~/composables/useDefinitionLaunchDefaults'
import type { AgentConfigOverride, TeamRunConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamLaunchConfigEdit } from '~/types/agent/TeamLaunchDraft'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import { hasExplicitLlmConfigOverride, hasMeaningfulLaunchOverride, normalizeRuntimeKind } from '~/utils/teamRunConfigUtils'
import { indexTeamLaunchTopology, resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'

const assertEditTarget = (memberTree: readonly TeamDefinitionMemberNode[], address: string, expected: 'team' | 'agent'): AgentTeamAddress => {
  const canonical = parseAgentTeamAddress(address)
  if (canonical !== address || canonical === '/') throw new Error(`Team launch edit requires a canonical non-root ${expected} address '${address}'.`)
  const index = indexTeamLaunchTopology(memberTree)
  if (!(expected === 'team' ? index.teams : index.agents).has(canonical)) throw new Error(`Address '${canonical}' is not an exact ${expected === 'team' ? 'Team' : 'Agent'} placement.`)
  return canonical
}
const pruneInvalidatedLlmConfigs = (
  previous: Readonly<TeamRunConfig>, next: TeamRunConfig, memberTree: readonly TeamDefinitionMemberNode[],
): TeamRunConfig => {
  const before = resolveTeamRunConfiguration(previous, memberTree)
  const after = resolveTeamRunConfiguration(next, memberTree)
  const changed = (left: { runtimeKind: string; llmModelIdentifier: string }, right: { runtimeKind: string; llmModelIdentifier: string }): boolean =>
    left.runtimeKind !== right.runtimeKind || left.llmModelIdentifier !== right.llmModelIdentifier
  const prune = <T extends AgentConfigOverride | TeamScopeConfigOverride>(values: Record<AgentTeamAddress, T>, address: AgentTeamAddress): void => {
    const override = values[address]
    if (!hasExplicitLlmConfigOverride(override)) return
    const retained = { ...override }; delete retained.llmConfig
    if (hasMeaningfulLaunchOverride(retained)) values[address] = retained as T
    else delete values[address]
  }
  for (const [address, scope] of Object.entries(after.teamsByAddress)) {
    if (address === '/') continue
    const prior = before.teamsByAddress[address]
    if (prior && changed(prior.effectiveConfig, scope.effectiveConfig)) prune(next.teamOverrides, address)
  }
  for (const [address, agent] of Object.entries(after.agentsByAddress)) {
    const prior = before.agentsByAddress[address]
    if (prior && changed(prior.effectiveConfig, agent.effectiveConfig)) prune(next.agentOverrides, address)
  }
  return next
}
export const applyTeamLaunchConfigEdit = (
  config: Readonly<TeamRunConfig>, edit: TeamLaunchConfigEdit, memberTree: readonly TeamDefinitionMemberNode[],
): TeamRunConfig => {
  const next = cloneTeamConfig(config)
  switch (edit.kind) {
    case 'set_root_workspace': next.rootConfig.workspace = edit.workspace; return next
    case 'set_root_runtime': {
      const runtimeKind = normalizeRuntimeKind(edit.runtimeKind)
      if (runtimeKind === next.rootConfig.runtimeKind) return next
      next.rootConfig.runtimeKind = runtimeKind; next.rootConfig.llmConfig = null
      next.rootConfig.autoExecuteTools = autoExecuteForNewRuntimeSelection(runtimeKind, next.rootConfig.autoExecuteTools)
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'set_root_model': {
      const llmModelIdentifier = edit.llmModelIdentifier.trim()
      if (llmModelIdentifier === next.rootConfig.llmModelIdentifier) return next
      next.rootConfig.llmModelIdentifier = llmModelIdentifier; next.rootConfig.llmConfig = null
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'set_root_llm_config': next.rootConfig.llmConfig = edit.llmConfig; return next
    case 'set_root_auto_execute_tools': next.rootConfig.autoExecuteTools = edit.autoExecuteTools; return next
    case 'set_team_override': {
      const address = assertEditTarget(memberTree, edit.teamAddress, 'team')
      if (edit.override && hasMeaningfulLaunchOverride(edit.override)) next.teamOverrides[address] = withNewRuntimeOverridePolicy(config.teamOverrides[address], edit.override)!
      else delete next.teamOverrides[address]
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'reset_team_override': {
      delete next.teamOverrides[assertEditTarget(memberTree, edit.teamAddress, 'team')]
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'set_agent_override': {
      const address = assertEditTarget(memberTree, edit.agentAddress, 'agent')
      if (edit.override && hasMeaningfulLaunchOverride(edit.override)) next.agentOverrides[address] = withNewRuntimeOverridePolicy(config.agentOverrides[address], edit.override)!
      else delete next.agentOverrides[address]
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
  }
}
