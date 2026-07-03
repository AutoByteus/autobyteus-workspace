# Handoff Summary — Token Usage Ledger Drop Legacy Path Columns

## Delivery Status

- Status: `Finalization in progress after user verification`
- Ticket: `token-usage-ledger-drop-legacy-path-columns`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns`
- Branch: `codex/token-usage-ledger-drop-legacy-path-columns`
- Finalization target from upstream context: `origin/personal`
- Current handoff branch HEAD before finalization commit: `44f001e9757092a5f641ba225fd7cb325e281fac`
- User verification/completion received: `Yes — user confirmed task is done on 2026-07-03 and requested finalization without a new release.`

## Integrated-State Refresh

- Recorded bootstrap base: `origin/personal` at `289173a6e4d0f17376c7e2df9c422fbd3f5a4f63`
- Latest tracked remote base checked during delivery: `origin/personal` at `75a42b9ccca76bcdb8e224a00c5950e9a108bc2e`
- Base advanced since bootstrap: `Yes` — latest base contained the finalized Google Gemini media model support work.
- Reviewed candidate checkpoint commit before integration: `8e62d6cdc30de4f394d139918c5dfc04315cf354` (`checkpoint(delivery): preserve reviewed token ledger legacy path drop`)
- Integration method: merge latest `origin/personal` into the ticket branch.
- Integration result: `Completed` with merge commit `44f001e9757092a5f641ba225fd7cb325e281fac`; no conflicts.
- Post-integration validation evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/validation-evidence/post-integration-validation-20260703T151125Z.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/validation-evidence/post-integration-shared-prep-tsc-20260703T151158Z.log`

## Implemented Scope

- Added required startup app-data migration `20260703_drop_token_usage_legacy_path_columns`.
- Registered it after `TokenUsageExecutionAddressBackfillMigration` so the order remains expand -> backfill -> contract.
- The migration requires execution-address backfill to have terminal-success status before dropping old columns.
- It inspects `PRAGMA table_info(token_usage_ledger_events)`, drops `team_run_path_json` and `member_path_json` only when present, and treats already-absent columns as successful skips.
- It verifies canonical hierarchy columns `root_team_run_id` and `execution_address_json` remain present.
- It preserves token ledger row count and records summary details for prerequisite status, dropped columns, skipped columns, row-count preservation, and final schema.
- It does not add a normal Prisma drop-column migration and does not revive old path fields in active Token Usage hierarchy code.
- Added/updated durable unit and isolated E2E coverage for missing-prerequisite behavior, backfill-before-drop order, schema absence, row/token/cost/index preservation, app-data status/log details, and GraphQL statistics after drop.

## Documentation Sync Summary

- Docs sync artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/docs-sync-report.md`
- Docs result: `Updated`
- Long-lived docs updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/modules/token_usage.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/ARCHITECTURE.md`
- Long-lived docs reviewed with no change:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md`

## Verification Summary

Upstream reviewed/validated state:

- Design review: `Pass`.
- Code review round 3 after durable coverage-code fix: `Pass`, score `9.2/10`; no unresolved findings.
- Reviewer-run validation passed:
  - `git diff --check`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts --reporter=dot` — passed, 2 files / 5 tests.
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed on reviewed pre-refresh state.
  - Static scans for no normal Prisma drop migration and no active Token Usage hierarchy references to legacy path fields — passed.
- API/E2E reported broader validation passed as recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/api-e2e-execution-coverage-report.md`.

Delivery post-integration checks against latest-base integrated state:

- `git diff --check` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts --reporter=dot` — passed, 2 files / 5 tests.
- Direct `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` initially failed after merging the latest base because the newly integrated `autobyteus-ts` video exports had not been rebuilt in the worktree.
- `pnpm -C autobyteus-server-ts prepare:shared` — passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` after shared package prep — passed.
- `git diff --check` after delivery docs/artifact updates — passed.

## Release Notes Status

- Release notes artifact prepared before user verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/release-notes.md`
- Release/version/tag requested: `No` — user explicitly requested no new version/release for this ticket.
- Release/publication/deployment performed: `No` — repository finalization only; no version bump, tag, or release requested.

## Residual Notes / Risks

- Browser-rendered app-data migration settings UI was not separately exercised because this ticket does not change UI/query shape; app-data migration status/log behavior is covered by API/E2E startup probes and durable E2E assertions.
- The guarded drop is intentionally an app-data startup contract migration, not a normal Prisma SQL migration, because SQLite has no `DROP COLUMN IF EXISTS` and local user DBs may already be drifted.
- Non-token-usage `member_path` concepts in team communication, run history, streaming, and workspace UI are legitimate separate domains and were not removed.


## Repository Finalization Summary

- User completion signal: `Received` — user said the task is done and requested finalization on 2026-07-03.
- Finalization target rechecked after user signal: `origin/personal` at `75a42b9ccca76bcdb8e224a00c5950e9a108bc2e`.
- Target advanced after user verification: `No`; the verified handoff branch already contained the latest tracked target base.
- Ticket archived path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns`.
- Release/version/tag: `Not requested`; no release work is included in this finalization.
- Planned finalization sequence: commit archived ticket + docs on `codex/token-usage-ledger-drop-legacy-path-columns`, push ticket branch, fast-forward/merge into `personal`, push `personal`, update the main repo `personal` branch, then build Electron from the main repo.

## Local Electron Build for User Testing

- README reviewed: root `README.md` and `autobyteus-web/README.md`; macOS Electron build command is `pnpm build:electron:mac`, with local no-notarization guidance applied.
- Command run from `autobyteus-web`: `CI=true NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= CSC_IDENTITY_AUTO_DISCOVERY=false pnpm build:electron:mac`.
- Result: `Passed` on 2026-07-03; produced macOS arm64 Enterprise artifacts for version `1.3.97`.
- Signing/notarization: unsigned local test build; electron-builder skipped macOS code signing because identity was explicitly null.
- Runnable app bundle: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`.
- DMG installer: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg`.
- ZIP archive: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip`.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/validation-evidence/local-electron-build-mac-20260703T151759Z.log`.
- Artifact manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/validation-evidence/local-electron-build-artifacts-20260703T152248Z.md`.
- SHA-256 manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-ledger-drop-legacy-path-columns/tickets/done/token-usage-ledger-drop-legacy-path-columns/validation-evidence/local-electron-build-artifacts-20260703T152248Z.sha256`.

## User Verification Checklist

Suggested verification before finalization:

1. Start the integrated branch with a database that has already completed the token usage execution-address backfill.
2. Let startup run required app-data migrations.
3. Confirm the app-data migration record for `Token usage legacy path columns drop` is `SUCCEEDED` and summarizes dropped or already-absent legacy columns.
4. Inspect or rely on startup logs/status to confirm `team_run_path_json` and `member_path_json` are absent from `token_usage_ledger_events`, while `root_team_run_id` and `execution_address_json` remain.
5. Open Settings > Token Statistics, Task grouping, and confirm historical nested rows and totals still render as expected.

User verification was received on 2026-07-03. The ticket has been moved to `tickets/done/token-usage-ledger-drop-legacy-path-columns/`; repository finalization proceeds without release/version/tag work, per user instruction.
