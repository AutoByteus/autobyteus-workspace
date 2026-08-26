# Provider Composition And Agent Tools Authority Contract

Status: Normative design supplement. Approved requirements; revised by SR-002 for ARCH-REV-001 findings AR-001–AR-003.

## 1. Ownership

| Owner | Scope / Lifetime | Owns | Exposes | Must Not Own / Expose |
| --- | --- | --- | --- | --- |
| `AgentToolsMcpHost` | server process | endpoint registry, catalog, dispatcher, route dependencies, low-level session mechanics, authority-assembly factory, process close | `routeDependencies`, `sessionAuthorities`, `close()` | run managers, provider construction, publication selection |
| `ScopedAgentToolMcpSessionAuthorityAssembly` | one kernel construction attempt only | incomplete scoped ledger and run-session revocation needed to construct publication/run resources | `runSessions`, `complete(...)`, `abort()` | issuer, provider access, runtime escape, optional/later mutation |
| `ScopedAgentToolMcpSessionAuthority` | one execution family | scope identity, fixed execution capabilities, issued-session ledger, readiness, issue admission, revocation, idempotent close | `issuer`, `runSessions`, `assertReady`, `blockNewSessions`, `close` | routes, provider construction, run lifecycle |
| `AgentProviderFactoryBuilder` | one process-composed immutable policy | exact provider construction mapping over fixed process dependency identities | `createForExecution(input)` | run/scope state, session ledger, lookup tokens, mutable registration |
| `GeneralProcessRunSupervisor` | general execution family | general authority, run managers/services, process bindings, stop order | existing services/lifecycle | application authority/scope internals |
| `ApplicationExecutionScopeKernelBuilder` | one synchronous construction attempt | exact phase order, construction ledger, complete kernel, reverse partial unwind | one complete private kernel | public capabilities, generic registration, optional output |
| `ApplicationExecutionScope` | application execution family | capability admission and transferred kernel lifecycle | existing seven narrow capabilities | raw managers, provider/Host internals |
| `AgentRunManager` | one execution family | claim, backend/run preparation, pre-attachment failure cleanup | existing run behavior | Host/catalog/authority lifecycle |

The authority assembly is a typed construction transaction required by the real publication/resource dependency cycle. It is not a generic deferred container: it has one fixed completion method, cannot issue sessions, cannot leave the kernel builder, and is consumed or aborted before the builder returns.

## 2. Agent Tools Contracts

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

export interface ScopedAgentToolMcpSessionAuthorityAssembly {
  readonly scopeIdentity: string;
  readonly runSessions: AgentToolMcpRunSessionReleaser;
  complete(input: Readonly<{
    executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;
    assertExecutionCapabilitiesReady: () => void;
  }>): ScopedAgentToolMcpSessionAuthority;
  abort(): void;
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
  begin(input: Readonly<{ scopeIdentity: string }>):
    ScopedAgentToolMcpSessionAuthorityAssembly;
}

export interface AgentToolsMcpHost {
  readonly routeDependencies: AgentToolsMcpRouteDependencies;
  readonly sessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  close(): void;
}
```

Assembly state is exactly `ASSEMBLING -> COMPLETED` or `ASSEMBLING -> ABORTED`. A successful `complete` fixes the capability object/readiness callback once, returns the only full authority, and transfers close ownership to that authority. A failed `complete` leaves the assembly `ASSEMBLING`, so the builder's existing `abort` disposer remains valid. `complete` in `COMPLETED` or `ABORTED` throws. `abort` in `ASSEMBLING` closes the incomplete ledger and enters `ABORTED`; repeated abort in `ABORTED` is a no-op; abort in `COMPLETED` is a no-op and never closes the transferred authority. No issuer exists before completion. `runSessions` works only over the assembly's scoped ledger/registry and needs no execution capability. Authority issue validates Host/authority readiness, allocates the registry session, records ownership atomically, and returns the frozen resource. Ledger insertion failure revokes immediately and rethrows. Providers receive only `issuer`; run/resource cleanup receives only `runSessions`.

General composition also uses `begin` then immediate `complete` with the general published-artifact publisher. Both general and application completion pass the current behavior-preserving `assertExecutionCapabilitiesReady: () => undefined`; Host-open and authority-open checks remain owned inside the Authority, while outer tool-registry readiness remains in `ApplicationPlatformLifecycle`. This keeps one authority construction contract without a separate general special case or hidden readiness dependency.

## 3. Exact Provider Builder Contracts

```ts
export type AgentProviderFactoryBuilderProcessInput = Readonly<{
  workspaceManager: WorkspaceManager;
  skillService: SkillService;
  autoByteus: Readonly<{
    agentFactory: AutoByteusAgentFactoryLike;
    createLlm: AutoByteusLlmFactory;
    processorRegistries: Readonly<ProcessorRegistries>;
    waitForIdle: AutoByteusAgentIdleWaiter;
    compactionAgentRunnerFactory: CompactionAgentRunnerFactory;
  }>;
  codex: Readonly<{
    workspaceSkillMaterializer: WorkspaceSkillMaterializer;
    workspaceResolver: CodexWorkspaceResolver;
    clientManager: CodexAppServerClientManager;
    threadManager: CodexThreadManager;
    threadCleanup: CodexThreadCleanup;
  }>;
  claude: Readonly<{
    workspaceResolver: ClaudeWorkspaceResolver;
    workspaceSkillMaterializer: WorkspaceSkillMaterializer;
    sdkClient: ClaudeSdkClient;
  }>;
}>;

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

