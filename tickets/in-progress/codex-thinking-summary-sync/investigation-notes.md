# Investigation Notes

## Context
- Ticket: Codex runtime thinking summary appears as empty UI blocks (`Thinking` chip + empty body), and Activity panel remains empty.
- User expectation: if Codex provides reasoning summary, it should render; if not provided, UI should not show empty reasoning blocks.

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/runtime-event-message-mapper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/agentStreaming/protocol/segmentTypes.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
- Local live probe against real Codex app-server using `CodexAppServerClient`.

## Live Probe Findings (Real Codex App Server)
- Codex emits lifecycle events such as `item/started` and `item/completed`.
- For reasoning items, emitted payload observed:
  - `item.type = "reasoning"`
  - `summary: []`
  - `content: []`
- For assistant text, deltas arrive via `item/agentMessage/delta`.
- Current adapter maps reasoning `item/started` to `SEGMENT_START` and reasoning `item/completed` to `SEGMENT_END`, even when reasoning has no content.

## Follow-up Findings (Web Search vs Thinking, 2026-02-25)
- Codex web search is represented by dedicated web-search events, not reasoning events:
  - `item/started` with `item.type = "webSearch"`
  - `item/completed` with `item.type = "webSearch"` and query/action payload
  - mirror runtime events: `codex/event/web_search_begin` and `codex/event/web_search_end`
- Thinking blocks are sourced from reasoning events in the same turn, primarily:
  - `item/reasoning/summaryTextDelta`
  - `item/reasoning/summaryPartAdded`
  - reasoning snapshots on `item/completed` where `item.type = "reasoning"`
- Evidence source:
  - `autobyteus-server-ts/logs/manual-server-20260225-201321.log`
- Validation lock added:
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
  - New tests cover web-search lifecycle mapping and explicit preservation of `codex/event/web_search_begin` / `codex/event/web_search_end`.

## Root Cause
1. Backend forwards reasoning start/end events even when reasoning payload is empty.
2. Frontend creates a `think` segment at `SEGMENT_START`, receives no content, then keeps an empty segment after `SEGMENT_END`.
3. Result: blank thinking blocks in UI.

## Secondary Gaps
- Frontend fallback segment creation for `SEGMENT_CONTENT` without prior `SEGMENT_START` always creates text segments; it does not honor `segment_type`.
- Backend currently does not extract reasoning summary snapshots from `item` payload for cases where summary may be present only at completion.

## Constraints
- Keep separation of concerns:
  - Backend adapter owns Codex-to-platform event normalization.
  - Frontend segment handler owns display-state cleanup.
- Avoid introducing Codex-specific UI branching in frontend.

## Open Questions
- Whether Codex will consistently emit non-empty summary in production depends on runtime/model behavior; system must tolerate empty summary.

## Decision
- Implement backend normalization to suppress empty reasoning lifecycle-only events and surface reasoning snapshot content when available.
- Implement frontend safeguard to prune empty think segments on end.
- Add/extend backend and frontend tests to lock behavior.
