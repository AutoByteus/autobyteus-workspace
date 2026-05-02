# Design Spec: Backend Canonicalization for Claude SDK First-Party MCP Tool Events

## Current-State Read

This ticket now covers two related Claude Agent SDK first-party MCP tool contract bugs.

For browser tools, Claude SDK returned browser results as MCP content blocks while Codex returned standard browser result objects. The current ticket implementation has already made Claude `open_tab` work in the user's local build by normalizing browser MCP events/results before the frontend Browser shell consumes them.

For team communication, the current Claude `send_message_to` path still violates the canonical tool lifecycle contract. In the user's ClassRoomSimulation run (`team_classroomsimulation_1c44ae06`, professor member `professor_9fde020d19f62422`), the Activity panel shows `send_message_to` stuck at `PARSED`. Code inspection explains the state:

- `ClaudeSendMessageToolCallHandler` emits canonical `ITEM_ADDED` for `send_message_to`, so the converter emits `SEGMENT_START` and the frontend creates a parsed activity.
- `ClaudeSendMessageToolCallHandler` emits canonical `ITEM_COMMAND_EXECUTION_COMPLETED` and `ITEM_COMPLETED` after delivery.
- `ClaudeSessionEventConverter` suppresses every tool lifecycle event whose name matches `isClaudeSendMessageToolName(...)`; that predicate matches both raw MCP `mcp__autobyteus_team__send_message_to` and canonical `send_message_to`.
- `ClaudeSendMessageToolCallHandler` does not currently emit canonical `ITEM_COMMAND_EXECUTION_STARTED`.
- `ClaudeSessionToolUseCoordinator` also suppresses raw SDK MCP send-message tool-use/tool-result chunks. That is correct because the dedicated team handler should own the logical canonical lifecycle; raw SDK chunks are duplicate transport noise.

The frontend is behaving consistently: a segment start without tool lifecycle terminal events remains `Parsed`. The fix belongs in backend Claude event emission/conversion, not in `ToolCallIndicator.vue`, `ActivityItem.vue`, or frontend Activity state repair.

## Intended Change

Make Claude SDK first-party MCP tools emit the same canonical Autobyteus event contract as Codex:

1. Keep browser MCP name/result normalization in backend Claude conversion.
2. Add canonical `send_message_to` start lifecycle emission in `ClaudeSendMessageToolCallHandler`.
3. Let canonical handler-owned `send_message_to` lifecycle events pass through `ClaudeSessionEventConverter` as `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, or `TOOL_EXECUTION_FAILED`.
4. Continue suppressing/deduplicating raw SDK MCP `mcp__autobyteus_team__send_message_to` lifecycle noise.
5. Keep frontend display components passive.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrow backend event-contract refactor
- Evidence:
  - Codex converter fans out dynamic `send_message_to` starts/completions into segment and tool lifecycle events.
  - Claude team handler emits only segment start and terminal completion; converter then suppresses the terminal lifecycle because canonical and raw send-message names share one broad predicate.
  - Activity remains `Parsed` because only `SEGMENT_START` is visible to frontend status logic.
- Design response:
  - Separate raw SDK MCP send-message suppression from canonical handler-owned send-message lifecycle conversion.
  - Add missing canonical start lifecycle event in the handler.
  - Keep frontend UI unchanged.
- Refactor rationale:
  - Runtime transport deduplication and canonical event emission are backend runtime-adapter responsibilities.
  - Frontend components cannot reliably infer which MCP transport events should be suppressed or passed.
- Intentional deferrals and residual risk:
  - Historical parsed-only rows are not migrated in scope.
  - Broader generic first-party MCP contract extraction is deferred; this fix targets known browser/team tools.

## Terminology

- `Canonical tool lifecycle event`: Autobyteus `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, or `TOOL_EXECUTION_FAILED` with canonical tool names.
- `Raw SDK MCP send-message event`: Claude transport-level event/chunk named `mcp__autobyteus_team__send_message_to`.
- `Handler-owned send-message event`: Event emitted by `ClaudeSendMessageToolCallHandler` using canonical `send_message_to` and the logical delivery invocation id.
- `Parsed activity`: frontend activity status created from `SEGMENT_START` before execution lifecycle events arrive.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the steady-state behavior where canonical `send_message_to` completion events are suppressed.
- Rejected legacy shape: frontend presentation/status workarounds for backend-missing lifecycle events.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Claude SDK browser MCP `open_tab` completion | Browser panel lists and activates opened session | Claude converter + existing browser handler | Already-fixed browser path remains in ticket scope. |
| DS-002 | Primary End-to-End | Claude SDK `send_message_to` handler start | Activity row enters executing state | `ClaudeSendMessageToolCallHandler` + `ClaudeSessionEventConverter` | Fixes missing start lifecycle. |
| DS-003 | Primary End-to-End | Claude SDK `send_message_to` delivery completion | Activity row reaches success/error | `ClaudeSendMessageToolCallHandler` + `ClaudeSessionEventConverter` | Fixes parsed-only terminal state. |
| DS-004 | Return-Event | Raw SDK MCP send-message tool-use/tool-result chunks | No duplicate canonical UI activity | `ClaudeSessionToolUseCoordinator` / converter suppression | Prevents duplicate entries. |
| DS-005 | Return-Event | Backend-converted/hydrated tool lifecycle | UI displays backend-provided tool state/name | Backend converter/projection boundary | Keeps frontend passive. |

