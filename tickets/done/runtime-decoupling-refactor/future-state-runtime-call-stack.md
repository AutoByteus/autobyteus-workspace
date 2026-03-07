# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-module loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v11`
- Requirements: `tickets/in-progress/runtime-decoupling-refactor/requirements.md` (status `Refined`)
- Source Artifact:
  - `Medium/Large`: `tickets/in-progress/runtime-decoupling-refactor/proposed-design.md`
- Source Design Version: `v12`
- Referenced Sections:
  - `Target State (To-Be)`
  - `Change Inventory (Delta)`
  - `Target Architecture Shape And Boundaries`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001 | N/A | Runtime command ingress dispatch through runtime adapter registry | Yes/N/A/Yes |
| UC-002 | Requirement | R-001,R-002 | N/A | Agent stream runtime event subscription through runtime adapter capability | Yes/Yes/Yes |
| UC-003 | Requirement | R-003 | N/A | Team member runtime event bridge resolves subscriptions by runtime adapter | Yes/Yes/Yes |
| UC-004 | Requirement | R-004 | N/A | Run-history runtime event interpretation through adapter capability | Yes/N/A/Yes |
| UC-005 | Requirement | R-005 | N/A | Autobyteus runtime remains stable with Codex runtime disabled | Yes/N/A/Yes |
| UC-006 | Design-Risk | N/A | Ensure runtime event mapping is selected by runtime kind, not payload-shape inference, to avoid cross-runtime collisions | Runtime event mapper registry dispatch by runtime kind | Yes/N/A/Yes |
| UC-007 | Design-Risk | N/A | Ensure frontend runtime-kind persistence does not coerce unknown registered runtimes to default | Frontend run-history manifest/runtime-kind normalization preserves backend runtime kind | Yes/N/A/Yes |
| UC-008 | Requirement | R-006 | N/A | Shared runtime raw-event debug controls are runtime-neutral | Yes/N/A/Yes |
| UC-009 | Requirement | R-006 | N/A | Team member projection fallback provider is registry-driven without Codex shared-service import | Yes/N/A/Yes |
| UC-010 | Requirement | R-007 | N/A | Shared adapter/model/projection registries resolve defaults via runtime default modules | Yes/N/A/Yes |
| UC-011 | Requirement | R-007 | N/A | Shared runtime capability service resolves runtime capabilities via provider seam | Yes/N/A/Yes |
| UC-012 | Requirement | R-007 | N/A | Shared runtime-kind core supports runtime-id string normalization without static runtime tuple | Yes/N/A/Yes |
| UC-013 | Requirement | R-008 | N/A | Shared defaults delegate through centralized runtime-client registration modules | Yes/N/A/Yes |
| UC-014 | Requirement | R-009 | N/A | Runtime-client module loading is discovery-driven for optional runtimes while Autobyteus remains always-on | Yes/Yes/Yes |
| UC-015 | Requirement | R-008 | N/A | Runtime execution shared index exports runtime-neutral contracts/services only | Yes/N/A/Yes |
| UC-016 | Requirement | R-010 | N/A | Team runtime mode resolution is adapter-capability-driven (not runtime-name-driven) | Yes/N/A/Yes |
| UC-017 | Requirement | R-011 | N/A | Runtime-client composition defaults discover runtime module descriptors without direct optional-runtime imports | Yes/Yes/Yes |
| UC-018 | Requirement | R-012 | N/A | Runtime-client descriptor composition is module-spec discovery driven with no compile-time optional-runtime descriptor imports in shared index | Yes/Yes/Yes |
| UC-019 | Requirement | R-016 | N/A | Team member runtime event streaming uses one runtime-adapter-registry bridge seam only (legacy external-source bridge removed) | Yes/Yes/Yes |

Rules:
- Every in-scope requirement must map to at least one use case in this index.
- `Design-Risk` use cases are allowed only when the technical objective/risk is explicit and testable.

## Transition Notes

- Keep adapterized command/liveness seam from v2 changes.
- Add runtime-kind keyed mapper registry and migrate shared stream mapping call sites.
- Replace Codex-specific relay binding in member-runtime orchestrator with runtime-agnostic capability binding.
- Remove Codex-branded naming from generic team member-runtime bridge/relay seams.
- Frontend runtime-kind parsing must preserve backend runtime kind value and gate selectability by capability response.
- Remove implicit runtime inference from shared event mapping; runtime kind is required from runtime session context.
- Generate runtime selector options from `runtimeCapabilities` rows instead of fixed runtime literal lists.
- Replace Codex-branded runtime raw-event debug flags/log channel labels in shared stream handler with runtime-neutral controls.
- Remove Codex default fallback provider import from shared team-member projection service; resolve fallback providers through provider registry.
- Move runtime adapter/model/projection default registration into dedicated default-composition modules.
- Move runtime capability probe/env policy into runtime capability provider modules and keep shared capability service provider-driven.
- Replace static runtime-kind tuple typing with normalized runtime-id string core typing.
- Consolidate per-service defaults registration through centralized runtime-client module composition APIs.
- Remove runtime-specific re-exports from shared `runtime-execution/index.ts` surface.
- Resolve team runtime mode via adapter-declared execution mode (`native_team`/`member_runtime`) instead of runtime-id literal checks.
- Discover runtime module descriptors from runtime module exports in composition defaults and avoid direct optional-runtime module imports.
- Discover runtime-client descriptors from module-spec configuration in shared index composition and avoid compile-time optional-runtime descriptor imports.

