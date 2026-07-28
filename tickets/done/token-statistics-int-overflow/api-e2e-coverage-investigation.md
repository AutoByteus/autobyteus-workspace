# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/design-spec.md`
- Supplemental Task Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/graphql-token-count-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/solution-revision-record.md` (`SR-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/code-review-revision-record.md` (`CRR-002`)
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/api-e2e-revision-record.md` (`API-REV-001`)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `2`
- Trigger: source review passed after `SR-001`, `IR-001`, and `CRR-002` resolved the prior exact-display design blocker; API/E2E execution resumed.
- Prior Investigation Reviewed: `Yes` — round 1 identified the compact-primary display conflict and stopped before sign-off; the conflict is now resolved upstream.
- Latest Authoritative Investigation: this document, updated after repository, live API, and browser execution.

## Current Requirement And Design Basis

The approved behavior is a supported Settings → Token Statistics request with token aggregates above GraphQL's signed-32-bit `Int` limit but within JavaScript's safe-integer range. It must complete without GraphQL errors, preserve exact numeric values through generated client types and Pinia state, and render full decimal digits in the primary Task input/output cells. The representative required value is `3_136_827_911`; the corresponding total in the fixture is `3_136_827_941`.

The reviewed implementation applies `GraphQLSafeInt` to all contract-approved token-valued fields, leaves `usageReportCount` as built-in `Int`, maps generated `SafeInt` input/output to TypeScript `number`, and uses `formatInteger` at the primary Task input/output cells. Cache/thinking explanatory sublines remain compact. Persisted ledger data is `Not Affected`; no migration, cap, string conversion, compatibility path, or data rewrite is allowed.

The earlier finding that the Task table used compact formatting for the required primary value is resolved by `SR-001`/`IR-001` and was independently confirmed by `CRR-002`. It is retained below as resolved history rather than treated as an active gap.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Evidence and coverage consequence |
| --- | --- | --- |
| Domain/provider arithmetic | No | Provider, ledger arithmetic, and non-negative normalization are unchanged. Existing provider and pricing E2E regression scenarios remain relevant. |
| GraphQL API / transport | Yes | Real source-built schema must serialize the overflow aggregate on runtime/model, Task, and run-summary paths without errors. |
| Generated client / Pinia state | Yes | Schema/codegen inventory must prove SafeInt is numeric; store coverage must retain the large number without coercion or truncation. |
| Task-table presentation | Yes | Component and browser coverage must show exact primary input/output digits; compact secondary cache/thinking text remains accepted. |
| Settings journey / browser integration | Web-equivalent only | A live browser run is useful because repository store tests mock transport. It must use an isolated test DB and semantic DOM assertions. |
| Electron shell | No | No preload, IPC, packaging, native integration, or lifecycle code changed. Browser validates the shared renderer; packaged shell is residual delivery risk, not an API defect. |
| Authentication, session, permissions, workers, queues, distributed coordination | No | No changed boundary or required credentials. |
| Persisted-data transition | No (`Not Affected`) | Normal existing ledger rows are read through the current provider and GraphQL path; no migration scenario is required. |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow`
- Runtime: Node `v22.23.1`; pnpm workspace; TypeGraphQL/GraphQL; Prisma/SQLite; Nuxt/Vue/Pinia; Vitest; Electron wrapper.
- Server instructions: `autobyteus-server-ts/AGENTS.md`; focused one-shot command is `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`.
- Web instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`; focused command is `pnpm -C autobyteus-web test:nuxt <paths> --run`.
- Server Vitest setup: `autobyteus-server-ts/vitest.config.ts`, `tests/setup/prisma-env.ts`, and `tests/setup/prisma-global-setup.ts`; the normal test DB is disposable SQLite at `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`.
- Live runtime setup: project `test-runtime-bootstrap.mjs` creates an owned runtime root and SQLite DB; `pnpm server:test` provides the documented built-server path.
- Web codegen: `autobyteus-web/codegen.ts`; `BACKEND_GRAPHQL_BASE_URL=<live-url>/graphql pnpm -C autobyteus-web codegen` validates source/client alignment.
- No credentials or external providers are required for the selected scenarios.

## Fixture And Environment Plan

