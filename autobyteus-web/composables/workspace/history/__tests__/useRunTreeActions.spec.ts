import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useRunTreeActions } from '~/composables/workspace/history/useRunTreeActions';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import type { TeamMemberTreeRow } from '~/stores/runTreeStore';

const makeRun = (overrides: Partial<RunTreeRow> = {}): RunTreeRow => ({
  agentId: 'run-1',
  summary: 'summary',
  lastActivityAt: '2026-01-01T00:00:00.000Z',
  lastKnownStatus: 'IDLE',
  isActive: false,
  source: 'history',
  isDraft: false,
  ...overrides,
});

const makeTeamMember = (
  overrides: Partial<TeamMemberTreeRow> = {},
): TeamMemberTreeRow => ({
  teamId: 'team-1',
  memberRouteKey: 'coordinator',
  memberName: 'Coordinator',
  memberAgentId: 'ag-1',
  workspaceRootPath: '/ws/a',
  hostNodeId: null,
  summary: 'summary',
  lastActivityAt: '2026-01-01T00:00:00.000Z',
  lastKnownStatus: 'IDLE',
  isActive: false,
  deleteLifecycle: 'READY',
  ...overrides,
});

describe('useRunTreeActions', () => {
  const createSubject = () => {
    const runTreeStore = {
      fetchTree: vi.fn().mockResolvedValue(undefined),
      selectTreeRun: vi.fn().mockResolvedValue(undefined),
      deleteRun: vi.fn().mockResolvedValue(true),
      deleteTeamRun: vi.fn().mockResolvedValue(true),
      createWorkspace: vi.fn().mockResolvedValue('/ws/new'),
      createDraftRun: vi.fn().mockResolvedValue('temp-1'),
    };
    const workspaceStore = {
      fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
    };
    const agentRunStore = {
      terminateRun: vi.fn().mockResolvedValue(true),
    };
    const agentTeamRunStore = {
      terminateTeamRun: vi.fn().mockResolvedValue(undefined),
    };

    const addToast = vi.fn();
    const onAgentSelected = vi.fn();
    const onTeamSelected = vi.fn();
    const onAgentCreated = vi.fn();
    const onWorkspaceCreated = vi.fn();
    const pickFolderPath = vi.fn().mockResolvedValue(null);

    const actions = useRunTreeActions({
      isEmbeddedWindow: ref(false),
      addToast,
      onAgentSelected,
      onTeamSelected,
      onAgentCreated,
      onWorkspaceCreated,
      deps: {
        runTreeStore,
        workspaceStore,
        agentRunStore,
        agentTeamRunStore,
        pickFolderPath,
        hasNativePicker: () => false,
      },
    });

    return {
      actions,
      runTreeStore,
      workspaceStore,
      agentRunStore,
      agentTeamRunStore,
      addToast,
      onAgentSelected,
      onTeamSelected,
      onAgentCreated,
      onWorkspaceCreated,
      pickFolderPath,
    };
  };

  it('initializes panel data by loading workspaces and tree', async () => {
    const subject = createSubject();
    await subject.actions.initializePanelData();

    expect(subject.workspaceStore.fetchAllWorkspaces).toHaveBeenCalledTimes(1);
    expect(subject.runTreeStore.fetchTree).toHaveBeenCalledTimes(1);
  });

  it('selects run and emits agent selection callback', async () => {
    const subject = createSubject();
    const run = makeRun();

    await subject.actions.selectRun(run);

    expect(subject.runTreeStore.selectTreeRun).toHaveBeenCalledWith(run);
    expect(subject.onAgentSelected).toHaveBeenCalledWith('run-1');
  });

  it('selects team member and emits team selection callback', async () => {
    const subject = createSubject();
    const member = makeTeamMember();

    await subject.actions.selectTeamMember(member);

    expect(subject.runTreeStore.selectTreeRun).toHaveBeenCalledWith(member);
    expect(subject.onTeamSelected).toHaveBeenCalledWith('team-1');
  });

  it('opens delete confirmation only for inactive history runs', () => {
    const subject = createSubject();

    subject.actions.requestDeleteRun(makeRun({ source: 'draft' }));
    expect(subject.actions.showDeleteConfirmation.value).toBe(false);

    subject.actions.requestDeleteRun(makeRun({ source: 'history', isActive: true }));
    expect(subject.actions.showDeleteConfirmation.value).toBe(false);

    subject.actions.requestDeleteRun(makeRun({ source: 'history', isActive: false }));
    expect(subject.actions.showDeleteConfirmation.value).toBe(true);
  });

  it('confirms run delete and dispatches success toast', async () => {
    const subject = createSubject();
    subject.actions.requestDeleteRun(makeRun());

    await subject.actions.confirmDelete();

    expect(subject.runTreeStore.deleteRun).toHaveBeenCalledWith('run-1');
    expect(subject.addToast).toHaveBeenCalledWith('Run deleted permanently.', 'success');
  });

  it('starts inline workspace creation flow for non-embedded mode', async () => {
    const subject = createSubject();
    await subject.actions.startWorkspaceCreationFlow();
    expect(subject.actions.showCreateWorkspaceInline.value).toBe(true);
  });

  it('creates workspace from confirmed inline input and expands callback workspace', async () => {
    const subject = createSubject();
    subject.actions.showCreateWorkspaceInline.value = true;
    subject.actions.workspacePathDraft.value = '/ws/new';

    await subject.actions.confirmCreateWorkspace();

    expect(subject.runTreeStore.createWorkspace).toHaveBeenCalledWith('/ws/new');
    expect(subject.workspaceStore.fetchAllWorkspaces).toHaveBeenCalled();
    expect(subject.onWorkspaceCreated).toHaveBeenCalledWith('/ws/new');
    expect(subject.actions.showCreateWorkspaceInline.value).toBe(false);
  });
});
