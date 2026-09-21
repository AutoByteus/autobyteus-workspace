import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
const launch = {
  runtimeKind: 'codex_app_server' as const,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  workspaceRootPath: null,
}

const configuredAgent = (address: string, agentRunId: string) => ({
  address,
  agentDefinitionId: `definition-${agentRunId}`,
  role: null,
  description: null,
  agentRunId,
  platformAgentRunId: null,
  launchConfiguration: launch,
})

const status = (member_address: string, agent_run_id: string) => ({
  member_address,
  agent_run_id,
  status: 'idle' as const,
  trigger: null,
  tool_name: null,
  error_message: null,
  error_details: null,
})

export const taskRecord = (
  taskId: string,
  recipientAddress: string,
  taskExecution: { agentRunId: string } | { teamRunId: string },
) => ({
  taskId,
  delegatorAgentRunId: 'agent-director',
  recipientAddress,
  taskExecution,
  description: `Task ${taskId}`,
  referenceFiles: [],
  status: 'active' as const,
  updates: [],
  createdAt: '2026-09-01T00:00:01.000Z',
})

export const taskBearingView = (): AgentOrgExecutionViewDto => ({
  base_change_sequence: 8,
  is_active: true,
  execution_tree: {
    schemaVersion: 1,
    subjectKind: 'agent_org',
    createdAt: '2026-09-01T00:00:00.000Z',
    archivedAt: null,
    applicationBinding: null,
    handoffs: [],
    rootOrg: {
      address: '/',
      orgDefinitionId: 'org-definition',
      orgDefinitionName: 'Restored Org',
      orgRunId: 'org-run',
      defaultLaunchConfiguration: launch,
      members: [
        configuredAgent('/director', 'agent-director'),
        configuredAgent('/worker', 'agent-worker-configured'),
        {
          address: '/team',
          teamDefinitionId: 'team-definition',
          role: null,
          description: null,
          teamRunId: 'team-configured',
          coordinatorAddress: '/team/lead',
          defaultLaunchConfiguration: launch,
          members: [
            configuredAgent('/team/lead', 'agent-lead-configured'),
            configuredAgent('/team/worker', 'agent-team-worker-configured'),
          ],
          taskExecutions: [],
        },
      ],
      taskExecutions: [{
        address: '/worker',
        agentRunId: 'agent-worker-task',
        platformAgentRunId: null,
        startedAt: '2026-09-01T00:00:01.000Z',
        settledAt: null,
      }, {
        address: '/team',
        teamRunId: 'team-task',
        members: [
          { address: '/team/lead', agentRunId: 'agent-task-lead', platformAgentRunId: null },
          { address: '/team/worker', agentRunId: 'agent-task-worker', platformAgentRunId: null },
        ],
        taskExecutions: [],
        startedAt: '2026-09-01T00:00:02.000Z',
        settledAt: null,
      }],
    },
  },
  task_records: {
    schemaVersion: 1,
    subjectKind: 'agent_org',
    orgRunId: 'org-run',
    records: [
      taskRecord('task-agent', '/worker', { agentRunId: 'agent-worker-task' }),
      taskRecord('task-team', '/team', { teamRunId: 'team-task' }),
    ],
  },
  communication_messages: {
    schemaVersion: 1,
    subjectKind: 'agent_org',
    orgRunId: 'org-run',
    messages: [],
  },
  agent_statuses: [
    status('/director', 'agent-director'),
    status('/worker', 'agent-worker-configured'),
    status('/team/lead', 'agent-lead-configured'),
    status('/team/worker', 'agent-team-worker-configured'),
    status('/worker', 'agent-worker-task'),
    status('/team/lead', 'agent-task-lead'),
    status('/team/worker', 'agent-task-worker'),
  ],
})
