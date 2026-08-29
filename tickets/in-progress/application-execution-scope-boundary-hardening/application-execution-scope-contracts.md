# Application Execution Scope Normative Contracts

## Status

- Status: `Design-ready`
- Authority: normative structural contract for SR-003; it refines REQ-001–REQ-010 without changing product behavior.
- No optional execution dependency, index signature, `unknown` value, generic service lookup, or fallback is permitted in these shapes.

## Platform Build Input

`buildApplicationPlatformRuntime` keeps one flat, named input exported from `build-application-platform-runtime.ts`, the builder that owns it. The process dependencies are intentionally verbose: the host composition must reveal what it shares. This outer input is not placed in the scope-contract file.

```ts
export type ApplicationPlatformBuildInput = Readonly<{
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionFactory: ApplicationAgentToolsSessionFactory;
  workspaceManager: WorkspaceManager;
  runtimeAvailabilityService: RuntimeAvailabilityService;
  modelCatalogService: ModelCatalogService;
  modelAvailabilityService: ModelAvailabilityService;
  llmProviderService: LlmProviderService;
  codexClientManager: CodexAppServerClientManager;
  requireCurrentModelIdentifier: (modelIdentifier: string) => Promise<void>;
  selectedApplicationIds?: ReadonlySet<string> | null;
}>;
```

Only `selectedApplicationIds` is optional because it is the existing host-selection policy: absent/null means Studio/all; a supplied set means the selected standalone set. Every process owner is required and non-null.

## Scope Identity

```ts
export type ApplicationExecutionScopeIdentity = `application:${string}`;

const deriveApplicationExecutionScopeIdentity = (
  selectedApplicationIds?: ReadonlySet<string> | null,
): ApplicationExecutionScopeIdentity => selectedApplicationIds
  ? `application:${Array.from(selectedApplicationIds).sort().join(",")}`
  : "application:studio";
```

This preserves the current byte-for-byte derivation, including `application:` for a supplied empty set. The platform builder derives it once and passes it to the scope. Host callers do not construct it, and no application ID is later used to locate a scope.

## Scope Build Input

```ts
export type ApplicationExecutionScopeBuildInput = Readonly<{
  scopeIdentity: ApplicationExecutionScopeIdentity;
  memoryDir: string;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionFactory: ApplicationAgentToolsSessionFactory;
  workspaceManager: WorkspaceManager;
  bindingReader: ApplicationPublishedArtifactBindingReader;
  artifactDeliverySink: ApplicationPublishedArtifactDeliverySink;
}>;
```

The relay owner exports these two narrow outer ports from `application-published-artifact-relay-service.ts`:

```ts
export interface ApplicationPublishedArtifactBindingReader {
  getBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationAgentBindingRecord | null>;
}

export interface ApplicationPublishedArtifactDeliverySink {
  accept(command: ApplicationPublishedArtifactDeliveryCommand): Promise<void>;
}
```

`ApplicationRunBindingStore` and `ApplicationPublishedArtifactDeliveryQueue` satisfy the ports structurally. Scope contracts do not expose either concrete outer owner.

Owner mapping:

| Input | Owner | Why scope consumes it | Must not happen |
| --- | --- | --- | --- |
| `scopeIdentity` | platform builder | one MCP/session ownership namespace | recompute from a request/application ID |
| `memoryDir` | `AppConfig`/host configuration | construct memory/history/resource owners | scope retaining whole `AppConfig` |
| Agent/Team definition services | `HostDefinitionServices` | canonical definition/topology reads | scope-created or singleton definition service |
| session factory | process `AgentToolsMcpRuntime` | create application-only session scope/manager on one route/catalog | owning/closing process MCP runtime |
| workspace manager | process workspace infrastructure | memory/files/provisioning/Team workspace use | `getWorkspaceManager()` in scope or consumers |
| binding reader | orchestration persistence | publication relay resolves the bound application | binding writes or generic store access inside scope |
| artifact delivery sink | outer platform delivery queue | publication relay emits delivery commands | scope owning/draining worker delivery |

