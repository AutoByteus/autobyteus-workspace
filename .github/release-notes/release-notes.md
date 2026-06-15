# Release Notes — Incomplete Tool-Call Resume Recovery

## What Changed

- Fixed resumed AutoByteus runs that could get permanently stuck after a shutdown during a native tool call.
- Added a memory-owned safety boundary that repairs incomplete provider-native tool-call history before the next LLM request is rendered or sent.
- Preserved completed native assistant tool-call/result pairs as structured history.
- Restored committed raw tool results when a cached working-context snapshot is missing the immediate provider-visible result message.
- Inserted synthetic interrupted/unknown tool results for abandoned calls when no real tool result exists, without claiming success or inventing output.
- Recorded idempotent raw recovery markers so the original abandoned tool call remains auditable.
- Removed the obsolete text-fencing-only working-context projector path.

## Validation

- Latest `origin/personal` was refreshed before delivery; the ticket branch was already current with `aae7027ee1dfca2a509c16f72ff067de4090aa7b`.
- Code review and post-API/E2E durable coverage-code re-review passed.
- Targeted unit/integration/API-E2E suite passed: 10 files / 39 tests.
- TypeScript package build passed: `pnpm --dir autobyteus-ts run build`.
- Delivery reran the persisted restore/resume integration test successfully.
- Local macOS ARM64 Electron build passed and produced `1.3.54` personal DMG/ZIP artifacts for verification.
- `git diff --check` passed after delivery artifact updates.

## Notes

- No data migration command is required; existing poisoned cached snapshots are repaired when restored or before the next provider render path.
- The synthetic recovery result intentionally says completion status is unknown and no output is available in memory.
- UI polish for old pending/parsed tool-call cards remains outside this runtime/provider-safety release scope.
