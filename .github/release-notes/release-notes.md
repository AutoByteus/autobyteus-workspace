## What's New
- None.

## Improvements
- Added durable UI-to-WebSocket coverage for the team member Stop control, proving the rendered composer button sends the current focused member target after a focus switch.
- Added backend and frontend regression coverage for member-targeted team interrupt routing, stale target guards, and single-agent interrupt preservation.

## Fixes
- Fixed team member Stop/Interrupt so it targets the currently focused visible member instead of sending a team-wide/no-target interrupt.
- Fixed team WebSocket interrupt handling to require an explicit member route key and reject missing or mismatched member targets without retargeting another member.
- Preserved ordinary single-agent Stop/Interrupt behavior while separating it from the team member interrupt payload contract.
