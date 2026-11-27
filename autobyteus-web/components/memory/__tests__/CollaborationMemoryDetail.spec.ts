import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CollaborationMemoryDetail from '../CollaborationMemoryDetail.vue';
import type { CollaborationMemberMemoryTargetSummary, CollaborationMemoryGroup, CollaborationRunMemoryRow } from '~/types/memory';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

const memory = { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false };

const member = (overrides: Partial<CollaborationMemberMemoryTargetSummary> & Pick<CollaborationMemberMemoryTargetSummary, 'agentRunId' | 'displayName'>): CollaborationMemberMemoryTargetSummary => ({
  memberAddress: `/${overrides.displayName}`,
  executionKind: 'CONFIGURED',
  startedAt: null,
  groupPath: [],
  memory,
  ...overrides,
});

const row = (overrides: Partial<CollaborationRunMemoryRow> = {}): CollaborationRunMemoryRow => ({
  runId: 'team-run-1',
  summary: 'Planning run',
  workspaceRootPath: '/tmp/team-project',
  lastUpdatedAt: '2026-06-19T10:06:04.000Z',
  memory,
  memberTargets: [
    member({ memberAddress: '/lead', displayName: 'Lead', agentRunId: 'member-1' }),
    member({ memberAddress: '/writer', displayName: 'Writer', agentRunId: 'member-2' }),
  ],
  ...overrides,
});

const mountDetail = (props: Partial<InstanceType<typeof CollaborationMemoryDetail>['$props']> = {}) => mount(CollaborationMemoryDetail, {
  props: {
    rows: [row()],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
    ...props,
  },
});

/** AC-014 shape: a configured team and a task team delegated to the same address `/StudentStudyGroup`. */
const studyGroup: CollaborationMemoryGroup = { teamRunId: 'study-configured', address: '/StudentStudyGroup', displayName: 'StudentStudyGroup', kind: 'CONFIGURED_TEAM', startedAt: null };
const studyTask: CollaborationMemoryGroup = { teamRunId: 'study-task', address: '/StudentStudyGroup', displayName: 'StudentStudyGroup', kind: 'TASK_TEAM', startedAt: '2026-09-21T14:00:00.000Z' };
const nested: CollaborationMemoryGroup = { teamRunId: 'nested-task', address: '/StudentStudyGroup/helpers', displayName: 'StudentStudyGroup/helpers', kind: 'TASK_TEAM', startedAt: null };
const orgRow = () => row({
  runId: 'org-run-1',
  memberTargets: [
    member({ memberAddress: '/Teacher', displayName: 'Teacher', agentRunId: 'teacher-run' }),
    member({ memberAddress: '/StudentStudyGroup/student_one', displayName: 'StudentStudyGroup/student_one', agentRunId: 'one-configured', groupPath: [studyGroup] }),
    member({ memberAddress: '/StudentStudyGroup/student_two', displayName: 'StudentStudyGroup/student_two', agentRunId: 'two-configured', groupPath: [studyGroup] }),
    member({ memberAddress: '/StudentStudyGroup/student_one', displayName: 'StudentStudyGroup/student_one', agentRunId: 'one-task', groupPath: [studyTask] }),
    member({ memberAddress: '/StudentStudyGroup/student_two', displayName: 'StudentStudyGroup/student_two', agentRunId: 'two-task', groupPath: [studyTask] }),
    member({ memberAddress: '/StudentStudyGroup/helpers/checker', displayName: 'StudentStudyGroup/helpers/checker', agentRunId: 'checker-task', groupPath: [studyTask, nested] }),
  ],
});

