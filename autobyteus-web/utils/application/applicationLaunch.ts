import {
  buildAgentRunTemplate,
  buildTeamRunTemplate,
  cloneAgentConfig,
  cloneTeamConfig,
  normalizeModelConfig,
  normalizeModelIdentifier,
  normalizeRuntimeKind,
} from '~/composables/useDefinitionLaunchDefaults'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type {
  TeamRunConfig,
} from '~/types/agent/TeamRunConfig'
import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type {
  ApplicationCatalogEntry,
} from '~/stores/applicationStore'
import type { useWorkspaceStore } from '~/stores/workspace'
import { resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers'
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder'

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

export {
  cloneAgentConfig,
  cloneTeamConfig,
  normalizeModelConfig,
  normalizeModelIdentifier,
  normalizeRuntimeKind,
}

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

export const buildPreparedAgentLaunch = (
  application: ApplicationCatalogEntry,
  agentDefinition: AgentDefinition,
): PreparedAgentApplicationLaunch => ({
  kind: 'AGENT',
  application,
  agentDefinition,
  config: cloneAgentConfig(buildAgentRunTemplate(agentDefinition)),
})

export const buildPreparedTeamLaunch = (
  application: ApplicationCatalogEntry,
  teamDefinition: AgentTeamDefinition,
  _getAgentDefinitionById: (agentDefinitionId: string) => AgentDefinition | null | undefined,
  getTeamDefinitionById: (teamDefinitionId: string) => AgentTeamDefinition | null | undefined,
): PreparedTeamApplicationLaunch => ({
  kind: 'AGENT_TEAM',
  application,
  teamDefinition,
  leafMembers: resolveLeafTeamMembers(teamDefinition, {
    getTeamDefinitionById: (teamDefinitionId: string) =>
      getTeamDefinitionById(teamDefinitionId) ?? null,
  }),
  config: cloneTeamConfig(buildTeamRunTemplate(teamDefinition)),
})

export const buildTeamMemberConfigs = (
  preparedLaunch: PreparedTeamApplicationLaunch,
  workspaceRootPath: string | null,
) => buildTeamRunMemberConfigRecords({
  config: preparedLaunch.config,
  leafMembers: preparedLaunch.leafMembers,
  workspaceRootPath,
})
