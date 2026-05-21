# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/investigation-notes.md`
- Persisted attribute audit: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/persisted-attribute-audit.md`
- Team history analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/team-history-refactor-analysis.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/design-review-report.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/review-report.md`

## What Changed

- Kept the standalone V2 direction from earlier rounds: `memory/run_history_index.json` is a plain JSON array of strict catalog rows, not a `{ version, rows }` wrapper and not a disposable cache repaired by normal list-time metadata scans.
- Completed the round-6 team scope:
  - `memory/team_run_history_index.json` is now a plain JSON array of strict V2 team catalog rows with `teamRunId`, `teamDefinitionId`, `teamDefinitionName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, and `terminatedAt`.
  - Team index rows no longer persist `version`, `lastActivityAt`, `lastKnownStatus`, or `deleteLifecycle`.
  - `team_run_metadata.json` no longer writes `updatedAt`; stable team manifest/lifecycle facts remain `teamDefinitionName`, `createdAt`, `archivedAt`, and `memberTree`.
- Added `TeamRunHistoryCatalogService` as the team catalog mutation boundary with initialization barrier, per-memory-dir in-memory state, serialized semantic mutation queue, safe team-run identity/path handling, and staged flush-before-commit behavior for index mutations.
- Added `TeamRunStatusProjectionService` so normal team list status is derived from active runtime snapshots only, not durable index/metadata status fields.
- Retargeted `TeamRunService` lifecycle writes to team catalog semantic methods:
  - create/restore write metadata + catalog through the catalog boundary;
  - ordinary activity records only first summary;
  - metadata refreshes are serialized through the catalog boundary and preserve stable manifest/lifecycle fields;
  - terminate records `terminatedAt` in the catalog row.
- Rewrote `TeamRunHistoryService.listTeamRunHistory()` to start from `TeamRunHistoryCatalogService.listCatalogRows()` and then read `team_run_metadata.json` only by selected indexed `teamRunId` for topology/member projection.
  - It does not call directory discovery, `listTeamRunIds()`, `rebuildIndexFromDisk()`, stale-row removal, or missing-row repair in the normal list path.
- Replaced `TeamRunHistoryIndexService` with a read-only diagnostic adapter over the strict V2 team index store; normal runtime/list paths use the catalog service instead.
- Added `TeamRunHistoryIndexV2AppDataMigration`, registered as `requiredOnStartup` after `TeamRunMetadataMemberTreeMigration`, to perform the one automatic full scan of `memory/agent_teams/*/team_run_metadata.json` and synthesize strict V2 team catalog rows.
  - Directory `teamRunId` is authoritative; metadata/directory identity mismatches fail the item.
  - Stale index rows with no metadata directory are skipped/omitted.
  - Metadata-backed runs missing from the legacy team index are migrated and reported.
  - Team `createdAt` follows the reviewed fallback chain and reports warning sources.
  - The migration writes through `TeamRunHistoryIndexStore` so repair output uses the same strict row validation as normal catalog loading.
- Tightened the standalone app-data migration write path to write through `AgentRunHistoryIndexStore` and only return `SUCCEEDED_WITH_WARNINGS` for partial failures when at least one row was actually migrated.
- Preserved previous standalone local-fix work:
  - cleanup script rejects legacy/minimal pseudo-V2 rows instead of stamping them;
  - normal standalone listing limits/groups catalog rows before live status projection;
  - standalone catalog mutations commit in-memory rows only after successful index flush.
- Updated GraphQL/frontend history shapes for the team V2 fields:
  - workspace team history query now asks for `createdAt`, `archivedAt`, `terminatedAt`, `status`, `isActive`, `members`, and `memberTree`.
  - frontend team tree rows derive UI `lastActivityAt`/`lastKnownStatus`/delete readiness locally from V2 catalog/live status instead of requiring those persisted fields from the backend.
  - team resume hydration consumes V2 `memberTree` metadata and no longer expects metadata `updatedAt`.

## Key Files Or Areas

- Added backend team history owners:
  - `autobyteus-server-ts/src/run-history/services/team-run-history-catalog-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-status-projection-service.ts`
  - `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-history-index-v2-migration.ts`
- Modified backend team history/lifecycle:
  - `autobyteus-server-ts/src/run-history/store/team-run-history-index-record-types.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-history-index-store.ts`
  - `autobyteus-server-ts/src/run-history/domain/team-run-history-index-types.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-run-history-index-service.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts`
  - `autobyteus-server-ts/src/run-history/store/team-run-metadata-schema.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
  - `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
  - `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.ts`
  - `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- Modified frontend team history/resume paths:
  - `autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `autobyteus-web/stores/runHistoryTypes.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/stores/runHistoryLoadActions.ts`
  - `autobyteus-web/stores/runHistorySelectionActions.ts`
  - `autobyteus-web/stores/runHistoryMetadata.ts`
  - `autobyteus-web/stores/runHistoryTeamHelpers.ts`
  - `autobyteus-web/stores/runHistoryTeamRows.ts`
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
- Added/updated focused tests:
  - `autobyteus-server-ts/tests/unit/app-data-migrations/team-run-history-index-v2-migration.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/services/team-run-history-catalog-service.test.ts`
  - team history store/service/index-service/team-run-service existing tests
  - `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts`
  - `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`

## Important Assumptions

- The normal history list/catalog paths must not scan all metadata directories for repair. Full metadata scans belong only to required startup app-data migrations and optional operator diagnostics.
- The app-data migration framework owns migration/version execution state through `app_data_migration_records`; standalone and team index files do not carry file-level schema version wrappers.
- Cross-process file locking and true metadata/index filesystem transactions remain outside this design. In-process normal failures are handled with staged writes and rollback where practical.
- Team member topology still comes from row-scoped metadata reads because team list DTOs contain `memberTree`/members; that is projection, not repair.

## Known Risks

- A process crash between separate metadata/index/directory filesystem effects can still leave a small residual mismatch; startup migration or operator repair remains the recovery path.
- Existing data with failed app-data migration items may need user/operator retry before missing legacy metadata-backed rows appear in history.
- Full web `vue-tsc --noEmit --pretty false` was attempted and is not usable as a gating check in this worktree: it fails broadly on existing project-level test/declaration issues such as unresolved `.vue` test imports and unrelated strictness errors. Targeted web vitest coverage for changed history paths passed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix with architecture refactor and cleanup.
- Reviewed root-cause classification: Boundary/ownership issue, duplicated policy/coordination, shared structure looseness, and legacy/compatibility pressure.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for standalone and team run-history catalog/index ownership and persisted field simplification.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Standalone and team steady-state writes now go through catalog service boundaries; normal listing starts from strict V2 catalog rows; live status is projection-only; full metadata repair scans are isolated to app-data migrations.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None in normal history-list/catalog source behavior. Legacy handling is confined to app-data migrations and the standalone fallback script.
- Legacy old-behavior retained in scope: No for standalone or team history index/metadata persistence.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes. Team direct index mutation/rebuild/empty-index repair paths were removed from normal services; team index service is read-only.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes. Standalone rows, team rows, standalone metadata, and team metadata remain separate strict shapes.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes. Largest changed/new source files by non-empty lines: `team-run-history-index-v2-migration.ts` 460, `agent-run-history-catalog-service.ts` 452, `team-run-history-catalog-service.ts` 424. These are below the hard guardrail and kept as cohesive owner/migration boundaries.
- Notes: Frontend keeps local UI-derived `lastActivityAt`/`lastKnownStatus`/delete readiness in tree row view models, but those are no longer backend persisted team history fields.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency`
- Branch at handoff: `codex/run-history-index-consistency` (`origin/personal` ahead 6)
- No dependency changes were made.

## Local Implementation Checks Run

Implementation-scoped checks only:

- Passed: server source typecheck
  - From `autobyteus-server-ts`: `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit --pretty false`
- Passed: broader relevant server unit suite, `27` files / `102` tests
  - From `autobyteus-server-ts`: `./node_modules/.bin/vitest run tests/unit/app-data-migrations/run-history-index-v2-migration.test.ts tests/unit/app-data-migrations/team-run-metadata-member-tree-migration.test.ts tests/unit/app-data-migrations/team-run-history-index-v2-migration.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts tests/unit/run-history/store/agent-run-metadata-store.test.ts tests/unit/run-history/agent-run-metadata-service.test.ts tests/unit/run-history/store/agent-run-history-index-store.test.ts tests/unit/run-history/store/team-run-history-index-store.test.ts tests/unit/run-history/store/team-run-metadata-store.test.ts tests/unit/run-history/services/agent-run-history-index-service.test.ts tests/unit/run-history/services/agent-run-history-catalog-service.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts tests/unit/run-history/services/team-run-history-index-service.test.ts tests/unit/run-history/services/team-run-history-catalog-service.test.ts tests/unit/run-history/services/team-run-history-service.test.ts tests/unit/run-history/services/workspace-run-history-service.test.ts tests/unit/agent-execution/agent-run-status-projection-service.test.ts tests/unit/agent-execution/agent-run-provisioning-service.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-restore-service.test.ts tests/unit/agent-execution/agent-run-termination-service.test.ts tests/unit/agent-execution/agent-run-command-coordinator.test.ts tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts tests/unit/scripts/migrate-agent-run-history-index-v2.test.ts --reporter=verbose`
- Passed: focused web GraphQL query check, `1` file / `2` tests
  - From `autobyteus-web`: `./node_modules/.bin/vitest run graphql/queries/__tests__/runHistoryQueries.spec.ts --reporter=verbose`
- Passed: focused web run-history store check, `1` file / `45` tests
  - From `autobyteus-web`: `./node_modules/.bin/vitest run stores/__tests__/runHistoryStore.spec.ts --reporter=verbose`
- Passed: focused web team run config utility check, `1` file / `8` tests
  - From `autobyteus-web`: `./node_modules/.bin/vitest run utils/__tests__/teamRunConfigUtils.spec.ts --reporter=verbose`
- Passed: whitespace check
  - From repo root: `git diff --check HEAD`
- Attempted but non-gating: full web `vue-tsc --noEmit --pretty false`; failed with broad existing project-level typecheck errors, so targeted changed-path vitest checks are the web confidence signal for this implementation handoff.
- Not run: API/E2E validation; owned by downstream API/E2E engineer after code review.

## Downstream Validation Hints / Suggested Scenarios

- Confirm normal standalone listing reads `run_history_index.json` catalog rows only and does not scan `memory/agents/*` for repair.
- Confirm normal team listing starts from `TeamRunHistoryCatalogService.listCatalogRows()` and reads metadata only by indexed `teamRunId` for topology/member projection.
- Confirm startup app-data migrations run in order: team member-tree metadata migration, team history index V2 migration, standalone history index V2 migration.
- Run `TeamRunHistoryIndexV2AppDataMigration` against copied legacy team data with:
  - metadata-backed team runs missing from the index;
  - stale index rows with no metadata directory;
  - metadata/directory identity mismatches;
  - legacy `lastActivityAt`/metadata timestamp fallback cases.
- Exercise team create, restore, activity, metadata refresh, terminate, archive/unarchive, and delete flows against real memory directories.
- Verify ordinary team activity after a first summary does not rewrite the team history index for durable activity/status updates.
- Verify frontend workspace history and open-team-member flows work with V2 team metadata `memberTree` and no metadata `updatedAt`.

## API / E2E / Executable Validation Still Required

- API/E2E validation of GraphQL workspace history listing and standalone/team lifecycle mutations.
- Browser/UI validation for workspace history display, active reconnect/open-run behavior, archive/delete actions, and historical team member opening.
- Optional larger repository test sweep after code review if the downstream validator wants broader confidence beyond implementation-scoped checks.
