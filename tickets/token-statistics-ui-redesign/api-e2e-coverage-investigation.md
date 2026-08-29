# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-doc.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/investigation-notes.md`
- Requirements Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-revision-record.md` (`RER-010`)
- Design Spec: `N/A — not applicable for the direct route`
- Supplemental Task Artifacts: approved Product `ui-ux-spec.md`; `ui-behavior-test-matrix.md`; `prototype-assumptions.md`; `implementation-feasibility-audit.md`; normative `VIS-009`–`VIS-015` and `final-reference-manifest.json`; final prototype validation, all under `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-TSUI-001`
- Architecture Design Revision Record: `N/A — not applicable for the direct route`
- Design Review Report: `N/A — not applicable for the direct route`
- Architecture Review Revision Record: `N/A — not applicable for the direct route`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `N/A — not applicable for the direct route`
- Code Review Revision Record: `N/A — not applicable for the direct route`
- Delivery Revision Record (delivery re-entry only): `N/A — initial API/E2E validation`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: Implementation Engineer outcome `Implementation Ready — Direct API/E2E`, production commit `603aa510ef2333c7c271a2c9149b48e63c93e6b9`, artifact commit `07e082458004b3d1dcbcd0b8973e7f5bf8ac3d3d`
- Prior Investigation Reviewed: `No prior investigation exists for REQPKG-TSUI-001; prior Token Statistics analytics API/E2E reports were read only as project-history and execution-pattern evidence, not as the current result`
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architectural risk (`Low`/`High`): `Low`
- Input route (`Reviewed`/`Direct Low-Risk`): `Direct Low-Risk`
- Successful-output route (`Code Review`/`Delivery`): `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The approved result must preserve the existing analytics and Run-details GraphQL/store semantics while replacing the Token Statistics presentation. Analytics must fetch one coherent result for UTC preset, Custom, Runtime, Provider, and Model selection changes; draft filter edits must remain atomic until Apply, Clear must produce an unfiltered coherent result, and loading/failure must not leave a prior result appearing current. Tokens/Cost, Detailed-usage grouping, row disclosure, and tab/disclosure presentation state must not introduce analytics requests.

The populated surface must render six equal desktop summary peers in the fixed order Total tokens, Uncached input, Cached input, Output, Estimated API cost, and Cache hit rate. Cache, pricing, currency, coverage, local/no-bill, empty, and error states must remain authoritative. A 29-day current-month result must render one open-top token line with 29 point markers, explicit axes and Y unit, five desktop/three narrow ticks, one midpoint guide, and complete exact bucket evidence. Unsafe cost buckets must be gaps rather than invented zeroes. `Detailed usage` must remain visible, contextual, regroupable, share-reconciled, and expandable to exact accounting/status/currency evidence.

The user explicitly removed every visible/operable comparison, pace, ratio, contributor/driver, and CSV/export/report/share/download path. Run details remains a separate creation-time selection whose returned rows show lifetime totals; Task/Model presentation switching, fetch behavior, hierarchy, sorting, expansion, costs, state handling, and migration guidance remain intact. English and Simplified Chinese, keyboard focus restoration, accessible naming/evidence, desktop/resized Settings widths, and 390px narrow behavior are mandatory. The approved Product prototype is browser-only and synthetic, so it is not production-boundary proof.

