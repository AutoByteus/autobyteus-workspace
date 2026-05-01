# Design Spec

## Current-State Read

Claude SDK tool-call data enters the system through `ClaudeSession.executeTurn`, which iterates SDK chunks and passes each chunk to `ClaudeSessionToolUseCoordinator.processToolLifecycleChunk`. Existing raw logging proves SDK assistant chunks contain complete `tool_use.input` arguments. The current coordinator extracts those arguments and stores them in `observedToolInvocationsByRunId`, but for this raw-observed path it does not emit a normalized started event. When the later SDK user `tool_result` chunk arrives, it emits `ITEM_COMMAND_EXECUTION_COMPLETED` with only `invocation_id`, `tool_name`, and result/error.

The separate SDK permission callback path (`handleToolPermissionCheck`) does emit `ITEM_COMMAND_EXECUTION_STARTED` with `arguments`, and approval/denial events include arguments. Therefore Claude tool calls that pass through permission callback can show arguments; Claude tool calls that are safe/auto-allowed/result-first produce result-only normalized events.

`ClaudeSessionEventConverter` already maps started/request events to normalized `TOOL_*` events with the runtime-neutral `arguments` field. The websocket mapper forwards payloads unchanged. The frontend `handleToolExecutionStarted` merges arguments into Activity state, while `handleToolExecutionSucceeded` creates a synthetic segment/activity with `{}` args when success arrives first. `ActivityItem.vue` renders `Arguments` only when the argument object is non-empty. This makes the user-visible gap a runtime lifecycle invariant bug, not a pure UI rendering bug and not an upstream SDK omission.

## Intended Change

Normalize every Claude SDK observed tool invocation into a complete argument-bearing lifecycle sequence:

- On assistant `tool_use`, record the invocation and emit exactly one `ITEM_COMMAND_EXECUTION_STARTED` event with `arguments` unless that invocation already emitted started through `handleToolPermissionCheck`.
- On user `tool_result`, emit completion/failure with the tracked `arguments` included as defensive context.
- Preserve existing `send_message_to` lifecycle suppression.
- Add backend unit tests and update the gated Claude e2e test so it proves raw SDK `tool_use.input` reaches `TOOL_EXECUTION_STARTED.payload.arguments` and does not regress the Activity data path.
- Optionally extend frontend success/failure parsing to merge completion `arguments` when present, so result-first replay remains robust; this is a defensive runtime-neutral enhancement, not a Claude-only UI path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor; local invariant tightening required.
- Evidence: Raw Claude SDK logs include `tool_use.input`, runtime logs show result-only normalized `Bash` event without args, and code shows `processToolLifecycleChunk` tracks args without emitting started for raw-observed tool_use.
- Design response: Strengthen `ClaudeSessionToolUseCoordinator` as the owner of complete Claude tool invocation lifecycle normalization.
- Refactor rationale: Existing ownership is correct; the missing invariant is local to one coordinator and its tests. No folder/module reshaping is needed.
- Intentional deferrals and residual risk, if any: Historical Claude projection from `getSessionMessages` still has limited reconstruction for old sessions if memory lacks tool-call traces. This task fixes new live/memory-captured runs; backfilling old history from raw Claude transcript is outside scope.

## Terminology

- `Observed Claude tool invocation`: a tool call discovered from SDK assistant `tool_use` content blocks.
- `Permission callback path`: a tool call observed through SDK `canUseTool`, currently used for approval decisions and already emitting started events.
- `Normalized tool lifecycle event`: provider-neutral `TOOL_EXECUTION_STARTED`, `TOOL_APPROVAL_REQUESTED`, `TOOL_APPROVED`, `TOOL_EXECUTION_SUCCEEDED`, or `TOOL_EXECUTION_FAILED` event with shared fields such as `invocation_id`, `tool_name`, and `arguments`.

## Design Reading Order

1. Follow the Claude SDK tool event spine.
2. Locate the authoritative lifecycle owner (`ClaudeSessionToolUseCoordinator`).
3. Apply duplicate-safe started emission and completion argument preservation.
4. Update tests/e2e and only adjust frontend handlers if completion-argument fallback is implemented.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy API shape is being retained. Replace result-only Claude raw-observed tool lifecycle behavior with complete argument-bearing lifecycle events.
- Obsolete behavior: raw-observed `tool_use` only updates `observedToolInvocationsByRunId` without emitting a started event.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Claude SDK assistant `tool_use` chunk | Frontend Activity item with `Arguments` and `Result` | `ClaudeSessionToolUseCoordinator` for lifecycle normalization | This is the user-visible path where arguments currently disappear. |
| DS-002 | Return-Event | Claude SDK user `tool_result` chunk | Normalized success/failure event and Activity result | `ClaudeSessionToolUseCoordinator` | Completion must carry result and preserve invocation identity/arguments. |
| DS-003 | Bounded Local | Per-run observed invocation tracking | Duplicate-safe event emission | `ClaudeSessionToolUseCoordinator` | Prevents duplicate started events across raw observation and permission callback. |

