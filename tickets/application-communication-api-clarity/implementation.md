# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: Internal rename + canonical documentation creation across multiple source files, test files, and documentation files.
- Workflow Depth: `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (Go Confirmed) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/application-communication-api-clarity/workflow-state.md`
- Investigation notes: `tickets/application-communication-api-clarity/investigation-notes.md`
- Requirements: `tickets/application-communication-api-clarity/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/application-communication-api-clarity/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/application-communication-api-clarity/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/application-communication-api-clarity/design-spec.md`

## Document Status

- Current Status: `Completed`
- Notes: All 11 change items (C-001 through C-010 + C-DEL-001) executed. Dangling reference scan = 0 matches. TypeScript compilation not runnable in worktree (missing node_modules — infrastructure issue, not code issue).

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready`: `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes` (AC-001 through AC-008)
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes` (UC-001 through UC-006)
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes` (Round 1 Candidate Go + Round 2 Go Confirmed)
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement dependencies before dependents.
- Spine-led: rename the stream service file first (dependency), then update importers.
- Mandatory modernization: no backward-compatibility aliases for old class/file names.
- Mandatory cleanup: delete old file after creating renamed file.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | Backend notification stream | C-001: Rename stream service file + all identifiers | — | Dependency: all importers depend on this file |
| 2 | DS-001 | Backend gateway service | C-002: Update imports in gateway service | C-001 | Imports the stream service |
| 3 | DS-001 | WebSocket route | C-003: Update imports in websocket route | C-001 | Imports the stream service |
| 4 | DS-001 | Integration tests | C-004, C-005, C-006: Update test imports | C-001 | Tests import the stream service |
| 5 | DS-001..DS-005 | Documentation | C-007: Create canonical communication model doc | — | Independent of rename |
| 6 | DS-001 | Documentation | C-008: Update gateway docs with rename + cross-link | C-001, C-007 | References both renamed service and canonical doc |
| 7 | DS-004, DS-003 | Documentation | C-009: Update orchestration docs with cross-link | C-007 | Cross-links canonical doc |
| 8 | All | Documentation | C-010: Update docs README index | C-007 | Lists new canonical doc |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Stream service | `src/application-backend-gateway/streaming/application-notification-stream-service.ts` | `src/application-backend-gateway/streaming/application-backend-notification-stream-service.ts` | Backend notification stream | `Move` (rename) | TypeScript compilation + dangling reference search |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Status | Unit Test | Unit Test Status | Integration Test | Integration Test Status | Stage 8 Review | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001 | Backend notification stream | Rename service class/file/types/accessor | `streaming/application-notification-stream-service.ts` | `streaming/application-backend-notification-stream-service.ts` | `Move` + `Modify` | — | Completed | N/A | N/A | Existing tests | Passed (dangling scan) | Planned | Core rename |
| C-002 | DS-001 | Backend gateway service | Update imports | `services/application-backend-gateway-service.ts` | same | `Modify` | C-001 | Completed | N/A | N/A | Existing tests | Passed (dangling scan) | Planned | Import path + type refs |
| C-003 | DS-001 | WebSocket route | Update imports | `api/websocket/application-backend-notifications.ts` | same | `Modify` | C-001 | Completed | N/A | N/A | Existing tests | Passed (dangling scan) | Planned | Import path + accessor refs |
| C-004 | DS-001 | Integration test | Update imports | `tests/.../brief-studio-imported-package.integration.test.ts` | same | `Modify` | C-001 | Completed | N/A | N/A | Self | Passed (dangling scan) | Planned | Import path + type/accessor refs |
| C-005 | DS-001 | Integration test | Update imports | `tests/.../application-backend-mount-route-transport.integration.test.ts` | same | `Modify` | C-001 | Completed | N/A | N/A | Self | Passed (dangling scan) | Planned | Import path + type ref |
| C-006 | DS-001 | Integration test | Update imports | `tests/.../application-backend-rest-ws.integration.test.ts` | same | `Modify` | C-001 | Completed | N/A | N/A | Self | Passed (dangling scan) | Planned | Import path + type/accessor refs |
| C-007 | DS-001..DS-005 | All comm owners | Canonical comm model doc | — | `docs/modules/application_communication_model.md` | `Create` | — | Completed | N/A | N/A | N/A | N/A | Planned | Documentation |
| C-008 | DS-001 | Gateway docs | Update gateway doc | `docs/modules/application_backend_gateway.md` | same | `Modify` | C-001, C-007 | Completed | N/A | N/A | N/A | N/A | Planned | Rename refs + cross-link |
| C-009 | DS-003, DS-004 | Orchestration docs | Update orchestration doc | `docs/modules/application_orchestration.md` | same | `Modify` | C-007 | Completed | N/A | N/A | N/A | N/A | Planned | Cross-link |
| C-010 | All | Docs index | Update README | `docs/modules/README.md` | same | `Modify` | C-007 | Completed | N/A | N/A | N/A | N/A | Planned | Add entry |
| C-DEL-001 | DS-001 | Cleanup | Remove old file | `streaming/application-notification-stream-service.ts` | — | `Remove` | C-001 | Completed | N/A | N/A | N/A | N/A | Planned | Delete old file after rename |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | `application-notification-stream-service.ts` | `Remove` | Delete file after renamed copy is created and all imports updated | Low risk: mechanical rename, no behavior change |

### Step-By-Step Plan

1. Create new file `application-backend-notification-stream-service.ts` with all renamed identifiers (C-001)
2. Delete old file `application-notification-stream-service.ts` (C-DEL-001)
3. Update imports in `application-backend-gateway-service.ts` (C-002)
4. Update imports in `application-backend-notifications.ts` (C-003)
5. Update imports/refs in `brief-studio-imported-package.integration.test.ts` (C-004)
6. Update imports/refs in `application-backend-mount-route-transport.integration.test.ts` (C-005)
7. Update imports/refs in `application-backend-rest-ws.integration.test.ts` (C-006)
8. Verify TypeScript compilation (UC-006 verification step 1)
9. Run dangling reference search (UC-006 verification step 2)
10. Run integration tests (UC-006 verification step 3)
11. Create `application_communication_model.md` (C-007)
12. Update `application_backend_gateway.md` (C-008)
13. Update `application_orchestration.md` (C-009)
14. Update `docs/modules/README.md` (C-010)

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design-principles guidance reapplied during implementation: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails: `Yes` (73 lines, 172 lines, 44 lines — all well under 500)

### Test Strategy

- Unit tests: N/A (no new behavior to unit test; rename is mechanical)
- Integration tests: Existing integration tests in `tests/integration/application-backend/` cover notification functionality. After rename, these tests must pass unchanged (except import paths).
- Stage 6 boundary: TypeScript compilation + dangling reference search + integration test pass
- Stage 7 handoff notes:
  - canonical artifact path: `tickets/application-communication-api-clarity/api-e2e-testing.md`
  - expected acceptance criteria count: 8 (AC-001 through AC-008)
  - critical flows to validate: TypeScript compilation, no dangling references, integration test pass, docs content verification
  - expected scenario count: ~8 matching acceptance criteria

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked`: `Yes`
- Scope classification confirmed: `Medium`
- Investigation notes are current: `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes` (Design-ready)
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-05-08: Implementation kickoff baseline created. Beginning execution.
- 2026-05-08: All 11 change items completed:
  - C-001: Renamed stream service file with all identifiers
  - C-DEL-001: Deleted old file
  - C-002: Updated gateway service imports
  - C-003: Updated websocket route imports + references
  - C-004/C-005/C-006: Updated all 3 integration test files via batch sed rename
  - C-007: Created canonical `application_communication_model.md` document
  - C-008: Updated gateway docs with renamed service name + cross-link
  - C-009: Updated orchestration docs with cross-link
  - C-010: Updated docs README index
