import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CollaborationMemoryDetail from '../CollaborationMemoryDetail.vue';
import type { CollaborationRunMemoryRow } from '~/types/memory';

const memory = { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false };

const row = (overrides: Partial<CollaborationRunMemoryRow> = {}): CollaborationRunMemoryRow => ({
  runId: 'team-run-1',
  summary: 'Planning run',
  workspaceRootPath: '/tmp/team-project',
  lastUpdatedAt: '2026-06-19T10:06:04.000Z',
  memory,
  memberTargets: [
    { memberAddress: '/lead', displayName: 'Lead', agentRunId: 'member-1', memory },
    { memberAddress: '/lead', displayName: 'Lead', agentRunId: 'task-member-1', memory },
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

describe('CollaborationMemoryDetail', () => {
  it('renders concise runs with every member display name and run ID (AC-010)', () => {
    const wrapper = mountDetail();

    expect(wrapper.find('header').exists()).toBe(false);
    expect(wrapper.find('section h1').text()).toBe('Software Team');
    expect(wrapper.text()).not.toContain('Agent Team');
    expect(wrapper.text()).not.toContain('ID:');
    expect(wrapper.text()).not.toMatch(/\bRuns\b/);
    expect(wrapper.find('input').attributes('placeholder')).toMatch(/search runs/i);
    expect(wrapper.text()).toContain('Members');
    expect(wrapper.text()).toContain('/tmp/team-project');
    expect(wrapper.text()).not.toContain('Workspace:');
    const memberButtons = wrapper.findAll('article button');
    expect(memberButtons.map((button) => button.findAll('span').map((span) => span.text()))).toEqual([
      ['Lead', 'member-1'],
      ['Lead', 'task-member-1'],
    ]);
    for (const button of memberButtons) {
      expect(button.find('span').text()).not.toBe('');
    }
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
