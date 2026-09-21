import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TeamDelegatedTaskItemDetail from '../TeamDelegatedTaskItemDetail.vue';

const directed = (from = 'assignee', to = 'delegator') => ({
  kind: 'directed' as const,
  from: { kind: 'named' as const, targetKind: 'unavailable' as const, label: from },
  to: { kind: 'named' as const, targetKind: 'unavailable' as const, label: to },
});
const base = {
  itemKey: 'item-key',
  createdAt: '2026-08-20T10:28:00.000Z',
  direction: directed(),
  referenceFiles: [],
};
const mountSubject = (item: any, displayStatus = 'in_progress') => mount(TeamDelegatedTaskItemDetail, {
  props: { item, displayStatus },
  global: {
    stubs: {
      Icon: { props: ['icon'], template: '<span :data-icon="icon" />' },
      MarkdownRenderer: { props: ['content'], template: '<div data-test="markdown-renderer">{{ content }}</div>' },
    },
  },
});

describe('TeamDelegatedTaskItemDetail', () => {
  it('renders assignment context and status without a right-side reference list', () => {
    const wrapper = mountSubject({ ...base, kind: 'assignment', content: 'Full assignment.' }, 'revision_requested');
    expect(wrapper.get('[data-test="delegated-task-item-title"]').text()).toBe('Task assigned');
    expect(wrapper.get('[data-test="delegated-task-detail-status"]').text()).toContain('Revision requested');
    expect(wrapper.get('[data-test="delegated-task-item-direction"]').text()).toContain('assignee → delegator');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Full assignment.');
    expect(wrapper.find('[data-test="team-delegated-task-reference-row"]').exists()).toBe(false);
  });

  it.each([
    [{ ...base, kind: 'submission', content: 'First result.', resultOrdinal: 1, revised: false }, 'Result submitted · Result 1'],
    [{ ...base, kind: 'submission', content: 'Revised result.', resultOrdinal: 2, revised: true }, 'Revised result submitted · Result 2'],
    [{ ...base, kind: 'review', decision: 'request_revision', content: 'Please revise.', reviewedResultOrdinal: 1 }, 'Revision requested for Result 1'],
    [{ ...base, kind: 'review', decision: 'accept', content: 'Looks good.', reviewedResultOrdinal: 2 }, 'Result 2 accepted'],
    [{ ...base, kind: 'interruption', content: 'Root TeamRun terminated.', direction: { kind: 'system', assignment: directed() } }, 'Task interrupted'],
  ])('renders the selected lifecycle variant %#', (item, expectedTitle) => {
    const wrapper = mountSubject(item);
    expect(wrapper.get('[data-test="delegated-task-item-title"]').text()).toBe(expectedTitle);
    expect(wrapper.get('[data-test="delegated-task-update-body"]').text()).toContain(item.content);
  });

  it('keeps an acceptance with no comment visible through localized fallback content', () => {
    const wrapper = mountSubject({
      ...base, kind: 'review', decision: 'accept', content: null, reviewedResultOrdinal: 2,
    }, 'accepted');
    expect(wrapper.get('[data-test="delegated-task-item-title"]').text()).toBe('Result 2 accepted');
    expect(wrapper.get('[data-test="delegated-task-update-body"]').text()).toContain('Result accepted.');
  });

  it('labels interruption as a system event rather than inventing a participant', () => {
    const wrapper = mountSubject({
      ...base, kind: 'interruption', content: 'Stopped.', direction: { kind: 'system', assignment: directed() },
    }, 'interrupted');
    expect(wrapper.get('[data-test="delegated-task-item-direction"]').text()).toContain('System lifecycle event');
  });
});

it('keeps system interruption text while disclosing exact assignment links, and never makes unavailable labels actionable', async () => {
  const from = { kind: 'named', targetKind: 'agent', label: 'director',
    link: { agentRunId: 'exact-director', address: '/director', label: 'director' } };
  const to = { kind: 'named', targetKind: 'task_team', label: 'review',
    teamRunId: 'exact-retained-team', participants: [
      { agentRunId: 'retained-lead', address: '/review/lead', label: 'lead' },
      { agentRunId: 'retained-worker', address: '/review/worker', label: 'worker' },
    ] };
  const wrapper = mountSubject({ ...base, kind: 'interruption', content: 'Stopped.',
    direction: { kind: 'system', assignment: { from, to } } }, 'interrupted');
  expect(wrapper.get('[data-test="delegated-task-item-direction"]').text()).toBe('System lifecycle event');
  expect(wrapper.find('[data-test="task-direction-agent"]').exists()).toBe(false);
  await wrapper.get('[data-test="task-identity-toggle"]').trigger('click');
  expect(wrapper.get('[data-test="task-identity-detail"]').text()).toContain('exact-retained-team');
  await wrapper.findAll('[data-test="task-identity-agent"]')[2].trigger('click');
  expect(wrapper.emitted('select-participant')).toEqual([[to.participants[1]]]);
  const unavailable = mountSubject({ ...base, kind: 'assignment', content: 'Historical task.' });
  expect(unavailable.find('[data-test="task-direction-agent"]').exists()).toBe(false);
  await unavailable.get('[data-test="task-identity-toggle"]').trigger('click');
  expect(unavailable.find('[data-test="task-identity-agent"]').exists()).toBe(false);
});
