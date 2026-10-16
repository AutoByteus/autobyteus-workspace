import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeAgentToolsMcpSessionState } from "../agent-tools-mcp/claude-agent-tools-mcp-session-state.js";
import type { ClaudeSdkSessionBinding } from "../../../../runtime-management/claude/client/claude-sdk-session-binding.js";
import type { ClaudeSdkStreamingSessionOptions } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { claudeSessionReasoningOptions } from "./claude-session-config.js";
import type { ClaudeProcessDiagnostics } from "./claude-process-diagnostics.js";
import { buildClaudeSessionMcpServerConfig } from "./claude-session-mcp-server-config.js";
import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import { resolveClaudeSessionToolingOptions } from "./claude-session-tooling-options.js";

/** The SDK query options for one CLI process generation of a Claude run session. */
export const resolveClaudeSessionQueryOptions = async (input: {
  runContext: ClaudeRunContext;
  binding: ClaudeSdkSessionBinding;
  diagnostics: ClaudeProcessDiagnostics;
  agentToolsMcpSessionState: ClaudeAgentToolsMcpSessionState;
  toolingCoordinator: ClaudeSessionToolUseCoordinator;
}): Promise<ClaudeSdkStreamingSessionOptions> => {
  const { runContext } = input;
  const sessionConfig = runContext.runtimeContext.sessionConfig;
  const toolingInput = {
    runtimeToolExposure: runContext.runtimeContext.runtimeToolExposure,
    hasMaterializedSkills: (runContext.runtimeContext.privateSkillProfile?.exposures.length ?? 0) > 0,
    memberExecutionContext: runContext.config.memberExecutionContext,
  };
  const configuredToolingOptions = resolveClaudeSessionToolingOptions(toolingInput);
  const agentToolsMcpDescriptor = (
    configuredToolingOptions.agentToolsMcpToolingRequested ||
    runContext.runtimeContext.runtimeToolExposure.requestedToolNames.length > 0
  )
    ? input.agentToolsMcpSessionState.ensureDescriptor(runContext)
    : null;
  const toolingOptions = resolveClaudeSessionToolingOptions({
    ...toolingInput,
    agentToolsMcpEnabledToolNames: agentToolsMcpDescriptor?.enabledTools ?? [],
  });
  const mcpServers = await buildClaudeSessionMcpServerConfig({ agentToolsMcpDescriptor });
  return {
    systemPrompt: runContext.runtimeContext.carpenterSystemPrompt,
    ...(runContext.runtimeContext.privateSkillProfile ? {
      privateSkillPlugin: { path: runContext.runtimeContext.privateSkillProfile.root,
        names: runContext.runtimeContext.privateSkillProfile.exposures.map(entry => `autobyteus-configured:${entry.skill.name}`) },
    } : {}),
    sessionBinding: input.binding,
    model: sessionConfig.model,
    workingDirectory: sessionConfig.workingDirectory,
    mcpServers,
    allowedTools: toolingOptions.allowedTools,
    permissionMode: sessionConfig.permissionMode,
    ...claudeSessionReasoningOptions(sessionConfig),
    stderr: (data: string) => input.diagnostics.append(data),
    canUseTool: (toolName, toolInput, toolOptions) =>
      input.toolingCoordinator.handleToolPermissionCheck(runContext, toolName, toolInput, toolOptions),
  };
};
