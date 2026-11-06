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

  it('opens an open Org run and the configured Team that holds the focused member', async () => {
    const { disclosure, org } = setup([orgEntry('org-1')]);
    org.value = { rootRunId: 'org-1', focusAddress: '/software/implementation', selection: null };
    await nextTick();
    expect(disclosure.isAgentOrgRunExpanded('org-1')).toBe(true);
    expect(disclosure.isAgentOrgTeamExpanded('org-1', '/software')).toBe(true);
    expect(disclosure.isAgentOrgRunSelected('org-1')).toBe(true);
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
