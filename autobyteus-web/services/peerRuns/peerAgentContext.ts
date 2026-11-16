import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import { initializeRuntimeStatusState } from '~/services/runStatus/agentRuntimeStatusState'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'

/**
 * One Offline context for an agent of a run another node runs (autobyteus-278), in any root family. Its node keeps
 * its definition, model and workspace; the window knows its address, so the context names it and holds its
 * conversation (its own stream through this node's `/ws/peer-run`, G-D1).
 */
export const createPeerAgentContext = (agentRunId: string, address: string, createdAt: string): AgentContext => {
  const name = memberDisplayName(address)
  const config: AgentRunConfig = {
    agentDefinitionId: '', agentDefinitionName: name, llmModelIdentifier: '', runtimeKind: '',
    workspaceId: null, workspaceMetadata: null, autoExecuteTools: true, llmConfig: null, isLocked: true,
  }
  const state = new AgentRunState(agentRunId, {
    id: agentRunId, messages: [], createdAt, updatedAt: createdAt, agentDefinitionId: '', agentName: name, llmModelIdentifier: '',
  })
  initializeRuntimeStatusState(state, AgentStatus.Offline)
  return new AgentContext(config, state)
}
