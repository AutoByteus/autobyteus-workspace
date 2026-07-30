# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-spec.md`
- Supplemental task artifacts: `None`.
- Solution revision record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: `N/A`.

## Current Implementation Summary

- Implementation cycle: `Initial`.
- Implementation revision record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`.
- Related solution revision IDs: `SR-004`.
- Related architecture-review revision IDs: `ARCH-REV-003`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Triggering finding IDs: `N/A`.

Implemented the architecture-approved provider-aware display projection without changing canonical identity or accounting. The server now resolves AutoByteus provider/model labels using one query-scoped custom-provider map, preserves non-AutoByteus labels, and derives Model/Task display metadata from one ordered raw/display entry sequence. GraphQL and frontend hydration expose and render the new display fields while retaining raw fields. The fixed-ID app-data migration normalizes only eligible composite `model_value` rows using independent CAS updates and validates row-count/raw-identity invariants.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-TOKMODEL-001` | AutoByteus Model and Task views show `<provider name>:<model name>`. | `token-usage-model-display-projection.ts` -> `statistics-provider.ts` / `task-statistics-tree-builder.ts` -> GraphQL -> Pinia -> both tables. | Implemented; custom provider example resolves to `alibaba_cloud:qwen3.8-max-preview`. |
| `BEH-TOKMODEL-002` | Canonical raw identity remains grouping, attribution, pricing, row identity, and raw API data. | Existing `normalizeTokenUsageModelIdentifier`, grouping keys, and accounting aggregate unchanged; display fields are additive. | Implemented; focused statistics and GraphQL regression checks passed. |
| `BEH-TOKMODEL-003` | Built-in AutoByteus provider names use the existing display mapping; other runtimes retain current labels. | Pure resolver uses `getLlmProviderDisplayName` for built-ins and raw precedence for non-AutoByteus. | Implemented and unit-tested. |
| `BEH-TOKMODEL-004` | Task raw/display arrays stay aligned across every recursive constructor, including duplicates and empty paths. | `modelDisplayFields()` in `task-statistics-tree-builder.ts` consumes one `TokenUsageModelDisplayEntry[]` sequence for root, standalone, nested, and legacy-member rows. | Implemented; frontend task table tests passed. |
| `BEH-TOKMODEL-005` | Unknown, deleted, malformed, missing, and colon-containing metadata is deterministic and non-empty. | Anchored parser and fallback matrix in `token-usage-model-display-projection.ts`; store fallback only when display transport is absent/invalid. | Implemented and resolver-tested with synthetic composite fixtures. |
| `BEH-TOKMODEL-006` | Historical composite `model_value` is safely normalized without rewriting raw identity. | `TokenUsageCustomProviderModelValueBackfillMigration` plus `Prisma...Database` and registry placement. | Implemented; migration tests cover idempotence, warnings, partial failure, retry, CAS, and invariants. |
| `BEH-TOKMODEL-007` | Accounting aggregate consumers remain display-context-free. | `getTotalCost`, run-summary adapter, synthetic GraphQL summary aggregate, and aggregate GraphQL mapping remain untouched. | Implemented; existing GraphQL regression checks passed. |
| `BEH-TOKMODEL-008` | Ordered display projection has one entry per raw identifier and mixed-runtime task collisions use raw fallback. | `buildTokenUsageModelDisplayEntries()` is shared by Model and Task paths and never deduplicates by display label. | Implemented and unit-tested. |

## Key Files Or Areas

- Server display policy and ordered projection: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts`
- Server Model/Task domain and providers:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/domain/statistics-models.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts`
- App-data migration and registry:
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
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
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts`
  - `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`

## Important Assumptions

- The saved custom-provider `name` is current display metadata; no provider-name snapshot is introduced.
- `model_identifier` remains the raw accounting authority. Display labels are never used as grouping or deduplication keys.
- The current app-data runner owns status persistence, startup continuation, retry, and migration logging; the migration definition owns classification, CAS, and invariant validation.
- The local database does not provide composite samples, so tests use synthetic composite fixtures including `org/model:tag`.

## Known Risks

- Provider rename/deletion changes current friendly labels for historical rows; deleted or unavailable providers use deterministic provider-ID fallback while raw identity remains available.
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

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Migration Required` for historical composite `model_value`; `Directly Usable — No Migration` for canonical identity/accounting/provider names.
- Design-spec decision reference: `design-spec.md`, “Legacy Data Correction / App-Data Migration” and “Persisted Data / State Transition Decision”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence or discard/rebuild result, when applicable: Current reader path remains version-agnostic; display resolver safely handles pending, failed, warning, partial, and complete migration states.
- Migration implementation and focused checks, only when `Migration Required`: Fixed ID, required startup registration immediately after execution-address backfill, anchored parser, exact skip matrix, injected Prisma boundary, row-level CAS, independent durability, row-count/raw-identity checks, idempotence, warning/failure status mapping, and synthetic composite tests.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- No new package dependency was added.
- `pnpm install --offline --frozen-lockfile` was used to materialize the existing workspace dependencies.
- Server build regenerated Prisma client; no Prisma schema or schema migration was added.
- Live codegen verification used a temporary backend/data directory and the updated GraphQL schema; no permanent app data was intentionally used for validation.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts build` — passed, including shared package builds, Prisma generation, TypeScript production build, asset copy, and built-in-agent bootstrap smoke.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts` — passed, `3` files / `15` tests.
- Existing targeted GraphQL regressions (`token-usage-ledger-graphql.e2e.test.ts`, `token-usage-unit-prices-graphql.e2e.test.ts`) — passed, `2` files / `4` tests; these are recorded as regression evidence only, not downstream API/E2E sign-off.
- `pnpm -C autobyteus-web exec nuxt prepare` — passed.
- `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` — passed, `3` files / `6` tests.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web guard:localization-boundary` — passed.
- `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:18182/graphql pnpm -C autobyteus-web codegen` against a temporary updated server — passed; `autobyteus-web/generated/graphql.ts` contains both new fields.
- Direct built-schema introspection — passed; `TokenUsageTaskStatisticsRowGraphql.modelDisplayNames` and `UsageStatistics.modelDisplayName` are present.
- Direct built-registry inspection — passed; migration order is execution-address backfill -> `20260730_token_usage_custom_provider_model_value_backfill` -> legacy path-column drop.
- `pnpm -C autobyteus-server-ts typecheck` — fails on the repository baseline TS6059 configuration (`tests` outside `rootDir: src`); no changed-source error was observed before the baseline flood. Production build passed and is the authoritative implementation compile check.

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

API/E2E engineer must independently investigate current coverage, add or adjust durable API/E2E tests as needed, verify live GraphQL contract/codegen and realistic migration startup/recovery behavior, inspect the rendered browser surface, score coverage confidence, and return the result to `code_reviewer`. This handoff does not claim API/E2E sign-off.
