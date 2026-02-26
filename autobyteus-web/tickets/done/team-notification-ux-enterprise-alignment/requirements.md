# Requirements

## Status

- Current Status: `Design-ready`
- Updated On: `2026-02-22`

## Goal / Problem Statement

Align personal branch notification and activity UX with enterprise improvements so inter-agent messages are readable and low-noise, and tool/core activity indicators show accurate tool names/status.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Multi-file frontend rendering and state updates.
  - Core library inter-agent message formatting and tool schema behavior update.
  - Cross-repo tests required (`autobyteus-web` and `autobyteus-ts`).

## In-Scope Use Cases

- UC-001: Inter-agent chat message displays readable sender name in conversation stream.
- UC-002: Raw machine sender ids are hidden behind teammate fallback when display mapping is unavailable.
- UC-003: Inter-agent metadata (`messageType`, intended role) is available as secondary details, not forced inline.
- UC-004: Team monitor passes sender-id -> display-name mapping into conversation rendering.
- UC-005: Tool activity list avoids malformed invocation ids and upgrades placeholder tool names from lifecycle payloads.
- UC-006: Core `send_message_to` allows omitted `message_type` with default `direct_message`.
- UC-007: Core inter-agent handler emits concise LLM-facing message format without verbose metadata block.
- UC-008: Core inter-agent message processing treats `message_type` as free-form string (non-empty), not enum-instance usage.

## Acceptance Criteria

1. Inter-agent message surface
- Conversation row renders `From <ReadableName>: <content>` by default.
- `Type: ...` is not always shown inline; details are collapsed/secondary.

2. Sender-name mapping
- Team workspace computes member name mapping by agent id and passes it through monitor -> AIMessage -> InterAgentMessageSegment.
- Fallback label avoids exposing raw hash ids as primary sender text.

3. Tool indicator integrity
- Activity store rejects malformed invocation ids.
- Lifecycle handler can replace placeholder `tool_call`/`MISSING_TOOL_NAME` with concrete tool name.

4. Core message behavior
- `send_message_to.message_type` is optional and defaults to `direct_message` when omitted.
- Inter-agent input prompt to recipient agent is concise and does not include legacy `Message Type:` block.
- Inter-agent runtime handling/logging/notifier payloads read `messageType` as plain string.

5. Test coverage
- Web tests cover inter-agent segment rendering behavior, sender mapping propagation, and activity/tool lifecycle synchronization.
- Core tests cover optional `message_type` defaulting, updated inter-agent handler message template, and plain-string message type flow.

## Constraints / Dependencies

- Depends on existing team context/member mapping in runtime state.
- Must remain compatible with existing event payload shapes.

## Assumptions

- `message_type` remains present in internal events for compatibility/analytics even if de-emphasized in UI.
- `message_type` is intentionally free-form string (no enum restrictions at core runtime).
- Existing tool lifecycle payloads include valid `tool_name` in normal flow.

## Risks

- UI regressions if sender mapping is missing in some monitor paths.
- Potential mismatch if downstream code still assumes required `message_type` in manual tool invocations.
