# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-spec.md`
- Supplemental Task Artifacts: `None`
- Solution Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/code-review-revision-record.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `code_reviewer` CRR-002 source-review Pass for implementation commit `6176e1525`
- Prior Investigation Reviewed: `None`
- Latest Authoritative Investigation: This file

## Current Requirement And Design Basis

The reviewed change must keep the canonical AutoByteus custom-provider identity (`openai-compatible:<providerId>:<model>`) as the raw grouping, row, attribution, pricing, and diagnostic value while exposing an additive provider-aware display label (`<saved provider name>:<model name>`) in Model and recursive Task Token Statistics. Built-in AutoByteus rows receive the existing provider display name; non-AutoByteus rows retain their current labels. Unknown, deleted, malformed, legacy, colon-containing, missing, and cross-runtime-collision metadata must resolve deterministically without dropping or merging raw rows.

The approved persisted-data decision is `Migration Required` only for legacy composite `model_value` correction. The required fixed-ID app-data migration must update only validated `model_value` suffixes, preserve `model_identifier` and row count, be idempotent, permit independently durable partial progress, report skip reason codes, continue startup after failure, retry FAILED rows through `runPending()`, and retry warning rows only via explicit `runMigration(id)`. Read-time display must work before, during, and after migration. Shared accounting consumers (`getTotalCost`, run summaries, synthetic summaries, and aggregate GraphQL mappings) remain display-context-free.

