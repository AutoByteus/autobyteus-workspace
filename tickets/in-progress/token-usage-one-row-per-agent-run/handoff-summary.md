# Handoff Summary

## Status

- Delivery revision: `DR-002`
- Ticket: `token-usage-one-row-per-agent-run`
- Date: `2026-08-19`
- State: `Blocked — latest-base source conflict; Electron build not started`
- Ticket branch: `codex/token-usage-one-row-per-agent-run`
- Finalization target: local `personal`, refreshed from `origin/personal`
- Latest fetched base:
  `origin/personal@1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`
- Protected DR-001 checkpoint:
  `b68170cf608364bbcd264dde198ad83e030a3bb2`
- Integration method/result: merge in progress; one unmerged source path blocks
  post-integration checking and Electron packaging.

## DR-002 Re-entry Blocker

The user requested a fresh base refresh plus an Electron verification build.
`origin/personal` advanced eight commits. Delivery protected the reviewed DR-001
candidate, began the required base merge, and stopped on one implementation-
owned conflict:

`autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`

The conflict combines the ticket's required pre-existing-run token migration
readiness gate with latest base's broader offline managed-run restore guard.
Both contracts must survive. The implementation owner must also inspect the
clean auto-merges in `task-delegation-service.ts` and
`team-run-service.test.ts`.

- Canonical blocker:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-integration-blocker.md`
- Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-evidence/04-reentry-integration-conflict-dr002.log`
- Electron README read: `No`
- Electron build started: `No`
- Reason: a package must be built from a conflict-free latest-base integrated
  state, not the stale checkpoint or conflicted merge index.

## Delivered

- Replaced append-per-notification token storage with one cumulative
  `token_usage_run_records` row per canonical AgentRun ID across standalone,
  direct/nested Team member, delegated, and task-created runs.
- Made token persistence awaited and transactionally folded per run, with
  bounded cumulative-series checkpoints, recent idempotency digests, accurate
  mixed component/cost state, and exact SafeInt public rejection rather than
  rounding.
- Changed Token Statistics range semantics: select runs by `runCreatedAt`, fall
  back to `firstObservedAt`, and show each selected run's lifetime totals.
- Repaired both released 20260730 token source-shaping migrations under their
  unchanged IDs using SQL eligibility, <=250-row keyset batches,
  compare-and-set updates, scalar validation, and capped evidence.
- Added startup-only `20260819_token_usage_run_records_v1` consolidation:
  validate disjoint run IDs, fold the released ledger into one current row per
  run, validate, then empty the source in one SQLite transaction.
- Added current-schema/readiness classification:
  - missing required current schema is bounded platform-fatal;
  - incomplete consolidation with valid current schema leaves the application
    and new runs available while history and old-run restore are gated;
  - successful consolidation enables current history and restore.
- Removed current-runtime ledger store/repository/adapters and confined released
  legacy knowledge to registered migration boundaries.
- Updated normal/degraded Token Statistics user copy in English and Chinese.

## Review And Verification Snapshot

- Architecture: `ARCH-REV-006` — Pass.
- Source implementation: `CRR-007` — Pass, `9.3/10` (`92.9/100`), no open
  findings.
- API/E2E: `API-REV-003` — Pass, `97.1%` final confidence.
- Proportional durable-test review: `CRR-008` — Pass, no findings across all 17
  added/updated repository-resident coverage paths.
- Final broad server lifecycle/API selection: `27 files / 125 tests` passed;
  the unchanged external-runtime file's three opt-in provider cases skipped by
  explicit environment gate.
- All 13 original API/E2E-owned durable paths passed.
- Server production build, Nuxt production build, current GraphQL, released
  upgrade/relaunch, consolidation failure/new-run/retry/overlap, rollback,
  empty-source relaunch, SafeInt persistence/public error, and reusable-page
  checks passed.
- Released-scale synthetic SQLite proof: 154,100 legacy rows / 1,269 runs;
  consolidation completed in 11.287 seconds; source `0`, current `1,269`, totals
  preserved, integrity `ok`, freelist `215,037`, no startup `VACUUM`.
- Chrome 151 exercised normal lifetime totals, degraded-history guidance, and
  critical current-schema failure presentation.

## Documentation Synced

- DR-002 status: the DR-001 docs sync remains the prior-base result and must be
  revalidated after the latest-base conflict is resolved. Delivery made no new
  long-lived documentation claim from the conflicted state.
- Promoted the approved convention to
  `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`
  and linked it from the server README.
- Rewrote the canonical Token Usage module documentation for the current
  run-record, migration, readiness, GraphQL, and frontend contracts.
- Updated server architecture/module index, web Settings/agent execution docs,
  and the Token Statistics prototype/spec matrix.
- Documentation audit: `git diff --check`, stale-owner/retired-period scan, and
  local Markdown link audit all passed.
- Canonical report:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/docs-sync-report.md`

## Persisted-Data And Rollout Notes

- Approved transition: `Migration Required` when a release containing this
  branch is installed on an existing profile.
- Supported operational path: install the release and start normally. Prisma
  expands the current schema; registered app-data migrations repair released
  source rows and consolidate them automatically.
- Do not run these proofs against a user's live profile, edit migration records,
  hand-edit production SQLite, force startup `VACUUM`, or re-enable the old
  ledger runtime.
- A normal consolidation failure with valid current schema is nonfatal to the
  application/new runs but temporarily gates stored history and pre-existing-
  run restore. Install a corrected release and restart to retry.
- Missing required current schema may stop startup. Recovery is an externally
  installed corrected release; there is no current-runtime legacy fallback.
- Successful consolidation empties legacy rows and makes pages reusable; it
  does not guarantee the database file shrinks physically.

## Known Residuals / Not Selected

- `pnpm exec nuxi typecheck` remains blocked before project checking by the
  known `vue-tsc`/TypeScript `ERR_PACKAGE_PATH_NOT_EXPORTED` incompatibility.
  Nuxt production build and changed-component checks passed.
- Live LM Studio/Codex/Claude provider E2E was not selected because provider
  adapters did not change; those three cases remain explicit opt-in coverage.
- Electron shell execution was not selected because no shell-specific code
  changed. Chrome evidence is not represented as IPC/preload/native-shell proof.

## User Verification Requested

Superseded for now by the user's Electron-build request. After the source owner
returns a conflict-free checked integration, delivery will read the current
packaging instructions, build and verify the Electron artifact, then provide
its exact path/hash/signing status for local user testing. Finalization remains
held until explicit verification after that package is available.

## Canonical Artifact Package

- Requirements:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/requirements.md`
- Investigation:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/investigation-notes.md`
- Design:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-spec.md`
- Approved migration convention source:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- Design review:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Implementation handoff:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/implementation-handoff.md`
- Source review:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`
- Coverage investigation:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
- Execution coverage:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
- Proportional test review:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-test-review-report.md`
- Docs sync:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/docs-sync-report.md`
- Delivery report:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/release-deployment-report.md`
- Delivery chronology:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-revision-record.md`
