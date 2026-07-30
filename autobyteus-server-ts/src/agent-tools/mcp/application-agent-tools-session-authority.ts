import {
  AgentToolMcpSessionService,
  type AgentToolMcpSessionAuthority,
  type AgentToolMcpSessionIssueInput,
  type CreateAgentToolMcpSessionResult,
} from "./agent-tool-mcp-session-service.js";
import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSessionOwnerIdentity,
  RedactedAgentToolMcpDescriptor,
} from "./agent-tool-mcp-session.js";

export class ApplicationAgentToolsSessionAuthority
implements AgentToolMcpSessionAuthority {
  private readonly ownedSessions =
    new Map<string, AgentToolMcpSessionOwnerIdentity>();
  private issueBlocked = false;
  private closeComplete = false;

  constructor(
    private readonly sessionService: AgentToolMcpSessionService,
    private readonly assertExecutionAuthoritiesReady: () => void,
  ) {}

  assertReady(): void {
    if (this.issueBlocked) {
      throw new Error("Agent Tools MCP session authority is closing.");
    }
    this.assertExecutionAuthoritiesReady();
  }

  createAgentToolMcpSession(
    input: AgentToolMcpSessionIssueInput,
  ): CreateAgentToolMcpSessionResult {
    this.assertReady();
    const result = this.sessionService.createAgentToolMcpSession(input);
    this.ownedSessions.set(result.session.sessionId, result.session.owner);
    return result;
  }

  revokeAgentToolMcpSession(sessionId: string): boolean {
    if (!this.ownedSessions.delete(sessionId)) {
      return false;
    }
    return this.sessionService.revokeAgentToolMcpSession(sessionId);
  }

  revokeAgentToolMcpSessionsForRun(runId: string): number {
    const normalizedRunId = runId.trim();
    return normalizedRunId
      ? this.revokeMatching((owner) => owner.runId === normalizedRunId)
      : 0;
  }

  revokeAgentToolMcpSessionsForMemberRun(memberRunId: string): number {
    const normalizedMemberRunId = memberRunId.trim();
    return normalizedMemberRunId
      ? this.revokeMatching(
          (owner) => owner.memberRunId === normalizedMemberRunId,
        )
      : 0;
  }

  revokeAgentToolMcpSessionsForOwner(
    owner: Partial<AgentToolMcpSessionOwnerIdentity>,
  ): number {
    const keys = Object.keys(owner) as Array<
      keyof AgentToolMcpSessionOwnerIdentity
    >;
    if (keys.length === 0) {
      return 0;
    }
    return this.revokeMatching((candidate) =>
      keys.every((key) => candidate[key] === owner[key]),
    );
  }

  redactAgentToolMcpDescriptor(
    descriptor: AgentToolMcpDescriptor,
  ): RedactedAgentToolMcpDescriptor {
    return this.sessionService.redactAgentToolMcpDescriptor(descriptor);
  }

  blockNewSessions(): void {
    this.issueBlocked = true;
  }

  close(): void {
    if (this.closeComplete) {
      return;
    }
    this.blockNewSessions();
    for (const sessionId of this.ownedSessions.keys()) {
      this.sessionService.revokeAgentToolMcpSession(sessionId);
    }
    this.ownedSessions.clear();
    this.closeComplete = true;
  }

  private revokeMatching(
    predicate: (owner: AgentToolMcpSessionOwnerIdentity) => boolean,
  ): number {
    let revokedCount = 0;
    for (const [sessionId, owner] of this.ownedSessions) {
      if (!predicate(owner)) {
        continue;
      }
      this.ownedSessions.delete(sessionId);
      if (this.sessionService.revokeAgentToolMcpSession(sessionId)) {
        revokedCount += 1;
      }
    }
    return revokedCount;
  }
}
