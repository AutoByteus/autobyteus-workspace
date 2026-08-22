# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/design-spec.md`
- Supplemental Task Artifacts: `ui-ux-spec.md`, `prototype.html`, `token-usage-analytics-data-contract.md`, and the approved prototype/implementation images under the task `evidence/` directory
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/solution-revision-record.md` (`SR-001`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/implementation-revision-record.md` (`IR-001`–`IR-003`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-revision-record.md` (`CRR-001`–`CRR-003`)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` Pass at commit `9b8846a12`, score 9.4/10, with no remaining source findings and explicit downstream coverage risks
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The change must prove an Analytics-first Token Statistics surface backed by admitted observation-time contributions rather than run-creation/lifetime totals. Only a `CHANGED` normalized fold may advance the new daily projection, and the projection increment and cumulative run save must share one SQLite transaction. Existing run records remain directly usable and unmodified; analytics begins at a persisted coverage instant and must never backfill guessed history. The GraphQL result must apply explicit half-open UTC ranges, exact opaque runtime/provider/model filters, server-owned comparison and granularity policy, SafeInt-checked token aggregates, and truthful complete/partial/missing/local/mixed-currency cost quality. One coherent client result drives cards, trend, elapsed pace, exact breakdown, filters, coverage messaging, and local CSV export. Run details retains its current created-run/lifetime semantics.

Critical proof obligations are AC-002/AC-005/AC-012/AC-017–AC-023/AC-025–AC-031/AC-032–AC-035, particularly atomic rollback, realistic cross-run SQLite contention, SafeInt rejection without rounding, opaque key identity/cardinality, UTC comparison/filter reconciliation, cost-quality combinations, stale-response suppression, distinct loading/coverage/error states, accessibility/responsiveness, and exact CSV escaping/filename.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / Analytics and Run details split | Changed + Preserved | REQ-001–REQ-005, REQ-019; AC-001–AC-006, AC-024 | Validate default Analytics entry and preserved clean-DB Run-details GraphQL/UI behavior. |
| BEH-002 / cards, trend, elapsed pace, ranked breakdown | Added | REQ-006–REQ-012; AC-007–AC-016; UI/UX spec | Add coherent provider/API and rendered-state coverage; preserve exact text evidence and cumulative endpoint reconciliation. |
| BEH-003 / observation-time durable history and coverage | Added | REQ-013–REQ-018; AC-017–AC-023 | Exercise normal write path, pre-feature direct-use behavior, persisted coverage, UTC allocation, filters, restart/readiness, and no backfill. |
| BEH-004 / accounting and cost quality | Changed + Preserved | REQ-020–REQ-023; AC-025–AC-029; CRR-003 | Cover SafeInt, no double counting, null/partial/local/complete/mixed-currency matrices through the provider/GraphQL boundary. |
| BEH-005 / exact local CSV | Added | REQ-024–REQ-025; AC-030–AC-031 | Expand serializer coverage for full metadata, RFC escaping, deterministic inclusive-date filename, and local-only download behavior. |
| BEH-006 / atomic projection write | Added | REQ-013–REQ-016; AC-017–AC-020; MP-001 | Inject a projection failure to prove rollback and run concurrent different-run writes into one real SQLite facet. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | canonical facet projection, range/coverage/cost aggregation | Existing fold/pricing tests; implementation probes | New analytics policies have no repository-resident backend tests | Unit + integration |
| API / transport / contract | Yes | new `tokenUsageAnalytics` GraphQL query | Generated schema/build; preserved old GraphQL E2E | No durable analytics GraphQL journey or SafeInt analytics boundary | Live built-server GraphQL E2E |
| Frontend component / state | Yes | new store, controls, cards, charts, states, CSV | Pace/breakdown/CSV and tab tests | Store latest-request/error, controls/range, full state matrix, trend/cards/coverage largely untested | Component + browser |
| Browser integration / user journey | Yes | Settings analytics renderer and local download | Implementation screenshots/manual render only | No independent browser execution, semantic DOM, export, responsiveness, or a11y evidence | Browser |
| Authentication / session / permissions | No | Same local Settings access; no new permission | Requirements explicitly introduce none | None | None |
| Desktop renderer / web-equivalent UI | Yes | Electron renderer is web-equivalent for this surface | Normal browser dev path is documented | Electron shell is not materially changed | Browser preferred |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/packaging change | Export uses normal DOM Blob download | Packaged shell adds negligible feature-specific evidence | None |
| Process / lifecycle | Yes | additive schema readiness + once-only coverage initialization | Migration/build smoke and implementation DB probe | Durable startup/restart/coverage-no-usage evidence is missing | Built-server/lifecycle E2E |
| Persisted-data transition | Yes | existing run rows direct-use; new empty tables and coverage singleton | Preserved Run-details E2E passed in review | No analytics-specific durable proof of no backfill/coverage persistence | SQLite E2E + restart |
| Worker / queue / distributed coordination | Yes, local concurrency | different run queues can target the same facet | Source uses SQL conflict upsert | Real cross-run concurrent SQLite increments and busy/rollback behavior untested | Integration contention harness |
| External integration | No | No provider/quota/invoice calls | Requirements exclude these | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics`
- Project type and runtime stack: pnpm TypeScript monorepo; Node server, TypeGraphQL, Prisma/SQLite, Vitest, Nuxt/Vue/Pinia, Chart.js, Playwright Core, Electron wrapper
- Conflicting, missing, or unclear project instructions: server `typecheck` includes known unrelated `TS6059` failures; builds are the accepted production compilation evidence. No feature-specific browser probe exists yet.
- Required environment variables or secrets available: N/A; selected coverage is credential-free and uses test-owned SQLite/runtime state

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| repository `README.md` | canonical full-stack and deterministic E2E workflow | `pnpm dev`; `pnpm test:e2e`; dev state under `.autobyteus/development`; test E2E uses isolated state |
| `autobyteus-server-ts/AGENTS.md` | server test command authority | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-server-ts/README.md` | server setup/database/test lifecycle | tests use `.env.test` and temporary SQLite under `tests/.tmp/`; production builds run Prisma generation and bootstrap smokes |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | executable scripts/config | `pnpm build`; `pnpm test -- --run`; isolated Vitest setup |
| `autobyteus-web/AGENTS.md` | frontend test authority | `pnpm test:nuxt <paths> --run`; keep tests colocated; never use watch mode |
| `autobyteus-web/README.md` | browser/Electron strategy | browser development at port 3000; Playwright Core probes; actual packaged Electron only when shell-specific behavior matters |
| `autobyteus-web/package.json`, `vitest.config.mts` | frontend build/test/guard scripts | `pnpm build`; `pnpm test:nuxt ... --run`; localization/boundary guards |
| Prisma migration `20260822090000_add_token_usage_analytics/migration.sql` | physical schema | additive coverage/daily-facet tables and indexes; no existing-row transformation |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server repository/API tests | worktree root/server | project Vitest command; tests create isolated DB | no secrets; migration-enabled test runtime | Vitest setup completes and GraphQL responds | test teardown removes owned temp state |
| Frontend unit/component tests | `autobyteus-web` | `pnpm test:nuxt ... --run` | happy-dom/Nuxt test env | Vitest collection/result | automatic |
| Full browser renderer | worktree root | root `pnpm dev` or an owned feature probe with free ports and isolated data root | do not reuse unrelated dev DB/process | exact backend/frontend health endpoints | signal owned process tree; remove owned temp data |
| Chrome/Chromium | feature browser probe | Playwright Core automatic discovery or explicit executable | browser-only web-equivalent evidence | page load/semantic selector | close owned context/browser |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Run + analytics rows | public accumulator/GraphQL path where feasible; repository helper only for boundary-specific fixtures | test-owned SQLite only; never development/production DB | test teardown |
| Coverage timestamps/no-usage interval | persisted coverage singleton in migrated test DB | deterministic UTC instants | test teardown |
| Cost-quality/identity cases | exact captured payloads with complete, partial, missing, local, USD/EUR and null/whitespace raw identity | no provider network calls | test teardown |
| Browser states | deterministic GraphQL fixture route or isolated seeded live DB, chosen according to directness needed | fixture injection must be owned and removed; no persistent user data | probe finally block |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` for existing run data; normal additive schema migration for empty analytics tables
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; handoff `Persisted Data Transition Check`
- Representative existing-data setup and required behavior: a pre-feature/current `token_usage_run_records` row remains readable through Run details and is not copied into analytical buckets; coverage exists even with no facet rows
- Evidence planned: clean migrated DB, preserved existing Run-details GraphQL E2E, coverage singleton persistence across reads/restart, wholly unavailable and partially covered ranges, and no analytical backfill
- Migration-specific completion/recovery scenarios: N/A; no application-data transformation is approved
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/token-usage/projections/token-usage-run-fold.test.ts` | suppress replay, SafeInt source validation, compact state, preserved mixed identity | REQ-014, REQ-019–REQ-020 | Still Valid | assertions match approved admission/run authority | Retain; supplement through analytics transaction boundary |
| `tests/unit/token-usage/services/token-usage-run-accumulator.test.ts` | first local state and exact BigInt commit before unsafe public projection | REQ-015, REQ-020 | Still Valid but incomplete | uses mocked repository; no analytics failure/concurrency | Retain and add real integration/E2E coverage |
| `tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | real SQLite run fold/serialization/range behavior | REQ-014, REQ-019 | Still Valid | directly exercises preserved store | Retain; add analytics repository integration |
| `tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` and `token-usage-ledger-provider-semantics.e2e.test.ts` | current Run-details GraphQL aggregation, mixed/null/SafeInt behavior | REQ-019–REQ-023 | Still Valid | CRR-002 rechecked clean-DB preserved scenario | Retain; analytics endpoint needs separate E2E |
| `components/settings/__tests__/TokenUsageStatistics.spec.ts` | Analytics default and view split | AC-001, AC-006 | Still Valid | direct component assertion | Retain |
| `TokenUsageRunDetailsView.spec.ts`, model/task table specs, run store spec | preserved run controls, errors, empty, tables | AC-006, AC-024 | Still Valid | approved preserved workflow | Retain |
| `TokenUsagePaceChart.spec.ts` | elapsed alignment, shorter month, canonical cumulative quality | AC-011–AC-012, AC-027–AC-029 | Still Valid | CRR-003 focused evidence | Retain |
| `TokenUsageBreakdown.spec.ts` | exact token share and local/captured status evidence | AC-010, AC-012–AC-015, AC-027–AC-029, AC-034 | Still Valid but incomplete | two focused component scenarios | Retain; add full UI/browser state evidence |
| `tokenUsageAnalyticsCsv.spec.ts` | captured status separate from derived quality | AC-030–AC-031 | Needs Update | only one assertion; exact escaping and filename are not proved | Expand in place |
| Implementation-only provider/DB probes and screenshots | representative populated partial/mixed render | several ACs | Out Of Scope as durable authority | not repository-resident repeatable coverage | Replace evidence gaps with durable tests/browser execution |

## Stale Or Obsolete Coverage Decisions

None. No relevant existing assertion is obsolete, and no durable coverage will be removed in this round.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | canonical UTC facet projection, opaque digest null/whitespace/collision/stability, SafeInt input boundary | REQ-013, REQ-016, REQ-020; AC-017, AC-025–AC-026; MP-003 | server unit test for analytics contribution projection | currently no backend analytics test exists |
| API-002 | all UTC presets/custom comparisons, leap/month clipping, granularity, invalid/mismatched ranges/keys | REQ-002–REQ-004, REQ-008; AC-002–AC-004, AC-010–AC-011 | server range-policy unit test | server policy is authoritative and currently untested |
| API-003 | complete/partial/missing/local/mixed-currency/no-usage quality, coverage boundaries, bucket reconciliation | REQ-006–REQ-008, REQ-020–REQ-023; AC-007–AC-012, AC-021–AC-029 | server aggregation-policy unit test | prevents false zero, false currency totals, and coverage drift |
| API-004 | atomic run/facet rollback, suppressed no-write, same-facet different-run concurrent increments/latest/count totals | REQ-013–REQ-016; AC-017–AC-020; MP-001 | real SQLite integration test | critical acceptance criterion and highest unresolved implementation risk |
| API-005 | live GraphQL range/filter/coverage/identity/bucket/exact-row reconciliation and SafeInt rejection | REQ-002–REQ-025; AC-002, AC-005, AC-012, AC-017–AC-030 | server E2E test against real migrated schema/GraphQL | proves transport plus persistence/provider boundary without mocks |
| WEB-001 | default UTC selection, preset/custom variables, latest-response wins, result hiding, error/retry lifecycle | REQ-002–REQ-005; AC-002–AC-005, AC-032–AC-033 | analytics Pinia store unit test | new store has no durable tests |
| WEB-002 | full/partial/unavailable/covered-empty/loading/error UI, metric continuity, control validation, accessible names/text equivalents/mobile table reachability | REQ-001–REQ-012, REQ-017–REQ-023; AC-001–AC-016, AC-032–AC-035 | analytics view/control/coverage/summary component tests and browser probe | material user-surface behavior remains independent evidence gap |
| WEB-003 | exact CSV escaping, all metadata/status columns, filter/range/grouping coherence, deterministic inclusive-date filename, local download cleanup | REQ-024–REQ-025; AC-030–AC-031 | expand CSV serializer test and exercise download in browser | export is evidence product; exactness is critical |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| WEB-003 | `autobyteus-web/utils/__tests__/tokenUsageAnalyticsCsv.spec.ts` | add escaping, filename, complete header/value and empty/null assertions | REQ-024–REQ-025; AC-030–AC-031 | preserve captured-vs-derived assertion |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/projections/token-usage-analytics-contribution.test.ts tests/unit/token-usage/services/token-usage-analytics-range-policy.test.ts tests/unit/token-usage/services/token-usage-analytics-aggregation-policy.test.ts --no-watch --reporter=verbose` | worktree root via server Vitest; migrated isolated test SQLite | API-001–API-003 | Fail — 10 passed, 1 failed | `evidence/api-e2e/server-analytics-unit.log`; API-F-001 |
| 2 | focused server real-SQLite integration tests | same | API-004 | Planned | retained command log |
| 3 | focused server GraphQL E2E | same, isolated test DB/runtime | API-005 plus preserved Run-details recheck | Planned | retained command log |
| 4 | focused frontend store/component/CSV tests | `autobyteus-web`, `pnpm test:nuxt ... --run` | WEB-001–WEB-003 | Planned | retained command log |
| 5 | broader affected backend token-usage integration/E2E suites | worktree root | regression and cross-boundary confidence | Planned | retained command log |
| 6 | broader affected frontend settings tests and build/guards | web/root | renderer regression and compile/localization | Planned | retained command log |
| 7 | `git diff --check` | worktree root | repository hygiene | Planned | command output |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | API-001/API-002 and most of API-003 directly passed | API-003 exposes a critical normal sparse-range failure; most planned criteria remain unexecuted | fix API-F-001, then execute API-004–WEB-003 |
| Changed-boundary execution directness | 60% | direct production contribution/range/aggregation policies ran | persistence and transport execution stopped after the narrow failure | fix then run real SQLite and GraphQL |
| Cross-boundary integration realism and mock gap | 50% | migrated SQLite test setup ran, but focused assertions were pure policy tests | no analytics API/browser integration executed | API-004/API-005 + browser after rework |
| Environment, configuration, identity, and fixture fidelity | 75% | project global setup applied all 24 migrations to test-owned SQLite; exact UTC/cost/identity fixtures ran | live API/browser fixtures not reached | isolated full-boundary execution |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | identity collisions/cardinality, SafeInt inputs, invalid ranges, cost matrix, coverage boundaries, and sparse buckets were exercised | atomic rollback/contention/restart/render recovery remain | rework then continue planned matrix |
| User-surface, browser, and desktop-shell confidence | 50% | implementation evidence exists and shell is not affected | independent browser execution was intentionally not run after critical backend failure | browser WEB-002/WEB-003 after rework |
| Durable regression coverage quality and relevance | 85% | three focused requirement-linked backend test files were added; failing sparse-range assertion is deterministic and production-linked | remainder of planned durable coverage is not yet implemented | continue after failure-origin review/rework |

- Overall post-repository confidence: 61.4%
- Calculation method: arithmetic mean of applicable categories, with critical-criterion gate
- Every critical acceptance criterion directly proven: No — API-003/REQ-007/AC-010 fails and later critical scenarios were not run
- Any applicable category below `90%`: Yes — all categories
- Default clean-confidence target of `95%` met: No
- Material residual risks: API-F-001; atomic rollback/contention; provider/GraphQL SafeInt and filter reconciliation; browser state/export/accessibility; representative cardinality beyond 128 identities

## Broader Validation Decision (Mandatory)

- Decision: `Required` after implementation rework; not executed in this round because narrow repository validation failed first
- Selected execution mode: `Browser` plus `Live API` / `Lifecycle` / bounded local contention
- Specific confidence gap or residual risk addressed: real migrated SQLite/GraphQL contract and independent user-surface state/export/responsive/accessibility behavior are not proven by existing repository coverage
- Why the selected mode can materially improve confidence: it crosses the actual server transport/storage boundary and the Nuxt browser renderer rather than relying only on mocked component results or implementation screenshots
- Expected confidence after the selected validation: at least 95% overall with no category below 90%, assuming every critical scenario passes
- Browser-specific decision and rationale: required because charts, coherent loading/error/stale behavior, local download, keyboard/text alternatives, and narrow layout are material web-equivalent renderer behavior
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A
- If `Blocked`, exact dependency or access: N/A

## Desktop Application Validation Decision

- Desktop framework / shell: Electron-wrapped Nuxt renderer
- Relevant README or development instructions: repository and `autobyteus-web/README.md`
- Web-equivalent behavior: entire Token Statistics Analytics surface, GraphQL calls, canvas/text/table rendering, responsive layout, and local Blob download
- Shell-specific or lifecycle behavior: none changed; no preload, IPC, window, updater, packaging, or native file bridge change
- Chosen validation approach and why it fits the project: browser development/probe first; actual packaged Electron is not proportionate because the material boundary is web-equivalent
- Server/frontend setup when browser validation is used: owned isolated server/frontend processes or self-starting probe with free ports and migrated test data
- Effect on any already-running desktop application: None
- Behavior not directly proven and confidence consequence: packaged Electron download prompt/window behavior remains negligible residual uncertainty because no shell-specific code changed

## Live Environment And Fixture Plan

- Startup order and commands: create isolated migrated SQLite state, start owned backend, confirm GraphQL readiness, start owned Nuxt frontend, confirm HTTP readiness, run Playwright Core browser scenario, stop owned processes in `finally`
- Environment choices that materially affect the run: fixed UTC fixture instants and locale, loopback-only free ports, no external credentials, isolated task-specific data root
- Health / readiness checks: exact HTTP/GraphQL response and Settings page load
- Seed data / fixtures: complete USD, partial/missing, local, EUR, null/whitespace identity, covered-empty and partial/unavailable coverage cases
- Test identities, authentication, permissions, or session state: same local Settings access; no added auth
- Requirement-linked journeys or scenarios: Analytics default, range/filter/metric/grouping, coverage/error/loading/stale behavior, exact table/chart text, export, Run details, narrow layout and keyboard reachability
- DOM, screenshot, log, API, process, or other evidence to capture: semantic assertions, download bytes/name, console/page errors, backend logs, desktop/narrow screenshots where useful
- Owned processes and temporary state to clean up: browser/context, frontend/backend process tree, temp DB/data root and fixture route if installed

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| None currently | Browser evidence should be implemented as a maintainable feature probe if feasible | N/A | If setup proves too repository-specific, any temporary fallback will be documented before use |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Provider quota/invoice reconciliation | explicitly out of scope | none for approved behavior | none |
| Unbounded production-scale arbitrary identity cardinality/performance | no approved SLO or production data benchmark; representative cardinality will be tested | bounded operational risk | record as residual; separate performance ticket if evidence warrants |
| Packaged Electron shell | no shell-specific change and browser is the documented preferred surface | negligible renderer packaging uncertainty | run only if browser/repository evidence exposes shell-specific gap |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| API-F-001 — a selected range with completely priced usage plus any empty display bucket throws `TOKEN_USAGE_ANALYTICS_*_COST_RECONCILIATION_FAILED` | Local Fix — implementation | API-003 failed deterministically. `buildTokenUsageAnalyticsBuckets` correctly produces empty buckets with `NO_USAGE` and null cost, but `assertTokenUsageAnalyticsBucketReconciliation` rejects every null bucket whenever the selected aggregate has a known cost. `TokenUsageAnalyticsProvider.getAnalytics` invokes this assertion for normal requests. This contradicts REQ-007/AC-010 and prevents ordinary sparse usage trends. | `/code_reviewer` for failure-origin review |

## Investigation Decision

- Proceed To API/E2E Execution: `No` — stop at API-F-001 and reroute before broader execution
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add/update only; no removals
- Post-repository confidence: 61.4%
- Broader validation decision: `Required` after rework; not executed in this failed round
- Reroute Required Before Validation Execution: `Yes`
- Recommended Recipient If Reroute Required: `/code_reviewer`
- Notes: coverage investigation was created before any API/E2E-owned durable coverage edit or final execution. The narrowest server analytics unit run exposed API-F-001, so later repository/live/browser execution was not started. Existing code-review artifact edits are upstream-owned and are not modified here.
