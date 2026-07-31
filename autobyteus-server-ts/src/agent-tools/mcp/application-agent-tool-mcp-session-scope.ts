import type { AgentToolMcpSessionOwnerIdentity } from "./agent-tool-mcp-session.js";

export type AgentToolMcpSessionRevoker = Readonly<{
  revokeAgentToolMcpSession(sessionId: string): boolean;
}>;

export interface ApplicationAgentToolMcpSessionScope {
  recordIssuedSession(
    sessionId: string,
    owner: AgentToolMcpSessionOwnerIdentity,
  ): void;
  revokeForRun(runId: string): number;
  revokeForMemberRun(memberRunId: string): number;
  revokeForOwner(owner: Partial<AgentToolMcpSessionOwnerIdentity>): number;
  blockNewSessions(): void;
  close(): void;
}

export class DefaultApplicationAgentToolMcpSessionScope
implements ApplicationAgentToolMcpSessionScope {
  private readonly ownedSessions =
    new Map<string, AgentToolMcpSessionOwnerIdentity>();
  private issueBlocked = false;
  private closeComplete = false;

  constructor(
    readonly scopeIdentity: string,
    private readonly sessionRevoker: AgentToolMcpSessionRevoker,
  ) {
    if (!scopeIdentity.trim()) {
      throw new Error("Application Agent Tools MCP session scope identity is required.");
    }
  }

  recordIssuedSession(
    sessionId: string,
    owner: AgentToolMcpSessionOwnerIdentity,
  ): void {
    if (this.issueBlocked || this.closeComplete) {
      throw new Error("Application Agent Tools MCP session scope is closing.");
    }
    if (this.ownedSessions.has(sessionId)) {
      throw new Error(`Agent Tools MCP session '${sessionId}' is already recorded.`);
    }
    this.ownedSessions.set(sessionId, owner);
  }

  revokeForRun(runId: string): number {
    const normalizedRunId = runId.trim();
    return normalizedRunId
      ? this.revokeMatching((owner) => owner.runId === normalizedRunId)
      : 0;
  }

  revokeForMemberRun(memberRunId: string): number {
    const normalizedMemberRunId = memberRunId.trim();
    return normalizedMemberRunId
      ? this.revokeMatching((owner) => owner.memberRunId === normalizedMemberRunId)
      : 0;
  }

  revokeForOwner(owner: Partial<AgentToolMcpSessionOwnerIdentity>): number {
    const keys = Object.keys(owner) as Array<keyof AgentToolMcpSessionOwnerIdentity>;
    if (keys.length === 0) {
      return 0;
    }
    return this.revokeMatching((candidate) =>
      keys.every((key) => candidate[key] === owner[key]),
    );
  }

  blockNewSessions(): void {
    this.issueBlocked = true;
  }

  close(): void {
    if (this.closeComplete) {
      return;
    }
    this.blockNewSessions();
    const errors: unknown[] = [];
    for (const sessionId of Array.from(this.ownedSessions.keys())) {
      try {
        this.revokeOwnedSession(sessionId);
      } catch (error) {
        errors.push(error);
      }
    }
    this.closeComplete = true;
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Application Agent Tools MCP session scope '${this.scopeIdentity}' cleanup failed.`,
      );
    }
  }

  private revokeMatching(
    predicate: (owner: AgentToolMcpSessionOwnerIdentity) => boolean,
  ): number {
    let revokedCount = 0;
    const errors: unknown[] = [];
    for (const [sessionId, owner] of Array.from(this.ownedSessions.entries())) {
      if (!predicate(owner)) {
        continue;
      }
      try {
        if (this.revokeOwnedSession(sessionId)) {
          revokedCount += 1;
        }
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Application Agent Tools MCP session scope '${this.scopeIdentity}' revocation failed.`,
      );
    }
    return revokedCount;
  }

  private revokeOwnedSession(sessionId: string): boolean {
    if (!this.ownedSessions.delete(sessionId)) {
      return false;
    }
    return this.sessionRevoker.revokeAgentToolMcpSession(sessionId);
  }
}
