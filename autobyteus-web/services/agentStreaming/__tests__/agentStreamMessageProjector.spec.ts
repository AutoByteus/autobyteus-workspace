import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { dispatchAgentStreamMessage } from '../agentStreamMessageProjector';

const buildContext = (): AgentContext => {
  const conversation = {
    id: 'member-run-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  return new AgentContext({
    agentDefinitionId: 'worker',
    agentDefinitionName: 'Worker',
    llmModelIdentifier: 'model',
    runtimeKind: 'autobyteus',
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: false,
    skillAccessMode: 'NONE',
    isLocked: true,
    llmConfig: null,
  }, new AgentRunState('member-run-1', conversation));
};

describe('agent stream message projector', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('commits visible changes once and ignores structural-only protocol traffic', () => {
    const context = buildContext();
    dispatchAgentStreamMessage({ type: 'CONNECTED', payload: {} } as any, { kind: 'team_member', context, teamRunId: 'team-1', memberRouteKey: 'worker', memberRunId: 'member-run-1' });
    expect(context.state.eventMonitorPresentationRevision).toBe(0);

    const start = {
      type: 'SEGMENT_START',
      payload: { id: 'segment-1', turn_id: 'turn-1', segment_type: 'text' },
    } as any;
    dispatchAgentStreamMessage(start, { kind: 'team_member', context, teamRunId: 'team-1', memberRouteKey: 'worker', memberRunId: 'member-run-1' });
    expect(context.state.eventMonitorPresentationRevision).toBe(1);

    dispatchAgentStreamMessage(start, { kind: 'team_member', context, teamRunId: 'team-1', memberRouteKey: 'worker', memberRunId: 'member-run-1' });
    expect(context.state.eventMonitorPresentationRevision).toBe(1);
  });
});
