import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

/** A delegated child was committed to the execution tree under its host TeamRun. */
export const taskExecutionStartedEvent = (input: {
  taskExecution: TaskExecutionReference;
  parentTeamRunId: string;
}): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_EXECUTION,
  taskExecution: input.taskExecution,
  payload: {
    eventType: "TASK_EXECUTION_STARTED",
    details: { parentTeamRunId: input.parentTeamRunId },
  },
});
