import type { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import type { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "./agent-tool-mcp-session-service.js";
import type { AgentToolsMcpSessionStreams } from "./agent-tools-mcp-session-streams.js";
import { deriveAgentToolMcpRunSessionId } from "./agent-tool-mcp-run-session-id.js";
import type {
  AgentToolMcpRunSessionActivationInput,
  AgentToolMcpRunSessionAuthority,
  AgentToolMcpRunSessionReplaceInput,
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
    private readonly streams: AgentToolsMcpSessionStreams,
  ) {}

  assertOwnsRun(runId: string): void {
    const sessionId = deriveAgentToolMcpRunSessionId(runId);
    if (!this.ownedSessions.has(sessionId)) {
      throw new Error(
        `Scoped Agent Tools MCP session authority '${this.scopeIdentity}' has no session for run '${runId}'.`,
      );
    }
  }

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
    this.streams.closeSession(sessionId);
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
    if (!this.ownedSessions.has(sessionId)) return false;
    const deactivated = this.registry.deactivateSession(sessionId);
    this.ownedSessions.delete(sessionId);
    this.streams.closeSession(sessionId);
    return deactivated;
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
        try {
          this.ledger.record(result.sessionId, result.owner);
        } catch (error) {
          this.ledger.compensateUnrecordedSession(result.sessionId);
          throw error;
        }
        return result;
      },
      replaceForRun: (input: AgentToolMcpRunSessionReplaceInput) => {
        this.assertOpenForExistingSessions();
        this.ledger.assertOwnsRun(input.runId);
        return this.sessionService.replaceForRun(input);
      },
      describeForRun: (runId: string) => {
        this.assertOpenForExistingSessions();
        this.ledger.assertOwnsRun(runId);
        return this.sessionService.describeForRun(runId);
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

  // Blocking new sessions still lets existing runs read and change theirs;
  // only a closed authority or host refuses.
  private assertOpenForExistingSessions(): void {
    if (this.closeComplete) {
      throw new Error("Scoped Agent Tools MCP session authority is closed.");
    }
    this.assertHostOpen();
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
    private readonly streams: AgentToolsMcpSessionStreams,
    private readonly getLocalBaseUrl: () => string,
    private readonly assertHostOpen: () => void,
  ) {
    this.ledger = new ScopedSessionLedger(scopeIdentity, registry, streams);
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
        streams: this.streams,
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
  streams: AgentToolsMcpSessionStreams;
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
        input.streams,
        input.getLocalBaseUrl,
        input.assertHostOpen,
      );
    },
  });
};
