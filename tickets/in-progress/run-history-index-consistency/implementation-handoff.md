# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/investigation-notes.md`
- Persisted attribute audit: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/persisted-attribute-audit.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-review-report.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/review-report.md`

## What Changed

- Re-established `memory/run_history_index.json` as the normal standalone history catalog instead of a repairable source-code cache.
- Updated the standalone index file shape to the round-4 target: a plain JSON array of strict V2 catalog rows, with no file-level `version` wrapper/attribute.
- Added `AgentRunHistoryCatalogService` as the authoritative standalone catalog mutation boundary with:
  - shared per-memory-dir in-memory catalog state;
  - initialization barrier;
  - catalog-level semantic mutation queue;
  - V2 index flush through atomic JSON writes;
  - prepared-run create rollback when index flush fails;
  - catalog-owned archive/unarchive/delete/cancel safe run-id/path handling.
- Replaced standalone index V1/status/activity persistence with V2 catalog rows containing only:
  - `runId`, `agentDefinitionId`, `agentName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, `terminatedAt`.
- Removed standalone persisted live/activity fields from new writes and normalizers:
  - `lastKnownStatus`, `lastActivityAt`, `activationState`, `ACTIVATING`, `ACTIVATION_FAILED`.
- Updated standalone metadata to resume/config plus prepared/start facts:
  - keeps runtime/config fields, `preparedAt`, `preparedExpiresAt`, `startedAt`;
  - no durable activation/status/archive fields.
- Updated agent lifecycle services so create/prepare/start/restore/terminate/activity call semantic catalog methods instead of low-level index writers.
- Updated standalone GraphQL/frontend history item shape to use `createdAt`, `archivedAt`, `terminatedAt`, and derived live status; team-run history fields remain unchanged/deferred.
- Added `RunHistoryIndexV2AppDataMigration` and registered it as required-on-startup so legacy/partial standalone indexes are repaired through `app_data_migration_records`; full metadata directory scans are isolated to this app-data migration and the optional fallback script, not normal history listing/catalog initialization. After a successful migration write, the process-local standalone catalog state is reset so a manual retry can reload the repaired index.
- Updated fallback migration/repair tooling and operator README for the plain-array V2 target.
- Updated cleanup script to require a valid strict V2 row array, use safe run ID/path validation, and atomically write the retained plain row array before deleting matched run directories.
- Addressed code-review local-fix findings:
  - cleanup now requires a valid V2 index and rejects legacy/minimal rows with migration-script guidance instead of stamping pseudo-V2 rows;
  - normal standalone history listing groups and limits catalog rows before status projection, and list-safe status projection uses only live runtime/command overlays without inactive metadata reads;
  - archive/unarchive, summary, termination, delete, and cancel-prepared catalog mutations stage row-map changes, flush the staged V2 index first, and commit in-memory state only after a successful flush.
- Addressed architecture review round-4 update by removing `AGENT_RUN_HISTORY_INDEX_RECORD_VERSION` and `{ version, rows }` from standalone agent history source/tests/scripts. Team-run index versioning remains untouched/deferred.
- Addressed round-6 code-review local-fix findings:
  - `RunHistoryIndexV2AppDataMigration` and the fallback migration script now canonicalize derived `workspaceRootPath` values before writing rows, fail/skip rows without a usable path, and avoid producing catalog-unloadable V2 rows.
  - `AgentRunHistoryIndexStore` now strictly validates both read and write rows using the same safe run-id and workspace-path normalization expected by the catalog.
  - `migrate-agent-run-history-index-v2.mjs` now treats the scanned `memory/agents/<runId>` directory name as the authoritative row identity and reports mismatched `metadata.runId` values in `runIdMismatches`.
- Updated focused server unit tests, script smokes, and relevant lifecycle tests for the V2 catalog model.

## Key Files Or Areas

- Added:
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-catalog-service.ts`
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts`
  - `autobyteus-server-ts/src/run-history/store/atomic-json-file-writer.ts`
  - `autobyteus-server-ts/src/app-data-migrations/migrations/run-history-index-v2-migration.ts`
  - `autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs`
  - `autobyteus-server-ts/scripts/run-history-index-migration.md`
  - `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-catalog-service.test.ts`
  - `autobyteus-server-ts/tests/unit/app-data-migrations/run-history-index-v2-migration.test.ts`
  - `autobyteus-server-ts/tests/unit/scripts/migrate-agent-run-history-index-v2.test.ts`
