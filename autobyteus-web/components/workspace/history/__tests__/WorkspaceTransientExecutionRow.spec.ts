import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceTransientExecutionRow from '../WorkspaceTransientExecutionRow.vue';
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

const row = (overrides: Partial<RunHistoryTransientExecutionRow> = {}): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution', transientKind: 'task_agent', rowKey: 'agent:worker-run', teamRunId: 'host-run',
  memberAddress: '/release_notes_writer', agentRunId: 'worker-run', teamRunIdForNode: null, memberKind: 'agent',
  displayName: 'release notes writer', currentStatus: AgentStatus.Idle, delegatedBy: 'manager', depth: 0, hasChildren: false,
  ...overrides,
});
const teamRow = () => row({
  transientKind: 'task_team', rowKey: 'team:review-team', agentRunId: null, teamRunIdForNode: 'review-team',
  memberAddress: '/docs_review_team', memberKind: 'agent_team', displayName: 'docs review team', currentStatus: null, hasChildren: true,
});

/** delegated-row-clean-style REQ-001 / AC-001: a delegated row reads like every other tree row. */
describe('WorkspaceTransientExecutionRow clean delegated-row style', () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it('has no dashed box or tint; gray-600 text, gray-50 hover and a 2px indigo-500 focus ring', () => {
    const element = mount(WorkspaceTransientExecutionRow, { props: { row: row() } }).get('[data-test="workspace-team-transient-execution-row"]');
    for (const removed of ['border', 'border-dashed', 'border-indigo-200', 'bg-indigo-50/40', 'hover:bg-indigo-50', 'focus-visible:ring-1', 'focus-visible:ring-indigo-300']) {
      expect(element.classes()).not.toContain(removed);
    }
    expect(element.classes()).toEqual(expect.arrayContaining([
      'rounded-md', 'text-gray-600', 'hover:bg-gray-50', 'focus:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-indigo-500',
    ]));
  });

  it('keeps the selected style of member rows (no hover tint, indigo-900 text)', () => {
    const element = mount(WorkspaceTransientExecutionRow, { props: { row: row(), isSelected: true } }).get('[role="treeitem"]');
    expect(element.classes()).toEqual(expect.arrayContaining(['is-selected', 'text-indigo-900']));
    expect(element.classes()).not.toContain('hover:bg-gray-50');
    expect(element.attributes('aria-selected')).toBe('true');
  });

  it('marks a delegated Team only by a 16px slate-500 bolt with a semibold name', () => {
    const element = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow(), hasChildren: true, expanded: true } });
    const icon = element.get('[data-team-icon="temporary-task-team"]');
    expect(icon.classes()).toEqual(['inline-flex', 'h-4', 'w-4', 'items-center', 'justify-center', 'text-slate-500']);
    const bolt = icon.get('[data-icon="heroicons:bolt-20-solid"]');
    expect(bolt.classes()).toEqual(['h-4', 'w-4']);
    expect(element.find('[data-test="workspace-transient-status-dot"]').exists()).toBe(false);
    expect(element.find('.font-semibold').text()).toContain('docs review team');
  });

  it('keeps the status dot and initials avatar of a delegated Agent', () => {
    const element = mount(WorkspaceTransientExecutionRow, { props: { row: row() } });
    expect(element.find('[data-test="workspace-transient-status-dot"]').exists()).toBe(true);
    expect(element.get('[data-test="workspace-task-agent-avatar"]').text()).toBe('RN');
    expect(element.find('[data-team-icon="temporary-task-team"]').exists()).toBe(false);
  });

  it('still selects and toggles on click, Enter and Space (AC-002)', async () => {
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow(), hasChildren: true, expanded: false } });
    const element = wrapper.get('[role="treeitem"]');
    await element.trigger('click');
    await element.trigger('keydown.enter');
    await element.trigger('keydown.space');
    expect(wrapper.emitted('select')).toHaveLength(3);
    expect(wrapper.emitted('toggle')).toHaveLength(3);
  });
});
