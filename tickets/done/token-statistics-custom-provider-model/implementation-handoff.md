# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-spec.md`
- Supplemental task artifacts: `None`.
- Solution revision record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- Prior source-review report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`
- Prior code-review revision record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-revision-record.md`
- Still-relevant downstream package requiring regeneration for SR-006: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/coverage-investigation.md`, `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/execution-coverage-report.md`, `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-revision-record.md`, `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-test-review-report.md`, `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/docs-sync-report.md`, `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/handoff-summary.md`, `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/release-deployment-report.md`, `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/delivery-revision-record.md`

## Current Implementation Summary

- Implementation cycle: `Bounded Local Fix after CRR-004 / F-002`.
- Implementation revision record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-revision-record.md`
- Current implementation revision ID: `IR-004`.
- Related solution revision IDs: `SR-006` (supersedes the prior implementation basis in `SR-004`).
- Related architecture-review revision IDs: `ARCH-REV-005`.
- Related code-review revision IDs: `CRR-004` (F-002 bounded local fix); repeated source review is requested after this handoff.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `DR-N/A`; downstream artifacts predate SR-006 and must be regenerated.
- Triggering finding IDs: `F-002` from `CRR-004`; `ARCH-F-006` is resolved in `SR-006` and `F-001` remains corrected and regression-tested.

