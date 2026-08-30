# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/requirements-doc.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/investigation-notes.md`
- Requirements Revision Record: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/requirements-revision-record.md` (`RER-010`)
- Design Spec: `N/A — not applicable for the direct route`
- Supplemental Task Artifacts: approved Product `ui-ux-spec.md`, `ui-behavior-test-matrix.md`, `prototype-assumptions.md`, `implementation-feasibility-audit.md`, normative `VIS-009`–`VIS-015`, final reference manifest, and final prototype validation under `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-TSUI-001`
- Architecture Design Revision Record: `N/A — not applicable for the direct route`
- Design Review Report: `N/A — not applicable for the direct route`
- Architecture Review Revision Record: `N/A — not applicable for the direct route`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/implementation-revision-record.md` (`IR-001`, `IR-002`)
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/code-review-report.md` (`CRR-002`)
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/code-review-revision-record.md` (`CRR-001`, `CRR-002`)
- Delivery Revision Record: `N/A — delivery has not started`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/token-statistics-ui-redesign/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: `2`
- Trigger: `CRR-002` source-review pass for `IR-002`, resolving `CRR-001 / F-001` and requiring APIE2E-F001 / TS-E2E-002 first, then the complete retained workflow
- Prior Round Reviewed: `API-REV-001 — Fail / 89.9%`
- Latest Authoritative Round: this report

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk` with completed focused failure-origin/source review
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: canonical path above
- Investigation completed before durable coverage changes or final execution: `Yes — API-REV-001 investigation was read; round-2 trigger, changed boundary, prior failure, coverage validity, commands, and broader gate were updated before final rerun`
- Investigation plan followed: `Yes`
- Existing coverage decisions revised during execution: the retained TS-E2E-002 expectation was valid, but the browser probe read `innerText()` while `Exact bucket data` remained collapsed. The corrected API response had already produced `PARTIAL`, two points, and two separated paths. The API/E2E-owned test now opens the disclosure before asserting visible `Unpriced` and raw `price_missing`, and captures a partial-cost screenshot.
- Reroute required before or during execution: `No — the only new issue was a bounded API/E2E test-harness correction resolved and fully rerun in this round`
- Notes: the initial round-2 probe log is retained as execution-development evidence; it is not a completed API revision. The successful complete rerun is authoritative.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce backward compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Compatibility-related reroute classification: `N/A`
- Upstream recipient notified: pending dynamic handoff after report persistence

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `APIE2E-F001 / TS-E2E-002` | partial/missing pricing, known cost, null gap, exact evidence; AC-004/009/011/016 | current facets → corrected aggregation policy → GraphQL → store/UI | policy + current GraphQL + built live server/Nuxt/Chromium | Durable + Live + Browser | **Pass — prior failure resolved** | 3/13 server log; final JSON `gapPoints=2`, `gapPaths=2`, `partialApiError=null`; `analytics-partial-cost.png` |
| `TS-E2E-001` | preset/Custom/Apply/Clear, no-request presentation state, loading/failure/retry/no stale, summary/chart; AC-001–004/009–011/015 | Nuxt controls/store → proxy → real GraphQL; SVG/accessibility | live owned stack + Chromium | Durable + Live + Browser | Pass | final JSON: coherent Custom UTC variables; request deltas; 6 equal cards; 29 points/rows; failure/retry recovered |
| `TS-E2E-003` | Detailed usage grouping/share/exact evidence/no driver; AC-003/005/006/011/016 | real GraphQL breakdown → browser regroup/disclosure | live browser | Durable + Live + Browser | Pass | 7 rows, 30,071 reconciled tokens, 100% shares, exact local status/currency; screenshot |
| `TS-E2E-004` | Run-details creation-time selection/lifetime totals, two operations, Task/Model no-refetch, hierarchy/sort/cost/states; AC-012 | current run rows → two GraphQL operations → tables | live browser | Durable + Live + Browser | Pass | 1,500 input/500 output team lifetime totals; one task + one model request; screenshot |
| `TS-E2E-005` | 1440/390, keyboard/focus, internal scroll, en/zh-CN, negative export/file boundary; AC-002/007/008/010/011/013–015 | Settings renderer and browser DOM/file APIs | Chromium contexts | Durable + Browser | Pass | no page overflow; 3 ticks; focus visible; Blob/object URL/download=0; no page/console errors; screenshots |
| `REP-API` | corrected policy/GraphQL plus preserved ledger | production policy/schema/repository/SQLite | server Vitest | Durable | Pass | 3 files / 13 tests, current migrations |
| `REP-WEB` | focused production UI/store/Settings regression | current Nuxt components/stores | Nuxt Vitest | Durable | Pass | 11 files / 53 tests |
| `REP-BUILD` | current corrected server production build | build, generated Prisma, bootstrap smoke | repository build | Durable | Pass | `api-rev-002-server-build.log` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | first round-2 `test:e2e:token-statistics-ui -- --skip-server-build --output-dir <evidence>` | current built server; owned migrated/seeded stack | prior APIE2E-F001 first | Test-harness iteration: production path passed; collapsed-disclosure test assertion failed after 2 points/2 paths | `api-rev-002-browser-probe.log`; overwritten intermediate result retained through log/revision narrative |
| 2 | update TS-E2E-002 to open exact disclosure before `innerText()` | repository durable probe | visible exact evidence interaction | Pass via subsequent full rerun | `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` |
| 3 | same durable command, full rerun | current built server; fresh owned stack; Chromium | TS-E2E-001–005 and lifecycle cleanup | Pass | `api-rev-002-browser-probe-rerun.log`; final structured JSON |
| 4 | two focused Nuxt commands | current frontend | 53 component/store/Settings regressions after durable test correction | Pass — 11 files / 53 tests | `api-rev-002-web-focused.log`; `api-rev-002-web-stores-settings.log` |
| 5 | source and cleanup audit | task root/final JSON | forbidden export paths/patterns; browser/process/temp cleanup | Pass | final JSON `sourceBoundary`, `browserEvents`, `cleanup`; git checks |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 98% | +4 | every material TS-E2E journey passed; prior partial criterion now directly proven | negligible deterministic-fixture limitation |
| Changed-boundary execution directness | 94% | 98% | +4 | current production policy, built server, schema, proxy, store, component, and browser executed | unchanged packaged shell not run |
| Cross-boundary integration realism and mock gap | 91% | 98% | +7 | real current SQLite, backend, GraphQL, Nuxt proxy, and Chromium; no decisive successful path mocked | only deliberate failure step injected |
| Environment, configuration, identity, and fixture fidelity | 94% | 97% | +3 | current migrations, production-format opaque keys, full truth matrix, current run rows, free owned ports/data | deterministic direct seed bypasses ingestion writer; server GraphQL regression covers current observation path |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 97% | +4 | strict negative policy case, partial/mixed/local/empty, injected no-stale failure/retry, complete owned cleanup | no material residual recovery gap |
| User-surface, browser, and desktop-shell confidence | 88% | 95% | +7 | Chromium 149 at 1440/390, English/Chinese DOM, focus/layout/scroll, SVG/exact disclosure, browser file APIs | host screenshot font lacks complete CJK glyph coverage; shell unchanged/not run |
| Durable regression coverage quality and relevance | 95% | 97% | +2 | self-starting isolated requirement-mapped probe now interacts with the disclosure correctly and passes by default | no material gap in changed scope |

- Overall post-repository confidence: `92.7% (649/7)`
- Overall final confidence: `97.1% (680/7)`
- Calculation method: arithmetic mean, subject to critical-criterion and weak-category gates
- Confidence change produced by broader validation: `+4.4 percentage points`
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: deterministic current-schema seed rather than external provider ingestion; incomplete CJK screenshot font on the Linux host; unchanged packaged Electron shell not executed. None blocks this renderer/backend package.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required — Live API + Browser + Lifecycle`
- Material deviation: one retained probe assertion was corrected to interact with the closed disclosure before reading visible text; the full workflow was then rerun from a fresh environment.
- Confidence gap addressed: exact prior real-stack partial-pricing failure plus all request, rendering, accessibility, localization, negative-file, Run-details, and cleanup risks.
- Startup/readiness: current server build passed; probe applied current migrations and deterministic seed to owned SQLite; built backend passed `/rest/health`; Nuxt Settings route passed HTTP readiness; Chromium launched.
- Environment choices: Linux arm64, UTC, credential-free, free loopback ports, isolated database/data/browser contexts; no user profile/database/Electron process touched.
- Seed identities: complete USD, Partial E2E with priced/unpriced days, EUR mixed, local/no-bill, zero/not-reported/unknown cache, current team and standalone run rows.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| prior partial failure | coherent `PARTIAL` API result; known $0.06; unpriced day null/gapped; exact status | no GraphQL error; `partialApiError=null`; two cost points/two paths; disclosure shows `Unpriced` and `price_missing` | final JSON, backend log, `analytics-partial-cost.png` | Pass |
| default current month | six ordered equal peers and 29 exact daily points/rows with open-top line/axes | six 185.5px peers; 29 points/rows; one daily path/guide; axes present; top border absent | final JSON, `analytics-desktop.png` | Pass |
| request coherence | draft/presentation changes do not request; preset/Custom/Apply/Clear each coherent | Custom uses UTC start/exclusive end; presentation changes unchanged counts; clear/filter each one result | 17 analytics requests across complete journeys, correlated variables/responses | Pass |
| cache/cost truth matrix | positive/zero/not-reported/local/unknown and mixed currency remain explicit | 36.7%, 0%, Not reported, Not supported, Unknown; mixed cost line suppressed | final JSON | Pass |
| Detailed usage | totals and shares reconcile; exact status/currency disclosed | 7 rows; 30,071 tokens; 100%; `local_no_api_bill`, currency unavailable | final JSON, `detailed-usage-desktop.png` | Pass |
| delayed failure/retry | stale result absent during loading/error; Retry recovers | stale surfaces false; one injected error only; later real results recover | final JSON response/error and scenario | Pass |
| Run details | creation-time range with lifetime totals; two automatic operations; view switch no refetch | helper copy correct; 1 task + 1 model operation; no model-switch refetch; lifetime totals correct | final JSON, `run-details-desktop.png` | Pass |
| narrow/localized/file negative | no page overflow; focus visible; 3 ticks; Chinese labels; no export/file behavior | 390=390; 2 equal peers; focus active; internal table scroll; Chinese DOM present; Blob/object URL/download=0 | final JSON; narrow screenshots | Pass |

