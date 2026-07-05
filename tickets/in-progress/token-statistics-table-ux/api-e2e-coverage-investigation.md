# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass for Token Statistics task-table UX cleanup; proceed to API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved scope is a localized Settings > Token Statistics task-table UX cleanup in `autobyteus-web`. The table must expose persistent sort affordances for the existing sortable columns (`Task / Run`, `Runtime`, `Input`, `Output`, `Total Cost`, `Created Time`), provide accessible sort/action semantics, remove standalone `Type` and `Status` columns, suppress normal `estimated` / `Complete estimate` copy in main rows, keep non-`estimated` price statuses visible inline near Total Cost and inside the expanded cost breakdown, and replace the three hover-only cost-cell toggles with one always-visible Total Cost details control carrying `aria-expanded`/`aria-controls`/localized labels. Sorting behavior must remain unchanged: default Created Time descending, repeated click toggles direction, key changes use existing default directions, top-level rows sort while expanded children stay attached. Backend GraphQL/store/statistics semantics are explicitly unchanged.

Implementation-handoff legacy check is clean: no backward-compatibility mechanisms were introduced, legacy old behavior was not retained, and obsolete Type/Status/detail-toggle UI paths were removed. Code review passed with no findings and specifically requested browser-level confirmation for sort glyphs, table width, Total Cost details control, non-estimated status visibility, and accessibility-relevant attributes.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Persistent sort glyphs and accessible sort labels on six supported sortable task-table headers | Added / Changed | REQ-001 through REQ-005; AC-001 through AC-004; design DS-002; implementation handoff `What Changed` | Existing task-table component coverage is current and should be executed; add temporary browser probe for visual/DOM confirmation in Chromium. |
| Standalone `Type` task-table column/cells and `rowTypeLabel()` | Removed | REQ-006, REQ-007; AC-005, AC-006; design removal plan; code review cleanup verdict | Existing task-table spec asserts 9 headers/cells and no Type header; browser probe should confirm real rendered column set. No stale test remains. |
| Standalone `Status` column/cells and repeated normal `Complete estimate` main-row status | Removed / Changed | REQ-008 through REQ-011; AC-007, AC-008; design DS-004 | Existing task-table spec covers suppression of Complete and inline non-estimated status; browser probe should confirm at least one non-estimated status inline and in expanded details. |
| Cost breakdown opened by one explicit Total Cost details control instead of duplicate Input/Output/Total hover-only buttons | Changed / Removed | REQ-012 through REQ-014; AC-009, AC-010; design DS-003 and backward-compat rejection log | Existing task-table spec covers single details controls, `aria-expanded`, and detail colspan; browser probe should confirm visible button, `aria-controls`, state change, and Input/Output Cost cells have no buttons. |
| Detail row layout after column removal | Changed | REQ-015; design removal plan `colspan=9`; implementation handoff | Existing task-table spec covers `colspan=9`; browser probe should confirm DOM and visual screenshot. |
| English/Chinese task-table labels | Changed | REQ-016; AC locale implications; implementation handoff | Existing localization guard and audit remain valid; execute them. No API/E2E durable coverage changes needed. |
| GraphQL query shape, store normalization, backend token accounting/status semantics | Preserved | Out-of-scope list; AC-012; design dependency rules; code review verified unchanged | Execute existing page/store focused specs that prove fetch variables and task/model normalization behavior. Backend E2E suites are out of scope because backend/server code was not changed. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Mounts the real task table with fixture rows and asserts 9-column header/cell shape, visible inactive/active sort indicators, `aria-sort`, non-sortable Model/Input Cost/Output Cost headers, one Total Cost detail control per row, inline non-estimated status, suppression of normal `Complete`, team expansion, child attachment after Total Cost sort, detail `aria-expanded`, breakdown content, missing price dimensions, and `colspan=9`. | REQ-001 through REQ-018; AC-001 through AC-011 and AC-013; design DS-002 through DS-004 | Still Valid | Reviewed test file after implementation. The assertions directly map to the approved current behavior and no obsolete assertion remains for removed Type/Status/duplicate buttons. | Execute as final focused durable UI coverage. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Mounts Settings Token Statistics page with stubbed table components; asserts compact control card, task/model grouping, shared date range, fetch calls without grouping arguments, and empty states. | AC-012; design says page delegates task-table rendering and store/API variables remain unchanged. | Still Valid | Page/store boundaries are preserved and this spec verifies the page did not introduce new fetch variables or own table-specific column behavior. | Execute with focused web tests. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Mocks Apollo queries and verifies task/model statistics fetch variables, network-only policy, row/child/status normalization, fallback handling for unexpected status/cache values, and GraphQL error state. | AC-012; design dependency rules preserve GraphQL/store/backend shape. | Still Valid | Store was not changed, but the scenario is the relevant durable proof that API/store shape remains stable under this UI-only change. | Execute with focused web tests. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Covers model diagnostics table rendering/formatting. | Model diagnostics explicitly out of scope. | Out Of Scope | Requirements/design state model diagnostics table remains unchanged unless shared fallout occurs; implementation changed no model-table files. | Do not execute for this task unless final focused run unexpectedly indicates shared formatter fallout. |
| `autobyteus-server-ts/tests/e2e/token-usage/*` and `autobyteus-server-ts/tests/integration/token-usage/*` | Backend ledger/statistics/GraphQL/provider/migration token-usage coverage. | Backend token accounting, GraphQL schema, server statistics derivation are out of scope and unchanged. | Out Of Scope | Changed files are only task-table component spec/locales; code review verified no backend/store/schema changes. | Do not execute; note out-of-scope residual coverage. |
| `pnpm -C autobyteus-web run guard:localization-boundary` | Guards localization source/generated-boundary rules. | REQ-016; locale files changed. | Still Valid | English and Chinese settings catalogs were changed; guard is a durable executable project check for this boundary. | Execute. |
| `pnpm -C autobyteus-web run audit:localization-literals` | Audits unresolved hard-coded localization literals. | REQ-016; accessible labels/detail labels are localized. | Still Valid | Locale-sensitive UI text was added; audit is valid and already used by implementation/code review. | Execute. |
| `git diff --check` | Whitespace/syntax hygiene for patch. | Workflow validation hygiene. | Still Valid | Changed files are uncommitted working-tree changes; diff check remains valid before handoff. | Execute. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale repository-resident coverage was found in the reviewed task/API/E2E scope. The pre-review implementation already updated the old task-table spec expectations for the removed Type/Status columns and duplicate cost toggles. | Requirements REQ-006 through REQ-014 and design removal plan. | Current `TokenUsageTaskStatisticsTable.spec.ts` assertions. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing reviewed durable coverage is sufficient for repository-resident assertions in this local task-table scope. | N/A | No post-code-review durable coverage addition is required. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No post-code-review durable coverage update planned. | N/A | Implementation already updated durable component coverage and code review passed it. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage removal required after code review. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-BROWSER-001 | Temporary Vite + Chromium/Playwright harness that mounts the real `TokenUsageTaskStatisticsTable.vue` with realistic fixture rows including a team row, children, an estimated row, and a `partial_price_missing` row. Capture screenshots and DOM/measurement JSON. | Browser-rendered persistent neutral/active sort glyphs, 9-column table, non-sortable headers, visible Total Cost details control, `aria-sort`, `aria-expanded`, `aria-controls`, inline non-estimated status, expanded breakdown status/missing dimensions, and child attachment after sorting. | This is a one-off browser-level confirmation for this branch because the project does not have a durable web Playwright suite/config in `autobyteus-web`; existing component specs own durable coverage. The harness will be removed after execution, while screenshots/JSON evidence remain as task artifacts. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live Settings page against a real backend ledger and seeded token events | The change is presentation-only, backend/server/store code is unchanged, and there is no existing durable web E2E Playwright suite/config for the settings page. Running a live backend would add broad environment cost without changing the proof boundary. | Low: store/API behavior is covered by focused store/page specs, and browser harness mounts the actual table with normalized rows. | None unless delivery/user requests a full manual live-app smoke. |
| Every non-`estimated` status variant (`price_missing`, `mixed`, `local_no_api_bill`) in browser | Existing formatter semantics are unchanged and focused component coverage samples `partial_price_missing`; backend/status mapping is out of scope. | Low: durable tests and formatter/store coverage preserve status semantics; browser probe will confirm at least one exception status as requested by code review. | None. |
| Screen-reader announcement with a real assistive technology | Local automation can verify DOM attributes (`aria-sort`, `aria-expanded`, `aria-controls`, labels), not actual AT speech output. | Low: acceptance criteria target accessible semantics and labels rather than AT-specific transcript. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | Investigation found no requirement/design ambiguity, compatibility wrapper, stale durable coverage, or local implementation defect requiring reroute before execution. | N/A |

## Execution Plan

1. Execute current valid focused durable web coverage: `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts`.
2. Execute localization boundary/literal checks: `pnpm -C autobyteus-web run guard:localization-boundary` and `pnpm -C autobyteus-web run audit:localization-literals`.
3. Execute `git diff --check`.
4. Run temporary Vite + Chromium/Playwright browser harness against the actual task-table component with realistic fixture rows; store JSON evidence and screenshots under `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/` and remove temporary harness files afterward.
5. Write the canonical execution coverage report. If no repository-resident durable coverage is changed after code review and all checks pass, hand off cumulative artifacts to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is valid for the current approved behavior. Browser-level confirmation will be temporary evidence only, not a repository-resident test change.
