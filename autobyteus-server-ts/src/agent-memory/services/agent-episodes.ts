import path from "node:path";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CatalogEntry } from "../../agent-episodic-catalog/domain/episodic-catalog-models.js";
import type { DiscoveredRun, MemoryRunSubject } from "../domain/discovered-run.js";
import type { AgentEpisode, MemoryAvailabilityBuildResult, MemoryExplorerPage } from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import type { CollaborationRootCatalogEntry } from "./collaboration-root-memory-catalog.js";
import { includesMemoryExplorerQuery, pageMemoryExplorerEntries } from "./memory-explorer-page.js";
import { MemoryRunSummaryBuilder } from "./memory-run-summary-builder.js";

/**
 * One episode before its page is chosen (autobyteus-554): what the filter and the order need, all from memory already
 * read (the episodic catalog, one discovery, the history rows). Memory availability is built only for the page.
 */
export type EpisodeCandidate = Readonly<{
  runId: string;
  memoryDir: string;
  subject: MemoryRunSubject;
  root: RootExecutionIdentity;
  workspaceRootPath: string | null;
  /** ISO time for "newest first": the last activity (catalog), else the recorded start. */
  time: string | null;
  taskTitle: string | null;
  /** The team or org name the run's records hold (discovery); the history row's name wins. */
  recordedPlaceName: string | null;
  /** Already built (the unattributed scan needs it to list a run at all). */
  memory?: MemoryAvailabilityBuildResult;
}>;

/** History rows by run: an agent run's summary, and a team or org root's name and summary. */
export type EpisodeHistory = Readonly<{
  agentSummaries: ReadonlyMap<string, string | null>;
  teamRoots: ReadonlyMap<string, CollaborationRootCatalogEntry>;
  orgRoots: ReadonlyMap<string, CollaborationRootCatalogEntry>;
}>;

/** A catalog time (`YYYY-MM-DD HH:MM`, UTC) as ISO; null stays null. */
export const catalogTimeToIso = (value: string | null): string | null =>
  value ? `${value.replace(" ", "T")}:00Z` : null;

/** The subject a run's memory view opens by, from its root (the same rule as run-folder discovery). */
export const subjectOf = (
  root: RootExecutionIdentity,
  runId: string,
  agentDefinitionId: string | null,
): MemoryRunSubject => {
  switch (root.rootSubjectKind) {
    case "agent_team":
      return { kind: "TEAM_MEMBER", teamRunId: root.rootRunId, agentRunId: runId };
    case "agent_org":
      return { kind: "ORG_MEMBER", orgRunId: root.rootRunId, agentRunId: runId };
    default:
      return { kind: "AGENT", runId, agentDefinitionId };
  }
};

/** A local episode, from the agent's episodic catalog entry. */
export const candidateFromCatalog = (entry: CatalogEntry, agentDefinitionId: string): EpisodeCandidate => ({
  runId: entry.runId,
  memoryDir: entry.memoryDir,
  subject: subjectOf(entry.root, entry.runId, agentDefinitionId),
  root: entry.root,
  workspaceRootPath: entry.workspace,
  time: catalogTimeToIso(entry.lastActivityAt ?? entry.startedAt),
  taskTitle: entry.taskTitle,
  recordedPlaceName: null,
});

/** An imported episode, from one discovery of the source. */
export const candidateFromDiscovery = (run: DiscoveredRun): EpisodeCandidate => ({
  runId: run.runId,
  memoryDir: run.memoryDir,
  subject: run.subject,
  root: run.root,
  workspaceRootPath: run.workspace,
  time: run.recordedStartAt,
  taskTitle: null,
  recordedPlaceName: run.teamName ?? run.orgName,
});

const summaryOf = (candidate: EpisodeCandidate, history: EpisodeHistory): string | null => {
  switch (candidate.root.rootSubjectKind) {
    case "agent_team":
      return history.teamRoots.get(candidate.root.rootRunId)?.summary ?? null;
    case "agent_org":
      return history.orgRoots.get(candidate.root.rootRunId)?.summary ?? null;
    default:
      return history.agentSummaries.get(candidate.runId)?.trim() || null;
  }
};

const placeOf = (candidate: EpisodeCandidate, history: EpisodeHistory): AgentEpisode["place"] => {
  switch (candidate.root.rootSubjectKind) {
    case "agent_team":
      return { kind: "TEAM", name: history.teamRoots.get(candidate.root.rootRunId)?.definitionName ?? candidate.recordedPlaceName };
    case "agent_org":
      return { kind: "ORG", name: history.orgRoots.get(candidate.root.rootRunId)?.definitionName ?? candidate.recordedPlaceName };
    default:
      return null;
  }
};

/** A run folder's memory availability, wherever the folder is. */
export const memoryOfRunFolder = (memoryDir: string): MemoryAvailabilityBuildResult =>
  new MemoryRunSummaryBuilder(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" })).build(path.basename(memoryDir));

/**
 * The page of episodes: filtered by run ID, Task title and run summary (N-8), newest first, paged; memory availability
 * is built for the page's runs only.
 */
export const pageEpisodes = (
  candidates: readonly EpisodeCandidate[],
  history: EpisodeHistory,
  query: string,
  page: number,
  pageSize: number,
): MemoryExplorerPage<AgentEpisode> => {
  const rows = candidates
    .map((candidate) => ({ candidate, summary: summaryOf(candidate, history) }))
    .filter(({ candidate, summary }) => !query
      || includesMemoryExplorerQuery(candidate.runId, query)
      || includesMemoryExplorerQuery(candidate.taskTitle, query)
      || includesMemoryExplorerQuery(summary, query))
    .sort((a, b) => (b.candidate.time ?? "").localeCompare(a.candidate.time ?? "") || b.candidate.runId.localeCompare(a.candidate.runId));
  const result = pageMemoryExplorerEntries(rows, page, pageSize);
  return {
    ...result,
    entries: result.entries.map(({ candidate, summary }): AgentEpisode => ({
      runId: candidate.runId,
      subject: candidate.subject,
      place: placeOf(candidate, history),
      summary,
      taskTitle: candidate.taskTitle,
      workspaceRootPath: candidate.workspaceRootPath,
      lastActivityAt: candidate.time,
      memory: (candidate.memory ?? memoryOfRunFolder(candidate.memoryDir)).availability,
    })),
  };
};