CRR-002 reports the malformed-value source finding resolved and authorizes independent API/E2E validation. The implementation handoff identifies the main paths as the server display projection, statistics provider/tree builder, GraphQL token-usage types, Pinia/store/UI tables, and the startup app-data migration.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-TOKMODEL-001`, Model/Task display | Changed | Requirements AC-001/002; `design-spec.md` DS-TOKMODEL-002/003; CRR-002 | Must prove provider name plus model through live GraphQL and rendered Model/Task surfaces. |
| `BEH-TOKMODEL-002`, raw accounting/grouping | Preserved | Requirements REQ-002/AC-004; unchanged cost aggregate path | Must assert raw identifiers, row IDs, counts/costs, and `totalCostInPeriod` remain unchanged beside display fields. |
| `BEH-TOKMODEL-003/004`, built-in and non-AutoByteus labels | Changed/Preserved | Requirements REQ-003; AC-003 | Must include built-in AutoByteus and non-AutoByteus rows in API and UI evidence. |
| `BEH-TOKMODEL-005`, malformed/deleted/missing/collision policy | Changed | Requirements REQ-004; AC-005/007/008; CRR-002 F-001 resolution | Unit coverage exists; API/task projection should exercise non-empty fallback and cross-runtime raw fallback. |
| `BEH-TOKMODEL-006`, legacy composite `model_value` | Changed / persisted-data transition | Requirements REQ-005/006; AC-006/007; migration design | Must execute actual database adapter/runner lifecycle, partial updates, retry and read-time safety. |
| `BEH-TOKMODEL-007`, accounting boundary | Preserved | Requirements REQ-006; AC-008 | Live GraphQL query must request totals and statistics together and compare accounting semantics. |
| `BEH-TOKMODEL-008`, recursive Task alignment | Changed | Requirements REQ-007; AC-008 | Must query standalone/team/nested/member rows and assert equal raw/display array lengths and positions. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Pure model-display resolver and ordered entry projection | Projection unit tests; provider integration tests | Test doubles do not prove live resolver-to-GraphQL wiring | Live GraphQL e2e |
| API / transport / contract | Yes | GraphQL `UsageStatistics.modelDisplayName` and Task `modelDisplayNames` additive fields | Schema/build/codegen, durable GraphQL E2E, and live HTTP GraphQL response | No material API gap remains; provider network is out of scope | None required |
| Frontend component / state | Yes | Store hydration and Model/Task tables render display fields | Store/component suites (`6` frontend tests) plus live Chrome probe | No durable browser harness; temporary probe covers runtime fetch/render | Keep temporary evidence; no new browser harness convention |
| Browser integration / user journey | Yes | `/settings` Token Statistics interaction, grouping toggle/date fetch/rendering | Temporary `BROWSER-TOK-001` Chrome probe with 4 successful GraphQL responses | No durable Token Statistics browser harness; shell is unchanged | No further validation required |
| Authentication / session / permissions | No | Token statistics query has no task-specific auth change | Existing local server path; no new auth code | General auth is out of scope | Not required |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer is the changed user surface | Component tests, Nuxt prepare, and Chrome probe | Electron shell remains untested but unchanged | No shell validation required |
| Desktop shell / Electron-specific integration | No | No preload, IPC, packaging, or native integration changed | Source review found no shell changes | Electron shell not material to this web-equivalent behavior | Not required; state explicitly |
| Process / lifecycle | Yes | Required app-data migration runs at startup and through runner retries | Real migration runner E2E plus live startup GraphQL migration record | No destructive process-level injected failure; runner continuation is proven | No further validation required |
| Persisted-data transition | Yes | Value-only migration for composite legacy `model_value` | Unit tests, real Prisma/runner E2E, and live startup record/row probe | No material persisted-data gap remains | No further validation required |
| Worker / queue / distributed coordination | No | No worker/queue boundary changed | Source review and requirements | Not applicable | Not required |
| External integration | No | Provider names are local config metadata; no live provider call needed | Unit/provider map tests | Provider availability is not part of the display contract | Not required |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript Fastify + Mercurius/type-graphql server; Prisma/SQLite; Nuxt/Vue/Pinia frontend; Vitest; Playwright-core browser probes.
- Conflicting, missing, or unclear project instructions: No conflicting instructions. `autobyteus-server-ts/AGENTS.md` and `autobyteus-web/AGENTS.md` are authoritative for test commands. Server README additionally defines real dev startup, test-owned SQLite isolation, migration startup order, and browser/probe expectations.
- Required environment variables or secrets available: `Yes` for credential-free local server/browser validation; no provider API credential is needed. External real-provider E2E is not relevant and will not be represented as passed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/AGENTS.md` | Server test execution | Use `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch`; integration suite under `tests/integration`. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/AGENTS.md` | Frontend test execution | Use `pnpm test:nuxt --run`; web-only checks are preferred before full Electron tests. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/README.md` | Real runtime/migration/E2E setup | `pnpm -C autobyteus-server-ts build`; server `node dist/app.js --data-dir <dir> --host <host> --port <port>`; app-data migrations run after Prisma startup; tests use `tests/.tmp`, not development DB; `pnpm test:e2e` is the deterministic server E2E command. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/README.md` | Frontend live preview | Set `BACKEND_NODE_BASE_URL`/`BACKEND_GRAPHQL_BASE_URL`; `pnpm dev` starts Nuxt; local Vite proxy sends `/graphql` to backend. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/vitest.config.ts` | Server runner | Node environment, fork pool, global Prisma test setup, tests `tests/**/*.test.ts`, no watch for single runs. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/vitest.config.mts` | Frontend runner | Nuxt environment with happy-dom; no browser engine. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/tests/e2e` | Existing browser probes | Project-supported Playwright-core probes exist, but no Token Statistics-specific probe is present. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | workspace root | `pnpm -C autobyteus-server-ts build` | Builds shared packages, Prisma client, production server. | Exit code `0`. | None. |
| Server E2E/test DB | `autobyteus-server-ts` | Vitest global setup or isolated temp SQLite DB | Test DB is `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`; isolated lifecycle tests use `mkdtemp` and schema SQL. | Prisma reset / test setup succeeds. | Test cleanup and remove temp roots/rows. |
| Real backend | workspace root | `node autobyteus-server-ts/dist/app.js --data-dir <isolated-dir> --host 127.0.0.1 --port <free-port>` | Requires isolated `.env`, SQLite DB, logs, and no credentials. | HTTP `/health` or GraphQL POST readiness. | Kill only owned PID; remove isolated data dir. |
| Real frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:<port> BACKEND_GRAPHQL_BASE_URL=... pnpm dev --host 127.0.0.1 --port <free-port>` | Nuxt dev server with Vite proxy; browser targets this process. | HTTP GET `/settings` and browser DOM. | Kill only owned PID; remove generated `.nuxt` only if created for run. |
| Browser | workspace root | Project Playwright-core dependency; use installed Chrome/Chromium if available | Prefer semantic DOM/state assertions; screenshots supporting only. | `GET /settings`, visible Token Usage section and network response. | Close browser/context; retain evidence under ticket `probes/api-e2e`. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Token ledger rows | Existing `TokenUsageLedgerStore.appendTokenUsageEvent`/Prisma-backed test helpers | Use unique run/event IDs and isolated temp DB for live backend; no real provider invocation. | Delete unique rows or remove isolated data dir. |
| Custom provider display name | Existing local `custom-llm-providers.json` v2 read path, or a test-scoped provider-store mock for schema e2e | Store only synthetic non-secret metadata (`id`, `name`, base URL); no API key. | Remove test-scoped file or reset mock. |
| Browser date range | Date input values covering deterministic synthetic observations | Use current/future dates accepted by UI and matching ledger timestamps. | Browser state is disposable. |
| Migration records/logs | Actual `AppDataMigrationRecordRepository` and temporary logs dir | Unique migration record cleanup; migration itself has fixed ID so isolated DB is preferred. | Remove temp DB/log root after run. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` for legacy composite `model_value`; `Directly Usable — No Migration` for canonical identity/accounting and read-time display.
- Design-spec and implementation-handoff references: `design-spec.md` sections “Legacy Data Correction / App-Data Migration”, “Migration Lifecycle, Partial Update, And Recovery Contract”, “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: rows scoped to `runtime_kind=autobyteus` and `model_provider=OPENAI_COMPATIBLE` with both fields `openai-compatible:provider_A:org/model:tag`; successful migration changes only `model_value` to `org/model:tag` and leaves `model_identifier` unchanged. Non-composite, malformed, missing, scope-mismatched, and conflicting rows remain unchanged with reason details.
- Evidence completed for the approved outcome: actual Prisma-backed adapter/runner execution; live GraphQL migration record and raw/display query; row count/raw-identity assertions; status and attempts from migration records; retry after injected update failure; sibling migration/startup continuation.
- Migration-specific completion/recovery scenarios: `API-MIG-001` successful suffix backfill and idempotent rerun; `API-MIG-002` partial row failure -> `FAILED`, durable successful updates, `runPending()` retry -> `SUCCEEDED`; `API-MIG-003` warning completion stays terminal for `runPending()` and reruns only through explicit `runMigration(id)`; `API-MIG-004` failed migration does not prevent a following startup definition from running.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts` | Anchored parser, custom/built-in/non-AutoByteus labels, deleted/malformed/missing fallback, collision and ordered entries | REQ-001/003/004/007; AC-003/005/007/008 | Still Valid | 5 tests; CRR-002 confirms malformed cases corrected | Keep; rerun. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Provider map loaded once, raw identifier separate from display; recursive task grouping and hierarchy | REQ-001/002/007; AC-001/002/004/008 | Still Valid | 8 integration tests; recursive contract is additionally asserted through live GraphQL e2e | Keep; rerun. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts` | Fixed ID, suffix update/idempotence, warning skips, row failure and retry at definition level | REQ-005/006; AC-006/007 | Still Valid | 3 tests; fake DB | Keep; add runner/DB boundary coverage separately. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts` | Generic concurrent/stale-run/status behavior | Migration lifecycle contract | Still Valid | 4 runner scenarios, but no new migration or startup sibling continuation | Keep; use actual runner in added e2e. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Real Prisma ledger -> GraphQL summaries, Model statistics, recursive Task rows and accounting | REQ-002/006; AC-004/008 | Updated / Validated | 4 scenarios; real schema query asserts custom, built-in, non-AutoByteus, raw collision, task alignment, and cost | Keep durable coverage. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts` | Existing migration + task hierarchy GraphQL behavior | Recursive path and lifecycle patterns | Still Valid | 1 integration migration scenario, not this migration | Reuse pattern; no change unless helper duplication proves necessary. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts` | Startup migration failure/ordering and GraphQL still works | Startup continuation/persisted lifecycle pattern | Still Valid | 2 actual isolated startup scenarios | Reuse as evidence; add this migration's fixed-ID lifecycle separately. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Hydrates additive fields and fallback | REQ-001/002; AC-004 | Still Valid | 2 store tests | Keep; rerun. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts` | Visible Model table/chart labels and runtime diagnostics | AC-001/003 | Still Valid | 1 component scenario | Keep; browser still required for proxy/live fetch. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | Recursive Task rendering, display label examples, sorting/details | AC-002/008 | Still Valid | 3 component scenarios | Keep; browser still required for real store path. |
| `autobyteus-web/tests/e2e/*` | Browser probes for unrelated web surfaces only | N/A to this task | Out Of Scope | No Token Statistics probe exists | Do not alter unrelated probes unless a focused durable probe is justified. |

