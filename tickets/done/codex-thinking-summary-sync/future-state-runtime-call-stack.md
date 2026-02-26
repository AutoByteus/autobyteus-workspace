# Future-State Runtime Call Stack (v1)

## UC-REQ-001 Empty Reasoning Should Not Render Empty Thinking Block
1. `codex-runtime-event-adapter.ts:map(...)`
2. Receives `item/started` or `item/completed` for reasoning item
3. Adapter inspects reasoning snapshot payload
4. If no reasoning text available -> emits no-op segment content (empty delta) for transport compatibility
5. `agent-stream-handler.ts:forwardCodexRuntimeEvent(...)` forwards mapped message
6. `AgentStreamingService.ts:dispatchMessage(...)` routes to `handleSegmentContent` or `handleSegmentEnd`
7. `segmentHandler.ts:handleSegmentEnd(...)` prunes empty think segment if one exists
8. UI conversation has no blank thinking block

## UC-REQ-002 Non-Empty Reasoning Summary Should Render
1. `codex-runtime-event-adapter.ts:map(...)`
2. Receives reasoning completion payload with summary/content text
3. Adapter emits `SEGMENT_CONTENT` with `segment_type=reasoning` and `delta=<summary>`
4. `AgentStreamingService.ts` dispatches to `handleSegmentContent`
5. `segmentHandler.ts:handleSegmentContent(...)`
6. If segment exists -> append; else create fallback segment by payload `segment_type`
7. UI renders think segment with summary text

## UC-REQ-003 Fallback Segment Type Preservation
1. `SEGMENT_CONTENT` arrives without prior start
2. `segmentHandler.ts:handleSegmentContent(...)` cannot find segment by id
3. `createFallbackSegment(...)` uses payload `segment_type`
4. For reasoning, creates think segment via `createSegmentFromPayload`
5. Delta is appended to correct segment kind

## UC-REQ-004 Regression Safety
1. Existing text/tool event paths unchanged in adapter
2. Existing stream handler and protocol parsing unchanged except optional `segment_type`
3. Existing tests pass
