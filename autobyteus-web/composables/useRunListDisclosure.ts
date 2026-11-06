import { computed, ref, unref, watch, type MaybeRef } from 'vue';
import type { OrgWorkspaceSelection } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex';
import type { RunListEntry } from '~/utils/runListProjection';

interface RunHistoryStoreLike {
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  navigationTopologyRevision: number;
  getTeamMemberNavigationAncestorRowKeys: (teamRunId: string, agentRunId: string) => string[];
}

interface RunListStoreLike {
  entries: readonly RunListEntry[];
  showRun: (runId: string) => void;
}

interface SelectionStoreLike {
  selectedType: string | null;
  selectedRunId: string | null;
}

export type SelectedAgentOrg = Readonly<{ rootRunId: string; focusAddress: string | null; selection?: OrgWorkspaceSelection | null }>;

/** What starts unfolded: the desktop folds Org runs and unfolds their delegated Teams; the phone the other way round. */
export type RunListDefaultExpansion = Readonly<{ orgRuns: boolean; orgTaskTeams: boolean }>;
const DESKTOP_DEFAULT_EXPANSION: RunListDefaultExpansion = Object.freeze({ orgRuns: false, orgTaskTeams: true });

type Flags = Record<string, boolean>;
const set = (flags: { value: Flags }, key: string, value: boolean): void => { flags.value = { ...flags.value, [key]: value }; };
const pair = (first: string, second: string): string => `${first.trim()}\u0000${second.trim()}`;

/**
 * Expansion and reveal for "Your runs" (autobyteus-378 DS-004), keyed by run identities only (no folder). Rows ask it
 * what is open; the selection actions open a Team and its members through it. When the open run changes, its
 * top-level row is shown (the fold opens when it is an older run) and its Team, member and Org ancestors open.
 */
