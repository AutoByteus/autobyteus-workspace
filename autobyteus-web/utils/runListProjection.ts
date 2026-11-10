import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentOrgRunHistoryItem, RunHistoryWorkspaceGroup, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { mergeHistoryRowWithContext } from '~/utils/runTreeLiveStatusMerge';
import { resolveStoredTitleSummary } from '~/utils/runTreeSummary';
import { DRAFT_RUN_ID_PREFIX, FALLBACK_AGENT_NAME } from '~/utils/runTreeProjectionConstants';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import { localRunSummary, normalizeRootPath, runStatusOf } from '~/stores/runHistoryReadModel';

/** What every row of "Your runs" has, whatever its kind. */
interface RunListEntryBase {
  /** Unique across kinds: `agent:<id>`, `team:<id>`, `org:<id>`. */
  key: string;
  runId: string;
  /** The agent's, Team's or Org's name. */
  name: string;
  /** Newest first by this: the server's last activity (DS-005), one clock for every kind; a running run is not moved up. */
  lastActivityAt: string;
  isActive: boolean;
  /** The folder the run works in, for the row's tooltip only; null when it has none. */
  folderRootPath: string | null;
}

/**
 * One top-level run the user started: an Agent, Team or Org run (workspace-tree-vs-chooser DS-003, from autobyteus-378). It keeps the history view
 * object the existing row actions and nested trees take (`run`, `team`, `orgRun`); nothing is copied from it.
 */
export type RunListEntry =
  | RunListEntryBase & { kind: 'agent'; agentDefinitionId: string; avatarUrl: string | null; run: RunTreeRow }
  | RunListEntryBase & { kind: 'team'; team: TeamTreeNode }
  | RunListEntryBase & { kind: 'org'; definitionId: string; orgRun: AgentOrgRunHistoryItem };

export interface RunListSources {
  /** Every folder group of the history read, whatever the Workspaces view lists. */
  workspaceGroups: readonly RunHistoryWorkspaceGroup[];
  /** The standalone agent runs of this session: live status for listed runs, and runs no read lists yet. */
  agentContexts: ReadonlyMap<string, AgentContext>;
  agentAvatarByDefinitionId: Readonly<Record<string, string>>;
  /** The navigation projection's Team runs, every folder. */
  teamNodes: readonly TeamTreeNode[];
  agentOrgHistory: readonly AgentOrgRunHistoryItem[];
}

/** The run list row key of an agent run, `agent:<runId>`: the one writer of that format (the list, and the phone's Create run). */
export const agentRunRowKey = (runId: string): string => `agent:${runId}`;

const timeOf = (iso: string): number => {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
};
const folderOf = (rootPath: string | null | undefined): string | null => normalizeRootPath(rootPath) || null;

const historyRow = (run: RunHistoryWorkspaceGroup['agentDefinitions'][number]['runs'][number]): RunTreeRow => {
  const currentStatus = normalizeAgentRuntimeStatus(run.status);
  return {
    runId: run.runId,
    summary: resolveStoredTitleSummary(run.summary) ?? '',
    lastActivityAt: run.lastActivityAt,
    currentStatus,
    lastKnownStatus: runStatusOf(currentStatus).lastKnownStatus,
    isActive: run.isActive,
    hasCollaboration: run.hasCollaboration === true,
    source: 'history',
    isDraft: false,
  };
};

const agentEntries = (sources: RunListSources): RunListEntry[] => {
  const entries = new Map<string, RunListEntry>();
  const avatarOf = (definitionId: string, own?: string | null): string | null =>
    own?.trim() || sources.agentAvatarByDefinitionId[definitionId] || null;
  for (const group of sources.workspaceGroups) {
    for (const agent of group.agentDefinitions) {
      for (const stored of agent.runs) {
        if (entries.has(stored.runId)) continue;
        const context = sources.agentContexts.get(stored.runId);
        // Live status and title from the context; the order keeps the server's clock (a live context would move it).
        const run = context
          ? { ...mergeHistoryRowWithContext(historyRow(stored), context), lastActivityAt: stored.lastActivityAt }
          : historyRow(stored);
        entries.set(run.runId, {
          kind: 'agent', key: agentRunRowKey(run.runId), runId: run.runId, name: agent.agentName || FALLBACK_AGENT_NAME,
          lastActivityAt: run.lastActivityAt, isActive: run.isActive, folderRootPath: folderOf(group.workspaceRootPath),
          agentDefinitionId: agent.agentDefinitionId, avatarUrl: avatarOf(agent.agentDefinitionId, agent.agentAvatarUrl), run,
        });
      }
    }
  }
  // A run of this session that no read lists yet; New chat drafts stay under the Chat row.
  for (const [runId, context] of sources.agentContexts) {
    if (entries.has(runId) || runId.startsWith(DRAFT_RUN_ID_PREFIX)) continue;
    const name = context.config.agentDefinitionName || FALLBACK_AGENT_NAME;
    const conversation = context.state.conversation;
    const currentStatus = normalizeAgentRuntimeStatus(context.state.currentStatus);
    const run: RunTreeRow = {
      runId, summary: localRunSummary(conversation, name), ...runStatusOf(currentStatus), currentStatus,
      // Not in the history yet: its creation, until the next read gives the server's last activity.
      lastActivityAt: conversation.createdAt || new Date().toISOString(), source: 'local', isDraft: false,
    };
    entries.set(runId, {
      kind: 'agent', key: agentRunRowKey(runId), runId, name, lastActivityAt: run.lastActivityAt, isActive: run.isActive,
      folderRootPath: folderOf(context.config.workspaceMetadata?.workspaceRootPath),
      agentDefinitionId: context.config.agentDefinitionId, avatarUrl: avatarOf(context.config.agentDefinitionId, context.config.agentAvatarUrl), run,
    });
  }
  return [...entries.values()];
};

const orgFolderOf = (run: AgentOrgRunHistoryItem): string | null =>
  folderOf(run.executionTree.rootOrg.defaultLaunchConfiguration.workspaceRootPath);

/** The run section's rows: every top-level Agent, Team and Org run, newest first by last activity. */
export const buildRunListEntries = (sources: RunListSources): RunListEntry[] => {
  const teamLastActivity = new Map(sources.workspaceGroups.flatMap((group) => group.teamDefinitions
    .flatMap((definition) => definition.runs.map((run) => [run.teamRunId, run.lastActivityAt] as const))));
  const teams = sources.teamNodes.map<RunListEntry>((team) => ({
    kind: 'team', key: `team:${team.teamRunId}`, runId: team.teamRunId, name: team.teamDefinitionName,
    // The server's last activity; a Team run no read lists yet (just started) keeps its node's time until the next read.
    lastActivityAt: teamLastActivity.get(team.teamRunId) ?? team.lastActivityAt,
    isActive: team.isActive, folderRootPath: folderOf(team.workspaceRootPath), team,
  }));
  const orgs = sources.agentOrgHistory.map<RunListEntry>((orgRun) => ({
    kind: 'org', key: `org:${orgRun.rootRunId}`, runId: orgRun.rootRunId, name: orgRun.executionTree.rootOrg.orgDefinitionName,
    lastActivityAt: orgRun.lastActivityAt, isActive: orgRun.isActive, folderRootPath: orgFolderOf(orgRun),
    definitionId: orgRun.executionTree.rootOrg.orgDefinitionId, orgRun,
  }));
  return [...agentEntries(sources), ...teams, ...orgs]
    .sort((a, b) => timeOf(b.lastActivityAt) - timeOf(a.lastActivityAt) || a.key.localeCompare(b.key));
};
