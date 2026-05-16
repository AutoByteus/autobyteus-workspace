import {
  normalizeAgentApiStatus,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../../agent-execution/domain/agent-status-payload.js";

export function deriveTeamApiStatus(input: {
  memberStatuses: Array<Pick<AgentStatusPayload, "status">>;
  nativeTeamStatus?: unknown;
}): AgentApiStatus {
  const nativeStatus = normalizeAgentApiStatus(input.nativeTeamStatus, "offline");
  if (nativeStatus === "error") {
    return "error";
  }

  let hasRunningMember = false;
  let hasIdleMember = false;
  for (const memberStatus of input.memberStatuses) {
    if (memberStatus.status === "error") {
      return "error";
    }
    if (memberStatus.status === "running") {
      hasRunningMember = true;
    }
    if (memberStatus.status === "idle") {
      hasIdleMember = true;
    }
  }

  if (hasRunningMember || nativeStatus === "running") {
    return "running";
  }
  if (hasIdleMember || nativeStatus === "idle") {
    return "idle";
  }
  return "offline";
}
