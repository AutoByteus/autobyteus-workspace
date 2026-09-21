import { flushPromises, mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import CollaborationDelegatedTasksSection from '../CollaborationDelegatedTasksSection.vue';
import { projectAgentOrgTasks } from '~/services/agentOrgExecution/agentOrgTaskPresentation';
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex';
import { taskBearingView, taskRecord } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';
import { testCollaborationTasksContextView } from '~/test-support/teamWorkspaceContextView';
import type { CollaborationTasksContextView } from '~/types/workspace/collaborationTasksContextView';
const navigation = vi.hoisted(() => ({ inspect: vi.fn(), open: vi.fn(), push: vi.fn() }));
vi.mock('~/composables/useWorkspaceHistorySubjectActions', () => ({ useWorkspaceHistorySubjectActions: () => ({ execute: navigation.inspect }) }));
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRouter: () => ({ push: navigation.push }) }));
vi.mock('~/services/workspace/workspaceNavigationService', () => ({ openWorkspaceExecutionLink: navigation.open, buildWorkspaceExecutionRoute: (link: unknown) => link }));
const mountTasks = (tasks: CollaborationTasksContextView) => mount(CollaborationDelegatedTasksSection, {
  props: { tasks }, global: { stubs: {
    Icon: { template: '<span />' }, MarkdownRenderer: { props: ['content'], template: '<article>{{ content }}</article>' },
    TeamTaskReferenceViewer: { props: ['contentPath'], template: '<div data-test="reference-content">{{ contentPath }}</div>' },
  } },
});

it('keeps exact all-member retained task-Team destinations in names/detail, reverses submission and resets only on item/scope/reference changes', async () => {
  navigation.inspect.mockClear();
  const view = taskBearingView();
  const fresh = view.execution_tree.rootOrg.taskExecutions[1] as any;
  const second = structuredClone(fresh); second.teamRunId = 'same-name-second-team';
  second.members.forEach((m: any) => { m.agentRunId += '-second'; });
  view.execution_tree.rootOrg.taskExecutions.push(second);
  view.task_records.records.push(taskRecord('same-name-second-task', '/team', { teamRunId: second.teamRunId }));
  const task = view.task_records.records[1] as any;
  task.status = 'accepted'; fresh.settledAt = '2026-09-01T00:05:00.000Z';
  task.updates = [
    { submissionId: 'result', message: 'Original result', referenceFiles: ['/tmp/report.md'], createdAt: '2026-09-01T00:02:00.000Z' },
    { reviewId: 'review', reviewedSubmissionId: 'result', decision: 'accept', comment: null, referenceFiles: [], createdAt: '2026-09-01T00:03:00.000Z' },
  ];
  const entries = () => projectAgentOrgTasks({ orgRunId: 'org-run', view, index: new AgentOrgExecutionViewIndex(view), focusedAgentRunId: 'agent-director' });
  const tasks: CollaborationTasksContextView = { rootKind: 'agent_org', rootRunId: 'org-run', focusedAgentRunId: 'agent-director',
    listDelegatedTaskEntries: entries, taskReferenceContentPath: (taskId, refId) => `exact/${taskId}/${refId}` };
  const wrapper = mountTasks(tasks);
  expect(wrapper.find('nav').exists()).toBe(false);
  expect(wrapper.find('[data-test="task-identity-detail"]').exists()).toBe(false);
  expect(entries()[1]).not.toHaveProperty('participants');
  await wrapper.findAll('[data-test="team-delegated-task-summary-row"]')[1].trigger('click');
  await wrapper.get('[data-test="task-direction-team"]').trigger('click');
  expect(wrapper.get('[data-test="task-identity-toggle"]').attributes('aria-expanded')).toBe('true');
  const detail = wrapper.get('[data-test="task-identity-detail"]');
  expect(detail.text()).toContain('team-task');
  expect(detail.text()).toContain('agent-task-worker');
  expect(detail.text()).not.toContain('agent-task-worker-second');
  await detail.findAll('[data-test="task-identity-agent"]')[2].trigger('click');
  expect(navigation.inspect).toHaveBeenLastCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'inspect', agentRunId: 'agent-task-worker', memberAddress: '/team/worker' });
  // Same item replacement retains the local disclosure, including live body/status updates.
  await wrapper.setProps({ tasks: { ...tasks, listDelegatedTaskEntries: () => entries().map((entry) => ({ ...entry, lastActivityAt: 'updated' })) } });
  expect(wrapper.get('[data-test="task-identity-toggle"]').attributes('aria-expanded')).toBe('true');
  await wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')[0].trigger('click');
  expect(wrapper.get('[data-test="task-identity-toggle"]').attributes('aria-expanded')).toBe('false');
  expect(wrapper.get('[data-test="delegated-task-item-direction"]').text()).toContain('team → director');
  await wrapper.get('[data-test="task-direction-agent"]').trigger('click');
  expect(navigation.inspect).toHaveBeenLastCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'inspect', agentRunId: 'agent-director', memberAddress: '/director' });
  await wrapper.get('[data-test="task-identity-toggle"]').trigger('click');
  const before = navigation.inspect.mock.calls.length;
  await wrapper.get('[data-test="team-delegated-task-reference-row"]').trigger('click');
  expect(wrapper.get('[data-test="reference-content"]').text()).toContain('exact/task-team/');
  expect(navigation.inspect).toHaveBeenCalledTimes(before);
  await wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')[0].trigger('click');
  expect(wrapper.get('[data-test="task-identity-toggle"]').attributes('aria-expanded')).toBe('false');
  await wrapper.findAll('[data-test="team-delegated-task-summary-row"]')[2].trigger('click');
  await wrapper.get('[data-test="task-direction-team"]').trigger('click');
  await wrapper.get('[data-test="task-identity-detail"]').findAll('[data-test="task-identity-agent"]')[2].trigger('click');
  expect(navigation.inspect).toHaveBeenLastCalledWith(expect.objectContaining({ agentRunId: 'agent-task-worker-second', memberAddress: '/team/worker' }));
  await wrapper.setProps({ tasks: { ...tasks, focusedAgentRunId: 'agent-worker-task' } });
  expect(wrapper.get('[data-test="task-identity-toggle"]').attributes('aria-expanded')).toBe('false');
});

it('routes standalone Team exact task Agent names through the retained Team navigation boundary', async () => {
  navigation.open.mockClear(); navigation.inspect.mockClear();
  const context = buildTestTeamContext({ teamRunId: 'standalone-team', coordinatorAddress: '/lead', rootChildren: [testAgentNode('/lead', { agentRunId: 'lead' }), testAgentNode('/worker', { agentRunId: 'configured-worker' })],
    tasks: [testTaskRecord({ taskId: 'work', delegatorAgentRunId: 'lead', recipientAddress: '/worker', target: { agentRunId: 'fresh-worker' } })] });
  const wrapper = mountTasks(testCollaborationTasksContextView(context, 'lead'));
  expect(navigation.open).not.toHaveBeenCalled();
  await wrapper.findAll('[data-test="task-direction-agent"]')[1].trigger('click'); await flushPromises();
  expect(navigation.open).toHaveBeenCalledWith({ kind: 'team', teamRunId: 'standalone-team', agentRunId: 'fresh-worker' });
  expect(navigation.push).toHaveBeenCalledWith({ kind: 'team', teamRunId: 'standalone-team', agentRunId: 'fresh-worker' });
  expect(navigation.inspect).not.toHaveBeenCalled();
});