## Use Case: UC-001 [Runtime Command Ingress Dispatch]

### Goal

Route runtime commands through runtime-neutral adapter registry with runtime-neutral liveness checks.

### Preconditions

- Runtime session is registered in `RuntimeSessionStore`.
- Runtime adapter exists in `RuntimeAdapterRegistry`.

### Expected Outcome

- Command executes using resolved adapter.
- Session is considered inactive only by adapter-provided liveness capability.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-execution/runtime-command-ingress-service.ts:sendTurn(input)
├── src/runtime-execution/runtime-command-ingress-service.ts:execute(runId, mode, operation, fn)
│   ├── src/runtime-execution/runtime-command-ingress-service.ts:resolveSession(runId, mode)
│   │   ├── src/runtime-execution/runtime-session-store.ts:getSession(runId) [STATE]
│   │   ├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│   │   └── src/runtime-execution/runtime-adapter-port.ts:RuntimeAdapter.isRunActive(runId) [ASYNC]
│   ├── src/runtime-management/runtime-capability-service.ts:getRuntimeCapability(runtimeKind)
│   ├── src/runtime-execution/runtime-capability-policy.ts:evaluateCommandCapability(...)
│   └── src/runtime-execution/runtime-adapter-port.ts:RuntimeAdapter.sendTurn(input) [ASYNC]
└── src/runtime-execution/runtime-command-ingress-service.ts:return RuntimeIngressResult
```

### Branching / Fallback Paths

```text
[FALLBACK] if adapter has no isRunActive()
src/runtime-execution/runtime-command-ingress-service.ts:resolveSession(runId, mode)
└── treat existing session as active by default policy
```

```text
[ERROR] if adapter command throws
src/runtime-execution/runtime-command-ingress-service.ts:execute(...)
└── return { accepted: false, code: "RUNTIME_COMMAND_FAILED" }
```

### State And Data Transformations

- Session record -> adapter resolution by `runtimeKind`.
- Adapter command result -> ingress result with `runtimeKind` annotation.

### Observability And Debug Points

- logs at command failure branches.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- none.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Agent Runtime Event Streaming]

### Goal

Stream runtime events through runtime-neutral subscription capability and existing message mapper.

### Preconditions

- WebSocket session exists for run.
- Runtime session has `runtimeKind` bound.

### Expected Outcome

- Shared stream handler subscribes via adapter capability (not Codex service import).

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:connect(connection, agentRunId)
├── src/runtime-execution/runtime-composition-service.ts:getRunSession(agentRunId)
├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
├── src/runtime-execution/runtime-adapter-port.ts:RuntimeAdapter.subscribeToRunEvents(runId, onEvent) [ASYNC]
└── src/services/agent-streaming/agent-stream-handler.ts:forwardRuntimeEvent(...)
    ├── src/run-history/services/run-history-service.ts:onRuntimeEvent(runId, event) [ASYNC]
    ├── src/services/agent-streaming/runtime-event-message-mapper.ts:mapForRuntime(runtimeKind, event)
    └── src/services/agent-streaming/models.ts:ServerMessage.toJson()
```

### Branching / Fallback Paths

```text
[FALLBACK] if adapter has no runtime-event subscription capability
src/services/agent-streaming/agent-stream-handler.ts:connect(...)
└── use native Autobyteus AgentEventStream path
```

```text
[ERROR] if runtime event mapping fails
src/services/agent-streaming/agent-stream-handler.ts:forwardRuntimeEvent(...)
└── emit error message payload to websocket
```

### State And Data Transformations

- runtime raw event -> mapped server message payload.

### Observability And Debug Points

- optional runtime raw event debug sequence IDs.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- none.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Team Runtime Event Bridge]

### Goal

Bridge team member runtime events by resolving each member runtime adapter capability.

### Preconditions

- Team binding registry has member bindings.

### Expected Outcome

