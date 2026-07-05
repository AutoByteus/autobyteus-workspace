# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/implementation-handoff.md`
- Visual Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/implementation-visual-rework.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code-review round 2 pass after user-requested visual rework; resume API/E2E because prior browser/API evidence predates the reworked source.
- Prior Investigation Reviewed: Round 1 in this file, plus prior execution report `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/api-e2e-execution-coverage-report.md`.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The approved requirements remain the same: Settings > Token Statistics task-table behavior is a local frontend presentation cleanup. The table must keep persistent sortable-header discoverability for `Task / Run`, `Runtime`, `Input`, `Output`, `Total Cost`, and `Created Time`; expose accessible sort action/state; remove standalone `Type` and `Status` columns; suppress normal `Complete estimate` main-row copy; retain non-`estimated` status information in the main row and expanded breakdown; and replace three duplicate hover-only cost-cell toggles with one persistent row-level Total Cost details control.

The post-feedback visual rework changes the concrete presentation of the already-reviewed behavior:

- sortable-header indicators are now compact two-triangle indicators instead of large text glyph/icon badges;
- Total Cost uses one compact icon-only disclosure control next to the formatted cost instead of a boxed text `Details` control;
- the duplicate inline status badge was removed, so non-`estimated` main-row status is now visible through formatted cost text such as `partial est.`, `mixed est.`, `price missing`, or `Local`, while the expanded breakdown remains the full status badge/missing-dimensions owner;
- the token-statistics `Details` locale key and temporary visual fixture route are not retained in source.

