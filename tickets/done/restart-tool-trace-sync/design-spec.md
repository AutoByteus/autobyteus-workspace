# Design Spec

## Current-State Read

The confirmed bug is a live-to-history source mismatch for Codex MCP/dynamic tool calls.

Current backend flow:

- Codex app-server raw events contain MCP tool-call arguments on `item/started` and often on `item/completed`.
- `codex-thread-notification-handler.ts` tracks pending MCP calls on `item/started`, then emits `codex/local/mcpToolExecutionCompleted` on `item/completed` and deletes the pending call.
- `codex-item-event-converter.ts` currently treats `mcpToolCall` `item/started` as a generic `SEGMENT_START` only. That live segment carries `metadata.arguments`, so live middle trace and live Activity can show arguments.
- The same converter maps `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` to a terminal `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` event, but the emitted terminal lifecycle payload has no top-level `arguments`.
- `runtime-memory-event-accumulator.ts` persists tool calls from `TOOL_APPROVAL_REQUESTED` and `TOOL_EXECUTION_STARTED`; it ignores `SEGMENT_START(segment_type=tool_call)` for memory persistence. Therefore MCP auto-executed tools are only synthesized when the result arrives, and their persisted `tool_args` become `{}`.
- `raw-trace-to-historical-replay-events.ts`, `historical-replay-events-to-conversation.ts`, and `historical-replay-events-to-activities.ts` faithfully project those empty persisted args into history. This is why reloaded Activity has no Arguments section.

Current frontend flow:

- Live `SEGMENT_START` handling in `segmentHandler.ts` creates the middle tool segment and calls `upsertActivityFromToolSegment`, keeping live middle trace and Activity in sync.
- Historical projection builders can reconstruct both conversation tool segments and Activity entries when the projection has canonical tool-call data.
- `agentRunOpenCoordinator.ts` hydrates Activity from projection unconditionally, even when it chooses `KEEP_LIVE_CONTEXT` and preserves the existing live transcript.
- `teamRunContextHydrationService.ts` has Activity hydration side effects while loading live team projections, before `teamRunOpenCoordinator.ts` decides whether it will preserve an existing subscribed live context.

Constraints:

- Existing live segment-first Activity behavior from the previous ticket must remain intact.
- Persisted history must be fixed at the canonical source; frontend should not guess arguments from result payloads.
- No compatibility dual-path should keep the old MCP persistence behavior as an alternate policy.

## Intended Change

Make Codex MCP tool starts canonical lifecycle facts for persistence, and make projection hydration apply transcript + Activity together rather than Activity-only.

Target behavior:

1. A Codex MCP `item/started` must fan out into both:
   - `SEGMENT_START(segment_type=tool_call)` for live transcript/live Activity presentation; and
   - `TOOL_EXECUTION_STARTED` with the same invocation id, tool name, turn id, and arguments for canonical memory persistence.
2. MCP terminal events must preserve/merge the same arguments when available, so result rows keep the same `toolArgs` even if a terminal event is the first event memory sees.
3. Historical projection must then naturally rebuild both middle transcript tool cards and Activity rows with the same args/result/status because raw traces contain the canonical data.
4. Frontend run/team open code must not hydrate Activity from projection while preserving a different live transcript. If projection is applied, apply both conversation and Activity; if live context is preserved, preserve both live conversation and live Activity.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change / Small Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Real Codex E2E probes show raw Codex `item/started` includes args, live `SEGMENT_START` includes args, but persisted raw traces and `getRunProjection` have `{}`. Frontend open code can hydrate Activity independently from transcript under live-context preservation.
- Design response: Promote MCP `item/started` into the same segment + lifecycle-start fanout used by `dynamicToolCall` / `webSearch`, harden MCP terminal events with arguments, and tighten frontend projection application so Activity hydration is not independent of transcript projection.
- Refactor rationale: The defect is not a local display bug. The authoritative persisted tool-call fact is missing, and frontend projection ownership allows surfaces to diverge. The refactor is bounded to the Codex conversion/persistence seam and the run-open projection application seam.
- Intentional deferrals and residual risk, if any: Existing historical rows already persisted with `{}` cannot be fully repaired unless Codex raw event logs or external artifacts still exist. This ticket fixes new/future runs; historical backfill is deferred unless explicitly requested.

