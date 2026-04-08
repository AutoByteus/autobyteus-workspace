# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The active streaming contract is already segment-first. The remaining work is a focused legacy cleanup across `autobyteus-ts` runtime/CLI paths plus directly related tests and ticket notes.
- Investigation Goal: Prove whether assistant chunk events are still part of any live production flow and identify the exact in-scope removal surface.
- Primary Questions To Resolve:
  - Is `notifyAgentDataAssistantChunk(...)` used in production?
  - Does any live frontend still accept `ASSISTANT_CHUNK`?
  - Which runtime/server/CLI files still retain chunk compatibility code?
  - Which tests are active versus stale duplicates?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-08 | Command | `rg -n "notifyAgentDataAssistantChunk|AGENT_DATA_ASSISTANT_CHUNK|StreamEventType\\.ASSISTANT_CHUNK|ASSISTANT_CHUNK|assistant_chunk" autobyteus-ts autobyteus-server-ts autobyteus-web` | Find every remaining chunk reference in source paths | Production references remain only in `autobyteus-ts`; `autobyteus-web` has no chunk protocol references; server keeps a defensive drop branch | No |
| 2026-04-08 | Code | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Verify the live incremental producer | Active streaming emits `notifyAgentSegmentEvent(...)`; no chunk notifier call exists in the live loop | No |
| 2026-04-08 | Code | `autobyteus-ts/src/agent/events/notifiers.ts` | Confirm whether chunk emission API still exists | `notifyAgentDataAssistantChunk(...)` still exists as a public notifier method | Yes |
| 2026-04-08 | Code | `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`, `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | Check internal stream typing/bridge | Internal stream model still maps `AGENT_DATA_ASSISTANT_CHUNK` to `StreamEventType.ASSISTANT_CHUNK` and exposes `streamAssistantChunks()` | Yes |
| 2026-04-08 | Code | `autobyteus-ts/src/cli/agent/cli-display.ts`, `autobyteus-ts/src/cli/agent-team/state-store.ts`, `autobyteus-ts/src/cli/agent-team/widgets/focus-pane-history.ts` | Check frontend-like consumers in repo | CLI and team UI state still keep chunk compatibility branches | Yes |
| 2026-04-08 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Verify server/runtime boundary behavior | Server drops `StreamEventType.ASSISTANT_CHUNK` by returning `null`; live conversion remains segment-only | No |
| 2026-04-08 | Code | `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Verify browser frontend protocol | Active web frontend protocol includes only `SEGMENT_START`, `SEGMENT_CONTENT`, `SEGMENT_END`, and explicit lifecycle events; no `ASSISTANT_CHUNK` type exists | No |
| 2026-04-08 | Code | `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` | Verify active websocket contract in tests | Active `.ts` integration test expects `SEGMENT_CONTENT`, not `ASSISTANT_CHUNK` | No |
| 2026-04-08 | Code | `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.js`, `autobyteus-server-ts/vitest.config.ts` | Distinguish stale test copies from active suite | Stale `.js` integration duplicate still expects `ASSISTANT_CHUNK`, but Vitest includes only `tests/**/*.test.ts`, so the `.js` file is not executed | Yes |
| 2026-04-08 | Command | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts --no-watch` | Confirm current live server behavior before cleanup | Converter test passes with chunk-drop assertion; active websocket integration test passes with segment-content message expectations | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
  - `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- Execution boundaries:
  - `autobyteus-ts` agent runtime emits internal notifier events.
  - `autobyteus-server-ts` converts `StreamEvent` into `AgentRunEvent` and websocket messages.
  - `autobyteus-web` consumes websocket protocol messages only.
- Owning subsystems / capability areas:
  - `autobyteus-ts` agent runtime + CLI streaming display
  - `autobyteus-server-ts` runtime conversion / websocket bridge
  - `autobyteus-web` streaming protocol and client dispatch
- Folder / file placement observations:
  - The remaining chunk code is concentrated in `autobyteus-ts` source + tests, which makes the cleanup scope narrow and coherent.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | `emitSegmentEvent` path | Live incremental assistant streaming | Emits segment events for reasoning and content; no live chunk emission path | Confirms segment-first runtime ownership |
| `autobyteus-ts/src/agent/events/notifiers.ts` | `notifyAgentDataAssistantChunk` | Legacy notifier API | Exists but has no in-repo production call site | Candidate for removal |
| `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | `StreamEventType.ASSISTANT_CHUNK` | Internal stream typing | Retained only for legacy compatibility/tests | Candidate for removal |
| `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts` | chunk mapping + `streamAssistantChunks()` | Internal event bridge | Still maps chunk event and exposes a chunk-only generator | Candidate for removal |
| `autobyteus-ts/src/cli/agent/cli-display.ts` | `handleAssistantChunk` branch | CLI rendering fallback | Dormant compatibility branch given no live chunk producer | Candidate for removal |
| `autobyteus-ts/src/cli/agent-team/state-store.ts` | `speakingAgents` chunk branch | Team CLI state | Marks speaking on chunk events only | Needs segment-based replacement or removal |
| `autobyteus-ts/src/cli/agent-team/widgets/focus-pane-history.ts` | chunk formatting fallback | Team history rendering | Handles chunk deltas in parallel with segments | Candidate for removal |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | chunk drop branch | Runtime boundary | Drops chunk events instead of forwarding them | May become removable if upstream type disappears |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | `ServerMessageType` union | Browser frontend protocol | No chunk message type exists | No frontend cleanup needed in web app |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-08 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts --no-watch` | Current active `.ts` server tests pass; converter drops chunk events and websocket integration asserts `SEGMENT_CONTENT` | Removal can target dead compatibility paths without changing live websocket contract |

## Constraints

- Technical constraints:
  - Segment-first flow must remain authoritative.
  - `ASSISTANT_COMPLETE_RESPONSE` / `ASSISTANT_COMPLETE` behavior must remain intact.
- Environment constraints:
  - Ticket work proceeds in dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-assistant-chunk-legacy-path`.
- Third-party / API constraints:
  - None discovered; this is an internal contract cleanup.

## Unknowns / Open Questions

- Unknown: Whether any external consumer outside this repo still imports `StreamEventType.ASSISTANT_CHUNK` from `autobyteus-ts`.
- Why it matters: Removing the enum/member is a source-breaking change for out-of-repo consumers.
- Planned follow-up: Limit cleanup to in-repo production/tests and record the contract tightening in docs/handoff.

## Implications

### Requirements Implications

- Requirements can be tightened from “unused in production” to “remove in-scope legacy chunk support entirely.”

### Design Implications

- The target design is simpler than current code: one incremental assistant path via `SEGMENT_EVENT`, plus final response completion.

### Implementation / Placement Implications

- Remove chunk event types, notifier API, stream bridge mappings, CLI compatibility branches, and chunk-based tests in `autobyteus-ts`.
- Keep the server/web contract segment-first; update server converter/tests only as needed to reflect removal of the upstream type.
- Delete or leave untouched stale excluded `.js` duplicate tests based on whether they remain in scope for cleanup completeness.
