import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { getActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { BusyRunRecorder } from "../restart-resume/busy-run-recorder.js";
import { busyRunRecordPath } from "../restart-resume/busy-run-record.js";
import { readReleaseIdentity } from "../restart-resume/release-identity.js";
import { RestartResumer, type RootHistoryState } from "../restart-resume/restart-resumer.js";
import type { AgentOrgRunHistoryCatalogService } from "../run-history/services/agent-org-run-history-catalog-service.js";
import { getAgentRunHistoryCatalogService } from "../run-history/services/agent-run-history-catalog-service.js";
import { getTeamRunHistoryCatalogService } from "../run-history/services/team-run-history-catalog-service.js";
import type { CollaborationRootResolver } from "./collaboration-root-resolver.js";

export type RestartResume = Readonly<{ recorder: BusyRunRecorder; resumer: RestartResumer }>;

type HistoryRow = Readonly<{ terminatedAt?: string | null; archivedAt?: string | null }> | null;

/**
 * Restart resume around the process's general runs (autobyteus-285): the recorder the shutdown runs first, and the
 * resumer the startup runs after listening. Both read the process `AgentRunManager` (application scopes have their
 * own), the process root directory and the history catalogs; the resumer wakes runs only through their roots.
 */
export const composeRestartResume = (input: Readonly<{
  appDataDir: string;
  rootResolver: CollaborationRootResolver;
  orgHistory: Pick<AgentOrgRunHistoryCatalogService, "getCatalogRow">;
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
  return Object.freeze({
    recorder: new BusyRunRecorder({ liveRuns, roots: getActiveCollaborationRootDirectory(), recordPath, version: readReleaseIdentity }),
    resumer: new RestartResumer({
      recordPath, version: readReleaseIdentity, liveRuns, rootHistory, rootResolver: input.rootResolver,
    }),
  });
};