## Capability Contracts

The concrete `ApplicationExecutionScope` has seven frozen readonly properties with the following exact contracts. No raw implementation class appears in a consumer constructor. All seven capability contracts and the scope build input live in `application-execution-scope-contracts.ts`; the outer platform build input remains exported by `build-application-platform-runtime.ts`. The signatures use type-only imports for the existing authorized descriptor, stream event, Agent input message, Team address, creation inputs, lifecycle event, and read projections, so they introduce no runtime dependency or second owner. Live `AgentRun` and `RootTeamRun` types are deliberately absent.

```ts
export type ApplicationAgentLaunchResult = Readonly<{
  runId: string;
}>;

export type ApplicationTeamLaunchMember = Readonly<{
  memberAddress: AgentTeamAddress;
  agentRunId: string;
}>;

export type ApplicationTeamLaunchResult = Readonly<{
  teamRunId: string;
  members: readonly ApplicationTeamLaunchMember[];
}>;

export type ApplicationExecutionInputDisposition =
  | Readonly<{ kind: "ACCEPTED" }>
  | Readonly<{ kind: "REJECTED"; message: string | null }>
  | Readonly<{ kind: "NOT_AVAILABLE" }>;

export interface ApplicationAgentExecution {
  createAgentRun(input: CreateAgentRunInput): Promise<ApplicationAgentLaunchResult>;
  postAgentInput(
    runId: string,
    message: AgentInputUserMessage,
  ): Promise<ApplicationExecutionInputDisposition>;
  terminateAgentRun(runId: string): Promise<AgentRunTerminationResult>;
  observeAgentRunLifecycle(
    runId: string,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null>;
}

export interface CreateTeamRunFromRootConfigInput {
  teamDefinitionId: string;
  rootConfig: TeamRunPresetInput;
  memberConfigs?: TeamRunMemberConfigInput[] | null;
  applicationBinding?: { applicationId: string; bindingId: string } | null;
}

export interface ApplicationTeamExecution {
  createTeamRun(input: CreateTeamRunInput): Promise<ApplicationTeamLaunchResult>;
  createTeamRunFromRootConfig(
    input: CreateTeamRunFromRootConfigInput,
  ): Promise<ApplicationTeamLaunchResult>;
  postTeamInput(
    teamRunId: string,
    message: AgentInputUserMessage,
    targetAgentRunId: string | null,
  ): Promise<ApplicationExecutionInputDisposition>;
  terminateTeamRun(teamRunId: string): Promise<boolean>;
  observeTeamRunLifecycle(
    teamRunId: string,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null>;
}

export interface ApplicationExecutionStreaming {
  attach(
    descriptor: AuthorizedApplicationAgentTargetDescriptor,
    listener: (event: ApplicationAgentStreamSourceEvent) => void,
  ): () => void;
}

export interface ApplicationPublishedArtifactAccess {
  getRunPublishedArtifacts(runId: string): Promise<PublishedArtifactSummary[]>;
  getPublishedArtifactsFromMemoryDir(memoryDir: string): Promise<PublishedArtifactSummary[]>;
  getPublishedArtifactRevisionText(input: {
    runId: string;
    revisionId: string;
  }): Promise<string | null>;
  getPublishedArtifactRevisionTextFromMemoryDir(input: {
    memoryDir: string;
    revisionId: string;
  }): Promise<string | null>;
}

export interface ApplicationExecutionMemoryLookup {
  resolveTeamMemberLocation(input: {
    teamRunId: string;
    memberAddress?: string | null;
    agentRunId?: string | null;
  }): Promise<TeamMemberAgentMemoryLocation | null>;
}

export interface ApplicationExecutionToolReadiness {
  readonly publishedArtifactPublisher: PublishedArtifactPublisher;
  assertReady(): void;
}

export interface ApplicationExecutionLifecycle {
  quiesce(): void;
  close(): Promise<void>;
}
```

`CreateTeamRunFromRootConfigInput` becomes an exported named input in `team-run-service.ts`, replacing its inline structural input without changing the method or wire behavior.

