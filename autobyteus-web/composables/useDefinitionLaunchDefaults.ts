import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import type {
  MemberConfigOverride,
  TeamRunConfig,
} from '~/types/agent/TeamRunConfig'
import {
  normalizeDefaultLaunchConfig,
  normalizeModelConfigRecord,
} from '~/types/launch/defaultLaunchConfig'

export const normalizeModelIdentifier = (value: string | null | undefined): string =>
  (value || '').trim()

export const normalizeRuntimeKind = (
  value: string | null | undefined,
): AgentRuntimeKind => {
  const normalized = (value || '').trim()
  return (normalized || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind
}

export const normalizeModelConfig = normalizeModelConfigRecord

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
      } satisfies MemberConfigOverride,
    ]),
  ),
})

export const buildAgentRunTemplate = (
  definition: Pick<AgentDefinition, 'id' | 'name' | 'avatarUrl' | 'defaultLaunchConfig'>,
): AgentRunConfig => {
  const defaults = normalizeDefaultLaunchConfig(definition.defaultLaunchConfig)

  return {
    agentDefinitionId: definition.id,
    agentDefinitionName: definition.name,
    agentAvatarUrl: definition.avatarUrl ?? null,
    llmModelIdentifier: normalizeModelIdentifier(defaults?.llmModelIdentifier),
    runtimeKind: normalizeRuntimeKind(defaults?.runtimeKind),
    workspaceId: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    isLocked: false,
    llmConfig: normalizeModelConfig(defaults?.llmConfig),
  }
}

export const buildTeamRunTemplate = (
  definition: Pick<AgentTeamDefinition, 'id' | 'name' | 'defaultLaunchConfig'>,
): TeamRunConfig => {
  const defaults = normalizeDefaultLaunchConfig(definition.defaultLaunchConfig)

  return {
    teamDefinitionId: definition.id,
    teamDefinitionName: definition.name,
    runtimeKind: normalizeRuntimeKind(defaults?.runtimeKind),
    workspaceId: null,
    llmModelIdentifier: normalizeModelIdentifier(defaults?.llmModelIdentifier),
    llmConfig: normalizeModelConfig(defaults?.llmConfig),
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    memberOverrides: {},
    isLocked: false,
  }
}