## Primary Execution Spine(s)

`Claude SDK chunk -> ClaudeSession -> ClaudeSessionToolUseCoordinator -> ClaudeSessionEventConverter -> AgentRunEventMessageMapper/WebSocket -> Frontend toolLifecycleHandler -> AgentActivityStore -> ActivityItem`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When Claude emits an assistant `tool_use`, the session loop passes the chunk to the coordinator. The coordinator extracts `id`, `name`, and input arguments, records invocation state, and emits a started session event exactly once. The converter and websocket mapper preserve the shared `arguments` field. The frontend started handler merges args into Activity state, so Activity details can render `Arguments`. | SDK chunk, session loop, coordinator, converter, websocket, frontend handler, activity store | `ClaudeSessionToolUseCoordinator` | Raw debug logging, send_message_to suppression, duplicate-start tracking |
| DS-002 | When Claude emits a user `tool_result`, the coordinator matches it to the observed invocation, emits success/failure with result/error, and includes tracked arguments. Frontend success/failure updates result while retaining arguments. | SDK result chunk, coordinator, converter, websocket, frontend handler | `ClaudeSessionToolUseCoordinator` | Result serialization, file-change sidecar, memory recorder |
| DS-003 | The coordinator keeps per-run invocation state with tool name, tool input, and whether started was emitted. Both raw observation and permission callback consult/update this state so only one started event is emitted per invocation. | Invocation map, raw observer, permission callback | `ClaudeSessionToolUseCoordinator` | Cleanup on session termination |

## Spine Actors / Main-Line Nodes

- Claude SDK async query stream
- `ClaudeSession.executeTurn`
- `ClaudeSessionToolUseCoordinator`
- `ClaudeSessionEventConverter`
- `AgentRunEventMessageMapper` / websocket stream
- Frontend tool lifecycle handlers
- `AgentActivityStore`
- `ActivityItem.vue`

## Ownership Map

