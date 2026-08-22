# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/design-spec.md`
- Supplemental Artifacts: `ui-ux-spec.md`, `prototype.html`, `token-usage-analytics-data-contract.md`, task evidence images
- Solution Revision Record: `solution-revision-record.md` (`SR-001`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff / Revision: `implementation-handoff.md`; `implementation-revision-record.md` (`IR-001`–`IR-004`)
- Code Review Report / Revision: `code-review-report.md`; `code-review-revision-record.md` (`CRR-001`–`CRR-006`)
- API/E2E Test Review Report: `api-e2e-test-review-report.md` (`CRR-006` Fail — Local Fix, TR-F-001; resolved by this round pending proportional re-review)
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Execution Round: `4`
- Trigger: user field report from the packaged Electron build: unexpectedly empty Analytics plus unwanted dark selected tab; explicit request to test the current frontend against the already-running embedded backend
- Prior Round Reviewed: `API-REV-003` Pass / 96.6%; the user report reopened live environment, persisted-data-transition, and user-surface confidence
- Latest Authoritative Round: this round

## Investigation And Execution Basis

- Mandatory investigation completed before round-1 durable edits and reviewed/updated before rounds 2–4 execution: `Yes`.
- Plan followed: `Yes`. Round 4 used the running embedded backend read-only, inspected its current production SQLite state, queried live GraphQL, built the current frontend against that backend, and executed the journey in Chrome.
- Coverage decision changes during execution: none in round 4. No durable test was added, edited, or removed; the field diagnosis instead produced two failure-origin findings.
- Prior API-F-001 and TR-F-001 resolutions remained intact; round 4 did not reopen their repository evidence.
- Reroute required during round 4: `Yes`; the approved-prototype mismatch is an implementation failure and the user-rejected no-backfill first-run experience is a requirement/design impact.

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

## User Field Finding Diagnosis

| Finding | Expected | Observed | Preliminary Classification | Evidence |
| --- | --- | --- | --- | --- |
| FIELD-F-001 / selected top tab | Approved `prototype.html`: transparent active tab, blue active text, blue bottom border; user explicitly rejects black fill | source classes are `bg-slate-900 text-white`; Chrome computed `rgb(15, 23, 42)` background, white text, no bottom border; both supplied Electron screenshots match | Local Fix — implementation / prototype-fidelity defect | `user-field-diagnosis.log`; `user-live-electron-backend-browser-result.json`; current-frontend screenshot; supplied Electron screenshots |
| FIELD-F-002 / upgraded-installation analytics value | User expects existing usage to produce an immediately useful graph | production DB contains 26.27B lifetime tokens, but approved coverage starts Aug 22 and historical rows are deliberately not backfilled; initial empty is therefore current approved behavior. A fresh frontend later rendered post-coverage data. | Design Impact / Requirement Gap; bounded stale-client risk exists because there is no polling/background refresh, but screenshot timing does not prove it | live DB read in `user-field-diagnosis.log`; requirements REQ-017/AC-021–023; live GraphQL/browser artifacts |

### Live Backend And Current Frontend Result

- Existing packaged backend: `http://127.0.0.1:29695`, health `200`; production DB `/Users/normy/.autobyteus/server-data/db/production.db` was read only.
- Production DB snapshot: 1,369 run rows; 173,176 lifetime reports; 26,265,223,658 lifetime tokens; observations June 25–August 22; analytics coverage `2026-08-22T10:52:04.812Z`; two current-day analytical facets at the diagnostic read.
- Direct live GraphQL: This month returned `PARTIAL`, 1,067,561 tokens / 6 reports, complete USD cost, one populated day, and populated breakdown.
- Current frontend build: production Nuxt static build with backend URL `http://127.0.0.1:29695`; served on owned `127.0.0.1:3099`; Chrome journey passed as a diagnostic and rendered 10,263,664 tokens / 53 reports by capture time.
- Visual result: the fresh current frontend was populated, but the active Analytics tab remained the confirmed dark filled block.
- Console/page result: zero application page errors; one static-host-only favicon 404 was ignored and recorded.

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

## Validation Confidence Scorecard

| Category | API-REV-003 | API-REV-004 | Change | Current Evidence | Remaining Failure / Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 97% | 75% | -22 | prior durable matrix plus production-field diagnosis | user rejects the approved no-backfill first-upgrade experience; desired historical/initial behavior is not yet specified |
| Changed-boundary directness | 97% | 98% | +1 | direct production DB, live GraphQL, current frontend, and Chrome | negligible diagnostic gap |
| Cross-boundary realism/mock gap | 97% | 98% | +1 | current frontend → user's embedded backend → production SQLite | Electron renderer itself was observed only through user screenshots; browser exercised the same web boundary |
| Environment/config/identity/fixture fidelity | 97% | 99% | +2 | actual packaged backend, actual production DB, current frontend build, real Chrome | frontend host was owned static HTTP rather than the Electron shell |
| Failure/edge/lifecycle/recovery | 95% | 90% | -5 | prior rollback/contention/stale-response tests plus real upgrade-state inspection | no automatic refresh exists; screenshot timing does not prove whether stale empty persisted after later writes |
| User-surface/browser/desktop confidence | 96% | 70% | -26 | supplied packaged screenshots plus independent Chrome/computed-style capture | confirmed active-tab prototype mismatch and user-rejected empty first-run experience are unresolved |
| Durable regression quality/relevance | 97% | 94% | -3 | ten prior durable paths remain valid | no exact durable protection yet for prototype active-tab treatment or the newly desired first-run behavior |

- Overall current confidence: `89.1%` (624/7).
- Calculation: arithmetic mean with critical-criterion and weak-category gates.
- Every critical acceptance criterion directly proven: `No` for the user-restated first-upgrade expectation and approved visual fidelity.
- Applicable category below 90%: `Yes` — requirement/AC proof and user-surface confidence.
- Default 95% target met: `No`.
- Broader-validation result: the live backend/current frontend boundary was successfully diagnosed, but it confirmed a visual defect and a requirement/design conflict rather than closing the gap.
- Prior result note: API-REV-003's 96.6% remains historical evidence; API-REV-004 Fail/89.1% is the latest authoritative result.

## Broader Validation Decision And Execution

- Decision/mode: `Required` — read-only live production-backend diagnosis plus current frontend build and Chrome.
- User-owned resources: packaged Electron/backend PID and port `29695`, production DB, and user application state were not stopped, reset, seeded, or mutated.
- Owned resources: current frontend production-static build served on free port `3099`; temporary Playwright script/browser; all cleaned after capture.
- Development-path deviation: Nuxt dev repeatedly failed on an existing `#app-manifest` generation problem, so the same current frontend was built successfully with the embedded backend URL and served statically. Both logs are retained.

| Journey | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Backend health/live analytics | current embedded server answers and exposes truthful current state | health 200; PARTIAL This-month response with non-zero post-coverage aggregate and populated bucket/row | GraphQL JSON; diagnosis log | Pass |
| Fresh current frontend | use the running embedded backend and render its current analytics | non-zero summary/cards/graphs rendered; 10,263,664 tokens / 53 reports at capture | browser JSON + screenshot | Pass |
| Last month → This month | unavailable Last month; explicit return refreshes current data | unavailable state then non-zero current-month state | browser JSON | Pass |
| Selected-tab fidelity | match approved transparent/blue-underline prototype | dark slate filled block with white text/no bottom border | computed-style JSON, screenshot, source/prototype diff | **Fail — FIELD-F-001** |
| Existing-history expectation | immediately useful graph for already stored usage | pre-coverage 26.27B lifetime tokens deliberately excluded; only post-coverage writes render | DB diagnosis + requirements | **Fail — FIELD-F-002 expectation conflict** |
| Runtime health | no application errors | zero page errors; only static favicon 404 | browser JSON/log | Pass |

## Desktop Application Validation

- Approach: used the user's already-running packaged Electron backend as the real server and inspected the supplied Electron screenshots; exercised the current web-equivalent renderer independently in Chrome as requested.
- Packaged evidence: the two supplied screenshots confirm the empty/coverage states and dark selected tab in the actual shell.
- Browser evidence: current frontend against the same backend rendered current post-coverage usage and reproduced the exact dark active-tab computed style.
- Shell-specific code: none changed; no need to manipulate or relaunch the user's Electron process.
- Effect on running desktop app: none; backend left listening on `29695`.
- Remaining shell uncertainty: none material to the two reported renderer findings.

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
- User-impact finding: this technically matches the approved no-backfill decision but fails the user’s stated expectation of immediately useful historical/current-month graphs; ownership must return to design/requirements.
- Residual: no automatic refresh/polling exists, so an early empty result may remain until selection/apply/remount; the supplied screenshot timing cannot distinguish this from the expected immediate post-upgrade empty state.

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

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Added/updated/removed: `Yes` — the ten paths above; none removed.
- Paths attached for proportional test-code review: `Yes`.
- Removed-path evidence: N/A.

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

## Temporary Execution Methods / Scaffolding

| Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| `/tmp/token-usage-analytics-browser-probe.mjs` | no durable feature-browser harness; needed live web-equivalent evidence | Pass, 19 semantic assertions | script deleted; browser/services/data removed |
| `/tmp/token-analytics-user-live-browser.mjs` + owned static host | safely exercise current frontend against user-owned backend without changing it | diagnosis completed; populated result and visual failure captured | script/browser/static host removed; backend untouched |

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
| Pass | prior API-F-001/API-001–API-005/PRESERVED-001/WEB-001–WEB-003/BUILD-001; round-4 live API/fresh-frontend path | prior technical matrix remains valid; the current backend has and serves post-coverage data and a fresh current frontend renders it |
| Fail | FIELD-F-001, FIELD-F-002 | active-tab visual contradicts approved prototype; approved no-backfill first-run outcome contradicts the user's expectation and produces an initially empty dashboard despite extensive stored lifetime usage |
| Not conclusively reproduced | stale Electron client after later writes | no polling/background refresh exists, but supplied screenshot timing does not prove the result remained stale after post-coverage data accrued |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| user Electron/backend/production DB | user | read-only health/GraphQL/SQLite inspection; no stop/reset/seed/write | untouched; backend still listening on `29695` |
| current frontend static host `3099` | API/E2E-owned | stopped after capture | complete; no listener retained |
| Chrome/context | API/E2E-owned | closed by probe | complete |
| temporary browser script | API/E2E-owned | deleted | complete |
| prior Vitest/browser resources | prior rounds | prior documented cleanup | complete |

## Preliminary Classification

- `FIELD-F-001`: **Local Fix — implementation**. The black tab was introduced directly by `bg-slate-900 text-white` and contradicts the approved prototype's transparent/blue-underline active state.
- `FIELD-F-002`: **Design Impact / Requirement Gap**. The empty initial graph follows REQ-017/AC-021–023's deliberate no-backfill rule, but the user now explicitly requires useful existing-data analytics. Changing this safely requires renewed requirements/design treatment rather than silently inventing historical allocation.
- Bounded secondary risk: the client has no polling/background refresh, so an empty store result can remain until an explicit selection/apply/remount. This is source-confirmed but not proven as the cause of the supplied screenshot.
- Current backend aggregation defect: **not reproduced**. Direct live GraphQL and fresh current frontend both rendered non-zero post-coverage data.

## Recommended Recipient

`/code_reviewer` for focused failure-origin review of `FIELD-F-001` and `FIELD-F-002`, not proportional successful-test review. The likely ownership split is implementation rework for FIELD-F-001 and `/solution_designer` reset for FIELD-F-002.

## Latest Authoritative Result

- Result: `Fail`.
- Final validation confidence: `89.1%`.
- Default target met: `No`.
- Final category below 90%: `Yes` — requirements/user-surface.
- Broader validation: `Required` and executed against the user's current embedded backend; it disproved a currently empty backend path but confirmed the visual defect and first-upgrade expectation conflict.
- Durable coverage changed in round 4: `No`.
- Required next recipient: `/code_reviewer` for focused failure-origin review.
- Notes: API-REV-004 supersedes API-REV-003 as the latest result. Delivery is blocked until both field findings are owned and resolved/re-scoped.