- Team event bridge does not hard-depend on Codex runtime service import.

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-team-stream-handler.ts:connect(...)
├── src/services/agent-streaming/team-member-runtime-event-bridge.ts:subscribeTeam(teamRunId, onMessage)
│   ├── src/agent-team-execution/services/team-runtime-binding-registry.ts:getTeamBindings(teamRunId)
│   ├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(binding.runtimeKind)
│   ├── src/runtime-execution/runtime-adapter-port.ts:RuntimeAdapter.subscribeToRunEvents(memberRunId, onEvent) [ASYNC]
│   └── src/services/agent-streaming/runtime-event-message-mapper.ts:mapForRuntime(binding.runtimeKind, event)
└── websocket send
```

### Branching / Fallback Paths

```text
[FALLBACK] if runtime adapter lacks runtime-event subscription for a member
team-runtime-event-bridge.ts:subscribeTeam(...)
└── skip member subscription and emit bridge error event
```

```text
[ERROR] runtime subscription callback throws
team-runtime-event-bridge.ts:subscribeMember(...)
└── emit TEAM_RUNTIME_EVENT_BRIDGE_ERROR message
```

### State And Data Transformations

- runtime event payload + member metadata -> websocket team event payload.

### Observability And Debug Points

- bridge error events include runtime kind and member id.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- none.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Run History Runtime Event Interpretation]

### Goal

Interpret runtime event status/thread hints through runtime adapter capability instead of Codex-specific parser in shared service.

### Preconditions

- Run manifest exists and includes runtime kind.

### Expected Outcome

- Run-history service updates status/thread from adapter interpretation response.

### Primary Runtime Call Stack

```text
[ENTRY] src/run-history/services/run-history-service.ts:onRuntimeEvent(runId, event)
├── src/run-history/store/run-manifest-store.ts:readManifest(runId) [IO]
├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
├── src/runtime-execution/runtime-adapter-port.ts:RuntimeAdapter.interpretRuntimeEvent(event) [ASYNC]
├── src/run-history/store/run-history-index-store.ts:updateRow(runId, status/activity) [IO]
└── src/run-history/services/run-history-service.ts:updateManifestThreadId(runId, threadId) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if adapter has no interpretRuntimeEvent()
run-history-service.ts:onRuntimeEvent(...)
└── no-op for runtime-specific status/thread updates
```

```text
[ERROR] manifest missing or parse fails
run-history-service.ts:onRuntimeEvent(...)
└── return without mutation
```

### State And Data Transformations

- runtime-specific payload -> normalized `{ statusHint, threadIdHint }`.

### Observability And Debug Points

- no-op branch logs only on explicit debug mode.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- none.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Autobyteus Stability With Codex Disabled]

### Goal

Ensure Autobyteus runtime flow remains intact when Codex runtime capability is disabled.

### Preconditions

- `CODEX_APP_SERVER_ENABLED=false`
- Autobyteus runtime enabled.

### Expected Outcome

- Create/send/stream path works for Autobyteus runtime.

### Primary Runtime Call Stack

```text
[ENTRY] GraphQL/WebSocket runtime flow
├── src/runtime-management/runtime-capability-service.ts:getRuntimeCapability("autobyteus")
├── src/runtime-execution/runtime-composition-service.ts:createAgentRun(...)
├── src/runtime-execution/adapters/autobyteus-runtime-adapter.ts:createAgentRun(...)
├── src/services/agent-streaming/agent-stream-handler.ts:streamLoop(...)  # native AgentEventStream path
└── src/runtime-execution/runtime-command-ingress-service.ts:sendTurn(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] codex runtime unavailable
runtime-capability-service.ts:getRuntimeCapability("codex_app_server")
└── ingress/create operations reject codex operations while autobyteus path remains active
```

```text
[ERROR] invalid runtime kind requested
runtime-composition-service.ts:createAgentRun(...)
└── throws runtime unavailable/not supported error
```

### State And Data Transformations

- standard autobyteus stream events -> server websocket events.

### Observability And Debug Points

- existing autobyteus stream/command logs.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- none.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-006 [Runtime Event Mapper Registry Dispatch]

### Goal

Guarantee runtime event mapping dispatch is keyed by `runtimeKind`, not by raw payload shape heuristics.

### Preconditions

- Runtime session exists and contains resolved `runtimeKind`.
- Runtime event mapper registry has an entry for each enabled runtime kind.

### Expected Outcome

- Shared mapper never infers runtime from event payload structure.
- Unsupported runtime mapper returns explicit mapped error message.

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:forwardRuntimeEvent(...)
├── src/runtime-execution/runtime-composition-service.ts:getRunSession(runId)
├── src/services/agent-streaming/runtime-event-message-mapper.ts:mapForRuntime(runtimeKind, event)
│   ├── src/services/agent-streaming/runtime-event-message-mapper.ts:resolve runtime mapper by runtimeKind
│   └── src/services/agent-streaming/codex-runtime-event-adapter.ts:map(event)  # for codex_app_server
└── src/services/agent-streaming/models.ts:ServerMessage.toJson()
```

### Branching / Fallback Paths

```text
[ERROR] mapper not registered for runtime kind
runtime-event-message-mapper.ts:mapForRuntime(...)
└── return RUNTIME_EVENT_MAPPER_NOT_FOUND error message payload
```

### State And Data Transformations

