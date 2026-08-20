# Delivery Requirement Gap

## Current Result

- Delivery revision: `DR-008`
- Historical trigger: read-only DR-005 verification found two already-successful
  20260730 migration summaries that make the current status response roughly
  `31 MB`.
- Original classification: `Requirement Gap / Design Impact` in `DR-006`.
- Current disposition: `Explicit accepted residual / separately bootstrapped
  future scope` under user-directed `SR-010`.
- Current ticket blocker: `None from this residual`.
- Explicit user verification of DR-008: `Pass` under DR-009.
- Repository finalization: `Authorized` after unchanged-base refresh.

## Authoritative Disposition

The attempted SR-008/SR-009 audit projection and compactor solution is
withdrawn. Its source, registry behavior, durable fixtures/tests, and durable
project-documentation claims were removed under SR-010 and confirmed absent by
`IR-010`, `CRR-019`, `API-REV-008`, `CRR-020`, and the DR-008 package audit.
DR-007 is therefore stale and must not be used as acceptance evidence.

For this ticket, preserve the historical records and their reachable status
response unchanged. Do not:

- truncate or project the summaries on read;
- rewrite already-successful migration records;
- compact or replace owned historical logs;
- add a migration-audit compactor or filesystem edge matrix; or
- claim the roughly 31 MB response is bounded or fixed.

Any future work on migration-status payload size, historical evidence
retention, log compaction, or filesystem recovery requires a separately
bootstrapped requirement/design package and the normal review gates.

## Preserved Technical Result

The earlier production-shaped token consolidation defect is independently
resolved and remains valid:

- `20260819_token_usage_run_records_v1` succeeded on attempt `6`;
- `158,025` legacy rows consolidated atomically into `1,283` unique current
  records and the legacy source became empty;
- SQLite `quick_check` passed;
- current rows passed run-ID, counter, JSON, timestamp, and state-cap checks;
- exact task/model statistics queries returned HTTP 200 without GraphQL errors;
  and
- deleted legacy pages remain reusable through SQLite's freelist; physical
  `VACUUM` was never required.

The accepted status-response residual does not reopen that token migration
result and does not authorize mutation of the user's live profile merely to
create verification evidence.

## Current Recovery Scope

The retained current change is the generic runner-owned recovery action:

- `MANUAL_RETRY` when the public manual command can execute now;
- `RESTART_TO_RETRY` when ordinary later startup is the supported executor; and
- `NONE` when no truthful public recovery action is available.

`canRetry` is true only for `MANUAL_RETRY`. Settings consumes the non-null
server action, renders localized English/zh-CN restart guidance for
`RESTART_TO_RETRY`, leaves Retry disabled, and dispatches no manual mutation.
This recovery presentation does not imply audit compaction or historical-data
repair.

## Evidence

- Original live residual evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/19-live-dr005-technical-verification-and-residual-dr006.log`
- Current solution/design authority:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/solution-revision-record.md` (`SR-010`–`SR-012`);
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/design-review-report.md` (`ARCH-REV-012`)
- Current execution/review authority:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md` (`API-REV-008`);
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/api-e2e-test-review-report.md` (`CRR-020`)
- DR-008 package audit:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/29-electron-package-integrity-dr008.log`

No delivery check accessed or mutated the user's live database or profile.
