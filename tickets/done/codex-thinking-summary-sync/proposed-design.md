# Proposed Design (v1)

## Current State (As-Is)
- Backend maps Codex `item/added` + `item/completed` directly into segment lifecycle events regardless of reasoning payload emptiness.
- Frontend creates/retains think segment once started; empty content is not pruned at completion.
- Fallback segment creation on content-without-start defaults to text.

## Target State (To-Be)
- Backend Codex adapter becomes strict about reasoning payload quality:
  - suppress lifecycle-only reasoning events when payload has no summary/content,
  - emit reasoning `SEGMENT_CONTENT` when summary snapshot text exists.
- Frontend segment handler performs lifecycle cleanup:
  - remove empty think segments on `SEGMENT_END`.
- Frontend fallback segment creation becomes `segment_type` aware.

## Architecture Direction
- Keep provider/adapter boundary:
  - Codex-specific normalization remains backend-only.
  - Frontend remains runtime-agnostic and uses normalized segment payload shape.

## Change Inventory
- Modify: `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- Modify: `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
- Modify: `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- Modify tests:
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`
  - `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts`

## API/Contract Notes
- `SEGMENT_CONTENT` payload may include optional `segment_type` for fallback typing.
- No public external API change.

## Use-Case Coverage Matrix
- UC-REQ-001: Primary path covered = Yes, fallback/error = N/A
- UC-REQ-002: Primary path covered = Yes, fallback/error = N/A
- UC-REQ-003: Primary path covered = Yes, fallback/error = N/A
- UC-REQ-004: Primary path covered = Yes, fallback/error = Yes (regression tests)
