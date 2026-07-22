# Release Notes — Application Agent Streaming And Socratic Live Tutor

## What's New

- Added a standard application-facing live agent stream for bound agents, whole teams, and selected static team members.
- Added backend SDK helpers for constructing all three supported application agent target addresses.
- Updated Socratic Math Teacher to stream tutor text live and reconcile it with the saved lesson transcript.

## Improvements

- Kept the public live stream intentionally provider-neutral with clear turn-start, text-delta, completion, interruption, and safe-error events.
- Preserved durable published artifacts as the authoritative path for complete structured application results.
- Prevented overlapping Socratic follow-up and hint actions while a tutor turn is still resolving.

## Fixes

- Fixed Socratic lesson closing so late background refreshes cannot reopen a lesson after it has closed.
- Ensured the first live tutor response is observed by waiting for the application connection to be ready before sending input.
