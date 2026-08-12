import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures';
import { buildTeamRowsFromContext } from '../runHistoryTeamRows';

describe('runHistoryTeamRows current rooted metadata', () => {
  it('builds stable live context rows while filtering transient task executions', () => {
    const names = [
      'solution_designer',
      'architecture_reviewer',
      'implementation_engineer',
      'code_reviewer',
      'api_e2e_engineer',
      'delivery_engineer',
    ];
    const addresses = names.map((name) => `/${name}`);
    const rootTeamRunId = 'team-software-engineering-1';
    const taskAgentAddress = createTeamExecutionAddress({
      rootTeamRunId,
      memberAddress: '/implementation_engineer',
      taskAgentRunId: 'task-agent-run-1',
    });
    const stableNodes = names.map((name, index) => testAgentNode(`/${name}`, {
      displayName: name,
      agentRunId: `${name}-run`,
      currentStatus: index === 0 ? AgentStatus.Running : AgentStatus.Offline,
    }));
    const team = buildTestTeamContext({
      teamRunId: rootTeamRunId,
      coordinatorAddress: '/solution_designer',
      rootChildren: stableNodes,
      workspaceRootPath: '/workspace',
      contexts: [{
        executionAddress: createTeamExecutionAddress({
          rootTeamRunId,
          memberAddress: '/solution_designer',
        }),
        context: testAgentContext({
          runId: 'solution_designer-run',
          displayName: 'solution_designer',
          status: AgentStatus.Running,
          workspaceRootPath: '/workspace',
        }),
      }],
      tasks: [testTaskProjection({
        taskId: 'task_0001',
        executionAddress: taskAgentAddress,
        senderAddress: createTeamExecutionAddress({
          rootTeamRunId,
          memberAddress: '/solution_designer',
        }),
      })],
    });

    const rows = buildTeamRowsFromContext(team, 'summary', '2026-06-02T00:00:00.000Z', () => '/workspace');

    expect(rows.map((row) => row.memberAddress)).toEqual(addresses);
    expect(rows.map((row) => row.displayName)).toEqual(names);
    expect(rows.flatMap((row) => [row.memberAddress, ...row.children.map((child) => child.memberAddress)]))
      .not.toContain('task-agent-run-1');
    expect(rows[0]?.currentStatus).toBe(AgentStatus.Running);
    expect(rows.slice(1).every((row) => row.currentStatus === AgentStatus.Offline)).toBe(true);
  });

  it('uses structural membership labels rather than Agent definition names', () => {
    const rootTeamRunId = 'team-1';
    const programManager = testAgentNode('/program_manager', {
      displayName: 'program_manager',
      agentRunId: 'program-manager-run',
      agentDefinitionId: 'nested-program-manager',
    });
    const reviewLead = testAgentNode('/BuildSquad/review_lead', {
      displayName: 'review_lead',
      agentRunId: 'review-lead-run',
      agentDefinitionId: 'nested-review-lead',
    });
    const buildSquad = testSubTeamNode('/BuildSquad', [reviewLead], {
      displayName: 'BuildSquad',
      teamDefinitionId: 'build-squad',
      teamRunId: 'build-squad-run',
      coordinatorAddress: reviewLead.address,
    });
    const team = buildTestTeamContext({
      teamRunId: rootTeamRunId,
      coordinatorAddress: programManager.address,
      rootChildren: [programManager, buildSquad],
      workspaceRootPath: '/workspace',
      contexts: [
        {
          executionAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress: programManager.address }),
          context: testAgentContext({
            runId: programManager.agentRunId,
            displayName: 'Nested Program Manager Agent',
            status: AgentStatus.Idle,
            workspaceRootPath: '/workspace',
          }),
        },
        {
          executionAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress: reviewLead.address }),
          context: testAgentContext({
            runId: reviewLead.agentRunId,
            displayName: 'Nested Review Lead Agent',
            status: AgentStatus.Idle,
            workspaceRootPath: '/workspace',
          }),
        },
      ],
    });

    const rows = buildTeamRowsFromContext(team, 'summary', '2026-05-13T00:00:00.000Z', () => '/workspace');

    expect(rows[0]?.displayName).toBe('program_manager');
    expect(rows[1]?.displayName).toBe('BuildSquad');
    expect(rows[1]?.children[0]?.displayName).toBe('review_lead');
  });
});