Implementation-handoff legacy check is clean after rework: no compatibility wrappers, no old Type/Status columns, no duplicate hidden cost buttons, no text Details label retained for token statistics, and no temporary fixture route in source. Code-review round 2 passed with no findings and requested fresh focused/browser validation for the visual rework.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Sortable headers use subtle two-triangle indicators while preserving `aria-sort`, labels, focus, and click behavior | Changed | `implementation-visual-rework.md`; code-review round 2 review scope/residual risks; REQ-001 through REQ-005 and AC-001 through AC-004 | Re-run updated component coverage and browser probe; prior screenshot/JSON evidence with text glyphs is stale. |
| Total Cost details trigger is icon-only but always visible with `aria-label`, `title`, `aria-expanded`, and `aria-controls` | Changed | `implementation-visual-rework.md`; code-review round 2; REQ-012 through REQ-014 and AC-009 | Re-run component coverage and browser DOM/visibility probe; prior evidence mentioning visible text `Details` is stale. |
| Non-estimated main-row status is represented by formatted cost text, not a separate inline badge | Changed | `implementation-visual-rework.md`; implementation handoff assumptions; code-review round 2 | Re-run component/browser checks that `partial est.` (representative non-estimated status text) is visible in the row and that expanded breakdown still shows status/missing dimensions. |
| Standalone `Type` and `Status` columns remain removed | Preserved | Requirements REQ-006 through REQ-010; design removal plan; code-review round 2 | Existing updated task-table spec remains valid; browser probe should reconfirm 9 headers and no Type/Status. |
| Input Cost and Output Cost remain plain values with no detail toggles | Preserved | REQ-013; code-review round 2 | Existing updated task-table spec and browser DOM probe should reconfirm no buttons in those cells. |
| Backend GraphQL/store/statistics semantics remain unchanged | Preserved | Out of scope and AC-012; code-review round 2 boundary checks | Store/page focused specs remain valid; backend E2E remains out of scope. |
| Temporary visual fixture route | Removed / not retained | `implementation-visual-rework.md`; code-review grep/temporary route check | Run a source check to confirm no `pages/__token-usage-task-table-fixture.vue` or stale fixture route remains. |
| Prior delivery docs/report artifacts | Changed externally / stale | Code-review round 2 docs-impact verdict | Delivery must refresh docs after API/E2E; API/E2E should record stale prior docs as downstream docs impact, not edit docs unless validation requires it. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Mounts the real task table with fixture rows; asserts 9 headers/cells, no Type/Status headers, six sortable header buttons/indicators, `aria-sort`, non-sortable Model/Input Cost/Output Cost headers, one details button per top-level row by aria-label, Input/Output values as plain cells, formatted non-estimated cost text (`partial est.`), no `Complete`, team expansion, child attachment after Total Cost sort, `aria-expanded`, cost breakdown, missing dimensions, and `colspan=9`. | REQ-001 through REQ-018; AC-001 through AC-011 and AC-013; design DS-002 through DS-004; visual rework note | Still Valid | Inspected current spec after round 2. It has been updated away from text `Details`/inline badge expectations and now matches icon-only disclosure plus formatted-cost status. | Execute as final focused durable UI coverage. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Mounts Settings Token Statistics page with stubbed table components; asserts compact controls, task/model grouping, shared date range, fetch calls without grouping arguments, and empty states. | AC-012; design says page delegates task-table rendering and store/API variables remain unchanged. | Still Valid | Page/store boundaries are still preserved; visual rework did not alter page component. | Execute with focused web tests. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Mocks Apollo queries and verifies task/model statistics fetch variables, network-only policy, row/child/status normalization, fallback handling for unexpected status/cache values, and GraphQL error state. | AC-012; backend/store/query shape unchanged. | Still Valid | Store is not changed by visual rework, but this remains the relevant durable proof of preserved API/store boundary. | Execute with focused web tests. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Model diagnostics table rendering/formatting. | Model diagnostics out of scope. | Out Of Scope | Visual rework changed only task-table/test/locales/docs; model diagnostics not touched. | Do not execute for this task unless shared fallout appears. |
| Backend token-usage E2E/integration suites under `autobyteus-server-ts/tests/.../token-usage` | Backend ledger/statistics/GraphQL/provider/migration coverage. | Backend token accounting, GraphQL schema, server statistics derivation are out of scope and unchanged. | Out Of Scope | No backend source behavior changed; docs-only backend doc edits do not require backend E2E. | Do not execute. |
| `pnpm -C autobyteus-web run guard:localization-boundary` | Guards localization source/generated-boundary rules. | REQ-016; locale files changed and token-statistics `Details` key was removed. | Still Valid | English/Chinese settings catalogs changed; guard remains valid. | Execute. |
| `pnpm -C autobyteus-web run audit:localization-literals` | Audits unresolved hard-coded localization literals. | REQ-016; icon-only disclosure relies on localized aria/title labels. | Still Valid | Locale-sensitive labels remain important after visual rework. | Execute. |
| `git diff --check` | Whitespace/diff hygiene. | Workflow validation hygiene. | Still Valid | Worktree has uncommitted source/docs/artifact changes after prior checkpoint. | Execute. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior round 1 browser evidence (`api-e2e-browser-probe-results.json` and old screenshots) | Text glyph sort indicators, boxed text `Details` control, and duplicate inline status badge expectations/evidence. | Source rework intentionally replaced these visuals. | `implementation-visual-rework.md`; code-review round 2 docs-impact and residual risks. | New round 2 temporary browser probe evidence will replace prior browser evidence as authoritative for current source. | Prior files may remain as history but are no longer current validation authority. |
| Repository-resident durable tests | N/A | No stale repository-resident tests found after round 2 code review; implementation-owned spec was updated before review and passed. | Code-review round 2; current spec inspection. | Current `TokenUsageTaskStatisticsTable.spec.ts`. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing reviewed durable coverage is adequate for repository-resident assertions in this local task-table scope. | N/A | No API/E2E-owned durable coverage addition is needed after code-review round 2. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No post-code-review durable coverage update planned by API/E2E. | N/A | Implementation already updated durable component coverage and code review round 2 passed it. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale repository-resident coverage removal required after code-review round 2. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-BROWSER-001 | Re-run a temporary Vite + Chromium/Playwright harness mounting the current real `TokenUsageTaskStatisticsTable.vue` with deterministic rows including a team, children, an estimated row, and a `partial_price_missing` row. Capture fresh round 2 screenshots and JSON evidence. | Browser-rendered compact sort indicators, active direction representation, 9-column table, icon-only Total Cost disclosure visibility and `aria-*` semantics, formatted non-estimated status in cost text, expanded breakdown status/missing dimensions, no Input/Output cost buttons, and child attachment after sorting. | One-off post-rework browser evidence is needed because prior browser evidence predates the source change and the project has no durable web Playwright suite/config. Existing component specs own durable coverage. Temporary harness must be removed afterward. |
| TEMP-SOURCE-001 | Source grep/file-existence check for temporary fixture route and stale references (`TokenUsageStatistics.details`, text `Details`, duplicate inline status helper, `rowTypeLabel`, `hover:underline`, `colspan="11"`). | No retained temporary route or old visual/compatibility paths. | Static post-rework confirmation only; durable no-legacy behavior is also enforced by code review and current source. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live Settings page against a real backend ledger and seeded token events | The changed boundary remains the task-table presentation over normalized rows; backend/store behavior is unchanged and focused page/store tests cover API variables/normalization. | Low. | None unless delivery/user requests live-app smoke. |
| All non-`estimated` status variants in browser | Visual rework changes presentation path, not formatter/status semantics. Browser will sample `partial_price_missing`; store/formatter existing coverage covers status normalization/formatting paths. | Low. | None. |
| Real assistive-technology speech output | Automation can verify DOM labels and state but not AT speech transcript. | Low. | None. |
| Broad `nuxi typecheck` | Code review attempt hit Node heap OOM and the repository has known broad unrelated typecheck issues. Focused Vitest compiles the changed component/tests. | Low for this scoped UI change. | Delivery/codebase maintenance may address broad typecheck separately. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity, compatibility wrapper, stale durable coverage, or source defect requiring reroute before execution was found. | N/A |

## Execution Plan

1. Execute focused durable web coverage against the post-rework source: `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts`.
2. Execute localization checks: `pnpm -C autobyteus-web run guard:localization-boundary` and `pnpm -C autobyteus-web run audit:localization-literals`.
3. Execute `git diff --check`.
4. Execute TEMP-SOURCE-001 source/fixture cleanup check.
5. Execute TEMP-BROWSER-001 post-rework browser probe, writing fresh round 2 screenshots/JSON evidence under the ticket folder and removing temporary harness files afterward.
6. Update the canonical API/E2E execution coverage report to round 2. If no repository-resident durable coverage is changed during API/E2E and all checks pass, hand off the cumulative package to `delivery_engineer` for docs refresh/final delivery continuation.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Prior API/E2E browser evidence is stale for the visual details, but existing repository-resident durable coverage is current and valid after code-review round 2. Fresh temporary browser evidence is required before delivery resumes.
