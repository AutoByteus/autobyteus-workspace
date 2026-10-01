import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { initializeRuntimeStatusState } from '~/services/runStatus/agentRuntimeStatusState'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { AgentRootChildAgent } from './agentRunCollaborationIndex'

/** One Offline context for a child of an Agent root (a collaborator or an extra copy). */
export const createChildContext = (child: AgentRootChildAgent, createdAt: string, workspace: WorkspaceMetadata | null): AgentContext => {
  const launch = child.source.launchConfiguration
  const config: AgentRunConfig = {
    agentDefinitionId: child.source.agentDefinitionId,
    agentDefinitionName: memberDisplayName(child.address),
    llmModelIdentifier: launch.llmModelIdentifier,
    runtimeKind: launch.runtimeKind,
    workspaceId: workspace?.workspaceId ?? null,
    workspaceMetadata: workspace,
    autoExecuteTools: launch.autoExecuteTools,
    llmConfig: launch.llmConfig ? structuredClone(launch.llmConfig) : null,
    isLocked: true,
  }
  const state = new AgentRunState(child.agentRunId, {
    id: child.agentRunId, messages: [], createdAt, updatedAt: createdAt,
    agentDefinitionId: child.source.agentDefinitionId, agentName: memberDisplayName(child.address),
    llmModelIdentifier: launch.llmModelIdentifier,
  })
  initializeRuntimeStatusState(state, AgentStatus.Offline)
  return new AgentContext(config, state)
}
