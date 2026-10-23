# Investigation Notes: seal-migrations-per-folder

## Investigation Meta

- Package: `seal-migrations-per-folder` (Project Task autobyteus-280); autobyteus-204 is on hold and depends on it
- Request: seal every app-data migration in its own folder; production code never depends on migration code (the user, 2026-10-23)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder`, branch `codex/seal-migrations-per-folder`, base `origin/personal` @ `27f2d2f72d` (fetched 2026-10-23); finalization target `origin/personal`
- Current solution revision: SR-001 (draft)
- Authorities read:
  - `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (this conversation);
  - the 2026-10-23 skill changes: SKILL.md (add fixed design mistakes as cases), the design-spec template (cite evidence; call-order spines; derived consumers), `design-principles.md` (several kinds and forms, cited claims, one owner per sequence, derived consumers, behavior by absence);
  - `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `TESTING.md`.
- Inputs carried over from autobyteus-204 (`/Users/normy/autobyteus_org/autobyteus-worktrees/retire-old-migrations/tickets/in-progress/retire-old-migrations/investigation-notes.md`): F-01 (31 migrations), A-05 (5 production files depend on migrations), O-1 (gates G-1 and G-2 do real work), the 205 `server_helper` finding.

## Source Log (2026-10-23; probes `/tmp/sd280/closure.py` and `/tmp/sd280/direct.py` are disposable and not promoted)

| ID | How established | Finding |
| --- | --- | --- |
| S-01 | Measured: transitive import closure per migration | Copying each migration's whole current-code dependency tree is infeasible. For example, `20260521_run_history_index_v2` and `20260521_team_run_history_index_v2` transitively reach 980 files (110,671 lines), almost the whole server, through one service import. Summed per migration: about 397,000 duplicated lines |
| S-02 | Measured: direct value imports (not type-only) | The migrations use **58 distinct current modules** for runtime values (union about 6,900 lines). Most are small (addresses, path helpers, enum, memory layout, atomic writer). Heavier ones: `agent-team-execution/services/team-execution-index.ts` (327 lines), `agent-org-execution/services/agent-org-execution-index.ts` (285), the token-usage projections and codec (about 700), `persistence/file/store-utils.ts` (264), the run-history stores. Type-only imports are cheap to copy |
| S-03 | Measured: strict per-folder (nothing shared between migrations) | Shallow copies of the used current modules into each migration folder: about 34,200 lines. Splitting the shared `legacy/` (5,100 unique lines) into each folder that uses it: about 80,000 lines (the October migrations each use about 62–77 legacy files). **Total about 114,000 duplicated lines**, against 190,000 lines in the whole server `src/` |
| S-04 | Measured: sealed migration area with one shared frozen layer | One migration-only frozen layer (the 58 used current modules frozen once, about 6,900 lines, plus the existing `legacy/` 5,100) is about 12,000 lines, with no copies per migration |
| S-05 | Read: `config/prisma-client-factory.ts` used by 11 migrations | Database access goes through the current Prisma client. The guideline's deployment order (Prisma schema first, then app-data migrations) makes the current schema the database contract. Proposed: treat database access as part of the runner contract |

## Implication

The user's "inside each migration folder", taken literally (nothing shared), costs about 114,000 duplicated lines. A sealed migration area with one shared frozen layer costs about 12,000 and keeps production code equally clean. The difference is retirement: with a shared layer, deleting a migration is its folder plus any frozen files no other migration still uses (a test can list them). This needs the user's decision (cost, and his explicit wording).

## Further findings (2026-10-23)

| ID | How established | Finding |
| --- | --- | --- |
| S-06 | The user, in conversation | **Decision: migrations may share frozen helpers with each other inside the migration area; production code shares nothing with them.** "if migrations need the same helper … they share because it belongs to the migration code themselves … not the applications" |
| S-07 | Measured: `/tmp/sd280/deep.py` | 74 distinct production modules are imported by migration code (values and types). 46 have a dependency tree of 10 files or fewer. Deep ones: `run-history/services/team-run-history-catalog-service.ts` and `agent-run-history-catalog-service.ts` (980 files each), `agent-definition/providers/file-agent-definition-provider.ts` and `agent-team-definition/providers/file-agent-team-definition-provider.ts` (130), the state-package validators and tree stores (43–48), `run-history/store/agent-run-metadata-store.ts` (29), `task-agent-message-logs.ts` (21), `projects/stores/project-store.ts` (19). These must be replaced inside the migration area by frozen code limited to what the migration uses |
| S-08 | Read: grep for package imports in `app-data-migrations` | Migrations also import the core library `autobyteus-ts` in about 20 places (memory file names, raw-trace archive manifest, run-memory and snapshot stores, LLM providers, endpoint discovery, `buildCustomProviderId`). `autobyteus-ts/src/memory/migration/` (4 files, 822 lines; snapshot v5 converter) is used only by `migrate-native-working-context-snapshots-v5-migration.ts` (grep: no other user in `autobyteus-ts/src` or the server) |
| S-09 | Read: `api/graphql/types/app-data-migrations.ts:110-135` | A manual Settings retry of `TEAM_RUN_EXECUTION_TREE_V2` rebuilds `RootRunPackageReadinessIndex` afterwards (special-cased by id) |
| S-10 | Read: `context-files/services/context-file-record-locators.ts:7,43`; `legacy/released-run-package-shapes/released-message-log-files-from-append-only.ts:20` | Current code recognizes current append-only message-log files with a pattern that lives in `legacy/`. It belongs to the current message-log owner |
| S-11 | Read: `server-runtime.ts:230-241`; the migration's description `custom-provider-readable-id-app-data-migration.ts:130-131`; `llm-management/llm-providers/stores/custom-llm-provider-store.ts:39-45,60-66` | **G-1.** `20260803_custom_provider_readable_identity` maps UUID model selectors to readable ids, resets legacy providers and removes old keys. Unconverted, `custom-llm-providers.json` fails the current parser, so `listProviders` throws `CUSTOM_PROVIDER_CONFIG_INVALID` on every call, and selectors with old UUIDs do not resolve. Today the whole server refuses to start instead |
| S-12 | Read: `token-usage/providers/token-usage-migration-readiness.ts:44-85`; the migration's description (`token-usage-run-records-v1-app-data-migration.ts:25-26`) | **G-2.** `20260819_token_usage_run_records_v1` consolidates the released token-event ledger into one record per run. Until it has succeeded, `assertHistoricalReadReady` and `assertExistingRunRestoreReady` refuse history reads and existing-run restore, because a restored run would write a fresh record that the consolidation would then conflict with. `assertCurrentSchemaReady` refuses only on a schema failure. **This protects a real data-integrity rule; it cannot be removed while the migration may still be pending** |
