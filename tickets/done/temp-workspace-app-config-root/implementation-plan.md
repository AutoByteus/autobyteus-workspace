# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning:
  - The change is localized to server temp-workspace path resolution, expectation updates, and matching documentation.
  - No new module boundary or cross-domain orchestration is required.
- Workflow Depth:
  - `Small` -> implementation plan -> future-state runtime call stack -> runtime call stack review -> implementation -> API/E2E testing -> code review -> docs sync

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/temp-workspace-app-config-root/workflow-state.md`
- Investigation notes: `tickets/in-progress/temp-workspace-app-config-root/investigation-notes.md`
- Requirements: `tickets/in-progress/temp-workspace-app-config-root/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/temp-workspace-app-config-root/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/temp-workspace-app-config-root/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes:
  - Stage 5 reached `Go Confirmed` and implementation followed this approved plan.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Pending`
- Runtime call stack review artifact exists and is current: `Pending`
- All in-scope use cases reviewed: `Pending`
- No unresolved blocking findings: `Pending`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Pending`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Pending`
- No newly discovered use cases in the final two clean rounds: `Pending`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001`: Default temp workspace root resolution with no override configured.
  - `UC-002`: Explicit `AUTOBYTEUS_TEMP_WORKSPACE_DIR` override remains supported.
  - `UC-003`: GraphQL workspace listing exposes the backend-selected temp workspace path.
- Requirement Coverage Guarantee:
  - `R-001`/`R-002` map to `UC-001`.
  - `R-003` maps to documentation sync plus no-regression checks in `UC-002`.
  - `R-004` maps to `UC-003`.
- Design-Risk Use Cases:
  - None; risk is bounded to configuration drift and test expectation drift.
- Target Architecture Shape (for `Small`, mandatory):
  - Keep path-selection policy inside `AppConfig.getTempWorkspaceDir()`.
  - Keep workspace creation in `WorkspaceManager`.
  - Keep frontend display passive; it renders backend-provided absolute path only.
- New Layers/Modules/Boundary Interfaces To Introduce:
  - None.
- Touched Files/Modules:
  - `autobyteus-server-ts/src/config/app-config.ts`
  - `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`
  - `autobyteus-server-ts/README.md`
- API/Behavior Delta:
  - Default temp workspace root changes from OS temp root to server-data-relative root.
  - Config override behavior stays the same.
- Key Assumptions:
  - Runtime consumers should continue calling `getTempWorkspaceDir()` rather than duplicating path logic.
  - No migration is required for previously created temp folders.
- Known Risks:
  - Live Claude runtime E2E may depend on environment not present in this session.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Keep default temp workspace policy centralized in app config.
- Preserve current override semantics.
- Avoid UI-side path heuristics or duplicate backend logic.
- Update tests that encode the old default so behavior and documentation stay aligned.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-server-ts/src/config/app-config.ts` | Design basis | Source of truth for default path resolution |
| 2 | `autobyteus-server-ts/tests/unit/config/app-config.test.ts` | `app-config.ts` | Validates direct config behavior |
| 3 | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | `app-config.ts` | Validates backend-selected path is exposed through GraphQL |
| 4 | `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` | `app-config.ts` | Keeps live-runtime expectation aligned |
| 5 | `autobyteus-server-ts/README.md` | Final implemented behavior | Synchronize docs after code/test behavior is final |

## Module/File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Temp workspace default policy | `autobyteus-server-ts/src/config/app-config.ts` | same | Server configuration | Keep | Unit tests + E2E assertions |
| Workspace API exposure check | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | same | Backend GraphQL E2E | Keep | Vitest GraphQL E2E run |
| Runtime live expectation | `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` | same | Backend runtime E2E | Keep | Targeted expectation update |
| Server behavior docs | `autobyteus-server-ts/README.md` | same | Server operator docs | Keep | Manual doc consistency review |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-003 | Solution Sketch | UC-001 | T-001 | Unit | AV-001 |
| R-002 | AC-001, AC-004 | Solution Sketch | UC-001 | T-001 | Unit | AV-001 |
| R-003 | AC-003, AC-004 | Solution Sketch | UC-002 | T-002 | Unit/Review | AV-002 |
| R-004 | AC-002 | Solution Sketch | UC-003 | T-003 | Unit | AV-001 |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Default temp workspace resolves under active app data dir when no override is configured | AV-001 | E2E | Planned |
| AC-002 | R-004 | GraphQL exposes the backend-selected temp workspace absolute path | AV-001 | E2E | Planned |
| AC-003 | R-003 | Override behavior remains unchanged and docs match implementation | AV-002 | API | Planned |
| AC-004 | R-002 | No OS-temp-root default remains in server config/test expectations | AV-002 | API | Planned |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Old OS-temp-root default expectation | Remove | Replace hard-coded `os.tmpdir()/autobyteus/temp_workspace` expectations with data-dir-relative expectations | Must update all affected tests/docs together |

## Step-By-Step Plan

1. Change the default temp workspace root in `AppConfig.getTempWorkspaceDir()` to `path.join(this.dataDir, "temp_workspace")`.
2. Update direct unit tests to assert the new default and preserve override semantics.
3. Add/update a GraphQL E2E assertion that a temp workspace created by backend config is exposed with the data-dir-relative absolute path.
4. Update live-runtime E2E expectation to match the new default path model.
5. Run targeted unit/E2E verification, then update README wording if needed.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/app-config.ts` | Default temp root uses `dataDir/temp_workspace` | `app-config.test.ts` passes | N/A | Override behavior unchanged |
| `autobyteus-server-ts/tests/unit/config/app-config.test.ts` | Expectations updated | Test file passes | N/A | Validate default + override |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Temp workspace GraphQL scenario added/updated | N/A | E2E passes | Validates API-visible path |
| `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` | Expected default temp path updated | N/A | Not executed unless live Claude env is available | Keep suite aligned |
| `autobyteus-server-ts/README.md` | Docs match implemented behavior | N/A | N/A | Stage 9 docs sync |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/temp-workspace-app-config-root/code-review.md`
- Scope (source + tests):
  - `autobyteus-server-ts/src/config/app-config.ts`
  - `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
  - `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/README.md`
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - None expected; touched source file remains below threshold.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - Record assessment during Stage 8; no file is expected to cross threshold.
- module/file placement review approach:
  - Ensure config logic stays in `app-config.ts` and test/doc updates stay in their current concern-specific files.

## Test Strategy

- Unit tests:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts`
- Integration tests:
  - None required for this bounded config policy change.
- Stage 6 boundary:
  - direct config behavior and affected backend wiring expectations.
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `4`
  - critical flows to validate (API/E2E):
    - GraphQL exposure of temp workspace path using backend-selected root.
    - No-regression override behavior via API-visible temp workspace.
  - expected scenario count: `2`
  - known environment constraints:
    - Live Claude runtime E2E may be infeasible without external model/runtime setup.

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-002 | R-001, R-004 | UC-001, UC-003 | E2E | GraphQL `workspaces` returns temp workspace rooted under configured app data dir |
| AV-002 | Requirement | AC-003, AC-004 | R-002, R-003 | UC-002 | API | Override semantics remain valid and no default OS-temp expectation remains |