- Modified backend lifecycle/history areas:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts`
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts`
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts`
  - `autobyteus-server-ts/src/run-history/store/agent-run-history-index-*`
  - `autobyteus-server-ts/src/run-history/store/agent-run-metadata-*`
  - `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- Modified frontend standalone history read path:
  - `autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `autobyteus-web/stores/runHistoryTypes.ts`
  - `autobyteus-web/stores/runHistoryReadModel.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts`
- Team-run history fields were intentionally preserved except for removing now-invalid `AgentRunMetadata.lastKnownStatus` literals in team member projection helpers.

## Important Assumptions

- The app normally runs one server process per memory directory; cross-process locking remains out of scope per reviewed design.
- Legacy/orphan standalone metadata runs that are absent from `run_history_index.json` are intentionally not auto-discovered on normal list/catalog initialization; the required-on-startup app-data migration performs the automatic one-time scan/repair, and the script remains fallback/diagnostic.
- Prepared run cleanup may still scan metadata directories for prepared-TTL cleanup; this is not used as history index repair/listing.
- `PrepareAgentRunResult.activationState: "PREPARED"` remains a launch API response compatibility field, not a persisted standalone history/metadata field.
- Team-run persisted `lastActivityAt`/`lastKnownStatus` remains deferred and was not refactored.

## Known Risks

- The reviewed residual crash window across metadata/index/directory multi-file operations remains. In-process index flush failures now roll back process-local catalog state, but the change does not introduce a database/journal or cross-process locking.
- Users whose app-data migration fails or remains warning/retryable may not see legacy orphan metadata directories that are missing V2 index rows until the migration is retried or the fallback script is run.
- Cleanup against legacy/minimal indexes must now run after the app-data migration or explicit fallback repair; this order is documented in `autobyteus-server-ts/scripts/run-history-index-migration.md`.
- Web full typecheck was not available in this worktree because `vue-tsc` is not installed in the linked web dependency set.
- Non-gating observation: an unfiltered exploratory run of `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` still reports team-history fixture failures around legacy team context/topology mocks and one stale active-status literal expectation. The targeted standalone/mobile web checks listed below passed; team-run history refactor remains out of scope.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix with architecture refactor and cleanup.
- Reviewed root-cause classification: Boundary/ownership issue, duplicated policy/coordination, shared structure looseness.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for standalone run-history index ownership and persisted field simplification; team-run cleanup deferred.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The steady-state standalone path now depends on `AgentRunHistoryCatalogService` for catalog mutations and list reads; low-level index store/service no longer own lifecycle mutation policy. Normal listing is metadata-free for inactive catalog rows and applies per-agent limits before list-safe live overlay projection. Full metadata scan repair exists only in `RunHistoryIndexV2AppDataMigration` and the optional fallback script/README.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None in normal history-list/catalog source behavior; the required startup app-data migration and optional operator script are the only legacy repair paths.
- Legacy old-behavior retained in scope: No for standalone history/index/metadata persistence.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes. Index mutation helpers/rebuild/summary repair paths were removed from normal services.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes. Standalone index rows, standalone metadata, and team-run history shapes remain separate.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes. Largest changed source file is `agent-run-history-catalog-service.ts` at 452 non-empty lines; the new app-data migration is 350 non-empty lines and remains a cohesive one-time migration boundary.
- Notes: V1 index parsing and `{ version, rows }` wrapper parsing are not normal compatibility paths; invalid/legacy/wrapped standalone catalog files return an empty catalog with warning and are repaired through app-data migration or the fallback script. Cleanup also refuses legacy/minimal/wrapped indexes instead of preserving arbitrary old row shapes as V2.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency`
- Branch status during handoff: `codex/run-history-index-consistency...origin/personal [ahead 4, behind 6]`
- Round-6 local-fix checks used the existing local `autobyteus-server-ts/node_modules`; no dependency setup changes were needed.
- Web checks were not rerun for the round-6 server-side repair fixes; prior targeted web checks from the implementation pass remain listed below for context.

## Local Implementation Checks Run

Implementation-scoped checks only:

- Passed: round-6 focused server regression subset, `5` files / `22` tests
  - From `autobyteus-server-ts`: `./node_modules/.bin/vitest run tests/unit/app-data-migrations/run-history-index-v2-migration.test.ts tests/unit/run-history/store/agent-run-history-index-store.test.ts tests/unit/run-history/services/agent-run-history-catalog-service.test.ts tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts tests/unit/scripts/migrate-agent-run-history-index-v2.test.ts --reporter=verbose`
- Passed: server source typecheck
  - From `autobyteus-server-ts`: `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit --pretty false`
- Passed: broader server implementation unit suite, `17` files / `66` tests
  - From `autobyteus-server-ts`: `./node_modules/.bin/vitest run tests/unit/app-data-migrations/run-history-index-v2-migration.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts tests/unit/run-history/store/agent-run-metadata-store.test.ts tests/unit/run-history/agent-run-metadata-service.test.ts tests/unit/run-history/store/agent-run-history-index-store.test.ts tests/unit/run-history/services/agent-run-history-index-service.test.ts tests/unit/run-history/services/agent-run-history-catalog-service.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts tests/unit/agent-execution/agent-run-status-projection-service.test.ts tests/unit/agent-execution/agent-run-provisioning-service.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-restore-service.test.ts tests/unit/agent-execution/agent-run-termination-service.test.ts tests/unit/agent-execution/agent-run-command-coordinator.test.ts tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts tests/unit/scripts/migrate-agent-run-history-index-v2.test.ts`
- Passed: whitespace check
  - From repo root: `git diff --check HEAD`
- Passed in prior implementation pass: migration script smoke tests
  - dry-run/apply against legacy metadata + legacy wrapper index;
  - verified plain row-array V2 output, backup creation, old fields omitted;
  - verified deterministic fallback from legacy index `lastActivityAt` when no `createdAt`/`preparedAt` exists.
- Passed in prior implementation pass: targeted standalone web store checks, `9` passed / `36` skipped in file
  - `vitest run stores/__tests__/runHistoryStore.spec.ts -t "fetches run history tree|projects persisted history and temp drafts|overlays persisted run status|deleteRun|archiveRun"`
- Passed in prior implementation pass: targeted mobile/history web checks, `2` files / `10` tests
  - `vitest run composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts`
- Not run: full web typecheck (`vue-tsc` unavailable in the linked dependency set).
- Not run: API/E2E validation; owned by downstream API/E2E engineer after code review.

## Downstream Validation Hints / Suggested Scenarios

- Confirm normal `listWorkspaceRunHistory` reads V2 catalog rows and does not scan `memory/agents/*/run_metadata.json` for repair.
- Confirm startup `RunHistoryIndexV2AppDataMigration` is recorded in `app_data_migration_records`, can be retried when warning/failure states occur, and writes plain row-array `run_history_index.json` output.
- Confirm normal `listWorkspaceRunHistory` does not read inactive run metadata merely to derive list status and does no projection work beyond the per-agent limit.
- Confirm ordinary command/message activity after a summary exists does not rewrite `run_history_index.json`.
- Exercise create/prepare, activate, restore, terminate, archive/unarchive, delete, and cancel-prepared flows against real memory directories.
- Verify concurrent prepared/create/archive/delete-style catalog mutations do not lose rows in one server process.
- Verify forced index-write failures do not leave process-local archive/summary/termination/delete/cancel state committed.
- Run the app-data migration, and optionally the fallback migration script, against copied legacy memory data; confirm backup, deterministic `createdAt` report, and that rows without a canonical `workspaceRootPath` are reported/skipped instead of written.
- For fallback script repair, include metadata whose `runId` differs from the scanned directory name; confirm the output row uses the directory identity and the report includes `runIdMismatches`.
- Run cleanup only after app-data/fallback migration on copied legacy memory data; cleanup should reject legacy/minimal/wrapped indexes with migration guidance.
- Verify standalone GraphQL/frontend consumers no longer require `lastActivityAt` or `lastKnownStatus` on standalone rows while team rows still expose their existing fields.

## API / E2E / Executable Validation Still Required

- API/E2E validation of GraphQL history listing and lifecycle mutations.
- Browser/UI validation for standalone history list display, mobile work catalog, active reconnect/open-run behavior, archive/delete actions, and team-run field preservation.
- Optional larger repository test sweep after code review if the downstream validator wants broader confidence beyond implementation-scoped checks.
