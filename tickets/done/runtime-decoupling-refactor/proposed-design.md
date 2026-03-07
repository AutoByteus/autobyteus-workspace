# Proposed Design Document

## Design Version

- Current Version: `v12`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Introduce runtime-neutral event/liveness boundaries and refactor shared layers to consume registry-resolved runtime capabilities. | 1 |
| v2 | Stage 6 implementation feedback | Added runtime-adapter-registry based team runtime event bridge decoupling change (`C-007`). | Post-review implementation refinement |
| v3 | Stage 6 re-entry (`Design Impact`) | Adds remaining decoupling design for runtime-event mapper registry, generic inter-agent relay binding, generic team bridge naming, and frontend runtime-kind de-hardcoding (`C-008` to `C-012`). | Re-entry redesign |
| v4 | Stage 7 re-entry (`Design Impact`) | Final decoupling sweep: remove implicit Codex fallback behavior from shared runtime-event mapper and make frontend runtime modeling fully capability-driven (`C-013` to `C-014`). | Re-entry redesign (stage-7) |
| v5 | Stage 8 follow-up re-entry (`Design Impact`) | Complete decoupling sweep: remove Codex construction/import from shared runtime-event mapper and projection service, and make shared raw-runtime debug controls runtime-neutral (`C-015` to `C-017`). | Re-entry redesign (stage-8 follow-up) |
| v6 | Stage 10 re-entry (`Design Impact`) | Composition-root decoupling sweep: externalize runtime defaults from shared registries/services and introduce runtime-provider-driven capability/runtime-kind core seams (`C-018` to `C-022`). | Re-entry redesign (stage-10) |
| v7 | Stage 10 continuation (`Design Impact`) | Centralize runtime default registration behind runtime-client modules and remove remaining runtime-specific shared export leakage (`C-023` to `C-025`). | Re-entry redesign (stage-10 continuation) |
| v8 | Stage 10 continuation (`Design Impact`) | Make runtime-client module loading discovery-driven with Autobyteus always-on core registration and optional runtime allow-list/discovery behavior (`C-026` to `C-028`). | Re-entry redesign (stage-10 continuation 2) |
| v9 | Stage 10 continuation (`Design Impact`) | Close residual decoupling gaps by introducing descriptor-discovery runtime module composition, adapter-capability-driven team mode policy, and runtime-neutral shared barrel surfaces (`C-029` to `C-031`). | Re-entry redesign (stage-10 continuation 3) |
| v10 | Stage 10 continuation (`Design Impact`) | Remove the final compile-time descriptor seam by making runtime-client descriptor loading module-spec discovery driven in shared index composition (`C-033`, `C-034`). | Re-entry redesign (stage-10 continuation 4) |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/runtime-decoupling-refactor/investigation-notes.md`
- Requirements: `tickets/in-progress/runtime-decoupling-refactor/requirements.md`
- Requirements Status: `Refined`

## Summary

Refactor remaining shared runtime seams so runtime command flow, runtime-event mapping, team member-runtime relays, and runtime-kind modeling are all registry/capability driven. Keep Codex-specific protocol logic fully inside Codex runtime plugin modules so removing Codex does not require touching shared orchestration layers or frontend runtime models.

## Goals

- Remove direct Codex runtime service dependency from shared stream and run-history services.
- Remove residual Codex-coupled relay wiring from team member-runtime orchestration.
- Remove Codex-branded generic bridge naming in shared paths.
- Eliminate frontend runtime-kind coercion to hardcoded two-runtime union in manifest/runtime capability flows.
- Remove residual Codex-specific construction/import from shared runtime-event mapper and projection service.
- Normalize shared runtime raw-event debug controls/logging to runtime-agnostic naming.
- Remove runtime-specific default construction/import from shared adapter/model/projection registries.
- Move runtime capability probing/env policy to runtime-provider modules and keep shared capability service runtime-neutral.
- Remove static two-runtime tuple coupling from shared runtime-kind core.
- Centralize runtime defaults composition behind runtime-client registration modules.
- Keep shared runtime execution export surface runtime-neutral (no runtime-specific re-exports).
- Keep Autobyteus runtime module always enabled while making optional runtime module loading discovery-driven.
- Make team runtime mode policy capability-driven (`native_team` vs `member_runtime`) and runtime-name neutral.
- Ensure runtime-client composition defaults do not directly import optional runtime modules.
- Ensure shared runtime barrels expose runtime-neutral contracts/composition APIs only.
- Keep Autobyteus runtime code path behavior stable.
- Preserve current frontend message contract.
- Enable incremental runtime removal with adapter deregistration and capability toggle.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove direct Codex imports in shared services within this ticket scope.
- Gate rule: design is invalid if shared services still require Codex-specific service wiring.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Shared orchestration depends on runtime-neutral interfaces | AC-001, AC-002 | No direct Codex runtime dependency in shared stream orchestration; runtime contract owns event hooks | UC-001, UC-002 |
| R-002 | Runtime event adaptation is pluggable by runtime kind | AC-001, AC-002 | Runtime event stream and normalization handled by runtime adapter capabilities | UC-002 |
| R-003 | Team flow should avoid hard Codex branching in shared path | AC-003 | Team runtime event bridging resolved by runtime kind registry | UC-003 |
| R-004 | Run-history shared service no longer depends on Codex internals | AC-004 | Liveness and runtime-event normalization resolved via runtime adapter capabilities | UC-004 |
| R-005 | Autobyteus runtime remains stable | AC-005 | Existing create/send/stream behavior unchanged under Autobyteus runtime | UC-005 |
| R-006 | Shared runtime event/projection layers must not hardwire Codex implementations | AC-006, AC-007, AC-008 | Shared mapper/debug/projection service rely on runtime-neutral seams | UC-006, UC-007, UC-008 |
| R-007 | Shared runtime composition services must be runtime-registration driven | AC-009, AC-010, AC-011, AC-012, AC-013 | Runtime defaults/probes/kinds are externalized from shared classes | UC-009, UC-010, UC-011, UC-012 |
| R-008 | Runtime registration and shared exports must preserve single-point removability | AC-014, AC-015 | Runtime-client composition centralizes defaults and shared runtime index remains runtime-neutral | UC-013, UC-015 |
| R-009 | Runtime module composition supports deployment-driven optional runtime discovery while preserving always-on core runtime | AC-016, AC-017 | Runtime-client module resolution always includes Autobyteus and discovers/selects optional runtimes | UC-014 |
| R-010 | Team runtime orchestration mode policy is adapter-capability-driven | AC-003, AC-018 | Shared team-mode resolution/guards avoid runtime-name branching and use adapter-declared execution mode | UC-003, UC-016 |
| R-011 | Shared runtime-client composition defaults avoid direct optional-runtime imports | AC-016, AC-017, AC-019, AC-020 | Runtime module descriptors are discovered from runtime module exports and shared barrels stay runtime-neutral | UC-014, UC-017 |
| R-012 | Runtime-client descriptor composition is module-spec discovery driven | AC-021, AC-022 | Runtime-client index loads descriptor modules from discovery configuration instead of compile-time optional-runtime descriptor imports | UC-014, UC-018 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Runtime command path already adapterized; event path is not. | `runtime-command-ingress-service.ts`, `runtime-adapter-port.ts`, `agent-stream-handler.ts` | Team orchestration has partial separate architecture by runtime mode. |
| Current Naming Conventions | Runtime layer uses `Runtime*Service/Adapter/Registry`; stream layer uses `*StreamHandler` and `*Bridge`. Some shared classes still include `Codex` in name even when behavior is runtime-generic. | `src/runtime-execution/*`, `src/services/agent-streaming/*` | Need neutral naming for generic seams. |
| Impacted Modules / Responsibilities | Shared stream mapper, team orchestrator relay binding, and frontend runtime manifest parsing still contain Codex leakage. | `runtime-event-message-mapper.ts`, `team-member-runtime-orchestrator.ts`, `runHistoryManifest.ts` | Frontend runtime-kind model needs non-breaking widening strategy. |
| Data / Persistence / External IO | Run-history updates manifest/index and parses runtime events. | `run-history-service.ts`, `run-manifest-store.ts` | Codex thread-id extraction is runtime-specific and should be moved behind runtime capability. |

## Current State (As-Is)

- Runtime command/liveness contracts are adapterized and mostly decoupled.
- `RuntimeEventMessageMapper` still hardwires `CodexRuntimeEventAdapter` by payload shape.
- `TeamMemberRuntimeOrchestrator` still binds Codex runtime relay handler directly.
- Generic team member-runtime event bridge still uses Codex-branded type/name.
- Frontend runtime-kind model and team manifest parser are hardcoded to `autobyteus | codex_app_server`.
- Shared runtime-event mapper still performs implicit Codex inference when runtime kind is omitted.
- Runtime options in frontend config forms are still hardcoded to two runtime values instead of capability-derived runtime rows.
- Shared runtime-event mapper still directly constructs Codex mapper implementation in generic layer.
- Shared team-member projection service still imports Codex fallback provider directly.
- Shared runtime raw-event debug path still uses Codex-branded env keys/log labels.
- Shared runtime adapter registry still imports/constructs Codex defaults in shared class.
- Shared runtime model catalog service still imports/constructs Codex provider defaults in shared class.
- Shared run-projection provider registry getter still imports/constructs Codex provider defaults in shared registry file.
- Shared runtime capability service still carries Codex probe/env/cache logic in shared class.
- Shared runtime-kind core still defines a fixed two-runtime tuple (`autobyteus`, `codex_app_server`).
- Runtime default registration is still fragmented across multiple `*-defaults.ts` files, requiring multi-file edits to add/remove one runtime.
- `runtime-execution/index.ts` still re-exports Codex runtime internals from a shared runtime module surface.

## Target State (To-Be)

- Runtime command/liveness stays on `RuntimeAdapter`.
- Runtime-event-to-server-message mapping moves to a `RuntimeEventMapperRegistry` keyed by `runtimeKind`.
- Shared stream and run-history services resolve runtime behavior via registry/capability contracts only (no runtime-shape inference).
- Codex runtime specifics remain in Codex adapter implementation.
- Team inter-agent relay handler binding is exposed via runtime-agnostic relay capability contract.
- Codex-branded generic bridge classes are renamed to runtime-neutral names.
- Frontend runtime-kind parsing preserves any backend-declared runtime kind string (with capability-gated UI options), rather than coercing unknown kinds to default.
- Shared runtime event mapping requires explicit runtime kind and never infers Codex by payload shape.
- Frontend runtime options are rendered from runtime capability payloads (plus selected runtime safety retention) rather than fixed runtime literals.
- Shared runtime-event mapper receives runtime-specific mapping delegates through runtime registration, not Codex imports.
- Shared projection service resolves runtime fallback providers from provider registry wiring only.
- Shared stream debug controls/log channels are runtime-neutral (`RUNTIME_*`) and runtime-kind aware.
- Shared adapter/model/projection registries are runtime-neutral classes with runtime-specific defaults registered in dedicated default modules.
- Shared runtime capability service resolves capability through runtime capability providers and contains no runtime-specific probe/env logic.
- Shared runtime-kind core models runtime IDs as normalized non-empty strings (default remains `autobyteus`) rather than static runtime tuples.
- Shared defaults modules delegate to centralized runtime-client registration modules so runtime add/remove is localized.
- Shared `runtime-execution/index.ts` exports only runtime-neutral contracts/services.
- Runtime-client module resolution is descriptor/discovery driven: required core runtime(s) always included, optional runtime(s) availability/allow-list controlled.
- Autobyteus adapter continues native stream path unchanged for existing non-runtime-event flow.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: design and review enforce the same runtime-neutral contract boundary rule.
- SoC cause statement: shared orchestration owns routing policy; runtime plugins own runtime-specific protocol/event semantics.
- Layering result statement: runtime-execution exposes capabilities upward, streaming/run-history consume capabilities without runtime-specific imports.
- Decoupling rule statement: one-way dependency `shared services -> runtime adapter registry -> runtime adapters`.

## Architecture Direction Decision (Mandatory)

- Chosen direction: keep adapterized command/liveness path and add two explicit registries/capability seams:
  - `RuntimeEventMapperRegistry` for runtime raw-event -> server-message mapping,
  - runtime-agnostic inter-agent relay binding capability for member-runtime tools.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): moderate complexity increase but higher correctness and removability; new runtimes require plugin registration, not shared-layer edits.
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `Yes`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add` + `Move` + `Remove`

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers (provider selection/fallback/retry/aggregation/routing/fan-out) exists | Yes | Stream + run-history both branch by runtime kind and special-case Codex | Extract to runtime adapter capability boundary |
| Responsibility overload exists in one file/module (multiple concerns mixed) | Yes | `agent-stream-handler.ts` handles websocket/session plus Codex protocol wiring | Split runtime protocol concerns into adapter |
| Proposed new layer owns concrete coordination policy (not pass-through only) | Yes | Adapter capability resolves liveness + event subscription + event normalization policy | Keep layer |
| Current layering can remain unchanged without SoC/decoupling degradation | No | Existing direct imports leak runtime-specific concerns upward | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Keep shape-based event routing in shared mapper with incremental patches | Low immediate edit cost | Still coupled, fragile with new runtimes, Codex leakage persists | Rejected | Fails removability goal |
| B | Add runtime-event mapper registry + runtime-agnostic relay capability (selected) | Clean runtime boundaries; safer multi-runtime growth; easy runtime removal | Requires migration of shared mapper/team relay wiring | Chosen | Best alignment with ticket objective |
| C | Keep multiple per-service defaults modules and document a runtime-removal checklist | Minimal code churn | Runtime removal remains multi-file and error-prone | Rejected | Fails localized runtime removability acceptance criteria |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `src/runtime-execution/runtime-adapter-port.ts` | same | Add runtime-event + liveness capability methods | Runtime execution + stream + run-history | Optional methods for runtimes without direct runtime-event channel |
| C-002 | Modify | `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | same | Implement runtime-event subscription + liveness + runtime event interpretation | Codex runtime plugin | Keeps Codex specifics isolated |
| C-003 | Modify | `src/runtime-execution/adapters/autobyteus-runtime-adapter.ts` | same | Implement liveness check for Autobyteus runs | Autobyteus runtime plugin | No event-subscribe path required for existing stream model |
| C-004 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Remove direct Codex service dependency; use adapter capabilities | Agent websocket streaming | Preserve existing frontend event mapping contract |
| C-005 | Modify | `src/runtime-execution/runtime-command-ingress-service.ts` | same | Replace Codex-only active-run check with adapter liveness check | Runtime ingress | General runtime behavior |
| C-006 | Modify | `src/run-history/services/run-history-service.ts` | same | Remove direct Codex imports; runtime event interpretation via adapter capability | Run history | Thread-id extraction via capability result |
| C-007 | Modify | `src/services/agent-streaming/team-codex-runtime-event-bridge.ts` | same | Replace direct Codex runtime service dependency with runtime adapter registry resolution | Team runtime event bridge | Keeps team event bridge runtime-pluggable at subscription boundary |
| C-008 | Add | `src/services/agent-streaming/runtime-event-message-mapper.ts` | same + new registry class | Introduce runtime-kind keyed mapper registry; remove shape-based Codex dispatch from shared mapper | Shared streaming + runtime plugins | Mapper registration by runtime kind |
| C-009 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Resolve runtime event mapping by runtime session kind; remove Codex-specific alias helper exposure from shared mapper | Agent websocket streaming | Uses mapper registry + session runtime kind |
| C-010 | Modify/Rename | `src/runtime-execution/codex-app-server/team-codex-inter-agent-message-relay.ts`, `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | runtime-neutral relay gateway naming + runtime capability binding | Remove Codex-specific relay wiring from generic orchestrator contract and naming | Team member-runtime orchestration | Preserve behavior; neutralize shared surface |
| C-011 | Rename/Move | `src/services/agent-streaming/team-codex-runtime-event-bridge.ts` | `team-member-runtime-event-bridge.ts` (runtime-neutral naming) | Remove Codex-branded naming from generic team member-runtime bridge | Shared team streaming | No protocol change |
| C-012 | Modify | `autobyteus-web/types/agent/AgentRunConfig.ts`, `autobyteus-web/stores/runHistoryManifest.ts`, config forms | Runtime-kind parsing/model widening | Preserve backend-declared runtime kinds; avoid coercing unknown kinds to default while still capability-gating selectable options | Frontend runtime modeling | No websocket contract change |
| C-013 | Modify | `src/services/agent-streaming/runtime-event-message-mapper.ts` | same | Remove implicit Codex inference/fallback; enforce explicit runtime-kind mapping path | Shared streaming | Prevents runtime-specific behavior from leaking into generic contract |
| C-014 | Modify | `autobyteus-web/types/agent/AgentRunConfig.ts`, `autobyteus-web/stores/runtimeCapabilitiesStore.ts`, config forms, `runHistoryTypes.ts` | Capability-driven runtime IDs in frontend | Replace fixed runtime union/options with runtime capability-driven modeling and option rendering | Frontend runtime modeling | Keeps default runtime fallback only for null/empty values |
| C-015 | Modify | `src/services/agent-streaming/runtime-event-message-mapper.ts`, `src/services/agent-streaming/codex-runtime-event-adapter.ts` | runtime-mapper registration | Remove Codex import/construction from shared mapper by introducing registry-driven runtime mapper registration seam | Shared streaming + runtime plugins | Shared mapper becomes runtime-agnostic |
| C-016 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | runtime debug path normalization | Replace Codex-branded raw-event debug env/log names with runtime-neutral controls | Shared streaming | No message contract change |
| C-017 | Modify | `src/run-history/services/team-member-run-projection-service.ts`, `src/run-history/projection/run-projection-provider-registry.ts` | projection provider lookup wiring | Remove direct Codex fallback provider import/default from shared projection service | Run-history projection | Provider registry owns runtime-specific fallback wiring |
| C-018 | Modify | `src/runtime-execution/runtime-adapter-registry.ts` | runtime adapter defaults composition | Remove runtime-specific default adapter construction/import from shared registry class; register defaults externally | Runtime execution composition root | Shared registry class becomes runtime-neutral |
| C-019 | Modify | `src/runtime-management/model-catalog/runtime-model-catalog-service.ts` | model provider defaults composition | Remove runtime-specific default provider construction/import from shared model catalog service; register defaults externally | Runtime management composition root | Shared model catalog class becomes runtime-neutral |
| C-020 | Modify | `src/run-history/projection/run-projection-provider-registry.ts` | projection defaults composition | Remove runtime-specific default provider construction/import from shared projection registry and move to defaults module | Run-history projection composition root | Shared projection registry becomes runtime-neutral |
| C-021 | Modify | `src/runtime-management/runtime-capability-service.ts` | runtime capability provider seam | Replace Codex-hardcoded env/probe/cache logic with runtime capability provider interface and provider registration | Runtime capability management | Shared capability service becomes runtime-neutral |
| C-022 | Modify | `src/runtime-management/runtime-kind.ts` | runtime-kind core type | Remove static runtime tuple coupling and normalize runtime kind as non-empty runtime-id string | Shared runtime core typing | Runtime add/remove no longer requires tuple edits |
| C-023 | Add | `src/runtime-management/runtime-client/*` | runtime-client composition module contracts | Introduce centralized runtime-client registration interface spanning adapter/model/capability/projection/event-mapper defaults | Runtime composition root | One registration seam per runtime |
| C-024 | Modify | `src/runtime-execution/runtime-adapter-registry-defaults.ts`, `src/runtime-management/model-catalog/runtime-model-catalog-defaults.ts`, `src/runtime-management/runtime-capability-service-defaults.ts`, `src/run-history/projection/run-projection-provider-registry-defaults.ts`, `src/services/agent-streaming/runtime-event-message-mapper-defaults.ts` | defaults registration plumbing | Delegate per-service defaults through runtime-client module list instead of hardcoding each runtime in each defaults file | Shared defaults composition | Runtime add/remove becomes localized |
| C-025 | Modify | `src/runtime-execution/index.ts` | shared runtime execution exports | Remove runtime-specific Codex re-exports from shared runtime execution index | Runtime execution public surface | Runtime-specific imports remain explicit |
| C-026 | Modify | `src/runtime-management/runtime-client/runtime-client-modules-defaults.ts` | runtime module resolution | Replace static module list with descriptor-driven runtime-module resolver (required + optional) and preserve always-on Autobyteus registration | Runtime composition root | Optional runtime discovery centralized |
| C-027 | Modify | `src/runtime-management/runtime-client/codex-runtime-client-module.ts`, `src/runtime-management/runtime-client/runtime-client-modules-defaults.ts` | optional runtime discovery policy | Reuse Codex availability policy for optional module discovery and add deployment allow-list override env | Runtime composition root | Supports container/runtime-specific enablement policy |
| C-028 | Add | `tests/unit/runtime-management/runtime-client/runtime-client-modules-defaults.test.ts` | runtime discovery regression guard | Add focused tests for always-on core runtime, optional runtime discovery exclusion, and allow-list behavior | Backend test suite | Prevents regressions in module composition |
| C-029 | Modify | `src/runtime-management/runtime-client/runtime-client-module.ts`, `src/runtime-management/runtime-client/autobyteus-runtime-client-module.ts`, `src/runtime-management/runtime-client/codex-runtime-client-module.ts`, `src/runtime-management/runtime-client/runtime-client-modules-defaults.ts` | runtime module descriptor discovery | Move module composition to descriptor discovery exported by runtime modules and remove direct optional-runtime imports from defaults | Runtime composition root | Optional runtime add/remove localized to runtime module files |
| C-030 | Modify | `src/runtime-execution/runtime-adapter-port.ts`, `src/runtime-execution/adapters/*`, `src/api/graphql/services/team-run-mutation-service.ts`, `src/agent-team-execution/services/team-member-runtime-orchestrator.ts`, `src/agent-team-execution/services/team-runtime-binding-registry.ts`, `src/services/agent-streaming/agent-team-stream-handler.ts` | team runtime mode policy | Replace runtime-name-driven team mode resolution with adapter capability (`native_team` vs `member_runtime`) | Team orchestration + streaming | Removes runtime-id branching from shared orchestration policy |
| C-031 | Modify | `src/runtime-execution/index.ts`, `src/runtime-management/model-catalog/index.ts`, `src/runtime-management/runtime-client/index.ts` | shared export surfaces | Restrict generic barrels to runtime-neutral contracts/composition APIs and keep runtime-specific exports in runtime-specific modules | Public module boundaries | Prevents runtime-specific leakage via shared imports |
| C-033 | Modify | `src/runtime-management/runtime-client/index.ts` | runtime descriptor module discovery | Replace compile-time optional-runtime descriptor imports with module-spec discovery loading (`AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES`) and safe invalid-module tolerance | Runtime composition root | Removes final shared compile-time optional runtime coupling seam |
| C-034 | Add | `tests/unit/runtime-management/runtime-client/runtime-client-index.test.ts` | discovery regression guard | Add focused tests for descriptor module discovery defaults/env override/invalid-module tolerance | Backend test suite | Guards runtime removability behavior at composition index boundary |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Runtime Adapter (`runtime-execution`) | Runtime-specific command/liveness semantics + optional relay hook | Runtime protocol integration and mapping to shared contracts | Websocket session lifecycle | Plugin boundary |
| Runtime Event Mapper Registry | Runtime-kind keyed mapping of raw runtime events into shared server messages | Runtime-specific event mapper lookup and invocation | Websocket/session/run-history orchestration policy | New explicit seam |
| Shared Stream Handler (`agent-streaming`) | Session management and message fanout | websocket lifecycle and event forwarding | Runtime-specific subscription logic | Uses adapter registry only |
| Run History (`run-history`) | Persist run status/index/manifest updates | storage updates and status transitions | Runtime-specific protocol parsing | Consumes adapter interpretation capability |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep Codex import fallback in shared services | Reduce initial risk | Rejected | Move all runtime-specific handling behind adapter capability methods |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime-adapter-port.ts` | Modify | runtime-execution contract | Runtime capability contract | `RuntimeAdapter` | runtime events/liveness results | none |
| `codex-app-server-runtime-adapter.ts` | Modify | runtime plugin | Codex event/liveness implementation | adapter methods | codex raw event -> shared runtime event result | Codex runtime service |
| `autobyteus-runtime-adapter.ts` | Modify | runtime plugin | Autobyteus liveness implementation | adapter methods | runId -> active state | managers |
| `runtime-event-message-mapper.ts` | Modify | shared streaming contract | runtime-kind keyed mapper dispatch (no shape inference) | mapper registry APIs | `(runtimeKind, rawEvent) -> ServerMessage` | runtime mapper plugins |
| `agent-stream-handler.ts` | Modify | shared streaming | Runtime-neutral event subscription orchestration | class methods | runtime events -> server messages | adapter registry + mapper |
| `team-member-runtime-orchestrator.ts` | Modify | team orchestration | runtime-agnostic relay binding usage | class methods | inter-agent relay routing | relay gateway capability |
| `runtime-command-ingress-service.ts` | Modify | shared ingress | Runtime-neutral active session validation | class methods | runId -> ingress routing decisions | adapter registry |
| `run-history-service.ts` | Modify | shared history | Runtime-neutral runtime-event interpretation | class methods | runtime event -> status/thread updates | adapter registry |
| `autobyteus-web/stores/runHistoryManifest.ts` | Modify | frontend state normalization | runtime kind preservation from backend payload | parser helpers | manifest payload -> typed state | runtime kind model |
| `runtime-event-message-mapper.ts` | Modify | shared streaming contract | explicit runtime-kind dispatch only (no implicit runtime inference) | mapper APIs | `(runtimeKind, rawEvent) -> ServerMessage` | runtime mapper plugins |
| `agent-stream-handler.ts` | Modify | shared streaming | runtime-neutral raw-event debug controls and logging | class methods | runtime event metadata + log output | runtime mapper + runtime kind |
| `team-member-run-projection-service.ts` | Modify | run-history projection | runtime fallback resolution through registry/provider seam only | class methods | team member projection resolution | projection provider registry |
| `autobyteus-web/components/workspace/config/*RunConfigForm.vue` | Modify | frontend config UI | capability-driven runtime option rendering | component props/events | runtime capabilities + config -> runtime selector UI | runtime capability store |
| `runtime-management/runtime-client/runtime-client-module.ts` | Add | runtime composition root | central runtime registration contract | `RuntimeClientModule` | registration callbacks for shared defaults | runtime-client modules |
| `runtime-management/runtime-client/runtime-client-modules-defaults.ts` | Add | runtime composition root | default runtime-client module composition | registration helpers | default module list -> shared defaults targets | runtime-client modules |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: N/A for this ticket.
- Non-UI scope: responsibilities split by contract (shared orchestration) vs runtime plugin (runtime semantics).
- Integration/infrastructure scope: adapter modules own runtime integration concern.
- Layering note: layering emerges from runtime policy extraction into adapters.
- Decoupling check: dependency direction remains one-way from shared layers to adapter interfaces.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| API | `RuntimeAdapter` | `RuntimeAdapter` (extended) | Avoid unnecessary type proliferation; preserves current registry API | Add optional capability methods |
| API | N/A | `interpretRuntimeEvent` | Explicitly states shared meaning extraction from runtime payload | Returns normalized status/thread hints |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `RuntimeAdapter` | runtime command bridge | Yes | N/A (extend scope to runtime capabilities) | C-001 |
| `AgentStreamHandler` | stream orchestration + codex-specific subscription | No | Move runtime-specific wiring into adapter | C-004 |
| `RunHistoryService` | history persistence + codex parser | No | Move runtime parsing to adapter capability | C-006 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Codex-specific flow in shared stream/history | High | Capability methods in runtime adapters | Change | Shared layers should remain runtime-neutral |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Keep runtimeKind if/else with additional branches | High | Registry + adapter capability dispatch | Reject shortcut | Prevent future runtime lock-in |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `agent-stream-handler.ts` | runtime registry + mapper | websocket handlers | Medium | Keep runtime event details in adapter methods |
| `run-history-service.ts` | runtime registry | history API/GraphQL | Medium | Adapter interpretation response object, no runtime imports |
| `runtime-command-ingress-service.ts` | runtime registry | runtime command callers | Low | Use adapter `isRunActive` optional method |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `shared services -> runtime adapter registry -> runtime adapters -> runtime-specific services`
- Temporary boundary violations and cleanup deadline: none; direct Codex imports in shared services removed in this ticket.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Direct Codex imports from `agent-stream-handler.ts` | remove imports and constructor deps | no dual-path fallback kept | compile + tests |
| Direct Codex imports from `run-history-service.ts` | remove imports and use adapter capability | no codex normalizer in shared layer | unit tests |
| Codex-only liveness check in ingress | replace with adapter capability check | runtime-neutral behavior | unit tests |
| Codex-branded generic bridge/relay names in shared seams | rename/move to runtime-neutral names | remove naming-level coupling drift | compile + unit tests |
| Frontend runtime kind coercion (`codex` else default) | parse/preserve backend runtime kind string with capability gating | avoid hidden fallback to default runtime | frontend unit tests |
| Split runtime defaults across many shared defaults files | centralize into runtime-client module registration composition | remove multi-file runtime add/remove edits | compile + unit tests |
| Runtime-specific re-exports in shared runtime index | remove runtime-specific exports from shared runtime index surface | keep shared exports runtime-neutral | compile + unit tests |

## Data Models (If Needed)

- Add normalized runtime event interpretation shape:
  - `statusHint?: "ACTIVE" | "IDLE" | "ERROR"`
  - `threadIdHint?: string | null`

## Error Handling And Edge Cases

- If runtime adapter has no `subscribeToRunEvents`, shared stream handler keeps existing native stream path for Autobyteus.
- If runtime event interpretation returns null, run-history no-ops.
- If runtime adapter is missing or throws, retain existing safe error handling (`accepted=false` in ingress, no crash in stream/history loop).

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001 | Runtime command path uses registry adapter dispatch | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-001 |
| UC-002 | R-001,R-002 | Agent streaming resolves runtime event stream via adapter capability | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-002 |
| UC-003 | R-003 | Team stream bridge resolves member subscriptions by runtime adapter capability | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-003 |
| UC-004 | R-004 | Run-history derives status/thread hints via runtime adapter interpretation | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-004 |
| UC-005 | R-005 | Autobyteus runtime path remains unchanged and passes verification | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-005 |
| UC-012 | R-008 | Runtime default registrations resolve through centralized runtime-client module list | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-012 |
| UC-013 | R-008 | Shared runtime execution export surface remains runtime-neutral | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-013 |
| UC-014 | R-009 | Runtime module resolution is discovery-driven for optional runtimes while preserving always-on core runtime registration | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-014 |

## Performance / Security Considerations

- No new network surfaces.
- Runtime adapter lookups are in-memory map operations.
- Event interpretation in adapter avoids repeated shared-layer conditional parsing.

## Migration / Rollout (If Needed)

- Single-step code migration within same deploy unit.
- No data migration required.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Unit | Planned |
| C-002 | T-002 | Unit | Planned |
| C-003 | T-003 | Unit | Planned |
| C-004 | T-004 | Unit + Integration | Planned |
| C-005 | T-005 | Unit | Planned |
| C-006 | T-006 | Unit | Planned |
| C-007 | T-007 | Unit | Planned |
| C-008 | T-008 | Unit | Implemented |
| C-009 | T-009 | Unit | Implemented |
| C-010 | T-010 | Unit + E2E | Implemented |
| C-011 | T-011 | Unit | Implemented |
| C-012 | T-012 | Unit (frontend) | Implemented |
| C-013 | T-013 | Unit | Planned |
| C-014 | T-014 | Unit (frontend) | Planned |
| C-015 | T-015 | Unit | Planned |
| C-016 | T-016 | Unit | Planned |
| C-017 | T-017 | Unit | Planned |
| C-018 | T-018 | Unit | Planned |
| C-019 | T-019 | Unit | Planned |
| C-020 | T-020 | Unit | Planned |
| C-021 | T-021 | Unit | Planned |
| C-022 | T-022 | Unit | Planned |
| C-023 | T-023 | Unit | Planned |
| C-024 | T-024 | Unit | Planned |
| C-025 | T-025 | Unit | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-04 | Initial design draft | N/A | N/A | No | v1 draft created | Open |
| 2026-03-04 | Stage 6 implementation (`team-codex-runtime-event-bridge.ts`) | Local Fix | Team runtime bridge still had direct runtime service coupling | No | v2 adds C-007 team bridge registry-resolution change | Applied |
| 2026-03-04 | Stage 6 architecture re-review | Design Impact | Shared mapper/orchestrator/frontend runtime model still contained Codex coupling | No | v3 adds C-008..C-012 redesign for full removability path | Applied |
| 2026-03-04 | Stage 7 architecture re-review | Design Impact | Shared mapper implicit Codex fallback and frontend fixed runtime literals still leaked runtime assumptions into generic layers | No | v4 adds C-013..C-014 explicit runtime mapping + capability-driven frontend runtime modeling | Applied |
| 2026-03-04 | Stage 8 follow-up architecture review | Design Impact | Shared mapper/projection still had direct Codex wiring and shared debug path still Codex-branded | No | v5 adds C-015..C-017 registry/debug decoupling sweep | Applied |
| 2026-03-04 | Stage 10 architecture re-review | Design Impact | Shared registries/services still contained runtime-specific default wiring and runtime kind still used static runtime tuple | No | v6 adds C-018..C-022 composition-default + runtime-capability/runtime-kind decoupling sweep | Applied |
| 2026-03-04 | Stage 10 continuation architecture review | Design Impact | Runtime default wiring remained fragmented and shared runtime execution index still re-exported Codex internals | Yes | v7 adds C-023..C-025 runtime-client registration consolidation + shared export-surface cleanup | Applied |
| 2026-03-05 | Stage 10 continuation architecture review (post-iteration 2) | Design Impact | Runtime composition defaults still directly imported optional runtime modules; team runtime mode still runtime-name-driven; shared barrels still leaked runtime-specific exports | Yes | v9 adds C-029..C-031 descriptor discovery + capability-driven team mode + shared barrel cleanup | Applied |
| 2026-03-05 | Stage 10 continuation architecture review (post-iteration 3) | Design Impact | Runtime-client index still hardcoded compile-time descriptor imports (`autobyteus`/`codex`) so optional runtime removal still needed composition-file edits | Yes | v10 adds C-033..C-034 module-spec descriptor discovery + tests | Applied |

## Open Questions

- Should runtime capability discovery be fully runtime-registration driven in backend (not hardcoded runtime-kind constants) in this ticket or immediate follow-up?
- Should frontend `AgentRuntimeKind` be widened to branded string + known-runtime helper now, or phased after backend runtime-registration endpoint is introduced?

## Revision Addendum (`v11`)

- Trigger: `Stage 10 -> Stage 1` re-entry continuation after Claude merge intake
- Summary: remove orphaned legacy external-runtime team event bridge/source abstractions and keep a single runtime-neutral team-runtime bridge seam.

### Change Inventory Delta (`v11`)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-035 | Remove | `src/services/agent-streaming/team-external-runtime-event-bridge.ts`, `src/runtime-execution/external-runtime-event-source-registry.ts`, `src/runtime-execution/external-runtime-event-source-port.ts` | Removed | Eliminate dead shared-layer path that still hardcodes Codex/Claude runtime services and duplicates active bridge behavior. | Shared streaming + runtime execution seams | Active runtime flows already use `TeamRuntimeEventBridge`. |
| C-036 | Modify/Add | `src/services/agent-streaming/index.ts`, `tests/unit/services/agent-streaming/*` | same | Standardize shared exports on `TeamRuntimeEventBridge` and add focused unit coverage for runtime-kind mapping and missing-adapter/subscription errors. | Shared streaming + tests | Keeps frontend/server message contract unchanged. |

### Decommission Delta

- Remove legacy external bridge + source abstractions instead of maintaining compatibility aliases.
- Retain only `TeamRuntimeEventBridge` as the team member-runtime streaming seam.
- Keep dependency direction unchanged: `shared streaming -> runtime adapter registry -> runtime adapters`.

## Revision Addendum (`v12`)

- Trigger: Stage-8 deep re-review (`Design Impact`) after requested Codex + Claude architecture verification
- Summary: remove residual runtime-to-runtime and shared-layer runtime-specific coupling leftovers identified in re-review findings (`P1`..`P3`).

### Change Inventory Delta (`v12`)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-037 | Add/Modify | `src/services/agent-streaming/codex-runtime-event-adapter.ts`, `src/runtime-management/runtime-client/claude-runtime-client-module.ts`, `src/runtime-management/runtime-client/codex-runtime-client-module.ts` | add protocol-level method-runtime adapter seam and consume it from runtime modules | Remove direct Claude->Codex runtime module dependency while preserving event-mapping behavior for method-based runtimes. | Runtime-client modules + streaming mapping seam | Both Codex and Claude runtime modules use shared protocol adapter contract. |
| C-038 | Remove | `src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts`, `src/agent-team-execution/services/team-member-runtime-binding-state-service.ts`, `src/agent-team-execution/services/team-member-runtime-relay-service.ts` | removed | Eliminate dormant shared-layer services that retain runtime-specific imports/branches and are not active in runtime orchestration paths. | Team execution shared-layer hygiene | Verified zero active references before removal. |

### Decommission Delta

- Remove dormant shared services with runtime-specific imports instead of retaining dead-code compatibility.
- Keep active team-runtime path centered on `TeamMemberRuntimeOrchestrator` + `TeamRuntimeEventBridge` + `RuntimeAdapterRegistry`.

## Revision Addendum (`v13`)

- Trigger: Stage-8 re-review fail (`Requirement Gap`) under strict no-legacy directive
- Summary: remove remaining compatibility behavior in active runtime ingress and team-run override schema paths.

### Change Inventory Delta (`v13`)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-042 | Modify | `src/runtime-execution/runtime-command-ingress-service.ts`, `tests/unit/runtime-execution/runtime-command-ingress-service.test.ts` | same | Remove legacy implicit-session compatibility fallback and require explicit runtime session binding for command ingress. | Runtime command ingress + backend unit tests | Keeps deterministic `RUN_SESSION_NOT_FOUND` behavior for unbound runs. |
| C-043 | Modify | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`, `autobyteus-web/types/agent/TeamRunConfig.ts`, `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | same | Remove legacy per-member runtime-kind compatibility field/cleanup; enforce team-level runtime model only. | Frontend team config schema + form sanitization/tests | No per-member runtime override semantics are retained. |

### Decommission Delta

- Remove `canUseLegacyImplicitSession` and implicit session creation branch from runtime ingress.
- Remove `MemberConfigOverride.runtimeKind` field and associated backward-compatible cleanup branch in team run config form.
- Preserve existing runtime capability-driven team runtime selection behavior and explicit session binding contracts.

## Revision Addendum (`v14`)

- Trigger: Stage-8 re-review parity request (`Requirement Gap`) for Claude operational sandbox/permission toggle symmetry
- Summary: introduce configurable Claude permission-mode resolution and propagate it through runtime-session state into Claude V2 create/resume session options while preserving runtime-neutral shared-layer boundaries.

### Change Inventory Delta (`v14`)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-047 | Modify | `src/runtime-execution/claude-agent-sdk/claude-runtime-shared.ts`, `src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`, `src/runtime-execution/claude-agent-sdk/claude-runtime-session-state.ts`, `src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts` | same | Replace hard-coded Claude V2 `permissionMode: "default"` with resolved permission-mode seam (`runtimeMetadata -> llmConfig -> env -> default`) and propagate through session state. | Claude runtime execution internals | Keeps defaults unchanged when no override is configured. |
| C-048 | Add/Modify | `tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-shared.test.ts`, `tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.test.ts`, `tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts` | same | Add focused regression coverage for permission-mode resolution precedence and V2 session option propagation; ensure tool-name-based `send_message_to` policy remains intact. | Backend unit tests | No API contract changes required. |

### Design Guardrails Delta

- Keep shared orchestration (`team-member-runtime-orchestrator.ts`) unchanged for `send_message_to` policy because it is already runtime-neutral and tool-name driven.
- Do not add compatibility wrappers for prior hard-coded permission behavior; default mode remains `default` through resolver fallback.
- Scope operational toggle to Claude runtime-specific module path only; no shared-layer runtime-specific branching.
