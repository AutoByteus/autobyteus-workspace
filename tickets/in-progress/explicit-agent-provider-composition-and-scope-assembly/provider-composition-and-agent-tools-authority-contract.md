# Provider Composition And Agent Tools Authority Contract

Status: Normative cumulative design supplement. SR-007 preserves the accepted SR-006 provider/Authority/Mixed Team and execution-family closure while integrating latest Personal stopped-run configuration and application-ownership behavior through explicit validator and lifecycle boundaries.

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
| `AgentRunManager` | one execution family | claim, backend/run preparation, pre-attachment failure cleanup; consumes complete resource/normalizer inputs | existing run behavior | Host/catalog/authority lifecycle; infrastructure selection |
| `RootTeamRun` | one rooted Team execution | task command/state/persistence/event lifecycle | existing Team/task operations | identity authority selection |
| `AgentRunProviderInputNormalizer` | one execution family | copy and resolve provider-bound context locators | one dispatch transform | provider formatting or mutable input state |

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

Low-level/test constructors may retain unrelated provider defaults under the approved scope guardrail, but no governed root may omit any builder input. Agent Tools authority is not an unrelated provider default: provider and Mixed Team files have zero broad manager/service imports and no issuer/releaser getter fallback.

### AutoByteus

AutoByteus obtains no MCP issuer. The builder supplies every existing process collaborator explicitly and preserves native behavior.

### Mixed Team Releaser And Execution-Family Construction

Mixed Team execution receives no issuer. The execution owner selects its completed Authority's `runSessions` projection exactly once. The existing backend factory remains the recursive Team/backend owner, while the execution root remains the owner of the manager dependency family. Their exact production contract is:

```ts
export type MixedTeamManagerConstructionInput = Readonly<{
  context: TeamRunContext<MixedTeamRunContext>;
  subTeamRunFactory: MixedSubTeamRunFactory;
  callbacks: MixedTeamRunCallbacks;
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
}>;

export type MixedTeamRunBackendFactoryOptions = Readonly<{
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
  createTeamManager(input: MixedTeamManagerConstructionInput): MixedTeamManager;
}>;
```

Both fields are required, non-null, and constructor-validated. `createTeamManager` is a governed production construction capability, not a test-only escape hatch. For every root or recursively materialized child Team, `MixedTeamRunBackendFactory` supplies its own fixed releaser together with the exact context, sub-Team factory, and root callbacks. It has no built-in/default `new MixedTeamManager(...)` path.

Each maintained execution root supplies one callback that constructs every `MixedTeamManager` with the complete execution-family dependencies:

| Dependency | General Process Source | Application Source |
| --- | --- | --- |
| `agentRunManager` | supervisor's process `AgentRunManager` | kernel's graph-local `AgentRunManager` |
| `agentToolMcpRunSessionReleaser` | callback input fixed from general Authority `.runSessions` | callback input fixed from application Authority `.runSessions` |
| `memoryLocationService` | `new AgentMemoryLocationService({memoryDir})` owned by supervisor assembly | K2 graph-local `AgentMemoryLocationService` |
| `activityInspector` | `new AgentConversationActivityInspector()` owned by supervisor assembly | K6 graph-local inspector |
| `memberTeamContextBuilder` | builder over canonical host Team definitions | builder over the same canonical host Team definitions in the application graph |
| `workspaceManager` | exact host-selected workspace identity | exact platform build-input workspace identity |
| per-Team context/sub-Team/callbacks | required construction input from backend factory | same |

The callback must use `input.agentToolMcpRunSessionReleaser`; it may not close over the Authority, call a process getter, select a second releaser, or omit any execution-family dependency on either maintained root. The general and application roots therefore share construction shape while retaining non-identical mutable owners and session authorities.

`MixedTeamRunBackendFactory` has no process session-service import, releaser getter, default options object, cached/default factory export, or default manager construction. `AgentTeamRunManagerOptions.mixedTeamRunBackendFactory` is required and constructor-validated. General execution creates the process manager only through `initializeProcessInstance({ mixedTeamRunBackendFactory, ... })`; application execution constructs its non-singleton manager with its application factory. `AgentTeamRunManager.getInstance()` is lookup-only, accepts no options, and throws before process initialization. No node below either execution root can infer or select an execution family.

