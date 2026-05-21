# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/investigation-notes.md`
- Persisted Attribute Audit: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/persisted-attribute-audit.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/review-report.md`
- Current Validation Round: 4
- Trigger: Code review round 7 pass after CR-LF-004/CR-LF-005 implementation repair; API/E2E validation resumed.
- Prior Round Reviewed: Prior validation rounds and code review round 7.
- Latest Authoritative Round: 4

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass | N/A | 0 blocking failures | Pass | No | Durable validation was updated; returned to `code_reviewer` before delivery. |
| 2 | User-requested relevant backend E2E sweep | N/A | Stale team-member E2E fixture shape found and fixed | Pass | No | Relevant existing backend E2E sweep passed after fixture update; returned to `code_reviewer`. |
| 3 | CR-DV-001 validation-code local fix | CR-DV-001 | 0 | Pass | No | Removed obsolete standalone `lastKnownStatus` fixture fields; returned to `code_reviewer`. |
| 4 | Code review round 7 implementation pass | CR-LF-004/CR-LF-005 implementation repairs plus prior validation-code findings | Stale integration validation fixture failures found and fixed | Pass | Yes | Round-7 implementation behavior passed focused API/E2E/executable validation. Repository-resident durable validation was updated again, so return to `code_reviewer`. |

## Validation Basis

Validated against FR-001 through FR-014 and AC-001 through AC-010, with emphasis on the review-requested API/E2E surfaces:

- normal `listWorkspaceRunHistory` uses V2 catalog shape, not legacy standalone `lastActivityAt` / `lastKnownStatus`;
- ordinary activity/status does not rewrite `run_history_index.json` solely for status/activity;
- prepare/create/start/restore/terminate/archive/delete/cancel-prepared lifecycle behavior remains covered by executable tests;
- migration/repair and cleanup scripts work on copied legacy-style memory data;
- frontend GraphQL query/store/mobile/desktop history surfaces consume the new standalone shape while team-run fields remain retained.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Notes:

- Legacy scanning remains script-only in `migrate-agent-run-history-index-v2.mjs`, consistent with the approved design.
- Cleanup rejects legacy/minimal indexes and tells operators to run migration first; validation reproduced that rejection.
- Team-run `lastActivityAt` / `lastKnownStatus` retention is intentional deferred scope, not standalone compatibility.

## Validation Surfaces / Modes

- Server TypeScript source typecheck.
- Server unit/lifecycle tests for catalog, metadata/index stores, status projection, create/prepare/restore/terminate/cancel/activity, cleanup script, and workspace history service.
- Server GraphQL e2e tests for `listWorkspaceRunHistory` schema and archive mutation behavior.
- Temporary executable migration/cleanup script harness on isolated legacy-style memory data.
- Web GraphQL query test, run-history Pinia store tests, mobile context/work catalog tests, desktop history panel targeted component tests.
- Browser smoke check against local Nuxt dev server at `http://127.0.0.1:3067/`.

## Platform / Runtime Targets

- Host: macOS local development environment.
- Shell: bash.
- Node/Vitest as provided by linked local dependency installs from the superrepo.
- Server tests: Vitest v4.0.18, Prisma test SQLite reset performed by global setup.
- Web tests: Vitest v3.2.4, Nuxt test environment / happy-dom.
- Browser smoke: Nuxt 3.21.1 dev server on `127.0.0.1:3067` with in-app browser DOM snapshot.

## Lifecycle / Upgrade / Restart / Migration Checks

- Prepare/create/start/restore/termination/cancel-prepared lifecycle coverage executed in server targeted suite.
- Archive API coverage executed through GraphQL e2e and verified V2 catalog row mutation instead of standalone metadata archive mutation.
- Migration dry-run/apply executed on temporary legacy memory data with:
  - legacy status/activity metadata fields present;
  - V1 index row with `lastActivityAt` fallback;
  - stale existing row retained without `--prune-stale`;
  - backup creation on apply;
  - V2 output rows omitting legacy live/activity fields.