| Need | Method | Safety / Cleanup |
| --- | --- | --- |
| Exact overflow aggregate | Two normal ledger events with input counts `1_500_000_000` and `1_636_827_911`; each event remains below the old signed-32-bit limit and sums to `3_136_827_911`. | Unique run/model/runtime IDs; isolated test SQLite; delete by run ID. |
| Task projection | Same standalone `AGENT_RUN` fixture queried through `tokenUsageTaskStatisticsInPeriod`. | Normal provider projection, not a resolver-only stub. |
| Native AppConfig in durable E2E | Test file creates a temporary app-data directory and `.env`, initializes `appConfigProvider`, then resets/removes it in `afterAll`. | Only the owned temp directory and test DB are touched. |
| Live HTTP / browser | Built server on the project-selected local port, owned live runtime root, two seeded events, Nuxt dev server pointed at the live backend. | Delete exact run IDs, stop both processes, remove live runtime and DB. |

## Existing Durable Coverage Decisions

| Path / Scenario | Decision | Action / Evidence |
| --- | --- | --- |
| `tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` overflow candidate | Needs Update → retained | Added native AppConfig setup, exact Task query selection/assertion, and cleanup; focused run passed 2 tests. |
| `tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Still Valid | Rerun through the temporary native AppConfig harness; 3 tests passed. |
| `tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | Still Valid | Rerun through the same harness; 1 test passed. |
| `stores/__tests__/tokenUsageStatistics.spec.ts` | Needs Update → retained | Large numeric aggregate and error lifecycle assertions present; 2 tests passed. |
| `components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Needs Update → retained | Exact primary digits and compact secondary text assertions present; 3 tests passed. |
| `components/settings/__tests__/TokenUsageStatistics.spec.ts` | Still Valid | Date/grouping/fetch/empty behavior; 3 tests passed. |

No stale test was removed. No existing test protects invalid compatibility behavior or the old `Int` overflow limit.

## Durable Coverage Implemented

| Scenario | Boundary | Durable path | Status |
| --- | --- | --- | --- |
| API-001 | Persistence → provider → GraphQL runtime/model, Task, and run-summary paths | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Updated and passed 2/2. |
| WEB-001 | GraphQL-shaped store payload → Pinia numeric state and error lifecycle | `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Upstream-updated and independently passed 2/2. |
| WEB-002 | Task aggregate state → primary/secondary DOM presentation | `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Upstream-updated and independently passed 3/3. |
| WEB-003 | Settings controls, dates, grouping, fetch, empty state | `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Rerun and passed 3/3. |

## Repository Execution Results

| Check | Result | Evidence |
| --- | --- | --- |
| Focused provider-semantics E2E | Pass — 1 file, 2 tests | `api-e2e-evidence/server-provider-semantics.log` |
| Token-usage GraphQL/pricing regressions | Pass after environment correction — 2 files, 4 tests | `server-regressions-rerun.log`; initial run failed only because those pre-existing files did not initialize native AppConfig (`server-regressions.log`). |
| Store + Task table tests | Pass — 2 files, 5 tests | `web-focused.log` |
| Settings component tests | Pass — 1 file, 3 tests | `web-settings.log` |
| Source/schema contract and codegen inventory | Pass — SafeInt scalar, 32 SafeInt output references, no unsafe token output references, `usageReportCount` remains Int; generated artifact reproducible | `schema-codegen-contract.log` |
| Server build | Pass — built source, Prisma generation, shared builds, built-in-agent smoke | `server-build-typecheck-corrected.log` and source-review evidence |
| Web production build | Pass — Nuxt client/server/prerender build; existing large-chunk warning only | `broader-checks.log` |
| `git diff --check` | Pass | `broader-checks.log` / source-review report |
| Server package `typecheck` command | Known repository configuration failure, not implementation failure | `broader-checks.log`: pre-existing `TS6059` because `tsconfig.json` includes tests outside `rootDir`; the source build itself passed. |

## Live And Browser Validation Results

Broader validation was **Required** because store/component tests mock or bypass the live HTTP GraphQL transport, and the changed scalar contract could fail at schema/runtime, proxy, or browser rendering boundaries. It was completed with a built server, live HTTP GraphQL, live codegen, and a semantic browser journey.

| Scenario | Result | Evidence |
| --- | --- | --- |
| Live schema introspection | Pass — SafeInt is used for scoped token fields and run-summary token fields; `usageReportCount` is Int; empty Task and usage queries return no GraphQL errors | `api-e2e-live-schema-check.txt` |
| Live HTTP overflow query | Pass — Task row, model row, and run summary all returned exact numeric `3_136_827_911`, output `30`, total `3_136_827_941`, count `2` | `api-e2e-live-overflow-check.txt` |
| Live codegen against running source schema | Pass — generated `SafeInt` maps to `number`; generated field inventory matches source contract | `api-e2e-evidence/schema-codegen-contract.log` and live-codegen execution record |
| Browser Settings → Token Statistics | Pass — seeded live data rendered `3,136,827,911` in the primary Task input cell, did not render compact `3.14B` there, and showed no GraphQL error | `api-e2e-browser-check.txt`, `api-e2e-settings-token-statistics.png` |

