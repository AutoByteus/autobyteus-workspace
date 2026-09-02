## What's New
- Failed tool cards now stay compact in the center event stream while retaining their existing red failure state, tool name, context summary, and Activity navigation.

## Improvements
- The right-side Activity Error subsection now starts collapsed and reveals the complete diagnostic only after explicit expansion.
- Selecting or highlighting a failed activity no longer opens its Error details automatically.

## Fixes
- Prevented very large multiline command failures from flooding the center event stream or the Activity list by default.
- Preserved the exact failure diagnostic across standalone and Team live/replay flows, including multiline content after collapse and reopen.
