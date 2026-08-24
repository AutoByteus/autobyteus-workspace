import type { SkillAccessMode } from '~/types/agent/AgentRunConfig'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  AgentConfigOverride,
  ResolvedAgentLaunchView,
  ResolvedTeamRunLaunchConfig,
  ResolvedTeamScopeView,
  TeamRunConfig,
  TeamRunConfigurationView,
  TeamScopeConfigOverride,
} from '~/types/agent/TeamRunConfig'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import { cloneTeamConfig } from '~/composables/useDefinitionLaunchDefaults'
import {
  hasMeaningfulLaunchOverride,
  resolveOverrideLlmConfig,
  resolveOverrideLlmModelIdentifier,
  resolveOverrideRuntimeKind,
} from '~/utils/teamRunConfigUtils'

export interface TeamLaunchTopologyIndex {
  teams: ReadonlyMap<AgentTeamAddress, { node: Extract<TeamDefinitionMemberNode, { kind: 'agent_team' }>; parentAddress: AgentTeamAddress; depth: number }>
  agents: ReadonlyMap<AgentTeamAddress, { node: Extract<TeamDefinitionMemberNode, { kind: 'agent' }>; parentAddress: AgentTeamAddress; depth: number }>
}
export interface TeamScopeLaunchRecord {
  teamAddress: AgentTeamAddress
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  skillAccessMode: SkillAccessMode
  workspaceRootPath: string | null
}
export interface AgentLaunchRecord {
  memberAddress: AgentTeamAddress
  agentDefinitionId: string
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  skillAccessMode: SkillAccessMode
  workspaceRootPath: string | null
}

export const indexTeamLaunchTopology = (memberTree: readonly TeamDefinitionMemberNode[]): TeamLaunchTopologyIndex => {
  const teams = new Map<TeamLaunchTopologyIndex['teams'] extends ReadonlyMap<infer K, any> ? K : never, any>()
  const agents = new Map<AgentTeamAddress, any>()
  const visit = (nodes: readonly TeamDefinitionMemberNode[], parentAddress: AgentTeamAddress, depth: number): void => {
    for (const node of nodes) {
      parseAgentTeamAddress(node.address)
      if (teams.has(node.address) || agents.has(node.address)) throw new Error(`Duplicate Team topology address '${node.address}'.`)
      if (node.kind === 'agent_team') {
        teams.set(node.address, { node, parentAddress, depth })
        visit(node.children, node.address, depth + 1)
      } else agents.set(node.address, { node, parentAddress, depth })
    }
  }
  visit(memberTree, '/', 1)
  return Object.freeze({ teams, agents })
}

const rootEffectiveConfig = (config: TeamRunConfig): ResolvedTeamRunLaunchConfig => Object.freeze({
  runtimeKind: config.rootConfig.runtimeKind,
  workspaceId: config.rootConfig.workspace.workspaceId,
  workspaceMetadata: config.rootConfig.workspace.workspaceMetadata,
  workspaceRootPath: config.rootConfig.workspace.workspaceMetadata?.workspaceRootPath?.trim() || null,
  llmModelIdentifier: config.rootConfig.llmModelIdentifier,
  llmConfig: config.rootConfig.llmConfig,
  autoExecuteTools: config.rootConfig.autoExecuteTools,
  skillAccessMode: config.rootConfig.skillAccessMode,
})
const applyOverride = (
  inherited: ResolvedTeamRunLaunchConfig,
  override: TeamScopeConfigOverride | AgentConfigOverride | null | undefined,
): ResolvedTeamRunLaunchConfig => {
  const workspace = override && 'workspace' in override && override.workspace ? override.workspace : null
  return Object.freeze({
    runtimeKind: resolveOverrideRuntimeKind(override, inherited.runtimeKind),
    workspaceId: workspace ? workspace.workspaceId : inherited.workspaceId,
    workspaceMetadata: workspace ? workspace.workspaceMetadata : inherited.workspaceMetadata,
    workspaceRootPath: workspace
      ? workspace.workspaceMetadata?.workspaceRootPath?.trim() || null
      : inherited.workspaceRootPath,
    llmModelIdentifier: resolveOverrideLlmModelIdentifier(override, inherited.llmModelIdentifier),
    llmConfig: resolveOverrideLlmConfig(override, inherited.llmConfig),
    autoExecuteTools: override?.autoExecuteTools ?? inherited.autoExecuteTools,
    skillAccessMode: inherited.skillAccessMode,
  })
}

