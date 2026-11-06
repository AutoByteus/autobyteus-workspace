import type { AgentRunTaskTreeRow } from '~/services/agentCollaboration/agentRunCollaborationContext';
import type {
  AgentOrgRunHistoryItem,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
  TeamMemberFocusTarget,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentOrgHistoryDisplayRow } from '~/utils/agentOrgHistoryRows';
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName';
import type { RunListEntry } from '~/utils/runListProjection';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { teamBranchStatus, teamRunStatus } from '~/components/workspace/history/workspaceHistoryTeamBranchStatus';
import { formatRunLabel, formatTeamRunLabel } from '~/components/workspace/history/workspaceHistoryRunLabels';

/** What a row's tap opens, by the shared open action that owns that kind (autobyteus-277 DS-003). */
export type MobileRowOpen =
  | Readonly<{ kind: 'agentRun'; run: RunTreeRow }>
  | Readonly<{ kind: 'taskRow'; hostRun: RunTreeRow; row: RunHistoryTransientExecutionRow }>
  | Readonly<{ kind: 'team'; team: TeamTreeNode }>
  | Readonly<{ kind: 'teamMember'; target: TeamMemberFocusTarget }>
  | Readonly<{ kind: 'orgRun'; orgRun: AgentOrgRunHistoryItem }>
  | Readonly<{ kind: 'orgMember'; orgRun: AgentOrgRunHistoryItem; address: string; agentRunId: string | null }>
  | Readonly<{ kind: 'orgExecution'; orgRun: AgentOrgRunHistoryItem; agentRunId: string; address: string }>;

/** Which disclosure a row's chevron folds, by the owner of that disclosure. */
export type MobileRowFold =
  | Readonly<{ kind: 'run'; runId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string }>
  | Readonly<{ kind: 'teamRow'; teamRunId: string; rowKey: string }>
  | Readonly<{ kind: 'taskTeam'; hostRunId: string; teamRunId: string }>
  | Readonly<{ kind: 'orgRun'; rootRunId: string }>
  | Readonly<{ kind: 'orgTeam'; rootRunId: string; address: string }>
  | Readonly<{ kind: 'orgTaskTeam'; rootRunId: string; teamRunId: string }>;

/** One row of the phone's run list: a top-level run (depth 0) or a row of its delegated work or members. */
export type MobileRunTreeRow = Readonly<{
  key: string;
  depth: number;
  /** The avatar: an agent's initials, the Team icon or the Org icon. */
  avatar: 'agent' | 'team' | 'org';
  name: string;
  /** The run's title; empty when the row has none (members). */
  title: string;
  /** The shared status (`AgentStatus`, or a Team's folded status). */
  status: string;
  /** A run another node runs (278): its node, and whether the node answers. */
  remote: Readonly<{ nodeName: string; reachable: boolean }> | null;
  hasChildren: boolean;
  expanded: boolean;
  fold: MobileRowFold | null;
  /** Null for a row there is no agent to open for (a member's delegated Team without a known coordinator). */
  open: MobileRowOpen | null;
  /** Top-level rows: the server's last activity, for the age. */
  lastActivityAt: string | null;
}>;

export interface MobileRunTreeSources {
  entries: readonly RunListEntry[];
  /** A standalone run's delegated rows (already without the members of folded task Teams). */
  taskRows(hostRunId: string): readonly AgentRunTaskTreeRow[];
  /** An Org run's rows (already without the rows of folded Teams and task Teams). */
  orgRows(orgRun: AgentOrgRunHistoryItem): readonly AgentOrgHistoryDisplayRow[];
  /** A remote run's reachability (278); unknown counts as reachable. */
  remoteReachable(runId: string): boolean;
  /** A remote run's title as its node reports it, if any. */
  remoteTitle(runId: string): string | null;
  isRunExpanded(runId: string): boolean;
  isTeamExpanded(teamRunId: string): boolean;
  isTeamRowExpanded(teamRunId: string, rowKey: string): boolean;
  isAgentOrgRunExpanded(rootRunId: string): boolean;
  isAgentOrgTeamExpanded(rootRunId: string, address: string): boolean;
  /** A standalone run's task Team (the collaboration store's disclosure). */
  isTaskTeamExpanded(hostRunId: string, teamRunId: string): boolean;
  /** An Org run's delegated Team (the run list's disclosure). */
  isAgentOrgTaskTeamExpanded(rootRunId: string, teamRunId: string): boolean;
}

type Row = MobileRunTreeRow;
const child = (entry: RunListEntry, key: string): string => `${entry.key}/${key}`;

/** A delegated row's node chip: only the run another node runs, not the members of its Team. */
const remoteOf = (row: RunHistoryTransientExecutionRow, sources: MobileRunTreeSources): Row['remote'] =>
  row.remote && row.transientKind !== 'task_team_child'
    ? Object.freeze({ nodeName: row.remote.nodeName, reachable: sources.remoteReachable(row.remote.runId) })
    : null;
