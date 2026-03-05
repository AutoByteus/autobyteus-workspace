# Investigation Notes

- Ticket: `runtime-decoupling-refactor`
- Date: `2026-03-04`
- Stage: `1` (Investigation + Triage)

## Sources Consulted

- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`
- `autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts`
- `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-codex-runtime-event-bridge.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
- `autobyteus-server-ts/src/run-history/services/run-history-service.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
- `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/runtime-command-ingress-service.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/runtime-adapter-registry.test.ts`
- `autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts`

## Entrypoints And Execution Boundaries

- Runtime command/control is centrally routed through `RuntimeCommandIngressService` and `RuntimeCompositionService` via `RuntimeAdapterRegistry`.
- Single-agent websocket streaming is handled by `AgentStreamHandler`.
- Team websocket streaming is handled by `AgentTeamStreamHandler` with a separate Codex bridge.
- Run-history state projection and active-state checks are handled by `RunHistoryService` and projection providers.

## Key Findings

1. Good decoupling exists for command/control operations (`create/restore/send/approve/interrupt/terminate`) through runtime adapters.
2. Event ingestion is not runtime-neutral:
   - `AgentStreamHandler` imports Codex runtime service directly and calls `subscribeToRunEvents` directly for Codex runs.
3. Team flow is partly runtime-specific:
   - explicit `codex_members` mode and Codex bridge/orchestrator paths are present in shared handler/orchestrator layers.
4. Run-history has runtime-specific leakage:
   - direct Codex runtime service import for liveness checks,
   - direct Codex method normalizer usage in shared runtime event handling.
5. Current architecture supports runtime capability toggling but not clean runtime module removal across all layers.

## Constraints

- Preserve current frontend websocket message contract.
- Preserve current Autobyteus runtime behavior.
- Avoid introducing compatibility wrappers or duplicate dual-path architecture debt.

## Open Unknowns

- Team runtime architecture appears intentionally split between native team runtime and codex-member orchestration; full unification may need phased work.
- Some run-history and team projection behavior is codex-manifest specific and may require dedicated provider interfaces before full extraction.

## Scope Triage

- Classification: `Medium`
- Rationale:
  - Cross-layer impact across runtime execution, stream handling, and run-history.
  - New interface boundary needed for runtime event subscription/liveness in shared services.
  - Multiple files (>3) with behavior-sensitive refactor.
- Workflow depth selected:
  - `Medium` path: proposed design -> future-state call stacks -> iterative review gate -> implementation.

## Implications For Design

- First decoupling increment should target runtime-neutral event ingress and runtime liveness checks in shared services.
- Adapter contract must be extended (or companion port added) for event subscription and session-liveness checks.
- Codex-specific mapping should remain as plugin implementation detail behind shared contracts.

## Re-Entry Investigation Refresh (Post Stage-6 Architecture Audit)

- Date: `2026-03-04`
- Trigger: `Stage 6` re-entry classification `Design Impact`
- Objective: identify remaining coupling that blocks easy Codex removal.

### Additional Sources Consulted In Re-Entry

- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-codex-runtime-event-bridge.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/team-codex-inter-agent-message-relay.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-capability-service.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-kind.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `autobyteus-web/stores/runHistoryManifest.ts`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`

### Updated Findings

1. Backend command/control decoupling is materially improved through adapter ingress/composition layers.
2. Shared runtime-event mapping is still Codex-hardwired (`RuntimeEventMessageMapper` owns `CodexRuntimeEventAdapter` directly).
3. Team member-runtime orchestration still depends on Codex relay/runtime-service internals (`setInterAgentRelayHandler` + Codex relay request/result types).
4. Shared team streaming path still carries Codex-branded bridge/type names despite generic behavior.
5. Frontend streaming protocol/handlers are runtime-agnostic, but runtime config/manifest parsing remains hardcoded to two runtimes and coerces unknown runtime kinds to `autobyteus`.

### Decoupling Risks Confirmed

- Removing Codex still requires touching non-Codex shared layers (stream mapper, team orchestrator, capability paths).
- Adding a third runtime likely requires edits in shared mapper/config code, not only adapter registration.

### Refined Design Implications

- Introduce a runtime-event mapper registry keyed by `runtimeKind`; remove shape-based Codex routing in shared mapper.
- Replace Codex-specific team relay binding with a runtime-agnostic inter-agent relay capability port.
- Rename Codex-branded shared bridge/relay classes to runtime-neutral names where behavior is generic.
- Move runtime catalog/validation from hardcoded union to runtime registration/manifest model in backend and frontend so registered runtimes are preserved rather than coerced.

### Re-Entry Scope Triage Confirmation

- Classification remains: `Medium`
- Reason: cross-layer decoupling and architecture cleanup across server runtime orchestration + streaming + frontend runtime modeling, without datastore schema migration.

