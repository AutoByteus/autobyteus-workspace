## Improvements
- External-channel bindings, file-backed receipts, delivery events, and callback outbox data now live under one top-level `server-data/external-channel/` folder.
- Bound external-channel routes now preserve run continuity more reliably across restarts for supported runtime kinds.

## Fixes
- Fixed Telegram-bound agent replies so messages sent through external-channel bindings are delivered back to Telegram.
- Fixed accepted external replies so callback delivery can recover after restart instead of depending only on a live in-memory bridge.
