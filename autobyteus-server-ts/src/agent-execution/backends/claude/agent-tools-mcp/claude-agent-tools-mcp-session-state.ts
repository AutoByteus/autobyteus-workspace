import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSessionOwnerIdentity,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { AgentToolMcpRunSessionAuthority } from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { RuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";

/**
 * Activates the run's Agent Tools MCP session once and then reads the
 * session's current descriptor on every use, because the descriptor can
 * change during the run.
 */
export class ClaudeAgentToolsMcpSessionState {
  private closed = false;
  private active = false;

  constructor(private readonly runSessions: AgentToolMcpRunSessionAuthority) {}

  ensureDescriptor(runContext: ClaudeRunContext): AgentToolMcpDescriptor {
    if (this.closed) throw new Error("Claude run MCP admission is closed.");
    if (this.active) {
      return this.runSessions.describeForRun(runContext.runId);
    }

    const result = this.runSessions.activateForRun({
      owner: buildAgentToolsMcpOwnerIdentity(runContext),
      sender: buildAgentRunMessageSenderContext({
        senderRunId: runContext.runId,
        senderName:
          (runContext.config.memberExecutionContext
            ? getAgentTeamAddressBasename(runContext.config.memberExecutionContext.identity.memberAddress)
            : null) ??
          runContext.config.agentDefinitionId,
        runtimeKind: runContext.config.runtimeKind,
        memberExecutionContext: runContext.config.memberExecutionContext,
      }),
      runtimeExposure: runContext.runtimeContext.runtimeToolExposure,
      executionContext: {
        workingDirectory: runContext.runtimeContext.sessionConfig.workingDirectory,
        memoryDir: runContext.config.memoryDir,
        applicationExecutionContext: runContext.config.applicationExecutionContext,
      },
      runtimeKind: runContext.config.runtimeKind,
    });
    this.active = true;
    return result.descriptor;
  }

  /**
   * Gives the run's session this exposure (the run context already holds it): replaced when the
   * session is active, otherwise activated with it. Returns the current descriptor.
   */
  replaceExposure(runContext: ClaudeRunContext, runtimeExposure: RuntimeAgentToolExposure): AgentToolMcpDescriptor {
    if (this.closed) throw new Error("Claude run MCP admission is closed.");
    if (!this.active) return this.ensureDescriptor(runContext);
    return this.runSessions.replaceForRun({ runId: runContext.runId, runtimeExposure });
  }

  /** The Agent Tools names the run has now (the session is activated once). */
  currentToolNames(runContext: ClaudeRunContext): readonly string[] {
    return this.ensureDescriptor(runContext).enabledTools;
  }

  /**
   * Gives the run these tools from its next model call: the run context keeps the exposure for
   * later process generations, and the Agent Tools session is replaced (the CLI re-lists over its
   * GET stream). Returns the Agent Tools names now enabled.
   */
  applyExposure(runContext: ClaudeRunContext, runtimeExposure: RuntimeAgentToolExposure): readonly string[] {
    runContext.runtimeContext.runtimeToolExposure = runtimeExposure;
    return this.replaceExposure(runContext, runtimeExposure).enabledTools;
  }

  release(runId: string): void {
    this.closed = true;
    this.runSessions.deactivateForRun(runId);
    this.active = false;
  }
}

const buildAgentToolsMcpOwnerIdentity = (
  runContext: ClaudeRunContext,
): AgentToolMcpSessionOwnerIdentity => {
  const memberExecutionContext = runContext.config.memberExecutionContext;
  if (!memberExecutionContext) {
    return { runId: runContext.runId };
  }
  return {
    runId: runContext.runId,
    collaborationIdentity: memberExecutionContext.identity,
    displayName: getAgentTeamAddressBasename(memberExecutionContext.identity.memberAddress),
  };
};
