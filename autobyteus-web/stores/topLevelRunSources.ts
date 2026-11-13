import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore';
import { useRunHistoryRetiredRunsStore, withoutRetiredRuns, type RunHistoryTopLevelSources } from '~/stores/runHistoryRetiredRuns';
import { flattenWorkspaceTeamRuns } from '~/stores/runHistoryStoreSupport';
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';

/**
 * The history rows and open contexts every run list builds its top-level rows from: the desktop's navigation and the
 * phone's run tree (autobyteus-461 CR-461-053). Without the runs another window or client retired, and without a
 * delegated run opened from its delegator's view (`delegatedRunsStore`): it is listed under that view, so its open
 * context joins the list only when the list itself has the run (DS-11, CR-461-044). Reads stores, so a computed that
 * calls it follows them.
 */
export const topLevelRunSources = (workspaceGroups: RunHistoryWorkspaceGroup[]): RunHistoryTopLevelSources => {
  const delegated = useDelegatedRunsStore();
  const listedAgentRuns = new Set(workspaceGroups.flatMap((workspace) => workspace.agentDefinitions.flatMap((agent) => agent.runs.map((run) => run.runId))));
  const listedTeamRuns = new Set(flattenWorkspaceTeamRuns(workspaceGroups).map((team) => team.teamRunId));
  return withoutRetiredRuns({
    workspaceGroups,
    agentContexts: new Map([...useAgentContextsStore().runs].filter(([runId]) => listedAgentRuns.has(runId) || !delegated.ownsAgentRun(runId))),
    teamContexts: (useAgentTeamContextsStore().allTeamRuns ?? []).filter((team) => {
      const teamRunId = team.view.getRootTeamRunId();
      return listedTeamRuns.has(teamRunId) || !delegated.ownsTeamRun(teamRunId);
    }),
  }, useRunHistoryRetiredRunsStore().retiredRunIds);
};
