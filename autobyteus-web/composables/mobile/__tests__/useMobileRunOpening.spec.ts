import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

const shared = vi.hoisted(() => ({
  selectionParams: null as null | Record<string, any>,
  subjectSetup: null as null | Record<string, unknown>,
  actions: { onOpenAgentRun: vi.fn(), onSelectRun: vi.fn(), onOpenTeamRun: vi.fn(), onSelectTeamMember: vi.fn() },
  execute: vi.fn(),
  addToast: vi.fn(),
}));
vi.mock('~/composables/useWorkspaceHistorySelectionActions', () => ({
  useWorkspaceHistorySelectionActions: (params: Record<string, any>) => { shared.selectionParams = params; return shared.actions; },
}));
vi.mock('~/composables/useWorkspaceHistorySubjectActions', async (original) => ({
  ...await original<typeof import('~/composables/useWorkspaceHistorySubjectActions')>(),
  useWorkspaceHistorySubjectActions: (setup: Record<string, unknown>) => { shared.subjectSetup = setup; return { execute: shared.execute }; },
}));
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: shared.addToast }) }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));

import { useMobileRunOpening } from '../useMobileRunOpening';
import { useMobileRunOpeningStore } from '~/stores/mobileRunOpeningStore';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import type { MobileRunTreeRow } from '~/utils/mobile/mobileRunTreeProjection';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

const disclosure = { setTeamExpanded: vi.fn(), toggleTeam: vi.fn(), expandTeamMemberAncestors: vi.fn(() => true) };
const run = { runId: 'host' } as never;
const row = (open: MobileRunTreeRow['open'], key = 'agent:host'): MobileRunTreeRow => ({
  key, depth: 0, avatar: 'agent', name: 'n', title: '', status: 'idle', remote: null, hasChildren: false, expanded: false, fold: null, open, lastActivityAt: null,
});
const orgRun = { rootRunId: 'org-1', isActive: true, executionTree: { rootOrg: { orgDefinitionId: 'org-def', members: [{ address: '/software_team', teamRunId: 't' }, { address: '/director', agentRunId: 'd' }] } } } as never;
const ORG_KEYS = { rootSubjectKind: 'agent_org', definitionId: 'org-def', orgRunId: 'org-1', mode: 'active' };

let pinia: Pinia;
const setup = async () => {
  const router = await createMobileTestRouter();
  const { result } = withSetup(router, () => useMobileRunOpening(disclosure), [pinia]);
  return { router, opening: result, store: useMobileRunOpeningStore() };
};

