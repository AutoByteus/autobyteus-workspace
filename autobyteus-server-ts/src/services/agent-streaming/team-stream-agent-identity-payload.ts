import type { TeamLeafAgentStatusSnapshot } from "../../agent-team-execution/domain/team-leaf-agent-status-snapshot.js";
import { ServerMessage, ServerMessageType } from "./models.js";

export const mapTeamLeafAgentStatusSnapshot = (
  snapshot: TeamLeafAgentStatusSnapshot,
): ServerMessage => new ServerMessage(ServerMessageType.AGENT_STATUS, {
  ...snapshot.payload,
  execution_address: snapshot.executionAddress,
});
