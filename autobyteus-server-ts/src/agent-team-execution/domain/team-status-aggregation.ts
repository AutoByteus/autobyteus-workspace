import {
  normalizeAgentApiStatus,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../../agent-execution/domain/agent-status-payload.js";

const normalizeToken = (value: unknown): string | null =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/[-\s]+/g, "_") || null
    : null;

const INTERNAL_TEAM_STARTUP_STATUS_TOKENS = new Set([
  "bootstrapping",
  "starting",
  "startup",
  "uninitialized",
]);

const normalizeInternalTeamStatus = (value: unknown): AgentApiStatus =>
  INTERNAL_TEAM_STARTUP_STATUS_TOKENS.has(normalizeToken(value) ?? "")
    ? "initializing"
    : normalizeAgentApiStatus(value, "offline");

export function deriveTeamApiStatus(input: {
  memberStatuses: Array<Pick<AgentStatusPayload, "status">>;
  nativeTeamStatus?: unknown;
}): AgentApiStatus {
  const nativeStatus = normalizeInternalTeamStatus(input.nativeTeamStatus);

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