### Live aggregate containment and exact projection rules

- `application-execution-scope-contracts.ts` imports neither `AgentRun` nor `RootTeamRun`; those live aggregates never appear in an outward capability parameter, result, property, callback, or generic argument.
- `ApplicationExecutionScope` is the only application-boundary owner allowed to call `AgentRunService.resolveAgentRun`, `AgentRun.postUserMessage`, `TeamRunService.resolveActiveTeamRun`, `RootTeamRun.postMessage`, or `RootTeamRun.getExecutionTreeSnapshot`.
- `createAgentRun` maps the existing service result to a frozen `{ runId }`; it does not return or retain a caller-visible reference to the service result.
- Both Team creation commands call the existing service unchanged and immediately project the returned root inside the scope. The private projector recursively walks only `getExecutionTreeSnapshot().rootTeam.members`, flattens configured Agent nodes exactly as today's `configuredAgents` helper does, and produces a newly allocated, frozen `ApplicationTeamLaunchResult`. Task executions and the wider tree are not exposed. `ApplicationRunBindingLaunchService` continues deriving `displayName` with `getAgentTeamAddressBasename` and adding the unchanged public `runtimeKind` itself.
- `postAgentInput` performs the current restore-aware `resolveAgentRun` inside the scope, then calls `postUserMessage`. `postTeamInput` performs the current restore-aware `resolveActiveTeamRun` inside the scope, then calls `postMessage` with the supplied exact member run ID or `null` for root/coordinator dispatch.
- Resolution failure maps to frozen `{ kind: "NOT_AVAILABLE" }`; accepted input maps to frozen `{ kind: "ACCEPTED" }`; rejected input maps to frozen `{ kind: "REJECTED", message: result.message ?? null }`. Exceptions thrown by resolution normalization or posting are not caught or translated. The orchestration host preserves today's exact unavailable and rejection error strings; it remains the use-case policy owner.
- No new cleanup is introduced around post-creation projection. Creation, restoration, validation, acceptance, error propagation, snapshots, binding persistence, public wire contracts, and runtime behavior remain identical; only the live-object ownership boundary moves inward.

## Concrete Scope Surface

```ts
export class ApplicationExecutionScope {
  static create(input: ApplicationExecutionScopeBuildInput): ApplicationExecutionScope;

  readonly agentExecution: ApplicationAgentExecution;
  readonly teamExecution: ApplicationTeamExecution;
  readonly streaming: ApplicationExecutionStreaming;
  readonly artifacts: ApplicationPublishedArtifactAccess;
  readonly memory: ApplicationExecutionMemoryLookup;
  readonly toolReadiness: ApplicationExecutionToolReadiness;
  readonly lifecycle: ApplicationExecutionLifecycle;

  // Assembly-only. Not part of a capability and never passed to a consumer.
  abortConstruction(): void;
}
```

The class contains no `get(name)`, manager/session getters, `services` property, index signature, or optional capability. Each property is `Object.freeze`d and closes over the same private internal objects.

## Consumer-To-Capability Map

| Current consumer | Target constructor field | Exact methods used |
| --- | --- | --- |
| `ApplicationRunBindingLaunchService` | `agentExecution` | `createAgentRun`; consume immutable `runId` only |
| `ApplicationRunBindingLaunchService` | `teamExecution` | `createTeamRun`, `createTeamRunFromRootConfig`; consume immutable `teamRunId` plus configured-member address/run-ID projection only |
| `ApplicationOrchestrationHostService` | `agentExecution` | `postAgentInput`, `terminateAgentRun` |
| `ApplicationOrchestrationHostService` | `teamExecution` | `postTeamInput`, `terminateTeamRun` |
| `ApplicationOrchestrationHostService` | `artifacts` | all four artifact methods above |
| `ApplicationOrchestrationHostService` | `memory` | `resolveTeamMemberLocation` |
| `ApplicationBoundRunLifecycleGateway` | `agentExecution` | `observeAgentRunLifecycle` |
| `ApplicationBoundRunLifecycleGateway` | `teamExecution` | `observeTeamRunLifecycle` |
| `ApplicationAgentStreamingService` and `ApplicationAgentStreamSubscription` | `runtimeSource: ApplicationExecutionStreaming` | `attach` |
| `AgentToolRegistryReadiness` construction | `scope.toolReadiness.publishedArtifactPublisher` | registered published-artifact tool dependency |
| `ApplicationPlatformLifecycle.runPreparation` | `executionReadiness` | `assertReady` |
| `ApplicationPlatformLifecycle.runStop` | `executionLifecycle` | `quiesce` first; `close` at current run/session cleanup position |

