import type { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import type { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "./agent-tool-mcp-session-service.js";
import type {
  AgentToolMcpRunSessionActivationInput,
  AgentToolMcpRunSessionAuthority,
  AgentToolMcpRunSessionDeactivator,
  AgentToolMcpSessionAuthorityFactory,
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
  private activationBlocked = false;
  private closeComplete = false;

  readonly runSessions: AgentToolMcpRunSessionDeactivator = Object.freeze({
    deactivateForRun: (runId: string) => this.deactivateForRun(runId),
  });

  constructor(
    private readonly scopeIdentity: string,
    private readonly registry: AgentToolMcpSessionRegistry,
  ) {}

  record(sessionId: string, owner: AgentToolMcpSessionOwnerIdentity): void {
    if (this.activationBlocked || this.closeComplete) {
      throw new Error("Scoped Agent Tools MCP session authority is closing.");
    }
    if (this.ownedSessions.has(sessionId)) {
      throw new Error(`Agent Tools MCP session '${sessionId}' is already recorded.`);
    }
    this.ownedSessions.set(sessionId, owner);
  }

  compensateUnrecordedSession(sessionId: string): void {
    this.ownedSessions.delete(sessionId);
    this.registry.deactivateSession(sessionId);
  }

  blockNewSessions(): void {
    this.activationBlocked = true;
  }

  close(): void {
    if (this.closeComplete) return;
    this.blockNewSessions();
    const errors: unknown[] = [];
    for (const sessionId of [...this.ownedSessions.keys()]) {
      try {
        this.deactivateOwnedSession(sessionId);
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

  private deactivateForRun(runId: string): number {
    const normalizedRunId = runId?.trim();
    return normalizedRunId
      ? this.deactivateMatching((owner) => owner.runId === normalizedRunId)
      : 0;
  }

  private deactivateMatching(
    predicate: (owner: AgentToolMcpSessionOwnerIdentity) => boolean,
  ): number {
    let deactivatedCount = 0;
    const errors: unknown[] = [];
    for (const [sessionId, owner] of [...this.ownedSessions.entries()]) {
      if (!predicate(owner)) continue;
      try {
        if (this.deactivateOwnedSession(sessionId)) deactivatedCount += 1;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      throw new AggregateError(
        errors,
        `Scoped Agent Tools MCP session authority '${this.scopeIdentity}' deactivation failed.`,
      );
    }
    return deactivatedCount;
  }

  private deactivateOwnedSession(sessionId: string): boolean {
    if (!this.ownedSessions.delete(sessionId)) return false;
    return this.registry.deactivateSession(sessionId);
  }
}

class DefaultScopedAgentToolMcpSessionAuthority
implements ScopedAgentToolMcpSessionAuthority {
  readonly runSessions: AgentToolMcpRunSessionAuthority;
  private activationBlocked = false;
  private closeComplete = false;

  constructor(
    readonly scopeIdentity: string,
    private readonly sessionService: AgentToolMcpSessionService,
    private readonly ledger: ScopedSessionLedger,
    private readonly assertHostOpen: () => void,
    private readonly assertExecutionCapabilitiesReady: () => void,
  ) {
    this.runSessions = Object.freeze({
      activateForRun: (input: AgentToolMcpRunSessionActivationInput) => {
        this.assertReady();
        const result = this.sessionService.activateForRun(input);
        if (result.kind === "not_exposed") return result;
        try {
          this.ledger.record(result.sessionId, result.owner);
        } catch (error) {
          this.ledger.compensateUnrecordedSession(result.sessionId);
          throw error;
        }
        return result;
      },
      deactivateForRun: (runId: string) =>
        this.ledger.runSessions.deactivateForRun(runId),
    });
  }

  assertReady(): void {
    if (this.activationBlocked || this.closeComplete) {
      throw new Error("Scoped Agent Tools MCP session authority is closing.");
    }
    this.assertHostOpen();
    this.assertExecutionCapabilitiesReady();
  }

  blockNewSessions(): void {
    this.activationBlocked = true;
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
  readonly runSessions: AgentToolMcpRunSessionDeactivator;
  private readonly ledger: ScopedSessionLedger;
  private state: AssemblyState = "ASSEMBLING";

  constructor(
    readonly scopeIdentity: string,
    private readonly registry: AgentToolMcpSessionRegistry,
    private readonly catalog: AgentToolMcpCatalog,
    private readonly getLocalBaseUrl: () => string,
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
        getLocalBaseUrl: this.getLocalBaseUrl,
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
  getLocalBaseUrl: () => string;
  assertHostOpen: () => void;
}>): AgentToolMcpSessionAuthorityFactory => {
  if (typeof input?.getLocalBaseUrl !== "function") {
    throw new Error("Agent Tools MCP local base URL reader is required.");
  }
  return Object.freeze({
    begin: ({ scopeIdentity }: Readonly<{ scopeIdentity: string }>) => {
      input.assertHostOpen();
      return new DefaultScopedAgentToolMcpSessionAuthorityAssembly(
        requireScopeIdentity(scopeIdentity),
        input.registry,
        input.catalog,
        input.getLocalBaseUrl,
        input.assertHostOpen,
      );
    },
  });
};
