# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-doc.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/investigation-notes.md`
- Requirements Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-revision-record.md` (`RER-010`)
- Design Spec: `N/A — not applicable for the direct route`
- Supplemental Task Artifacts: approved Product `ui-ux-spec.md`, behavior matrix, assumptions, feasibility audit, final reference manifest, normative `VIS-009`–`VIS-015`, and final prototype validation under `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-TSUI-001`
- Architecture Design Revision Record: `N/A — not applicable for the direct route`
- Design Review Report: `N/A — not applicable for the direct route`
- Architecture Review Revision Record: `N/A — not applicable for the direct route`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `N/A — not applicable for the incoming direct route`
- Code Review Revision Record: `N/A — not applicable for the incoming direct route`
- Delivery Revision Record: `N/A — initial API/E2E validation`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: Implementation Engineer outcome `Implementation Ready — Direct API/E2E`, implementation revisions `603aa510ef2333c7c271a2c9149b48e63c93e6b9` / `07e082458004b3d1dcbcd0b8973e7f5bf8ac3d3d`
- Prior Round Reviewed: `N/A — no prior completed result for REQPKG-TSUI-001`
- Latest Authoritative Round: this report

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` on a successful result; this result is `Fail` and requires focused failure-origin review instead.

## Investigation And Execution Basis

- Coverage investigation artifact: canonical path above
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`; the planned self-starting probe was retained as durable coverage. Harness selectors, production locale copy, and production-format opaque fixture keys were corrected during test development before the final authoritative run.
- Existing coverage decisions revised during execution: the analytics server E2E remains valid but is insufficient for partial pricing because it covers complete filtered and mixed-currency results, not a selected range with priced and unpriced usage-bearing days. `APIE2E-F001` therefore adds a missing real boundary case.
- Reroute required during execution: `Yes — after completed evidence, due to APIE2E-F001`
- Notes: no architecture/design/source-review artifact was inferred from the direct route.

## Compatibility / Legacy Scope Check

- Reviewed requirements introduce backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Compatibility-related reroute classification: `N/A`
- Upstream recipient notified: pending handoff after rule evaluation

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| TS-E2E-001 | presets/Custom/Apply/Clear, presentation-only no-request, loading/error/retry/no-stale, six peers, 29-point chart; AC-001–004, AC-009–011, AC-015 | Nuxt controls/store → proxy → real GraphQL; SVG/accessibility | owned server + Nuxt + Chromium | Durable + Live + Browser | Pass | `token-statistics-browser-result.json`; `analytics-desktop.png` |
| TS-E2E-002 / APIE2E-F001 | full/partial/missing/mixed/local pricing, cache matrix, monetary gaps; AC-004, AC-009, AC-011, AC-016 | current SQLite facets → analytics aggregation → GraphQL → UI | real built server and current-schema fixture, Chromium | Durable + Live + Browser | **Fail** | Partial provider returned `TOKEN_USAGE_ANALYTICS_SELECTED_COST_RECONCILIATION_FAILED`; result JSON request/response and `backend.log` |
| TS-E2E-003 | Detailed-usage grouping, shares, exact status/currency, no driver; AC-005/006/011/016 | real GraphQL breakdown → browser regroup/disclosure | live browser | Durable + Live + Browser | Pass | 7 rows, 30,071 reconciled tokens, 100% shares, local exact evidence; `detailed-usage-desktop.png` |
| TS-E2E-004 | Run-details creation-time selection/lifetime totals, two queries, Task/Model no-refetch, hierarchy/sort/cost/empty/restore; AC-012 | current run records → two real GraphQL operations → tables | live browser | Durable + Live + Browser | Pass | result JSON; `run-details-desktop.png` |
| TS-E2E-005 | 1440/390, focus, internal table scrolling, en/zh-CN, negative export/file boundary; AC-002/007/008/010/011/013/014/015 | Settings renderer, browser DOM/file APIs | Chromium contexts | Durable + Browser | Pass | 390=`clientWidth=scrollWidth`; 2 equal peers; 3 ticks; focus restored; Blob/object URL/download all zero; narrow/zh screenshots |
| REP-WEB | focused presentation/store/Settings regression | repository production components/stores | Nuxt Vitest | Durable | Pass | 11 files / 53 tests; `web-focused.log`, `web-stores-settings.log` |
| REP-API | preserved analytics/ledger GraphQL contract | schema/provider/repository/SQLite | server Vitest | Durable | Pass | 2 files / 7 tests; `server-token-usage-graphql-rerun.log` |
| REP-BUILD | current server/Nuxt builds, guards, removed-source boundary | build/config/catalog/source | repository build/guards | Durable | Pass | `server-build.log`, `web-guards.log`, `web-build-negative.log` |

## Additional Repository Coverage Execution

Only broader execution occurred after the post-repository confidence gate.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:e2e:token-statistics-ui -- --skip-server-build --output-dir <ticket-evidence>` | task root; built server, isolated migrated SQLite, free loopback ports, Nuxt, Chromium | TS-E2E-001–005 | Fail — only APIE2E-F001; all other scenario groups completed | `evidence/api-e2e/browser-probe-command-final.log`; `token-statistics-browser-result.json` |
| 2 | process and temp-root audit | task root | owned lifecycle cleanup | Pass | result JSON cleanup object and final `ps`/`/tmp` audit |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 50% | -38 | almost every selected journey passed directly, but AC-004/009/011/016 has a critical real API failure | successful partial-price result and gap remain absent |
| Changed-boundary execution directness | 91% | 98% | +7 | actual production components, store, proxy, server, schema and browser; 30 correlated GraphQL requests/responses | packaged shell unchanged/not run |
| Cross-boundary integration realism and mock gap | 86% | 98% | +12 | no decisive API/browser mock; real built backend and Nuxt proxy over current SQLite | deliberate single-request failure injection only for retry journey |
| Environment, configuration, identity, and fixture fidelity | 90% | 97% | +7 | current migrations, production opaque identity keys, truth matrix, current run records, owned ports/data | deterministic direct Prisma seed bypasses ingestion writer, while current reader is the boundary under test |
| Failure, edge-case, lifecycle, and recovery evidence | 87% | 96% | +9 | real partial API defect, injected error/no-stale/retry, covered/uncovered, empty, cleanup | successful partial response impossible until fix |
| User-surface, browser, and desktop-shell confidence | 86% | 94% | +8 | Chromium 149 at 1440/390, focus, layout, SVG semantics, en/zh DOM, file APIs | host CJK font glyph fidelity and packaged Electron shell not proven |
| Durable regression coverage quality and relevance | 94% | 96% | +2 | self-starting, isolated, requirement-mapped probe and deterministic seed retained with package script | default probe intentionally remains red on APIE2E-F001 |