## 7. Exact Execution-Family Additions

```ts
export type ContextFilePathEnvironment = Readonly<{
  appDataDir: string;
  baseUrl: string;
}>;

export function createContextFilePathEnvironment(input: Readonly<{
  appDataDir: string;
  baseUrl: string;
}>): ContextFilePathEnvironment;

export type ContextFileLayoutInput = Readonly<{
  appDataDir: string;
  memoryDir: string;
}>;

export type ContextFileLocalPathResolverInput = Readonly<{
  layout: Pick<ContextFileLayout, "getDraftFilePath" | "getFinalFilePath">;
  ownerResolver: Pick<ContextFileOwnerResolver, "resolveFinalOwnerSync">;
  baseUrl: string;
}>;

export type ContextFileOwnerResolverInput = Readonly<{
  locations: Pick<TeamRunExecutionTreeLocationService, "findAgent" | "findAgentSync">;
}>;

export type RunModelConfigValidator = Pick<
  ModelConfigValidationService,
  "validate"
>;

export type GeneralProcessRunSupervisorInput = Readonly<{
  memoryDir: string;
  contextFilePathEnvironment: ContextFilePathEnvironment;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  workspaceManager: WorkspaceManager;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
  modelConfigValidator: RunModelConfigValidator;
}>;

export type TaskExecutionIdentityCapabilities = Readonly<{
  agentRuns: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  taskTeams: Pick<TaskTeamRunIdentityFactory, "create">;
}>;

export function createTaskExecutionIdentityCapabilities(
  agentRuns: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">,
): TaskExecutionIdentityCapabilities;

export class AgentRunProviderInputNormalizer {
  constructor(
    localPathResolver: Pick<ContextFileLocalPathResolver, "resolve">,
  );
  normalizeForProvider(
    dispatch: AgentRunBackendInputDispatch,
  ): AgentRunBackendInputDispatch;
}

export type CompleteAgentRunManagerOptions = Readonly<{
  autoByteusBackendFactory: AgentRunBackendFactory;
  codexBackendFactory: AgentRunBackendFactory;
  claudeBackendFactory: AgentRunBackendFactory;
  activationRegistry: AgentRunActivationRegistry;
  memoryRecorder: AgentRunMemoryRecorder;
  providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">;
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
}>;
```

All fields are required/non-null and runtime-validated. `createContextFilePathEnvironment` trims/requires both strings, requires the trimmed `baseUrl` to parse as an absolute HTTP(S) URL, freezes the trimmed two-field value, and imports no AppConfig. `ContextFilePathEnvironment` contains only the two path/URL leaves not already carried by `memoryDir`; it is not AppConfig or an optional dictionary.

The value and creator live in `context-files/domain/context-file-path-environment.ts`; execution contracts import that owned type rather than redeclaring parallel `{appDataDir, baseUrl}` records.

The general supervisor input has exactly eight required top-level fields and nine leaves. Host composition snapshots AppConfig, calls `createContextFilePathEnvironment` once, creates one `ModelConfigValidationService` from the selected process model catalog, and supplies `memoryDir`, the frozen context identity, and the narrow validator. The supervisor neither imports nor receives AppConfig or the model catalog. The same context and validator identities enter the application build input below. Process REST registration does **not** construct the context value: that transport boundary needs only `appDataDir` and `memoryDir`, so requiring an unused `baseUrl` there would add empty coupling.

`ModelConfigValidationService` requires its catalog constructor input and contains no `getModelCatalogService()` default. Its direct unit tests already supply an explicit catalog. `StandaloneAgentRunLifecycleService` and `AgentTeamRunManager` require `RunModelConfigValidator` and contain no optional/default validator branch. `AgentRunService` requires the root-created lifecycle service; `getAgentRunService()` is lookup-only and throws before `GeneralProcessRunSupervisor` binds the process service. This closes validator and transition-lane selection at the execution roots without adding a mutable owner.

