## What's New
- Added stronger turn-aware live streaming so each streamed response segment stays attached to the correct turn during agent and team runs.

## Improvements
- Improved tool activity streaming so approvals, execution updates, logs, and results stay grouped under the same turn in live sessions.
- Improved multi-step tool rounds inside one agent response so the frontend can follow streamed progress more consistently.

## Fixes
- Fixed live stream contract drift between backend and frontend for segment and tool events.
- Fixed cases where streamed tool logs could lose turn context while a run was still in progress.
