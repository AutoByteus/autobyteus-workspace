## What's New
- Added canonical Claude Agent SDK lifecycle handling for first-party team messaging so `send_message_to` now progresses through Activity execution and completion states.

## Improvements
- Preserved Claude browser `open_tab` visibility by normalizing first-party browser MCP tool names and results before Browser panel handling.
- Added live Claude SDK team validation coverage for `send_message_to` lifecycle, arguments, memory traces, and raw MCP duplicate suppression.

## Fixes
- Fixed Claude Agent SDK browser `open_tab` results so successful tab opens focus the Browser panel instead of leaving it empty.
- Fixed Claude Agent SDK `send_message_to` Activity rows getting stuck at `Parsed`; canonical deliveries now reach `Executing` and terminal `Success` or `Error`.
- Prevented raw Claude MCP transport names such as `mcp__autobyteus_team__send_message_to` from creating duplicate Activity rows or leaking into first-party tool display.
