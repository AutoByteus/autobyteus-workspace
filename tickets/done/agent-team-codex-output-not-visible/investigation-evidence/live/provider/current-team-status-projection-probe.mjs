import { createTeamAgentExecutionBinding } from "../../../../../../autobyteus-server-ts/dist/agent-team-execution/domain/team-agent-execution-binding.js";
import {
  createTeamAgentStatusDetails,
  createTeamAgentStatusSnapshot,
} from "../../../../../../autobyteus-server-ts/dist/agent-team-execution/domain/team-agent-status.js";
import {
  projectTeamAgentStatusDto,
  projectTeamAgentStatusMessage,
} from "../../../../../../autobyteus-server-ts/dist/services/agent-streaming/team-agent-event-websocket-projector.js";

const snapshot = createTeamAgentStatusSnapshot({
  execution: createTeamAgentExecutionBinding({
    rootTeamRunId: "team-run-proof",
    memberAddress: "/professor",
    agentRunId: "professor-run-proof",
  }),
  details: createTeamAgentStatusDetails({
    status: "running",
    trigger: "turn_started",
  }),
});

const snapshotDto = projectTeamAgentStatusDto(snapshot);
let liveProjection;
try {
  liveProjection = {
    accepted: true,
    message: projectTeamAgentStatusMessage(snapshot, 1),
  };
} catch (error) {
  liveProjection = {
    accepted: false,
    error: String(error),
  };
}

console.log(JSON.stringify({ snapshotDto, liveProjection }, null, 2));
if (liveProjection.accepted) process.exitCode = 1;