- Cleanup dry-run/apply executed after migration and removed only matching Codex E2E workspace rows/directories.
- Cleanup legacy/minimal-index rejection reproduced with migration guidance.
- Restart was not simulated as a separate process lifecycle; catalog reload behavior is covered by store/service initialization tests and GraphQL e2e using real V2 files.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| AEV-001 | FR-001, FR-003, FR-004, FR-013, FR-014, AC-001, AC-010 | GraphQL schema/e2e | Pass | `workspace-run-history-graphql.e2e.test.ts` now requests standalone `createdAt`/`archivedAt`/`terminatedAt`/derived status and rejects removed standalone fields while retaining team fields. |
| AEV-002 | FR-007, FR-009, FR-012, AC-006, AC-010 | GraphQL archive e2e | Pass | `archive-run-history-graphql.e2e.test.ts` seeds V2 standalone index, archives through GraphQL, verifies V2 `archivedAt` row and no standalone legacy fields, rejects active/unsafe IDs. |
| AEV-003 | FR-007, FR-008, FR-009, FR-010, AC-002, AC-003, AC-004, AC-005 | Server unit/lifecycle tests | Pass | 17-file targeted server suite passed, 62 tests. |
| AEV-004 | FR-001, FR-010, AC-001, AC-002 | Catalog list/status projection | Pass | `agent-run-history-service` and `agent-run-history-catalog-service` tests passed, including metadata-free listing, limit-before-projection, activity-no-flush, semantic serialization, and flush rollback. |
| AEV-005 | FR-002, FR-012, AC-007, AC-008 | Temporary script harness + cleanup tests | Pass | Migration dry-run/apply and cleanup dry-run/apply/reject checks passed; cleanup unit tests passed. |
| AEV-006 | FR-013, FR-014, AC-010 | Frontend query/store/mobile/panel | Pass with known non-gating team-fixture note | Web query/store target passed 11 tests; mobile target passed 21 tests; desktop standalone panel target passed 9 tests. |
| AEV-007 | API/live runtime e2e durable coverage | Live runtime tests | Not executed by default | Live runtime tests requiring `RUN_CODEX_E2E`/runtime binaries were updated to the V2 standalone fields but not executed in this local validation round. |
| AEV-008 | Browser/UI smoke | Local Nuxt + in-app browser | Pass | Browser loaded local app and showed sidebar/history shell with `Workspaces` and `No run history yet.` without render crash. |

## Test Scope

### Executed commands

Server:

```bash
./node_modules/.bin/tsc -p tsconfig.build.json --noEmit --pretty false
```

Result: passed.

```bash
git diff --check HEAD
```

Result: passed.

```bash
./node_modules/.bin/vitest run \
  tests/unit/run-history/store/agent-run-metadata-store.test.ts \
  tests/unit/run-history/agent-run-metadata-service.test.ts \
  tests/unit/run-history/store/agent-run-history-index-store.test.ts \
  tests/unit/run-history/services/agent-run-history-index-service.test.ts \
  tests/unit/run-history/services/agent-run-history-catalog-service.test.ts \
  tests/unit/run-history/services/agent-run-history-service.test.ts \
  tests/unit/run-history/services/workspace-run-history-service.test.ts \
  tests/unit/agent-execution/agent-run-status-projection-service.test.ts \
  tests/unit/agent-execution/agent-run-provisioning-service.test.ts \
  tests/unit/agent-execution/agent-run-create-service.test.ts \
  tests/unit/agent-execution/agent-run-restore-service.test.ts \
  tests/unit/agent-execution/agent-run-termination-service.test.ts \
  tests/unit/agent-execution/agent-run-command-coordinator.test.ts \
  tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts \
  tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts \
  tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts \
  tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts \
  --reporter=verbose
```

Result: passed, 17 files / 62 tests.

Web:

```bash
./node_modules/.bin/vitest run \
  graphql/queries/__tests__/runHistoryQueries.spec.ts \
  stores/__tests__/runHistoryStore.spec.ts \
  -t "fetches run history tree|projects persisted history and temp drafts|overlays persisted run status|deleteRun|archiveRun|ListWorkspaceRunHistory|GetRunFileChanges" \
  --reporter=verbose
```