- `(runtimeKind, rawEvent)` -> `ServerMessage` via mapper registry.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 [Frontend Runtime Kind Preservation]

### Goal

Ensure frontend run-history/runtime normalization preserves backend runtime kind identity, while selection UI remains capability-gated.

### Preconditions

- Backend returns runtime kind string in manifest/capabilities payload.

### Expected Outcome

- Frontend state preserves runtime kind value from backend payload.
- Unknown-but-registered runtime kinds are not silently coerced to default.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/runHistoryStore.ts:openTeamRunFromHistory(...)
├── autobyteus-web/stores/runHistoryManifest.ts:parseTeamRunManifest(payload)
│   └── preserve runtimeKind from binding/runtimeReference without codex-only coercion
├── autobyteus-web/stores/runtimeCapabilitiesStore.ts:fetchRuntimeCapabilities()
└── autobyteus-web/components/workspace/config/TeamRunConfigForm.vue:runtimeOptions (capability-gated)
```

### Branching / Fallback Paths

```text
[ERROR] runtime kind exists in manifest but capability list has no matching entry
TeamRunConfigForm.vue:selectedRuntimeUnavailableReason
└── show unavailable state and keep selected runtime visible in options list; no hardcoded codex/autobyteus coercion branch
```

### State And Data Transformations

- GraphQL manifest payload -> frontend team member config with preserved runtime kind.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-008 [Runtime-Neutral Shared Debug Controls]

### Goal

Ensure shared runtime-event debug paths are runtime-neutral and do not encode Codex in control/log naming.

### Preconditions

- Raw runtime-event debug mode is enabled through shared runtime debug env controls.

### Expected Outcome

- Debug controls/log channels in shared stream handler are runtime-agnostic and include runtime kind context.

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:forwardRuntimeEvent(...)
├── resolve runtimeKind from runtime session context
├── src/services/agent-streaming/agent-stream-handler.ts:format debug payload (runtime-neutral)
└── shared runtime raw-event debug logger emits [RuntimeRawEvent] and [RuntimeMappedMessage]
```

### Branching / Fallback Paths

```text
[ERROR] event payload unserializable
agent-stream-handler.ts:stringifyForDebug(...)
└── emit "[unserializable-runtime-event]" placeholder without throwing
```

### State And Data Transformations

- Raw runtime event -> truncated debug JSON payload with runtime-kind metadata.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-009 [Projection Fallback Provider Registry Dispatch]

### Goal

Ensure team member projection fallback resolution is provider-registry driven and shared service contains no direct Codex fallback import/default.

### Preconditions

- Team run manifest has member runtime kind and runtime reference metadata.
- Projection provider registry is initialized.

### Expected Outcome

- Shared projection service requests provider by runtime kind from registry and applies fallback only when provider exists.

### Primary Runtime Call Stack

```text
[ENTRY] src/run-history/services/team-member-run-projection-service.ts:getProjection(...)
├── src/run-history/services/team-member-memory-projection-reader.ts:getProjection(...)
├── src/run-history/projection/run-projection-provider-registry.ts:getProvider(runtimeKind)
└── provider.buildProjection(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] no provider registered for runtimeKind
team-member-run-projection-service.ts:getProjection(...)
└── return memory projection result without runtime fallback
```

```text
[ERROR] fallback provider returns empty projection and memory read failed
team-member-run-projection-service.ts:getProjection(...)
└── throw original projection read error
```

### State And Data Transformations

- Team member runtime binding -> provider lookup key -> projection payload.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-010 [Composition-Root Runtime Defaults]

### Goal

Ensure shared registry/service classes are runtime-neutral and runtime-specific default wiring is isolated to dedicated defaults modules.

### Preconditions

- Shared registries/services are instantiated via singleton getter helpers.
- Runtime default modules register Autobyteus/Codex defaults.

### Expected Outcome

- Removing a runtime requires editing only default composition modules, not shared registry/service classes.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-execution/runtime-adapter-registry.ts:getRuntimeAdapterRegistry()
├── src/runtime-execution/runtime-adapter-registry.ts:new RuntimeAdapterRegistry()
└── src/runtime-execution/runtime-adapter-registry-defaults.ts:registerDefaultRuntimeAdapters(target)
    ├── new AutobyteusRuntimeAdapter()
    └── new CodexAppServerRuntimeAdapter()
