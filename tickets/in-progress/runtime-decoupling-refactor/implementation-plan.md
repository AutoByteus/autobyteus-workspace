# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Cross-layer refactor touching runtime contract, stream handling, and run-history.
  - Requires architectural boundary preservation and regression-safe behavior for Autobyteus runtime.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> implementation plan -> implementation progress tracking -> API/E2E testing (implement + execute) -> code review gate -> docs sync

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/runtime-decoupling-refactor/workflow-state.md`
- Investigation notes: `tickets/in-progress/runtime-decoupling-refactor/investigation-notes.md`
- Requirements: `tickets/in-progress/runtime-decoupling-refactor/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/runtime-decoupling-refactor/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/runtime-decoupling-refactor/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/in-progress/runtime-decoupling-refactor/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Stage 5 gate reached `Go Confirmed` with two clean rounds.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope: `UC-001`..`UC-015`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases (if any, with risk/objective): `None`
- Target Architecture Shape (for `Small`, mandatory): N/A (Medium scope)
- New Layers/Modules/Boundary Interfaces To Introduce:
  - Extend `RuntimeAdapter` capability surface:
    - `subscribeToRunEvents?`
    - `isRunActive?`
    - `interpretRuntimeEvent?`
- Touched Files/Modules:
  - `src/runtime-execution/runtime-adapter-port.ts`
  - `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`
  - `src/runtime-execution/adapters/autobyteus-runtime-adapter.ts`
  - `src/services/agent-streaming/agent-stream-handler.ts`
  - `src/services/agent-streaming/team-codex-runtime-event-bridge.ts`
  - `src/runtime-execution/runtime-command-ingress-service.ts`
  - `src/run-history/services/run-history-service.ts`
- API/Behavior Delta:
  - No frontend contract change; internal runtime decoupling only.
- Key Assumptions:
  - Existing `RuntimeEventMessageMapper` remains compatible with Codex event payloads.
- Known Risks:
  - Event subscription fallback behavior must not regress Autobyteus stream loop.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |
