# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Claude Agent SDK runtime must emit the same canonical Autobyteus tool lifecycle contract as Codex for first-party MCP tools. The browser `open_tab` issue was fixed by normalizing Claude browser MCP events/results before the frontend consumes them. A second related bug remains for the team communication MCP tool: `send_message_to` appears in the frontend Activity panel only as `Parsed`, even after the message is delivered. Earlier Codex work fixed the same class of problem by ensuring dynamic tool calls fan out into both segment events and terminal tool lifecycle events. Claude SDK must now do the same for its first-party team MCP tool.

The frontend tool-card and activity components should remain display-only. They should receive canonical tool lifecycle states from backend event conversion, not infer execution/success from presentation logic.

## Investigation Findings

### Browser MCP bug already covered by this ticket

- The failing Claude browser run was `/Users/normy/.autobyteus/server-data/memory/agents/96ee8dd0-3585-429a-ae05-ffbc0af8d5c3` with runtime kind `claude_agent_sdk`.
- Its `open_tab` trace succeeded and returned browser tab id `983e18`, but the result shape was Claude MCP text content blocks rather than the standard browser result object.
- The successful Codex comparison run `/Users/normy/.autobyteus/server-data/memory/agents/dab27e5f-48ca-42bc-8582-ab2a187f92dc` emitted a direct object result with `tab_id`, matching the existing frontend browser handler contract.
- The current ticket implementation has already made `open_tab` work for Claude SDK in the user's local build.

### New `send_message_to` parsed-only bug

- User reproduced on 2026-05-02 in team run `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_1c44ae06` with member run `professor_9fde020d19f62422` using runtime kind `claude_agent_sdk`.
- Screenshot shows Activity row `send_message_to` stuck at `PARSED`.
- `ClaudeSendMessageToolCallHandler` emits canonical `ITEM_ADDED` for `send_message_to`, so frontend receives a `SEGMENT_START` and creates a parsed activity.
- `ClaudeSendMessageToolCallHandler` also emits canonical `ITEM_COMMAND_EXECUTION_COMPLETED` and `ITEM_COMPLETED`, but `ClaudeSessionEventConverter` currently suppresses all `send_message_to` `TOOL_*` lifecycle events because `isClaudeSendMessageToolName(...)` matches both canonical `send_message_to` and raw MCP `mcp__autobyteus_team__send_message_to`.
- `ClaudeSendMessageToolCallHandler` does not currently emit canonical `ITEM_COMMAND_EXECUTION_STARTED`, so there is no executing state either.
- `ClaudeSessionToolUseCoordinator` separately suppresses raw SDK `mcp__autobyteus_team__send_message_to` lifecycle chunks. That suppression is still correct because the dedicated team tool handler should be the owner of canonical `send_message_to` lifecycle events.
- Codex runtime tests already show the intended shape: `dynamicToolCall` start fans out into `SEGMENT_START` + `TOOL_EXECUTION_STARTED`; completion fans out into `TOOL_EXECUTION_SUCCEEDED`/`FAILED` + `SEGMENT_END`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Claude backend conversion suppresses canonical `send_message_to` terminal lifecycle events, while Codex emits terminal lifecycle events for the same first-party team tool. The frontend correctly remains parsed because it only received a parsed segment event.
- Requirement or scope impact: Extend the backend Claude MCP canonicalization fix to include first-party team `send_message_to` lifecycle events. Keep frontend display/activity components passive.

## Recommendations

- Keep the browser MCP canonicalization already implemented in this ticket.
- Add canonical `ITEM_COMMAND_EXECUTION_STARTED` emission in `ClaudeSendMessageToolCallHandler` when a `send_message_to` invocation starts.
- Split send-message tool-name handling so raw SDK MCP `mcp__autobyteus_team__send_message_to` noise remains suppressed, but canonical handler-emitted `send_message_to` lifecycle events pass through `ClaudeSessionEventConverter`.
- Normalize raw team MCP names to canonical `send_message_to` only at backend/conversion boundaries when emitting supported canonical events/metadata.
- Add unit tests mirroring the existing Codex behavior: start -> segment + executing; success -> success + segment end; failure -> error + segment end; raw SDK MCP lifecycle remains suppressed to avoid duplicates.
- Do not modify `ToolCallIndicator.vue`, `ActivityItem.vue`, or frontend status derivation for this bug.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Claude SDK browser MCP `open_tab` emits canonical browser tool events/results and the Browser panel opens/focuses the tab.
- UC-002: Claude SDK team MCP `send_message_to` emits canonical start and terminal lifecycle events so Activity progresses beyond `Parsed` to `Executing` and then `Success` or `Error`.
- UC-003: Raw SDK MCP `mcp__autobyteus_team__send_message_to` tool-use/tool-result lifecycle noise does not create duplicate UI entries.
- UC-004: Codex runtime browser and `send_message_to` behavior remains unchanged.
- UC-005: Frontend display components render backend-provided canonical tool names/states without runtime-specific MCP presentation logic.