export function createAgentProviderFactoryBuilder(
  input: AgentProviderFactoryBuilderProcessInput,
): AgentProviderFactoryBuilder;
```

Every leaf is required, non-null, and validated once when the builder is constructed. The top-level input and the `autoByteus`, `processorRegistries`, `codex`, and `claude` grouping objects are frozen; collaborator service/registry instances are deliberately not deep-frozen. “Readonly” fixes reference selection; it does not claim the process services themselves have no internal mutable state. There is no `dependencies`, provider map, token, optional field, registration method, or defaulting inside the builder.

## 4. Process Dependency Provenance

`autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` is the single provider-policy composition owner. Each host first selects one local `workspaceManager = getWorkspaceManager()`, then calls the helper exactly once with that identity. The helper selects the remaining eighteen process leaves, constructs the exact builder input, and returns only the builder. Each host passes the same workspace identity to the helper, general supervisor, and application-platform build, and the same returned builder identity to the supervisor and platform. The helper does not return the dependency record or offer lookup access.

```ts
export function createProcessAgentProviderFactoryBuilder(input: Readonly<{
  workspaceManager: WorkspaceManager;
}>):
  AgentProviderFactoryBuilder;
```

| Input Leaf | Exact Current Source / Process Owner | Identity Policy | Why Shared |
| --- | --- | --- | --- |
| `workspaceManager` | host-local `getWorkspaceManager()` result passed into the process helper, supervisor, and platform | one exact process identity across all three consumers | existing workspace registry/lifecycle and no supervisor ambient lookup |
| `skillService` | `SkillService.getInstance()` | one process identity | existing skill catalog/configuration |
| `autoByteus.agentFactory` | `defaultAgentFactory` from `autobyteus-ts` | one process identity | current native Agent registry |
| `autoByteus.createLlm` | `createAvailableLlm` | one shared function | current availability/credential/model policy |
| `autoByteus.processorRegistries.input` | `defaultInputProcessorRegistry` | one process identity | current processor policy |
| `autoByteus.processorRegistries.llmResponse` | `defaultLlmResponseProcessorRegistry` | one process identity | current processor policy |
| `autoByteus.processorRegistries.toolExecutionResult` | `defaultToolExecutionResultProcessorRegistry` | one process identity | current processor policy |
| `autoByteus.processorRegistries.toolInvocationPreprocessor` | `defaultToolInvocationPreprocessorRegistry` | one process identity | current processor policy |
| `autoByteus.processorRegistries.lifecycle` | `defaultLifecycleEventProcessorRegistry` | one process identity | current processor policy |
| `autoByteus.waitForIdle` | `waitForAgentToBeIdle` | one shared function | current native shutdown semantics |
| `autoByteus.compactionAgentRunnerFactory` | exported `createDefaultCompactionAgentRunner` | one shared function; runner fresh per call | current compaction fallback |
| `codex.workspaceSkillMaterializer` | `getCodexWorkspaceSkillMaterializer()` | one process identity | current materialized-skill ledger/location |
| `codex.workspaceResolver` | `getCodexWorkspaceResolver()` | one process identity | current workspace policy |
| `codex.clientManager` | `getCodexAppServerClientManager()` | one process identity | current Codex process/client lifecycle |
| `codex.threadManager` | `getCodexThreadManager()` | one process identity | current live Codex thread registry |
| `codex.threadCleanup` | `getCodexThreadCleanup()` | one process identity | current client/skill cleanup authority |
| `claude.workspaceResolver` | `getClaudeWorkspaceResolver()` | one process identity | current workspace policy |
| `claude.workspaceSkillMaterializer` | `getClaudeWorkspaceSkillMaterializer()` | one process identity | current materialized-skill ledger/location |
| `claude.sdkClient` | `getClaudeSdkClient()` | one process identity | current Claude SDK process client |

The AutoByteus factory file exports only the exact collaborator type aliases and `createDefaultCompactionAgentRunner` needed by this composition. This does not expose a mutable registry or create a second default policy.

## 5. Exact Constructor Mapping And Identity

| Constructed Object | Exact Mapping | Shared Or Fresh |
| --- | --- | --- |
| `AutoByteusAgentRunBackendFactory` | options: `agentFactory <- process.autoByteus.agentFactory`; `agentDefinitionService <- execution.agentDefinitionService`; `createLLM <- process.autoByteus.createLlm`; `workspaceManager <- process.workspaceManager`; `skillService <- process.skillService`; `registries <- process.autoByteus.processorRegistries`; `waitForIdle <- process.autoByteus.waitForIdle`; `compactionAgentRunnerFactory <- process.autoByteus.compactionAgentRunnerFactory` | factory fresh; all named collaborators shared |
| `CodexThreadBootstrapper` | arg 0 materializer; 1 resolver; 2 execution definition service; 3 process skill service; 4 client manager; 5 execution issuer | fresh; exact issuer/definition execution-local |
| `CodexAgentRunBackendFactory` | arg 0 process thread manager; 1 fresh bootstrapper; 2 process cleanup | fresh factory/bootstrapper; manager/cleanup shared |
| `ClaudeSessionManager` | arg 0 process workspace manager; 1 process SDK client; 2 execution issuer; 3 process workspace-skill materializer, forwarded to its fresh `ClaudeSessionCleanup` | fresh manager/session map/cleanup; collaborators shared except issuer |
| `ClaudeSessionBootstrapper` | arg 0 process resolver; 1 process materializer; 2 execution definition service; 3 process skill service | fresh bootstrapper; named collaborators shared |
| `ClaudeAgentRunBackendFactory` | arg 0 fresh session manager; 1 fresh bootstrapper | fresh |

Every `createForExecution` call returns a new frozen factory set and new provider-local bootstrap/session-manager/Claude-cleanup state. General and application calls share only the process identities in section 4 and the builder identity; their definition-service argument is the same canonical host definition service by approved design, while their issuer, factory set, Claude session manager/cleanup, managers, runs, and sessions are non-identical.

## 6. Provider Boundary And Timing

### Codex

`AgentRunManager -> CodexAgentRunBackendFactory -> CodexThreadBootstrapper -> issuer.issueForRun -> IssuedAgentToolMcpSession.descriptor -> CodexAgentToolsMcpConfig materializer -> Codex App Server thread`.

The bootstrapper receives only `AgentToolMcpSessionIssuer`. The existing issuance point remains after runtime exposure/working-directory resolution and before later workspace-skill/thread work. The run preparation owner handles post-issue failure revocation.

### Claude

`AgentRunManager -> ClaudeAgentRunBackendFactory -> ClaudeSessionManager -> ClaudeSessionStateInput.dependencies.agentToolMcpSessionIssuer -> ClaudeSession -> ClaudeAgentToolsMcpSessionState -> issuer on first query -> descriptor -> provider MCP config -> SDK query`.

`ClaudeSessionDependencies.agentToolMcpSessionIssuer` is required in the builder-created path and propagated by `ClaudeSessionManager`. `ClaudeSession` and `ClaudeAgentToolsMcpSessionState` depend only on the issuer. Lazy issuance and cached descriptor/resource remain session-owned. Query failure retains the issued session for supported retry; run/scope lifecycle revokes it.

Low-level/test constructors may retain unrelated provider defaults under the approved scope guardrail, but no governed root may omit any builder input. Any retained generic default for Agent Tools must be exposed as the narrow issuer/releaser projection; provider and mixed-Team files have zero broad manager/service imports.

### AutoByteus

AutoByteus obtains no MCP issuer. The builder supplies every existing process collaborator explicitly and preserves native behavior.

## 7. Exact Application Kernel Contract

```ts
export type ApplicationExecutionScopeBuildInput = Readonly<{
  scopeIdentity: ApplicationExecutionScopeIdentity;
  memoryDir: string;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolMcpSessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  workspaceManager: WorkspaceManager;
  bindingReader: ApplicationPublishedArtifactBindingReader;
  artifactDeliverySink: ApplicationPublishedArtifactDeliverySink;
}>;

