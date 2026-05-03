# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Fix the Claude Agent SDK runtime stream rendering regression where assistant text produced after one or more tool calls can be rendered earlier in the conversation/focus surface, including above tool-call cards. The user-provided screenshots show final-looking conclusion text above `Bash`/`Read` tool cards; the user suspects the conclusion is text emitted after tool calls and that the bug resembles the earlier Codex-runtime segment identity issue.

## Investigation Findings

- Claude runtime text deltas are currently emitted from `ClaudeSession.executeTurn()` with `id: options.turnId` for every text delta and for the terminal text-completed event.
- `ClaudeSessionEventConverter` maps those text events to frontend `SEGMENT_CONTENT` / `SEGMENT_END` events with `segment_type: "text"` while preserving the same id.
- The frontend `segmentHandler.findSegmentById()` intentionally appends future deltas with the same stream segment identity to the existing segment. Therefore if Claude emits text before a tool and more text after the tool within the same turn, the post-tool text appends to the first text segment and appears above the intervening tool cards.
- Captured Claude raw event logs under `tickets/done/claude-sdk-tool-arguments-activity/logs/claude-raw-events/` show the SDK provides more precise identities: assistant chunks include `message.id` and wrapper `uuid`; post-tool assistant text has a distinct assistant message id from earlier tool-use chunks.
- Codex-runtime text/reasoning handling already uses stable item ids where available and only coalesces by turn for a deliberately scoped reasoning fallback. Claude should follow the same provider-owned segment identity model instead of using the whole turn id as a text segment id.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `ClaudeSession` uses turn id as the only text segment id; frontend segment lookup correctly coalesces by id; raw Claude SDK chunks expose finer assistant message/block identity.
- Requirement or scope impact: The fix must change Claude runtime text segment identity at the provider adapter/session boundary, not add a frontend runtime-specific workaround.

## Recommendations

Introduce a Claude-owned text segment identity/projector in the Claude runtime session path. It should derive text segment ids from Claude assistant message/content-block identity and close each text segment at its true content-block/message boundary. Remove the aggregate turn-id text segment path for UI-facing `SEGMENT_CONTENT`/`SEGMENT_END` events. Preserve the existing frontend segment handler behavior and use backend tests plus a frontend contract regression to prove post-tool text becomes a distinct later text segment.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A Claude Agent SDK turn emits assistant text before a tool call, then tool-call lifecycle events, then assistant text after the tool result.
- UC-002: A Claude Agent SDK turn emits multiple assistant text chunks/content blocks around one or more tool calls.
- UC-003: The same stream is consumed by single-agent and team websocket paths.
- UC-004: Raw trace/memory and rehydrated history preserve separate assistant text segments rather than collapsing a whole turn into one text segment.
- UC-005: Existing Codex-runtime text, tool, and reasoning segment behavior remains unchanged.

## Out of Scope

- Changing Claude SDK tool execution semantics or approval behavior unrelated to text segment identity/order.
- Runtime-specific frontend rendering branches or UI restyling.
- Redesigning the whole websocket protocol.
- Adding backward-compatible dual id paths for old Claude text behavior.

## Functional Requirements

- REQ-001: Claude Agent SDK text segments must use stable provider-derived segment ids that distinguish separate assistant message/content-block text units within the same turn.
- REQ-002: Claude post-tool assistant text must not reuse the same stream segment id as earlier pre-tool assistant text from the same turn.
- REQ-003: Text segment completion must occur at the actual text segment boundary so downstream memory/history can preserve text/tool/text ordering.
- REQ-004: Tool-call lifecycle items and text items must preserve provider emission order through Claude session handling, server forwarding, and frontend focus/history rendering.
- REQ-005: The fix must not change frontend segment identity semantics or regress Codex-runtime segment coalescing and tool lifecycle behavior.
- REQ-006: Executable validation must cover the failing Claude text-tool-text sequence and prove the corrected ids/order.

## Acceptance Criteria

- AC-001: Given a Claude stream sequence `assistant text A -> tool_use/tool_result -> assistant text B` in one turn, the backend emits text `SEGMENT_CONTENT` events for A and B with different ids.
- AC-002: Given the same sequence through frontend stream handlers, the resulting segment order is `text(A), tool, text(B)`.
- AC-003: Given two deltas for the same Claude assistant text block/message, they coalesce into one text segment and do not fragment into multiple rendered text blocks.
- AC-004: Given text segments completed before and after a tool call, raw trace/memory or run projection can record assistant/tool/assistant order without waiting until turn completion to flush all text.
- AC-005: Existing Codex runtime tests for text/reasoning/tool lifecycle continue to pass, or targeted unchanged-scope tests are run and recorded.

## Constraints / Dependencies

- Must use the dedicated task worktree `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Must keep runtime-specific identity extraction in the Claude backend/session layer.
- Must avoid compatibility wrappers or dual-path behavior for the old turn-id text segment model.
- Must work with Claude SDK full assistant message chunks observed in local logs and not preclude partial `stream_event` chunks described by the installed SDK types.

## Assumptions

- The screenshot's leading conclusion text was emitted after at least one displayed tool call and was moved upward because it appended to an earlier same-turn text segment.
- Claude SDK assistant `message.id` plus content block index, with wrapper `uuid` as fallback, is stable enough for text segment identity.
- Frontend coalescing by stream segment identity is correct and should remain unchanged.

## Risks / Open Questions

- Partial streaming events may require tracking `message_start`/`content_block_delta`/`content_block_stop` indices if enabled later; the design must account for this even if current logs show full assistant messages.
- Claude history projection currently relies on SDK session messages and may not show tool cards with the same fidelity as live stream; executable validation should include the live stream path first and memory/projection if practical.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002
- REQ-002 -> UC-001
- REQ-003 -> UC-004
- REQ-004 -> UC-001, UC-002, UC-003
- REQ-005 -> UC-003, UC-005
- REQ-006 -> UC-001, UC-002, UC-004, UC-005

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates backend text identity root cause.
- AC-002 validates the observed UI/focus ordering symptom.
- AC-003 validates intentional coalescing is retained within one text block.
- AC-004 validates durable replay/memory ordering impact.
- AC-005 validates no Codex regression.

## Approval Status

Design-ready based on explicit user bug report and investigation evidence; awaiting architecture review.
