import {
  buildConversationAddressFromMemberSelector,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetSegment,
} from "../../agent-team-execution/domain/conversation-target-address.js";
import {
  buildMemberRouteKeyFromPath,
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  selectorToRouteKey,
  type TeamMemberSelector,
} from "../../agent-team-execution/domain/team-run-member-identity.js";

export const PARENT_TEAM_RUN_ID_KEYS = ["parent_team_run_id", "parentTeamRunId"] as const;
const NESTED_ADDRESS_KEYS = ["conversation_target_address", "conversationTargetAddress"] as const;
const FLAT_ROUTE_KEYS = ["target_member_route_key", "targetMemberRouteKey"] as const;
const FLAT_PATH_KEYS = ["target_member_path", "targetMemberPath"] as const;

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
);

export const readString = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
};

const readStringArray = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string[] | null => {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) continue;
    const path = value.map((entry, index) => {
      if (typeof entry !== "string") {
        throw new Error(`${key}[${index}] must be a non-empty string.`);
      }
      const part = entry.trim();
      if (!part) {
        throw new Error(`${key}[${index}] must be a non-empty string.`);
      }
      return part;
    });
    if (path.length > 0) return path;
  }
  return null;
};

const hasAnyKey = (
  record: Record<string, unknown>,
  keys: readonly string[],
): boolean => keys.some((key) => record[key] !== undefined && record[key] !== null);

export const hasFlatStructuralSelector = (payload: Record<string, unknown>): boolean => (
  hasAnyKey(payload, FLAT_ROUTE_KEYS) || hasAnyKey(payload, FLAT_PATH_KEYS)
);

export const readNestedAddressRecord = (
  payload: Record<string, unknown>,
): Record<string, unknown> | null => {
  let found: Record<string, unknown> | null = null;
  for (const key of NESTED_ADDRESS_KEYS) {
    const value = payload[key];
    if (value === undefined || value === null) continue;
    const record = asRecord(value);
    if (!record) throw new Error("conversation_target_address must be an object.");
    if (found) throw new Error("SEND_MESSAGE target includes duplicate conversation_target_address aliases.");
    found = record;
  }
  return found;
};

export const resolveFlatSelector = (
  payload: Record<string, unknown>,
): TeamMemberSelector | null => {
  const routeKey = readString(payload, FLAT_ROUTE_KEYS);
  const path = readStringArray(payload, FLAT_PATH_KEYS);
  const pathRouteKey = path ? buildMemberRouteKeyFromPath(path) : null;
  if (routeKey && pathRouteKey) {
    const normalizedRouteKey = selectorToRouteKey(selectorFromMemberRouteKey(routeKey));
    if (normalizedRouteKey !== pathRouteKey) {
      throw new Error(`SEND_MESSAGE target route '${normalizedRouteKey}' does not match path '${pathRouteKey}'.`);
    }
  }
  if (path) return selectorFromMemberPath(path);
  return routeKey ? selectorFromMemberRouteKey(routeKey) : null;
};

const readSegmentKind = (segment: Record<string, unknown>): string | null => (
  typeof segment.kind === "string" && segment.kind.trim().length > 0 ? segment.kind.trim() : null
);

const parseSegment = (
  value: unknown,
  index: number,
): ConversationTargetSegment => {
  const segment = asRecord(value);
  if (!segment) throw new Error(`conversation_target_address.segments[${index}] must be an object.`);

  const kind = readSegmentKind(segment);
  if (kind === "member") {
    const memberRouteKey = readString(segment, ["member_route_key", "memberRouteKey"]);
    const memberPath = readStringArray(segment, ["member_path", "memberPath"]);
    return {
      kind: "member",
      ...(memberRouteKey ? { memberRouteKey } : {}),
      ...(memberPath ? { memberPath } : {}),
    };
  }
  if (kind === "task_team") {
    const taskTeamRunId = readString(segment, ["task_team_run_id", "taskTeamRunId"]);
    if (!taskTeamRunId) {
      throw new Error(`conversation_target_address.segments[${index}] task_team requires task_team_run_id.`);
    }
    return { kind: "task_team", taskTeamRunId };
  }
  if (kind === "task_agent") {
    const taskAgentRunId = readString(segment, ["task_agent_run_id", "taskAgentRunId"]);
    if (!taskAgentRunId) {
      throw new Error(`conversation_target_address.segments[${index}] task_agent requires task_agent_run_id.`);
    }
    return { kind: "task_agent", taskAgentRunId };
  }
  throw new Error(`conversation_target_address.segments[${index}] has unsupported kind '${kind ?? "<missing>"}'.`);
};

export const parseNestedAddress = (
  addressRecord: Record<string, unknown>,
): ConversationTargetAddress => {
  const rawSegments = addressRecord.segments;
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
    throw new Error("conversation_target_address.segments must be a non-empty array.");
  }
  return normalizeConversationTargetAddress({
    parentTeamRunId: readString(addressRecord, PARENT_TEAM_RUN_ID_KEYS),
    segments: rawSegments.map(parseSegment),
  });
};

export const buildFlatConversationTargetAddress = (
  selector: TeamMemberSelector,
): ConversationTargetAddress => normalizeConversationTargetAddress(
  buildConversationAddressFromMemberSelector(selector),
);
