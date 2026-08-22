# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/design-spec.md`
- Supplemental Artifacts: `ui-ux-spec.md`, `prototype.html`, `token-usage-analytics-data-contract.md`, task evidence images
- Solution Revision Record: `solution-revision-record.md` (`SR-001`–`SR-002`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-001`–`ARCH-REV-002`)
- Implementation Handoff / Revision: `implementation-handoff.md`; `implementation-revision-record.md` (`IR-001`–`IR-006`)
- Code Review Report / Revision: `code-review-report.md`; `code-review-revision-record.md` (`CRR-001`–`CRR-011`)
- API/E2E Test Review Report: `api-e2e-test-review-report.md` (`CRR-011` Fail — Local Fix, TR-F-002; resolved by this round pending proportional re-review)
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-006`
- Current Execution Round: `6`
- Trigger: `CRR-011` proportional test-review Fail — Local Fix `TR-F-002`
- Prior Round Reviewed: `API-REV-005` Pass / 97.7%; implementation, browser, environment, cleanup and confidence remain authoritative; only durable assertion quality reopened
- Latest Authoritative Round: this round

## Investigation And Execution Basis

- Mandatory investigation reviewed and updated before the round-6 durable edit: `Yes`.
- Plan followed: `Yes` — add exact `border-b-2` protection to both selected-state assertion arrays, run the focused spec, then patch hygiene.
- Durable coverage delta: updated only `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts`; no source, fixture, test addition/removal, environment, or data change.
- Broader validation decision: `Not Required` for this assertion-only strengthening. API-REV-005's real computed-style/browser evidence directly proves the implementation's 2px underline.
- Reroute required: `No`; TR-F-002 was an API/E2E-owned Local Fix.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`.
- Compatibility-only runtime behavior observed: `No`.
- Approved persisted-data transition followed: `Yes` — current run rows remain directly usable without analytical backfill; additive analytics schema only.
- Compatibility-only durable coverage: `No`.
- Upstream notification: N/A.

## Prior Failure Resolution

| Prior Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-F-001 / API-003 sparse empty-bucket cost reconciliation | Local Fix — implementation | Resolved. Empty zero-report/zero-token buckets remain `NO_USAGE` with null cost/currency and are excluded from known-cost summation; a usage-bearing null-cost bucket remains a hard reconciliation error. | `server-analytics-aggregation-rerun.log`: 1 file/4 pass; `server-analytics-combined.log`: API-003 4 pass |

## Prior Test-Review Finding Resolution

| Finding | Previous Problem | Current Resolution | Evidence |
| --- | --- | --- | --- |
| TR-F-001 / API-004 | any `Error` was accepted for rejected concurrent writes | each rejected promise must be an `Error` whose exact Prisma code is `P1008`; unrelated transaction, projection, fixture, or programming errors now fail the test; exact committed run/facet reconciliation is unchanged | `server-analytics-atomicity-tr-f-001-rerun.log`: 1 file/3 pass; `server-analytics-combined-tr-f-001-rerun.log`: 5 files/18 pass |
| TR-F-002 / FIELD-F-001 | selected states asserted blue border color but not the shared 2px width class | both selected Analytics and selected Run-details arrays now explicitly require `border-b-2` while retaining transparent/blue/no-dark-fill checks | `web-tabs-tr-f-002-rerun.log`: 1 file/1 test pass; `git diff --check` pass |

## API-REV-004 Field Finding Resolution

| Finding | Prior Failure | Current Resolution | Evidence | Result |
| --- | --- | --- | --- | --- |
| FIELD-F-001 / F-005 | active tab was a dark filled block rather than approved transparent blue underline | current frontend computes transparent background, blue-700 text, blue-600 2px bottom border for Analytics and Run details on desktop; same active treatment persists at 390px; neither tab includes `bg-slate-900` | focused spec; browser JSON; three screenshots | Resolved |
| FIELD-F-002 / F-006 | initial empty view was interpreted as a rejected existing-history expectation | SR-002 clarifies that the query preceded any admitted post-coverage contribution. The unchanged production DB now returns 121,230,647 post-coverage tokens / 870 reports and current frontend renders cards/graph; Run details remains separately populated | live backend/browser response and Run-details screenshot | Resolved — mistaken premise |

### Live Backend And Current Frontend Result

- Existing packaged backend: `http://127.0.0.1:29695`; `/rest/health` returned 200; the process remained user-owned and running.
- Current frontend: commit `7a21d5923`, production-built with GraphQL/REST endpoints targeting `29695`, served only on owned `127.0.0.1:3101` during the test.
- Live Analytics: `PARTIAL` coverage from `2026-08-22T10:52:04.812Z`; 121,230,647 tokens; 870 reports; 1 active day; 22 buckets; 2 breakdown rows; COMPLETE/USD cost.
- Exact reconciliation: selected total/report count equals the sum of trend buckets; selected total equals the sum of breakdown rows.
- Run details: keyboard Enter activated the tab, approved active styling remained exact, and retained lifetime-run rows rendered normally.
- Browser result: 23 assertions passed; no page errors, no feature HTTP failures, no application console errors; 390px document widths remained exactly 390px.
- Environment-only note: standalone static-web startup probed `http://127.0.0.1:29695/health` and received 404; actual embedded readiness at `/rest/health` and all exercised feature requests succeeded. This known non-Electron-host probe is recorded as ignored evidence, not hidden.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC | Boundary | Execution Surface | Evidence | Result | Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | observed UTC; opaque nullable keys/collision/128 cardinality; SafeInt input, AC-017/025–026 | contribution projection | production function unit | Durable | Pass — 4 | contribution test; combined log |
| API-002 | exact UTC presets/custom/comparisons/granularity/input rejection, AC-002–004/010–011 | range policy | production policy unit | Durable | Pass — 4 | range test; combined log |
| API-003 | cost matrix/coverage/buckets/reconciliation, AC-007–012/021–029 | aggregation policy | production policy unit | Durable | Pass — 4 | aggregation test; focused + combined logs |
| API-004 | rollback, exact replay suppression, different-run same-facet contention, AC-017–020 | accumulator/transaction/SQLite | real migrated SQLite integration | Durable | Pass — 3 | atomicity test; combined log |
| API-005 | observation-time ranges, filters, buckets/rows, mixed cost, no backfill, SafeInt output | persistence/provider/GraphQL | real migrated SQLite + live schema | Durable | Pass — 3 | GraphQL E2E; combined log |
| PRESERVED-001 | current Run-details GraphQL | existing storage/GraphQL | focused clean migrated DB | Durable | Pass — 1; 3 skipped by filter | preserved log |
| WEB-001 | UTC selection/variables; stale response; error/retry-ready | Pinia/Apollo state | Nuxt Vitest | Durable | Pass — 3 | web broader log |
| WEB-002 | controls, state distinctions, chart/table evidence, metric continuity, accessibility/responsiveness | Vue/Chart.js/browser | component tests + live Chrome | Durable + Browser | Pass | 11-file suite + browser result/screenshots |
| WEB-003 | captured/derived statuses, exact metadata/escaping/filename, actual Blob download | serializer/browser API | unit + live Chrome | Durable + Browser | Pass | CSV spec + browser result |
| BUILD-001 | production server and Nuxt bundles/boundaries/localization | build/config | project build/guards | Durable executable | Pass | server build; web build/guards |

## Additional Repository Coverage Execution

| Order | Exact Command / Scope | Working Directory | Result | Evidence |
| --- | --- | --- | --- | --- |
| 0 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/services/token-usage-analytics-aggregation-policy.test.ts --no-watch --reporter=verbose` | worktree | 1 file/4 pass | `server-analytics-aggregation-rerun.log` |
| 1 | server Vitest over the three units, atomicity integration, analytics GraphQL E2E | worktree | 5 files/18 pass | `server-analytics-combined.log` |
| 2 | ledger GraphQL E2E with `-t 'returns expanded run/team/member summaries and settings statistics from ledger accounting fields'` | worktree | 1 pass/3 skipped | `server-run-details-graphql-preserved.log` |
| 3 | web Vitest over Statistics/Run details/tables/all analytics/store/CSV affected files | worktree | 11 files/26 pass | `web-token-usage-broader.log` |
| 4 | `pnpm -C autobyteus-server-ts build` | worktree | Pass | `server-build.log` |
| 5 | web `build`, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | worktree | Pass; audit zero findings | `web-build-guards.log` |
| 6 | `git diff --check` | worktree | Pass; no output | terminal evidence |
| 7 | focused API-004 with exact `P1008` rejection assertion | worktree | 1 file/3 pass | `server-analytics-atomicity-tr-f-001-rerun.log` |
| 8 | affected five-file API-001–API-005 backend matrix after test correction | worktree | 5 files/18 pass | `server-analytics-combined-tr-f-001-rerun.log` |
| 9 | `git diff --check` after TR-F-001 correction | worktree | Pass; no output | terminal evidence |
| 10 | focused `TokenUsageStatistics.spec.ts` | worktree | 1 file/1 test pass | `web-tabs-field-revalidation.log` |
| 11 | affected Token Statistics/analytics/Run-details/store/CSV matrix | worktree | 12 files/35 tests pass | `web-token-usage-field-revalidation.log` |
| 12 | production Nuxt build targeting embedded backend | worktree | Pass | `web-field-revalidation-build.log` |
| 13 | web-boundary/localization guards and literal audit | worktree | Pass; zero unresolved findings | `web-field-revalidation-guards.log` |
| 14 | `git diff --check` | worktree | Pass; no output | terminal evidence |
| 15 | focused `TokenUsageStatistics.spec.ts` after TR-F-002 correction | worktree | 1 file/1 test pass | `web-tabs-tr-f-002-rerun.log` |
| 16 | `git diff --check` after TR-F-002 correction | worktree | Pass; no output | terminal evidence |

## Validation Confidence Scorecard

| Category | API-REV-004 | API-REV-005 | Change | Final Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 98% | +23 | clarified SR-002 lifecycle plus prior complete matrix and current populated production result | negligible |
| Changed-boundary directness | 98% | 98% | 0 | exact component classes, computed browser styles, live GraphQL data and reconciliation | negligible |
| Cross-boundary realism/mock gap | 98% | 98% | 0 | current frontend → user's embedded backend → production SQLite | external providers remain correctly excluded |
| Environment/config/identity/fixture fidelity | 99% | 99% | 0 | actual production backend/database, production frontend build, real Chrome | standalone static host differs from Electron renderer host only |
| Failure/edge/lifecycle/recovery | 90% | 96% | +6 | prior rollback/contention/overflow/coverage/stale tests plus real pre/post-contribution lifecycle | arbitrary SQLite saturation retains governed P1008 residual |
| User-surface/browser/desktop confidence | 70% | 98% | +28 | approved styles for both tabs, desktop/390px screenshots, keyboard activation, populated graphs | Electron shell not rebuilt in this round; no shell code changed |
| Durable regression quality/relevance | 94% | 97% | +3 | exact IR-005 tab regression plus prior ten-path durable suite and 12-file recheck | browser harness remains temporary by project convention |

- Overall final confidence: `97.7%` (684/7), unchanged in API-REV-006 because only the durable assertion was strengthened and passed.
- Calculation: arithmetic mean with critical-criterion and weak-category gates.
- Every critical acceptance criterion directly proven: `Yes`.
- Final applicable category below 90%: `No`.
- Default 95% target met: `Yes`.
- Broader-validation gain: closes the exact visual and lifecycle premises that caused API-REV-004.

## Broader Validation Decision And Execution

- Round-6 decision: `Not Required` — assertion-only durable strengthening; no implementation or environment behavior changed.
- Still-authoritative API-REV-005 mode/result: `Required` and completed — real Chrome against current production frontend and the user's running Electron backend.
- Data policy: unchanged. No database update, backfill, dynamic lifetime merge, polling, or new refresh spine was used.
- Owned setup: production static frontend on port `3101`; temporary Playwright script; Chrome at 1440x1000 and 390x844.

| Journey | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Current populated lifecycle | admitted post-coverage contributions populate partial Analytics | 121,230,647 tokens / 870 reports / one active day rendered | result JSON, Analytics screenshot | Pass |
| Aggregate coherence | selected, bucket and breakdown totals agree | token/report reconciliation exact | result JSON | Pass |
| Analytics active tab | transparent, blue text, blue 2px underline, no black class | exact computed values observed | result JSON, screenshot | Pass |
| Run-details active tab/navigation | keyboard activation, same approved style, retained lifetime rows | Enter selected Run details; rows rendered | result JSON, screenshot | Pass |
| Narrow renderer | approved active style and no page overflow | widths 390/390/390 | result JSON, mobile screenshot | Pass |
| Runtime health | no feature/page/console failures | pass; only documented standalone `/health` probe excluded | result JSON/logs | Pass |

## Desktop Application Validation

- Approach: browser-preferred validation of the changed web-equivalent Electron renderer, using the user's actual embedded backend/database.
- Packaged/backend evidence: running AutoByteus server process on `29695`; `/rest/health` and GraphQL succeeded.
- Browser evidence: populated Analytics, both tab states, keyboard activation, desktop/narrow render and Run-details rows.
- Shell-specific change: none; actual Electron process was not restarted or disturbed.
- Effect on running desktop app: none; backend remained listening after cleanup.

## Platform / Runtime Targets

- Platform: macOS/darwin.
- Node: `v22.23.1`; pnpm `10.28.2` (project declares pnpm 10.28.1); server Vitest 4.0.18; web Vitest 3.2.4; Prisma/SQLite per lockfile.
- Browser: Google Chrome `151.0.7922.170`, headless.
- Viewports: 1440x1000 and 390x844; English locale; UTC behavior asserted against 2026-08-22.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: existing current-format run data is directly usable; no application-data migration/backfill.
- Representative data: API-005 creates a run record, removes its facet, initializes later coverage, proves July unavailable/August partial, preserves the run row, and proves no facet backfill.
- Additive migration: all 24 migrations applied in each server test run; built server started against a fresh data root.
- Coverage persistence: repeated initialization retained the original coverage instant.
- Version-specific branch/dual path/fallback observed: `No`.
- Field upgrade evidence: the actual production DB confirms the additive transition: lifetime run rows remain present while analytics coverage/facets begin only at feature activation.
- Clarified field lifecycle: the initial empty query preceded any admitted post-coverage contribution; the unchanged database later served 121,230,647 tokens from admitted daily facets. This is the approved expected sequence.
- Pre-coverage lifetime totals remain available only in Run details and are not fabricated into period Analytics.
- No polling/refresh/backfill behavior was added or required.

## Tests Implemented Or Updated

| Path | Change | Scenario | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-analytics-contribution.test.ts` | Added in API/E2E baseline; retained | API-001 | 4 pass |
| `autobyteus-server-ts/tests/unit/token-usage/services/token-usage-analytics-range-policy.test.ts` | Added in baseline; retained | API-002 | 4 pass |
| `autobyteus-server-ts/tests/unit/token-usage/services/token-usage-analytics-aggregation-policy.test.ts` | Added in baseline; retained | API-003/API-F-001 | 4 pass |
| `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-analytics-atomicity.integration.test.ts` | Added; narrowed in round 3 | API-004 / TR-F-001 | focused 3 pass; combined 18 pass |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | Added | API-005 | 3 pass |
| `autobyteus-web/stores/__tests__/tokenUsageAnalytics.spec.ts` | Added | WEB-001 | 3 pass |
| `autobyteus-web/components/settings/token-usage/analytics/__tests__/TokenUsageAnalyticsStates.spec.ts` | Added | WEB-002 states/controls | 3 pass |
| `autobyteus-web/components/settings/token-usage/analytics/__tests__/TokenUsageTrendChart.spec.ts` | Added | WEB-002 trend/text/accessibility | 2 pass |
| `autobyteus-web/components/settings/token-usage/analytics/__tests__/TokenUsageBreakdown.spec.ts` | Updated | WEB-002 exact evidence | 2 pass |
| `autobyteus-web/utils/__tests__/tokenUsageAnalyticsCsv.spec.ts` | Updated | WEB-003 | 2 pass |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Updated by IR-005; rechecked in round 5 | FIELD-F-001 / WEB-002 | focused 1 pass; matrix 35 pass |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Round-6 API/E2E-owned durable change: `Yes` — updated `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` with explicit `border-b-2` expectations for both selected states.
- Added/removed: none.
- Path attached for proportional re-review: `Yes`; only this corrected path is requested for review.

## Other Execution Artifacts

All paths below are under `tickets/in-progress/token-statistics-analytics/evidence/api-e2e/`.

| Artifact | Purpose | Retention |
| --- | --- | --- |
| `server-analytics-aggregation-rerun.log` | API-F-001 first recheck | retained |
| `server-analytics-combined.log` | final API-001–API-005 backend matrix | retained |
| `server-run-details-graphql-preserved.log` | preserved GraphQL regression | retained |
| `web-token-usage-broader.log` | final 11-file web suite | retained |
| `server-build.log`, `web-build-guards.log` | production build/guard evidence | retained |
| `browser-live-command.log`, backend/frontend logs, result JSON | reproducible live setup/semantic results | retained |
| `browser-live-desktop.png`, `browser-live-mobile.png` | supporting rendered evidence | retained |
| initial/rerun focused logs | transparent test-development corrections | retained |
| `server-analytics-atomicity-tr-f-001-rerun.log` | focused exact-`P1008` test-review fix evidence | retained |
| `server-analytics-combined-tr-f-001-rerun.log` | affected backend regression after test-review fix | retained |
| `user-live-electron-graphql-this-month.json` | direct live query against the packaged backend | retained |
| `user-field-diagnosis.log` | health, read-only production DB totals, source/prototype and client-refresh diagnosis | retained |
| `user-live-electron-backend-frontend.log` | Nuxt-dev `#app-manifest` failure evidence | retained |
| `user-live-electron-backend-frontend-build.log` | successful current frontend production build against the embedded backend | retained |
| `user-live-electron-backend-browser-result.json` | semantic live result and computed active-tab style | retained |
| `user-live-electron-backend-current-frontend.png` | current frontend populated rendering against packaged backend | retained |
| supplied `ctx_b0ec...png`, `ctx_2b06...png` | actual packaged Electron user report | retained in task context |
| `web-tabs-field-revalidation.log` | focused FIELD-F-001 durable test | retained |
| `web-token-usage-field-revalidation.log` | affected 12-file/35-test matrix | retained |
| `web-field-revalidation-build.log`, `web-field-revalidation-guards.log` | production bundle and guards | retained |
| `field-rerun-backend-health.log` | real embedded backend readiness/ownership | retained |
| `field-rerun-browser-command.log`, `field-rerun-browser-result.json` | 23-assertion live execution and exact response/styles | retained |
| `field-rerun-desktop-analytics.png`, `field-rerun-desktop-runs.png`, `field-rerun-mobile-analytics.png` | rendered current evidence | retained |
| `web-tabs-tr-f-002-rerun.log` | focused durable underline-width assertion correction | retained |

## Temporary Execution Methods / Scaffolding

| Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| `/tmp/token-usage-analytics-browser-probe.mjs` | no durable feature-browser harness; needed live web-equivalent evidence | Pass, 19 semantic assertions | script deleted; browser/services/data removed |
| `/tmp/token-analytics-user-live-browser.mjs` + owned static host | safely exercise current frontend against user-owned backend without changing it | diagnosis completed; populated result and visual failure captured | script/browser/static host removed; backend untouched |
| `/tmp/token-analytics-field-rerun.mjs` + owned port `3101` static host | independently revalidate resolved field findings against live production data | Pass, 23 assertions | script/browser/static host removed; backend untouched |

## Dependencies Mocked Or Emulated

| Dependency | Method | Rationale | Limitation |
| --- | --- | --- | --- |
| Provider APIs/invoices | deterministic captured usage/cost payloads | external reconciliation is excluded | none for approved policy |
| Browser populated analytics dataset | exact component fixtures; real populated SQLite/GraphQL separately | fresh live browser was used for coverage-state/lifecycle/download journey | live charts not separately populated in Chrome |

## Test-Development Corrections

- Atomicity first draft used a fixture-total expectation inconsistent with the helper and was corrected; contention then exposed reviewed bounded SQLite `P1008`, so the durable assertion was changed to exact atomicity/reconciliation for fulfilled writes and surfaced errors for rejected writes.
- GraphQL first draft expected `codex_app_server` while its helper default was `autobyteus`; the assertion was corrected without source changes.
- Frontend first draft used identity equality against Pinia proxies; it was corrected to structural equality.
- These corrections are retained in the initial/rerun logs and do not represent implementation failures.

## Result Summary

| Result | Scenarios | Summary |
| --- | --- | --- |
| Pass | TR-F-002; FIELD-F-001/FIELD-F-002 and API-REV-005 matrix retained | both selected tab states now durably require the visible 2px underline; focused execution and hygiene pass |
| Fail | None | no remaining API/E2E or durable-test failure |
| Not rerun | browser/build/broader matrix | not proportionate for assertion-only strengthening; API-REV-005 remains authoritative |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| focused Vitest runner | API/E2E-owned | normal exit | complete |
| browser/backend/frontend/database | prior round/user | not started, stopped, or modified in round 6 | unchanged |
| temporary resources | none | none created | N/A |

## Preliminary Classification

`Pass`. TR-F-002 is resolved by an exact test-owned Local Fix. API-REV-005's implementation result, live-browser evidence, environment, cleanup, and 97.7% confidence remain authoritative.

## Recommended Recipient

`/code_reviewer` for proportional re-review of only `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts`.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `97.7%`, unchanged.
- Default target met: `Yes`.
- Final category below 90%: `No`.
- Broader validation in round 6: `Not Required`; API-REV-005 browser evidence retained.
- Durable coverage changed in round 6: `Yes` — one corrected test path, none added/removed.
- Required next recipient: `/code_reviewer` for proportional re-review.
- Notes: API-REV-006 retains Pass and closes TR-F-002; delivery remains pending test re-review only.
