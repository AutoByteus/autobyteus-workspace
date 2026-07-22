# Agent Event Monitor Codex Reasoning Lifecycle Design Spec

## Current-State Read

The supported Codex runtime emits completed reasoning snapshots and tool/lifecycle notifications through `CodexThreadEventConverter`. The adapter intentionally combines consecutive completed provider reasoning snapshots into one logical Thinking block. `CodexReasoningBlockTracker` owns that block's generated segment identity, and the distributed Codex sub-converters already decide whether each provider notification is a real ordered boundary or an in-place/no-effect update.

The boundary decision currently has no lifecycle consequence. `clearForTurn` and `clearAll` delete the active block identity and return `void`; `createReasoningContentEvent` emits only `SEGMENT_CONTENT`. The generic frontend therefore never receives the `SEGMENT_END` that would mark a Think stream identity presentation-complete. The approved latest-100 selector then correctly protects those falsely mutable Thinking blocks and completed-first evicts terminal tools. Enforcement mutates the canonical live conversation, so switching to that active context can expose a Thinking-heavy feed that later provider/projection activity may repair.

The existing provider adapter is the correct owner; it uniquely knows both the logical block identity and the provider-specific boundary. The generic stream mapper, frontend segment handler, recent-window selector, selection/hydration paths, Vue components, and final GraphQL projections are healthy for this scope. The target is a bounded lifecycle-ownership correction, not a UI or history redesign.

## Intended Change

Turn Codex reasoning-block closure into an explicit ordered lifecycle result:

1. `CodexReasoningBlockTracker` returns typed `content` and `end` actions instead of silently dropping identities.
2. Consecutive completed snapshots with the same active turn continue to emit `content` actions for one stable block identity.
3. The current real ordered boundary returns one `end` action for the active block. Duplicate/no-effect boundaries return none.
4. A snapshot without a correlatable turn emits `content` followed immediately by `end`; it cannot safely remain open for later grouping.
5. Reachable turn-start/error global clear returns active ends deterministically. The defensive 128-turn capacity guard is `Not Reachable` under the supported sequential lifecycle and remains unchanged; it does not drive lifecycle machinery in this ticket.
6. `CodexThreadEventConverter` maps reasoning lifecycle actions to generic `SEGMENT_CONTENT`/`SEGMENT_END` events. Codex item/raw/turn/thread sub-converters explicitly prepend returned reasoning-end events before the provider boundary events they produce.
7. Generic frontend and persistence consumers remain provider-neutral and unchanged in behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | `User` | `REQ-001`, `REQ-004`, `REQ-007`; `AC-001`, `AC-002` | Select an active standalone/focused-team Codex context after long activity | Investigation `BEH-001`; browser switch and screenshots | Cached state remains coherent because prior live commits received valid reasoning completion; selection itself stays unchanged | `DS-001`, `DS-004` |
| `BEH-002` | `System` | `REQ-001`–`REQ-004`; `AC-001`, `AC-003` | Terminal tool followed by later reasoning at/over the 100-visual bound | Exact recent-window probe; investigation findings 2–6 | Closed Thinking is no longer falsely protected; ordinary oldest eligible eviction remains | `DS-001`, `DS-002` |
| `BEH-003` | `Contract` | `REQ-001`–`REQ-003`; `AC-003`, `AC-004` | Multiple completed snapshots followed by an existing real ordered boundary | Codex tracker/converter and 48-test boundary matrix | Stable grouped identity until boundary; exactly one end before boundary; matching tool updates preserve block | `DS-002` |
| `BEH-004` | `System` | `REQ-002`, `REQ-005`; `AC-004` | Missing turn identity or reachable turn-start/error global clear | Investigation tracker/normalizer source read and `MP-MISSING-TURN-001` | No content-bearing block on a supported path is abandoned; closure actions are deterministic | `DS-002` |
| `BEH-005` | `Operational` | `REQ-006`, `REQ-007`; `AC-005`, `AC-006` | Normalized events are persisted/projected | Six GraphQL probes, raw-trace scan, memory accumulator source | Existing history stays directly usable; future reasoning persists once per block at the explicit boundary | `DS-003` |