## Stale Or Obsolete Coverage Decisions

No test is being deleted. Existing raw-field assertions are still valid because raw fields remain an approved API/accounting contract; visible-label assertions were already updated by implementation and continue to assert the new display behavior.

## Durable Coverage Plan (Completed)

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Artifact / Path | Rationale / Result |
| --- | --- | --- | --- | --- |
| `API-GQL-001` | Live Model GraphQL fields for custom/built-in/non-AutoByteus rows; raw grouping and totals unchanged | REQ-001/002/003/006; AC-001/003/004/008; DS-TOKMODEL-002/003 | Extend `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Added and passed; real schema/resolver coverage now closes this gap. |
| `API-GQL-002` | Live recursive Task raw/display arrays, duplicate labels, nested rows and cross-runtime collision fallback | REQ-004/007; AC-002/005/008 | Extend same GraphQL e2e scenario with `modelDisplayNames` and aligned assertions | Added and passed; aligned raw/display arrays are now asserted. |
| `API-MIG-001..004` | Actual migration DB adapter/runner status, partial durability, retry, warnings, startup continuation | REQ-005/006; AC-006/007; DS-TOKMODEL-004 | Add `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts` | Added and passed; real Prisma/runner lifecycle now closes this gap. |
| `BROWSER-TOK-001` | Real `/settings` Token Statistics Model/Task fetch and render against the configured backend endpoint | AC-001/002/003/004 | Temporary browser probe under ticket `probes/api-e2e`, retain only if project durable-browser policy warrants it | Passed as a temporary probe; no existing Token Statistics browser harness justified promotion. |

## Durable Coverage Updated

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-GQL-001/002` | `token-usage-ledger-graphql.e2e.test.ts` | Add optional `modelValue` fixture input and query `modelDisplayName`/`modelDisplayNames`; assert raw fields and arrays remain unchanged/aligned | REQ-001/002/007; AC-001/002/004/008 | Updated and passed; existing accounting assertions remain unchanged. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts --no-watch` | Server worktree; test-owned SQLite setup | Projection fallbacks, provider aggregation, and migration definition | **PASS** — 3 files / 15 tests | Vitest terminal result; exact command is reproducible from workspace root. |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts --no-watch` | Server worktree; real Prisma test DB | Live GraphQL fields/recursive rows and real Prisma/runner lifecycle | **PASS** — 2 files / 6 tests (GraphQL 4, migration lifecycle 2) | Vitest terminal result; added durable paths listed below. |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage --no-watch` | Server worktree; project token-usage E2E setup | Regression across all token-usage E2E boundaries | **PASS** — 8 files / 16 tests | Vitest terminal result. |
| 4 | `pnpm test:nuxt --run stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | `autobyteus-web`; Nuxt/happy-dom | Store hydration and Model/Task table rendering regressions | **PASS** — 3 files / 6 tests | Vitest terminal result; expected KaTeX and intentional error-path stderr did not fail tests. |
| 5 | `pnpm exec nuxt prepare && pnpm guard:web-boundary && pnpm guard:localization-boundary` | `autobyteus-web` | Generated Nuxt runtime and frontend boundary guards | **PASS** | Nuxt generated `.nuxt` types; both guards reported Passed. |
| 6 | `pnpm -C autobyteus-server-ts build && git diff --check` | Workspace root | Production server compile/bootstrap smoke and whitespace integrity | **PASS** | Build reported built-in-agent and sanitized bootstrap smoke passed; `git diff --check` returned no findings. |
| 7 | Isolated real backend + frontend + Chrome/Playwright probe; backend `node autobyteus-server-ts/dist/app.js --data-dir /tmp/token-statistics-custom-provider-browser-pw0Zay --host 127.0.0.1 --port 38201`; Nuxt `BACKEND_NODE_BASE_URL=http://127.0.0.1:38201 pnpm dev --host 127.0.0.1 --port 38202`; direct GraphQL/curl readiness and seed scripts | Temporary SQLite data root, current built server, provider metadata file, no credentials; browser at `http://127.0.0.1:38202/settings` | Startup migration, live HTTP GraphQL, Nuxt runtime/store, rendered Task -> Model grouping | **PASS** — `API-GQL-001/002`, `API-MIG-001..004`, `BROWSER-TOK-001` | Reviewable evidence in `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/probes/api-e2e/`; temporary root and owned processes removed. |