- Claude SDK owns provider-specific raw message format.
- `ClaudeSession` owns turn execution and dispatching raw chunks to runtime subsystems.
- `ClaudeSessionToolUseCoordinator` owns Claude tool invocation state, permission decisions, observed invocation/result pairing, and lifecycle event completeness.
- `ClaudeSessionEventConverter` owns session-event-to-agent-event mapping and provider-neutral field names.
- Websocket mapper owns transport serialization only.
- Frontend lifecycle handlers own projection of normalized messages into conversation segments and Activity state.
- `ActivityItem.vue` owns display of already-normalized Activity fields.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunEventMessageMapper` | Runtime backend/coordinator event owners | Transport-level mapping to websocket messages | Runtime-specific recovery of Claude tool args |
| `ActivityItem.vue` | `AgentActivityStore` and runtime lifecycle handlers | Presentation of normalized Activity fields | Claude SDK event interpretation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Result-only raw-observed Claude tool lifecycle behavior | It loses arguments despite raw SDK data being available | Duplicate-safe started emission in `ClaudeSessionToolUseCoordinator` | In This Change | Not a file removal; remove the behavior by changing the branch. |
| E2E matcher that picks first success regardless of approved invocation | It fails when Claude performs preliminary safe tools | Approved-invocation-specific matcher/assertions | In This Change | Update test logic, not production behavior. |

## Return Or Event Spine(s) (If Applicable)

`Claude SDK user tool_result -> ClaudeSessionToolUseCoordinator.consumeObservedToolInvocation -> ITEM_COMMAND_EXECUTION_COMPLETED(params include invocation_id/tool_name/arguments/result or error) -> ClaudeSessionEventConverter -> TOOL_EXECUTION_SUCCEEDED/FAILED -> WebSocket -> frontend result update`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ClaudeSessionToolUseCoordinator`
- Chain: `observe tool_use -> upsert invocation state -> emitStartedIfNeeded -> observe tool_result -> consume state -> emit completion with arguments -> cleanup empty run map`
- Why it matters: the same invocation can be seen first by raw assistant chunk and/or by permission callback; the coordinator must be idempotent.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Raw Claude event logging | DS-001, DS-002 | `ClaudeSession` / investigation | Opt-in JSONL capture of SDK chunks | Debug/e2e evidence | Logging must not govern runtime behavior. |
| `send_message_to` lifecycle suppression | DS-001, DS-002 | `ClaudeSessionToolUseCoordinator` and converter | Avoid duplicate team-communication tool noise | Existing team messaging UX | If removed accidentally, team communication Activity becomes noisy/duplicated. |
| File-change sidecar | DS-002 | Run file-change projection | Reacts to file-changing tool events | Artifact/file tracking | Should consume normalized lifecycle; should not own argument recovery. |
| Runtime memory recorder | DS-001, DS-002 | Run memory/history | Persists tool call/result traces | Historical replay/projection | Missing started args causes historical Activity gaps. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Complete Claude tool lifecycle normalization | Claude runtime `session` subsystem | Extend | Existing coordinator already tracks invocations and handles permission decisions. | N/A |
| Provider-neutral transport | Agent streaming service | Reuse | It already forwards `TOOL_*` payloads. | N/A |
| Activity rendering | Frontend agent streaming/activity store | Reuse | Existing handlers render arguments when provided. | N/A |
| E2E raw evidence | Existing Claude raw logging env vars | Reuse | Existing logging captured enough. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude runtime session subsystem | Raw chunk tool lifecycle observation, permission callback coordination, duplicate suppression | DS-001, DS-002, DS-003 | `ClaudeSessionToolUseCoordinator` | Extend | Primary production change. |
| Agent run event conversion | Session event to normalized event mapping | DS-001, DS-002 | `ClaudeSessionEventConverter` | Reuse/Minor Extend | Verify completion args preserve through converter. |
| Frontend streaming handlers/activity | Convert normalized websocket messages to Activity state | DS-001, DS-002 | `toolLifecycleHandler`, `AgentActivityStore` | Reuse/Minor Extend | Only merge completion args if backend includes them. |
| Validation | Unit/e2e coverage | All | Tests | Extend | Add targeted fixtures and fix e2e matcher. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Claude runtime session | `ClaudeSessionToolUseCoordinator` | Emit duplicate-safe started events and completion events with tracked args | Existing owner of observed invocation maps and permission callback | Existing `ObservedClaudeToolInvocation` type, extended |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Agent event conversion | `ClaudeSessionEventConverter` | Preserve `arguments` on completion if present; no special recovery | Existing provider mapping file | Existing `resolveToolArguments` helper |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts` | Frontend streaming | Tool lifecycle parsers | Optionally parse completion `arguments` | Existing payload parser owner | Existing `normalizeArguments` helper |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Frontend streaming | Tool lifecycle handler | Optionally merge completion args before/while setting result | Existing handler owner | Existing `mergeArguments`, `updateActivityArguments` |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | Validation | Backend unit tests | Fixture tests for raw `tool_use -> tool_result`, duplicate started suppression, completion args | New focused test around owner | Test-local fixtures |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Validation | Runtime e2e | Fix Claude matcher and assert arguments | Existing e2e owner | Existing helpers |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Validation | Frontend unit tests | Assert started args and optional completion-args fallback | Existing handler tests | Existing test setup |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Invocation state with tool name/input/started flag | Keep local type in `claude-session-tool-use-coordinator.ts` | Claude runtime session | Used only inside coordinator | Yes | Yes | A generic cross-runtime tool state abstraction |
| Argument normalization | Existing `resolveToolArguments` / frontend `normalizeArguments` | Converter/frontend parser | Already local to their boundaries | Yes | Yes | A new Claude-only frontend field mapper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Normalized lifecycle `arguments` | Yes | Yes | Low | Continue using only `arguments` as runtime-neutral field. |
| Extended `ObservedClaudeToolInvocation` | Yes | Yes | Low | Add `startedEmitted: boolean` or equivalent; do not add separate duplicate maps unless clearer in implementation. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Claude runtime session | `ClaudeSessionToolUseCoordinator` | Authoritative Claude tool invocation lifecycle state and emission | Correct existing owner | Local invocation state |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Agent event conversion | `ClaudeSessionEventConverter` | Provider-to-normalized event field mapping | Existing converter | `resolveToolArguments` |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts` | Frontend streaming | Tool lifecycle parser | Parse optional completion args if implemented | Existing parser | `normalizeArguments` |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Frontend streaming | Tool lifecycle handler | Merge optional completion args and preserve started args | Existing handler | Existing activity helpers |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | Validation | Backend unit tests | New tests for the fixed coordinator invariant | Focused owner test | Fixtures |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Validation | Runtime e2e | Correct matcher and add assertions | Existing gated e2e | Existing helpers |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Validation | Frontend validation | Activity args regression | Existing test suite | Existing mocks |

