# Design Spec

## Status

`Deep Current-Base Redesign — User Approved for Architecture Re-review`

## Current-State Read

The reported path combines a Codex event-normalization boundary bug with a generic memory flush-sequencing bug inside otherwise appropriate subsystem boundaries.

This redesign targets integrated head `19368ac8f0b8f1d03ae7cd28363385d59c95fab7` on latest-base commit `f23dbf70a3d28ad0237035f26ede16378da7baaa`. That head remains a failed source-review candidate; its state fields are useful evidence, but its accumulator ownership and unseen-insufficient-terminal transition are not accepted as the target implementation.

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

Latest-base integration adds an independent persistence constraint: some normalized tool starts create the ordered conversation card before authoritative arguments exist. The card boundary must flush preceding reasoning immediately, but the governing split tool-trace contract forbids persisting a physical `tool_call` until explicit authoritative arguments are available. Therefore call observation and physical call persistence are necessarily distinct facts.

## Intended Change

Create one explicit Codex reasoning-event normalizer that:

1. extracts supported completed reasoning snapshots and identity facts from completion payloads;
2. maintains a bounded active reasoning block per turn through an owned block tracker;
3. allocates every new normalized block ID from a tracker-instance namespace plus monotonic sequence, never from provider item/event candidates;
4. returns that normalized segment ID for all consecutive reasoning provider items in the active block and never reuses it after a clear;
5. inserts a blank-line separator only when a new completed provider reasoning item joins an already non-empty block, while repeated completion of the same known provider item is idempotent; and
6. applies an ordered-card boundary policy: clear on new ordered segment/card creation, assistant text, turn lifecycle, and terminal error; preserve matching in-place tool lifecycle updates; and conservatively clear when an actual boundary lacks a turn ID.

Consolidate supported completed-snapshot conversion branches through that singular update contract. Route `item/reasoning/summaryTextDelta` and legacy reasoning text-delta notifications through explicit no-effect dispatch that never calls the normalizer or either tracker. Centralize boundary disposition at the Codex converter/facade boundary so special early returns cannot bypass it. Keep `RuntimeMemoryEventAccumulator` as the normalized event/segment facade and extract `RuntimeToolTraceSequencer` as its cohesive provider-agnostic tool lifecycle owner. The sequencer establishes the reasoning boundary on the first normalized card-capable observation independently from physical readiness—including an unseen terminal with valid identity/name but absent arguments—through a narrow accumulator-owned flush callback. It defers raw call/result persistence when arguments are absent, persists later matching ready call/result without re-flushing, flushes before an unseen fully ready result-first terminal, and leaves malformed/no-card terminals without observation or boundary effect. Leave storage schema, run-history projection, GraphQL, and frontend production code unchanged.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md` | Defines ordered-card grouping, lifecycle-update preservation, completed-snapshot-only content, collision-safe post-boundary identity, joining, future live/reload parity, and the evidence-free deferred-observation exception | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-008`–`REQ-CTB-011`; `AC-CTB-003`–`AC-CTB-013` | Constrains normalized live output; pre-fix history is explicitly excluded | Deep current-base redesign user approved |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/consecutive-thinking-blocks/user-verification-failure-analysis.md` | Exact packaged-app process, projection, raw-trace, and failure-origin evidence | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-009`; `AC-CTB-003`–`AC-CTB-006`, `AC-CTB-010` | Governs this Design Impact revision | Confirmed by user verification |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: original `Local Implementation Defect`; packaged-verification `Design Impact` in tool-lifecycle boundary semantics; Round 3 requirement/spine corrections; latest-base `Design Impact` because the reviewed physical-call-only memory fact cannot represent a card observed before authoritative arguments; current integrated `Boundary/Ownership Issue` plus `File Responsibility Drift` because the full lifecycle state machine remains inside a coordination-heavy accumulator
- Refactor needed now: `Yes` — bounded across three existing production owners: Codex reasoning normalization, Codex ordered-tool card-existence classification, and generic memory trace sequencing
- Evidence:
  - Exact rollout: five adjacent provider reasoning item IDs with no intervening tool/text.
  - Direct `thread/read`: one logical reasoning item with 14 parts.
  - Current tracker: provider item ID wins before active block cache.
  - Current parser owns stateful tracking despite a stateless-parser name.
  - Packaged verification: four new-run adjacent pairs each surround a matching result that mutates an earlier tool card, while memory unconditionally flushes the open reasoning segment.
  - Latest base: hosted-search placeholder start creates a live card while explicit arguments remain absent; physical call persistence is intentionally deferred.
  - Round 5: generic lifecycle parsing also synthesizes a card for an unseen terminal with valid identity/name even when arguments remain absent; integrated `recordToolResult()` currently returns before observation/flush.
- Design response: Keep the explicit reasoning normalizer/block tracker and Codex ordered-tool tracker. Extract a provider-agnostic `RuntimeToolTraceSequencer` from the accumulator. It owns `callObserved` (process-local ordering boundary), `callRawTraceId`, `resultRawTraceId`, readiness, compound identity, call-before-result persistence, hydration, interruption, cleanup, and duplicates. `RuntimeMemoryEventAccumulator` retains event dispatch, turn/segment/reasoning state, and the actual flush operation exposed through a narrow callback.
- Refactor rationale: Conflating observation and persistence either misses the pre-card boundary or fabricates arguments; leaving the lifecycle inside a 490-effective-line accumulator also obscures the accepted state machine. The extracted sequencer is a meaningful bounded owner, not a passive type split. Moving roughly 200 lifecycle lines should materially narrow the accumulator, but line count is an outcome rather than the acceptance test: the gate is that each state map and transition has exactly one owner and only the one-way boundary port crosses between them. Provider raw semantics remain in converters, the sequencer consumes only normalized identity/name/argument presence, and the accumulator remains the governing trace-order facade.
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
- Latest-base correction:
  - `CR-CTB-001`: replace the obsolete physical-call-as-observation model with an owned `RuntimeToolTraceSequencer` containing explicit observation, physical-call, and physical-result facts; document deferred readiness, hydration, cleanup, interruption, and crash behavior.
  - Architecture Round 5: split insufficient terminals into unseen card-synthesizing, already-observed deferred, and malformed/no-card transitions. The first observes/flushes, the second preserves, and the third has no effect.
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
- **Call observation:** Process-local knowledge that the accumulator received the first normalized card-creating call lifecycle event and already applied its reasoning boundary.
- **Physical call persistence:** Durable existence of a valid `tool_call` row with compound identity, name, and explicit authoritative arguments.
- **Physical result persistence:** Durable existence of the separate minimal `tool_result` row for that compound identity.

## Design Reading Order