Result: passed, 2 files / 11 selected tests; 36 skipped by filter.

```bash
./node_modules/.bin/vitest run \
  composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts \
  components/mobile/__tests__/MobileContextSelectionRegression.spec.ts \
  components/mobile/__tests__/MobileRemoteAccessShell.spec.ts \
  --reporter=verbose
```

Result: passed, 3 files / 21 tests.

```bash
./node_modules/.bin/vitest run \
  components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts \
  -t "loads workspace list and history tree|selects run via runHistoryStore|renders active status indicator|does not render status indicator|renders delete action only for inactive history runs|renders archive action only for inactive persisted history runs|deletes inactive history run|archives inactive history run|does not render run-row configuration button" \
  --reporter=verbose
```

Result: passed, 1 file / 9 selected tests; 24 skipped by filter.

Other checks:

```bash
git diff --check
```

Result: passed.

Temporary script harness:

```bash
node scripts/migrate-agent-run-history-index-v2.mjs --memory-dir <tmp-memory>
node scripts/migrate-agent-run-history-index-v2.mjs --memory-dir <tmp-memory> --apply
node scripts/cleanup-codex-e2e-run-history.mjs --memory-dir <tmp-memory> --dry-run
node scripts/cleanup-codex-e2e-run-history.mjs --memory-dir <tmp-memory>
node scripts/cleanup-codex-e2e-run-history.mjs --memory-dir <legacy-minimal-memory> --dry-run
```

Result: passed; last command intentionally exited non-zero and included migration guidance.

Browser:

```bash
./node_modules/.bin/nuxi dev --host 127.0.0.1 --port 3067
```

Then opened `http://127.0.0.1:3067/` in the in-app browser. DOM snapshot showed the app shell and workspace history area with `No run history yet.`

## Validation Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency`
- Branch: `codex/run-history-index-consistency...origin/personal [behind 3]`
- Temporary dependency symlinks were created to the superrepo dependency installs for server/web checks and removed afterward.
- Temporary migration/cleanup validation memory directory was created under macOS temp and removed afterward.
- Local Nuxt dev server on port 3067 was stopped after the browser smoke check.

## Tests Implemented Or Updated

Updated durable validation after code review:

- `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts`
  - Updated the primary GraphQL workspace-history query to the standalone V2 field shape.
  - Added explicit rejection coverage for removed standalone `lastActivityAt` / `lastKnownStatus` while team fields remain queryable.
- `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`
  - Updated seeded standalone history from V1/status rows to V2 catalog rows.
  - Verified GraphQL archive mutates the standalone V2 catalog row and does not write standalone archive state to metadata.
  - Preserved team archive field expectations separately.
- `autobyteus-server-ts/tests/unit/run-history/services/workspace-run-history-service.test.ts`
  - Updated mocked standalone run payload to V2/derived status shape.
- `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - Updated live runtime workspace-history query to standalone V2/derived status fields.
- `autobyteus-server-ts/tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`
  - Replaced removed active-row repair expectations with V2 field checks and no activity-index rewrite assertion.
- `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts`
  - Added durable query-shape coverage proving standalone V2 fields are queried and team fields remain retained.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/unit/run-history/services/workspace-run-history-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` via this handoff.
- Post-validation code review artifact: pending `code_reviewer` review of validation-code changes.

## Other Validation Artifacts

- This report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

- Temporary dependency symlinks to existing superrepo `node_modules` / `.nuxt` were used for local command execution and removed afterward.
- Temporary legacy memory directories for migration/cleanup script validation were created under macOS temp and removed afterward.
- Local Nuxt dev server was started for browser smoke on port 3067 and stopped afterward.

## Dependencies Mocked Or Emulated