## Relevant Supplemental Task Artifacts

None. User screenshots and sanitized probe results are evidence inventoried by `investigation-notes.md`; no supplemental artifact defines intended behavior.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `Yes`
- Evidence: The provider adapter owns both the grouped reasoning identity and the real boundary, but its public internal clear operation returns `void`. Generic consumers correctly require an end event. Real turns exceed the retention threshold and the exact destructive consequence was reproduced.
- Design response: Make the tracker's lifecycle transition explicit and require the governing converter to translate it into ordered generic events.
- Refactor rationale: A local extra event in one item branch would miss user/text/turn/error/global paths and retain silent abandonment. The typed lifecycle action contract fixes all supported owned closure paths without moving provider policy downstream. `MP-CAP-001` is explicitly excluded as synthetic/out-of-contract.
- Intentional deferrals and residual risk: The precise later installed-session tool-reappearance trigger remains unclassified, but no target behavior depends on it. The proven destructive path is removed at its first faulty boundary.

## Terminology

- **Logical reasoning block:** One user-visible Codex Thinking segment composed of one or more completed provider reasoning snapshots until a real ordered boundary.
- **Reasoning lifecycle action:** A typed tracker output: `content` for an append to a logical block or `end` for terminal completion of that block identity.
- **Real ordered boundary:** A provider notification already classified by current Codex conversion as ending the active reasoning block, including user/non-reasoning item, assistant text, first ordered-tool creation/result-first creation, turn lifecycle, or terminal error.
- **Matching tool update:** A lifecycle/log/result notification for an ordered tool card already created in the current turn; it updates in place and does not end the reasoning block.

## Design Reading Order

Read the approved behavior map first, then the lifecycle action/state-machine design (`DS-002`), the outward live path (`DS-001`), and persistence path (`DS-003`). File changes derive from those owners; no frontend source change is part of the target structure.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the obsolete `void` reasoning clear APIs and the old update-only return shape. Every content-bearing block must terminate through the new lifecycle action contract.
- No dual emission, legacy fallback clear, provider flag, or frontend heuristic remains.
- Existing stored traces are not a legacy schema and continue through the current version-agnostic reader without compatibility branching.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: JSONL reasoning/tool/user/assistant trace records, manifests, and working-context snapshots under the server memory directory. The reported runs had 16/18 archived trace files and real turns up to 385 reasoning+tool visuals.
- Relevant code-model, serialization, semantic, or physical-store change: No storage-schema change. Future normalized streams add the previously missing reasoning `SEGMENT_END`; `RuntimeMemoryEventAccumulator` may flush the same logical reasoning earlier at that boundary.
- Normal reader/writer behavior and representative evidence: The accumulator already handles `SEGMENT_END`, and later tool/turn flush is a no-op after removal from its active segment map. Projection reads semantic trace kind/content/order. Six live queries proved existing traces directly readable.
- Required semantics and invariants under direct use: Exactly one reasoning trace per logical block, unchanged content, stable tool/reasoning order, no archive loss.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: User history must not be rewritten; live frontend state is ephemeral and can be rebuilt from projection on application restart/update.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Existing records already carry the required meaning. Migration offers no correctness benefit and would add I/O/corruption risk. The changed subject is future event timing, not persisted shape.
- Acceptance criteria/design constraints supported: `REQ-006`; `AC-005`, `AC-006`.

### Migration Plan (Only When Decision Is `Migration Required`)

