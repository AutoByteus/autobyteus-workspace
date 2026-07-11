# Design Spec

## Status

`Round 3 Corrections — User Approved for Architecture Re-review`

## Current-State Read

The reported path combines a Codex event-normalization boundary bug with a generic memory flush-sequencing bug inside otherwise appropriate subsystem boundaries.

Future live execution follows:

`GPT-5.6-Sol -> Codex App Server item notifications -> CodexThreadEventConverter -> completed-snapshot reasoning normalizer + ordered-tool classifier -> normalized run events -> RuntimeMemoryEventAccumulator + WebSocket -> unchanged projection/frontend consumers`

The correct authoritative boundaries already exist:

- `CodexThreadEventConverter` owns Codex raw-event interpretation and normalized run-event emission.
- The Codex reasoning helper owns reasoning content extraction and active reasoning identity.
- `RuntimeMemoryEventAccumulator` persists the normalized live facts it receives.
- Frontend streaming and later hydration consume normalized contracts and must remain provider-agnostic.

The defect occurs because `CodexReasoningSegmentTracker.resolveReasoningSegmentId()` returns a stable provider item ID before consulting the active per-turn reasoning ID. Five adjacent provider items therefore become five normalized IDs, five live segments, and five persisted reasoning traces.

The packaged candidate proved that the Round 1 matrix remained too broad. It clears on every tool result/log/completion even when that event only updates a tool card positioned earlier at tool-call start. The verified `delivery_engineer` turn contains four adjacent UI reasoning pairs; each pair has exactly one matching `TOOL_EXECUTION_SUCCEEDED` raw trace between the reasoning fragments. Because projection attaches that result to the earlier tool card, no ordered card appears between the two Thinking cards.

The target boundary is therefore **ordered-card creation**, not generic “transcript-producing activity.” A tool/non-reasoning start that creates a new ordered card clears the active reasoning block. A matching result/status/log/completion for that already-positioned card preserves it. A result-first terminal event remains a boundary because generic consumers synthesize the missing tool card at that point.

The current fallback identity is also unsafe after a clear. `reasoning:${turnId}`, `payload.id`, or a repeated provider item ID can be reused for a later block in the same turn, causing generic consumers to append across the boundary. Provider identity must therefore be used only for fragment correlation. Normalized block identity must come from an owned collision-safe allocator.

The user explicitly removed pre-fix historical runs from scope. Existing raw traces and current old-run projections may remain fragmented. Correct future live normalization will naturally cause future persistence to contain one reasoning trace per contiguous block, so reload of those future runs requires no replay-layer change.

The user also explicitly rejected `item/reasoning/summaryTextDelta` support now and in the future. Completed reasoning item snapshots are the sole supported reasoning-summary content source. The delta notification is an explicit ignored/no-effect protocol surface: it emits no normalized content and does not allocate, append, clear, or otherwise mutate reasoning or ordered-tool state.

## Intended Change

Create one explicit Codex reasoning-event normalizer that:

1. extracts supported completed reasoning snapshots and identity facts from completion payloads;
2. maintains a bounded active reasoning block per turn through an owned block tracker;
3. allocates every new normalized block ID from a tracker-instance namespace plus monotonic sequence, never from provider item/event candidates;
4. returns that normalized segment ID for all consecutive reasoning provider items in the active block and never reuses it after a clear;
5. inserts a blank-line separator only when a new completed provider reasoning item joins an already non-empty block, while repeated completion of the same known provider item is idempotent; and
6. applies an ordered-card boundary policy: clear on new ordered segment/card creation, assistant text, turn lifecycle, and terminal error; preserve matching in-place tool lifecycle updates; and conservatively clear when an actual boundary lacks a turn ID.

Consolidate supported completed-snapshot conversion branches through that singular update contract. Route `item/reasoning/summaryTextDelta` and legacy reasoning text-delta notifications through explicit no-effect dispatch that never calls the normalizer or either tracker. Centralize boundary disposition at the Codex converter/facade boundary so special early returns cannot bypass it. Modify `RuntimeMemoryEventAccumulator` narrowly: a result for an already-recorded call must not flush open reasoning, while result-first inferred-call creation retains its flush. Leave storage schema, run-history projection, GraphQL, and frontend production code unchanged.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md` | Defines ordered-card grouping, lifecycle-update preservation, completed-snapshot-only content, collision-safe post-boundary identity, joining, and future live/reload parity | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-008`–`REQ-CTB-010`; `AC-CTB-003`–`AC-CTB-007`, `AC-CTB-009`–`AC-CTB-011` | Constrains normalized live output; pre-fix history is explicitly excluded | Round 3 correction user approved for architecture re-review |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/user-verification-failure-analysis.md` | Exact packaged-app process, projection, raw-trace, and failure-origin evidence | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-009`; `AC-CTB-003`–`AC-CTB-006`, `AC-CTB-010` | Governs this Design Impact revision | Confirmed by user verification |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: original `Local Implementation Defect`; packaged-verification `Design Impact` in tool-lifecycle boundary semantics; Round 3 `Requirement Gap` for permanent unsupported-delta behavior plus `Design Impact` from an incomplete formal spine model
- Refactor needed now: `Yes` — bounded across three existing production owners: Codex reasoning normalization, Codex ordered-tool card-existence classification, and generic memory trace sequencing
- Evidence:
  - Exact rollout: five adjacent provider reasoning item IDs with no intervening tool/text.
  - Direct `thread/read`: one logical reasoning item with 14 parts.
  - Current tracker: provider item ID wins before active block cache.
  - Current parser owns stateful tracking despite a stateless-parser name.
  - Packaged verification: four new-run adjacent pairs each surround a matching result that mutates an earlier tool card, while memory unconditionally flushes the open reasoning segment.
- Design response: Keep the explicit reasoning normalizer/block tracker for completed-snapshot content and identity; add the bounded Codex ordered-tool tracker for card-creation classification; modify the existing generic memory accumulator to use `callWritten` for preserve-versus-infer flush timing.
- Refactor rationale: A conditional-order swap alone would not own provider-item joining, ordered-card placement, or future persistence sequencing. Each concern stays in its existing capability boundary: Codex raw semantics in conversion, card-existence state in a Codex-local tracker, and normalized trace ordering in memory without importing Codex event names.
- Round 1 design-impact resolution:
  - `DR-CTB-001`: remove provider/fallback normalized-ID candidates; allocate namespaced monotonic block IDs and reuse only active state.
  - `DR-CTB-002`: replace assumed fall-through clearing with an explicit event-family disposition applied before converter early returns.
