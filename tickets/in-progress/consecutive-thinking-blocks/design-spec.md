# Design Spec

## Status

`Revised Design-ready — Architecture Round 1 Findings Addressed; Pending Re-review`

## Current-State Read

The reported path is an event-normalization bug in an otherwise appropriate runtime architecture.

Future live execution follows:

`GPT-5.6-Sol -> Codex App Server item notifications -> CodexThreadEventConverter -> CodexItemEventPayloadParser / CodexReasoningPayloadParser -> CodexReasoningSegmentTracker -> normalized SEGMENT_CONTENT -> RuntimeMemoryEventAccumulator + WebSocket -> frontend segmentHandler -> AIMessage.vue`

The correct authoritative boundaries already exist:

- `CodexThreadEventConverter` owns Codex raw-event interpretation and normalized run-event emission.
- The Codex reasoning helper owns reasoning content extraction and active reasoning identity.
- `RuntimeMemoryEventAccumulator` persists the normalized live facts it receives.
- Frontend streaming and later hydration consume normalized contracts and must remain provider-agnostic.

The defect occurs because `CodexReasoningSegmentTracker.resolveReasoningSegmentId()` returns a stable provider item ID before consulting the active per-turn reasoning ID. Five adjacent provider items therefore become five normalized IDs, five live segments, and five persisted reasoning traces.

Current clearing calls express the right common-path intent but are not a complete policy: `ITEM_STARTED` compaction classification returns before the general clear, while approval, local-tool, raw-output, ignored, status, and error families take separate dispatch paths. The target must decide block effect by semantic event family before branch-specific early returns. Transcript-producing tool/non-reasoning activity, assistant text, turn start/completion, and terminal runtime error clear; provider maintenance/status/progress/ignored notifications preserve.

The current fallback identity is also unsafe after a clear. `reasoning:${turnId}`, `payload.id`, or a repeated provider item ID can be reused for a later block in the same turn, causing generic consumers to append across the boundary. Provider identity must therefore be used only for fragment correlation. Normalized block identity must come from an owned collision-safe allocator.

The user explicitly removed pre-fix historical runs from scope. Existing raw traces and current old-run projections may remain fragmented. Correct future live normalization will naturally cause future persistence to contain one reasoning trace per contiguous block, so reload of those future runs requires no replay-layer change.

## Intended Change

Create one explicit Codex reasoning-event normalizer that:

1. extracts reasoning content and identity facts from each payload;
2. maintains a bounded active reasoning block per turn through an owned block tracker;
3. allocates every new normalized block ID from a tracker-instance namespace plus monotonic sequence, never from provider item/event candidates;
4. returns that normalized segment ID for all consecutive reasoning provider items in the active block and never reuses it after a clear;
5. inserts a blank-line separator only when a new provider reasoning item joins an already non-empty block, never between deltas of the same provider item; and
6. applies the explicit event-family boundary policy through turn-scoped clear or conservative clear-all when a boundary lacks a turn ID.

