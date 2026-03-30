# Implementation

## Status

- Ticket: `codex-mcp-tool-approval-bridge`
- Scope Classification: `Medium`
- Current Status: `Completed`
- Last Updated: `2026-03-30`

## Delivered Changes

| Change ID | Status | Files | Result |
| --- | --- | --- | --- |
| C-001 | Completed | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` | completed Codex `mcpToolCall` notifications now emit a local terminal MCP completion event before pending-call cleanup |
| C-002 | Completed | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | local MCP completion now normalizes to public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` under the existing runtime contract |
| C-003 | Completed | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`, `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | durable unit and live websocket E2E coverage now assert terminal success normalization for manual and auto `tts/speak` |
| C-004 | Completed | previously delivered ticket scope kept intact | the earlier approval bridge, `mcpToolCall -> tool_call` visibility normalization, and auto-mode `TOOL_APPROVED` behavior remain intact and are now extended with terminal success normalization |

## Root Cause And Fix Summary

- Codex was already emitting completed `mcpToolCall` payloads with terminal `status`, `error`, and `result` fields for the real `tts/speak` MCP tool.
- Our runtime layer only normalized terminal tool execution events for `commandexecution`, not for `mcpToolCall`.
- As a result, Codex MCP tools reached the frontend as:
  - visible `tool_call` segment
  - optional approval lifecycle
  - `SEGMENT_END`
  - `TOOL_LOG`
- That contract is insufficient for a green terminal state because the frontend intentionally marks a tool `success` only on `TOOL_EXECUTION_SUCCEEDED`; `SEGMENT_END` alone leaves the tool at `parsed`.
- The fix stays on existing ownership boundaries:
  - `codex-thread-notification-handler.ts` owns raw provider completion intake and pending-call lifecycle
  - `codex-thread-event-converter.ts` owns routing into the public conversion layer
  - `codex-item-event-converter.ts` owns public runtime event shaping
- No new frontend workaround was required for the parsed-state bug. Once the backend emitted the correct terminal public event, the existing frontend lifecycle contract had the information it needed.

## Final Verification Evidence

- Backend units:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - Result: `2 files passed`, `9 tests passed`
- Frontend lifecycle confirmation:
  - `pnpm -C autobyteus-web exec vitest run services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`
  - Result: `1 file passed`, `10 tests passed`
  - Relevant proof: existing frontend handler marks a tool `success` on `TOOL_EXECUTION_SUCCEEDED`
- Final authoritative live Codex websocket validation:
  - `RUN_CODEX_E2E=1 RUNTIME_RAW_EVENT_DEBUG=1 CODEX_THREAD_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-thread-events-stage7-mcp-success-7490 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t 'routes Codex MCP tool approval over websocket for the speak tool|auto-executes the Codex speak MCP tool without approval requests'`
  - Result: `1 file passed`, `2 tests passed | 12 skipped`

## Size / Structure Gate Notes

- Changed source files in the terminal-completion re-entry remain within the Stage 8 hard limit:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` -> `314` effective non-empty lines
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` -> `72` effective non-empty lines
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` -> `27` effective non-empty lines
- Unchanged large source files from earlier ticket scope remain within the effective non-empty Stage 8 limit:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` -> `487`
  - `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` -> `485`
- No changed source file crossed the `>220` changed-line delta gate in this re-entry.

## Completion Gate

- Stage 6 complete: `Yes`
- Backward-compatibility wrapper introduced: `No`
- Legacy behavior retained in scope: `No`
- Ownership drift introduced: `No`
- Ready for Stage 7 closure: `Yes`
