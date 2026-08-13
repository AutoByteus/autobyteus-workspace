import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import {
  resolveAgentRunErrorEvidence,
  type AgentRunErrorEvidence,
} from "../../agent-execution/domain/agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "../../agent-execution/domain/agent-run-event-turn-id.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";

export type ParsedChannelOutputEvent = {
  eventType: AgentRunEventType;
  statusHint: string | null;
  errorEvidence: AgentRunErrorEvidence | null;
  agentRunId: string;
  teamRunId: string | null;
  executionAddress: TeamExecutionAddress | null;
  turnId: string | null;
  text: string | null;
  textKind: ChannelOutputEventTextKind | null;
};

export type ChannelOutputEventTextKind = "STREAM_FRAGMENT";

export const parseDirectChannelOutputEvent = (
  event: unknown,
): ParsedChannelOutputEvent | null => {
  if (!isAgentRunEvent(event)) {
    return null;
  }
  const text = resolveAgentRunEventText(event.eventType, event.payload);
  return {
    eventType: event.eventType,
    statusHint: event.statusHint ?? null,
    errorEvidence: resolveAgentRunErrorEvidence(event),
    agentRunId: event.runId,
    teamRunId: null,
    executionAddress: null,
    turnId: resolveAgentRunEventTurnId(event),
    text: text.text,
    textKind: text.kind,
  };
};

export const parseTeamChannelOutputEvent = (
  event: unknown,
): ParsedChannelOutputEvent | null => {
  if (!isTeamAgentEvent(event)) {
    return null;
  }
  const payload = event.payload;
  const address = event.execution.executionAddress;
  const text = payload.eventType === "SEGMENT_CONTENT"
    && payload.details.segmentType === "text"
    ? { text: payload.details.delta, kind: "STREAM_FRAGMENT" as const }
    : { text: null, kind: null };
  const turnId = "turnId" in payload.details ? payload.details.turnId : null;
  return {
    eventType: payload.eventType as AgentRunEventType,
    statusHint: payload.statusHint,
    errorEvidence: payload.eventType === "ERROR"
      ? payload.details.errorEffect === "diagnostic"
        ? payload.details.errorScope === "turn" && payload.details.turnId
          ? { kind: "TURN_DIAGNOSTIC", turnId: payload.details.turnId }
          : null
        : payload.details.errorEffect === "terminal"
          ? payload.details.errorScope === "turn" && payload.details.turnId
            ? { kind: "TURN_TERMINAL", turnId: payload.details.turnId }
            : payload.details.errorScope === "runtime" && payload.details.turnId === null
              ? { kind: "RUNTIME_GLOBAL" }
              : null
          : null
      : null,
    agentRunId: event.execution.kind === "task_team_agent"
      ? event.execution.agentRunId
      : address.taskAgentRunId ?? address.memberAddress,
    teamRunId: address.rootTeamRunId,
    executionAddress: address,
    turnId,
    text: text.text,
    textKind: text.kind,
  };
};

const isTeamAgentEvent = (
  event: unknown,
): event is Extract<TeamRunEvent, { eventSourceType: TeamRunEventSourceType.AGENT }> => {
  if (!event || typeof event !== "object") {
    return false;
  }
  const candidate = event as {
    eventSourceType?: unknown;
    execution?: unknown;
    payload?: unknown;
  };
  if (candidate.eventSourceType !== TeamRunEventSourceType.AGENT) {
    return false;
  }
  return !!candidate.execution && typeof candidate.execution === "object" &&
    !!candidate.payload && typeof candidate.payload === "object";
};

const resolveAgentRunEventText = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): { text: string | null; kind: ChannelOutputEventTextKind | null } => {
  const segmentType = asNonEmptyString(payload.segment_type);
  if (eventType === AgentRunEventType.SEGMENT_CONTENT) {
    if (segmentType !== "text") {
      return noText();
    }
    return parsedText(asNonEmptyRawString(payload.delta), "STREAM_FRAGMENT");
  }

  return noText();
};

const parsedText = (
  text: string | null,
  kind: ChannelOutputEventTextKind,
): { text: string | null; kind: ChannelOutputEventTextKind | null } => {
  const normalized = normalizeOptionalRawString(text);
  return {
    text: normalized,
    kind: normalized ? kind : null,
  };
};

const noText = (): { text: null; kind: null } => ({ text: null, kind: null });

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNonEmptyRawString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const normalizeOptionalRawString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim().length > 0 ? value : null;
};