Consolidate all current reasoning delta/snapshot conversion branches through that singular update contract. Centralize boundary disposition at the Codex converter/facade boundary so special early returns cannot bypass it. Leave memory storage, run-history projection, GraphQL, and frontend production code unchanged.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md` | Defines contiguous grouping, transcript/maintenance boundaries, collision-safe post-boundary identity, content joining, and future live/reload parity | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-008`; `AC-CTB-003`–`AC-CTB-007`, `AC-CTB-009` | Constrains normalized live output; pre-fix history is explicitly excluded | Approved user direction; Round 1 safety clarification applied |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Local Implementation Defect` plus bounded `File Placement Or Responsibility Drift`
- Refactor needed now: `Yes` — bounded to Codex reasoning normalization
- Evidence:
  - Exact rollout: five adjacent provider reasoning item IDs with no intervening tool/text.
  - Direct `thread/read`: one logical reasoning item with 14 parts.
  - Current tracker: provider item ID wins before active block cache.
  - Current parser owns stateful tracking despite a stateless-parser name.
- Design response: Replace the ID-only tracker/parser pairing with an explicitly named reasoning event normalizer and active-block tracker; route all current reasoning content branches through one update contract.
- Refactor rationale: A conditional-order swap alone would reuse the ID but would not own provider-item separators or prevent content and identity decisions from drifting across event branches. The bounded refactor makes the invariant explicit inside the existing Codex event subsystem.
- Round 1 design-impact resolution:
  - `DR-CTB-001`: remove provider/fallback normalized-ID candidates; allocate namespaced monotonic block IDs and reuse only active state.
  - `DR-CTB-002`: replace assumed fall-through clearing with an explicit event-family disposition applied before converter early returns.
- Intentional deferrals and residual risk:
  - Pre-fix historical runs remain fragmented by explicit user decision and are not residual in-scope work.
  - Current `item/reasoning/summaryTextDelta` coverage/cadence remains a separate protocol-modernization concern. Adding it requires snapshot/delta deduplication design.
  - Higher-level asynchronous UI insertions outside the Codex raw item sequence remain outside this Codex block tracker.

## Terminology

- **Provider reasoning item:** One Codex item with its own provider `itemId`.
- **Provider reasoning fragment:** Content emitted for one provider reasoning item, as deltas or a completed snapshot.
- **Normalized reasoning block:** The AutoByteus contiguous reasoning unit represented by one normalized segment ID.
- **Transcript boundary:** A Codex event that produces tool/non-reasoning transcript activity, emits assistant text, starts/completes a turn, or terminates the runtime with an error.
- **Maintenance/no-effect event:** A compaction, status, progress, token, diff, or ignored notification that emits no ordered conversation content and does not split a reasoning block.
- **Block identity namespace:** One opaque random nonce created with the tracker/converter instance and combined with a monotonic block sequence.

## Design Reading Order

1. Persisted schema/data transition is not affected.
2. The live return/event spine owns the correction.
3. Codex reasoning normalization is the only production capability area changed.
4. File responsibilities are tightened around a singular block-update API.
5. Existing folder layout remains appropriate.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `CodexReasoningSegmentTracker` and `CodexReasoningPayloadParser` after their responsibilities move to the target classes.
- Remove split event-converter usage that independently resolves reasoning snapshot content and reasoning segment ID.
- Remove fallback paths that expose provider item IDs, event IDs, `reasoning:${turnId}`, or fixed strings as normalized reasoning block IDs.
- Do not retain re-export aliases, wrapper classes, dual identity paths, feature flags, or a frontend fallback merger.
- Do not introduce compatibility handling for pre-fix stored traces.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Future agent/team member `raw_traces*.jsonl` written from normalized live `SEGMENT_CONTENT` events.
- Relevant code-model, serialization, semantic, or physical-store change: None. Event IDs/content grouping change before the existing writer; trace schema, reader, and projection stay unchanged.
- Normal reader/writer behavior and representative evidence: `RuntimeMemoryEventAccumulator` groups deltas by normalized segment ID and writes one trace when that segment flushes. Reusing one ID therefore produces one trace without modifying the writer.
- Required semantics and invariants under direct use: Future traces preserve turn, source order, content, and boundaries using the current schema.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No stored data is rewritten. Pre-fix runs are explicitly ignored.
- Decision: `Not Affected`
- Decision rationale: No schema/model transformation, migration, bulk rewrite, or replay normalization is needed. The existing writer consumes the corrected normalized event contract directly.
- Acceptance criteria or design constraints supported: `AC-CTB-005`, `AC-CTB-006`, `AC-CTB-008` for future runs only.

No migration plan is applicable.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-CTB-001` | `Primary End-to-End` | User sends an agent/team message | Codex App Server executes the turn | `AgentRun` / `CodexAgentRunBackend` | Full request path |
| `DS-CTB-002` | `Return-Event` | Codex reasoning/tool/text notification | Browser conversation card and memory writer | `CodexThreadEventConverter` | Owns future live identity, ordering, and persistence input |
| `DS-CTB-003` | `Bounded Local` | One reasoning or boundary notification | One normalized reasoning update or state transition | `CodexReasoningEventNormalizer` | Makes allocation, active reuse, fragment joining, and clearing explicit |

## Primary Execution Spine(s)