Implementation-handoff compatibility and transition checks are clean: no compatibility mechanism or retained legacy runtime branch was introduced; persisted data is `Not Affected`, existing generated result and Pinia shapes are consumed directly, and no migration is authorized or required.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / cohesive Analytics and Run-details shell | Changed + Preserved | REQ-001, REQ-007, REQ-009, REQ-011, REQ-014; AC-007, AC-010, AC-013, AC-014 | Recheck semantic tabs, default Analytics, no redundant title, focus, responsive Settings shell, English/Chinese. |
| BEH-002 / compact range, Filters, metric, context | Changed + Preserved | REQ-003, REQ-012; AC-002, AC-010, AC-011 | Prove real request variables/counts for presets, Custom, Apply/Clear/retry; no requests for presentation-only state; draft and focus behavior. |
| BEH-003 / six peers, line, Detailed usage | Changed | REQ-002, REQ-004–REQ-006, REQ-015, REQ-016; AC-001, AC-003–AC-006, AC-015, AC-016 | Prove real aggregate/bucket/breakdown binding, 29-point geometry/accessibility, gap truth, regroup/share/exact evidence, and forbidden-presentation absence. |
| BEH-004 / coverage, pricing, cache, lifecycle states | Preserved with restyle | REQ-010–REQ-012, REQ-016; AC-009–AC-011, AC-016 | Exercise real full/partial/unavailable/empty and pricing/cache fixtures plus delayed/failing request recovery without stale results. |
| BEH-005 / Run-details light unification | Changed + Preserved | REQ-001, REQ-013; AC-012 | Execute real two-query Run-details path, creation-time/lifetime semantics, Task/Model no-refetch switch, sorting, hierarchy, disclosure, costs and empty/error guidance. |
| BEH-006 / locale formatting and on-page evidence | Changed | REQ-008, REQ-011, REQ-012, REQ-016; AC-008, AC-010, AC-011, AC-016 | Recheck compact vs exact values under active locales; ensure exact on-page evidence replaces removed CSV path. |
| DEC-009 / local CSV/export path | Removed | REQ-003, REQ-012; AC-001, AC-002, AC-010, AC-011 | Validate source and live negative boundary: no control/name/request/CSV helper/Blob/object URL/download/replacement workflow. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | analytics accounting/range/coverage/pricing policy unchanged | server unit/integration/E2E suites | no changed backend behavior; must remain compatible | focused server GraphQL regression |
| API / transport / contract | Preserved but material | unchanged real analytics and Run-details GraphQL operations consumed by changed UI | generated query, Pinia tests, server GraphQL E2E | real HTTP/proxy variables, request count, and response-to-DOM coherence | live API + browser |
| Frontend component / state | Yes | controls, summaries, trend, detailed evidence, retained states, Run-details styles/formatting | focused Nuxt component/store tests | real browser layout/focus/accessibility and HTTP lifecycle | browser |
| Browser integration / user journey | Yes | complete Settings Token Statistics journey | implementation-only temporary fixture check | real service, request/file APIs, narrow shell, active locale | browser |
| Authentication / session / permissions | No | local Settings access unchanged | project runtime | none introduced by scope | none |
| Desktop renderer / web-equivalent UI | Yes | Electron-visible Nuxt renderer | browser-capable dev path | production web-equivalent behavior not independently executed | browser preferred |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/package/native path changed | Electron architecture and unchanged shell tests | no material shell-specific gap | none; Electron only on browser-inexpressible defect |
| Process / lifecycle | Preserved | built server plus Nuxt proxy/startup, retry lifecycle | builds and prior server tests | fresh owned real stack | lifecycle/browser |
| Persisted-data transition | No | implementation declares `Not Affected`; current rows consumed unchanged | server current-schema/run-record E2E | representative current rows through current readers during this UI run | live API/browser |
| Worker / queue / distributed coordination | No | none changed | existing backend coverage | none for presentation package | none |
| External integration | No | no provider/invoice/quota dependency authorized | deterministic captured usage/cost contract | provider invoice reconciliation excluded | none |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements`; frontend `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/autobyteus-web`; branch `requirements/token-statistics-ui-redesign`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue 3/Pinia/Tailwind; Fastify/TypeGraphQL/Prisma/SQLite server; Vitest; Playwright Core/Chromium; Electron wrapper
- Conflicting, missing, or unclear project instructions: repository-wide web `nuxi typecheck` has an accepted unrelated 313-diagnostic baseline; server token-usage documentation still describes the intentionally superseded prior UI/CSV behavior and is not current requirements authority. No existing Token Statistics durable browser probe is present.
- Required environment variables or secrets available: `N/A — credential-free isolated data and local services are sufficient`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | frontend testing authority | colocated tests; `pnpm test:nuxt ... --run`; web tests recommended; web/localization guards exist |
| `autobyteus-web/README.md` | browser/Electron development | browser dev path at Nuxt; real Electron is last-resort for shell-specific behavior; packaged E2E launcher exists but no native boundary changed |
| `autobyteus-web/package.json`, `vitest.config.mts` | exact scripts/config | focused Nuxt tests, production build, web/localization guards, browser-probe conventions |
| `autobyteus-server-ts/AGENTS.md`, `README.md`, `package.json`, `vitest.config.ts` | real server/test setup | build/migrate/start isolated server; Vitest `run --no-watch`; tests own isolated SQLite |
| root `package.json`, `scripts/development/run-dev.mjs` | documented real stack | normal stack is backend `8000`, frontend `3000`, owned children; validation will use free ports and isolated data to avoid collisions |
| requirements and Product artifacts listed above | behavior authority | RER-010 plus approved final UI/UX and normative references override historical prior UI/CSV documentation |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server repository checks | task root | `corepack pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | test-owned migrated SQLite | Vitest result | runner teardown |
| Frontend repository checks | `autobyteus-web` | `corepack pnpm test:nuxt --run ...` | Nuxt/happy-dom | Vitest result | runner exit |
| Real backend | isolated probe | build/migrate, seed current-schema fixture, then `node autobyteus-server-ts/dist/app.js --data-dir <owned> --host 127.0.0.1 --port <free>` | fresh SQLite and credential-free `.env`; no user data | `/rest/health` and GraphQL | terminate owned process group; remove owned root |
| Real frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=<owned backend> pnpm dev --host 127.0.0.1 --port <free>` | Vite proxy to owned backend | HTTP Settings route | terminate owned process group |
| Chromium | durable Playwright Core probe | current installed Chromium, isolated browser contexts | 1440x900 and 390x844; en and zh-CN | semantic DOM and browser events | close browser/contexts |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| 29-day current-month analytics | isolated current Prisma schema with deterministic daily facets shaped to the server contract | only owned SQLite; UTC dates anchored to current test month | owned DB removed; result JSON/screenshots retained |
| coverage/pricing/cache matrix | deterministic full/partial/unavailable, USD complete/partial/missing, EUR mixed, local, and five cache-state facets | authoritative fields read by real server policy; no provider calls | owned DB removed |
| Run-details rows | deterministic current-format standalone/team member records selected by creation time with lifetime totals | exercises current normal reader; no migration/legacy data | owned DB removed |
| failure/loading | Playwright delays then fails one actual analytics HTTP request, followed by real retry | only browser routing for failure injection; successful paths use real backend | route removed/context closed |
| locale | isolated localStorage preference `en` / `zh-CN` | existing product boundary; no catalog expansion | context closed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: direct route has no design spec; requirements `Data Continuity And Acceptable Loss`, implementation handoff `Persisted Data Transition Check`
- Representative existing-data setup and required behavior: current-schema daily analytics facets and current cumulative run records are read directly without transformation, fallback, or version branch; Run details uses creation-time selection and lifetime totals.
- Evidence planned: server GraphQL E2E regression plus owned real server/browser execution over deterministic current-format rows.
- Migration-specific completion/recovery scenarios: `N/A — no migration required`
- Upstream ambiguity or reroute required: `None`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | real schema/Prisma analytics ranges, filters, coverage, mixed cost, SafeInt | preserved AC-004, AC-009, AC-011, AC-016 | Still Valid | directly exercises unchanged server contract | rerun focused |
| server token-usage policy/atomicity/run-record suites | accounting, buckets, pricing, current rows and Run details | preserved BEH-004/005 | Still Valid | current server authority, no backend delta | select focused broader regressions only |
| `stores/__tests__/tokenUsageAnalytics.spec.ts` | variables, result clearing, latest-response sequencing/errors | AC-002, AC-009, AC-011; QR-005 | Still Valid | directly covers changed UI's store dependency | rerun |
| `components/settings/token-usage/analytics/__tests__/TokenUsageAnalyticsStates.spec.ts` | controls, retained result states, custom validation and focus | AC-002, AC-003, AC-009–AC-011 | Still Valid | assertions updated to approved presentation | rerun |
| `TokenUsageAnalyticsSummaryCards.spec.ts` | six-card order, cache truth, locale formatting | AC-001, AC-008, AC-016 | Still Valid | requirement-linked new coverage | rerun |
| `TokenUsageTrendChart.spec.ts` | axes/points/accessibility/missing-cost breaks | AC-004, AC-010, AC-015 | Still Valid | exact component proof | rerun |
| `TokenUsageBreakdown.spec.ts` | grouping, exact evidence, cost/share truth | AC-005, AC-006, AC-011, AC-016 | Still Valid | approved Detailed-usage authority | rerun |
| `TokenUsageRunDetailsView.spec.ts`, task/model table specs, run store tests | preserved fetch, creation-time/lifetime copy, hierarchy/sort/disclosures/costs/states | AC-012 | Still Valid | current behavior authority | rerun |
| `TokenUsageStatistics.spec.ts`, Settings page spec | tabs and Settings navigation/content boundary | AC-010, AC-013 | Still Valid | selected-tab regression and shell coverage | rerun |
| deleted `TokenUsagePaceChart.spec.ts` | prior/comparison pace presentation | REQ-004/005 explicitly remove it | Stale / Remove | implementation deletion matches approved absence | retain deletion; no pace replacement |
| deleted `tokenUsageAnalyticsCsv.spec.ts` | local CSV serialization/download | DEC-009, REQ-003/012 explicitly remove it | Stale / Remove | supported feature intentionally removed | retain deletion; replace with negative boundary coverage |
| deleted exact-breakdown component path | separate exhaustive table presentation | REQ-006 keeps exact evidence but changes authority | Replace | exact evidence moved into trend bucket table and Detailed usage disclosure | prove replacement surfaces |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `components/settings/token-usage/analytics/__tests__/TokenUsagePaceChart.spec.ts` | current/prior pace and comparison availability UI | comparison/pace must not render | REQ-004, REQ-005, AC-003, AC-004 | forbidden DOM/source assertions plus single-line trend proof | no pace behavior is supported |
| `utils/__tests__/tokenUsageAnalyticsCsv.spec.ts` | deterministic CSV content and filename | CSV preparation/download is intentionally removed | DEC-009; REQ-003, REQ-012; AC-011 | durable negative browser/source boundary | no replacement export/report/share workflow is allowed |
| `TokenUsageExactBreakdownTable.vue` implicit component authority | dedicated 12-column exact table | exact evidence was recomposed, not removed | REQ-006, REQ-008, REQ-012 | exact bucket table and Detailed-usage disclosure tests/browser | separate component no longer owns a user behavior |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| TS-E2E-001 | real analytics HTTP request counts/variables and no-request presentation interactions | AC-002, AC-011; QR-003/005 | `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` | current component tests mock Apollo and cannot prove proxy/transport behavior |
| TS-E2E-002 | real coverage/pricing/cache aggregate binding and 29-day chart/accessibility/gaps | AC-001, AC-004, AC-009, AC-015, AC-016 | same self-starting probe plus deterministic isolated seed | closes prototype/mock and component-fixture gap |
| TS-E2E-003 | real Detailed-usage grouping/share/exact evidence and negative removed behavior | AC-003, AC-005, AC-006, AC-011 | same probe | proves one real result drives regrouped on-page evidence |
| TS-E2E-004 | real Run-details creation-time/lifetime, two-query fetch, Task/Model/sort/expand/cost states | AC-012 | same probe | current UI/store tests do not cross HTTP/current reader boundary |
| TS-E2E-005 | browser layout, keyboard/focus/accessibility, en/zh-CN and negative Blob/download boundary | AC-002, AC-007, AC-008, AC-010, AC-013, AC-014 | same probe and package script | repeatable web-equivalent desktop evidence is appropriate for this renderer-only change |

## Durable Coverage To Update

None planned initially. Existing component/store assertions appear aligned with approved behavior; new cross-boundary proof is additive.

## Durable Coverage To Remove

No new removal by API/E2E. The implementation-owned pace, separate exact-table, and CSV test deletions are valid and will be preserved.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt --run` with the eight focused Token Statistics component specs | task root; Nuxt Vitest/happy-dom | approved presentation, state, formatting, and Run-details component behavior | Pass — 8 files / 25 tests | `tickets/token-statistics-ui-redesign/evidence/api-e2e/web-focused.log` |
| 2 | `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/tokenUsageAnalytics.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts pages/__tests__/settings.spec.ts` | task root; Nuxt Vitest/happy-dom | request variables, stale-result prevention, Run-details query normalization, Settings shell | Pass — 3 files / 28 tests | `.../web-stores-settings.log` |
| 3 | `pnpm -C autobyteus-server-ts build`, then focused analytics and ledger GraphQL E2E | current Prisma/SQLite test schema after generated-client setup | real analytics and Run-details schema, range/filter/aggregation/current-row regressions | Pass — build; 2 files / 7 tests. An initial collection failure from a missing generated Prisma client was resolved by the documented server build; it is environment setup, not a product finding. | `.../server-build.log`; `.../server-token-usage-graphql-rerun.log`; initial diagnostic `.../server-token-usage-graphql.log` |
| 4 | `node --check` on the added seed/probe and JSON parse of `package.json` | task root | durable harness syntax/package integrity | Pass | `.../git-final.log` |
| 5 | web boundary guard, localization boundary guard, localization literal audit | `autobyteus-web` | boundary/catalog discipline | Pass — all three | `.../web-guards.log` |
| 6 | `pnpm -C autobyteus-web build` plus negative removed-path/reference scan | task root; Nuxt static production build | bundle/prerender and removed export/pace/exact-table source boundary | Pass — 3,726 modules; 15 routes; negative scan clean | `.../web-build-negative.log` |
| 7 | `git diff --check`, status, probe cleanup audit | task root | patch hygiene and resource ownership | Pass before report updates | `.../git-final.log`; browser result cleanup object |