`N/A` — existing data is directly usable.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `BEH-001`, `BEH-002`, `BEH-003` | Codex app-server notification during a supported run | Stable Event Monitor presentation | `CodexThreadEventConverter` governs provider normalization; generic downstream owners preserve their contracts | Main user-visible live path that currently loses tools |
| `DS-002` | `Bounded Local` | `BEH-002`, `BEH-003`, `BEH-004` | One Codex provider notification | Ordered normalized `AgentRunEvent[]` | `CodexThreadEventConverter` with `CodexReasoningBlockTracker` as owned state machine | Exact lifecycle/boundary correction |
| `DS-003` | `Return-Event` | `BEH-005` | Normalized reasoning/tool/turn events | Raw trace/snapshot and later GraphQL projection | `RuntimeMemoryEventAccumulator` | Proves future persistence remains exactly-once and existing data needs no migration |
| `DS-004` | `Primary End-to-End` | `BEH-001` | User selects active standalone/team member | Existing cached conversation is rendered | `AgentContextsStore` / `AgentTeamContextsStore` selection ownership | Preserved path that exposes, but does not create, the defect |

## Primary Execution Spine(s)

`DS-001: Codex App Server -> CodexThreadEventConverter -> Codex reasoning lifecycle state -> normalized AgentRunEvent sequence -> AgentRunEventMessageMapper / WebSocket -> generic frontend segment handler -> recent-window commit -> AgentConversationFeed`

`DS-004: Workspace run tree -> runHistorySelectionActions -> AgentContextsStore / AgentTeamContextsStore -> selected AgentEventMonitor -> AgentConversationFeed`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | A provider notification is normalized into ordered content/end/boundary events. Generic streaming marks the exact Think identity complete before applying the next boundary event; the existing window then classifies all visuals correctly and renders a stable feed. | Provider notification, logical reasoning block, normalized event, live conversation, feed presentation | `CodexThreadEventConverter` at the changed boundary | transport mapping, segment identity, retention, rendering |
| `DS-002` | Inside one converter call, the provider-specific sub-converter classifies the notification. Tracker transitions return ordered lifecycle actions; the converter maps them to events and explicitly places end events before the boundary output. | active block state, lifecycle action, event list | `CodexThreadEventConverter`; state invariant delegated to `CodexReasoningBlockTracker` | payload parsing, ordered-tool classification, debug logging |
| `DS-003` | The same normalized end event flushes the active reasoning segment once. The immediately following tool/turn boundary sees no open duplicate. Existing/future semantic traces continue through current projection. | normalized event, memory segment, trace, projection | `RuntimeMemoryEventAccumulator` | JSONL writer, tool trace sequencer, projection reader |
| `DS-004` | Selection focuses an existing context and renders its canonical conversation without adding a repair request or delay. Correctness comes from preventing upstream live degradation. | selection target, agent/team context, feed | existing selection/context stores | history tree metadata refresh |

## Spine Actors / Main-Line Nodes

| Node | Main-Line Role |
| --- | --- |
| `CodexThreadEventConverter` | Authoritative provider adapter and event-order owner |
| `CodexReasoningBlockTracker` | Logical reasoning block state/invariant owner inside the converter |
| Codex item/raw/turn/thread sub-converters | Provider-surface classification and explicit event placement |
| `AgentRunEventMessageMapper` | Normalized server-event to generic WebSocket message translation |
| Frontend `handleSegmentContent` / `handleSegmentEnd` | Provider-neutral live conversation mutation |
| Recent Event Monitor window | Provider-neutral completion-aware retention |
| `RuntimeMemoryEventAccumulator` | Normalized runtime-event persistence projection |
| Agent/team context stores | Preserved selected-context ownership |

## Ownership Map