`Browser User Input -> Agent/Team Entry -> AgentRun / Team Member Run -> CodexAgentRunBackend -> CodexThread -> Codex App Server -> GPT-5.6-Sol`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-CTB-001` | A user message reaches an agent or focused team member and starts/continues its Codex turn. | Browser input, agent/team run, Codex backend, Codex thread/client | `AgentRun` lifecycle | Workspace/config resolution |
| `DS-CTB-002` | Codex notifications return through the thread converter. Reasoning updates receive a normalized block ID; tool/text/turn events clear the block. The same normalized event feeds the browser and memory recorder. | Provider item, thread converter, normalized event, WebSocket/memory consumers | `CodexThreadEventConverter` | Serialization, status, recording |
| `DS-CTB-003` | The normalizer extracts turn/item/content facts and asks the tracker for a block update. A new block receives an allocator-owned ID; same-item deltas append directly; a new provider item in the active block receives one separator. Boundary disposition clears one turn or all state when unscoped. | Reasoning payload, normalizer, ID allocator, active state, normalized update | `CodexReasoningEventNormalizer` | Debug logging, bounded eviction |

## Spine Actors / Main-Line Nodes

- `AgentRun` / team-member `AgentRun`: lifecycle and event distribution.
- `CodexAgentRunBackend`: provider runtime adaptation.
- `CodexThread`: provider thread state and notification subscription.
- `CodexThreadEventConverter`: authoritative raw-to-normalized boundary.
- `CodexReasoningEventNormalizer`: authoritative reasoning content/block decision.
- `RuntimeMemoryEventAccumulator`: unchanged normalized-event persistence consumer.
- Frontend `segmentHandler`: unchanged normalized-event UI consumer.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `CodexThreadEventConverter` | Codex event dispatch and normalized event creation | UI rendering or stored-history correction |
| `CodexReasoningEventNormalizer` | Payload extraction and singular normalized block update | Tool lifecycle, WebSocket state, persistence |
| `CodexReasoningBlockTracker` | Per-turn active state, collision-safe block allocation, provider-item transitions, separator decision, turn/all clearing, eviction | Generic JSON alias parsing or event dispatch |
| `RuntimeMemoryEventAccumulator` | Existing event-to-trace recording | Provider reasoning identity |
| Frontend handlers | Apply normalized IDs and render | Codex item IDs/event methods |

`CodexThreadEventConverter` remains the governing normalization boundary. The normalizer and tracker are internal mechanisms.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Agent/team WebSocket mapper | `AgentRun` + normalized backend events | Transport serialization | Codex grouping |
| GraphQL run projection resolver | Existing projection service | Reload exposure | Pre-fix trace remediation |
| Frontend streaming services | Generic segment handlers/stores | Browser dispatch | Provider-specific adjacency |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `codex-reasoning-segment-tracker.ts` / class | ID-only API leaks provider/fallback identity and cannot express block composition | `codex-reasoning-block-tracker.ts` | In This Change | Clean rename; no alias |
| Provider/event/fixed fallback normalized IDs | Can collide after clear or converter recreation | Namespaced monotonic allocator | In This Change | Provider ID remains correlation-only |
| `codex-reasoning-payload-parser.ts` / class | Parser-only name hides stateful normalization | `codex-reasoning-event-normalizer.ts` | In This Change | Encapsulates extraction + tracker |
| Manual `snapshot + id` reasoning branches | Split decisions can drift | One `resolveReasoningContentUpdate` path | In This Change | Delta/completion paths converge |
| Proposed history projection fold | User removed old-history remediation | Nothing | Removed From Scope | No run-history production changes |
| Proposed Vue coalescing fallback | Duplicates provider policy | Backend normalized ID | In This Change | Do not add |

## Return Or Event Spine(s) (If Applicable)

`Codex notification -> CodexThread notification handler -> CodexThreadEventConverter -> CodexReasoningEventNormalizer -> SEGMENT_CONTENT(reasoning, normalizedBlockId) -> AgentRun event mapping -> WebSocket + RuntimeMemoryEventAccumulator -> Thinking card + future trace`

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `CodexReasoningEventNormalizer`

`Raw reasoning payload -> extract turn/provider-item/content -> active block lookup -> same item: raw delta | new item in active block: separator + fragment | no active block: allocate reasoning-block:<instanceNonce>:<sequence>, store active state -> normalized update`

Boundary cycle:

`Transcript-producing non-reasoning/tool event | assistant text | turn start/completion | terminal runtime error -> resolve turn -> clearReasoningBlockForTurn(turnId) or clearAllReasoningBlocks() when the boundary is unscoped -> next reasoning allocates a different block ID`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine IDs | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Debug logging | `DS-CTB-003` | Block tracker | IDs, strategy, lengths, cache size; never content | Diagnosis | Content leakage or logging-driven policy |
| Cache eviction | `DS-CTB-003` | Block tracker | Retain current 128-turn bound | Memory safety | Generic cache abstraction obscures ownership |
| Block ID allocation | `DS-CTB-003` | Block tracker | Instance nonce plus monotonic sequence; injectable nonce for deterministic tests | Identity safety across clears/restarts | Provider IDs leak into normalized identity |
| Memory recording | `DS-CTB-002` | `AgentRun` | Persist corrected normalized segment | Future reload parity | Provider parsing in writer |
| Frontend rendering | `DS-CTB-002` | Browser conversation | Render normalized order | User surface | Provider-specific merge logic |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live reasoning block state | Codex event normalization helpers | `Extend + bounded refactor` | Correct owner and cache already exist | N/A |
| Reasoning extraction | Existing reasoning helper | `Extend + rename` | Existing extraction remains useful | N/A |
| Future persistence/reload | Memory writer and projection | `Reuse unchanged` | One normalized ID already yields one trace/row | N/A |
| Browser grouping | Segment handler/hydration | `Reuse unchanged` | Same normalized ID/row already yields one block | N/A |
| Old-run correction | Run-history projection | `No change` | Explicitly excluded by user | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spines | Governing Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex event normalization | Provider payload interpretation, block ID/content, boundary clearing | `DS-CTB-002`, `DS-CTB-003` | `CodexThreadEventConverter` | Modify/refactor | Only production capability changed |
| Agent memory | Persist normalized future facts | `DS-CTB-002` | `RuntimeMemoryEventAccumulator` | Reuse unchanged | Validation only |
| Run-history projection | Reload future facts | `DS-CTB-002` | Projection services | Reuse unchanged | No pre-fix correction |
| Web conversation | Apply/render normalized segments | `DS-CTB-002` | Browser stores | Reuse unchanged | Tests only if useful |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-reasoning-block-tracker.ts` | Codex normalization | Internal state owner | Active blocks, ID allocation, transitions, separators, scoped/global clear, eviction | Cohesive bounded state machine | Owns tight update types |
| `codex-reasoning-event-normalizer.ts` | Codex normalization | Reasoning boundary | Extract fields/content and delegate update | One reasoning event decision | Uses tracker |
| `codex-item-event-payload-parser.ts` | Codex normalization | Item parser facade | Delegate reasoning update/clear and retain other parsing | Existing outer helper boundary | Uses normalizer |
| `codex-item-event-converter.ts` | Codex normalization | Item event owner | Apply item-family boundary disposition before early returns and route reasoning through one helper | Existing dispatcher | Uses normalized update |
| `codex-thread-event-converter.ts` | Codex normalization | Governing converter | Apply top-level lifecycle/raw boundary disposition and create normalized events | Existing authority | Uses parser facade |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reasoning `{id,delta}` resolution | `codex-reasoning-event-normalizer.ts` | Codex normalization | One decision for all current paths | Yes | Yes | General provider normalizer |
| Active block state | `codex-reasoning-block-tracker.ts` | Codex normalization | Persists across turn events | Yes | Yes | Generic cache utility |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexReasoningBlockInput { turnId, providerItemId, fragmentKind, delta }` | Yes | Yes | Low | No normalized-ID candidate enters from payload; `fragmentKind` distinguishes streaming append from completed-item joining when provider identity is absent |
| `CodexReasoningBlockUpdate { segmentId, delta }` | Yes | Yes | Low | Do not expose tracker internals |
| Private `ActiveReasoningBlock { segmentId, currentProviderItemId, hasContent }` | Yes | Yes | Low | Keep non-serialized/private |
| Private allocator state `{ instanceNonce, nextBlockSequence }` | Yes | Yes | Low | Nonce is generated once per tracker instance; sequence increments for every new block and never decrements |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-block-tracker.ts` | Codex normalization | Internal state | Block allocation/update/boundary/eviction | One state machine | Own types |
| `.../codex-reasoning-event-normalizer.ts` | Codex normalization | Reasoning normalization | Extract and normalize one update | One provider-event decision | Uses tracker |
| `.../codex-item-event-payload-parser.ts` | Codex normalization | Item facade | Delegate update/clear; other item parsing | Preserves outer helper boundary | Uses normalizer |
| `.../codex-thread-event-converter.ts` | Codex normalization | Governing converter | Consume updates and enforce top-level raw/lifecycle dispositions | Existing top owner | Uses item facade only |
| `.../codex-item-event-converter.ts` | Codex normalization | Item dispatcher | Consolidate reasoning branches and enforce item-family matrix before early returns | Existing dispatch | Uses converter callback |
| `.../codex-turn-event-converter.ts` | Codex normalization | Turn owner | Clear state at start and completion | Existing boundary | Uses context callback |
| `.../codex-raw-response-event-converter.ts` | Codex normalization | Raw-response owner | Preserve compaction; clear before emitted function-call output | Existing dispatch | Uses boundary callback |
| `.../codex-thread-lifecycle-event-converter.ts` | Codex normalization | Lifecycle owner | Preserve status; clear on terminal runtime error | Existing dispatch | Uses boundary callback |
| Relevant server tests | Codex normalization/memory | Contract evidence | Collision-safe identity, separator, complete boundary matrix, future persistence | Existing colocation | Sanitized fixtures |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Documentation | Codex contract | Record block identity rule | Canonical mapping doc | N/A |
| `autobyteus-web/docs/agent_execution_architecture.md` | Documentation | Consumer contract | Clarify normalized contiguous block IDs | Existing architecture doc | N/A |

