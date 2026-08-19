# Delivery Rework Record

## Current Result

- Delivery revision: `DR-004`
- Trigger: explicit user verification of the DR-003 Electron package
- Result: `Failed — production-shaped token consolidation did not start`
- Classification: `Local Fix`
- Required recipient: `/implementation_engineer`
- Finalization state: `Blocked`

## Failure Summary

The user started the ticket Electron bundle three times. The registered
`20260819_token_usage_run_records_v1` migration failed on every attempt before
scanning or importing any legacy row:

```text
Legacy token usage field 'source_reported_input_tokens' is outside JavaScript SafeInt.
```

The current-schema degraded behavior worked as designed: the server remained
healthy/listening, while Token Usage history and pre-existing-run restore were
gated with `TOKEN_USAGE_*_MIGRATION_REQUIRED`. That does not satisfy the primary
acceptance path because consolidation did not complete.

## Read-Only Production Evidence

- Database: `/Users/normy/.autobyteus/server-data/db/production.db`
- Delivery access: none. Delivery did not open, query, copy, or mutate the live
  database; it accepted the read-only inspection reported by
  `/solution_designer`.
- Migration record: `FAILED`, `attempts=3`.
- Legacy ledger: `157,742` rows / `1,283` distinct `run_id` values.
- Current run records: `0` rows.
- SQLite `PRAGMA quick_check`: `ok`.
- Migration report: `scannedCount=0`, `migratedCount=0`, `failedCount=1`.
- Bounded SQL over
  `$.autobyteus_cumulative_snapshot_source_tokens.reported_input_tokens`:
  `152,026` present values; all SQLite `INTEGER`; min `7,894`; max
  `1,371,080,595`; zero noninteger, negative, or values over
  `9,007,199,254,740,991`.
- Evidence inference: the observed rejection conflicts with the bounded source
  values and therefore points to a likely implementation/adapter decoding
  defect. The exact root cause is not assigned by delivery and remains
  implementation-owned.

## Confirmed Root Cause

`/solution_designer` reproduced the exact failure safely against the SQLite
backup `/tmp/autobyteus-token-diag.pp7eIM/production.db`; the live database was
not mutated.

- The first ordered legacy run is
  `3d99f4bf-5b6e-4d63-bcda-180febd4f083`; its first six row IDs are `700`,
  `701`, `702`, `704`, `23004`, and `23005`.
- The first four values of the nullable `json_extract(...)` result are `NULL`.
  In the exact Prisma `$queryRaw` batch, later safe SQLite integers are decoded
  as JavaScript decimal strings: row `23004` -> `"28826658"`; row `23005` ->
  `"28987545"`.
- When the same expression's result set starts on a non-null row, Prisma decodes
  the value as `bigint`. The defect is therefore nullable SQLite expression /
  result-set inference at the Prisma boundary.
- Pre-fix `legacy-token-usage-row.ts` typed the field as `number | bigint` and
  converted only `bigint`. A decimal string reached `Number.isSafeInteger`,
  returned false, and produced the misleading out-of-SafeInt error.
- A read-only scan of all 15 cumulative-source token fields found every non-null
  value is an integer, nonnegative, and within SafeInt; the largest total is
  `1,374,407,961`. Production token data is not invalid.
- This is confirmed as an implementation defect. No solution-design or
  requirement change is needed.
- Durable diagnosis evidence:
  `delivery-evidence/13-exact-root-cause-dr004.log`.

## Runtime Evidence

- Ticket-bundle starts occurred at local times corresponding to migration logs
  `14:56`, `14:58`, and `15:08`.
- The latest exact failure log is:
  `/Users/normy/.autobyteus/server-data/logs/app-data-migrations/20260819_token_usage_run_records_v1-2026-08-19T13-08-18-307Z.log`.
- The server log records the ticket bundle's Prisma/server startup and the
  expected history/restore gates after migration failure:
  `/Users/normy/.autobyteus/server-data/logs/server.log`.
- The process active at the later `15:19` snapshot belongs to
  `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/...`,
  not the ticket bundle. That later process does not erase the three ticket-
  bundle failures or make DR-003 acceptable.
- Durable bounded evidence:
  `delivery-evidence/10-user-verification-failure-dr004.log`, exact copied
  migration log `delivery-evidence/11-production-migration-failure-dr004.log`,
  and root-cause evidence `delivery-evidence/13-exact-root-cause-dr004.log`.

## Required Rework

1. Correct migration-only legacy integer decoding to accept Prisma's exact
   canonical decimal-string representation. Parse strictly through `BigInt`,
   require nonnegative and `<= Number.MAX_SAFE_INTEGER`, then convert to
   `number`; do not broadly coerce arbitrary strings.
2. Add a real Prisma/SQLite regression fixture whose ordered nullable
   `json_extract` column has leading `NULL` rows followed by safe integer rows.
   Do not use or mutate the user's live database for automated tests.
3. Preserve genuine SafeInt rejection, migration atomicity, bounded evidence,
   retry behavior, degraded capability behavior, and forward-only runtime rules.
4. Add focused durable coverage for the exact production-shaped representation
   and confirm no partial destination rows or source deletion on rejection.
5. Run implementation checks, source review, API/E2E coverage investigation and
   execution, and proportional review for any durable test delta.
6. Return the complete package to delivery. Delivery must refresh the base,
   rebuild/integrity-check a new Electron package, and obtain renewed explicit
   user verification before finalization.

## Safety / Hold

- Do not hand-edit the production SQLite database or migration records.
- Do not mark the failed migration successful or bypass the SafeInt guard.
- Do not delete legacy rows or populate destination rows manually.
- No push, ticket archival, target merge/push, version bump, tag, release,
  deployment, or cleanup is authorized.
- The DR-003 DMG/ZIP remain useful only as failure reproduction artifacts and
  must not be presented as verification-passed candidates.