- Packaged verification Design Impact:
  - Replace event-family “terminal tool = clear” with ordered-card semantics.
  - Preserve tracker identity and accumulator buffering across matching updates to an already-started tool.
  - Retain a boundary for result-first events that infer/create a missing tool card.
- Round 3 requirement/design corrections:
  - `DR-CTB-003`: completed reasoning item snapshots are the sole supported content source; `item/reasoning/summaryTextDelta` is permanently ignored/no-effect and has no future-support seam.
  - `DR-CTB-004`: formalize the ordered-tool classification and memory result/flush flows as `DS-CTB-004` and `DS-CTB-005` rather than describing them only in concrete subsections.
- Explicit non-goals:
  - Pre-fix historical runs remain fragmented by explicit user decision.
  - Real-time internal-thinking text streaming, including `item/reasoning/summaryTextDelta`, is intentionally and permanently unsupported.
  - Higher-level asynchronous UI insertions outside the Codex raw item sequence remain outside this Codex block tracker.

## Terminology

- **Provider reasoning item:** One Codex item with its own provider `itemId`.
- **Provider reasoning fragment:** One supported completed reasoning-summary snapshot for a provider reasoning item.
- **Normalized reasoning block:** The AutoByteus contiguous reasoning unit represented by one normalized segment ID.
- **Ordered-card boundary:** An event that inserts a new ordered conversation card/segment at its arrival position, emits assistant text, starts/completes a turn, or terminates the runtime with an error.
- **In-place tool lifecycle update:** A result, status, log, approval transition, or completion applied to a tool card already positioned by an earlier start/request event.
- **Maintenance/no-effect event:** A compaction, status, progress, token, diff, or ignored notification that emits no ordered conversation content and does not split a reasoning block.
- **Block identity namespace:** One opaque random nonce created with the tracker/converter instance and combined with a monotonic block sequence.

## Design Reading Order

1. Persisted schema/data transition is not affected.
2. The live return/event spine owns provider-to-normalized behavior.
3. `DS-CTB-003` owns completed-snapshot block content and identity; unsupported deltas bypass it with no effect.
4. `DS-CTB-004` owns Codex-local new-card versus existing-card classification.
5. `DS-CTB-005` owns generic memory result/flush sequencing using normalized `callWritten` state, not Codex raw-event policy.
6. Run-history, GraphQL, and frontend production remain unchanged consumers; existing folder layout remains appropriate.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `CodexReasoningSegmentTracker` and `CodexReasoningPayloadParser` after their responsibilities move to the target classes.
- Remove split event-converter usage that independently resolves reasoning snapshot content and reasoning segment ID.
- Remove fallback paths that expose provider item IDs, event IDs, `reasoning:${turnId}`, or fixed strings as normalized reasoning block IDs.
- Do not retain re-export aliases, wrapper classes, dual identity paths, feature flags, or a frontend fallback merger.
- Do not introduce compatibility handling for pre-fix stored traces.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Future agent/team member `raw_traces*.jsonl` written from normalized live `SEGMENT_CONTENT` events.
- Relevant code-model, serialization, semantic, or physical-store change: No schema/serialization change. Event IDs/content grouping change before the writer, and writer flush timing changes for matching tool results; trace schema, reader, and projection stay unchanged.
- Normal reader/writer behavior and representative evidence: `RuntimeMemoryEventAccumulator.recordToolResult()` currently flushes every open reasoning segment before writing any tool result. It already knows whether `tool.callWritten` is true. Use that existing state: when true, write the matching result without flushing; when false, `writeToolCall()` infers the missing ordered call and performs the required pre-card flush.
- Required semantics and invariants under direct use: Future traces preserve turn, source order, content, and boundaries using the current schema.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No stored data is rewritten. Pre-fix runs are explicitly ignored.
- Decision: `Not Affected`
- Decision rationale: `Not Affected` as a persisted-data transition. No migration, bulk rewrite, or replay normalization is needed; a bounded current-writer behavior correction preserves the approved future trace grouping.
- Acceptance criteria or design constraints supported: `AC-CTB-005`, `AC-CTB-006`, `AC-CTB-008`, `AC-CTB-010`, `AC-CTB-011` for future runs only.

No migration plan is applicable.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-CTB-001` | `Primary End-to-End` | User sends an agent/team message | Codex App Server executes the turn | `AgentRun` / `CodexAgentRunBackend` | Full request path |
| `DS-CTB-002` | `Return-Event` | Codex reasoning/tool/text notification | Browser conversation card and memory writer | `CodexThreadEventConverter` | Owns future live identity, ordering, and persistence input |
| `DS-CTB-003` | `Bounded Local — Reasoning` | One supported completed reasoning snapshot or semantic boundary | One normalized reasoning update or block-state transition | `CodexReasoningEventNormalizer` | Makes completed-snapshot content, allocation, active reuse, joining, and clearing explicit; unsupported delta notifications bypass it |
| `DS-CTB-004` | `Bounded Local — Ordered Tool` | One card-creating tool start/request or later lifecycle update | Marked card identity or `existing_card_update` / `result_first_creation` classification | `CodexOrderedToolBoundaryTracker` behind `CodexThreadEventConverter` | Decides whether reasoning clears without putting Codex policy in memory or Vue |
| `DS-CTB-005` | `Bounded Local — Memory Sequencing` | One normalized tool-result event reaches memory | Matching result recorded with reasoning preserved, or inferred call written after reasoning flush | `RuntimeMemoryEventAccumulator` | Keeps future persisted ordering equivalent to visible ordered-card semantics using generic `ToolState.callWritten` |

## Primary Execution Spine(s)

`Browser User Input -> Agent/Team Entry -> AgentRun / Team Member Run -> CodexAgentRunBackend -> CodexThread -> Codex App Server -> GPT-5.6-Sol`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-CTB-001` | A user message reaches an agent or focused team member and starts/continues its Codex turn. | Browser input, agent/team run, Codex backend, Codex thread/client | `AgentRun` lifecycle | Workspace/config resolution |
| `DS-CTB-002` | Codex notifications return through the thread converter. Reasoning updates receive a normalized block ID; new ordered card/text/turn events clear it; matching lifecycle updates preserve it. The same normalized event feeds browser and memory. | Provider item, thread converter, normalized event, WebSocket/memory consumers | `CodexThreadEventConverter` | Serialization, status, recording |
| `DS-CTB-003` | The normalizer accepts completed reasoning item snapshots only, extracts turn/item/content facts, and asks the tracker for a block update. A new block receives an allocator-owned ID; a new completed provider item in the active block receives one separator; repeated completion for the same known provider item is idempotent. Boundary disposition clears one turn or all state when unscoped. `summaryTextDelta` and legacy text-delta notifications emit nothing and never enter this spine. | Completed reasoning snapshot, normalizer, ID allocator, active state, normalized update | `CodexReasoningEventNormalizer` | Debug logging, bounded eviction |
| `DS-CTB-004` | A converter branch that emits a tool card marks `(turnId, invocationId)`. A later lifecycle event asks the bounded tracker whether that card already exists. Known-card updates preserve reasoning; unknown/missing-card results clear before the inferred card and then mark when identity is available. | Tool start/request, normalized invocation identity, ordered-tool tracker, semantic boundary callback | `CodexThreadEventConverter` with `CodexOrderedToolBoundaryTracker` | Payload alias resolution, eviction |
| `DS-CTB-005` | Memory receives normalized tool lifecycle events and resolves `ToolState`. It snapshots `callWritten` before inference: a known-call result records without flushing open reasoning; a result-first event delegates to `writeToolCall()`, which flushes reasoning before the inferred call, then records the result. | Normalized tool event, `ToolState`, open reasoning segment, trace writer | `RuntimeMemoryEventAccumulator` | File I/O and projection consume resulting generic traces |

