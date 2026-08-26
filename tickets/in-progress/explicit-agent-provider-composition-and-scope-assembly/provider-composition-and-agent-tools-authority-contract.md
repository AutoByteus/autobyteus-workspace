# Provider Composition And Agent Tools Authority Contract

Status: Normative design supplement. Approved with requirements.

## 1. Ownership

| Owner | Scope / Lifetime | Owns | Exposes | Must Not Own / Expose |
| --- | --- | --- | --- | --- |
| `AgentToolsMcpHost` | server process | endpoint registry, catalog, dispatcher, route dependencies, low-level session creation/revocation, authority factory, process close | `routeDependencies`, `sessionAuthorities`, `close()` | run managers, application publication selection, a general manager singleton |
| `ScopedAgentToolMcpSessionAuthority` | one execution family | scope identity, immutable execution capabilities, issued-session ledger, readiness, issue admission, run/owner revocation, idempotent close | `issuer`, `runSessions`, `assertReady`, `blockNewSessions`, `close` | route registration, provider construction, run lifecycle |
| `AgentProviderFactoryBuilder` | process-composed immutable policy | exact provider-specific dependency adaptation and factory construction | `createForExecution(input)` | run state, scope state, session ledger, string-key lookup |
| `GeneralProcessRunSupervisor` | general execution family | general authority, general run managers/services, bind/release, stop order | existing general services/lifecycle | application authority or application scope internals |
| `ApplicationExecutionScopeKernelBuilder` | one construction attempt | exact assembly order, complete kernel, reverse partial unwind | complete private kernel | public capabilities or generic dependency access |
| `ApplicationExecutionScope` | application execution family | capability admission/lifecycle and complete kernel | existing seven narrow capabilities | raw managers, provider internals, host internals |
| `AgentRunManager` | one execution family | claim, preparation, backend/run attachment, failed-preparation cleanup | existing run-management behavior | route/catalog or authority lifecycle |

## 2. Exact Contracts

```ts
export type IssuedAgentToolMcpSession = Readonly<{
  sessionId: string;
  owner: AgentToolMcpSessionOwnerIdentity;
  descriptor: AgentToolMcpDescriptor;
  redactedDescriptor: RedactedAgentToolMcpDescriptor;
}>;

export interface AgentToolMcpSessionIssuer {
  issueForRun(input: AgentToolMcpSessionIssueInput): IssuedAgentToolMcpSession;
}

export interface AgentToolMcpRunSessionReleaser {
  revokeForRun(runId: string): number;
  revokeForOwner(owner: Partial<AgentToolMcpSessionOwnerIdentity>): number;
}

export interface ScopedAgentToolMcpSessionAuthority {
  readonly scopeIdentity: string;
  readonly issuer: AgentToolMcpSessionIssuer;
  readonly runSessions: AgentToolMcpRunSessionReleaser;
  assertReady(): void;
  blockNewSessions(): void;
  close(): void;
}

export interface AgentToolMcpSessionAuthorityFactory {
  create(input: Readonly<{
    scopeIdentity: string;
    executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;
    assertExecutionCapabilitiesReady: () => void;
  }>): ScopedAgentToolMcpSessionAuthority;
}

export interface AgentToolsMcpHost {
  readonly routeDependencies: AgentToolsMcpRouteDependencies;
  readonly sessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  close(): void;
}
```

`issueForRun` validates readiness, creates the registry session, records ownership atomically, and returns the immutable issued resource. If ledger insertion fails, it immediately revokes the registry session and rethrows. `runSessions` is the only administrative port given to run/resource cleanup; providers never receive it.

```ts
export type AgentProviderFactorySet = Readonly<{
  autoByteus: AutoByteusAgentRunBackendFactory;
  codex: CodexAgentRunBackendFactory;
  claude: ClaudeAgentRunBackendFactory;
}>;

export interface AgentProviderFactoryBuilder {
  createForExecution(input: Readonly<{
    agentDefinitionService: AgentDefinitionService;
    agentToolMcpSessionIssuer: AgentToolMcpSessionIssuer;
  }>): AgentProviderFactorySet;
}
```

The builder is one fixed method with two exact execution inputs. It is not a container: no token, map, registration, optional property, mutable binding, or general resolution method exists.

Its frozen process dependency object contains only named dependencies used by provider construction, including workspace/skill infrastructure, AutoByteus factory collaborators, Codex client/thread/materializer/cleanup collaborators, and Claude SDK/materializer collaborators. The implementation must enumerate these named fields; it may not replace them with `Record<string, unknown>`.

## 3. Provider Boundary

### Codex

