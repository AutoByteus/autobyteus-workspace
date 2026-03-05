# Requirements

- Ticket: `runtime-decoupling-refactor`
- Status: `Refined`
- Last Updated: `2026-03-05`

## Goal / Problem Statement

Decouple runtime integration boundaries so each runtime (including Codex) is pluggable and removable without affecting the Autobyteus runtime behavior.

## In-Scope Use Cases

- `UC-001`: Start/create/send/approve/interrupt/terminate flows remain runtime-neutral through adapter registry.
- `UC-002`: Stream runtime events to frontend through runtime-neutral adapter contracts with no Codex-specific branching in core stream handlers.
- `UC-003`: Team runtime orchestration and team streaming paths work through runtime-neutral boundaries.
- `UC-004`: Run-history/projection processing works through runtime-neutral providers and does not directly depend on Codex internals.
- `UC-005`: Disabling Codex runtime does not regress Autobyteus runtime operation.
- `UC-006`: Runtime-event mapping registration/removal happens without editing shared mapper logic.
- `UC-007`: Shared runtime stream debug controls/logging stay runtime-neutral.
- `UC-008`: Team member projection fallback selection is provider-registry driven with no Codex default in shared service.
- `UC-009`: Runtime adapter/model/projection default wiring is composition-root owned and removable without shared-registry edits.
- `UC-010`: Runtime capability probing is runtime-provider driven; shared capability service is runtime-neutral.
- `UC-011`: Runtime kind normalization supports runtime-id strings without hardcoded runtime enum coupling in shared layers.
- `UC-012`: Runtime kind normalization supports runtime-id strings without static runtime tuple coupling.
- `UC-013`: Runtime default registrations are centralized through one runtime-client module list so add/remove runtime changes are localized.
- `UC-014`: Optional runtime module loading is discovery-driven while Autobyteus runtime remains always-on core runtime.
- `UC-015`: Shared runtime execution export surface remains runtime-neutral and does not re-export runtime-specific implementations.
- `UC-016`: Team runtime mode resolution is capability-driven and does not branch on runtime-id literals.
- `UC-017`: Runtime-client composition defaults discover runtime module descriptors without direct optional-runtime imports in the shared defaults file.
- `UC-018`: Runtime-client descriptor composition is module-spec discovery driven and does not statically import optional runtime descriptors in shared index composition.

## Requirements

- `R-001`: Runtime orchestration layers must depend on runtime-neutral interfaces rather than Codex-specific services.
  - Expected outcome: Core orchestration code has no direct import/use of Codex runtime service.
- `R-002`: Runtime event adaptation must be runtime-pluggable.
  - Expected outcome: Event subscription and normalization are resolved by runtime kind through registry/provider interfaces.
- `R-003`: Team runtime paths must not hard-code Codex-only modes in shared orchestration layers.
  - Expected outcome: Team runtime flow can execute without Codex-specific branches in shared handlers.
- `R-004`: Run-history/projection logic must not require Codex-specific normalization in shared services.
  - Expected outcome: Run-history services consume runtime-agnostic provider interfaces.
- `R-005`: Existing Autobyteus runtime behavior must remain backward-stable for current use cases.
  - Expected outcome: Existing Autobyteus runtime tests and key integration paths pass unchanged.
- `R-006`: Shared runtime event/projection layers must not hardwire Codex-specific implementations.
  - Expected outcome: shared mapper and projection services consume registry/provider seams; Codex modules are registered outside shared-layer constructors.
- `R-007`: Shared runtime composition services must be runtime-registration driven and avoid fixed runtime catalogs.
  - Expected outcome: adapter/model/projection/capability defaults are registered from runtime default modules; runtime-kind core type does not require static two-runtime union edits.
- `R-008`: Runtime default registration and shared exports must preserve single-point runtime removability.
  - Expected outcome: shared default modules delegate to a centralized runtime-client registration list; shared runtime execution index exports only runtime-neutral contracts/services.
- `R-009`: Runtime module composition must support deployment-driven optional runtime discovery/selection without affecting always-on Autobyteus runtime.
  - Expected outcome: Autobyteus runtime module is always registered; optional runtime modules are selected by availability discovery with explicit env allow-list override support.
- `R-010`: Team runtime orchestration mode policy must be adapter-capability-driven instead of runtime-name-driven.
  - Expected outcome: team-mode selection and member-runtime guards resolve by adapter-declared execution mode, not by `runtimeKind === "autobyteus"` checks.
- `R-011`: Shared runtime-client composition defaults must avoid direct optional-runtime imports.
  - Expected outcome: optional runtime modules are discovered through runtime-module descriptors exported by runtime module files.
- `R-012`: Runtime-client descriptor composition must be module-spec discovery driven.
  - Expected outcome: `runtime-client/index.ts` resolves descriptor modules from module-spec configuration with safe fallback defaults and no static optional-runtime descriptor imports.

