import { describe, expect, it } from 'vitest';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { applyProjectionToTeamMemberContext } from '../runHistoryTeamMemberProjectionHydrator';

const buildMemberContext = (): AgentContext => {
  const conversation = {
    id: 'worker-run-1',
    messages: [],
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z',
    agentDefinitionId: 'worker-definition',
    agentName: 'worker',
    llmModelIdentifier: 'test-model',
  };
  const context = new AgentContext(
    {
      agentDefinitionId: 'worker-definition',
      agentDefinitionName: 'worker',
      llmModelIdentifier: 'test-model',
      runtimeKind: 'codex_app_server',
      workspaceId: 'workspace-1',
      workspaceMetadata: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: false,
      llmConfig: null,
    },
    new AgentRunState('worker-run-1', conversation),
  );
  context.state.currentStatus = AgentStatus.Running;
  return context;
};

describe('runHistoryTeamMemberProjectionHydrator', () => {
  it('applies active member projection while preserving canonical live status', () => {
    const memberContext = buildMemberContext();

    expect(() => applyProjectionToTeamMemberContext({
      teamRunId: 'team-run-1',
      metadata: {
        teamRunId: 'team-run-1',
        teamDefinitionId: 'team-definition-1',
        teamDefinitionName: 'Team',
        coordinatorMemberRouteKey: 'coordinator',
        createdAt: '2026-06-03T00:00:00.000Z',
        memberTree: [],
      },
      member: {
        memberKind: 'agent',
        memberRouteKey: 'worker',
        memberPath: ['worker'],
        memberName: 'worker',
        memberRunId: 'worker-run-1',
        runtimeKind: 'codex_app_server',
        platformAgentRunId: null,
        agentDefinitionId: 'worker-definition',
        llmModelIdentifier: 'test-model',
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        llmConfig: null,
        workspaceRootPath: '/tmp/workspace',
      },
      projection: null,
      memberContext,
      isActive: true,
    })).not.toThrow();

    expect(memberContext.config).toMatchObject({
      agentDefinitionId: 'worker-definition',
      agentDefinitionName: 'worker',
      isLocked: true,
      workspaceMetadata: {
        workspaceId: 'workspace-1',
        workspaceRootPath: '/tmp/workspace',
      },
    });
    expect(memberContext.state.runId).toBe('worker-run-1');
    expect(memberContext.state.conversation.id).toBe('team-run-1::worker');
    expect(memberContext.state.currentStatus).toBe(AgentStatus.Running);
  });
});