1. Persisted schema/data transition is not affected.
2. The live return/event spine owns provider-to-normalized behavior.
3. `DS-CTB-003` owns completed-snapshot block content and identity; unsupported deltas bypass it with no effect.
4. `DS-CTB-004` owns Codex-local new-card versus existing-card classification.
5. `DS-CTB-005` is governed by `RuntimeMemoryEventAccumulator` but delegates the cohesive generic tool observation/readiness/result state machine to `RuntimeToolTraceSequencer`; neither imports Codex raw-event policy.
6. Run-history, GraphQL, and frontend production remain unchanged consumers; existing folder layout remains appropriate.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `CodexReasoningSegmentTracker` and `CodexReasoningPayloadParser` after their responsibilities move to the target classes.
- Remove split event-converter usage that independently resolves reasoning snapshot content and reasoning segment ID.
- Remove fallback paths that expose provider item IDs, event IDs, `reasoning:${turnId}`, or fixed strings as normalized reasoning block IDs.
- Do not retain re-export aliases, wrapper classes, dual identity paths, feature flags, or a frontend fallback merger.
- Do not introduce compatibility handling for pre-fix stored traces.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Future agent/team member `raw_traces*.jsonl` reasoning rows and strict split `tool_call` / minimal `tool_result` rows written from normalized live events.
- Relevant code-model, serialization, semantic, or physical-store change: No schema/serialization change. Event IDs/content grouping change before the writer, and writer flush timing changes for matching tool results; trace schema, reader, and projection stay unchanged.
- Normal reader/writer behavior and representative evidence: Latest base persists a physical call only when identity, name, and explicit authoritative arguments are present. The integrated candidate's `recordToolCall()` sets `callObserved` and flushes on first observation even if persistence defers, while `recordToolResult()` uses prior observation to avoid re-flushing when it later persists call/result. It is not the target shape: it returns before observing an unseen insufficient terminal and embeds the full lifecycle in the accumulator.
- Required semantics and invariants under direct use: Future traces preserve turn, source order, content, and boundaries using the current schema when the ordered boundary becomes durably representable. Physical groups hydrate call/result IDs; process-local observation without a physical row is intentionally not reconstructable.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No stored data is rewritten. Pre-fix runs are explicitly ignored.
- Decision: `Not Affected`
- Decision rationale: `Not Affected` as a persisted-data transition. No schema, migration, bulk rewrite, observation marker, or replay normalization is introduced. The process-local state only determines when existing reasoning/call/result writes occur.
- Accepted loss boundary: if a deferred observation is abandoned, interrupted without authoritative arguments, or lost to hard crash before physical call persistence, no raw call/result exists and exact transient-boundary replay is not promised. Fabricating `{}` or a new persisted observation type is forbidden.
- Acceptance criteria or design constraints supported: `AC-CTB-005`, `AC-CTB-006`, `AC-CTB-008`, `AC-CTB-010`–`AC-CTB-012` for future runs only.

No migration plan is applicable.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-CTB-001` | `Primary End-to-End` | User sends an agent/team message | Codex App Server executes the turn | `AgentRun` / `CodexAgentRunBackend` | Full request path |
| `DS-CTB-002` | `Return-Event` | Codex reasoning/tool/text notification | Browser conversation card and memory writer | `CodexThreadEventConverter` | Owns future live identity, ordering, and persistence input |
| `DS-CTB-003` | `Bounded Local — Reasoning` | One supported completed reasoning snapshot or semantic boundary | One normalized reasoning update or block-state transition | `CodexReasoningEventNormalizer` | Makes completed-snapshot content, allocation, active reuse, joining, and clearing explicit; unsupported delta notifications bypass it |
| `DS-CTB-004` | `Bounded Local — Ordered Tool` | One card-creating tool start/request or later lifecycle update | Marked card identity or `existing_card_update` / `result_first_creation` classification | `CodexOrderedToolBoundaryTracker` behind `CodexThreadEventConverter` | Decides whether reasoning clears without putting Codex policy in memory or Vue |
| `DS-CTB-005` | `Bounded Local — Tool Trace Sequencing` | First normalized call observation or terminal reaches the accumulator facade | Reasoning boundary requested once; physical call/result persisted when ready or safely skipped | `RuntimeMemoryEventAccumulator` facade -> `RuntimeToolTraceSequencer` owner | Separates ordered-card observation from authoritative-argument persistence without provider-specific policy or accumulator coordination bloat |

## Primary Execution Spine(s)

`Browser User Input -> Agent/Team Entry -> AgentRun / Team Member Run -> CodexAgentRunBackend -> CodexThread -> Codex App Server -> GPT-5.6-Sol`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-CTB-001` | A user message reaches an agent or focused team member and starts/continues its Codex turn. | Browser input, agent/team run, Codex backend, Codex thread/client | `AgentRun` lifecycle | Workspace/config resolution |
| `DS-CTB-002` | Codex notifications return through the thread converter. Reasoning updates receive a normalized block ID; new ordered card/text/turn events clear it; matching lifecycle updates preserve it. The same normalized event feeds browser and memory. | Provider item, thread converter, normalized event, WebSocket/memory consumers | `CodexThreadEventConverter` | Serialization, status, recording |
| `DS-CTB-003` | The normalizer accepts completed reasoning item snapshots only, extracts turn/item/content facts, and asks the tracker for a block update. A new block receives an allocator-owned ID; a new completed provider item in the active block receives one separator; repeated completion for the same known provider item is idempotent. Boundary disposition clears one turn or all state when unscoped. `summaryTextDelta` and legacy text-delta notifications emit nothing and never enter this spine. | Completed reasoning snapshot, normalizer, ID allocator, active state, normalized update | `CodexReasoningEventNormalizer` | Debug logging, bounded eviction |
| `DS-CTB-004` | A converter branch that emits a tool card marks `(turnId, invocationId)`. A later lifecycle event asks the bounded tracker whether that card already exists. Known-card updates preserve reasoning; unknown/missing-card results clear before the inferred card and then mark when identity is available. | Tool start/request, normalized invocation identity, ordered-tool tracker, semantic boundary callback | `CodexThreadEventConverter` with `CodexOrderedToolBoundaryTracker` | Payload alias resolution, eviction |
| `DS-CTB-005` | The accumulator routes normalized tool events to `RuntimeToolTraceSequencer` with the current active turn and a narrow `flushReasoningBoundary` port. The sequencer resolves compound identity and private tool state. The first card-capable event requests one pre-card flush, including an unseen insufficient terminal. Ready calls persist; insufficient calls defer. Observed updates preserve; later readiness writes call then result; unseen ready terminal requests a flush first; malformed/no-card terminal has no boundary. Hydration restores only physical IDs and marks a physical call observed; cleanup/interruption/crash rules remain owned together. | Normalized tool event, active-turn context, boundary port, private tool lifecycle state, authoritative argument presence, writer, physical lifecycle groups | `RuntimeToolTraceSequencer` behind `RuntimeMemoryEventAccumulator` | Segment storage/flush implementation remains in facade; provider policy stays upstream |

## Spine Actors / Main-Line Nodes

