# Handoff Summary

## Status

- Delivery revision: `DR-004`
- Ticket: `token-usage-one-row-per-agent-run`
- State: `Blocked — explicit user verification failed`
- Classification: `Local Fix`
- Required recipient: `/implementation_engineer`
- Ticket state: remains in `tickets/in-progress`
- Push/archive/finalization/release/deployment/cleanup: all held

## User Verification Failure

The DR-003 local Electron package built and passed static/package integrity, but
the required migration failed against the user's real production-shaped data on
three starts before any row was scanned or imported:

```text
Legacy token usage field 'source_reported_input_tokens' is outside JavaScript SafeInt.
```

- Migration: `20260819_token_usage_run_records_v1`
- Status/attempts: `FAILED` / `3`
- Legacy source: `157,742` rows / `1,283` run IDs
- Current destination: `0` rows
- SQLite quick check: `ok`
- Bounded snapshot-value audit: `152,026` SQLite integers; min `7,894`; max
  `1,371,080,595`; no noninteger, negative, or out-of-SafeInt value
- Result: primary user acceptance failed; confirmed implementation decoder
  defect, with no invalid production token value and no design change

The server's designed degraded mode behaved correctly: it stayed healthy and
gated Token Usage history and pre-existing-run restore with
`TOKEN_USAGE_*_MIGRATION_REQUIRED`. That partial success does not compensate for
the failed required consolidation.

Exact safe-backup reproduction showed that leading `NULL` values in a nullable
SQLite `json_extract` result column cause Prisma `$queryRaw` to decode later
safe integers as decimal strings. The pre-fix decoder accepted only
`number | bigint`, passed the string to `Number.isSafeInteger`, and emitted the
misleading out-of-SafeInt error. See
`delivery-evidence/13-exact-root-cause-dr004.log`.

## Rework And Evidence

- Canonical rework record:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-rework-record.md`
- Bounded delivery evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-evidence/10-user-verification-failure-dr004.log`
- Exact copied migration log:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-evidence/11-production-migration-failure-dr004.log`
- Exact root-cause evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-evidence/13-exact-root-cause-dr004.log`
- Live source migration log:
  `/Users/normy/.autobyteus/server-data/logs/app-data-migrations/20260819_token_usage_run_records_v1-2026-08-19T13-08-18-307Z.log`
- Live server log: `/Users/normy/.autobyteus/server-data/logs/server.log`
- Delivery did not open, query, copy, or mutate the live production database.

Implementation must reproduce the representation in an isolated fixture,
correct the decoder/adapter without weakening SafeInt or atomic migration
guards, add focused durable regression coverage, and return through source
review plus API/E2E and proportional test review as applicable.

## DR-003 Package Disposition

- DMG:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
- Prior build/integrity checks remain historically valid.
- Current disposition: `Reproduction-only; not verification-passed and not a
  release candidate.`
- No additional live retries are requested until a corrected package completes
  the required workflow gates.

## Preserved Upstream Results

- `CRR-009`, `API-REV-004`, and `CRR-010` remain accurate for the previously
  selected integrated tests, but they did not cover this real production
  decoding representation.
- `API-REV-003` remains valid for its isolated released-scale fixture and broad
  execution, but the live failure proves its production-shape confidence was
  incomplete.
- Durable documentation remains the intended product contract; revalidate it
  after the correction in case implementation changes the decoding explanation
  or migration operating notes.

## Safety And Finalization Hold

- Do not edit the live SQLite database or migration records.
- Do not bypass the SafeInt guard, mark the failed migration successful, delete
  the source ledger, or populate destination rows manually.
- No repository or release finalization is allowed.
- After corrected implementation/review/execution returns, delivery must refresh
  `origin/personal`, rebuild and integrity-check Electron, and obtain renewed
  explicit user verification.

## Canonical Cumulative Package

- Requirements/investigation/design:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/requirements.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/investigation-notes.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-spec.md`
- Supplemental design evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- Design review:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Implementation handoff/revisions:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/implementation-handoff.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/implementation-revision-record.md`
- Source review/revisions:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-revision-record.md`
- API/E2E investigation/execution/revisions/test review:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-test-review-report.md`
- Delivery artifacts:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/docs-sync-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/release-deployment-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-revision-record.md`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-rework-record.md`
