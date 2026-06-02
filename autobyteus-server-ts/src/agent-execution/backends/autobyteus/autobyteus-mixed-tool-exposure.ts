import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../agent-team-execution/domain/team-backend-kind.js";
import { TASK_DELEGATION_TOOL_NAMES } from "../../../agent-tools/task-delegation/task-delegation-tool-contract.js";

const LEGACY_LOCAL_TASK_TOOL_NAMES = new Set([
  "assign_task_to",
  "create_task",
  "create_tasks",
  "get_my_tasks",
  "get_task_plan_status",
  "update_task_status",
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

  return configuredToolNames.filter((toolName) => {
    const definition = defaultToolRegistry.getToolDefinition(toolName);
    if (LEGACY_LOCAL_TASK_TOOL_NAMES.has(toolName)) {
      return false;
    }
    return definition?.category !== ToolCategory.TASK_MANAGEMENT || TASK_DELEGATION_TOOL_NAMES.has(toolName);
  });
};