`createStoredTeamRunExecutionTreeLocationService(memoryDir: string)` requires a non-empty memory root. `ContextFileOwnerResolver` requires the named `locations` input above; `ContextFileReadService` and `ContextFileFinalizationService` require an owner resolver and contain no default construction. At process REST registration, one AppConfig snapshot supplies only the needed `{appDataDir, memoryDir}`, one stored-only locations identity creates one owner resolver, and that same resolver is passed to both services. The REST edge never selects general or application live Team ownership.

`createTaskExecutionIdentityCapabilities(agentRuns)` creates exactly one `TaskTeamRunIdentityFactory(agentRuns)`, freezes the pair, and returns no lifecycle/lookup surface. The pair identity is required by `AgentTeamRunManager`, `RootTeamRun`, and `TaskDelegationService`. The task service and Team factory contain no `AgentRunIdentityAllocator.getInstance()` or default allocator.

`AgentRunProviderInputNormalizer` owns one synchronous copy/translate operation at the AgentRun provider-dispatch boundary. It never mutates the admitted message. Its resolver is explicitly constructed from:

- `ContextFileLayout({appDataDir, memoryDir})`;
- `new ContextFileOwnerResolver({ locations: storedTeamLocations })`, with `storedTeamLocations = createStoredTeamRunExecutionTreeLocationService(memoryDir)` and the same identity used by task allocation in the execution family;
- explicit configured `baseUrl` for origin matching.

It preserves dispatch kind/turn ID and message/context fields, replacing only locators that resolve to an existing local path. It leaves unresolvable values unchanged.

Copy semantics are exact rather than spread-based guesswork: preserve `null` versus array for `contextFiles`; create a new `AgentInputUserMessage` with byte-identical content/sender and a shallow copy of message metadata; create every `ContextFile` with the selected URI and a shallow metadata copy, then explicitly restore the source `fileType` and `fileName` after construction so constructor inference cannot reclassify the copy. The provider copy remains mutable because the existing AutoByteus formatter legitimately normalizes workspace-relative paths on that private copy. The original message, context-file objects, arrays, and metadata objects retain identity/content and are never passed to a mutating provider formatter.

`AgentRunManager` consumes `CompleteAgentRunManagerOptions`. In each supported root the `memoryRecorder` field is the exact same object used inside the `AgentRunResourceManager` behind `activationRegistry`; architecture and runtime identity proof enforce this. It constructs no provider factory, resource manager, activation registry, run-file service, artifact relay, or process memory recorder and imports no getter for those owners. It injects the normalizer into every `AgentRun`.

The existing production option contracts change only as follows; every unlisted field/method retains its current requiredness and semantics:

| Contract | Add / Make Required | Remove |
| --- | --- | --- |
| `AgentRunOptions` | `providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">` | none; `commandObservers` remains optional because empty observation is valid |
| `AgentTeamRunManagerOptions` | `memoryDir: string`; `taskExecutionIdentity: TaskExecutionIdentityCapabilities`; `modelConfigValidator: RunModelConfigValidator`; existing `mixedTeamRunBackendFactory` stays required | AppConfig memoryDir fallback and validator fallback; stores remain optional manager-owned defaults |
| `StandaloneAgentRunLifecycleService` dependencies | `modelConfigValidator: RunModelConfigValidator` | optional validator and default `new ModelConfigValidationService()` |
| `AgentRunService` dependencies | exact root-created `lifecycleService: StandaloneAgentRunLifecycleService` | optional/default lifecycle construction; process accessor lazy construction |
| `RootTeamRun` constructor options | `taskExecutionIdentity: TaskExecutionIdentityCapabilities` | no lifecycle/persistence field change |
| `TaskDelegationServiceOptions` | `taskExecutionIdentity: TaskExecutionIdentityCapabilities` | `agentRunIdentityAllocator?`; `taskTeamRunIdentityFactory?`; existing token-usage readiness test seam remains unchanged |
| `TaskTeamRunIdentityFactory` constructor | argument 0 Agent allocator required; argument 1 token generator remains optional/testable | default/global Agent allocator |

## 8. Exact Application Kernel Contract