## Terminology

- `Canonical tool-call fact`: one persisted invocation record with invocation id, tool name, arguments, status/result/error linkage.
- `Live segment`: `SEGMENT_START` / `SEGMENT_END` used by the middle trace and live Activity projection.
- `Lifecycle event`: `TOOL_EXECUTION_STARTED` / terminal `TOOL_EXECUTION_*` event used by memory persistence and status/result updates.
- `Projection application`: frontend replacement/merge of conversation and Activity state from `getRunProjection` / `getTeamMemberRunProjection`.

## Design Reading Order

1. Follow the Codex live event-to-memory spine.
2. Follow the historical projection-to-frontend spine.
3. Review the file responsibility mapping and validation plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace the MCP-start segment-only mapping with segment + lifecycle fanout. Do not retain a separate MCP path where auto-executed tool calls are persisted only at terminal result time.
- Frontend Activity-only projection hydration under `KEEP_LIVE_CONTEXT` must be removed; do not keep it behind a flag.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Codex `mcpToolCall item/started` | Persisted `raw_traces.jsonl` `tool_call` with args | Codex event conversion + runtime memory recorder | This is the confirmed argument-loss point. |
| DS-002 | Return-Event | Codex MCP completion | Persisted `tool_result` with same args/result/error | Codex notification/conversion + runtime memory recorder | Terminal rows must preserve the same invocation identity and arguments. |
| DS-003 | Primary End-to-End | `getRunProjection` / `getTeamMemberRunProjection` | Middle transcript + Activity UI after reload | Run hydration/open coordinators | Reloaded surfaces must be applied together. |
| DS-004 | Bounded Local | Existing live `SEGMENT_START` stream | Live Activity upsert | `segmentHandler` / `toolActivityProjection` | Must remain unchanged except receiving better canonical events. |

## Primary Execution Spine(s)

- DS-001: `Codex raw item/started -> CodexThreadNotificationHandler -> CodexThreadEventConverter -> RuntimeMemoryEventAccumulator -> RunMemoryWriter/raw_traces`
- DS-003: `Raw traces -> HistoricalReplayEvents -> RunProjection -> frontend run/team open coordinator -> conversation + Activity stores`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | MCP tool start arrives with args; converter emits both live segment and lifecycle-start event; memory persists a `tool_call` immediately with args. | Codex thread, converter, memory accumulator, memory writer | Codex event converter and memory recorder | Tool payload parsing, invocation id normalization |
| DS-002 | MCP completion emits terminal lifecycle event with result/error and available args; memory updates same invocation and writes `tool_result` with retained args. | Notification handler, converter, memory accumulator | Codex notification/converter seam | Pending MCP call lookup, result/error extraction |
| DS-003 | History projection reads persisted args and builds both conversation tool segment and Activity entry; frontend applies both together or preserves both live surfaces. | Projection provider, run open coordinator, stores | Run hydration/open coordinators | Activity hydration mapper, team member focus selection |
| DS-004 | Live stream still creates middle card and Activity from segment start. | Segment handler, Activity projection | Agent streaming handlers | Invocation alias matching |

## Spine Actors / Main-Line Nodes

- `CodexThreadNotificationHandler`: observes raw Codex item lifecycle and enriches local MCP completion facts.
- `CodexThreadEventConverter`: owns raw Codex-to-`AgentRunEvent` semantic conversion.
- `RuntimeMemoryEventAccumulator`: owns canonical raw trace writes from normalized lifecycle events.
- `RunProjection` transformers/providers: own historical conversation/Activity projection from raw traces.
- `agentRunOpenCoordinator` / `teamRunOpenCoordinator`: own whether projection replaces or live state is preserved.

## Ownership Map