## Ownership Boundaries

The authoritative boundary for Claude tool invocation lifecycle is `ClaudeSessionToolUseCoordinator`. Callers/consumers should not read raw Claude SDK message content directly to recover arguments. The converter should only normalize fields from coordinator session events. The frontend should trust normalized `arguments`, not know about Claude's `tool_use.input` shape.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSessionToolUseCoordinator` | Observed invocation map, permission callback, duplicate-start tracking | `ClaudeSession`, `ClaudeAgentRunBackend` event listeners indirectly | Frontend parsing Claude raw `tool_use.input`; converter consulting coordinator internals | Emit complete session events from coordinator |
| `ClaudeSessionEventConverter` | Provider event name and field normalization | Backend event stream subscribers | Websocket mapper adding provider-specific fields | Add/normalize fields in converter/session event payload |
| Frontend `toolLifecycleHandler` | Segment/activity mutation rules | Websocket streaming services | Activity component reconstructing missing args from results | Add parser/handler support for normalized fields |

## Dependency Rules

- `ClaudeSession` may pass raw SDK chunks to `ClaudeSessionToolUseCoordinator` but must not interpret tool args itself.
- `ClaudeSessionToolUseCoordinator` may emit `ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_*` events with normalized param names.
- `ClaudeSessionEventConverter` may depend on event payloads but must not depend on coordinator private maps.
- Frontend may depend on normalized websocket `arguments`; it must not depend on Claude SDK-specific `input` or `tool_use` fields.
- Tests may use raw Claude fixtures to validate the coordinator boundary.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `processToolLifecycleChunk(runContext, chunk)` | Claude SDK tool lifecycle observation | Extract raw `tool_use`/`tool_result` and emit normalized lifecycle events | `runContext.runId`, `block.id`/`tool_use_id` | Add started emission and completion args. |
| `handleToolPermissionCheck(runContext, toolName, toolInput, options)` | Permission-mediated tool invocation | Emit started and approval/denial decisions | `options.toolUseID` or generated invocation ID | Mark started emitted in shared state. |
| `AgentRunEventMessageMapper.map(event)` | Websocket transport message | Serialize normalized events | `AgentRunEvent.eventType` | No Claude-specific changes. |
| `handleToolExecutionStarted(payload, context)` | Frontend Activity lifecycle | Create/update activity with arguments | `payload.invocation_id` | Existing behavior should work after backend fix. |
| `handleToolExecutionSucceeded/Failed(payload, context)` | Frontend result lifecycle | Update result/error and optionally merge completion args | `payload.invocation_id` | Defensive enhancement if completion args are added. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `processToolLifecycleChunk` | Yes | Yes | Low | Use invocation ID from `id`/`tool_use_id`. |
| `handleToolPermissionCheck` | Yes | Yes | Low | Reuse same invocation state/upsert helper. |
| `TOOL_*` websocket payloads | Yes | Yes | Low | Keep `invocation_id`, `tool_name`, `arguments`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Claude tool lifecycle owner | `ClaudeSessionToolUseCoordinator` | Yes | Low | Keep. |
| Invocation state | `ObservedClaudeToolInvocation` | Yes | Low | Extend with started-emission state. |
| Normalized args | `arguments` | Yes | Low | Keep runtime-neutral field. |

## Applied Patterns (If Any)

- State machine/lightweight lifecycle state inside `ClaudeSessionToolUseCoordinator`: tracks observed invocation -> started emitted -> completed/consumed.
- Adapter pattern in `ClaudeSessionEventConverter`: converts Claude session event names/payloads to runtime-neutral `AgentRunEvent`s.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | File | Claude runtime session | Complete lifecycle emission for Claude tool invocations | Existing coordinator for tool permissions and raw result matching | Frontend display logic |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | File | Claude event converter | Preserve normalized `arguments` where present | Existing provider event adapter | Private coordinator state |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts` | File | Frontend streaming parser | Optional completion-args parse | Existing tool payload parser | Claude raw SDK parsing |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | File | Frontend streaming handler | Activity state updates | Existing Activity mutation owner | Provider-specific SDK interpretation |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | File | Backend validation | Coordinator invariant tests | Mirrors production file ownership | Live Claude dependencies |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | File | Runtime e2e validation | Gated live Claude arg assertions | Existing cross-runtime e2e | Unit fixture coverage duplication beyond necessary |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/claude/session` | Main-Line Domain-Control | Yes | Low | Owns Claude session runtime behavior. |
| `backends/claude/events` | Adapter/Off-Spine Concern | Yes | Low | Converts event contracts only. |
| `services/agentStreaming/handlers` | Transport/UI state adapter | Yes | Low | Runtime-neutral frontend event handling. |
| `components/progress` | Presentation | Yes | Low | No production change expected. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Raw observed tool_use handling | `tool_use(input) -> emit ITEM_COMMAND_EXECUTION_STARTED({ arguments: input }) -> tool_result -> emit completed({ arguments: input, result })` | `tool_use(input) -> store only -> tool_result -> emit completed({ result })` | Shows the missing invariant directly. |
| Duplicate suppression | `emitStartedIfNeeded(invocationId)` used by both raw observer and permission callback | Two independent started emissions from raw observer and permission callback | Prevents duplicate Activity cards. |
| Frontend boundary | `handleToolExecutionStarted` consumes normalized `arguments` | `ActivityItem` reads Claude `tool_use.input` | Keeps provider-specific logic in backend runtime. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Add Claude-specific `input` support in `ActivityItem.vue` | Raw SDK field is named `input` | Rejected | Backend emits existing normalized `arguments`. |
| Keep result-only Claude behavior and show placeholder args in UI | Minimal UI-only workaround | Rejected | Emit real arguments from the runtime owner. |
| Add parallel `tool_input` event field | Could mirror SDK naming | Rejected | Use existing `arguments` field across runtimes. |

