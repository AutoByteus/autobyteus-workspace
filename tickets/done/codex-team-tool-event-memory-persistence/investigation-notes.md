# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; separate task worktree refreshed to latest tracked `origin/personal` on 2026-05-01.
- Current Status: Pivot investigation complete; requirements and design rewritten for Codex dynamic tool lifecycle fix; revised scope approved by user on 2026-05-01.
- Investigation Goal: Determine why Codex team `send_message_to` remains `parsed` in Activity instead of becoming `success`, clarify `SEGMENT_*` vs `TOOL_*` semantics, and design the upstream lifecycle fix before any memory fallback work.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The code change is localized mostly to Codex event conversion and tests, but it changes a core normalized event contract for all Codex dynamic tools and affects UI Activity, memory persistence, and live E2E expectations.
- Scope Summary: Generalize Codex `dynamicToolCall` mapping so dynamic tools, especially `send_message_to`, emit real `TOOL_EXECUTION_STARTED` and terminal `TOOL_EXECUTION_SUCCEEDED` / `FAILED` events in addition to display segments.

## Request Context

The user identified that `send_message_to` is always shown as `parsed` and never as `success` in the Activity UI. Through discussion we clarified:

- `SEGMENT_START(tool_call)` means the UI/display segment exists.
- `SEGMENT_END(tool_call)` means the display segment has finished parsing/finalization.
- `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` are the real tool execution lifecycle events.
- Therefore, a `send_message_to` item stuck at `parsed` likely means the UI saw `SEGMENT_START` and `SEGMENT_END`, but did not receive terminal `TOOL_EXECUTION_SUCCEEDED` / `FAILED`.