```

```text
[ENTRY] src/runtime-management/model-catalog/runtime-model-catalog-service.ts:getRuntimeModelCatalogService()
├── new RuntimeModelCatalogService()
└── src/runtime-management/model-catalog/runtime-model-catalog-defaults.ts:registerDefaultRuntimeModelProviders(target)
```

```text
[ENTRY] src/run-history/projection/run-projection-provider-registry.ts:getRunProjectionProviderRegistry()
└── src/run-history/projection/run-projection-provider-registry-defaults.ts:createDefaultRunProjectionProviderRegistry()
```

### Branching / Fallback Paths

```text
[ERROR] runtime default not registered
registry.resolve*(runtimeKind)
└── throws explicit "not configured/not found" error
```

### State And Data Transformations

- runtime module defaults -> registry/service in-memory maps keyed by runtime kind.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-011 [Runtime Capability Provider Dispatch]

### Goal

Ensure runtime capability resolution is provider-driven in shared capability service with runtime-specific probes owned by provider modules.

### Preconditions

- Runtime capability service has registered providers for enabled runtimes.

### Expected Outcome

- Shared service has no runtime-specific env/probe/cache logic.
- Runtime capabilities list/lookup are resolved via provider map.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-management/runtime-capability-service.ts:getRuntimeCapabilityService()
├── new RuntimeCapabilityService()
└── src/runtime-management/runtime-capability-service-defaults.ts:registerDefaultRuntimeCapabilityProviders(target)
```

```text
[ENTRY] src/runtime-management/runtime-capability-service.ts:getRuntimeCapability(runtimeKind)
├── resolve provider by runtimeKind
└── provider.getRuntimeCapability() [ASYNC/STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] no provider for runtimeKind
runtime-capability-service.ts:getRuntimeCapability(runtimeKind)
└── return { enabled: false, reason: "not configured" }
```

### State And Data Transformations

- runtimeKind -> RuntimeCapability provider result.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-012 [Runtime Kind Core Normalization]

### Goal

Ensure runtime-kind core typing/normalization does not require static runtime tuple updates for runtime add/remove.

### Preconditions

- Runtime kind values are supplied from configuration/capability payloads.

### Expected Outcome

- Runtime kind is treated as normalized non-empty runtime-id string.
- Unknown runtime IDs are preserved by normalization logic instead of forced tuple rejection.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-management/runtime-kind.ts:normalizeRuntimeKind(value, fallback)
├── trim incoming runtime-id string
├── validate non-empty
└── return normalized runtime-id or fallback
```

### Branching / Fallback Paths

```text
[FALLBACK] null/empty runtime kind
normalizeRuntimeKind(value, fallback)
└── return fallback (default autobyteus)
```

### State And Data Transformations

- raw runtime kind input -> normalized runtime-id string.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-013 [Centralized Runtime-Client Defaults Registration]

### Goal

Ensure runtime-specific default registrations (adapter/model/capability/projection/event mapper) are composed through a centralized runtime-client module list.

### Preconditions

- Runtime-client module registry includes Autobyteus and Codex modules.
- Shared defaults entrypoints delegate to runtime-client registration helpers.

### Expected Outcome

- Adding/removing one runtime updates one runtime-client module list instead of each shared defaults file.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-execution/runtime-adapter-registry-defaults.ts:registerDefaultRuntimeAdapters(target)
└── src/runtime-management/runtime-client/runtime-client-modules-defaults.ts:registerRuntimeClientAdapters(target)
    ├── runtime-client-modules-defaults.ts:getDefaultRuntimeClientModules()
    ├── runtime-client/autobyteus-runtime-client-module.ts:registerAdapter(target)
    └── runtime-client/codex-runtime-client-module.ts:registerAdapter(target)
```

```text
[ENTRY] src/runtime-management/model-catalog/runtime-model-catalog-defaults.ts:registerDefaultRuntimeModelProviders(target)
└── runtime-client-modules-defaults.ts:registerRuntimeClientModelProviders(target)
```

```text
[ENTRY] src/runtime-management/runtime-capability-service-defaults.ts:registerDefaultRuntimeCapabilityProviders(target)
└── runtime-client-modules-defaults.ts:registerRuntimeClientCapabilityProviders(target)
```

```text
[ENTRY] src/run-history/projection/run-projection-provider-registry-defaults.ts:resolveDefaultRunProjectionProviders()
└── runtime-client-modules-defaults.ts:resolveRuntimeClientRunProjectionProviders()
```

```text
[ENTRY] src/services/agent-streaming/runtime-event-message-mapper-defaults.ts:registerDefaultRuntimeEventMappers(target)
└── runtime-client-modules-defaults.ts:registerRuntimeClientEventMappers(target)
```

### Branching / Fallback Paths

```text
[ERROR] duplicate runtime registration attempts
runtime-client module registration helper
└── skip when target already has runtime registration for the runtime kind
```

### State And Data Transformations

- Runtime-client module list -> per-service registration maps keyed by runtime kind.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-014 [Discovery-Driven Optional Runtime Module Loading]

### Goal

Ensure runtime-client module composition always includes Autobyteus runtime and discovers/selects optional runtimes without shared-layer edit churn.

### Preconditions

- Runtime-client module descriptors define `required` vs optional runtime modules.
- Optional runtime modules expose availability predicates.
- Optional deployment override may provide runtime allow-list env values.

### Expected Outcome

