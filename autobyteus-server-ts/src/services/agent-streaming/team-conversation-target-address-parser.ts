import type { ConversationTargetAddress } from "../../agent-team-execution/domain/conversation-target-address.js";
import {
  SEND_MESSAGE_INVALID_TARGET_MESSAGE,
  hasInvalidCommandSelectorFields,
} from "./team-command-selector-parser.js";
import {
  PARENT_TEAM_RUN_ID_KEYS,
  buildFlatConversationTargetAddress,
  hasFlatStructuralSelector,
  parseNestedAddress,
  readNestedAddressRecord,
  readString,
  resolveFlatSelector,
} from "./team-conversation-target-address-payload.js";

export type SendMessageConversationTargetAddressParseResult =
  | { ok: true; address: ConversationTargetAddress }
  | { ok: false; message: string };

const validateParentTeamRunId = (
  address: ConversationTargetAddress,
  payload: Record<string, unknown>,
  sessionTeamRunId: string,
): SendMessageConversationTargetAddressParseResult | null => {
  const payloadParentTeamRunId = readString(payload, PARENT_TEAM_RUN_ID_KEYS);
  const parentTeamRunId = address.parentTeamRunId ?? payloadParentTeamRunId;
  if (parentTeamRunId && parentTeamRunId !== sessionTeamRunId) {
    return {
      ok: false,
      message: `SEND_MESSAGE parentTeamRunId '${parentTeamRunId}' does not match websocket team run '${sessionTeamRunId}'.`,
    };
  }
  return null;
};

const validateSegmentOrder = (
  address: ConversationTargetAddress,
): SendMessageConversationTargetAddressParseResult | null => {
  const [first] = address.segments;
  if (!first || first.kind !== "member") {
    return { ok: false, message: "SEND_MESSAGE conversation target must start with a member segment." };
  }
  for (let index = 0; index < address.segments.length; index += 1) {
    const segment = address.segments[index];
    if (segment.kind !== "task_agent") continue;
    if (index !== address.segments.length - 1) {
      return { ok: false, message: "SEND_MESSAGE task_agent segment must be terminal." };
    }
    if (address.segments[index - 1]?.kind !== "member") {
      return { ok: false, message: "SEND_MESSAGE task_agent segment must follow a member segment." };
    }
  }
  for (let index = 0; index < address.segments.length; index += 1) {
    const segment = address.segments[index];
    if (segment.kind === "task_team" && address.segments[index - 1]?.kind !== "member") {
      return { ok: false, message: "SEND_MESSAGE task_team segment must follow a member segment." };
    }
  }
  return null;
};

const parsePayloadAddress = (payload: Record<string, unknown>): ConversationTargetAddress => {
  const nestedAddress = readNestedAddressRecord(payload);
  if (nestedAddress && hasFlatStructuralSelector(payload)) {
    throw new Error("SEND_MESSAGE target cannot mix conversation_target_address with flat target_member_* selectors.");
  }
  if (nestedAddress) return parseNestedAddress(nestedAddress);
  const selector = resolveFlatSelector(payload);
  if (!selector) throw new Error(SEND_MESSAGE_INVALID_TARGET_MESSAGE);
  return buildFlatConversationTargetAddress(selector);
};

export const resolveSendMessageConversationTargetAddress = (
  payload: Record<string, unknown>,
  sessionTeamRunId: string,
): SendMessageConversationTargetAddressParseResult => {
  try {
    if (hasInvalidCommandSelectorFields(payload)) {
      return { ok: false, message: SEND_MESSAGE_INVALID_TARGET_MESSAGE };
    }
    const address = parsePayloadAddress(payload);
    const parentValidation = validateParentTeamRunId(address, payload, sessionTeamRunId);
    if (parentValidation) return parentValidation;
    const orderValidation = validateSegmentOrder(address);
    if (orderValidation) return orderValidation;
    return { ok: true, address };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
};
