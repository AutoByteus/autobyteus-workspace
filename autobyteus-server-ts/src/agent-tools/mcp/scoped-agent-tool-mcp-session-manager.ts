import {
  AgentToolMcpSessionService,
  type AgentToolMcpSessionManager,
  type AgentToolMcpSessionIssueInput,
  type CreateAgentToolMcpSessionResult,
} from "./agent-tool-mcp-session-service.js";
import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSessionOwnerIdentity,
  RedactedAgentToolMcpDescriptor,
} from "./agent-tool-mcp-session.js";
import type {
  ApplicationAgentToolMcpSessionScope,
} from "./application-agent-tool-mcp-session-scope.js";

export class ScopedAgentToolMcpSessionManager
implements AgentToolMcpSessionManager {
  private issueBlocked = false;
  private closeComplete = false;
  constructor(
    private readonly sessionService: AgentToolMcpSessionService,
    private readonly scope: ApplicationAgentToolMcpSessionScope,
    private readonly assertExecutionCapabilitiesReady: () => void,
  ) {}

  assertReady(): void {
    if (this.issueBlocked) {
      throw new Error("Scoped Agent Tools MCP session manager is closing.");
    }
    this.assertExecutionCapabilitiesReady();
  }

  createAgentToolMcpSession(
    input: AgentToolMcpSessionIssueInput,
  ): CreateAgentToolMcpSessionResult {
    this.assertReady();
    const result = this.sessionService.createAgentToolMcpSession(input);
    try {
      this.scope.recordIssuedSession(result.session.sessionId, result.session.owner);
    } catch (error) {
      this.sessionService.revokeAgentToolMcpSession(result.session.sessionId);
      throw error;
    }
    return result;
  }

  revokeAgentToolMcpSession(sessionId: string): boolean {
    return this.sessionService.revokeAgentToolMcpSession(sessionId);
  }

  revokeAgentToolMcpSessionsForRun(runId: string): number {
    return this.scope.revokeForRun(runId);
  }

  revokeAgentToolMcpSessionsForOwner(
    owner: Partial<AgentToolMcpSessionOwnerIdentity>,
  ): number {
    return this.scope.revokeForOwner(owner);
  }

  redactAgentToolMcpDescriptor(
    descriptor: AgentToolMcpDescriptor,
  ): RedactedAgentToolMcpDescriptor {
    return this.sessionService.redactAgentToolMcpDescriptor(descriptor);
  }

  blockNewSessions(): void {
    this.issueBlocked = true;
    this.scope.blockNewSessions();
  }

  close(): void {
    if (this.closeComplete) {
      return;
    }
    this.blockNewSessions();
    this.scope.close();
    this.closeComplete = true;
  }
}