`AgentRunManager -> CodexAgentRunBackendFactory -> CodexThreadBootstrapper -> AgentToolMcpSessionIssuer.issueForRun -> IssuedAgentToolMcpSession.descriptor -> CodexAgentToolsMcpConfig adapter -> Codex App Server thread`

The bootstrapper needs the issuer because provider-owned preparation determines workspace/tool exposure before thread creation. It must not receive the authority or host. The existing materializer remains the descriptor-to-Codex adapter; its output type/name is tightened to `CodexAgentToolsMcpConfig`.

### Claude

`AgentRunManager -> ClaudeAgentRunBackendFactory -> ClaudeSessionManager -> Claude provider-session state -> issuer on first query -> descriptor -> Claude provider MCP config -> SDK query`

Lazy issuance is preserved. The session state caches the issued resource/descriptor for the active session. A query failure does not revoke automatically because retry is supported; run termination or authority close performs revocation.

### AutoByteus

AutoByteus factory behavior remains the same. It is created by the same builder so definition-service and process-dependency selection is explicit and consistent, not because it gains an MCP dependency.

## 4. Execution-Root Assembly

```text
host composition
  -> create AgentToolsMcpHost
  -> create immutable AgentProviderFactoryBuilder
  -> create general ScopedAgentToolMcpSessionAuthority
  -> create GeneralProcessRunSupervisor(builder, general authority)
  -> build ApplicationPlatformRuntime(host.sessionAuthorities, builder, ...)
       -> ApplicationExecutionScopeKernelBuilder
       -> application ScopedAgentToolMcpSessionAuthority
       -> ApplicationExecutionScope
```

The Host is shared. The two authorities, provider factory sets, Agent/Team managers, sessions, activation, resources, and shutdown lifecycles are non-identical.

## 5. Application Kernel

```ts
type ApplicationExecutionScopeKernel = Readonly<{
  agentRunService: AgentRunService;
  teamRunService: TeamRunService;
  sessionAuthority: ScopedAgentToolMcpSessionAuthority;
  shutdownCoordinator: ApplicationExecutionShutdownCoordinator;
  streamSource: ApplicationAgentStreamRuntimeSource;
  publicationService: PublishedArtifactPublicationService;
  projectionService: PublishedArtifactProjectionService;
  memoryLocationService: AgentMemoryLocationService;
}>;
```

The builder's input is the existing scope input with `agentProviderFactoryBuilder` and `agentToolMcpSessionAuthorityFactory`, replacing `agentToolsSessionFactory`. It owns private intermediate services/managers without returning them. A construction ledger records only acquired closeable resources and unwinds them in reverse. Successful build transfers ownership once and clears the ledger. The scope constructor accepts exactly one complete kernel.

## 6. Failure And Lifecycle Contract

### Failed Agent preparation

1. `AgentRunManager` obtains a run claim.
2. Provider may issue one or more sessions through the issuer.
3. If provider/backend/run preparation fails, manager executes existing backend/run cleanup when present.
4. Manager invokes `runSessionReleaser.revokeForRun(claim.runId)` before completing claim cleanup.
5. Claim completion/quarantine follows current behavior.
6. Provider and cleanup failures are aggregated; cleanup is never silently swallowed.

Revocation is idempotent with `AgentRunResourceManager` cleanup. The explicit call closes the pre-attachment gap; it does not create a second authority.

### Scope construction failure

The kernel builder unwinds acquired closeable resources in strict reverse order. If scope construction has completed and outer platform assembly later fails, `ApplicationExecutionScope.abortConstruction()` owns the single transfer/abort path and closes the full kernel once.

### Quiesce / close

- `quiesce`: block new run work and new session issuance; existing work can drain under current outer order.
- `close`: idempotent; stop Teams, then Agents, then revoke/close scoped sessions and remaining internal sources.
- Host close: only after general and application execution families close; clears process registry/catalog route infrastructure.

## 7. Allowed / Forbidden Dependencies

Allowed:

- host composition -> Host + builder + general supervisor + platform runtime;
- platform runtime -> application scope build boundary;
- execution owner -> builder + its own Authority ports;
- builder -> provider-specific factories/adapters and named process collaborators;
- provider -> issuer -> issued descriptor -> provider adapter;
- run/resource cleanup -> run-session releaser.

Forbidden:

- execution root -> Codex/Claude/AutoByteus constructors;
- execution root -> positional `undefined` provider defaults or provider globals;
- scope/provider -> whole Host or route registry/catalog;
- provider -> scoped Authority, run-session releaser, or broad manager;
- caller -> both scope capability and raw internal manager;
- string/token-based service lookup, generic DI/container, optional dependency dictionary, manager map, later bind, or compatibility alias.

## 8. Persisted Data

`Not Affected`. These contracts are runtime-only; no current database, JSON, journal, SDK, protocol, or package field changes.