- GraphQL e2e tests use mocked runtime managers/services where appropriate, with real GraphQL schema execution.
- Archive GraphQL e2e uses real metadata/index files in temporary memory dirs and mocked active runtime managers.
- Web component/store tests use existing Vitest/Nuxt mocks.
- Temporary migration/cleanup harness emulated copied legacy memory data with real script processes and filesystem assertions.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Code review round 4 | CR-DV-001: stale standalone `lastKnownStatus` fixture fields in `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Validation-code Local Fix | Resolved | Removed all three standalone metadata `lastKnownStatus` fields; added `satisfies AgentRunMetadata`; `grep -n "lastKnownStatus" ...` returned no matches; relevant E2E sweep passed; `git diff --check HEAD` passed. | Returned to `code_reviewer` for durable-validation re-review. |

## Scenarios Checked

- GraphQL `listWorkspaceRunHistory` standalone V2 item shape and team field preservation.
- GraphQL rejection of removed standalone `lastActivityAt` / `lastKnownStatus` fields.
- GraphQL archive mutation behavior for inactive standalone and team rows.
- Active/unsafe archive rejection without filesystem/index mutation.
- V2 catalog list behavior, archive filtering, status overlay, metadata-free inactive list projection, and per-agent limit-before-projection.
- Semantic catalog mutation serialization and flush-failure rollback for archive, summary, terminate, delete, cancel.
- Prepare/create/start/restore/terminate/cancel lifecycle tests.
- Migration dry-run/apply with backup and deterministic `createdAt` fallback.
- Cleanup dry-run/apply after migration and rejection before migration on legacy/minimal index.
- Frontend GraphQL query shape, store projection/delete/archive, mobile work catalog/context behavior, and targeted desktop standalone history panel actions.
- Browser smoke of local web app shell/history sidebar.

## Passed

- Server source typecheck.
- Targeted server unit/e2e suite: 17 files / 62 tests passed.
- Web query/store target: 2 files / 11 selected tests passed.
- Web mobile target: 3 files / 21 tests passed.
- Web desktop standalone panel target: 1 file / 9 selected tests passed.
- `git diff --check` passed.
- Temporary migration/cleanup script harness passed.
- Browser smoke passed.

## Failed

No blocking validation failures.

Non-gating observation: an unfiltered run including the full `WorkspaceAgentRunsTreePanel.spec.ts` file failed 4 team-history fixture cases with legacy team context/topology mock shape errors (`memberTree` / `focusedMemberRouteKey` undefined). This matches the implementation handoff's pre-existing non-gating note about unfiltered team-history fixture failures and is outside the standalone run-history index refactor. Targeted standalone desktop history panel tests passed.

## Not Tested / Out Of Scope

- Full web typecheck: `vue-tsc` is not installed in the linked dependency set.
- Full unfiltered web test suite: known out-of-scope team fixture failures remain.
- Live Codex/Claude runtime e2e tests requiring `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, or external runtime binaries/models. Relevant live-runtime history query tests were updated but not executed.
- Cross-process locking and crash-window elimination remain out of scope per approved design.
- Team-run history persistence refactor remains out of scope; team fields were preserved.

## Blocked

No blocking validation item.

## Cleanup Performed

- Removed temporary dependency symlinks:
  - `node_modules`
  - `autobyteus-server-ts/node_modules`
  - `autobyteus-web/node_modules`
  - `autobyteus-web/.nuxt`
  - `autobyteus-ts/node_modules`
  - application package `node_modules` symlinks used during validation
- Removed temporary migration/cleanup memory directory.
- Stopped local Nuxt dev server on port 3067.
- Closed in-app browser tab.

## Classification

- Validation result classification: `Pass`
- Reroute reason: repository-resident durable validation was updated after code review, so this must return to `code_reviewer` for validation-code review before delivery.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

Key evidence:

- `tsc -p tsconfig.build.json --noEmit --pretty false` passed.
- Server targeted suite passed: 17 files / 62 tests.
- Web query/store target passed: 2 files / 11 selected tests.
- Web mobile target passed: 3 files / 21 tests.
- Web desktop standalone panel target passed: 1 file / 9 selected tests.
- Temporary script harness passed migration dry-run/apply, cleanup dry-run/apply, and cleanup legacy rejection checks.
- Browser DOM snapshot confirmed local app shell/history sidebar rendered without crash.
- `git diff --check` passed.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Implementation behavior validated for the targeted API/E2E/executable surfaces. Because durable validation files were updated in this round, handoff goes to `code_reviewer`, not `delivery_engineer`.