- Autobyteus module is always loaded.
- Optional runtime modules are loaded only when selected by discovery/allow-list policy.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-management/runtime-client/runtime-client-modules-defaults.ts:getDefaultRuntimeClientModules()
├── runtime-client-modules-defaults.ts:getConfiguredRuntimeModuleAllowList()
├── runtime-client-modules-defaults.ts:discoverRuntimeClientModuleDescriptors()
│   ├── runtime-client/autobyteus-runtime-client-module.ts:runtimeClientModuleDescriptor
│   └── runtime-client/codex-runtime-client-module.ts:runtimeClientModuleDescriptor
├── runtime-client-modules-defaults.ts:shouldLoadRuntimeClientModule(descriptor, allowList)
│   └── runtime-client/codex-runtime-client-module.ts:isCodexRuntimeClientModuleAvailable() [optional runtime discovery]
└── return filtered runtime-client module list (Autobyteus always included)
```

### Branching / Fallback Paths

```text
[FALLBACK] no runtime-module allow-list override set
runtime-client-modules-defaults.ts:shouldLoadRuntimeClientModule(...)
└── use optional runtime descriptor availability probe(s)
```

```text
[FALLBACK] allow-list override set with wildcard `*`
runtime-client-modules-defaults.ts:shouldLoadRuntimeClientModule(...)
└── include all optional runtime descriptors
```

```text
[ERROR] optional runtime discovery reports unavailable
runtime-client-modules-defaults.ts:shouldLoadRuntimeClientModule(...)
└── optional module excluded from registration list
```

### State And Data Transformations

- Runtime descriptor list + env allow-list + probe results -> resolved runtime-client module list.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-015 [Runtime-Neutral Shared Runtime Execution Exports]

### Goal

Ensure the shared `runtime-execution/index.ts` surface exports only runtime-neutral contracts/services and does not leak runtime-specific modules.

### Preconditions

- Runtime-specific modules remain directly importable from runtime-specific paths.
- Shared consumers import via `runtime-execution/index.ts` only for generic contracts/services.

### Expected Outcome

- Removing a runtime does not require editing shared import surfaces in unrelated modules.

### Primary Runtime Call Stack

```text
[ENTRY] TypeScript module resolution for shared runtime imports
├── src/runtime-execution/index.ts:exports runtime-neutral contracts/services
│   ├── runtime-adapter-port
│   ├── runtime-adapter-registry
│   ├── runtime-session-store
│   ├── runtime-composition-service
│   └── runtime-command-ingress-service
└── runtime-specific modules imported via explicit runtime paths when needed
```

### Branching / Fallback Paths

```text
[ERROR] shared consumer attempts runtime-specific import via shared index
TypeScript compile/import resolution
└── import no longer available from shared index; consumer must use runtime-specific path
```

### State And Data Transformations

- Shared import surface narrowed to runtime-neutral exports.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-016 [Capability-Driven Team Runtime Mode Policy]

### Goal

Ensure team runtime orchestration mode selection and guard logic are resolved from adapter capability, not runtime-name literals.

### Preconditions

- Team member configs are resolved with one runtime kind per team run.
- Runtime adapter registry has the runtime adapter for that runtime kind.

### Expected Outcome

- Native-team vs member-runtime decisions use adapter-declared `teamExecutionMode`.
- Shared services have no `runtimeKind === "autobyteus"` policy branch.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/services/team-run-mutation-service.ts:ensureTeamCreated(...)
├── team-run-mutation-service.ts:resolveTeamRuntimeMode(memberConfigs)
│   ├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│   └── src/runtime-execution/runtime-adapter-port.ts:RuntimeAdapter.teamExecutionMode
├── [branch] mode === "member_runtime"
│   └── src/agent-team-execution/services/team-member-runtime-orchestrator.ts:createMemberRuntimeSessions(...)
└── [branch] mode === "native_team"
    └── src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRunWithId(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] adapter omits teamExecutionMode
team-run-mutation-service.ts:resolveTeamRuntimeMode(...)
└── default mode policy => "member_runtime"
```

```text
[ERROR] member-runtime orchestrator receives native-team runtime
team-member-runtime-orchestrator.ts:ensureSupportedMemberRuntime(...)
└── throws TEAM_RUNTIME_MODE_UNSUPPORTED based on adapter teamExecutionMode
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-017 [Runtime Module Descriptor Discovery]

### Goal

Ensure shared runtime-client defaults discover module descriptors from runtime module exports and avoid direct optional-runtime imports.

### Preconditions

- Runtime module files export `runtimeClientModuleDescriptor`.
- Descriptor export includes `runtimeKind`, module accessor, and optional availability probe.

### Expected Outcome

- Shared defaults file has no direct import of optional runtime modules.
- Runtime add/remove is localized to runtime module files.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-management/runtime-client/runtime-client-modules-defaults.ts:discoverRuntimeClientModuleDescriptors()
├── iterate runtime-client module files matching descriptor convention
├── load module descriptor exports
└── build descriptor list for composition resolver
```