## Primary Execution Spine(s)

- Browser spine: `Claude SDK MCP Browser Tool -> BrowserBridgeServer / BrowserTabManager -> ClaudeSessionEventConverter -> Canonical TOOL_EXECUTION_SUCCEEDED(open_tab, result.tab_id) -> Existing Frontend Browser Success Handler -> BrowserShellController -> BrowserPanel`
- Send-message start spine: `Claude SDK MCP send_message_to Handler -> emit ITEM_ADDED + ITEM_COMMAND_EXECUTION_STARTED -> ClaudeSessionEventConverter -> SEGMENT_START + TOOL_EXECUTION_STARTED -> Activity executing`
- Send-message completion spine: `InterAgentMessageDeliveryHandler -> ClaudeSendMessageToolCallHandler completion -> emit ITEM_COMMAND_EXECUTION_COMPLETED + ITEM_COMPLETED -> ClaudeSessionEventConverter -> TOOL_EXECUTION_SUCCEEDED/FAILED + SEGMENT_END -> Activity success/error`
- Raw-noise suppression spine: `Claude SDK raw mcp__autobyteus_team__send_message_to chunks -> ClaudeSessionToolUseCoordinator / converter suppression -> no duplicate Activity`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Browser MCP result is normalized to canonical browser result object, allowing existing frontend focus behavior. | Browser tool, converter, Browser shell | Claude converter; BrowserShellController | Browser result normalizer |
| DS-002 | The dedicated team handler marks logical delivery as started by emitting canonical segment and tool-start lifecycle events. The converter passes canonical `send_message_to` start through to frontend. | Team tool handler, converter, Activity | `ClaudeSendMessageToolCallHandler` | Tool-name predicate split |
| DS-003 | Delivery result is converted into canonical success/failure lifecycle plus segment end so frontend can leave `Parsed`. | Delivery handler, converter, Activity | `ClaudeSendMessageToolCallHandler` and converter | Result/error payload shaping |
| DS-004 | Raw SDK transport events are suppressed because they represent the same MCP tool invocation already represented by handler-owned canonical events. | SDK raw chunks, coordinator, converter | `ClaudeSessionToolUseCoordinator` | Duplicate suppression |
| DS-005 | UI components render canonical backend state/name; if raw/parsed-only state appears, backend conversion is the source to fix. | Backend projection, UI components | Backend event contract | No frontend repair logic |

## Spine Actors / Main-Line Nodes

