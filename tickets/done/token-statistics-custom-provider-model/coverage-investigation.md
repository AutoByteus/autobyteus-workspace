# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-spec.md`
- Supplemental Task Artifacts: Retained executable evidence under `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/probes/api-e2e/api-rev-002/` (evidence only; approval `N/A`)
- Solution Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-revision-record.md`
- Delivery Revision Record (stale downstream context only): `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-N/A`; delivery artifacts predate `SR-006` and are not current sign-off.
- API/E2E Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `code_reviewer` CRR-005 source-review Pass for implementation commit `9e3d8d86e` (`IR-004`) after `SR-006`; historical API/E2E artifacts were stale.
- Prior Investigation Reviewed: `API-REV-001` / pre-`SR-006` package
- Latest Authoritative Investigation: This file

## Current Requirement And Design Basis

The reviewed package adds a nullable persisted `provider_name` to token-usage ledger events. New AutoByteus observations persist the configured custom-provider name or built-in readable provider name; direct Codex and Claude paths remain nullable and retain their existing labels. Top-level provider metadata wins over nested metadata, conflicts are flagged, and context enrichment does not invent or overwrite values. Model and recursive Task display prefer the persisted snapshot, then use the current registry for legacy null/empty values, then apply the deterministic fallback policy while preserving raw identity, row attribution, accounting, costs, counts, and ordering.

The persisted-data decision is `Migration Required` for two fixed-ID startup migrations: Migration A normalizes validated legacy composite `model_value` suffixes; Migration B backfills only null/empty AutoByteus `provider_name` values using built-in mappings or the current custom-provider registry. Migration B skips direct non-AutoByteus rows, warns without guessing for missing/deleted/invalid custom providers, is idempotent, retries failed work, uses provider-name-only CAS updates, and proves row count plus all `79` non-provider fields are unchanged. Migration B runs after Migration A and before the legacy path cleanup. API/E2E must prove this through real Prisma/runner startup behavior, GraphQL, and the web-equivalent Settings surface.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-TOKMODEL-001`, provider-aware Model display | Changed | `SR-006`, `AC-TOKMODEL-001`, `AC-TOKMODEL-003` | Assert persisted custom and built-in names through Prisma, GraphQL, and Model UI. |
| `BEH-TOKMODEL-002`, recursive Task display | Changed | `AC-TOKMODEL-002`, `AC-TOKMODEL-008` | Assert raw/display arrays remain aligned through live GraphQL and rendered Task UI. |
| `BEH-TOKMODEL-003`, producer snapshot persistence | Added | `AC-TOKMODEL-009`, `AC-TOKMODEL-011` | Assert actual ledger rows and migration-recovered rows, not only normalizer mocks. |
| `BEH-TOKMODEL-004`, raw/accounting contract | Preserved | `AC-TOKMODEL-004`, `AC-TOKMODEL-010`; CRR-005 | Compare direct Prisma facts, GraphQL totals, row counts, and all preserved fields. |
| `BEH-TOKMODEL-005`, malformed/deleted/missing policy | Changed | `AC-TOKMODEL-005`, `AC-TOKMODEL-007`; F-001 resolved in CRR-002 | Recheck unit matrix and live provider deletion stability. |
| `BEH-TOKMODEL-006`, Migration A legacy value correction | Changed | `AC-TOKMODEL-006`, `AC-TOKMODEL-007` | Run startup with legacy composite values and verify suffix correction. |
| `BEH-TOKMODEL-007`, Migration B lifecycle/recovery | Added | `AC-TOKMODEL-010`, `AC-TOKMODEL-011`; F-002 resolved in CRR-005 | Exercise warning terminal state, explicit retry, injected failure, sibling continuation, and complete-field invariants. |
| `BEH-TOKMODEL-008`, accounting boundary | Preserved | `REQ-TOKMODEL-006`, `AC-TOKMODEL-004` | Request cost/token statistics with display fields in the same real GraphQL journey. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Snapshot-first display resolver, statistics provider/tree builder, producers | Unit, integration, and direct producer tests | Live provider-file deletion and GraphQL wiring | Live GraphQL |
| API / transport / contract | Yes | GraphQL `modelDisplayName` / `modelDisplayNames` plus migration status | Durable GraphQL E2E and generated schema | HTTP/runtime configuration | Live API |
| Frontend component / state | Yes | Store hydration and Model/Task table rendering | Store/component tests (`3` files / `6` tests) | Real Apollo fetch and Nuxt route | Browser |
| Browser integration / user journey | Yes | Settings Token Statistics route, date range, Task/Model selector | No durable Token Statistics browser harness | Real DOM, live fetch, grouping transition | Browser |
| Authentication / session / permissions | No | No task-specific auth change | Existing local server path | None material to this change | Not required |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer | Nuxt tests, prepare, guards, Chrome probe | Electron shell | Browser; shell not required |
| Desktop shell / Electron-specific integration | No | No preload, IPC, packaging, or native code changed | Source review | Electron packaging remains unproven | Out of scope |
| Process / lifecycle | Yes | Startup migration registry, runner ordering, retries | Real Prisma/runner E2E and live startup | No live process-level injected failure | Live startup |
| Persisted-data transition | Yes | Nullable schema plus Migration A/B | Migration unit/E2E, direct row probe, live startup record | External DB engines not exercised | Live SQLite startup is sufficient for scope |
| Worker / queue / distributed coordination | No | No worker/queue boundary changed | Source review | Not applicable | Not required |
| External integration | No | Provider metadata only; no provider request | Provider-store and mapping tests | Real credentials/network intentionally excluded | Not required |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model`
- Runtime: pnpm monorepo; Node/TypeScript Fastify/type-graphql server; Prisma/SQLite; Nuxt/Vue/Pinia frontend; Vitest; Playwright-core/Chrome probes.
- Instructions read: `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`, server README, web README, server Vitest config, web Vitest config, and package manifests.
- No conflicting instructions. Credential-free local validation is available; external provider credentials and Electron packaging are out of scope.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server tests | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; integration tests under `tests/integration`. |
| `autobyteus-web/AGENTS.md` | Frontend tests | `pnpm test:nuxt <paths> --run`; use web-only checks before Electron. |
| `autobyteus-server-ts/README.md` | Runtime/migrations | Build with `pnpm -C autobyteus-server-ts build`; start `node dist/app.js --data-dir ...`; migrations run after Prisma startup. |
| `autobyteus-web/package.json` / README | Nuxt runtime | Set `BACKEND_NODE_BASE_URL` and `BACKEND_GRAPHQL_BASE_URL`; start `pnpm dev --host ... --port ...`. |

| Component / Dependency | Working Directory | Start / Setup Command | Readiness Check | Stop / Cleanup |
| --- | --- | --- | --- | --- |
| Server test DB | workspace root | Vitest setup / isolated temp SQLite | Prisma reset applies `20260730090000_add_token_usage_provider_name` | Test hooks and DB reset |
| Real backend | workspace root | `node autobyteus-server-ts/dist/app.js --data-dir <temp> --host 127.0.0.1 --port 38301` | GraphQL POST returned HTTP 200 and migration records were terminal | SIGINT to owned session; remove temp root |
| Real frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:38301 BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:38301/graphql pnpm dev --host 127.0.0.1 --port 38302` | `/settings` returned HTTP 200; DOM test ID visible | SIGINT to owned session |
| Browser | workspace root | Installed Chrome via Playwright-core 1.58.2 | Semantic DOM assertions and four live GraphQL HTTP responses | Close browser; retain screenshots/result |