```text
[ENTRY] runtime-client-modules-defaults.ts:getDefaultRuntimeClientModules()
├── parse allow-list env
├── evaluate descriptor.required and descriptor.isAvailable
└── resolve module instances via descriptor.getModule()
```

### Branching / Fallback Paths

```text
[FALLBACK] descriptor missing availability probe
shouldLoadRuntimeClientModule(descriptor, allowList)
└── treat descriptor as available unless filtered by allow-list
```

```text
[ERROR] descriptor discovery yields no required runtime module
getDefaultRuntimeClientModules()
└── throw composition error (invalid runtime module configuration)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-018 [Runtime-Client Descriptor Module-Spec Discovery]

### Goal

Ensure shared runtime-client descriptor composition resolves descriptor modules from module-spec discovery and avoids compile-time optional-runtime descriptor imports in shared index composition.

### Preconditions

- Runtime-client descriptor modules export `runtimeClientModuleDescriptor`.
- Runtime-client index resolves module-spec list from defaults and optional env override.
- Runtime-client defaults still enforce required runtime inclusion (`autobyteus`).

### Expected Outcome

- Shared runtime-client index composes descriptor list from module specs (not static descriptor imports).
- Invalid optional descriptor module specs are tolerated without breaking required-runtime inclusion.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-management/runtime-client/index.ts:listRuntimeClientModuleDescriptors()
├── runtime-client/index.ts:resolveDescriptorModuleSpecs()
│   ├── read AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES override
│   └── merge required default module specs
├── runtime-client/index.ts:loadRuntimeClientDescriptorModules(moduleSpecs) [ASYNC]
│   ├── import(moduleSpec)
│   └── collect runtimeClientModuleDescriptor export(s)
└── return descriptor list
```

```text
[ENTRY] src/runtime-management/runtime-client/runtime-client-modules-defaults.ts:getDefaultRuntimeClientModules()
├── runtime-client-modules-defaults.ts:resolveDefaultRuntimeClientModuleDescriptors()
│   └── runtime-client/index.ts:listRuntimeClientModuleDescriptors()
├── runtime-client-modules-defaults.ts:shouldLoadRuntimeClientModule(descriptor, allowList)
└── enforce required runtime inclusion (`autobyteus`)
```

### Branching / Fallback Paths

```text
[FALLBACK] AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES unset
runtime-client/index.ts:resolveDescriptorModuleSpecs()
└── use default descriptor module-spec list
```

```text
[FALLBACK] module-spec import fails for optional descriptor module
runtime-client/index.ts:loadRuntimeClientDescriptorModules(...)
└── skip invalid module spec and continue discovery
```

```text
[ERROR] no required runtime descriptor can be resolved into module list
runtime-client-modules-defaults.ts:getDefaultRuntimeClientModules()
└── throw "Autobyteus runtime client module must always be present."
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case Delta (`v10`)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- |
| UC-019 | Requirement | R-016 | Team member runtime event streaming uses only the runtime-adapter-registry bridge seam (legacy external-source bridge removed) | Yes/Yes/Yes |

## Use Case: UC-019 [Single Team Runtime Bridge Seam]

### Goal

Keep one team member-runtime event bridge path (`TeamRuntimeEventBridge`) and remove legacy bridge/source abstractions that hardcode runtime services in shared layers.

### Preconditions

- Team binding registry has member bindings.
- Runtime adapters are registered for member runtime kinds.

### Expected Outcome

- Team runtime streaming subscribes via adapter capabilities only.
- No shared-layer external runtime source registry remains.

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-team-stream-handler.ts:connect(...)
├── src/services/agent-streaming/team-runtime-event-bridge.ts:subscribeTeam(teamRunId, onMessage)
│   ├── src/agent-team-execution/services/team-runtime-binding-registry.ts:getTeamBindings(teamRunId)
│   ├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(binding.runtimeKind)
│   ├── src/runtime-execution/runtime-adapter-port.ts:RuntimeAdapter.subscribeToRunEvents(memberRunId, onEvent) [ASYNC]
│   └── src/services/agent-streaming/runtime-event-message-mapper.ts:mapForRuntime(binding.runtimeKind, event)
└── websocket send
```

### Branching / Fallback Paths

```text
[FALLBACK] adapter exists but has no subscribeToRunEvents capability
team-runtime-event-bridge.ts:subscribeMember(...)
└── emit TEAM_RUNTIME_EVENT_BRIDGE_ERROR and keep session alive
```