The user asked to pivot the ticket from memory fallback to this fundamental lifecycle bug first, requested investigation using existing Codex event logging and E2E/roundtrip tests, then approved proceeding with the revised design on 2026-05-01.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence`
- Current Branch: `codex/codex-team-tool-event-memory-persistence`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence`
- Bootstrap Base Branch: `origin/personal`
- Original Branch Base: `5e632b7f492ce7c1ede055b5d797b6f21903c67c`
- Refresh Result: `git merge --ff-only origin/personal` succeeded on 2026-05-01; branch now includes `origin/personal` commit `2919e6d2c9203804caee4a10b21309d0fddbde47`.
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: The dedicated worktree lacks `node_modules`, so live tests were run from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` after confirming the codebase state is latest `origin/personal`; authoritative artifacts remain in the dedicated ticket worktree.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-01 | Command | `git status --short --branch`; `git merge --ff-only origin/personal` | Refresh ticket worktree to latest base. | Branch fast-forwarded to `origin/personal`; only ticket artifacts are untracked. | No |
| 2026-05-01 | Prior artifact | Existing `requirements.md`, `investigation-notes.md`, `design-spec.md` in ticket folder | Understand previous memory-only scope. | Previous scope treated `SEGMENT_START(tool_call)` as memory fallback; user pivoted to lifecycle correctness first. | Rewrite artifacts. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Confirm stream mapping. | `SEGMENT_*` and `TOOL_*` are forwarded as distinct server message types. | No |
| 2026-05-01 | Frontend code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Confirm why UI shows parsed. | `SEGMENT_END` finalizes tool segments and changes `parsing` to `parsed` if no terminal lifecycle status exists. | No |
| 2026-05-01 | Frontend code | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Confirm success source. | `TOOL_EXECUTION_SUCCEEDED` is the event that applies terminal success and updates Activity to `success`. | No |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Inspect Codex item conversion. | Generic `dynamicToolCall` starts emit `SEGMENT_START`; generic completions emit `SEGMENT_END`; browser tools alone get terminal lifecycle via special-case `isBrowserToolExecutionPayload`. | Fix design target. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Compare MCP path. | `mcpToolCall` completions emit local `LOCAL_MCP_TOOL_EXECUTION_COMPLETED`, which maps to terminal lifecycle; dynamic tools lack equivalent general terminal mapping except browser special-case. | Consider separate follow-up only if MCP start lifecycle is needed. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Inspect local dynamic tool execution. | `handleDynamicToolCallRequest` executes registered handlers and responds to Codex, but does not emit lifecycle events directly. Raw Codex item events are available afterward. | Prefer converter mapping first. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts` | Verify `send_message_to` implementation. | `send_message_to` is registered as a Codex dynamic tool; successful delivery returns `createCodexDynamicToolTextResult("Delivered message to ...", true)`. | Lifecycle should map this success. |
| 2026-05-01 | Test | `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Inspect live team expectations. | Test waits for `SEGMENT_START` and `INTER_AGENT_MESSAGE`, then explicitly expects zero `TOOL_*` lifecycle events for sender `send_message_to`. This encodes the now-wrong behavior. | Update test. |
| 2026-05-01 | Test | `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Inspect generic dynamic tool expectations. | Custom dynamic tool test waits for `SEGMENT_START`, `SEGMENT_END`, `TOOL_LOG`, then explicitly expects zero lifecycle noise. This also encodes wrong behavior. | Update test. |
| 2026-05-01 | Command | In dedicated worktree: `pnpm test -- --help` and attempted `pnpm vitest ...` | Check whether tests can run in ticket worktree. | Worktree has no `node_modules`; build/test blocked with `tsc: command not found` / `vitest` unavailable. | Tests run from dependency-ready superrepo for investigation. |
| 2026-05-01 | Command | In superrepo: `RUN_CODEX_E2E=1 CODEX_THREAD_EVENT_DEBUG=1 CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-lifecycle-debug/raw CODEX_BACKEND_EVENT_LOG_DIR=/tmp/codex-lifecycle-debug/backend ./node_modules/.bin/vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t "converts a custom dynamic tool call" --reporter=dot` | Live probe generic dynamic tool events with raw and normalized logging. | Test passed under current expectations; raw logs show `dynamicToolCall` started/completed with `success: true`; normalized logs show only `SEGMENT_START`, `SEGMENT_END`, `TOOL_LOG`, no lifecycle. | Use as evidence for lifecycle mapping. |
| 2026-05-01 | Evidence | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence/evidence/codex-dynamic-tool-raw-event-probe.filtered.jsonl` | Durable filtered raw event evidence. | Captures `function_call`, `dynamicToolCall` start/completion, and `function_call_output` for live custom dynamic tool. | No |
| 2026-05-01 | Evidence | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence/evidence/codex-dynamic-tool-normalized-events.before-fix.json` | Durable normalized event evidence before fix. | Shows missing `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` for dynamic tool. | No |
| 2026-05-01 | Live data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_26cbed0c/.../raw_traces.jsonl` | Recheck original symptom. | Professor memory has `run_bash` lifecycle traces but no `send_message_to`; student received messages, proving delivery can succeed without sender lifecycle traces. | Revalidate after lifecycle fix. |

## Current Behavior / Current Flow

### Generic Codex dynamic tool current path

1. Model emits raw response `function_call` for a dynamic tool such as `echo_dynamic` or `send_message_to`.
2. Codex app-server emits `item/started` with `item.type = "dynamicToolCall"`, `item.status = "inProgress"`.
3. `CodexItemEventConverter` emits `SEGMENT_START(tool_call)`.
4. Local dynamic tool request handler runs the registered tool handler and responds to Codex.
5. Codex app-server emits `item/completed` with `item.type = "dynamicToolCall"`, `item.status = "completed"`, `item.success = true/false`, and `contentItems`.
6. `CodexItemEventConverter` emits only `SEGMENT_END` for generic dynamic tools.
7. Raw response `function_call_output` becomes `TOOL_LOG`.
8. Frontend receives display lifecycle and diagnostic logs, but no terminal tool lifecycle, so Activity remains `parsed`.
9. Memory receives no lifecycle `tool_call` / `tool_result` for generic dynamic tools.

### Browser special case

Browser dynamic tools currently receive terminal lifecycle from `isBrowserToolExecutionPayload(...)` in `codex-item-event-converter.ts`. This is a partial workaround and should be replaced or subsumed by generalized dynamic-tool lifecycle mapping.

### MCP comparison

`mcpToolCall` completions already have a local completion bridge in `codex-thread-notification-handler.ts` that emits `LOCAL_MCP_TOOL_EXECUTION_COMPLETED`, which converts to terminal `TOOL_EXECUTION_SUCCEEDED` / `FAILED`. The immediate `send_message_to` issue is not that path; `send_message_to` is exposed as a Codex dynamic tool.

## Target Behavior / Target Flow

1. Codex raw `item/started(dynamicToolCall)` arrives.
2. Converter emits `SEGMENT_START(tool_call)` for display.
3. Converter also emits `TOOL_EXECUTION_STARTED` for real lifecycle, same invocation id/tool/args.
4. Codex raw `item/completed(dynamicToolCall)` arrives.
5. Converter emits terminal `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED` from `item.success` / status / parser helpers.
6. Converter emits `SEGMENT_END` to finalize display metadata.
7. Frontend Activity reaches `success` or `error` from lifecycle events.
8. Memory recorder persists one `tool_call` and one `tool_result` through existing lifecycle handling.

## Evidence Summary

Filtered raw dynamic tool probe showed this raw sequence:

```text
rawResponseItem/completed item.type=function_call name=echo_dynamic call_id=call_Nx...
item/started item.type=dynamicToolCall id=call_Nx... tool=echo_dynamic status=inProgress
item/completed item.type=dynamicToolCall id=call_Nx... tool=echo_dynamic status=completed success=true contentItems=[{ text: "HELLO_DYNAMIC" }]
rawResponseItem/completed item.type=function_call_output call_id=call_Nx... output=HELLO_DYNAMIC
```

Current normalized events for the same invocation:

```text
SEGMENT_START(tool_call) id=call_Nx... tool=echo_dynamic args={value:"HELLO_DYNAMIC"}
SEGMENT_END id=call_Nx...
TOOL_LOG invocation_id=call_Nx... log_entry=HELLO_DYNAMIC
```

Missing normalized events:

```text
TOOL_EXECUTION_STARTED invocation_id=call_Nx... tool_name=echo_dynamic
TOOL_EXECUTION_SUCCEEDED invocation_id=call_Nx... tool_name=echo_dynamic result=HELLO_DYNAMIC
```

## Decision Log

- Decision: Pivot from memory fallback to upstream lifecycle correctness first.
  - Reason: If `send_message_to` truly executes, the backend must emit real lifecycle events. Memory completeness should come from lifecycle first.
- Decision: Use Codex `dynamicToolCall` item events as the first source for lifecycle mapping.
  - Reason: Raw event probe proves app-server provides start/completion/success data. This avoids adding local synthetic events unless raw events prove insufficient.
- Decision: Keep `SEGMENT_*` and `TOOL_*` as separate event families.
  - Reason: Frontend and memory semantics become clear: display segment lifecycle vs execution lifecycle.
- Decision: Defer segment-start memory fallback.
  - Reason: It may still be useful for parsed-only providers, but it should not mask missing execution lifecycle for local dynamic tools.

## Risks / Open Questions

- If Codex emits `item/completed(dynamicToolCall)` for all dynamic tools reliably, converter mapping is sufficient. If not, local lifecycle events from `handleDynamicToolCallRequest` may be needed as a follow-up fallback.
- Failure result shape needs validation for dynamic tools returning `success: false`; current parser helpers likely cover `item.success === false` and text result extraction, but tests must pin this down.
- Existing browser dynamic lifecycle behavior must not duplicate terminal events after generalization.
- Tests that currently assert no lifecycle events will fail and must be intentionally updated.

## Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence/design-spec.md`
- Evidence, raw filtered: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence/evidence/codex-dynamic-tool-raw-event-probe.filtered.jsonl`
- Evidence, normalized before fix: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-team-tool-event-memory-persistence/tickets/done/codex-team-tool-event-memory-persistence/evidence/codex-dynamic-tool-normalized-events.before-fix.json`
