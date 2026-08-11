import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";

export const isAgentOperationResult = (value: object): value is AgentOperationResult =>
  "accepted" in value;

export const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});
