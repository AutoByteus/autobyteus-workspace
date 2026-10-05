import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride, TeamRunConfig } from '~/types/agent/TeamRunConfig'
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
 * A Team started from New chat (REQ-010): the composer's runtime, model, model config, workspace
 * and approval are the root config every member follows, and each customized member launches with
 * its own settings (`agentOverrides`, only the fields that differ). The definition structure comes
 * from the normal team template.
 */
export const buildChatTeamLaunchConfig = (
  definition: Pick<AgentTeamDefinition, 'id' | 'name' | 'defaultLaunchConfig'>,
  settings: ChatTeamLaunchSettings,
  agentOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>> = {},
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
    },
    teamOverrides: {},
    agentOverrides: Object.fromEntries(Object.entries(agentOverrides).map(([address, override]) => [address, {
      ...override,
      ...(override.llmConfig !== undefined ? { llmConfig: override.llmConfig ? { ...override.llmConfig } : null } : {}),
    }])),
    isLocked: false,
  }
}
