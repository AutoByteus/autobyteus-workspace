import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRunConfig,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import {
  type MemberConfigOverride,
  type TeamRunConfig,
} from '~/types/agent/TeamRunConfig'
import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type {
  ApplicationCatalogEntry,
  ApplicationRuntimeTargetKind,
} from '~/stores/applicationStore'
import type { useWorkspaceStore } from '~/stores/workspace'
import { resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers'
import {
  modelConfigsEqual,
  resolveEffectiveMemberLlmConfig,
} from '~/utils/teamRunConfigUtils'

export type PreparedAgentApplicationLaunch = {
  kind: 'AGENT'
  application: ApplicationCatalogEntry
  agentDefinition: AgentDefinition
  config: AgentRunConfig
}

export type PreparedTeamApplicationLaunch = {
  kind: 'AGENT_TEAM'
  application: ApplicationCatalogEntry
  teamDefinition: AgentTeamDefinition
  config: TeamRunConfig
  leafMembers: Array<{
    memberName: string
    memberRouteKey: string
    agentDefinitionId: string
  }>
}

export type PreparedApplicationLaunch =
  | PreparedAgentApplicationLaunch
  | PreparedTeamApplicationLaunch

export const normalizeModelIdentifier = (value: string | null | undefined): string =>
  (value || '').trim()

export const normalizeRuntimeKind = (
  value: string | null | undefined,
): AgentRuntimeKind => {
  const normalized = (value || '').trim()
  return (normalized || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind
}

export const normalizeModelConfig = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  )
}

const modelConfigKey = (value: Record<string, unknown> | null | undefined): string =>
  JSON.stringify(normalizeModelConfig(value) ?? null)

const dominantValue = <T>(
  values: Array<{ key: string; value: T; preferred: boolean }>,
): T | null => {
  if (values.length === 0) {
    return null
  }

  const tally = new Map<string, {
    value: T
    count: number
    firstIndex: number
    preferred: boolean
  }>()

  values.forEach((entry, index) => {
    const existing = tally.get(entry.key)
    if (existing) {
      existing.count += 1
      existing.preferred = existing.preferred || entry.preferred
      return
    }

    tally.set(entry.key, {
      value: entry.value,
      count: 1,
      firstIndex: index,
      preferred: entry.preferred,
    })
  })

  return Array.from(tally.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }
    if (left.preferred !== right.preferred) {
      return left.preferred ? -1 : 1
    }
    return left.firstIndex - right.firstIndex
  })[0]?.value ?? null
}

export const cloneAgentConfig = (config: AgentRunConfig): AgentRunConfig => ({
  ...config,
  llmConfig: normalizeModelConfig(config.llmConfig),
})

export const cloneTeamConfig = (config: TeamRunConfig): TeamRunConfig => ({
  ...config,
  llmConfig: normalizeModelConfig(config.llmConfig),
  memberOverrides: Object.fromEntries(
    Object.entries(config.memberOverrides || {}).map(([memberName, override]) => [
      memberName,
      {
        ...override,
        llmConfig: normalizeModelConfig(override.llmConfig),
      },
    ]),
  ),
})

export const resolveWorkspaceRootPath = (
  workspaceStore: ReturnType<typeof useWorkspaceStore>,
  workspaceId: string | null | undefined,
): string | null => {
  const normalizedWorkspaceId = (workspaceId || '').trim()
  if (!normalizedWorkspaceId) {
    return null
  }

  const workspace = workspaceStore.workspaces[normalizedWorkspaceId]
  if (!workspace) {
    return null
  }

  return (
    workspace.absolutePath
    || workspace.workspaceConfig?.root_path
    || workspace.workspaceConfig?.rootPath
    || null
  )
}

const buildAgentLaunchConfig = (definition: AgentDefinition): AgentRunConfig => ({
  agentDefinitionId: definition.id,
  agentDefinitionName: definition.name,
  agentAvatarUrl: definition.avatarUrl ?? null,
  llmModelIdentifier: normalizeModelIdentifier(definition.defaultLaunchConfig?.llmModelIdentifier),
  runtimeKind: normalizeRuntimeKind(definition.defaultLaunchConfig?.runtimeKind),
  workspaceId: null,
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  isLocked: false,
  llmConfig: normalizeModelConfig(definition.defaultLaunchConfig?.llmConfig),
})