| 5 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 6 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |
| 11 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 12 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |
| 13 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 14 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `12`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`
- If `No-Go`, required refinement target:
  - `Medium/Large`: refine proposed design document, then regenerate call stack and re-review.
- If `No-Go`, do not continue with dependency sequencing or implementation kickoff.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests and integration tests alongside implementation.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory decoupling rule: preserve clear module boundaries and one-way dependency direction; avoid adding tight coupling/cycles.
- Choose the proper structural change for architecture integrity; do not prefer local hacks just because they are smaller.
- One file at a time is the default; use limited parallel work only when dependency edges require it.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `runtime-adapter-port.ts` | None | Introduce shared capability contract first |
| 2 | `autobyteus-runtime-adapter.ts`, `codex-app-server-runtime-adapter.ts` | 1 | Implement runtime capability methods |
| 3 | `runtime-command-ingress-service.ts` | 2 | Consume runtime-neutral liveness check |
| 4 | `run-history-service.ts` | 2 | Consume runtime-neutral runtime-event interpretation |
| 5 | `agent-stream-handler.ts` | 2 | Consume runtime-neutral runtime-event subscription |
| 6 | Unit/integration tests | 1-5 | Verify behavior and regressions |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001,AC-002 | proposed-design `Target State (To-Be)` | UC-001, UC-002 | T-001,T-004 | Unit + Integration | AV-001 |
| R-002 | AC-001,AC-002 | proposed-design `Change Inventory` | UC-002 | T-001,T-002,T-004 | Unit | AV-002 |
| R-003 | AC-003 | proposed-design `Target Architecture Shape` | UC-003 | T-007 (if touched) | Unit/Integration | AV-003 |
| R-004 | AC-004 | proposed-design `Change Inventory` | UC-004 | T-006 | Unit | AV-004 |
| R-005 | AC-005 | proposed-design `Goals` | UC-005 | T-003,T-005 | Integration/E2E | AV-005 |
| R-006 | AC-006,AC-007,AC-008 | proposed-design `Change Inventory` | UC-006,UC-008,UC-009 | T-015,T-016,T-017 | Unit + Integration | AV-008,AV-009,AV-010 |
| R-007 | AC-009,AC-010,AC-011,AC-012,AC-013 | proposed-design `Change Inventory` | UC-010,UC-011,UC-012 | T-018,T-019,T-020,T-021,T-022 | Unit | AV-011,AV-012,AV-013,AV-014,AV-015 |
| R-008 | AC-014,AC-015 | proposed-design `Change Inventory` | UC-013,UC-015 | T-023,T-024,T-025 | Unit | AV-016,AV-017 |
| R-009 | AC-016,AC-017 | proposed-design `Change Inventory` | UC-014 | T-026,T-027,T-028 | Unit | AV-018,AV-019 |
| Design-Risk-001 | N/A | proposed-design `Target State (To-Be)` | UC-006 | T-013 | Unit | AV-006 |
| Design-Risk-002 | N/A | proposed-design `Target State (To-Be)` | UC-007 | T-014 | Frontend Unit | AV-007 |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Shared stream handlers have no direct Codex runtime-service dependency | AV-001 | API | Planned |
| AC-002 | R-002 | Runtime adapter contract exposes and uses event-stream capability | AV-002 | API | Planned |
| AC-003 | R-003 | Team shared path does not hard-code codex mode branch | AV-003 | API | Planned |
| AC-004 | R-004 | Run-history shared service does not import Codex runtime service | AV-004 | API | Planned |
| AC-005 | R-005 | Autobyteus runtime works with Codex disabled | AV-005 | E2E | Planned |
| AC-006 | R-006 | Shared runtime-event mapper has no direct Codex adapter constructor/import wiring | AV-008 | API | Planned |
| AC-007 | R-006 | Shared runtime raw-event debug controls/log channels are runtime-neutral | AV-009 | API | Planned |
| AC-008 | R-006 | Shared team-member projection fallback is registry-driven without direct Codex provider import/default | AV-010 | API | Planned |
| AC-009 | R-007 | Shared adapter registry class has no runtime-specific default construction/import | AV-011 | API | Planned |
| AC-010 | R-007 | Shared model-catalog service class has no runtime-specific default construction/import | AV-012 | API | Planned |
| AC-011 | R-007 | Shared projection registry class has no runtime-specific default construction/import | AV-013 | API | Planned |
| AC-012 | R-007 | Shared capability service class has no Codex-specific probe/env/cache logic | AV-014 | API | Planned |
| AC-013 | R-007 | Shared runtime-kind core has no static runtime tuple coupling | AV-015 | API | Planned |
| AC-014 | R-008 | Shared defaults modules resolve runtime-specific defaults via centralized runtime-client registration composition | AV-016 | API | Planned |
| AC-015 | R-008 | Shared runtime execution index has no runtime-specific Codex re-exports | AV-017 | API | Planned |
| AC-016 | R-009 | Runtime-client module resolution always includes Autobyteus and excludes unavailable optional runtimes without shared-layer edits | AV-018 | API | Planned |
| AC-017 | R-009 | Runtime-module allow-list env override controls optional runtime registration while preserving discovery behavior | AV-019 | API | Planned |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Modify | T-001 | No | Unit |
| C-002 | Modify | T-002 | No | Unit |
| C-003 | Modify | T-003 | No | Unit |
| C-004 | Modify | T-004 | Yes | Unit + Integration |
| C-005 | Modify | T-005 | Yes | Unit |
| C-006 | Modify | T-006 | Yes | Unit |
| C-007 (implementation adjustment) | Modify | T-007 | Yes | Unit |
| C-008 | Modify | T-008 | No | Unit |
| C-009 | Modify | T-009 | No | Unit + Integration |
| C-010 | Modify | T-010 | Yes | Unit |
| C-011 | Rename/Move | T-011 | Yes | Unit |
| C-012 | Modify | T-012 | No | Frontend Unit |
| C-013 | Modify | T-013 | No | Unit |
| C-014 | Modify | T-014 | No | Frontend Unit |
| C-015 | Modify | T-015 | No | Unit |
| C-016 | Modify | T-016 | No | Unit |
| C-017 | Modify | T-017 | No | Unit |
| C-018 | Modify | T-018 | No | Unit |
| C-019 | Modify | T-019 | No | Unit |
| C-020 | Modify | T-020 | No | Unit |
| C-021 | Modify | T-021 | No | Unit |
| C-022 | Modify | T-022 | No | Unit |
| C-023 | Add | T-023 | No | Unit |
| C-024 | Modify | T-024 | No | Unit |
| C-025 | Modify | T-025 | Yes | Unit |
| C-026 | Modify | T-026 | No | Unit |
| C-027 | Modify | T-027 | No | Unit |
| C-028 | Add | T-028 | No | Unit |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Direct Codex import in `agent-stream-handler.ts` | Remove | Remove import + constructor dependency + call sites | Stream fallback risk |
| T-DEL-002 | Direct Codex imports in `run-history-service.ts` | Remove | Remove codex normalizer/service usage | Status/thread mapping risk |
| T-DEL-003 | Codex-only liveness check in ingress | Remove | Use runtime adapter liveness capability | None |
| T-DEL-004 | `team-codex-runtime-event-bridge.ts` | Rename/Move | Rename bridge to runtime-neutral module and update imports/usages | Low |
| T-DEL-005 | `team-codex-inter-agent-message-relay.ts` | Rename/Move | Relocate relay helper to runtime-neutral module and update orchestrator dependency | Low |

## Step-By-Step Plan

1. Extend runtime adapter contract with optional event/liveness/interpretation methods.
2. Implement new capability methods in Codex and Autobyteus adapters.
3. Refactor ingress and run-history services to use runtime-neutral capabilities.
4. Introduce runtime-kind keyed stream event mapping and move stream handlers to explicit runtime-kind dispatch.
5. Rename Codex-branded shared bridge/relay modules to runtime-neutral names.
6. Replace Codex-specific relay binding with runtime-adapter relay-handler capability binding.
7. Preserve runtime kind values in frontend run-manifest/config normalization paths.
8. Remove implicit runtime-kind inference from shared runtime event mapper and require explicit runtime-kind routing.
9. Replace hardcoded frontend runtime options with capability-driven runtime option rendering and runtime-id labeling.
10. Update/add unit tests for contract and behavioral invariants.
11. Run targeted test suites, then full backend/frontend suites.

## Stage-8 Follow-Up Iteration Addendum (`C-015`..`C-017`)

### Iteration Goal

Eliminate final Codex bleed-through from shared runtime/event/projection layers while preserving existing behavior and test coverage.

### Iteration Tasks

1. `T-015`: Refactor `RuntimeEventMessageMapper` so Codex mapper registration is externalized and shared mapper has no direct Codex import/construction.
2. `T-016`: Normalize shared runtime-event debug controls/log naming in `AgentStreamHandler` to runtime-neutral `RUNTIME_*` semantics.
3. `T-017`: Refactor `TeamMemberRunProjectionService` to use projection-provider registry wiring only, removing direct Codex fallback import/default.
4. Update/extend backend unit tests for mapper wiring, debug behavior safety, and projection fallback registry dispatch.
5. Execute full backend and full frontend suites as gate verification for this iteration.

### Iteration Verification Targets

- Backend:
  - `tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
  - `tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
  - `tests/unit/run-history/services/team-member-run-projection-service.test.ts`
- Full suites:
  - `pnpm -C autobyteus-server-ts exec vitest run`
  - `pnpm -C autobyteus-web test`

## Stage-10 Re-Entry Iteration Addendum (`C-018`..`C-022`)

### Iteration Goal

Remove remaining runtime-specific coupling from shared composition classes by introducing runtime-neutral registry/service cores with externalized runtime defaults and provider seams.

### Iteration Tasks

1. `T-018`: Refactor `RuntimeAdapterRegistry` to remove in-class runtime-specific default construction/import and move default adapter wiring to a dedicated defaults module.
2. `T-019`: Refactor `RuntimeModelCatalogService` to remove in-class runtime-specific default provider construction/import and move default provider wiring to a dedicated defaults module.
3. `T-020`: Refactor `RunProjectionProviderRegistry` to remove in-class runtime-specific default provider construction/import and move default provider wiring to a dedicated defaults module.
4. `T-021`: Refactor `RuntimeCapabilityService` to runtime-provider-driven architecture and move Codex env/probe policy to runtime capability defaults module.
5. `T-022`: Refactor `runtime-kind.ts` core typing/normalization to runtime-id string semantics (non-empty) and remove static runtime tuple coupling.
6. Update backend unit tests for adapter/model/projection/capability/kind seams.
7. Execute full backend and full frontend suites as gate verification for this iteration.

### Iteration Verification Targets

- Backend:
  - `tests/unit/runtime-execution/runtime-adapter-registry.test.ts`
  - `tests/unit/runtime-management/model-catalog/runtime-model-catalog-service.test.ts`
  - `tests/unit/run-history/projection/run-projection-provider-registry.test.ts`
  - `tests/unit/runtime-management/runtime-capability-service.test.ts`
  - `tests/unit/runtime-management/runtime-kind.test.ts`
- Full suites:
  - `pnpm -C autobyteus-server-ts exec vitest run`
  - `pnpm -C autobyteus-web test`

## Stage-10 Continuation Iteration Addendum (`C-023`..`C-025`)

### Iteration Goal

Eliminate final shared-layer runtime-removal friction by centralizing runtime defaults registration in runtime-client modules and tightening shared runtime-execution exports.

### Iteration Tasks

1. `T-023`: Add runtime-client module registration contracts and default runtime-client module list.
2. `T-024`: Refactor runtime defaults modules (`adapter/model/capability/projection/event-mapper`) to delegate through centralized runtime-client registration helpers.
3. `T-025`: Remove runtime-specific Codex re-exports from shared `runtime-execution/index.ts`.
4. Update backend unit tests for defaults registration composition and shared export-surface expectations.
5. Execute full backend and full frontend suites as gate verification for this iteration.

### Iteration Verification Targets

- Backend:
  - `tests/unit/runtime-execution/runtime-adapter-registry.test.ts`
  - `tests/unit/runtime-management/model-catalog/runtime-model-catalog-service.test.ts`
  - `tests/unit/runtime-management/runtime-capability-service.test.ts`
  - `tests/unit/run-history/projection/run-projection-provider-registry.test.ts`
  - `tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
