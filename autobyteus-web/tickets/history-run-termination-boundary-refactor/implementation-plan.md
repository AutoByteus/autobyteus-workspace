# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: Cross-store boundary correction (`runHistoryStore` vs `agentRunStore`) plus termination-ordering hardening, close-path unification, and residual-gap review.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes
- Minimum review rounds satisfied: Yes (5/3)
- Final gate decision in review artifact is `Implementation can start: Yes`: Yes

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UC-001..003 | `tickets/history-run-termination-boundary-refactor/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-termination-boundary-refactor/runtime-call-stack-review.md` | Pass | Pass | Fail | Fail | Yes | Fail |
| 2 | UC-001..003 | `tickets/history-run-termination-boundary-refactor/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-termination-boundary-refactor/runtime-call-stack-review.md` | Pass | Pass | Fail | Pass | Yes | Fail |
| 3 | UC-001..003 | `tickets/history-run-termination-boundary-refactor/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-termination-boundary-refactor/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |
| 4 | UC-001..004 | `tickets/history-run-termination-boundary-refactor/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-termination-boundary-refactor/runtime-call-stack-review.md` | Pass | Pass | Pass | Pass | No | Pass |
| 5 | UC-001..005 | `tickets/history-run-termination-boundary-refactor/proposed-design-based-runtime-call-stack.md` | `tickets/history-run-termination-boundary-refactor/runtime-call-stack-review.md` | Pass | Pass | Fail (UC-005) | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: 5
  - Final review round: 5
  - Final review gate line (`Implementation can start`): Yes

## Principles

- Keep history projection and runtime lifecycle orchestration separated.
- No compatibility path retaining deprecated `runHistoryStore.terminateRun`.
- Single terminate owner in `agentRunStore`.
- Persisted-run teardown must be backend-confirmed.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `stores/agentRunStore.ts` | existing mutation + context APIs | New owner API and ordering hardening first. |
| 2 | `stores/runHistoryStore.ts` | step 1 | Remove legacy terminate owner. |
| 3 | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | step 1 | UI rewires to runtime owner. |
| 4 | `stores/agentRunStore.ts:closeAgent` | step 1 | Eliminate duplicate terminate logic. |
| 5 | `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` + `stores/__tests__/agentRunStore.spec.ts` | steps 1-4 | Lock behavior and regressions. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-001 | No | Targeted vitest |
| C-002 | Remove | T-002 | Yes | Targeted vitest + source scan |
| C-003 | Modify | T-003 | No | Panel spec assertions |
| C-004 | Modify | T-004 | No | Panel spec assertions |
| C-005 | Modify | T-005 | No | AgentRun store tests |
| C-006 | Remove | T-006 | Yes | Panel spec pass |
| C-007 | Modify | T-007 | No | left panel + feedback tests |
| C-008 | Modify | T-008 | No | agentRun temp-path unit test |

## Step-By-Step Plan

1. Add `agentRunStore.terminateRun(runId)` with strict GraphQL result validation.
2. Remove `runHistoryStore.terminateRun` and keep history APIs projection-only.
3. Rewire panel terminate action to `agentRunStore`.
4. Harden persisted terminate ordering: backend-confirmed teardown.
5. Delegate `closeAgent(...,{terminate:true})` to `terminateRun`.
6. Update and run targeted tests.
7. Implemented: user-facing terminate failure feedback via shared `useToasts`.
8. Implemented: explicit `terminateRun(temp-*)` unit test coverage.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `stores/agentRunStore.ts` | Runtime terminate/close flows are unified and failure-safe | `stores/__tests__/agentRunStore.spec.ts` pass | N/A | Single owner boundary |
| `stores/runHistoryStore.ts` | No runtime teardown orchestration remains | compile/type compatible | N/A | Projection-only role |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Terminate button dispatches to runtime owner and prevents double clicks | panel spec pass | N/A | Active-only status indicator retained |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Mocks/assertions aligned with new owner | pass | N/A | Stale mock removed |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` (follow-up) | Failed terminate shows user-visible message | panel feedback test pass | N/A | Completed via `useToasts` |
| `stores/__tests__/agentRunStore.spec.ts` (follow-up) | Dedicated temp-run terminate path asserted | pass | N/A | Completed |