- `ClaudeSendMessageToolCallHandler`: owns logical team-message delivery lifecycle for Claude SDK.
- `InterAgentMessageDeliveryHandler`: performs actual member-to-member delivery.
- `ClaudeSessionEventConverter`: maps Claude session events to canonical Autobyteus run events.
- `ClaudeSessionToolUseCoordinator`: observes raw SDK tool chunks and suppresses duplicates for dedicated first-party team tool handling.
- Frontend Activity store/handlers: consume canonical lifecycle events and update status.
- Display components: render current state/name.

## Ownership Map

| Actor / Node | Owns | Notes |
| --- | --- | --- |
| `ClaudeSendMessageToolCallHandler` | Logical `send_message_to` invocation id, arguments, delivery, canonical start/completion events | Should emit both segment and lifecycle events. |
| `ClaudeSessionEventConverter` | Canonical event conversion and raw-vs-canonical name handling | Must not suppress canonical handler-owned events. |
| `ClaudeSessionToolUseCoordinator` | Generic raw SDK tool-use observation and approval lifecycle | May suppress raw send-message chunks to avoid duplicate handler-owned events. |
| Frontend Activity lifecycle handlers | Status transition from canonical lifecycle events | Existing correct consumer. |
| `ToolCallIndicator.vue` / `ActivityItem.vue` | Presentation only | No MCP-specific repair logic. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamingService` / `TeamStreamingService` | Tool lifecycle handlers and segment handlers | Stream dispatch | Claude send-message lifecycle inference |
| `ToolCallIndicator.vue` / `ActivityItem.vue` | Backend-converted conversation/activity state | Presentation | Runtime MCP normalization or status repair |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Broad converter suppression of all `send_message_to` names | It drops canonical handler-owned lifecycle events | Raw-vs-canonical send-message predicate split | In This Change | Suppress raw MCP only; pass canonical. |
| Missing `ITEM_COMMAND_EXECUTION_STARTED` for handler-owned send-message invocations | Leaves Activity at parsed until terminal event, and terminal is currently suppressed | `ClaudeSendMessageToolCallHandler` canonical start event | In This Change | Match Codex fan-out shape. |
| Proposed frontend Activity/ToolCall display fix | Would hide backend lifecycle bug | Backend canonical lifecycle events | Rejected | Revert if present. |

## Return Or Event Spine(s) (If Applicable)

- Canonical send-message start event spine: `handler start -> ITEM_COMMAND_EXECUTION_STARTED -> converter -> TOOL_EXECUTION_STARTED -> frontend Activity executing`.
- Canonical send-message terminal event spine: `handler completion -> ITEM_COMMAND_EXECUTION_COMPLETED -> converter -> TOOL_EXECUTION_SUCCEEDED/FAILED -> frontend Activity terminal`.
- Raw send-message suppression spine: `raw mcp__autobyteus_team__send_message_to chunk/event -> suppression -> no duplicate frontend event`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ClaudeSendMessageToolCallHandler`
  - Arrow chain: `Parse arguments -> Create logical invocation id -> Emit segment start + lifecycle start -> Validate/approve/deliver -> Emit lifecycle completed + segment end -> Return MCP result`
  - Why it matters: this handler owns the logical team communication action.
- Parent owner: `ClaudeSessionEventConverter`
  - Arrow chain: `Resolve raw tool name -> Classify raw MCP vs canonical send_message_to -> Suppress raw duplicates or emit canonical lifecycle -> Serialize payload`
  - Why it matters: the current classifier is too broad.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Send-message name classification | DS-002, DS-003, DS-004 | Claude converter/coordinator | Distinguish canonical `send_message_to` from raw MCP `mcp__autobyteus_team__send_message_to` | Prevent suppressing canonical lifecycle while still suppressing raw noise | Either duplicates or parsed-only UI |
