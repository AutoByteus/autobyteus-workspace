# Requirements

## Status
- Design-ready

## Goal / Problem Statement
- Ensure consecutive Codex reasoning chunks belonging to one turn are rendered as one continuous thinking segment instead of many fragmented blocks.

## Scope Triage
- Scope: Small
- Rationale: single backend adapter change + mapper unit tests.

## In-Scope Use Cases
- UC-RS-001: Reasoning chunk events in the same turn without stable item ids must map to one segment id.
- UC-RS-002: If a stable reasoning item id exists, it must remain the primary segment id source.
- UC-RS-003: Turn completion resets turn-level coalescing state.
- UC-RS-004: Non-reasoning segment mapping behavior remains unchanged.

## Acceptance Criteria
- `requirement_id: RS-001-turn-coalescing`
  - Given two reasoning summary events for the same `turnId` and missing `itemId`/`item.id`
  - When mapped
  - Then both produce the same `SEGMENT_CONTENT.payload.id`.
- `requirement_id: RS-002-stable-item-id-priority`
  - Given reasoning events with `item.id`
  - Then mapped segment id equals that stable item id.
- `requirement_id: RS-003-turn-reset`
  - Given turn-level coalescing created for `turnId=X`
  - When `turn/completed` for `turnId=X` is received
  - Then the next reasoning event for `turnId=X` may establish a new segment id.
- `requirement_id: RS-004-regression-safety`
  - Existing runtime mapper unit suite passes.

## Constraints / Dependencies
- Must remain compatible with current frontend segment handler.
- Must pass Vitest suite for mapper.

## Assumptions
- `turnId` is present on at least the fragmented chunk path needing coalescing.

## Risks
- Over-coalescing if distinct reasoning streams share one turn id (acceptable tradeoff for current UI behavior).

## Requirement Coverage Map
- RS-001 -> UC-RS-001
- RS-002 -> UC-RS-002
- RS-003 -> UC-RS-003
- RS-004 -> UC-RS-004
