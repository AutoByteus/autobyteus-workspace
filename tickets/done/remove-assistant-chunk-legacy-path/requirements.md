# Requirements

- Status: `Design-ready`
- Ticket: `remove-assistant-chunk-legacy-path`
- Scope Classification: `Small`

## Goal / Problem Statement

Remove the legacy assistant chunk event flow so the system no longer emits, bridges, or consumes `AGENT_DATA_ASSISTANT_CHUNK` / `StreamEventType.ASSISTANT_CHUNK` in steady state. The runtime contract should stay segment-first, with no dead chunk fallback code retained in scope.

## In-Scope Use Cases

- `UC-001`: Core local runtime streams assistant text and reasoning through segment events only.
- `UC-002`: CLI and other in-repo consumers render assistant output from segment events and final response events without assistant chunk compatibility branches.
- `UC-003`: Server/runtime adapters drop or avoid chunk events, and tests assert the segment-only contract.

## Out Of Scope

- Changing assistant-complete response semantics.
- Redesigning unrelated stream events.
- Removing historical ticket notes outside this ticket.

## Requirements

### `R-001`

Production code must not emit `EventType.AGENT_DATA_ASSISTANT_CHUNK`.

### `R-002`

Production code must not convert internal events into `StreamEventType.ASSISTANT_CHUNK` for active streaming flows.

### `R-003`

The browser/web frontend contract must remain segment-only with no `ASSISTANT_CHUNK` protocol type.

### `R-004`

Remaining in-scope chunk compatibility code, helpers, and tests must be removed or rewritten to the segment-first contract unless a live production dependency is proven.

## Acceptance Criteria

### `AC-001`

Repository search in active source paths finds no production call site of `notifyAgentDataAssistantChunk(...)`.

### `AC-002`

Segment events remain the only live incremental assistant streaming path in `autobyteus-ts` agent handling and CLI rendering.

### `AC-003`

`autobyteus-server-ts` continues to reject or ignore assistant chunk events rather than surfacing them to websocket clients, and the active `.ts` websocket tests validate segment content messages.

### `AC-004`

The cleanup removes dead chunk-specific branches from in-scope production files and updates unit/integration tests accordingly.

## Constraints / Dependencies

- Preserve the current segment-first streaming behavior.
- Do not reintroduce backward-compatibility shims for chunk events.
- Keep changes limited to the runtime/CLI/server streaming stack and directly related tests/docs in scope.

## Assumptions

- The currently active web frontend is `autobyteus-web`, not the legacy CLI rendering paths in `autobyteus-ts`.
- The active server test surface is the `.ts` Vitest suite, not stale `.js` duplicates excluded by config.

## Open Questions / Risks

- Some CLI-only chunk branches may still exist as dormant fallbacks and could require coordinated removal across multiple files.
- Test fixtures may encode chunk events and need migration to segment events or deletion.
- Removing exported chunk types from `autobyteus-ts` may be source-breaking for any out-of-repo consumer, so this ticket assumes in-repo ownership is the decision boundary.

## Requirement Coverage

| Requirement ID | Use Case(s) |
| --- | --- |
| `R-001` | `UC-001`, `UC-003` |
| `R-002` | `UC-001`, `UC-002` |
| `R-003` | `UC-003` |
| `R-004` | `UC-001`, `UC-002`, `UC-003` |

## Acceptance Criteria To Validation Intent

| Acceptance Criteria ID | Validation Intent |
| --- | --- |
| `AC-001` | Search-based proof plus targeted tests |
| `AC-002` | CLI/unit tests against segment-only handling |
| `AC-003` | Server converter + websocket tests |
| `AC-004` | Diff review + targeted test pass |
