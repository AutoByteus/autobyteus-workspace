import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useWorkspaceHistoryMutations } from '../useWorkspaceHistoryMutations';

const tMock = vi.hoisted(() => vi.fn((key: string) => ({
  'workspace.agentOrg.history.deleteLabel': 'Delete Agent Org history permanently',
  'workspace.agentOrg.history.deleteConfirmation': 'Delete only this Agent Org run?',
  'workspace.agentOrg.history.archived': 'Agent Org history archived.',
  'workspace.agentOrg.history.archiveFailed': 'Failed to archive Agent Org history.',
  'workspace.agentOrg.history.deleted': 'Agent Org history deleted permanently.',
  'workspace.agentOrg.history.deleteFailed': 'Failed to delete Agent Org history.',
  'workspace.agentOrg.history.navigationCleanupFailed': 'History changed, but navigation cleanup failed.',
}[key] ?? key)));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: tMock }),
}));

const stoppedAgentOrg = (rootRunId = 'org-1') => ({ rootRunId, isActive: false });
const stoppedTeam = (teamRunId = 'team-1') => ({ teamRunId, isActive: false, deleteLifecycle: 'READY' });
const historicalAgent = (runId = 'run-1') => ({ runId, source: 'history', isActive: false });

const buildHarness = () => {
  const params = {
    terminateRun: vi.fn(async () => true),
    terminateTeamRun: vi.fn(async () => true),
    removeDraftRun: vi.fn(async () => true),
    deleteRun: vi.fn(async () => true),
    deleteTeamRun: vi.fn(async () => true),
    deleteAgentOrgRun: vi.fn(async () => true),
    archiveRun: vi.fn(async () => true),
    archiveTeamRun: vi.fn(async () => true),
    archiveAgentOrgRun: vi.fn(async () => true),
    onAgentOrgMutationSuccess: vi.fn(async () => undefined),
    addToast: vi.fn(),
    stopPendingTeamIds: ref<Record<string, boolean>>({}),
  };
  return { params, mutations: useWorkspaceHistoryMutations(params) };
};

describe('useWorkspaceHistoryMutations AgentOrg history policy', () => {
  it('routes the discriminated Agent, Team, and AgentOrg confirmation targets without cross-calling', async () => {
    const { params, mutations } = buildHarness();

    mutations.onDeleteRun(historicalAgent() as any);
    expect(mutations.deleteConfirmationTitle.value).toBe('');
    expect(mutations.deleteConfirmationConfirmText.value).toBe('Delete');
    await mutations.confirmDeleteRun();
    expect(params.deleteRun).toHaveBeenCalledExactlyOnceWith('run-1');
    expect(params.deleteTeamRun).not.toHaveBeenCalled();
    expect(params.deleteAgentOrgRun).not.toHaveBeenCalled();

    mutations.onDeleteTeam(stoppedTeam() as any);
    expect(mutations.deleteConfirmationTitle.value).toBe('');
    expect(mutations.deleteConfirmationConfirmText.value).toBe('Delete');
    await mutations.confirmDeleteRun();
    expect(params.deleteTeamRun).toHaveBeenCalledExactlyOnceWith('team-1');

    mutations.onDeleteAgentOrg(stoppedAgentOrg() as any);
    expect(mutations.showDeleteConfirmation.value).toBe(true);
    expect(mutations.deleteConfirmationTitle.value).toBe('Delete Agent Org history permanently');
    expect(mutations.deleteConfirmationConfirmText.value).toBe('Delete Agent Org history permanently');
    expect(mutations.deleteConfirmationMessage.value).toBe('Delete only this Agent Org run?');
    mutations.closeDeleteConfirmation();
    await mutations.confirmDeleteRun();
    expect(params.deleteAgentOrgRun).not.toHaveBeenCalled();

    mutations.onDeleteAgentOrg(stoppedAgentOrg() as any);
    await mutations.confirmDeleteRun();
    expect(params.deleteAgentOrgRun).toHaveBeenCalledExactlyOnceWith('org-1');
    expect(params.onAgentOrgMutationSuccess).toHaveBeenCalledExactlyOnceWith('org-1', 'delete');
    expect(params.addToast).toHaveBeenCalledWith('Agent Org history deleted permanently.', 'success');
  });

  it('excludes duplicate/conflicting AgentOrg actions and reports authoritative failure without cleanup', async () => {
    const { params, mutations } = buildHarness();
    let settleArchive!: (value: boolean) => void;
    params.archiveAgentOrgRun.mockReturnValueOnce(new Promise<boolean>((resolve) => { settleArchive = resolve; }));

    const firstArchive = mutations.onArchiveAgentOrg(stoppedAgentOrg() as any);
    const duplicateArchive = mutations.onArchiveAgentOrg(stoppedAgentOrg() as any);
    mutations.onDeleteAgentOrg(stoppedAgentOrg() as any);

    expect(params.archiveAgentOrgRun).toHaveBeenCalledExactlyOnceWith('org-1');
    expect(mutations.archivingAgentOrgIds.value['org-1']).toBe(true);
    expect(mutations.showDeleteConfirmation.value).toBe(false);
    settleArchive(false);
    await Promise.all([firstArchive, duplicateArchive]);

    expect(mutations.archivingAgentOrgIds.value['org-1']).toBeUndefined();
    expect(params.onAgentOrgMutationSuccess).not.toHaveBeenCalled();
    expect(params.addToast).toHaveBeenCalledWith('Failed to archive Agent Org history.', 'error');
  });
});
