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

## Stage-10 Re-Entry Investigation Refresh 5 (Strict No-Legacy Sweep)

- Date: `2026-03-05`
- Trigger: user-requested strict no-legacy quality iteration after handoff-ready state
- Objective: remove remaining legacy/compatibility behavior in active runtime-decoupling seams.

### Additional Sources Consulted

- `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/runtime-command-ingress-service.test.ts`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/types/agent/TeamRunConfig.ts`
- `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`

### Findings

1. `C-042` Runtime ingress retains legacy implicit-session fallback:
   - `resolveSession()` still contains `canUseLegacyImplicitSession` behavior and auto-creates runtime sessions for active runs without explicit binding.
   - This is a compatibility path that weakens explicit runtime session ownership boundaries.
2. `C-043` Team config override model still carries legacy per-member runtime shape:
   - `MemberConfigOverride` still exposes `runtimeKind?`.
   - `TeamRunConfigForm` still rewrites legacy per-member runtime overrides under a backward-compatible cleanup branch.
   - This keeps legacy schema compatibility logic in active shared frontend config path.

### Scope Triage Confirmation

- Classification: `Requirement Gap`
- Reason:
  - strict no-legacy/no-compat behavior must be explicit in requirements for active runtime ingress and team override shape,
  - this is a bounded cross-backend/frontend cleanup that still impacts runtime contract expectations and should be reflected in design/runtime-model artifacts before implementation.

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

## Stage-10 Re-Entry Investigation Refresh (Post-Merge Claude Runtime Intake)

- Date: `2026-03-05`
- Trigger: `Stage 10 -> Stage 1` re-entry (`Design Impact`) after merging `origin/personal` into `codex/runtime-decoupling-refactor`
- Objective: integrate incoming Claude Agent SDK runtime support into the decoupled runtime-client architecture without regressing runtime neutrality.

### Additional Sources Consulted In This Refresh

- `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/*.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/index.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-module.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-modules-defaults.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/codex-runtime-client-module.ts`
- `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-external-runtime-event-bridge.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/runtime-client/runtime-client-index.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/runtime-client/runtime-client-modules-defaults.test.ts`

### Refresh Findings

1. Incoming personal-branch Claude runtime code is largely feature-complete but was initially wired with non-refactor assumptions (direct registry/default integrations and optional-runtime static coupling points).
2. The current refactor branch already has the correct long-term seam: runtime-client descriptor/module discovery + centralized registration defaults.
3. Claude runtime integration needs to land through runtime-client module composition, not through hardcoded shared registry wiring.
4. Team/runtime projection behavior requires richer external-runtime projection preference for member-runtime sessions so local-memory snapshots do not mask fuller runtime-backed transcripts.
5. Optional-runtime safety remains critical: shared runtime-neutral barrels/services should avoid static optional-runtime imports; optional runtime modules must fail-soft when unavailable.

### Immediate Integration Adjustments Completed During Merge Conflict Resolution

- Added a dedicated optional runtime-client module for Claude runtime registration (`claude-runtime-client-module.ts`) and added descriptor-module discovery default entry.
- Expanded Claude adapter capabilities to align with decoupled shared contracts (`teamExecutionMode`, `isRunActive`, `subscribeToRunEvents`, relay handler binding, runtime-event interpretation).
- Updated team member projection service selection logic to prefer richer runtime projections for non-default runtimes while preserving safe local fallback behavior on runtime-provider errors.

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - Cross-layer impact across runtime registration, streaming contracts, team member runtime orchestration, and run-history projection behavior.
  - Requires requirements + design + runtime-model refresh to ensure Claude runtime lands without reintroducing runtime-specific coupling in shared layers.

## Stage-10 Re-Entry Investigation Refresh 6 (Legacy External Team Runtime Bridge Cleanup)

- Date: `2026-03-05`
- Trigger: `Stage 10 -> Stage 1` re-entry continuation after Claude merge alignment
- Objective: remove residual orphaned external-runtime event bridge wiring that still hardcodes optional runtimes in shared-layer modules.

### Additional Sources Consulted In This Refresh

- `autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-external-runtime-event-bridge.ts`
- `autobyteus-server-ts/src/runtime-execution/external-runtime-event-source-registry.ts`
- `autobyteus-server-ts/src/runtime-execution/external-runtime-event-source-port.ts`
- `autobyteus-server-ts/src/services/agent-streaming/index.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/external-runtime-event-source-registry.test.ts`

### Findings

1. Team member runtime event streaming already runs through runtime-neutral adapter seams:
   - `AgentTeamStreamHandler` depends on `TeamRuntimeEventBridge`, which resolves adapters via `RuntimeAdapterRegistry` and maps by explicit `binding.runtimeKind`.
2. Legacy external bridge path remains in tree but is unused by runtime entrypoints:
   - `TeamExternalRuntimeEventBridge` is exported from streaming index but not referenced by runtime orchestration or handlers.
3. Orphaned external runtime source registry is still hardcoded to Codex + Claude:
   - `ExternalRuntimeEventSourceRegistry` directly imports and constructs runtime services in shared layer, violating current decoupling direction.
4. Keeping both bridges increases architectural drift risk:
   - duplicated team member-runtime event bridge concepts create competing seams and invite future regressions back to hardcoded runtime wiring.

### Refined Design Implications For This Iteration

- `C-035`: remove orphaned external-runtime source abstraction and legacy team external bridge (`team-external-runtime-event-bridge.ts`, `external-runtime-event-source-registry.ts`, `external-runtime-event-source-port.ts`).
- `C-036`: standardize shared streaming exports on `TeamRuntimeEventBridge` as the sole team member-runtime bridge seam and add focused unit coverage for its runtime-kind mapping and error behavior.

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - this is a cross-cutting cleanup touching shared-layer boundaries and test coverage,
  - behavior remains unchanged for active runtime paths,
  - validation is feasible with focused backend unit suites.

## Stage-8 Re-Review Investigation Refresh (User-Requested Deep Audit)

- Date: `2026-03-05`
- Trigger: Stage-8 deep re-review request after iteration 5 handoff
- Objective: verify there are no residual Codex/Claude coupling leftovers in shared/runtime-neutral layers.

### Additional Sources Consulted

- `autobyteus-server-ts/src/runtime-management/runtime-client/claude-runtime-client-module.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-binding-state-service.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/index.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-client/runtime-client-modules-defaults.ts`

### Findings

1. `P1`: Claude runtime client module currently depends on `CodexRuntimeEventAdapter` for mapping.
   - Decoupling risk: runtime-to-runtime compile-time dependency violates plugin independence and runtime removability goals.
2. `P2`: Shared team-member lifecycle service imports Codex-specific `send_message_to` tooling.
   - Decoupling risk: shared layer references runtime-specific package path (`runtime-execution/codex-app-server/*`).
3. `P3`: Shared binding-state service is Claude-specific and dormant.
   - It imports Claude runtime service and runtime-kind branches on `claude_agent_sdk`; currently appears uninstantiated but remains residual coupling/dead path.

### Verification Notes

- Focused multi-runtime unit slice passed (runtime-client index/defaults, Codex + Claude adapters, ingress, orchestrator, team runtime bridge).
- Review outcome remains `Design Impact` despite test pass because architecture boundary violations persist.

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - Findings are architectural boundary issues across runtime composition and shared team orchestration layers.
  - Fixing requires design/runtime-model updates before implementation.

## Stage-8 Re-Review Investigation Refresh 2 (Claude Sandbox/Permission Parity)

- Date: `2026-03-06`
- Trigger: `Stage 8 -> Stage 2` re-entry (`Requirement Gap`) from user-requested parity audit
- Objective: align Claude runtime operational control with Codex-style sandbox configurability while preserving runtime-neutral architecture and existing behavior.

### Additional Sources Consulted In This Refresh

- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-launch-config.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-shared.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-session-state.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-team-metadata.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-shared.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`

### Findings

1. Codex already exposes runtime sandbox mode via env-driven launch normalization (`CODEX_APP_SERVER_SANDBOX`) and picks it up during thread/session lifecycle creation.
2. Claude runtime session creation currently hardcodes `permissionMode: "default"` in V2 session control interop; there is no equivalent configurable path.
3. `send_message_to` capability resolution is already runtime-neutral and tool-name driven in shared team orchestration:
   - metadata override first,
   - then agent `toolNames` allowlist semantics,
   - default-enabled when no explicit allowlist exists.
4. Server settings already supports arbitrary environment keys; adding a Claude permission-mode env key is sufficient for operational toggle symmetry without introducing runtime-specific shared-layer branching.

### Refined Design Implications For This Iteration

- `C-047`: add Claude permission/sandbox mode resolver with precedence (`runtimeMetadata` -> `llmConfig` -> env `CLAUDE_AGENT_SDK_PERMISSION_MODE` -> default), and thread it through Claude run-session state and V2 session create/resume options.
- `C-048`: add focused unit coverage for permission-mode resolution and V2 session option propagation; verify existing `send_message_to` tool-name behavior remains unchanged.

### Scope Triage Confirmation

- Classification remains: `Medium`
- Reason:
  - changes span runtime option resolution, runtime session state propagation, and focused unit tests,
  - behavior is intentionally preserved except for newly configurable Claude permission mode,
  - verification remains feasible with focused tests plus full backend/frontend gate reruns.

## 2026-03-06 Investigation Refresh (Parallel + Claude Approval Regression)

- Trigger: user-requested certainty check to determine ownership of parallel-test failures and Claude approval-flow instability.
- Classification outcome: `Local Fix` for Claude turn-completion handling; separate infra issue confirmed for parallel DB lock.

### Sources Consulted

- `autobyteus-server-ts/tests/setup/prisma-test-config.ts`
- `autobyteus-server-ts/tests/setup/prisma-global-setup.ts`
- `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-message-normalizers.ts`
- `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`
- `autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`
- `autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs`

### Findings

1. Parallel Vitest process lock is infrastructure-owned (not Claude runtime behavior):
- Global setup runs `prisma migrate reset` against a single fixed SQLite file under `tests/.tmp/autobyteus-server-test.db`.
- Concurrent Vitest processes therefore contend for the same DB and lock each other.

2. Claude manual-approval E2E failure is not purely an upstream SDK limitation; our integration loop is a contributing defect:
- Reproduced repeated failures where tool execution succeeded (file created) but websocket never reached `AGENT_STATUS=IDLE`.
- In `ClaudeAgentSdkRuntimeService.executeV2Turn`, we currently iterate `for await (const chunk of session.stream())` until generator closure.
- Claude SDK V2 `SDKSession.stream()` is session-level and emits `type: "result"` terminal messages per turn; stream closure is not guaranteed per turn.
- SDK's own helper (`unstable_v2_prompt`) returns on `message.type === "result"`, not on stream close.
- Result: our turn can hang waiting for stream termination even after turn result is emitted, causing Stage-7 timeout and cleanup-side `ERR_STREAM_WRITE_AFTER_END` noise.

3. Supplemental behavior gap:
- Shared runtime-event adapter maps `turn/completed -> IDLE` only.
- On runtime error path, event mapping sends `ERROR` but does not produce an idle-equivalent status transition, making websocket wait loops brittle if they depend strictly on `RUNNING -> IDLE`.

### Ownership Decision

- `database is locked` in parallel external Vitest runs: **our test infra setup**.
- Claude manual approval timeout/hang: **our runtime integration turn-completion logic defect** (with SDK behavior as a trigger), therefore actionable in our code.

### Stage Decision

- Re-entry classification finalized as `Local Fix`.
- Required path: `6 -> 7 -> 8` after implementing bounded turn-completion fix and rerunning runtime-enabled verification.

## 2026-03-06 Investigation Refresh (`origin/personal` Parity)

- Trigger: user-requested parity check to verify whether refactor changed runtime behavior relative to the known-good `origin/personal` branch.
- Classification outcome: `Local Fix` for a refactor-introduced Codex test-runtime regression; separate Codex thread-history retry gap confirmed as inherited from `origin/personal`, not introduced by this refactor.

### Sources Consulted

- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts`
- `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
- `origin/personal:autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts`
- `origin/personal:autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts`
- `origin/personal:autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`

### Findings

1. `origin/personal` remains green for the focused live Codex lifecycle scenario:
   - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "streams real codex tool lifecycle events over websocket"`
   - Result: pass in detached worktree at `origin/personal`.

2. The current refactor branch also remains green for that same focused scenario when using the normal Codex home path:
   - same command in current worktree,
   - Result: pass.

3. The current refactor branch fails for the same focused scenario only when the refactor-introduced Vitest home-isolation path is enabled:
   - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_TEST_HOME_BASE="$(mktemp -d /tmp/codex-app-server-test-home-XXXXXX)" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "streams real codex tool lifecycle events over websocket"`
   - Result: fail with repeated `stream disconnected - retrying sampling request` warnings and websocket timeout after only `SEGMENT_CONTENT`, `ERROR`, and `AGENT_STATUS` events.

4. `origin/personal` does not contain the new isolation behavior:
   - current refactor branch added `resolveAppServerEnv()` in `codex-app-server-process-manager.ts`,
   - under Vitest, when `CODEX_APP_SERVER_TEST_HOME_BASE` is set and `CODEX_HOME` is otherwise unset, it creates a worker-scoped `CODEX_HOME` and passes it into `CodexAppServerClient`,
   - `origin/personal` has no equivalent override.

5. Therefore the focused Codex parity regression is attributable to our refactor branch, not to a generic internet problem:
   - baseline behavior matches `origin/personal` without the new override,
   - the failure appears only when exercising the new refactor-only app-server environment path.

6. Separate Codex thread-history behavior is not a refactor regression:
   - `codex-thread-history-reader.ts` is unchanged relative to `origin/personal`,
   - it still retries `thread/read` only for `"thread not loaded"` and not for `"not materialized yet"`,
   - this remains a real behavior gap, but it is inherited from the known-good branch rather than introduced by the decoupling refactor.

### Ownership Decision

- Focused live Codex lifecycle regression under `CODEX_APP_SERVER_TEST_HOME_BASE`: **our refactor branch change**.
- Codex thread-history `"not materialized yet"` retry gap: **shared upstream behavior**, not evidence that the refactor changed functionality.

### Stage Decision

- Re-entry classification finalized as `Local Fix`.
- Required path: `6 -> 7 -> 8` after implementing a bounded Codex process-manager parity fix and rerunning runtime-enabled verification.

## 2026-03-06 Investigation Refresh (Runtime-Enabled Backend Gate Rerun)

- Trigger: user requested a full backend confirmation pass with all runtime-enabled tests running cleanly.
- Classification outcome: `Local Fix` in the Codex thread-history reader; the failure is deterministic in the current branch's full backend gate and is not explained by the earlier `CODEX_HOME` parity regression.

### Sources Consulted

- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts`
- `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
- `autobyteus-server-ts/src/run-history/projection/providers/codex-thread-run-projection-provider.ts`
- full runtime-enabled backend rerun command and live output

### Findings

1. The full runtime-enabled backend rerun advanced further than the prior attempt:
   - `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` completed cleanly with `17/17` passing.

2. The first deterministic Stage-7 blocker is now in the live Codex GraphQL file:
   - command: `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
   - failure surfaced in `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
   - failing scenario: `accepts image contextFiles from URL and absolute path and records both in Codex thread history`

3. The repeated runtime error is stable and local to the thread-history reader seam:
   - `Failed to read Codex thread '...'`
   - `Codex app server RPC error -32600: thread ... is not materialized yet; includeTurns is unavailable before first user message`
   - the reader currently retries only on `"thread not loaded"` and therefore logs and returns `null` on the materialization case.

4. This failure mode is compatible with the e2e polling loop:
   - the test polls `historyReader.readThread(...)` until deadline,
   - but the reader treats the materialization state as terminal instead of transient,
   - causing repeated null reads and preventing Stage-7 closure for the full backend gate.

### Ownership Decision

- Current full-suite Codex thread-history materialization failure: **our code issue**, bounded to the reader retry policy.
- Earlier Claude live-file slowness/process-exit warnings: **not an active gate blocker** in this rerun because the full Claude GraphQL file completed cleanly.

### Stage Decision

- Re-entry classification finalized as `Local Fix`.
- Required path: `6 -> 7` after extending Codex thread-history retry handling to cover the materialization state and rerunning the runtime-enabled backend gate.

## 2026-03-06 Investigation Refresh (Full Backend Rerun After Thread-History Fix)

- Trigger: confirm whether the bounded Codex thread-history retry fix closes the full backend runtime-enabled gate.
- Classification outcome: `Local Fix` remains, but the active blocker moved forward to a later live Codex websocket metadata case.

### Sources Consulted

- full runtime-enabled backend rerun output after the thread-history fix
- `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`

### Findings

1. The fixed Stage-7 blocker is resolved:
   - the full rerun advanced past `accepts image contextFiles from URL and absolute path and records both in Codex thread history`
   - that scenario had been the deterministic failure before the `CodexThreadHistoryReader` retry update.

2. The next blocker is a later live Codex websocket metadata case:
   - file: `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
   - scenario: `streams codex generate_image tool_call metadata with non-empty arguments over websocket`
   - observed behavior: the suite remained stuck on that scenario for several minutes with no terminal pass/fail event before manual interruption.

3. This means the backend gate still cannot be called green:
   - full rerun state at interruption:
     - `4` test files passed,
     - `44` tests passed,
     - active test stuck at `9/12` in the Codex runtime GraphQL file.

### Ownership Decision

- Codex thread-history materialization failure: **fixed local code issue**.
- Current `generate_image` metadata hang: **new unresolved blocker**, ownership not yet finalized from the available evidence.

### Stage Decision

- Stage 6 remains open.
- Next action is a focused investigation/repro of the Codex `generate_image` metadata test to determine whether the stall is caused by our websocket/tool-event path or by external runtime/tool availability.

## 2026-03-06 Investigation Refresh (Latest Full Backend + Frontend Rerun)

- Trigger: user requested another complete rerun of backend and frontend suites, explicitly including Codex and Claude/Claude Agent SDK paths.

### Findings

1. Full backend suite completed and did not pass cleanly:
   - command:
     - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
   - result:
     - `1 failed | 261 passed | 3 skipped` files
     - `1 failed | 1196 passed | 8 skipped` tests

2. The failing backend test is now precise and reproducible:
   - file: `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
   - case: `streams codex run_bash metadata with non-empty command over websocket`
   - failure:
     - `Timed out waiting for run_bash metadata command`
     - `promptSent=true`
     - `commandSeen=false`
     - seen websocket types were only `SEGMENT_CONTENT`, `AGENT_STATUS`, `SEGMENT_START`, `SEGMENT_END`

3. Frontend full suite passed cleanly:
   - command:
     - `pnpm -C autobyteus-web test`
   - result:
     - Nuxt: `148 passed`, `730 passed`
     - Electron: `6 passed`, `39 passed`

### Ownership Decision

- Backend gate status: **still failing** due to one live Codex websocket metadata case.
- Frontend gate status: **green**.

### Stage Decision

- Stage 6 remains open with a bounded backend-only local-fix investigation target:
  - Codex websocket `run_bash` metadata emission/observation path in the live GraphQL e2e flow.

## 2026-03-06 Investigation Refresh (Codex `run_bash` Isolation + `origin/personal` Comparison)

- Trigger: user requested another investigation round to verify whether the backend failure was introduced by refactoring and, if needed, compare current behavior against `origin/personal`.

### Sources Consulted

- focused live Codex reruns of:
  - `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "streams codex run_bash metadata with non-empty command over websocket"`
- full live Codex GraphQL file rerun of:
  - `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
- detached `origin/personal` worktree at `/private/tmp/origin-personal-runtime-review`

### Findings

1. The previously reported `run_bash` backend failure does not reproduce deterministically on the refactor branch:
   - the focused `run_bash` case passed once during the earlier isolation round,
   - the full Codex GraphQL file also passed the `run_bash` case,
   - three additional focused `run_bash` reruns all passed.

2. The only deterministic failure left in the full Codex GraphQL file is still `generate_image`:
   - file: `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
   - case: `streams codex generate_image tool_call metadata with non-empty arguments over websocket`
   - result: timed out after `90000ms`

3. The detached `origin/personal` baseline is not clean in this environment either:
   - the same full Codex GraphQL file in `/private/tmp/origin-personal-runtime-review` failed early with multiple errors before completion,
   - observed runtime stderr included repeated shell-snapshot failures:
     - `Shell snapshot validation failed: Failed to execute bash`
     - `No such file or directory (os error 2)`
   - the run was interrupted after reaching `4 failed | 3 passed` by test `7/12`.

4. This means the current evidence does not support the claim that refactoring broke the `run_bash` behavior path:
   - current branch `run_bash` path is green in focused and file-level isolation,
   - `origin/personal` is not a clean control baseline under the same local environment,
   - the remaining deterministic blocker is confined to the live `generate_image` case.

### Ownership Decision

- `run_bash` metadata timeout in the prior full-backend suite: **non-deterministic live-runtime failure; not currently attributable to a refactor code regression**.
- `generate_image` metadata timeout: **environment/tool-availability blocker unless a deterministic product-code defect is later isolated**.

### Stage Decision

- Stage 7 should be treated as **Blocked**, not **Fail**, because the only reproducible Codex live blocker left is the environment-constrained `generate_image` case and there is no bounded source-code fix isolated from this investigation round.

## 2026-03-07 Investigation Refresh (Workspace-backed Claude startup failure)

### Trigger
- User requested continued workflow-state-machine investigation because refactoring must not break existing behavior.

### Sources Consulted
- Focused live Claude reruns of:
  - `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "retains two streamed turns in Claude run projection after terminate"`
  - `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "preserves workspace mapping for Claude runs created with workspaceId across send->terminate->continue"`
  - `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "creates and terminates a Claude runtime run through GraphQL"`
- Claude SDK debug log:
  - `/Users/normy/.claude/debug/sdk-7399c74f-e265-43b7-b121-9583c4d590b9.txt`
- Local runtime integration sources:
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
  - `autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`

### Findings
1. The post-merge/live Claude failure is deterministic for workspace-backed runs, not just the two-turn projection scenario.
   - The focused projection test fails before projection assertions.
   - The independent workspace-mapping test fails at the same first-turn create/bootstrap point.
   - The simple non-workspace create/terminate Claude case still passes.

2. The concrete runtime error is now captured from the Claude SDK debug log.
   - Claude Code emitted:
     - `The current working directory was deleted, so that command didn't work. Please cd into a different directory and try again.`
   - This is the actual reason behind the wrapper-level `Claude Code process exited with code 1` failure.

3. The local integration defect is the process-global cwd mutation in Claude V2 session creation.
   - `createOrResumeClaudeV2Session(...)` already passes `cwd` in the session options.
   - It also wraps the same create/resume call in `withScopedProcessCwd(...)`, which mutates the Node process-global cwd.
   - That global cwd mutation is unnecessary and unsafe in a long-lived multi-test/multi-runtime process.

4. The current WIP `RunContinuationService` persistence patch is malformed and must be repaired during the same Stage-6 local-fix iteration.
   - Active-session branch references `manifest` before declaration.
   - New-run branch references `persistedManifest` instead of `manifest`.

### Ownership Decision
- Workspace-backed Claude startup failure: **our code issue**.
- Trigger source: **local Claude V2 interop cwd handling**, not external Claude service instability.
- `RunContinuationService` WIP breakage: **our code issue**.

### Stage Decision
- Stay in **Stage 6** under the existing `Local Fix` re-entry.
- Required fixes are local implementation corrections; no upstream requirement/design re-entry is needed from this investigation round.

## 2026-03-07 Investigation Refresh (Combined backend rerun failure)

### Trigger
- Combined runtime-enabled backend rerun was executed to re-close Stage 7 after the focused Claude cwd/runtime-reference repairs.

### Sources Consulted
- Combined backend gate output from:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
- Failing test files:
  - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/team-run-history-service.test.ts`
- Shared persistence source under review:
  - `autobyteus-server-ts/src/run-history/services/run-history-service.ts`

### Findings
1. The combined backend gate is not green for the current snapshot.
   - Terminal result:
     - `3 failed | 229 passed | 3 skipped` files
     - `7 failed | 1094 passed | 8 skipped` tests

2. The Claude team live failures are deterministic GraphQL schema failures, not Claude transport/runtime flakiness.
   - Five failing Claude team tests all terminate at GraphQL validation before runtime execution.
   - Common failure:
     - `GraphQLError: Unknown type "CreatePromptInput". Did you mean "CreateSkillInput" or "CreateWorkspaceInput"?`
   - This points to a merged schema/test drift in the team live setup path and is classified as a local code/test issue.

3. The team-run history unit regression is deterministic and local.
   - Failing assertion:
     - `expected 'codex_app_server' to be 'claude_agent_sdk'`
   - Test:
     - `tests/unit/run-history/team-run-history-service.test.ts`
     - `refreshes stored member runtime reference from active bindings on team event`
   - This indicates the latest active-binding/runtime-reference refresh path is persisting or deriving the wrong runtime kind during team event handling.

4. The new Claude projection fix introduced a shared-layer coupling smell.
   - `RunHistoryService` now checks `runtimeKind === "claude_agent_sdk"` when applying runtime-event hints and mutates both `sessionId` and `threadId` itself.
   - That is behavior knowledge about Claude semantics inside a shared run-history persistence service.
   - This is a design regression against the decoupled adapter-based architecture, even though it was introduced as a bounded behavioral fix.

5. One live Codex approval-lifecycle case still timed out in the combined rerun.
   - Failure:
     - `streams codex tool approval requested and approved lifecycle over websocket`
     - timeout after `50101ms`
     - only `SEGMENT_CONTENT`, `AGENT_STATUS`, `SEGMENT_START`, `SEGMENT_END` were observed
   - This remains unclassified until the deterministic local failures above are removed and the case is re-isolated again.

### Ownership Decision
- Claude team GraphQL `CreatePromptInput` rejection: **our code/test merge issue**.
- Team-run history runtime-kind refresh mismatch: **our code issue**.
- Shared `RunHistoryService` Claude-specific branch: **our architecture regression**.
- Codex approval lifecycle timeout: **still under investigation after deterministic local failures are removed**.

### Stage Decision
- Stage 7 failed and should re-enter **Stage 6** under `Local Fix`.
- No requirement/design escalation is needed yet because the current known failures are bounded implementation/integration issues.

## 2026-03-07 Investigation Refresh (Post-fix Codex live-runtime instability)

### Trigger
- Deterministic Claude/team local fixes were complete, but the Stage-7 combined backend rerun still failed in the live Codex websocket/tool-metadata slice.

### Sources Consulted
- Combined backend rerun:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
- Focused Codex `edit_file` rerun:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "streams codex edit_file metadata with non-empty path and patch over websocket"`
- Reduced two-test Codex rerun:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts --testNamePattern "streams real codex tool lifecycle events over websocket \(auto-approves in test\)|streams codex edit_file metadata with non-empty path and patch over websocket"`
- Code diff against `origin/personal`:
  - `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
  - `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
  - `autobyteus-server-ts/src/run-history/services/run-history-service.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`

### Findings
1. The remaining Codex backend failure is not deterministic on the same test path.
   - Full combined rerun failed the `edit_file` metadata case.
   - The same `edit_file` case passed immediately in isolation.
   - A reduced rerun with the preceding lifecycle case then flipped and failed the earlier lifecycle case while `edit_file` passed.

2. The failure mode is live-runtime transport instability, not a stable metadata parser regression.
   - Observed signals include websocket/tool-lifecycle timeouts and Codex runtime stderr such as:
     - `stream disconnected - retrying sampling request`
   - The reproductions do not converge on one consistent assertion or one consistent test case.

3. The current refactor diff does not show a targeted semantic change in the Codex `edit_file` metadata path itself.
   - The meaningful refactor deltas around Codex are:
     - adapter capability/event interpretation support,
     - runtime-neutral run-history reference hint handling,
     - test hardening/retry logic in the Codex e2e file.
   - No bounded refactor change was isolated that deterministically explains the live `edit_file` failure.

4. The deterministic local-fix scope from this iteration is closed.
   - Claude team runtime binding refresh is fixed and covered.
   - Shared run-history runtime hint handling is runtime-neutral.
   - Focused compile, unit, and live Claude team verification all pass.

### Ownership Decision
- Remaining Stage-7 Codex websocket/tool-metadata failure: **Unclear / likely live-runtime instability, not a currently proven refactor regression**.
- Deterministic Claude/team failures from the prior round: **resolved local code issues**.

### Stage Decision
- Stage 7 cannot close yet.
- Re-entry classification is now **Unclear**, so the workflow returns to investigation before any further source-code edits.


## 2026-03-07 Investigation Refresh (Codex suite-contamination narrowing)

### Trigger
- Continue Stage-1 investigation after the prior re-entry classified the remaining Stage-7 Codex backend blocker as `Unclear`.

### Sources Consulted
- Focused Codex lifecycle test:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "streams real codex tool lifecycle events over websocket \(auto-approves in test\)"`
- Focused Codex prefix through `edit_file`:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts --testNamePattern "lists codex runtime models from app-server transport|creates and continues a codex runtime run through GraphQL|accepts image contextFiles from URL and absolute path and records both in Codex thread history|restores a terminated codex run in the same workspace after continueRun|preserves workspace mapping for codex runs created with workspaceId across send->terminate->continue|returns non-empty run projection conversation for completed codex runs|streams real codex tool lifecycle events over websocket \(auto-approves in test\)|streams codex edit_file metadata with non-empty path and patch over websocket"`
- Reduced order reproduction already captured earlier:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts --testNamePattern "streams real codex tool lifecycle events over websocket \(auto-approves in test\)|streams codex edit_file metadata with non-empty path and patch over websocket"`
- Runtime-only suite attempt:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
- Source inspection:
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts`
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/runtime-event-listener-hub.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
- Direct code comparison:
  - `origin/personal:autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts`

### Findings
1. The Codex live failures do not reproduce deterministically within the Codex runtime file prefix.
   - Lifecycle alone: pass.
   - Lifecycle + edit_file: one prior rerun flipped and timed out in lifecycle while `edit_file` passed.
   - Larger prefix through `edit_file`: pass (`8 passed | 4 skipped`).

2. The Codex app-server process manager has a real shared-state design flaw, but it is not yet proven to be the direct blocker.
   - `CodexAppServerProcessManager` caches exactly one client/process for all requests.
   - The cached process is launched with the `cwd` from the first `getClient(cwd)` call and ignores later `cwd` values.
   - Many live Codex tests create temp workspaces and then delete them in `finally`.
   - This explains why shell-snapshot/bash warnings can appear later, but it does not fully explain the Stage-7 blocker because the focused prefix still passed while those warnings were present.

3. The singleton-client design is inherited from `origin/personal`, not introduced by the refactor branch.
   - `origin/personal` has the same one-client `CodexAppServerProcessManager` implementation.
   - So this is a likely longstanding product/runtime issue, not evidence of a refactor-specific regression by itself.

4. The remaining Codex blocker still looks like suite-level contamination or live-runtime nondeterminism rather than a bounded refactor logic bug.
   - The full backend suite failed in Codex `edit_file` metadata.
   - Isolated and prefix reruns passed.
   - The reduced two-test rerun instead failed the earlier lifecycle case.
   - The failure mode therefore still does not converge on one stable assertion path.

5. Runtime-only suite evidence did not produce a quick deterministic Codex closure before unrelated live Claude noise reappeared.
   - That run was stopped because it no longer provided a clean narrow signal for the Codex blocker.

### Ownership Decision
- Codex singleton client / launch-cwd reuse: **real product design flaw, inherited from pre-refactor baseline**.
- Remaining Stage-7 Codex backend failure: **still Unclear**.
- No new deterministic refactor regression was isolated in this investigation round.

### Stage Decision
- Stay in **Stage 1 Investigation**.
- Keep **Code Edit Permission = Locked** until a narrower fix target is proven.

## 2026-03-07 Investigation Refresh (Claude acceptance narrowing + teardown-race signal)

### Trigger
- Continue Stage-1 investigation after the broad runtime-enabled backend rerun again showed live Claude `exit code 1` warnings before the suite reached a clean conclusion.

### Sources Consulted
- Full runtime-enabled backend rerun (interrupted after new Claude evidence was gathered):
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
- Focused Claude subset rerun:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "preserves workspace mapping for Claude runs created with workspaceId across send->terminate->continue|executes Claude tool commands inside the selected workspace across terminate->continue|retains two-turn history and grows it after continue|streams Claude AGENT_STATUS transitions over websocket for a live turn"`
- Runtime-only cross-file suite attempt (interrupted after Claude-only signal was sufficient):
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- Source inspection:
  - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
  - `autobyteus-server-ts/src/run-history/store/run-history-index-store.ts`
- Direct code comparison versus baseline:
  - `origin/personal:autobyteus-server-ts/src/run-history/services/run-continuation-service.ts`
  - `origin/personal:autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`

### Findings
1. The broad backend rerun does not currently isolate a deterministic Claude acceptance failure.
   - In the broad rerun, Claude logged `Claude Code process exited with code 1` during continue/workspace and later AGENT_STATUS flows.
   - Those warnings were not sufficient by themselves to prove a failing acceptance criterion because the focused Claude subset later passed.

2. The narrowed Claude acceptance slice passes even when the live runtime emits `exit code 1` warnings.
   - Focused subset result: `1 passed` file, `4 passed`, `13 skipped` tests.
   - Passing cases included:
     - workspace mapping across `send -> terminate -> continue`,
     - workspace-aware tool execution across continue,
     - two-turn history growth after continue,
     - AGENT_STATUS transitions over websocket.
   - Therefore the current Claude signal is closer to recoverable runtime noise than to a clean refactor regression in those behavior paths.

3. A new teardown/lifecycle race signal appeared during the focused Claude subset.
   - `agent-stream-handler` logged:
     - `Error forwarding runtime event: Error: ENOENT: no such file or directory, rename ... run_history_index.json...tmp -> .../run_history_index.json`
   - The write path is `RunHistoryIndexStore.writeIndexDirect()`.
   - This indicates async runtime-event persistence can outlive temp app-data directory lifetime during test teardown.
   - The focused subset still passed, so this is not yet a proven acceptance blocker, but it is a plausible suite-contamination vector for the broader backend gate.

4. The earlier `RunContinuationService` runtime-reference delta is reviewed but not yet a proven blocker.
   - Current refactor branch persists refreshed runtime references to the manifest but no longer rebinds the in-memory run session after `sendTurn(...)`.
   - After tracing `RuntimeCommandIngressService` and `RuntimeCompositionService`, active `sendTurn` dispatch does not currently consume that in-memory runtime reference, and restore paths read from the manifest, which is updated.
   - So this remains a reviewed refactor delta, not a demonstrated root cause for the live backend instability.

5. Cross-file runtime-only evidence is trending away from a direct Claude architecture break.
   - The combined runtime-only suite advanced through the Claude runtime subset and most/all of the Claude team file without a deterministic acceptance failure before it was stopped.
   - The visible signals in that run were teardown noise (`Memory file missing`, removal warnings), not a stable assertion break.

### Ownership Decision
- Focused Claude continue/history/AGENT_STATUS behavior: **passing**.
- Claude `exit code 1` log entries: **recoverable live-runtime noise unless they produce an actual assertion failure**.
- `run_history_index.json` ENOENT on temp-app-data rename: **real teardown/lifecycle race signal, not yet a proven Stage-7 blocker**.
- Remaining Stage-7 backend instability: **still Unclear**, with suspicion shifting toward broader backend lifecycle contamination and/or Codex live-runtime nondeterminism rather than a newly isolated Claude decoupling regression.

### Stage Decision
- Stay in **Stage 1 Investigation**.
- Keep **Code Edit Permission = Locked** until either:
  - the teardown-race path is proven to cause a real failing gate, or
  - a narrower deterministic Codex or mixed-suite blocker is isolated.

## 2026-03-07 Investigation Refresh (Separate backend gates by runtime)

### Trigger
- User requested separate backend full-suite runs with live Claude and live Codex enabled independently.

### Sources Consulted
- Claude-only backend gate:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
- Focused Claude history/projection slice:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "returns non-empty run projection conversation for completed Claude runs|retains two streamed turns in Claude run projection after terminate|retains two-turn history and grows it after continue"`
- Codex-only backend gate (interrupted once Claude local-fix target was identified):
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
- Source inspection:
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts`

### Findings
1. Claude-only full backend gate is not clean.
   - The first concrete failure appeared in the live Claude runtime GraphQL file after the Claude team file had already passed.
   - Error signature:
     - `CLAUDE_V2_WORKING_DIRECTORY_INVALID: Unable to switch cwd to '.../claude-history-projection-e2e-...'`
     - underlying cause:
       - `ENOENT: no such file or directory, chdir ... -> .../claude-history-projection-e2e-...`

2. The failing seam is local code in the Claude V2 interop layer.
   - `createOrResumeClaudeV2Session(...)` still wraps SDK session creation in `withScopedProcessCwd(...)`.
   - That helper mutates process-global cwd and throws if the target workspace path no longer exists.
   - The broad backend gate reached a state where a temp workspace had already been removed before the next Claude V2 session creation attempt, causing the backend failure.

3. This is a bounded local implementation defect, not a requirements or architecture ambiguity.
   - The session options already pass explicit `cwd`.
   - The remaining global `process.chdir(...)` wrapper is therefore redundant risk in the current architecture.
   - Classification is now **Local Fix** rather than **Unclear**.

4. Codex-only full backend gate did not immediately reproduce a comparable deterministic failure before it was stopped.
   - Claude files skipped as expected.
   - Codex runtime GraphQL progressed through early create/continue/image-history paths normally.
   - Existing Codex runtime noise remained inherited and non-fatal at that point:
     - shell snapshot cleanup warnings,
     - `not materialized yet` thread-read warnings,
     - slow SQLite/log writes.

### Ownership Decision
- Claude-only backend gate failure: **our code issue**.
- Root cause category: **Local Fix** in `claude-runtime-v2-control-interop.ts`.
- Codex-only backend status: **not yet shown red in the separate run before interruption**.

### Stage Decision
- Re-entry classification changes from **Unclear** to **Local Fix**.
- Workflow can re-enter **Stage 6** for bounded implementation repair and then rerun Stage 7 backend gates separately again.

### Addendum: Codex-only runtime pair narrowing

- Ran the Codex live runtime pair without Claude or the rest of the backend suite:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- The run advanced through the previously suspicious Codex GraphQL path in order:
  - continue/workspace restore cases passed,
  - `streams real codex tool lifecycle events over websocket (auto-approves in test)` passed in-sequence,
  - `streams codex edit_file metadata with non-empty path and patch over websocket` started after lifecycle rather than reproducing the earlier full-gate timeout immediately.
- The Codex-only run emitted the same inherited runtime noise already seen elsewhere:
  - shell snapshot validation failures / delete warnings under `~/.codex/shell_snapshots`,
  - slow SQLite/log write warnings,
  - fallback resume warning `no rollout found for thread id ...` followed by creation of a new thread.
- Because the pair did not fail before reaching the earlier blocker points, the current evidence further weakens the hypothesis that the refactor broke the Codex runtime file itself.
- Updated ownership view:
  - focused Codex runtime slice: **not reproducing the Stage-7 failure deterministically**,
  - remaining Stage-7 blocker: **most likely wider full-gate nondeterminism / runtime-environment instability rather than a newly isolated architecture regression in the narrowed Codex slice**.

## 2026-03-07 Investigation Refresh (Separate backend full suites completed)

### Trigger
- User requested separate backend testing for Claude and Codex runtime-enabled suites, with the goal of proving the existing backend inventory still passes under the decoupled runtime architecture.

### Sources Consulted
- Codex-only full backend suite:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
- Claude-only full backend suite:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`

### Findings
1. The two backend suites cannot be launched in parallel in the current harness.
   - Both Vitest runs share the same Prisma global setup and the same SQLite database file:
     - `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`
   - Parallel startup caused an immediate `database is locked` failure.
   - This is test-harness concurrency, not runtime decoupling behavior.

2. Codex-only full backend suite is almost clean, but still not green.
   - Final result:
     - `1 failed | 229 passed | 5 skipped` files
     - `1 failed | 1080 passed | 30 skipped` tests
   - The only failing test was:
     - `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
     - `streams codex generate_image tool_call metadata with non-empty arguments over websocket`
   - Failure shape:
     - timeout waiting for non-empty `generate_image` metadata arguments,
     - websocket traffic only showed `SEGMENT_CONTENT`, `AGENT_STATUS`, `SEGMENT_START`, `SEGMENT_END`,
     - no tool-call arguments were surfaced.

3. Claude-only full backend suite is not green and now has deterministic live-runtime failures.
   - Final result:
     - `1 failed | 229 passed | 5 skipped` files
     - `3 failed | 1086 passed | 22 skipped` tests
   - All failures were inside:
     - `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
   - Explicit captured failures:
     - `keeps default temp workspace isolated from the server worktree git root`
     - `streams Claude tool approval request and executes tool after explicit approve`
   - Captured failure signatures:
     - temp workspace isolation probe still reported the server worktree path instead of the temp workspace root,
     - manual approval flow only emitted `SEGMENT_CONTENT`, `SEGMENT_END`, and `AGENT_STATUS`, with assistant output `READYREADY` and no approval-request lifecycle.

4. Ownership classification is now concrete enough to leave `Unclear`.
   - Codex-only:
     - one deterministic live runtime/backend blocker remains.
   - Claude-only:
     - multiple deterministic live runtime/backend blockers remain.
   - This is sufficient evidence to classify the current state as **Stage-7 failure with Local Fix re-entry**, not a purely environmental or nondeterministic blocker.

### Ownership Decision
- Codex `generate_image` websocket metadata failure: **current local/runtime integration blocker until proven otherwise**.
- Claude temp-workspace isolation failure: **local code issue**.
- Claude manual approval lifecycle failure: **local code/runtime integration issue**.
- Separate suite parallelism failure: **test harness / shared SQLite setup issue**, not product runtime behavior.

### Stage Decision
- Stage 7 remains **Fail**.
- Re-entry classification: **Local Fix**.
- Workflow should continue in **Stage 6** with code edits unlocked only for bounded remediation of the identified Codex and Claude runtime failures.

## 2026-03-07 Investigation Addendum (isolated reruns of failing live cases)

### Trigger
- User asked to rerun the failing live tests separately to check whether they succeed outside the full backend sweep.

### Sources Consulted
- Isolated Codex case:
  - `RUN_CODEX_E2E=1 CODEX_APP_SERVER_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "streams codex generate_image tool_call metadata with non-empty arguments over websocket"`
- Isolated Claude manual-approval case:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "streams Claude tool approval request and executes tool after explicit approve"`
- Isolated Claude temp-workspace isolation case:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "keeps default temp workspace isolated from the server worktree git root"`

### Findings
1. The isolated Codex `generate_image` metadata test passed.
   - Result:
     - `1 passed | 11 skipped`
   - This weakens the claim that the current Codex `generate_image` failure is deterministic product behavior by itself.

2. The isolated Claude manual approval flow also passed.
   - Result:
     - `1 passed | 16 skipped`
   - This weakens the claim that the manual approval lifecycle is currently a deterministic standalone regression.

3. The isolated Claude default temp-workspace isolation test still fails.
   - Result:
     - `1 failed | 16 skipped`
   - Failure remains the same as in the full backend suite:
     - runtime output resolves to the server worktree path instead of the temp workspace root.
   - This confirms a real local defect remains in the default Claude temp-workspace isolation path.

4. Current classification after isolation:
   - Codex `generate_image` failure: currently behaves like suite-level or environment-sensitive instability.
   - Claude manual approval failure: currently behaves like suite-level or environment-sensitive instability.
   - Claude temp-workspace isolation failure: deterministic local defect.

### Ownership Decision
- Deterministic current local fix target:
  - Claude default temp-workspace isolation.
- Remaining non-isolated live failures:
  - keep under observation, but do not treat as proven deterministic regressions until they reproduce again in focused runs.

## 2026-03-07 Investigation Addendum (after Claude temp-workspace fix)

### Sources Consulted
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts`
- `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.test.ts`
- focused isolated rerun:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts -t "keeps default temp workspace isolated from the server worktree git root"`
- full Claude-only backend rerun:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`

### Findings
1. The temp-workspace isolation defect was real and is now fixed.
   - Guarded cwd scoping restored the expected temp-workspace behavior without reintroducing the deleted-workspace `ENOENT` crash.
   - The previously failing isolated Claude temp-workspace test now passes.

2. The full Claude-only backend suite remains red after that fix.
   - The visible failing file is now:
     - `tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
   - That file reported `5 tests | 3 failed` during the rerun.

3. The current live Claude blockers have shifted from single-run runtime isolation to the team-runtime slice.
   - Captured failing cases in the rerun:
     - `routes live inter-agent send_message_to ping->pong->ping roundtrip in Claude team runtime`
     - `preserves workspace mapping across create->send->terminate->continue for Claude team runs created with workspaceId`
     - `restores complete team-member projection history after two turns and terminate`

### Ownership Decision
- Claude temp-workspace isolation: **resolved local fix**.
- Remaining full Claude-only backend failures: **still local/runtime-integration issues in the live Claude team runtime slice until proven otherwise**.

## 2026-03-07 Investigation Addendum (Claude team/runtime rerun reclassification)

### Sources Consulted
- isolated Claude team-runtime reruns:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in Claude team runtime"`
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts -t "preserves workspace mapping across create->send->terminate->continue for Claude team runs created with workspaceId"`
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts -t "restores complete team-member projection history after two turns and terminate"`
- full Claude team-runtime rerun:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
- in-progress full Claude-only backend rerun:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=true pnpm -C autobyteus-server-ts exec vitest run`
- comparison inputs:
  - `git diff origin/personal -- autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts autobyteus-server-ts/src/run-history/services/run-continuation-service.ts autobyteus-server-ts/src/run-history/services/run-projection-service.ts autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`

### Findings
1. The three previously failing Claude team-runtime cases do not reproduce as deterministic regressions.
   - Each isolated rerun passed.
   - The full `claude-team-external-runtime.e2e.test.ts` file also passed cleanly (`5 passed`).
   - Therefore the earlier `3 failed` observation is not currently reproducible as a stable product regression.

2. The live Claude runtime GraphQL file also passed cleanly in the subsequent full Claude-only rerun segment.
   - `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` completed with `17 passed`.
   - During that run, stderr still included lines like:
     - `Claude runtime turn failed for run '...' : Error: Claude Code process exited with code 1`
   - Despite those warnings, the actual acceptance assertions for workspace continuation, tool execution after continue, projection growth, and websocket lifecycle all passed in the same file.

3. The current evidence does not support classifying the remaining Claude runtime concern as a deterministic refactor regression.
   - The runtime/team acceptance files are green in current reruns.
   - `git diff` versus `origin/personal` shows large refactor deltas in the implicated runtime/team/history layers, but the rerun evidence does not tie a stable behavior break to those code changes.
   - The stronger signal is warning-level live Claude runtime noise / process-exit churn that does not currently invalidate the mapped acceptance criteria.

4. Parallel full-suite DB locking remains a harness issue, not a runtime-decoupling defect.
   - Separate simultaneous Vitest processes still target the same SQLite test DB and reset it.
   - This explains the earlier cross-process `database is locked` behavior and should stay classified as local test-harness contention.

### Ownership Decision
- Reproducible Claude refactor regression in the previously suspected team-runtime cases: **not proven**.
- Current Claude runtime stderr/process-exit noise: **investigate only if it starts failing mapped acceptance tests again**.
- Parallel SQLite DB lock: **ignore as harness limitation for this ticket's product-decoupling judgment**.

## 2026-03-07 Claude live-runtime blocker after structural decomposition

### Evidence Collected

- After the structural Stage-8 local fix, the first broad Claude-only rerun failed inside:
  - `tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
- Focused rerun of:
  - `keeps default temp workspace isolated from the server worktree git root`
  - failed with explicit provider output:
    - `You've hit your limit · resets 10am (Europe/Berlin)`
- Focused rerun of:
  - `auto-approves Claude tool execution when autoExecuteTools is enabled`
  - failed by timing out waiting for the Claude-driven file write.
- The focused temp-workspace failure also emitted a cleanup warning:
  - `ENOENT ... rename ... run_history_index.json...tmp -> run_history_index.json`
  - but the assertion failure itself was caused by the provider-limit output, not the rename warning.

### Assessment

- Current evidence is sufficient to classify the immediate blocker as external Claude live-provider quota/availability rather than a clean deterministic architecture regression from the structural split.
- The auto-approve timeout remains suspicious, but without a clean provider window it is not reliable evidence of a source-code regression.
- The correct next action is to rerun the focused Claude live cases after the provider limit resets, not to continue speculative code edits.

## 2026-03-07 Investigation Addendum (live Codex team reasoning-streaming defect)

### Sources Consulted

- live server log:
  - `autobyteus-server-ts/logs/server.log`
- live GraphQL inspection against the running server:
  - `getTeamRunResumeConfig(teamRunId: "team_professor-student-team_92ee827f")`
- live team websocket capture against the running server:
  - `ws://127.0.0.1:8000/ws/agent-team/team_professor-student-team_92ee827f`
- runtime/team streaming code:
  - `autobyteus-server-ts/src/services/agent-streaming/team-runtime-event-bridge.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-segment-helper.ts`
  - `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`

### Findings

1. The user-reported symptom is real.
   - On the live team run `team_professor-student-team_92ee827f`, the student member (`student_c24047d859a52b2f`) was reproduced through the backend team websocket while being triggered by Professor via `send_message_to`.
   - The student member's non-empty reasoning stream contained exactly one chunk:
     - observed at approximately `12.1s`
     - length `424`
     - sample started with:
       - `**Considering interagent task**`
   - The student member's text stream remained incremental in the same run:
     - `179` non-empty text chunks
     - first text chunks began at approximately `12.1s`
     - continued incrementally until roughly `24.3s`

2. The burst happens before frontend rendering.
   - The raw backend team websocket already shows only one non-empty student reasoning chunk.
   - Therefore this is not just a frontend batching/render-only issue.
   - The frontend `handleSegmentContent(...)` path also ignores empty deltas, so the many no-op `SEGMENT_CONTENT` events are not what creates the visible burst.

3. The current failure shape is specific to reasoning, not general member streaming.
   - Student text streamed incrementally.
   - Student `AGENT_STATUS` transitioned normally (`RUNNING` -> `IDLE`).
   - Inter-agent routing itself also succeeded:
     - `send_message_to` interception and relay are present in the live server log.

4. Current strongest root-cause candidates
   - `Most likely`: the Codex app server/runtime is only surfacing a final reasoning snapshot for this member-runtime path, so the mapper never receives incremental reasoning parts to forward.
   - `Possible`: the runtime does emit incremental reasoning, but under an alias not currently normalized by `normalizeMethodRuntimeMethod(...)` / `MethodRuntimeEventAdapter`.
   - `Less likely`: frontend-only buffering, because the raw backend team websocket already shows the one-chunk reasoning shape.

### Ownership Decision

- Proven:
  - there is a real live Codex team-runtime reasoning-streaming defect from the user perspective.
  - the defect is upstream of frontend rendering.
- Not yet proven:
  - whether the missing incrementality is our mapper/normalizer bug or Codex runtime/provider behavior.

### Next Investigation Action

- Start an isolated debug backend with raw method-runtime event logging enabled and reproduce the same Professor -> Student path.
- Inspect the raw Codex method names and payloads for the student run to determine whether incremental reasoning notifications exist and are being dropped or whether only a final reasoning snapshot is emitted.

## 2026-03-07 Investigation Addendum (direct Codex app-server raw method proof)

### Sources Consulted

- direct Codex app-server probe via local runtime client:
  - `autobyteus-server-ts/dist/runtime-execution/codex-app-server/codex-app-server-client.js`
  - `autobyteus-server-ts/dist/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.js`
- method normalization/runtime mapping source:
  - `autobyteus-server-ts/src/runtime-execution/runtime-method-normalizer.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/method-runtime-event-adapter.ts`

### Findings

1. Codex itself does emit incremental reasoning events.
   - The direct app-server probe produced repeated raw notifications with method:
     - `item/reasoning/summaryTextDelta`
   - These were emitted incrementally with many small non-empty deltas over time.
   - The same probe also emitted:
     - `item/reasoning/summaryPartAdded`
     - `item/completed` for the reasoning item

2. The current backend alias map does not cover the incremental method actually emitted by Codex.
   - `runtime-method-normalizer.ts` currently normalizes:
     - `item.reasoning.outputDelta`
     - `item/reasoning/outputDelta`
   - It does not normalize:
     - `item.reasoning.summaryTextDelta`
     - `item/reasoning/summaryTextDelta`

3. This is the concrete root cause of the bursty reasoning summary.
   - Because `summaryTextDelta` is unmapped, `MethodRuntimeEventAdapter` does not route those incremental deltas through the `item/reasoning/delta` path.
   - The backend therefore falls back to the later completed/snapshot reasoning event, which is why the live team websocket only showed one non-empty reasoning chunk for the student member.

### Ownership Decision

- Root cause classification: **our code issue**
- Scope classification: **bounded Local Fix**
- Required fix shape:
  - extend method normalization to map `summaryTextDelta` aliases into `item/reasoning/delta`
  - add focused regression coverage at the runtime-event-message-mapper layer

## 2026-03-07 - Root-cause fix applied

- Implemented the bounded local fix in `runtime-method-normalizer.ts`: Codex `summaryTextDelta` aliases now normalize to `item/reasoning/delta`.
- Focused mapper coverage now protects this seam and proves reasoning chunks are emitted as incremental `SEGMENT_CONTENT` instead of relying on the later completed snapshot.
- Compile, focused unit verification, and backend build all passed. Live confirmation still requires a backend restart because the currently running `node dist/app.js` process was started before the rebuilt `dist` output was generated.

## 2026-03-07 - Live API/E2E confirmation for reasoning streaming fix

- The unit-level alias fix is now confirmed in the live Codex team runtime path, not just in isolated mapper tests.
- A new professor -> student team websocket regression test proves that after `send_message_to`, the student emits multiple non-empty reasoning `SEGMENT_CONTENT` deltas before completing the text answer.
- The full Codex team runtime E2E file passed with the new regression in place (`3 passed`).

## 2026-03-07 Investigation Addendum (Claude blank history after restart)

### User-Reported Symptom

- After closing and reopening the desktop app, previously completed team-member runs still reload correctly for:
  - `autobyteus`
  - `codex_app_server`
- Equivalent Claude team-member runs come back blank in the UI after restart.
- The report specifically called out earlier session-id handling work and asked for a comparison against `origin/personal`.

### Evidence Gathered

1. Current persisted Claude team manifests in installed app data show inconsistent member runtime references.
   - Source:
     - `~/.autobyteus/server-data/memory/agent_teams/team_class-room-simulation_6c7069df/team_run_manifest.json`
     - `~/.autobyteus/server-data/memory/agent_teams/team_class-room-simulation_6c7069df/professor_93616d657c7cb106/run_manifest.json`
     - `~/.autobyteus/server-data/memory/agent_teams/team_class-room-simulation_6c7069df/student_5cb89946f442f93e/run_manifest.json`
   - Observed:
     - `student.runtimeReference.sessionId = f06a5cbe-cd42-4e25-9706-cd7665cc7b8e` (resolved Claude session id)
     - `professor.runtimeReference.sessionId = professor_93616d657c7cb106` (placeholder member run id)

2. The placeholder session id is sufficient to blank projection after restart.
   - `TeamMemberRunProjectionService` uses the persisted member binding runtime reference when it asks the runtime projection provider for Claude history.
   - After a full process restart, the in-memory transcript store is empty, so the provider must query Claude using the persisted session id.
   - If the persisted session id is still the placeholder member run id, the provider cannot retrieve the completed Claude conversation and the projection returns empty/blank.

3. `origin/personal` had an active-binding refresh step that the refactor removed.
   - `origin/personal` `team-run-history-service.ts` merged manifests using:
     - `teamMemberRuntimeOrchestrator.getActiveMemberBindings(...)`
   - `origin/personal` `team-member-runtime-orchestrator.ts` implemented `getActiveMemberBindings(...)` via `TeamMemberRuntimeBindingStateService`.
   - `origin/personal` `TeamMemberRuntimeBindingStateService.refreshTeamBindingsFromRuntimeState(...)` explicitly pulled the latest Claude runtime reference from live runtime state:
     - `claudeRuntimeService.getRunRuntimeReference(binding.memberRunId)`

4. The refactor replaced that refresh path with a raw registry read.
   - Current `team-run-history-service.ts` merges manifests using:
     - `teamMemberRuntimeOrchestrator.getTeamBindings(...)`
   - Current `team-member-runtime-orchestrator.ts` no longer exposes `getActiveMemberBindings(...)`.
   - Current `team-member-runtime-session-lifecycle-service.ts.refreshBindingRuntimeReference(...)` only updates a binding when a direct command result already carries a new runtime reference.

5. That is not enough for the coordinator/member receiving the original user turn.
   - `ClaudeAgentSdkRuntimeAdapter.sendTurn(...)` returns `runtimeService.getRunRuntimeReference(runId)` immediately after scheduling the turn.
   - At that moment the resolved Claude session id may not have been observed yet, so the returned runtime reference can still contain the placeholder member run id.
   - Without the old active-binding refresh from live runtime state, the later resolved Claude session id is never persisted back into the team manifest for that member.

### Root-Cause Classification

- Classification: `Local Fix`
- Ownership: `our refactor regression`
- Confidence: high

### Root Cause

- The refactor removed the live Claude binding refresh path that used to canonicalize persisted team-member runtime references before team-manifest writes.
- As a result, Claude coordinator/member runs can persist placeholder member-run ids instead of resolved Claude session ids.
- After app restart, history reload for those members asks Claude for messages under the wrong session id and the UI shows a blank conversation.

### Planned Fix Shape

- Reintroduce a canonical, decoupled active-binding refresh path before team-manifest persistence.
- Preserve the runtime-decoupled architecture by resolving refreshed runtime references through runtime adapters / runtime services rather than reintroducing shared-layer Claude-specific legacy behavior.
- Add regression coverage for:
  - persisted Claude member runtime reference canonicalization
  - history/projection reload after restart-equivalent restore path
