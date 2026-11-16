import { describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { useRunListDisclosure, type RunListDefaultExpansion, type SelectedAgentOrg } from '~/composables/useRunListDisclosure';
import type { RunListEntry } from '~/utils/runListProjection';

const agentEntry = (runId: string) => ({ kind: 'agent', runId } as unknown as RunListEntry);
const teamEntry = (runId: string, focusedAgentRunId: string, rowAgentRunIds: string[]) => ({
  kind: 'team', runId, team: { teamRunId: runId, focusedAgentRunId, executionRows: rowAgentRunIds.map((agentRunId) => ({ agentRunId })) },
} as unknown as RunListEntry);
const orgEntry = (runId: string) => ({
  kind: 'org', runId, orgRun: { executionTree: { rootOrg: { members: [{ address: '/software', teamRunId: 'mounted' }, { address: '/director', agentRunId: 'x' }] } } },
} as unknown as RunListEntry);

const setup = (entries: RunListEntry[], defaultExpansion?: RunListDefaultExpansion) => {
  const history = reactive({ selectedRunId: null as string | null, selectedTeamRunId: null as string | null, navigationTopologyRevision: 0,
    getTeamMemberNavigationAncestorRowKeys: vi.fn((_teamRunId: string, agentRunId: string) => agentRunId === 'member-deep' ? ['team:sub'] : []) });
  const runList = reactive({ entries, showRun: vi.fn() });
  const selection = reactive({ selectedType: null as string | null, selectedRunId: null as string | null });
  const org = reactive({ value: null as SelectedAgentOrg | null });
  const children = reactive<Record<string, boolean>>({});
  let disclosure!: ReturnType<typeof useRunListDisclosure>;
  mount(defineComponent({ setup() {
    disclosure = useRunListDisclosure({ runHistoryStore: history, runListStore: runList, selectionStore: selection,
      selectedAgentOrg: computed(() => org.value), hasSelectedChild: (runId) => Boolean(children[runId]), defaultExpansion });
    return () => h('div');
  } }));
  return { disclosure, history, runList, selection, org, children };
};

describe('useRunListDisclosure (DS-004: by run identity, no folder)', () => {
  it('shows a run\'s delegated work until it is folded, per run', () => {
    const { disclosure } = setup([]);
    expect(disclosure.isRunExpanded('run-1')).toBe(true);
    disclosure.toggleRun('run-1');
    expect(disclosure.isRunExpanded('run-1')).toBe(false);
    expect(disclosure.isRunExpanded('run-2')).toBe(true);
  });

  it('keys Team member rows by Team run and row, and opens a member\'s ancestors', () => {
    const { disclosure } = setup([]);
    disclosure.toggleTeamMember('team-1', 'team:sub');
    expect(disclosure.isRowExpanded('team-1', 'team:sub')).toBe(true);
    expect(disclosure.isRowExpanded('team-2', 'team:sub')).toBe(false);
    expect(disclosure.expandTeamMemberAncestors('team-2', 'member-deep')).toBe(true);
    expect(disclosure.isRowExpanded('team-2', 'team:sub')).toBe(true);
  });

  it('reveals an open Agent run beyond the newest five through the fold, and unfolds it only for an open copy', async () => {
    const { disclosure, selection, runList, children } = setup([agentEntry('run-old')]);
    disclosure.toggleRun('run-old');
    selection.selectedType = 'agent'; selection.selectedRunId = 'run-old';
    await nextTick();
    expect(runList.showRun).toHaveBeenCalledWith('run-old');
    expect(disclosure.isRunExpanded('run-old')).toBe(false);
    selection.selectedRunId = null; await nextTick();
    children['run-old'] = true;
    selection.selectedRunId = 'run-old'; await nextTick();
    expect(disclosure.isRunExpanded('run-old')).toBe(true);
  });

  it('opens an open Team run and its focused member\'s ancestors, waiting for the member\'s row', async () => {
    const entries = reactive([teamEntry('team-1', 'member-deep', [])]);
    const { disclosure, selection, history, runList } = setup(entries as RunListEntry[]);
    selection.selectedType = 'team'; selection.selectedRunId = 'team-1';
    await nextTick();
    expect(disclosure.isTeamExpanded('team-1')).toBe(true);
    expect(disclosure.isRowExpanded('team-1', 'team:sub')).toBe(false);
    runList.entries = [teamEntry('team-1', 'member-deep', ['member-deep'])];
    history.navigationTopologyRevision++;
    await nextTick();
    expect(disclosure.isRowExpanded('team-1', 'team:sub')).toBe(true);
  });

  it('CR-461-108: a run the Team delegated, opened in it, is revealed: the team rows above it unfold once its tree lists it', async () => {
    const { useRunTreeStore } = await import('~/stores/runTreeStore');
    const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore');
    const entries = reactive([teamEntry('team-1', 'lead', ['lead'])]);
    const { disclosure, selection, history } = setup(entries as RunListEntry[]);
    history.getTeamMemberNavigationAncestorRowKeys.mockImplementation((_teamRunId: string, agentRunId: string) => agentRunId === 'sub-lead' ? ['team:sub'] : []);
    selection.selectedType = 'team'; selection.selectedRunId = 'team-1';
    await nextTick();
    expect(disclosure.isRowExpanded('team-1', 'team:sub')).toBe(false);
    // The Task card or a row selects the delegated Team at its coordinator; the Team's tree lists it.
    useRunTreeStore().streamSnapshot({ kind: 'agent_team', runId: 'team-1' }, [
      { key: 'team:team-1', parentKey: null, depth: 0, kind: 'team', name: 't', address: '/t', openTarget: { runKind: 'agent_team', runId: 'team-1', agentRunId: 'lead' }, statusIds: ['team-1'] },
      { key: 'team:sub', parentKey: 'team:team-1', depth: 1, kind: 'team', name: 'sub', address: '/sub', openTarget: { runKind: 'agent_team', runId: 'sub', agentRunId: 'sub-lead' }, statusIds: ['sub'] },
    ]);
    useAgentTeamContextsStore().delegatedRows = { 'team-1': { key: 'team:sub', target: { runKind: 'agent_team', runId: 'sub', agentRunId: 'sub-lead' }, address: '/sub' } };
    await nextTick();
    expect(disclosure.isRowExpanded('team-1', 'team:sub')).toBe(true);
  });

  it('opens an open Org run and the configured Team that holds the focused member', async () => {
    const { disclosure, org } = setup([orgEntry('org-1')]);
    org.value = { rootRunId: 'org-1', focusAddress: '/software/implementation', selection: null };
    await nextTick();
    expect(disclosure.isAgentOrgRunExpanded('org-1')).toBe(true);
    expect(disclosure.isAgentOrgTeamExpanded('org-1', '/software')).toBe(true);
    expect(disclosure.isAgentOrgRunSelected('org-1')).toBe(true);
  });

  it('CR-461-108: a run the Org delegated, open in it, selects its agent\'s row, not the Org\'s; the rows above it and its Team row unfold', async () => {
    const { useRunTreeStore } = await import('~/stores/runTreeStore');
    const target = (runKind: 'agent_org' | 'agent_team', runId: string, agentRunId: string) => ({ runKind, runId, agentRunId });
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: 'org-1' }, [
      { key: 'org_agent:manager', parentKey: null, depth: 0, kind: 'org_agent', name: 'm', address: '/manager', openTarget: target('agent_org', 'org-1', 'manager'), statusIds: ['manager'] },
      { key: 'team:squad', parentKey: 'org_agent:manager', depth: 1, kind: 'team', name: 's', address: '/squad', openTarget: target('agent_team', 'squad', 'squad-lead'), statusIds: ['squad'] },
      { key: 'team_member:squad:squad-lead', parentKey: 'team:squad', depth: 2, kind: 'team_member', name: 'l', address: '/lead', openTarget: target('agent_team', 'squad', 'squad-lead'), statusIds: ['squad-lead'] },
    ]);
    const { disclosure, org } = setup([orgEntry('org-1')]);
    disclosure.toggleAgentOrgTaskTeam('org-1', 'org_agent:manager');
    disclosure.toggleAgentOrgTaskTeam('org-1', 'team:squad');
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'team:squad')).toBe(false);
    // The delegated Team, opened from its row or its Task card, opens at its coordinator.
    org.value = { rootRunId: 'org-1', focusAddress: null, selection: null, delegated: { rowKey: 'team:squad', agentRunId: 'squad-lead' } };
    await nextTick();
    expect(disclosure.isAgentOrgRunSelected('org-1')).toBe(false);
    expect(disclosure.isAgentOrgMemberSelected('org-1', '/lead', 'squad-lead')).toBe(true);
    expect(disclosure.isAgentOrgMemberSelected('org-1', '/manager', 'manager')).toBe(false);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'org_agent:manager')).toBe(true);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'team:squad')).toBe(true);
  });

  it('starts a delegated Org Team expanded and folds it by execution', () => {
    const { disclosure } = setup([]);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'task-team')).toBe(true);
    disclosure.toggleAgentOrgTaskTeam('org-1', 'task-team');
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'task-team')).toBe(false);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'other')).toBe(true);
  });

  // autobyteus-277 AR-004: the default expansion is a construction option; the desktop default is unchanged.
  it('desktop default: Org runs start folded, their delegated Teams unfolded; each toggles once', () => {
    const { disclosure } = setup([]);
    expect(disclosure.isAgentOrgRunExpanded('org-1')).toBe(false);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'task-team')).toBe(true);
    disclosure.toggleAgentOrgRun('org-1'); disclosure.toggleAgentOrgTaskTeam('org-1', 'task-team');
    expect(disclosure.isAgentOrgRunExpanded('org-1')).toBe(true);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'task-team')).toBe(false);
  });

  it('the phone\'s default: Org runs start unfolded, their delegated Teams folded; each toggles once', () => {
    const { disclosure } = setup([], { orgRuns: true, orgTaskTeams: false });
    expect(disclosure.isAgentOrgRunExpanded('org-1')).toBe(true);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'task-team')).toBe(false);
    disclosure.toggleAgentOrgRun('org-1'); disclosure.toggleAgentOrgTaskTeam('org-1', 'task-team');
    expect(disclosure.isAgentOrgRunExpanded('org-1')).toBe(false);
    expect(disclosure.isAgentOrgTaskTeamExpanded('org-1', 'task-team')).toBe(true);
  });
});
