import { createTeamRootExecutionIdentity } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamRunHistoryItem } from "../../../run-history/domain/team-run-history-index-types.js";
import { projectTeamTaskExecutions } from "../../../services/agent-streaming/team-execution-view-projector.js";
import { getStudioRunViewChildren } from "../studio-application-api-services.js";

type Grouped = Readonly<{ teamDefinitions: readonly Readonly<{ runs: readonly TeamRunHistoryItem[] }>[] }>;

/**
 * A listed Team run's history item with its rows in `rootTeam.task_executions`, as at base, where its delegated runs were
 * in its tree (autobyteus-461 rule 3, story 5.2's characterization; the Org's history read does the same). The rows are
 * its view's, from its collaboration tree, nested by placement.
 */
export const withTeamRows = async <G extends Grouped>(group: G): Promise<G> => ({
  ...group,
  teamDefinitions: await Promise.all(group.teamDefinitions.map(async (definition) => ({
    ...definition,
    runs: await Promise.all(definition.runs.map(async (run) => {
      const { rows } = await getStudioRunViewChildren().read(createTeamRootExecutionIdentity(run.teamRunId));
      return { ...run, rootTeam: { ...(run.rootTeam as object), task_executions: projectTeamTaskExecutions(rows.taskExecutions) } };
    })),
  }))),
});
