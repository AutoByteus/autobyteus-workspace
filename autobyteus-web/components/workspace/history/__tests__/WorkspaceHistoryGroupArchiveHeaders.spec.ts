import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceHistoryWorkspaceSection from '../WorkspaceHistoryWorkspaceSection.vue';
import {
  agentGroupArchiveKey,
  agentOrgGroupArchiveKey,
  teamGroupArchiveKey,
} from '~/composables/useWorkspaceHistoryGroupArchive';
import type { AgentOrgHistoryDefinitionGroup, TeamTreeNode } from '~/stores/runHistoryTypes';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

const WORKSPACE_KEY = 'workspace:/ws/a';

const agentRun = (runId: string, overrides: Record<string, unknown> = {}) => ({
  runId, summary: runId, lastActivityAt: '2026-10-01T00:00:00.000Z', currentStatus: 'offline',
  isActive: false, source: 'history', isDraft: false, ...overrides,
});

const teamRun = (teamRunId: string, isActive = false): TeamTreeNode => ({
  teamRunId, teamDefinitionId: 'team-def-1', teamDefinitionName: 'English Bridge Team', workspaceRootPath: '/ws/a',
  summary: teamRunId, lastActivityAt: '2026-10-01T00:00:00.000Z', isActive, deleteLifecycle: 'READY',
  focusedAgentRunId: '', rootTeam: null as any, members: [], executionRows: [],
});

const orgGroup = (): AgentOrgHistoryDefinitionGroup => ({
  stableKey: 'agent_org_definition:org-def-1', definitionId: 'org-def-1', name: 'Delivery Org',
  runs: [{ stableKey: 'agent_org_run:org-1', rootRunId: 'org-1', isActive: true, summary: 'Deliver' } as any],
});

const mountSection = (options: { agents?: any[]; archivingKeys?: string[]; withGroupActions?: boolean } = {}) => {
  const groupActions = {
    onArchiveAgentGroup: vi.fn(), onArchiveTeamGroup: vi.fn(), onArchiveAgentOrgGroup: vi.fn(),
  };
  const actions = {
    onRemoveWorkspace: vi.fn(), onCreateRun: vi.fn(), onSelectRun: vi.fn(), onTerminateRun: vi.fn(),
    onArchiveRun: vi.fn(), onDeleteRun: vi.fn(), onSelectTeam: vi.fn(), onTerminateTeam: vi.fn(),
    onArchiveTeam: vi.fn(), onDeleteTeam: vi.fn(), onSelectTeamMember: vi.fn(),
    ...(options.withGroupActions === false ? {} : groupActions),
  };
  const archivingKeys = new Set(options.archivingKeys ?? []);
  const state = {
    selectedRunId: null, isTeamRunSelected: () => false,
    isRunTerminating: () => false, isTeamTerminating: () => false, isRunDeleting: () => false,
    isTeamDeleting: () => false, isRunArchiving: () => false, isTeamArchiving: () => false,
    isWorkspaceRemoving: () => false, isWorkspaceHistoryLoading: () => false, workspaceHistoryError: () => null,
    formatRelativeTime: () => 'now', isWorkspaceExpanded: () => true, toggleWorkspace: vi.fn(),
    isAgentExpanded: () => false, toggleAgent: vi.fn(), isTeamDefinitionExpanded: () => false,
    toggleTeamDefinition: vi.fn(), isTeamExpanded: () => false, isTeamMemberExpanded: () => false,
    toggleTeamMember: vi.fn(), isAgentOrgDefinitionExpanded: () => false, toggleAgentOrgDefinition: vi.fn(),
    isGroupArchiving: (key: string) => archivingKeys.has(key),
  };
  const workspaceNode = {
    workspaceId: 'ws-1', workspaceRootPath: '/ws/a', workspaceName: 'a', workspaceKind: 'filesystem',
    canRemoveFromWorkspaces: false, stableKey: WORKSPACE_KEY, agentOrgDefinitions: [orgGroup()],
    agents: options.agents ?? [{ agentDefinitionId: 'agent-def-1', agentName: 'Codex', runs: [agentRun('run-1', { isActive: true })] }],
  };
  const wrapper = mount(WorkspaceHistoryWorkspaceSection, {
    props: {
      workspaceNode, workspaceTeams: [teamRun('team-1'), teamRun('team-2', true)], workspaceTeamHistoryGroups: [],
      state, actions,
      avatars: {
        showAgentAvatar: () => false, onAgentAvatarError: vi.fn(), getAgentInitials: () => 'A',
        showTeamAvatar: () => false, getTeamAvatarUrl: () => '', onTeamAvatarError: vi.fn(),
        getOrgAvatarUrl: () => '', showOrgAvatar: () => false, onOrgAvatarError: vi.fn(),
        showTeamMemberAvatar: () => false, getTeamMemberAvatarUrl: () => '', onTeamMemberAvatarError: vi.fn(),
        getTeamMemberDisplayName: () => '', getTeamMemberInitials: () => '',
      },
    },
    global: { mocks: { $t: (key: string) => key } },
  });
  return { wrapper, actions, groupActions, workspaceNode };
};