- `AgentRun` / team-member `AgentRun`: lifecycle and event distribution.
- `CodexAgentRunBackend`: provider runtime adaptation.
- `CodexThread`: provider thread state and notification subscription.
- `CodexThreadEventConverter`: authoritative raw-to-normalized boundary.
- `CodexReasoningEventNormalizer`: authoritative reasoning content/block decision.
- `CodexOrderedToolBoundaryTracker`: internal owner of whether a tool lifecycle event creates a card or updates an observed one.
- `RuntimeMemoryEventAccumulator`: normalized-event persistence and ordered-card-aware flush consumer.
- `RuntimeToolTraceSequencer`: internal provider-agnostic owner of tool observation, readiness, physical lifecycle writes/hydration, interruption, cleanup, and duplicates.
- Frontend `segmentHandler`: unchanged normalized-event UI consumer.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `CodexThreadEventConverter` | Codex event dispatch and normalized event creation | UI rendering or stored-history correction |
| `CodexReasoningEventNormalizer` | Payload extraction and singular normalized block update | Tool lifecycle, WebSocket state, persistence |
| `CodexReasoningBlockTracker` | Per-turn active state, collision-safe block allocation, provider-item transitions, separator decision, turn/all clearing, eviction | Generic JSON alias parsing or event dispatch |
| `CodexOrderedToolBoundaryTracker` | Per-turn observed tool-card/invocation identities and result-first classification | Reasoning content, tool rendering, generic payload alias parsing |
| `RuntimeMemoryEventAccumulator` | Normalized event dispatch, active/fallback turn context, segment buffering, reasoning/assistant flushes, pending reasoning, provider-compaction delegation, and the `flushReasoningBoundary` port | Tool lifecycle state transitions, provider raw semantics, or UI rendering |
| `RuntimeToolTraceSequencer` | Normalized tool card observation, compound identity resolution, authoritative-argument readiness, strict call-before-result writes, physical IDs, hydration, interruption, turn cleanup, and duplicate suppression | Segment buffers, assistant/reasoning content, provider/Codex raw-event meaning, or frontend state |
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
| Tool lifecycle methods/state embedded in `RuntimeMemoryEventAccumulator` | Coordination-heavy facade and unclear state-machine owner | `RuntimeToolTraceSequencer` | In This Change | Move observation, terminal, persistence, identity, hydration, interruption, and cleanup logic |
| `runtime-memory-event-accumulator-state.ts` passive mixed state file | Type-only extraction does not own lifecycle and mixes segment/tool state | Private/cohesive types in accumulator and sequencer owners | In This Change | Delete file after moving `RuntimeToolState`; inline/retain `SegmentState` with accumulator |

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

`DS-CTB-005` governing facade: `RuntimeMemoryEventAccumulator`; bounded state-machine owner: `RuntimeToolTraceSequencer`

`Accumulator receives normalized call observation + active turn -> sequencer resolves private RuntimeToolState -> first observation: set callObserved + request flushReasoningBoundary -> arguments ready: persist call | arguments absent: defer physical call`

`Accumulator receives normalized terminal + active turn -> sequencer resolves compound identity + normalized tool name -> malformed/no-card: skip with no observation/flush request | prior observed/physical: preserve, then persist if ready or retain deferred | unseen card-capable: set observed + request one flush, then persist if ready or retain deferred`