describe('CollaborationMemoryDetail', () => {
  it('renders concise runs: title with the time beside it, the workspace, name-only member chips; run IDs in tooltips (AC-010, autobyteus-608 DC-006)', () => {
    const wrapper = mountDetail();

    // The run list only: no header, title, filter or Back (the team or org page's header has them, DC-012).
    expect(wrapper.find('header').exists()).toBe(false);
    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Agent Team');
    expect(wrapper.text()).not.toContain('ID:');
    // No "Members" label (the chips say who they are).
    expect(wrapper.text()).not.toContain('Members');
    const title = wrapper.get('article h3');
    expect(title.text()).toBe('Planning run');
    expect(title.attributes('title')).toBe('team-run-1');
    expect(title.element.parentElement?.textContent).toMatch(/2026/);
    expect(wrapper.get('article p').text()).toBe('/tmp/team-project');
    expect(wrapper.text()).not.toContain('team-run-1');
    const memberButtons = wrapper.findAll('[data-test="collaboration-member"]');
    expect(memberButtons.map((button) => button.text())).toEqual(['Lead', 'Writer']);
    // A team run's own agents only: a run it delegated to is a run of its own (autobyteus-461). Run IDs in the tooltips.
    expect(memberButtons.map((button) => button.attributes('title'))).toEqual(['member-1', 'member-2']);
    expect(wrapper.text()).not.toContain('member-1');
  });

  it('renders a flat team without groups as a single row of member buttons', () => {
    const wrapper = mountDetail({ rows: [row({ memberTargets: [member({ displayName: 'Lead', agentRunId: 'member-1' }), member({ displayName: 'Writer', agentRunId: 'member-2' })] })] });
    expect(wrapper.findAll('[data-test="memory-member-group-header"]')).toHaveLength(0);
    expect(wrapper.findAll('article [data-group-run-id]')).toHaveLength(0);
    expect(wrapper.findAll('article button').map((button) => button.attributes('data-execution-kind'))).toEqual(['CONFIGURED', 'CONFIGURED']);
  });

  it('keeps people-group identity for configured, task and delegated-inside-task Teams with existing role decorations (restore-team-group-icon AC-002/003)', () => {
    const wrapper = mountDetail({ rows: [orgRow()] });
    const headers = wrapper.findAll('[data-test="memory-member-group-header"]');
    expect(headers).toHaveLength(3);
    for (const [index, header] of headers.entries()) {
      const group = header.get('[data-icon="heroicons:user-group-20-solid"]');
      expect(group.classes()).toEqual(index === 0 ? ['h-4', 'w-4', 'flex-shrink-0', 'text-gray-500'] : ['h-3', 'w-3']);
      if (index > 0) {
        expect(group.element.parentElement?.classList.contains('border-dashed')).toBe(true);
        expect(group.element.parentElement?.classList.contains('text-indigo-600')).toBe(true);
        expect(header.text()).toContain('Task team');
      }
    }
    expect(wrapper.find('[data-icon="heroicons:bolt-20-solid"]').exists()).toBe(false);
  });

  it('renders the execution structure grouped by team run, never by address (REQ-012, AC-014)', async () => {
    const wrapper = mountDetail({ rows: [orgRow()] });

    const headers = wrapper.findAll('[data-test="memory-member-group-header"]');
    const headerTexts = headers.map((header) => header.text().replace(/\s+/g, ' '));
    expect(headerTexts[0]).toBe('StudentStudyGroup');
    expect(headerTexts[1]).toMatch(/^StudentStudyGroup ?· Task team · \S/);
    expect(headerTexts[2]).toMatch(/^helpers ?· Task team$/);
    const groups = wrapper.findAll('article [data-group-run-id]');
    expect(groups.map((group) => [group.attributes('data-group-run-id'), group.attributes('data-group-kind')])).toEqual([
      ['study-configured', 'CONFIGURED_TEAM'],
      ['study-task', 'TASK_TEAM'],
      ['nested-task', 'TASK_TEAM'],
    ]);
    const labelsIn = (index: number) => groups[index]!.findAll('button').map((button) => button.find('span').text());
    expect(labelsIn(0)).toEqual(['student_one', 'student_two']);
    expect(labelsIn(1)).toEqual(['student_one', 'student_two']);
    expect(labelsIn(2)).toEqual(['checker']);

    const buttons = wrapper.findAll('article button');
    expect(buttons.map((button) => button.find('span').text())).toEqual(['Teacher', 'student_one', 'student_two', 'student_one', 'student_two', 'checker']);
    await buttons[3]!.trigger('click');
    await buttons[1]!.trigger('click');
    expect(wrapper.emitted('inspectMember')?.map(([runId, target]) => [runId, (target as CollaborationMemberMemoryTargetSummary).agentRunId])).toEqual([
      ['org-run-1', 'one-task'],
      ['org-run-1', 'one-configured'],
    ]);
  });

  it("emits member (with the run's summary, autobyteus-608 DEC-002), paging and retry intents without reading any store", async () => {
    const wrapper = mountDetail({ page: 2, totalPages: 3 });

    await wrapper.findAll('article button')[1]!.trigger('click');
    expect(wrapper.emitted('inspectMember')?.[0]?.[0]).toBe('team-run-1');
    expect(wrapper.emitted('inspectMember')?.[0]?.[1]).toMatchObject({ memberAddress: '/writer', agentRunId: 'member-2' });
    expect(wrapper.emitted('inspectMember')?.[0]?.[2]).toBe('Planning run');

    // A run without a summary carries no title: the run page falls back to its run ID.
    const untitled = mountDetail({ rows: [row({ summary: '' })] });
    await untitled.findAll('article button')[0]!.trigger('click');
    expect(untitled.emitted('inspectMember')?.[0]?.[2]).toBeNull();

    await wrapper.findAll('button').find((button) => button.text() === 'Next')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Prev')!.trigger('click');
    expect(wrapper.emitted('changePage')).toEqual([[3], [1]]);
    expect(wrapper.text()).toContain('Page 2 / 3');
  });

  it('shows loading, error with retry and empty states', async () => {
    expect(mountDetail({ rows: [], loading: true }).text()).toMatch(/loading runs/i);

    const failed = mountDetail({ rows: [], error: 'boom' });
    expect(failed.text()).toContain('boom');
    await failed.findAll('button').find((button) => button.text() === 'Retry')!.trigger('click');
    expect(failed.emitted('retry')).toHaveLength(1);

    expect(mountDetail({ rows: [] }).text()).toMatch(/no runs match/i);
  });
});
