import type { AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "./team-execution-address.js";

export type TeamLeafAgentStatusPayload = AgentStatusPayload & {
  agent_id: string;
  agent_name: string;
  execution_address: TeamExecutionAddress;
};

export type TeamLeafAgentStatusSnapshot = Readonly<{
  teamRunId: string;
  executionAddress: TeamExecutionAddress;
  payload: TeamLeafAgentStatusPayload;
}>;

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required for a team leaf Agent status snapshot.`);
  return normalized;
};

export const buildTeamLeafAgentStatusSnapshot = (input: {
  teamRunId: string;
  executionAddress: TeamExecutionAddress;
  payload: AgentStatusPayload & { agent_id: string; agent_name: string };
}): TeamLeafAgentStatusSnapshot => {
  const executionAddress = createTeamExecutionAddress(input.executionAddress);
  return Object.freeze({
    teamRunId: required(input.teamRunId, "teamRunId"),
    executionAddress,
    payload: {
      ...input.payload,
      agent_id: required(input.payload.agent_id, "agent_id"),
      agent_name: required(input.payload.agent_name, "agent_name"),
      execution_address: executionAddress,
    },
  });
};