## Stage-7 Re-Entry Investigation Refresh (Final Decoupling Sweep)

- Date: `2026-03-04`
- Trigger: `Stage 7` re-entry classification `Design Impact`
- Objective: remove remaining shared-layer runtime coupling so runtime removal/addition does not require cross-layer edits.

### Additional Sources Consulted In Stage-7 Re-Entry

- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/stores/runtimeCapabilitiesStore.ts`
- `autobyteus-web/stores/runHistoryTypes.ts`
- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`

### Stage-7 Re-Entry Findings

1. Shared runtime-event mapping still has implicit Codex assumptions:
   - `RuntimeEventMessageMapper.map()` infers Codex when a `method` field exists.
   - method alias normalization falls back to Codex when runtime kind is omitted.
2. Frontend runtime modeling remains fixed to two runtimes:
   - `AgentRuntimeKind` is a literal union (`autobyteus | codex_app_server`).
   - runtime options in run-config forms are hardcoded to those two values.
3. These assumptions still create non-local edit requirements:
   - removing Codex still requires touching shared mapping/types/forms.
   - adding a third runtime still requires changing generic frontend layers.

### Refined Design Implications For This Iteration

- `C-013`: enforce explicit runtime-kind routing in shared event mapping and remove implicit Codex fallback logic.
- `C-014`: model runtime kinds as capability-driven runtime IDs in frontend types/forms and derive selectable runtimes from capability responses.

### Scope Triage Confirmation (Stage-7 Re-Entry)

- Classification remains: `Medium`
- Reason:
  - cross-layer changes remain bounded to shared stream mapping and runtime config UI layers,
  - no transport/schema migration is required,
  - verification remains achievable with targeted backend/frontend test slices.

## Stage-8 Follow-Up Re-Entry Investigation Refresh (Complete Decoupling Sweep)

- Date: `2026-03-04`
- Trigger: `Stage 8` follow-up code review classification `Design Impact`
- Objective: remove final Codex bleed-through from shared runtime/event layers so runtime removal becomes localized.

### Additional Sources Consulted In Stage-8 Follow-Up

- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `autobyteus-server-ts/src/run-history/projection/providers/codex-thread-run-projection-provider.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
- `autobyteus-server-ts/src/runtime-execution/index.ts`

### Stage-8 Follow-Up Findings

1. Shared runtime-event mapper is still Codex-wired at construction:
   - `RuntimeEventMessageMapper` directly imports `CodexRuntimeEventAdapter`.
   - mapper registration logic explicitly binds `codex_app_server` inside shared mapping class.
2. Shared agent streaming debug path still uses Codex-specific controls:
   - env flags and log channels are Codex-branded while code executes for generic runtime forwarding.
3. Team member projection service still has a Codex-default fallback in shared service construction:
   - shared service imports Codex provider directly and seeds it as implicit default.
4. These couplings still make runtime removal non-local:
   - removing Codex requires edits in shared mapper/service files instead of only runtime module registration.

### Refined Design Implications For This Iteration

- `C-015`: Introduce runtime-event mapping registry registration from runtime modules; shared mapper must not import Codex adapter.
- `C-016`: Move runtime raw-event debug controls/logging to runtime-neutral naming and behavior in shared stream handler.
- `C-017`: Replace shared-service Codex-default projection fallback with provider-registry-driven lookup.

### Scope Triage Confirmation (Stage-8 Follow-Up)

- Classification remains: `Medium`
- Reason:
  - architectural cleanup is confined to server runtime/event/projection seams,
  - behavior-preserving refactor with no schema/API contract migration,
  - end-to-end validation remains feasible via existing backend/frontend full suites.

## Stage-10 Re-Entry Investigation Refresh (Runtime Client + Composition Defaults)

- Date: `2026-03-04`
- Trigger: `Stage 10` user-requested continuation for deeper decoupling
- Objective: remove remaining runtime-specific wiring from shared registries/services and move it to runtime composition defaults.

### Additional Sources Consulted In Stage-10 Re-Entry

- `autobyteus-server-ts/src/runtime-management/runtime-kind.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
- `autobyteus-server-ts/src/runtime-management/model-catalog/runtime-model-catalog-service.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-capability-service.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/runtime-kind.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/runtime-capability-service.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/model-catalog/runtime-model-catalog-service.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/runtime-adapter-registry.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/projection/run-projection-provider-registry.test.ts`

### Stage-10 Re-Entry Findings

1. Shared registries/services still own runtime-specific defaults:
   - `RuntimeAdapterRegistry` constructor imports/builds Codex adapter directly.
   - `RuntimeModelCatalogService` constructor imports/builds Codex provider directly.
   - `RunProjectionProviderRegistry` getter imports/builds Codex projection provider directly.
