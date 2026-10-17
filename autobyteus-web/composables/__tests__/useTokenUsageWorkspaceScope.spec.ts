import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useTokenUsageWorkspaceScope } from '../useTokenUsageWorkspaceScope';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';
import type { TokenUsageTps } from '~/types/tokenUsageMeter';
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
const tpsOf = (model: string): TokenUsageTps => ({ method: 'generation', outputTokens: 200, durationMs: 10_000, model });
let scope: EffectScope;
beforeEach(() => {
  setActivePinia(createPinia()); holder.target = null; scope = effectScope();
  vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn().mockResolvedValue({ data: {} }) } as any);
});
afterEach(() => { scope.stop(); vi.restoreAllMocks(); });

describe('selected exact-run TPS projection', () => {
  it.each(['standalone_agent', 'standalone_team_member', 'agent_org_direct_agent', 'agent_org_team_member',
    'agent_org_task_agent', 'agent_org_task_team_member', 'agent_run_task_agent', 'agent_run_task_team_member'] as const)(
    'projects %s by context.state.runId before totals are available', async (kind) => {
      const samples = reactive<Record<string, TokenUsageTps>>({ selected: tpsOf('selected-model'), other: tpsOf('other-model') });
      const get = vi.spyOn(useTokenUsageMeterStore(), 'getRunTps').mockImplementation((id) => id ? samples[id] ?? null : null);
      holder.target = target(kind, 'selected');
      const view = scope.run(() => useTokenUsageWorkspaceScope())!;
      await nextTick();
      expect(view.primarySummary.value).toBeNull();
      expect(view.tps.value).toEqual(tpsOf('selected-model'));
      expect(get).toHaveBeenLastCalledWith('selected');
      holder.target = target(kind, 'other');
      expect(view.tps.value).toEqual(tpsOf('other-model'));
      holder.target = target(kind, 'new');
      expect(view.tps.value).toBeNull();
    },
  );

  it('shows no TPS without a target or a received value, whatever the run status', () => {
    const view = scope.run(() => useTokenUsageWorkspaceScope())!;
    expect(view.tps.value).toBeNull();
    holder.target = target('standalone_agent', 'history', AgentStatus.Offline);
    expect(view.tps.value).toBeNull();
    holder.target.context.state.currentStatus = AgentStatus.Running;
    expect(view.tps.value).toBeNull();
  });

  it('never relabels the received reading after configuration or status changes', () => {
    holder.target = target('standalone_agent', 'selected');
    vi.spyOn(useTokenUsageMeterStore(), 'getRunTps').mockReturnValue(tpsOf('reported-model'));
    const view = scope.run(() => useTokenUsageWorkspaceScope())!;
    holder.target.context.config.llmModelIdentifier = 'new-config-model';
    holder.target.context.state.currentStatus = AgentStatus.Offline;
    expect(view.tps.value).toEqual(tpsOf('reported-model'));
  });
});