| Send-message result/error shaping | DS-003 | Team handler/converter | Preserve accepted result or error message in terminal lifecycle payload | Frontend Activity needs result/error details | UI would infer outcome from text |
| Browser result normalization | DS-001 | Claude converter | Keep browser MCP fix intact | Same ticket already covers this | Regression of open_tab |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team message delivery lifecycle | `ClaudeSendMessageToolCallHandler` | Extend | Already owns logical send_message_to handling | N/A |
| Claude event conversion | `ClaudeSessionEventConverter` | Extend | Existing boundary from Claude events to run events | N/A |
| Raw SDK tool suppression | `ClaudeSessionToolUseCoordinator` | Reuse/adjust tests | Existing raw chunk observer | N/A |
| Activity display | Frontend lifecycle handlers/components | Reuse unchanged | Correctly reflects received events | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Claude team communication | Handler-owned send-message lifecycle events | DS-002, DS-003 | `ClaudeSendMessageToolCallHandler` | Extend | Main new code area. |
| Backend Claude event conversion | Raw-vs-canonical tool lifecycle mapping | DS-002, DS-003, DS-004 | `ClaudeSessionEventConverter` | Extend | Main conversion fix. |
| Backend Claude raw tool coordination | Duplicate raw SDK suppression | DS-004 | `ClaudeSessionToolUseCoordinator` | Reuse | Tests should lock suppression. |
| Frontend Activity/UI | Consume/render canonical lifecycle | DS-005 | Existing handlers/components | Reuse unchanged | No component changes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Backend Claude team communication | Team tool handler | Emit canonical lifecycle start and terminal events | Existing logical delivery owner | Send-message name constants |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-send-message-tool-name.ts` | Backend Claude shared naming | Name classification utility | Split canonical vs raw MCP predicates / normalization | Prevent broad suppression ambiguity | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Backend Claude event conversion | Converter | Pass canonical send-message lifecycle; suppress raw MCP only | Existing conversion owner | Name utility |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Backend tests | Converter tests | Validate canonical pass-through and raw suppression | Covers parsed-only bug | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts` (Add) | Backend tests | Handler tests | Validate emitted canonical event sequence for success/failure | Handler currently lacks unit coverage | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | Backend tests | Raw chunk suppression tests | Keep raw MCP suppression/deduplication | Existing test should be adjusted only if event sequence changes intentionally | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Send-message tool-name predicates | `claude-send-message-tool-name.ts` | Backend Claude runtime | Used by handler/converter/coordinator | Yes | Yes | One broad predicate for contradictory suppression/pass-through needs |
| Browser result parser | Existing/current ticket helper | Backend Claude events | Keep browser fix centralized | Yes | Yes | Frontend parser |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `send_message_to` lifecycle payload | Yes after fix | Yes | Medium currently | Include invocation id, canonical tool name, arguments, result/error consistently. |
| Send-message name utility | Yes after split | Yes | High currently | Add explicit raw-MCP and canonical checks instead of one broad predicate for all contexts. |
| UI `toolName`/status | Yes | Yes | Low | Keep as backend-provided values. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-send-message-tool-name.ts` (Modify) | Backend Claude shared naming | Send-message tool-name contract | Export canonical name, raw MCP name, `isClaudeSendMessageMcpToolName`, `isClaudeCanonicalSendMessageToolName`, and/or normalizer | One clear naming utility | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` (Modify) | Backend Claude team communication | Logical team tool handler | Emit canonical `ITEM_COMMAND_EXECUTION_STARTED` after segment start; keep terminal completion emission | Existing owner of delivery lifecycle | Name constants |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` (Modify) | Backend Claude event conversion | Claude event canonicalizer | Suppress raw MCP send-message lifecycle only; pass canonical handler-owned lifecycle | Existing converter owner | Name predicates |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-browser-tool-result-normalizer.ts` (Existing current ticket add) | Backend Claude event conversion | Browser MCP result parser | Preserve browser open_tab fix | Current ticket code | Browser contract |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` (Modify) | Backend tests | Converter behavior | Update old suppression test; assert canonical send-message lifecycle conversion and raw MCP suppression | Main regression test | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts` (Add) | Backend tests | Handler behavior | Assert event sequence for accepted/rejected delivery includes lifecycle start/completion | New coverage for handler | N/A |
| `autobyteus-web/components/conversation/ToolCallIndicator.vue` (No change) | UI presentation | Tool card | Render provided state/name | Display-only | N/A |
| `autobyteus-web/components/progress/ActivityItem.vue` (No change) | UI presentation | Activity row | Render provided state/name | Display-only | N/A |

