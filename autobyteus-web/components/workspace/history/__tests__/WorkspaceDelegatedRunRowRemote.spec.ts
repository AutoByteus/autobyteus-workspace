import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceDelegatedRunRow from '../WorkspaceDelegatedRunRow.vue';
import type { RunHistoryDelegatedRunRow } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useRunStatusStore } from '~/stores/runStatusStore';

const feed = vi.hoisted(() => ({ retry: vi.fn((_runIds: readonly string[]) => true) }));
vi.mock('~/services/runStatus/runStatusFeed', () => ({
  RunStatusFeed: class { retry = feed.retry; hold() { return () => undefined; } rebind() {} suspend() {} },
}));
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/**
 * autobyteus-278 UIS-001: a remote delegated row is an ordinary delegated row plus its node. Its node's answer is its
 * tree row's `peer` (autobyteus-461 G-D1); its Retry asks over `/ws/run-status` and checks until its state is told (SR-090).
 */
type Remote = NonNullable<RunHistoryDelegatedRunRow['remote']>;
const teamRow = (overrides: Partial<RunHistoryDelegatedRunRow> = {}, remote: Partial<Remote> = {}): RunHistoryDelegatedRunRow => ({
  kind: 'delegated_run', delegatedRunKind: 'task_team', rowKey: 'peer_team:marketing-run', teamRunId: 'manager-run',
  memberAddress: '/marketing_team', agentRunId: null, teamRunIdForNode: 'marketing-run', memberKind: 'agent_team',
  displayName: 'marketing team', currentStatus: null, delegatedBy: 'manager', depth: 0, hasChildren: true,
  remote: { runId: 'marketing-run', nodeName: 'docker', reachable: null, title: null, ...remote }, ...overrides,
});
const stateTold = (runId: string) => useRunStatusStore().apply({ type: 'RUN_STATE_CHANGED',
  payload: { kind: 'agent_team', runId, answer: 'unreachable', node: 'docker', status: null, backgroundTasksRunning: 0 } });

describe('WorkspaceDelegatedRunRow for a run another node runs', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    feed.retry.mockClear();
    feed.retry.mockReturnValue(true);
  });

  it('shows the node chip between the status and the identity, and its title under the node once the node answered', async () => {
    const wrapper = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow(), teamStatus: AgentStatus.Running, hasChildren: true } });
    const chip = wrapper.get('[data-test="remote-node-chip"]');
    expect(chip.attributes('aria-label')).toBe('Runs on docker');
    expect(chip.text()).toBe('docker');
    expect(wrapper.find('[data-test="workspace-remote-run-title"]').exists()).toBe(false);
    await wrapper.setProps({ row: teamRow({}, { reachable: true, title: 'Plan the October campaign' }) });
    expect(wrapper.get('[data-test="workspace-remote-run-title"]').text()).toBe('Plan the October campaign');
    expect(wrapper.get('[role="treeitem"]').attributes('aria-label')).toContain('on docker');
  });

  it("an unreachable node shows a red line with Retry; Retry asks over /ws/run-status, shows 'Checking…' and settles when its state is told", async () => {
    const wrapper = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow({}, { reachable: false }), hasChildren: true } });
    const error = wrapper.get('[data-test="workspace-remote-run-error"]');
    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toContain("Couldn't reach docker.");
    await wrapper.get('[data-test="workspace-remote-run-retry"]').trigger('click');
    expect(feed.retry).toHaveBeenCalledExactlyOnceWith(['marketing-run']);
    expect(wrapper.get('[data-test="workspace-remote-run-checking"]').text()).toBe('Checking docker…');
    expect(wrapper.emitted('select')).toBeUndefined();
    // Its node stays down: its state is told again, unchanged, and the row shows its error again.
    stateTold('marketing-run');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="workspace-remote-run-checking"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="workspace-remote-run-error"]').text()).toContain("Couldn't reach docker.");
  });

  it('SR-090: a node that comes back settles the row with its answer (the tree row updates, its state is told)', async () => {
    const wrapper = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow({}, { reachable: false }), hasChildren: true } });
    await wrapper.get('[data-test="workspace-remote-run-retry"]').trigger('click');
    await wrapper.setProps({ row: teamRow({}, { reachable: true, title: 'Back again' }) });
    useRunStatusStore().apply({ type: 'RUN_STATE_CHANGED', payload: { kind: 'agent_team', runId: 'marketing-run', answer: 'ok', node: null, status: 'idle', backgroundTasksRunning: 0 } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="workspace-remote-run-checking"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="workspace-remote-run-error"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="workspace-remote-run-title"]').text()).toBe('Back again');
  });

  it('a Retry the connection could not send checks nothing', async () => {
    feed.retry.mockReturnValue(false);
    const wrapper = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow({}, { reachable: false }), hasChildren: true } });
    await wrapper.get('[data-test="workspace-remote-run-retry"]').trigger('click');
    expect(wrapper.find('[data-test="workspace-remote-run-checking"]').exists()).toBe(false);
  });

  it('CR-461-103: the row carries its status as data-status (as base\'s Org rows did): a Team its own, an agent its own', () => {
    const team = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow({ remote: null }), teamStatus: AgentStatus.Idle, hasChildren: true } });
    expect(team.get('[data-test="workspace-team-transient-execution-row"]').attributes('data-status')).toBe('idle');
    const agent = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow({ remote: null, delegatedRunKind: 'task_team_child', memberKind: 'agent',
      agentRunId: 'lead-run', teamRunIdForNode: null, currentStatus: AgentStatus.Offline, hasChildren: false }) } });
    expect(agent.get('[data-test="workspace-team-transient-execution-row"]').attributes('data-status')).toBe('offline');
  });

  it('a member of a remote Team carries no chip of its own; a local row has none', () => {
    const member = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow({ delegatedRunKind: 'task_team_child', rowKey: 'peer_member:marketing-run:lead-run',
      agentRunId: 'lead-run', teamRunIdForNode: null, memberKind: 'agent', memberAddress: '/marketing_team/lead', depth: 1, hasChildren: false }) } });
    expect(member.find('[data-test="remote-node-chip"]').exists()).toBe(false);
    const local = mount(WorkspaceDelegatedRunRow, { props: { row: teamRow({ remote: null }) } });
    expect(local.find('[data-test="remote-node-chip"]').exists()).toBe(false);
    expect(local.find('[data-test="workspace-remote-run-lines"]').exists()).toBe(false);
  });
});