## Spine Actors / Main-Line Nodes

- `AgentRun` / team-member `AgentRun`: lifecycle and event distribution.
- `CodexAgentRunBackend`: provider runtime adaptation.
- `CodexThread`: provider thread state and notification subscription.
- `CodexThreadEventConverter`: authoritative raw-to-normalized boundary.
- `CodexReasoningEventNormalizer`: authoritative reasoning content/block decision.
- `CodexOrderedToolBoundaryTracker`: internal owner of whether a tool lifecycle event creates a card or updates an observed one.
- `RuntimeMemoryEventAccumulator`: normalized-event persistence and ordered-card-aware flush consumer.
- Frontend `segmentHandler`: unchanged normalized-event UI consumer.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `CodexThreadEventConverter` | Codex event dispatch and normalized event creation | UI rendering or stored-history correction |
| `CodexReasoningEventNormalizer` | Payload extraction and singular normalized block update | Tool lifecycle, WebSocket state, persistence |
| `CodexReasoningBlockTracker` | Per-turn active state, collision-safe block allocation, provider-item transitions, separator decision, turn/all clearing, eviction | Generic JSON alias parsing or event dispatch |
| `CodexOrderedToolBoundaryTracker` | Per-turn observed tool-card/invocation identities and result-first classification | Reasoning content, tool rendering, generic payload alias parsing |
| `RuntimeMemoryEventAccumulator` | Event-to-trace recording, existing call/result correlation, reasoning flush timing | Provider reasoning identity or UI rendering |
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
| Manual `snapshot + id` reasoning branches | Split decisions can drift | One `resolveCompletedReasoningSnapshot` path | In This Change | Supported completion paths converge; text deltas are explicit no-effect |
| Proposed history projection fold | User removed old-history remediation | Nothing | Removed From Scope | No run-history production changes |
| Proposed Vue coalescing fallback | Duplicates provider policy | Backend normalized ID | In This Change | Do not add |
| Unconditional terminal tool clear calls | Split reasoning around in-place updates | Ordered-tool classification | Rework | Remove from matching update paths; retain result-first boundary |

## Return Or Event Spine(s) (If Applicable)

Supported reasoning return:

`Completed reasoning item snapshot -> CodexThreadEventConverter -> CodexReasoningEventNormalizer -> SEGMENT_CONTENT(reasoning, normalizedBlockId) -> AgentRun event mapping -> WebSocket + RuntimeMemoryEventAccumulator -> Thinking card + future trace`

Unsupported reasoning delta:

`item/reasoning/summaryTextDelta (or legacy reasoning text-delta notification) -> top-level/item dispatch explicit no-effect -> no normalized event and no reasoning/ordered-tool state mutation`

Tool lifecycle return:

`Tool start/request or lifecycle update -> CodexThreadEventConverter -> ordered-tool classification -> normalized lifecycle event -> WebSocket existing-or-inferred card handling + RuntimeMemoryEventAccumulator generic tool sequencing`

## Bounded Local / Internal Spines (If Applicable)

`DS-CTB-003` parent owner: `CodexReasoningEventNormalizer`

`Completed reasoning snapshot -> extract turn/provider-item/content -> active block lookup -> repeated known completed item: no-op | new completed item in active block: separator + snapshot | no active block: allocate reasoning-block:<instanceNonce>:<sequence>, store active state -> normalized update`

Boundary cycle:

`New ordered non-reasoning/tool card | assistant text | turn start/completion | terminal runtime error -> resolve turn -> clearReasoningBlockForTurn(turnId) or clearAllReasoningBlocks() when unscoped -> next reasoning allocates a different block ID`

In-place lifecycle cycle:

`Known tool invocation result/status/log/completion -> update existing card/tool state -> preserve reasoning block ID -> later reasoning appends to the same block`

`DS-CTB-004` parent owner: `CodexThreadEventConverter`; internal state owner: `CodexOrderedToolBoundaryTracker`

`Card-creating tool start/request -> emit normalized card-capable event + mark (turnId, invocationId) -> later lifecycle update -> known key: existing_card_update/preserve | unknown or missing key: result_first_creation/clear before inferred card`

`DS-CTB-005` parent owner: `RuntimeMemoryEventAccumulator`

