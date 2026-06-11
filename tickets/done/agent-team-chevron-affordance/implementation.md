# Implementation

## Scope Classification
- Classification: `Small`
- Reasoning: The change is localized to the workspace history sidebar row presentation and accessibility metadata in one Vue component, with focused tests. No backend, store, query, or route ownership changes are needed.
- Workflow Depth: `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review -> finalize baseline -> implementation execution.

## Upstream Artifacts
- Workflow state: `tickets/in-progress/agent-team-chevron-affordance/workflow-state.md`
- Investigation notes: `tickets/in-progress/agent-team-chevron-affordance/investigation-notes.md`
- Requirements: `tickets/in-progress/agent-team-chevron-affordance/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/agent-team-chevron-affordance/future-state-runtime-call-stack.md` (pending Stage 4)
- Future-state runtime call stack review: `tickets/in-progress/agent-team-chevron-affordance/future-state-runtime-call-stack-review.md` (pending Stage 5)
- Proposed design: N/A for Small scope.

## Document Status
- Current Status: `Ready For Implementation`
- Notes: Stage 5 reached `Go Confirmed`; implementation can start after `workflow-state.md` records Stage 6 with code edit permission unlocked.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)
- `requirements.md` is at least `Design-ready`: Yes
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: Yes
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: Yes
- Runtime call stack review artifact exists and is current: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes
- Future-state runtime call stack review has `Go Confirmed`: Yes
- Missing-use-case discovery sweeps completed for the final two clean rounds: Yes
- No newly discovered use cases in the final two clean rounds: Yes

### Solution Sketch
- Use Cases In Scope:
  - `UC-001`: Team-definition row disclosure is easy to identify.
  - `UC-002`: Team-run row disclosure is easy to identify.
  - `UC-003`: Existing click/expand/select behavior remains intact.
  - `UC-004`: Automated and browser validation prove the visual/accessibility update.
- Spine Inventory In Scope:
  - `DS-001` Primary UI render spine: `Run history data/state -> WorkspaceAgentRunsTreePanel bindings -> WorkspaceHistoryWorkspaceSection team rows -> rendered disclosure affordance -> user recognition/click`.
  - `DS-002` Interaction state spine: `User click -> existing row handler -> useWorkspaceHistorySelectionActions/useWorkspaceHistoryTreeState -> expanded state -> WorkspaceHistoryWorkspaceSection re-render`.
- Primary Owners / Main Domain Subjects:
  - `WorkspaceHistoryWorkspaceSection.vue` owns row-level visual presentation for workspace history tree rows.
  - `useWorkspaceHistoryTreeState.ts` owns expansion state; no changes planned.
  - `useWorkspaceHistorySelectionActions.ts` owns team selection/toggle side effects; no changes planned.
- Requirement Coverage Guarantee: All requirements map to at least one use case in `requirements.md`.
- Design-Risk Use Cases:
  - `UC-DR-001`: Ensure making the chevron more prominent does not accidentally change row click behavior or introduce a separate nested button that breaks current click targets.
- Target Architecture Shape:
  - Keep the current component ownership. Improve the visual affordance inline where team definition/team run rows are rendered.
  - Use a non-interactive inline wrapper/span for the chevron area rather than a nested button, preserving the existing row button as the single interactive boundary.
  - Add `aria-expanded` to team run row buttons to match the visual disclosure semantics already present on workspace/agent/team-definition rows.
- New Owners/Boundary Interfaces To Introduce: None.
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - No backend API or store behavior delta.
  - UI delta: parent team-definition chevron keeps its original compact standalone treatment; individual team-run chevrons match the parent chevron size, shape, and gray color exactly, with no blue, enlargement, square, border, background, or shadow; team run row exposes `aria-expanded`; no new blue/focus-ring styling is added to the team-run row.
- Key Assumptions:
  - Tailwind classes are acceptable for localized styling consistency.
  - Repeated inline class strings are acceptable for two rows; no new shared component is needed unless implementation reveals duplication/maintenance concerns.
- Known Risks:
  - Adding nested interactive elements would be wrong; the design intentionally keeps one button per row.

### Runtime Call Stack Review Gate Summary
| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision
- Decision: `Go`
- Evidence:
  - Final review round: Round 2.
  - Clean streak at final round: 2.
  - Final review gate line (`Implementation can start`): Yes.

### Principles
- Bottom-up: adjust row markup/classes first, then tests, then validation.
- Test-driven: add/update focused tests for disclosure accessibility/class affordance where practical.
- Mandatory modernization rule: no compatibility shims or alternate old/new rendering path.
- Mandatory ownership/SoC rule: keep row presentation in the existing row-rendering component; do not move state/action behavior.
- Mandatory file-placement rule: changed files stay in `autobyteus-web/components/workspace/history/` ownership.
- Mandatory proactive size-pressure rule: measure source file line count/diff during Stage 8; expected change is well under delta and file-size thresholds.

### Spine-Led Dependency And Sequencing Map
| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | Workspace history row presentation | Modify `WorkspaceHistoryWorkspaceSection.vue` team disclosure markup/classes and team-row `aria-expanded` | Stage 5 Go | Core visual affordance lives here. |
| 2 | DS-002 | Workspace history tests | Update focused `WorkspaceAgentRunsTreePanel.spec.ts` expectations for team row `aria-expanded` and disclosure affordance markers/classes | Task 1 | Verifies behavior/accessibility after render changes. |
| 3 | DS-001/DS-002 | Validation | Run focused Vitest and browser visual inspection | Tasks 1-2 | Proves acceptance criteria. |

### File Placement Plan
| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Team sidebar row presentation | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Same | Workspace history sidebar UI rows | Keep/Modify | Focused tests + browser visual inspection |
| Workspace history component tests | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Same | Workspace history sidebar tests | Keep/Modify | Vitest focused run |

### Implementation Work Table
| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001 | Workspace history row presentation | Stronger team disclosure affordance and team run `aria-expanded` | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Same | Modify | Stage 5 Go | Completed | `WorkspaceAgentRunsTreePanel.spec.ts` | Passed | N/A | N/A | Planned | Preserve single row button click boundary. |
| C-002 | DS-002 | Workspace history tests | Verify disclosure accessibility/affordance selectors | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Same | Modify | C-001 | Completed | Same | Passed | N/A | N/A | Planned | Use existing mock data. |

### Requirement, Spine, And Design Traceability
| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | AC-001, AC-002, AC-003 | DS-001 | Solution Sketch | UC-001, UC-002 | C-001 | Focused component render assertions | SCN-001, SCN-002, SCN-003 |
| REQ-002 | AC-003, AC-004 | DS-002 | Solution Sketch | UC-003 | C-001, C-002 | Existing expansion/selection tests | SCN-001, SCN-002 |
| REQ-003 | AC-005 | DS-002 | Solution Sketch | UC-002, UC-004 | C-001, C-002 | Team row `aria-expanded` assertions | SCN-002 |
| REQ-004 | AC-006 | DS-001/DS-002 | Test Strategy | UC-004 | C-002 | Vitest and browser inspection | SCN-003 |

### Stage 7 Planned Coverage Mapping
| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | DS-001 | Team-definition disclosure is visibly stronger | SCN-001, SCN-003 | Browser/UI | Planned |
| AC-002 | REQ-001 | DS-001 | Team-run disclosure is visibly stronger | SCN-002, SCN-003 | Browser/UI | Planned |
| AC-003 | REQ-001/REQ-002 | DS-001/DS-002 | Rotation/state remains clear | SCN-001, SCN-002 | Component/UI | Planned |
| AC-004 | REQ-002 | DS-002 | Existing behavior remains intact | SCN-001, SCN-002 | Component/UI | Planned |
| AC-005 | REQ-003 | DS-002 | Team run row has accurate `aria-expanded` | SCN-002 | Component/UI | Planned |
| AC-006 | REQ-004 | DS-001 | Browser visual inspection attempted | SCN-003 | Browser-E2E | Planned |

### Decommission / Rename Execution Tasks
No decommission, rename, or move tasks are planned.

### Step-By-Step Plan
1. Modify team-definition and team-run disclosure icon markup/classes in `WorkspaceHistoryWorkspaceSection.vue` with a compact, rounded affordance wrapper and stronger hover/focus color treatment.
2. Add `aria-expanded` to team run row buttons.
3. Add/update focused component tests for team run `aria-expanded` and disclosure affordance markers.
4. Run focused tests and, if feasible, Nuxt dev browser verification against the Electron backend.

### Backward-Compat And Decoupling Guardrails
- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes` (none introduced)
- Shared design-principles guidance reapplied during implementation: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails: Pending measurement in Stage 8.