const ARCHIVE_ALL_LABEL = 'Archive all runs';
const agentButton = '[data-test="workspace-agent-group-archive-agent-def-1"]';
const teamButton = '[data-test="workspace-team-group-archive-team-def-1"]';
const orgButton = '[data-test="agent-org-group-archive-org-def-1"]';

describe('Workspace history group-header Archive all', () => {
  it('shows an Archive all button on agent, team and Org headers, even when their runs are running', () => {
    const { wrapper } = mountSection();

    for (const selector of [agentButton, teamButton, orgButton]) {
      const button = wrapper.get(selector);
      expect(button.element.tagName).toBe('BUTTON');
      expect(button.attributes('disabled')).toBeUndefined();
      expect(button.find('[data-icon="heroicons:archive-box-20-solid"]').exists()).toBe(true);
    }
    // Agent/team headers use $t (mocked to keys); the Org collection uses the real catalog.
    expect(wrapper.get(agentButton).attributes('aria-label')).toBe('workspace.history.groupArchive.archiveAll');
    expect(wrapper.get(teamButton).attributes('title')).toBe('workspace.history.groupArchive.archiveAll');
    expect(wrapper.get(orgButton).attributes('aria-label')).toBe(ARCHIVE_ALL_LABEL);
  });

  it('keeps header buttons unnested next to the toggle and before the agent "+" action', () => {
    const { wrapper } = mountSection();
    expect(wrapper.findAll('button button')).toHaveLength(0);
    const agentHeader = wrapper.get('[data-test="workspace-agent-row"]').element.parentElement!;
    const buttons = Array.from(agentHeader.querySelectorAll('button'));
    expect(buttons.map((button) => button.getAttribute('data-test') ?? button.getAttribute('title'))).toEqual([
      'workspace-agent-row',
      'workspace-agent-group-archive-agent-def-1',
      'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.new_run_with_this_agent',
    ]);
  });

  it('hides the agent button when the group holds only drafts or unsaved runs', () => {
    const { wrapper } = mountSection({
      agents: [{ agentDefinitionId: 'agent-def-1', agentName: 'Codex', runs: [agentRun('draft-1', { source: 'draft', isDraft: true })] }],
    });
    expect(wrapper.find(agentButton).exists()).toBe(false);
  });

  it('dispatches each header to its own group action without toggling the group', async () => {
    const { wrapper, groupActions: actions, workspaceNode } = mountSection();

    await wrapper.get(agentButton).trigger('click');
    await wrapper.get(teamButton).trigger('click');
    await wrapper.get(orgButton).trigger('click');

    expect(actions.onArchiveAgentGroup).toHaveBeenCalledExactlyOnceWith(workspaceNode, workspaceNode.agents[0]);
    expect(actions.onArchiveTeamGroup).toHaveBeenCalledExactlyOnceWith(
      WORKSPACE_KEY, expect.objectContaining({ key: 'team-def-1', runs: expect.any(Array) }));
    expect(actions.onArchiveTeamGroup.mock.calls[0]![1].runs.map((run: TeamTreeNode) => run.teamRunId))
      .toEqual(['team-1', 'team-2']);
    expect(actions.onArchiveAgentOrgGroup).toHaveBeenCalledExactlyOnceWith(WORKSPACE_KEY, workspaceNode.agentOrgDefinitions[0]);
  });

  it('disables only the header whose group is archiving', () => {
    const { wrapper } = mountSection({
      archivingKeys: [teamGroupArchiveKey(WORKSPACE_KEY, 'team-def-1'), agentOrgGroupArchiveKey(WORKSPACE_KEY, 'org-def-1')],
    });
    expect(wrapper.get(teamButton).attributes('disabled')).toBeDefined();
    expect(wrapper.get(orgButton).attributes('disabled')).toBeDefined();
    expect(wrapper.get(agentButton).attributes('disabled')).toBeUndefined();

    const agentPending = mountSection({ archivingKeys: [agentGroupArchiveKey('/ws/a', 'agent-def-1')] });
    expect(agentPending.wrapper.get(agentButton).attributes('disabled')).toBeDefined();
  });

  it('renders no group buttons when the host does not provide group actions', () => {
    const { wrapper } = mountSection({ withGroupActions: false });
    expect(wrapper.find(agentButton).exists()).toBe(false);
    expect(wrapper.find(teamButton).exists()).toBe(false);
    expect(wrapper.find(orgButton).exists()).toBe(false);
  });
});
