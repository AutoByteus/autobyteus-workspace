import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSession,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { AgentToolMcpSessionManager } from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";

export type ClaudeAgentToolsMcpSessionServiceLike = Pick<
  AgentToolMcpSessionManager,
  "createAgentToolMcpSession"
>;

type LiveClaudeAgentToolsMcpDescriptor = {
  descriptor: AgentToolMcpDescriptor;
};

export class ClaudeAgentToolsMcpSessionState {
  private liveDescriptor: LiveClaudeAgentToolsMcpDescriptor | null = null;

  constructor(private readonly sessionService: ClaudeAgentToolsMcpSessionServiceLike) {}

  ensureDescriptor(runContext: ClaudeRunContext): AgentToolMcpDescriptor | null {
    const existing = this.liveDescriptor;
    if (existing) {
      return existing.descriptor.enabledTools.length > 0 ? existing.descriptor : null;
    }

    const result = this.sessionService.createAgentToolMcpSession({
      owner: buildAgentToolsMcpOwnerIdentity(runContext),
      sender: buildAgentRunMessageSenderContext({
        senderRunId: runContext.runId,
        senderName:
          runContext.runtimeContext.memberTeamContext?.memberName ??
          runContext.config.agentDefinitionId,
        runtimeKind: runContext.config.runtimeKind,
        memberTeamContext: runContext.runtimeContext.memberTeamContext,
      }),
      configuredExposure: runContext.runtimeContext.configuredToolExposure,
      executionContext: {
        workingDirectory: runContext.runtimeContext.sessionConfig.workingDirectory,
        memoryDir: runContext.config.memoryDir,
        applicationExecutionContext: runContext.config.applicationExecutionContext,
      },
      runtimeKind: runContext.config.runtimeKind,
    });
    this.liveDescriptor = {
      descriptor: result.descriptor,
    };
    return result.descriptor.enabledTools.length > 0 ? result.descriptor : null;
  }
}

const buildAgentToolsMcpOwnerIdentity = (
  runContext: ClaudeRunContext,
): AgentToolMcpSession["owner"] => {
  const memberTeamContext = runContext.runtimeContext.memberTeamContext;
  if (!memberTeamContext) {
    return { runId: runContext.runId };
  }
  return {
    runId: runContext.runId,
    teamRunId: memberTeamContext.teamRunId,
    memberRunId: memberTeamContext.memberRunId,
    memberRouteKey: memberTeamContext.memberRouteKey,
    memberName: memberTeamContext.memberName,
  };
};