### Repository And Broader Validation Evidence

- The extended GraphQL E2E seeds a real custom-provider metadata file, queries `usageStatisticsInPeriod` and `tokenUsageTaskStatisticsInPeriod` through the real schema, asserts raw composite IDs remain the grouping/row identity, asserts `alibaba_cloud:qwen3.8-max-preview`, built-in AutoByteus, non-AutoByteus, cross-runtime collision fallback, positional Task arrays, and unchanged accounting totals.
- The new migration E2E uses the real Prisma adapter and `AppDataMigrationRunner`. It proves warning completion is terminal for `runPending()` but explicit `runMigration(id)` retries; injected row failure produces `FAILED` with independently durable successful rows, sibling startup work still runs, and a cleared failure retries to `SUCCEEDED` without rewriting resolved rows.
- The isolated startup process reports migration `20260730_token_usage_custom_provider_model_value_backfill` as `SUCCEEDED` with `attempts: 1` in the live GraphQL response. The same response shows `modelIdentifier`/`llmModel` still equal `openai-compatible:provider_browser:qwen3.8-max-preview` while display fields resolve to `alibaba_cloud:qwen3.8-max-preview`; the persisted seeded `model_value` was corrected to `qwen3.8-max-preview`.
- The browser probe loaded the real Settings route, selected the localized `Token Statistics` section, observed four successful GraphQL HTTP responses, asserted the Task and Model table DOM text, switched grouping from `task` to `model`, and asserted the raw composite did not leak into the visible Model table. Screenshots show the provider-aware label and chart. The development client resolved the configured live backend endpoint directly; no mock or intercepted GraphQL response was used.

