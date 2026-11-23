import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceAgentOrgHistoryCollection from '../WorkspaceAgentOrgHistoryCollection.vue';
import type { AgentOrgHistoryDefinitionGroup } from '~/stores/runHistoryTypes';
import type { WorkspaceHistorySectionState } from '../workspaceHistorySectionContracts';
import { taskBearingTreeRows, taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { useRunStatusStore } from '~/stores/runStatusStore';
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/**
 * autobyteus-461 SR-084: an Org run's tree from the server. Its own agents and mounted teams are the Org's rows; each run
 * it delegated is the shared delegated row (FU-031), under the agent that delegated it, opening where the server says.
 */
const mountOrg = (rows = taskBearingTreeRows()) => {
  const tree = structuredClone(taskBearingView().execution_tree);
  useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: 'org-run' }, rows);
  const group: AgentOrgHistoryDefinitionGroup = {
    stableKey: 'agent_org_definition:org-definition', definitionId: 'org-definition', name: 'Restored Org',
    runs: [{ stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run', createdAt: tree.createdAt,
      lastActivityAt: tree.createdAt, archivedAt: null, isActive: true, summary: 'Delegating Org', executionTree: tree }],
  };
  const expanded = reactive<Record<string, boolean>>({});
  const state = {
    isAgentOrgDefinitionExpanded: () => true, isAgentOrgRunExpanded: () => true, isAgentOrgTeamExpanded: () => true,
    isAgentOrgRunSelected: () => false, isAgentOrgMemberSelected: () => false, isAgentOrgTerminating: () => false,
    isAgentOrgDeleting: () => false, isAgentOrgArchiving: () => false, agentOrgTerminationError: () => null, agentOrgContextFor: () => null,
    isAgentOrgTaskTeamExpanded: (_root: string, key: string) => expanded[key] ?? true,
    toggleAgentOrgTaskTeam: vi.fn((_root: string, key: string) => { expanded[key] = !(expanded[key] ?? true); }),
  } as unknown as WorkspaceHistorySectionState;
  const actions = { onInspectAgentOrgExecution: vi.fn(), onSelectAgentOrgMember: vi.fn() };
  const wrapper = mount(defineComponent({ setup: () => () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'ws', groups: [group], state,
    actions: actions as never, avatars: { showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: vi.fn() } }) }));
  return { wrapper, actions, state };
};
const delegatedRows = (wrapper: ReturnType<typeof mountOrg>['wrapper']) => wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');

describe('Org history delegated rows (SR-084)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('shows the Org\'s own agents and mounted team, and each delegated run under the agent that delegated it, its starter in the accessible label only', () => {
    const { wrapper } = mountOrg();
    expect(wrapper.find('[data-test="agent-org-agent-row-agent-director"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="agent-org-team-row-team-configured"]').exists()).toBe(true);
    const [worker, team] = delegatedRows(wrapper);
    expect(worker!.attributes()).toMatchObject({ 'data-delegated-run-kind': 'task_agent', 'data-agent-run-id': 'agent-worker-task', 'aria-level': '2' });
    expect(team!.attributes()).toMatchObject({ 'data-delegated-run-kind': 'task_team', 'aria-level': '2' });
    expect(wrapper.text()).not.toContain('Started by');
    expect(worker!.attributes('aria-label')).toContain('Started by director');
  });

  it('org-teams-follow-definition (REQ-009): a unit leaving the Org (its agent, its mounted team and members) is tagged Leaving while it finishes', () => {
    const rows = taskBearingTreeRows().map((row) => row.kind === 'org_team' || (row.kind === 'team_member' && row.parentKey?.startsWith('org_team:'))
      || row.address === '/director' ? { ...row, leaving: true as const } : row);
    const { wrapper } = mountOrg(rows);
    expect(wrapper.get('[data-test="agent-org-agent-row-agent-director"]').find('[data-test="workspace-member-leaving"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="agent-org-team-row-team-configured"]').find('[data-test="workspace-member-leaving"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="agent-org-agent-row-agent-worker-configured"]').find('[data-test="workspace-member-leaving"]').exists()).toBe(false);
  });

  it('gives the mounted team and a delegated team one Team status dot each; a delegated team\'s is its run\'s own (SR-086 G-A4)', async () => {
    const { wrapper } = mountOrg();
    useRunStatusStore().apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [{ kind: 'agent_team', runId: 'team-task', answer: 'ok', node: null, status: 'running', backgroundTasksRunning: 0, agents: [] }] } });
    await nextTick();
    expect(wrapper.get('[data-test="agent-org-team-row-team-configured"]').findAll('[data-test="team-aggregate-status-dot"]')).toHaveLength(1);
    const team = wrapper.get('[data-test="workspace-team-transient-execution-row"][data-delegated-run-kind="task_team"]');
    expect(team.get('[data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe(AgentStatus.Running);
  });

  it('a delegated team starts expanded; its click opens its coordinator without folding it; its chevron folds it (CR-461-108)', async () => {
    const { wrapper, actions } = mountOrg();
    const team = () => wrapper.get('[data-test="workspace-team-transient-execution-row"][data-delegated-run-kind="task_team"]');
    expect(team().attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[data-agent-run-id="agent-task-worker"]').exists()).toBe(true);
    await team().trigger('click');
    await nextTick();
    expect(team().attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[data-agent-run-id="agent-task-worker"]').exists()).toBe(true);
    await team().get('[data-test="workspace-team-transient-disclosure"]').trigger('click');
    await nextTick();
    expect(team().attributes('aria-expanded')).toBe('false');
    expect(actions.onInspectAgentOrgExecution).toHaveBeenCalledWith(expect.objectContaining({ rootRunId: 'org-run' }), 'agent-task-lead', '');
    await wrapper.get('[data-agent-run-id="agent-worker-task"]').trigger('click');
    expect(actions.onInspectAgentOrgExecution).toHaveBeenLastCalledWith(expect.objectContaining({ rootRunId: 'org-run' }), 'agent-worker-task', '/worker');
  });

  it('a delegated row leaves when the tree\'s change removes it', async () => {
    const { wrapper } = mountOrg();
    useRunTreeStore().streamChange({ kind: 'agent_org', runId: 'org-run' }, { added: [], removed: ['agent:agent-worker-task'], updated: [] });
    await nextTick();
    expect(wrapper.find('[data-agent-run-id="agent-worker-task"]').exists()).toBe(false);
  });
});
