import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceAgentOrgHistoryCollection from '../WorkspaceAgentOrgHistoryCollection.vue';
import type { AgentOrgHistoryDefinitionGroup } from '~/stores/runHistoryTypes';
import type { WorkspaceHistorySectionState } from '../workspaceHistorySectionContracts';
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/** CR-003 (REQ-013 / AC-017 via REQ-017): Org members tree shows plain names plus who started a delegated child. */
type OrgTree = ReturnType<typeof taskBearingView>['execution_tree'];
const mountOrg = (isActive: boolean, mutate: (tree: OrgTree) => OrgTree = (tree) => tree) => {
  const tree = mutate(structuredClone(taskBearingView().execution_tree) as OrgTree);
  const group: AgentOrgHistoryDefinitionGroup = {
    stableKey: 'agent_org_definition:org-definition',
    definitionId: 'org-definition',
    name: 'Restored Org',
    runs: [{
      stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run',
      createdAt: tree.createdAt, archivedAt: null, isActive, summary: 'Delegating Org', executionTree: tree,
    }],
  };
  const state = {
    isAgentOrgDefinitionExpanded: () => true,
    isAgentOrgRunExpanded: () => true,
    isAgentOrgTeamExpanded: () => true,
    isAgentOrgRunSelected: () => false,
    isAgentOrgMemberSelected: () => false,
    isAgentOrgTerminating: () => false,
    isAgentOrgDeleting: () => false,
    isAgentOrgArchiving: () => false,
    agentOrgTerminationError: () => null,
    agentOrgContextFor: () => null,
  } as unknown as WorkspaceHistorySectionState;
  const avatars = { showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: vi.fn() };
  const actions = { onInspectAgentOrgExecution: vi.fn() } as never;
  return mount(defineComponent({
    setup: () => () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'ws', groups: [group], state, actions, avatars }),
  }));
};

describe('Org history delegated rows', () => {
  it('shows the plain name and a "Started by" line for a direct delegated Agent and a delegated Team, with no task labels', () => {
    const wrapper = mountOrg(false);
    expect(wrapper.text()).not.toMatch(/Task:/);

    const agentRow = wrapper.get('[data-test="agent-org-task-agent-row-agent-worker-task"]');
    expect(agentRow.text()).toContain('worker');
    expect(wrapper.get('[data-test="agent-org-task-agent-started-by-agent-worker-task"]').text()).toBe('Started by director');
    expect(agentRow.attributes('aria-label')).toContain('Started by director');
    // A stopped run reports every delegated child with the standard offline status.
    expect(agentRow.attributes('data-status')).toBe('offline');
    expect(agentRow.attributes('aria-label')).toContain('offline');

    const teamRow = wrapper.get('[data-test="agent-org-task-team-row-team-task"]');
    expect(teamRow.text()).toContain('team');
    expect(wrapper.get('[data-test="agent-org-task-team-started-by-team-task"]').text()).toBe('Started by director');
    expect(teamRow.attributes('aria-label')).toContain('Started by director');
    expect(teamRow.attributes('aria-label')).not.toMatch(/Task:/);
  });

  it('gives task-Team members no spawner line because the Team row carries it', () => {
    const wrapper = mountOrg(false);
    for (const member of ['agent-task-lead', 'agent-task-worker']) {
      const row = wrapper.get(`[data-test="agent-org-task-agent-row-${member}"]`);
      expect(row.find(`[data-test="agent-org-task-agent-started-by-${member}"]`).exists()).toBe(false);
      expect(row.attributes('aria-label')).not.toContain('Started by');
    }
  });

  it('shows no starter line for children recorded before the delegator was stored (R-14)', () => {
    const wrapper = mountOrg(false, (tree) => ({
      ...tree,
      rootOrg: {
        ...tree.rootOrg,
        taskExecutions: tree.rootOrg.taskExecutions.map(({ delegatorAgentRunId: _omit, ...task }) => task),
      },
    }) as OrgTree);
    expect(wrapper.find('[data-test="agent-org-task-agent-started-by-agent-worker-task"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="agent-org-task-team-started-by-team-task"]').exists()).toBe(false);
    const agentRow = wrapper.get('[data-test="agent-org-task-agent-row-agent-worker-task"]');
    expect(agentRow.text()).toContain('worker');
    expect(agentRow.attributes('aria-label')).not.toContain('Started by');
  });

  it('falls back to the delegator AgentRun ID when it cannot be resolved in the tree', () => {
    const wrapper = mountOrg(true, (tree) => ({
      ...tree,
      rootOrg: {
        ...tree.rootOrg,
        taskExecutions: tree.rootOrg.taskExecutions.map((task, index) => index === 0 ? { ...task, delegatorAgentRunId: 'ghost-run' } : task),
      },
    }) as OrgTree);
    expect(wrapper.get('[data-test="agent-org-task-agent-started-by-agent-worker-task"]').text()).toBe('Started by ghost-run');
  });
});
