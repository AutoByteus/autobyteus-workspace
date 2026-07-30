# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer`, `design-review-report.md`, implementation round 1 | `N/A` | `Initial Baseline` | `SR-004`, `ARCH-REV-003`, `CRR-N/A`, `API-REV-N/A`, `DR-N/A` | Implementation complete; handed to `code_reviewer` |
| IR-002 | `code_reviewer`, `code-review-report.md`, source-review rework round 1 | `F-001` | `Local Fix` | `SR-004`, `ARCH-REV-003`, `CRR-001`, `API-REV-N/A`, `DR-N/A` | Fix implemented and re-submitted to `code_reviewer` |
| IR-003 | `architecture_reviewer`, `design-review-report.md`, architecture-authorized implementation rework round 2 | `ARCH-F-006` (resolved in `SR-006`); retains `F-001` regression coverage | `Architecture-authorized rework` | `SR-006`, `ARCH-REV-005`, `CRR-N/A`, `API-REV-N/A`, `DR-N/A` | Snapshot schema/ingestion/migration implementation complete; awaiting repeated source review |
| IR-004 | `code_reviewer`, `code-review-report.md`, bounded source-review rework round 2 | `F-002` | `Local Fix` | `SR-006`, `ARCH-REV-005`, `CRR-004`, `API-REV-N/A`, `DR-N/A` | Complete non-provider_name Migration B invariant proof; re-submitted to `code_reviewer` |

## Revision Entries

### IR-001 — Provider-aware token-statistics display and legacy-value backfill

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-review-report.md`; initial implementation round.
- Triggering finding IDs: `N/A`; architecture review `ARCH-REV-003` authorized implementation.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: Approved display projection, GraphQL/frontend propagation, and fixed-ID value-only migration implemented; awaiting source review.
- Related solution revision IDs: `SR-004`.
- Related architecture-review revision IDs: `ARCH-REV-003`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline or implementation revision is recorded: Initial implementation handoff for the architecture-approved solution package.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-001` through `BEH-TOKMODEL-008`; `REQ-TOKMODEL-001` through `REQ-TOKMODEL-007`; `AC-TOKMODEL-001` through `AC-TOKMODEL-008`.
- Implementation delta:
  - Added the pure provider-aware resolver and ordered `TokenUsageModelDisplayEntry[]` projection.
  - Added `modelDisplayName` and `modelDisplayNames` through server DTOs, GraphQL, Pinia normalization, and both statistics tables/chart labels.
  - Loaded the custom-provider name map once per Model/Task statistics query while leaving the accounting aggregate and total-cost/run-summary paths unchanged.
  - Added `20260730_token_usage_custom_provider_model_value_backfill` with anchored parsing, classification, CAS updates, independent progress, invariant checks, warnings/failures, and registry placement.
  - Added focused resolver, statistics-provider, migration, and frontend fixture coverage.
- Changed files or areas: `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts`; token-usage statistics domain/provider/tree builder; GraphQL token-usage statistics type; app-data migration and registry; `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts`; generated GraphQL artifact; Pinia/types/table components; focused tests.
- Local validation and result: Server build passed; focused server tests passed (`3` files, `15` tests); targeted existing GraphQL regression tests passed (`2` files, `4` tests); frontend Nuxt preparation passed; focused frontend store/component tests passed (`3` files, `6` tests); web boundary and localization guards passed; live-backend GraphQL codegen passed once against the updated schema; generated schema introspection and migration registry placement checks passed.
- Next recipient or routing: `code_reviewer` for implementation-source review, then `api_e2e_engineer` after source review passes.
- Remaining limitations or risks: No live browser preview was available in the implementation environment; API/E2E engineer must independently validate the new GraphQL display fields, synthetic composite fixtures, migration lifecycle against realistic startup wiring, and browser rendering. Repository-wide `pnpm -C autobyteus-server-ts typecheck` remains blocked by the existing `rootDir=src` plus `include=tests` TS6059 baseline; the production build passed.