- `CodexThreadEventConverter` owns conversion-call sequencing, source event attribution, construction of generic `AgentRunEvent`s, and final order returned to server consumers.
- `CodexReasoningBlockTracker` owns active block identity by turn, snapshot dedupe/grouping, the existing defensive active-state bound, and the no-silent-abandonment invariant for supported lifecycle paths. It returns domain lifecycle actions, not server transport objects; the unreachable capacity guard is retained unchanged.
- `CodexReasoningEventNormalizer` owns extraction of snapshot/turn/provider identity and delegates transitions to the tracker.
- `CodexItemEventPayloadParser` remains a thin internal parsing facade; it must not recreate lifecycle policy.
- Item/raw/turn/thread sub-converters own the existing boundary classification for their provider surface and explicitly prefix closure outputs.
- Generic web handlers own application of `SEGMENT_*` contracts; they must not infer Codex completion.
- Recent-window code owns retention policy; it must not compensate for provider lifecycle omissions.
- Memory accumulator owns persistence from normalized events; it must not inspect provider tracker state.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `CodexItemEventPayloadParser` | `CodexReasoningEventNormalizer` / tracker for reasoning lifecycle | Consolidates provider payload parsing for converter contexts | Event ordering or duplicate lifecycle policy |
| `AgentRunEventMessageMapper` | Normalized `AgentRunEvent` contract | Transport translation | Provider-specific reasoning semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `CodexReasoningBlockUpdate` update-only contract | Cannot express supported closure or missing-turn order | Ordered `CodexReasoningLifecycleAction` union in tracker-owned file | `In This Change` | Clean rename/replacement; no compatibility alias |
| `void clearForTurn` / `void clearAll` | Silently abandon active identities | Tracker close operations returning ordered `end` actions | `In This Change` | All callers must consume results |
| `void clearReasoningBlockForBoundary` parser/context callbacks | Lose lifecycle consequence between owner and event emitter | Explicit close methods returning actions/events | `In This Change` | No ignored return value allowed |
| Any proposed frontend Codex completion heuristic/timer/remount | Wrong owner and duplicates lifecycle policy | Existing generic `SEGMENT_END` contract | `In This Change` | Must not be introduced |

## Return Or Event Spine(s) (If Applicable)

`DS-003: CodexThreadEventConverter -> normalized SEGMENT_CONTENT / SEGMENT_END / tool or turn event -> RuntimeMemoryEventAccumulator -> RunMemoryWriter -> raw trace / working snapshot -> run-history projection -> GraphQL consumer`

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `CodexThreadEventConverter`

`DS-002: Receive CodexAppServerMessage -> select item/raw/turn/thread sub-converter -> classify boundary/tool placement -> tracker transition -> ordered reasoning lifecycle actions -> map actions to AgentRunEvents -> prepend/compose boundary events -> return ordered event list`

The action order is authoritative:

- reachable global-clear `end` actions before the turn/error boundary output;
- normal grouped `content` actions while the block remains active;
- missing-turn `content` immediately followed by its `end`;
- boundary `end` before user/text/tool/turn/error output.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider payload parsing | `DS-002` | `CodexThreadEventConverter` | Resolve turn, provider item, snapshot, tool identity | Isolates external shape translation | Parser could become hidden sequencing owner |
| Ordered-tool boundary tracking | `DS-002` | Item/raw sub-converters | Distinguish first card creation from matching update | Prevents false block splits | Reasoning tracker would absorb tool policy |
| Debug logging | `DS-002` | Tracker/converter | Observe transitions without payload leakage | Diagnosability | Logging must not control lifecycle |
| Web transport mapping | `DS-001` | Server event stream | Convert normalized events to protocol messages | Existing transport boundary | Provider knowledge would leak outward |
| Recent-window retention | `DS-001` | Event Monitor | Enforce completion-aware visual bound | Performance/product constraint | Would become a provider repair layer |
| Memory persistence | `DS-003` | Runtime history | Flush semantic reasoning/tool records | Durable projection | Must not influence live event order |
| Workspace tree refresh | `DS-004` | Selection tree | Refresh run metadata | Independent navigation freshness | Must not rehydrate/repair conversation state |

## Ownership Boundaries

The authoritative provider boundary is `CodexThreadEventConverter.convert`. Upstream runtime code supplies one provider message and consumes only normalized events. It must not call the tracker/normalizer directly.

Inside the boundary, the tracker is the sole owner of block state and lifecycle transitions. Sub-converters may decide *that* a real boundary occurred, but they close through the converter context and must consume the returned events explicitly.