- Codex converter owns event fanout shape. It should decide that MCP starts are both presentational segments and lifecycle starts.
- Notification handler owns pending MCP call correlation. It should expose pending arguments to completion events before deleting the pending call.
- Runtime memory accumulator owns persistence semantics, not Codex-specific parsing. It should not learn Codex MCP item internals when the converter can provide a normal lifecycle event.
- Frontend run open coordinators own projection application strategy. Loaders should return data; coordinators decide when to mutate stores.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `getRunProjection` / `getTeamMemberRunProjection` | Run projection services/providers | Transport query boundary | Frontend store mutation policy |
| `loadRunContextHydrationPayload` / team loader | Run hydration data loader | Fetch and assemble projection/resume data | Deciding whether Activity-only hydration is allowed |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| MCP `item/started` segment-only conversion | It drops canonical args before memory persistence | MCP segment + lifecycle fanout in `codex-item-event-converter.ts` | In This Change | Update existing unit test that expects one event. |
| Activity hydration after `KEEP_LIVE_CONTEXT` in agent run open | It can replace Activity while preserving a different transcript | Projection hydrate only inside `HYDRATE_FROM_PROJECTION` branch | In This Change | Preserve file-change merge behavior. |
| Live team loader Activity side effect | Loader mutates Activity before open coordinator decides preserve/replace | Coordinator-owned projection application | In This Change | Avoid hidden side effects. |

## Return Or Event Spine(s) (If Applicable)

DS-002: `Codex item/completed -> pending MCP lookup -> local MCP completion event with args/result/error -> terminal tool event -> memory tool_result -> projection status/result`.

Terminal events should not create a second tool call when the start event was already persisted; `RuntimeMemoryEventAccumulator` already dedupes by invocation id through `callWritten`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `RuntimeMemoryEventAccumulator`
  - Chain: `TOOL_EXECUTION_STARTED -> resolveToolState -> writeToolCall -> later terminal event -> recordToolResult`
  - Why it matters: once MCP start emits a lifecycle event, existing memory logic should retain tool args without Codex-specific persistence code.
- Parent owner: frontend run open coordinator
  - Chain: `load payload -> decide strategy -> apply projection to conversation+Activity or preserve live context`
  - Why it matters: prevents middle/right divergence during reload/reconnect.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool payload parsing | DS-001, DS-002 | Codex event converter | Extract tool name, args, result/error from Codex item payloads | Keeps converter semantic and testable | Memory would become Codex-specific. |
