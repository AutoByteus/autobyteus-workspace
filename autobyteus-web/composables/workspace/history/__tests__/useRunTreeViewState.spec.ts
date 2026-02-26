import { describe, expect, it } from 'vitest';
import { useRunTreeViewState } from '~/composables/workspace/history/useRunTreeViewState';

describe('useRunTreeViewState', () => {
  it('toggles workspace, agent, and team expansion states', () => {
    const viewState = useRunTreeViewState();

    expect(viewState.isWorkspaceExpanded('/ws/a')).toBe(true);
    viewState.toggleWorkspace('/ws/a');
    expect(viewState.isWorkspaceExpanded('/ws/a')).toBe(false);
    viewState.expandWorkspace('/ws/a');
    expect(viewState.isWorkspaceExpanded('/ws/a')).toBe(true);

    expect(viewState.isAgentExpanded('/ws/a', 'agent-1')).toBe(true);
    viewState.toggleAgent('/ws/a', 'agent-1');
    expect(viewState.isAgentExpanded('/ws/a', 'agent-1')).toBe(false);

    expect(viewState.isTeamExpanded('team-1')).toBe(true);
    viewState.toggleTeam('team-1');
    expect(viewState.isTeamExpanded('team-1')).toBe(false);

    expect(viewState.teamsSectionExpanded.value).toBe(true);
    viewState.toggleTeamsSection();
    expect(viewState.teamsSectionExpanded.value).toBe(false);
  });

  it('tracks broken avatar state by avatar key', () => {
    const viewState = useRunTreeViewState();
    const workspaceRootPath = '/ws/a';
    const agentDefinitionId = 'agent-1';
    const avatarUrl = 'https://example.com/avatar.png';

    expect(viewState.showAgentAvatar(workspaceRootPath, agentDefinitionId, avatarUrl)).toBe(true);
    viewState.markAvatarBroken(workspaceRootPath, agentDefinitionId, avatarUrl);
    expect(viewState.showAgentAvatar(workspaceRootPath, agentDefinitionId, avatarUrl)).toBe(false);

    viewState.resetBrokenAvatars();
    expect(viewState.showAgentAvatar(workspaceRootPath, agentDefinitionId, avatarUrl)).toBe(true);
  });
});