After normalized events leave the adapter, every consumer is provider-neutral. The server mapper, browser handler, recent-window selector, and memory accumulator must remain unaware of Codex grouping rules.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadEventConverter.convert(message)` | parser, reasoning normalizer/tracker, ordered-tool tracker, sub-converters | Codex runtime/thread event source | Runtime calls tracker or sub-converter directly | Strengthen `convert`/internal context, not upstream dependencies |
| Tracker lifecycle transition methods | active-block map, dedupe, supported per-turn/global closure | reasoning normalizer only | Sub-converters delete tracker state | Return typed actions through normalizer/parser; leave the unreachable defensive capacity guard unchanged |
| Generic `SEGMENT_END` | frontend presentation completion and memory flush | all provider adapters through normalized events | Web code checks provider/runtime kind | Fix provider adapter emission |

## Dependency Rules

- Codex sub-converters may depend on their typed converter contexts, not concrete tracker instances.
- The parser/normalizer may depend on the tracker and its lifecycle action types.
- Only `CodexThreadEventConverter` creates `AgentRunEvent` objects from reasoning lifecycle actions.
- Sub-converters that cause closure must accept/return explicit reasoning-end event arrays and place them before their own boundary events.
- Generic mapper/web/window/persistence code may depend only on normalized event/message contracts.
- Forbidden: provider checks in frontend completion/retention; direct mutation of `_streamSegmentIdentity`; hidden unflushed event queues; ignored close return values; duplicate block maps; timeout-based closure; ending each completed snapshot.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CodexThreadEventConverter.convert(event)` | One provider notification | Return ordered normalized events | Codex method + JSON params | Authoritative adapter entrypoint |
| `CodexReasoningBlockTracker.append(input)` | One logical block transition | Dedupe/group content and surface ordered actions | `{ turnId: string | null, providerItemId: string | null, snapshot: string }` | Returns action list; no side-channel output |
| `closeForTurn(turnId)` | Active block for one turn | Remove and return one `end` action if present | non-empty turn ID | Idempotent after first close |
| `closeAll()` | All active blocks | Remove and return ordered `end` actions | no selector | Deterministic map insertion order |
| Converter-context `closeReasoningBlocksForBoundary(codexEventName, payload)` | Boundary-triggered active block(s) | Convert tracker ends to `SEGMENT_END` events | source event name + provider payload used only to resolve turn | Returns events; caller must prepend them |
| Generic `SEGMENT_END` payload | One stream segment | Mark exact reasoning identity terminal | `{ id, turn_id, segment_type: "reasoning" }` | Minimal payload; do not copy unrelated boundary tool payload |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `convert` | `Yes` | `Yes` | `Low` | None |
| tracker `append` | `Yes` | `Yes` | `Low` | Include explicit nullable turn/provider identities |
| `closeForTurn` | `Yes` | `Yes` | `Low` | Return typed action, not boolean/void |
| `closeAll` | `Yes` | `N/A` | `Low` | Preserve deterministic order |
| generic `SEGMENT_END` | `Yes` | `Yes` | `Low` | Require exact segment ID/type and closure-owned turn ID |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Logical block state owner | `CodexReasoningBlockTracker` | `Yes` | Low | Keep |
| Ordered transition type | `CodexReasoningLifecycleAction` | `Yes` | Low | Replace update-only name |
| Boundary close context method | `closeReasoningBlocksForBoundary` | `Yes` | Low | Use plural because missing-turn boundary may close all |
| Generic terminal event | `SEGMENT_END` | `Yes` | Low | Reuse existing contract |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider-specific block state | Codex event normalization/tracker | `Extend` | Already owns grouping identity and boundaries | N/A |
| Generic completion transport | `AgentRunEventType.SEGMENT_END` + message mapper | `Reuse` | Exact existing lifecycle contract | N/A |
| Browser completion | segment handler/identity | `Reuse` | Already marks presentation complete | N/A |
| Bounded retention | recent Event Monitor services | `Reuse` | Correct policy once lifecycle is valid | N/A |
| Persistence | runtime memory accumulator | `Reuse` | Already handles segment end | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex event adapter | provider translation, event order, boundary classification | `DS-001`, `DS-002` | `CodexThreadEventConverter` | `Extend` | Only source subsystem changes |
| Generic agent streaming | normalized message transport/application | `DS-001` | server mapper + web streaming services | `Reuse` | No provider branch |
| Event Monitor retention | completion-aware bound | `DS-001` | recent-window services | `Reuse` | No policy change |
| Runtime memory/history | normalized-event persistence/projection | `DS-003` | accumulator/projection providers | `Reuse` | Coverage verifies no duplication |
| Run selection/context | context focus/render | `DS-004` | agent/team context stores | `Reuse` | No repair coordination |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-reasoning-block-tracker.ts` | Codex event adapter | block state owner | Ordered content/end actions, dedupe, supported per-turn/global closure | Cohesive state machine | Exports lifecycle action type; retains defensive capacity guard unchanged |
| `codex-reasoning-event-normalizer.ts` | Codex event adapter | payload normalizer | Resolve snapshot/identities and pass actions | Existing responsibility | Yes |
| `codex-item-event-payload-parser.ts` | Codex event adapter | thin facade | Expose typed reasoning transitions | Existing parsing facade | Yes |
| `codex-thread-event-converter.ts` | Codex event adapter | authoritative adapter | Map actions to generic events and wire contexts | Owns final event construction/order | Yes |
| item/raw/turn/thread sub-converters | Codex event adapter | provider surface classifiers | Explicitly prefix closure events | Existing surface separation | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Ordered reasoning transition | Export from `codex-reasoning-block-tracker.ts` | Codex event adapter | Tracker, normalizer, parser, converter share one lifecycle result | `Yes` — one action union, no update+closure parallel shapes | `Yes` | Generic cross-provider event model |
| Reasoning end event mapping | Private method in `codex-thread-event-converter.ts` | Codex event adapter | All sub-converter contexts need one event construction rule | `Yes` | `Yes` | Hidden queue or standalone helper with ordering authority |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexReasoningLifecycleAction` union | `Yes` | `Yes` | `Low` | Discriminants `content`/`end`; both carry only segment/turn identity, content adds delta |
| Generic `SEGMENT_END` payload | `Yes` | `Yes` | `Low` | Minimal closure payload; no copied tool/boundary fields |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-block-tracker.ts` | Codex events | block state owner | Action union; append/dedupe; supported per-turn/global closure; unchanged defensive capacity guard | State and its transition type stay together | Defines shared action |
| `.../codex-reasoning-event-normalizer.ts` | Codex events | reasoning payload normalizer | Extract provider fields and propagate ordered actions | One normalization concern | Imports action |
| `.../codex-item-event-payload-parser.ts` | Codex events | internal parser facade | Typed reasoning append/close APIs | Existing facade stays thin | Imports action |
| `.../codex-thread-event-converter.ts` | Codex events | authoritative adapter | Convert actions to minimal generic events; context wiring; final ordering | Only owner allowed to construct normalized events | Imports action |
| `.../codex-item-event-converter.ts` | Codex events | item surface | Preserve boundary matrix; prepend closure results in every item/tool path | Existing item classification | Uses context events |
| `.../codex-raw-response-event-converter.ts` | Codex events | raw-result surface | Return arrays and prefix result-first closure | Existing raw surface | Uses context events |
| `.../codex-turn-event-converter.ts` | Codex events | turn surface | Prefix per-turn/all closure before start/completion | Existing turn lifecycle | Uses context events |
| `.../codex-thread-lifecycle-event-converter.ts` | Codex events | thread/error surface | Prefix all closures before terminal error events | Existing thread lifecycle | Uses context events |
| Existing focused server/web tests | Test ownership | lifecycle contract evidence | Grouping/boundary/action order, >100 consequence, persistence exactly-once | Extend closest durable suites | Reuses production contracts |

## Applied Patterns (If Any)

- **Adapter:** `CodexThreadEventConverter` translates provider-specific notifications into the provider-neutral runtime event contract.
- **Owned state machine:** `CodexReasoningBlockTracker` advances one logical block through append/end transitions and returns ordered actions. It does not publish or persist.
- **Thin facade:** Payload parser exposes normalized reasoning operations without owning event order.

## Target Subsystem / Folder / File Mapping

No new folder or source file is required. The established `backends/codex/events/` capability area already reflects the correct structural depth.

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | `Folder` | Codex provider adapter | Provider event normalization and owned state trackers | Existing provider-specific boundary | Frontend retention/UI policy |
| `codex-reasoning-block-tracker.ts` | `File` | logical block state owner | Lifecycle actions and state transitions | State/action cohesion | `AgentRunEvent` construction |
| `codex-thread-event-converter.ts` | `File` | authoritative adapter | Event construction and ordering | Existing governing conversion boundary | Vue/store logic or persistence writes |
| item/raw/turn/thread converter files | `File` | provider surface classifiers | Explicit boundary placement | Existing separation by provider event surface | Duplicate tracker state |
| `autobyteus-web/services/agentStreaming/handlers/` | `Folder` | generic stream application | Reused completion behavior | Existing generic capability | Codex-specific fallback |
| `autobyteus-web/services/eventMonitor/` | `Folder` | retention/presentation | Reused latest-window behavior | Existing product policy | Provider repair logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/codex/events/` | `Persistence-Provider` | `Yes` | Low | Correct provider adapter location; keep current flat specialized files |
| `services/agentStreaming/handlers/` | `Main-Line Domain-Control` | `Yes` | Low | Provider-neutral consumer remains unchanged |
| `services/eventMonitor/` | `Main-Line Domain-Control` | `Yes` | Low | Retention owner remains unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Grouped block | `reasoning A -> CONTENT R; reasoning B -> CONTENT R; new tool -> END R, TOOL_STARTED` | `reasoning A -> CONTENT R, END R; reasoning B -> CONTENT R` | Do not end a block that will still receive content |
| Matching tool update | `tool-1 start; reasoning A; tool-1 result -> result only; reasoning B still uses R` | Treat tool-1 result as a new ordered card and end R | Preserves current nuanced grouping |
| Missing turn | `reasoning snapshot -> CONTENT R, END R` | `CONTENT R` with no tracked way to close it | No uncloseable mutable segment |
| Boundary event order | `[SEGMENT_END R, TOOL_STARTED tool-2]` | `[TOOL_STARTED tool-2, SEGMENT_END R]` or a later asynchronous flush | Consumers must see valid lifecycle order |
| Ownership | Provider adapter emits existing generic end; web remains unchanged | Vue/recent-window checks `runtimeKind === CODEX` | Prevents cross-layer provider policy duplication |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `void` clears and add an optional parallel close callback | Minimize signatures | `Rejected` | Replace clear APIs and update all callers atomically |
| Emit both legacy content-only and new lifecycle paths | Protect unknown consumers | `Rejected` | One normalized content/end contract; consumers already support it |
| Frontend timeout/provider heuristic | Could mask stale Think state | `Rejected` | Provider adapter emits authoritative end |
| Increase visual limit or refresh projection | Could reduce symptom frequency | `Rejected` | Correct lifecycle classification; keep bounds |
| Rewrite old traces to add end records | Superficial historical uniformity | `Rejected` | Directly use existing traces; no migration |