## Admission And Lifecycle Semantics

- Scope states are owner-local: `OPEN`, `QUIESCED`, `CLOSED`.
- All three top-level create commands (`createAgentRun` and both Team variants) check `OPEN` immediately before delegating. Otherwise they reject with `Application execution is not accepting new runs.`
- `quiesce()` is synchronous and idempotent. It transitions `OPEN -> QUIESCED` and calls the private scoped session manager's `blockNewSessions()` exactly once.
- Input-to-existing-run (including restore-aware resolution inside the scope), observe, terminate, artifact read, and memory read remain available while `QUIESCED`; this allows the outer lifecycle to drain and clean up existing work.
- `close()` memoizes one promise, calls `quiesce()`, stops all Team runs, then all Agent runs, then closes the scoped session manager. Each independent step is attempted; failures are aggregated. It finally marks `CLOSED`.
- The platform lifecycle calls `quiesce()` as its first stop action, drains outer services/workers, then calls `close()` at the current run shutdown/session close position. Streaming subscriptions stop afterward, preserving current order.
- `abortConstruction()` is valid only before the concrete scope is published. The construction invariant forbids live runs. It synchronously closes the session manager if created, otherwise the raw session scope, and marks `CLOSED`; repeat calls do nothing.

## Shared Process Dependency Disposition

| Current selector/authority | Current occurrence | Target owner resolving it | Required platform input | Final consumer | Target occurrence rule |
| --- | --- | --- | --- | --- | --- |
| `getWorkspaceManager()` | run-services factory; platform preparation | each host composition root | `workspaceManager` | scope construction and `prepareWorkspaceRuntime` | zero in application-platform/orchestration/streaming; allowed in the two host roots |
| `getModelAvailabilityService()` | orchestration assembly | each host root | `modelAvailabilityService` | `ApplicationCurrentModelSelectionPolicy.ensureAutoByteusModelAvailable` | zero in application-platform/orchestration/streaming; one resolution per host platform-build call |
| `LLMFactory.requireCurrentModelIdentifier` | orchestration assembly | host root supplies a bound function | `requireCurrentModelIdentifier` | `ApplicationCurrentModelSelectionPolicy.requireCurrentAutoByteusModelIdentifier` | no `LLMFactory` import in application-platform/orchestration |
| `getRuntimeAvailabilityService()` | orchestration assembly | each host root | `runtimeAvailabilityService` | `ApplicationLaunchHostCapabilityValidator` | zero in application-platform/orchestration/streaming; one resolution per host platform-build call |
| `getModelCatalogService()` | orchestration assembly | each host root | `modelCatalogService` | host capability validator | zero in application-platform/orchestration/streaming; one resolution per host platform-build call |
| `getLlmProviderService()` | orchestration assembly | each host root | `llmProviderService` | credential readiness adapter | zero in application-platform/orchestration/streaming; one resolution per host platform-build call |
| `getCodexAppServerClientManager()` | orchestration assembly | each host root | `codexClientManager` | credential readiness adapter | zero in application-platform/orchestration/streaming; one resolution per host platform-build call |

Studio resolves these inside `build-studio-server.ts` before calling its private `createStudioApplicationServices`; standalone resolves them in `start-standalone-application-host.ts` before the platform build call. No third resolver/factory or `ProcessServices` object is introduced.

