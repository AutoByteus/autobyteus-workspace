import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceDelegatedRunRow from '../WorkspaceDelegatedRunRow.vue';
import TeamAggregateStatusDot from '../TeamAggregateStatusDot.vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import type { RunHistoryDelegatedRunRow } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useRunStatusStore } from '~/stores/runStatusStore';

vi.mock('~/services/runStatus/runStatusFeed', () => ({
  RunStatusFeed: class { retry() { return true; } hold() { return () => undefined; } rebind() {} suspend() {} },
}));
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/**
 * autobyteus-448 DEC-004 (REQ-006, AC-005): the rows read each run's running background tasks from the run-status feed
 * (its node's answer), as they read its status. A Team row shows its agents' sum by the Team rule.
 */
const teamRow: RunHistoryDelegatedRunRow = {
  kind: 'delegated_run', delegatedRunKind: 'task_team', rowKey: 'team:squad', teamRunId: 'manager-run',
  memberAddress: '/squad', agentRunId: null, teamRunIdForNode: 'squad', memberKind: 'agent_team',
  displayName: 'squad', currentStatus: null, delegatedBy: 'manager', depth: 0, hasChildren: true, remote: null,
};
const agentRow: RunHistoryDelegatedRunRow = {
  ...teamRow, delegatedRunKind: 'task_agent', rowKey: 'agent:worker', agentRunId: 'worker', teamRunIdForNode: null, memberKind: 'agent',
  displayName: 'worker', currentStatus: AgentStatus.Idle, hasChildren: false,
};

describe('rows with background tasks running (autobyteus-448)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('a Team row with one member in "background" while another is idle shows "Background task running" with the active dot', async () => {
    // The Team's node answers each member and the Team's own state: idle, with its agents' sum (1).
    useRunStatusStore().apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [{ kind: 'agent_team', runId: 'squad', answer: 'ok', node: null,
      status: 'idle', backgroundTasksRunning: 1, agents: [
        { agentRunId: 'lead', status: 'idle', backgroundTasksRunning: 1 }, { agentRunId: 'dev', status: 'idle', backgroundTasksRunning: 0 }] }] } });
    const wrapper = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow, teamStatus: AgentStatus.Idle, hasChildren: true } });
    const dot = wrapper.get('[data-test="team-aggregate-status-dot"]');
    expect(dot.attributes('data-status')).toBe('background');
    expect(dot.attributes('aria-label')).toBe('Background task running');
    expect(dot.find('span.bg-blue-500').exists()).toBe(true);
    expect(dot.find('.animate-pulse').exists()).toBe(false);

    // The task ends: the Team is idle again.
    useRunStatusStore().apply({ type: 'RUN_STATE_CHANGED', payload: { kind: 'agent_team', runId: 'squad', answer: 'ok', node: null, status: 'idle', backgroundTasksRunning: 0 } });
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe('idle');
  });

  it('a busy Team stays "Running"; an errored Team with background tasks shows them (busy > background > error)', () => {
    const running = mount(TeamAggregateStatusDot, { props: { status: AgentStatus.Running, backgroundTasksRunning: 2 } });
    expect(running.attributes('data-status')).toBe('running');
    const failed = mount(TeamAggregateStatusDot, { props: { status: AgentStatus.Error, backgroundTasksRunning: 2 } });
    expect(failed.attributes('data-status')).toBe('background');
    expect(failed.attributes('aria-label')).toBe('2 background tasks running');
  });

  it('an agent row reads its own count by its run ID; its accessible status names it', () => {
    useRunStatusStore().apply({ type: 'RUN_STATUS_CHANGED', payload: { kind: 'agent', runId: 'worker', agentRunId: 'worker', status: 'idle', backgroundTasksRunning: 2 } });
    const wrapper = mount(WorkspaceDelegatedRunRow, { props: { row: agentRow } });
    expect(wrapper.get('[data-test="workspace-transient-status-dot"]').classes()).toContain('bg-blue-500');
    expect(wrapper.html()).toContain('2 background tasks running');
  });

  it('the header shows the background text for an idle agent and "Running" during a turn', async () => {
    const header = mount(AgentStatusDisplay, { props: { status: AgentStatus.Idle, backgroundTasksRunning: 1 } });
    expect(header.text()).toBe('Background task running');
    await header.setProps({ status: AgentStatus.Running });
    expect(header.text()).toBe('Running');
    await header.setProps({ status: AgentStatus.Idle, backgroundTasksRunning: 0 });
    expect(header.text()).toBe('Idle');
  });
});
