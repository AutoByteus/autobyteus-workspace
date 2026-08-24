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
import {
  hasMeaningfulLaunchOverride,
  normalizeModelConfig,
  normalizeModelIdentifier,
  normalizeRuntimeKind,
  resolveOverrideLlmConfig,
  resolveOverrideLlmModelIdentifier,
  resolveOverrideRuntimeKind,
} from '~/utils/teamRunConfigUtils'

export interface TeamLaunchTopologyIndex {
  readonly teams: ReadonlySet<AgentTeamAddress>
  readonly agents: ReadonlySet<AgentTeamAddress>
}

export interface TeamRunTopologyReconciliation {
  readonly config: TeamRunConfig
  readonly repairedAddresses: readonly AgentTeamAddress[]
}

export interface TeamScopeLaunchRecord {
  readonly teamAddress: AgentTeamAddress
  readonly runtimeKind: string
  readonly llmModelIdentifier: string
  readonly llmConfig: Record<string, unknown> | null
  readonly autoExecuteTools: boolean
  readonly skillAccessMode: string
  readonly workspaceRootPath: string | null
}

export interface TeamMemberLaunchRecord {
  readonly memberAddress: AgentTeamAddress
  readonly agentDefinitionId: string
  readonly runtimeKind: string
  readonly llmModelIdentifier: string
  readonly llmConfig: Record<string, unknown> | null
  readonly autoExecuteTools: boolean
  readonly skillAccessMode: string
  readonly workspaceRootPath: string | null
}

const cloneWorkspaceMetadata = (value: ResolvedTeamRunLaunchConfig['workspaceMetadata']) => value
  ? { ...value }
  : null

const freezeResolved = (value: ResolvedTeamRunLaunchConfig): Readonly<ResolvedTeamRunLaunchConfig> => {
  if (value.llmConfig) Object.freeze(value.llmConfig)
  if (value.workspaceMetadata) Object.freeze(value.workspaceMetadata)
  return Object.freeze(value)
}

const rootEffectiveConfig = (config: Readonly<TeamRunConfig>): Readonly<ResolvedTeamRunLaunchConfig> => {
  const workspaceMetadata = cloneWorkspaceMetadata(config.rootConfig.workspace.workspaceMetadata)
  return freezeResolved({
    runtimeKind: normalizeRuntimeKind(config.rootConfig.runtimeKind),
    workspaceId: config.rootConfig.workspace.workspaceId,
    workspaceMetadata,
    workspaceRootPath: workspaceMetadata?.workspaceRootPath?.trim() || null,
    llmModelIdentifier: normalizeModelIdentifier(config.rootConfig.llmModelIdentifier),
    llmConfig: normalizeModelConfig(config.rootConfig.llmConfig),
    autoExecuteTools: config.rootConfig.autoExecuteTools,
    skillAccessMode: config.rootConfig.skillAccessMode,
  })
}

const inheritedEffectiveConfig = (
  parent: Readonly<ResolvedTeamRunLaunchConfig>,
  override: Readonly<AgentConfigOverride | TeamScopeConfigOverride> | null,
): Readonly<ResolvedTeamRunLaunchConfig> => {
  const workspace = override && 'workspace' in override && override.workspace !== undefined
    ? override.workspace
    : { workspaceId: parent.workspaceId, workspaceMetadata: parent.workspaceMetadata }
  const workspaceMetadata = cloneWorkspaceMetadata(workspace.workspaceMetadata)
  return freezeResolved({
    runtimeKind: resolveOverrideRuntimeKind(override, parent.runtimeKind),
    workspaceId: workspace.workspaceId,
    workspaceMetadata,
    workspaceRootPath: workspaceMetadata?.workspaceRootPath?.trim() || null,
    llmModelIdentifier: resolveOverrideLlmModelIdentifier(override, parent.llmModelIdentifier),
    llmConfig: resolveOverrideLlmConfig(override, parent.llmConfig),
    autoExecuteTools: override?.autoExecuteTools ?? parent.autoExecuteTools,
    skillAccessMode: parent.skillAccessMode,
  })
}

export const indexTeamLaunchTopology = (
  memberTree: readonly TeamDefinitionMemberNode[],
): TeamLaunchTopologyIndex => {
  const teams = new Set<AgentTeamAddress>(['/'])
  const agents = new Set<AgentTeamAddress>()
  const visit = (node: TeamDefinitionMemberNode): void => {
    if (node.kind === 'agent') agents.add(node.address)
    else {
      teams.add(node.address)
      node.children.forEach(visit)
    }
  }
  memberTree.forEach(visit)
  return Object.freeze({ teams, agents })
}