## Derived Layering (If Useful)

`N/A` — ownership and event spines are clearer than introducing a separate layer model. The existing provider adapter -> normalized contract -> generic consumers direction is sufficient.

## Change / Refactor Sequence

1. Replace the tracker update-only/void-clear contract with one ordered lifecycle action union. Cover grouping, duplicate snapshot, per-turn close, reachable clear-all order, and missing-turn immediate end at the tracker boundary. Preserve the `MP-CAP-001` defensive capacity guard unchanged and do not create capacity-specific lifecycle behavior.
2. Propagate typed actions through `CodexReasoningEventNormalizer` and the parser facade without duplicating state or policy.
3. Add private action-to-event mapping in `CodexThreadEventConverter`, using minimal reasoning payloads and closure-owned turn IDs.
4. Change item/raw/turn/thread converter context signatures so closure returns are explicit arrays. Prefix them before each existing boundary output; preserve matching/no-effect paths.
5. Remove the obsolete update-only type and all `void` clear signatures/call sites. Search the Codex event subsystem to prove no ignored closure remains.
6. Extend focused converter/tracker coverage for the complete boundary/preserve matrix and event order.
7. Prove the normalized `SEGMENT_END` drives generic frontend completion and prevents the >100 tool-disappearance sequence without changing web production source.
8. Prove runtime memory writes one reasoning trace per logical block and final projection order remains stable.
9. Run implementation-scoped server/web checks; leave broader API/E2E execution and realistic browser validation to the downstream coverage stage.