2. Shared capability service is still Codex-hardwired:
   - `RuntimeCapabilityService` contains Codex env toggle parsing, codex binary probe, and codex cache slots.
3. Runtime kind core type is still static-two-runtime:
   - `runtime-kind.ts` defines `RuntimeKind` by literal tuple (`autobyteus`, `codex_app_server`), forcing shared-layer edits for runtime add/remove.
4. Resulting architectural risk remains:
   - removing Codex still requires touching shared classes instead of only runtime default-composition modules.

### Refined Design Implications For This Iteration

- `C-018`: Externalize runtime adapter default registration from shared registry class.
- `C-019`: Externalize runtime model-provider default registration from shared model-catalog service.
- `C-020`: Externalize run-projection provider default registration from shared projection registry.
- `C-021`: Introduce runtime capability provider seam so shared capability service is runtime-neutral and runtime-specific probing is default-module owned.
- `C-022`: Generalize `RuntimeKind` normalization/type guard to runtime-id strings (non-empty) so shared layers stop hardcoding runtime catalogs.

### Scope Triage Confirmation (Stage-10 Re-Entry)

- Classification remains: `Medium`
- Reason:
  - cross-layer architecture cleanup across runtime execution, runtime management, and run-history composition roots,
  - behavior-preserving internal refactor with bounded test surface,
  - full-suite verification remains feasible in current environment.

## Stage-10 Re-Entry Investigation Refresh 2 (Runtime Client Registration Consolidation)

- Date: `2026-03-04`
- Trigger: `Stage 10` user-requested continuation for deeper runtime removability
- Objective: remove final shared-layer edit requirements by centralizing runtime default registration behind one runtime-client composition seam.

### Additional Sources Consulted In This Re-Entry

- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-registry-defaults.ts`
- `autobyteus-server-ts/src/runtime-management/model-catalog/runtime-model-catalog-service.ts`
- `autobyteus-server-ts/src/runtime-management/model-catalog/runtime-model-catalog-defaults.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-capability-service.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-capability-service-defaults.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts`
- `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry-defaults.ts`
- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper-defaults.ts`
- `autobyteus-server-ts/src/runtime-execution/index.ts`
- `autobyteus-web/types/agent/AgentRunConfig.ts`

### Findings

1. Runtime default wiring is still distributed across multiple default modules:
   - adapter defaults, model-provider defaults, capability defaults, run-projection defaults, and runtime-event-mapper defaults each register Codex separately.
2. Removing one runtime still requires multi-file shared-layer edits:
   - runtime module removal is not yet a single-point composition operation.
3. `runtime-execution/index.ts` still exports Codex runtime internals directly:
   - shared export surface leaks runtime-specific modules even though higher layers now mostly use ports/registries.
4. Frontend remains largely runtime-agnostic for event handling:
   - residual Codex mentions are mainly runtime labels/tests and do not indicate backend contract bleed-through.

### Refined Design Implications For This Iteration

- `C-023`: Introduce runtime-client registration modules to centralize default runtime wiring across all shared registries/services.
- `C-024`: Route existing `*-defaults.ts` modules through the centralized runtime-client registration list so runtime removal/addition is localized.
- `C-025`: Tighten shared export surfaces by removing Codex re-exports from `runtime-execution/index.ts` (runtime-specific entrypoints stay in runtime-specific modules).

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - architecture improvement spans multiple shared services but is behavior-preserving,
  - primary work is composition-root refactor and export-surface cleanup, not protocol/schema change,
  - verification remains feasible with existing backend/frontend suites.

## Stage-10 Re-Entry Investigation Refresh 3 (Discovery-Driven Runtime Module Loading)

- Date: `2026-03-05`
- Trigger: `Stage 10` user-requested continuation for runtime auto-load/discovery with Autobyteus runtime always enabled
- Objective: make optional runtime module loading discovery-driven so runtime removal/enablement does not require editing centralized module composition code for every environment.

### Additional Sources Consulted In This Re-Entry

- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-modules-defaults.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/autobyteus-runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/codex-runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-capability-service.ts`
- `autobyteus-web/stores/runtimeCapabilitiesStore.ts`

### Findings

1. Runtime composition is centralized but still static:
   - `getDefaultRuntimeClientModules()` currently hardcodes `[autobyteus, codex]`.
2. Codex availability logic exists but is only used for capability status:
   - `CODEX_APP_SERVER_ENABLED` + `codex --version` probe live inside Codex capability provider logic.
   - The codex module is still always registered at composition time.
3. Architectural gap for removability/discovery:
   - Optional runtime registration still depends on static composition-list editing.
   - Current runtime capability list may include runtimes that are not actually desired for current deployment mode.
4. Desired target behavior from user direction:
   - `autobyteus` remains always-on.
   - optional runtimes (currently `codex_app_server`, future cloud/runtime modules) are discovered/enabled without requiring shared-layer edits.

### Refined Design Implications For This Iteration

- `C-026`: replace static runtime-client module list with descriptor-driven resolver (`required` vs `optional`) that always includes Autobyteus and auto-discovers optional runtime modules.
- `C-027`: add explicit runtime module allow-list env override for deployment control (for example containerized environments) while preserving availability probing fallback.
- `C-028`: add targeted unit coverage for runtime-client module discovery behavior (always-on core runtime + optional module discovery/allowlist filtering).

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - behavior-preserving architecture refactor at composition root,
  - impacts runtime registration across adapter/model/capability/projection/event-mapper seams,
  - verification remains feasible via focused unit tests plus full backend/frontend regressions.

## Stage-10 Re-Entry Investigation Refresh 4 (Capability-Driven Team Mode + Runtime Discovery Boundary Cleanup)

- Date: `2026-03-05`
- Trigger: `Stage 10` user-requested design/investigation iteration after architecture review
- Objective: close remaining decoupling gaps so runtime removal/addition is localized to runtime modules and shared layers no longer depend on runtime identity.

### Additional Sources Consulted In This Re-Entry

- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-modules-defaults.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/autobyteus-runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/codex-runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
- `autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts`
- `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
- `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/runtime-execution/index.ts`
- `autobyteus-server-ts/src/runtime-management/model-catalog/index.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/index.ts`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/stores/runtimeCapabilitiesStore.ts`

### Findings

1. Runtime module composition is still descriptor-hardcoded at one point:
   - `runtime-client-modules-defaults.ts` explicitly imports/registers Codex and Autobyteus descriptors.
   - This is improved over distributed defaults but still not plugin-style discovery.
2. Team runtime routing policy is still runtime-name-based:
   - `team-run-mutation-service.ts` maps `autobyteus` => native-team behavior and everything else => member-runtime.
   - `team-member-runtime-orchestrator.ts` rejects `autobyteus` by runtime-id literal.
3. Shared barrel/export surfaces still leak runtime-specific implementations:
   - `runtime-execution/index.ts` and `runtime-management/model-catalog/index.ts` export runtime-specific classes from generic entrypoints.
4. Frontend runtime handling remains runtime-kind generic and capability-driven:
   - runtime selection and disablement flow are driven by `runtimeCapabilities` payload (not hardcoded event semantics).

### Refined Design Implications For This Iteration

- `C-029`: introduce runtime-module discovery descriptors exported by each runtime module and consumed generically by runtime-client defaults (remove direct Codex import from composition root).
- `C-030`: make team runtime mode policy adapter-capability-driven (`native_team` vs `member_runtime`) instead of runtime-name branching.
- `C-031`: tighten shared barrel exports so generic layers expose contracts/services only; runtime-specific exports remain in runtime-specific modules.

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - cross-layer but behavior-preserving refactor across runtime composition, team orchestration policy, and module boundaries,
  - no protocol/schema migration expected,
  - validation feasible with existing backend/frontend full-suite coverage plus focused unit tests.

## Stage-10 Re-Entry Investigation Refresh 5 (Descriptor Module Discovery In Runtime Client Index)

- Date: `2026-03-05`
- Trigger: `Stage 10` user-requested continuation for final runtime removability seam
- Objective: remove compile-time optional runtime descriptor imports from `runtime-client/index.ts` so runtime module composition is module-spec discovery driven.

### Additional Sources Consulted In This Re-Entry

- `autobyteus-server-ts/src/runtime-management/runtime-client/index.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-modules-defaults.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/autobyteus-runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/codex-runtime-client-module.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/runtime-client/runtime-client-modules-defaults.test.ts`

### Findings

1. Residual coupling point persists in runtime-client index:
   - `runtime-client/index.ts` still statically imports `autobyteus` and `codex` descriptors.
   - optional runtime removal still requires editing this shared composition file.
2. Shared defaults layer is already descriptor-driven and runtime-neutral:
   - `runtime-client-modules-defaults.ts` no longer directly imports optional runtime modules.
   - remaining gap is descriptor source loading strategy only.
3. Desired final direction for this seam:
   - runtime-client index should discover descriptor modules from module-spec configuration, not hardcoded imports.
   - Autobyteus module remains required through existing required-module guard in defaults.

### Refined Design Implications For This Iteration

- `C-033`: replace compile-time descriptor imports in `runtime-client/index.ts` with module-spec discovery loading (`AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES`) plus safe fallback defaults.
- `C-034`: add focused unit coverage for runtime-client descriptor module discovery behavior (default modules, env override, invalid module path tolerance).

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - confined to runtime composition boundary with localized implementation,
  - behavior-preserving refactor (no protocol/schema changes),
  - full backend/frontend regression remains feasible.
