import { describe, expect, it } from 'vitest';
import { handleTaskExecutionProjectionMessage } from '~/services/agentStreaming/teamTaskExecutionEventRouter';
import {
  buildCurrentTaskExecutionTeam,
  taskAgentAddress,
  taskAgentEvent,
  taskTeamEvent,
} from '~/services/agentStreaming/__tests__/currentTaskExecutionFixture';
import { findTeamExecutionNode } from '~/services/agentStreaming/teamTaskExecutionTree';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';

describe('deriveDelegatedTaskEntries live task visibility', () => {
  it('relates a task Agent to its stable logical placement without relaxing concrete identity', () => {
    const team = buildCurrentTaskExecutionTeam();
    const executionAddress = taskAgentAddress();
    expect(handleTaskExecutionProjectionMessage(team, taskAgentEvent() as any)).toMatchObject({ outcome: 'handled' });

    expect(deriveDelegatedTaskEntries(team, [], team.focusedExecutionAddress).map((entry) => entry.taskId))
      .toEqual(['task-agent-0001']);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/StudentStudyGroup/student_one',
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: executionAddress.memberAddress,
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: 'foreign-root',
      memberAddress: executionAddress.memberAddress,
    }))).toEqual([]);

    const taskNode = findTeamExecutionNode(team, executionAddress);
    expect(taskNode?.kind).toBe('agent');
    if (taskNode?.kind === 'agent') taskNode.agentRunId = 'mismatched-task-agent-run';
    expect(deriveDelegatedTaskEntries(team, [], team.focusedExecutionAddress)).toEqual([]);
  });

  it('relates a task Team only to the same logical Team in its exact parent scope', () => {
    const team = buildCurrentTaskExecutionTeam();
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any)).toMatchObject({ outcome: 'handled' });
    const focus = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/StudentStudyGroup',
    });

    expect(deriveDelegatedTaskEntries(team, [], focus).map((entry) => entry.taskId))
      .toEqual(['task-team-outer-0001']);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/StudentStudyGroup/LabGroup',
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup',
    }))).toEqual([]);
  });

  it('requires the exact ordered parent chain for a nested task Team', () => {
    const team = buildCurrentTaskExecutionTeam();
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any)).toMatchObject({ outcome: 'handled' });
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent({ nested: true }) as any))
      .toMatchObject({ outcome: 'handled' });
    const focus = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup/LabGroup',
    });

    expect(deriveDelegatedTaskEntries(team, [], focus).map((entry) => entry.taskId))
      .toEqual(['task-team-inner-0002']);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      ...focus,
      taskTeamRunIds: ['foreign-task-team'],
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      ...focus,
      rootTeamRunId: 'foreign-root',
    }))).toEqual([]);

    const nestedAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
      memberAddress: '/StudentStudyGroup/LabGroup',
    });
    const nestedTaskNode = findTeamExecutionNode(team, nestedAddress);
    expect(nestedTaskNode?.kind).toBe('agent_team');
    if (nestedTaskNode?.kind === 'agent_team') nestedTaskNode.teamRunId = 'mismatched-task-team-run';
    expect(deriveDelegatedTaskEntries(team, [], focus)).toEqual([]);
  });
});
