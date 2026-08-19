import type { AgentRunStatusHint } from "../../agent-execution/domain/agent-run-event.js";
import {
  normalizeAgentApiStatus,
  type AgentApiStatus,
} from "../../agent-execution/domain/agent-status-payload.js";
import type { TeamAgentExecutionBinding } from "./team-agent-execution-binding.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "./team-run-event.js";

export type TeamAgentStatusDetails = Readonly<{
  status: AgentApiStatus;
  trigger: string | null;
  toolName: string | null;
  errorMessage: string | null;
  errorDetails: string | null;
}>;

export type TeamAgentStatusSnapshot = Readonly<{
  execution: TeamAgentExecutionBinding;
  details: TeamAgentStatusDetails;
  statusHint: AgentRunStatusHint;
}>;

const nullableText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const deriveTeamAgentStatusHint = (status: AgentApiStatus): AgentRunStatusHint => {
  if (status === "error") return "ERROR";
  if (status === "running" || status === "initializing") return "ACTIVE";
  if (status === "idle" || status === "offline") return "IDLE";
  return null;
};

export const createTeamAgentStatusDetails = (input: {
  status: unknown;
  trigger?: unknown;
  toolName?: unknown;
  errorMessage?: unknown;
  errorDetails?: unknown;
}): TeamAgentStatusDetails => Object.freeze({
  status: normalizeAgentApiStatus(input.status),
  trigger: nullableText(input.trigger),
  toolName: nullableText(input.toolName),
  errorMessage: nullableText(input.errorMessage),
  errorDetails: nullableText(input.errorDetails),
});

export const createTeamAgentStatusSnapshot = (input: {
  execution: TeamAgentExecutionBinding;
  details: TeamAgentStatusDetails;
  statusHint?: AgentRunStatusHint;
}): TeamAgentStatusSnapshot => Object.freeze({
  execution: input.execution,
  details: input.details,
  statusHint: input.statusHint === undefined
    ? deriveTeamAgentStatusHint(input.details.status)
    : input.statusHint,
});

export const createTeamAgentStatusEvent = (snapshot: TeamAgentStatusSnapshot): TeamRunEvent => Object.freeze({
  eventSourceType: TeamRunEventSourceType.AGENT,
  execution: snapshot.execution,
  payload: Object.freeze({
    eventType: "AGENT_STATUS" as const,
    details: snapshot.details,
    statusHint: snapshot.statusHint,
  }),
});
