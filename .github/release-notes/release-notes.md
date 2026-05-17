## What's New
- Added a distinct Initializing state for agent and team startup so startup is no longer shown as active running work.
- Agent and team sends now show the accepted user message locally while backend startup and streaming continue.

## Improvements
- Improved backend and frontend startup status handling across websocket status payloads, run-status displays, and team aggregate/member status separation.
- Finalized context-file attachments now update the already-visible local user message instead of creating duplicate message rows.

## Fixes
- Fixed delayed composer clearing during new or restored agent/team sends.
- Fixed stale status recovery paths so active runtime work can recover from stale error projections without hiding terminal errors.