const remoteTitleOf = (row: RunHistoryTransientExecutionRow, sources: MobileRunTreeSources): string =>
  (row.remote && row.transientKind !== 'task_team_child' ? sources.remoteTitle(row.remote.runId) : null) ?? '';

const taskRowsOf = (entry: Extract<RunListEntry, { kind: 'agent' }>, sources: MobileRunTreeSources): Row[] =>
  sources.taskRows(entry.runId).map(({ row, teamStatus }) => Object.freeze({
    key: child(entry, row.rowKey), depth: row.depth + 1, avatar: row.memberKind === 'agent_team' ? 'team' : 'agent',
    name: row.displayName, title: remoteTitleOf(row, sources),
    status: String(row.memberKind === 'agent_team' ? teamStatus ?? AgentStatus.Offline : row.currentStatus || AgentStatus.Offline),
    remote: remoteOf(row, sources), hasChildren: row.hasChildren,
    expanded: Boolean(row.teamRunIdForNode && sources.isTaskTeamExpanded(entry.runId, row.teamRunIdForNode)),
    fold: row.hasChildren && row.teamRunIdForNode ? Object.freeze({ kind: 'taskTeam', hostRunId: entry.runId, teamRunId: row.teamRunIdForNode }) : null,
    open: Object.freeze({ kind: 'taskRow', hostRun: entry.run, row }), lastActivityAt: null,
  }));

/** A Team run's members and their delegated work; the rows under a folded row are hidden. */
const teamRowsOf = (entry: Extract<RunListEntry, { kind: 'team' }>, sources: MobileRunTreeSources): Row[] => {
  const rows: Row[] = [];
  let foldedDepth: number | null = null;
  for (const row of entry.team.executionRows) {
    if (foldedDepth !== null && row.depth > foldedDepth) continue;
    foldedDepth = null;
    const expanded = sources.isTeamRowExpanded(entry.runId, row.rowKey);
    if (row.hasChildren && !expanded) foldedDepth = row.depth;
    rows.push(teamExecutionRow(entry, row, expanded, sources));
  }
  return rows;
};

const teamExecutionRow = (
  entry: Extract<RunListEntry, { kind: 'team' }>,
  row: RunHistoryTeamExecutionRow,
  expanded: boolean,
  sources: MobileRunTreeSources,
): Row => {
  const transient = row.kind === 'transient_execution' ? row : null;
  const status = row.memberKind === 'agent_team'
    ? teamBranchStatus(entry.team.executionRows, row, entry.team.isActive)
    : (row.kind === 'stable_member' ? row.row.currentStatus : row.currentStatus) || AgentStatus.Offline;
  return Object.freeze({
    key: child(entry, row.rowKey), depth: row.depth + 1, avatar: row.memberKind === 'agent_team' ? 'team' : 'agent',
    name: row.displayName, title: transient ? remoteTitleOf(transient, sources) : '', status: String(status),
    remote: transient ? remoteOf(transient, sources) : null, hasChildren: row.hasChildren, expanded,
    fold: row.hasChildren ? Object.freeze({ kind: 'teamRow', teamRunId: entry.runId, rowKey: row.rowKey }) : null,
    open: row.agentRunId
      ? Object.freeze({ kind: 'teamMember', target: { teamRunId: entry.runId, memberAddress: row.memberAddress, agentRunId: row.agentRunId } })
      : null,
    lastActivityAt: null,
  });
};

