# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: the change crosses runtime startup, token-usage persistence, build/bootstrap tooling, Electron env generation, tests, and durable docs.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/remove-file-persistence-provider/workflow-state.md`
- Investigation notes: `tickets/in-progress/remove-file-persistence-provider/investigation-notes.md`
- Requirements: `tickets/in-progress/remove-file-persistence-provider/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/remove-file-persistence-provider/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/remove-file-persistence-provider/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/remove-file-persistence-provider/proposed-design.md`

## Document Status

- Current Status: `Review-Gate-Validated`
- Notes: the initial persistence-provider cleanup is complete, the Stage 8 re-entry was resolved by moving Codex token-usage raw-shape ownership into the Codex thread boundary, and the updated implementation has passed the refreshed Stage 7 and Stage 8 reruns. Stage 9 docs sync is the next gate.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`
- Spine Inventory In Scope: `DS-001`, `DS-002`, `DS-003`
- Primary Spine Span Sufficiency Rationale: the implementation keeps the initiating bootstrap surfaces, the authoritative startup/config boundary, the migration boundary, and the token-usage persistence boundary visible instead of hiding the change inside local helper edits.
- Primary Owners / Main Domain Subjects: startup/config, token usage, bootstrap surfaces
- Requirement Coverage Guarantee: each requirement is mapped to at least one change set and one validation target.
- Design-Risk Use Cases: Android/bootstrap artifact removal and truthful runtime env generation
- Target Architecture Shape: remove global persistence-profile policy, keep DB config as the startup input, and make `TokenUsageStore` the single token-usage persistence boundary.
- New Owners/Boundary Interfaces To Introduce: `TokenUsageStore`
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta: runtime/build surfaces stop advertising `PERSISTENCE_PROVIDER`; token usage no longer supports file persistence; startup migration behavior no longer branches on a file profile.
- Key Assumptions: token usage stays SQL-backed; subsystem-native file stores remain file-backed.
- Known Risks: Android/bootstrap helpers and Electron env tests needed validation after the file-profile path removal.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 2 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line: `Implementation can start: Yes`

### Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: update unit/integration tests with the boundary rename and deleted profile logic.
- Mandatory modernization rule: no backward-compatibility shims or legacy profile branches retained.
- Mandatory cleanup rule: remove obsolete profile files, file token persistence, file-build artifacts, and stale direct tests in scope.
- Mandatory ownership/decoupling/SoC rule: keep startup, token usage, and bootstrap responsibilities in their existing owners.
- Mandatory `Authoritative Boundary Rule`: token-usage callers should depend on `TokenUsageStore`, not on a registry/proxy indirection plus repository internals.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001` | startup/config | remove `persistence/profile.ts`; update `app-config.ts` and `startup/migrations.ts` | Stage 5 `Go` | establishes truthful startup behavior first |
| 2 | `DS-002` | token usage | rename SQL provider to `TokenUsageStore`; remove file/proxy/registry stack; update callers/tests | `DS-001` startup shape | makes the DB-backed persistence boundary authoritative |
| 3 | `DS-003` | bootstrap surfaces | remove file-build scripts/envs from Android, Docker, Electron, docs, and tests | `DS-001`, `DS-002` | finishes user-facing contract cleanup around the new runtime model |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| token-usage SQL boundary | `src/token-usage/providers/sql-persistence-provider.ts` | `src/token-usage/providers/token-usage-store.ts` | token usage | `Move` | build + integration tests |
| server token-usage integration test | `tests/integration/token-usage/providers/sql-persistence-provider.integration.test.ts` | `tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | token-usage validation | `Move` | vitest |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001` | startup/config | remove global profile contract from startup | `src/persistence/profile.ts`, `src/config/app-config.ts`, `src/startup/migrations.ts` | same minus removed file | `Remove`/`Modify` | Stage 5 `Go` | Completed | `tests/unit/config/app-config.test.ts` | Passed | `tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Passed | Passed | removes profile-driven SQLite init and migration skip |
| `C-002` | `DS-002` | token usage | make SQL store authoritative and remove file token persistence | `src/token-usage/providers/*`, token-usage callers | `src/token-usage/providers/token-usage-store.ts` | `Move`/`Modify`/`Remove` | `C-001` | Completed | `tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts` | Passed | `tests/integration/token-usage/providers/token-usage-store.integration.test.ts`, `tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Passed | Passed | removes proxy/registry/file-provider stack |
| `C-003` | `DS-003` | bootstrap surfaces | remove file build/env contract from scripts, Electron, Docker, docs | package/scripts/docker/electron/docs | same | `Modify`/`Remove` | `C-001`, `C-002` | Completed | `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | Passed | N/A | N/A | Passed | standard build/output only |
| `C-004` | `DS-002` | codex runtime | persist live Codex `thread/tokenUsage/updated` data through thread-owned readiness instead of backend raw parsing | `src/agent-execution/backends/codex/thread/*`, `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | same | `Create`/`Modify` | `C-002`, `AV-006` failure triage, Stage 8 `F-001` | Completed | `tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`, `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | Passed | `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`, `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Passed | Passed | `CodexThread` now owns per-turn token-usage readiness, `codex-thread-notification-handler.ts` owns raw token-usage parsing, and the backend persists only ready usages exposed by the thread boundary |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001`, `DS-003` | startup + ownership rules | `UC-001`, `UC-003` | `C-001`, `C-003` | unit + integration + source scan | `AV-001`, `AV-004`, `AV-005` |
| `R-002` | `AC-002` | `DS-002` | token-usage boundary | `UC-002` | `C-002`, `C-004` | unit + integration + codex runtime unit/e2e | `AV-002`, `AV-006` |
| `R-003` | `AC-003` | `DS-001` | startup/config | `UC-001` | `C-001` | unit + integration | `AV-003` |
| `R-004` | `AC-004` | `DS-003` | bootstrap cleanup | `UC-003` | `C-003` | build + source scan | `AV-004` |
| `R-005` | `AC-005` | `DS-001`, `DS-003` | bootstrap/docs cleanup | `UC-001`, `UC-003` | `C-003` | source scan + targeted test | `AV-005` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001`, `DS-003` | active runtime source no longer reads `PERSISTENCE_PROVIDER` | `AV-001` | API | Planned |
| `AC-002` | `R-002` | `DS-002` | token usage persists and aggregates through SQL only, including live Codex runtime turns | `AV-002`, `AV-006` | API | Planned |
| `AC-003` | `R-003` | `DS-001` | SQLite URL derivation and migrations remain correct without profile branching | `AV-003` | API | Planned |
| `AC-004` | `R-004` | `DS-003` | no file-build scripts or `dist-file` runtime path remain | `AV-004` | API | Planned |
| `AC-005` | `R-005` | `DS-001`, `DS-003` | bootstrap env/tests/docs are truthful | `AV-005` | API | Planned |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` | `C-001` | Yes | unit + source scan |
| `C-002` | `C-001` | No | unit + integration |
| `C-003` | `C-001` | No | build + integration |
| `C-004` | `C-002` | Yes | integration |
| `C-005` | `C-002` | No | integration |
| `C-006` | `C-002` | No | unit |
| `C-007` | `C-002` | Yes | source scan + tests |
| `C-008` | `C-002` | Yes | source scan + tests |
| `C-009` | `C-001` | Yes | source scan |
| `C-010` | `C-003` | No | build + source scan |
| `C-011` | `C-003` | Yes | source scan |
| `C-012` | `C-003` | No | source scan |
| `C-013` | `C-003` | No | electron test |
| `C-014` | `C-003` | No | source scan |
| `C-015` | `C-003` | No | docs review + tests |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | global persistence profile | `Remove` | delete profile file and all runtime callers | startup truthfulness regression if missed |
| `T-DEL-002` | token-usage proxy/file-provider stack | `Remove` | delete obsolete providers/tests and update callers | token-usage persistence regression if boundary rename incomplete |
| `T-DEL-003` | `build:file` / `dist-file` contract | `Remove` | delete build artifacts and update bootstrap surfaces | Android/bootstrap validation required |

### Step-By-Step Plan

1. Remove the startup/profile contract and keep DB initialization tied to `DB_TYPE`.
2. Collapse token usage onto `TokenUsageStore` and delete file/profile indirection.
3. Remove file-build outputs and clean bootstrap env generation.
4. Update tests and docs to the new truthful contract.
5. Run targeted validation and record Stage 7/8/9 evidence.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Spine Span Sufficiency preserved: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails: `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/remove-file-persistence-provider/code-review.md`
- Scope (source + tests): startup/config, token usage, package/scripts/docker/electron bootstrap, touched docs/tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: no changed source implementation file should cross the limit; current scope is expected to stay below it.
- per-file diff delta gate (`>220` changed lines) assessment approach: inspect touched source files individually and keep the cleanup split across startup, token usage, and bootstrap surfaces.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `src/startup/migrations.ts` | `267` | No | Low | Keep | `Local Fix` |
| `src/config/app-config.ts` | `492` | No | Low | Keep | `Local Fix` |
| `src/token-usage/providers/token-usage-store.ts` | `93` | Yes | Low | Keep | `Local Fix` |
| `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | `179` | Yes | Low | Keep | `Local Fix` |
| `src/agent-execution/backends/codex/thread/codex-thread.ts` | `404` | Yes | Medium | Keep | `Local Fix` |
| `src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | `95` | Yes | Low | Keep | `Local Fix` |
| `src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | `33` | Yes | Low | Keep | `Local Fix` |

### Test Strategy

- Unit tests: Codex thread/backend tests, config, and token-usage processor tests
- Integration tests: token-usage store/statistics and gateway runtime startup
- Stage 6 boundary: unit + integration only
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/in-progress/remove-file-persistence-provider/api-e2e-testing.md`
  - expected acceptance criteria count: `5`
  - critical flows to validate: startup without profile selection, SQL-only token usage persistence, bootstrap/env cleanup, standard build output
  - expected scenario count: `5`
  - known environment constraints: web electron test must use `autobyteus-web/electron/vitest.config.ts`
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/in-progress/remove-file-persistence-provider/code-review.md`
  - expected scorecard drag areas: cleanup completeness and validation breadth
  - predicted design-impact hotspots: none expected if bootstrap/docs cleanup is complete
  - files likely to exceed size/ownership/SoC thresholds: none expected

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/remove-file-persistence-provider/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/remove-file-persistence-provider/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-09: Stage 6 baseline created from the approved design and runtime review.
- 2026-04-09: Removed global persistence-profile startup logic and file-profile build artifacts.
- 2026-04-09: Renamed the SQL token-usage boundary to `TokenUsageStore` and removed file/proxy token persistence code.
- 2026-04-09: Updated Android, Docker, Electron, tests, and active docs to the subsystem-owned persistence contract.
- 2026-04-09: User-requested real E2E coverage reopened Stage 7 and exposed that live Codex `thread/tokenUsage/updated` events were emitted but not persisted into SQL-backed statistics.
- 2026-04-09: Implemented an initial bounded Codex runtime fix in `codex-agent-run-backend.ts` that closed the live persistence gap but was later rejected in Stage 8 because it parsed raw Codex protocol details above the documented owner boundary.
- 2026-04-09: Re-entry `T-015` reopened Stage 6 for a local owner-boundary correction after the independent Stage 8 rerun found the backend raw-event bypass.
- 2026-04-09: Moved raw token-usage parsing into `codex-thread-notification-handler.ts` and the new `codex-thread-token-usage.ts`, added thread-owned per-turn readiness state in `codex-thread.ts`, and narrowed `codex-agent-run-backend.ts` back to persisting ready usages exposed by `CodexThread`.
- 2026-04-09: Revalidated the owner-boundary fix with focused Codex thread/backend unit tests, token-usage SQL boundary tests, the live Codex token-usage GraphQL E2E, the existing Codex runtime restore E2E, and a fresh server build.
- 2026-04-09: Independent Stage 8 rerun passed after the thread-boundary ownership correction; no further Stage 6 local fix was required.
