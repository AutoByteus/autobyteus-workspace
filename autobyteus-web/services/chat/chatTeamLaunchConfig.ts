import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { buildTeamRunTemplate } from '~/composables/useDefinitionLaunchDefaults'

export interface ChatTeamLaunchSettings {
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  workspaceId: string
  workspaceMetadata: WorkspaceMetadata
  autoExecuteTools: boolean
}

/**
 * The Team quick path (REQ-010): one runtime, model, thinking, workspace and approval
 * setting for every member. The definition structure comes from the normal team
 * template; the chat's settings become the root config with no overrides.
 */
export const buildChatTeamLaunchConfig = (
  definition: Pick<AgentTeamDefinition, 'id' | 'name' | 'defaultLaunchConfig'>,
  settings: ChatTeamLaunchSettings,
): TeamRunConfig => {
  const template = buildTeamRunTemplate(definition)
  return {
    ...template,
    rootConfig: {
      runtimeKind: settings.runtimeKind,
      workspace: {
        workspaceId: settings.workspaceId,
        workspaceMetadata: { ...settings.workspaceMetadata },
      },
      llmModelIdentifier: settings.llmModelIdentifier,
      llmConfig: settings.llmConfig ? { ...settings.llmConfig } : null,
      autoExecuteTools: settings.autoExecuteTools,
      skillAccessMode: 'PRELOADED_ONLY',
    },
    teamOverrides: {},
    agentOverrides: {},
    isLocked: false,
  }
}
