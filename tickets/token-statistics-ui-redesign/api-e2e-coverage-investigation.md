# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-doc.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/investigation-notes.md`
- Requirements Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-revision-record.md` (`RER-010`)
- Design Spec: `N/A — not applicable for the direct route`
- Supplemental Task Artifacts: approved Product `ui-ux-spec.md`; `ui-behavior-test-matrix.md`; `prototype-assumptions.md`; `implementation-feasibility-audit.md`; normative `VIS-009`–`VIS-015`; `final-reference-manifest.json`; and final prototype validation under `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-TSUI-001`
- Architecture Design Revision Record: `N/A — not applicable for the direct route`
- Design Review Report: `N/A — not applicable for the direct route`
- Architecture Review Revision Record: `N/A — not applicable for the direct route`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-revision-record.md` (`IR-001`, `IR-002`)
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/code-review-report.md` (`CRR-002` source-review pass)
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/code-review-revision-record.md` (`CRR-001`, `CRR-002`)
- Delivery Revision Record (delivery re-entry only): `N/A — delivery has not started`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: Code Reviewer outcome `Source Review Pass — API/E2E Rerun Required`; reviewed implementation source commit `49ddfb2276b292f8fee80022f81157ebeeddb478`, implementation artifact commit `76310eac5be58b3dd837024f17d267f4f102bf92`, review artifact commit `b94b38a3a`
- Prior Investigation Reviewed: `Yes — API-REV-001 Fail / 89.9%, APIE2E-F001 / TS-E2E-002, and its retained live evidence were reviewed before rerun work`
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architectural risk (`Low`/`High`): `Low`
- Input route (`Reviewed`/`Direct Low-Risk`): `Direct Low-Risk`, with focused failure-origin/source review completed for `IR-002`
- Successful-output route (`Code Review`/`Delivery`): `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The RER-010 authority remains unchanged. Analytics must fetch one coherent real result for UTC presets, Custom, applied Runtime/Provider/Model filters, Clear, failure, and Retry. Draft filter changes and presentation-only metric/grouping/disclosure changes must not request. The six fixed summary peers, authoritative cache/coverage/pricing/currency states, open-top daily Tokens/Cost line, exact accessible bucket evidence, Detailed usage identity/share/disclosures, and Run-details creation-time/lifetime semantics must remain truthful across desktop, narrow, English, and Simplified Chinese surfaces. Unsafe monetary buckets must remain null chart gaps rather than invented zeroes.

The explicit negative boundary remains mandatory: no visible or operable comparison, pace, driver, ratio, CSV/export/report/share/download path; no CSV construction, Blob, object URL, download, request, or replacement workflow. No API shape, query, generated type, persistence, accounting formula, or migration change is authorized.

`IR-002` changes only the backend aggregate/bucket reconciliation guard exposed by API-REV-001. A usage-bearing null daily cost is accepted only when that bucket's derived `costQuality.kind` is `MISSING`; the null is retained, known values alone are summed, and range/order/SafeInt/token/inconsistent-quality/known-cost-sum checks remain active. CRR-002 independently confirmed this behavior. The implementation handoff still reports a clean legacy/compatibility check and `Not Affected` persisted-data decision.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-002`, `BEH-004`, `BEH-006` / partial pricing reconciliation | Preserved via bounded correction | `IR-002`; `CRR-002`; REQ-005/010/012; AC-004/009/011/016 | Recheck APIE2E-F001 first through policy + real GraphQL, then real built server/Nuxt/Chromium; prove `PARTIAL`, known sum, null gap, and exact missing-price evidence. |
| `BEH-001` / cohesive Analytics and Run details | Preserved | REQ-001/007/009/011/014; AC-007/010/013/014 | Recheck tabs, focus, responsive Settings shell, localization, and retained Run-details behavior. |
| `BEH-002` / range, Filters, metric, context | Preserved | REQ-003/012; AC-002/010/011 | Recheck real request counts/variables, atomic Apply/Clear, Custom UTC endpoints, loading/error/retry, and presentation-only no-request behavior. |
| `BEH-003` / six peers, daily line, Detailed usage | Preserved | REQ-002/004–006/015/016; AC-001/003–006/015/016 | Recheck real aggregate/bucket/breakdown binding, chart shape/accessibility/gaps, grouped share reconciliation, and disclosures. |
| `BEH-005` / Run details | Preserved | REQ-001/013; AC-012 | Recheck two real operations, creation-time selection/lifetime totals, Task/Model no-refetch switch, sort/hierarchy/disclosure/cost/states. |
| `DEC-009` / local CSV-export path | Removed and remains absent | REQ-003/012; AC-001/002/010/011 | Recheck DOM, browser file APIs, source scan, and removed paths. |
| API/E2E exact-bucket browser step | Updated test only | AC-004/010/011; successful API response exposed collapsed-disclosure read gap | Open `Exact bucket data` before reading visible evidence; retain raw `price_missing` plus `Unpriced` assertion and partial-cost screenshot. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | existing analytics aggregation policy's legitimate-null reconciliation predicate | focused policy tests; GraphQL analytics regression | current built server combined with production Nuxt and original fixture | live API + browser |
| API / transport / contract | Preserved but material | unchanged GraphQL shape now returns the previously rejected coherent result | analytics and ledger GraphQL E2E | proxy variables/request counts and response-to-DOM coherence | live API + browser |
| Frontend component / state | No production delta in IR-002 | IR-001 Token Statistics UI remains the consumer | 53 focused component/store/Settings tests | current live partial result, disclosure, gap geometry | browser |
| Browser integration / user journey | Yes for rerun | complete retained durable journey; exact disclosure step corrected in test | durable self-starting probe | none after successful live rerun | browser |
| Authentication / session / permissions | No | local Settings access unchanged | credential-free documented path | none | none |
| Desktop renderer / web-equivalent UI | Yes | Electron-visible Nuxt renderer | browser-capable development path | current corrected result at supported widths/locales | browser preferred |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/package/native path changed | unchanged architecture/instructions | no material shell-specific gap | none |
| Process / lifecycle | Preserved | current built server, migrated isolated database, Nuxt proxy, retry and cleanup | builds and self-starting probe | current-process integration | lifecycle/browser |
| Persisted-data transition | No | current rows directly read; decision remains `Not Affected` | current migrations, GraphQL tests, fixture | representative current data through current readers | live API/browser |
| Worker / queue / distributed coordination | No | none changed | out of changed boundary | none | none |
| External integration | No | provider invoice/quota systems excluded | deterministic captured accounting contract | none for approved scope | none |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements`; branch `requirements/token-statistics-ui-redesign`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue 3/Pinia/Tailwind; Fastify/TypeGraphQL/Prisma/SQLite server; Vitest; Playwright Core/Chromium; Electron wrapper
- Conflicting, missing, or unclear project instructions: web `nuxi typecheck` retains an accepted unrelated 313-diagnostic baseline; server `tsconfig.json` includes tests outside `rootDir: src`; production builds pass. Historical token-usage docs describe superseded UI/CSV behavior and are not requirements authority.
- Required environment variables or secrets available: `N/A — credential-free isolated data and local services are sufficient`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md`, `README.md`, `package.json`, `vitest.config.mts` | frontend tests and browser/Electron development | colocated Nuxt tests; browser path is preferred for web-equivalent Electron behavior; package script `test:e2e:token-statistics-ui` is the durable boundary. |
| `autobyteus-server-ts/AGENTS.md`, `README.md`, `package.json`, `vitest.config.ts` | backend build/test setup | production build generates Prisma and runs bootstrap smoke; focused Vitest owns/reset an isolated migrated SQLite DB. |
| root `package.json`, `scripts/development/run-dev.mjs` | documented real stack | backend and Nuxt are normal services; probe uses free loopback ports and owned data to avoid collisions. |
| RER-010 and approved Product artifacts | behavior authority | current approved presentation and removed-export decisions supersede historical documentation. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | task root | `pnpm -C autobyteus-server-ts build` | current source and generated Prisma | production bootstrap smoke | command exits |
| Server focused coverage | `autobyteus-server-ts` | `pnpm exec vitest run <policy> <analytics GraphQL> <ledger GraphQL> --no-watch` | test-owned migrated SQLite | Vitest result | test teardown |
| Frontend focused coverage | task root | `pnpm -C autobyteus-web test:nuxt --run <focused paths>` | Nuxt/happy-dom | Vitest result | runner exit |
| Real backend/Nuxt/Chromium | durable probe | `pnpm -C autobyteus-web test:e2e:token-statistics-ui -- --skip-server-build --output-dir <ticket evidence>` | fresh owned SQLite, free ports, 1440/390 en/zh-CN | `/rest/health`, Settings HTTP, semantic DOM | probe closes browser, terminates process groups, removes owned root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| 29-day current-month analytics | deterministic current Prisma schema fixture | owned SQLite only; UTC dates anchored to current month | database removed; JSON/screenshots retained |
| price/cache/coverage truth matrix | complete, partial/missing, USD/EUR, local, and five cache states | current authoritative fields, no provider calls | owned database removed |
| Run-details rows | current-format standalone/team-member cumulative rows | proves creation-time selection and lifetime totals without legacy path | owned database removed |
| failure/loading | one actual analytics operation delayed/fulfilled with injected error, route removed before Retry | only the failure step is injected; decisive successful paths use real backend | browser context closed |
| locales | isolated `en` and `zh-CN` browser contexts | existing product preference path | contexts closed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: direct route has no architecture design; requirements `Data Continuity And Acceptable Loss`; implementation handoff `Persisted Data Transition Check`
- Representative existing-data setup and required behavior: current-schema analytics facets and current cumulative run rows are read directly without transformation, fallback, or version branch.
- Evidence: current migrations; server analytics/ledger GraphQL E2E; owned live server/browser run over production-format opaque keys.
- Migration-specific completion/recovery scenarios: `N/A — no migration required`
- Upstream ambiguity or reroute required: `None`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/token-usage/services/token-usage-analytics-aggregation-policy.test.ts` | legitimate `MISSING` null bucket passes; inconsistent null-quality rejects | AC-004/009/011/016; IR-002 | Still Valid | directly executes changed predicate and retained guards | rerun first |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | priced + fully unpriced + empty days return `PARTIAL`, 360 exact tokens, known sum, gap evidence | same | Still Valid | current observation/projection/repository/provider/schema | rerun first |
| `token-usage-ledger-graphql.e2e.test.ts` | preserved ledger/run projections | AC-012/016 | Still Valid | current migrated database and GraphQL | rerun alongside changed boundary |
| eight focused Token Statistics component specs | controls, six peers, trend/exact table, Detailed usage, Run details | AC-001–016 | Still Valid | current production components | rerun |
| analytics/Run-details stores and Settings page specs | variables, clearing/sequencing/error, two queries, navigation | AC-002/009–013 | Still Valid | current store/page dependencies | rerun |
| `autobyteus-web/tests/e2e/token-statistics-seed.mjs` | deterministic current-schema truth matrix | AC-001/004/009/011/012/016 | Still Valid | API-REV-001 revealed a real source defect, not invalid data | retain unchanged |
| `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` / TS-E2E-001–005 | real server/Nuxt/Chromium API, browser, file-negative, and lifecycle coverage | all material ACs | Needs Update, then Still Valid | successful partial response revealed the probe read only collapsed disclosure visible text | open exact-bucket disclosure before asserting; rerun full workflow |
| deleted pace/CSV/exact-table paths | obsolete prior presentation/export/component ownership | explicit REQ-003–006/012 and DEC-009 | Stale / Remove or Replace, already implemented | approved absence and replacement on-page evidence | retain removal and negative coverage |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| deleted `TokenUsagePaceChart.spec.ts` | comparison/pace UI | presentation is explicitly removed | REQ-004/005; AC-003/004 | negative DOM/source assertion plus one current line | no pace behavior supported |
| deleted `tokenUsageAnalyticsCsv.spec.ts` | local CSV serialization/download | CSV/export is explicitly removed | DEC-009; REQ-003/012; AC-011 | negative source and browser file/API boundary | no replacement export/report/share allowed |
| removed separate exact-table component authority | dedicated 12-column component | exact evidence moved, not removed | REQ-006/008/011/012 | trend exact disclosure + Detailed usage disclosure | separate component no longer owns a behavior |

## Durable Coverage To Add

No new scenario was required in round 2. TS-E2E-001–005 and the deterministic seed added in API-REV-001 remain the correct durable boundary.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `TS-E2E-002` | `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` | open the `Exact bucket data` disclosure before reading `innerText`; assert visible `Unpriced` and raw `price_missing`; capture partial-cost screenshot | AC-004/010/011/016; approved on-page exact evidence | API/E2E-owned harness correction; no production behavior changed |

## Durable Coverage To Remove

No API/E2E durable coverage is removed in round 2.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts build` | task root, current `49ddfb227` source | current production server compile, Prisma generation, bootstrap | Pass | `evidence/api-e2e/api-rev-002-server-build.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/services/token-usage-analytics-aggregation-policy.test.ts tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts --no-watch` | isolated migrated server test DB | prior failure predicate, current GraphQL result, preserved ledger | Pass — 3 files / 13 tests | `evidence/api-e2e/api-rev-002-server-focused.log` |
| 3 | `pnpm -C autobyteus-web test:nuxt --run <8 focused Token Statistics component specs>` | Nuxt test config | presentation, chart/exact evidence, Detailed usage, Run details | Pass — 8 files / 25 tests | `evidence/api-e2e/api-rev-002-web-focused.log` |
| 4 | `pnpm -C autobyteus-web test:nuxt --run <analytics/run stores + Settings page>` | Nuxt test config | variables/lifecycle/navigation | Pass — 3 files / 28 tests | `evidence/api-e2e/api-rev-002-web-stores-settings.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | direct changed-policy and current GraphQL regression plus 53 focused UI/store tests | full user journey with corrected server not yet rerun at this gate | durable live workflow |
| Changed-boundary execution directness | 94% | current production policy, repository/provider/schema, and built server executed | proxy/UI consumption remains pending | live API + browser |
| Cross-boundary integration realism and mock gap | 91% | real SQLite/GraphQL path; frontend tests cover state | repository phases do not join backend, proxy, DOM, and browser | live stack |
| Environment, configuration, identity, and fixture fidelity | 94% | current migrations, production-format GraphQL regression, current build | complete truth-matrix environment pending | isolated deterministic live stack |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | positive/negative policy tests and store failure coverage | live failure/retry and process cleanup pending | lifecycle/browser |
| User-surface, browser, and desktop-shell confidence | 88% | focused semantic component tests and prior historical run | current corrected partial result/gap/disclosure not yet observed in browser | Chromium at 1440/390, en/zh-CN |
| Durable regression coverage quality and relevance | 95% | narrow server regressions and retained self-starting browser probe are requirement-linked | probe must be rerun and its disclosure read corrected | update and rerun probe |

- Overall post-repository confidence: `92.7% (649/7)`
- Calculation method: arithmetic mean, subject to critical-criterion and weak-category gates
- Every critical acceptance criterion directly proven: `No at this gate — AC-004/009/011/016 still require current live response-to-gap proof`
- Any applicable category below `90%`: `Yes — user-surface/browser/desktop-shell confidence (88%)`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: the exact prior real-stack failure must be rechecked; current browser gap/disclosure behavior, request coherence, negative file APIs, localization, and lifecycle cleanup remain necessary.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API + Browser + Lifecycle`
- Specific confidence gap or residual risk addressed: APIE2E-F001 resolution through the complete current data → built server → GraphQL → Nuxt proxy/store → rendered gap/exact-evidence path, plus all retained TS-E2E scenarios.
- Why the selected mode can materially improve confidence: API-REV-001 failed only at this realistic boundary; repository tests alone cannot prove response-to-DOM coherence, request counts, browser file APIs, layout, focus, localization, or process cleanup.
- Expected confidence after selected validation: `>=95% with no category below 90% if TS-E2E-001–005 pass and cleanup completes`
- Browser-specific decision and rationale: Chromium is the project-preferred direct surface for the web-equivalent Electron renderer; no shell-specific source changed.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer
- Relevant README or development instructions: `autobyteus-web/README.md`, `autobyteus-web/AGENTS.md`
- Web-equivalent behavior: all changed Token Statistics UI, GraphQL proxy, focus, accessibility, layout, locale, and browser file APIs
- Shell-specific or lifecycle behavior: no preload, IPC, native menu, window, package, updater, or file-system boundary changed
- Chosen validation approach and why it fits the project: browser development path for the complete changed renderer boundary; actual Electron is unnecessary and would not add material evidence
- Server/frontend setup: built current server, owned migrated SQLite, free loopback ports, Nuxt dev proxy, isolated Chromium contexts
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: unchanged packaged Electron chrome/lifecycle; negligible scoped uncertainty retained