type ApplicationExecutionScopeKernelBuildInput =
  ApplicationExecutionScopeBuildInput;
```

This is the exact application-scope construction input and the private kernel builder consumes the same shape without adding fields. All nine fields are required and non-null. It is the current `ApplicationExecutionScopeBuildInput` with the former mixed `agentToolsSessionFactory` replaced by the two singular boundaries it actually crossed: the construction-only scoped-authority factory and the fixed provider-factory builder. No raw Host, low-level session service, provider-specific collaborator, optional provider map, or generic dependency record may enter the application execution folder.

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
  abortConstruction(): void;
}>;
```

The kernel is private to `application-platform/execution`. `abortConstruction` is a fixed idempotent operation, not a generic disposer registry. It is legal only before the platform runtime is returned and therefore before any ingress can admit a run/session. Normal runtime close remains owned by `ApplicationExecutionScope` and stops Teams, then Agents, then closes the authority.

## 8. Ordered Construction And Unwind

| Phase | Exact Construction | Newly Acquired Closeable / Ledger Action | Failure Disposer | Ownership After Success |
| --- | --- | --- | --- | --- |
| K0 | validate every scope build input | none | none | builder attempt |
| K1 | `authorityFactory.begin({scopeIdentity})` | authority assembly; push `assembly.abort` | `assembly.abort()` | builder ledger |
| K2 | memory location, run-file-change service, artifact relay, memory recorder, resource manager using `assembly.runSessions`, activation registry, projection/snapshot stores, publication service | none; plain non-started objects | none | builder locals |
| K3 | `assembly.complete({ executionCapabilities: { publishedArtifactPublisher: publicationService }, assertExecutionCapabilitiesReady: () => undefined })` | replace K1 ledger entry atomically with `authority.close` | if completion throws, K1 `abort`; after completion, `authority.close()` | builder ledger owns full authority |
| K4 | `providerBuilder.createForExecution({agentDefinitionService, authority.issuer})` | none | none | builder locals |
| K5 | `AgentRunManager` with factory set, activation registry, memory recorder, and `authority.runSessions`; identity/history/provisioning/activation/Agent service graph | none; no run admitted/started | none | builder locals |
| K6 | member context/activity services, `AgentTeamRunManager`, configured/task registries receiving `authority.runSessions`, Team service graph | none; no Team admitted/started | none | builder locals |
| K7 | shutdown coordinator, stream source, projection service, and the frozen kernel of eight owned dependencies plus `abortConstruction` | kernel receives fixed `abortConstruction`; no new closeable | if freeze/assembly throws, ledger authority close | builder locals plus ledger |
| K8 | transfer | clear builder ledger only after complete kernel exists | none after transfer | returned kernel exclusively owns authority |

