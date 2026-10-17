import { describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentOrgConfiguredTeamNode } from '~/types/collaboration/agentOrgExecution';
import { projectAgentOrgTaskTeamStatus, projectAgentOrgTeamBranchStatus } from '../agentOrgTeamBranchStatus';

const launch = {
  runtimeKind: 'codex_app_server' as const,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: null,
  autoExecuteTools: false,
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
      delegatorAgentRunId: 'configured-researcher', startedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      address: '/design', teamRunId: 'task-team', startedAt: '2026-09-01T00:00:00.000Z',
      delegatorAgentRunId: 'configured-researcher',
      members: [{ address: '/design/lead', agentRunId: 'task-team-lead', platformAgentRunId: null }],
      taskExecutions: [
        {
          address: '/design/lead', agentRunId: 'task-team-child-task', platformAgentRunId: null,
          delegatorAgentRunId: 'task-team-lead', startedAt: '2026-09-01T00:00:00.000Z',
        },
        {
          // A task Team the task Team's lead delegated in turn (Teams are flat).
          address: '/review', teamRunId: 'inner-task-team', startedAt: '2026-09-01T00:00:00.000Z',
          delegatorAgentRunId: 'task-team-lead',
          members: [{ address: '/review/reviewer', agentRunId: 'inner-reviewer', platformAgentRunId: null }],
          taskExecutions: [{
            address: '/review/reviewer', agentRunId: 'inner-child-task',
            platformAgentRunId: null, delegatorAgentRunId: 'inner-reviewer', startedAt: '2026-09-01T00:00:00.000Z',
          }],
        },
      ],
    },
  ],
};

const listed = () => true;

describe('projectAgentOrgTeamBranchStatus', () => {
  it('enumerates configured and recursive task Agents in only the supplied Team branch', () => {
    const statuses = new Map<string, AgentStatus>([
      ['configured-lead', AgentStatus.Idle],
      ['configured-researcher', AgentStatus.Error],
      ['direct-task-agent', AgentStatus.Idle],
      ['task-team-lead', AgentStatus.Idle],
      ['inner-reviewer', AgentStatus.Idle],
      ['inner-child-task', AgentStatus.Running],
      ['task-team-child-task', AgentStatus.Idle],
      ['outside-org-agent', AgentStatus.Running],
      ['sibling-team-agent', AgentStatus.Running],
    ]);
    const statusForAgentRunId = vi.fn((runId: string) => statuses.get(runId));

    expect(projectAgentOrgTeamBranchStatus({
      team,
      runAlive: true,
      isListed: listed,
      statusForAgentRunId,
    })).toBe(AgentStatus.Running);
    expect(statusForAgentRunId.mock.calls.map(([runId]) => runId)).toEqual([
      'configured-lead',
      'configured-researcher',
      'direct-task-agent',
      'task-team-lead',
      'task-team-child-task',
      'inner-reviewer',
      'inner-child-task',
    ]);
  });

  it('maps a starting member to busy and reads a stopped Org run as offline (REQ-001/003)', () => {
    const startingOnly = (runId: string) => runId === 'inner-child-task' ? AgentStatus.Initializing : AgentStatus.Idle;
    expect(projectAgentOrgTeamBranchStatus({
      team, runAlive: true, isListed: listed, statusForAgentRunId: startingOnly,
    })).toBe(AgentStatus.Running);
    expect(projectAgentOrgTeamBranchStatus({
      team, runAlive: false, isListed: listed, statusForAgentRunId: () => AgentStatus.Running,
    })).toBe(AgentStatus.Offline);
  });

  it('skips closed task executions and everything under them (REQ-002, AC-006)', () => {
    const statusForAgentRunId = vi.fn((runId: string) => runId === 'inner-child-task' ? AgentStatus.Running : AgentStatus.Idle);
    expect(projectAgentOrgTeamBranchStatus({
      team,
      runAlive: true,
      isListed: (node) => !('teamRunId' in node && node.teamRunId === 'inner-task-team'),
      statusForAgentRunId,
    })).toBe(AgentStatus.Idle);
    expect(statusForAgentRunId.mock.calls.map(([runId]) => runId)).not.toContain('inner-child-task');
  });
});

describe('projectAgentOrgTaskTeamStatus', () => {
  type TaskTeam = Extract<AgentOrgConfiguredTeamNode['taskExecutions'][number], { teamRunId: string }>;
  const taskTeam = team.taskExecutions[1] as TaskTeam;
  /** The Team the task Team's lead delegated in turn (Teams are flat; a Team is never a member). */
  const innerTaskTeam = taskTeam.taskExecutions[1] as TaskTeam;

  it('counts the listed agents in a delegated Team subtree, Teams it delegated included', () => {
    const statusForAgentRunId = vi.fn((runId: string) => runId === 'inner-reviewer' ? AgentStatus.Error : AgentStatus.Idle);
    expect(projectAgentOrgTaskTeamStatus({ team: taskTeam, runAlive: true, isListed: listed, statusForAgentRunId }))
      .toBe(AgentStatus.Error);
    expect(statusForAgentRunId.mock.calls.map(([runId]) => runId)).toEqual([
      'task-team-lead', 'task-team-child-task', 'inner-reviewer', 'inner-child-task',
    ]);
    expect(projectAgentOrgTaskTeamStatus({
      team: innerTaskTeam, runAlive: true, isListed: listed,
      statusForAgentRunId: (runId) => runId === 'inner-child-task' ? AgentStatus.Running : AgentStatus.Offline,
    })).toBe(AgentStatus.Running);
    expect(projectAgentOrgTaskTeamStatus({
      team: taskTeam, runAlive: false, isListed: listed, statusForAgentRunId: () => AgentStatus.Running,
    })).toBe(AgentStatus.Offline);
  });
});
