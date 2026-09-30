import type { AgentRunCollaborationViewDto } from '@autobyteus/collaboration-stream-contracts'

export const created = '2026-09-30T00:00:00.000Z'
export const launch = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/ws' }

export const agentRootView = (): AgentRunCollaborationViewDto => ({
  base_change_sequence: 4,
  is_active: true,
  execution_tree: {
    subjectKind: 'agent', createdAt: created,
    host: { address: '/research_assistant', agentRunId: 'host-run', agentDefinitionId: 'research-assistant' },
    collaborators: [
      { kind: 'agent', address: '/computer_use_agent', agentDefinitionId: 'computer-use', launchConfiguration: launch, addedAt: created, addedViaAgentRunId: 'host-run' },
      { kind: 'agent_team', address: '/product_team', teamDefinitionId: 'product-team', coordinatorAddress: '/product_team/prototyper',
        members: [{ address: '/product_team/prototyper', agentDefinitionId: 'prototyper' }, { address: '/product_team/bootstrapper', agentDefinitionId: 'bootstrapper' }],
        handoffs: [], defaultLaunchConfiguration: launch, addedAt: created, addedViaAgentRunId: 'host-run' },
    ],
    taskExecutions: [
      { address: '/computer_use_agent', agentRunId: 'cua-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created },
      { address: '/product_team', teamRunId: 'team-run', delegatorAgentRunId: 'host-run', startedAt: created, taskExecutions: [], members: [
        { address: '/product_team/prototyper', agentRunId: 'pp-run', platformAgentRunId: null },
        { address: '/product_team/bootstrapper', agentRunId: 'pb-run', platformAgentRunId: null },
      ] },
    ],
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

