import { ClaudeAgentRunContext } from "../backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig, DEFAULT_CLAUDE_PERMISSION_MODE } from "../backends/claude/session/claude-session-config.js";
import { CodexAgentRunContext } from "../backends/codex/backend/codex-agent-run-context.js";
import { resolveApprovalPolicyForRunConfig } from "../backends/codex/backend/codex-thread-bootstrapper.js";
import { buildCodexThreadConfig } from "../backends/codex/thread/codex-thread-config.js";
import type { RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunConfig } from "../domain/agent-run-config.js";
import { buildRuntimeAgentToolExposure } from "../shared/runtime-agent-tool-exposure.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/** Builds strict provider restore context from one durable external binding. */
export const buildAgentRunRestoreRuntimeContext = (
  config: AgentRunConfig,
  platformAgentRunId: string,
): RuntimeAgentRunContext => {
  if (config.runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
    return new CodexAgentRunContext({
      codexThreadConfig: buildCodexThreadConfig({
        model: config.llmModelIdentifier,
        workingDirectory: ".",
        reasoningEffort: null,
        serviceTier: null,
        approvalPolicy: resolveApprovalPolicyForRunConfig(config),
        sandbox: "workspace-write",
        dynamicTools: null,
      }),
      threadId: platformAgentRunId,
    });
  }
  if (config.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
    return new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: config.llmModelIdentifier,
        workingDirectory: ".",
        permissionMode: DEFAULT_CLAUDE_PERMISSION_MODE,
        autoExecuteTools: config.autoExecuteTools,
      }),
      carpenterSystemPrompt: "Pending runtime bootstrap.",
      runtimeToolExposure: buildRuntimeAgentToolExposure([], config.memberExecutionContext),
      sessionId: platformAgentRunId,
    });
  }
  return null;
};
