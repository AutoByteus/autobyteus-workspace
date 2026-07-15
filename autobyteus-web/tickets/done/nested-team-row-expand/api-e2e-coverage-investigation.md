# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-row-expand/autobyteus-web/tickets/in-progress/nested-team-row-expand/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-row-expand/autobyteus-web/tickets/in-progress/nested-team-row-expand/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-row-expand/autobyteus-web/tickets/in-progress/nested-team-row-expand/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-row-expand/autobyteus-web/tickets/in-progress/nested-team-row-expand/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-row-expand/autobyteus-web/tickets/in-progress/nested-team-row-expand/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-row-expand/autobyteus-web/tickets/in-progress/nested-team-row-expand/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and handed off for API/E2E coverage investigation/execution on 2026-07-05.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior change is limited to the `autobyteus-web` workspace history tree UI. Stable nested `agent_team` member rows with children must toggle expansion/collapse when the user activates the row body by click, Enter, or Space, and must also preserve the existing team-member select/focus path. Stable leaf member rows remain select-only. Stable disclosure/chevron controls remain visible, stopped, and toggle-only so they do not bubble into row selection or double-toggle. Transient task-team rows in the same tree must follow the same row-body toggle-plus-select policy when they have children; transient leaves remain select-only. Backend APIs, persistence, team metadata shape, top-level tree expansion policy, and unrelated action controls are out of scope.