| Data / Fixture / Identity Need | Creation Method | Safety / Cleanup |
| --- | --- | --- |
| Legacy custom AutoByteus row | Direct Prisma seed into isolated SQLite | Unique `browser-round2-*` IDs; temp DB removed |
| Custom provider map | Secret-free v2 `llm/custom-llm-providers.json` with `provider_browser_round2` / `alibaba_cloud` | Copied to evidence, deleted during deletion-stability check, temp root removed |
| Built-in and direct-runtime rows | Direct Prisma seed with `DEEPSEEK` and Codex metadata | Isolated, no provider call |
| Migration records/logs | Actual startup runner | Temporary logs retained only in discarded temp root; GraphQL status retained in evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` for legacy composite `model_value` and nullable `provider_name` snapshot recovery; canonical read/display path remains directly usable.
- References: `design-spec.md` migration/lifecycle sections; `implementation-handoff.md` persisted-data transition check; `SR-006`, `IR-004`, `CRR-005`.
- Representative data: custom AutoByteus `model_identifier` and legacy `model_value` both `openai-compatible:provider_browser_round2:qwen3.8-max-preview`; built-in DeepSeek; direct Codex.
- Required result: Migration A changes custom `model_value` to `qwen3.8-max-preview`; Migration B writes `alibaba_cloud` and `DeepSeek` only to eligible AutoByteus rows; Codex remains null; all other row values remain unchanged.
- Recovery scenarios: warning row and explicit retry; injected update failure with durable partial progress and `runPending()` retry; sibling migration continuation; idempotent terminal rerun.
- Upstream ambiguity/reroute: None. One existing legacy-path E2E fixture initially omitted the new schema migration and failed before exercising the intended behavior; this was a bounded API/E2E fixture fix, not a product failure.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion / Intent | Validity Decision | Evidence / Action |
| --- | --- | --- | --- |
| `tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts` | Parser, custom/built-in/non-AutoByteus, deleted/malformed/missing/collision fallback | Still Valid | Passed as part of `6` server files / `28` tests; retain. |
| `tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Provider map, raw/display separation, recursive task grouping | Still Valid | `1` file / `9` tests passed; retain. |
| `tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts` | Migration A classification, idempotence, warning/failure behavior | Still Valid | `3` tests passed; retain. |
| `tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts` | Migration B status, CAS, warning/failure/retry, complete-field invariant | Still Valid | `1` file / `5` tests passed; retain. |
| `tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Real ledger -> GraphQL Model/Task/accounting behavior | Needs Update | Updated for provider_name persistence and deletion stability; `1` file / `4` tests and full folder passed. |
| `tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Real Prisma/runner Migration B warning, retry, failure, sibling continuation, row preservation | Add Durable Coverage | Added; `1` file / `2` tests passed. |
| `tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts` | Startup sequencing and legacy-path cleanup | Needs Update | Added current provider schema migration to its isolated SQL fixture; targeted `2` tests and full folder passed. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Store hydration/error handling | Still Valid | `2` tests passed. |
| `autobyteus-web/components/settings/token-usage/__tests__/*` | Model/Task table labels and recursion | Still Valid | `2` files / `4` tests passed; retain. |
| Existing unrelated browser probes | Other web surfaces | Out Of Scope | No Token Statistics durable browser harness exists; temporary focused probe retained. |

