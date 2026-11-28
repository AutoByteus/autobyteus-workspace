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
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore';
import type { MobileRunTreeRow } from '~/utils/mobile/mobileRunListRows';
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import { agentRow } from '~/test-support/runTreeFixtures';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

const disclosure = { setTeamExpanded: vi.fn(), toggleTeam: vi.fn(), expandTeamMemberAncestors: vi.fn(() => true) };
const run = { runId: 'host' } as never;
const row = (open: MobileRunTreeRow['open'], key = 'agent:host'): MobileRunTreeRow => ({
  key, depth: 0, avatar: 'agent', avatarUrl: null, name: 'n', title: '', status: 'idle', backgroundTasksRunning: 0, remote: null, hasChildren: false, expanded: false, fold: null, open, lastActivityAt: null,
});
const orgRun = { rootRunId: 'org-1', isActive: true, executionTree: { rootOrg: { orgDefinitionId: 'org-def', members: [{ address: '/software_team', teamRunId: 't' }, { address: '/director', agentRunId: 'd' }] } } } as never;
const ORG_KEYS = { rootSubjectKind: 'agent_org', definitionId: 'org-def', orgRunId: 'org-1', mode: 'active' };
// The listed runs, and a row of each one's tree as the server builds it (SR-084).
const agentEntry = { kind: 'agent', key: 'agent:host', runId: 'host', run } as never;
const teamEntry = { kind: 'team', key: 'team:t', runId: 't', team: { teamRunId: 't' } } as never;
const orgEntry = { kind: 'org', key: 'org:org-1', runId: 'org-1', orgRun } as never;
const treeRow = (entry: unknown, tree: RunTreeRowDto) => ({ kind: 'treeRow', entry, row: tree }) as MobileRunTreeRow['open'];
const teamMember = (agentRunId: string, address: string): RunTreeRowDto => ({ key: `team_member:t:${agentRunId}`, parentKey: 'team:t', depth: 1,
  kind: 'team_member', name: agentRunId, address, openTarget: { runKind: 'agent_team', runId: 't', agentRunId }, statusIds: [agentRunId] });
const orgAgent = (agentRunId: string, address: string): RunTreeRowDto => ({ key: `org_agent:org-1:${agentRunId}`, parentKey: null, depth: 0,
  kind: 'org_agent', name: agentRunId, address, openTarget: { runKind: 'agent_org', runId: 'org-1', agentRunId }, statusIds: [agentRunId] });