| Pending MCP correlation | DS-002 | Notification handler | Recover args/tool name/turn id when completion payload is incomplete | Completion must match start invocation | Converter would need mutable thread state. |
| Activity entry mapping | DS-003, DS-004 | Activity hydration/projection | Convert tool projection/segment into store row | Keeps UI data shape stable | Open coordinator would duplicate mapping. |
| Invocation alias matching | DS-004 | Live Activity projection | Update existing live Activity rows without duplicates | Existing live behavior depends on it | Segment handler would grow store-specific policy. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Persist MCP tool args | Codex event converter + runtime memory recorder | Extend | Dynamic and web search already fan out start to lifecycle; MCP should use same pattern | N/A |
| Terminal result arg hardening | Codex notification/converter | Extend | Pending MCP state already exists | N/A |
| Reload surface sync | Run open/hydration services | Extend | They already own projection application strategy | N/A |
| Historical projection mappers | Run history projection transformers | Reuse | They already work if raw traces have args | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex backend event conversion | MCP start/terminal normalized event shape | DS-001, DS-002 | Codex runtime backend | Extend | Main source fix. |
| Agent memory persistence | Writing canonical raw traces from normalized lifecycle events | DS-001, DS-002 | Runtime memory recorder | Reuse | Avoid Codex-specific changes unless tests expose a generic merge gap. |
| Run history projection | Conversation/Activity from raw traces | DS-003 | Projection provider | Reuse | Should not need special MCP code after raw args fixed. |
| Web run hydration/open | Atomic projection-vs-live state application | DS-003 | Open coordinators | Extend | Remove side-effect/Activity-only hydration. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-item-event-converter.ts` | Codex backend event conversion | Raw Codex item -> `AgentRunEvent` | Add MCP start fanout and terminal arg payload support | Existing converter already owns item event semantics | Existing parser methods |
| `codex-thread-notification-handler.ts` | Codex thread notification | Raw notification enrichment | Add pending args/tool/turn to local MCP completion | Existing handler owns pending MCP lifecycle | Existing pending map |
| `codex-thread.ts` | Codex thread state | Pending MCP calls | Provide safe lookup/accessor for pending call by invocation id | Avoid external direct map access | Existing `CodexPendingMcpToolCall` |
| `agentRunOpenCoordinator.ts` | Web run open | Agent projection strategy | Hydrate Activity only when applying projection conversation | Existing owner decides `KEEP_LIVE_CONTEXT` | Existing strategy policy |
| `teamRunContextHydrationService.ts` | Web team hydration | Data loader and member projection application | Remove live-loader Activity side effect; keep apply-member projection combined | Loader should not mutate Activity before coordinator decision | Existing helpers |
| `teamRunOpenCoordinator.ts` | Web team run open | Team projection strategy | Apply member Activity only when replacing member conversations; preserve live context otherwise | Existing owner decides live preservation | Existing member merge |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| MCP start fanout vs dynamic start fanout | None required initially | Codex converter | The existing dynamic helper can be reused or a small local MCP helper can call the same parser | Yes | Yes | A generic catch-all tool converter that hides special web/file/search behavior |
| Projection application decision | Existing `runOpenStrategyPolicy.ts` plus coordinators | Run open services | Strategy already says preserve live vs hydrate projection | Yes | Yes | A loader-side store mutation shortcut |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunEvent` tool payload fields | Yes: `invocation_id`, `tool_name`, `arguments`, `result`, `error` | Yes | Low | MCP conversion should populate these top-level fields instead of relying on nested `item.arguments`. |
| `RawTraceItem.toolArgs` | Yes | Yes | Low | Ensure start and result rows receive same object through memory tool state. |
| Projection Activity/conversation args | Yes | Yes | Low | No frontend backfill/guessing from result. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex event conversion | Codex item event semantic converter | Treat `mcpToolCall` starts like dynamic starts: segment + `TOOL_EXECUTION_STARTED`; include args on MCP/local terminal lifecycle events when available | Item conversion already owns event fanout | `CodexToolPayloadParser` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Codex thread notifications | Notification enrichment | Enrich `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` with pending call `arguments`, `tool_name`, `turn_id` before deleting pending state | Handler already tracks pending MCP calls | `CodexPendingMcpToolCall` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex thread state | Thread pending MCP state | Add/read pending MCP call by invocation id or return removed call from completion helper | Encapsulates map access | Existing pending call type |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex tests | Converter unit coverage | Update MCP start expectation to two events; assert lifecycle args and terminal args | Existing unit test owner | N/A |
| `autobyteus-server-ts/tests/integration/agent-memory/...` or existing memory/projection test file | Memory/projection validation | Cross-subsystem persistence/projection | Add Codex MCP start+completion normalized-event test through memory and projection | Needs durable regression for the confirmed bug | Existing projection utilities |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Runtime E2E | Real Codex validation | Extend existing Codex MCP auto-exec test or add gated test to assert persisted/projection args; update stale `TOOL_APPROVED` assumption if necessary | Existing real Codex websocket E2E path | GraphQL memory/projection queries |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | Web run open | Agent run projection strategy | Move `hydrateActivitiesFromProjection` into projection-replacement branch only | Prevent Activity-only replacement while preserving transcript | Existing strategy policy |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Web team hydration | Team projection loading/member apply | Remove `hydrateLoadedMemberActivities` side effect from live loader; keep Activity hydration in `applyProjectionToTeamMemberContext` where conversation is replaced | Loader returns data; apply function mutates both surfaces | Existing projection helper |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Web team open | Team live/projection strategy | Ensure Activity hydration occurs only for members whose projection conversation is applied; no Activity-only hydration under live preservation | Coordinator owns preserve-vs-replace decision | Existing member merge |
| `autobyteus-web/services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts` and new/updated team open tests | Web tests | Run open strategy tests | Assert KEEP_LIVE_CONTEXT does not call Activity projection hydration; historical projection still does | Locks restored invariant | Existing mocks |

## Ownership Boundaries

