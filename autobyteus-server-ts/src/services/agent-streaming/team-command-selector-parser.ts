import type { TeamMemberSelector } from "../../agent-team-execution/domain/team-run-member-identity.js";
import { resolveTeamMemberSelectorFromPayload } from "./team-member-selector-payload-adapter.js";

export const TEAM_COMMAND_INVALID_TARGET_CODE = "INVALID_TARGET";

export const SEND_MESSAGE_INVALID_TARGET_MESSAGE =
  "SEND_MESSAGE target must use target_member_path/targetMemberPath or target_member_route_key/targetMemberRouteKey.";

export const TOOL_APPROVAL_INVALID_TARGET_MESSAGE =
  "Tool approval target must use path or route selector fields; scalar name/id target fields are not supported.";

export const TOOL_APPROVAL_MISSING_TARGET_MESSAGE =
  "Tool approval target missing; include member/source/target path or route selector fields.";

export const INTERRUPT_GENERATION_INVALID_TARGET_MESSAGE =
  "INTERRUPT_GENERATION target must use target_member_path/targetMemberPath or target_member_route_key/targetMemberRouteKey.";

export const INTERRUPT_GENERATION_MISSING_TARGET_MESSAGE =
  "INTERRUPT_GENERATION target missing; include target_member_path/targetMemberPath or target_member_route_key/targetMemberRouteKey.";

const COMMAND_SCALAR_SELECTOR_KEYS = [
  "agent_id",
  "agent_name",
  "agentId",
  "agentName",
  "member_id",
  "member_name",
  "memberId",
  "memberName",
  "target_agent_id",
  "target_agent_name",
  "target_member_id",
  "target_member_name",
  "targetAgentId",
  "targetAgentName",
  "targetMemberId",
  "targetMemberName",
];

export const hasInvalidCommandSelectorFields = (
  payload: Record<string, unknown>,
): boolean => COMMAND_SCALAR_SELECTOR_KEYS.some(
  (key) => payload[key] !== undefined && payload[key] !== null,
);

export const resolveSendMessageTargetSelector = (
  payload: Record<string, unknown>,
): TeamMemberSelector | null => resolveTeamMemberSelectorFromPayload(payload, {
  pathKeys: ["target_member_path", "targetMemberPath"],
  routeKeyKeys: ["target_member_route_key", "targetMemberRouteKey"],
});

export const resolveToolApprovalTargetSelector = (
  payload: Record<string, unknown>,
): TeamMemberSelector | null => resolveTeamMemberSelectorFromPayload(payload, {
  pathKeys: [
    "source_path",
    "sourcePath",
    "member_path",
    "memberPath",
    "target_member_path",
    "targetMemberPath",
  ],
  routeKeyKeys: [
    "source_route_key",
    "sourceRouteKey",
    "member_route_key",
    "memberRouteKey",
    "target_member_route_key",
    "targetMemberRouteKey",
  ],
});

export const resolveInterruptGenerationTargetSelector = (
  payload: Record<string, unknown>,
): TeamMemberSelector | null => resolveTeamMemberSelectorFromPayload(payload, {
  pathKeys: ["target_member_path", "targetMemberPath"],
  routeKeyKeys: ["target_member_route_key", "targetMemberRouteKey"],
});

export const resolveInterruptGenerationTargetRunId = (
  payload: Record<string, unknown>,
): string | null => {
  for (const key of ["target_member_run_id", "targetMemberRunId"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};