Implemented the SR-006 provider-name snapshot contract in addition to the approved display projection. AutoByteus shared normalizers now carry `model.providerName` as nested `usage.provider_name`; direct Codex/Claude producers explicitly forward nullable top-level `provider_name`; common payload canonicalization applies top-level-first/nested-fallback precedence and conflict quality flagging; enrichment and SQL/Prisma preserve the selected value or null. The nullable schema migration and fixed-ID `20260730_token_usage_provider_name_snapshot_backfill` are wired after Migration A and before legacy path cleanup with CAS-only provider-name updates, AutoByteus-only recovery, invariant checks, and failure/retry semantics. The F-002 fix moves the Migration B row shape and preserved-field snapshot into `token-usage-provider-name-snapshot-backfill-row.ts`; both SQL projections now load all ledger columns, and the before/after proof compares every non-`provider_name` field (identity, attribution, token/cost/accounting, timestamps, pricing, context, and raw JSON). The display projection is snapshot-first and retains the exact malformed-composite fallback, while the raw identity, grouping, attribution, pricing, counts, row identity, accounting consumers, and non-AutoByteus behavior remain unchanged.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-TOKMODEL-001` | AutoByteus Model and Task views show `<provider name>:<model name>`. | `token-usage-model-display-projection.ts` -> `statistics-provider.ts` / `task-statistics-tree-builder.ts` -> GraphQL -> Pinia -> both tables. | Implemented; custom provider example resolves to `alibaba_cloud:qwen3.8-max-preview`. |
| `BEH-TOKMODEL-002` | Canonical raw identity remains grouping, attribution, pricing, row identity, and raw API data. | Existing `normalizeTokenUsageModelIdentifier`, grouping keys, and accounting aggregate unchanged; display fields are additive. | Implemented; focused statistics and GraphQL regression checks passed. |
| `BEH-TOKMODEL-003` | Built-in AutoByteus provider names use the existing display mapping; other runtimes retain current labels. | Pure resolver uses `getLlmProviderDisplayName` for built-ins and raw precedence for non-AutoByteus. | Implemented and unit-tested. |
| `BEH-TOKMODEL-004` | Task raw/display arrays stay aligned across every recursive constructor, including duplicates and empty paths. | `modelDisplayFields()` in `task-statistics-tree-builder.ts` consumes one `TokenUsageModelDisplayEntry[]` sequence for root, standalone, nested, and legacy-member rows. | Implemented; frontend task table tests passed. |
| `BEH-TOKMODEL-005` | Unknown, deleted, malformed, missing, and colon-containing metadata is deterministic and non-empty. | Anchored parser and fallback matrix in `token-usage-model-display-projection.ts`; store fallback only when display transport is absent/invalid. | Implemented; CRR-001 F-001 corrected and focused assertions cover malformed values with non-composite raw identity and built-in provider metadata. |
| `BEH-TOKMODEL-006` | Historical composite `model_value` is safely normalized without rewriting raw identity. | `TokenUsageCustomProviderModelValueBackfillMigration` plus `Prisma...Database` and registry placement. | Implemented; migration tests cover idempotence, warnings, partial failure, retry, CAS, and invariants. |
| `BEH-TOKMODEL-007` | Accounting aggregate consumers remain display-context-free. | `getTotalCost`, run-summary adapter, synthetic GraphQL summary aggregate, and aggregate GraphQL mapping remain untouched. | Implemented; existing GraphQL regression checks passed. |
| `BEH-TOKMODEL-008` | Ordered display projection has one entry per raw identifier and mixed-runtime task collisions use raw fallback. | `buildTokenUsageModelDisplayEntries()` is shared by Model and Task paths and never deduplicates by display label. | Implemented and unit-tested. |
| `BEH-TOKMODEL-009` | New AutoByteus ledger events persist a readable provider-name snapshot while raw identity and provider type remain canonical. | `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`; named shared normalizers; `agent-run-token-usage.ts`; Prisma schema/migration; SQL repository; `token-usage-provider-name-snapshot-backfill-migration.ts`. | Implemented; custom and built-in snapshots are persisted/read back, direct runtimes remain nullable, and Migration B is registry-wired after Migration A. |
| `BEH-TOKMODEL-010` | Supported producer matrix and common payload precedence preserve provider_name through enrichment, forwarding, and storage. | AutoByteus normalizers and Ollama helper; Codex thread/backend; Claude session/converter; `createTokenUsageUpdatedPayload`; enrichment transformer; SQL/Prisma repository. | Implemented; top-level-first/nested-fallback, `provider_name_top_level_nested_conflict`, null preservation, and producer-focused assertions are covered. |

## Key Files Or Areas

- Server display policy and ordered projection: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts`
- Server Model/Task domain and providers:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/domain/statistics-models.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts`
- App-data migration and registry:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-row.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
- Provider-name schema and persistence:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/prisma/schema.prisma`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/prisma/migrations/20260730090000_add_token_usage_provider_name/migration.sql`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts`
- Producer paths:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-ts/src/llm/api/autobyteus-token-usage-normalizer.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-ts/src/llm/api/ollama-llm.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
- GraphQL transport: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
- Frontend transport/store/UI:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/graphql/queries/token_usage_statistics_queries.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/generated/graphql.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/stores/tokenUsageStatistics.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/types/tokenUsageStatistics.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue`
- Focused implementation tests:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/tests/unit/agent-execution/domain/agent-run-token-usage-provider-name.test.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`

## Important Assumptions

- New AutoByteus events persist the configured/readable provider name in nullable `provider_name`; direct Codex/Claude events intentionally remain nullable and do not receive guessed `OpenAI`/`Anthropic` labels. Legacy null/empty rows still use current metadata or deterministic fallback.
- `model_identifier` remains the raw accounting authority. Display labels are never used as grouping or deduplication keys.
- The current app-data runner owns status persistence, startup continuation, retry, and migration logging; the migration definition owns classification, CAS, and invariant validation.
- The local database does not provide composite samples, so tests use synthetic composite fixtures including `org/model:tag`.

## Known Risks

