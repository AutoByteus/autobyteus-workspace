import type { JsonObject } from "../codex-app-server-json.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";

export const CODEX_ACTIVE_TURN_INHERITANCE_EVENTS = Object.freeze([
  CodexThreadEventName.ITEM_STARTED,
  CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
  CodexThreadEventName.ITEM_COMPLETED,
  CodexThreadEventName.ITEM_REASONING_COMPLETED,
] as const);

const governedEventNames = new Set<string>(CODEX_ACTIVE_TURN_INHERITANCE_EVENTS);

export type CodexSegmentTurnRejectionReason =
  | "CODEX_SEGMENT_TURN_EXPLICIT_INVALID"
  | "CODEX_SEGMENT_TURN_INACTIVE"
  | "CODEX_SEGMENT_TURN_CONFLICT"
  | "CODEX_SEGMENT_TURN_OMISSION_UNLISTED";

export type CodexSegmentTurnAdmission =
  | Readonly<{
      accepted: true;
      turnId: string;
      paramsWithExactTurn: Readonly<JsonObject>;
      source: "explicit" | "active_inheritance";
    }>
  | Readonly<{
      accepted: false;
      reason: CodexSegmentTurnRejectionReason;
    }>;

type Candidate = Readonly<{ present: boolean; value: unknown }>;

const hasOwn = (value: JsonObject, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const asObject = (value: unknown): JsonObject | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;

const candidate = (owner: JsonObject | null, key: string): Candidate =>
  owner && hasOwn(owner, key)
    ? Object.freeze({ present: true, value: owner[key] })
    : Object.freeze({ present: false, value: undefined });

const reject = (reason: CodexSegmentTurnRejectionReason): CodexSegmentTurnAdmission =>
  Object.freeze({ accepted: false, reason });

export const isCodexSegmentTurnAdmissionEventName = (eventName: string): boolean =>
  governedEventNames.has(eventName);

export const resolveCodexSegmentTurnAdmission = (
  nativeEventName: string,
  params: JsonObject,
  activeTurnId: string | null,
): CodexSegmentTurnAdmission => {
  const item = asObject(params.item);
  const turn = asObject(params.turn);
  const candidates = [
    candidate(params, "turn_id"),
    candidate(params, "turnId"),
    candidate(item, "turn_id"),
    candidate(item, "turnId"),
    candidate(turn, "id"),
  ].filter((entry) => entry.present);

  const explicitTurnIds: string[] = [];
  for (const entry of candidates) {
    if (typeof entry.value !== "string" || entry.value.trim().length === 0) {
      return reject("CODEX_SEGMENT_TURN_EXPLICIT_INVALID");
    }
    explicitTurnIds.push(entry.value.trim());
  }

  const normalizedActiveTurnId = activeTurnId?.trim() ?? "";
  if (!normalizedActiveTurnId) {
    return reject("CODEX_SEGMENT_TURN_INACTIVE");
  }

  if (
    explicitTurnIds.some((turnId) => turnId !== normalizedActiveTurnId) ||
    new Set(explicitTurnIds).size > 1
  ) {
    return reject("CODEX_SEGMENT_TURN_CONFLICT");
  }

  if (
    explicitTurnIds.length === 0 &&
    !isCodexSegmentTurnAdmissionEventName(nativeEventName)
  ) {
    return reject("CODEX_SEGMENT_TURN_OMISSION_UNLISTED");
  }

  return Object.freeze({
    accepted: true,
    turnId: normalizedActiveTurnId,
    paramsWithExactTurn: Object.freeze({
      ...params,
      turn_id: normalizedActiveTurnId,
    }),
    source: explicitTurnIds.length > 0 ? "explicit" : "active_inheritance",
  });
};