The phase list is closed. Plain services/managers in K2/K4–K7 allocate no external resource, listener, run, session, worker, or background loop during construction, so their disposer is deliberately `none`. A future closeable phase requires a design/inventory update; the builder may not expose a generic `registerDisposer` extension point.

### Scope construction and outer abort

1. `ApplicationExecutionScope.create` receives the complete kernel from K8.
2. If its private constructor throws, it invokes `kernel.abortConstruction()` and aggregates cleanup as below.
3. Once scope construction succeeds, the scope owns the kernel.
4. If later `buildApplicationPlatformRuntime` construction fails before returning the runtime, `scope.abortConstruction()` delegates exactly once to `kernel.abortConstruction()`.
5. Because no ingress or lifecycle start has escaped, abort blocks the authority and closes it; it does not invent a run-stop path for runs that cannot exist.
6. Once the runtime is returned, only normal `quiesce/close` is legal.

### Error contract

- Preserve the original construction error object when cleanup succeeds.
- Execute ledger disposers in strict reverse acquisition order and collect every cleanup error without stopping later cleanup.
- If cleanup also fails, throw `AggregateError([primary, ...cleanupErrors], "Application execution scope construction failed.")`; the original thrown value is preserved at index 0 and cleanup errors follow actual reverse-disposal order.
- `abortConstruction` is idempotent. A cleanup failure is visible to the outer platform aggregate and does not restore ownership to the builder.
- Successful K8 transfer clears the builder ledger, so builder catch logic cannot close the transferred authority. Scope abort/close is the only post-transfer disposer.