- Full suites:
  - `pnpm -C autobyteus-server-ts exec vitest run`
  - `pnpm -C autobyteus-web test`

## Stage-10 Continuation Iteration Addendum 2 (`C-026`..`C-028`)

### Iteration Goal

Make runtime-client module loading discovery-driven so Autobyteus stays always-on while optional runtimes can be auto-discovered or deployment-filtered without shared-layer code churn.

### Iteration Tasks

1. `T-026`: Refactor `runtime-client-modules-defaults.ts` from static module array to descriptor-driven resolver with required/optional runtime semantics.
2. `T-027`: Reuse Codex availability policy for optional module discovery and add runtime module allow-list env override support (comma-separated runtime kinds, `*` wildcard).
3. `T-028`: Add targeted unit tests for runtime-client module resolution behavior (always-on Autobyteus, optional runtime exclusion when unavailable, allow-list override behavior).
4. Execute full backend and full frontend suites as gate verification for this iteration.

### Iteration Verification Targets

- Backend:
  - `tests/unit/runtime-management/runtime-client/runtime-client-modules-defaults.test.ts`
  - `tests/unit/runtime-management/runtime-capability-service.test.ts`
  - `tests/unit/runtime-execution/runtime-adapter-registry.test.ts`
  - `tests/unit/runtime-management/model-catalog/runtime-model-catalog-service.test.ts`