## Live Environment And Fixture Result

- Startup order and command: current server build; durable probe creates owned root/database, migrates and seeds; starts built server and Nuxt on free loopback ports; checks health/HTTP; launches Chromium; closes/terminates/removes in `finally`.
- Environment: Linux arm64, UTC, Node v22.23.1, pnpm 10.28.2, Chromium 149.0.7827.196, 1440x900 and 390x844, `en` and `zh-CN`.
- Fixture: 29-day current month; complete/partial/missing/mixed/local cost states; five cache states; current team and standalone run records.
- Result: `Pass` after one API/E2E-owned harness correction. The first round-2 probe reached a successful `PARTIAL` API response and 2 points/2 paths but read collapsed `<details>.innerText()`; the durable probe now opens the disclosure, asserts `Unpriced` + `price_missing`, and captures `analytics-partial-cost.png`. The complete rerun passed TS-E2E-001–005 with no failures and complete cleanup.
- Evidence: `evidence/api-e2e/token-statistics-browser-result.json`; `api-rev-002-browser-probe.log`; `api-rev-002-browser-probe-rerun.log`; screenshots and live logs in the same directory.

## Temporary Executable Validation Plan

None. The material live scenarios remain repository-resident durable coverage.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| packaged Electron shell | no shell/native boundary changed; browser directly represents the changed renderer | negligible | none unless Delivery finds a shell-only defect |
| provider invoice/quota reconciliation | explicitly excluded; UI consumes captured accounting/status contract | none for approved scope | separate package if desired |
| screenshot glyph fidelity for Simplified Chinese | validation host lacks a complete CJK screenshot font; correct Chinese DOM text and no-overflow layout passed | bounded visual-font uncertainty only | Delivery/user verification may inspect on a normal desktop font stack |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Prior APIE2E-F001 | Local Fix, resolved | current server build; 3/13 server tests; live `PARTIAL` response, two truthful points/paths, exact `price_missing` evidence | none |
| Round-2 collapsed-disclosure assertion | Local Fix owned by API/E2E, resolved within round | first rerun log/result plus updated durable test and successful full rerun | none |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — one existing browser probe updated; no additions or removals`
- Post-repository confidence: `92.7%`
- Broader validation decision: `Required — executed Live API + Browser + Lifecycle`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: final execution result and confidence are authoritative in `api-e2e-execution-coverage-report.md`; API-REV-001 remains historical failure evidence and API-REV-002 records its resolution.
