# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: Frontend architectural refactor across component/composable boundaries with behavior-preserving constraints and expanded test strategy.
- Workflow Depth:
  - `Medium` -> proposed design doc -> proposed-design-based runtime call stack -> runtime call stack review (minimum 3 rounds) -> implementation plan -> progress tracking

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Additional user-requested deep review (round 4) completed clean with no blockers.

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Minimum review rounds satisfied:
  - `Small`: >= 1
  - `Medium`: >= 3
  - `Large`: >= 5
- Final gate decision in review artifact is `Implementation can start: Yes`: `Yes`

## Solution Sketch (Optional For `Medium`)

- Use Cases In Scope: UC-001..UC-006 from proposed design.
- Touched Files/Modules:
  - `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - new subcomponents + composables + display utility + tests.
- API/Behavior Delta: No end-user behavior delta intended; internal view-layer boundaries refactored.
- Key Assumptions:
  - existing store APIs remain unchanged,
  - existing emitted events from root panel remain unchanged.
- Known Risks:
  - template extraction can accidentally break selectors or action wiring;
  - async action state regressions unless covered by focused composable tests.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UC-001..UC-006 | `tickets/workspace-runs-tree-panel-soc-refactor/proposed-design-based-runtime-call-stack.md` | `tickets/workspace-runs-tree-panel-soc-refactor/runtime-call-stack-review.md` | Pass | Pass | Pass | Fail | Yes | Fail |
| 2 | UC-001..UC-006 | same | same | Pass | Pass | Pass | Pass | No | Pass |
| 3 | UC-001..UC-006 | same | same | Pass | Pass | Pass | Pass | No | Pass |
| 4 (additional deep review) | UC-001..UC-006 | same | same | Pass | Pass | Pass | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: `4`
  - Final review round: `4`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write/add tests alongside each extraction boundary.
- Mandatory modernization rule: no backward-compatibility shims or dual old/new paths.
- One file at a time default, except tightly coupled extraction phases.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `utils/workspace/history/runTreeDisplay.ts` | N/A | Pure helper base for extracted components/composables. |
| 2 | `composables/workspace/history/useRunTreeViewState.ts` | runTreeDisplay helpers | Isolate local view state before component extraction. |
| 3 | `composables/workspace/history/useRunTreeActions.ts` | existing stores + run types | Centralize async side effects and pending maps. |
| 4 | `components/workspace/history/WorkspaceCreateInlineForm.vue` | N/A | Isolated form UI used by root panel/actions. |
| 5 | `components/workspace/history/WorkspaceRunsSection.vue` | runTreeDisplay + view state contract | Extract workspace/agent/run rendering. |
| 6 | `components/workspace/history/TeamRunsSection.vue` | runTreeDisplay + view state contract | Extract team/member rendering. |
| 7 | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | all above | Convert root to composition/wiring only. |
| 8 | tests updates/additions | all above | Verify extraction invariants and behavior parity. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-005 | No | component spec + panel integration |
| C-002 | Add | T-006 | No | component spec + panel integration |
| C-003 | Add | T-004 | No | component spec |
| C-004 | Add | T-003 | No | composable unit tests |
| C-005 | Add | T-001 | No | utility unit tests |
| C-006 | Modify | T-007 | Yes | panel integration tests |
| C-007 | Modify | T-008 | Yes | updated panel test suite |
| C-008 | Add | T-009 | No | targeted vitest commands |
| C-009 | Add | T-002 | No | composable unit tests |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Panel-local action handlers | Move/Remove | Delete migrated handlers from root after composable wiring. | Missing event wiring if partial removal. |
| T-DEL-002 | Panel-local expansion/avatar state handlers | Move/Remove | Delete local refs/functions after view-state composable adoption. | Selected row/expand behavior regression if missed. |
| T-DEL-003 | Panel-local inline create-workspace form markup | Move/Remove | Replace with extracted form component and remove old form block. | Keyboard/submit interaction drift. |

## Step-By-Step Plan

1. T-001: Add `runTreeDisplay` utility + unit tests.
2. T-002: Add `useRunTreeViewState` composable + unit tests.
3. T-003: Add `useRunTreeActions` composable + unit tests (selection/terminate/delete/workspace flows).
4. T-004: Add `WorkspaceCreateInlineForm.vue` + focused component tests.
5. T-005: Add `WorkspaceRunsSection.vue` + focused component tests.
6. T-006: Add `TeamRunsSection.vue` + focused component tests.
7. T-007: Refactor `WorkspaceAgentRunsTreePanel.vue` into wiring root only.
8. T-008: Update/extend `WorkspaceAgentRunsTreePanel.spec.ts` to validate root wiring and behavior parity.
9. T-009: Execute targeted vitest suite, then broader related suite.
10. T-010: Manual smoke checklist in running app (workspace tree interactions + team member rows).

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `utils/workspace/history/runTreeDisplay.ts` | Helpers exported and used by extracted modules | `runTreeDisplay.spec.ts` passing | N/A | Pure functions only |
| `composables/workspace/history/useRunTreeViewState.ts` | Expansion/avatar local state encapsulated | `useRunTreeViewState.spec.ts` passing | via panel spec | No store access |
| `composables/workspace/history/useRunTreeActions.ts` | Async actions + pending maps encapsulated | `useRunTreeActions.spec.ts` passing | via panel spec | Store side-effects preserved |
| `components/workspace/history/WorkspaceCreateInlineForm.vue` | Form UI extracted and events emitted | component spec passing | via panel spec | Keep `data-test` hooks |
| `components/workspace/history/WorkspaceRunsSection.vue` | Workspace/agent/run rendering extracted | component spec passing | via panel spec | Preserve titles/classes used by tests |
| `components/workspace/history/TeamRunsSection.vue` | Team/member rendering extracted | component spec passing | via panel spec | Preserve member-row behavior |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Root wiring only + unchanged external events | updated panel spec passing | existing integration tests unaffected | Remove obsolete local logic |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Additional blocker discovered during coding | Any extracted module causing circular ownership or behavior drift | `proposed-design.md` target state / module breakdown | immediate write-back + re-review | Pending |

## Test Strategy

- Unit tests:
  - `utils/workspace/history/__tests__/runTreeDisplay.spec.ts`
  - `composables/workspace/history/__tests__/useRunTreeViewState.spec.ts`
  - `composables/workspace/history/__tests__/useRunTreeActions.spec.ts`
  - component-level tests for extracted view components.
- Integration tests:
  - update `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` (root wiring / behavior parity).
  - run existing related integration test: `tests/integration/workspace-history-draft-send.integration.test.ts`.
- Test data / fixtures:
  - reuse existing mocked run/team node fixtures from panel spec; add focused fixtures for extracted components.
