import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import type { AgentOrgRunHistoryItem, RunHistoryTransientExecutionRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRef } from '~/stores/runTreeStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { agentOrgFirstMemberAddress } from '~/utils/agentOrgHistoryRows';
import type { RunListEntry } from '~/utils/runListProjection';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { teamRunStatus } from '~/components/workspace/history/workspaceHistoryTeamBranchStatus';
import { formatRunLabel, formatTeamRunLabel } from '~/components/workspace/history/workspaceHistoryRunLabels';
import { isTeamRow, runTreeDisplayRows, type RunTreeDisplayRow } from '~/utils/runTree/runTreeDisplayRows';

/** What a row's tap opens (autobyteus-277 DS-003): a listed run itself, or a row of its tree (SR-084), where the server says. */
export type MobileRowOpen =
  | Readonly<{ kind: 'agentRun'; run: RunTreeRow }>
  | Readonly<{ kind: 'team'; team: TeamTreeNode }>
  | Readonly<{ kind: 'orgRun'; orgRun: AgentOrgRunHistoryItem }>
  | Readonly<{ kind: 'treeRow'; entry: RunListEntry; row: RunTreeRowDto }>;

/** Which disclosure a row's chevron folds: a listed run's, or a row of its tree. */
export type MobileRowFold =
  | Readonly<{ kind: 'run'; runId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string }>
  | Readonly<{ kind: 'orgRun'; rootRunId: string }>
  | Readonly<{ kind: 'treeRow'; entry: RunListEntry; row: RunTreeRowDto }>;

/** One row of the phone's run list: a listed run (depth 0), or a row of its tree. */
export type MobileRunTreeRow = Readonly<{
  key: string;
  depth: number;
  /** The avatar: an agent's initials, the Team icon or the Org icon. */
  avatar: 'agent' | 'team' | 'org';
  name: string;
  /** The run's title, or a delegated row's Task summary or peer title; empty when the row has none. */
  title: string;
  /** The shared status (`AgentStatus`, a Team's own status). */
  status: string;
  /** A run another node runs (278): its node, and whether the node answers. */
  remote: Readonly<{ nodeName: string; reachable: boolean }> | null;
  hasChildren: boolean;
  expanded: boolean;
  fold: MobileRowFold | null;
  /** Null for a row that opens nothing (a row error). */
  open: MobileRowOpen | null;
  /** Listed runs: the server's last activity, for the age. */
  lastActivityAt: string | null;
}>;

export interface MobileRunListSources {
  entries: readonly RunListEntry[];
  /** A listed run's tree's rows, built on the server (`runTreeStore`). */
  treeRows(entry: RunListEntry): readonly RunTreeRowDto[];
  /** A row's status by the ID the server named: an agent's, or a team run's own. */
  statusOf(row: RunTreeRowDto, id: string): AgentStatus | string | null;
  isTreeRowExpanded(entry: RunListEntry, row: RunTreeRowDto): boolean;
  /** A Task worker row's current Task summary, if known (DEC-010). */
  taskSummary(row: RunHistoryTransientExecutionRow): string | null;
  isRunExpanded(runId: string): boolean;
  isTeamExpanded(teamRunId: string): boolean;
  isAgentOrgRunExpanded(rootRunId: string): boolean;
}

/** The tree a listed run shows (SR-084). */
export const treeRefOf = (entry: RunListEntry): RunTreeRef =>
  ({ kind: entry.kind === 'agent' ? 'agent' : entry.kind === 'team' ? 'agent_team' : 'agent_org', runId: entry.runId });

/** The rows of a listed run's tree under its own row (an Org's start at its own parts), as the desktop shows them. */
export const treeDisplayRowsOf = (entry: RunListEntry, sources: Pick<MobileRunListSources, 'treeRows' | 'statusOf' | 'isTreeRowExpanded'>): RunTreeDisplayRow[] =>
  runTreeDisplayRows({
    rows: sources.treeRows(entry), rootKey: entry.kind === 'agent' ? `agent:${entry.runId}` : entry.kind === 'team' ? `team:${entry.runId}` : null,
    topRunId: entry.runId, isExpanded: (row) => sources.isTreeRowExpanded(entry, row), statusOf: sources.statusOf,
  });

const treeRowsOf = (entry: RunListEntry, sources: MobileRunListSources): MobileRunTreeRow[] => treeDisplayRowsOf(entry, sources).map((display) => {
  const tree = display.tree;
  const team = isTeamRow(tree);
  // A peer's run carries its node (a peer team's members show none: the team row does).
  const peer = tree.peer && tree.kind !== 'peer_member' ? tree.peer : null;
  return Object.freeze({
    key: `${entry.key}/${tree.key}`, depth: display.row.depth + 1, avatar: team ? 'team' : 'agent', name: tree.name,
    title: sources.taskSummary(display.row) || peer?.title || '',
    status: String((team ? display.teamStatus : display.row.currentStatus) ?? AgentStatus.Offline),
    remote: peer ? Object.freeze({ nodeName: peer.nodeName, reachable: peer.reachable !== false }) : null,
    hasChildren: display.row.hasChildren, expanded: sources.isTreeRowExpanded(entry, tree),
    fold: display.row.hasChildren ? Object.freeze({ kind: 'treeRow', entry, row: tree }) : null,
    // A mounted Org team opens in the Org by its address; any other row where its target says.
    open: tree.openTarget || tree.kind === 'org_team' ? Object.freeze({ kind: 'treeRow', entry, row: tree }) : null,
    lastActivityAt: null,
  });
});

const topLevelRow = (entry: RunListEntry, hasChildren: boolean, expanded: boolean): MobileRunTreeRow => {
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
    fold: hasChildren ? Object.freeze({ kind: 'orgRun', rootRunId: entry.runId }) : null,
    // It opens its first configured member (DEC-012): an Org without one has nothing to open.
    open: agentOrgFirstMemberAddress(entry.orgRun) ? Object.freeze({ kind: 'orgRun', orgRun: entry.orgRun }) : null });
};

/**
 * The phone's run list as one flat list (autobyteus-277 DS-002; autobyteus-461 SR-084, F-73): each shown run, then, while
 * it is unfolded, its tree's rows as the server built them, the same rows the desktop shows. Nothing is derived here.
 */
export const buildMobileRunListRows = (sources: MobileRunListSources): MobileRunTreeRow[] => sources.entries.flatMap((entry) => {
  const expanded = entry.kind === 'agent' ? sources.isRunExpanded(entry.runId)
    : entry.kind === 'team' ? sources.isTeamExpanded(entry.runId) : sources.isAgentOrgRunExpanded(entry.runId);
  const children = treeRowsOf(entry, sources);
  const hasChildren = entry.kind === 'agent' ? children.length > 0
    : entry.kind === 'team' ? entry.team.executionRows.length > 0 : entry.orgRun.executionTree.rootOrg.members.length > 0;
  return [topLevelRow(entry, hasChildren, expanded && hasChildren), ...(expanded && hasChildren ? children : [])];
});

/** The agent a row opens, for marking the open row; Team and Org rows are never the open row themselves. */
export const openAgentRunIdOf = (row: MobileRunTreeRow): string | null => {
  if (row.avatar !== 'agent' || !row.open) return null;
  if (row.open.kind === 'agentRun') return row.open.run.runId;
  if (row.open.kind === 'treeRow') return row.open.row.openTarget?.agentRunId ?? null;
  return null;
};
