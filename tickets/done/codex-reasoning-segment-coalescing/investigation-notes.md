# Investigation Notes

## Context
- Bug: live Codex runs still show many consecutive `Thinking` blocks for a single assistant turn.
- User report: backend logs were captured, but UI still shows fragmented reasoning segments.

## Sources Consulted
- `/Users/normy/.autobyteus/server-data/logs/manual-server-20260225-180959.log`
- `/Users/normy/.codex/sessions/2026/02/25/rollout-2026-02-25T16-00-02-019c9550-6fdb-7841-a61c-e67aed089b21.jsonl`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/memory/agents/be75fb85-5c6c-4d36-82b7-d66d0b65d28c/run_manifest.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`

## Findings
- Backend startup log confirms runtime and data path, but does not include per-chunk segment-id diagnostics.
- Codex session JSONL for the same thread shows many reasoning updates in a single turn (multiple `agent_reasoning` texts in sequence).
- Thread history projection for this run shows one reasoning item containing many summary entries; therefore the runtime stream can emit multiple reasoning chunks during one turn.
- Adapter already prefers `item_id`/`item.id` over envelope `id`, but real events may still lack stable item identity on some reasoning chunks.
- Without a stable id, frontend fallback creates new `think` segments repeatedly.

## Root Cause
- For reasoning chunk events that miss stable item identifiers, adapter segment-id resolution can still fragment by per-event identity, causing multiple `SEGMENT_CONTENT` ids and many UI thinking blocks.

## Constraints
- Keep Codex-specific normalization in backend adapter.
- Do not add Codex-conditional rendering logic in frontend.
- Keep existing segment contract (`SEGMENT_CONTENT` with `id`, `delta`, optional `segment_type`).

## Open Questions
- None blocking for this fix. Turn-scoped coalescing is sufficient even when item ids are absent.

## Follow-Up Investigation (Log Instrumentation)
- Date: 2026-02-25
- Trigger: user still observed repeated Thinking blocks and requested source-level logs for real-run verification.

### Additional Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- `/Users/normy/.autobyteus/server-data/logs/manual-server-20260225-175348.log`
- `/Users/normy/.autobyteus/server-data/logs/manual-server-20260225-180959.log`

### Additional Findings
- Existing backend logs do not include per-reasoning segment-id resolution decisions.
- Without adapter-level instrumentation, runtime `eventId`/`itemId`/`turnId` selection cannot be validated from log files.

### Decision
- Add opt-in adapter instrumentation behind `CODEX_RUNTIME_ADAPTER_DEBUG=1` to log:
  - resolution strategy (`stable-item-id`, `turn-cache-hit`, `turn-cache-miss`, `fallback`),
  - `eventId`, `itemId`, `turnId`,
  - final `resolvedSegmentId`,
  - cache size at decision time.
