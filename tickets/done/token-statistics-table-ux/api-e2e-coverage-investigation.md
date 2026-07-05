# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/implementation-handoff.md`
- Visual Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/implementation-visual-rework.md`
- CR-001 Local Fix Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/implementation-local-fix-cr-001.md`
- Delivery Reroute Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/delivery-reroute-report.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Code-review round 4 passed CR-001 and requested API/E2E revalidation of the current value-plus-solid-triangle Total Cost control and cost-inclusive accessible label. Prior API/E2E round 2 evidence is stale because it covered the earlier icon-only disclosure state.
- Prior Investigation Reviewed: Round 2 in this file and prior execution report `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/done/token-statistics-table-ux/api-e2e-execution-coverage-report.md`.
- Latest Authoritative Investigation: Round 3

## Current Requirement And Design Basis

The approved requirements and design still define a local Settings > Token Statistics task-table UX cleanup. The task table must keep persistent sortable-header discoverability for `Task / Run`, `Runtime`, `Input`, `Output`, `Total Cost`, and `Created Time`; expose accessible sort action/state through `aria-sort`/labels; remove standalone `Type` and `Status` columns; suppress normal `Complete estimate` main-row copy; retain non-`estimated` status information in the main row and expanded breakdown; and replace three duplicate hover-only cost-cell toggles with one persistent row-level Total Cost details control.

The current source is the post-reroute, post-CR-001 value-plus-solid-triangle variant:

- sortable headers still use compact two-triangle indicators with active direction styling, `aria-sort`, localized action labels, focus styling, and click behavior;
- the Total Cost cell renders the formatted total cost value itself as the always-visible button text plus one small solid CSS triangle (`data-cost-detail-indicator`), rather than an icon-only separate control or a text `Details` control;
- CR-001 is resolved by deriving both visible button text and `costDetailsLabel(row)` from `formattedTotalCost(row)`, so the accessible label/title include the same formatted cost/status string visible in the button, for example `$2.20 partial est.`;
- Input Cost and Output Cost remain plain values and no longer toggle details;
- non-`estimated` main-row status remains visible through formatter-owned cost text such as `partial est.`, `mixed est.`, `price missing`, or `Local`; the expanded breakdown remains the full status/missing-dimensions owner;
- the old `Type`/`Status` columns, text `Details` token-statistics label, duplicate inline status badge, old hover-only cost buttons, and temporary Nuxt fixture route must remain absent.

