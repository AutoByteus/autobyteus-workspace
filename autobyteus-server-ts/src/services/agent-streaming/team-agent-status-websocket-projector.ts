import {
  parseTeamStreamServerMessage,
  teamAgentStatusDtoSchema,
  type TeamAgentStatusDto,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { TeamAgentStatusSnapshot } from "../../agent-team-execution/domain/team-agent-status.js";

const projectStatusDetails = (snapshot: TeamAgentStatusSnapshot) => ({
  status: snapshot.details.status,
  trigger: snapshot.details.trigger,
  tool_name: snapshot.details.toolName,
  error_message: snapshot.details.errorMessage,
  error_details: snapshot.details.errorDetails,
});

export const projectTeamAgentStatusSnapshotDto = (
  snapshot: TeamAgentStatusSnapshot,
): TeamAgentStatusDto => teamAgentStatusDtoSchema.parse({
  agent_run_id: snapshot.execution.agentRunId,
  member_address: snapshot.execution.memberAddress,
  ...projectStatusDetails(snapshot),
});

export const projectLiveTeamAgentStatusMessage = (
  snapshot: TeamAgentStatusSnapshot,
  changeSequence: number,
): TeamStreamServerMessage => parseTeamStreamServerMessage({
  type: "AGENT_STATUS",
  payload: {
    change_sequence: changeSequence,
    agent_run_id: snapshot.execution.agentRunId,
    ...projectStatusDetails(snapshot),
  },
});
