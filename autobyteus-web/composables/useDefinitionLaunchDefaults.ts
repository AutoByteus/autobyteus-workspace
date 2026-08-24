import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRuntimeKind } from '~/types/agent/AgentRunConfig'
import type {
  AgentConfigOverride,
  TeamRunConfig,
  TeamRunConfigurationView,
  TeamScopeConfigOverride,
  TeamWorkspaceSelection,
} from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { normalizeDefaultLaunchConfig, normalizeModelConfigRecord } from '~/types/launch/defaultLaunchConfig'
import { modelConfigsEqual } from '~/utils/teamRunConfigUtils'

export const normalizeModelIdentifier = (value: string | null | undefined): string => (value || '').trim()
export const normalizeRuntimeKind = (value: string | null | undefined): AgentRuntimeKind =>
  ((value || '').trim() || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind
export const normalizeModelConfig = normalizeModelConfigRecord

const cloneWorkspaceMetadata = (metadata: WorkspaceMetadata | null): WorkspaceMetadata | null => metadata
  ? { workspaceId: metadata.workspaceId, workspaceRootPath: metadata.workspaceRootPath, displayName: metadata.displayName, kind: metadata.kind }
  : null
const cloneWorkspace = (workspace: TeamWorkspaceSelection): TeamWorkspaceSelection => ({
  workspaceId: workspace.workspaceId,
  workspaceMetadata: cloneWorkspaceMetadata(workspace.workspaceMetadata),
})
const cloneOverride = <T extends AgentConfigOverride | TeamScopeConfigOverride>(override: T): T => {
  const cloned = { ...override }
  if (Object.hasOwn(override, 'llmConfig')) cloned.llmConfig = normalizeModelConfig(override.llmConfig)
  if ('workspace' in override && override.workspace) {
    (cloned as TeamScopeConfigOverride).workspace = cloneWorkspace(override.workspace)
  }
  return cloned
}

export const cloneAgentConfig = (config: AgentRunConfig): AgentRunConfig => ({
  ...config,
  workspaceMetadata: cloneWorkspaceMetadata(config.workspaceMetadata),
  llmConfig: normalizeModelConfig(config.llmConfig),
})
export const buildEditableAgentRunSeed = (config: AgentRunConfig): AgentRunConfig => ({ ...cloneAgentConfig(config), isLocked: false })
export const cloneTeamConfig = (config: Readonly<TeamRunConfig>): TeamRunConfig => ({
  teamDefinitionId: config.teamDefinitionId,
  teamDefinitionName: config.teamDefinitionName,
  rootConfig: {
    ...config.rootConfig,
    workspace: cloneWorkspace(config.rootConfig.workspace),
    llmConfig: normalizeModelConfig(config.rootConfig.llmConfig),
  },
  teamOverrides: Object.fromEntries(Object.entries(config.teamOverrides || {}).map(([address, value]) => [address, cloneOverride(value)])),
  agentOverrides: Object.fromEntries(Object.entries(config.agentOverrides || {}).map(([address, value]) => [address, cloneOverride(value)])),
  isLocked: config.isLocked,
})
const workspaceFromResolved = (
  config: TeamRunConfigurationView['root']['effectiveConfig'],
): TeamWorkspaceSelection => ({
  workspaceId: config.workspaceId,
  workspaceMetadata: cloneWorkspaceMetadata(config.workspaceMetadata),
})
const authorableTeamDifference = (
  child: TeamRunConfigurationView['root']['effectiveConfig'],
  parent: TeamRunConfigurationView['root']['effectiveConfig'],
): TeamScopeConfigOverride | null => {
  const override: TeamScopeConfigOverride = {}
  if (child.runtimeKind !== parent.runtimeKind) override.runtimeKind = child.runtimeKind
  if (child.workspaceRootPath !== parent.workspaceRootPath && child.workspaceMetadata) {
    override.workspace = workspaceFromResolved(child)
  }
  if (child.llmModelIdentifier !== parent.llmModelIdentifier) override.llmModelIdentifier = child.llmModelIdentifier
  if (!modelConfigsEqual(child.llmConfig, parent.llmConfig)) override.llmConfig = normalizeModelConfig(child.llmConfig)
  if (child.autoExecuteTools !== parent.autoExecuteTools) override.autoExecuteTools = child.autoExecuteTools
  return Object.keys(override).length ? override : null
}
const authorableAgentDifference = (
  child: TeamRunConfigurationView['root']['effectiveConfig'],
  parent: TeamRunConfigurationView['root']['effectiveConfig'],
): AgentConfigOverride | null => {
  const override: AgentConfigOverride = {}
  if (child.runtimeKind !== parent.runtimeKind) override.runtimeKind = child.runtimeKind
  if (child.llmModelIdentifier !== parent.llmModelIdentifier) override.llmModelIdentifier = child.llmModelIdentifier
  if (!modelConfigsEqual(child.llmConfig, parent.llmConfig)) override.llmConfig = normalizeModelConfig(child.llmConfig)
  if (child.autoExecuteTools !== parent.autoExecuteTools) override.autoExecuteTools = child.autoExecuteTools
  return Object.keys(override).length ? override : null
}
const editableSeedFromConfigurationView = (view: Readonly<TeamRunConfigurationView>): TeamRunConfig => {
  const teamOverrides = Object.fromEntries(Object.values(view.teamsByAddress).flatMap((team) => {
    if (team.address === '/' || !team.parentAddress) return []
    const parent = view.teamsByAddress[team.parentAddress]
    const override = parent ? authorableTeamDifference(team.effectiveConfig, parent.effectiveConfig) : null
    return override ? [[team.address, override]] : []
  }))
  const agentOverrides = Object.fromEntries(Object.values(view.agentsByAddress).flatMap((agent) => {
    const parent = view.teamsByAddress[agent.containingTeamAddress]
    const override = parent ? authorableAgentDifference(agent.effectiveConfig, parent.effectiveConfig) : null
    return override ? [[agent.address, override]] : []
  }))
  return {
    teamDefinitionId: view.teamDefinitionId,
    teamDefinitionName: view.teamDefinitionName,
    rootConfig: {
      runtimeKind: view.root.effectiveConfig.runtimeKind,
      workspace: workspaceFromResolved(view.root.effectiveConfig),
      llmModelIdentifier: view.root.effectiveConfig.llmModelIdentifier,
      llmConfig: normalizeModelConfig(view.root.effectiveConfig.llmConfig),
      autoExecuteTools: view.root.effectiveConfig.autoExecuteTools,
      skillAccessMode: view.root.effectiveConfig.skillAccessMode,
    },
    teamOverrides,
    agentOverrides,
    isLocked: false,
  }
}
export const buildEditableTeamRunSeed = (
  source: Readonly<TeamRunConfig> | Readonly<TeamRunConfigurationView>,
): TeamRunConfig => 'rootConfig' in source
  ? { ...cloneTeamConfig(source), isLocked: false }
  : editableSeedFromConfigurationView(source)

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
    workspaceMetadata: null,
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
    rootConfig: {
      runtimeKind: normalizeRuntimeKind(defaults?.runtimeKind),
      workspace: { workspaceId: null, workspaceMetadata: null },
      llmModelIdentifier: normalizeModelIdentifier(defaults?.llmModelIdentifier),
      llmConfig: normalizeModelConfig(defaults?.llmConfig),
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
    },
    teamOverrides: {},
    agentOverrides: {},
    isLocked: false,
  }
}