export const useRunListDisclosure = (params: {
  runHistoryStore: RunHistoryStoreLike;
  runListStore: RunListStoreLike;
  selectionStore: SelectionStoreLike;
  selectedAgentOrg?: MaybeRef<SelectedAgentOrg | null>;
  /** Whether a delegated copy under this Agent run is the open conversation (its folded work then unfolds). */
  hasSelectedChild?: (runId: string) => boolean;
  defaultExpansion?: RunListDefaultExpansion;
}) => {
  const defaults = params.defaultExpansion ?? DESKTOP_DEFAULT_EXPANSION;
  const foldedRuns = ref<Flags>({});
  const expandedTeams = ref<Flags>({});
  const expandedTeamMembers = ref<Flags>({});
  const expandedOrgRuns = ref<Flags>({});
  const expandedOrgTeams = ref<Flags>({});
  const expandedOrgTaskTeams = ref<Flags>({});

  /** A run's delegated work: shown unless folded this session (UIT-005). */
  const isRunExpanded = (runId: string): boolean => !foldedRuns.value[runId];
  const toggleRun = (runId: string): void => set(foldedRuns, runId, isRunExpanded(runId));

  const isTeamExpanded = (teamRunId: string): boolean => expandedTeams.value[teamRunId.trim()] ?? false;
  const setTeamExpanded = (teamRunId: string, expanded: boolean): void => {
    if (teamRunId.trim()) set(expandedTeams, teamRunId.trim(), expanded);
  };
  const toggleTeam = (teamRunId: string): void => setTeamExpanded(teamRunId, !isTeamExpanded(teamRunId));

  const isRowExpanded = (teamRunId: string, rowKey: string): boolean => expandedTeamMembers.value[pair(teamRunId, rowKey)] ?? false;
  const toggleTeamMember = (teamRunId: string, rowKey: string): void =>
    set(expandedTeamMembers, pair(teamRunId, rowKey), !isRowExpanded(teamRunId, rowKey));
  const expandTeamMemberAncestors = (teamRunId: string, agentRunId: string): boolean => {
    const keys = params.runHistoryStore.getTeamMemberNavigationAncestorRowKeys(teamRunId, agentRunId);
    for (const key of keys) set(expandedTeamMembers, pair(teamRunId, key), true);
    return keys.length > 0;
  };

  const isAgentOrgRunExpanded = (rootRunId: string): boolean => expandedOrgRuns.value[rootRunId.trim()] ?? defaults.orgRuns;
  const toggleAgentOrgRun = (rootRunId: string): void => set(expandedOrgRuns, rootRunId.trim(), !isAgentOrgRunExpanded(rootRunId));
  const isAgentOrgTeamExpanded = (rootRunId: string, address: string): boolean => expandedOrgTeams.value[pair(rootRunId, address)] ?? false;
  const toggleAgentOrgTeam = (rootRunId: string, address: string): void =>
    set(expandedOrgTeams, pair(rootRunId, address), !isAgentOrgTeamExpanded(rootRunId, address));
  // Delegated Teams key by execution: one Team can be mounted and delegated (repeatedly) under the same address.
  const isAgentOrgTaskTeamExpanded = (rootRunId: string, teamRunId: string): boolean =>
    expandedOrgTaskTeams.value[pair(rootRunId, teamRunId)] ?? defaults.orgTaskTeams;
  const toggleAgentOrgTaskTeam = (rootRunId: string, teamRunId: string): void =>
    set(expandedOrgTaskTeams, pair(rootRunId, teamRunId), !isAgentOrgTaskTeamExpanded(rootRunId, teamRunId));

  const selectedAgentOrg = computed(() => (params.selectedAgentOrg ? unref(params.selectedAgentOrg) : null));
  const isAgentOrgRunSelected = (rootRunId: string): boolean =>
    selectedAgentOrg.value?.rootRunId === rootRunId && !selectedAgentOrg.value.selection;
  const isAgentOrgMemberSelected = (rootRunId: string, address: string, agentRunId?: string): boolean => {
    const selected = selectedAgentOrg.value;
    if (selected?.rootRunId !== rootRunId) return false;
    if (agentRunId) return selected.selection?.kind === 'agent_execution' && selected.selection.agentRunId === agentRunId;
    return selected.selection?.kind === 'configured_team' && selected.focusAddress === address;
  };

  /** The open standalone Agent run (the chat's run, else the history store's). */
  const selectedRunId = computed(() => params.selectionStore.selectedType === 'agent' && params.selectionStore.selectedRunId
    ? params.selectionStore.selectedRunId
    : params.runHistoryStore.selectedRunId);

  /** What is open, as one key: `agent:<id>`, `team:<id>` or `org:<id>\0<focus address>`. */
  const selectedKey = computed<string | null>(() => {
    const org = selectedAgentOrg.value;
    if (org?.rootRunId) {
      const exact = org.selection;
      const identity = exact?.kind === 'agent_execution' ? exact.agentRunId : exact?.teamRunId ?? '';
      return `org:${org.rootRunId}\u0000${org.focusAddress ?? ''}\u0000${identity}`;
    }
    const { selectedType, selectedRunId: runId } = params.selectionStore;
    if (selectedType === 'team' && runId?.trim()) return `team:${runId.trim()}`;
    if (selectedType === 'agent' && runId?.trim()) return `agent:${runId.trim()}`;
    const teamRunId = params.runHistoryStore.selectedTeamRunId?.trim();
    if (teamRunId) return `team:${teamRunId}`;
    const agentRunId = params.runHistoryStore.selectedRunId?.trim();
    return agentRunId ? `agent:${agentRunId}` : null;
  });

  /** Shows the open run's row and opens its ancestors; false while its row does not exist yet (retried later). */
  const reveal = (key: string): boolean => {
    const [kind, rest] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const [runId = '', focusAddress = ''] = rest.split('\u0000');
    const entry = params.runListStore.entries.find((candidate) => candidate.runId === runId);
    if (!entry || (kind === 'org') !== (entry.kind === 'org')) return false;
    params.runListStore.showRun(runId);
    if (entry.kind === 'agent') {
      if (params.hasSelectedChild?.(runId)) set(foldedRuns, runId, false);
      return true;
    }
    if (entry.kind === 'team') {
      setTeamExpanded(runId, true);
      // The focused member's delegated task-Team rows open too; until its row exists the reveal stays pending.
      const focused = entry.team.focusedAgentRunId?.trim();
      if (!focused) return true;
      if (!entry.team.executionRows.some((row) => row.agentRunId === focused)) return false;
      expandTeamMemberAncestors(runId, focused);
      return true;
    }
    set(expandedOrgRuns, runId, true);
    const teamAddress = entry.orgRun.executionTree.rootOrg.members
      .filter((member) => 'teamRunId' in member)
      .map((member) => member.address)
      .find((address) => focusAddress === address || focusAddress.startsWith(`${address}/`));
    if (teamAddress) set(expandedOrgTeams, pair(runId, teamAddress), true);
    return true;
  };

  let revealedKey: string | null = null;
  watch(
    [selectedKey, () => params.runHistoryStore.navigationTopologyRevision, () => params.runListStore.entries],
    ([key]) => {
      if (key !== revealedKey && key && reveal(key)) revealedKey = key;
      if (!key) revealedKey = null;
    },
    { immediate: true },
  );

  return {
    selectedRunId,
    isRunExpanded, toggleRun,
    isTeamExpanded, setTeamExpanded, toggleTeam,
    isRowExpanded, toggleTeamMember, expandTeamMemberAncestors,
    isAgentOrgRunExpanded, toggleAgentOrgRun, isAgentOrgTeamExpanded, toggleAgentOrgTeam,
    isAgentOrgTaskTeamExpanded, toggleAgentOrgTaskTeam, isAgentOrgRunSelected, isAgentOrgMemberSelected,
  };
};
