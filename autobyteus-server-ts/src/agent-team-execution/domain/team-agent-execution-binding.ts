import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from "./team-execution-address.js";

export type TeamAgentExecutionBinding =
  | Readonly<{
      kind: "persistent_agent";
      executionAddress: TeamExecutionAddress;
    }>
  | Readonly<{
      kind: "task_agent";
      executionAddress: TeamExecutionAddress;
    }>
  | Readonly<{
      kind: "task_team_agent";
      executionAddress: TeamExecutionAddress;
      agentRunId: string;
    }>;

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required for a Team Agent execution binding.`);
  return normalized;
};

/**
 * The sole classifier for a Team Agent execution. Consumers receive the closed
 * binding and never reclassify an address or infer a missing AgentRun identity.
 */
export const createTeamAgentExecutionBinding = (input: {
  executionAddress: TeamExecutionAddress;
  agentRunId: string;
}): TeamAgentExecutionBinding => {
  const executionAddress = createTeamExecutionAddress(input.executionAddress);
  const agentRunId = required(input.agentRunId, "agentRunId");
  if (executionAddress.taskAgentRunId !== null) {
    if (executionAddress.taskAgentRunId !== agentRunId) {
      throw new Error("A task Agent execution address must carry its exact allocated AgentRun ID.");
    }
    return Object.freeze({ kind: "task_agent", executionAddress });
  }
  if (executionAddress.taskTeamRunIds.length > 0) {
    return Object.freeze({ kind: "task_team_agent", executionAddress, agentRunId });
  }
  return Object.freeze({ kind: "persistent_agent", executionAddress });
};
