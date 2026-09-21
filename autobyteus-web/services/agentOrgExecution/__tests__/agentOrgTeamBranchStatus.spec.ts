import { describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentOrgConfiguredTeamNode } from '~/types/collaboration/agentOrgExecution';
import { projectAgentOrgTeamBranchStatus } from '../agentOrgTeamBranchStatus';

const launch = {
  runtimeKind: 'codex_app_server' as const,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  workspaceRootPath: '/tmp/org',
};

const team: AgentOrgConfiguredTeamNode = {
  address: '/design',
  teamDefinitionId: 'design-definition',
  role: null,
  description: null,
  teamRunId: 'design-run',
  coordinatorAddress: '/design/lead',
  defaultLaunchConfiguration: launch,
  members: [
    {
      address: '/design/lead', agentDefinitionId: 'lead-definition', role: null,
      description: null, agentRunId: 'configured-lead', platformAgentRunId: null,
      launchConfiguration: launch,
    },
    {
      address: '/design/researcher', agentDefinitionId: 'researcher-definition', role: null,
      description: null, agentRunId: 'configured-researcher', platformAgentRunId: null,
      launchConfiguration: launch,
    },
  ],
  taskExecutions: [
    {
      address: '/design/lead', agentRunId: 'direct-task-agent', platformAgentRunId: null,
      startedAt: '2026-09-01T00:00:00.000Z', settledAt: null,
    },
    {
      address: '/design', teamRunId: 'task-team', startedAt: '2026-09-01T00:00:00.000Z',
      settledAt: null,
      members: [
        { address: '/design/lead', agentRunId: 'task-team-lead', platformAgentRunId: null },
        {
          address: '/design/review', teamRunId: 'nested-task-team',
          members: [{ address: '/design/review/reviewer', agentRunId: 'nested-reviewer', platformAgentRunId: null }],
          taskExecutions: [{
            address: '/design/review/reviewer', agentRunId: 'nested-child-task',
            platformAgentRunId: null, startedAt: '2026-09-01T00:00:00.000Z', settledAt: null,
          }],
        },
      ],
      taskExecutions: [{
        address: '/design/lead', agentRunId: 'task-team-child-task', platformAgentRunId: null,
        startedAt: '2026-09-01T00:00:00.000Z', settledAt: null,
      }],
    },
  ],
};

describe('projectAgentOrgTeamBranchStatus', () => {
  it('enumerates configured and recursive task Agents in only the supplied Team branch', () => {
    const statuses = new Map<string, AgentStatus>([
      ['configured-lead', AgentStatus.Idle],
      ['configured-researcher', AgentStatus.Error],
      ['direct-task-agent', AgentStatus.Idle],
      ['task-team-lead', AgentStatus.Idle],
      ['nested-reviewer', AgentStatus.Idle],
      ['nested-child-task', AgentStatus.Running],
      ['task-team-child-task', AgentStatus.Idle],
      ['outside-org-agent', AgentStatus.Running],
      ['sibling-team-agent', AgentStatus.Running],
    ]);
    const statusForAgentRunId = vi.fn((runId: string) => statuses.get(runId));

    expect(projectAgentOrgTeamBranchStatus({
      team,
      authority: 'live',
      statusForAgentRunId,
    })).toBe(AgentStatus.Running);
    expect(statusForAgentRunId.mock.calls.map(([runId]) => runId)).toEqual([
      'configured-lead',
      'configured-researcher',
      'direct-task-agent',
      'task-team-lead',
      'nested-reviewer',
      'nested-child-task',
      'task-team-child-task',
    ]);
  });

  it('applies historical authority without changing branch membership', () => {
    expect(projectAgentOrgTeamBranchStatus({
      team,
      authority: 'historical',
      statusForAgentRunId: (runId) => runId === 'nested-child-task'
        ? AgentStatus.Running
        : AgentStatus.Idle,
    })).toBe(AgentStatus.Idle);
  });
});
