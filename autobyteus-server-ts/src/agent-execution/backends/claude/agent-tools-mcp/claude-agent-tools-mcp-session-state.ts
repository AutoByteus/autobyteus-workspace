import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSessionOwnerIdentity,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type {
  AgentToolMcpRunSessionActivator,
  AgentToolMcpRunSessionActivationResult,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";

export class ClaudeAgentToolsMcpSessionState {
  private activation: AgentToolMcpRunSessionActivationResult | null = null;

  constructor(private readonly runSessions: AgentToolMcpRunSessionActivator) {}

  ensureDescriptor(runContext: ClaudeRunContext): AgentToolMcpDescriptor | null {
    const existing = this.activation;
    if (existing) {
      return existing.kind === "active" ? existing.descriptor : null;
    }

    const result = this.runSessions.activateForRun({
      owner: buildAgentToolsMcpOwnerIdentity(runContext),
      sender: buildAgentRunMessageSenderContext({
        senderRunId: runContext.runId,
        senderName:
          (runContext.config.memberTeamContext
            ? getAgentTeamAddressBasename(runContext.config.memberTeamContext.identity.memberAddress)
            : null) ??
          runContext.config.agentDefinitionId,
        runtimeKind: runContext.config.runtimeKind,
        memberTeamContext: runContext.config.memberTeamContext,
      }),
      runtimeExposure: runContext.runtimeContext.runtimeToolExposure,
      executionContext: {
        workingDirectory: runContext.runtimeContext.sessionConfig.workingDirectory,
        memoryDir: runContext.config.memoryDir,
        applicationExecutionContext: runContext.config.applicationExecutionContext,
      },
      runtimeKind: runContext.config.runtimeKind,
    });
    this.activation = result;
    return result.kind === "active" ? result.descriptor : null;
  }
}

const buildAgentToolsMcpOwnerIdentity = (
  runContext: ClaudeRunContext,
): AgentToolMcpSessionOwnerIdentity => {
  const memberTeamContext = runContext.config.memberTeamContext;
  if (!memberTeamContext) {
    return { runId: runContext.runId };
  }
  return {
    runId: runContext.runId,
    teamIdentity: memberTeamContext.identity,
    displayName: getAgentTeamAddressBasename(memberTeamContext.identity.memberAddress),
  };
};
