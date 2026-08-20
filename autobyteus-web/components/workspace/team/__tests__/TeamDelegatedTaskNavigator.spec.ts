import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TeamDelegatedTaskNavigator from '../TeamDelegatedTaskNavigator.vue';

const directed = (from: string, to: string) => ({
  kind: 'directed', from: { kind: 'named', label: from }, to: { kind: 'named', label: to },
});
const ref = (referenceId: string, path: string) => ({
  referenceId, path, type: 'file', createdAt: '2026-08-20T10:00:00.000Z', updatedAt: '2026-08-20T10:00:00.000Z',
});
const singleAgentEntry = {
  kind: 'task_agent',
  entryKey: 'task:task_0001',
  teamRunId: 'team-run',
  taskId: 'task_0001',
  runId: 'task-agent-run-1',
  displayStatus: 'accepted',
  lastActivityAt: '2026-08-20T11:18:00.000Z',
  lifecycleItems: [
    {
      kind: 'assignment', itemKey: 'task:task_0001:assignment', createdAt: '2026-08-20T10:10:00.000Z',
      content: 'Draft the implementation handoff with enough words to exercise narrow-panel line clamping.',
      direction: directed('solution_designer', 'implementation_engineer'),
      referenceFiles: [ref('root-ref', '/tmp/requirements.md')],
    },
    {
      kind: 'submission', itemKey: 'task:task_0001:submission:submission-1', createdAt: '2026-08-20T10:28:00.000Z',
      content: 'Initial implementation is ready for review.', direction: directed('implementation_engineer', 'solution_designer'),
      referenceFiles: [ref('submission-ref', '/tmp/implementation-handoff.md')], resultOrdinal: 1, revised: false,
    },
    {
      kind: 'review', decision: 'request_revision', itemKey: 'task:task_0001:review:review-1',
      createdAt: '2026-08-20T10:42:00.000Z', content: 'Keep the current task layout.',
      direction: directed('solution_designer', 'implementation_engineer'), referenceFiles: [ref('review-ref', '/tmp/feedback.md')],
      reviewedResultOrdinal: 1,
    },
    {
      kind: 'submission', itemKey: 'task:task_0001:submission:submission-2', createdAt: '2026-08-20T11:06:00.000Z',
      content: 'Updated implementation is ready.', direction: directed('implementation_engineer', 'solution_designer'),
      referenceFiles: [], resultOrdinal: 2, revised: true,
    },
    {
      kind: 'review', decision: 'accept', itemKey: 'task:task_0001:review:review-2',
      createdAt: '2026-08-20T11:18:00.000Z', content: null,
      direction: directed('solution_designer', 'implementation_engineer'), referenceFiles: [], reviewedResultOrdinal: 2,
    },
  ],
};
const taskTeamEntry = {
  kind: 'task_team', entryKey: 'task:task_0002', teamRunId: 'team-run', taskId: 'task_0002', runId: 'task-team-run-1',
  displayStatus: 'interrupted', lastActivityAt: '2026-08-20T11:18:00.000Z', lifecycleItems: [
    {
      kind: 'assignment', itemKey: 'task:task_0002:assignment', createdAt: '2026-08-20T10:10:00.000Z',
      content: 'Review the implementation as a team.', direction: directed('solution_designer', 'software_engineering_team'),
      referenceFiles: [],
    },
    {
      kind: 'interruption', itemKey: 'task:task_0002:interruption:interruption-1', createdAt: '2026-08-20T11:18:00.000Z',
      content: 'Root TeamRun terminated.', direction: { kind: 'system' }, referenceFiles: [],
    },
  ],
};

const mountSubject = (entries: any[], props: Record<string, unknown> = {}) => mount(TeamDelegatedTaskNavigator, {
  props: {
    entries, selectedEntryKey: null, selectedItemKey: null, selectedReferenceId: null, ...props,
  },
  global: {
    stubs: { Icon: { props: ['icon'], template: '<span data-test="task-icon" :data-icon="icon" />' } },
  },
});

describe('TeamDelegatedTaskNavigator', () => {
  it('keeps the root task and every update/reference in the ordered left navigator without technical metadata', () => {
    const wrapper = mountSubject([singleAgentEntry], {
      selectedEntryKey: 'task:task_0001', selectedItemKey: 'task:task_0001:assignment',
    });

    const root = wrapper.get('[data-test="team-delegated-task-summary-row"]');
    expect(root.text()).toContain('Draft the implementation handoff');
    expect(root.text()).toContain('Accepted');
    expect(root.text()).toContain('solution_designer → implementation_engineer');
    expect(root.attributes('aria-pressed')).toBe('true');

    expect(wrapper.get('[data-test="team-delegated-task-references"]').text()).toContain('requirements.md');
    const rows = wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]');
    expect(rows.map((row) => row.text())).toEqual([
      expect.stringContaining('Result submitted · Result 1'),
      expect.stringContaining('Revision requested · Result 1'),
      expect.stringContaining('Revised result submitted · Result 2'),
      expect.stringContaining('Result 2 accepted'),
    ]);
    expect(wrapper.get('[data-test="team-delegated-task-update-references"]').text()).toContain('implementation-handoff.md');
    expect(wrapper.findAll('[data-test="team-delegated-task-update-references"]')[1].text()).toContain('feedback.md');
    expect(wrapper.find('[data-test="team-delegated-task-technical-details"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('task-agent-run-1');
    expect(wrapper.text()).not.toContain('task_0001');
  });

  it('emits exact item and owner-aware reference locators', async () => {
    const wrapper = mountSubject([singleAgentEntry]);
    await wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')[1].trigger('click');
    expect(wrapper.emitted('select-item')?.[0]).toEqual([{
      entryKey: 'task:task_0001', itemKey: 'task:task_0001:review:review-1',
    }]);

    const updateReferences = wrapper.findAll('[data-test="team-delegated-task-update-references"]');
    await updateReferences[1].get('[data-test="team-delegated-task-reference-row"]').trigger('click');
    expect(wrapper.emitted('select-reference')?.[0]).toEqual([{
      entryKey: 'task:task_0001', itemKey: 'task:task_0001:review:review-1', referenceId: 'review-ref',
    }]);
  });

  it('marks only the exact update reference selected and exposes complete accessible row names', () => {
    const wrapper = mountSubject([singleAgentEntry], {
      selectedEntryKey: 'task:task_0001',
      selectedItemKey: 'task:task_0001:review:review-1',
      selectedReferenceId: 'review-ref',
    });
    const revisionRow = wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')[1];
    expect(revisionRow.attributes('aria-pressed')).toBe('false');
    expect(revisionRow.attributes('aria-label')).toContain('Revision requested · Result 1');
    expect(revisionRow.attributes('aria-label')).toContain('solution_designer → implementation_engineer');
    const selectedReference = wrapper.findAll('[data-test="team-delegated-task-reference-row"]')
      .find((row) => row.text().includes('feedback.md'))!;
    expect(selectedReference.attributes('aria-pressed')).toBe('true');
  });

  it('renders a task Team interruption as a system lifecycle event without inventing a sender', () => {
    const wrapper = mountSubject([taskTeamEntry]);
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.get('[data-test="team-delegated-task-status"]').text()).toContain('Interrupted');
    const update = wrapper.get('[data-test="team-delegated-task-lifecycle-row"]');
    expect(update.text()).toContain('Task interrupted');
    expect(update.text()).toContain('System lifecycle event');
    expect(update.text()).toContain('Root TeamRun terminated.');
  });
});