## 9. Failed Agent Preparation

1. `AgentRunManager` obtains a claim.
2. Provider may issue one or more sessions.
3. On backend/run preparation failure, existing backend/run abort runs first when present.
4. Manager invokes its required `AgentToolMcpRunSessionReleaser.revokeForRun(claim.runId)` before completing claim cleanup.
5. Claim completion/quarantine follows existing authority.
6. Primary provider error remains first; abort/revocation errors are aggregated and cleanup is never swallowed.

Revocation is idempotent with activation-resource cleanup and closes the pre-attachment gap. Mixed configured/task handles receive the same narrow releaser for their existing defensive exact-run disposal; they never receive issuer or authority.

## 10. Execution-Root Assembly And Close

The target root-facing input changes are exact:

```ts
type GeneralProcessRunSupervisorInput = Readonly<{
  appConfig: AppConfig;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  workspaceManager: WorkspaceManager;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
}>;

// Existing ApplicationPlatformBuildInput fields remain unchanged except:
// remove agentToolsSessionFactory;
// add agentToolMcpSessionAuthorities: AgentToolMcpSessionAuthorityFactory;
// add agentProviderFactoryBuilder: AgentProviderFactoryBuilder.
```

The supervisor consumes only `authority.issuer` for its builder call and `authority.runSessions` for its Agent/mixed-Team cleanup graph; it retains the full authority only because it owns that execution family's normal close. Application platform passes only the authority factory and builder into the private scope construction boundary.

```text
host composition
  -> create AgentToolsMcpHost
  -> create one process AgentProviderFactoryBuilder
  -> begin/complete general ScopedAgentToolMcpSessionAuthority
  -> create GeneralProcessRunSupervisor(builder, general authority)
  -> build ApplicationPlatformRuntime(host.sessionAuthorities, same builder, ...)
       -> ApplicationExecutionScopeKernelBuilder
       -> application Authority assembly/complete
       -> ApplicationExecutionScope
```

Root ownership transfer is exact: the root owns the Host immediately; it owns the completed general Authority until `GeneralProcessRunSupervisor` construction succeeds; the supervisor then owns that Authority. If supervisor construction fails, the root closes the Authority. `buildApplicationPlatformRuntime` owns its scope construction/outer abort as defined in section 8 and transfers the complete platform only on return. On any later root failure, the root closes a returned platform first, then the supervisor, then the Host. A builder is immutable policy and needs no close.

Close order remains: quiesce host ingress -> application platform drains/stops Teams then Agents and closes application authority -> general supervisor stops Teams then Agents and closes general authority -> process Host closes registry/catalog/routes. Each close is idempotent and error aggregation does not skip later owners.

## 11. Allowed / Forbidden Dependencies

Allowed:

- Studio/standalone -> process provider composition + Host + general supervisor + platform runtime;
- process provider composition -> exact process sources in section 4 -> builder;
- execution owner -> builder + its own Authority ports;
- builder -> provider factories/adapters and exact named process collaborators;
- provider -> issuer -> issued descriptor -> provider materializer;
- run/resource/mixed-member cleanup -> run-session releaser;
- kernel builder -> construction-only authority assembly.

Forbidden:

- supported roots/scope/supervisor -> provider-specific constructors/getters or positional defaults;
- provider/mixed-Team/run cleanup -> whole Host, full Authority, broad MCP manager/service, registry, or catalog;
- kernel builder -> generic disposer/container, incomplete result, later runtime binding, non-null assertion, optional dependency dictionary;
- caller -> scope plus raw manager;
- string/token lookup, `Record<string, unknown>` dependency bag, provider map, mutable registration, manager map, compatibility alias, or mode-switched host builder.

## 12. Persisted Data

`Not Affected`. The exact builder/authority/kernel contracts are runtime-only. No database, JSON, journal, SDK, protocol, package, launch, run, or Team shape changes.