## Stale Or Obsolete Coverage Decisions

No behavior assertion was removed. The first full token-usage-folder run exposed a stale isolated-schema fixture: the legacy-path test manually applied migrations through execution-address but not the current `provider_name` schema, while the current Prisma client selected that column. The fixture was updated to apply `20260730090000_add_token_usage_provider_name/migration.sql`; the targeted test then passed `2/2`, and the complete folder passed `9/9` files / `18/18` tests. This is recorded as API/E2E-owned `Local Fix` evidence, not an implementation failure.

## Durable Coverage Plan And Results

| Scenario ID | Behavior / Boundary | Artifact / Path | Result |
| --- | --- | --- | --- |
| `API-GQL-003` | Persisted custom provider snapshot through real Prisma and GraphQL; provider deletion does not change historical display | Updated `token-usage-ledger-graphql.e2e.test.ts` | Pass — `4` tests |
| `API-MIG-005` | Migration B startup success, warning terminal state, explicit retry, built-in/custom/direct scope | Added `token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Pass — `2` tests |
| `API-MIG-006` | Migration B injected update failure, durable partial progress, sibling continuation, successful retry | Added same E2E path | Pass — `2` tests |
| `API-MIG-007` | Existing legacy-path startup fixture remains valid on current schema | Updated legacy-path E2E fixture | Pass — `2` tests |
| `BROWSER-TOK-002` | Live startup, GraphQL, Settings Task/Model grouping, provider-file deletion stability | Temporary Chrome probe and retained evidence | Pass |

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary / Scenario | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts tests/unit/agent-execution/domain/agent-run-token-usage-provider-name.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts --no-watch` | Migration A/B, projection, producer, provider, SQL persistence | Pass — `6` files / `28` tests | Vitest output; SQLite schema reset applied provider_name migration |
| 2 | `pnpm exec vitest run tests/unit/llm/api/token-usage-normalizers.test.ts --no-watch` | Shared normalizer provider propagation | Pass — `1` file / `9` tests | Vitest output |
| 3 | Focused GraphQL E2E and Migration B E2E commands with `--no-watch` | New durable API coverage | Pass — `1` file / `4` tests; `1` file / `2` tests | Vitest output |
| 4 | First `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage --no-watch` | Broader token-usage E2E | Initial fixture failure, then fixed; final Pass — `9` files / `18` tests | Failure was missing schema SQL in legacy fixture; rerun output passed |
| 5 | `pnpm test:nuxt stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts --run` | Web store/table behavior | Pass — `3` files / `6` tests | Vitest output |
| 6 | `pnpm exec nuxt prepare && pnpm guard:web-boundary && pnpm guard:localization-boundary` | Generated frontend contract and boundary guards | Pass | Nuxt/guard output |
| 7 | `pnpm -C autobyteus-server-ts build && git diff --check` | Production build, Prisma generation, bootstrap smoke, whitespace | Pass | Build output and zero diff-check output |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `92%` | Durable GraphQL and real runner tests cover snapshot display, raw/accounting, warning/retry, and complete preservation. | No live startup/browser yet. | Live API and browser. |
| Changed-boundary execution directness | `92%` | Prisma adapters, GraphQL schema, normalizers, and frontend components execute directly. | Nuxt/Apollo live wiring pending. | Live startup and Chrome. |
| Cross-boundary integration realism and mock gap | `90%` | Real SQLite/Prisma and server E2E; no provider network needed. | No process/browser journey yet. | Live backend + Nuxt. |
| Environment/configuration/fixture fidelity | `90%` | Durable isolated fixtures and full schema migration application. | Real startup against a production-like temp root pending. | Isolated built-server startup. |
| Failure/edge/lifecycle/recovery evidence | `95%` | Real runner E2E covers warning, injected failure, partial progress, sibling continuation, explicit retry, and idempotence. | No live process failure injection. | Startup record confirmation. |
| User-surface/browser/desktop-shell confidence | `75%` | Nuxt unit/component tests only; Electron shell unchanged. | Real DOM/fetch/grouping untested. | Chrome browser probe. |
| Durable regression coverage quality/relevance | `95%` | Narrow durable additions, deterministic fixtures, cleanup, and full token-usage suite. | Proportional code review pending. | `code_reviewer` test review. |