- Overall post-repository confidence: `88.9% (622/7)`
- Overall final confidence: `89.9% (629/7)`
- Calculation method: arithmetic mean, subject to the critical-criterion gate
- Confidence change produced by broader validation: `+1.0 percentage point overall`; directness and realism rose sharply, while direct proof established that a critical behavior fails, dropping requirement-proof confidence to the mandatory failing-critical anchor.
- Every critical acceptance criterion directly proven: `No — the successful partial/missing-price daily response and chart gap required by AC-004/009/011/016 fails`
- Any final applicable category below `90%`: `Yes — requirement and acceptance-criteria proof (50%)`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: APIE2E-F001, CJK host font glyph fidelity, and unexecuted unchanged packaged Electron shell

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required — Live API + Browser + Lifecycle`
- Material deviation: none; the final command used the already completed server build via `--skip-server-build`.
- Confidence gap addressed: real operation counts/variables/result binding, current data readers, browser layout/focus/accessibility/localization/file APIs, and owned lifecycle.
- Startup/readiness: server built; Prisma migrations applied to an owned database; deterministic fixture seeded; built server passed `/rest/health`; Nuxt Settings route passed HTTP readiness; Chromium launched.
- Environment choices: Linux arm64, UTC, credential-free local server, free ports, isolated data, no user profile/database/Electron process.
- Seed identities: OpenAI complete, Anthropic partial/missing, EUR, local/no-bill, zero-cache, not-reported-cache, unknown-cache; two-member team plus standalone current run.

| Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| default current month | six ordered equal peers and 29 exact points/rows | six 185.5px peers; 29 points; 29 rows; one line/guide; open-top axes | result JSON + desktop screenshot | Pass |
| request coherence | presentation-only changes do not request; preset/Custom/Apply/Clear do exactly one | request counts/variables coherent; Custom UTC exclusive end correct | 30 correlated request/response records | Pass |
| complete/cache/mixed/local matrix | authoritative values and no invented combination | complete 19 cost points; positive 36.7%, zero 0%, not reported/local/unknown correct; mixed suppressed | result JSON | Pass |
| partial daily pricing | coherent PARTIAL response; missing day becomes gap with exact `price_missing` evidence | GraphQL returned `TOKEN_USAGE_ANALYTICS_SELECTED_COST_RECONCILIATION_FAILED`; UI result cleared to retryable error | request/response in result JSON | **Fail** |
| detailed evidence | grouped totals/shares reconcile; exact local evidence | 7 rows; 30,071 tokens; 100% shares; `local_no_api_bill`, currency unavailable | result JSON + screenshot | Pass |
| delayed failure/retry | no stale result during/after failure; retry recovers | stale surfaces absent; retry and subsequent This month recovered | result JSON | Pass |
| Run details | creation-time selection/lifetime totals; two queries; no-refetch view switch | 1,500 input/500 output team lifetime totals; hierarchy/sort/cost/empty/restore passed | result JSON + screenshot | Pass |
| responsive/localized/file negative | no page overflow; focus; 3 narrow ticks; Chinese DOM; no file APIs | all passed; Blob/object URL/download counters zero | result JSON + narrow screenshots | Pass |

## Desktop Application Validation

- Validation approach: project-preferred browser development path for the changed web-equivalent Electron renderer.
- Browser-tested behavior: all Token Statistics controls/results, GraphQL proxy, browser file APIs, responsive layout, focus, accessible SVG/DOM, and locale catalogs.
- Shell-specific evidence: `N/A — no preload/IPC/window/package/native integration changed`; actual Electron not launched.
- Effect on any already-running desktop application: `None`
- Not directly proven: packaged window/chrome lifecycle; negligible to the source failure. The Linux host screenshot rendered some CJK glyphs without a complete font, but the DOM contained the correct Chinese strings and did not overflow.

## Platform / Runtime Targets

- Operating system: `Linux arm64` (Ubuntu-based container)
- Runtime/frameworks: Node `v22.23.1`; pnpm `10.28.2`; Nuxt `3.21.1`; Vue `3.5.28`; Prisma `5.22.0`; Fastify/GraphQL current repository build
- Browser: Chromium `149.0.7827.196`
- Viewports/locales/timezone: `1440x900 en-US UTC`; `390x844 en-US UTC`; `390x844 zh-CN UTC`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative data: current-schema daily analytics facets and current cumulative run records with production-format opaque keys and identity/pricing summaries.
- Direct-use result: complete/mixed/local/cache/breakdown/run rows read directly without migration or fallback. Partial-priced rows reach the current reader but trigger APIE2E-F001.
- Migration completion/recovery: `N/A — no migration required`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual persisted-data risk: current legitimate partial-price facet combinations cannot be returned by analytics until the reconciliation policy is corrected.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/token-statistics-seed.mjs` | Added | deterministic current-schema pricing/cache/coverage/run truth matrix | Used successfully | owned SQLite only; production-format opaque keys |
| `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` | Added | TS-E2E-001–005, live server/Nuxt/Chromium, negative file APIs | Fail only on APIE2E-F001; remaining scenarios pass | self-starting, cleanup in `finally`, default remains red until fix |
| `autobyteus-web/package.json` | Updated | durable executable entry point | Valid | adds `test:e2e:token-statistics-ui` |

