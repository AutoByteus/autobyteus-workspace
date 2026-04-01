# Requirements

- Ticket: `external-channel-sql-removal`
- Status: `Refined`
- Scope: `Medium`
- Last Updated: `2026-04-01`

## User Intent

Remove the remaining SQL-backed persistence support for external channel messages so server runtime no longer queries Prisma for external-channel message receipts or delivery events. External-channel persistence should be file-based only, and Prisma SQL query logging should not flood normal server logs by default.

## Functional Requirements

- `R-001` External-channel message receipts SHALL use file-backed persistence only.
- `R-002` External-channel delivery events SHALL use file-backed persistence only.
- `R-003` The external-channel provider proxy SHALL stop selecting SQL providers for receipts and delivery events, even when the global persistence profile is `sqlite` or `postgresql`.
- `R-004` The codebase SHALL remove the remaining SQL-only external-channel provider implementations and their direct tests.
- `R-005` Prisma schema support for external-channel receipt and delivery-event tables SHALL be removed if no in-scope runtime code still depends on it.
- `R-006` Prisma SQL query logging SHALL be disabled by default for the shared Prisma client used by runtime repositories.
- `R-007` Prisma SQL query logging SHALL be re-enabled only through an explicit opt-in configuration switch.

## Non-Functional Requirements

- `NFR-001` Normal server logs SHALL not be flooded by Prisma SQL query logs during standard runtime operation.
- `NFR-002` The change SHALL preserve current external-channel ingress and callback behavior through file-backed providers.
- `NFR-003` Unrelated persistence domains SHALL remain unchanged.
- `NFR-004` Debug-level or opt-in SQL query visibility SHALL remain available for troubleshooting without code changes.

## Acceptance Criteria

- `AC-001` No runtime path under `autobyteus-server-ts/src/external-channel/` selects SQL persistence for message receipts.
- `AC-002` No runtime path under `autobyteus-server-ts/src/external-channel/` selects SQL persistence for delivery events.
- `AC-003` Running external-channel provider tests no longer requires SQL-backed receipt or delivery-event providers.
- `AC-004` File-provider integration tests cover the receipt lifecycle and callback delivery-event behaviors previously covered by SQL provider tests.
- `AC-005` External-channel runtime code no longer depends on Prisma models for message receipts or delivery events.
- `AC-006` The shared Prisma client no longer emits SQL query logs by default during normal server startup and repository usage.
- `AC-007` An explicit environment variable can enable Prisma SQL query logs when troubleshooting is needed.