Implementation-handoff legacy check and code-review round 4 are clean: no compatibility wrappers, no old Type/Status columns, no dual cost-detail controls, no hidden legacy detail route, and CR-001 is resolved. Delivery rerouted because the worktree drifted after API/E2E round 2; therefore API/E2E must validate the current source before delivery resumes.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Total Cost details trigger is a value-plus-solid-triangle button, not icon-only and not text `Details` | Changed | `implementation-visual-rework.md`; `implementation-local-fix-cr-001.md`; code-review round 4 | Re-run focused durable coverage and browser probe; prior round 2 browser evidence that recorded an empty-text 20px icon-only button is stale. |
| Total Cost details accessible label/title include the same formatted total cost/status string as the visible button text | Changed | CR-001 fix note; code-review round 4 prior-findings resolution | Browser probe must verify visible text, `aria-label`, `title`, `aria-expanded`, and `aria-controls` against the real component. |
| Sortable headers retain compact two-triangle indicators and active direction representation | Preserved | Requirements REQ-001 through REQ-005; visual rework note; code-review round 4 | Re-run component coverage and browser probe to ensure no regression during CR-001/local fix. |
| Non-estimated main-row status is represented by formatted cost text and remains present in expanded breakdown | Preserved / Changed presentation | Requirements REQ-008 through REQ-011; implementation handoff; CR-001 tests | Re-run component/browser checks using a `partial_price_missing` row; verify visible `partial est.` in button text and label, and breakdown status/missing dimensions after expansion. |
| Standalone `Type` and `Status` columns remain removed | Preserved | Requirements REQ-006 through REQ-010; design removal plan; code-review round 4 | Reconfirm 9 headers/cells and no `Type`/`Status` in focused tests and browser probe. |
| Input Cost and Output Cost remain plain values with no detail toggles | Preserved | REQ-013; implementation handoff; code-review round 4 | Reconfirm non-sortable/plain headers and no buttons in those cells. |
| Backend GraphQL/store/statistics semantics remain unchanged | Preserved | AC-012; design scope; implementation/code-review boundary checks | Re-run page/store focused specs; backend E2E remains out of scope. |
| Temporary visual fixture route and stale source references | Removed / not retained | Visual rework note; code-review round 4 | Run source cleanup check for absent route and old icon-only/text Details/inline badge/legacy table references. |
| Prior delivery docs/report artifacts | Changed externally / stale | Delivery reroute report; code-review docs-impact verdict | Delivery must refresh docs/handoff/release artifacts after this API/E2E pass. API/E2E records impact but does not own final docs sync. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Mounts the real task table with fixture rows; asserts 9 headers/cells, no Type/Status headers, six sortable header buttons/indicators, `aria-sort`, non-sortable Model/Input Cost/Output Cost headers, Total Cost details button visible text, visible formatted non-estimated cost status (`partial est.`), details label containing the same visible cost/status in show and hide states, `aria-expanded`, detail indicator, team expansion, child attachment after Total Cost sort, breakdown content, missing dimensions, and `colspan=9`. | REQ-001 through REQ-018; AC-001 through AC-011 and AC-013; design DS-002 through DS-004; CR-001 fix | Still Valid | Inspected current spec after code-review round 4. It was updated by implementation before review and now matches the value-plus-solid-triangle and cost-inclusive accessible-label behavior. | Execute as final focused durable UI coverage. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Mounts Settings Token Statistics page with stubbed table components; asserts compact controls, task/model grouping, shared date range, fetch calls without grouping arguments, and empty states. | AC-012; design says page delegates task-table rendering and store/API variables remain unchanged. | Still Valid | Page/store boundaries remain preserved; current CR-001 fix changed only task-table/locale/test details. | Execute with focused web tests. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Mocks Apollo queries and verifies task/model statistics fetch variables, network-only policy, row/child/status normalization, fallback handling for unexpected status/cache values, and GraphQL error state. | AC-012; backend/store/query shape unchanged. | Still Valid | Store is not changed by the UI rework, but this remains the relevant durable proof of preserved API/store boundary. | Execute with focused web tests. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Model diagnostics table rendering/formatting. | Model diagnostics out of scope. | Out Of Scope | Current source changes affect task-table/test/locales/docs only; model diagnostics not touched. | Do not execute for this task unless shared fallout appears. |
| Backend token-usage E2E/integration suites under `autobyteus-server-ts/tests/.../token-usage` | Backend ledger/statistics/GraphQL/provider/migration coverage. | Backend token accounting, GraphQL schema, server statistics derivation are out of scope and unchanged. | Out Of Scope | No backend source behavior changed; backend docs-only edits do not require backend E2E. | Do not execute. |
| `pnpm -C autobyteus-web run guard:localization-boundary` | Guards localization source/generated-boundary rules. | REQ-016; English/Chinese show/hide labels now include `{cost}` interpolation. | Still Valid | Locale files changed and accessibility labels depend on localization. | Execute. |
| `pnpm -C autobyteus-web run audit:localization-literals` | Audits unresolved hard-coded localization literals. | REQ-016; sort/action/detail labels remain localized. | Still Valid | Locale-sensitive labels remain important after CR-001. | Execute. |
| `git diff --check` | Whitespace/diff hygiene. | Workflow validation hygiene. | Still Valid | Worktree has uncommitted source/docs/artifact changes after delivery reroute. | Execute. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior round 1 browser evidence (`api-e2e-browser-probe-results.json` and old screenshots) | Text glyph sort indicators, boxed text `Details` control, and duplicate inline status badge evidence. | Source was intentionally reworked. | `implementation-visual-rework.md`; code-review round 2. | Historical only; superseded by later browser evidence. | N/A |
| Prior round 2 browser evidence (`api-e2e-round2-browser-probe-results.json` and round 2 screenshots) | Icon-only Total Cost disclosure with empty button text and separate formatted cost text. | Current source renders a value-plus-solid-triangle button and CR-001 requires its accessible label to include the visible formatted cost/status. | Delivery reroute report; `implementation-local-fix-cr-001.md`; code-review round 4. | New round 3 browser probe evidence will replace round 2 as current visual/DOM authority. | Prior files may remain as history but are no longer current validation authority. |
| Repository-resident durable tests | N/A | No stale repository-resident tests found after code-review round 4. Implementation-owned spec was updated before review and passed. | Code-review round 4; current spec inspection. | Current `TokenUsageTaskStatisticsTable.spec.ts`. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing reviewed durable coverage is adequate for repository-resident assertions in this local task-table scope. | N/A | No API/E2E-owned durable coverage addition is needed after code-review round 4. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No post-code-review durable coverage update planned by API/E2E. | N/A | Implementation already updated durable component coverage and code-review round 4 passed it. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale repository-resident coverage removal required after code-review round 4. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-BROWSER-001 | Run a temporary Vite + Chromium/Playwright harness mounting the current real `TokenUsageTaskStatisticsTable.vue` with deterministic rows including a team, children, an estimated row, and a `partial_price_missing` standalone row. Capture fresh round 3 screenshots and JSON evidence. | Browser-rendered compact sort indicators, active direction representation, 9-column table, value-plus-solid-triangle Total Cost disclosure visibility, button text including formatted cost/status, `aria-label`/`title` including the same value/status, `aria-expanded`/`aria-controls`, expanded breakdown status/missing dimensions, no Input/Output cost buttons, no text `Details`, child attachment after sorting, and table width. | One-off post-CR-001 browser evidence is needed because prior browser evidence predates the current source and the project has no durable web Playwright suite/config. Existing component specs own durable coverage. Temporary harness must be removed afterward. |
| TEMP-SOURCE-001 | Source grep/file-existence check for temporary fixture route and stale references (`__token-usage-task-table-fixture`, token-statistics text `Details` key/source, old icon-only empty details probe assumptions, duplicate inline status helper/badge, `rowTypeLabel`, `colspan="11"`). | No retained temporary route or old visual/compatibility paths. | Static post-CR-001 confirmation only; durable no-legacy behavior is also enforced by code review and current source. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live Settings page against a real backend ledger and seeded token events | The changed boundary remains task-table presentation over normalized rows; backend/store behavior is unchanged and focused page/store tests cover API variables/normalization. | Low. | None unless delivery/user requests live-app smoke. |
| All non-`estimated` status variants in browser | CR-001 changes the details control label/value path, not formatter/status semantics. Browser will sample `partial_price_missing`; durable formatter/store coverage and unchanged code cover other status paths. | Low. | None. |
| Real assistive-technology speech output | Automation can verify DOM labels, title, and expanded/controls state but not an AT speech transcript. | Low. | None. |
| Broad `nuxi typecheck` | Code-review attempts hit known broad repository issues/OOM. Focused Vitest compiles and executes the changed component/tests. | Low for this scoped UI change. | Delivery/codebase maintenance may address broad typecheck separately. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity, compatibility wrapper, stale durable coverage, or source defect requiring reroute before execution was found. | N/A |

## Execution Plan

1. Execute focused durable web coverage against the current CR-001 source: `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts`.
2. Execute localization checks: `pnpm -C autobyteus-web run guard:localization-boundary` and `pnpm -C autobyteus-web run audit:localization-literals`.
3. Execute `git diff --check`.
4. Execute TEMP-SOURCE-001 source/fixture cleanup check.
5. Execute TEMP-BROWSER-001 post-CR-001 browser probe, writing fresh round 3 screenshots/JSON evidence under the ticket folder and removing temporary harness files afterward.
6. Update the canonical API/E2E execution coverage report to round 3. If no repository-resident durable coverage is changed during API/E2E and all checks pass, hand off the cumulative package to `delivery_engineer` for docs/handoff/release refresh and final delivery continuation.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Prior API/E2E browser evidence is stale for the current value-plus-solid-triangle and CR-001 accessible-label behavior. Existing repository-resident durable coverage is current and valid after code-review round 4. Fresh focused execution and temporary browser evidence are required before delivery resumes.
