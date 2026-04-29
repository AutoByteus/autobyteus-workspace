import {
  AgentRunEventType,
  isAgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../agent-team-execution/domain/team-run-event.js";

export type ParsedChannelOutputEvent = {
  eventType: AgentRunEventType;
  statusHint: string | null;
  agentRunId: string;
  teamRunId: string | null;
  memberName: string | null;
  memberRunId: string | null;
  turnId: string | null;
  text: string | null;
  textKind: ChannelOutputEventTextKind | null;
};

export type ChannelOutputEventTextKind = "STREAM_FRAGMENT" | "FINAL_TEXT";

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
    agentRunId: event.runId,
    teamRunId: null,
    memberName: null,
    memberRunId: null,
    turnId: resolveTurnIdFromPayload(event.payload),
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
  const parsedAgentEvent = parseDirectChannelOutputEvent(event.data.agentEvent);
  if (!parsedAgentEvent) {
    return null;
  }
  return {
    ...parsedAgentEvent,
    agentRunId: asNonEmptyString(event.data.memberRunId) ?? parsedAgentEvent.agentRunId,
    teamRunId: asNonEmptyString(event.teamRunId),
    memberName: asNonEmptyString(event.data.memberName),
    memberRunId: asNonEmptyString(event.data.memberRunId),
  };
};

const isTeamAgentEvent = (
  event: unknown,
): event is TeamRunEvent & {
  data: {
    memberName: string;
    memberRunId: string;
    agentEvent: unknown;
  };
} => {
  if (!event || typeof event !== "object") {
    return false;
  }
  const candidate = event as {
    eventSourceType?: unknown;
    data?: unknown;
  };
  if (candidate.eventSourceType !== TeamRunEventSourceType.AGENT) {
    return false;
  }
  return !!candidate.data && typeof candidate.data === "object";
};

const resolveTurnIdFromPayload = (
  params: Record<string, unknown>,
): string | null => {
  const turn = asObject(params.turn);
  const item = asObject(params.item);
  return (
    asNonEmptyString(params.turnId) ??
    asNonEmptyString(params.turn_id) ??
    asNonEmptyString(turn?.id) ??
    asNonEmptyString(item?.turnId) ??
    asNonEmptyString(item?.turn_id) ??
    null
  );
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
    return parsedText(
      asNonEmptyRawString(payload.delta) ??
        asNonEmptyRawString(payload.text) ??
        extractAssistantText(payload),
      "STREAM_FRAGMENT",
    );
  }

  if (eventType === AgentRunEventType.SEGMENT_END) {
    if (segmentType && segmentType !== "text") {
      return noText();
    }
    const assistantText = extractAssistantText(payload);
    return parsedText(
      (segmentType === "text" ? asNonEmptyRawString(payload.text) : null) ??
        assistantText ??
        (segmentType === "text" ? asNonEmptyRawString(payload.delta) : null),
      "FINAL_TEXT",
    );
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

const extractAssistantText = (
  params: Record<string, unknown>,
): string | null => {
  const item = asObject(params.item) ?? params;
  const kind = normalizeItemKind(item);
  if (
    !kind.includes("outputtext") &&
    !kind.includes("assistant") &&
    !kind.includes("agentmessage")
  ) {
    return null;
  }

  const fragments = [
    asNonEmptyRawString(item.text),
    asNonEmptyRawString(item.delta),
    asNonEmptyRawString(item.value),
    ...collectTextFragments(item.content),
  ].filter((value): value is string => Boolean(value));

  if (fragments.length === 0) {
    return null;
  }

  return normalizeOptionalRawString(fragments.join("\n"));
};

const normalizeItemKind = (value: Record<string, unknown>): string =>
  (
    asNonEmptyString(value.type) ??
    asNonEmptyString(value.method) ??
    asNonEmptyString(value.kind) ??
    ""
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const collectTextFragments = (value: unknown, depth = 0): string[] => {
  if (depth > 4 || value === null || value === undefined) {
    return [];
  }
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTextFragments(entry, depth + 1));
  }
  const objectValue = asObject(value);
  if (!objectValue) {
    return [];
  }
  return [
    objectValue.text,
    objectValue.content,
    objectValue.value,
    objectValue.delta,
    objectValue.summary,
  ].flatMap((entry) => collectTextFragments(entry, depth + 1));
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

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
