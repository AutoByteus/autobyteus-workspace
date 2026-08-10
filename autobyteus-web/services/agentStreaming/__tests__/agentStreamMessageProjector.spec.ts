import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { dispatchAgentStreamMessage } from '../agentStreamMessageProjector';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useRunHistoryStore } from '~/stores/runHistoryStore';

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
  afterEach(() => vi.useRealTimers());

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

  it.each(['standalone', 'team_member'] as const)(
    'preserves terminal status presentation plus activity in one %s exact patch',
    (kind) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-09T10:15:30.000Z'));
      const context = buildContext();
      context.state.currentStatus = AgentStatus.Running;
      context.conversation.messages.push({
        type: 'ai',
        text: '',
        timestamp: new Date('2026-08-09T10:15:00.000Z'),
        isComplete: false,
        segments: [],
      });
      const store = useRunHistoryStore();
      const patchSpy = vi.spyOn(store, 'applyRunNavigationEffect').mockReturnValue(true);
      const topologySpy = vi.spyOn(store, 'refreshRunNavigationTopology');
      const target = kind === 'standalone'
        ? { kind, context, runId: 'member-run-1' } as const
        : {
            kind,
            context,
            teamRunId: 'team-1',
            memberRouteKey: 'worker',
            memberRunId: 'member-run-1',
          } as const;

      const effects = dispatchAgentStreamMessage({
        type: 'AGENT_STATUS',
        payload: { status: 'idle', agent_id: 'member-run-1' },
      } as any, target);

      expect(context.state.currentStatus).toBe(AgentStatus.Idle);
      expect(context.conversation.messages[0]).toMatchObject({ isComplete: true });
      expect(context.conversation.updatedAt).toBe('2026-08-09T10:15:30.000Z');
      expect(effects.navigation).toEqual({
        kind: 'PRESENTATION',
        occurredAt: '2026-08-09T10:15:30.000Z',
      });
      expect(patchSpy).toHaveBeenCalledTimes(1);
      expect(patchSpy.mock.calls[0]?.[1]).toEqual(effects.navigation);
      expect(patchSpy.mock.calls[0]?.[0]).toMatchObject({
        kind,
        currentStatus: AgentStatus.Idle,
      });
      expect(topologySpy).not.toHaveBeenCalled();
    },
  );
});
