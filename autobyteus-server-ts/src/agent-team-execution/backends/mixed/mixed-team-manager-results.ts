import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";

export const isAgentOperationResult = (value: object): value is AgentOperationResult =>
  "accepted" in value;

export const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});

export const buildTargetMemberRunMismatchResult = (
  routeKey: string,
  runId: string,
): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_RUN_MISMATCH",
  message: `Team member route key '${routeKey}' does not match member run '${runId}'.`,
});

export const buildTargetMemberNotFoundResult = (routeKey: string): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_FOUND",
  message: `Team member route key '${routeKey}' was not found.`,
});

export const buildTargetMemberRunInactiveResult = (routeKey: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Team member route key '${routeKey}' is not active.`,
});
