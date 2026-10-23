import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceTransientExecutionRow from '../WorkspaceTransientExecutionRow.vue';
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useRemoteRunsStore } from '~/stores/remoteRunsStore';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/** autobyteus-278 UIS-001: a remote delegated row is an ordinary delegated row plus its node. */

const execution = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/lead', members: [{ address: '/marketing_team/lead', agent_run_id: 'lead-run' }],
  delegator_agent_run_id: 'manager-run', started_at: '2026-10-23T08:00:00.000Z',
};
const teamRow = (overrides: Partial<RunHistoryTransientExecutionRow> = {}): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution', transientKind: 'task_team', rowKey: 'team:marketing-run', teamRunId: 'manager-run',
  memberAddress: '/marketing_team', agentRunId: null, teamRunIdForNode: 'marketing-run', memberKind: 'agent_team',
  displayName: 'marketing team', currentStatus: null, delegatedBy: 'manager', depth: 0, hasChildren: true,
  remote: { runId: 'marketing-run', nodeName: 'docker' }, ...overrides,
});

describe('WorkspaceTransientExecutionRow for a run another node runs', () => {
  let retried: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    setActivePinia(createPinia());
    retried = vi.fn(() => true);
    useRemoteRunsStore().register(execution, retried);
  });

  it('shows the node chip between the status and the identity, and its title under the node once the node answers', async () => {
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow(), teamStatus: AgentStatus.Running, hasChildren: true } });
    const chip = wrapper.get('[data-test="remote-node-chip"]');
    expect(chip.attributes('aria-label')).toBe('Runs on docker');
    expect(chip.text()).toBe('docker');
    expect(wrapper.find('[data-test="workspace-remote-run-title"]').exists()).toBe(false);
    useRemoteRunsStore().applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: true, title: 'Plan the October campaign', statuses: [] });
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-test="workspace-remote-run-title"]').text()).toBe('Plan the October campaign');
    expect(wrapper.get('[role="treeitem"]').attributes('aria-label')).toContain('on docker');
  });

  it("an unreachable node shows a red line with Retry; Retry asks the node again and shows 'Checking…'", async () => {
    useRemoteRunsStore().applySummary({ node_id: 'srv_docker', run_id: 'marketing-run', reachable: false, title: null, statuses: [] });
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow(), hasChildren: true } });
    const error = wrapper.get('[data-test="workspace-remote-run-error"]');
    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toContain("Couldn't reach docker.");
    await wrapper.get('[data-test="workspace-remote-run-retry"]').trigger('click');
    expect(retried).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-test="workspace-remote-run-checking"]').text()).toBe('Checking docker…');
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('a member of a remote Team carries no chip of its own; a local row has none', () => {
    const member = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow({ transientKind: 'task_team_child', rowKey: 'agent:lead-run',
      agentRunId: 'lead-run', teamRunIdForNode: null, memberKind: 'agent', memberAddress: '/marketing_team/lead', depth: 1, hasChildren: false }) } });
    expect(member.find('[data-test="remote-node-chip"]').exists()).toBe(false);
    const local = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow({ remote: null }) } });
    expect(local.find('[data-test="remote-node-chip"]').exists()).toBe(false);
    expect(local.find('[data-test="workspace-remote-run-lines"]').exists()).toBe(false);
  });
});