- Provider rename/deletion does not change newly snapshotted AutoByteus labels; legacy null/empty rows still change with current metadata and deleted/unavailable providers use deterministic provider-ID fallback while raw identity remains available.
- Migration B cannot recover a deleted or malformed legacy custom provider name and reports `SKIPPED_PROVIDER_NAME_UNRECOVERABLE` without guessing; provider-map load failure is `FAILED`. The migration now explicitly selects and proves preservation of every non-`provider_name` ledger column; no production write path changes those fields.
- No live browser preview was available for this implementation round. Component mounting covered table/chart output and recursive task display, but `api_e2e_engineer` should independently inspect the real statistics surface.
- Repository-wide server typecheck reports baseline TS6059 errors because `tsconfig.json` uses `rootDir: src` while including `tests`; the production build is green.
- Broader API/E2E coverage and startup recovery testing remain downstream-owned.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Focused display behavior correction plus isolated value-only legacy backfill.
- Reviewed root-cause classification: Boundary or ownership issue at the statistics presentation boundary.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`; separate display projection is the scoped structural correction.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`; no design contradiction found.
- Evidence / notes: Accounting aggregate, provider identity construction, schema, raw fields, pricing, counts, row IDs, and non-AutoByteus behavior remain untouched. New policy is isolated to Model/Task display projections and migration boundary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`; the store fallback only protects absent/empty additive display transport and is not a dual business path.
- Legacy old-behavior retained in scope: `No`; raw fields remain intentionally available as identity/diagnostic fields, not visible model labels.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`; no superseded implementation path existed. Unused draft helper was removed before handoff.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`; changed server implementation files are below 500 effective non-empty lines.
- Notes: Raw and display fields have separate meanings; Task arrays are composed from one specialized display-entry sequence.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Migration Required` for the nullable provider_name schema/ingestion rollout and both historical corrections; canonical identity/accounting remain directly usable without rewrite.
- Design-spec decision reference: `design-spec.md`, “Legacy Data Correction / App-Data Migration” and “Persisted Data / State Transition Decision”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence or discard/rebuild result, when applicable: Current reader path remains version-agnostic; display resolver safely handles pending, failed, warning, partial, and complete migration states.
- Migration implementation and focused checks, only when `Migration Required`: schema migration before app-data startup, fixed-ID Migration A, fixed-ID Migration B after A and before legacy-path cleanup, anchored parser, AutoByteus-only provider snapshot classifier, provider-map dependency failure, exact skip matrix, injected Prisma boundaries, row-level CAS, independent durability, row-count and complete non-`provider_name` ledger-field checks, idempotence, warning/failure status mapping, and synthetic composite tests.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- No new package dependency was added.
- `pnpm install --offline --frozen-lockfile` was used to materialize the existing workspace dependencies.
- Server build regenerated Prisma client from the nullable `provider_name` schema field and applied the checked-in schema migration in test databases.
- Live codegen verification used a temporary backend/data directory and the updated GraphQL schema; no permanent app data was intentionally used for validation.

## Local Implementation Checks Run