## Ownership Boundaries

- Claude team handler owns logical delivery lifecycle and should emit canonical events for that logical action.
- Claude converter owns canonical event mapping and duplicate raw transport filtering.
- Frontend Activity lifecycle handlers own UI state transitions from canonical events only.
- Display components own presentation only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSendMessageToolCallHandler` | Delivery validation, approval, inter-agent relay, canonical lifecycle events | Claude team MCP tool definition | Converter fabricating delivery semantics without handler events | Add handler event emission |
| `ClaudeSessionEventConverter` | Raw-vs-canonical Claude event mapping | Claude backend run stream | Frontend detecting raw MCP duplicate policy | Split predicates and tests |
| Frontend Activity lifecycle handler | Status transitions from lifecycle events | Stream services | Display components inferring backend missing success | Fix backend events |

## Dependency Rules

- `ClaudeSendMessageToolCallHandler` may emit Claude session events but must not dispatch frontend server messages directly.
- `ClaudeSessionEventConverter` may depend on send-message name utilities and browser contracts; it must not depend on frontend code.
- `ClaudeSessionToolUseCoordinator` should continue suppressing raw send-message chunks and must not suppress handler-owned canonical events because it should not see those as raw chunks.
- `ToolCallIndicator.vue` and `ActivityItem.vue` must not implement send-message MCP status/name workarounds.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `emitSendMessageToolStart(...)` | Handler-owned send-message start | Emit segment start and lifecycle start | Logical invocation id + normalized args | Add lifecycle start. |
| `emitSendMessageToolCompleted(...)` | Handler-owned send-message terminal state | Emit terminal lifecycle and segment end | Logical invocation id + result/error | Existing, but converter must pass it. |
| `isClaudeSendMessageMcpToolName(...)` | Raw SDK MCP classifier | Identify raw transport event names to suppress | Raw string/null | New/split predicate. |
| `isClaudeCanonicalSendMessageToolName(...)` | Canonical classifier | Identify handler-owned canonical events to pass | Raw string/null | New/split predicate. |
| `ClaudeSessionEventConverter.convert(...)` | Event conversion | Emit canonical run events | Claude session event | Update suppression conditions. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `isClaudeSendMessageToolName` current broad predicate | No | Partly | High | Split into raw-MCP and canonical predicates. |
| Handler start/completion emitters | Yes after start lifecycle added | Yes | Low | Add tests. |
| Converter `convert` | Yes | Yes | Medium | Add raw/canonical send-message cases. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team send-message handler | `ClaudeSendMessageToolCallHandler` | Yes | Low | Keep. |
| Raw MCP classifier | `isClaudeSendMessageMcpToolName` | Yes | Low | Add. |
| Canonical classifier | `isClaudeCanonicalSendMessageToolName` | Yes | Low | Add if needed. |
| Broad classifier | `isClaudeSendMessageToolName` | Ambiguous | High | Keep only for contexts where broad matching is truly intended, or replace usages. |

## Applied Patterns (If Any)

- Adapter/normalizer: backend converts runtime MCP transport to canonical Autobyteus lifecycle events.
- Duplicate suppression: raw SDK transport events are filtered because handler-owned canonical events represent the same logical tool action.
- Event fan-out: one logical first-party tool invocation produces segment and lifecycle event spines, matching Codex behavior.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/` | Folder | Claude team MCP tools | Team communication tool handling | Existing team MCP location | Frontend UI status code |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/` | Folder | Claude event conversion | Canonical event mapping | Existing converter location | Tool delivery execution |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Folder | Claude session raw SDK coordination | Raw tool-use observation/suppression | Existing coordinator location | Logical team delivery completion semantics |
| `autobyteus-web/components/...` | Folder | Presentation | Render state/name | Existing UI | MCP repair logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/claude/team-communication` | Runtime adapter / first-party team tool | Yes | Low | Handler owns logical send-message lifecycle. |
| `backends/claude/events` | Event conversion | Yes | Low | Converter owns canonical run event mapping. |
| `autobyteus-web/components` | Presentation | Yes | Low | No change. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Canonical send-message start | Handler emits `ITEM_ADDED(send_message_to)` and `ITEM_COMMAND_EXECUTION_STARTED(send_message_to)` -> converter emits `SEGMENT_START`, `TOOL_EXECUTION_STARTED` | ActivityItem changes `Parsed` to `Executing` by name | State should come from lifecycle events. |
| Canonical send-message success | Handler emits `ITEM_COMMAND_EXECUTION_COMPLETED(send_message_to, result)` -> converter emits `TOOL_EXECUTION_SUCCEEDED` | Converter returns `[]` for all send_message_to names | The broad suppression is the bug. |
| Raw MCP duplicate suppression | Raw `mcp__autobyteus_team__send_message_to` chunk is consumed/suppressed | Raw SDK and handler events both create rows | Prevents duplicate UI activity. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend ActivityItem/ToolCallIndicator status workaround | Quick UI fix for parsed-only row | Rejected | Emit canonical lifecycle events from backend. |
| Stop suppressing all send-message events indiscriminately | Needed to surface success | Partially rejected as too broad | Suppress raw MCP only; pass canonical handler events. |
| Let raw SDK MCP lifecycle drive UI | Could avoid handler event work | Rejected | Handler owns logical team delivery and normalized args/result. |
| BrowserBridgeServer or Browser shell changes | Irrelevant to send_message_to parsed-only state | Rejected | Keep browser fix separate. |

