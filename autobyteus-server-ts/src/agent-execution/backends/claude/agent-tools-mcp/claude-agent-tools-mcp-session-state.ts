import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSession,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { AgentToolMcpSessionService } from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";

export type ClaudeAgentToolsMcpSessionServiceLike = Pick<
  AgentToolMcpSessionService,
  "createAgentToolMcpSession"
>;

type LiveClaudeAgentToolsMcpDescriptor = {
  descriptor: AgentToolMcpDescriptor;
  expiresAt: Date;
};

export class ClaudeAgentToolsMcpSessionState {
  private liveDescriptor: LiveClaudeAgentToolsMcpDescriptor | null = null;

  constructor(private readonly sessionService: ClaudeAgentToolsMcpSessionServiceLike) {}

  ensureDescriptor(runContext: ClaudeRunContext): AgentToolMcpDescriptor {
    if (!runContext.runtimeContext.configuredToolExposure.sendMessageToConfigured) {
      throw new Error(
        "CLAUDE_AGENT_TOOLS_MCP_NOT_CONFIGURED: send_message_to is not configured for this run.",
      );
    }

    const existing = this.liveDescriptor;
    if (existing && existing.expiresAt.getTime() > Date.now()) {
      return existing.descriptor;
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
      runtimeKind: runContext.config.runtimeKind,
    });
    this.liveDescriptor = {
      descriptor: result.descriptor,
      expiresAt: result.session.expiresAt,
    };
    return result.descriptor;
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
