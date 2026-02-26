# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: Feature spans frontend UI/store, GraphQL contract, backend run-history service logic, persistence layer behavior, and destructive disk IO safeguards.
- Workflow Depth:
  - `Medium` -> proposed design doc -> proposed-design-based runtime call stack -> runtime call stack review (minimum 3 rounds) -> implementation plan -> progress tracking

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes: This plan is ready for implementation kickoff; no unresolved design blockers remain.

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes
- Minimum review rounds satisfied:
  - `Small`: >= 1
  - `Medium`: >= 3
  - `Large`: >= 5
- Final gate decision in review artifact is `Implementation can start: Yes`: Yes

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope: UC-001..UC-006 (hard delete inactive historical runs).
- Touched Files/Modules: panel, runHistory store, run-history GraphQL resolver/service/index store, related tests.
- API/Behavior Delta: add `deleteRunHistory(runId)` mutation and UI delete affordance for inactive persisted rows.
- Key Assumptions:
  - Persisted run rows map to `memory/agents/<runId>`.
  - Active-run truth comes from backend `AgentInstanceManager`.
- Known Risks:
  - Path-safety errors in destructive delete path.
  - Local state cleanup regressions for selected/offline opened history runs.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UC-001..UC-006 | `tickets/history-run-hard-delete-memory/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-hard-delete-memory/runtime-call-stack-review.md` | Pass | Pass | Fail | Fail | Yes | Fail |
| 2 | UC-001..UC-006 | `tickets/history-run-hard-delete-memory/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-hard-delete-memory/runtime-call-stack-review.md` | Pass | Pass | Fail | Pass | Yes | Fail |
| 3 | UC-001..UC-006 | `tickets/history-run-hard-delete-memory/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-hard-delete-memory/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |
| 4 | UC-001..UC-006 | `tickets/history-run-hard-delete-memory/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-hard-delete-memory/runtime-call-stack-review.md` | Pass | Pass | Fail | Pass | Yes | Fail |
| 5 | UC-001..UC-006 | `tickets/history-run-hard-delete-memory/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-hard-delete-memory/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: 5
  - Final review round: 5
  - Final review gate line (`Implementation can start`): Yes
- If `No-Go`, required refinement target:
  - N/A

## Principles

- Bottom-up: backend contract and persistence safety before UI wiring.
- Test-driven: add/adjust unit tests alongside each change.
- Mandatory modernization rule: no backward-compat soft-delete or dual-path semantics.
- One file at a time default with minimal cross-reference overlap.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-server-ts/src/run-history/store/run-history-index-store.ts` | none | Establish row-removal primitive used by service. |
| 2 | `autobyteus-server-ts/src/run-history/services/run-history-service.ts` | step 1 | Implement safe destructive delete domain logic. |
| 3 | `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | step 2 | Expose mutation boundary after service behavior exists. |
| 4 | `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | step 3 | Add frontend GraphQL document for new API. |
| 5 | `autobyteus-web/stores/runHistoryStore.ts` | step 4 | Centralize delete action and local cleanup orchestration. |
| 6 | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | step 5 | UI wiring after store API exists. |
| 7 | test files (`C-007..C-011`) | steps 1-6 | Lock behavior and prevent regressions. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-003 | No | resolver unit tests |
| C-002 | Modify | T-002 | No | run-history service unit tests |
| C-003 | Modify | T-001 | No | index-store unit tests |
| C-004 | Modify | T-004 | No | compile + store tests |
| C-005 | Modify | T-005 | No | runHistoryStore unit tests |
| C-006 | Modify | T-006 | No | panel unit tests + manual check |
| C-007 | Modify | T-007 | No | panel vitest |
| C-008 | Modify | T-008 | No | store vitest |
| C-009 | Modify | T-009 | No | resolver vitest |
| C-010 | Modify | T-010 | No | service vitest |
| C-011 | Modify | T-011 | No | index-store vitest |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | N/A | N/A | N/A | No remove/rename items in this scope. |

## Step-By-Step Plan

1. T-001: Implement `removeRow(runId)` in `run-history-index-store` with queued write semantics.
2. T-002: Implement `RunHistoryService.deleteRunHistory(runId)` with active guard, runId/path safety validation, disk delete, and index row removal.
3. T-003: Add GraphQL mutation in `RunHistoryResolver` with success/failure payload mapping.
4. T-004: Add `DeleteRunHistory` mutation document in web GraphQL mutations.
5. T-005: Add `runHistoryStore.deleteRun(runId)` action with local cleanup and quiet refresh.
6. T-006: Add delete icon + confirmation + lock + toasts in `WorkspaceAgentRunsTreePanel` for inactive history rows only.
7. T-007..T-011: Add/adjust unit tests for panel/store/resolver/service/index-store.
8. T-012: Run targeted verification commands and complete manual UX check.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/store/run-history-index-store.ts` | `removeRow` deletes target row and is idempotent | `run-history-index-store.test.ts` covers delete + non-existing row | N/A | Must preserve write queue safety. |
| `autobyteus-server-ts/src/run-history/services/run-history-service.ts` | Hard delete with active guard + path safety + index cleanup | `run-history-service.test.ts` covers success/failure/invalid IDs | N/A | Never delete outside `memory/agents`. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Mutation added and delegated to service | `run-history-resolver.test.ts` success/failure | N/A | Keep message semantics stable. |
| `autobyteus-web/stores/runHistoryStore.ts` | `deleteRun` returns boolean and cleans local state only on success | `runHistoryStore.spec.ts` success/failure cleanup coverage | N/A | Must not own runtime terminate logic. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Delete icon shown only for inactive history rows; lock/confirm/toast behavior works | `WorkspaceAgentRunsTreePanel.spec.ts` icon visibility + click semantics | manual UI check for destructive confirmation | Ensure delete click does not select row. |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None active | Review rounds 1-3 completed with blockers resolved | N/A | Track during implementation if new cross-reference emerges | Pending |

## Test Strategy

- Unit tests:
  - `autobyteus-server-ts/tests/unit/run-history/run-history-index-store.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/run-history-service.test.ts`
  - `autobyteus-server-ts/tests/unit/api/graphql/types/run-history-resolver.test.ts`
  - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- Integration tests: N/A for initial implementation; can be added if cross-layer regressions appear.
- Test data / fixtures:
  - temp memory directories with `agents/<runId>/run_manifest.json` and `raw_traces.jsonl`.
  - mocked Apollo mutation responses in web unit tests.