// autobyteus-277 DS-003, AR-001: begin, push the run screen, the shared action (phone shell), then commit or fail.
describe('useMobileRunOpening', () => {
  beforeEach(() => {
    pinia = createPinia(); setActivePinia(pinia); vi.clearAllMocks();
    shared.selectionParams = null; shared.subjectSetup = null;
  });

  it('builds the shared actions in the phone shell', async () => {
    await setup();
    expect(shared.selectionParams).toMatchObject({ shell: 'mobile' });
    expect(shared.subjectSetup).toEqual({ shell: 'mobile' });
  });

  it('marks the open pending and pushes the run screen before the shared action runs; its notification commits', async () => {
    const { router, opening, store } = await setup();
    let seenDuringAction: unknown = null;
    shared.actions.onOpenAgentRun.mockImplementation(async () => {
      seenDuringAction = { pending: store.pending?.key, screen: router.currentRoute.value.query.screen };
      shared.selectionParams!.emitRunSelected({ type: 'agent', runId: 'host' });
    });
    await opening.open(row({ kind: 'agentRun', run }));
    expect(seenDuringAction).toEqual({ pending: 'agent:host', screen: 'run' });
    expect(shared.actions.onOpenAgentRun).toHaveBeenCalledWith(run);
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
  });

  it.each([
    ['returns without committing (superseded, rejected)', async () => undefined],
    ['throws', async () => { throw new Error('unavailable'); }],
  ])('an action that %s fails the open', async (_name, impl) => {
    const { opening, store } = await setup();
    shared.actions.onOpenAgentRun.mockImplementation(impl);
    await opening.open(row({ kind: 'agentRun', run }));
    expect(store.pending).toBeNull();
    expect(store.failure).toEqual({ key: 'agent:host' });
  });

  it('a Team run, a member and a task row each open through their shared action', async () => {
    const { opening } = await setup();
    const collaboration = useAgentRunCollaborationStore();
    const selectTaskRow = vi.spyOn(collaboration, 'selectTaskRow').mockReturnValue(true);
    const team = { teamRunId: 't' } as never;
    const target = { teamRunId: 't', memberAddress: '/m', agentRunId: 'm' };
    const taskRow = { agentRunId: 'child' } as never;
    await opening.open(row({ kind: 'team', team }, 'team:t'));
    await opening.open(row({ kind: 'teamMember', target }, 'team:t/m'));
    await opening.open(row({ kind: 'taskRow', hostRun: run, row: taskRow }, 'agent:host/child'));
    expect(shared.actions.onOpenTeamRun).toHaveBeenCalledWith(team);
    expect(shared.actions.onSelectTeamMember).toHaveBeenCalledWith(target);
    expect(selectTaskRow).toHaveBeenCalledWith('host', taskRow);
    expect(shared.actions.onSelectRun).toHaveBeenCalledWith(run);
  });

  it('a task row whose run view is not loaded selects nothing and fails', async () => {
    const { opening, store } = await setup();
    vi.spyOn(useAgentRunCollaborationStore(), 'selectTaskRow').mockReturnValue(false);
    await opening.open(row({ kind: 'taskRow', hostRun: run, row: {} as never }, 'agent:host/x'));
    expect(shared.actions.onSelectRun).not.toHaveBeenCalled();
    expect(store.failure).toEqual({ key: 'agent:host/x' });
  });

  it('an Org member opens with its keys on the list entry and the run entry; the subject action commits', async () => {
    const { router, opening, store } = await setup();
    shared.execute.mockResolvedValue({ disposition: 'committed' });
    await opening.open(row({ kind: 'orgMember', orgRun, address: '/lead', agentRunId: 'lead' }, 'org:org-1/agent:lead'));
    expect(shared.execute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-1', action: 'select', memberAddress: '/lead' });
    expect(router.currentRoute.value.query).toEqual({ ...ORG_KEYS, memberAddress: '/lead', screen: 'run' });
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
    router.back(); await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ ...ORG_KEYS, memberAddress: '/lead' });
  });

  // Review residual 2: the list entry is rewritten before the action; after a failed Org open it keeps that Org's keys.
  it('a failed Org open fails the pending open and leaves the list entry rewritten with its keys', async () => {
    const { router, opening, store } = await setup();
    shared.execute.mockRejectedValue(new Error('AgentOrg inspection is unavailable.'));
    await opening.open(row({ kind: 'orgRun', orgRun }, 'org:org-1'));
    expect(store.failure).toEqual({ key: 'org:org-1' });
    router.back(); await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ ...ORG_KEYS, memberAddress: '/software_team' });
  });

  // CRR-003 F-01, DEC-012: an Org run row opens its first configured member (a Team opens its coordinator there).
  it('an Org run row selects the Org\'s first configured member, with that address on both entries', async () => {
    const { router, opening, store } = await setup();
    shared.execute.mockResolvedValue({ disposition: 'committed' });
    await opening.open(row({ kind: 'orgRun', orgRun }, 'org:org-1'));
    expect(shared.execute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-1', action: 'select', memberAddress: '/software_team' });
    expect(router.currentRoute.value.query).toEqual({ ...ORG_KEYS, memberAddress: '/software_team', screen: 'run' });
    expect(store.pending).toBeNull();
  });

  it('Team stream recovery shows the desktop\'s toast, and the open fails', async () => {
    const { opening, store } = await setup();
    shared.actions.onOpenTeamRun.mockImplementation(async () => shared.selectionParams!.presentTeamStreamRecoveryFeedback('wait'));
    await opening.open(row({ kind: 'team', team: {} as never }, 'team:t'));
    expect(shared.addToast).toHaveBeenCalledWith('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_wait', 'info');
    expect(store.failure).toEqual({ key: 'team:t' });
  });

  it('an earlier open\'s late outcome does not end the newer open (superseded)', async () => {
    const { opening, store } = await setup();
    let finishFirst!: () => void;
    shared.actions.onOpenAgentRun.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const first = opening.open(row({ kind: 'agentRun', run }, 'agent:a'));
    await flushPromises();
    shared.actions.onOpenAgentRun.mockImplementationOnce(() => new Promise<void>(() => undefined));
    void opening.open(row({ kind: 'agentRun', run }, 'agent:b'));
    await flushPromises();
    finishFirst(); await first;
    expect(store.pending).toEqual({ key: 'agent:b', status: 'opening' });
    expect(store.failure).toBeNull();
  });
});
