# Future-State Runtime Call Stack (v1)

## UC-RS-001 Turn-Scoped Coalescing For Missing Item IDs
1. `agent-stream-handler.ts:forwardCodexRuntimeEvent(...)` receives Codex runtime event.
2. `runtime-event-message-mapper.ts:map(...)` delegates to `codex-runtime-event-adapter.ts`.
3. `codex-runtime-event-adapter.ts:mapSegmentDelta(..., "reasoning")` calls `resolveReasoningSegmentId(payload)`.
4. `resolveReasoningSegmentId` finds no stable item id, resolves `turnId`, and reuses cached segment id for that turn.
5. Emits `SEGMENT_CONTENT` with consistent `id`.
6. Frontend appends deltas into one existing think segment.

## UC-RS-002 Stable Item ID Priority
1. Reasoning event contains `item.id` or `itemId`.
2. `resolveReasoningSegmentId` returns stable item id directly.
3. Adapter emits `SEGMENT_CONTENT` with stable id.

## UC-RS-003 Turn Completion Reset
1. Adapter handles `turn/completed`.
2. `clearReasoningSegmentForTurn(payload)` removes cached turn mapping.
3. Later reasoning events can establish a fresh turn mapping.

## UC-RS-004 Regression Safety
1. Non-reasoning methods keep existing `resolveSegmentId` behavior.
2. Existing tool/text mappings remain unchanged.
