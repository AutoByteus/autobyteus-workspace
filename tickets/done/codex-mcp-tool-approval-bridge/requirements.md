# Requirements

## Status

- Current Status: `Refined`
- Scope Classification: `Medium`
- Ticket: `codex-mcp-tool-approval-bridge`
- Last Updated: `2026-03-30`

## Goal / Problem Statement

Codex runtime MCP tool calls, specifically the configured `tts/speak` tool used as the live probe, need a stable and explainable approval and completion bridge inside our runtime layer. When `autoExecuteTools=false`, the runtime must surface a public tool-approval event with enough detail for the client to approve or deny the call. When `autoExecuteTools=true`, the runtime must auto-approve the internal Codex MCP approval handshake, keep the tool call visible in the frontend Activity/chat lifecycle, and normalize the completed MCP tool result into the public execution lifecycle so the frontend can end in a real terminal success or error state instead of falling back to `parsed`.

## In-Scope Use Cases

| Use Case ID | Name | Summary |
| --- | --- | --- |
| UC-001 | Manual MCP tool approval | Codex requests approval for `tts/speak`, the runtime emits a public approval event, the client approves, and the tool completes. |
| UC-002 | Auto-executed MCP tool approval bypass | Codex internally requests MCP approval for `tts/speak`, the runtime auto-accepts it, and the tool completes without a public approval request. |
| UC-003 | Tool-call visibility normalization | Raw Codex `mcpToolCall` items normalize into public `tool_call` segments so auto-executed MCP tools appear in frontend Activity/chat. |
| UC-004 | Terminal MCP completion normalization | Completed Codex `mcpToolCall` items normalize into public `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED` events using the provider completion payload. |
| UC-005 | Frontend terminal state parity | Auto-executed Codex MCP tools end in frontend `success` or `error` when Codex reports a terminal completion, instead of remaining in `parsed`. |

## Out-Of-Scope

- Changing Codex upstream protocol behavior so that `approvalPolicy="never"` suppresses all internal MCP elicitation request objects.
- Changing non-MCP Codex approval flows such as terminal command approvals or file-change approvals beyond regression protection.
- Changing the file-artifact lifecycle for `write_file` / `edit_file`; those continue to use `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` and are not part of this MCP completion ticket.
- Shipping a new public event type solely for auto-approved MCP tool calls in this ticket.

## Requirements

| Requirement ID | Description |
| --- | --- |
| R-001 | The Codex MCP approval request for a pending MCP tool call must resolve to the matching tool invocation and preserve the tool name and arguments. |
| R-002 | When `autoExecuteTools=false`, the runtime must emit public `TOOL_APPROVAL_REQUESTED` and `TOOL_APPROVED` events for MCP tool calls, matching existing tool-approval semantics. |
| R-003 | When `autoExecuteTools=true`, the runtime must auto-accept the internal MCP approval request and must not emit a public `TOOL_APPROVAL_REQUESTED` stop for the user. |
| R-004 | When `autoExecuteTools=true`, the public runtime contract must still surface a frontend-recognized tool activity entry for the Codex MCP tool call instead of leaving the Activity pane empty. |
| R-005 | When Codex emits a completed `mcpToolCall`, the runtime must normalize that completion into public `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED` using the provider completion payload rather than relying on `SEGMENT_END` or `TOOL_LOG` alone. |
| R-006 | Auto-executed Codex MCP tool calls must preserve parity with the existing frontend lifecycle contract by ending in `success` or `error` when Codex reports a terminal completion, instead of falling back to `parsed`. |
| R-007 | Durable tests must prove the manual and auto-exec paths with the real Codex runtime and the configured `tts/speak` MCP tool, including terminal success normalization. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Criterion |
| --- | --- | --- |
| AC-001 | R-001 | For a live Codex `tts/speak` tool call, the approval bridge identifies the correct pending MCP tool invocation and exposes `tool_name="speak"` plus the expected arguments. |
| AC-002 | R-002 | With `autoExecuteTools=false`, a live websocket run emits `TOOL_APPROVAL_REQUESTED`, accepts `APPROVE_TOOL`, emits `TOOL_APPROVED`, and then completes the `mcpToolCall`. |
| AC-003 | R-003 | With `autoExecuteTools=true`, a live websocket run completes the `mcpToolCall` without any public `TOOL_APPROVAL_REQUESTED` event. |
| AC-004 | R-004 | With `autoExecuteTools=true`, the frontend receives a tool-visible contract for the `tts/speak` call so the Activity pane shows a tool event instead of remaining at `0 Events`. |
| AC-005 | R-005 | For live manual and auto `tts/speak` runs, completed `mcpToolCall` provider payloads produce public `TOOL_EXECUTION_SUCCEEDED` events with the matching invocation id and result payload. |
| AC-006 | R-006 | With `autoExecuteTools=true`, the `tts/speak` Activity entry reaches terminal `success` when Codex reports a completed result, instead of remaining at `parsed`. |
| AC-007 | R-007 | Unit coverage exists for the Codex parser/bridge completion normalization and live Codex E2E coverage exists for the real `tts/speak` MCP path, including the auto-exec terminal-success case. |