`Sequencer construction -> hydrate callRawTraceId/resultRawTraceId from complete-corpus physical groups -> physical call implies callObserved -> never recreate observation-only state from placeholder or historical result-side overlay`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine IDs | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Debug logging | `DS-CTB-003` | Block tracker | IDs, strategy, lengths, cache size; never content | Diagnosis | Content leakage or logging-driven policy |
| Cache eviction | `DS-CTB-003` | Block tracker | Retain current 128-turn bound | Memory safety | Generic cache abstraction obscures ownership |
| Ordered tool identity | `DS-CTB-004` | Ordered-tool boundary tracker | Mark emitted card starts/requests; classify later lifecycle updates | Result-first safety without Vue policy | Tool execution/result storage |
| Block ID allocation | `DS-CTB-003` | Block tracker | Instance nonce plus monotonic sequence; injectable nonce for deterministic tests | Identity safety across clears/restarts | Provider IDs leak into normalized identity |
| Memory observation/persistence | `DS-CTB-005` | `RuntimeToolTraceSequencer` | Request flush on first observation; defer physical call until ready; preserve matching terminal; request result-first flush; hydrate physical facts | Future trace/reload parity without fabricated calls | Provider parsing, segment mutation, or persisted observation marker |
| Frontend rendering | `DS-CTB-002` | Browser conversation | Render normalized order | User surface | Provider-specific merge logic |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live reasoning block state | Codex event normalization helpers | `Extend + bounded refactor` | Correct owner and cache already exist | N/A |
| Tool start versus matching update | Codex event normalization | `Add bounded tracker` | Converter must know whether a lifecycle event creates or mutates an ordered card | Reasoning tracker and Vue are the wrong owners |
| Reasoning extraction | Existing reasoning helper | `Extend + rename` | Existing extraction remains useful | N/A |
| Future persistence/reload | Memory accumulator facade, tool sequencer, writer, physical lifecycle index, and projection | `Extract sequencer / reuse facade-writer-index-projection` | Latest base owns strict persistence/hydration; extraction gives the lifecycle one governing internal owner | N/A |
| Browser grouping | Segment handler/hydration | `Reuse unchanged` | Same normalized ID/row already yields one block | N/A |
| Old-run correction | Run-history projection | `No change` | Explicitly excluded by user | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spines | Governing Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex event normalization | Provider payload interpretation, completed-snapshot block ID/content, explicit delta no-effect, ordered-card classification, boundary clearing | `DS-CTB-002`, `DS-CTB-003`, `DS-CTB-004` | `CodexThreadEventConverter` | Modify/refactor | Adds bounded ordered-tool state; unsupported deltas never enter state owners |
| Agent memory facade | Dispatch normalized events; own turn/segment/reasoning flush state and compaction delegation | `DS-CTB-002`, `DS-CTB-005` | `RuntimeMemoryEventAccumulator` | Refactor narrower | Delegates tool lifecycle through one internal owner |
| Tool trace sequencing | Own normalized observation, identity, readiness, physical call/result writes, hydration, interruption, cleanup, duplicates | `DS-CTB-005` | `RuntimeToolTraceSequencer` | Extract meaningful owner | Requests reasoning flush through narrow callback; no Codex raw-event knowledge |
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
| `runtime-memory-event-accumulator.ts` | Agent memory | Governing event/segment facade | Dispatch, turn context, segment/reasoning/assistant buffering and flush, compaction delegation, sequencer construction/delegation | Cohesive event-to-trace facade after extraction | Supplies writer, active turn, and boundary callback |
| `runtime-tool-trace-sequencer.ts` | Agent memory | Tool trace state-machine owner | Observe card-capable lifecycle, resolve compound identity, manage readiness/physical state, write call/result, hydrate, interrupt, clean, dedupe | Cohesive ~200-line lifecycle extracted from accumulator | Uses writer, lifecycle groups, normalized payload helpers, boundary port |
| `runtime-memory-event-accumulator-state.ts` | Agent memory | Obsolete passive type split | None after tool state moves | Type-only extraction does not justify a file | Delete; place private state with actual owners |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reasoning `{id,delta}` resolution | `codex-reasoning-event-normalizer.ts` | Codex normalization | One decision for supported completed-snapshot paths | Yes | Yes | General provider normalizer or delta reconciler |
| Active block state | `codex-reasoning-block-tracker.ts` | Codex normalization | Persists across turn events | Yes | Yes | Generic cache utility |
| Ordered tool-card identity state | `codex-ordered-tool-boundary-tracker.ts` | Codex normalization | Shared by item/raw/local lifecycle paths | Yes | Yes | General frontend segment registry |
| Runtime memory tool state/transitions | `runtime-tool-trace-sequencer.ts` | Agent memory | One private shape and transition owner shared across observation, terminal, hydration, interruption, and cleanup | Yes | Yes | Persisted schema, passive type bag, or provider-specific state |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexReasoningBlockInput { turnId, providerItemId, snapshot }` | Yes | Yes | Low | No normalized-ID candidate enters from payload; input accepts completed snapshots only |
| `CodexReasoningBlockUpdate { segmentId, delta }` | Yes | Yes | Low | Do not expose tracker internals |
| Private `ActiveReasoningBlock { segmentId, currentProviderItemId, hasContent }` | Yes | Yes | Low | Keep non-serialized/private; repeated completion of the same known current item returns no update |
| Private allocator state `{ instanceNonce, nextBlockSequence }` | Yes | Yes | Low | Nonce is generated once per tracker instance; sequence increments for every new block and never decrements |
| Private `KnownOrderedTool { turnId, invocationId }` | Yes | Yes | Low | Backend normalization state only; no tool arguments/results duplicated |
| Normalized tool-card contract `{ turnId, invocationId, toolName, arguments? }` | Yes | Yes | Low | Compound identity + non-empty name makes a lifecycle event card-capable; arguments absent means persistence not ready, `{}` means ready/no-arg. Codex tracker, generic consumers, and sequencer project this same contract without importing each other |
| `ToolTraceSequencingOutcome { resolvedTurnId?: string }` | Yes | Yes | Low | Returns only the turn correlation established by a tool event so the accumulator can retain active-turn ownership; no tool state/classification leaks out |
| `RuntimeToolState.identity` | Yes | Yes | Low | Compound `(turnId, toolCallId)` key shared by observation and physical lifecycle facts |
| `RuntimeToolState.callObserved` | Yes | Yes | Low | Process-local boolean: first normalized card-creating call event has been seen and its reasoning boundary applied; it does not claim a raw call exists |
| `RuntimeToolState.callRawTraceId` | Yes | Yes | Low | Physical call-row identity only; presence implies authoritative name/args were persisted and sets `callObserved` during hydration |
| `RuntimeToolState.resultRawTraceId` | Yes | Yes | Low | Physical result-row identity only and duplicate-terminal guard; current writes require a physical call first |
| `RuntimeToolState.toolName/toolArgs` | Yes | Yes | Low | Latest normalized observations accumulated only until physical call persistence; absent args remain distinct from explicit `{}` |

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
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Agent memory | Governing normalized event/segment facade | Turn/segment/reasoning/assistant state, flush implementation, tool delegation, compaction delegation | Existing public owner narrowed below 500-line pressure | Uses sequencer through explicit methods |
| `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` | Agent memory | Internal tool trace sequencer | Private `RuntimeToolState`, observation/readiness transitions, compound identity, strict writes, physical hydration, interruption/cleanup, duplicates | Meaningful bounded local state machine | Uses `RunMemoryWriter`, `ToolTraceLifecycleGroup`, payload extractors, boundary callback |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator-state.ts` | Agent memory | Removed | No remaining responsibility | Passive mixed type file is obsolete | Delete; no re-export/alias |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts` | Agent memory | Tool sequencing contract evidence | Observation/readiness branches, identity ambiguity, strict writes, hydration, interruption, cleanup, duplicates, and crash-visible states | Colocated with extracted owner | Sanitized normalized events and writer spy |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | Agent memory | Facade contract evidence | Dispatch/delegation, turn outcome adoption, segment/reasoning/assistant order, pending reasoning, compaction, and integration with sequencer callback | Existing facade test narrowed with production owner | Uses public facade only; no sequencer private-state access |
| Relevant Codex server tests | Codex normalization | Provider contract evidence | Collision-safe identity, separator, completed-snapshot integrity, permanent delta no-effect, complete boundary matrix, and emitted normalized tool facts | Existing colocation | Sanitized provider fixtures; no memory internals |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Documentation | Codex contract | Record block identity, completed-snapshot-only content, delta no-effect, and ordered-card rules | Canonical mapping doc | N/A |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Documentation | Generic memory contract | Record first card-capable observation, readiness-deferred physical persistence, three insufficient-terminal branches, hydration, and crash behavior | Canonical server memory doc | N/A |
| `autobyteus-web/docs/agent_execution_architecture.md` | Documentation | Consumer contract | Clarify normalized contiguous block IDs, ordered-card boundaries, and completed-snapshot-only/no-delta behavior | Existing architecture doc | N/A |

## Ownership Boundaries

- Callers above `CodexThreadEventConverter` receive normalized reasoning blocks and never inspect provider item IDs.
- The converter accesses reasoning normalization only through the item payload facade; it does not reach directly into tracker state.
- The normalizer is the only owner combining raw payload facts with block state.
- The tracker receives typed facts and never parses generic JSON aliases.
- The ordered-tool tracker receives resolved turn/invocation identities and never creates UI segments or stores tool payloads.
- The normalized tool-card contract is authoritative across projections: compound turn/invocation identity plus non-empty normalized name is card-capable; optional arguments express physical readiness only.
- The Codex ordered-tool tracker and `RuntimeToolTraceSequencer.callObserved` consume that contract but do not duplicate responsibility: the former decides raw-provider-event placement before normalized emission; the latter sequences normalized observation into physical evidence and a reasoning-boundary request. Neither imports the other's state or API.
- `callObserved` never substitutes for `callRawTraceId`; physical call persistence still requires explicit authoritative arguments. Physical result persistence never precedes a physical call.
- Provider item/event IDs never enter the normalized block-ID allocator.
- Boundary-capable converters call only the facade's semantic `clearForBoundary(payload)`; a missing turn ID clears all active blocks conservatively.
- Memory/history/frontend remain consumers of the corrected future event contract.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexThreadEventConverter.convert` | Item/turn/raw/lifecycle converters, payload facade, reasoning normalizer/tracker, ordered-tool tracker | Codex backend dispatch | Backend calls internal trackers | Strengthen converter contexts/facade API |
| `CodexItemEventPayloadParser.resolveCompletedReasoningSnapshot` | Normalizer + tracker | Event converter | Separately resolve content and ID | Return singular update; delta methods never call facade |
| `RuntimeMemoryEventAccumulator.recordRunEvent` | Turn/segment/reasoning state, compaction recorder, internal tool sequencer | `AgentRun` event recording | Provider code or recorder calls sequencer directly | Keep facade as sole public normalized-event entry |
| `RuntimeToolTraceSequencer` | Private tool state, lifecycle transitions, writer, physical lifecycle groups, boundary-request port | Accumulator only | Accumulator mutates sequencer maps or sequencer mutates segment maps | Strengthen explicit record/turn methods and callback type |

