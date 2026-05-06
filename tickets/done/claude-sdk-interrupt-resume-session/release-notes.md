## What's New
- None.

## Improvements
- Added durable Claude Agent SDK interrupt/resume coverage for single-agent and team-member WebSocket follow-ups.
- Added live-gated real Claude SDK proof that a follow-up after Stop/Interrupt recalls prior context when `RUN_CLAUDE_E2E=1` is enabled.

## Fixes
- Fixed Claude Agent SDK follow-up messages after Stop/Interrupt so they continue the same provider conversation when Claude has emitted a provider session id.
- Prevented invalid Claude resume attempts that would send the local run id when no provider session id exists yet.
