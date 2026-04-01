import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../agent-team-execution/domain/team-run-event.js";
import type { ChannelSourceContext } from "../domain/models.js";
import {
  ChannelTurnReplyRecoveryService,
  getChannelTurnReplyRecoveryService,
} from "../services/channel-turn-reply-recovery-service.js";

export const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export const PENDING_TURN_TTL_MS = 10 * 60 * 1000;

export type ChannelReplyBridgeDependencies = {
  turnReplyRecoveryService?: ChannelTurnReplyRecoveryService;
};

export const resolveChannelReplyBridgeDependencies = (
  deps: ChannelReplyBridgeDependencies,
): {
  turnReplyRecoveryService: ChannelTurnReplyRecoveryService;
} => ({
  turnReplyRecoveryService:
    deps.turnReplyRecoveryService ?? getChannelTurnReplyRecoveryService(),
});

export type ChannelTurnObservationClosedReason =
  | "TURN_ID_MISSING"
  | "EMPTY_REPLY"
  | "ERROR"
  | "TIMEOUT";

export type ChannelReplyReadyObservation = {
  agentRunId: string;
  teamRunId: string | null;
  turnId: string;
  source: ChannelSourceContext;
  replyText: string;
};

export type ChannelTurnObservationResult =
  | {
      status: "REPLY_READY";
      reply: ChannelReplyReadyObservation;
    }
  | {
      status: "CLOSED";
      reason: ChannelTurnObservationClosedReason;
    };

export type ParsedAgentRuntimeEvent = {
  eventType: AgentRunEventType;
  statusHint: string | null;
  turnId: string | null;
  text: string | null;
};

export type ParsedTeamAgentRuntimeEvent = ParsedAgentRuntimeEvent & {
  memberName: string | null;
  memberRunId: string | null;
};

export const parseDirectAgentRunEvent = (
  event: unknown,
): ParsedAgentRuntimeEvent | null => {
  if (!isAgentRunEvent(event)) {
    return null;
  }
  return {
    eventType: event.eventType,
    statusHint: event.statusHint ?? null,
    turnId: resolveTurnIdFromPayload(event.payload),
    text: resolveAgentRunEventText(event.eventType, event.payload),
  };
};

export const parseTeamAgentRunEvent = (
  event: unknown,
): ParsedTeamAgentRuntimeEvent | null => {
  if (!isTeamAgentEvent(event)) {
    return null;
  }
  const parsedAgentEvent = parseDirectAgentRunEvent(event.data.agentEvent);
  if (!parsedAgentEvent) {
    return null;
  }
  return {
    ...parsedAgentEvent,
    memberName: asNonEmptyString(event.data.memberName),
    memberRunId: asNonEmptyString(event.data.memberRunId),
  };
};

export const buildPendingTurnKey = (runId: string, turnId: string): string =>
  `${runId}:${turnId}`;

export const buildCallbackIdempotencyKey = (runId: string, turnId: string): string =>
  `external-reply:${runId}:${turnId}`;

export const mergeAssistantText = (current: string, incoming: string): string => {
  const normalizedIncoming = normalizeOptionalRawString(incoming);
  if (!normalizedIncoming) {
    return current;
  }
  if (!current) {
    return normalizedIncoming;
  }
  if (normalizedIncoming === current) {
    return current;
  }
  if (normalizedIncoming.startsWith(current)) {
    return normalizedIncoming;
  }
  if (current.startsWith(normalizedIncoming)) {
    return current;
  }
  return `${current}${normalizedIncoming}`;
};

export const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toSourceContext = (
  envelope: ExternalMessageEnvelope,
): ChannelSourceContext => ({
  provider: envelope.provider,
  transport: envelope.transport,
  accountId: envelope.accountId,
  peerId: envelope.peerId,
  threadId: envelope.threadId,
  externalMessageId: envelope.externalMessageId,
  receivedAt: normalizeDateOrNow(envelope.receivedAt),
  turnId: null,
});

export const resolveReplyTextFromTurnRecovery = async (
  turnReplyRecoveryService: ChannelTurnReplyRecoveryService,
  input: {
    agentRunId: string;
    turnId: string;
    teamRunId?: string | null;
  },
): Promise<string | null> =>
  turnReplyRecoveryService.resolveReplyText({
    agentRunId: input.agentRunId,
    turnId: input.turnId,
    teamRunId: input.teamRunId ?? null,
  });

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
): string | null => {
  const segmentType = asNonEmptyString(payload.segment_type);
  if (
    (eventType === AgentRunEventType.SEGMENT_CONTENT ||
      eventType === AgentRunEventType.SEGMENT_END) &&
    segmentType === "text"
  ) {
    return normalizeOptionalRawString(
      asNonEmptyRawString(payload.delta) ??
        asNonEmptyRawString(payload.text) ??
        extractAssistantText(payload),
    );
  }
  return null;
};

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

const normalizeDateOrNow = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};