## Dependency Rules

Allowed:

- `CodexThreadEventConverter -> CodexItemEventPayloadParser -> CodexReasoningEventNormalizer -> CodexReasoningBlockTracker`.
- `CodexThreadEventConverter -> CodexOrderedToolBoundaryTracker` through typed converter-context callbacks using facade-resolved identities.
- Item/turn converters depend on converter-supplied callbacks, not tracker internals.
- Raw-response and lifecycle converters receive the same semantic boundary callback; they do not infer or mutate tracker state directly.
- Memory/frontend consumers depend only on normalized run events.
- `RuntimeMemoryEventAccumulator -> RuntimeToolTraceSequencer` through construction plus `recordCallObservation`, `recordTerminal`, `interruptTurn`, and `completeTurn`.
- `RuntimeToolTraceSequencer -> RunMemoryWriter + ToolTraceLifecycleGroup + normalized payload extractors + flushReasoningBoundary callback`.

Forbidden:

- Frontend or memory code recognizes `rs_*`, Codex `itemId`, or `item/reasoning/*`.
- Converter calls both normalizer and tracker directly.
- Run-history code adds pre-fix correction logic.
- Compatibility aliases retain old classes.
- Payload-derived or fixed fallback values become normalized reasoning block IDs.
- Any early return occurs before the event family's boundary disposition has been applied.
- Memory or frontend re-derives Codex card-creation policy from raw event names.
- `RuntimeMemoryEventAccumulator` reaches into tool state, readiness, identity resolution, or physical write methods after extraction.
- `RuntimeToolTraceSequencer` reads or mutates segment/pending-reasoning maps, active-turn ownership, provider compaction, Codex trackers, or frontend state.
- Memory equates `callObserved` with durable call evidence, treats absent arguments as `{}`, persists an observation marker, or reconstructs a current call from historical result-side overlays.
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
| `RuntimeToolTraceSequencer.recordCallObservation(event, activeTurnId)` | One normalized call/approval/start | Mark first observation, request boundary once, merge normalized name/args, persist call if ready, return the resolved turn when available | Compound identity; argument absence preserved | Provider-agnostic; repeated/matching observations do not re-flush |
| `RuntimeToolTraceSequencer.recordTerminal(event, activeTurnId)` | One normalized terminal | Determine card capability, establish first observation before readiness return, distinguish matching/result-first/malformed, ensure call-before-result, return the resolved turn when available | Existing compound identity with a known name, or new compound identity + non-empty normalized name; explicit args are required only for persistence | No Codex event-name branching; insufficient does not imply malformed |
| `RuntimeToolTraceSequencer.interruptTurn(event, turnId)` | One controlled turn interruption | Write interrupted results only for physical pending calls | Explicit turn + hydrated/current physical state | No segment flushing or fabricated deferred call |
| `RuntimeToolTraceSequencer.completeTurn(turnId)` | One turn cleanup | Remove observation-only state while retaining physical duplicate guards | Explicit turn | Called after accumulator flushes turn segments |
| `flushReasoningBoundary(turnId, sourceEvent)` callback | One tool-created ordered boundary | Ask accumulator to flush open reasoning for the turn | Explicit turn/source | Sequencer never receives segment maps |
| Private `persistToolCall(tool,event)` | One ready physical call | Append strict call and store returned trace ID | Requires name plus explicit args; `{}` valid, `undefined` not ready | Boundary observation has already happened; physical write never decides whether to flush |
| `hydrateToolStates(groups)` | Reconstructed physical lifecycle corpus | Restore call/result IDs and call-side name/args; physical call marks observed | Compound lifecycle groups | Never hydrates observation-only state or writer decisions from result overlay |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveCompletedReasoningSnapshot` | Yes | Yes | Low | Replace separate snapshot/id use; remove delta/fallback selector |
| `clearReasoningBlockForBoundary` | Yes | Yes | Low | Turn-scoped when possible, clear-all when not |
| `clearAllReasoningBlocks` | Yes | N/A | None | Explicit terminal/unscoped safety operation |
| Tracker `append` | Yes | Yes | Low | Typed input only |
| `markOrderedToolCreated` | Yes | Yes | Low | Record only alongside card-creating emission |
| `classifyToolLifecycleUpdate` | Yes | Yes | Low | Known identity preserves; missing/unknown is result-first |
| `recordCallObservation` | Yes | Yes | Low | First observation versus repeat is explicit in private sequencer state |
| `recordTerminal` | Yes | Yes | Low | Prior observation, card capability, and physical readiness independently determine request/write behavior |
| `interruptTurn` / `completeTurn` | Yes | Yes | Low | Tool lifecycle cleanup stays inside sequencer; accumulator owns ordering of its call relative to segment flush |
| `flushReasoningBoundary` port | Yes | Yes | Low | One-way request preserves facade ownership of segments |
| `persistToolCall` | Yes | Yes | Low | Private strict write only after observation/boundary transition; cannot write placeholder args or decide flushing |
| `hydrateToolStates` | Yes | Yes | Low | Physical lifecycle reconstruction only |
| `ToolTraceSequencingOutcome` | Yes | Yes | Low | Return only resolved turn; do not expose observation/readiness/write decisions |

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

## Memory Observation And Physical Sequencing Invariants (`CR-CTB-001`)

`RuntimeMemoryEventAccumulator` remains the governing normalized-event/segment facade. Its internal `RuntimeToolTraceSequencer` is the provider-agnostic authority for tool observation-to-physical-trace sequencing. Private `RuntimeToolState` inside that sequencer owns three intentionally distinct facts:

1. `callObserved` means this accumulator instance has seen the first normalized call lifecycle event for the compound identity and already applied the ordered-card reasoning boundary. It is process-local and makes no durable-evidence claim.
2. `callRawTraceId` means a physical `tool_call` row with authoritative name/arguments exists. It is a persistence/deduplication fact, not the time the card first appeared.
3. `resultRawTraceId` means a physical minimal `tool_result` row exists. It suppresses duplicate terminals. Current writes require `callRawTraceId` before this field can be set.
4. These fields are not redundant: `callObserved=true` with no `callRawTraceId` is the valid deferred-authoritative-arguments state; `callRawTraceId` may be hydrated after restart and implies `callObserved=true`; `resultRawTraceId` identifies a different physical row.
5. `toolArgs === undefined` means authoritative arguments are unavailable and blocks call persistence. Explicit `{}` is a ready argument object. Memory never guesses provider meaning or collapses the distinction.
6. A normalized terminal is **card-capable** when compound identity resolves and normalized `toolName` is non-empty—the same minimum identity/name facts required by generic lifecycle parsing to synthesize a card. Argument readiness is not part of card capability. Missing/ambiguous identity or missing name is malformed/no-card and must not establish observation.

State transitions:

| Prior state + normalized event | Reasoning action | Physical action | Next state |
| --- | --- | --- | --- |
| Unseen + call/approval/start, args ready | Flush pre-card reasoning once | Write call | observed + call persisted |
| Unseen + call/approval/start, args absent | Flush pre-card reasoning once | None | observed + call deferred |
| Observed/deferred + later matching call, args ready | Preserve post-card reasoning | Write call | observed + call persisted |
| Observed/deferred + matching terminal, args ready | Preserve post-card reasoning | Write call, then result | complete |
| Unseen + self-contained terminal, args ready | Flush before inferred card | Write call, then result | complete |
| Unseen + card-capable terminal, args absent | Set `callObserved`; flush pre-card reasoning once | Skip/log physical call/result for now | observed + call deferred |
| Observed/deferred + matching terminal, args still absent | Preserve post-card reasoning; do not re-flush | Skip/log physical call/result for now | observed + call deferred |
| Malformed/no-card terminal (identity unresolved or name absent) | No observation and no flush | Skip/log; write nothing | No card state transition |
| Call persisted + matching terminal | Preserve post-card reasoning | Write result only | complete |
| Duplicate call/result | None | None | Existing state retained |

Lifecycle, hydration, and restart rules:

1. On `TURN_COMPLETED`, the accumulator first flushes remaining segments, then calls `sequencer.completeTurn(turnId)`, which deletes observation-only tool state with no physical call/result. Physical states remain available for duplicate suppression during the process lifetime.
2. On controlled interruption, the accumulator delegates tool repair to `sequencer.interruptTurn(event, turnId)` before its normal turn completion. The sequencer writes an interruption result only for a physical call. A deferred call with no authoritative arguments produces no fabricated raw pair and its observation is discarded during cleanup.
3. Reconstruction hydrates from complete-corpus `ToolTraceLifecycleGroup`s. A physical call restores call-side name/args, `callRawTraceId`, and `callObserved=true`; a physical result restores `resultRawTraceId`. Historical result-side argument overlay is not a writer input.
4. A hard crash before deferred call persistence loses `callObserved`. No raw row or observation marker is created. After restart, a later self-contained terminal with no hydrated call is result-first from reconstructed state and flushes before writing call/result.
5. A crash between deferred terminal call append and result append leaves an honest unmatched physical call. Hydration restores it as observed; a later matching terminal may append the result without inventing another call or reasoning boundary.
6. This accepted crash/interruption behavior may make reload unable to reproduce a transient card boundary that never obtained physical evidence. Preserving it would require fabricated arguments or a new persisted observation contract, both outside and contrary to the governing latest-base design.
7. The hard-crash exception does not apply while the accumulator survives: once an unseen card-capable insufficient terminal sets `callObserved`, every later matching update uses that observation and may never move the boundary by flushing again.

The next true ordered boundary or turn completion flushes combined post-card reasoning once. No raw schema, observation trace, history fold, or frontend merge is introduced.

Expected future trace/projection shape for the verified sequence:

`tool_call -> tool_result -> reasoning(A+B) -> next_tool_call`

Projection attaches `tool_result` to the earlier `tool_call`, yielding:

`tool card(result attached) -> Thinking(A+B) -> next tool card`

Expected surviving-process shape for the Round 5 sequence:

`reasoning(A) -> unseen insufficient terminal(card observed, no rows) -> reasoning(B) -> later ready terminal(call + result, no flush) -> next boundary`

Raw trace write order after the next boundary is `reasoning(A) -> tool_call -> tool_result -> reasoning(B)`. Projection/hydration therefore remains `Thinking(A) -> tool card(result attached) -> Thinking(B)`; the later ready terminal does not relocate the card after B.

## Main Domain Subject Naming Check

| Subject | Current / Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| State owner | `CodexReasoningSegmentTracker` -> `CodexReasoningBlockTracker` | Yes after rename | Low | Remove old name |
| Decision owner | `CodexReasoningPayloadParser` -> `CodexReasoningEventNormalizer` | Yes after rename | Low | Remove old name |
| Result | `CodexReasoningBlockUpdate` | Yes | Low | Keep `{segmentId,delta}` only |
| Ordered-card state owner | `CodexOrderedToolBoundaryTracker` | Yes | Low | Keep Codex-local and keyed only by normalized turn/invocation identity |
| Governing memory facade | `RuntimeMemoryEventAccumulator` | Yes | Low | Keep normalized event dispatch, active-turn context, segment/reasoning buffering, and the boundary flush implementation here |
| Bounded tool lifecycle owner | `RuntimeToolTraceSequencer` | Yes | Low | Extract from accumulator; name matches observation-to-physical trace sequencing rather than provider execution |
| Internal memory state | `RuntimeToolState` | Yes | Low | Keep `callObserved`, `callRawTraceId`, and `resultRawTraceId` private beside sequencer transitions |

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
| `autobyteus-server-ts/src/agent-memory/` | Folder | Memory recording | Ordered-card-aware observation/readiness/current trace sequencing | Existing authority | Provider IDs/raw Codex names |
| `.../services/runtime-tool-trace-sequencer.ts` | File | Bounded tool lifecycle owner | Observation, readiness, strict writes, hydration, interruption, cleanup, duplicate state | Beside accumulator/writer; one coherent local spine | Segment content, active-turn ownership, provider parsing |
| `autobyteus-web/services/agentStreaming/handlers/` | Folder | Browser state | Unchanged consumer | Existing authority | Codex grouping |

No new folder/module layer is warranted.

## Folder Boundary Check

| Folder | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `.../codex/events/` | Main-line provider normalization + internal concern | Yes | Low | Normalizer/state split is meaningful |
| `agent-memory/` | Persistence off-spine | Yes | Low | Accumulator remains facade; meaningful sequencer extraction removes ~200 lifecycle lines and the passive 17-line mixed state file |
| Web streaming handlers | Client transport/state | Yes | Low | No production change |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Adjacent provider items | `rs_A("A")`, `rs_B("B")` -> normalized ID `reasoning-block:N:1` twice, second delta `"\n\nB"` | IDs `rs_A`,`rs_B` plus Vue merge | Provider ID is not block ID |
| Unsupported text deltas | `summaryTextDelta("hel")`, `summaryTextDelta("lo")` -> no event/state change; later completed `rs_A("hello")` supplies the content once | Stream deltas and then append the completed snapshot | Completed snapshots are the sole product-supported source and avoid reconciliation complexity |
| Tool boundary | reasoning -> tool start -> reasoning gives `reasoning-block:N:1`, then `reasoning-block:N:2` | Keep first ID across tool | Preserves order even if provider ID repeats |
| Matching result update | tool start -> reasoning `A` -> same invocation result -> reasoning `B` keeps one ID/content `A\n\nB` | Clear on every result | Result mutates the earlier card; packaged verification proves no card is inserted between A/B |
| Result-first tool | reasoning `A` -> unknown invocation terminal result -> reasoning `B` gives two reasoning IDs with inferred tool between | Preserve every result | Consumers synthesize a new tool card, so it is an ordered boundary |
| Deferred authoritative args | reasoning `pre` -> placeholder start(no args) -> reasoning `A` -> matching terminal(args ready) -> reasoning `B` -> next call | Flush `pre` at observation; write no placeholder call; terminal writes call+result without flushing; next boundary writes one `A\n\nB` reasoning trace | Use physical call existence as the observation fact or persist `{}` |
| Unseen insufficient terminal | reasoning `A` -> unseen terminal(identity/name, no args; card synthesized) -> reasoning `B` -> later ready matching terminal -> next boundary | First terminal sets observed and flushes A; later terminal writes call+result without flushing B; projection is Thinking(A) -> tool -> Thinking(B) | Return for missing args before observation, then flush at later readiness |
| Observed insufficient repeat vs malformed | observed/deferred + another insufficient terminal preserves; terminal missing identity/name has no card/observation/flush | Three explicit transitions | Treat every insufficient terminal as skip/no-effect |
| Crash before deferred persistence | placeholder start(no args) -> hard crash | Observation may vanish with no raw call/result; never reconstruct `{}` | Persist an observation marker or claim exact replay | Latest-base evidence contract prefers honest absence |
| Restart with physical call only | hydrated call/no result -> matching terminal | Hydration marks observed; append result without another call/boundary | Treat as result-first | Physical lifecycle group is durable correlation evidence |
| Missing provider identity | completed `A` -> completed `B`, same turn -> one allocated block with `A\n\nB`; boundary then `C` -> new allocated block | Fixed `reasoning:<turnId>` fallback | Missing provider data cannot collide block identity |
| Compaction early return | reasoning -> context compaction -> reasoning keeps one ID | Clear every non-reasoning raw item | Maintenance is not transcript content |
| Future persistence | First normalized observation owns the flush; matching terminal uses `callObserved` even when `callRawTraceId` was deferred; next boundary writes one `A\n\nB` trace | Unconditionally flush in `recordToolResult` or infer observation from physical call | Observation and physical evidence have different timing |
| Encapsulation | Converter requests one `{segmentId,delta}` | Resolve content and ID independently | Avoids split policy |

Target memory composition shape:

```ts
this.toolTraceSequencer = new RuntimeToolTraceSequencer({
  writer: input.writer,
  toolTraceLifecycleGroups: input.toolTraceLifecycleGroups,
  flushReasoningBoundary: (turnId, sourceEvent) =>
    this.flushOpenReasoningSegments(turnId, sourceEvent),
});