## Ownership Boundaries

- Callers above `CodexThreadEventConverter` receive normalized reasoning blocks and never inspect provider item IDs.
- The converter accesses reasoning normalization only through the item payload facade; it does not reach directly into tracker state.
- The normalizer is the only owner combining raw payload facts with block state.
- The tracker receives typed facts and never parses generic JSON aliases.
- Provider item/event IDs never enter the normalized block-ID allocator.
- Boundary-capable converters call only the facade's semantic `clearForBoundary(payload)`; a missing turn ID clears all active blocks conservatively.
- Memory/history/frontend remain consumers of the corrected future event contract.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadEventConverter.convert` | Item/turn converters, payload facade, reasoning normalizer/tracker | Codex backend dispatch | Backend calls tracker | Strengthen converter/facade API |
| `CodexItemEventPayloadParser.resolveReasoningContentUpdate` | Normalizer + tracker | Event converter | Separately resolve content and ID | Return singular update |
| `RuntimeMemoryEventAccumulator.recordRunEvent` | Segment accumulation/writer | `AgentRun` event recording | Provider code writes traces directly | Keep corrected normalized event input |

## Dependency Rules

Allowed:

- `CodexThreadEventConverter -> CodexItemEventPayloadParser -> CodexReasoningEventNormalizer -> CodexReasoningBlockTracker`.
- Item/turn converters depend on converter-supplied callbacks, not tracker internals.
- Raw-response and lifecycle converters receive the same semantic boundary callback; they do not infer or mutate tracker state directly.
- Memory/frontend consumers depend only on normalized run events.

Forbidden:

- Frontend or memory code recognizes `rs_*`, Codex `itemId`, or `item/reasoning/*`.
- Converter calls both normalizer and tracker directly.
- Run-history code adds pre-fix correction logic.
- Compatibility aliases retain old classes.
- Payload-derived or fixed fallback values become normalized reasoning block IDs.
- Any early return occurs before the event family's boundary disposition has been applied.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `resolveReasoningContentUpdate(codexEventName, payload, fallbackDelta?)` | One Codex reasoning notification | Return one normalized update or null | Provider item ID is correlation-only; output ID is allocator-owned | Event name supplies `fragmentKind` without expanding protocol support |
| `clearReasoningBlockForBoundary(payload)` | One semantic boundary | End the addressed active block | Supported turn ID fields | Missing turn ID delegates to clear-all |
| `clearAllReasoningBlocks()` | Unscoped/terminal boundary | End every cached active block | No payload identity required | Conservative safety path |
| `CodexReasoningBlockTracker.append(input)` | One typed fragment | Reuse active block or allocate fresh block and decide separator | Nullable turn/provider ID; no fallback segment ID | No record parsing |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveReasoningContentUpdate` | Yes | Yes | Low | Replace separate snapshot/id use |
| `clearReasoningBlockForBoundary` | Yes | Yes | Low | Turn-scoped when possible, clear-all when not |
| `clearAllReasoningBlocks` | Yes | N/A | None | Explicit terminal/unscoped safety operation |
| Tracker `append` | Yes | Yes | Low | Typed input only |

## Normalized Block Identity Allocation Invariants (`DR-CTB-001`)

1. `CodexReasoningBlockTracker` creates one opaque `instanceNonce` at construction using `randomUUID()`; tests may inject a deterministic nonce.
2. `nextBlockSequence` starts at zero and increments before every new block allocation. Clear and eviction never decrement or reset it.
3. The only allocation form is `reasoning-block:<instanceNonce>:<sequence>`. Provider item IDs, payload event IDs, turn IDs, `reasoning:${turnId}`, and fixed fallback strings are never normalized block-ID candidates.
4. Only an entry currently present in `activeBlockByTurnId` can reuse a normalized block ID. After `clearForTurn`, `clearAll`, or eviction, the next append allocates a fresh sequence value even if its provider item/event identity is absent or identical to a prior block.
5. A resolved turn ID is required for cross-notification active-block reuse. A reasoning notification without a turn ID receives a fresh ID and is not cached; this prefers a safe split over an unverifiable cross-turn/cross-boundary merge.
6. A semantic boundary with no turn ID invokes `clearAll`, because leaving an unknown active turn cached could merge later reasoning across the observed boundary.
7. `providerItemId` is used only to decide fragment joining. For `fragmentKind: "delta"`, append without a separator. For `fragmentKind: "completed_item"`, insert one blank-line separator when the active block already has content and the provider item differs or is unavailable; a repeated known provider item remains the same-item path.
8. The instance nonce makes IDs collision-resistant across converter recreation; the monotonic sequence makes them strictly unique within an instance. The normalized prefix prevents collision with provider-native identifier namespaces.

Concrete allocation scenarios:

| Sequence | Provider identity | Required normalized IDs/content |
| --- | --- | --- |
| reasoning -> tool boundary -> reasoning, same `itemId=rs_A` | Repeated | `reasoning-block:N:1` then `reasoning-block:N:2`; never reuse the first ID |
| reasoning -> assistant text -> reasoning, no provider/event ID | Missing | Two allocated IDs; boundary clear does not depend on a provider candidate |
| adjacent completed reasoning A/B, no provider IDs, same turn | Missing | One allocated ID; content `A\n\nB` |
| adjacent deltas for one item, no provider ID, same turn | Missing | One allocated ID; raw deltas append without separator |
| converter recreated for the same run | Any | New nonce `N2`; its sequence cannot reuse `N1` IDs |

## Codex Event-Family Reasoning Boundary Matrix (`DR-CTB-002`)

`Clear` means apply the boundary before branch-specific return/emission. `Preserve` means the event is known not to end adjacency. `No effect` means the notification is ignored/unknown and cannot authoritatively mutate reasoning state.

| Dispatch family / current path | Disposition | Scope | Semantic reason and implementation placement |
| --- | --- | --- | --- |
| Reasoning `ITEM_STARTED` | `Preserve` | Turn | Lifecycle marker only; reasoning content remains in the active block. |
| Reasoning delta / summary-part-added / reasoning-completed / reasoning `ITEM_COMPLETED` | `Preserve + append` | Turn | All flow through `resolveReasoningContentUpdate`; provider item transition affects separator, not block identity. |
| User-message `ITEM_STARTED` | `Clear` | Turn or all if unscoped | New input/turn-side transcript boundary; apply before the user-message early return. |
| User-message `ITEM_COMPLETED` | `Preserve` | N/A | Start already performed defensive reset; completion emits no assistant transcript content. |
| Ordinary command, file-change, web-search, MCP/dynamic-tool, agent-message, or unknown transcript-producing `ITEM_STARTED` | `Clear` | Turn or all | First visible/semantic non-reasoning boundary; apply before tool-specific returns, including suppressed send-message command branches. |
| Non-reasoning `ITEM_COMPLETED` that emits segment/tool terminal events | `Clear` | Turn or all | Defensive boundary if start was missing/out of order; harmless idempotent clear when start was observed. |
| Context-compaction / compaction-trigger `ITEM_STARTED` or `ITEM_COMPLETED` | `Preserve` | N/A | Provider maintenance/status only; apply classification before general non-reasoning clear and retain the early return. |
| Assistant-message delta | `Clear` | Turn or all | Text is an ordered transcript boundary; clear before empty-delta filtering. |
| Plan delta / turn task-progress / turn diff | `Preserve` | N/A | Progress/side-panel updates do not create ordered conversation content. |
| Command/file approval request, local-tool approval requested/approved | `Clear` | Turn or all | Tool lifecycle may be the first observed tool boundary; clear before emitting or early return. |
| Known `ITEM_TOOL_CALL` / permissions-approval notifications currently ignored by the converter | `Clear` | Turn or all | Their protocol identity establishes tool/permission activity even when no normalized card is emitted; add explicit clear-only cases instead of falling through default. |
| Local MCP tool completion / file-change output delta | `Clear` | Turn or all | Tool result/log is transcript-producing tool activity and may arrive without a locally observed start. |
| Raw-response `functioncalloutput` converted to tool log | `Clear` | Turn or all | Alternative tool-output surface; clear before conversion. |
| Raw-response compaction item / `thread/compacted` | `Preserve` | N/A | Provider maintenance boundary is not a conversation boundary. |
| `TURN_STARTED` | `Clear` | All | Defensive lifecycle reset prevents stale state from a missing prior completion or reused turn ID. |
| `TURN_COMPLETED` | `Clear` | Turn or all | Ends the reasoning block and turn. |
| Thread started/status/token-usage | `Preserve` | N/A | Lifecycle/status only; no ordered conversation content. |
| Terminal runtime `ERROR` | `Clear` | All | Terminal lifecycle cleanup; later recovered work must allocate a new block. |
| `codex/event/*`, unknown item/raw/thread notifications, and other ignored methods | `No effect` | N/A | No normalized transcript meaning is established; do not invent a boundary from an unknown event. |

Implementation rule: the known event family is classified and its disposition is applied at its owning converter before any compaction, suppression, empty-content, or tool-specialization return. This keeps boundary policy explicit without moving raw event parsing into the tracker.

## Main Domain Subject Naming Check

| Subject | Current / Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| State owner | `CodexReasoningSegmentTracker` -> `CodexReasoningBlockTracker` | Yes after rename | Low | Remove old name |
| Decision owner | `CodexReasoningPayloadParser` -> `CodexReasoningEventNormalizer` | Yes after rename | Low | Remove old name |
| Result | `CodexReasoningBlockUpdate` | Yes | Low | Keep `{segmentId,delta}` only |

## Applied Patterns (If Any)

- Provider adapter normalization.
- Bounded per-turn state machine.
- Opaque namespaced monotonic identity allocation.
- Explicit semantic event-family disposition.
- Singular content-and-identity update contract.
- Thin generic persistence and presentation consumers.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | Folder | Codex event normalization | Raw-to-normalized mapping and internal block state | Existing capability area | UI or persistence I/O |
| `.../codex-reasoning-event-normalizer.ts` | File | Reasoning boundary | Extract/normalize one reasoning event | Beside other event normalization | Tools/GraphQL |
| `.../codex-reasoning-block-tracker.ts` | File | Internal state | Per-turn block state and joining | Beside its normalizer | Generic payload parsing |
| `autobyteus-server-ts/src/agent-memory/` | Folder | Memory recording | Unchanged consumer | Existing authority | Provider IDs |
| `autobyteus-web/services/agentStreaming/handlers/` | Folder | Browser state | Unchanged consumer | Existing authority | Codex grouping |

No new folder/module layer is warranted.

## Folder Boundary Check

| Folder | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `.../codex/events/` | Main-line provider normalization + internal concern | Yes | Low | Normalizer/state split is meaningful |
| `agent-memory/` | Persistence off-spine | Yes | Low | No production change |
| Web streaming handlers | Client transport/state | Yes | Low | No production change |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Adjacent provider items | `rs_A("A")`, `rs_B("B")` -> normalized ID `reasoning-block:N:1` twice, second delta `"\n\nB"` | IDs `rs_A`,`rs_B` plus Vue merge | Provider ID is not block ID |
| Same-item deltas | `rs_A("hel")`, `rs_A("lo")` -> one allocated ID and `"hello"` | Blank line before every event | Transport deltas are not fragments |
| Tool boundary | reasoning -> tool start -> reasoning gives `reasoning-block:N:1`, then `reasoning-block:N:2` | Keep first ID across tool | Preserves order even if provider ID repeats |
| Missing provider identity | completed `A` -> completed `B`, same turn -> one allocated block with `A\n\nB`; boundary then `C` -> new allocated block | Fixed `reasoning:<turnId>` fallback | Missing provider data cannot collide block identity |
| Compaction early return | reasoning -> context compaction -> reasoning keeps one ID | Clear every non-reasoning raw item | Maintenance is not transcript content |
| Future persistence | Same normalized ID -> accumulator writes one trace -> reload shows one block | Add history repair code | Current writer already has correct semantics |
| Encapsulation | Converter requests one `{segmentId,delta}` | Resolve content and ID independently | Avoids split policy |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Plan |
| --- | --- | --- | --- |
| Old class-name aliases | Reduce import edits | Rejected | Atomic rename/remove |
| Feature flag for old item-per-card behavior | Limit behavior change | Rejected | New invariant replaces bug |
| Vue fallback merger | Mask server issue | Rejected | Correct backend ID |
| Historical projection normalization | Correct old runs | Rejected by scope | Leave pre-fix runs unchanged |
| Raw trace rewrite/migration | Canonicalize old storage | Rejected | No old-data work |
| Dual provider/block IDs as UI identity | Retain old identity | Rejected | One normalized block ID |
| Provider/event/fixed fallback as normalized block ID | Reduce allocator plumbing | Rejected | Opaque instance namespace plus monotonic block sequence |
| Clear every raw non-reasoning notification | Simple rule | Rejected | Semantic matrix preserves maintenance/status/progress events |

## Derived Layering (If Useful)

- Codex transport.
- Codex provider normalization.
- Run lifecycle/distribution.
- Existing memory persistence/history projection.
- Existing generic frontend presentation.

Ownership and event spines remain authoritative.

## Change / Refactor Sequence

1. Add failing sanitized unit scenarios for different/missing/repeated provider item IDs, same-item deltas, separator insertion, post-clear fresh allocation, converter-instance namespace change, missing turn ID, and cache eviction.
2. Cleanly rename tracker/parser files and classes; add tight input/update/private-state shapes and the injected-test/default-random instance namespace.
3. Implement `resolveReasoningContentUpdate()`, namespaced monotonic allocation, turn-scoped clear, and clear-all.
4. Consolidate current item-completed, reasoning-completed, and reasoning-delta branches through the singular update path; remove manual snapshot/id construction and all payload/fixed normalized-ID fallbacks.
5. Apply the event-family boundary matrix at the owning item/turn/raw/lifecycle converters before early returns.
6. Add converter sequence tests for every matrix row, especially compaction preservation, approval/local/raw-output clears, clear-only known tool/permissions notifications, truly unknown ignored no-effect, turn-start reset, terminal error reset, and unscoped boundary clear-all.
7. Add memory-recorder integration/unit evidence proving a future contiguous block writes one reasoning trace and a tool/text boundary writes separate ordered traces. Do not change memory production code unless evidence disproves the existing contract; such evidence is design impact.
8. Retain/add generic frontend handler evidence that repeated content events with one normalized ID produce one think segment; no frontend production change.
9. Update Codex mapping and frontend architecture documentation with allocation invariants and the boundary matrix.
10. Run implementation-scoped server/web tests and verify old files, aliases, and fallback normalized-ID paths are absent.

## Key Tradeoffs

- Backend normalization over render-time merging: correct authority and persistence, with slightly richer adapter state.
- Opaque allocated IDs over first-provider-item IDs: small allocator state cost, but identity remains correct for absent/repeated candidates and converter recreation.
- Semantic boundary matrix over “clear every non-reasoning raw item”: slightly more explicit dispatch code, but avoids artificial splits on maintenance/status events and prevents early-return bypass.
- Bounded rename/refactor over conditional swap: more import edits, but coherent identity/content ownership.
- No old-run correction: smaller, cleaner change aligned with explicit product scope; prior runs remain visually fragmented.
- No protocol-cadence modernization: avoids combining identity repair with snapshot/delta deduplication.

## Risks

- Duplicate completed snapshots for the same provider item could duplicate content. Separator logic will not worsen it, but snapshot idempotency remains separate unless observed.
- Missing turn IDs could cause unsafe reuse. Mitigation: never cache/reuse an unscoped reasoning block; unscoped semantic boundaries clear all cached blocks.
- Namespace collision across converter instances is theoretically possible with random UUIDs. Mitigation: cryptographic UUID namespace plus per-instance monotonic sequence; no provider-controlled candidate enters allocation.
- Boundary clearing regression. Mitigation: apply the explicit matrix before early returns and cover each family with converter sequence tests.
- Reasoning leakage in diagnostics. Mitigation: log IDs/lengths/strategies only and use sanitized tests.
- Future live/reload divergence. Mitigation: one normalized live ID drives both browser and existing memory writer; validate both consumers.

## Guidance For Implementation

- Implement the target owner/API shape, not only a conditional-order swap in the old class.
- Keep tracker input typed; raw field aliases belong to the normalizer.
- Generate normalized IDs only through the tracker allocator. Provider item/event/turn IDs are correlation inputs and must never be returned as reasoning block identity.
- Never reset the monotonic sequence on clear/eviction; only active entries may reuse an ID.
- Preserve source text exactly once. Add only the explicit separator between different provider reasoning items in one active block.
- Do not reuse across missing/different turn IDs. A boundary lacking turn identity clears all active blocks conservatively.
- Apply the event-family matrix before compaction, suppression, empty-content, or tool-specialization early returns.
- Do not change run-history projection or add pre-fix history tests expecting repaired output.
- Do not add `summaryTextDelta` support incidentally. If required, report design impact for snapshot reconciliation.
- Do not add frontend production grouping logic.
- Preserve tool lifecycle, memory ordering, status, token usage, and compaction behavior.