## Derived Layering (If Useful)

- Backend runtime adapter layer: Claude team/browser MCP handling and canonicalization.
- Backend event conversion layer: canonical Autobyteus run events and raw duplicate suppression.
- Frontend stream/activity layer: consume canonical events.
- Presentation layer: direct render.

## Migration / Refactor Sequence

1. Update `claude-send-message-tool-name.ts` to expose separate raw-MCP and canonical send-message predicates/normalizer.
2. Update `ClaudeSendMessageToolCallHandler` start emission to include canonical `ITEM_COMMAND_EXECUTION_STARTED` after `ITEM_ADDED`.
3. Update `ClaudeSessionEventConverter` suppression conditions:
   - pass canonical `send_message_to` lifecycle events;
   - suppress raw MCP `mcp__autobyteus_team__send_message_to` lifecycle/segment events if they reach the converter as duplicate transport noise;
   - keep browser MCP canonicalization intact.
4. Update converter tests that currently assert all send-message `TOOL_*` events are suppressed.
5. Add handler tests for accepted and rejected delivery event sequences.
6. Keep/update coordinator tests proving raw SDK send-message chunks do not emit duplicate events.
7. Run targeted backend tests plus existing frontend lifecycle tests if implementation touches event ordering.

## Key Tradeoffs

- **Pass canonical, suppress raw:** This preserves duplicate prevention while allowing the UI to receive real lifecycle state.
- **Handler emits start vs converter fabricates start from segment:** Handler emission is cleaner because it owns the logical invocation and normalized arguments.
- **No frontend workaround:** Keeps the corrected boundary from the earlier user clarification.

## Risks

- Predicate split must be applied carefully; using the old broad predicate in converter lifecycle cases will keep the bug.
- If SDK raw chunks use canonical `send_message_to` rather than MCP-prefixed names in some versions, duplicate suppression may need source-aware tracking in the coordinator; tests should cover current known raw MCP shape.
- Historical rows already stuck at parsed may not update unless runs are replayed.

## Guidance For Implementation

- Main files are backend Claude files, not frontend components.
- Mirror Codex converter expectations for send-message event fan-out.
- Preserve current browser `open_tab` fix and tests.
- Do not change `ToolCallIndicator.vue` or `ActivityItem.vue` for this expanded bug.