let pinia: Pinia;
const setup = async () => {
  const router = await createMobileTestRouter();
  const { result } = withSetup(router, () => useMobileRunOpening(disclosure), [pinia]);
  // The run's view read (its GraphQL read) is not this composable's: stubbed, and checked where it matters.
  const inspect = vi.spyOn(useAgentRunCollaborationStore(), 'inspect').mockResolvedValue(undefined);
  return { router, opening: result, store: useMobileRunOpeningStore(), inspect };
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

  it('a Team run, a member and an agent run\'s tree row each open through their shared action; a tree row through openRunTarget (SR-084)', async () => {
    const { opening } = await setup();
    const collaboration = useAgentRunCollaborationStore();
    const selectTreeRow = vi.spyOn(collaboration, 'selectTreeRow').mockReturnValue(true);
    const team = { teamRunId: 't' } as never;
    const child = agentRow('child', 'agent:host', 1);
    await opening.open(row({ kind: 'team', team }, 'team:t'));
    await opening.open(row(treeRow(teamEntry, teamMember('m', '/m')), 'team:t/team_member:t:m'));
    await opening.open(row(treeRow(agentEntry, child), 'agent:host/agent:child'));
    expect(shared.actions.onOpenTeamRun).toHaveBeenCalledWith(team);
    expect(shared.actions.onSelectTeamMember).toHaveBeenCalledWith({ teamRunId: 't', memberAddress: '/m', agentRunId: 'm' });
    expect(selectTreeRow).toHaveBeenCalledWith('host', child);
    expect(shared.actions.onSelectRun).toHaveBeenCalledWith(run);
  });

  // CR-461-057, CR-461-062: one owner for every view's delegated rows. Each is shown as its own run, once that run is open.
  it.each([
    ['an agent run\'s tree', 'agent:host/agent:worker', () => {
      vi.spyOn(useAgentRunCollaborationStore(), 'selectTreeRow').mockReturnValue(true);
      shared.actions.onSelectRun.mockImplementation(async () => { shared.selectionParams!.emitRunSelected({ type: 'agent', runId: 'host' }); });
      return row(treeRow(agentEntry, agentRow('worker', 'agent:host', 1)), 'agent:host/agent:worker');
    }],
    ['a stopped Team\'s tree (its delegated worker)', 'team:t/agent:worker', () => {
      shared.actions.onSelectTeamMember.mockImplementation(async () => { shared.selectionParams!.emitRunSelected({ type: 'team', runId: 't' }); });
      return row(treeRow(teamEntry, agentRow('worker', 'team_member:t:lead', 2)), 'team:t/agent:worker');
    }],
  ] as const)('a delegated row of %s commits once its own run is open; it fails when that open fails', async (_view, key, rowOf) => {
    const { opening, store } = await setup();
    const tapped = rowOf();
    const runs = useDelegatedRunsStore();
    let settle!: () => void;
    vi.spyOn(runs, 'whenOpen').mockReturnValue(new Promise<void>((resolve) => { settle = resolve; }));
    const binding = vi.spyOn(runs, 'bindingOf').mockReturnValue(null);
    const done = opening.open(tapped);
    await flushPromises();
    expect(runs.whenOpen).toHaveBeenCalledWith({ kind: 'agent', agentRunId: 'worker' });
    expect(store.pending?.key).toBe(key);
    binding.mockReturnValue({ context: {} } as never);
    settle(); await done;
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
    // Its open fails: so does this one, and the run screen goes back.
    vi.spyOn(runs, 'whenOpen').mockResolvedValue(undefined);
    vi.spyOn(runs, 'errorFor').mockReturnValue('The run could not be read.');
    await opening.open(rowOf());
    expect(store.failure).toEqual({ key });
  });

  // MSP-56: the phone lists a run it never opened (a stopped delegator); its row reads the run's view first, as the
  // desktop's rows do when they show, then selects in it. A run whose view is read already is not read again.
  it('a tree row of a run whose view the phone has not read reads it first, then selects in it', async () => {
    const { opening, inspect } = await setup();
    const collaboration = useAgentRunCollaborationStore();
    const order: string[] = [];
    inspect.mockImplementation(async () => { order.push('inspect'); });
    vi.spyOn(collaboration, 'selectTreeRow').mockImplementation(() => { order.push('select'); return true; });
    const contextFor = vi.spyOn(collaboration, 'contextFor').mockReturnValue(null);
    await opening.open(row(treeRow(agentEntry, agentRow('worker', 'agent:host', 1)), 'agent:host/agent:worker'));
    expect(inspect).toHaveBeenCalledWith('host');
    expect(order).toEqual(['inspect', 'select']);
    contextFor.mockReturnValue({} as never);
    inspect.mockClear();
    await opening.open(row(treeRow(agentEntry, agentRow('worker', 'agent:host', 1)), 'agent:host/agent:worker'));
    expect(inspect).not.toHaveBeenCalled();
  });

  it('a tree row whose run view cannot be read selects nothing and fails', async () => {
    const { opening, store } = await setup();
    vi.spyOn(useAgentRunCollaborationStore(), 'selectTreeRow').mockReturnValue(false);
    await opening.open(row(treeRow(agentEntry, agentRow('x', 'agent:host', 1)), 'agent:host/x'));
    expect(shared.actions.onSelectRun).not.toHaveBeenCalled();
    expect(store.failure).toEqual({ key: 'agent:host/x' });
  });

  it('an Org member opens with its keys on the list entry and the run entry; the subject action commits', async () => {
    const { router, opening, store } = await setup();
    shared.execute.mockResolvedValue({ disposition: 'committed' });
    await opening.open(row(treeRow(orgEntry, orgAgent('lead', '/lead')), 'org:org-1/agent:lead'));
    expect(shared.execute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-1', action: 'select', memberAddress: '/lead' });
    expect(router.currentRoute.value.query).toEqual({ ...ORG_KEYS, memberAddress: '/lead', screen: 'run' });
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
    router.back(); await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ ...ORG_KEYS, memberAddress: '/lead' });
  });

  // autobyteus-461 CR-461-053 (F-34): a run the Org delegated is shown as its own run (rule 2), once that run is open.
  const delegatedOrgRow = () => row(treeRow(orgEntry, { ...agentRow('worker', 'org_agent:org-1:d', 1), address: '/worker' }), 'org:org-1/task-agent:worker');
  const withDelegatedWorker = () => {
    const runs = useDelegatedRunsStore();
    let settle!: () => void;
    vi.spyOn(runs, 'whenOpen').mockReturnValue(new Promise<void>((resolve) => { settle = resolve; }));
    return { runs, settle: () => settle() };
  };

  it('an Org\'s delegated row commits once its own run is open, with its binding (CR-461-053)', async () => {
    const { opening, store } = await setup();
    shared.execute.mockResolvedValue({ disposition: 'committed' });
    const { runs, settle } = withDelegatedWorker();
    const binding = vi.spyOn(runs, 'bindingOf').mockReturnValue(null);
    const done = opening.open(delegatedOrgRow());
    await flushPromises();
    expect(shared.execute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-1', action: 'inspect', agentRunId: 'worker', memberAddress: '/worker' });
    expect(runs.whenOpen).toHaveBeenCalledWith({ kind: 'agent', agentRunId: 'worker' });
    expect(store.pending?.key).toBe('org:org-1/task-agent:worker');
    binding.mockReturnValue({ context: {} } as never);
    settle(); await done;
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
  });

  it('an Org\'s delegated row whose own run cannot be opened fails the open (CR-461-053)', async () => {
    const { opening, store } = await setup();
    shared.execute.mockResolvedValue({ disposition: 'committed' });
    const { runs, settle } = withDelegatedWorker();
    vi.spyOn(runs, 'errorFor').mockReturnValue('The run could not be read.');
    const done = opening.open(delegatedOrgRow());
    settle(); await done;
    expect(store.failure).toEqual({ key: 'org:org-1/task-agent:worker' });
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
    expect(shared.addToast).toHaveBeenCalledWith('workspace.components.workspace.history.RunSectionPanel.stream_recovery_wait', 'info');
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

  // autobyteus-435 REQ-005, DS-006: the route names an agent run's or a Team subject's row, so a reload can reopen it.
  it('a tap on an agent, Team or delegated row writes its row on the list entry and the run screen', async () => {
    const { router, opening } = await setup();
    await opening.open(row({ kind: 'agentRun', run }, 'agent:host/agent:cua-run'));
    expect(router.currentRoute.value.query).toEqual({ row: 'agent:host/agent:cua-run', screen: 'run' });
    await opening.open(row({ kind: 'team', team: { teamRunId: 't-1' } as never }, 'team:t-1'));
    expect(router.currentRoute.value.query).toEqual({ row: 'team:t-1', screen: 'run' });
  });

  it('reopen (the restore) runs the shared action without navigating, and settles the pending open the restore began', async () => {
    const { router, opening, store } = await setup();
    await router.replace({ path: '/mobile', query: { row: 'agent:host', screen: 'desktop' } });
    store.begin('agent:host');
    shared.actions.onOpenAgentRun.mockImplementation(async () => { shared.selectionParams!.emitRunSelected({ type: 'agent', runId: 'host' }); });
    await opening.reopen({ ...row({ kind: 'agentRun', run }), open: { kind: 'agentRun', run } });
    expect(shared.actions.onOpenAgentRun).toHaveBeenCalledWith(run);
    expect(router.currentRoute.value.query).toEqual({ row: 'agent:host', screen: 'desktop' });
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();

    store.begin('agent:host');
    shared.actions.onOpenAgentRun.mockImplementation(async () => undefined);
    await opening.reopen({ ...row({ kind: 'agentRun', run }), open: { kind: 'agentRun', run } });
    expect(store.failure).toEqual({ key: 'agent:host' });
  });
});
