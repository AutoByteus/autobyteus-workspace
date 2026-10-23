import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import { parseTeamStreamServerMessage, type TeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import { projectRemoteTaskExecution, projectRemoteTaskExecutionSummary } from "./remote-task-execution-dto-projection.js";

/**
 * A remote child's presentation message on the Team stream (autobyteus-278): the Team stream's agent messages are
 * the presentation bodies with the sequence and the agent run (a member input names its recipient). A usage summary
 * belongs to the remote run, not to this Team run.
 */
const teamAgentMessageOf = (agentRunId: string, message: AgentPresentationMessage, changeSequence: number): TeamStreamServerMessage => {
  if (message.type === "MEMBER_INPUT_MESSAGE") {
    return parseTeamStreamServerMessage({ type: message.type, payload: { change_sequence: changeSequence, recipient_agent_run_id: agentRunId, ...message.payload } });
  }
  if (message.type === "TOKEN_USAGE_UPDATED") {
    const summary = message.payload.run_summary_after_event;
    return parseTeamStreamServerMessage({ type: message.type, payload: { ...message.payload, change_sequence: changeSequence, agent_run_id: agentRunId,
      run_summary_after_event: summary ? { ...summary, root_team_run_id: null } : null } });
  }
  return parseTeamStreamServerMessage({ type: message.type, payload: { ...message.payload, change_sequence: changeSequence, agent_run_id: agentRunId } });
};

/** A Team root's remote-children event (N-402: the one place a remote child's output becomes a Team agent message). */
export const projectTeamRemoteEvent = (event: RemoteRunRootEvent, changeSequence: number): TeamStreamServerMessage => {
  switch (event.kind) {
    case "remote_agent_presentation":
      return teamAgentMessageOf(event.agentRunId, event.message, changeSequence);
    case "remote_task_execution_summary":
      return parseTeamStreamServerMessage({ type: "REMOTE_TASK_EXECUTION_SUMMARY", payload: {
        change_sequence: changeSequence, ...projectRemoteTaskExecutionSummary(event.summary),
      } });
    case "remote_task_execution_started":
      return parseTeamStreamServerMessage({ type: "REMOTE_TASK_EXECUTION_STARTED", payload: {
        change_sequence: changeSequence, execution: projectRemoteTaskExecution(event.execution),
      } });
  }
};
