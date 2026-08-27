import type { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import type { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "./agent-tool-mcp-session-service.js";
import type {
  AgentToolMcpRunSessionReleaser,
  AgentToolMcpSessionIssueInput,
  AgentToolMcpSessionAuthorityFactory,
  AgentToolMcpSessionIssuer,
  ScopedAgentToolMcpSessionAuthority,
  ScopedAgentToolMcpSessionAuthorityAssembly,
} from "./agent-tool-mcp-session-authority.js";
import type {
  AgentToolMcpSessionBaseExecutionCapabilities,
  AgentToolMcpSessionOwnerIdentity,
} from "./agent-tool-mcp-session.js";

type AssemblyState = "ASSEMBLING" | "COMPLETED" | "ABORTED";

const requireScopeIdentity = (value: string): string => {
  const scopeIdentity = value?.trim();
  if (!scopeIdentity) {
    throw new Error("Scoped Agent Tools MCP session authority identity is required.");
  }
  return scopeIdentity;
};

class ScopedSessionLedger {
  private readonly ownedSessions = new Map<string, AgentToolMcpSessionOwnerIdentity>();
  private issueBlocked = false;
  private closeComplete = false;

  readonly runSessions: AgentToolMcpRunSessionReleaser = Object.freeze({
    revokeForRun: (runId: string) => this.revokeForRun(runId),
    revokeForOwner: (owner: Partial<AgentToolMcpSessionOwnerIdentity>) =>
      this.revokeForOwner(owner),
  });

  constructor(
    private readonly scopeIdentity: string,
    private readonly registry: AgentToolMcpSessionRegistry,
  ) {}

  record(sessionId: string, owner: AgentToolMcpSessionOwnerIdentity): void {
    if (this.issueBlocked || this.closeComplete) {
      throw new Error("Scoped Agent Tools MCP session authority is closing.");
    }
    if (this.ownedSessions.has(sessionId)) {
      throw new Error(`Agent Tools MCP session '${sessionId}' is already recorded.`);
    }
    this.ownedSessions.set(sessionId, owner);
  }

  blockNewSessions(): void {
    this.issueBlocked = true;
  }

  close(): void {
    if (this.closeComplete) return;
    this.blockNewSessions();
    const errors: unknown[] = [];
    for (const sessionId of [...this.ownedSessions.keys()]) {
      try {
        this.revokeOwnedSession(sessionId);
      } catch (error) {
        errors.push(error);
      }
    }
    this.closeComplete = true;
    if (errors.length) {
      throw new AggregateError(
        errors,
        `Scoped Agent Tools MCP session authority '${this.scopeIdentity}' cleanup failed.`,
      );
    }
  }

  private revokeForRun(runId: string): number {
    const normalizedRunId = runId?.trim();
    return normalizedRunId
      ? this.revokeMatching((owner) => owner.runId === normalizedRunId)
      : 0;
  }

  private revokeForOwner(owner: Partial<AgentToolMcpSessionOwnerIdentity>): number {
    const keys = Object.keys(owner) as Array<keyof AgentToolMcpSessionOwnerIdentity>;
    if (!keys.length) return 0;
    return this.revokeMatching((candidate) => keys.every((key) => {
      if (key !== "teamIdentity") return candidate[key] === owner[key];
      const actual = candidate.teamIdentity;
      const expected = owner.teamIdentity;
      if (actual === expected) return true;
      return Boolean(
        actual && expected
        && actual.rootTeamRunId === expected.rootTeamRunId
        && actual.memberAddress === expected.memberAddress
        && actual.agentRunId === expected.agentRunId,
      );
    }));
  }

  private revokeMatching(
    predicate: (owner: AgentToolMcpSessionOwnerIdentity) => boolean,
  ): number {
    let revokedCount = 0;
    const errors: unknown[] = [];
    for (const [sessionId, owner] of [...this.ownedSessions.entries()]) {
      if (!predicate(owner)) continue;
      try {
        if (this.revokeOwnedSession(sessionId)) revokedCount += 1;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      throw new AggregateError(
        errors,
        `Scoped Agent Tools MCP session authority '${this.scopeIdentity}' revocation failed.`,
      );
    }
    return revokedCount;
  }

  private revokeOwnedSession(sessionId: string): boolean {
    if (!this.ownedSessions.delete(sessionId)) return false;
    return this.registry.revokeSession(sessionId);
  }
}

class DefaultScopedAgentToolMcpSessionAuthority
implements ScopedAgentToolMcpSessionAuthority {
  readonly issuer: AgentToolMcpSessionIssuer;
  readonly runSessions: AgentToolMcpRunSessionReleaser;
  private issueBlocked = false;
  private closeComplete = false;

  constructor(
    readonly scopeIdentity: string,
    private readonly sessionService: AgentToolMcpSessionService,
    private readonly ledger: ScopedSessionLedger,
    private readonly assertHostOpen: () => void,
    private readonly assertExecutionCapabilitiesReady: () => void,
  ) {
    this.runSessions = ledger.runSessions;
    this.issuer = Object.freeze({
      issueForRun: (input: AgentToolMcpSessionIssueInput) => {
        this.assertReady();
        const issued = this.sessionService.createAgentToolMcpSession(input);
        try {
          this.ledger.record(issued.sessionId, issued.owner);
        } catch (error) {
          this.sessionService.revokeAgentToolMcpSession(issued.sessionId);
          throw error;
        }
        return issued;
      },
    });
  }

  assertReady(): void {
    if (this.issueBlocked || this.closeComplete) {
      throw new Error("Scoped Agent Tools MCP session authority is closing.");
    }
    this.assertHostOpen();
    this.assertExecutionCapabilitiesReady();
  }

  blockNewSessions(): void {
    this.issueBlocked = true;
    this.ledger.blockNewSessions();
  }

  close(): void {
    if (this.closeComplete) return;
    this.blockNewSessions();
    this.ledger.close();
    this.closeComplete = true;
  }
}

class DefaultScopedAgentToolMcpSessionAuthorityAssembly
implements ScopedAgentToolMcpSessionAuthorityAssembly {
  readonly runSessions: AgentToolMcpRunSessionReleaser;
  private readonly ledger: ScopedSessionLedger;
  private state: AssemblyState = "ASSEMBLING";

  constructor(
    readonly scopeIdentity: string,
    private readonly registry: AgentToolMcpSessionRegistry,
    private readonly catalog: AgentToolMcpCatalog,
    private readonly assertHostOpen: () => void,
  ) {
    this.ledger = new ScopedSessionLedger(scopeIdentity, registry);
    this.runSessions = this.ledger.runSessions;
  }

  complete(input: Readonly<{
    executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;
    assertExecutionCapabilitiesReady: () => void;
  }>): ScopedAgentToolMcpSessionAuthority {
    if (this.state !== "ASSEMBLING") {
      throw new Error(
        `Scoped Agent Tools MCP authority assembly is '${this.state.toLowerCase()}'.`,
      );
    }
    if (!input?.executionCapabilities?.publishedArtifactPublisher) {
      throw new Error("Scoped Agent Tools MCP execution capabilities are required.");
    }
    if (!("applicationAgentTools" in input.executionCapabilities)) {
      throw new Error("Scoped Agent Tools MCP application capability disposition is required.");
    }
    if (typeof input.assertExecutionCapabilitiesReady !== "function") {
      throw new Error("Scoped Agent Tools MCP readiness assertion is required.");
    }
    this.assertHostOpen();
    const authority = new DefaultScopedAgentToolMcpSessionAuthority(
      this.scopeIdentity,
      new AgentToolMcpSessionService({
        registry: this.registry,
        catalog: this.catalog,
        executionCapabilities: input.executionCapabilities,
      }),
      this.ledger,
      this.assertHostOpen,
      input.assertExecutionCapabilitiesReady,
    );
    this.state = "COMPLETED";
    return authority;
  }

  abort(): void {
    if (this.state === "COMPLETED" || this.state === "ABORTED") return;
    this.ledger.close();
    this.state = "ABORTED";
  }
}

export const createAgentToolMcpSessionAuthorityFactory = (input: Readonly<{
  registry: AgentToolMcpSessionRegistry;
  catalog: AgentToolMcpCatalog;
  assertHostOpen: () => void;
}>): AgentToolMcpSessionAuthorityFactory => Object.freeze({
  begin: ({ scopeIdentity }: Readonly<{ scopeIdentity: string }>) => {
    input.assertHostOpen();
    return new DefaultScopedAgentToolMcpSessionAuthorityAssembly(
      requireScopeIdentity(scopeIdentity),
      input.registry,
      input.catalog,
      input.assertHostOpen,
    );
  },
});