### IR-002 — Correct malformed composite display fallback after CRR-001

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`; bounded source-review rework round 1.
- Triggering finding IDs: `F-001` from `CRR-001`; the source review was not authorized to advance to API/E2E.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-001` implementation was complete but source review failed because malformed composite `model_value` could leak a non-composite raw model or built-in provider metadata.
- Current authoritative result: The malformed composite branch now uses only a valid raw composite provider/suffix; otherwise it forces exactly `Unknown Provider:Unknown Model`. Focused assertions cover both non-composite raw identity and built-in provider metadata.
- Related solution revision IDs: `SR-004`.
- Related architecture-review revision IDs: `ARCH-REV-003`.
- Related code-review revision IDs: `CRR-001`.
- Related API/E2E revision IDs: `N/A`; API/E2E remains pending repeated source review.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: It documents the implementation-owned correction required by the failed source review before downstream coverage can begin.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-005`, `REQ-TOKMODEL-004`, `AC-TOKMODEL-005`, and `AC-TOKMODEL-007`.
- Implementation delta:
  - Changed `resolveAutobyteusDisplayName()` so a malformed `openai-compatible:` `model_value` cannot fall through to a non-composite `model_identifier` or `model_provider` label.
  - Preserved the approved valid-raw-composite fallback and all normal composite, built-in, missing, non-AutoByteus, and collision paths.
  - Added focused assertions for malformed composite values with `legacy-model` raw identity and with `DEEPSEEK` provider metadata.
- Changed files or areas: `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts`; `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts`; implementation handoff artifacts.
- Local validation and result: Focused server suite passed (`3` files, `15` tests); production server build passed; `git diff --check` passed.
- Next recipient or routing: `code_reviewer` for repeated implementation-source review; API/E2E remains unauthorized until that review passes.
- Remaining limitations or risks: No live browser preview was available; the repository-wide server typecheck retains the known TS6059 baseline; API/E2E and delivery stages remain downstream-owned.

### IR-003 — Add AutoByteus provider-name snapshots and Migration B

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-review-report.md`; architecture-authorized implementation rework round 2 after `ARCH-REV-005`.
- Triggering finding IDs: `ARCH-F-006` was resolved in `SR-006`; the implementation also preserves the prior `F-001` malformed-display correction.
- Classification: `Architecture-authorized rework`.
- Prior authoritative result: `IR-002` implemented the pre-SR-006 display and value-backfill package and had not received repeated source-review authorization for the new provider-name snapshot schema/ingestion contract.
- Current authoritative result: SR-006 implementation is complete and ready for repeated implementation-source review. AutoByteus shared normalizers persist configured/readable `provider_name`; direct Codex/Claude producers forward null; common payload precedence and conflict flagging are implemented; enrichment and SQL/Prisma round trips preserve the selected value/null; the nullable schema migration and fixed-ID Migration B are wired and tested; snapshot-first display and exact malformed fallback remain intact.
- Related solution revision IDs: `SR-006` (prior basis: `SR-004`).
- Related architecture-review revision IDs: `ARCH-REV-005` (prior gate: `ARCH-REV-003`).
- Related code-review revision IDs: `N/A` for this architecture rework; prior `CRR-001`/`F-001` correction remains covered by focused tests.
- Related API/E2E revision IDs: `N/A`; downstream artifacts predate SR-006 and require regeneration after source review.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: The architecture gate changed the persisted/ingestion contract and explicitly required downstream artifacts to be regenerated; this entry preserves the implementation delta and validation boundary.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-001` through `BEH-TOKMODEL-010`; `REQ-TOKMODEL-001` through `REQ-TOKMODEL-010`; `AC-TOKMODEL-001` through `AC-TOKMODEL-011`; `DS-TOKMODEL-001` through `DS-TOKMODEL-004`.
- Implementation delta:
  - Added optional nested `provider_name` to the shared `LlmTokenUsageObservation` schema/identity and propagated `model.providerName` through AutoByteus, OpenAI-compatible, Anthropic accumulator/wrapper, Gemini, and Ollama response normalizers.
  - Added top-level nullable provider_name to direct Codex/Claude producer paths and preserved it through backend forwarding/converter serialization without inventing runtime labels.
  - Added top-level-first/nested-fallback provider-name canonicalization and `provider_name_top_level_nested_conflict` quality flag; context enrichment remains pass-through.
  - Added nullable Prisma `providerName`, schema migration `20260730090000_add_token_usage_provider_name`, SQL create/read mapping, and round-trip coverage.
  - Added `TokenUsageProviderNameSnapshotBackfillMigration` with fixed ID `20260730_token_usage_provider_name_snapshot_backfill`, AutoByteus-only recovery, built-in/current custom map resolution, warning/failure/retry semantics, CAS updates, and row-count/provider/model/raw-value/accounting invariants; registered after Migration A and before legacy path cleanup.
  - Updated display-context loading to avoid current provider-map reads when all AutoByteus events already have snapshots; snapshot-first resolver behavior and malformed-composite exact fallback are tested.
- Changed files or areas: shared `autobyteus-ts` observation/normalizers; server token-usage domain, direct producers, Prisma schema/migration, SQL repository, display projection/statistics provider, Migration A row shape, Migration B/registry; focused unit/integration tests; implementation handoff.
- Local validation and result: `autobyteus-ts` build and normalizer tests passed (`1` file/`9` tests); server production build passed; focused server suite passed (`10` files/`65` tests); statistics-provider integration passed (`1` file/`9` tests); SQL repository integration passed (`1` file/`4` tests); Prisma test databases applied the new schema migration; final staged and unstaged `git diff --check` passed.
- Next recipient or routing: `code_reviewer` for repeated implementation-source review. API/E2E remains unauthorized until source review passes.
- Remaining limitations or risks: Downstream coverage/execution/docs/delivery artifacts were produced for the pre-SR-006 package and must be regenerated. No live browser/API-E2E sign-off is claimed. Repository-wide server typecheck retains the known TS6059 baseline; production build is the authoritative compile check.

### IR-004 — Prove all preserved ledger fields in Migration B

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`; bounded source-review rework round 2 after `CRR-004`.
- Triggering finding IDs: `F-002`; API/E2E remained unauthorized because the Migration B invariant proof compared only a reduced tuple.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-003` implementation was complete, but `CRR-004` failed source review because Migration B selected and compared only `id`, `model_provider`, `model_identifier`, and `model_value` rather than proving the approved preserved ledger fields.
- Current authoritative result: The bounded fix is complete and ready for repeated source review. Migration B now projects every `TokenUsageLedgerEvent` column in both the all-row and candidate adapters, snapshots all `79` non-`provider_name` fields, compares sorted before/after snapshots plus row count, and leaves the provider-name-only production update unchanged. The unit fixture supplies representative identity, attribution, token/accounting, pricing/cost, timestamp/context, and raw-JSON fields; a post-read accounting mutation is detected as an invariant failure.
- Related solution revision IDs: `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-005`.
- Related code-review revision IDs: `CRR-004`.
- Related API/E2E revision IDs: `N/A`; API/E2E remains unauthorized pending repeated source review.
- Related delivery revision IDs: `N/A`.
- Why this implementation revision is recorded: It documents the implementation-owned correction required by F-002 and the resulting complete invariant-proof boundary.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-009`, `BEH-TOKMODEL-010`, `REQ-TOKMODEL-009`, `REQ-TOKMODEL-010`, `AC-TOKMODEL-010`.
- Implementation delta:
  - Extracted the Migration B row shape, database boundary, and preserved-row snapshot into `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-row.ts` to keep the migration implementation below the source-size guardrail.
  - Expanded both Prisma SQL projections from the reduced identity tuple to all `80` ledger columns, including attribution, token/accounting, cost/pricing, timestamps/context, and raw JSON fields.
  - Replaced the reduced final invariant comparison with row count plus sorted snapshots of every non-`provider_name` field; only the intentionally changed provider-name column is excluded.
  - Expanded the Migration B fixture and preserved-facts assertions to cover the complete approved field set, and added a token-field mutation failure assertion.
- Changed files or areas: `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts`; `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-row.ts`; `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts`; implementation handoff artifacts.
- Local validation and result: Migration B unit test passed (`1` file / `5` tests); both SQL projections were audited as `80/80` schema columns with `79/79` preserved fields; server production build passed including Prisma generation and bootstrap smoke; `git diff --check` passed.
- Next recipient or routing: `code_reviewer` for repeated implementation-source review (`CRR-005` or next canonical round); API/E2E remains unauthorized until source review passes.
- Remaining limitations or risks: No API/E2E or live browser sign-off is claimed. Repository-wide server typecheck retains the known TS6059 baseline; production build is the authoritative compile check.