- Overall post-repository confidence: `90%` (simple average, rounded from `89.86%`).
- Every critical acceptance criterion directly proven: `No` before broader validation; live startup/browser still required.
- Any applicable category below `90%`: `Yes` — user-surface/browser at `75%`.
- Default clean-confidence target met: `No` before broader validation.

## Broader Validation Decision

- Decision: `Required`
- Selected mode: `Live API`, `Lifecycle`, and `Browser`
- Gap addressed: real built-server startup ordering and Migration A/B records, actual persisted row facts, provider-config deletion stability, Nuxt/Apollo GraphQL fetch, Settings route, Task/Model grouping, and rendered labels.
- Rationale: repository tests do not prove the live process/configuration/frontend boundary; Chrome can prove the web-equivalent renderer without launching Electron.
- Expected confidence after validation: at least `95%`, with no category below `90%`.
- Browser-specific decision: Required; the changed UI is the primary user surface and no durable Token Statistics browser harness exists.

## Desktop Application Validation Decision

- Framework/shell: Electron wrapper around the Nuxt renderer.
- Web-equivalent behavior: Settings Token Statistics route, live GraphQL fetch, date range, Task/Model selector, provider-aware labels, and chart.
- Chosen approach: Browser-first Nuxt validation; no preload/IPC/native/package code changed.
- Shell-specific behavior: Electron packaging/window/preload lifecycle not tested; out of scope and not a material changed boundary.

## Live Environment And Fixture Plan

- Setup: isolated temp root with `.env`, SQLite via `prisma migrate deploy`, `llm/custom-llm-providers.json`, logs, memory, and download directories.
- Startup: built server on `127.0.0.1:38301`; Nuxt dev on `127.0.0.1:38302`; GraphQL direct HTTP and `/settings` readiness checks.
- Seed: custom AutoByteus legacy composite, built-in DeepSeek, and Codex rows with deterministic 2026-07-29 observations and non-secret values.
- Journeys: query migration status and Model/Task GraphQL; delete custom-provider file and repeat query; navigate browser to Settings, select Token Statistics, assert Task display, switch to Model, assert display/raw separation.
- Evidence: before/after GraphQL JSON, direct Prisma persisted rows, provider fixture, browser result, two screenshots, startup/process logs during run.
- Cleanup: owned sessions SIGINT; browser closed; temp scripts, provider file, SQLite, logs, and data root removed.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Setup | Behavior Proven | Why Temporary |
| --- | --- | --- | --- |
| `BROWSER-TOK-002` | Playwright-core 1.58.2 + installed Chrome against loopback Nuxt/backend | Live provider snapshot remains visible after provider deletion; Task/Model grouping renders correctly | Repository has no focused Token Statistics browser harness; retained evidence is sufficient and avoids unrelated harness architecture. |

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| External provider network/credentials | No provider call is required by this metadata/migration contract; credentials intentionally unavailable | Provider generation/discovery behavior not proven | Out of scope per handoff |
| Electron packaging/preload/window lifecycle | No shell-specific code changed | Shell behavior remains unproven | Out of scope; browser proves renderer boundary |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Legacy-path E2E fixture omitted `20260730090000_add_token_usage_provider_name` and initially failed with missing-column Prisma error | `Local Fix` (completed, API/E2E-owned) | Targeted legacy-path rerun `2/2` and final folder rerun `9/18` passed | No reroute; disclose to `code_reviewer` with durable test path |

## Investigation Decision

- Proceeded to API/E2E execution: `Yes`
- Durable coverage added/updated: `Yes`
- Post-repository confidence: `90%`; broader validation required.
- Reroute required before validation execution: `No` after bounded fixture fix.
- Notes: Final result and confidence are recorded in the authoritative execution report after broader validation.