## Tests Removed As Stale Or Obsolete

No test was removed by API/E2E this round. The implementation-owned deletions of the pace test/component, local CSV utility/test, and separate exact-table component were validated as approved stale/removal decisions; negative source and browser coverage replaces only the removed user behaviors.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes`
- Paths added or updated: the three paths listed above
- Paths removed: `None by API/E2E`
- Added or updated paths attached for proportional test-code review: `Not Applicable to a successful-review gate because the package failed; attach them to focused failure-origin review`
- Diff/removal evidence: result JSON `sourceBoundary` and `web-build-negative.log`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/token-statistics-ui-redesign/evidence/api-e2e/token-statistics-browser-result.json` | authoritative structured API/browser result | Retained | 30 requests/responses; only APIE2E-F001 |
| `.../analytics-desktop.png`, `detailed-usage-desktop.png`, `run-details-desktop.png` | desktop browser evidence | Retained | supporting visual evidence |
| `.../analytics-narrow.png`, `analytics-narrow-zh-CN.png` | narrow/locale evidence | Retained | DOM/layout assertions are authoritative |
| `.../backend.log`, `frontend.log`, `database-migrate.log` | live process/API evidence | Retained | includes final owned run after earlier harness iterations |
| `.../web-focused.log`, `web-stores-settings.log`, `server-token-usage-graphql-rerun.log` | repository test evidence | Retained | 53 frontend + 7 server tests |
| `.../server-build.log`, `web-guards.log`, `web-build-negative.log`, `git-final.log` | build/guard/hygiene evidence | Retained | all pass |

