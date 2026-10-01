import type { AgentRunCollaborationViewDto } from '@autobyteus/collaboration-stream-contracts'

export const created = '2026-09-30T00:00:00.000Z'
export const launch = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/ws' }

export const agentRootView = (): AgentRunCollaborationViewDto => ({
  base_change_sequence: 4,
  is_active: true,
  execution_tree: {
    subjectKind: 'agent', createdAt: created,
    host: { address: '/research_assistant', agentRunId: 'host-run', agentDefinitionId: 'research-assistant' },
    // Each collaborator is one hosted instance whose runs are recorded in its entry.
    collaborators: [
      { kind: 'agent', address: '/computer_use_agent', agentDefinitionId: 'computer-use', agentRunId: 'cua-run', platformAgentRunId: null,
        launchConfiguration: launch, addedAt: created, addedViaAgentRunId: 'host-run' },
      { kind: 'agent_team', address: '/product_team', teamDefinitionId: 'product-team', teamRunId: 'team-run', coordinatorAddress: '/product_team/prototyper',
        members: [
          { address: '/product_team/prototyper', agentDefinitionId: 'prototyper', agentRunId: 'pp-run', platformAgentRunId: null },
          { address: '/product_team/bootstrapper', agentDefinitionId: 'bootstrapper', agentRunId: 'pb-run', platformAgentRunId: null },
        ],
        handoffs: [], defaultLaunchConfiguration: launch, taskExecutions: [], addedAt: created, addedViaAgentRunId: 'host-run' },
    ],
    taskExecutions: [],
  },
  communication_messages: { schemaVersion: 1, subjectKind: 'agent', hostRunId: 'host-run', messages: [{
    messageId: 'm1', senderAgentRunId: 'cua-run', receiverAgentRunId: 'host-run', content: 'Done, research assistant.',
    messageType: 'direct_message', referenceFiles: [], createdAt: created,
  }] },
  agent_statuses: [
    { agent_run_id: 'cua-run', member_address: '/computer_use_agent', status: 'idle' },
    { agent_run_id: 'pp-run', member_address: '/product_team/prototyper', status: 'running' },
    { agent_run_id: 'pb-run', member_address: '/product_team/bootstrapper', status: 'offline' },
  ],
} as AgentRunCollaborationViewDto)