## Durable Coverage Added Or Updated

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Durable Artifact | Result |
| --- | --- | --- | --- | --- |
| `API-GQL-001` | Live Model GraphQL fields for custom/built-in/non-AutoByteus rows; raw grouping and totals unchanged | REQ-001/002/003/006; AC-001/003/004/008; DS-TOKMODEL-002/003 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Added and passed |
| `API-GQL-002` | Live recursive Task raw/display arrays, duplicate labels, nested rows and cross-runtime collision fallback | REQ-004/007; AC-002/005/008 | Same GraphQL E2E path | Added and passed |
| `API-MIG-001..004` | Actual migration DB adapter/runner status, partial durability, retry, warnings, startup continuation | REQ-005/006; AC-006/007; DS-TOKMODEL-004 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts` | Added and passed |
| `BROWSER-TOK-001` | Real `/settings` Token Statistics Model/Task fetch and render against live backend | AC-001/002/003/004 | Temporary probe; retained evidence under `probes/api-e2e` | Passed; not promoted to durable browser suite because no Token Statistics browser harness convention exists |

## Durable Coverage To Remove

None.

## Post-Repository Confidence Before Broader Validation

Repository execution completed before live validation. The direct server and frontend checks raised backend, API, migration, and durable-coverage confidence, but the changed browser user journey remained unproven.

| Confidence Category | Score | Evidence At This Gate | Remaining Gap Driving Broader Validation |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | Focused unit/integration, live GraphQL E2E, and real migration E2E covered critical server behavior | Browser settings journey still unproven. |
| Changed-boundary execution directness | 92% | Real GraphQL schema and Prisma/runner boundaries exercised | Frontend runtime fetch/render still unproven. |
| Cross-boundary integration realism and mock gap | 90% | Real Prisma E2E and durable API tests passed | Live Nuxt-to-backend browser journey still unproven. |
| Environment, configuration, identity, and fixture fidelity | 91% | Deterministic test DB/provider fixtures and production build passed | Isolated process startup with provider file still unproven. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Real migration runner E2E covered warning, failure, retry, and sibling continuation | No material lifecycle gap remained. |
| User-surface, browser, and desktop-shell confidence | 75% | Component/store tests and Nuxt prepare passed | Browser rendering, grouping interaction, and live frontend/backend wiring unproven. |
| Durable regression coverage quality and relevance | 95% | Added GraphQL and migration E2E; full token-usage E2E passed | Temporary browser evidence still needed for user-surface confidence. |

- Overall post-repository confidence: **90%** (630 / 7 = 90.0%, simple average)
- Broader validation at this gate: **Required** because the user-surface category was below 90% and live configuration/proxy/runtime risk remained.

## Final Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | Unit fallbacks, live GraphQL custom/built-in/non-AutoByteus/collision assertions, real migration lifecycle, and browser Model/Task labels collectively cover every critical AC | Real provider network/API is intentionally not exercised. |
| Changed-boundary execution directness | 97% | New fields are queried through the real GraphQL schema; migration uses the real Prisma adapter/runner; browser uses the built frontend route and live backend | No Electron shell launch; shell is unchanged and out of scope. |
| Cross-boundary integration realism and mock gap | 95% | Real Prisma/SQLite, app-data migration records, HTTP GraphQL, Nuxt runtime, Apollo fetch, and Chrome DOM were exercised without response mocks | The dev run used the configured live backend endpoint directly rather than relying on a Vite `/graphql` proxy hop. |
| Environment, configuration, identity, and fixture fidelity | 95% | Isolated `.env`, SQLite DB, v2 provider metadata file, real startup migration, deterministic timestamps, and no credentials; raw identity was asserted end-to-end | External provider discovery/network is not part of the display contract. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Unit malformed/fallback coverage plus real row-failure, warning, explicit retry, `runPending()` terminal behavior, sibling continuation, and startup success evidence | A process-level injected startup exception is represented by the real runner E2E rather than a destructive full-server failure run. |
| User-surface, browser, and desktop-shell confidence | 95% | Chrome semantic DOM assertions, grouping interaction, successful live GraphQL responses, and retained Task/Model screenshots; Electron shell has no changed boundary | Electron packaging/preload/window lifecycle remains out of scope. |
| Durable regression coverage quality and relevance | 95% | Two narrow requirement-linked durable E2E additions plus existing unit/integration/frontend suites; full token-usage E2E passed | Browser probe remains temporary by design; proportional test-code review is pending. |

- Overall final validation confidence: **96%** (simple average of applicable category scores: 669 / 7 = 95.57%, rounded)
- Every critical acceptance criterion directly proven: **Yes**
- Any applicable category below 90%: **No**
- Default clean-confidence target of 95% met: **Yes**
- Final result: **Pass pending code reviewer proportional test-code review**
- Material residual risks: no real external-provider request/credential path and no Electron shell packaging validation; neither is an in-scope changed boundary.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API`, `Lifecycle`, and `Browser`
- Specific confidence gap or residual risk addressed: additive GraphQL fields, actual migration lifecycle, and the browser settings path were initially unproven; all three gaps were closed by the completed validation.
- Why selected modes can materially improve confidence: each mode crosses a currently untested production boundary; a live GraphQL schema query validates resolver/transport mapping, lifecycle e2e validates actual Prisma/runner persistence and retries, and browser validation validates Nuxt/store/table rendering.
- Observed confidence after selected validation: `96%`; all critical scenarios passed and no applicable category remains below `90%`.
- Browser-specific decision and rationale: Required; user-facing tables and chart are in the changed scope, and component tests do not prove proxy/runtime wiring.
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wraps Nuxt, but this change is entirely in the web-equivalent renderer/API path.
- Relevant instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`, `autobyteus-web/ARCHITECTURE.md`; browser is preferred for web-equivalent behavior.
- Web-equivalent behavior: Settings Token Statistics fetch, grouping selector, date range, GraphQL response, Model table/chart, recursive Task table.
- Shell-specific/lifecycle behavior: none changed; preload/IPC/window/packaging are out of scope.
- Chosen approach: browser live validation; no Electron launch required.
- Effect on any already-running desktop application: `None`; only owned temporary processes will be started.
- Behavior not directly proven: Electron packaging/shell lifecycle, with no material consequence for this change.

## Live Environment And Fixture Plan

- Startup order and commands: build server; create isolated backend data root and `.env`; start backend on a reserved loopback port; wait for GraphQL/health readiness; seed synthetic ledger rows and provider config in that isolated data root; start Nuxt with `BACKEND_NODE_BASE_URL`/`BACKEND_GRAPHQL_BASE_URL` pointing to backend; wait for `/settings`; run browser.
- Environment choices: SQLite isolated to ticket temp root; no provider credentials; deterministic UTC timestamps; separate frontend port; no use of user production/development data.
- Health/readiness: HTTP GraphQL introspection/`getAppDataMigrations` or a simple POST query; frontend HTTP 200 plus browser DOM.
- Seed data: custom provider `provider_browser` named `alibaba_cloud`; AutoByteus composite model event with model value `qwen3.8-max-preview`; non-AutoByteus `gpt-5.6-luna`; task team/member rows including nested or duplicate model IDs if browser scope remains manageable.
- Test identity/auth/session: no feature-specific authentication; local loopback session only.
- Journeys: open `/settings`, select Token Usage, assert default Task table provider:model label, switch to Model, assert display label and no opaque prefix, fetch date range and verify non-AutoByteus label.
- Evidence: GraphQL response JSON, browser DOM assertions, screenshot of Model and Task tables/chart, backend/frontend logs, process IDs.
- Cleanup: close browser; kill only owned Nuxt/backend PIDs; remove temporary data root and retained temporary screenshots only after report references them.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `BROWSER-TOK-001` | One-off Playwright-core script or Node browser harness against isolated backend/Nuxt | Live settings route/rendered Model and Task labels against the configured backend endpoint | Project has no Token Statistics browser harness convention; retain only if it becomes a maintainable focused probe, otherwise report as temporary evidence. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real provider network/API | No provider credential or need; display uses stored metadata only | None for in-scope change | Explicitly not tested; never report as passed. |
| Electron shell/preload/packaging | No changed shell boundary | None material | State out of scope. |

## Ambiguities Or Reroute Triggers

None at initial investigation. A failing live scenario will be sent to `code_reviewer` for focused failure-origin classification before any fix.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — GraphQL field/task assertions and isolated migration lifecycle e2e.
- Post-repository confidence: `96%` final after repository and broader validation.
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Repository and broader validation completed with Pass. The cumulative package is ready for code reviewer proportional test-code review; do not infer that review result from this API/E2E report.