## Key Tradeoffs

- **Explicit action arrays over a hidden pending-event queue:** More context signatures change, but event order and consumption are reviewable at each boundary and no converter-call state can leak.
- **End at real boundary rather than provider snapshot completion:** Preserves intentional grouping, at the cost of retaining the current boundary matrix as provider-specific policy.
- **No frontend defensive fallback:** A provider omission would remain visible if reintroduced, but one authoritative adapter contract avoids divergent provider semantics and silent masking.
- **No migration:** Future trace `sourceEvent` timing may differ while semantic content/order remains the same; avoiding bulk rewrites is safer and sufficient.

## Risks

- A boundary path may forget to prepend returned end events. Mitigation: typed non-void APIs, exhaustive source search, parameterized current boundary matrix.
- Event construction could use the current boundary's turn/payload instead of the closed block's identity, especially during clear-all. Mitigation: closure action carries its own `segmentId` and `turnId`; end payload is minimal.
- A matching tool update could accidentally split reasoning. Mitigation: preserve `CodexOrderedToolBoundaryTracker` classification and existing parameterized tests.
- Immediate missing-turn completion could assign inconsistent fallback turns in persistence. Mitigation: content/end are adjacent with the same explicit null turn and segment ID; test accumulator behavior with active/fallback turn resolution.
- Segment end plus later tool/turn flush could duplicate reasoning persistence. Mitigation: accumulator exactly-once regression proving the second flush is a no-op.
- Existing in-memory degraded contexts are not retroactively repaired by the code change alone. Normal application update/restart rehydrates from valid persisted projection; no special repair state or migration is warranted.