## Acceptance Criteria

- `AC-001`: Core stream handlers contain no direct dependency on Codex runtime service for runtime event ingestion.
- `AC-002`: Runtime adapter layer exposes event-stream integration contract used by all runtimes.
- `AC-003`: Team runtime orchestration no longer requires `codex_members` hard branch in shared path.
- `AC-004`: Run-history core service no longer imports Codex runtime service directly.
- `AC-005`: With Codex disabled, Autobyteus runtime create/send/stream flows remain functional in automated verification.
- `AC-006`: `RuntimeEventMessageMapper` contains no direct Codex adapter import/constructor wiring.
- `AC-007`: Shared runtime raw-event debug in `AgentStreamHandler` uses runtime-neutral naming/controls.
- `AC-008`: `TeamMemberRunProjectionService` contains no direct Codex provider import/default fallback.
- `AC-009`: `RuntimeAdapterRegistry` shared class contains no direct Codex adapter default construction/import.
- `AC-010`: `RuntimeModelCatalogService` shared class contains no direct Codex model-provider default construction/import.
- `AC-011`: `RunProjectionProviderRegistry` shared class contains no direct Codex provider default construction/import.
- `AC-012`: `RuntimeCapabilityService` shared class contains no runtime-specific Codex probe/env logic.
- `AC-013`: `runtime-kind.ts` no longer defines runtime kind by static hardcoded runtime tuple.
- `AC-014`: Shared runtime default registration modules are fed from centralized runtime-client registration APIs rather than hardcoded per-runtime constructors in each defaults file.
- `AC-015`: `runtime-execution/index.ts` contains no direct Codex runtime re-exports.
- `AC-016`: Runtime-client module resolution always includes `autobyteus` and does not require manual shared-layer edits to exclude unavailable optional runtimes.
- `AC-017`: Runtime-client module resolution supports deployment override via a runtime-module allow-list environment variable while preserving availability-based optional runtime discovery.
- `AC-018`: Team runtime mode selection/guard logic contains no runtime-name literal branching (for example `runtimeKind === "autobyteus"`).
- `AC-019`: `runtime-client-modules-defaults.ts` contains no direct import/reference to specific optional runtime modules (for example Codex module import).
- `AC-020`: Shared runtime barrel exports (`runtime-execution/index.ts`, `runtime-management/model-catalog/index.ts`, `runtime-management/runtime-client/index.ts`) expose runtime-neutral contracts/composition APIs only.
- `AC-021`: `runtime-management/runtime-client/index.ts` contains no static imports of optional runtime descriptors and loads descriptor modules from module-spec discovery configuration.
- `AC-022`: Runtime-client descriptor module discovery supports env override (`AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES`) and tolerates invalid optional module specs without breaking required-runtime inclusion enforcement.

## Requirement Coverage Map

| Requirement ID | Use Case IDs | Acceptance Criteria IDs |
| --- | --- | --- |
| `R-001` | `UC-001`, `UC-002` | `AC-001`, `AC-002` |
| `R-002` | `UC-002` | `AC-001`, `AC-002` |
| `R-003` | `UC-003` | `AC-003` |
| `R-004` | `UC-004` | `AC-004` |
| `R-005` | `UC-005` | `AC-005` |
| `R-006` | `UC-006`, `UC-007`, `UC-008` | `AC-006`, `AC-007`, `AC-008` |
| `R-007` | `UC-009`, `UC-010`, `UC-011`, `UC-012` | `AC-009`, `AC-010`, `AC-011`, `AC-012`, `AC-013` |
| `R-008` | `UC-013`, `UC-015` | `AC-014`, `AC-015` |
| `R-009` | `UC-014` | `AC-016`, `AC-017` |
| `R-010` | `UC-003`, `UC-016` | `AC-003`, `AC-018` |
| `R-011` | `UC-014`, `UC-017` | `AC-016`, `AC-017`, `AC-019`, `AC-020` |
| `R-012` | `UC-014`, `UC-018` | `AC-021`, `AC-022` |

## Acceptance Criteria Verification Targets