The reviewed design requires the implementation to reuse `useWorkspaceHistoryTreeState` via the section `state.toggleTeamMember(...)` boundary, preserve selection through `actions.onSelectTeamMember(...)`, and keep `WorkspaceTransientExecutionRow.vue` as a presentational emitter. The implementation handoff's `Legacy / Compatibility Removal Check` states that no backward-compatibility mechanism was introduced and the old select-only row-body behavior for disclosure-bearing stable/transient rows was replaced directly. Code review passed with no open findings and confirmed no flags, wrappers, dual paths, or legacy branches preserve the old chevron-only expansion behavior.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Stable nested `agent_team` row body click toggles expansion while preserving select/focus | Changed | Requirements FR-001/FR-002, AC-001/AC-002; design DS-001; implementation handoff `What Changed` | Must be covered by panel-level DOM interaction and component-level state/action assertions. |
| Stable nested `agent_team` row body Enter/Space matches click | Added | Requirements FR-006/AC-005; design off-spine keyboard parity | Must be covered by component-level keyboard interaction assertions. |
| Stable chevron/disclosure remains toggle-only and stopped | Preserved | Requirements FR-003/FR-004, AC-003; design DS-002; design review residual risk | Existing/updated coverage must verify no selection and no double-toggle. |
| Stable leaf rows remain select-only with no expansion behavior | Preserved | Requirements FR-005/AC-004 | Component coverage must verify leaf click does not call expansion. |
| Transient task-team row body toggles plus selects when it has children | Changed | Requirements FR-007/AC-006; design DS-003; implementation handoff | Component coverage must verify body toggles children and calls selection. |
| Transient task-team chevron remains stopped toggle-only | Preserved | Requirements FR-004/FR-007/AC-006; design DS-003 | Component coverage must verify disclosure toggles without selection. |
| Existing independent row action controls do not accidentally toggle nested expansion | Preserved | Requirements FR-008/AC-007; design excludes unrelated action controls | Existing action-control tests are adjacent; changed code did not touch these controls. Run focused history regression coverage. |
| Backend/API persistence, models, and top-level tree policy | Preserved / Out Of Scope | Requirements Out of Scope; design `No backend, data-model, or store-shape changes` | No API contract or backend E2E coverage needed. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — nested members collapsed by default with disclosure | Real panel wiring renders nested team row, hides child until expanded, and exposes `workspace-team-member-disclosure` with `aria-expanded=false`. | FR-003, AC-001 precondition, design DS-001/DS-002 | Still Valid | The behavior remains required; code review confirmed this suite was updated and passed. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — chevron toggles without selecting | Disclosure click toggles children open/closed and `runHistoryStore.selectTreeRun` is not called. | FR-003/FR-004, AC-003, DS-002 | Still Valid | Requirements explicitly preserve chevron toggle-only behavior and stopped propagation. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — nested row body toggles and selects | Real panel row-body click expands/collapses children and selects the nested team member through `selectTreeRun`. | FR-001/FR-002, AC-001/AC-002, DS-001 | Still Valid | Test was updated before code review from select-only to toggle-plus-select, matching current requirements. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — focused nested child remains visible / member selection paths | Selection/focus behavior continues through run history store and visible descendants remain consistent. | FR-002, AC-004, DS-004 | Still Valid | Selection/focus preservation remains required. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` — stable leaf row click is select-only | A stable row without children calls `onSelectTeamMember` and does not call `toggleTeamMember`. | FR-005, AC-004 | Still Valid | Leaf rows must not gain expansion semantics. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` — stable nested row body click and keyboard toggle/select | Stable nested team row body click expands/collapses; Enter/Space match; `toggleTeamMember` and `onSelectTeamMember` receive expected identities. | FR-001/FR-002/FR-006, AC-001/AC-002/AC-005, DS-001 | Still Valid | Directly covers the primary stable row activation spine. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` — stable nested disclosure toggle-only | Disclosure click expands without calling `onSelectTeamMember`. | FR-003/FR-004, AC-003, DS-002 | Still Valid | Directly covers stopped chevron propagation at component boundary. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` — transient task-team row body and disclosure behavior | Transient task-team body toggles children and selects; transient disclosure toggles without selection; transient task-agent leaf remains select-only. | FR-007, AC-006, DS-003 | Still Valid | Directly covers transient alignment and leaf preservation. | Execute in final focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Broader history panel regressions around team row opening, selected team visibility, and action control behavior. | FR-008/AC-007 adjacent safety; DS-004 | Still Valid | Existing regressions still represent current behavior and help detect unintended tree-policy regressions. | Execute as broadened focused history coverage. |
| `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | Historical team row/member selection hydrates focused members and updates selection store. | FR-002, DS-004 | Still Valid | Row-body activation must preserve selection/hydration; this integration remains valid. | Execute as broadened focused history coverage. |
| `autobyteus-web/utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` | Stable/transient display rows preserve ordering, depth, and transient kind separation. | FR-007 setup, DS-003 display-row basis | Still Valid | Transient has-children detection depends on stable row ordering/depth; utility behavior remains current. | Execute supporting unit coverage. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts` | Selection resolves exact nested member route keys and uses the run-history selection boundary. | FR-002, DS-004 | Still Valid | Selection/focus path must remain authoritative and route-key based. | Execute supporting unit coverage. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Workspace/agent/team expansion state and selected-run reveal behavior. | State boundary supporting DS-001/DS-002 | Still Valid | Not directly nested-member row activation, but validates the existing tree-state boundary remains healthy. | Execute supporting unit coverage. |
| Repository browser/E2E harness (`playwright`, `cypress`, `e2e`) | No repository-resident browser E2E test harness/config was found under `autobyteus-web` beyond `playwright-core` dependency. | Code review residual risk requests API/E2E investigation of browser-level validation. | Out Of Scope | `package.json` exposes Vitest/Nuxt/Electron tests, but no Playwright/Cypress scripts or config for this UI area. The changed behavior is pure Vue event wiring with existing happy-dom component coverage. | Do not add a new E2E framework in this small task; rely on focused component/integration coverage and record browser E2E as not tested. |
| Backend/API tests | No changed backend/API boundary. | Requirements Out of Scope; design says no backend/API/data-model changes. | Out Of Scope | Changed files are UI components and tests only; no GraphQL/API contract touched. | No API tests required. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage found during API/E2E investigation. The old select-only row-body expectation had already been updated before code review. | Requirements FR-001/FR-007 and design Legacy Removal Policy reject old select-only behavior for disclosure-bearing rows. | Reviewed tests now assert row-body toggle-plus-select and chevron toggle-only behavior. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | No additional durable coverage needs to be added after the initial code review. | Existing reviewed component/panel tests cover required stable, transient, keyboard, leaf, and chevron behavior. | N/A | Adding a browser E2E framework or broader durable tests would be disproportionate for this UI-only event-wiring change. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No coverage updates required after code review. | N/A | Existing test updates were already included in the implementation and code-review scope. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage requires removal. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| N/A | No temporary probe is required. Final validation will use repository-resident Vitest component/integration coverage plus `git diff --check`. | N/A | N/A |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real browser/Electron pointer event execution for the row-body/chevron interactions | No repository browser E2E harness/config or script exists for `autobyteus-web`; introducing one would be outside this small UI task. The same DOM event handlers are covered in Vue Test Utils/happy-dom focused component and panel tests. | Low; behavior is local Vue event composition and selectors/propagation are asserted by durable component tests. | None required for this task. If a browser/Electron E2E harness is later introduced, this scenario is a good candidate. |
| Backend/API contract behavior | Requirements and design explicitly exclude backend, persistence, and data-model changes. | None for this task. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No ambiguity, compatibility mechanism, stale-test conflict, or implementation reroute trigger found. | N/A |

## Execution Plan

1. Do not add, update, or remove repository-resident durable coverage after the initial code review.
2. Run whitespace/diff integrity: `git diff --check` from `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-row-expand`.
3. Run the reviewed focused component/panel coverage for the changed behavior:
   - `pnpm -C autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
4. Run broadened, still focused workspace-history executable coverage to guard adjacent tree selection/hydration/projection behavior:
   - `pnpm -C autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts`
5. Record results in the canonical execution coverage report. If all pass and no durable coverage was changed during this stage, hand off to `delivery_engineer` with the cumulative artifact package.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable component/panel coverage is adequate for this UI-only event-wiring change. No API coverage is needed and no repository E2E harness exists to run a browser-level test without introducing a disproportionate new framework in this stage.