## Guidance For Implementation

- Use a discriminated union similar to:

  ```ts
  type CodexReasoningLifecycleAction =
    | { kind: "content"; segmentId: string; turnId: string | null; delta: string }
    | { kind: "end"; segmentId: string; turnId: string | null };
  ```

- Return ordered arrays; do not expose mutable tracker records or return only booleans/counts.
- Keep `AgentRunEvent` construction in `CodexThreadEventConverter`. Tracker/normalizer/parser must remain transport-independent.
- `SEGMENT_END` must include `id`, `turn_id`, and `segment_type: "reasoning"`; do not spread the tool/user/error boundary payload into the reasoning end.
- Refactor `applyToolLifecyclePlacement` to return prefix events. A matching existing-tool update returns `[]`; result-first creation returns the relevant end events.
- Change raw-response conversion to return an array so reasoning end and tool log order are explicit.
- Treat every non-void close result as must-consume. Do not use `void`, fire-and-forget callbacks, module-level queues, microtasks, or post-conversion flushes.
- Preserve compaction and other current no-effect cases exactly as covered by the existing matrix; this ticket does not redefine boundaries.
- Do not change `recentEventMonitorSelection`, `recentEventMonitorWindow`, Vue keys/components, selection stores, GraphQL queries, or persisted readers to make the fix work.
- Record implementation evidence using synthetic content only; do not copy user trace payloads.
