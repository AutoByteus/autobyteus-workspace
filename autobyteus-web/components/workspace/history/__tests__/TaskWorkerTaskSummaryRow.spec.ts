import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceTransientExecutionRow from '../WorkspaceTransientExecutionRow.vue';
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';
import type { TaskWorkerTask } from '~/types/project';
import { AgentStatus } from '~/types/agent/AgentStatus';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

const row = (overrides: Partial<RunHistoryTransientExecutionRow> = {}): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution', transientKind: 'task_agent', rowKey: 'agent:worker-run', teamRunId: 'host-run',
  memberAddress: '/release_notes_writer', agentRunId: 'worker-run', teamRunIdForNode: null, memberKind: 'agent',
  displayName: 'release notes writer', currentStatus: AgentStatus.Idle, delegatedBy: null, depth: 0, hasChildren: false,
  ...overrides,
});
const teamRow = () => row({
  transientKind: 'task_team', rowKey: 'team:review-team', agentRunId: null, teamRunIdForNode: 'review-team',
  memberAddress: '/docs_review_team', memberKind: 'agent_team', displayName: 'docs review team', currentStatus: null, hasChildren: true,
});
// A Temp task (no key): the summary layout and names below are the same for Project Tasks, which add the key first.
const task: TaskWorkerTask = { taskId: 'task-1', projectId: null, title: null, description: 'Ship the summary line\nwith details', status: 'IN_PROGRESS' };
// A Project Task's line is its title, not its description's first line (autobyteus-260 REQ-006).
const projectTask: TaskWorkerTask = { ...task, projectId: 'p1', title: 'Release the desktop app' };
const mountRow = (props: Record<string, unknown>) => mount(WorkspaceTransientExecutionRow, { props: { row: row(), ...props } as any });
const summary = (wrapper: ReturnType<typeof mountRow>) => wrapper.get('[data-test="workspace-task-worker-task-summary"]');

/** delegated-copy-task-locator REQ-001..003, REQ-010, QR-003. */
describe('WorkspaceTransientExecutionRow Task summary', () => {
  beforeEach(() => { setActivePinia(createPinia()); });
  afterEach(async () => { await localizationRuntime.setPreference('en'); });

  it('shows the summary under the name, inside the name column, with the specified type and colours', () => {
    const wrapper = mountRow({ task });
    const button = summary(wrapper);
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.text()).toBe('Ship the summary line');
    expect(button.element.previousElementSibling?.textContent).toBe('release notes writer');
    expect(button.classes()).toEqual(expect.arrayContaining([
      '-mx-1', 'mt-0.5', 'block', 'max-w-full', 'truncate', 'rounded', 'px-1', 'text-left', 'text-[0.6875rem]', 'font-normal', 'leading-4',
      'underline-offset-2', 'hover:text-indigo-700', 'hover:underline', 'focus-visible:ring-2', 'focus-visible:ring-indigo-500', 'text-gray-500',
    ]));
    // QR-003: the status dot and icon stay in their name-line boxes; the summary never carries selection state.
    expect(wrapper.get('.member-status').classes()).toContain('h-5');
    expect(button.attributes('aria-current')).toBeUndefined();
    expect(button.attributes('aria-selected')).toBeUndefined();
    expect(wrapper.get('[role="treeitem"]').attributes('tabindex')).toBe('0');
  });

  it('uses indigo-700 on the selected row; the selection marker stays on the outer row only', () => {
    const wrapper = mountRow({ task, isSelected: true });
    expect(summary(wrapper).classes()).toContain('text-indigo-700');
    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(1);
    expect(wrapper.findAll('[aria-current="true"]')).toHaveLength(1);
    expect(wrapper.get('[aria-current="true"]').attributes('role')).toBe('treeitem');
  });

  it('keeps one line without a Task, and moves the elbow and chevron to the name line with one', () => {
    const plain = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow(), hasChildren: true } });
    expect(plain.find('[data-test="workspace-task-worker-task-summary"]').exists()).toBe(false);
    expect(plain.get('.hierarchy-current-branch').classes()).not.toContain('anchor-name-line');
    expect(plain.get('[data-test="workspace-team-transient-disclosure"]').classes()).not.toContain('self-start');

    const withTask = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow(), hasChildren: true, task } });
    expect(withTask.get('.hierarchy-current-branch').classes()).toContain('anchor-name-line');
    expect(withTask.get('[data-test="workspace-team-transient-disclosure"]').classes()).toEqual(expect.arrayContaining(['mt-[0.4375rem]', 'self-start']));
    // Regular weight even on a semibold team row.
    expect(withTask.get('[data-test="workspace-task-worker-task-summary"]').classes()).toContain('font-normal');
  });

  it('click, Enter or Space on the summary locates the Task and never opens, selects or toggles the row (AC-004, AC-014)', async () => {
    const wrapper = mount(WorkspaceTransientExecutionRow, { props: { row: teamRow(), hasChildren: true, task } });
    const button = summary(wrapper);
    await button.trigger('click');
    await button.trigger('keydown', { key: 'Enter' });
    await button.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('locate-task')).toEqual([[task]]);
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(wrapper.emitted('toggle')).toBeUndefined();

    await wrapper.get('.block.truncate').trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(wrapper.emitted('locate-task')).toHaveLength(1);
  });

  it('names the summary and extends the row name in en and zh-CN (REQ-010)', async () => {
    const wrapper = mountRow({ task });
    expect(summary(wrapper).attributes('aria-label')).toBe('Show Task in Projects: Ship the summary line');
    expect(summary(wrapper).attributes('title')).toBe('Show Task in Projects: Ship the summary line');
    expect(wrapper.get('[role="treeitem"]').attributes('aria-label')).toMatch(/, Task: Ship the summary line$/);
    expect(mountRow({}).get('[role="treeitem"]').attributes('aria-label')).not.toContain('Task:');

    await localizationRuntime.setPreference('zh-CN');
    await wrapper.vm.$nextTick();
    expect(summary(wrapper).attributes('aria-label')).toBe('在项目中显示任务：Ship the summary line');
    expect(wrapper.get('[role="treeitem"]').attributes('aria-label')).toMatch(/, 任务：Ship the summary line$/);
  });

  it("a Project Task's line shows only its title; tooltip and name carry no key (task-keys-declutter REQ-002, autobyteus-260 REQ-006)", async () => {
    const wrapper = mountRow({ task: projectTask });
    expect(summary(wrapper).find('[data-test="workspace-task-worker-task-key"]').exists()).toBe(false);
    expect(summary(wrapper).text()).toBe('Release the desktop app');
    expect(summary(wrapper).attributes('aria-label')).toBe('Show Task in Projects: Release the desktop app');
    expect(summary(wrapper).attributes('title')).toBe('Show Task in Projects: Release the desktop app');
    await localizationRuntime.setPreference('zh-CN');
    await wrapper.vm.$nextTick();
    expect(summary(wrapper).attributes('aria-label')).toBe('在项目中显示任务：Release the desktop app');
  });
});