## Out of Scope

- Changing external Claude Agent SDK MCP naming semantics.
- Changing BrowserBridgeServer, BrowserShellController, or frontend display component ownership.
- Adding frontend `ToolCallIndicator.vue` / `ActivityItem.vue` MCP prefix stripping or state repair.
- Reworking non-first-party MCP tools globally.
- Migrating old persisted historical raw events unless a backend/projection-level normalization path is explicitly added during implementation.

## Functional Requirements

- REQ-001: Backend Claude browser MCP conversion must emit canonical browser tool names and standard browser result objects before frontend consumption.
- REQ-002: Backend Claude team `send_message_to` handling must emit canonical `ITEM_COMMAND_EXECUTION_STARTED` in addition to canonical segment start.
- REQ-003: `ClaudeSessionEventConverter` must convert canonical `send_message_to` lifecycle events into `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, and `TOOL_EXECUTION_FAILED` instead of suppressing them.
- REQ-004: Raw SDK MCP `mcp__autobyteus_team__send_message_to` lifecycle noise must remain suppressed or otherwise deduplicated so one logical send-message invocation produces one Activity entry.
- REQ-005: Successful `send_message_to` delivery must produce a terminal success payload with canonical `tool_name: "send_message_to"`, invocation id, arguments, and delivery result.
- REQ-006: Failed/rejected `send_message_to` delivery must produce terminal failure with canonical `tool_name: "send_message_to"` and a useful error message.
- REQ-007: Existing Codex runtime browser and team-tool behavior must be preserved.
- REQ-008: Frontend display/activity components must remain passive; no MCP-specific display/state workaround is introduced in `ToolCallIndicator.vue` or `ActivityItem.vue`.

## Acceptance Criteria

- AC-001: Given a Claude canonical `send_message_to` start emitted by `ClaudeSendMessageToolCallHandler`, backend conversion produces `SEGMENT_START` and `TOOL_EXECUTION_STARTED` with `tool_name: "send_message_to"`.
- AC-002: Given a successful Claude canonical `send_message_to` completion, backend conversion produces `TOOL_EXECUTION_SUCCEEDED` and `SEGMENT_END`; the frontend Activity row reaches `SUCCESS` rather than staying `PARSED`.
- AC-003: Given a failed/rejected Claude canonical `send_message_to` completion, backend conversion produces `TOOL_EXECUTION_FAILED` and `SEGMENT_END`; the frontend Activity row reaches `ERROR`.
- AC-004: Given raw SDK MCP lifecycle chunks/events named `mcp__autobyteus_team__send_message_to`, they are suppressed/deduplicated and do not create an extra duplicate Activity row.
- AC-005: Given Claude browser MCP `open_tab` content-block result, backend conversion emits canonical `open_tab` with object `result.tab_id`, and the existing frontend browser handler focuses the Browser panel.
- AC-006: `ToolCallIndicator.vue` and `ActivityItem.vue` are not changed to strip MCP prefixes or infer execution status for this bug.

## Constraints / Dependencies

- Must preserve Electron shell/window isolation for browser visibility.
- Must preserve existing Codex runtime event fan-out behavior.
- Must distinguish canonical handler-owned `send_message_to` events from raw SDK MCP send-message events.
- Must keep first-party MCP canonicalization scoped to known Autobyteus browser/team tools.
- Must not hide backend lifecycle defects with frontend presentation fixes.

## Assumptions

- `ClaudeSendMessageToolCallHandler` is the authoritative owner for logical team-message delivery events in Claude SDK sessions.
- `ClaudeSessionToolUseCoordinator` raw SDK send-message suppression exists to avoid duplicate entries and should remain for raw MCP chunks.
- Frontend Activity status progression depends on `TOOL_EXECUTION_*` events, while segment events alone produce `Parsed` activity.

## Risks / Open Questions

- If the Claude SDK sometimes reports the team tool under canonical `send_message_to` in raw chunks, coordinator suppression may need to remain broad while converter suppression must be source/name-shape aware.
- If canonical and raw events share different invocation ids, tests should ensure one logical handler-owned invocation appears in UI and raw SDK ids do not leak as duplicates.
- Historical parsed-only rows may remain parsed unless replayed or projection-level normalization/migration is added.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-007
- UC-002: REQ-002, REQ-003, REQ-005, REQ-006, REQ-008
- UC-003: REQ-004
- UC-004: REQ-007
- UC-005: REQ-008

## Acceptance-Criteria-To-Scenario Intent

- AC-001/AC-002 validate the exact parsed-only Claude `send_message_to` regression.
- AC-003 validates failed delivery status correctness.
- AC-004 validates duplicate prevention for raw SDK MCP tool-use noise.
- AC-005 keeps the browser bug fix covered in the expanded ticket.
- AC-006 preserves the frontend display boundary.

## Approval Status

Refined on 2026-05-02 after the user confirmed Claude browser `open_tab` now works and requested adding the Claude SDK `send_message_to` parsed-only lifecycle bug to the same ticket.
