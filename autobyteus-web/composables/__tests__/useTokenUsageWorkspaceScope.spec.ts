import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useTokenUsageWorkspaceScope } from '../useTokenUsageWorkspaceScope';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';
import type { TokenUsageThroughputState } from '~/types/tokenUsageMeter';
import { getApolloClient } from '~/utils/apolloClient';

const holder = reactive<{ target: ActiveAgentWorkspaceTarget | null }>({ target: null });
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({
  get activeWorkspaceTarget() { return holder.target; },
}) }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));
const target = (kind: ActiveAgentWorkspaceTarget['kind'], runId: string, status = AgentStatus.Running) => {
  const context = { state: { runId, currentStatus: status }, config: { agentDefinitionName: runId, llmModelIdentifier: 'config-alias' } };
  return { kind, context, root: { orgRunId: 'org' }, host: { hostRunId: 'host' }, address: '/member',
    team: { rootRunId: 'team', listMembers: () => [{ agentRunId: runId, context, address: '/member' }] },
  } as unknown as ActiveAgentWorkspaceTarget;
};
const ready = (runId: string): TokenUsageThroughputState => ({
  status: 'ready', tokensPerSecond: 20, outputTokens: 200, elapsedSeconds: 10,
  observedAt: '2026-10-13T10:00:10.000Z', identity: {
    runId, turnId: 'turn', runtimeKind: 'codex_app_server', modelIdentifier: 'reported-model', modelValue: null, modelProvider: 'OPENAI',
  },
});
let scope: EffectScope;
beforeEach(() => {
  setActivePinia(createPinia()); holder.target = null; scope = effectScope();
  vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn().mockResolvedValue({ data: {} }) } as any);
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

describe('selected exact-run throughput projection', () => {
  it.each(['standalone_agent', 'standalone_team_member', 'agent_org_direct_agent', 'agent_org_team_member',
    'agent_org_task_agent', 'agent_org_task_team_member', 'agent_run_task_agent', 'agent_run_task_team_member'] as const)(
    'projects %s by context.state.runId before totals are available', async (kind) => {
      const samples = reactive<Record<string, TokenUsageThroughputState>>({ selected: ready('selected'), other: ready('other') });
      const get = vi.spyOn(useTokenUsageMeterStore(), 'getRunThroughput').mockImplementation((id) => id ? samples[id] ?? null : null);
      holder.target = target(kind, 'selected');
      const view = scope.run(() => useTokenUsageWorkspaceScope())!;
      await nextTick();
      expect(view.primarySummary.value).toBeNull();
      expect(view.throughput.value).toEqual(ready('selected'));
      expect(get).toHaveBeenLastCalledWith('selected');
      holder.target = target(kind, 'other');
      expect(view.throughput.value).toEqual(ready('other'));
      holder.target = target(kind, 'new');
      expect(view.throughput.value).toEqual({ status: 'collecting', reason: 'waitingForReports' });
    },
  );

  it('distinguishes no target, active collecting and inactive history without synthesizing TPS', () => {
    const view = scope.run(() => useTokenUsageWorkspaceScope())!;
    expect(view.throughput.value).toEqual({ status: 'unavailable', reason: 'selectAgent' });
    holder.target = target('standalone_agent', 'history', AgentStatus.Offline);
    expect(view.throughput.value).toEqual({ status: 'unavailable', reason: 'noReports' });
    holder.target.context.state.currentStatus = AgentStatus.Initializing;
    expect(view.throughput.value).toEqual({ status: 'collecting', reason: 'waitingForReports' });
  });

  it('never relabels the frozen reading after configuration or status changes', () => {
    holder.target = target('standalone_agent', 'selected');
    vi.spyOn(useTokenUsageMeterStore(), 'getRunThroughput').mockReturnValue(ready('selected'));
    const view = scope.run(() => useTokenUsageWorkspaceScope())!;
    holder.target.context.config.llmModelIdentifier = 'new-config-model';
    holder.target.context.state.currentStatus = AgentStatus.Offline;
    expect(view.throughput.value).toEqual(ready('selected'));
  });
});
