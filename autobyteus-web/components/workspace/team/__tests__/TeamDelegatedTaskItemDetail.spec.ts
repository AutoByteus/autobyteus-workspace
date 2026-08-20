import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TeamDelegatedTaskItemDetail from '../TeamDelegatedTaskItemDetail.vue';

const directed = (from = 'assignee', to = 'delegator') => ({
  kind: 'directed' as const,
  from: { kind: 'named' as const, label: from },
  to: { kind: 'named' as const, label: to },
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
    [{ ...base, kind: 'interruption', content: 'Root TeamRun terminated.', direction: { kind: 'system' } }, 'Task interrupted'],
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
      ...base, kind: 'interruption', content: 'Stopped.', direction: { kind: 'system' },
    }, 'interrupted');
    expect(wrapper.get('[data-test="delegated-task-item-direction"]').text()).toContain('System lifecycle event');
  });
});