- Full suites:
  - `pnpm -C autobyteus-server-ts exec vitest run`
  - `pnpm -C autobyteus-web test`

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `runtime-adapter-port.ts` | New methods typed and exported | compile + contract tests pass | N/A | |
| `autobyteus-runtime-adapter.ts` | liveness method returns manager-backed state | adapter unit test pass | covered indirectly | |
| `codex-app-server-runtime-adapter.ts` | event/liveness/interpretation methods implemented | adapter unit tests pass | codex runtime integration tests unaffected | |
| `runtime-command-ingress-service.ts` | no codex-only liveness check remains | ingress unit tests pass | N/A | |
| `run-history-service.ts` | no direct codex imports; uses adapter interpretation | run-history unit tests pass | run-history e2e smoke pass | |
| `agent-stream-handler.ts` | no direct codex runtime service dependency | websocket unit/integration tests pass | websocket integration pass | |
| `runtime-event-message-mapper.ts` | runtime-kind keyed mapper dispatch available | mapper unit tests pass | N/A | |
| `runtime-event-message-mapper.ts` (final sweep) | no implicit Codex fallback; explicit runtime kind required for mapping | mapper unit tests pass | N/A | |
| `team-runtime-event-bridge.ts` | team runtime bridge maps events by member runtime kind | team stream unit tests pass | N/A | |
| `team-member-runtime-orchestrator.ts` | relay binding/dispatch no longer depends on codex runtime service types | orchestrator unit tests pass | team continuation tests pass | |
| `team-runtime-inter-agent-message-relay.ts` | runtime-neutral relay helper uses ingress only | orchestrator unit tests pass | N/A | |
| `autobyteus-web/stores/runHistoryManifest.ts` | runtime kind parsing preserves non-empty runtime values | run-history store tests pass | N/A | |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | runtime normalization preserves runtime-kind values and avoids hardcoded codex coercion | form unit tests pass | N/A | |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | runtime normalization preserves runtime-kind values and avoids hardcoded codex coercion | form unit tests pass | N/A | |
| `autobyteus-web/stores/runtimeCapabilitiesStore.ts` | capability lookups support generic runtime-id strings without fixed union assumptions | runtime-capability store tests pass | N/A | |
| `autobyteus-web/types/agent/AgentRunConfig.ts` | runtime kind model supports capability-driven runtime IDs with stable default + label helper | type/unit tests pass | N/A | |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/runtime-decoupling-refactor/code-review.md`
- Scope (source + tests): runtime execution adapters, stream handler, run-history service, updated tests.
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - classify as `Design Impact`, re-enter full chain.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - capture for each changed source file in `code-review.md`.
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - required.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `agent-stream-handler.ts` | TBD | Yes | Medium | Refactor | Design Impact |
| `run-history-service.ts` | TBD | Yes | Medium | Refactor | Design Impact |
| `runtime-command-ingress-service.ts` | TBD | Yes | Low | Keep | Local Fix |

## Test Strategy

- Unit tests:
  - runtime adapter/ingress/run-history service targeted unit tests.
- Integration tests:
  - websocket and runtime integration tests relevant to Autobyteus flow.
- Stage 6 boundary: file/module/service-level verification only (unit + integration).
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `5`
  - critical flows to validate (API/E2E): runtime command dispatch, runtime event stream mapping, run-history updates, codex-off autobyteus runtime.
  - expected scenario count: `5`
  - known environment constraints: codex runtime e2e may depend on local codex binary.
- Stage 8 handoff notes for code review:
  - predicted design-impact hotspots: stream handler + run-history service.
  - files likely to exceed size/SoC thresholds: none expected.

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | R-001 | UC-002 | API | Shared stream handler compiled/verified without direct Codex runtime service dependency |
| AV-002 | Requirement | AC-002 | R-002 | UC-002 | API | Runtime adapter capability methods used for runtime event subscription |
| AV-003 | Requirement | AC-003 | R-003 | UC-003 | API | Team shared path has no hard `codex_members` branch (if included in this implementation slice) |
| AV-004 | Requirement | AC-004 | R-004 | UC-004 | API | Run-history shared service uses adapter runtime event interpretation |
| AV-005 | Requirement | AC-005 | R-005 | UC-005 | E2E | Autobyteus runtime flow works with Codex runtime disabled |
| AV-006 | Design-Risk | N/A | N/A | UC-006 | API | Runtime event mapper requires explicit runtime-kind dispatch and no longer infers Codex from payload shape |
| AV-007 | Design-Risk | N/A | N/A | UC-007 | API | Runtime options/rendering follow runtime capabilities and preserve selected runtime IDs without hardcoded two-runtime lists |
| AV-008 | Requirement | AC-006 | R-006 | UC-006 | API | Shared runtime-event mapper has no direct Codex adapter constructor wiring |
| AV-009 | Requirement | AC-007 | R-006 | UC-008 | API | Shared runtime raw-event debug controls/log channels are runtime-neutral |
| AV-010 | Requirement | AC-008 | R-006 | UC-009 | API | Shared team-member projection fallback resolution is registry-driven without direct Codex provider import/default |
| AV-011 | Requirement | AC-009 | R-007 | UC-010 | API | Shared runtime adapter registry class has no runtime-specific default construction/import |
| AV-012 | Requirement | AC-010 | R-007 | UC-010 | API | Shared runtime model-catalog service class has no runtime-specific default construction/import |
| AV-013 | Requirement | AC-011 | R-007 | UC-010 | API | Shared run-projection registry class has no runtime-specific default construction/import |
| AV-014 | Requirement | AC-012 | R-007 | UC-011 | API | Shared runtime capability service is runtime-provider driven with no Codex-specific probe/env logic |
| AV-015 | Requirement | AC-013 | R-007 | UC-012 | API | Shared runtime-kind core no longer relies on static runtime tuple coupling |

## API/E2E Testing Escalation Policy (Stage 7 Guardrail)

- Classification rules for failing API/E2E scenarios:
  - choose exactly one classification for the current failure event: `Local Fix`, `Design Impact`, `Requirement Gap`, or `Unclear`.
  - do not allow any in-scope acceptance criterion to remain `Unmapped`, `Not Run`, `Failed`, or `Blocked` at Stage 7 close unless explicitly marked `Waived` by user decision for infeasible cases.
  - First run investigation screen:
    - if issue is cross-cutting, root cause is unclear, or confidence is low, set `Investigation Required = Yes`, pause implementation, and update `tickets/in-progress/runtime-decoupling-refactor/investigation-notes.md` before persisting classification/re-entry records.
    - if issue is clearly bounded with high confidence, set `Investigation Required = No` and classify directly.
  - `Local Fix`: no requirement/design change needed; responsibility boundaries remain intact.
  - `Design Impact`: responsibility boundaries drift, architecture change needed, or patch-on-patch complexity appears.
  - `Requirement Gap`: missing/ambiguous requirement or newly discovered requirement-level constraint.
- Required action:
  - `Local Fix` -> update implementation/review artifacts first, then implement fix, rerun `Stage 6 -> Stage 7`, then rerun affected scenarios.
  - `Design Impact` -> set `Investigation Required = Yes` (mandatory checkpoint), update `investigation-notes.md`, then follow full-chain re-entry.
  - if requirement-level gaps are discovered during the design-impact investigation checkpoint -> reclassify as `Requirement Gap` and follow the requirement-gap path.
  - `Design Impact` (after checkpoint, still design impact) -> return to `Stage 1 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`; rerun affected scenarios.
  - `Requirement Gap` -> return to `Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`; rerun affected scenarios.
  - `Unclear`/cross-cutting root cause -> return to `Stage 0 -> Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`; rerun affected scenarios.
  - Stage 0 in a re-entry path means re-open bootstrap controls in the same ticket/worktree (`workflow-state.md`, lock state, artifact baselines); do not create a new ticket folder.
  - when `Investigation Required = Yes`, understanding-stage re-entry is mandatory before design/requirements updates.

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None yet | N/A | N/A | N/A | Pending |

## Stage-10 Continuation Iteration Addendum 3 (`C-029`..`C-032`)

### Iteration Goal

Close residual runtime-decoupling seams by removing runtime-name policy branching from team orchestration, isolating optional runtime module composition from shared defaults, and tightening shared barrel surfaces; then close hard-limit review risk with a local service decomposition.

### Iteration Tasks

1. `T-029`: Introduce runtime-client module descriptor contract and move shared defaults composition to descriptor-discovery wiring.
2. `T-030`: Replace team runtime mode runtime-name branching with adapter capability (`teamExecutionMode`) policy in orchestration/streaming boundaries.
3. `T-031`: Remove runtime-specific exports from shared barrels and keep runtime-specific exports in runtime-specific modules.
4. `T-032`: Resolve `team-run-mutation-service.ts` hard-limit risk by extracting payload types and team-runtime-mode policy helper into dedicated modules.
5. Execute full backend and frontend suites and record stage-gate evidence.

### Iteration Verification Targets

- Backend:
  - `tests/unit/runtime-management/runtime-client/runtime-client-modules-defaults.test.ts`
  - `tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
  - `tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
  - Full backend suite: `pnpm -C autobyteus-server-ts exec vitest run`
- Frontend:
  - Full frontend suite: `pnpm -C autobyteus-web test`

## Stage-10 Continuation Iteration Addendum 4 (`C-033`..`C-034`)

### Iteration Goal

Remove the remaining compile-time optional-runtime descriptor seam by making runtime-client descriptor composition in `runtime-client/index.ts` module-spec discovery driven, then lock this behavior with focused unit coverage.

### Iteration Tasks

1. `T-033`: Refactor `src/runtime-management/runtime-client/index.ts` to load descriptor modules from module-spec configuration and eliminate static optional-runtime descriptor imports.
2. `T-034`: Add env override support (`AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES`) with required-module-spec merge behavior so Autobyteus descriptor availability remains enforced.
3. `T-035`: Add focused unit tests for runtime-client index descriptor discovery defaults/env override/invalid-module tolerance.
4. Execute full backend and frontend suites as stage-gate verification.

### Iteration Verification Targets

- Backend:
  - `tests/unit/runtime-management/runtime-client/runtime-client-index.test.ts`
  - `tests/unit/runtime-management/runtime-client/runtime-client-modules-defaults.test.ts`
  - Full backend suite: `pnpm -C autobyteus-server-ts exec vitest run`
- Frontend:
  - Full frontend suite: `pnpm -C autobyteus-web test`
