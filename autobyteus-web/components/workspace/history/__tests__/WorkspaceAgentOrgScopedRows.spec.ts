import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceAgentOrgHistoryCollection from '../WorkspaceAgentOrgHistoryCollection.vue';
import type { AgentOrgHistoryDefinitionGroup } from '~/stores/runHistoryTypes';
import type { WorkspaceHistorySectionState } from '../workspaceHistorySectionContracts';
import type { RootExecutionScope } from '~/utils/collaboration/taskExecutionScope';
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/**
 * projects-left-navigation REQ-008 / AC-007 (Org rows): in Projects mode an Org run listed under a Project shows only the
 * delegated copies in that Project's scope (and everything under them); its configured members stay. A top-level copy in
 * no scope is reported once (DS-004 trigger 5). Without a scope (Workspaces mode) every row shows.
 */
const mountOrg = (scope: RootExecutionScope | null) => {
  const tree = structuredClone(taskBearingView().execution_tree);
  const group: AgentOrgHistoryDefinitionGroup = {
    stableKey: 'agent_org_definition:org-definition',
    definitionId: 'org-definition',
    name: 'Restored Org',
    runs: [{
      stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run',
      createdAt: tree.createdAt, archivedAt: null, isActive: false, summary: 'Delegating Org', executionTree: tree, closedTaskExecutions: [],
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
  const executionScopeOf = scope ? (rootRunId: string) => (rootRunId === 'org-run' ? scope : null) : null;
  return mount(defineComponent({
    setup: () => () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'project:p', groups: [group], state, actions, avatars, executionScopeOf }),
  }));
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const exists = (wrapper: ReturnType<typeof mountOrg>, testId: string) => wrapper.find(`[data-test="${testId}"]`).exists();

describe('Org history rows scoped to a Project', () => {
  it('keeps only the task Agent in scope; the task Team and its members leave; configured rows stay; the unscoped Team is reported once', async () => {
    const noteUnscoped = vi.fn();
    const wrapper = mountOrg({ copies: new Set(['agent:agent-worker-task']), noteUnscoped });
    expect(exists(wrapper, 'agent-org-task-agent-row-agent-worker-task')).toBe(true);
    expect(exists(wrapper, 'agent-org-task-team-row-team-task')).toBe(false);
    for (const member of ['agent-task-lead', 'agent-task-worker']) expect(exists(wrapper, `agent-org-task-agent-row-${member}`)).toBe(false);
    expect(exists(wrapper, 'agent-org-team-row-team-configured')).toBe(true);
    expect(exists(wrapper, 'agent-org-agent-row-agent-director')).toBe(true);
    await flush();
    expect(noteUnscoped).toHaveBeenCalledWith(['team:team-task']);
  });

  it('keeps the task Team in scope with its members; the task Agent leaves', async () => {
    const noteUnscoped = vi.fn();
    const wrapper = mountOrg({ copies: new Set(['team:team-task']), noteUnscoped });
    expect(exists(wrapper, 'agent-org-task-team-row-team-task')).toBe(true);
    for (const member of ['agent-task-lead', 'agent-task-worker']) expect(exists(wrapper, `agent-org-task-agent-row-${member}`)).toBe(true);
    expect(exists(wrapper, 'agent-org-task-agent-row-agent-worker-task')).toBe(false);
    await flush();
    expect(noteUnscoped).toHaveBeenCalledWith(['agent:agent-worker-task']);
  });

  it('shows every row without a scope (Workspaces mode)', () => {
    const wrapper = mountOrg(null);
    for (const testId of ['agent-org-task-agent-row-agent-worker-task', 'agent-org-task-team-row-team-task', 'agent-org-task-agent-row-agent-task-lead',
      'agent-org-team-row-team-configured', 'agent-org-agent-row-agent-director']) expect(exists(wrapper, testId)).toBe(true);
  });
});