## Follow-Up: Relevant Existing Backend E2E Sweep

After the initial handoff, the relevant existing backend E2E set was run explicitly:

```bash
./node_modules/.bin/vitest run \
  tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts \
  tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts \
  tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts \
  tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts \
  tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts \
  --reporter=verbose
```

Final result: `3 passed | 2 skipped` test files; `10 passed | 19 skipped` tests.

Notes:

- Passed executable E2E files:
  - `tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts`
  - `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`
  - `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
- Skipped E2E files were live-runtime suites gated by local runtime flags / binaries:
  - `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - `tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`
- First attempt exposed two stale `run-projection-toolcalls-graphql.e2e.test.ts` team-member fixture failures caused by old `memberMetadata` fixture shape. The fixture was updated to current `memberTree` schema and the relevant E2E sweep passed afterward.
- Additional durable validation path updated after this follow-up:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`

## Follow-Up: CR-DV-001 Durable Validation Local Fix

Code review round 4 identified stale standalone persisted status fixture fields in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`

Fix applied:

- Removed the three obsolete standalone metadata fixture writes of `lastKnownStatus: "IDLE"`.
- Added `satisfies AgentRunMetadata` to the three standalone metadata fixture literals so stale standalone persisted fields are caught by TypeScript-aware checks.
- Verified the file has no remaining `lastKnownStatus` occurrences.

Validation rerun:

```bash
./node_modules/.bin/vitest run \
  tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts \
  tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts \
  tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts \
  tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts \
  tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts \
  --reporter=verbose
```

Result: `3 passed | 2 skipped` test files; `10 passed | 19 skipped` tests.

Skipped files remain the live-runtime suites gated by local runtime flags/binaries:

- `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
- `tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts`

Additional check:

```bash
git diff --check HEAD
```

Result: passed.

Current validation classification after the local fix: `Pass`; durable validation changed after code review, so this package is returned again to `code_reviewer` before delivery resumes.

## Follow-Up: Round 7 Implementation Revalidation After CR-LF-004/CR-LF-005

Trigger: code review round 7 passed the implementation repair for CR-LF-004 and CR-LF-005 and sent the task back to API/E2E validation.

Focused validation additions and reruns:

- Temporary executable app-data migration smoke created an isolated memory directory and ran `AppDataMigrationRunner` with the real `AppDataMigrationRecordRepository`/Prisma test database. It verified:
  - `RUN_HISTORY_INDEX_V2_APP_DATA_MIGRATION_ID` is recorded in `app_data_migration_records` with `SUCCEEDED_WITH_WARNINGS` and `attempts: 1`;
  - migration writes a plain row-array `run_history_index.json`;
  - a row with missing `workspaceRootPath` is reported as failed and is not written;
  - obsolete standalone fields (`lastActivityAt`, `lastKnownStatus`) are absent from output rows.
  Result: `1` temporary test passed; temporary file was removed afterward.
- Temporary fallback-script harness on copied legacy-style memory verified:
  - `migrate-agent-run-history-index-v2.mjs --apply` reports `runIdMismatches` when metadata `runId` differs from the scanned directory ID;
  - output row identity uses the directory run ID;
  - metadata without usable `workspaceRootPath` is reported in `invalidMetadata` and skipped;
  - cleanup dry-run reports one Codex E2E target without mutation;
  - cleanup apply removes only the target row/directory and keeps the non-target directory/row.
  Result: passed; temporary memory directory was removed afterward.
- Existing durable integration validation initially failed in `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` because its fixtures were stale after the catalog/team metadata refactors. This was a validation-code issue, not a production implementation failure. Fixes applied:
  - single-agent create fixture now uses the current `AgentRunHistoryCatalogService` path and the actual provisioned run ID;
  - team fixture now uses current `TeamRunConfig` / `TeamBackendKind` and `AgentTeamDefinition` topology;
  - team metadata/projection fixtures now use `memberTree` and removed obsolete `runVersion`/`memberMetadata` shape;
  - standalone projection fixture no longer writes obsolete `lastKnownStatus` metadata.
  Rerun result: `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` passed, `12` tests.

Commands and results after the local durable-validation fixture fix:

```bash
./node_modules/.bin/vitest run   tests/unit/app-data-migrations/run-history-index-v2-migration.test.ts   tests/unit/app-data-migrations/app-data-migration-runner.test.ts   tests/unit/run-history/store/agent-run-metadata-store.test.ts   tests/unit/run-history/agent-run-metadata-service.test.ts   tests/unit/run-history/store/agent-run-history-index-store.test.ts   tests/unit/run-history/services/agent-run-history-index-service.test.ts   tests/unit/run-history/services/agent-run-history-catalog-service.test.ts   tests/unit/run-history/services/agent-run-history-service.test.ts   tests/unit/agent-execution/agent-run-status-projection-service.test.ts   tests/unit/agent-execution/agent-run-provisioning-service.test.ts   tests/unit/agent-execution/agent-run-create-service.test.ts   tests/unit/agent-execution/agent-run-restore-service.test.ts   tests/unit/agent-execution/agent-run-termination-service.test.ts   tests/unit/agent-execution/agent-run-command-coordinator.test.ts   tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts   tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts   tests/unit/scripts/migrate-agent-run-history-index-v2.test.ts   tests/integration/run-history/memory-layout-and-projection.integration.test.ts   --reporter=verbose
```

Result: `18` files passed / `78` tests passed.

```bash
./node_modules/.bin/vitest run   tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts   tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts   tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts   tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts   tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts   --reporter=verbose
```

Result: `3` files passed / `2` files skipped; `10` tests passed / `19` tests skipped. The skipped files remain live-runtime suites gated by local runtime flags/binaries.

```bash
./node_modules/.bin/tsc -p tsconfig.build.json --noEmit --pretty false
```

Result: passed.

```bash
git diff --check HEAD
```

Result: passed.

Frontend/history reruns from `autobyteus-web`:

```bash
./node_modules/.bin/vitest run graphql/queries/__tests__/runHistoryQueries.spec.ts stores/__tests__/runHistoryStore.spec.ts -t "fetches run history tree|projects persisted history and temp drafts|overlays persisted run status|deleteRun|archiveRun|ListWorkspaceRunHistory|GetRunFileChanges" --reporter=verbose
```

Result: `2` files passed; `11` tests passed / `36` skipped by name filter.

```bash
./node_modules/.bin/vitest run composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts --reporter=verbose
```

Result: `3` files passed / `23` tests passed.

```bash
./node_modules/.bin/vitest run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts -t "loads workspace list and history tree|selects run via runHistoryStore|renders active status indicator|does not render status indicator|renders delete action only for inactive history runs|renders archive action only for inactive persisted history runs|deletes inactive history run|archives inactive history run|does not render run-row configuration button" --reporter=verbose
```

Result: `1` file passed; `9` tests passed / `24` skipped by name filter.

Browser note: a new in-app browser smoke was attempted during this resumed round, but the browser bridge returned `browser_bridge_unavailable`; no new browser result is claimed for round 4. The prior validation browser smoke remains historical evidence, and the round-7 server-side repair did not change frontend source.

Repository-resident durable validation updated this round: `Yes`.

Updated durable validation path:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts`

Current validation classification: `Pass` after the local durable-validation fixture fix. Because repository-resident durable validation was updated after code review, this package must return to `code_reviewer` before delivery resumes.

## Latest Authoritative Result After Round 7 Revalidation

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Latest authoritative validation round: `4`
- Recommended recipient: `code_reviewer`
- Notes: Round-7 implementation behavior passed focused API/E2E/executable validation, but a repository-resident integration validation fixture was updated during API/E2E. Per workflow, delivery must wait for `code_reviewer` to re-review that durable validation change.