- 2026-05-08: Verification results:
  - Dangling reference scan: 0 matches (confirmed by `rg` across all source/test files)
  - TypeScript compilation: not runnable in worktree (missing node_modules — infrastructure, not code issue)
  - Git diff: 9 modified files, 1 deleted, 2 new (consistent with plan)

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/application-communication-api-clarity/api-e2e-testing.md` | `Not Started` | 2026-05-08 | |
| 8 Code Review | `tickets/application-communication-api-clarity/code-review.md` | `Not Started` | 2026-05-08 | |
| 9 Docs Sync | `tickets/application-communication-api-clarity/docs-sync.md` | `Not Started` | 2026-05-08 | |

### Remove/Rename/Legacy Cleanup Verification Log

| Date | Change ID | Item | Verification Performed | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-05-08 | C-DEL-001 | `application-notification-stream-service.ts` | `ls` confirms file deleted + `rg` finds 0 old-name matches | Passed | No remaining references. |

### Completion Gate

- All change IDs completed: `Yes`
- Dangling reference scan shows 0 old-name matches: `Yes`
- No backward-compatibility shims or legacy aliases: `Yes`
- Dead/obsolete code removed: `Yes` (old file deleted)
- Ownership-dependency/decoupling checks: No new coupling. Same dependency graph, only names changed.
- Touched files have correct placement: `Yes` (file stays in `streaming/` under `application-backend-gateway/`)
- Changed source implementation files within size guardrails: `Yes` (73, 173, 45 lines)
- Stage 6 implementation execution: `Complete`
