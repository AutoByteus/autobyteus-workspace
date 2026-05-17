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

  let hasRunningMember = false;
  let hasInitializingMember = false;
  let hasIdleMember = false;
  let hasErrorMember = false;
  for (const memberStatus of input.memberStatuses) {
    if (memberStatus.status === "error") {
      hasErrorMember = true;
    }
    if (memberStatus.status === "running") {
      hasRunningMember = true;
    }
    if (memberStatus.status === "initializing") {
      hasInitializingMember = true;
    }
    if (memberStatus.status === "idle") {
      hasIdleMember = true;
    }
  }

  if (hasRunningMember || nativeStatus === "running") {
    return "running";
  }
  if (hasInitializingMember || nativeStatus === "initializing") {
    return "initializing";
  }
  if (hasErrorMember || nativeStatus === "error") {
    return "error";
  }
  if (hasIdleMember || nativeStatus === "idle") {
    return "idle";
  }
  return "offline";
}
