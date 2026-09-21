import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunEvent, AgentRunStatusHint } from "../../../agent-execution/domain/agent-run-event.js";
import {
  normalizeAgentApiStatus,
  type AgentApiStatus,
} from "../../../agent-execution/domain/agent-status-payload.js";
import {
  cloneCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "./root-execution-identity.js";

export type CollaborationAgentStatusDetails = Readonly<{
  status: AgentApiStatus;
  trigger: string | null;
  errorMessage: string | null;
}>;

export type CollaborationAgentStatusSnapshot = Readonly<{
  execution: CollaborationMemberExecutionIdentity;
  details: CollaborationAgentStatusDetails;
  statusHint: AgentRunStatusHint;
}>;

export type CollaborationAgentExecutionEvent =
  | Readonly<{ kind: "agent_run"; event: AgentRunEvent }>
  | Readonly<{ kind: "member_input"; message: AgentInputUserMessage; receivedAt?: string | null }>
  | Readonly<{ kind: "status_overlay"; snapshot: CollaborationAgentStatusSnapshot }>
  | Readonly<{ kind: "readiness_failure"; code: string; message: string }>;

export const createCollaborationAgentStatusSnapshot = (input: {
  execution: CollaborationMemberExecutionIdentity;
  status: unknown;
  trigger?: string | null;
  errorMessage?: string | null;
}): CollaborationAgentStatusSnapshot => {
  const status = normalizeAgentApiStatus(input.status);
  return Object.freeze({
    execution: cloneCollaborationMemberExecutionIdentity(input.execution),
    details: Object.freeze({
      status,
      trigger: input.trigger?.trim() || null,
      errorMessage: input.errorMessage?.trim() || null,
    }),
    statusHint: status === "error"
      ? "ERROR"
      : status === "running" || status === "initializing"
        ? "ACTIVE"
        : status === "idle" || status === "offline"
          ? "IDLE"
          : null,
  });
};
