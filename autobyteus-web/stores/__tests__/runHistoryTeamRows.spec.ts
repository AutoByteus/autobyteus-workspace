import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';
import { buildTeamRowsFromContext } from '../runHistoryTeamRows';

describe('runHistoryTeamRows current execution tree', () => {
  it('projects only configured topology rows and excludes task executions at the same placement', () => {
    const names = ['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer'];
    const rootTeamRunId = 'software-team-run';
    const nodes = names.map((name, index) => testAgentNode(`/${name}`, {
      agentRunId: `${name}-run`, currentStatus: index === 0 ? AgentStatus.Running : AgentStatus.Offline,
    }));
    const team = buildTestTeamContext({
      teamRunId: rootTeamRunId,
      coordinatorAddress: '/solution_designer',
      rootChildren: nodes,
      workspaceRootPath: '/workspace',
      contexts: [{
        agentRunId: 'solution_designer-run',
        context: testAgentContext({
          runId: 'solution_designer-run', displayName: 'solution_designer',
          status: AgentStatus.Running, workspaceRootPath: '/workspace',
        }),
      }],
      tasks: [testTaskRecord({
        taskId: 'task-1', delegatorAgentRunId: 'solution_designer-run',
        recipientAddress: '/implementation_engineer', target: { agentRunId: 'task-agent-run-1' },
      })],
    });

    const rows = buildTeamRowsFromContext(team, 'summary', '2026-06-02T00:00:00.000Z', () => '/workspace');

    expect(rows.map((row) => row.memberAddress)).toEqual(names.map((name) => `/${name}`));
    expect(rows.map((row) => row.displayName)).toEqual(names);
    expect(rows.flatMap((row) => [row.agentRunId, ...row.children.map((child) => child.agentRunId)]))
      .not.toContain('task-agent-run-1');
    expect(rows[0]?.currentStatus).toBe(AgentStatus.Running);
    expect(rows.slice(1).every((row) => row.currentStatus === AgentStatus.Offline)).toBe(true);
  });

  it('derives labels from logical placement rather than Agent definition names', () => {
    const programManager = testAgentNode('/program_manager', { agentRunId: 'program-manager-run' });
    const reviewLead = testAgentNode('/BuildSquad/review_lead', { agentRunId: 'review-lead-run' });
    const buildSquad = testSubTeamNode('/BuildSquad', [reviewLead], {
      teamDefinitionId: 'build-squad', teamRunId: 'build-squad-run', coordinatorAddress: reviewLead.address,
    });
    const team = buildTestTeamContext({
      teamRunId: 'team-1', coordinatorAddress: programManager.address,
      rootChildren: [programManager, buildSquad], workspaceRootPath: '/workspace',
      contexts: [
        { agentRunId: programManager.agentRunId, context: testAgentContext({
          runId: programManager.agentRunId, displayName: 'Different Agent definition', workspaceRootPath: '/workspace',
        }) },
        { agentRunId: reviewLead.agentRunId, context: testAgentContext({
          runId: reviewLead.agentRunId, displayName: 'Different nested definition', workspaceRootPath: '/workspace',
        }) },
      ],
    });

    const rows = buildTeamRowsFromContext(team, 'summary', '2026-05-13T00:00:00.000Z', () => '/workspace');
    expect(rows[0]?.displayName).toBe('program_manager');
    expect(rows[1]?.displayName).toBe('BuildSquad');
    expect(rows[1]?.children[0]?.displayName).toBe('review_lead');
  });
});