export const resolveTeamRunConfiguration = (
  config: Readonly<TeamRunConfig>,
  memberTree: readonly TeamDefinitionMemberNode[],
): Readonly<TeamRunConfigurationView> => {
  const teamsByAddress: Record<AgentTeamAddress, ResolvedTeamScopeView> = {}
  const agentsByAddress: Record<AgentTeamAddress, ResolvedAgentLaunchView> = {}
  const rootConfig = rootEffectiveConfig(config)
  const root = Object.freeze<ResolvedTeamScopeView>({
    address: '/',
    parentAddress: null,
    displayName: config.teamDefinitionName,
    teamDefinitionId: config.teamDefinitionId,
    depth: 0,
    isCustomized: false,
    override: null,
    effectiveConfig: rootConfig,
  })
  teamsByAddress['/'] = root

  const visit = (
    node: TeamDefinitionMemberNode,
    containingTeam: Readonly<ResolvedTeamScopeView>,
  ): void => {
    if (node.kind === 'agent') {
      const override = config.agentOverrides[node.address] ?? null
      agentsByAddress[node.address] = Object.freeze({
        address: node.address,
        containingTeamAddress: containingTeam.address,
        displayName: node.displayName,
        agentDefinitionId: node.agentDefinitionId,
        override,
        effectiveConfig: inheritedEffectiveConfig(containingTeam.effectiveConfig, override),
      })
      return
    }
    const override = config.teamOverrides[node.address] ?? null
    const team = Object.freeze<ResolvedTeamScopeView>({
      address: node.address,
      parentAddress: containingTeam.address,
      displayName: node.displayName,
      teamDefinitionId: node.teamDefinitionId,
      depth: containingTeam.depth + 1,
      isCustomized: hasMeaningfulLaunchOverride(override),
      override,
      effectiveConfig: inheritedEffectiveConfig(containingTeam.effectiveConfig, override),
    })
    teamsByAddress[node.address] = team
    node.children.forEach((child) => visit(child, team))
  }
  memberTree.forEach((node) => visit(node, root))

  return Object.freeze({
    source: 'EDITABLE_INTENT',
    teamDefinitionId: config.teamDefinitionId,
    teamDefinitionName: config.teamDefinitionName,
    root,
    teamsByAddress: Object.freeze(teamsByAddress),
    agentsByAddress: Object.freeze(agentsByAddress),
  })
}

const isExactAddressIn = (value: string, allowed: ReadonlySet<AgentTeamAddress>): boolean => {
  try {
    return parseAgentTeamAddress(value) === value && allowed.has(value)
  } catch {
    return false
  }
}

export const reconcileTeamRunConfigTopology = (
  config: Readonly<TeamRunConfig>,
  memberTree: readonly TeamDefinitionMemberNode[],
): TeamRunTopologyReconciliation => {
  const topology = indexTeamLaunchTopology(memberTree)
  const repaired = new Set<AgentTeamAddress>()
  const teamOverrides = Object.fromEntries(Object.entries(config.teamOverrides).filter(([address]) => {
    const retained = address !== '/' && isExactAddressIn(address, topology.teams)
    if (!retained) repaired.add(address)
    return retained
  }))
  const agentOverrides = Object.fromEntries(Object.entries(config.agentOverrides).filter(([address]) => {
    const retained = isExactAddressIn(address, topology.agents)
    if (!retained) repaired.add(address)
    return retained
  }))
  return Object.freeze({
    config: { ...config, teamOverrides, agentOverrides },
    repairedAddresses: Object.freeze([...repaired].sort()),
  })
}

const launchFields = (config: Readonly<ResolvedTeamRunLaunchConfig>) => ({
  runtimeKind: config.runtimeKind,
  llmModelIdentifier: config.llmModelIdentifier,
  llmConfig: normalizeModelConfig(config.llmConfig),
  autoExecuteTools: config.autoExecuteTools,
  skillAccessMode: config.skillAccessMode,
  workspaceRootPath: config.workspaceRootPath,
})

export const projectTeamRunLaunchRecords = (
  config: Readonly<TeamRunConfig>,
  memberTree: readonly TeamDefinitionMemberNode[],
): Readonly<{
  teamConfigs: readonly TeamScopeLaunchRecord[]
  memberConfigs: readonly TeamMemberLaunchRecord[]
}> => {
  const view = resolveTeamRunConfiguration(config, memberTree)
  const teamConfigs = Object.values(view.teamsByAddress).map((team) => Object.freeze({
    teamAddress: team.address,
    ...launchFields(team.effectiveConfig),
  }))
  const memberConfigs = Object.values(view.agentsByAddress).map((agent) => Object.freeze({
    memberAddress: agent.address,
    agentDefinitionId: agent.agentDefinitionId,
    ...launchFields(agent.effectiveConfig),
  }))
  return Object.freeze({ teamConfigs: Object.freeze(teamConfigs), memberConfigs: Object.freeze(memberConfigs) })
}
