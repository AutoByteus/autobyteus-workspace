import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CollaborationMemoryDetail from '../CollaborationMemoryDetail.vue';
import type { CollaborationMemberMemoryTargetSummary, CollaborationMemoryGroup, CollaborationRunMemoryRow } from '~/types/memory';

const memory = { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false };

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
    member({ memberAddress: '/lead', displayName: 'Lead', agentRunId: 'task-member-1', executionKind: 'TASK_AGENT', startedAt: '2026-06-19T09:00:00.000Z' }),
  ],
  ...overrides,
});

const mountDetail = (props: Partial<InstanceType<typeof CollaborationMemoryDetail>['$props']> = {}) => mount(CollaborationMemoryDetail, {
  props: {
    title: 'Software Team',
    rows: [row()],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
    search: '',
    readOnly: false,
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
    member({ memberAddress: '/StudentStudyGroup/student_one', displayName: 'StudentStudyGroup/student_one', agentRunId: 'one-task', executionKind: 'TASK_TEAM_MEMBER', groupPath: [studyTask] }),
    member({ memberAddress: '/StudentStudyGroup/student_two', displayName: 'StudentStudyGroup/student_two', agentRunId: 'two-task', executionKind: 'TASK_TEAM_MEMBER', groupPath: [studyTask] }),
    member({ memberAddress: '/StudentStudyGroup/helpers/checker', displayName: 'StudentStudyGroup/helpers/checker', agentRunId: 'checker-task', executionKind: 'TASK_TEAM_MEMBER', groupPath: [studyTask, nested] }),
  ],
});

describe('CollaborationMemoryDetail', () => {
  it('renders concise runs with every member display name and run ID (AC-010)', () => {
    const wrapper = mountDetail();

    expect(wrapper.find('header').exists()).toBe(false);
    expect(wrapper.find('section h1').text()).toBe('Software Team');
    expect(wrapper.text()).not.toContain('Agent Team');
    expect(wrapper.text()).not.toContain('ID:');
    expect(wrapper.find('input').attributes('placeholder')).toMatch(/search runs/i);
    expect(wrapper.text()).toContain('Members');
    expect(wrapper.text()).toContain('/tmp/team-project');
    const memberButtons = wrapper.findAll('article button');
    const spans = memberButtons.map((button) => button.findAll('span').map((span) => span.text()));
    expect(spans[0]).toEqual(['Lead', 'member-1']);
    expect(spans[1]?.[0]).toBe('Lead');
    expect(spans[1]?.[1]).toMatch(/^Task · \S/);
    expect(spans[1]?.[2]).toBe('task-member-1');
    for (const button of memberButtons) {
      expect(button.find('span').text()).not.toBe('');
    }
  });

  it('renders a flat team without groups as a single row of member buttons', () => {
    const wrapper = mountDetail({ rows: [row({ memberTargets: [member({ displayName: 'Lead', agentRunId: 'member-1' }), member({ displayName: 'Writer', agentRunId: 'member-2' })] })] });
    expect(wrapper.findAll('[data-test="memory-member-group-header"]')).toHaveLength(0);
    expect(wrapper.findAll('article [data-group-run-id]')).toHaveLength(0);
    expect(wrapper.findAll('article button').map((button) => button.attributes('data-execution-kind'))).toEqual(['CONFIGURED', 'CONFIGURED']);
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

  it('emits search, member, paging, retry and back intents without reading any store', async () => {
    const wrapper = mountDetail({ page: 2, totalPages: 3, search: 'plan' });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('plan');

    await wrapper.find('input').setValue(' planning ');
    await wrapper.findAll('button').find((button) => button.text() === 'Search')!.trigger('click');
    expect(wrapper.emitted('search')).toEqual([['planning']]);

    await wrapper.findAll('article button')[1]!.trigger('click');
    expect(wrapper.emitted('inspectMember')?.[0]?.[0]).toBe('team-run-1');
    expect(wrapper.emitted('inspectMember')?.[0]?.[1]).toMatchObject({ memberAddress: '/lead', agentRunId: 'task-member-1' });

    await wrapper.findAll('button').find((button) => button.text() === 'Next')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Prev')!.trigger('click');
    expect(wrapper.emitted('changePage')).toEqual([[3], [1]]);
    expect(wrapper.text()).toContain('Page 2 / 3');

    await wrapper.findAll('button')[0]!.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('shows loading, error with retry, empty and read-only states', async () => {
    expect(mountDetail({ rows: [], loading: true }).text()).toMatch(/loading runs/i);

    const failed = mountDetail({ rows: [], error: 'boom' });
    expect(failed.text()).toContain('boom');
    await failed.findAll('button').find((button) => button.text() === 'Retry')!.trigger('click');
    expect(failed.emitted('retry')).toHaveLength(1);

    expect(mountDetail({ rows: [] }).text()).toMatch(/no runs match/i);
    expect(mountDetail({ readOnly: true }).text()).toMatch(/imported/i);
  });
});
