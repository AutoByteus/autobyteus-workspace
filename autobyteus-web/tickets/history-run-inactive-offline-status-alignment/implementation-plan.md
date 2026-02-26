# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: Status semantics correction touches run-open orchestration, runtime status presentation contract, and regression coverage for inactive vs active open flows.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes
- Minimum review rounds satisfied: Yes (4/3)
- Final gate decision in review artifact is `Implementation can start: Yes`: Yes

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UC-001..004 | `tickets/history-run-inactive-offline-status-alignment/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-inactive-offline-status-alignment/runtime-call-stack-review.md` | Pass | Pass | Fail | Fail | Yes | Fail |
| 2 | UC-001..004 | `tickets/history-run-inactive-offline-status-alignment/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-inactive-offline-status-alignment/runtime-call-stack-review.md` | Pass | Pass | Fail | Pass | Yes | Fail |
| 3 | UC-001..004 | `tickets/history-run-inactive-offline-status-alignment/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-inactive-offline-status-alignment/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |
| 4 | UC-001..004 | `tickets/history-run-inactive-offline-status-alignment/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-inactive-offline-status-alignment/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: 4
  - Final review round: 4
  - Final review gate line (`Implementation can start`): Yes

## Principles

- Keep status assignment ownership in run-open orchestration (`runOpenCoordinator`).
- Do not add backend enum variants for this UI contract correction.
- Preserve current active-run stream attach behavior.
- No compatibility fallback to inactive->`Idle`.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `services/runOpen/runOpenCoordinator.ts` | existing open flow | Introduce status semantics fix at owner boundary first. |
| 2 | `stores/__tests__/runHistoryStore.spec.ts` | step 1 | Lock behavior with inactive-open/active-open regression assertions. |
| 3 | targeted test run | steps 1-2 | Verify no regressions in open/history status behavior. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Modify | T-001 | No | runHistoryStore targeted test + manual workspace status check |
| C-002 | Modify | T-002 | No | vitest targeted run |
| C-003 | Modify | T-003 | No | artifact completeness check |

## Step-By-Step Plan

1. T-001: In `runOpenCoordinator`, set hydrated status for inactive history open to `AgentStatus.ShutdownComplete`.
2. T-002: Add/adjust unit test in `runHistoryStore.spec.ts` to assert inactive open hydrates as `ShutdownComplete` and does not connect stream.
3. T-003: Run focused tests for run-open and run-history behaviors.
4. T-004: Manual validation in workspace: open inactive history run shows `Offline`; open active run preserves live behavior.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `services/runOpen/runOpenCoordinator.ts` | Inactive history open maps to `ShutdownComplete`; active maps to `Uninitialized` | Covered via `runHistoryStore.spec.ts` openRun tests | N/A | Owner of hydration status decision |
| `stores/__tests__/runHistoryStore.spec.ts` | Contains explicit inactive-open and active-open assertions | tests pass | N/A | Must verify no stream connect when inactive |