Browser run used Chrome `150.0.7871.127`, Nuxt dev server at `127.0.0.1:3000`, backend at the owned live port `59864`, date range `2026-07-21` through `2026-07-28`, and a unique seeded run ID. The first generic `pnpm web:test` attempt used its default backend port `8000` and was stopped after the proxy connection refusal; the corrected run explicitly set `BACKEND_NODE_BASE_URL` to the live backend and passed.

One disposable live-seeder attempt initially inherited the shell's production environment before any assertion. It created exactly two rows under a unique probe run ID; immediate cleanup verified `before=2`, `after=0`. Subsequent live API and browser probes unset inherited DB/server variables, used the isolated test DB, and cleanup removed all owned rows and runtime files. No other production data was changed.

## Confidence Scorecard After Broader Validation

| Category | Score | Supporting evidence | Residual uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 100% | Exact overflow is proven in live GraphQL, Task query, store, table, and browser; preserved regressions passed. | Values above `Number.MAX_SAFE_INTEGER` are out of scope by contract. |
| Changed-boundary execution directness | 100% | Persistence-backed native E2E plus live HTTP schema/query and generated-client inspection. | None for approved range. |
| Cross-boundary integration realism and mock gap | 95% | Live DB → provider → GraphQL and live HTTP → Nuxt browser journey; store unit mocks remain useful but are not sole proof. | No authenticated production-like account flow, which is not a changed boundary. |
| Environment/configuration/fixture fidelity | 95% | Native AppConfig setup, isolated Prisma SQLite, unique fixtures, live runtime and proxy setup, cleanup audit. | Initial wrong-environment disposable probe was corrected and removed immediately. |
| Failure/edge/lifecycle/recovery evidence | 95% | Signed-32 overflow boundary, smaller/pricing regressions, store error lifecycle, browser no-error assertion, process and DB cleanup. | `SafeInt` rejection above the safe-integer limit was not exercised. |
| User-surface/browser/desktop-shell confidence | 95% | Semantic Chrome journey proved Settings rendering; no Electron shell-specific code changed. | Packaged Electron artifact was not run. |
| Durable regression coverage quality/relevance | 95% | API task selection is durable; store/table/settings coverage is narrow and requirement-linked; all passed. | Proportional test-code review remains downstream. |

- Overall final confidence: `96%` (simple average of applicable categories: 675 / 7 = 96.4%, rounded down conservatively).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default 95% confidence target met: `Yes`.

## Broader Validation Decision

- Decision: `Required` → `Completed`.
- Selected mode: source-built live server, isolated SQLite seed/query/cleanup, source-schema introspection/codegen, and browser semantic DOM validation.
- Why selected: the transport scalar change and primary display formatter required evidence beyond mocked store/component tests.
- Residual scope: packaged Electron shell, authenticated deployment, and values outside JavaScript safe-integer range were not tested; none is a changed boundary or approved requirement.

## Ambiguities And Reroute Triggers

| Issue | Classification | Resolution |
| --- | --- | --- |
| Prior compact-primary display blocker | Resolved upstream; no reroute | `SR-001`, `IR-001`, and `CRR-002` changed and reviewed the primary cells to use `formatInteger`; component and browser evidence passed. |
| Existing regression E2E files lacked native AppConfig setup | Local Fix, API/E2E-owned environment harness | Temporary harness initialized AppConfig for the rerun only; 4/4 tests passed and cleanup reported zero residual ticket rows. No unrelated durable test files were changed. |
| Generic `pnpm web:test` defaulted to unused port 8000 | Local Fix, API/E2E-owned execution setup | Stopped the failed attempt and reran Nuxt with explicit `BACKEND_NODE_BASE_URL`; browser evidence passed. |

## Investigation Decision

- Proceed to API/E2E execution: `Complete`.
- Durable coverage added/updated/removed: `Yes` — API-001 was updated in the server E2E file; WEB-001/WEB-002 were upstream-updated and independently executed; WEB-003 was rerun; none removed.
- Broader validation: `Required` and complete.
- Latest result: `Pass`, pending proportional test-code review by `code_reviewer`.
- Reroute required before handoff: `No`.
