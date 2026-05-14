## What's New
- Native AutoByteus agent and team runs now support interrupting the active turn without terminating the run.
- After an interrupt, users can send follow-up messages on the same run or team session instead of starting over.

## Improvements
- Improved pending tool-approval handling so interrupt and terminate are distinct, reliable actions.
- Improved runtime memory after interruptions so accepted user input, streamed assistant output, and completed tool results remain available for safe follow-up turns.
- Improved team run recovery so targeted member follow-up works after interrupt, terminate, restore, and continue flows.

## Fixes
- Fixed legacy stop-generation fallback paths for native AutoByteus interrupt handling.
- Fixed several runtime-loop edge cases around active-turn cleanup, streaming finalization, tool approvals, external tool results, and provider-native continuations.
- Fixed server/WebSocket and frontend projection paths so interrupted and failed segments settle consistently.
