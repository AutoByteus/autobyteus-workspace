import {
  normalizeAgentApiStatus,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../../agent-execution/domain/agent-status-payload.js";

export function deriveTeamApiStatus(input: {
  memberStatuses: Array<Pick<AgentStatusPayload, "status">>;
  nativeTeamStatus?: unknown;
}): AgentApiStatus {
  const nativeStatus = normalizeAgentApiStatus(input.nativeTeamStatus, "idle");
  if (nativeStatus === "error") {
    return "error";
  }

  let hasRunningMember = false;
  for (const memberStatus of input.memberStatuses) {
    if (memberStatus.status === "error") {
      return "error";
    }
    if (memberStatus.status === "running") {
      hasRunningMember = true;
    }
  }

  if (hasRunningMember || nativeStatus === "running") {
    return "running";
  }
  return "idle";
}