```ts
export type ApplicationExecutionScopeBuildInput = Readonly<{
  scopeIdentity: ApplicationExecutionScopeIdentity;
  memoryDir: string;
  contextFilePathEnvironment: ContextFilePathEnvironment;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolMcpSessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  workspaceManager: WorkspaceManager;
  bindingReader: ApplicationPublishedArtifactBindingReader;
  artifactDeliverySink: ApplicationPublishedArtifactDeliverySink;
  modelConfigValidator: RunModelConfigValidator;
}>;

export type ApplicationExecutionScopeKernel = Readonly<{
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

There are eleven required top-level inputs and twelve required leaves because `contextFilePathEnvironment` has two. The output remains exactly eight owned dependencies plus the fixed construction-abort method. It is private to `application-platform/execution`; no raw manager, identity allocator, normalizer, task capability, provider factory, input record, validator, or construction assembly escapes.

`ApplicationExecutionScope` stores the one kernel and exposes only its accepted seven capability projections. It does not mirror the input, accept partials, or bind later.

## 9. Ordered Construction And Unwind

| Phase | Acquire / Build | Starts Work? | Disposer After Success | Owner Before Transfer |
| --- | --- | --- | --- | --- |
| K0 | validate eleven top-level fields, both path-environment leaves, and the validator operation | no | none | builder attempt |
| K1 | authority `begin(scopeIdentity)` | no | `assembly.abort` | ledger |
| K2 | one stored-only Team location reader; exact context layout/owner/local resolver + input normalizer; memory/run-file/relay/resource/activation/publication graph | no | none | builder locals |
| K3 | `assembly.complete(publication capability, current readiness callback)` | no | replace abort with `authority.close` atomically | ledger |
| K4 | provider builder `createForExecution(definitions, authority.issuer)` | no | none | builder locals |
| K5 | complete Agent manager from seven required inputs; metadata/history; exact allocator over K2 stored reader; derived task-identity pair; exact lifecycle using the input validator; Agent services using that lifecycle | no | none | builder locals |
| K6 | Team manager from required Mixed Team factory/callback plus K5 task identity and the same input validator; Team services/activity/context | no | none | builder locals |
| K7 | shutdown/stream/projection owners and frozen kernel | no | none | ledger + kernel candidate |
| K8 | return kernel | no | clear builder ledger; kernel owns fixed abort | scope after return |

The K2 stored reader is reused by both context owner resolution and identity collision checks. This is deliberate identity consistency, not a shared mutable manager. Fresh Team creation writes the V2 tree before root materialization; restore loads V2 before materialization; task mutation commits the next tree before live-state replacement; indeterminate finalization fail-stops the root. Those existing invariants make stored-only reads authoritative at every supported allocation/dispatch boundary.

### Scope construction and outer abort

The scope constructor calls the builder inside `try`, stores the returned kernel, creates/freeze projections, then marks construction complete. If anything throws after K8 but before scope return, it invokes `kernel.abortConstruction()` once. `buildApplicationPlatformRuntime` retains a local scope until the platform is returned; any later assembly failure invokes the scope's construction-abort path once. After return, the construction-abort path is invalidated by normal lifecycle ownership; callers use quiesce/close.

### Error contract

- primary failure + successful cleanup: rethrow the same primary error;
- primary + one/more cleanup failures: run every reverse disposer and throw `AggregateError([primary, ...cleanupErrorsInActualReverseOrder])`;
- cleanup-only normal close: preserve existing lifecycle aggregate semantics;
- `abortConstruction`, assembly `abort`, and authority `close` are idempotent;
- no generic disposer registry is permitted.

## 10. Root-Local Task Identity Contract

The exact spine is:

`execution root -> stored Team reader + canonical Agent definitions + exact Agent manager + metadata + memoryDir -> AgentRunIdentityAllocator -> createTaskExecutionIdentityCapabilities -> AgentTeamRunManager -> RootTeamRun -> TaskDelegationService`.

The stored reader is authoritative for these pre-Team-manager queries because both maintained hosts rebuild `TeamRunPackageCatalog` before execution construction; the reader enumerates only admitted roots, fresh creation admits only after tree/tasks/messages commit, restore requires an admitted complete package, and task activation persists the next tree before live commit. An indeterminate live finalization fail-stops its root. No active-manager overlay is required or allowed on this construction path.

`AgentTeamRunManagerOptions.memoryDir`, `.mixedTeamRunBackendFactory`, and `.taskExecutionIdentity` are required; the manager has no AppConfig memory-root fallback. The execution root passes the allocator behind `.agentRuns` by exact identity to `AgentRunProvisioningService`, `AgentRunService`, and `TeamRunService` as well as the capability creator. The Team manager passes the pair unchanged to every root created/restored. Root passes it unchanged to the task service. `TaskDelegationServiceOptions.taskExecutionIdentity` is required. Agent task allocation uses `.agentRuns`; nested task-Team materialization uses `.taskTeams` created from the same allocator.

General and application pairs must be non-identical, and their `agentRuns` must call only their execution-family manager. `RootTeamRun` remains the only task command FIFO, mutation/persistence coordinator, publisher, settlement owner, and fail-stop owner. The pair never receives `RootTeamRun`, a manager map, an application/run ID router, or a late binding.

## 11. Provider Input Contract

The exact spine is:

`claimed AgentRunBackendInputDispatch -> AgentRunProviderInputNormalizer(copy) -> explicitly rooted ContextFileLocalPathResolver -> provider backend -> provider formatter`.

`AgentRun` requires the normalizer. It invokes it only inside `executeInputDispatch` immediately before `backend.dispatchUserInput`. The original claim and message remain the authority for admission, lifecycle observation, memory recording, correlation, and dispatch-result application.

Provider changes are clean cuts:

- AutoByteus processor removes its resolver import/field and keeps workspace-relative/absolute/URL safety and prompt behavior.
- Codex mapper removes resolver construction/options and formats the copied absolute/file/data/remote inputs with existing reference/image behavior.
- Claude session/state removes `contextFileLocalPathResolver`; session formatting uses existing reference behavior on the copied input.

No provider imports `ContextFileLocalPathResolver`, `ContextFileOwnerResolver`, Team tree/manager, AppConfig, scope, or Authority. No normalizer imports a provider.

The process REST companion spine is `route registration -> AppConfig root snapshot -> explicit ContextFileLayout + stored Team locations -> one ContextFileOwnerResolver -> finalization/read`. It owns transport composition only; it does not participate in Agent execution and cannot select a mutable Team manager. Finalization and read keep their current async owner-resolution, safe-path, cleanup, MIME, and error behavior.

## 12. Failed Agent Preparation

1. `AgentRunManager` obtains a claim.
2. Provider preparation may issue a session.
3. On later failure, manager performs current backend/run cleanup and calls `runSessions.revokeForRun(runId)` before completing claim abort/failure.
4. Every cleanup action is attempted; primary-plus-cleanup evidence is preserved.
5. Claude query failure after a successfully attached run remains retryable and does not trigger this path; normal run/scope close revokes it.

The new complete manager input does not change this behavior; it makes the releaser/resource/activation/normalizer identities impossible to infer.

## 13. Execution-Root Assembly And Close

### General process

1. Host composition selects AppConfig roots and the process model catalog once; explicit `memoryDir`, frozen `{appDataDir, baseUrl}`, workspace, definitions, builder, completed general Authority, and one narrow validator enter `GeneralProcessRunSupervisor`.
2. Supervisor validates the eight-top-level/nine-leaf input; creates one stored Team reader, context resolver/normalizer, run-file service, general no-op artifact relay, memory recorder, resource manager, and activation registry.
3. Builder creates provider factory set with general issuer.
4. Supervisor initializes the process Agent manager with all seven required inputs.
5. Supervisor constructs metadata + allocator over the same stored reader, derives one general task-identity pair, constructs `StandaloneAgentRunLifecycleService` with the input validator, and passes that lifecycle explicitly to `AgentRunService`.
6. Supervisor constructs the required Mixed Team callback/factory and initializes Team manager with its explicit `memoryDir`, pair, and the same validator.
7. Existing services/bindings start; `getAgentRunService()` can only return the bound service and never constructs one.
8. Close blocks new sessions, stops Teams before Agents, closes Authority, releases process bindings/managers, then outer Host closes after both execution families.

### Application

1. Platform passes the exact scope identity, memoryDir, `{appDataDir, baseUrl}`, canonical definitions, authority factory, provider builder, workspace, binding reader, delivery sink, and the same host-selected validator.
2. K0–K8 builds the corresponding graph-local normalizer, complete Agent manager, allocator/task pair, exact lifecycle, Team manager, and scope kernel; the validator does not escape through a scope capability.
3. Existing scope quiesce blocks admission/session creation; close preserves Team-before-Agent, resource/session revocation, and authority close.
4. General manager/authority identities are not used or initialized to satisfy application construction.

## 14. Allowed / Forbidden Dependencies

Allowed:

- composition -> Host, process provider helper/builder, explicit memory/context path values, general supervisor, application platform;
- composition -> process model catalog -> one explicit validator -> general supervisor + application platform;
- execution owner -> builder + scoped Authority ports + stored Team read model + context resolvers + complete resources;
- process context REST edge -> explicit roots + stored Team read model -> one owner resolver -> read/finalization;
- Agent manager -> AgentRun + normalizer;
- execution root -> exact Agent lifecycle and Team manager using the same supplied validator;
- Team manager -> RootTeamRun + task identity;
- RootTeamRun -> task service -> immutable task identity;
- provider -> already-normalized input and issuer/descriptor/materializer;
- run/resource/member cleanup -> releaser;
- Mixed Team factory -> required root-owned callback.

Forbidden:

- execution owner/provider -> AppConfig; provider -> context resolver/owner, Team manager/tree lookup, full Authority/Host/scope;
- Agent lifecycle/Team manager/validation service -> model-catalog getter, optional validator, or default validator construction;
- `AgentRunService` -> default lifecycle construction; `getAgentRunService()` -> lazy process construction;
- context layout/local/owner/read/finalization leaves -> AppConfig or mutable Team-manager selection;
- task service/factory -> global allocator/manager/service;
- Agent manager -> default provider/resource/activation/sidecar/recorder or optional dependency;
- supported roots -> provider constructors/getters or positional `undefined`;
- application execution -> process Agent/Team manager or process service getter;
- general execution -> application scope internals;
- Mixed Team lower layers -> process releaser/factory/default manager;
- generic DI/container/service locator, optional dependency dictionary, manager map, mutable late binding, compatibility wrapper, or one mode-switched root.

## 15. Persisted Data

No store/schema/protocol changes. Existing run metadata, V2 Team execution trees, task records, context-file locators, platform state, bindings, and provider session identities remain directly usable. The target changes in-memory construction and provider-bound copies only. Decision: **Directly Usable — No Migration** (equivalently `Not Affected` for schema ownership); no read fallback, rewrite, or migration is permitted.

## 16. Latest Personal Run-Configuration And Ownership Contract

The normative authority and transition detail is
`latest-personal-run-configuration-integration-analysis.md`. Its exact boundary
is cumulative with sections 1–15:

- stopped Agent updates remain serialized by
  `StandaloneAgentRunLifecycleService` per run;
- stopped Team updates remain serialized by `AgentTeamRunManager` per root and
  validate every target before the single V2 write;
- both execution roots receive the same host-selected stateless validator, but
  their managers, task identities, session Authorities, transition lanes, and
  cleanup remain non-identical;
- application binding ownership remains an outer, read-only
  `ApplicationRunOwnershipService` projection exposed through
  `ApplicationPlatformRuntime.hostManagement`;
- `StudioRunModelConfigService` checks that projection before delegating only
  released runs to the general Agent/Team facades;
- `ApplicationExecutionScope` still exposes exactly seven capabilities and no
  stopped-run configuration command;
- the deleted broad `create-application-run-services.ts` and its test remain
  absent.

No uncertainty path may perform a speculative write, retry, fallback to another
execution family, or infer ownership from manager visibility. Canonical reread
and current Personal result semantics are preserved exactly.
