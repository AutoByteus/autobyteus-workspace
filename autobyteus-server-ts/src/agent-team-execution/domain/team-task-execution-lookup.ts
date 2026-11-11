import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type {
  RootConfiguredTeamExecutionNode,
  TaskExecution,
  TaskTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "./team-run-execution-tree.js";

/** A task execution of a Team run's tree with the Team run that hosts it (its parent in the tree). */
export type LocatedTeamTaskExecution = Readonly<{ parentTeamRunId: string; execution: TaskExecution }>;

/** The task execution with this reference in the tree, at any depth, with its host Team run; `null` when it is not there. */
export const findTeamTaskExecution = (
  tree: TeamRunExecutionTreeSnapshot,
  reference: TaskExecutionReference,
): LocatedTeamTaskExecution | null => {
  const visit = (team: RootConfiguredTeamExecutionNode | TaskTeamExecution): LocatedTeamTaskExecution | null => {
    const own = team.taskExecutions.find((execution) =>
      "agentRunId" in reference
        ? "agentRunId" in execution && execution.agentRunId === reference.agentRunId
        : "teamRunId" in execution && execution.teamRunId === reference.teamRunId);
    if (own) return { parentTeamRunId: team.teamRunId, execution: own };
    for (const task of team.taskExecutions) {
      if ("teamRunId" in task) {
        const found = visit(task);
        if (found) return found;
      }
    }
    return null;
  };
  return visit(tree.rootTeam);
};