```text
[ERROR] adapter resolution fails for binding.runtimeKind
team-runtime-event-bridge.ts:subscribeMember(...)
└── emit TEAM_RUNTIME_EVENT_BRIDGE_ERROR and skip member subscription
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case Delta (`v11`)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- |
| UC-020 | Design-Risk | N/A | Method-based runtime event mapping is consumed via a shared protocol adapter seam (no Claude->Codex runtime-module dependency) | Yes/N/A/Yes |
| UC-021 | Design-Risk | N/A | Dormant shared team-member services with runtime-specific imports are removed from active architecture surface | Yes/N/A/N/A |

## Use Case: UC-020 [Shared Method-Protocol Event Mapper Seam]

### Goal

Ensure method-based runtime event mapping is provided by a shared protocol adapter seam so Claude runtime module does not import Codex runtime module implementation directly.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-management/runtime-client/claude-runtime-client-module.ts:registerRuntimeEventMappers(target)
├── src/services/agent-streaming/method-runtime-event-adapter.ts:map(event)
└── src/services/agent-streaming/runtime-event-message-mapper.ts:registerRuntimeMapper("claude_agent_sdk", mapper)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-021 [Dormant Shared Runtime-Specific Service Cleanup]

### Goal

Remove dormant shared team-member services that retain runtime-specific imports/branches and are not part of active runtime orchestration.

### Primary Runtime Call Stack

```text
[ENTRY] static architecture audit
├── src/agent-team-execution/services/team-member-runtime-orchestrator.ts (active)
├── src/services/agent-streaming/team-runtime-event-bridge.ts (active)
└── src/runtime-execution/runtime-adapter-registry.ts (active)
# dormant runtime-specific shared services removed from runtime graph
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case Delta (`v12`)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- |
| UC-022 | Requirement | R-017 | Runtime command ingress rejects unbound runs without implicit compatibility session synthesis | Yes/N/A/Yes |
| UC-023 | Requirement | R-017 | Team member override schema/form path contains no per-member runtime-kind compatibility handling | Yes/N/A/N/A |

## Use Case: UC-022 [Explicit Session-Only Runtime Ingress]

### Goal

Enforce explicit runtime session binding in command ingress with no legacy implicit-session fallback behavior.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-execution/runtime-command-ingress-service.ts:execute(...)
└── runtime-command-ingress-service.ts:resolveSession(runId, mode)
    ├── runtime-session-store.ts:getSession(runId)
    ├── runtime-adapter-registry.ts:resolveAdapter(existing.runtimeKind) [if existing session]
    └── return null when no explicit session exists
```

### Error Path

```text
[ERROR] no explicit runtime session binding exists for runId
runtime-command-ingress-service.ts:execute(...)
└── return { accepted: false, code: "RUN_SESSION_NOT_FOUND", ... }
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-023 [Legacy-Free Team Member Override Schema]

### Goal

Keep team runtime selection strictly team-level and remove legacy per-member runtime-kind compatibility handling from team config schema/form.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/config/TeamRunConfigForm.vue
└── sanitizeMemberOverridesForRuntime()
    ├── validate llmModelIdentifier against current runtime model catalog
    ├── prune empty overrides
    └── no member-level runtimeKind rewrite/normalization branch
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case Delta (`v13`)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- |
| UC-024 | Requirement | R-018 | Claude runtime permission mode is resolved through runtime-neutral precedence and propagated to V2 session create/resume options | Yes/Yes/Yes |

## Use Case: UC-024 [Claude Permission/Sandbox Mode Resolution]

### Goal

Allow Claude runtime sessions to use a configurable permission/sandbox mode with deterministic precedence while preserving default behavior and shared-layer decoupling.

### Preconditions

- Claude runtime session bootstrap receives runtime metadata + llm config inputs.
- Optional environment override `CLAUDE_AGENT_SDK_PERMISSION_MODE` may be set through server settings.

### Expected Outcome

- Claude runtime resolves one permission mode per run session (`runtimeMetadata` -> `llmConfig` -> env -> `default`).
- Resolved mode is persisted in Claude runtime session state/runtime metadata and used for both create and resume V2 session calls.
- `send_message_to` team tooling policy remains resolved independently by shared tool-name/metadata policy.

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:createRunSession(runId, options)
├── claude-runtime-shared.ts:resolveClaudeSdkPermissionMode({ runtimeMetadata, llmConfig, env })
├── claude-runtime-session-state.ts:createClaudeRunSessionState(...)
│   └── persist permissionMode into runtime metadata/state
└── sessions.set(runId, state)
```

```text
[ENTRY] claude-agent-sdk-runtime-service.ts:resolveOrCreateV2Session(state, sdk)
└── claude-runtime-v2-control-interop.ts:createOrResumeClaudeV2Session({
    permissionMode: state.permissionMode, ...
  })
    ├── build sessionOptions.permissionMode
    └── invoke unstable_v2_createSession/resumeSession
```

### Branching / Fallback Paths

```text
[FALLBACK] runtime metadata does not define permission mode
resolveClaudeSdkPermissionMode(...)
└── check llmConfig, then env override
```

```text
[FALLBACK] llmConfig/env permission mode missing or invalid
resolveClaudeSdkPermissionMode(...)
└── return "default"
```

```text
[ERROR] invalid configured permission mode token
resolveClaudeSdkPermissionMode(...)
└── warn and continue fallback chain; never crash session bootstrap
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
