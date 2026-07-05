# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/design-review-report.md`

## What Changed

- Updated task statistics table sortable headers to show persistent neutral/active sort indicators and expose `aria-sort`, localized action labels, focus styling, and titles.
- Removed standalone `Type` and `Status` task-table columns/cells.
- Removed the now-unused `rowTypeLabel()` helper and old Type/Status/type-label localization entries.
- Changed `Input Cost` and `Output Cost` cells to plain formatted values.
- Replaced the three duplicate hover-only cost detail toggles with one explicit, always-visible icon-only disclosure control next to the `Total Cost` value.
- Added `aria-expanded`, `aria-controls`, and localized show/hide labels for the Total Cost details control.
- Preserved non-`estimated` `apiCostStatus` visibility through existing formatted cost text (for example `price missing`, `partial est.`, `mixed est.`, `Local`) and the expanded cost breakdown status badge, while avoiding a noisy duplicate main-row status badge.
- Updated the expanded detail row colspan from `11` to `9` for the reduced column count.
- Added English and Chinese localization for sort actions and cost detail show/hide labels.
- Updated focused task-table tests for the new column set, visible sort affordances, accessible sort/detail semantics, non-complete status preservation, and detail-row colspan.
- Reworked the initial visual pass after user feedback: replaced oversized sort glyphs with compact triangle indicators and replaced the boxed `Details` text button with a small icon-only disclosure control.

## Key Files Or Areas

- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue`
- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`
- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/localization/messages/en/settings.ts`
- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/autobyteus-web/localization/messages/zh-CN/settings.ts`

## Important Assumptions

- The intended visible replacement for the removed Status column is exception-only status visibility through the Total Cost formatted value and expanded breakdown; normal `estimated` rows stay quiet in the main row.
- Existing cost formatting remains authoritative, so partial/mixed/unpriced cost cell wording is still produced by `tokenUsageStatisticsUi.ts`.
- Backend/store/token-cost semantics and task hierarchy data remain unchanged.

## Known Risks

- `nuxi typecheck` currently fails on broad pre-existing repository issues outside this task scope. A grep of the typecheck output for changed task-table/localization files returned no matches.
- The details control is now the single cost-breakdown toggle; users can no longer click Input Cost or Output Cost values directly. This is intentional per the reviewed design. The post-feedback visual rework keeps that control icon-only to avoid clutter.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change / UI Cleanup
- Reviewed root-cause classification: Local Implementation Defect at the presentation/affordance level
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): No Refactor Needed
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation stayed local to the task table, English/Chinese localization, and focused task-table tests. No backend, GraphQL, store, token-cost, or model diagnostics behavior was changed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `TokenUsageTaskStatisticsTable.vue` is 361 total lines / 341 effective non-empty lines after the visual rework. The source implementation diff for that file remains under the `>220` changed-line split/escalation signal. Test/localization files are outside the hard source implementation file-size guardrail.

## Environment Or Dependency Notes

- Installed workspace dependencies for local validation with `pnpm install --filter autobyteus...` because the worktree initially had no `node_modules` and `vitest` was unavailable.
- Generated Nuxt test/type metadata with `pnpm -C autobyteus-web exec nuxi prepare` because the initial test attempt failed on missing `autobyteus-web/.nuxt/tsconfig.json`.
- Generated dependency/build artifacts are ignored and are not part of the git diff.
- For visual validation, a temporary Nuxt fixture route was created with deterministic task-table rows, served locally, captured with headless Chrome/Playwright, and then removed. Visual evidence is stored at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/visual-fixture-token-table-clean-page.png` and `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-table-ux/tickets/in-progress/token-statistics-table-ux/visual-fixture-token-table-clean-closeup.png`.

## Local Implementation Checks Run

- `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts` — Passed (`2` files, `5` tests). Benign warnings: Electron module skipped because `BUILD_TARGET` is not electron; KaTeX quirks-mode warning from test environment.
- `pnpm -C autobyteus-web run guard:localization-boundary` — Passed.
- `pnpm -C autobyteus-web run audit:localization-literals` — Passed with zero unresolved findings. Benign Node warning about `localization/audit/migrationScopes.ts` module type.
- `git diff --check` — Passed.
- Temporary fixture visual validation — Passed by manual screenshot inspection after serving `http://127.0.0.1:3207/__token-usage-task-table-fixture`; route removed after capture.
- `pnpm -C autobyteus-web exec nuxi typecheck` — Failed due broad pre-existing unrelated repository errors (examples include build script type-only import errors, existing component/test typing errors, missing generated/store modules, and unrelated store typing issues). Follow-up grep check for changed files produced no matches: `pnpm -C autobyteus-web exec nuxi typecheck 2>&1 | rg "TokenUsageTaskStatisticsTable|token-usage/__tests__/TokenUsageTaskStatisticsTable|localization/messages/(en|zh-CN)/settings"`.

## Downstream Coverage Hints / Suggested Scenarios

- Verify visually that each sortable task-table header shows a subtle persistent neutral indicator and the active Created Time/selected sort column shows the correct active direction without large icon badges.
- Verify screen-reader/accessibility semantics around `aria-sort` and the Total Cost details button `aria-expanded` state.
- Verify non-`estimated` statuses (`partial_price_missing`, `price_missing`, `mixed`, `local_no_api_bill`) remain visible inline near Total Cost and inside the expanded cost breakdown.
- Verify Input Cost and Output Cost are plain values and that only Total Cost owns the row cost-details toggle, now as a compact icon-only disclosure control.
- Verify expanded team children remain attached after sorting by Total Cost.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required downstream. Implementation-scoped component/unit checks passed, but API/E2E coverage investigation and any broader executable validation remain owned by `api_e2e_engineer` after code review.
