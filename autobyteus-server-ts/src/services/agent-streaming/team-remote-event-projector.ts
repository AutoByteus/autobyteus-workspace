import { parseTeamStreamServerMessage, type TeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import { projectRemoteTaskExecutionSummary } from "./remote-task-execution-dto-projection.js";

/** A Team root's peer rows' summary event (SR-066); a run's status is its own (SR-083). */
export const projectTeamRemoteEvent = (event: RemoteRunRootEvent, changeSequence: number): TeamStreamServerMessage =>
  parseTeamStreamServerMessage({ type: "REMOTE_TASK_EXECUTION_SUMMARY", payload: {
    change_sequence: changeSequence, ...projectRemoteTaskExecutionSummary(event.summary),
  } });