- Codex conversion boundary: all Codex-specific nested item shapes must be normalized before events reach memory.
- Memory boundary: memory persists normalized `AgentRunEvent` lifecycle facts and should not inspect Codex-specific nested `item` payloads.
- Projection boundary: backend projection maps raw traces into conversation/activity; it should not repair missing args from unrelated sources.
- Frontend open boundary: coordinators decide whether projection replaces current state. Loaders should not mutate stores except through explicit apply functions for projection replacement.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadEventConverter` | Payload parser, item-type fanout | Codex thread listeners / runtime dispatch | Memory reading nested Codex item args | Add normalized top-level fields to emitted events |
| `RuntimeMemoryEventAccumulator` | Tool state map and raw trace writes | Agent run memory recorder | Converter writing raw trace files directly | Emit proper lifecycle events |
| `openAgentRun` / `openTeamRun` | Preserve-vs-hydrate strategy | History selection/recovery actions | Loader hydrating Activity independently | Return projection data and apply in coordinator branch |

## Dependency Rules

Allowed:

- Codex notification handler may consult `CodexThread` pending MCP state.
- Codex converter may use `CodexItemEventPayloadParser` / `CodexToolPayloadParser` to normalize args.
- Memory accumulator may rely on top-level normalized tool payload fields.
- Frontend open coordinators may call Activity hydration when they also apply the matching projection conversation.

Forbidden:

- Do not make memory parse Codex-specific nested `item.arguments` as the primary fix.
- Do not let history projection guess arguments from tool results.
- Do not hydrate Activity from projection under `KEEP_LIVE_CONTEXT` while leaving the middle transcript live/stale.
- Do not keep separate old/new MCP persistence paths.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunEvent` tool lifecycle payload | Tool invocation | Carry canonical invocation id/name/args/result/error | `invocation_id` string | MCP must use same top-level args as dynamic/web search. |
| `getRunProjection(runId)` | Agent run history projection | Return conversation + Activity from raw traces | run id | No special frontend repair. |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Team member history projection | Return one member conversation + Activity | compound identity | Activity and conversation should refer to same member run id. |
| `openAgentRun` / `openTeamRun` | Frontend open operation | Apply projection or preserve live context | run id / team id + member route key | Coordinator owns store mutation policy. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunEvent` lifecycle payload | Yes | Yes | Low | Populate `arguments` for MCP starts/terminals. |
| Team member projection query | Yes | Yes | Low | Keep `teamRunId + memberRouteKey`. |
| Frontend loaders | Mostly | Yes | Medium due side effects | Remove Activity hydration side effect from live team loader. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| MCP pending call | `CodexPendingMcpToolCall` | Yes | Low | Add accessor, keep name. |
| Projection application | Existing coordinator methods | Yes | Medium | Make branch behavior explicit in tests. |
| Tool args | `arguments` / `toolArgs` | Yes | Low | Keep top-level event `arguments`, persisted `toolArgs`. |

## Applied Patterns (If Any)

- Adapter/converter: `CodexThreadEventConverter` adapts raw Codex events to normalized runtime events.
- State map: `RuntimeMemoryEventAccumulator` maintains tool state by invocation id.
- Strategy: `runOpenStrategyPolicy` chooses preserve live vs hydrate projection.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | Folder | Codex event conversion | MCP item fanout and terminal mapping | Existing conversion subsystem | Raw trace file writes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Folder | Codex thread state/notification | Pending MCP state enrichment | Existing thread notification owner | Projection logic |
| `autobyteus-server-ts/src/agent-memory/services/` | Folder | Runtime memory | Existing tool-state persistence | Already persists normalized lifecycle events | Codex-specific item parsing |
| `autobyteus-web/services/runOpen/` | Folder | Frontend run open strategy | Preserve vs hydrate projection decision | Existing open coordinator subsystem | GraphQL projection mapping internals |
| `autobyteus-web/services/runHydration/` | Folder | Projection loading/building | Data loading and pure/constrained projection application | Existing hydration subsystem | Hidden Activity-only mutations in data loaders |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Codex `events/` | Adapter/Converter | Yes | Low | Keep all raw-to-normalized event semantics here. |
| Codex `thread/` | Runtime state/notification | Yes | Low | Pending MCP correlation belongs with thread state. |
| Web `runOpen/` | Main-line UI orchestration | Yes | Low | Coordinator owns mutation strategy. |
| Web `runHydration/` | Projection loading/mapping | Medium | Medium | Remove hidden store mutation from live team loader. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| MCP start conversion | `item/started(mcpToolCall,args) -> [SEGMENT_START(metadata.arguments), TOOL_EXECUTION_STARTED(arguments)]` | `item/started(mcpToolCall,args) -> SEGMENT_START only` | Memory persists lifecycle, not segment metadata. |
| Frontend open strategy | `HYDRATE_FROM_PROJECTION -> replace conversation + hydrate Activity`; `KEEP_LIVE_CONTEXT -> preserve conversation + preserve Activity` | `KEEP_LIVE_CONTEXT -> preserve conversation + hydrate Activity from projection` | Prevents right/middle desync. |
| History projection | raw `toolArgs` -> conversation `toolArgs` and Activity `arguments` | frontend derives args from result text | Keeps one canonical source. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep MCP segment-only path and teach memory to parse segment metadata | Quick local persistence patch | Rejected | Normalize MCP starts into lifecycle events like dynamic/web search. |
| Frontend fallback to infer args from result payload/file paths | Could make old rows look better | Rejected for in-scope fix | Persist canonical args for new runs; old-row backfill is separate. |
| Hydrate Activity even when preserving live transcript | Existing behavior from prior refactor | Rejected | Activity projection only when projection conversation is applied. |

## Derived Layering (If Useful)

- Runtime adapter layer: Codex raw event conversion.
- Runtime persistence layer: memory accumulator and writer.
- Projection layer: historical replay and projection DTOs.
- Frontend application layer: run/team open coordinators.

## Migration / Refactor Sequence

1. Backend converter fix:
   - Add MCP start fanout in `codex-item-event-converter.ts` using existing dynamic-tool argument resolution.
   - Add/adjust helper so MCP terminal lifecycle events include `arguments` when present.
   - Enrich `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` with pending call args/tool name/turn id in notification handler before pending deletion.
2. Backend tests:
   - Update converter unit test for MCP start from one event to two events.
   - Add terminal MCP unit tests for success and failure retaining arguments.
   - Add memory/projection integration coverage proving raw trace and projection args are non-empty.
3. Frontend projection application fix:
   - Move agent Activity hydration into projection-replacement branch only.
   - Remove live team loader Activity side effect; ensure team coordinator/apply-member path hydrates Activity only when applying matching conversation projection.
4. Frontend tests:
   - Update `agentRunOpenCoordinator.spec.ts` KEEP_LIVE_CONTEXT expectation.
   - Add/extend team run open tests for live preservation vs historical projection.
5. Real validation:
   - Extend existing gated Codex MCP E2E to assert live segment args, raw memory args, and projection args for the same invocation. If current autoexec stream does not emit `TOOL_APPROVED`, update that stale expectation to current actual contract rather than blocking the new assertion.

## Validation Plan

Required checks:

- Unit: `codex-thread-event-converter.test.ts` MCP `item/started` emits both segment and lifecycle-start with identical args.
- Unit: MCP local completion emits terminal event with `arguments` when available.
- Integration: normalized MCP start+completion through `RuntimeMemoryEventAccumulator` and `buildRunProjectionBundleFromEvents` produces:
  - `tool_call.toolArgs` with args;
  - `tool_result.toolArgs` with same args;
  - projection conversation `toolArgs` with same args;
  - projection Activity `arguments` with same args.
- Frontend unit: historical open hydrates both conversation and Activity; live subscribed reopen does not hydrate Activity from projection while preserving conversation.
- Optional/gated E2E: `RUN_CODEX_E2E=1` real Codex MCP tool call proves the live-to-history path with raw event logging if needed.

## Open Risks

- Existing user history already persisted with `{}` remains incomplete. This design does not backfill old rows.
- Real `generate_image` E2E can be slow/flaky because image generation may time out. Durable validation should use the cheaper real MCP `speak` path or a deterministic integration-level MCP payload; both exercise the same Codex MCP conversion path.
