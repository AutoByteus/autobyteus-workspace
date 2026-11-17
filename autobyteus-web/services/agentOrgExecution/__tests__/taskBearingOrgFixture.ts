import type { AgentOrgExecutionViewDto, RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { orgRunTreeRows, ownOrgTree, type RecordedOrgTree } from '~/test-support/runTreeFixtures'
const launch = {
  runtimeKind: 'codex_app_server' as const,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: null,
  autoExecuteTools: false,
  workspaceRootPath: null,
}

const configuredOrigin = { origin: 'configured' as const, fallbacks: [] }

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
  background_tasks_running: 0,
  trigger: null,
  tool_name: null,
  error_message: null,
  error_details: null, recoverableBlock: null,
})

/**
 * The Org run as its records have it (autobyteus-461 SR-084): its own parts, and the runs its director delegated (a copy
 * of `/worker` and a copy of `/team`). Its view carries the own parts; the delegated runs are its tree's rows.
 */
export const taskBearingRecordedTree = (): RecordedOrgTree => ({
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
    // Copies of configured placements: each records the placement's snapshot from when it started.
    taskExecutions: [{
      address: '/worker',
      agentRunId: 'agent-worker-task',
      platformAgentRunId: null,
      delegatorAgentRunId: 'agent-director',
      startedAt: '2026-09-01T00:00:01.000Z',
      source: { kind: 'agent', agentDefinitionId: 'definition-agent-worker-configured', launchConfiguration: launch, launchSource: configuredOrigin },
    }, {
      address: '/team',
      teamRunId: 'team-task',
      members: [
        { address: '/team/lead', agentRunId: 'agent-task-lead', platformAgentRunId: null },
        { address: '/team/worker', agentRunId: 'agent-task-worker', platformAgentRunId: null },
      ],
      taskExecutions: [],
      delegatorAgentRunId: 'agent-director',
      startedAt: '2026-09-01T00:00:02.000Z',
      source: {
        // Keys in the contract schema's order (a parsed DTO's order).
        kind: 'agent_team', teamDefinitionId: 'team-definition', coordinatorAddress: '/team/lead',
        members: [
          { address: '/team/lead', agentDefinitionId: 'definition-agent-lead-configured', launchConfiguration: launch },
          { address: '/team/worker', agentDefinitionId: 'definition-agent-team-worker-configured', launchConfiguration: launch },
        ],
        handoffs: [], defaultLaunchConfiguration: launch, defaultLaunchSource: configuredOrigin,
      },
      // Where it opens, as the server sends it (SR-083): its coordinator (after `source`, the schema's order).
      openTarget: { runKind: 'agent_team', runId: 'team-task', agentRunId: 'agent-task-lead' },
    }],
  },
})

/** The Org's tree rows, as its view's stream gives them. */
export const taskBearingTreeRows = (): RunTreeRowDto[] => orgRunTreeRows('org-run', taskBearingRecordedTree())

export const taskBearingView = (): AgentOrgExecutionViewDto => ({
  base_change_sequence: 8, live_sequence_id: 'live-1', last_message_change_sequence: 0,
  is_active: true,
  execution_tree: ownOrgTree(taskBearingRecordedTree()),
  agent_input_states: [], agent_statuses: [
    status('/director', 'agent-director'),
    status('/worker', 'agent-worker-configured'),
    status('/team/lead', 'agent-lead-configured'),
    status('/team/worker', 'agent-team-worker-configured'),
    // The delegated runs' agents report through their own runs, by run ID (SR-083), not in the Org's view.
  ],
})
