import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../agent-team-execution/domain/team-backend-kind.js";

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
    return definition?.category !== ToolCategory.TASK_MANAGEMENT;
  });
};
