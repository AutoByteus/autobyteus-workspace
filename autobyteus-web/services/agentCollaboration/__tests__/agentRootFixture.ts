import type { AgentRunCollaborationViewDto } from '@autobyteus/collaboration-stream-contracts'

export const created = '2026-09-30T00:00:00.000Z'
export const launch = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/ws' }

type MutableView = { -readonly [K in keyof AgentRunCollaborationViewDto]: AgentRunCollaborationViewDto[K] }
export const agentRootView = (): MutableView => ({
  base_change_sequence: 4,
  is_active: true,
  closed_task_executions: [], execution_tree: {
    subjectKind: 'agent', createdAt: created,
    host: { address: '/research_assistant', agentRunId: 'host-run', agentDefinitionId: 'research-assistant' },
    // Delegated runs of the host: an Agent copy and a Team copy, each recording its catalog source.
    taskExecutions: [
      { address: '/computer_use_agent', agentRunId: 'cua-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created,
        source: { kind: 'agent', agentDefinitionId: 'computer-use', launchConfiguration: launch } },
      { address: '/product_team', teamRunId: 'team-run', delegatorAgentRunId: 'host-run', startedAt: created,
        members: [
          { address: '/product_team/prototyper', agentRunId: 'pp-run', platformAgentRunId: null },
          { address: '/product_team/bootstrapper', agentRunId: 'pb-run', platformAgentRunId: null },
        ],
        taskExecutions: [],
        source: { kind: 'agent_team', teamDefinitionId: 'product-team', coordinatorAddress: '/product_team/prototyper', handoffs: [],
          members: [
            { address: '/product_team/prototyper', agentDefinitionId: 'prototyper', launchConfiguration: launch, followsTeam: true },
            { address: '/product_team/bootstrapper', agentDefinitionId: 'bootstrapper', launchConfiguration: launch, followsTeam: true },
          ], defaultLaunchConfiguration: launch } },
    ],
  },
  communication_messages: { schemaVersion: 1, subjectKind: 'agent', hostRunId: 'host-run', messages: [{
    messageId: 'm1', senderAgentRunId: 'cua-run', receiverAgentRunId: 'host-run', content: 'Done, research assistant.',
    messageType: 'direct_message', referenceFiles: [], createdAt: created,
  }] },
  agent_input_states: [],
  agent_statuses: [
    { agent_run_id: 'cua-run', member_address: '/computer_use_agent', status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
    { agent_run_id: 'pp-run', member_address: '/product_team/prototyper', status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
    { agent_run_id: 'pb-run', member_address: '/product_team/bootstrapper', status: 'offline', trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
  ],
} as MutableView)