Within the moved execution construction, `workspaceManager` is also passed explicitly to `RunFileChangeService`, `PublishedArtifactPublicationService`, `ClaudeSessionManager` argument 0, provisioning/activation/Agent/Team services, and `MixedTeamManager`; `memoryDir` is explicitly passed to `AgentMemoryLocationService` and `RunFileChangeService`; canonical definitions and managers remain explicit in `AgentRunHistoryCatalogService`. The AFB obligations below make omission fail even though the reusable classes retain defaults for the separate process-general construction path.

The following backend helpers remain deliberately process-scoped defaults exactly as today: Codex workspace skill materializer/resolver and skill service; Claude workspace resolver/skill materializer/skill service; Claude SDK client; Codex backend factory thread-manager/cleanup positions 0/2. They are not application execution authorities, do not select graph-local manager/session/definition identity, and are already shared by the supported provider runtime. This ticket does not create application-owned copies merely to eliminate every library-level default. Canonical definitions, application MCP sessions, and workspace identity remain explicit where graph correctness depends on them.

## Exact Orchestration Assembly Result

`createApplicationOrchestrationServices` is an internal assembly function, not an authoritative runtime boundary. Its result contains only sibling outer owners; it contains no scope, capability collection, manager, session manager, publication service, memory service, or shutdown coordinator.

Its exact flat input is:

```ts
type ApplicationOrchestrationAssemblyInput = Readonly<{
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  storageLifecycleService: ApplicationStorageLifecycleService;
  platformStateStore: ApplicationPlatformStateStore;
  availabilityRegistry: ApplicationAvailabilityStateRegistry;
  engineController: ApplicationEngineController;
  eventDispatchQueue: ApplicationExecutionEventDispatchQueue;
  artifactDeliveryQueue: ApplicationPublishedArtifactDeliveryQueue;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  runLookupStore: ApplicationRunLookupStore;
  bindingStore: ApplicationRunBindingStore;
  overrideStore: ApplicationLaunchOverrideStore;
  journalStore: ApplicationExecutionEventJournalStore;
  agentExecution: ApplicationAgentExecution;
  teamExecution: ApplicationTeamExecution;
  streaming: ApplicationExecutionStreaming;
  artifacts: ApplicationPublishedArtifactAccess;
  memory: ApplicationExecutionMemoryLookup;
  runtimeAvailabilityService: RuntimeAvailabilityService;
  modelCatalogService: ModelCatalogService;
  modelAvailabilityService: ModelAvailabilityService;
  llmProviderService: LlmProviderService;
  codexClientManager: CodexAppServerClientManager;
  requireCurrentModelIdentifier: (modelIdentifier: string) => Promise<void>;
  skillService: SkillService;
  selectedApplicationIds?: ReadonlySet<string> | null;
}>;
```

This is deliberately an internal assembly input, not a reusable service object. All non-policy fields are required; it has no `scope`, `services`, manager, session manager, or index-signature escape hatch. The selected-application field preserves the existing host policy.

```ts
type ApplicationOrchestrationAssembly = Readonly<{
  startupGate: ApplicationOrchestrationStartupGate;
  eventDispatchService: ApplicationExecutionEventDispatchService;
  artifactDeliveryService: ApplicationPublishedArtifactDeliveryService;
  runObserverService: ApplicationRunObserverService;
  recoveryService: ApplicationOrchestrationRecoveryService;
  availabilityService: ApplicationAvailabilityService;
  definitionRuntimeReadiness: ApplicationDefinitionRuntimeReadiness;
  orchestrationHostService: ApplicationOrchestrationHostService;
  agentStreamingService: ApplicationAgentStreamingService;
  agentCommunicationService: ApplicationAgentCommunicationService;
  engineLauncher: ApplicationEngineLauncher;
  reentryService: ApplicationReentryService;
}>;
```

The platform builder creates the four orchestration stores first, then the scope, then calls this function with those stores, the seven specific capability properties required by consumers, named readiness inputs, `SkillService`, and outer queues/controller. `configurationService` and `executionResourceResolver` stay local to this function and are consumed by both the host and `definitionRuntimeReadiness`; they no longer leak in the return result.
