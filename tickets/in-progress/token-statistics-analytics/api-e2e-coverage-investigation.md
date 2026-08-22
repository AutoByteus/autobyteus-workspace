# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/design-spec.md`
- Supplemental Task Artifacts: `ui-ux-spec.md`, `prototype.html`, `token-usage-analytics-data-contract.md`, and task evidence images
- Solution Revision Record: `solution-revision-record.md` (`SR-001`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (`IR-001`–`IR-004`)
- Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md` (`CRR-001`–`CRR-006`)
- API/E2E Test Review Report: `api-e2e-test-review-report.md` (`CRR-006`, TR-F-001)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Investigation Round: `4`
- Trigger: user field report from the packaged Electron build: Analytics renders empty despite expected usage and the selected Analytics tab is an unwanted black block; user explicitly requested current frontend validation against the already-running embedded backend
- Prior Investigation Reviewed: `Yes` — rounds 1–3 / `API-REV-003` Pass at 96.6%; the new real-user environment and approved-prototype visual mismatch reopened browser/user-surface confidence and produced a new completed Fail result
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The change must prove an Analytics-first Token Statistics surface backed by admitted observation-time contributions rather than run-creation/lifetime totals. Only a `CHANGED` normalized fold may advance the daily projection, and its increment must share the run-save SQLite transaction. Existing run records remain directly usable and unmodified; analytics starts at a persisted coverage instant without guessed backfill. The GraphQL result must enforce half-open UTC ranges, exact opaque filters, server-owned comparison/granularity policy, SafeInt-checked public numbers, and truthful complete/partial/missing/local/mixed-currency cost quality. One client result drives cards, charts, exact rows, filters, coverage messaging, and local CSV. Run details preserves its current created-run/lifetime semantics.

Critical proof obligations include atomic rollback and cross-run contention, SafeInt boundary/overflow, opaque nullable identity/cardinality, UTC range/comparison/filter reconciliation, all cost-quality combinations, stale-response and error/loading/coverage states, accessibility/responsiveness, and exact CSV escaping/filename.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / Analytics and Run details split | Changed + Preserved | REQ-001–REQ-005, REQ-019; AC-001–AC-006, AC-024 | Prove Analytics default and preserve Run-details GraphQL/UI. |
| BEH-002 / cards, trend, pace, breakdown | Added | REQ-006–REQ-012; AC-007–AC-016 | Prove exact reconciliation, elapsed alignment, cost truth, text equivalents, and metric continuity. |
| BEH-003 / observation-time history and coverage | Added | REQ-013–REQ-018; AC-017–AC-023 | Exercise real write path, no backfill, persisted coverage, UTC allocation, and filters. |
| BEH-004 / accounting and cost quality | Changed + Preserved | REQ-020–REQ-023; AC-025–AC-029; CRR-005 | Cover SafeInt, no double counting, empty-bucket nulls, usage-bearing null rejection, and currency combinations. |
| BEH-005 / exact local CSV | Added | REQ-024–REQ-025; AC-030–AC-031 | Verify metadata, escaping, deterministic filename, and live local download. |
| BEH-006 / atomic projection write | Added | REQ-013–REQ-016; AC-017–AC-020; MP-001 | Inject rollback and stress different-run same-facet SQLite contention. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | projection/range/coverage/cost aggregation | production-function units | none material after combined run | Unit + integration |
| API / transport / contract | Yes | `tokenUsageAnalytics` GraphQL query | migrated SQLite GraphQL E2E | none material | Live GraphQL E2E |
| Frontend component / state | Yes | store, controls, charts, states, CSV | Pinia/component/serializer tests | live DOM/download integration | Browser |
| Browser integration / user journey | Yes | Settings renderer and local download | live Chrome probe | populated charts not seeded in browser; covered by exact components plus live populated GraphQL | Browser |
| Authentication / session / permissions | No | unchanged local Settings access | requirements introduce none | none | None |
| Desktop renderer / web-equivalent UI | Yes | Electron's Nuxt renderer | Chrome through normal dev proxy | packaged shell not exercised | Browser preferred |
| Desktop shell / Electron-specific integration | No | no IPC/preload/window/package change | no relevant shell code | negligible | None |
| Process / lifecycle | Yes | additive schema and coverage initialization | all migrations, built server, fresh live startup | no separate restart cycle | Build + live startup |
| Persisted-data transition | Yes | existing run rows direct-use; empty additive tables | GraphQL no-backfill/direct-use E2E and preserved Run-details E2E | none material | SQLite E2E |
| Worker / queue / distributed coordination | Yes, local concurrency | different run queues can hit one facet | real SQLite contention integration | sufficiently heavy load may return bounded SQLite timeout | Integration stress |
| External integration | No | provider quota/invoice excluded | deterministic captured inputs | none for approved scope | None |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics`
- Stack: pnpm TypeScript monorepo; Node/TypeGraphQL/Prisma/SQLite/Vitest; Nuxt/Vue/Pinia/Chart.js/Playwright Core; Electron wrapper
- Instruction caveat: server `typecheck` includes known unrelated `TS6059` failures; production `build` is accepted compilation evidence. No feature-specific browser probe existed.
- Required secrets: N/A; validation is credential-free and isolated.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| repository `README.md` | full-stack and deterministic E2E workflow | use owned isolated state; do not reuse unrelated processes/data |
| `autobyteus-server-ts/AGENTS.md`, `README.md`, `package.json`, `vitest.config.ts` | server execution | `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch`; builds generate Prisma and run smokes |
| `autobyteus-web/AGENTS.md`, `README.md`, `package.json`, `vitest.config.mts` | web tests/build/browser | colocated non-watch Vitest; browser preferred over Electron for web-equivalent behavior; run boundary/localization guards |
| migration `20260822090000_add_token_usage_analytics/migration.sql` | physical persistence | additive coverage/facet tables and indexes; no existing-row transformation |

| Component | Working Directory | Start / Setup Command | Resource Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Server tests | worktree root | server Vitest command | test-owned migrated SQLite | global setup + results | teardown/runner exit |
| Frontend tests | worktree root | web Vitest command | Nuxt happy-dom | collected result | runner exit |
| Live backend | server | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned-temp>` | empty `.env`, fresh SQLite | `/rest/health` | owned process group/temp root |
| Live frontend | web | `BACKEND_NODE_BASE_URL=<backend> pnpm exec nuxt dev --host 127.0.0.1 --port <free>` | loopback proxy | Settings HTTP | owned process group |
| Chrome | temporary probe | Playwright Core + installed Chrome | 1440x1000 and 390x844 | semantic assertions | close browser |

| Data / Fixture Need | Creation Method | Safety Notes | Cleanup |
| --- | --- | --- | --- |
| Run/analytics rows | production accumulator helpers into test SQLite | never user DB | test teardown |
| Coverage/no-usage | real coverage repository | deterministic UTC | teardown/temp deletion |
| Cost/identity | USD/EUR/local/missing/null/whitespace fixtures | no provider network | teardown |
| Browser states | fresh built server data root | owned free ports/root | probe cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` for existing run rows; ordinary additive schema migration for empty analytics tables.
- References: design `Persisted Data / State Transition Decision`; handoff `Persisted Data Transition Check`.
- Representative setup: a current-format pre-feature run row remains readable in Run details but, after removal of its analytical facet, is not backfilled into historical analytics; persisted coverage classifies July unavailable and August partial.
- Evidence: API-005 second scenario and preserved Run-details GraphQL scenario pass after all 24 migrations.
- Migration recovery: N/A; no application-data transformation was approved.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Intent | Related Scope | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| run fold/accumulator/repository tests | admission, suppression, SafeInt, real run persistence | REQ-014–REQ-020 | Still Valid | assertions match authority | Retained/supplemented |
| `token-usage-ledger-graphql.e2e.test.ts` | Run-details GraphQL | REQ-019–REQ-023 | Still Valid | preserved scenario passes | Retained |
| TokenUsage Statistics/Run-details/table/store specs | view split and existing investigation | AC-001/006/024 | Still Valid | broader suite passes | Retained |
| pace/breakdown analytics specs | elapsed alignment/exact evidence | AC-010–015/027–029/034 | Still Valid; breakdown incomplete | focused evidence | Retained; breakdown updated |
| CSV serializer spec | captured vs derived status | AC-030–031 | Needs Update | lacked escaping/filename | Updated |
| implementation screenshots/probes | visual reference | UI criteria | Out Of Scope as durable authority | not repeatable | Supplemented |

## Stale Or Obsolete Coverage Decisions

None. No relevant assertion was removed or disabled.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement Evidence | Artifact | Final Decision |
| --- | --- | --- | --- | --- |
| API-001 | UTC projection, opaque nullable identity/cardinality, SafeInt | REQ-013/016/020; AC-017/025–026 | contribution unit test | Added; 4 pass |
| API-002 | ranges/comparisons/granularity/validation | REQ-002–004/008; AC-002–004/010–011 | range-policy unit test | Added; 4 pass |
| API-003 | cost matrix, coverage, buckets/reconciliation | REQ-006–008/020–023; AC-007–012/021–029 | aggregation-policy unit test | Added; 4 pass |
| API-004 | rollback, suppression, SQLite contention | REQ-013–016; AC-017–020 | real SQLite integration | Added; 3 pass |
| API-005 | GraphQL/storage/filter/coverage/SafeInt/no-backfill | REQ-002–025; critical API ACs | GraphQL E2E | Added; 3 pass |
| WEB-001 | selections/variables/latest response/error | AC-002–005/032–033 | Pinia store test | Added; 3 pass |
| WEB-002 | controls/state matrix/charts/accessibility | AC-001–016/032–035 | states/trend specs + browser | Added; pass |
| WEB-003 | CSV status/escaping/filename/download | AC-030–031 | CSV spec + browser | Updated; pass |

## Durable Coverage To Update

| Scenario ID | Existing Path | Update | Evidence | Result |
| --- | --- | --- | --- | --- |
| WEB-002 | `TokenUsageBreakdown.spec.ts` | exact share/quality/status/currency evidence and scrollable table | AC-010/012–015/027–029/034–035 | Pass |
| WEB-003 | `tokenUsageAnalyticsCsv.spec.ts` | metadata, escaping, grouping/filter/range, filename | AC-030–031 | Pass |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command / Scope | Configuration | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 0 | aggregation-policy focused rerun | 24-migration SQLite | API-F-001/API-003 positive + negative | Pass — 1 file/4 | `server-analytics-aggregation-rerun.log` |
| 1 | combined five backend analytics files | real SQLite/GraphQL/functions | API-001–API-005 | Pass — 5 files/18 | `server-analytics-combined.log` |
| 2 | preserved ledger GraphQL scenario | migrated SQLite/GraphQL | Run-details regression | Pass — 1 pass/3 skipped | `server-run-details-graphql-preserved.log` |
| 3 | broader 11-file web suite | Nuxt Vitest | WEB-001–WEB-003 + Run details | Pass — 11 files/26 | `web-token-usage-broader.log` |
| 4 | server production build | Prisma/TS/bootstrap smokes | compilation/startup | Pass | `server-build.log` |
| 5 | web build + guards/audit | production Nuxt | bundle/boundaries | Pass | `web-build-guards.log` |
| 6 | `git diff --check` | worktree | hygiene | Pass | no output |
| 7 | focused API-004 after TR-F-001 correction | 24-migration real SQLite | only `P1008` is accepted for rejected contention calls; committed-state reconciliation retained | Pass — 1 file/3 tests | `server-analytics-atomicity-tr-f-001-rerun.log` |
| 8 | affected five-file backend matrix after TR-F-001 correction | real SQLite/GraphQL/functions | API-001–API-005 regression | Pass — 5 files/18 tests | `server-analytics-combined-tr-f-001-rerun.log` |
| 9 | `git diff --check` after test correction | worktree | final patch hygiene | Pass | no output |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Support | Remaining Uncertainty | Additional Validation |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | all API/WEB scenarios and preserved behavior pass | live renderer/download | browser |
| Changed-boundary execution directness | 97% | policies, accumulator, SQLite, schema, store/components | browser proxy/DOM | browser |
| Cross-boundary integration realism and mock gap | 96% | migrations, transaction, provider→GraphQL | live Nuxt/backend | browser |
| Environment/configuration/identity/fixture fidelity | 95% | isolated SQLite, UTC/identity/cost fixtures, builds | fresh live runtime | browser |
| Failure/edge/lifecycle/recovery evidence | 95% | rollback/contention/suppression/overflow/coverage/stale/error | no restart cycle; bounded timeout | live startup |
| User-surface/browser/desktop confidence | 92% | semantic/component exact tests; shell unchanged | no independent live DOM/download/narrow result | browser |
| Durable regression coverage quality/relevance | 97% | focused unit/integration/E2E/store/component/CSV | no durable browser harness | temporary probe |

- Overall post-repository confidence: `95.4%` (668/7).
- Calculation: arithmetic mean with critical-criterion gate.
- Every critical acceptance criterion directly proven: `Yes` at repository/API/component boundaries.
- Applicable category below 90%: `No`.
- Default target met numerically: `Yes`, but live browser validation remained required due material renderer/download/responsive uncertainty.
- Residual risks before browser: live proxy/state/download/narrow overflow; bounded SQLite P1008 under sufficient contention.

## Broader Validation Decision

- Decision: `Required`.
- Mode: `Browser` plus fresh built-backend lifecycle.
- Gap: Nuxt proxy/GraphQL, semantic DOM, range/metric/custom/coverage transitions, local download, navigation, narrow layout, console errors.
- Expected confidence: at least 95% overall; no category below 90%.
- Actual Electron not proportionate: no shell-specific code changed.
- Blocker: none.

## Desktop Application Validation Decision

- Framework: Electron-wrapped Nuxt renderer.
- Web-equivalent scope: changed Settings analytics and GraphQL/Blob-browser boundaries.
- Shell-specific scope: none changed.
- Approach: installed Chrome through Nuxt dev, backed by built server on owned ports/data.
- Effect on running desktop app: None.
- Not directly proven: packaged Electron download prompt/window integration; negligible because no IPC/preload code changed.

## Live Environment And Fixture Plan

- Create owned temp root and `.env`; start `dist/app.js` on free loopback port; await `/rest/health`; start Nuxt with `BACKEND_NODE_BASE_URL`; run Playwright Core.
- Fresh production-mode server DB; current date 2026-08-22; English UI; no credentials.
- Journeys: Analytics default/UTC/current partial empty; semantic metric switch; invalid Custom; previous-month unavailable; live CSV name/header; Run-details return continuity; desktop/mobile screenshots; 390px overflow; console/page errors.
- Evidence: result JSON, command/backend/frontend logs, screenshots.
- Cleanup: browser/context, only owned process groups, only owned temp root, temporary script.

## Temporary Executable Validation Plan

| Scenario | Probe | Behavior | Why Not Durable |
| --- | --- | --- | --- |
| WEB-002/WEB-003-live | one-off Playwright Core against built backend/Nuxt | proxy/DOM/download/navigation/responsiveness | no feature-browser fixture convention; durable API/component coverage already protects behavior, so retaining an environment-specific empty-state harness adds low value |

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Provider quota/invoice | out of scope | none | none |
| Identity/performance beyond representative 128 | no SLO | bounded | separate benchmark if needed |
| Packaged Electron shell | no shell change; browser preferred | negligible | only on shell defect |
| Guaranteed success under arbitrary SQLite saturation | design permits bounded busy/timeouts | caller may retry rejected calls; committed state atomic | operational retry is separate scope |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recipient |
| --- | --- | --- | --- |
| API-F-001 sparse-bucket reconciliation | Local Fix — resolved | empty NO_USAGE/null reconciles; usage-bearing null still fails | none; closed in API-REV-002 |
| TR-F-001 API-004 rejection assertion | Local Fix — test, resolved | each rejected result now must be an `Error` with exact code `P1008`; focused 1 file/3 tests and combined 5 files/18 tests pass | none; closed in API-REV-003 pending the already-requested proportional re-review |
| FIELD-F-001 selected Analytics/Run-details tab is a dark filled block | Local Fix — implementation | source and computed Chrome style use `bg-slate-900 text-white`; approved `prototype.html` requires transparent background, blue active text, and blue bottom border; supplied Electron screenshots reproduce the mismatch | `/code_reviewer` for focused failure-origin review |
| FIELD-F-002 upgraded installation initially shows no historical/current-month graph | Design Impact / Requirement Gap | production DB has 26,265,223,658 lifetime tokens from June 25 onward, while coverage began Aug 22 and only post-coverage facets are queried; this exactly follows the approved no-backfill rule, but the user rejects the resulting first-upgrade experience. Fresh current frontend against the same backend now renders post-coverage usage, so a current backend aggregation defect is disproved. No automatic polling exists, leaving a bounded stale-empty risk after later writes, but the supplied screenshot timing does not prove that subtype. | `/code_reviewer` for failure-origin confirmation and likely `/solution_designer` ownership of changed history/first-run expectations |

## Test-Review Local-Fix Re-entry Plan

- Existing coverage validity: API-004 remains required and valid; only its rejection classification assertion needs narrowing. The exact committed-run/facet reconciliation and variable fulfilled/rejected contention shape remain valid.
- Durable edit: replace arbitrary-`Error` acceptance with explicit structural validation of Prisma code `P1008` for every rejected promise. Do not enumerate unsupported codes.
- Execution result: focused API-004 passed 1 file/3 tests; the affected API-001–API-005 set passed 5 files/18 tests; `git diff --check` passed.
- Outcome: API-REV-002's implementation/API/browser Pass and 96.6% confidence remain unchanged; API-REV-003 records the stronger durable assertion and successful re-execution.

## User Field-Report Re-entry Plan And Result

- Evidence received: packaged Electron screenshots show coverage beginning `2026-08-22 10:52 UTC`, empty This-month analytics, unavailable Last-month analytics, and a dark-filled selected `Analytics` tab.
- Safe live target: used the already-running packaged backend at `http://127.0.0.1:29695` and its process-owned data root `/Users/normy/.autobyteus/server-data` read-only. The user's Electron/backend was not stopped, reset, or mutated.
- Data diagnosis result: the live DB had 1,369 run rows, 173,176 lifetime reports, and 26,265,223,658 lifetime tokens spanning June 25–August 22, while analytical coverage began August 22 and only two post-coverage daily facets existed. This is the approved no-backfill split, not lost backend data.
- Live API result: a direct This-month GraphQL query returned `PARTIAL` coverage, 1,067,561 tokens / 6 reports, one active day, a populated trend bucket, and a populated breakdown row. The later browser capture returned 10,263,664 tokens / 53 reports as usage continued.
- Visual diagnosis result: `TokenUsageStatistics.vue` and Chrome computed style use a dark slate filled active tab; the approved prototype requires a transparent tab with blue active text/underline. `FIELD-F-001` is confirmed.
- Broader validation result: built the current frontend with the embedded backend URL, served the owned static build on `127.0.0.1:3099`, and executed Chrome. The fresh client rendered non-zero cards/graphs and explicit Last-month → This-month refresh rendered current data without page errors. This disproves a currently empty backend/contract path but does not satisfy the user's requested first-upgrade history behavior.
- Client freshness observation: the view fetches on mount only when no store result exists and on explicit control application; it has no polling/background refresh. This can retain an earlier empty snapshot until explicit refresh/remount, but the supplied images do not establish whether they were captured before or after new post-coverage writes.
- Durable coverage decision: no repository-resident coverage was changed in round 4; this is field diagnosis and failure rerouting. Any fix must return with requirement-linked coverage.
- Evidence: `user-live-electron-graphql-this-month.json`, `user-field-diagnosis.log`, `user-live-electron-backend-frontend-build.log`, `user-live-electron-backend-browser-result.json`, and `user-live-electron-backend-current-frontend.png`.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed` — round-4 read-only live backend/API/browser diagnosis ran.
- Durable Coverage Added / Updated / Removed In Round 4: `No`.
- Final confidence: `89.1%`; requirement/user-surface categories are below 90% because the user-rejected first-upgrade experience and confirmed prototype mismatch are unresolved.
- Broader validation: `Required` and executed using current Chrome frontend against the already-running packaged Electron backend.
- Reroute Required: `Yes`.
- Recommended Recipient: `/code_reviewer` for focused failure-origin review; likely onward design ownership for `FIELD-F-002`.
- Notes: `API-REV-004` supersedes the prior Pass as the latest API/E2E result. The backend currently returns and renders post-coverage data, but `FIELD-F-001` is a confirmed implementation defect and `FIELD-F-002` is a confirmed user/approved-design expectation conflict.
