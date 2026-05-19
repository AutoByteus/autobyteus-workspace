## What's New
- Standalone agent sends now use a backend-owned command lifecycle so inactive or prepared runs enter `Initializing` before runtime restore/start work finishes.
- New standalone first-message sends prepare a durable run identity before streaming, then activate it through the backend `SEND_MESSAGE` command.

## Improvements
- Added standalone command acknowledgement and idempotency around `message_id` / `dedupe_key` so retries are safe and concurrent different commands are rejected clearly.
- Run history now exposes backend status projection details for command overlays, active runtime status, and prepared identities.
- External-channel standalone dispatch uses the same backend command coordinator as websocket sends.

## Fixes
- Fixed the standalone offline/inactive send lifecycle gap where the frontend had to restore runtime before any backend-owned `Initializing` status could be observed.
- Preserved backend runtime status authority: live runtime status replaces command-level `Initializing` or `Error` overlays once available.
- Fixed a restored inactive standalone resend flicker by keeping runtime readiness/restored snapshots internal until command-correlated status evidence arrives.

## Validation
- Added durable E2E coverage for the `offline -> initializing -> running` resend sequence through the production websocket route.