const buildTeamLaunchConfig = (
  definition: AgentTeamDefinition,
  getAgentDefinitionById: (agentDefinitionId: string) => AgentDefinition | null | undefined,
  getTeamDefinitionById: (teamDefinitionId: string) => AgentTeamDefinition | null | undefined,
): { config: TeamRunConfig; leafMembers: PreparedTeamApplicationLaunch['leafMembers'] } => {
  const leafMembers = resolveLeafTeamMembers(definition, {
    getTeamDefinitionById: (teamDefinitionId: string) =>
      getTeamDefinitionById(teamDefinitionId) ?? null,
  })

  const coordinatorRouteKey = definition.coordinatorMemberName.trim()
  const resolvedDefaults = leafMembers.map((member) => {
    const agentDefinition = getAgentDefinitionById(member.agentDefinitionId)
    if (!agentDefinition) {
      throw new Error(`Application launch is missing agent definition '${member.agentDefinitionId}'.`)
    }

    return {
      memberName: member.memberName,
      memberRouteKey: member.memberRouteKey,
      agentDefinitionId: member.agentDefinitionId,
      llmModelIdentifier: normalizeModelIdentifier(agentDefinition.defaultLaunchConfig?.llmModelIdentifier),
      runtimeKind: normalizeRuntimeKind(agentDefinition.defaultLaunchConfig?.runtimeKind),
      llmConfig: normalizeModelConfig(agentDefinition.defaultLaunchConfig?.llmConfig),
    }
  })

  const globalRuntimeKind = dominantValue(
    resolvedDefaults.map((entry) => ({
      key: entry.runtimeKind,
      value: entry.runtimeKind,
      preferred: entry.memberRouteKey === coordinatorRouteKey,
    })),
  ) ?? DEFAULT_AGENT_RUNTIME_KIND

  const globalModelIdentifier = dominantValue(
    resolvedDefaults
      .filter((entry) => entry.llmModelIdentifier)
      .map((entry) => ({
        key: entry.llmModelIdentifier,
        value: entry.llmModelIdentifier,
        preferred: entry.memberRouteKey === coordinatorRouteKey,
      })),
  ) ?? ''

  const configCandidates = resolvedDefaults.filter(
    (entry) => normalizeModelIdentifier(entry.llmModelIdentifier) === globalModelIdentifier,
  )
  const globalLlmConfig = dominantValue(
    (configCandidates.length > 0 ? configCandidates : resolvedDefaults).map((entry) => ({
      key: modelConfigKey(entry.llmConfig),
      value: entry.llmConfig,
      preferred: entry.memberRouteKey === coordinatorRouteKey,
    })),
  ) ?? null

  const memberOverrides: Record<string, MemberConfigOverride> = {}
  resolvedDefaults.forEach((entry) => {
    const override: MemberConfigOverride = {
      agentDefinitionId: entry.agentDefinitionId,
    }

    if (entry.llmModelIdentifier && entry.llmModelIdentifier !== globalModelIdentifier) {
      override.llmModelIdentifier = entry.llmModelIdentifier
    }

    if (!modelConfigsEqual(entry.llmConfig, globalLlmConfig)) {
      override.llmConfig = entry.llmConfig
    }

    if (override.llmModelIdentifier || Object.prototype.hasOwnProperty.call(override, 'llmConfig')) {
      memberOverrides[entry.memberName] = override
    }
  })

  return {
    leafMembers,
    config: {
      teamDefinitionId: definition.id,
      teamDefinitionName: definition.name,
      runtimeKind: globalRuntimeKind,
      workspaceId: null,
      llmModelIdentifier: globalModelIdentifier,
      llmConfig: globalLlmConfig,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      memberOverrides,
      isLocked: false,
    },
  }
}

export const buildPreparedAgentLaunch = (
  application: ApplicationCatalogEntry,
  agentDefinition: AgentDefinition,
): PreparedAgentApplicationLaunch => ({
  kind: 'AGENT',
  application,
  agentDefinition,
  config: cloneAgentConfig(buildAgentLaunchConfig(agentDefinition)),
})

export const buildPreparedTeamLaunch = (
  application: ApplicationCatalogEntry,
  teamDefinition: AgentTeamDefinition,
  getAgentDefinitionById: (agentDefinitionId: string) => AgentDefinition | null | undefined,
  getTeamDefinitionById: (teamDefinitionId: string) => AgentTeamDefinition | null | undefined,
): PreparedTeamApplicationLaunch => {
  const preparedTeamConfig = buildTeamLaunchConfig(
    teamDefinition,
    getAgentDefinitionById,
    getTeamDefinitionById,
  )

  return {
    kind: 'AGENT_TEAM',
    application,
    teamDefinition,
    leafMembers: preparedTeamConfig.leafMembers,
    config: cloneTeamConfig(preparedTeamConfig.config),
  }
}

export const buildTeamMemberConfigs = (
  preparedLaunch: PreparedTeamApplicationLaunch,
  workspaceRootPath: string | null,
) => preparedLaunch.leafMembers.map((member) => {
  const override = preparedLaunch.config.memberOverrides[member.memberName]
  const llmModelIdentifier = normalizeModelIdentifier(
    override?.llmModelIdentifier || preparedLaunch.config.llmModelIdentifier,
  )

  if (!llmModelIdentifier) {
    throw new Error(
      `A model is required for team member '${member.memberName}' before launching this application.`,
    )
  }

  return {
    memberName: member.memberName,
    memberRouteKey: member.memberRouteKey,
    agentDefinitionId: member.agentDefinitionId,
    llmModelIdentifier,
    autoExecuteTools: override?.autoExecuteTools ?? preparedLaunch.config.autoExecuteTools,
    skillAccessMode: preparedLaunch.config.skillAccessMode,
    workspaceId: preparedLaunch.config.workspaceId || undefined,
    workspaceRootPath: workspaceRootPath || undefined,
    llmConfig: resolveEffectiveMemberLlmConfig(
      override,
      preparedLaunch.config.llmConfig,
    ),
    runtimeKind: normalizeRuntimeKind(preparedLaunch.config.runtimeKind),
  }
})