const outcome = this.toolTraceSequencer.recordTerminal(event, this.activeTurnId);
if (outcome.resolvedTurnId) this.activeTurnId = outcome.resolvedTurnId;
```

The callback is deliberately one-way. The sequencer cannot inspect segment maps, and the facade cannot inspect tool maps or choose readiness/persistence transitions. `ToolTraceSequencingOutcome` contains only `resolvedTurnId`; it does not expose private tool state or a provider-specific classification.

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
| Persisted tool-observation marker/new trace type | Preserve a deferred card boundary across crash | Rejected by governing latest-base contract and scope | Keep observation process-local; hydrate physical lifecycle only |
| Placeholder `{}` call | Make observation durable before args exist | Rejected | Preserve absent-versus-empty meaning and defer call persistence |

## Derived Layering (If Useful)

- Codex transport.
- Codex provider normalization.
- Run lifecycle/distribution.
- Existing memory persistence/history projection.
- Existing generic frontend presentation.

Ownership and event spines remain authoritative.

## Change / Refactor Sequence

1. Freeze the integrated head as a failed candidate and first add a failing memory regression for `reasoning A -> unseen terminal(identity/name, args absent) -> reasoning B -> later ready terminal -> next boundary`. Assert that the first terminal, not later readiness, owns the boundary.
2. Preserve the already-reviewed Codex reasoning normalizer/block allocator and `CodexOrderedToolBoundaryTracker`; add or retain converter fixtures for the exact packaged long-running-tool sequence, matching updates, result-first creation, and the complete event-family matrix.
3. Add `runtime-tool-trace-sequencer.ts` as one provider-agnostic bounded owner. Move the tool map, private `RuntimeToolState`, compound identity resolution, name/argument accumulation, readiness, call/result append, physical hydration, interruption, completion cleanup, and duplicate suppression out of `RuntimeMemoryEventAccumulator` without changing their split-trace contract.
4. Give the sequencer only `RunMemoryWriter`, `ToolTraceLifecycleGroup`s, normalized `AgentRunEvent`s plus the facade's active turn, and a narrow `flushReasoningBoundary(turnId, sourceEvent)` callback. Its record methods return the resolved turn ID when one was established so the facade—not the sequencer—continues to own active-turn context.
5. Implement terminal classification before any readiness return: an existing lifecycle with a known card name is card-capable even if the terminal omits the name; an unseen identity plus non-empty normalized name is card-capable and creates observation state; an unseen identity with no usable name is malformed/no-card and creates no state. Argument absence affects physical readiness only.
6. On the first card-capable observation, set `callObserved` and invoke the boundary callback exactly once. If the call is ready, persist it after the callback; otherwise retain process-local deferred state. Repeated/matching observations never invoke the callback again.
7. For a later ready matching terminal, write the strict call first and minimal result second without another callback. For an unseen fully ready terminal, invoke the callback before call/result writes. For observed still-insufficient input, retain deferred state; for malformed/no-card input, write and mutate nothing.
8. Hydrate only physical lifecycle groups into `callRawTraceId`/`resultRawTraceId`, with a hydrated call implying `callObserved=true`. On controlled interruption write results only for physical pending calls. On turn completion delete only observation-only state and retain physical duplicate guards. Preserve the accepted hard-crash and crash-between-appends behavior without adding a marker or placeholder call.
9. Narrow `RuntimeMemoryEventAccumulator` to event dispatch, active/fallback turn context, segment/reasoning/assistant buffering and flush, pending reasoning, compaction delegation, and sequencer construction/delegation. Delete its tool map and every tool identity/readiness/persist/hydrate helper. Keep the actual segment flush private to the facade and expose it only through the callback closure.
10. Delete `runtime-memory-event-accumulator-state.ts` with no alias or re-export. Keep private `RuntimeToolState` beside sequencer transitions and keep `SegmentState` beside the accumulator that owns it.
11. Split durable unit ownership: move lifecycle-state-machine scenarios from the 995-line accumulator test into a colocated `runtime-tool-trace-sequencer.test.ts`; keep facade ordering/delegation, segment, turn, and compaction scenarios in `runtime-memory-event-accumulator.test.ts`. Add parity assertions that Codex card-capable emissions and memory observations use the same normalized `(turnId, invocationId, toolName, arguments?)` facts without either test importing the other owner's private state.
12. Add durable live/raw/projection/hydration coverage for both `tool start -> reasoning A -> matching result -> reasoning B -> next boundary` and the unseen-insufficient-terminal sequence, asserting that later readiness never relocates the first visible card boundary.
13. Remove reasoning text-delta content routing and keep explicit `item/reasoning/summaryTextDelta`/legacy text-delta no-effect dispatch. Cover before/during/after-active-block inputs with no event, content, allocation, clear, mark, classification, persistence, or UI change; completed snapshot content remains exactly once.
14. Retain generic frontend handler and run-history projection production behavior; make no frontend grouping, compatibility, migration, or historical-rewrite change.
15. Align Codex, memory, run-history, and frontend durable docs with completed-snapshot-only content, ordered-card semantics, observation-versus-physical persistence, extracted ownership, and accepted crash behavior.
16. Return through architecture and fresh implementation source review before API/E2E, proportional test review, and a replacement Electron verification build.

## Key Tradeoffs

- Backend normalization over render-time merging: correct authority and persistence, with slightly richer adapter state.
- Opaque allocated IDs over first-provider-item IDs: small allocator state cost, but identity remains correct for absent/repeated candidates and converter recreation.
- Semantic boundary matrix over “clear every non-reasoning raw item”: slightly more explicit dispatch code, but avoids artificial splits on maintenance/status events and prevents early-return bypass.
- Small ordered-tool tracker over unconditional terminal clearing: adds bounded normalized lifecycle state, but precisely matches whether consumers create or mutate a card and avoids provider policy in Vue.
- Meaningful sequencer extraction over either history coalescing or a conditional patch in the accumulator: preserves future writer semantics, removes about 200 lifecycle lines from the coordination-heavy facade, and gives the transition table one executable owner without adding old-data logic.
- Process-local observation plus physical IDs over one physical-call boolean: slightly richer state, but represents real asynchronous timing without fabricated arguments or provider policy in memory.
- Honest evidence loss over persisted observation marker: a hard crash can lose a deferred transient boundary, but storage remains the approved strict call/result contract.
- Bounded rename/refactor over conditional swap: more import edits, but coherent identity/content ownership.
- No old-run correction: smaller, cleaner change aligned with explicit product scope; prior runs remain visually fragmented.
- Completed-snapshot-only content over real-time internal-thinking deltas: intentionally trades streaming cadence for a small, stable, duplication-free product contract aligned with the user's permanent decision.

## Risks

- Repeated completion of the same known provider item could duplicate content. Mitigation: make same-known-item completion idempotent in the block tracker and test content exactly once.
- Missing turn IDs could cause unsafe reuse. Mitigation: never cache/reuse an unscoped reasoning block; unscoped semantic boundaries clear all cached blocks.
- Namespace collision across converter instances is theoretically possible with random UUIDs. Mitigation: cryptographic UUID namespace plus per-instance monotonic sequence; no provider-controlled candidate enters allocation.
- Ordered-tool tracker drift from emitted cards. Mitigation: mark only immediately alongside actual card-creating normalized emissions and test matching/result-first paths through converter output.
- Observation/physical state drift. Mitigation: one `RuntimeToolState`, compound identity, transition-table tests, and physical-call-implies-observed hydration invariant.
- Converter/memory contract drift. Mitigation: both owners consume the same normalized compound identity/name/argument-presence facts; converter tests assert emitted facts, sequencer tests assert transitions from those facts, and neither owner imports the other's private state or raw-provider policy.
- Unseen insufficient terminal can be mistaken for malformed or already observed. Mitigation: define card capability from normalized identity/name before readiness return; cover all three branches and the later-ready sequence.
- Deferred observation crash/reload gap. Accepted: no physical rows exist, so exact transient-boundary replay is impossible without violating the tool-trace contract.
- Reasoning leakage in diagnostics. Mitigation: log IDs/lengths/strategies only and use sanitized tests.
- Future live/reload divergence. Mitigation: preserve the same ID live and the same open segment in memory across matching results; validate live, raw trace, GraphQL, and hydration together.
- A future protocol update could accidentally route `summaryTextDelta` into content/state handling. Mitigation: explicit permanent no-effect dispatch, forbidden dependency rule, and before/during/after-state regression coverage.

## Guidance For Implementation

- Implement the target owner/API shape, not only a conditional-order swap in the old class.
- Construct one `RuntimeToolTraceSequencer` inside `RuntimeMemoryEventAccumulator`. Route all normalized call/terminal lifecycle events, interruption, and turn cleanup through its explicit methods; remove the accumulator's tool map and private tool helpers rather than forwarding to parallel state.
- Keep active/fallback turn ownership in the accumulator. Pass the current active turn into sequencer record methods and accept only their narrow `resolvedTurnId` outcome; do not let the sequencer own general turn lifecycle or fallback allocation.
- Keep `SegmentState` private beside the accumulator and `RuntimeToolState` private beside the sequencer. Delete the passive mixed state file with no compatibility export.
- Keep tracker input typed; raw field aliases belong to the normalizer.
- Generate normalized IDs only through the tracker allocator. Provider item/event/turn IDs are correlation inputs and must never be returned as reasoning block identity.
- Never reset the monotonic sequence on clear/eviction; only active entries may reuse an ID.
- Preserve each supported completed snapshot exactly once. Add only the explicit separator between different completed provider reasoning items in one active block; repeated completion of the same known item is a no-op.
- Do not reuse across missing/different turn IDs. A boundary lacking turn identity clears all active blocks conservatively.
- Apply ordered-card classification before card-creating emissions and terminal updates; do not clear merely because a raw event is tool-related.
- Mark known tool-card identity only when the converter emits a normalized event that can create that card.
- In memory, flush on first normalized observation, not first physical write. Keep `callObserved`, `callRawTraceId`, and `resultRawTraceId` distinct; matching deferred terminal preserves, result-first terminal flushes.
- Determine terminal card capability before creating state or checking argument readiness. Existing state with a known tool name remains card-capable when a terminal omits its name; a new identity requires a non-empty normalized name; missing arguments alone never make a card-capable event malformed.
- In `recordToolResult`, establish observation/flush for an unseen card-capable terminal before returning for absent args. An observed insufficient update preserves; a missing-identity/name no-card terminal does not observe or flush.
- Preserve argument absence versus explicit `{}`. Do not persist a call until identity, name, and explicit authoritative arguments are ready; always write call before result.
- Hydrate only physical lifecycle groups. A hydrated call marks observed; never reconstruct observation-only state or use historical result overlays as writer input.
- Accept loss of an unpersisted deferred observation on hard crash/interruption; add no observation trace, placeholder call, retry, or exact-replay promise for that case.
- Do not change run-history projection or add pre-fix history tests expecting repaired output.
- Treat `item/reasoning/summaryTextDelta` and reasoning text-delta notifications as intentionally and permanently unsupported no-effect inputs. Do not add handlers, fallbacks, flags, compatibility seams, or future-support TODOs; completed snapshots are the sole content source.
- Do not add frontend production grouping logic.
- Preserve tool lifecycle, memory ordering, status, token usage, and compaction behavior.
