# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial retrospective workflow draft | Captured the implemented Codex MCP approval bridge design, ownership boundaries, and test-driven validation shape | 1 |
| v2 | Reopened investigation after user verification found missing auto-exec frontend activity | Added the cross-layer visibility fix: normalize `mcpToolCall` to `tool_call`, emit auto-approved lifecycle signals, and preserve monotonic frontend tool status | 3 |
| v3 | Reopened investigation after user verification found auto-exec MCP tools still ending in `parsed` | Added terminal MCP completion normalization: emit a synthetic local completion event from the Codex notification boundary, convert it to public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED`, and preserve the existing `SEGMENT_END` path for segment finalization | 5 |

## Artifact Basis

- Investigation Notes: `tickets/done/codex-mcp-tool-approval-bridge/investigation-notes.md`
- Requirements: `tickets/done/codex-mcp-tool-approval-bridge/requirements.md`
- Requirements Status: `Refined`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

The reopened scope now confirms a narrower remaining gap: Codex already emits completed `mcpToolCall` provider payloads for manual and auto MCP tools, but our runtime still reduces those completions to `SEGMENT_END` plus `TOOL_LOG`, so the frontend falls back to `parsed` instead of terminal `success` or `error`. The corrected design keeps the existing Codex thread/events split, preserves the previously fixed visibility path, and adds one synthetic local MCP completion event at the notification boundary so the public runtime contract emits `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` while still retaining `SEGMENT_END` for segment finalization.

## Goal / Intended Change

Provide a durable, test-backed cross-layer design for Codex MCP tool approvals that:
- correctly correlates the internal approval request with the pending `tts/speak` tool call,
- preserves the existing manual approval contract,
- auto-resolves the internal approval handshake in auto mode without a public approval stop,
- makes the auto-executed tool visible in the frontend Activity/chat lifecycle,
- normalizes completed Codex `mcpToolCall` items into terminal public success/failure lifecycle events,
- preserves parity with the project's existing runtime observability for auto-executed tools,
- keeps ownership boundaries aligned with the existing Codex thread/event/frontend reducer responsibilities.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the silent-completion path where completed `mcpToolCall` items only produce `SEGMENT_END` / `TOOL_LOG` and never emit a terminal public execution event.
- Required action: keep the previously removed `mcpToolCall -> text` fallback and frontend status-downgrade path out of the target design.
- Gate rule: design is invalid if it still relies on frontend fallback behavior to infer terminal MCP success or failure.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Match MCP approval requests to the correct pending tool call | AC-001 | Tool name and arguments resolve to the right invocation | UC-001, UC-002 |
| R-002 | Surface public manual approval events | AC-002 | Manual websocket path emits approval-request and approval-accepted events | UC-001, UC-003 |
| R-003 | Auto-resolve internal approval in auto mode without a public approval stop | AC-003 | Auto websocket path completes without public `TOOL_APPROVAL_REQUESTED` | UC-002 |
| R-004 | Surface frontend-visible auto-exec tool activity | AC-004 | Auto path yields at least one frontend-recognized tool activity entry | UC-002, UC-003, UC-005 |
| R-005 | Normalize completed MCP tool calls into terminal public success/failure | AC-005 | Manual and auto websocket paths emit terminal `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` from completed `mcpToolCall` payloads | UC-001, UC-002, UC-004 |
| R-006 | Preserve frontend terminal-state parity for auto-executed MCP tools | AC-006 | Auto path ends in terminal `success` / `error` instead of fallback `parsed` | UC-002, UC-005 |
| R-007 | Preserve durable parser/bridge/E2E coverage | AC-007 | Unit and live E2E coverage exist for the real speak-tool terminal-lifecycle path | UC-001, UC-002, UC-003, UC-004, UC-005 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Existing structure already splits startup config, thread request handling, notification handling, backend event conversion, and frontend stream reduction | `codex-thread-bootstrapper.ts`, `codex-thread.ts`, `codex-thread-server-request-handler.ts`, `codex-thread-notification-handler.ts`, `codex-item-event-converter.ts`, `segmentHandler.ts`, `toolLifecycleHandler.ts` | None |
| Current Ownership Boundaries | Thread owns request/notification state; Codex event conversion owns public normalization; frontend stream handlers own Activity/chat projection | `CodexThread.handleAppServerRequest`, `convertCodexItemEvent`, `handleSegmentStart`, `handleToolApproved` | None |
| Current Coupling / Fragmentation Problems | Visibility is already normalized, but completed `mcpToolCall` items still fall through the generic `ITEM_COMPLETED -> SEGMENT_END` path, so the frontend never receives `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` for MCP tools and therefore falls back to `parsed`. | `codex-thread-notification-handler.ts`, `codex-item-event-converter.ts:128-207`, `toolLifecycleHandler.ts:445-488`, `segmentHandler.ts:532-535` | Whether terminal normalization should replace or supplement `SEGMENT_END` (design answer: supplement it with a synthetic local completion event) |
| Existing Constraints / Compatibility Facts | `autoExecuteTools=true` already maps to `approvalPolicy="never"`, but Codex still emits low-level `mcpServer/elicitation/request` internally; frontend Activity materializes tool entries only from tool segment types or explicit lifecycle events | `codex-thread-bootstrapper.ts`, live debug traces, `segmentHandler.ts`, `toolLifecycleHandler.ts` | Whether future Codex granular approval config can suppress internal MCP elicitations entirely |
| Relevant Files / Components | Backend notification handling, event conversion, and tests participate directly in the remaining gap; the frontend already has the needed success/error reducer behavior | `codex-thread-notification-handler.ts`, `codex-thread-event-name.ts`, `codex-item-event-converter.ts`, runtime E2E + frontend lifecycle tests | None |

## Current State (As-Is)

The current backend already correlates pending `mcpToolCall` items with later `mcpServer/elicitation/request` prompts, manual approval mode already surfaces a correct `TOOL_APPROVAL_REQUESTED` / `TOOL_APPROVED` flow, and the earlier visibility fix already emits `SEGMENT_START(segment_type="tool_call")` for MCP tools. The remaining gap is at completion time: Codex sends `item/completed` with terminal MCP result data, but our public-contract path still treats that as only `SEGMENT_END`. `TOOL_LOG` is not a valid terminal fallback because the frontend intentionally does not infer success from logs alone.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `mcpToolCall item/started` | public manual approval + visible tool lifecycle | `CodexThread` | Manual mode remains the user-facing approval contract |
| DS-002 | Primary End-to-End | `mcpToolCall item/started` | public auto-approved visible MCP lifecycle without approval stop | `CodexThread` | Auto mode must stay visible and terminate cleanly even when no user review is needed |
| DS-003 | Bounded Local | `item/started` notification | pending-call lookup/cleanup | `CodexThread` pending MCP call registry | Approval/tool correlation depends on this local spine |
| DS-004 | Return-Event | local synthetic Codex approval/completion events + raw Codex items | normalized websocket runtime events | `CodexThreadEventConverter` / `CodexItemEventPayloadParser` | The client contract depends on normalized runtime semantics rather than raw Codex item types |
| DS-005 | Return-Event | websocket tool/segment events | frontend Activity/chat terminal tool state | frontend stream handlers | The product bug now exists only when provider completion is not normalized into terminal lifecycle events |

## Primary Execution / Data-Flow Spine(s)

- `Codex app-server item/started -> notification handler -> pending-call registry -> server-request handler -> local approval event(s) -> runtime event converter -> websocket client -> frontend Activity/chat reducer`
- `Codex app-server item/completed -> notification handler -> local MCP completion event -> runtime event converter -> TOOL_EXECUTION_SUCCEEDED / TOOL_EXECUTION_FAILED -> frontend toolLifecycleHandler`
- `Codex app-server item/started -> runtime event converter -> normalized tool_call SEGMENT_START -> websocket client -> frontend Activity entry`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `Codex app-server notification/request stream` | Source of raw `mcpToolCall` items and MCP approval prompts | Supplies the low-level runtime facts |
| `CodexThread` | Governing owner for request handling, approval response, and pending-call state | Correlates approval prompts with real tool invocations |
| `codex-thread-notification-handler.ts` | Notification-side intake | Tracks pending MCP tool calls and emits synthetic local MCP completion events before raw completion finalization |
| `codex-thread-server-request-handler.ts` | Request-side bridge | Interprets MCP approval requests and decides manual vs auto approval behavior |
| `codex-item-event-payload-parser.ts` | Raw item normalizer | Converts raw Codex item types into public segment categories |
| `codex-item-event-converter.ts` | Public contract normalizer | Emits public runtime events from raw/local Codex events |
| `segmentHandler.ts` | Frontend segment reducer | Creates Activity/chat tool segments from `SEGMENT_START` |
| `toolLifecycleHandler.ts` | Frontend lifecycle reducer | Applies approved/executing/success/error lifecycle transitions that the normalized backend contract emits |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A real `mcpToolCall` starts, the thread records it, a later MCP approval request is matched to that pending call, the runtime emits a public approval request, user approval is sent back through the thread, and the tool then remains visible through the normal tool segment and lifecycle path. | `mcpToolCall`, pending-call registry, approval record, `tool_call` segment, public approval events | `CodexThread` | startup approval policy, event conversion, websocket/frontend tests |
| DS-002 | A real `mcpToolCall` starts, the backend immediately normalizes it as a public `tool_call` segment, the later MCP approval request is auto-accepted, the runtime emits a public auto-approved lifecycle event, and the completed tool later emits a terminal public success or failure event without a public approval stop. | `mcpToolCall`, pending-call registry, `tool_call` segment, auto-approved lifecycle event, terminal MCP completion event | `CodexThread` | approval policy resolution, terminal-state parity |
| DS-003 | The notification path captures and later clears the pending MCP tool call so request handling can correlate approval prompts to concrete tool invocations without leaking stale state. | `item/started`, `trackPendingMcpToolCall`, `findPendingMcpToolCall`, `completePendingMcpToolCall` | `CodexThread` | lookup normalization, cleanup |
| DS-004 | Raw Codex items and local synthetic approval/completion events are normalized into the public runtime event contract so the client never needs to understand raw Codex `mcpToolCall` semantics. | raw `mcpToolCall`, `LOCAL_TOOL_APPROVED`, `LOCAL_MCP_TOOL_EXECUTION_COMPLETED`, `SEGMENT_START tool_call`, `TOOL_APPROVED`, `TOOL_EXECUTION_SUCCEEDED` | `CodexThreadEventConverter` | payload shaping, tool name/argument/result normalization |
| DS-005 | The frontend receives normalized tool segment and lifecycle events, creates a visible Activity entry, and reaches terminal `success` / `error` from explicit lifecycle events instead of relying on segment-end fallback state. | `SEGMENT_START`, `TOOL_APPROVED`, `TOOL_EXECUTION_SUCCEEDED`, `SEGMENT_END`, Activity store | frontend stream handlers | invocation aliasing, argument hydration, terminal-status precedence |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `codex-thread-bootstrapper.ts` | mapping `autoExecuteTools` into Codex startup config | approval-request interpretation or frontend projection rules | Keep startup policy separate from runtime request handling |
| `codex-thread-notification-handler.ts` | notification intake, pending MCP call tracking, and synthetic local completion emission | approval decision logic or frontend-specific state rules | Its job is to preserve enough metadata for later correlation and expose provider completion at the thread boundary |
| `codex-thread-server-request-handler.ts` | request interpretation and immediate response policy | frontend-specific Activity state rules | Best place to decide manual vs auto handling |
| `codex-item-event-payload-parser.ts` | raw item-to-segment normalization | approval decision logic or frontend fallback rules | Correct place to classify `mcpToolCall` as `tool_call` |
| `codex-item-event-converter.ts` | local/raw event normalization into public runtime events | thread-state correlation or UI-specific state transitions | Keep approval/completion contract shaping isolated here |
| `segmentHandler.ts` | segment-driven frontend projection | raw Codex protocol interpretation | Its concern is normalized runtime segment state |
| `toolLifecycleHandler.ts` | frontend lifecycle progression | backend-specific raw event decisions | Applies normalized lifecycle semantics only |

## Return / Event Spine(s) (If Applicable)

- `LOCAL_TOOL_APPROVED -> codex-thread-event-converter -> TOOL_APPROVED -> websocket agent stream -> frontend toolLifecycleHandler`
- `LOCAL_MCP_TOOL_EXECUTION_COMPLETED -> codex-thread-event-converter -> TOOL_EXECUTION_SUCCEEDED / TOOL_EXECUTION_FAILED -> websocket agent stream -> frontend toolLifecycleHandler`
- `item/started(mcpToolCall) -> codex-item-event-payload-parser.resolveSegmentType -> SEGMENT_START(tool_call) -> websocket agent stream -> frontend segmentHandler`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `CodexThread`
- Start and end: `item/started` notification -> `findPendingMcpToolCall` / `completePendingMcpToolCall`
- Short arrow chain: `item/started -> trackPendingMcpToolCall -> mcpServer/elicitation/request -> findPendingMcpToolCall -> item/completed -> emit LOCAL_MCP_TOOL_EXECUTION_COMPLETED -> completePendingMcpToolCall`
- Why it must be explicit in the design: `Without this local spine, the approval request cannot be safely matched to a real tool invocation, and provider completion would never become a terminal public lifecycle event.`

- Parent owner: `segmentHandler.ts`
- Start and end: `SEGMENT_START tool segment` -> `SEGMENT_END`
- Short arrow chain: `SEGMENT_START -> addActivity(status=parsing) -> TOOL_APPROVED / TOOL_EXECUTION_* -> SEGMENT_END finalization`
- Why it must be explicit in the design: `The reopened bug is partly caused by this local reducer overriding later lifecycle state.`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Approval-policy resolution at startup | `CodexThread` | Sets initial Codex mode (`never` vs `on-request`) | Yes |
| Raw debug/event log capture | investigation and runtime validation | Supplies runtime evidence without changing the public contract | Yes |
| Frontend Activity store persistence | frontend reducers | Stores visible terminal tool state once reducers classify an entry | Yes |
| Live E2E and unit coverage | implementation quality gate | Proves public runtime/frontend semantics and protects regressions | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Codex request interpretation | `codex/thread` | Extend | Existing owner already handles request routing and thread state | N/A |
| Raw item normalization | `codex/events` | Extend | Existing parser/converter already owns item typing and public event shaping | N/A |
| Frontend tool visibility | `autobyteus-web/services/agentStreaming/handlers` | Extend | Existing segment/lifecycle reducers already own Activity/chat projection | N/A |
| Validation | existing server E2E + frontend handler unit suites | Extend | Existing test owners already cover runtime websocket and frontend reducer contracts | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/thread` | approval-policy response handling, pending call tracking, synthetic MCP completion emission | DS-001, DS-002, DS-003 | `CodexThread` | Extend | Main runtime ownership |
| `agent-execution/backends/codex/events` | raw item normalization and public approval/completion event conversion | DS-004 | websocket/runtime consumers | Extend | No new subsystem needed |
| `autobyteus-web/services/agentStreaming/handlers` | normalized segment/lifecycle projection to Activity/chat terminal state | DS-005 | frontend runtime consumers | Keep | Existing UI projection already supports terminal success/error |
| `tests/e2e/runtime` and unit suites | runtime + reducer validation | DS-001, DS-002, DS-004, DS-005 | quality gates | Extend | No new test harness needed |