export const resolveTeamRunConfiguration = (
  config: TeamRunConfig,
  memberTree: readonly TeamDefinitionMemberNode[],
): TeamRunConfigurationView => {
  const teamsByAddress: Record<AgentTeamAddress, ResolvedTeamScopeView> = {}
  const agentsByAddress: Record<AgentTeamAddress, ResolvedAgentLaunchView> = {}
  const root: ResolvedTeamScopeView = Object.freeze({
    address: '/', parentAddress: null, displayName: config.teamDefinitionName, depth: 0,
    teamDefinitionId: config.teamDefinitionId,
    isCustomized: false, override: null, effectiveConfig: rootEffectiveConfig(config),
  })
  teamsByAddress['/'] = root
  const visit = (
    nodes: readonly TeamDefinitionMemberNode[],
    parent: ResolvedTeamScopeView,
  ): void => {
    for (const node of nodes) {
      if (node.kind === 'agent_team') {
        const override = config.teamOverrides[node.address] ?? null
        const team: ResolvedTeamScopeView = Object.freeze({
          address: node.address,
          parentAddress: parent.address,
          displayName: node.displayName,
          teamDefinitionId: node.teamDefinitionId,
          depth: parent.depth + 1,
          isCustomized: hasMeaningfulLaunchOverride(override),
          override: override ? Object.freeze({ ...override }) : null,
          effectiveConfig: applyOverride(parent.effectiveConfig, override),
        })
        teamsByAddress[node.address] = team
        visit(node.children, team)
      } else {
        const override = config.agentOverrides[node.address] ?? null
        agentsByAddress[node.address] = Object.freeze({
          address: node.address,
          containingTeamAddress: parent.address,
          displayName: node.displayName,
          agentDefinitionId: node.agentDefinitionId,
          override: override ? Object.freeze({ ...override }) : null,
          effectiveConfig: applyOverride(parent.effectiveConfig, override),
        })
      }
    }
  }
  visit(memberTree, root)
  return Object.freeze({
    source: 'EDITABLE_INTENT' as const,
    teamDefinitionId: config.teamDefinitionId,
    teamDefinitionName: config.teamDefinitionName,
    root,
    teamsByAddress: Object.freeze(teamsByAddress),
    agentsByAddress: Object.freeze(agentsByAddress),
  })
}

export const reconcileTeamRunConfigTopology = (
  config: TeamRunConfig,
  memberTree: readonly TeamDefinitionMemberNode[],
): Readonly<{ config: TeamRunConfig; repairedAddresses: readonly AgentTeamAddress[] }> => {
  const index = indexTeamLaunchTopology(memberTree)
  const next = cloneTeamConfig(config)
  const repaired = new Set<AgentTeamAddress>()
  for (const address of Object.keys(next.teamOverrides)) {
    if (!index.teams.has(address)) { delete next.teamOverrides[address]; repaired.add(address) }
  }
  for (const address of Object.keys(next.agentOverrides)) {
    if (!index.agents.has(address)) { delete next.agentOverrides[address]; repaired.add(address) }
  }
  return Object.freeze({ config: next, repairedAddresses: Object.freeze([...repaired].sort()) })
}

export const projectTeamRunLaunchRecords = (
  config: TeamRunConfig,
  memberTree: readonly TeamDefinitionMemberNode[],
): Readonly<{ teamConfigs: readonly TeamScopeLaunchRecord[]; memberConfigs: readonly AgentLaunchRecord[] }> => {
  const view = resolveTeamRunConfiguration(config, memberTree)
  const value = (scope: ResolvedTeamRunLaunchConfig) => ({
    runtimeKind: scope.runtimeKind,
    llmModelIdentifier: scope.llmModelIdentifier,
    llmConfig: scope.llmConfig,
    autoExecuteTools: scope.autoExecuteTools,
    skillAccessMode: scope.skillAccessMode,
    workspaceRootPath: scope.workspaceRootPath,
  })
  const teamConfigs = Object.values(view.teamsByAddress)
    .sort((left, right) => left.depth - right.depth || left.address.localeCompare(right.address))
    .map((team) => Object.freeze({ teamAddress: team.address, ...value(team.effectiveConfig) }))
  const memberConfigs = Object.values(view.agentsByAddress)
    .sort((left, right) => left.address.localeCompare(right.address))
    .map((agent) => Object.freeze({ memberAddress: agent.address, agentDefinitionId: agent.agentDefinitionId, ...value(agent.effectiveConfig) }))
  return Object.freeze({ teamConfigs: Object.freeze(teamConfigs), memberConfigs: Object.freeze(memberConfigs) })
}
