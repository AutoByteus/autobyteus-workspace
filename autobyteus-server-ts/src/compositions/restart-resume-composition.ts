import type { ClosedTaskEntryFence } from "../agent-collaboration/execution/task/closed-task-fence.js";
import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { getActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { BusyRunRecorder } from "../restart-resume/busy-run-recorder.js";
import { busyRunRecordPath } from "../restart-resume/busy-run-record.js";
import { readReleaseIdentity } from "../restart-resume/release-identity.js";
import { RestartResumer, type RootHistoryState } from "../restart-resume/restart-resumer.js";
import type { RestartReminderService } from "../restart-resume/restart-reminder-service.js";
import type { AgentOrgRunHistoryCatalogService } from "../run-history/services/agent-org-run-history-catalog-service.js";
import { getAgentRunHistoryCatalogService } from "../run-history/services/agent-run-history-catalog-service.js";
import { getTeamRunHistoryCatalogService } from "../run-history/services/team-run-history-catalog-service.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";
import type { DelegationIndex } from "../agent-collaboration/delegation/delegation-index.js";
import type { RunningAgents } from "../agent-collaboration/running/running-agents.js";
import type { RunOwnAgentsReader } from "../run-history/store/run-own-agents-reader.js";
import { runningRunRecordPath } from "../restart-resume/running-run-record.js";
import { RunningRunRecorder } from "../restart-resume/running-run-recorder.js";
import { RunningRunRestorer } from "../restart-resume/running-run-restorer.js";

/** autobyteus-638: the running-run record's writer and the restorer that takes it at startup and brings the runs back. */
export type RunningRunsRestart = Readonly<{ recorder: RunningRunRecorder; restorer: RunningRunRestorer }>;

export type RestartResume = Readonly<{ recorder: BusyRunRecorder; resumer: RestartResumer; runningRuns: RunningRunsRestart }>;

type HistoryRow = Readonly<{ terminatedAt?: string | null; archivedAt?: string | null }> | null;

/**
 * Restart resume around the process's general runs (autobyteus-285, autobyteus-448): the recorder of this session's
 * live list, and the resumer that takes the previous session's record at startup and wakes the update entries after
 * listening. Both read the process `AgentRunManager` (application scopes have their own), the process root directory
 * and the history catalogs; the resumer wakes runs only through their roots and delivers through the reminder service.
 * Also the running runs (autobyteus-638): the restorer is built first, then the recorder, which asks it for the runs it
 * has taken and not handled yet (`pending`); both use the same `rootHistory`.
 */
export const composeRestartResume = (input: Readonly<{
  appDataDir: string;
  rootResolver: CollaborationRootResolver;
  /** The relationships between runs (SR-047): a delegated run is resumed through its own root. */
  tree: Pick<DelegationIndex, "parentOf">;
  /** DS-15: a run whose Task is closed is not resumed (as base fenced its input). */
  closedTasks: Pick<ClosedTaskEntryFence, "refusal">;
  orgHistory: Pick<AgentOrgRunHistoryCatalogService, "getCatalogRow">;
  /** The pending restart reminders, created early for the notice slot (build-studio-server). */
  reminders: RestartReminderService;
  /** autobyteus-638: which agents run, in which live root (the process `RunningAgents`). */
  running: Pick<RunningAgents, "liveRoots" | "statusesOf" | "teamCoordinatorOf" | "rootOf">;
  /** autobyteus-638: whether a person started a run, from its own file. */
  runFiles: Pick<RunOwnAgentsReader, "listingFactsOf">;
}>): RestartResume => {
  const recordPath = busyRunRecordPath(input.appDataDir);
  const liveRuns = AgentRunManager.getInstance();
  const rootHistory = async (root: RootExecutionIdentity): Promise<RootHistoryState> => {
    const row: HistoryRow = root.rootSubjectKind === "agent" ? await getAgentRunHistoryCatalogService().getCatalogRow(root.rootRunId)
      : root.rootSubjectKind === "agent_team" ? await getTeamRunHistoryCatalogService().getCatalogRow(root.rootRunId)
        : await input.orgHistory.getCatalogRow(root.rootRunId);
    if (!row) return "gone";
    if (row.terminatedAt) return "terminated";
    return row.archivedAt ? "archived" : "present";
  };
  const runningRunPath = runningRunRecordPath(input.appDataDir);
  const restorer = new RunningRunRestorer({ recordPath: runningRunPath, rootHistory, runFiles: input.runFiles, running: input.running,
    rootResolver: input.rootResolver });
  const runningRecorder = new RunningRunRecorder({ running: input.running, runFiles: input.runFiles, pending: restorer, recordPath: runningRunPath });
  return Object.freeze({
    runningRuns: Object.freeze({ recorder: runningRecorder, restorer }),
    recorder: new BusyRunRecorder({ liveRuns, roots: getActiveCollaborationRootDirectory(), recordPath, version: readReleaseIdentity }),
    resumer: new RestartResumer({
      recordPath, version: readReleaseIdentity, liveRuns, rootHistory, rootResolver: input.rootResolver, tree: input.tree, closedTasks: input.closedTasks,
      reminders: input.reminders,
    }),
  });
};