| Acceptance Criteria ID | Measurable Expected Outcome |
| --- | --- |
| `AC-001` | `AgentStreamHandler` and equivalent shared stream entrypoints compile without importing Codex runtime service directly. |
| `AC-002` | Runtime-neutral event subscription contract is implemented by runtime adapters and used by stream handlers. |
| `AC-003` | Team shared stream/orchestration entrypoints resolve behavior by runtime capabilities/registry instead of hard-coded `codex_members` branching. |
| `AC-004` | Shared run-history service uses runtime-neutral liveness/event-normalization providers and compiles without direct Codex runtime imports. |
| `AC-005` | Existing Autobyteus runtime unit/integration tests for create/send/stream paths pass with Codex runtime disabled. |
| `AC-006` | Shared runtime-event mapper compiles/operates without importing or constructing Codex adapter directly. |
| `AC-007` | Shared runtime stream debug env keys and log channels are runtime-neutral and work across runtime kinds. |
| `AC-008` | Shared team-member projection service resolves runtime fallback providers without direct Codex provider import/default. |
| `AC-009` | Shared runtime adapter registry compiles without direct Codex adapter default wiring in the shared registry class. |
| `AC-010` | Shared runtime model catalog service compiles without direct Codex model-provider default wiring in the shared service class. |
| `AC-011` | Shared run-projection provider registry compiles without direct Codex provider default wiring in the shared registry class. |
| `AC-012` | Shared runtime capability service compiles with runtime-provider abstractions and without Codex-specific env/probe logic in the shared class. |
| `AC-013` | Shared runtime-kind core type/normalization compiles without static tuple catalog binding to specific runtime implementations. |
| `AC-014` | Runtime defaults for adapter/model/capability/projection/event-mapper registration resolve through centralized runtime-client registration composition and support runtime add/remove without editing each shared defaults file. |
| `AC-015` | `runtime-execution/index.ts` exports runtime-neutral contracts/services only; runtime-specific adapters/modules are imported via runtime-specific paths instead of shared index re-exports. |
| `AC-016` | `getDefaultRuntimeClientModules()` always resolves `autobyteus` runtime module and excludes optional runtimes when discovery says unavailable, without changing shared defaults registration call sites. |
| `AC-017` | Runtime module allow-list env override controls optional runtime module registration (comma-separated runtime kinds, `*` wildcard), while `autobyteus` remains included regardless of override. |
| `AC-018` | Team runtime mode selection and member-runtime guard logic compile and execute without runtime-name literal checks in shared orchestration/services. |
| `AC-019` | `runtime-client-modules-defaults.ts` resolves optional runtime module descriptors without importing optional runtime module implementations directly. |
| `AC-020` | Shared runtime barrel exports contain no runtime-specific adapter/provider/module exports; runtime-specific exports remain in runtime-specific modules only. |
| `AC-021` | `runtime-management/runtime-client/index.ts` resolves runtime-client descriptors by module-spec discovery and contains no static optional-runtime descriptor imports. |
| `AC-022` | Descriptor module discovery supports env override (`AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES`) and safely skips invalid optional module specs while preserving required-runtime guard behavior. |

## Constraints / Dependencies

- Existing GraphQL and stream message contracts to frontend must remain compatible.
- Refactor should be incremental and low-risk; avoid broad rewrites.
- No compatibility-wrapper debt should be introduced in new architecture.

## Assumptions

- Codex runtime can be kept as one plugin implementation while shared layers become runtime-agnostic.
- Existing tests can be extended to validate runtime-neutral boundaries.

## Open Questions / Risks

- Team runtime execution currently has explicit Codex-only orchestration branches; removal may need phased migration.
- Run-history projection has codex-linked provider assumptions that may require a transitional provider registry redesign.

## Re-Entry Delta (Post-Merge Claude Runtime Intake)

- Date: `2026-03-05`
- Status: `Refined` (delta captured for next design/runtime-model iteration)

### Added/Refined Requirements

- `R-013`: Claude Agent SDK runtime registration must be integrated through runtime-client descriptor/module discovery (no shared-registry static wiring).
  - Expected outcome: Claude runtime adapter/model/capability/projection/event-mapper registration is provided by an optional runtime-client module descriptor.
- `R-014`: Optional runtime integrations must remain fail-soft under missing optional dependencies.
  - Expected outcome: shared runtime-neutral entrypoints keep loading when Claude runtime dependencies are unavailable; optional module discovery skips failing optional modules safely.
- `R-015`: Team-member run-history projection for non-default runtimes must select the richer projection source between local-memory and runtime-backed providers.
  - Expected outcome: runtime-backed projection can supersede incomplete local projection snapshots, while local projection remains fallback on runtime-provider failure.

### Added Acceptance Criteria

- `AC-023`: `runtime-management/runtime-client/index.ts` includes Claude descriptor module-spec discovery without introducing static shared-layer optional-runtime imports.
- `AC-024`: Claude runtime registration is encapsulated in `claude-runtime-client-module.ts` and includes adapter/model/capability/projection/event-mapper registration hooks.
- `AC-025`: Claude runtime adapter satisfies decoupled shared runtime contracts required by stream/team orchestration (`teamExecutionMode`, run-active probe, runtime event subscription, relay handler binding).
- `AC-026`: Team member projection service chooses richer runtime projection for non-default runtimes and keeps local projection when runtime provider fails.