### Code Review Gate Plan (Stage 8)
- Gate artifact path: `tickets/in-progress/agent-team-chevron-affordance/code-review.md`
- Scope: changed Vue component and focused test file.
- line-count measurement command: `rg -n "\\S" <file-path> | wc -l`; changed-line delta command: `git diff --numstat origin/personal...HEAD -- <file-path>`.
- Expected risk: Low; no file moves, new APIs, or data-flow changes.

### Test Strategy
- Unit/component tests: focused Vitest run for `WorkspaceAgentRunsTreePanel.spec.ts`.
- Integration tests: not required for backend/API because behavior is presentation-only and existing store/action boundaries remain unchanged.
- Browser/UI executable validation: run Nuxt dev frontend against `localhost:8000` backend and inspect the left Agents sidebar for the stronger disclosure affordance.

## Execution Tracking

### Kickoff Preconditions Checklist
- Workflow state is current: Yes
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: Yes.
- Scope classification confirmed: Small
- Investigation notes are current: Yes
- Requirements status is `Design-ready` or `Refined`: Yes
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: Pending Stage 5
- Future-state runtime call stack review reached `Go Confirmed`: Pending Stage 5
- No unresolved blocking findings: Yes

### Progress Log
- 2026-06-11: Stage 3 small-scope solution sketch created. Source code edits remain locked.
- 2026-06-11T05:34:56Z: Initial implementation rendered larger rounded disclosure affordances for both team definition and team run rows, and added `aria-expanded` to team run row buttons. Superseded by the 2026-06-11 re-entry correction below.
- 2026-06-11T05:34:56Z: Updated `WorkspaceAgentRunsTreePanel.spec.ts` to assert affordance classes and team run expanded state.