## Temporary Execution Methods / Scaffolding

None. The material full-stack scenarios are retained as durable project coverage.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Confidence Limitation |
| --- | --- | --- | --- |
| provider billing/invoice services | not called; deterministic captured pricing summaries | external billing is explicitly out of scope | none for approved estimate/status contract |
| one failing analytics request | Playwright fulfilled one actual GraphQL operation with an injected error, then removed the route before Retry | deterministic no-stale/recovery evidence | only that failure step is injected; all successful and APIE2E-F001 paths use the real backend |

No database, GraphQL schema, backend, Nuxt proxy, production component, or browser boundary was mocked for decisive evidence.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | TS-E2E-001, TS-E2E-003, TS-E2E-004, TS-E2E-005; REP-WEB/API/BUILD | request coherence, browser presentation, detailed evidence, Run details, file negative, locale/responsive, repository and build checks passed |
| **Fail** | TS-E2E-002 / APIE2E-F001 | a valid current-schema selection containing priced days and one unpriced usage-bearing day is rejected by server cost reconciliation before the UI can render the required partial result/gap |
| Not Tested | packaged Electron shell | unchanged, browser-equivalent renderer path selected per project guidance |

## Cleanup Performed

| Resource | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Chromium contexts/process | probe-owned | close contexts/browser in `finally` | Complete |
| Nuxt and built backend | probe-owned detached process groups | SIGTERM with kill fallback | Complete; frontend SIGTERM, backend clean exit 0 |
| SQLite/data/log temp root | probe-owned `/tmp/autobyteus-token-statistics-e2e-*` | recursive removal | Complete |
| ports | probe-owned free loopback | released with child termination | Complete |
| user profile/database/Electron | not owned/not used | untouched | Safe |
| ticket evidence | validation-owned | retained | Intentional, ~4 MiB |

## Preliminary Classification

- Classification: `Local Fix — likely backend token-usage analytics aggregation policy and missing durable server coverage`
- Evidence: `autobyteus-server-ts/src/token-usage/services/token-usage-analytics-aggregation-policy.ts` deliberately throws when any usage-bearing bucket has null cost while the selected aggregate has a known partial sum; the existing unit test protects that throw. RER-010 instead requires partial/missing pricing to remain observable and unsafe monetary buckets to be omitted/gapped.
- Expected: coherent `PARTIAL` response, known partial total, unpriced bucket gap, exact `price_missing` evidence.
- Observed: HTTP 200 GraphQL error `TOKEN_USAGE_ANALYTICS_SELECTED_COST_RECONCILIATION_FAILED`; store correctly clears the result and exposes the error, so the frontend cannot render the approved state.
- Final owner: intentionally not assigned here; `code_reviewer` must confirm failure origin before rework.

## Recommended Recipient

`/code_reviewer` for focused failure-origin review of `APIE2E-F001`, per the Fail route.

## Evidence / Notes

- This is not a requirements ambiguity: partial/missing/local/mixed pricing and truthful gaps are explicit in REQ-010/012/016, AC-004/009/011/016, and the approved Product UI/UX.
- This is not caused by the browser failure injection; the partial provider failure occurs on an unmodified real GraphQL request and current-schema data.
- The server's focused GraphQL suite passes because its filtered provider case is complete and its multi-currency case yields a null combined aggregate; it lacks this partial-known-plus-missing-day case.

## Latest Authoritative Result

- Result: `Fail`
- Final validation confidence: `89.9%`
- Default `95%` confidence target met: `No`
- Final applicable confidence category below `90%`: `Yes — requirement and acceptance-criteria proof (50%)`
- Broader validation decision: `Required — executed Live API + Browser + Lifecycle`
- Critical acceptance criteria lacking successful proof: `AC-004, AC-009, AC-011, AC-016 — partial/missing-price result and monetary gap`
- Required next recipient: `/code_reviewer` for focused failure-origin review
- Notes: direct-route `Medium` / `Low` classification is preserved; `Not Required — direct low-risk route` remains the proportional successful-test-review decision, but this failed result follows the failure-origin route.
