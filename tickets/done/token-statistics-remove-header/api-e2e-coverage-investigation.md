# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review pass for the expanded Token Statistics compact filter/control implementation; downstream coverage hints asked whether focused component coverage is sufficient or whether browser/visual/E2E validation is needed for compact/narrow select rendering.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a local Settings > Token Statistics UI cleanup. The selected settings-sidebar item remains the visible page identity, so the main content must not render a duplicate visible `Token Statistics` heading. The token statistics control card must be the single compact query surface, ordered as grouping select, start/end date inputs, then fetch action. The grouping control must be a select/dropdown-style control with visible `Task` and `Model` option labels, not a lower `By Task` / `By Model` tab row or segmented control. The visible `Usage during period`, visible `Select Date Range:`, visible `Group by:`, and old tab divider/spacing are obsolete. Non-visible accessible names are allowed and expected for the select and date controls.

Behavior that must remain unchanged: task grouping is selected by default; switching to model grouping changes only the displayed result projection and preserves the selected dates; clicking `Fetch Statistics` calls the existing store/API path with only `startDate` and `endDate`; loading, error, empty, task table, model table, store normalization, GraphQL/backend token usage semantics, and table column behavior remain unchanged.

The implementation handoff's `Legacy / Compatibility Removal Check` was reviewed. It reports no backward-compatibility mechanisms, no retained old behavior, and removal of old tab-row/helper/date-label localization artifacts. Static inspection matched that claim for the changed source scope: the old tab-row/helper/title layout is removed from `TokenUsageStatistics.vue`, `selectedGrouping` replaces tab-oriented local state, and store/table/API files are unchanged.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Duplicate visible in-page `Token Statistics` main-content heading | Removed | FR-001, AC-001; design removal plan; implementation handoff "kept earlier removal" | Existing component coverage must continue to fail if an `h2`/visible duplicate title returns. |
| Grouping control ownership and shape | Changed | FR-003, FR-004, FR-004a, AC-003, text UI reference | Durable component coverage should assert the first control is a native/select-like grouping control with visible `Task`/`Model` options. A temporary browser probe is useful for real select rendering. |
| Lower `By Task` / `By Model` tab row/divider | Removed | FR-005, AC-006; design decommission plan | Durable component coverage should assert no old tab buttons/divider and no visible `By Task`/`By Model` copy. |
| Visible `Usage during period` helper and visible `Select Date Range:` label | Removed | FR-006, FR-007, AC-005 | Durable component/localization coverage should assert stale visible copy and titles are absent. |
| Control order: grouping select -> start date -> end date -> fetch | Changed | FR-003, AC-003, AC-004; text UI reference | Durable component coverage should assert DOM order. Temporary browser probe should verify real layout/wrap keeps these controls in one card. |
| Default task grouping and task/model projection switching | Preserved | FR-008, FR-009, AC-008, AC-009 | Existing component coverage remains valid and sufficient for projection behavior. |
| Fetch call shape and data/store/API boundary | Preserved | FR-010, DS-003, code review boundary checks | Existing component and store coverage must assert two-argument date-range fetch with no grouping/range-mode argument. No backend API/E2E changes are needed. |
| Loading, error, empty states, task table, model table behavior | Preserved | FR-011; design says table components are reused unchanged | Existing component/table/store tests remain valid; run focused preserved-boundary coverage. |
| Localization cleanup for old visible layout | Changed/Removed | FR-012, AC-012; implementation handoff stale-key cleanup | Run localization literal and boundary guards; no durable coverage edit needed. |
| Narrow/wrapped layout in one compact control card | Preserved design constraint / changed visible layout | Requirements risks/open questions; design residual risk; code-review residual risk | Existing component test does not measure browser layout. Add temporary browser layout probe only; do not add brittle durable visual E2E for this local UI cleanup. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Mounts `TokenUsageStatistics` with mocked store/localization; asserts no duplicate title, no old visible helper/labels/tab buttons, native `select` first, `Task`/`Model` option labels, ARIA labels, date preservation when switching grouping, empty states, and two-argument fetch. | FR-001, FR-003 through FR-011, AC-001, AC-003 through AC-011, DS-001/DS-002/DS-003 | Still Valid | Directly targets the component owner and current approved UI semantics. Updated before code review; code review passed test quality. | Run as final focused UI durable coverage. No API/E2E-stage durable edit needed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Asserts store fetches task and model statistics using only `{ startTime, endTime }`, with no `rangeMode`, and normalizes task/model rows and error state. | FR-010, FR-011, DS-003, store/API boundary preservation | Still Valid | Store/API behavior is intentionally unchanged; this guards the boundary that grouping does not become a store/API argument. | Run as preserved API-boundary coverage. No changes needed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Asserts task table row ordering, labels, expansion, member attachment, and cost details. | FR-011, DS-001 result projection preservation | Still Valid | Table components are reused unchanged; this confirms the task projection remains executable. | Run as preserved task-table coverage. No changes needed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Asserts model table diagnostics, runtime/model rows, cache/cost status labels, and chart labels. | FR-011, DS-001 result projection preservation | Still Valid | Table components are reused unchanged; this confirms the model projection remains executable. | Run as preserved model-table coverage. No changes needed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/resources/server/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Backend token usage statistics provider aggregation by runtime/model and task/team/member. | Out-of-scope backend token usage semantics; FR-010/FR-011 unchanged data semantics | Out Of Scope | This task does not change backend provider behavior, persistence, GraphQL schema, or aggregation semantics. Existing tests remain valid for backend work but are not required for this UI layout execution. | Do not run or edit for this task. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/resources/server/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | GraphQL ledger projections for task/model settings statistics and run/team/member summaries. | Out-of-scope backend/API semantics; DS-003 store consumes existing GraphQL shape | Out Of Scope | UI change preserves store query shape and does not alter server GraphQL. These tests are DB-backed and unrelated to the changed control layout. | Do not run or edit for this task. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/resources/server/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Provider-specific token usage accounting semantics. | Out-of-scope backend/API semantics | Out Of Scope | No provider/accounting behavior changed. | Do not run or edit for this task. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/autobyteus-web/resources/server/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Settings-facing GraphQL model list excludes a removed model. | Unrelated settings model-list behavior | Out Of Scope | Not related to Token Statistics control layout or store fetch shape. | Do not run or edit. |
| Repository browser/E2E coverage for Settings > Token Statistics compact control card | No existing Playwright/Cypress/Nuxt browser E2E artifact found for this screen; package scripts expose Vitest/Nuxt and Electron tests but no first-party browser E2E harness for this UI page. | AC-003, AC-004, AC-005, AC-006, AC-007, narrow/wrapped residual risk | Out Of Scope for durable coverage / use temporary probe | Durable component tests are the right repository-resident guard for this local component UI. A broad new browser harness would be disproportionately brittle and would require infrastructure not present in this package. | Use temporary browser probe for real select/wrap evidence; do not add durable browser E2E. |
| `pnpm -C autobyteus-web audit:localization-literals` and `guard:localization-boundary` scripts | Executable guards for unresolved literals and localization-boundary regressions. | FR-012, AC-012 | Still Valid | Old visible copy and translation cleanup are part of the current requirements. | Run both as final localization coverage. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found during API/E2E investigation. | N/A | The old-layout component assertions were already updated before code review; backend/server token usage tests do not assert the stale UI layout. | Code review reports stale old-layout assertions and localization references removed. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None. | N/A | Existing focused component and store/table tests cover the durable regression boundaries. | N/A | A new repository-resident browser E2E would duplicate component assertions and introduce harness/setup cost for a local layout change. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None. | N/A | N/A | N/A | Component coverage was already updated before code review and passed review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-UI-001 | Launch Chromium/Google Chrome through `playwright-core` against a temporary static HTML fixture constructed from the actual rendered control-card markup/classes and inspect desktop and narrow widths. Remove the temporary file afterward. | Real browser/native select rendering shows the first control as the grouping dropdown, controls remain inside one card, and at narrow width the flex row wraps cleanly instead of creating a separate lower tab row. | The repository does not have a first-party browser E2E harness for this Nuxt screen; durable DOM/component tests already guard the behavior. This probe is execution evidence for the residual visual/wrap risk, not a long-lived regression suite. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron app verification for the expanded UI | Existing unsigned build artifacts predate the expanded implementation and delivery owns rebuild/final user-verification packaging decisions. | Low for source/API/E2E signoff; stale packaged app should not be used as final evidence. | Delivery should rebuild if user verification needs a packaged app. |
| Full backend GraphQL token usage ledger E2E suite | Backend/API semantics and schema are unchanged; DB-backed server E2E is not the changed boundary. | Low; store/unit coverage guards that UI still calls the existing GraphQL variables. | None for this task unless delivery/integration later exposes backend failures. |
| Pixel-perfect comparison against the original screenshot | Requirements describe semantic layout and relative compaction, not a pixel-perfect snapshot. | Low; visual drift is limited to local controls. | Delivery/docs sync can update durable prototype/spec expectations. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None. | N/A | Upstream requirements/design/code review are explicit; implementation inspection found no compatibility/legacy retention in changed scope. | N/A |

## Execution Plan

1. Run Nuxt preparation to ensure generated imports/types are current: `pnpm -C autobyteus-web exec nuxi prepare`.
2. Run focused current durable UI and preserved-boundary Vitest coverage:
   - `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/TokenUsageStatistics.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts`
3. Run localization cleanup guards:
   - `pnpm -C autobyteus-web audit:localization-literals`
   - `pnpm -C autobyteus-web guard:localization-boundary`
4. Run static stale-layout source search over relevant web source/test/localization paths.
5. Execute temporary browser layout probe `TEMP-UI-001` with `playwright-core` and local Google Chrome; record desktop and narrow geometry evidence; delete temporary probe fixture.
6. Run `git diff --check`.
7. Write the canonical API/E2E execution coverage report and route based on whether durable repository coverage changed. Current plan has no durable coverage additions, updates, or removals after code review, so a passing result should route to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing focused component coverage is the correct durable regression point for the compact control-card behavior. Because real-browser select rendering/wrapped layout was the main residual risk, API/E2E will supplement it with a temporary browser probe rather than adding a durable E2E harness.