## Post-Repository Confidence Scorecard (Mandatory)

Repository checks strongly exercised component, store, unchanged GraphQL, build, and catalog boundaries, but the real Nuxt-proxy-to-current-server journey, browser file APIs, narrow layout, and real partial-pricing response remained unproven. This was the decision point before broader execution.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 53 focused frontend tests, seven server GraphQL tests, guards and builds passed | critical real request, partial-price gap, file, focus, and Run-details reader journeys still indirect or split | owned live-stack browser matrix |
| Changed-boundary execution directness | 91% | production components/stores and actual server schema executed | frontend and backend not yet coupled in one journey | real Nuxt proxy + backend + browser |
| Cross-boundary integration realism and mock gap | 86% | server API and frontend/store evidence both valid | mocked Apollo/component boundary remained | live HTTP/proxy execution |
| Environment, configuration, identity, and fixture fidelity | 90% | generated current Prisma client, migrations, production builds, repository-locked dependencies | no owned current-schema browser fixture yet | isolated seeded runtime |
| Failure, edge-case, lifecycle, and recovery evidence | 87% | component loading/error/stale tests and current server tests passed | no real delayed/failing/retry request or process lifecycle | targeted browser routing around real stack |
| User-surface, browser, and desktop-shell confidence | 86% | component semantics and Product references aligned | no independent 1440/390, focus, locale, chart geometry, or file-API observation | Chromium web-equivalent desktop execution |
| Durable regression coverage quality and relevance | 94% | focused tests remain valid and the added self-starting probe passed syntax review | new durable probe had not yet executed | execute TS-E2E-001–005 |

