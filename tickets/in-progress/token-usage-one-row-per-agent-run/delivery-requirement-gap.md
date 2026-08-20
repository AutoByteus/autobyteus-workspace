# Delivery Requirement Gap

## Current Result

- Delivery revision: `DR-007`
- Trigger: live DR-005 technical verification reported by
  `/solution_designer`.
- Ticket-scope migration result: `Pass`.
- Explicit user finalization instruction: `Not received`.
- Historical classification: `Requirement Gap / Design Impact`.
- Resolution: `SR-008` / `SR-009` / `ARCH-REV-009` / `IR-008` / `IR-009` /
  `CRR-014` / `API-REV-007` / `CRR-016` all passed.
- Current result: `Resolved in the fresh DR-007 verification package`.
- Finalization state: `Held pending renewed explicit user verification`.

## Resolution

The approved in-scope correction uses the two-owner posture identified by this
record:

1. Every current migration status, prerequisite, scheduling, API, and UI read
   SQL-projects a uniform summary of at most `65,536` bytes before Node
   materialization. Oversized or malformed historical details become truthful
   bounded omission/unavailable markers rather than a multi-megabyte response.
2. A separate registered
   `20260819_token_usage_migration_audit_compaction_v1` startup-only migration
   owns the two known terminal 20260730 summaries and their owned regular log
   files. It preserves the complete original identity/display/status/attempt/
   timestamp/error/count tuple and replaces only row-linear detail evidence
   with deterministic bounded content.

The compactor is scheduled by ordinary `runPending()` via
`requiredOnStartup=true` plus `STARTUP_ONLY`, but it remains noncritical because
it is absent from Token Usage consolidation prerequisites and explicit runtime
fatal gates. `FAILED` and stale `RUNNING` states retry on later ordinary
startup; terminal success/warning states do not advertise impossible manual
retry.

`API-REV-007` passed at `97.7%`, including actual rebuilt-server startup. The
real Prisma/SQLite and startup E2E assertions read every replaced owned log and
compare the complete deterministic body while retaining the 64 KiB limit.
`CRR-016` passed proportional review of all six cumulative SR-009 durable test
paths with no remaining finding.

Delivery refreshed the base, synchronized the durable convention/README, and
built a new isolated DR-007 Electron package without stopping or overwriting
the user's currently running DR-005 app. Package integrity passed. Earlier
Electron evidence remains historical and stale for this correction.

## Passed Technical Evidence

The corrected package succeeded against the production-shaped live profile on
ordinary retry:

- `20260819_token_usage_run_records_v1`: `SUCCEEDED`, attempt `6`, no current
  error;
- `158,025` legacy rows consolidated atomically into `1,283` unique current run
  records; legacy rows are now `0`;
- SQLite `quick_check`: `ok`;
- no duplicate/blank run IDs, negative or unsafe counters, invalid JSON,
  timestamp inversions, or approved state-cap violations;
- in-place updates keep one row per run;
- REST and GraphQL health: `ok`;
- exact frontend task/model statistics documents return HTTP 200 with no
  GraphQL errors; and
- deleted legacy pages are reusable on the freelist; physical file shrink was
  not a ticket requirement.

This resolves the DR-004 token-consolidation failure technically. It is not an
explicit user authorization to archive, push, merge, release, or deploy.

## Reachable Residual

Two already-`SUCCEEDED` records for the old 20260730 token source-shaping
implementations retain historical `summary_json` values of `13,964,274` and
`14,318,058` bytes. The exact current `GetAppDataMigrations` frontend document
succeeds but returns `31,387,995` bytes in `0.333 s` on the observed machine.

The repaired migration definitions cap new and retry evidence, but the runner
does not execute a same-ID definition after that record is already
`SUCCEEDED`. Consequently, the corrected definitions cannot rewrite these old
persisted summaries, and the current status API/UI still exposes them.

## Why Upstream Classification Is Required

- `REQ-014` says migration logs and `summary_json` shall not grow linearly with
  ledger row count.
- `REQ-025` requires truthful bounded migration outcome evidence.
- The current requirement/design explicitly covers `NOT_RUN`, stale `RUNNING`,
  and `FAILED` same-ID retries, but does not say how an already-`SUCCEEDED`
  record written by a released unbounded implementation is preserved,
  normalized, migrated, or bounded when read.
- The residual is reachable through a current frontend query, so delivery
  cannot classify it as inert or silently claim all evidence is bounded.
- Rewriting a successful historical audit record, truncating it on read, adding
  a separate cleanup migration, or explicitly accepting it as legacy evidence
  have different audit, product, and compatibility consequences. Delivery must
  not choose among them.

## Required Decision

`/solution_designer` should decide and record one of these postures:

1. **In-scope correction:** define preservation and bounding semantics for old
   successful summaries plus the required source/API/UI behavior and coverage,
   then route through architecture, implementation, code review, API/E2E, and
   delivery again; or
2. **Explicit accepted residual / follow-up:** narrow or clarify `REQ-014` and
   `REQ-025` for already-successful released audit records, record the reachable
   31 MB status response as a known performance/data-retention residual, and
   obtain informed user acceptance before finalization.

No live migration record should be edited manually. The already-successful
Token Usage consolidation and current statistics should remain intact.

## Evidence

- Durable report:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-evidence/19-live-dr005-technical-verification-and-residual-dr006.log`
- Upstream-supplied successful migration log:
  `/Users/normy/.autobyteus/server-data/logs/app-data-migrations/20260819_token_usage_run_records_v1-2026-08-19T14-32-51-838Z.log`
- Delivery did not access or mutate the live database.