## Derived Layering (If Useful)

Provider adapter layer: Claude SDK chunks -> Claude session events -> normalized agent run events -> websocket messages -> frontend Activity state. Each layer should preserve the normalized `arguments` field once it is created by the Claude lifecycle owner.

## Migration / Refactor Sequence

1. Extend `ObservedClaudeToolInvocation` with started-emission state, or introduce an equivalent local helper structure.
2. Add helper methods in `ClaudeSessionToolUseCoordinator`:
   - `upsertObservedToolInvocation(runId, invocationId, { toolName, toolInput })`
   - `emitToolExecutionStartedIfNeeded(runContext, invocationId)`
   - `resolveTrackedArguments(runId, invocationId)` or consume helper returning state.
3. In `processToolLifecycleChunk` assistant `tool_use` branch:
   - ignore/suppress `send_message_to` lifecycle as today where appropriate;
   - upsert invocation with args;
   - emit started once with `arguments`.
4. In `handleToolPermissionCheck`:
   - upsert/merge invocation state;
   - use the same started-once helper instead of direct unconditional started emission.
5. In `processToolLifecycleChunk` `tool_result` branch:
   - consume tracked state;
   - emit completed with `arguments: tracked.toolInput` when available.
6. Verify `ClaudeSessionEventConverter` preserves completion `arguments`; add/adjust tests if needed.
7. If completion args are added, extend frontend success/failure parsers/handlers to merge optional `arguments` as fallback before updating result/error.
8. Add backend coordinator unit tests and frontend handler tests.
9. Update Claude e2e matcher:
   - after `TOOL_APPROVAL_REQUESTED`, store that invocation ID;
   - wait for started/approved/succeeded for that invocation only;
   - assert started/request payloads include expected non-empty arguments;
   - avoid selecting preliminary successes from safe tools.
10. Run targeted unit tests and, where credentials are available, gated Claude e2e with raw logging.

## Key Tradeoffs

- Emitting started on raw `tool_use` may show Activity cards earlier for safe tools, which is desired and matches user expectations.
- Including arguments on completion is redundant when started already arrived, but improves resilience for result-first consumers and memory projection.
- Fixing this in frontend only would be smaller but wrong: memory/history and API/e2e payloads would still lack arguments.

## Risks

- Duplicate started events if raw observation and permission callback both emit for the same invocation without shared state.
- Accidentally reintroducing `send_message_to` lifecycle noise for Claude team communication.
- Gated live Claude e2e can be slow/flaky/costly; rely on unit fixtures for deterministic coverage and keep e2e focused.

## Guidance For Implementation

- Keep the change local and invariant-driven; do not introduce a new runtime event type.
- Prefer a small helper in `ClaudeSessionToolUseCoordinator` over duplicated emission logic in multiple branches.
- Treat `arguments: {}` as a valid empty payload, but only render non-empty args in UI as currently done.
- Make tests assert exact payload shape for `Bash` raw-observed tool_use and duplicate suppression for `Write`/permission path.
- Re-run at minimum:
  - `pnpm -C autobyteus-server-ts test tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts --run`
  - new coordinator unit test file
  - relevant frontend `toolLifecycleHandler` tests
  - optional gated e2e: `RUN_CLAUDE_E2E=1 ... pnpm -C autobyteus-server-ts test tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --run -t "routes tool approval over websocket and streams the normalized tool lifecycle"`
