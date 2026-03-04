# Docs Sync

- Ticket: `desktop-auto-update-restart-errors`
- Last Updated: `2026-03-04`

## Decision

- `No-impact` (external docs update not required for this ticket).

## Rationale

- User-facing updater contract and published asset names remain unchanged (`latest-mac.yml`, dmg/zip assets).
- Change is internal to release metadata assembly and validation to ensure the existing contract works correctly for both mac architectures.
- Existing docs already state mac releases require `latest-mac.yml` plus dmg/zip families; this remains accurate.

## Gate Status

- Stage 9 docs gate: `Pass` with recorded no-impact rationale.