- `pnpm -C autobyteus-ts build` — passed, including TypeScript production build and runtime dependency verification.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api/token-usage-normalizers.test.ts` — passed, `1` file / `9` tests, including all named shared AutoByteus normalizer paths and the Ollama helper.
- `pnpm -C autobyteus-server-ts build` — passed, including shared package builds, Prisma generation with `provider_name`, TypeScript production build, asset copy, and built-in-agent bootstrap smoke.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/domain/agent-run-token-usage-provider-name.test.ts tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts tests/unit/app-data-migrations/token-usage-legacy-path-columns-drop-migration.test.ts tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts` — passed, `10` files / `65` tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/statistics-provider.integration.test.ts` — passed, `1` file / `9` tests, including legacy map lookup and snapshot-first no-lookup behavior.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` — passed, `1` file / `4` tests, including nullable and non-null provider-name SQL/Prisma round trips.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts` — passed after CRR-004/F-002, `1` file / `5` tests; synthetic fixtures cover all preserved ledger fields and a post-read token mutation fails the invariant proof.
- Prisma projection audit — passed; both Migration B SELECT projections contain all `80` `TokenUsageLedgerEvent` columns, and the preserved snapshot contains all `79` non-`provider_name` columns.
- `pnpm -C autobyteus-server-ts build` — passed after CRR-004/F-002, including shared builds, Prisma generation, production TypeScript build, asset copy, and built-in-agent bootstrap smoke.
- `git diff --check` — passed after CRR-004/F-002.
- Prior focused GraphQL and frontend checks remain regression evidence from the pre-SR-006 display package; downstream API/E2E must regenerate them against the snapshot schema/ingestion behavior.
- Existing targeted GraphQL regressions (`token-usage-ledger-graphql.e2e.test.ts`, `token-usage-unit-prices-graphql.e2e.test.ts`) — passed, `2` files / `4` tests; these are recorded as regression evidence only, not downstream API/E2E sign-off.
- `pnpm -C autobyteus-web exec nuxt prepare` — passed.
- `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` — passed, `3` files / `6` tests.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web guard:localization-boundary` — passed.
- `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:18182/graphql pnpm -C autobyteus-web codegen` against a temporary updated server — passed; `autobyteus-web/generated/graphql.ts` contains both new fields.
- Direct built-schema introspection — passed; `TokenUsageTaskStatisticsRowGraphql.modelDisplayNames` and `UsageStatistics.modelDisplayName` are present.
- Direct built-registry inspection — passed; migration order is execution-address backfill -> `20260730_token_usage_custom_provider_model_value_backfill` -> `20260730_token_usage_provider_name_snapshot_backfill` -> legacy path-column drop.
- `pnpm -C autobyteus-server-ts typecheck` — remains a repository baseline TS6059 configuration failure (`tests` outside `rootDir: src`); no changed-source error was observed before the baseline flood. Production build passed and is the authoritative implementation compile check.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings Token Statistics Model table/chart and recursive Task table model column.
- Approved UI/UX, interaction, requirement, or design references: `requirements.md` and `design-spec.md`; no separate UI/UX supplement applies.
- Existing design system, shared components, and adjacent product surfaces reviewed: Existing `TokenUsageModelStatisticsTable.vue`, `TokenUsageTaskStatisticsTable.vue`, `BarChart.vue`, formatter, and Pinia statistics store.
- Project development / preview instructions and rendered surface used: Nuxt preparation plus Vue component mounting in the focused Vitest suite; no live browser preview tool was available.
- States, layouts, viewports, and interactions inspected: Model table row and chart label, Task root/member rows, mixed runtime labels, recursive expansion/table rendering, and store absent-display fallback through component/store tests.
- Visual or interaction issues found and corrected: Updated visible Model/Task labels and chart labels to use display fields; corrected existing fixture expectations for provider-aware labels. No layout or interaction regression was observed in component tests.
- Supporting evidence and remaining unverified states or limitations: Focused frontend suite passed (`6` tests). Live browser viewport/accessibility inspection remains for `api_e2e_engineer`.

## Downstream Coverage Hints / Suggested Scenarios

- Query Model statistics with two custom providers exposing the same model; assert separate raw row IDs and provider-aware display names.
- Query recursive Task statistics with duplicate display names and a raw identifier observed under AutoByteus plus another runtime; assert equal positional arrays and raw fallback for the collision.
- Exercise deleted-provider, provider-map failure, missing model value, malformed marker, conflicting composites, and colon-containing suffixes.
- Run the fixed-ID migration with synthetic composite rows, update failure in the middle of the scan, retry through runner `runPending()`/`runMigration(id)`, and verify startup continuation/status snapshots.
- Validate generated GraphQL fields through the actual API and inspect both rendered Model and Task surfaces.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E engineer must independently investigate current coverage, add or adjust durable API/E2E tests as needed, verify live GraphQL contract/codegen and realistic migration startup/recovery behavior, inspect the rendered browser surface, score coverage confidence, and return the result to `code_reviewer`. This handoff does not claim API/E2E sign-off; source review must be repeated for the SR-006 snapshot schema/ingestion delta before API/E2E starts. The existing downstream coverage, execution, docs, handoff, release, and delivery artifacts predate SR-006 and are evidence to regenerate, not current validation.