## Constraints / Dependencies

- Codex app-server emits MCP approval as `mcpServer/elicitation/request`, not as the older command/file approval request methods.
- The project already has a configured `tts` MCP server and `speak` tool available in the Codex runtime test environment.
- Live Codex E2E coverage depends on `RUN_CODEX_E2E=1` and a working local Codex app-server environment.
- The existing runtime client contract expects normalized websocket events such as `TOOL_APPROVAL_REQUESTED`, `TOOL_APPROVED`, `TOOL_EXECUTION_*`, `SEGMENT_START`, `SEGMENT_END`, and `TOOL_LOG`.
- The current frontend Activity implementation only turns a tool green on `TOOL_EXECUTION_SUCCEEDED`; `SEGMENT_END` alone only advances `parsing -> parsed`.
- File writes and file updates already use `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` and are intentionally excluded from this MCP completion change.

## Confirmed Scope Decision

- The ticket contract is defined in terms of the public runtime/websocket event model.
- Internal Codex `mcpServer/elicitation/request` activity may still occur in auto mode and is not itself treated as a failure, as long as the runtime auto-resolves it, preserves frontend-visible tool activity, and does not expose a public approval stop.
- Codex `mcpToolCall` completion is the provider-side source of truth for MCP terminal success/failure in this ticket.
- A future ticket may explore granular Codex approval configuration if we decide that eliminating the internal elicitation object is required.

## Assumptions

- Using the configured live `tts/speak` MCP tool is the correct end-to-end probe for Codex MCP approval behavior.
- `approvalPolicy="never"` is still the intended Codex startup mode for `autoExecuteTools=true`, even if Codex internally emits an MCP elicitation request object before auto-resolution.
- Completed `mcpToolCall` payloads provide stable enough `status`, `error`, and `result` fields to drive public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` normalization.

## Open Questions / Risks

- Risk: Codex completion payload shape may evolve, especially around failure/error fields, so the parser must stay defensive.
- Risk: live E2E validation is environment-dependent and may fail for reasons unrelated to the bridge logic.
- Risk: if we emit terminal MCP success/failure without preserving the existing `SEGMENT_END`, frontend segment finalization or argument hydration could regress.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered By Use Case IDs |
| --- | --- |
| R-001 | UC-001, UC-002 |
| R-002 | UC-001 |
| R-003 | UC-002 |
| R-004 | UC-002, UC-003, UC-005 |
| R-005 | UC-001, UC-002, UC-004 |
| R-006 | UC-002, UC-005 |
| R-007 | UC-001, UC-002, UC-003, UC-004, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Intended Stage 7 Scenario Focus |
| --- | --- |
| AC-001 | Manual live `tts/speak` approval websocket scenario validates tool name, arguments, and invocation matching. |
| AC-002 | Manual live `tts/speak` approval websocket scenario validates the public approval handshake. |
| AC-003 | Auto-exec live `tts/speak` websocket scenario validates absence of public approval request. |
| AC-004 | Auto-exec live `tts/speak` scenario validates that the frontend-visible activity contract is populated instead of remaining empty. |
| AC-005 | Manual and auto live `tts/speak` scenarios validate terminal `TOOL_EXECUTION_SUCCEEDED` normalization from completed `mcpToolCall` provider payloads. |
| AC-006 | Auto-exec live `tts/speak` scenario validates that the frontend-visible tool activity ends in terminal `success` rather than `parsed`. |
| AC-007 | Unit tests plus live Codex E2E tests validate durable coverage. |