`Normalized tool result -> resolve ToolState -> snapshot callWritten -> true: write result and preserve open reasoning | false: writeToolCall flushes reasoning and writes inferred call -> write result -> next true boundary flushes later reasoning`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine IDs | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Debug logging | `DS-CTB-003` | Block tracker | IDs, strategy, lengths, cache size; never content | Diagnosis | Content leakage or logging-driven policy |
| Cache eviction | `DS-CTB-003` | Block tracker | Retain current 128-turn bound | Memory safety | Generic cache abstraction obscures ownership |
| Ordered tool identity | `DS-CTB-004` | Ordered-tool boundary tracker | Mark emitted card starts/requests; classify later lifecycle updates | Result-first safety without Vue policy | Tool execution/result storage |
| Block ID allocation | `DS-CTB-003` | Block tracker | Instance nonce plus monotonic sequence; injectable nonce for deterministic tests | Identity safety across clears/restarts | Provider IDs leak into normalized identity |
| Memory recording | `DS-CTB-005` | `RuntimeMemoryEventAccumulator` | Preserve open reasoning across matching results; infer/flush before result-first call | Future reload parity | Provider parsing in writer |
| Frontend rendering | `DS-CTB-002` | Browser conversation | Render normalized order | User surface | Provider-specific merge logic |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live reasoning block state | Codex event normalization helpers | `Extend + bounded refactor` | Correct owner and cache already exist | N/A |
| Tool start versus matching update | Codex event normalization | `Add bounded tracker` | Converter must know whether a lifecycle event creates or mutates an ordered card | Reasoning tracker and Vue are the wrong owners |
| Reasoning extraction | Existing reasoning helper | `Extend + rename` | Existing extraction remains useful | N/A |
| Future persistence/reload | Memory writer and projection | `Modify writer / reuse projection` | Matching result currently flushes despite preserved visual position; existing call state provides the bounded correction | N/A |
| Browser grouping | Segment handler/hydration | `Reuse unchanged` | Same normalized ID/row already yields one block | N/A |
| Old-run correction | Run-history projection | `No change` | Explicitly excluded by user | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spines | Governing Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex event normalization | Provider payload interpretation, completed-snapshot block ID/content, explicit delta no-effect, ordered-card classification, boundary clearing | `DS-CTB-002`, `DS-CTB-003`, `DS-CTB-004` | `CodexThreadEventConverter` | Modify/refactor | Adds bounded ordered-tool state; unsupported deltas never enter state owners |
| Agent memory | Persist normalized future facts with ordered-card flush timing | `DS-CTB-002`, `DS-CTB-005` | `RuntimeMemoryEventAccumulator` | Modify narrowly | Matching-result preserve; result-first inferred-call flush; no Codex raw-event knowledge |
| Run-history projection | Reload future facts | `DS-CTB-002` | Projection services | Reuse unchanged | No pre-fix correction |
| Web conversation | Apply/render normalized segments | `DS-CTB-002` | Browser stores | Reuse unchanged | Tests only if useful |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-reasoning-block-tracker.ts` | Codex normalization | Internal state owner | Active blocks, ID allocation, completed-item idempotency/transitions, separators, scoped/global clear, eviction | Cohesive bounded state machine | Owns tight update types |
| `codex-reasoning-event-normalizer.ts` | Codex normalization | Reasoning boundary | Extract supported completed-snapshot fields/content and delegate update | One supported reasoning event decision | Uses tracker; never receives delta methods |
| `codex-item-event-payload-parser.ts` | Codex normalization | Item parser facade | Delegate reasoning update/clear and retain other parsing | Existing outer helper boundary | Uses normalizer |
| `codex-ordered-tool-boundary-tracker.ts` | Codex normalization | Ordered-card state owner | Mark known tool cards; classify matching versus result-first updates; turn/all clear | One small lifecycle state machine | Uses normalized identities only |
| `codex-item-event-converter.ts` | Codex normalization | Item event owner | Apply item-family boundary disposition before early returns and route reasoning through one helper | Existing dispatcher | Uses normalized update |
| `codex-thread-event-converter.ts` | Codex normalization | Governing converter | Apply top-level lifecycle/raw boundary disposition and create normalized events | Existing authority | Uses parser facade |
| `runtime-memory-event-accumulator.ts` | Agent memory | Trace sequencing owner | Distinguish matching result update from result-first inferred call when flushing reasoning | Existing tool state already owns distinction | Uses normalized invocation IDs |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reasoning `{id,delta}` resolution | `codex-reasoning-event-normalizer.ts` | Codex normalization | One decision for supported completed-snapshot paths | Yes | Yes | General provider normalizer or delta reconciler |
| Active block state | `codex-reasoning-block-tracker.ts` | Codex normalization | Persists across turn events | Yes | Yes | Generic cache utility |
| Ordered tool-card identity state | `codex-ordered-tool-boundary-tracker.ts` | Codex normalization | Shared by item/raw/local lifecycle paths | Yes | Yes | General frontend segment registry |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexReasoningBlockInput { turnId, providerItemId, snapshot }` | Yes | Yes | Low | No normalized-ID candidate enters from payload; input accepts completed snapshots only |
| `CodexReasoningBlockUpdate { segmentId, delta }` | Yes | Yes | Low | Do not expose tracker internals |
| Private `ActiveReasoningBlock { segmentId, currentProviderItemId, hasContent }` | Yes | Yes | Low | Keep non-serialized/private; repeated completion of the same known current item returns no update |
| Private allocator state `{ instanceNonce, nextBlockSequence }` | Yes | Yes | Low | Nonce is generated once per tracker instance; sequence increments for every new block and never decrements |
| Existing `ToolState { callWritten, resultWritten }` | Yes | Yes | Low | Reuse `callWritten` as the ordered-card-exists fact; do not add parallel tool-boundary state |
| Private `KnownOrderedTool { turnId, invocationId }` | Yes | Yes | Low | Backend normalization state only; no tool arguments/results duplicated |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-block-tracker.ts` | Codex normalization | Internal state | Block allocation/update/boundary/eviction | One state machine | Own types |
| `.../codex-reasoning-event-normalizer.ts` | Codex normalization | Reasoning normalization | Extract and normalize one completed-snapshot update | One supported provider-event decision | Uses tracker; no delta path |
| `.../codex-ordered-tool-boundary-tracker.ts` | Codex normalization | Ordered-card lifecycle | Mark emitted tool cards and classify terminal updates | One bounded state machine | Normalized turn/invocation facts |
| `.../codex-item-event-payload-parser.ts` | Codex normalization | Item facade | Delegate update/clear; other item parsing | Preserves outer helper boundary | Uses normalizer |
| `.../codex-thread-event-converter.ts` | Codex normalization | Governing converter | Consume updates and enforce top-level raw/lifecycle dispositions | Existing top owner | Uses item facade only |
| `.../codex-item-event-converter.ts` | Codex normalization | Item dispatcher | Consolidate reasoning branches and enforce item-family matrix before early returns | Existing dispatch | Uses converter callback |
| `.../codex-turn-event-converter.ts` | Codex normalization | Turn owner | Clear state at start and completion | Existing boundary | Uses context callback |
| `.../codex-raw-response-event-converter.ts` | Codex normalization | Raw-response owner | Preserve compaction; classify function-call output as matching update or result-first creation | Existing dispatch | Uses ordered-tool callback |
| `.../codex-thread-lifecycle-event-converter.ts` | Codex normalization | Lifecycle owner | Preserve status; clear on terminal runtime error | Existing dispatch | Uses boundary callback |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Agent memory | Trace sequencing | Preserve reasoning for matching result; flush through inferred `writeToolCall` for result-first | Existing writer owner | Reuses `ToolState.callWritten` |
| Relevant server tests | Codex normalization/memory | Contract evidence | Collision-safe identity, separator, completed-snapshot integrity, permanent delta no-effect, complete boundary matrix, future persistence | Existing colocation | Sanitized fixtures |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Documentation | Codex contract | Record block identity, completed-snapshot-only content, delta no-effect, and ordered-card rules | Canonical mapping doc | N/A |
| `autobyteus-web/docs/agent_execution_architecture.md` | Documentation | Consumer contract | Clarify normalized contiguous block IDs, ordered-card boundaries, and completed-snapshot-only/no-delta behavior | Existing architecture doc | N/A |

## Ownership Boundaries

- Callers above `CodexThreadEventConverter` receive normalized reasoning blocks and never inspect provider item IDs.
- The converter accesses reasoning normalization only through the item payload facade; it does not reach directly into tracker state.
- The normalizer is the only owner combining raw payload facts with block state.
- The tracker receives typed facts and never parses generic JSON aliases.
- The ordered-tool tracker receives resolved turn/invocation identities and never creates UI segments or stores tool payloads.
- Provider item/event IDs never enter the normalized block-ID allocator.
- Boundary-capable converters call only the facade's semantic `clearForBoundary(payload)`; a missing turn ID clears all active blocks conservatively.
- Memory/history/frontend remain consumers of the corrected future event contract.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadEventConverter.convert` | Item/turn/raw/lifecycle converters, payload facade, reasoning normalizer/tracker, ordered-tool tracker | Codex backend dispatch | Backend calls internal trackers | Strengthen converter contexts/facade API |
| `CodexItemEventPayloadParser.resolveCompletedReasoningSnapshot` | Normalizer + tracker | Event converter | Separately resolve content and ID | Return singular update; delta methods never call facade |
| `RuntimeMemoryEventAccumulator.recordRunEvent` | Segment accumulation/writer | `AgentRun` event recording | Provider code writes traces directly | Keep corrected normalized event input |

