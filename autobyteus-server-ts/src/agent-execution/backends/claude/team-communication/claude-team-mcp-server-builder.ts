import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { buildClaudeTaskDelegationToolDefinitions } from "../task-delegation/build-claude-task-delegation-tool-definitions.js";

export const buildClaudeTeamMcpServers = async (options: {
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  enabledTaskDelegationToolNames?: Iterable<string> | null;
}): Promise<Record<string, unknown> | null> => {
  const memberTeamContext = options.runContext.runtimeContext.memberTeamContext;
  const taskDelegationToolDefinitions = await buildClaudeTaskDelegationToolDefinitions({
    sdkClient: options.sdkClient,
    memberTeamContext,
    enabledToolNames: options.enabledTaskDelegationToolNames,
  });

  if (!taskDelegationToolDefinitions) {
    return null;
  }

  const normalized = await options.sdkClient.createMcpServer({
    name: "autobyteus_team",
    tools: taskDelegationToolDefinitions,
  });
  if (!normalized) {
    return null;
  }

  return {
    autobyteus_team: normalized,
  };
};