### Downstream Stage Status Pointers
| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/agent-team-chevron-affordance/api-e2e-testing.md` | Passed | 2026-06-11T05:37:38Z | Stage 6 tests passed; Stage 7 browser validation next. |
| 8 Code Review | `tickets/in-progress/agent-team-chevron-affordance/code-review.md` | Pass | 2026-06-11T05:37:38Z | Planned after Stage 7 pass. |
| 9 Docs Sync | `tickets/in-progress/agent-team-chevron-affordance/docs-sync.md` | Updated | 2026-06-11T05:46:48Z | Updated workspace history progressive disclosure docs. |

- 2026-06-11: Stage 5 review reached Go Confirmed. Implementation is ready to start after Stage 6 unlock is persisted.


### Stage 6 Completion Update
- 2026-06-11T05:37:38Z: Focused component test passed: `pnpm --dir autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` (37 tests passed).
- 2026-06-11T05:37:38Z: Regression/integration history tests passed: `pnpm --dir autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` (6 tests passed).
- 2026-06-11T05:37:38Z: `git diff --check` passed.
- 2026-06-11T05:37:38Z: Source file effective non-empty line count: `WorkspaceHistoryWorkspaceSection.vue` = 362 (`<=500`); diff delta = 25 additions / 12 deletions (`<=220` changed-line pressure threshold).
- No backward-compatibility shims, legacy branches, dead code, file moves, or new dependencies introduced.

- 2026-06-11T05:42:56Z: Stage 7 executable validation passed; see `api-e2e-testing.md`.

- 2026-06-11T05:45:10Z: Stage 8 code review passed; see `code-review.md`.

- 2026-06-11T05:46:48Z: Stage 9 docs sync updated `agent_execution_architecture.md` and `settings.md`; see `docs-sync.md`.


## Re-entry Correction - 2026-06-11

User verification clarified that the previous bordered/square disclosure treatment was applied too broadly and used the wrong visual language. Corrective scope:

- Restore the parent team-definition row to its original standalone chevron treatment.
- Remove bordered/square disclosure wrappers.
- Keep the individual team-run chevron visually identical to the parent team chevron: same icon, `h-3.5 w-3.5`, and `text-gray-400`.

## Re-entry Execution Log

- 2026-06-11T06:10:47Z: Re-entry correction implemented: restored parent team-definition row to its original compact standalone chevron; changed individual team-run rows back to the same compact gray chevron treatment as the parent row with no rounded/bordered/shadow wrapper, no blue color, and no larger size; kept `aria-expanded` on team-run row buttons. Focused/regression Vitest suites and `git diff --check` passed.

- 2026-06-11T06:14:00Z: Follow-up user clarification applied: individual team-run chevrons now use the same compact gray chevron as the parent team row (`h-3.5 w-3.5 text-gray-400`), with no blue and no larger size.

- 2026-06-11T06:16:00Z: Removed the temporary team-run button focus-ring/rounded styling so the run-row button also matches the previous visual treatment; retained only `aria-expanded` and the matching compact gray chevron. Validation commands passed again.