const orgRowsOf = (entry: Extract<RunListEntry, { kind: 'org' }>, sources: MobileRunTreeSources): Row[] => {
  const orgRun = entry.orgRun;
  return sources.orgRows(orgRun).map(({ row }): Row => {
    const base = { key: child(entry, row.key), depth: row.depth + 1, lastActivityAt: null };
    if (row.kind === 'agent') {
      return Object.freeze({ ...base, avatar: 'agent', name: memberDisplayName(row.address), title: '', status: row.status, remote: null,
        hasChildren: false, expanded: false, fold: null, open: Object.freeze({ kind: 'orgMember', orgRun, address: row.address, agentRunId: row.agentRunId }) });
    }
    if (row.kind === 'team') {
      return Object.freeze({ ...base, avatar: 'team', name: memberDisplayName(row.address), title: '', status: row.status, remote: null,
        hasChildren: true, expanded: sources.isAgentOrgTeamExpanded(orgRun.rootRunId, row.address),
        fold: Object.freeze({ kind: 'orgTeam', rootRunId: orgRun.rootRunId, address: row.address }),
        open: Object.freeze({ kind: 'orgMember', orgRun, address: row.address, agentRunId: null }) });
    }
    if (row.kind === 'task_agent') {
      return Object.freeze({ ...base, avatar: 'agent', name: memberDisplayName(row.address), title: '', status: row.status, remote: null,
        hasChildren: false, expanded: false, fold: null,
        open: Object.freeze({ kind: 'orgExecution', orgRun, agentRunId: row.agentRunId, address: row.address }) });
    }
    if (row.kind === 'task_team') {
      return Object.freeze({ ...base, avatar: 'team', name: memberDisplayName(row.address), title: '', status: row.status, remote: null,
        hasChildren: row.hasChildren, expanded: row.expanded,
        fold: row.hasChildren ? Object.freeze({ kind: 'orgTaskTeam', rootRunId: orgRun.rootRunId, teamRunId: row.teamRunId }) : null,
        open: Object.freeze({ kind: 'orgExecution', orgRun, agentRunId: row.coordinatorAgentRunId, address: row.coordinatorAddress }) });
    }
    const transient = row.transient;
    return Object.freeze({ ...base, avatar: transient.memberKind === 'agent_team' ? 'team' : 'agent', name: transient.displayName,
      title: remoteTitleOf(transient, sources),
      status: String(transient.memberKind === 'agent_team' ? row.teamStatus ?? AgentStatus.Offline : transient.currentStatus || AgentStatus.Offline),
      remote: remoteOf(transient, sources), hasChildren: transient.hasChildren,
      expanded: Boolean(transient.teamRunIdForNode && transient.hasChildren && sources.isAgentOrgTaskTeamExpanded(orgRun.rootRunId, transient.teamRunIdForNode)),
      fold: transient.hasChildren && transient.teamRunIdForNode
        ? Object.freeze({ kind: 'orgTaskTeam', rootRunId: orgRun.rootRunId, teamRunId: transient.teamRunIdForNode }) : null,
      open: row.openAgentRunId ? Object.freeze({ kind: 'orgExecution', orgRun, agentRunId: row.openAgentRunId, address: row.openAddress }) : null });
  });
};

const topLevelRow = (entry: RunListEntry, hasChildren: boolean, expanded: boolean): Row => {
  const base = { key: entry.key, depth: 0, name: entry.name, remote: null, hasChildren, expanded, lastActivityAt: entry.lastActivityAt };
  if (entry.kind === 'agent') {
    return Object.freeze({ ...base, avatar: 'agent', title: formatRunLabel(entry.run.summary), status: String(entry.run.currentStatus || AgentStatus.Offline),
      fold: hasChildren ? Object.freeze({ kind: 'run', runId: entry.runId }) : null, open: Object.freeze({ kind: 'agentRun', run: entry.run }) });
  }
  if (entry.kind === 'team') {
    return Object.freeze({ ...base, avatar: 'team', title: formatTeamRunLabel(entry.team), status: teamRunStatus(entry.team),
      fold: hasChildren ? Object.freeze({ kind: 'team', teamRunId: entry.runId }) : null, open: Object.freeze({ kind: 'team', team: entry.team }) });
  }
  return Object.freeze({ ...base, avatar: 'org', title: entry.orgRun.summary || '',
    status: entry.isActive ? AgentStatus.Running : AgentStatus.Offline,
    fold: hasChildren ? Object.freeze({ kind: 'orgRun', rootRunId: entry.runId }) : null, open: Object.freeze({ kind: 'orgRun', orgRun: entry.orgRun }) });
};

/**
 * The phone's run list as one flat list of rows (autobyteus-277 DS-002): each shown run, then, while it is unfolded,
 * its delegated work (an Agent run), its members and their work (a Team run) or its members and delegated work (an
 * Org run), each with its depth, state and node. Pure: the sources give the rows of each kind and the disclosure.
 */
export const buildMobileRunTreeRows = (sources: MobileRunTreeSources): MobileRunTreeRow[] => sources.entries.flatMap((entry) => {
  if (entry.kind === 'agent') {
    const children = taskRowsOf(entry, sources);
    const expanded = children.length > 0 && sources.isRunExpanded(entry.runId);
    return [topLevelRow(entry, children.length > 0, expanded), ...(expanded ? children : [])];
  }
  if (entry.kind === 'team') {
    const hasChildren = entry.team.executionRows.length > 0;
    const expanded = hasChildren && sources.isTeamExpanded(entry.runId);
    return [topLevelRow(entry, hasChildren, expanded), ...(expanded ? teamRowsOf(entry, sources) : [])];
  }
  const expanded = sources.isAgentOrgRunExpanded(entry.runId);
  const children = expanded ? orgRowsOf(entry, sources) : [];
  const hasChildren = entry.orgRun.executionTree.rootOrg.members.length > 0;
  return [topLevelRow(entry, hasChildren, expanded && hasChildren), ...children];
});

/** The agent a row opens, for marking the open row; Team and Org rows are never the open row themselves. */
export const openAgentRunIdOf = (row: MobileRunTreeRow): string | null => {
  if (row.avatar !== 'agent' || !row.open) return null;
  const open = row.open;
  if (open.kind === 'agentRun') return open.run.runId;
  if (open.kind === 'taskRow') return open.row.agentRunId;
  if (open.kind === 'teamMember') return open.target.agentRunId;
  if (open.kind === 'orgMember') return open.agentRunId;
  if (open.kind === 'orgExecution') return open.agentRunId;
  return null;
};