- Overall post-repository confidence: `88.9% (622/7)`
- Calculation method: arithmetic mean, subject to the critical-criterion gate
- Every critical acceptance criterion directly proven: `No — AC-002/004/011/012/015/016 still needed one realistic cross-boundary journey`
- Any applicable category below `90%`: `Yes — requirement proof, integration realism, failure/recovery, and browser/user surface`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks at this gate: real one-result/request coherence, partial/missing-price transport, stale real failure recovery, Run-details current reader semantics, browser focus/layout/localization, and negative file APIs

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API + Browser + Lifecycle`
- Specific confidence gap or residual risk addressed: repository evidence split the current server, mocked store/components, and build; it did not prove one real partial-pricing/current-schema response or the browser surface.
- Why the selected mode can materially improve confidence: an isolated migrated SQLite server and real Nuxt proxy expose exact GraphQL operations/results to the production components while Chromium directly observes layout, focus, accessible DOM, localization, and file APIs.
- Expected confidence after the selected validation: `>=95% overall with no category below 90% only if every critical scenario passes`
- Browser-specific decision and rationale: required because the changed boundary is the web-equivalent Electron renderer and includes responsive, focus, SVG/accessibility, localization, and removed-download risks.
- Execution outcome: `Completed — Fail. TS-E2E-001/003/004/005 passed; TS-E2E-002 exposed APIE2E-F001.`
- Failure: selecting the real `Partial E2E` provider over current-schema daily facets returned `TOKEN_USAGE_ANALYTICS_SELECTED_COST_RECONCILIATION_FAILED`; the UI therefore could not receive the approved partial result or render its missing-cost gap/exact evidence. The full authoritative result is `evidence/api-e2e/token-statistics-browser-result.json`.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer
- Relevant README or development instructions: `autobyteus-web/README.md` Browser Development and Packaged Electron E2E sections; `ARCHITECTURE.md`
- Web-equivalent behavior: every changed Token Statistics production component, GraphQL proxy, browser file API, layout, keyboard, localization and accessible DOM behavior
- Shell-specific or lifecycle behavior: none changed; no preload, IPC, window, native download integration, package, or Electron process behavior is added
- Chosen validation approach and result: owned real backend plus Nuxt dev server in Chromium 149. This directly exercised all changed renderer boundaries; packaged Electron was not run because no browser-inexpressible shell boundary changed.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: packaged Electron chrome/window lifecycle remains unexecuted; Simplified Chinese semantic DOM was correct, while the Linux validation host lacked a complete CJK display font in the screenshot. These are bounded residuals and not the cause of the Fail result.

## Live Environment And Fixture Result

- Startup order and commands: current server build; isolated Prisma migrate; seed current rows; start built backend on a free loopback port; await `/rest/health`; start Nuxt on a second free port with `BACKEND_NODE_BASE_URL`; await Settings; launch Chromium; terminate in reverse order.
- Environment choices: credential-free development mode, SQLite under a probe-owned temporary root, deterministic UTC current-month dates, free ports, English and Simplified Chinese contexts.
- Seed data / fixtures: 19 post-coverage daily facets over a 29-day month; complete/partial/missing/mixed/local pricing, USD/EUR, five cache states, production-format opaque keys; current team/standalone run records with creation/lifetime distinction.
- Evidence captured: 30 GraphQL requests/responses, semantic DOM measurements, five screenshots, console/page/download/Blob/object-URL tracking, backend/frontend/migration logs, source scan, and cleanup result.
- Cleanup: Chromium contexts/browser, Nuxt and backend process groups, and the owned temp database/root were removed. No matching process or temp root remained.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| successful partial-pricing cost gap through the real API | `APIE2E-F001`: server rejects the current-schema response before UI rendering | critical; blocks AC-004/009/011/016 and the package result | focused failure-origin review, then backend/source correction and API/E2E rerun |
| provider invoice/quota reconciliation | explicitly out of scope; UI shows estimates/status only | none for approved package | none |
| actual packaged Electron shell | no shell-specific delta; browser is project-preferred | negligible | run only if a shell-only defect appears |
| CJK glyph fidelity on this Linux host | installed Chromium host font rendered some Chinese glyphs as tofu; DOM and catalog strings were correct | bounded environment/display uncertainty | Delivery may visually recheck on a CJK-capable target; not causal to current Fail |
| comma-decimal product locale | supported product catalog is en/zh-CN; formatter component coverage is retained | bounded | none |
| arbitrary production volume/performance | no new query/SLO; representative SafeInt/current schema and 29 buckets were exercised | bounded | separate performance ticket if observed |

## Ambiguities Or Reroute Triggers

No requirements ambiguity was found. `APIE2E-F001` is a direct implementation/runtime mismatch: the approved behavior explicitly requires partial/missing pricing truth and monetary gaps, while `assertTokenUsageAnalyticsBucketReconciliation` rejects a usage-bearing null-cost bucket whenever another selected bucket has known cost. Focused failure-origin review is required before assigning rework.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`
- Repository-Resident Durable Coverage Added / Updated / Removed: `Added autobyteus-web/tests/e2e/token-statistics-seed.mjs`, `Added autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs`, `Updated autobyteus-web/package.json`; no API/E2E removal
- Post-repository confidence: `88.9%`
- Broader validation decision: `Required — executed Live API + Browser + Lifecycle`
- Completed result: `Fail — APIE2E-F001 / TS-E2E-002`
- Final confidence: `89.9%; clean target not met and requirement-proof category is 50% because a critical accepted behavior fails`
- Reroute Required: `Yes — focused failure-origin review`
- Recommended Recipient: `/code_reviewer`
- Notes: architecture/source-review artifacts remain `N/A — not applicable` for the incoming direct route; classification remains `Medium` + `Low`.
