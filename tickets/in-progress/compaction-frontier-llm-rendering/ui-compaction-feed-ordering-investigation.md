# UI Compaction Feed Ordering Investigation

Status: Analysis complete — follow-up implementation recommended if center-feed compaction rows remain visible.
Date: 2026-06-02

## Reported behavior

In the Daily Assistant run, completed compaction cards appear grouped near the bottom of the center agent monitor while the assistant/tool content continues to be rendered above them. The desired behavior is either:

1. compaction rows appear chronologically with the surrounding assistant/tool content, or
2. compaction rows are not shown in the center feed if true chronological placement is not feasible.

## Current code evidence

- `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`
  - Builds `feedItems` from two different sources:
    - `props.conversation.messages` as whole message rows.
    - `props.compactionActivities` as compaction rows.
  - Sorts the combined rows by `timestampMs`.
  - This is chronological only at conversation-message granularity, not at segment/event granularity.

- `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
  - `findOrCreateAIMessage()` reuses the last incomplete AI message.
  - The AI message timestamp is set once when the first segment creates the message.
  - Later tool calls, tool results, continuations, and assistant text in the same active turn can continue appending to that same AI message.

- `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`
  - `handleCompactionStatus()` upserts a `CompactionActivity` but does not close/split the currently open AI message.
  - Therefore a compaction status can be timestamped after the AI message started while later visible segments still append to the earlier-timestamped AI message.

- `autobyteus-web/services/runHydration/runProjectionConversation.ts`
  - Historical projection hydration groups assistant-side entries into one pending AI message until a user message flushes it.
  - It has no visible or hidden compaction-boundary separator that would flush assistant grouping.

- `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts`
  - Explicitly drops `event.kind === "compaction"` from the conversation projection.
  - That means compaction events cannot currently influence historical conversation grouping.

## Runtime evidence from Daily Assistant 4141

Inspected:
`/Users/normy/.autobyteus/server-data/memory/agents/daily_assistant_general_agent_4141`

The run is one large `turn_0001` with assistant/tool activity from approximately `2026-06-02T13:40:04` through `2026-06-02T13:43:36`.
Native compaction/archive boundaries occurred during that same long turn, for example archive segments completed around:

- `2026-06-02T13:40:47` for 21 records
- `2026-06-02T13:40:56` for 11 records
- `2026-06-02T13:41:10` for 11 records
- `2026-06-02T13:41:23` for 5 records
- `2026-06-02T13:41:38` for 7 records
- `2026-06-02T13:43:33` for 48 records

Because the center feed has a single open AI message whose timestamp is the first assistant segment timestamp, the entire visible assistant/tool content sorts before compaction rows even when later segments were produced after compaction.

## Root-cause classification

This is a frontend timeline granularity/design gap, not a backend compaction execution failure.

The code attempts chronological sorting, but it mixes:

- coarse whole-message rows, and
- fine lifecycle/activity rows.

A compaction row cannot be placed “inside” a whole AI message unless the AI message is split at the boundary or the monitor is rendered at segment/event granularity.

## Recommendation

Preferred correct fix: split the center feed at compaction boundaries.

Live path:

- In `handleCompactionStatus()`, when a semantic/native compaction lifecycle row is accepted, close or boundary-split the currently open AI message before/at the compaction row.
- Subsequent LLM continuation/tool/assistant segments then create a new AI message with a post-compaction timestamp via `findOrCreateAIMessage()`.
- Preserve existing compaction activity identity/upsert behavior so `requested -> started -> completed/failed` remains one row.

Historical/hydration path:

- Keep compaction rows as activities, but also expose a hidden conversation boundary marker or equivalent grouping signal from run-history projection.
- `buildConversationFromProjection()` should flush the pending AI message at a compaction boundary without rendering a duplicate conversation message.
- If native AutoByteus compactions should appear after reopen, run-history projection must also derive durable native compaction activity/boundary entries from the archive manifest or another durable source.

Lower-risk fallback:

- Remove compaction rows from the center `AgentConversationFeed` and keep them in the Activity panel/status surface only.
- This avoids misleading order but gives up in-feed chronological visibility.

Not recommended as sole fix:

- Sorting by `updatedAt` or mutating the AI message timestamp during streaming. That would cause message rows to jump and still cannot place compaction rows inside a message.

## Suggested validation

Add frontend tests for:

1. live compaction status closes/splits the current AI message so continuation content renders below the compaction row;
2. activity identity remains stable across `requested -> completed` updates;
3. historical projection with a compaction boundary flushes assistant grouping; and
4. no duplicate compaction row is rendered when both conversation boundary and activity row exist.

## Refined lifecycle/display timing note

A `requested` / `queued` compaction status is not the same as an executed compaction boundary.

For tool-call turns, the expected backend sequence is:

1. LLM response streams assistant/tool-call segments to the frontend.
2. The backend receives final response/token usage and detects token pressure.
3. Backend marks compaction required and may emit `requested` / `queued`.
4. Pending tool calls execute and their results are recorded/displayed.
5. Before the next LLM continuation dispatch, pending compaction executes.
6. The working context is reset, then the continuation LLM call starts.

Therefore the center feed should not render a `queued` card as an in-conversation boundary between the LLM-issued tool call and its tool result. `queued` belongs in the Activity/status surface. The center feed should render only an actual execution boundary (`started`, `completed`, or `failed` depending on UX choice) and should order that boundary by execution time, not by the original request time.

Current `agentActivityStore.upsertCompactionActivity()` preserves the original activity `timestamp` across updates. That is healthy for a lifecycle Activity row created at request time, but it is not sufficient for center-feed boundary ordering. If the same `CompactionActivity` object is reused for both surfaces, add an execution/display timestamp such as `boundaryTimestamp` / `timelineTimestamp` / `executionTimestamp`, or have `AgentConversationFeed` derive its row only from execution-phase timestamps. Otherwise a completed card can remain anchored to its queued time.

For no-tool responses, immediate compaction after the final assistant response is acceptable because there is no pending tool-call/result suffix to protect before continuation.

## Recommended UI phase behavior

Decision recommendation:

- Do not render `requested` / `queued` compaction as a center-feed card.
- Render the center-feed compaction card only when compaction execution begins or reaches a terminal execution state.
- Continue to allow the right-side Activity panel to show the full lifecycle if operational visibility is useful.

Target center-feed phase rules:

| Phase | Center feed | Activity panel |
| --- | --- | --- |
| `requested` / queued | Hidden | Optional: show small lifecycle row/status |
| `started` | Show `Compacting memory…`; split/close current AI visual block | Show/update lifecycle row |
| `completed` | Update same center row to `Memory compacted`; if `started` was not observed, create row at completion timestamp | Show/update lifecycle row |
| `failed` | Show center error row if compaction execution failed or blocks continuation | Show/update lifecycle row |

Required ordering contract:

For tool-call turns, backend should emit execution-phase compaction status only after pending tool-result display events have been emitted/recorded and before post-compaction LLM continuation events begin. This gives the center feed a natural order:

```text
assistant/tool-call segment(s)
tool-result segment(s)
Compacting memory… / Memory compacted
post-compaction assistant continuation
```

Frontend implementation implication:

- `handleCompactionStatus()` should not split the current AI message for `requested`.
- On first execution-phase status (`started`, or terminal `completed`/`failed` if no `started` arrived), close the current AI visual block and record a center-feed boundary timestamp from execution time, not request time.
- The existing Activity lifecycle row may preserve the original request timestamp; the center feed needs a separate execution/timeline timestamp.

## Activity identity, visual-block split, and resume-file behavior

Activity side:

- Semantic/native AutoByteus compaction lifecycle events carry `compaction_operation_id`.
- `compactionActivityProjection.ts` resolves the activity id as `compaction:operation:<compaction_operation_id>` when available.
- `agentActivityStore.upsertCompactionActivity()` updates an existing compaction row with the same `activityId` rather than appending duplicate rows; it preserves the original `timestamp` and overwrites `updatedAt`/phase/details.
- Therefore `requested -> started -> completed/failed` should be one Activity row/card for the same operation, not multiple cards, as long as the backend supplies a stable operation id.

Center-feed visual split:

- Marking the current frontend `AIMessage.isComplete = true` is a display grouping operation. It affects whether later streamed segments append to the current visual block or create a new visual block.
- It must not be used as a backend/memory/LLM boundary, and it does not change LLM-facing working-context messages by itself.
- Side effect to account for: completion also affects auto-scroll/message grouping and token-cost display for that visual row. This is acceptable if treated as a UI-only compaction timeline boundary, but tests should cover it.

Raw traces and resume/history:

- During normal run execution, `MemoryManager` writes raw trace rows to `raw_traces.jsonl` for user, assistant, tool-call, tool-result, and tool-continuation events.
- Working context is stored separately in `working_context_snapshot.json`; it is the LLM prompt source after restore/continuation, not the normal UI history source.
- When compaction executes, `WorkingContextCompactor.compactWorkingContext()` writes episodic/semantic memory entries, then calls `store.pruneRawTracesById(..., true)` for raw trace ids covered by compacted working-context message units.
- `RunMemoryFileStore.pruneRawTracesById(..., true)` archives those removed active raw traces into `raw_traces_archive/*.jsonl` and records the archive segment in `raw_traces_archive_manifest.json` with `boundary_type: native_compaction`; then it rewrites active `raw_traces.jsonl` with only kept traces.
- `PendingCompactionExecutor` then rebuilds and persists `working_context_snapshot.json` from compacted memory + retained/protected recent messages.
- On frontend resume/reopen, run history uses `LocalMemoryRunViewProjectionProvider`, which reads the complete raw-trace corpus with `includeArchive: true` and builds the display conversation/activity projection from raw traces, not from `working_context_snapshot.json`.
- Current projection drops `event.kind === "compaction"` from conversation rows and only has provider-boundary compaction projection from raw trace markers; native archive-manifest boundaries are not yet a visible/splitting conversation marker. This is why historical reopen needs an explicit native compaction boundary projection if the center-feed split must persist after restart.

## History projection scope decision

Refined decision:

- Historical/reopen projection does not need to render native compaction cards in the center feed.
- It is acceptable if compaction cards are live-only UI feedback, as long as historical raw-trace replay remains complete and ordered.
- Therefore this UI fix should not require native archive-manifest boundary projection solely for visible compaction cards.

History acceptance should instead focus on:

1. `LocalMemoryRunViewProjectionProvider` reads the complete raw-trace corpus with archive inclusion.
2. Archived traces and active traces are merged/deduped and sorted by timestamp/turn/sequence.
3. Conversation projection renders user, assistant, reasoning, tool-call, and tool-result content from that corpus without dropping compacted history.
4. Omitting compaction lifecycle cards from historical center replay is acceptable and avoids unnecessary UI/projection complexity.

Live center-feed compaction rows remain useful because they explain the current pause while the user is watching the run. Historical compaction rows provide much less value because replay correctness is about the actual work trace, not the internal memory-maintenance lifecycle.

## Final recommended scope direction

For the current UI issue, prioritize a live-run center-feed fix and avoid a larger historical compaction-card projection refactor.

Recommended implementation scope:

1. Keep Activity panel lifecycle behavior as-is: one compaction row keyed by stable `compaction_operation_id`, updated through `requested -> started -> completed/failed`.
2. In the center feed, hide `requested`/queued compaction rows.
3. In the center feed, create/update a compaction boundary row only for execution phases (`started`, `completed`, `failed` when execution failed/blocked continuation).
4. Split the current frontend AI visual block only at the first execution-phase boundary, never at queued/requested.
5. Use a separate execution/timeline timestamp for the center row instead of the Activity row's original request timestamp.
6. Do not add native compaction cards to historical center replay for this change. Historical replay acceptance is complete ordered raw-trace rendering from active + archived traces.

Rationale:

- Persisting native compaction cards for history is not just a small display change if the card must be correctly placed. It would require native archive/status projection plus either hidden conversation boundary markers or segment-level center-feed rendering; otherwise the historical card can reproduce the same coarse-AI-message ordering bug.
- Native compaction durability already exists in `raw_traces_archive_manifest.json` for archive/compaction boundaries. If future product value justifies historical Activity-panel compaction rows, synthesize them from this manifest rather than adding LLM-facing messages or polluting replay with product-internal text.
- The live card is valuable because it explains a pause while the run is happening. Historical cards have much lower value than preserving and rendering the actual user/assistant/tool raw traces correctly.
