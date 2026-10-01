import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { initializeRuntimeStatusState } from '~/services/runStatus/agentRuntimeStatusState'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'

type LaunchConfiguration = AgentOrgExecutionViewDto['execution_tree']['rootOrg']['defaultLaunchConfiguration']

export type AgentSeed = Readonly<{
  address: AgentTeamAddress
  agentRunId: string
  agentDefinitionId: string
  launch: LaunchConfiguration
}>

/** One Offline Org member context (a configured member, a collaborator or a delegated child). */
export const createAgentContext = (
  seed: AgentSeed,
  createdAt: string,
  workspace: WorkspaceMetadata | null,
): AgentContext => {
  const config: AgentRunConfig = {
    agentDefinitionId: seed.agentDefinitionId,
    agentDefinitionName: memberDisplayName(seed.address),
    llmModelIdentifier: seed.launch.llmModelIdentifier,
    runtimeKind: seed.launch.runtimeKind,
    workspaceId: workspace?.workspaceId ?? null,
    workspaceMetadata: workspace,
    autoExecuteTools: seed.launch.autoExecuteTools,
    llmConfig: seed.launch.llmConfig ? structuredClone(seed.launch.llmConfig) : null,
    isLocked: true,
  }
  const state = new AgentRunState(seed.agentRunId, {
    id: seed.agentRunId,
    messages: [],
    createdAt,
    updatedAt: createdAt,
    agentDefinitionId: seed.agentDefinitionId,
    agentName: memberDisplayName(seed.address),
    llmModelIdentifier: seed.launch.llmModelIdentifier,
  })
  initializeRuntimeStatusState(state, AgentStatus.Offline)
  return new AgentContext(config, state)
}