## Desktop Application Validation

- Validation approach: project-preferred Chromium development path for the changed web-equivalent Electron renderer.
- Browser-tested evidence: complete Token Statistics UI and real proxy/API, focus, accessibility, layout, locale, and file APIs.
- Shell-specific evidence: `N/A — no preload/IPC/window/package/native source changed`; actual Electron was not launched.
- Effect on any already-running desktop application: `None`
- Not directly proven: unchanged packaged window/chrome lifecycle. The Linux screenshot host lacks a complete CJK glyph font, but correct Chinese DOM strings and no-overflow layout passed.

## Platform / Runtime Targets

- Operating system / platform: `Linux arm64` (Ubuntu-based validation host)
- Runtime/frameworks: Node `v22.23.1`; pnpm `10.28.2`; Nuxt `3.21.1`; Vue `3.5.28`; Prisma `5.22.0`; current Fastify/GraphQL build
- Browser / engine: Chromium `149.0.7827.196`
- Viewports/locales/timezone: `1440x900 en-US UTC`; `390x844 en-US UTC`; `390x844 zh-CN UTC`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data: current-schema analytics facets and cumulative team/standalone run rows with production-format opaque keys.
- Direct-use result: complete/partial/mixed/local/cache/breakdown/run rows read directly without migration/fallback; formerly rejected legitimate partial rows now return and render truthfully.
- Migration completion/recovery: `N/A — no migration required`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: `None material for approved current-data scope`

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` / TS-E2E-002 | Updated | AC-004/010/011/016 exact visible bucket evidence | Pass in complete live rerun | opens exact disclosure, asserts `Unpriced` + `price_missing`, captures partial-cost screenshot |

The API-REV-001 additions remain retained and valid: `autobyteus-web/tests/e2e/token-statistics-seed.mjs`, the self-starting probe, and the `test:e2e:token-statistics-ui` package script.

## Tests Removed As Stale Or Obsolete

No API/E2E test was removed in round 2. The implementation-owned pace, local CSV, and separate exact-table removals remain approved and are protected by negative/source and replacement-evidence coverage.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes — one existing browser probe updated`
- Paths added or updated: `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs`
- Paths removed: `None`
- Added or updated paths attached for proportional test-code review: `Not Applicable — direct low-risk route; path remains included in the cumulative Delivery references`
- Diff/removal evidence: source diff; final JSON `sourceBoundary`; no removed API/E2E path

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `evidence/api-e2e/token-statistics-browser-result.json` | authoritative structured current live result | Retained | Pass; all nine scenario groups; failures empty; cleanup complete |
| `evidence/api-e2e/api-rev-001-token-statistics-browser-result.json` | historical API-REV-001 structured failure result | Retained | preserves prior failure alongside revision record/git history |
| `evidence/api-e2e/api-rev-002-browser-probe.log` | first round-2 harness iteration | Retained | production partial result succeeded; collapsed-disclosure assertion identified |
| `evidence/api-e2e/api-rev-002-browser-probe-rerun.log` | authoritative full probe command log | Retained | Pass |
| `evidence/api-e2e/analytics-partial-cost.png` | corrected partial-cost and gap evidence | Retained | exact disclosure was opened before semantic assertion |
| other `analytics-*`, `detailed-usage-*`, `run-details-*` PNGs | supporting renderer evidence | Retained | semantic assertions remain authoritative |
| `api-rev-002-server-build.log`, `api-rev-002-server-focused.log`, `api-rev-002-web-*.log` | current build/repository evidence | Retained | all pass |
| `backend.log`, `frontend.log`, `database-migrate.log` | live service and migration evidence | Retained | append history contains round-1/round-2 probe executions |