## Dependency Rules

Allowed:

- `CodexThreadEventConverter -> CodexItemEventPayloadParser -> CodexReasoningEventNormalizer -> CodexReasoningBlockTracker`.
- `CodexThreadEventConverter -> CodexOrderedToolBoundaryTracker` through typed converter-context callbacks using facade-resolved identities.
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
- Memory or frontend re-derives Codex card-creation policy from raw event names.
- `item/reasoning/summaryTextDelta` or any reasoning text-delta method calls the reasoning normalizer, block tracker, ordered-tool tracker, memory writer, or frontend content handlers.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `resolveCompletedReasoningSnapshot(payload)` | One supported completed reasoning item | Return one normalized update or null | Provider item ID is correlation-only; output ID is allocator-owned | Called only for completion snapshots; no delta/fallback argument |
| `clearReasoningBlockForBoundary(payload)` | One semantic boundary | End the addressed active block | Supported turn ID fields | Missing turn ID delegates to clear-all |
| `clearAllReasoningBlocks()` | Unscoped/terminal boundary | End every cached active block | No payload identity required | Conservative safety path |
| `CodexReasoningBlockTracker.append(input)` | One typed fragment | Reuse active block or allocate fresh block and decide separator | Nullable turn/provider ID; no fallback segment ID | No record parsing |
| `markOrderedToolCreated(turnId, invocationId)` | One emitted tool card | Record that later matching lifecycle events are in-place | Resolved identities only | Called only when a normalized card-creating event is emitted |
| `classifyToolLifecycleUpdate(turnId, invocationId)` | One tool lifecycle update | Return `existing_card_update` or `result_first_creation`, then remember result-first identity | Resolved identities; missing invocation is result-first | Governs whether reasoning clears |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveCompletedReasoningSnapshot` | Yes | Yes | Low | Replace separate snapshot/id use; remove delta/fallback selector |
| `clearReasoningBlockForBoundary` | Yes | Yes | Low | Turn-scoped when possible, clear-all when not |
| `clearAllReasoningBlocks` | Yes | N/A | None | Explicit terminal/unscoped safety operation |
| Tracker `append` | Yes | Yes | Low | Typed input only |
| `markOrderedToolCreated` | Yes | Yes | Low | Record only alongside card-creating emission |
| `classifyToolLifecycleUpdate` | Yes | Yes | Low | Known identity preserves; missing/unknown is result-first |

## Normalized Block Identity Allocation Invariants (`DR-CTB-001`)

1. `CodexReasoningBlockTracker` creates one opaque `instanceNonce` at construction using `randomUUID()`; tests may inject a deterministic nonce.
2. `nextBlockSequence` starts at zero and increments before every new block allocation. Clear and eviction never decrement or reset it.
3. The only allocation form is `reasoning-block:<instanceNonce>:<sequence>`. Provider item IDs, payload event IDs, turn IDs, `reasoning:${turnId}`, and fixed fallback strings are never normalized block-ID candidates.
4. Only an entry currently present in `activeBlockByTurnId` can reuse a normalized block ID. After `clearForTurn`, `clearAll`, or eviction, the next append allocates a fresh sequence value even if its provider item/event identity is absent or identical to a prior block.
5. A resolved turn ID is required for cross-notification active-block reuse. A reasoning notification without a turn ID receives a fresh ID and is not cached; this prefers a safe split over an unverifiable cross-turn/cross-boundary merge.
6. A semantic boundary with no turn ID invokes `clearAll`, because leaving an unknown active turn cached could merge later reasoning across the observed boundary.
7. `providerItemId` is used only to decide completed-item joining and idempotency. Insert one blank-line separator when the active block already has content and the completed provider item differs or is unavailable. Repeated completion of the same known current provider item returns no update so supported snapshot content is emitted once.
8. The instance nonce makes IDs collision-resistant across converter recreation; the monotonic sequence makes them strictly unique within an instance. The normalized prefix prevents collision with provider-native identifier namespaces.

Concrete allocation scenarios:

| Sequence | Provider identity | Required normalized IDs/content |
| --- | --- | --- |
| reasoning -> tool boundary -> reasoning, same `itemId=rs_A` | Repeated | `reasoning-block:N:1` then `reasoning-block:N:2`; never reuse the first ID |
| reasoning -> assistant text -> reasoning, no provider/event ID | Missing | Two allocated IDs; boundary clear does not depend on a provider candidate |
| adjacent completed reasoning A/B, no provider IDs, same turn | Missing | One allocated ID; content `A\n\nB` |
| `summaryTextDelta` before/during/after an active block | Any | No normalized event, allocation, content, clear, or tracker-state mutation |
| converter recreated for the same run | Any | New nonce `N2`; its sequence cannot reuse `N1` IDs |

## Codex Ordered-Card Reasoning Boundary Matrix (`DR-CTB-002`, Packaged Verification Revision)

`Clear` means apply the boundary before branch-specific return/emission. `Preserve` means the event is known not to end adjacency. `No effect` means the notification is ignored/unknown and cannot authoritatively mutate reasoning state.

| Dispatch family / current path | Disposition | Scope | Semantic reason and implementation placement |
| --- | --- | --- | --- |
| Reasoning `ITEM_STARTED` | `Preserve` | Turn | Lifecycle marker only; reasoning content remains in the active block. |
| Completed reasoning snapshot (`ITEM_REASONING_COMPLETED` or reasoning `ITEM_COMPLETED`) | `Preserve + append` | Turn | Supported content source; flows through `resolveCompletedReasoningSnapshot`; provider item transition affects separator, not block identity, and repeated known-item completion is idempotent. |
| `item/reasoning/summaryTextDelta`, legacy reasoning text-delta, or summary-part-delta notification | `No effect` | N/A | Intentionally and permanently unsupported. Emit no normalized content; do not allocate, append, clear, mark, classify, or mutate either tracker. Completed snapshots are the sole content source. |
| User-message `ITEM_STARTED` | `Clear` | Turn or all if unscoped | New input/turn-side transcript boundary; apply before the user-message early return. |
| User-message `ITEM_COMPLETED` | `Preserve` | N/A | Start already performed defensive reset; completion emits no assistant transcript content. |
| Ordinary command, file-change, web-search, MCP/dynamic-tool, agent-message, or unknown `ITEM_STARTED` that emits a new ordered card/segment | `Mark card + Clear` | Turn or all | New ordered entry; apply immediately before emitting its start/lifecycle event. |
| Suppressed send-message command `ITEM_STARTED` / `ITEM_COMPLETED` | `Preserve` | N/A | No central conversation card is emitted; team communication remains outside this ordered conversation. |
| Non-reasoning tool `ITEM_COMPLETED` with a known card/invocation | `Preserve` | Turn | Terminal result/end mutates the earlier card; verified cause of the packaged failure. |
| Non-reasoning tool `ITEM_COMPLETED` without a known card/invocation | `Mark inferred card + Clear` | Turn or all | Terminal lifecycle consumers synthesize a missing card at this point; this is a new ordered boundary. |
| Non-tool `ITEM_COMPLETED` / segment-end-only update | `Preserve` | N/A | Ending an already-positioned segment does not insert a new ordered entry. |
| Context-compaction / compaction-trigger `ITEM_STARTED` or `ITEM_COMPLETED` | `Preserve` | N/A | Provider maintenance/status only; apply classification before general non-reasoning clear and retain the early return. |
| Assistant-message delta | `Clear` | Turn or all | Text is an ordered transcript boundary; clear before empty-delta filtering. |
| Plan delta / turn task-progress / turn diff | `Preserve` | N/A | Progress/side-panel updates do not create ordered conversation content. |
| Command/file/local approval request that emits a lifecycle card | `Mark card + Clear` | Turn or all | Request may be the first card-creating tool event. |
| Local tool approved/denied update with known card | `Preserve` | Turn | Approval state mutates the existing card. If unknown, classify as result-first card creation and clear. |
| Known `ITEM_TOOL_CALL` / permissions notifications ignored by the converter | `No effect` | N/A | Protocol identity alone is not a visible ordered boundary when no normalized conversation event is emitted. |
| Local MCP completion / file-change output log with known invocation | `Preserve` | Turn | Result/log updates the existing card. If unknown and the lifecycle handler would synthesize, mark inferred card and clear. |
| Raw-response `functioncalloutput` with known invocation | `Preserve` | Turn | Alternative log updates an existing card. If unknown and it creates a synthetic card, clear first. |
| Raw-response compaction item / `thread/compacted` | `Preserve` | N/A | Provider maintenance boundary is not a conversation boundary. |
| `TURN_STARTED` | `Clear` | All | Defensive lifecycle reset prevents stale state from a missing prior completion or reused turn ID. |
| `TURN_COMPLETED` | `Clear` | Turn or all | Ends the reasoning block and turn. |
| Thread started/status/token-usage | `Preserve` | N/A | Lifecycle/status only; no ordered conversation content. |
| Terminal runtime `ERROR` | `Clear` | All | Terminal lifecycle cleanup; later recovered work must allocate a new block. |
| `codex/event/*`, unknown item/raw/thread notifications, and other ignored methods | `No effect` | N/A | No normalized transcript meaning is established; do not invent a boundary from an unknown event. |

Implementation rule: disposition is based on whether the normalized event creates a new ordered card, not on raw family alone. Add `CodexOrderedToolBoundaryTracker` beside the converters. It records invocation/card identities when a start/request is emitted and answers whether a later approval/result/log/completion is an existing-card update or result-first creation. It parses no raw aliases; the item facade supplies normalized turn/invocation facts. Missing invocation identity on a potentially card-synthesizing event is conservatively result-first. Clear/eviction follows turn lifecycle. This keeps lifecycle placement policy out of the reasoning tracker and out of Vue.

Unsupported reasoning text deltas are handled before reasoning-content dispatch and are independent of ordered-card classification. Their no-effect path must not call any tracker, so receiving one cannot silently create or prolong state.

Ordered-tool tracker invariants:

1. Key known cards by resolved `(turnId, invocationId)`; provider item IDs are not a substitute for invocation identity.
2. Mark an identity only in the same converter branch that emits a normalized event capable of creating the tool card (`SEGMENT_START`, first tool lifecycle start, or approval request).
3. A later lifecycle event with the same key is `existing_card_update` and preserves reasoning.
4. An unknown or identity-missing lifecycle event that generic consumers can synthesize is `result_first_creation`; clear reasoning first, then mark the resolved key when available.
5. Suppressed/ignored events that emit no conversation card neither mark nor clear.
6. Turn start/completion clears the addressed turn state; terminal error clears all. Retain the same 128-turn bound used by reasoning state so abandoned turns cannot grow memory indefinitely.
7. Reusing an invocation ID in the same turn intentionally targets the same consumer card. A genuinely new ordered tool must carry a new normalized invocation identity.

## Memory Flush Invariants For Ordered Tool Updates

`RuntimeMemoryEventAccumulator` remains the authority for trace sequencing and already owns `ToolState.callWritten`.

1. On tool call/request/start, `writeToolCall()` flushes open reasoning before writing the new ordered tool-call trace.
2. On terminal result/denial/failure, resolve `ToolState` and snapshot `hadRecordedCall = tool.callWritten` before any inference.
3. If `hadRecordedCall` is false, call `writeToolCall()` exactly as today. That method flushes reasoning and writes the inferred ordered card before the result.
4. If `hadRecordedCall` is true, do **not** flush open reasoning. Write the tool-result trace and keep the existing reasoning `SegmentState` open so later content with the same normalized ID appends.
5. Remove the current unconditional `flushOpenReasoningSegments(turnId, event.eventType)` from the matching-result path.
6. The next true ordered boundary or turn completion flushes the combined reasoning once. No raw schema, history fold, or frontend merge is introduced.

Expected future trace/projection shape for the verified sequence:

`tool_call -> tool_result -> reasoning(A+B) -> next_tool_call`

Projection attaches `tool_result` to the earlier `tool_call`, yielding:

`tool card(result attached) -> Thinking(A+B) -> next tool card`

## Main Domain Subject Naming Check

| Subject | Current / Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| State owner | `CodexReasoningSegmentTracker` -> `CodexReasoningBlockTracker` | Yes after rename | Low | Remove old name |
| Decision owner | `CodexReasoningPayloadParser` -> `CodexReasoningEventNormalizer` | Yes after rename | Low | Remove old name |
| Result | `CodexReasoningBlockUpdate` | Yes | Low | Keep `{segmentId,delta}` only |
| Ordered-card state owner | `CodexOrderedToolBoundaryTracker` | Yes | Low | Keep Codex-local and keyed only by normalized turn/invocation identity |
| Generic persistence sequencer | `RuntimeMemoryEventAccumulator` | Yes | Low | Reuse `ToolState.callWritten`; do not introduce a Codex-specific writer |

## Applied Patterns (If Any)

- Provider adapter normalization.
- Bounded per-turn state machine.
- Opaque namespaced monotonic identity allocation.
- Explicit semantic event-family disposition.
- Ordered-card creation versus in-place lifecycle classification.
- Singular content-and-identity update contract.
- Thin generic persistence and presentation consumers.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/` | Folder | Codex event normalization | Raw-to-normalized mapping and internal block state | Existing capability area | UI or persistence I/O |
| `.../codex-reasoning-event-normalizer.ts` | File | Reasoning boundary | Extract/normalize one reasoning event | Beside other event normalization | Tools/GraphQL |
| `.../codex-reasoning-block-tracker.ts` | File | Internal state | Per-turn block state and joining | Beside its normalizer | Generic payload parsing |
| `.../codex-ordered-tool-boundary-tracker.ts` | File | Ordered tool-card state | Known-card versus result-first classification | Beside Codex event converters | UI objects or tool results |
| `autobyteus-server-ts/src/agent-memory/` | Folder | Memory recording | Ordered-card-aware current trace sequencing | Existing authority | Provider IDs/raw Codex names |
| `autobyteus-web/services/agentStreaming/handlers/` | Folder | Browser state | Unchanged consumer | Existing authority | Codex grouping |

No new folder/module layer is warranted.

## Folder Boundary Check

| Folder | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `.../codex/events/` | Main-line provider normalization + internal concern | Yes | Low | Normalizer/state split is meaningful |
| `agent-memory/` | Persistence off-spine | Yes | Low | Bounded flush-timing change in existing owner |
| Web streaming handlers | Client transport/state | Yes | Low | No production change |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Adjacent provider items | `rs_A("A")`, `rs_B("B")` -> normalized ID `reasoning-block:N:1` twice, second delta `"\n\nB"` | IDs `rs_A`,`rs_B` plus Vue merge | Provider ID is not block ID |
| Unsupported text deltas | `summaryTextDelta("hel")`, `summaryTextDelta("lo")` -> no event/state change; later completed `rs_A("hello")` supplies the content once | Stream deltas and then append the completed snapshot | Completed snapshots are the sole product-supported source and avoid reconciliation complexity |
| Tool boundary | reasoning -> tool start -> reasoning gives `reasoning-block:N:1`, then `reasoning-block:N:2` | Keep first ID across tool | Preserves order even if provider ID repeats |
| Matching result update | tool start -> reasoning `A` -> same invocation result -> reasoning `B` keeps one ID/content `A\n\nB` | Clear on every result | Result mutates the earlier card; packaged verification proves no card is inserted between A/B |
| Result-first tool | reasoning `A` -> unknown invocation terminal result -> reasoning `B` gives two reasoning IDs with inferred tool between | Preserve every result | Consumers synthesize a new tool card, so it is an ordered boundary |
| Missing provider identity | completed `A` -> completed `B`, same turn -> one allocated block with `A\n\nB`; boundary then `C` -> new allocated block | Fixed `reasoning:<turnId>` fallback | Missing provider data cannot collide block identity |
| Compaction early return | reasoning -> context compaction -> reasoning keeps one ID | Clear every non-reasoning raw item | Maintenance is not transcript content |
| Future persistence | Known call result preserves open segment; later same-ID reasoning appends; next boundary writes one `A\n\nB` trace | Unconditionally flush in `recordToolResult` or add history repair | Existing `ToolState.callWritten` owns the needed distinction |
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
| Clear every terminal tool event | Defensive result-first behavior | Rejected after live evidence | Classify known-card update versus result-first creation |
| History/frontend coalescing across tool results | Mask persisted producer semantics | Rejected | Correct converter identity and accumulator flush timing |
| `summaryTextDelta` handler, feature flag, fallback, or future compatibility seam | Real-time internal-thinking streaming | Permanently rejected by product decision | Keep explicit no-effect dispatch; completed snapshots only |

## Derived Layering (If Useful)

- Codex transport.
- Codex provider normalization.
- Run lifecycle/distribution.
- Existing memory persistence/history projection.
- Existing generic frontend presentation.

Ownership and event spines remain authoritative.

## Change / Refactor Sequence

1. Preserve the implemented reasoning normalizer/block allocator and add failing regression fixtures reproducing the exact long-running-tool sequence from `user-verification-failure-analysis.md`.
2. Add `CodexOrderedToolBoundaryTracker` with typed turn/invocation identity, bounded per-turn state, mark/classify operations, and turn/all clear.
3. Move non-reasoning start/request clearing to immediately before actual card-creating normalized emissions; do not clear suppressed/ignored events.
4. Replace unconditional item/local/raw terminal clear calls with tracker classification: matching known-card update preserves; result-first creation clears and records the inferred card identity.
5. Modify `RuntimeMemoryEventAccumulator.recordToolResult()`: capture `callWritten` before inference; preserve open reasoning when true; otherwise let `writeToolCall()` flush before the inferred card; remove the later unconditional flush.
6. Add focused converter and accumulator scenarios for matching success/failure/denial/log/approval updates, result-first creation, missing invocation, compaction, text, next tool start, turn reset, and multi-turn eviction.
7. Add durable live/projection/hydration coverage for `tool start -> reasoning A -> matching result -> reasoning B -> next boundary`, asserting one ID/card/trace containing A+B and correct tool-card result.
8. Remove reasoning text-delta content routing and add explicit `item/reasoning/summaryTextDelta`/legacy text-delta no-effect dispatch. Add before/during/after-active-block regression coverage proving no event, content, allocation, clear, mark, classification, persistence, or UI change; completed snapshot content remains exactly once.
9. Retain generic frontend handler behavior; no frontend production grouping change.
10. Update Codex event-mapping and frontend architecture docs with completed-snapshot-only content, permanent delta no-effect, ordered-card semantics, and the matching/result-first distinction.
11. Run implementation-scoped server/web tests, API/E2E re-execution, source review, proportional test review, and a replacement Electron verification build before delivery resumes.

## Key Tradeoffs

- Backend normalization over render-time merging: correct authority and persistence, with slightly richer adapter state.
- Opaque allocated IDs over first-provider-item IDs: small allocator state cost, but identity remains correct for absent/repeated candidates and converter recreation.
- Semantic boundary matrix over “clear every non-reasoning raw item”: slightly more explicit dispatch code, but avoids artificial splits on maintenance/status events and prevents early-return bypass.
- Small ordered-tool tracker over unconditional terminal clearing: adds bounded normalized lifecycle state, but precisely matches whether consumers create or mutate a card and avoids provider policy in Vue.
- Bounded accumulator change over history coalescing: preserves future writer semantics at the existing tool-correlation owner without old-data logic.
- Bounded rename/refactor over conditional swap: more import edits, but coherent identity/content ownership.
- No old-run correction: smaller, cleaner change aligned with explicit product scope; prior runs remain visually fragmented.
- Completed-snapshot-only content over real-time internal-thinking deltas: intentionally trades streaming cadence for a small, stable, duplication-free product contract aligned with the user's permanent decision.

## Risks

- Repeated completion of the same known provider item could duplicate content. Mitigation: make same-known-item completion idempotent in the block tracker and test content exactly once.
- Missing turn IDs could cause unsafe reuse. Mitigation: never cache/reuse an unscoped reasoning block; unscoped semantic boundaries clear all cached blocks.
- Namespace collision across converter instances is theoretically possible with random UUIDs. Mitigation: cryptographic UUID namespace plus per-instance monotonic sequence; no provider-controlled candidate enters allocation.
- Ordered-tool tracker drift from emitted cards. Mitigation: mark only immediately alongside actual card-creating normalized emissions and test matching/result-first paths through converter output.
- Result-first persistence ordering regression. Mitigation: reuse existing `ToolState.callWritten` and `writeToolCall()` flush rather than duplicate inference state.
- Reasoning leakage in diagnostics. Mitigation: log IDs/lengths/strategies only and use sanitized tests.
- Future live/reload divergence. Mitigation: preserve the same ID live and the same open segment in memory across matching results; validate live, raw trace, GraphQL, and hydration together.
- A future protocol update could accidentally route `summaryTextDelta` into content/state handling. Mitigation: explicit permanent no-effect dispatch, forbidden dependency rule, and before/during/after-state regression coverage.

## Guidance For Implementation

- Implement the target owner/API shape, not only a conditional-order swap in the old class.
- Keep tracker input typed; raw field aliases belong to the normalizer.
- Generate normalized IDs only through the tracker allocator. Provider item/event/turn IDs are correlation inputs and must never be returned as reasoning block identity.
- Never reset the monotonic sequence on clear/eviction; only active entries may reuse an ID.
- Preserve each supported completed snapshot exactly once. Add only the explicit separator between different completed provider reasoning items in one active block; repeated completion of the same known item is a no-op.
- Do not reuse across missing/different turn IDs. A boundary lacking turn identity clears all active blocks conservatively.
- Apply ordered-card classification before card-creating emissions and terminal updates; do not clear merely because a raw event is tool-related.
- Mark known tool-card identity only when the converter emits a normalized event that can create that card.
- In memory, use `ToolState.callWritten` before inference; matching result preserves reasoning, result-first `writeToolCall()` flushes it.
- Do not change run-history projection or add pre-fix history tests expecting repaired output.
- Treat `item/reasoning/summaryTextDelta` and reasoning text-delta notifications as intentionally and permanently unsupported no-effect inputs. Do not add handlers, fallbacks, flags, compatibility seams, or future-support TODOs; completed snapshots are the sole content source.
- Do not add frontend production grouping logic.
- Preserve tool lifecycle, memory ordering, status, token usage, and compaction behavior.
