# Post-Delivery Analysis: Local Replay Missing Thinking Rows

## Date

2026-05-17

## User-observed symptom

The local-only history build is more consistent overall, but a remaining reload bug is visible:

- During live Codex/Daily Assistant execution, `Thinking` rows appear between tool calls and assistant text.
- After closing/restarting the app and reloading the same history, the tool calls and assistant text remain, but the `Thinking` rows are missing.

## Reproduced / inspected run

Latest matching Daily Assistant run in the Electron data dir:

- `runId`: `ff0b9fcd-3bb5-4f33-b806-02baf05e1922`
- local trace path: `/Users/normy/.autobyteus/server-data/memory/agents/ff0b9fcd-3bb5-4f33-b806-02baf05e1922/raw_traces.jsonl`
- backend: Electron server on `http://127.0.0.1:29695/graphql`

Evidence summary saved at:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/live-repro-evidence/daily-assistant-thinking-loss-analysis.json`

## Data findings

The local replay trace contains user, assistant, and tool rows, but no reasoning rows:

```json
{
  "rawTraceTypes": [
    "user",
    "assistant",
    "tool_call",
    "tool_result",
    "assistant",
    "tool_call",
    "tool_result",
    "assistant"
  ],
  "rawReasoningCount": 0,
  "projectionConversationKinds": [
    "message",
    "message",
    "tool_call",
    "message",
    "tool_call",
    "message"
  ],
  "projectionReasoningCount": 0
}
```

Backend projection exactly mirrors the local trace: no `reasoning` rows are returned. This proves the current loss boundary is **local replay persistence**, not frontend rendering.

## Focused backend probe

A temporary Vitest probe simulated the relevant event sequence:

1. `TURN_STARTED`
2. reasoning `SEGMENT_CONTENT`
3. tool start/success
4. assistant text `SEGMENT_CONTENT` + `SEGMENT_END`
5. no `TURN_COMPLETED`

Current persisted trace types were:

```text
["tool_call", "tool_result", "assistant"]
```

The reasoning content was not persisted.

Probe log:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/live-repro-evidence/reasoning-persistence-probe.log`

## Code path findings

Relevant implementation:

- `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts`
- `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`

`raw-trace-to-historical-replay-events.ts` already projects `traceType === "reasoning"` into canonical `kind: "reasoning"` rows. Therefore projection would render thinking if the local trace contained it.

`RuntimeMemoryEventAccumulator` buffers reasoning segments and writes them only when:

- the reasoning segment is explicitly flushed by `SEGMENT_END`; or
- `TURN_COMPLETED` flushes remaining open segments.

Codex live reasoning can be visible in the frontend before either of those conditions has happened. In the tested/restarted run, assistant text and tool calls were persisted because they have explicit text/tool boundaries, but reasoning remained buffered and was lost across restart.

## Root cause

The local-only display design needs one additional invariant:

> Any UI-visible reasoning/thinking segment must become durable in the local replay trace before the app can lose in-memory stream state. Persistence must not depend solely on `TURN_COMPLETED` or reasoning `SEGMENT_END`, because Codex may show reasoning between tool calls while the run is still active.

Current code violates that invariant for Codex reasoning segments.

## Recommended fix direction

Fix local replay persistence, not frontend rendering and not Codex native fallback.

`RuntimeMemoryEventAccumulator` should flush open reasoning segments for a turn before writing the next visible boundary, especially:

- before writing a tool call for the same turn;
- before writing assistant text for the same turn;
- on assistant-complete / run idle / run termination where applicable;
- still on `TURN_COMPLETED` as today.

This preserves local-only source authority and makes history reload match the live display more closely.

## Required regression coverage

1. Reasoning `SEGMENT_CONTENT` followed by a tool call persists a `reasoning` raw trace before the `tool_call` raw trace, even without `TURN_COMPLETED`.
2. Reasoning `SEGMENT_CONTENT` followed by assistant text `SEGMENT_END` persists a `reasoning` raw trace before the assistant trace, even without `TURN_COMPLETED`.
3. The raw-trace projection returns canonical `reasoning` rows in the same order.
4. Frontend projection hydration renders those canonical reasoning rows as `Thinking` segments after reload.
