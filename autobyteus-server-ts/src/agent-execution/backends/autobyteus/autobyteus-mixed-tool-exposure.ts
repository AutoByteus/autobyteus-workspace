import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../agent-team-execution/domain/team-backend-kind.js";
import { TASK_DELEGATION_TOOL_NAMES } from "../../../agent-tools/task-delegation/task-delegation-tool-contract.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../agent-communication/services/send-message-to-tool-contract.js";
import { GET_HANDOFF_RULES_TOOL_NAME } from "../../../agent-communication/services/get-handoff-rules-tool-contract.js";

const LEGACY_LOCAL_TASK_PLAN_TOOL_NAMES = new Set<string>([
  "assign_task_to",
  "create_task",
  "create_tasks",
  "get_my_tasks",
  "get_task_plan_status",
  "update_task_status",
]);

const REMOVED_TASK_DELEGATION_RESULT_TOOL_NAMES = new Set<string>([
  ["mark", "task", "completed"].join("_"),
  ["mark", "task", "failed"].join("_"),
  ["accept", "task"].join("_"),
]);

export const isMixedAutoByteusStandaloneMember = (
  memberTeamContext: MemberTeamContext | null | undefined,
): boolean => memberTeamContext?.teamBackendKind === TeamBackendKind.MIXED;

export const resolveAutoByteusStandaloneToolNames = (input: {
  toolNames: Iterable<string> | null | undefined;
  memberTeamContext: MemberTeamContext | null | undefined;
}): string[] => {
  const configuredToolNames = Array.from(input.toolNames ?? []);
  if (!isMixedAutoByteusStandaloneMember(input.memberTeamContext)) {
    return configuredToolNames;
  }

  const filtered = configuredToolNames.filter((toolName) => {
    const normalizedToolName = toolName.trim();
    if (LEGACY_LOCAL_TASK_PLAN_TOOL_NAMES.has(normalizedToolName)) {
      return false;
    }
    if (REMOVED_TASK_DELEGATION_RESULT_TOOL_NAMES.has(normalizedToolName)) {
      return false;
    }
    if (TASK_DELEGATION_TOOL_NAMES.has(normalizedToolName)) {
      return true;
    }

    const definition = defaultToolRegistry.getToolDefinition(normalizedToolName);
    return definition?.category !== ToolCategory.TASK_MANAGEMENT;
  });
  return [...new Set([...filtered, SEND_MESSAGE_TO_TOOL_NAME, GET_HANDOFF_RULES_TOOL_NAME])];
};
