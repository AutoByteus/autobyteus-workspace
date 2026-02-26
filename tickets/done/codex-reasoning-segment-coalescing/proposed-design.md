# Proposed Design (v1)

## Current State (As-Is)
- Reasoning chunks are mapped with `resolveSegmentId(payload)`.
- If stable item ids are missing, per-event ids can fragment segment identity.
- UI shows many thinking blocks because each new id creates another reasoning segment.

## Target State (To-Be)
- Adapter introduces turn-scoped reasoning segment coalescing:
  - Prefer stable reasoning item id (`segment_id`, `item_id`, `itemId`, `item.id`).
  - If missing, coalesce by `turnId`/`turn_id`/`turn.id`.
  - Cache turn->segment id mapping with bounded size.
  - Clear mapping when `turn/completed` is received for that turn.

## Architecture Direction
- Keep responsibility in backend runtime adapter (no frontend runtime-specific rules).

## Change Inventory
- Modify: `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts`
- Modify: `autobyteus-server-ts/tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts`

## Use-Case Coverage Matrix
- UC-RS-001: Primary Yes, fallback Yes, error N/A
- UC-RS-002: Primary Yes, fallback N/A, error N/A
- UC-RS-003: Primary Yes, fallback N/A, error N/A
- UC-RS-004: Primary Yes, fallback Yes, error N/A