## Ownership-Driven Dependency Rules

- Allowed dependency directions: `bootstrap -> thread runtime -> event conversion -> websocket client -> frontend reducers`, `tests -> implementation`
- Forbidden shortcuts: `frontend reducers interpreting raw Codex item types`, `event converters reaching back into thread state`, `request handlers directly mutating frontend stores`
- Temporary exceptions and removal plan: `None`

## Architecture Direction Decision (Mandatory)

- Chosen direction: Keep the existing thread/events/frontend-reducer split, emit one synthetic local MCP completion event from the notification boundary on completed `mcpToolCall`, convert that event into public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED`, and preserve the existing raw `ITEM_COMPLETED -> SEGMENT_END` path for segment finalization.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): `This is the minimal change that restores terminal lifecycle parity for all MCP tools without weakening the existing segment contract or pushing Codex-specific completion semantics into the frontend.`
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep + Add + Remove`

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Normalize at the boundary | `codex-thread-notification-handler.ts` + `codex-item-event-converter.ts` | Converts provider completion into the existing public lifecycle contract before it reaches the frontend | Codex thread/event conversion | Fixes the remaining root cause instead of adding UI inference |
| Preserve existing contract pieces | raw `ITEM_COMPLETED -> SEGMENT_END` plus synthetic completion event | Keeps segment finalization and terminal lifecycle as distinct concerns | Codex event conversion | Avoids overloading one event with two responsibilities |
| Reuse existing lifecycle event family | `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` | Preserves parity with existing runtime semantics | event conversion + frontend lifecycle reducer | No new public event type |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Auto/manual approval policy must stay centralized in the thread request handler | Keep clear owner |
| Responsibility overload exists in one file or one optional module grouping | No | Parser, request handling, and frontend reduction remain in separate owners | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | Synthetic local MCP completion events own a real thread-to-public-contract translation concern | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | bootstrap, events, frontend reducers, and tests each stay in existing owners | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | thread/events/tests are extended and frontend code is reused without new branches | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | lifecycle status policy stays centralized in frontend tool lifecycle state helpers | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | No | Leaving completed `mcpToolCall` on the generic `SEGMENT_END` path would keep terminal MCP success invisible to the frontend contract | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Infer MCP success from `TOOL_LOG` or `SEGMENT_END` in the frontend | Smallest code delta | Violates the existing frontend contract, hides provider failure semantics, and turns logs into control flow | Rejected | This is a UI workaround, not a correct runtime normalization |
| B | Emit one synthetic local MCP completion event and map it to public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` while keeping `SEGMENT_END` | Restores terminal lifecycle parity, keeps segment finalization intact, and stays inside current owners | Requires small thread and event-converter changes plus test updates | Chosen | This matches the project’s normalized lifecycle model and keeps Codex-specific logic out of the frontend |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` | same | Add one synthetic local event name for completed MCP tool execution | DS-003, DS-004 | Keeps thread/event ownership explicit |
| C-002 | Modify | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | same | Emit the synthetic local completion event from completed `mcpToolCall` notifications before raw completion finalization | DS-003, DS-004 | Preserves `SEGMENT_END` while exposing terminal lifecycle |
| C-003 | Modify | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | same | Convert the synthetic local MCP completion event into public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` | DS-004 | Main runtime-contract fix |
| C-004 | Modify | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | same | Add unit proof for synthetic completion emission and public completion conversion | DS-003, DS-004 | Fast regression coverage |
| C-005 | Modify | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | same | Assert terminal `TOOL_EXECUTION_SUCCEEDED` for manual and auto speak-tool websocket runs | DS-001, DS-002, DS-004, DS-005 | Closes the remaining Stage 7 acceptance gap |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Silent completed-`mcpToolCall` path with no terminal lifecycle event | Provider completion will now emit a synthetic local completion event and public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` | `codex-thread-notification-handler.ts` + `codex-item-event-converter.ts` | In This Change | Behavioral decommission, not file deletion |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-thread-event-name.ts` | Codex thread/event boundary | local event taxonomy | Name the synthetic local MCP completion event once | Event-name ownership already lives here | Yes |
| `codex-thread-notification-handler.ts` | Codex thread runtime | notification boundary | Translate completed `mcpToolCall` notifications into one synthetic local completion event plus cleanup | Notification-side ownership already lives here | Yes |
| `codex-item-event-converter.ts` | Codex event conversion | public lifecycle normalization | Map the synthetic local completion event into `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` | Public event shaping already lives here | Yes |
| `agent-runtime-graphql.e2e.test.ts` | runtime validation | websocket contract suite | Prove live manual and auto MCP completion reaches terminal success | Existing runtime websocket coverage owner | Yes |
| codex thread/converter unit tests | backend validation | boundary unit suites | Prove synthetic completion emission and conversion locally | Existing backend unit-test owners already fit | Yes |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Terminal MCP completion normalization | `codex-item-event-converter.ts` | Codex event conversion | Keeps one provider-to-public completion mapping owner for all MCP tools | Yes | Yes | a frontend-specific inference rule |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Public tool segment metadata (`tool_name`, `arguments`) | Yes | Yes | Low | Yes | None |
| Public terminal lifecycle payload (`invocation_id`, `tool_name`, `result`/`error`) | Yes | Yes | Low | Yes | Normalize it once in the Codex event converter |
| Tool lifecycle status model (`parsing -> approved -> executing -> success/error/denied`) | Yes | Yes | Low | Yes | Drive it from explicit execution events instead of fallback parsing state |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` | Codex thread/event boundary | local event naming | Declare the synthetic local MCP completion event name | Keeps local-event taxonomy centralized | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Codex thread runtime | notification/completion boundary | Emit synthetic local completion events from completed `mcpToolCall` payloads and then clear pending state | Keeps provider completion translation near the raw source | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex event conversion | public lifecycle normalization | Convert synthetic local completion into public success/failure events | Keeps the websocket contract shaping centralized | Yes |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | runtime validation | websocket acceptance boundary | Assert visible and terminal-success MCP contract for manual and auto speak-tool runs | Closes the remaining acceptance gap | Yes |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` and `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | backend validation | notification/converter unit proof | Prove local completion emission and public completion conversion | Fast guardrail for the remaining bug | Yes |

## Derived Implementation Mapping (Secondary)

- Synthetic local MCP completion emission lands first because it exposes provider completion at the correct boundary.
- Public completion conversion lands second because it restores terminal lifecycle parity without changing frontend code.
- Validation then closes both the live websocket contract and the local thread/converter behavior.
