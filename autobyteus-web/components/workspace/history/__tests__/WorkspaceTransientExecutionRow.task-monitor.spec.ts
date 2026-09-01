import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import WorkspaceTransientExecutionRow from '../WorkspaceTransientExecutionRow.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

const state = reactive<{ attempt: null | { state: 'loading' | 'error'; detail: string | null } }>({ attempt: null });
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({ getTeamMemberInspectionAttempt: () => state.attempt }),
}));

const row = {
  kind: 'transient_execution' as const,
  rowKey: 'agent:task-run',
  transientKind: 'task_agent' as const,
  teamRunId: 'team-1',
  memberKind: 'agent' as const,
  memberAddress: '/worker',
  agentRunId: 'task-run',
  teamRunIdForNode: null,
  displayName: 'Task: A deliberately complete task description',
  depth: 1,
  hasChildren: false,
  currentStatus: AgentStatus.Idle,
  task: {
    taskId: 'task-1', description: 'A deliberately complete task description', displayStatus: 'in_progress' as const,
  },
};

const translations: Record<string, string> = {
  'workspace.history.hierarchy.role.temporary_task_agent': 'Temporary task agent',
  'workspace.history.hierarchy.status.idle': 'Idle',
  'workspace.task_monitor.execution.idle': 'Idle',
  'workspace.task_monitor.lifecycle.in_progress': 'In progress',
  'workspace.task_monitor.loading': 'Loading task activity…',
  'workspace.task_monitor.load_error': "Couldn't load task activity.",
  'workspace.task_monitor.retry': 'Retry',
  'workspace.task_monitor.retry_accessible': 'Retry loading task activity',
};
const mountSubject = (selected = false) => mount(WorkspaceTransientExecutionRow, {
  props: { row, isSelected: selected },
  global: {
    mocks: { $t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'workspace.task_monitor.combined_status') return `${params?.lifecycle} · ${params?.execution}`;
      if (key === 'workspace.history.hierarchy.identity') return `${params?.role} · ${params?.name} · ${params?.address}`;
      if (key === 'workspace.history.hierarchy.tree_item') {
        return `${params?.role}, ${params?.name}, ${params?.status}, ${params?.address}, level ${params?.level}`;
      }
      return translations[key] ?? key;
    } },
    stubs: {
      StatusDot: { template: '<span data-test="status-dot" />' },
      WorkspaceHierarchyBranches: { template: '<span />' },
      Icon: { template: '<span />' },
    },
  },
});

describe('WorkspaceTransientExecutionRow task monitor states', () => {
  beforeEach(() => { state.attempt = null; });
  it('prints lifecycle and execution text and keeps full task context accessible', () => {
    const wrapper = mountSubject(true);
    expect(wrapper.get('[data-test="workspace-transient-task-status"]').text()).toBe('In progress · Idle');
    expect(wrapper.attributes('aria-current')).toBe('true');
    expect(wrapper.attributes('aria-label')).toContain('A deliberately complete task description');
    expect(wrapper.attributes('aria-label')).toContain('In progress · Idle');
  });
  it('marks loading busy without making the target current', () => {
    state.attempt = { state: 'loading', detail: null };
    const wrapper = mountSubject(false);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.attributes('aria-current')).toBeUndefined();
    expect(wrapper.text()).toContain('Loading task activity…');
  });
  it('announces a recoverable error and retries the same row', async () => {
    state.attempt = { state: 'error', detail: 'network' };
    const wrapper = mountSubject(false);
    expect(wrapper.get('[role="alert"]').text()).toContain("Couldn't load task activity.");
    await wrapper.get('button[aria-label="Retry loading task activity"]').trigger('click');
    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual(row);
  });
});