## Temporary Execution Methods / Scaffolding

None. The live runner and seed are retained as durable project coverage.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| provider billing/invoice services | deterministic captured pricing/accounting summaries | external invoice reconciliation is explicitly excluded | none for approved captured estimate/status contract |
| one failing analytics response | Playwright intercepts and fails one actual operation, then removes the route before Retry | deterministic no-stale/recovery proof | successful decisive paths, including partial pricing, use the real backend |

No database, GraphQL schema, backend, Nuxt proxy, production component, or browser boundary was mocked for the decisive success evidence.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| **Pass** | `APIE2E-F001 / TS-E2E-002` | prior backend rejection resolved; live current partial result returns and renders two truthful monetary segments plus exact missing-price evidence |
| Pass | `TS-E2E-001`, `TS-E2E-003`, `TS-E2E-004`, `TS-E2E-005`, `REP-API`, `REP-WEB`, `REP-BUILD` | all retained API/browser/Run-details/responsive/localization/file-negative/repository/build journeys pass |
| Not Tested | packaged Electron shell | unchanged and browser-equivalent renderer path selected per project guidance |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Chromium contexts/process | probe-owned | close in `finally` | Complete |
| Nuxt and built backend | probe-owned process groups | terminate; backend clean exit and frontend SIGTERM | Complete |
| SQLite/data/temp root | probe-owned `/tmp/autobyteus-token-statistics-e2e-*` | recursive removal | Complete |
| free loopback ports | probe-owned | released with child termination | Complete |
| user profile/database/Electron | not used/not owned | untouched | Safe |
| ticket evidence | validation-owned | retained | Intentional |

## Preliminary Classification

- Result is `Pass`; no open failure classification applies.
- Prior `Local Fix` APIE2E-F001 is resolved by `IR-002 / CRR-002` and current direct evidence.
- The collapsed-disclosure harness issue was an API/E2E-owned `Local Fix` resolved within round 2 and fully rerun; it does not indicate a production defect.

## Recommended Recipient

`/software_engineering_team/delivery_engineer` for integration, documentation sync, user verification, and finalization, subject to the exact recipient returned by `get_handoff_rules`.

## Evidence / Notes

- The final current JSON contains one intentionally injected GraphQL error for the retry journey and no unexpected GraphQL, page, or console errors.
- API-REV-001 remains historical evidence; API-REV-002 is the current successful result.
- Direct-route test-code review is `Not Required — direct low-risk route`, despite the narrow durable test correction; dynamic handoff rules remain authoritative.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `97.1%`
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required — executed Live API + Browser + Lifecycle`
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `/software_engineering_team/delivery_engineer`, subject to `get_handoff_rules`
- Notes: `Medium` / `Low` preserved; one durable browser probe updated; no API/E2E tests removed; no material blocking residual risk.
