# Agent Segment Lifecycle Contract

## Artifact Metadata

- Canonical path: `tickets/in-progress/agent-team-hierarchical-handoffs/agent-segment-lifecycle-contract.md`
- Purpose: close CR-F-042 / API-F-024 by assigning segment correlation to one `AgentRun`-owned lifecycle and making every downstream content event truthful and self-contained.
- Scope: AutoByteus, Codex App Server, and Claude Agent SDK source normalization; the common AgentRun event pipeline; standalone and Team stream projection; application-agent streaming; browser segment identity and mutation; lifecycle/error behavior; and durable/live validation.
- Status: `Refined — SR-020 architecture-review input for DR-007 / DR-008`.
- Related requirements: `R-043`, `R-053`–`R-056`.
- Related acceptance criteria: `AC-045`, `AC-046`, `AC-048`–`AC-051`.
- Approval applicability: `N/A — structural design supplement for already-approved live Agent response behavior; no new product capability or compatibility path`.
- Relationship to core artifacts: requirements own observable behavior; investigation notes own current-path evidence; `design-spec.md` owns system allocation and sequencing; this supplement owns exact segment source/canonical shapes, the bounded lifecycle state machine, per-consumer responsibilities, and test seams. `team-stream-execution-projection-contract.md` remains authoritative for Team correlation and consumes only the admitted canonical AgentRun segment events defined here.

## 1. Decision Summary

`AgentRun` is the sole authoritative segment-lifecycle owner because it is the first common, serialized boundary traversed by every provider and by every supported standalone, Team, application-stream, history, and browser consumer.

Each provider adapter emits truthful minimal source facts:

- `SEGMENT_START` establishes `{id, turn_id, segment_type, metadata?}`;
- `SEGMENT_CONTENT` carries `{id, turn_id, delta}` and never repeats type; and
- `SEGMENT_END` carries `{id, turn_id, terminal details...}` and never repeats type.

One run-owned `AgentSegmentLifecycleState`, invoked by `AgentSegmentLifecycleEventTransformer` inside the serialized AgentRun pipeline, validates ordering and identity and enriches accepted content with the type established by its start. Every listener therefore sees one canonical content shape `{id,turn_id,segment_type,delta}`. Team admission, application projection, history, standalone WebSocket mapping, and browser code remain stateless consumers; none correlates provider events or guesses a type.

This is not a compatibility adapter. Provider source shapes are normalized once, current internal consumers accept only the canonical output, and current browser contracts require the canonical content type. There is no dual reader, alias, `"text"` default, ID-pattern inference, or provider-specific Team branch.

## 2. Governing Ownership And Spines

### 2.1 Primary provider-to-consumer spine

```text
Provider native ordered events
  -> provider AgentRun converter/projector emits minimal source segment facts
  -> AgentRunEventDispatchQueue serializes one AgentRun
  -> AgentSegmentLifecycleEventTransformer + run-owned AgentSegmentLifecycleState
  -> canonical AgentRun segment event
  -> standalone / Team / application / history listeners
```

### 2.2 Team return/event spine

```text
canonical AgentRun segment event
  -> MixedAgentMemberHandle verifies AgentRun binding
  -> stateless TeamAgentEventAdapter maps exact correlated Team segment details
  -> TeamRunEvent publication barrier/broadcaster
  -> Team stream projector + strict serializer
  -> strict browser parser
  -> exact AgentContext segment transition
```

### 2.3 Standalone return/event spine

```text
canonical AgentRun segment event
  -> standalone Agent stream mapper
  -> Agent WebSocket egress
  -> strict browser segment payload admission
  -> exact AgentContext segment transition
```

### 2.4 Application stream spine

```text
canonical standalone AgentRun content OR correlated Team Agent content
  -> ApplicationAgentStreamEventProjector
  -> one pure text-delta projection using required canonical segment type
  -> application subscriber
```

### 2.5 Bounded lifecycle spine inside AgentRun

```text
ordered source event
  -> validate run/turn/segment identity and finite type
  -> apply start/content/end/turn-terminal transition
  -> emit canonical event OR one non-terminal diagnostic
  -> commit only that event's state transition
```

The dispatch queue owns ordering. The segment state owns lifecycle correlation. Provider adapters own external-to-source translation. Downstream adapters own representation only.

## 3. Canonical Vocabulary And Shapes

```ts
type AgentSegmentType =
  | "text"
  | "tool_call"
  | "write_file"
  | "edit_file"
  | "run_bash"
  | "reasoning"
  | "media";

type AgentSegmentIdentity = Readonly<{
  turnId: string;
  segmentId: string;
}>;

// Provider converters still enter through the established generic AgentRunEvent
// envelope. This union is the strict result after the lifecycle transformer
// validates that untrusted payload; it is not a second public event channel.
type AgentSegmentSourceEvent =
  | Readonly<{
      eventType: "SEGMENT_START";
      payload: {
        id: string;
        turn_id: string;
        segment_type: AgentSegmentType;
        metadata?: JsonValue;
      };
    }>
  | Readonly<{
      eventType: "SEGMENT_CONTENT";
      payload: { id: string; turn_id: string; delta: string };
    }>
  | Readonly<{
      eventType: "SEGMENT_END";
      payload: {
        id: string;
        turn_id: string;
        metadata?: JsonValue;
        interrupted?: boolean;
        reason?: string;
        failed?: boolean;
        error?: string;
      };
    }>;

type CanonicalAgentSegmentEvent =
  | Extract<AgentSegmentSourceEvent, { eventType: "SEGMENT_START" }>
  | Readonly<{
      eventType: "SEGMENT_CONTENT";
      payload: {
        id: string;
        turn_id: string;
        segment_type: AgentSegmentType;
        delta: string;
      };
    }>
  | Extract<AgentSegmentSourceEvent, { eventType: "SEGMENT_END" }>;
```

`AgentSegmentType` is a closed semantic vocabulary, not an arbitrary provider string. The server Agent-execution domain owns the internal type and constructors. `@autobyteus/team-stream-contracts` owns the process-boundary mirror as one exact `agentSegmentTypeSchema = z.enum(["text", "tool_call", "write_file", "edit_file", "run_bash", "reasoning", "media"])` plus its inferred DTO type; Team server and browser code import that wire type/schema rather than restating an open string. The standalone browser contract uses the same seven-value UI vocabulary at its existing transport boundary. An exhaustive server-domain-to-Team-wire projection and a package parity test make adding or removing a value a deliberate compile/test failure. This duplicates representation at a process boundary, not lifecycle authority: only the run-owned state establishes and correlates the type.

The actual types retain the established `AgentRunEvent` wrapper (`runId`, `statusHint`). Provider converters emit that generic envelope with the minimal fields above; they do not assert that external input is already trusted. The lifecycle transformer owns one strict structural parser plus the correlation state and produces the narrowed source/canonical variants. This preserves one admission authority while keeping unknown provider values observable as diagnostics rather than silently dropping or type-casting them.

Identity scope is exact `(AgentRun.runId, turn_id, id)`. The run is owned by the containing `AgentRun`; `AgentSegmentIdentity` therefore stores only `{turnId,segmentId}`. `segment_type` is a lifecycle invariant and projection fact, not part of identity. It must agree for the identity but is never used to choose between two candidates.

All segment events require a non-empty `turn_id`. A segment without a turn is malformed current input; a provider converter may reject it with a diagnostic but may not manufacture a turn from a segment ID. General `TURN_*` or status events may retain their existing nullable semantics where independently supported.

## 4. Authoritative State Machine

For each `AgentSegmentIdentity`, the run-owned state is one of `absent`, `active(type)`, or `ended(type)`. The state also records active/retired turn IDs so a late event cannot reopen a terminal turn.

### 4.1 Turn boundaries

- A successful `AgentRun.postUserMessage()` command result with a non-empty `turnId` opens that turn in both run-owned lifecycle states inside the existing dispatch queue. `TURN_STARTED(turnId)` opens or confirms the same exact turn. Repeating the same start is idempotent and does not clear active segments.
- Starting a different turn retires the previously active turn and clears its segment entries before opening the new turn. It does not synthesize `SEGMENT_END`.
- `TURN_COMPLETED(turnId)`, `TURN_INTERRUPTED(turnId)`, or a turn-terminal error retires that turn and clears every active/ended segment entry for it after all earlier events in the same queue order have been processed.
- A runtime-global terminal error, an admitted offline/terminated runtime fact, or accepted `AgentRun.terminate()` clears all segment state. At batch entry, reconciliation may confirm/open an identified active turn from the existing runtime lifecycle snapshot, but it never invents a segment start and never pre-clears an identified turn merely because the snapshot has already become idle/error while ordered terminal events are still in the batch. Explicit batch facts are applied in order; an offline/error snapshot cleanup, if still needed, occurs after those facts.
- An event for a retired turn is rejected. A later distinct turn may reuse the same provider segment ID because the turn is part of identity.

### 4.2 Segment start

- Require a currently active matching turn, a non-empty segment ID, and one finite `AgentSegmentType`. If the surrounding run lifecycle is active but anonymous and no segment turn is open, the first valid start opens the exact segment turn named by the event; the event itself supplies the fact, so no ID inference occurs. A start may not replace a different identified active turn.
- `absent -> active(type)`: store the type and emit canonical `SEGMENT_START`.
- Repeated start while `active` with the same type: classify as replay and drop it at the lifecycle owner. The first accepted start is authoritative for metadata; no downstream accumulator receives a second initialization signal.
- Repeated start after `ended` with the same type: treat as replay and drop it without reopening.
- Any repeated start with a different type is rejected and leaves state unchanged.

### 4.3 Segment content

- Source content must contain exactly a non-empty ID, exact turn ID, and string delta. It must not carry `segment_type`; a provider adapter that received a repeated provider type already normalized it away.
- `active(type)`: emit one canonical content event with the stored `type`; do not otherwise mutate lifecycle state.
- `absent`, `ended`, retired turn, wrong turn, or surplus/malformed source content: reject and leave state unchanged.
- Every accepted content arrival is one delta fact. Identical adjacent deltas are both emitted because the source contract has no event ID and repeated text can be legitimate. The system does not infer replay from byte equality.

### 4.4 Segment end

- Source end must identify the exact active segment and may carry terminal presentation facts; it must not carry `segment_type`.
- `active(type) -> ended(type)`: emit canonical `SEGMENT_END`.
- A repeated end in `ended` is an idempotent replay no-op and is dropped.
- An end in `absent`, a wrong/retired turn, or malformed/surplus end is rejected and leaves state unchanged.
- A turn may terminate with active segments. Turn termination owns cleanup and does not fabricate missing end events.

### 4.5 Failure result

An invalid source segment event is replaced by exactly one normal AgentRun `ERROR`. The transformer first validates whether the candidate itself contains a non-empty explicit `turn_id`; it never consults an ID pattern or invents a turn.

When a real candidate turn exists, the result is turn-attributed:

```ts
{
  eventType: "ERROR",
  payload: {
    code: "AGENT_SEGMENT_LIFECYCLE_INVALID",
    message: "<stable reason without raw provider payload>",
    error_scope: "turn",
    error_effect: "diagnostic",
    turn_id: "<exact candidate turn>"
  },
  statusHint: null
}
```

When `turn_id` is absent, empty, or otherwise unavailable, the result is identity-unattributable:

```ts
{
  eventType: "ERROR",
  payload: {
    code: "AGENT_SEGMENT_LIFECYCLE_INVALID",
    message: "<stable reason without raw provider payload>",
    error_scope: "runtime",
    error_effect: "diagnostic",
    turn_id: null
  },
  statusHint: null
}
```

`AgentRunErrorEvidence` gains `{kind:"RUNTIME_DIAGNOSTIC"}` for the second shape; the existing first shape remains `{kind:"TURN_DIAGNOSTIC",turnId}`. Both are fail-closed and observable but non-terminal: the invalid segment event is absent, segment state is unchanged, `AgentTurnLifecycleState.observeError` preserves status, `AgentRunCanonicalFailureObserver` and command/lifecycle/compaction/improver observers ignore the diagnostic as failure evidence, and the lifecycle finalizer emits the unchanged canonical status. Runtime terminal remains the distinct `{error_scope:"runtime",error_effect:"terminal",turn_id:null}` / `RUNTIME_GLOBAL` case.

Agent-bound standalone and Team error projection carry exact `{error_scope,error_effect,turn_id}` evidence fields; unrelated or unclassified errors project explicit nulls rather than borrowing an active turn. Browser handling may append the diagnostic error row for observability but does not terminalize an open segment/message, settle a tool, or alter Agent status. Provider payload dumps and secrets never enter the message.

## 5. Provider Normalization Responsibilities

Provider code may translate explicit provider event/item semantics to a finite canonical type. It may not make a type decision from a segment-ID pattern or default an unknown item to text.

### AutoByteus

- Preserve the native lifecycle: `SegmentEvent.start()` supplies type; `content()` and `end()` do not.
- `AutoByteusStreamEventConverter` emits minimal source facts. Its content test without `segment_type` remains authoritative and is extended through the common lifecycle pipeline.

### Codex App Server

- Recognized item-start kinds map explicitly to the finite type union; an absent/unknown item kind is rejected instead of falling through to text.
- Text item start precedes text content through the existing item lifecycle.
- `CodexReasoningBlockTracker` adds an explicit `start` action before the first content action for a new reasoning block; later content and the terminal action carry no type.
- Tool/file/command item starts establish their explicit types; their end events omit type.

### Claude Agent SDK

- `ClaudeTextSegmentProjector` emits one explicit text `ITEM_ADDED`/source start when it creates a text segment, before its first output delta. Subsequent delta/completion events omit type.
- The existing tool-use coordinator continues to emit explicit tool start, then minimal terminal facts.
- An unknown `segment_type` from a generic item event is rejected rather than forwarded as an open string.

These are provider-normalization changes only. No provider imports Team domain code, and Team code contains no runtime-kind switch.

## 6. Complete Post-Pipeline Consumer Contract

The lifecycle transformer is a canonicalization barrier, not merely a Team adapter prerequisite. Every processor and listener after that barrier consumes only canonical events. Stateful consumers may retain their own subject-specific projection state, but none may reconstruct segment lifecycle, choose a segment type, invent a turn, or accept provider aliases.

### 6.1 Canonical fan-out spine

```text
canonical AgentRun event
  -> default pipeline processors derive file/communication/token events
  -> lifecycle-status finalizer preserves or advances run status
  -> AgentRun listeners receive the same ordered canonical sequence
  -> memory/history, compaction, skill-improvement, external-channel,
     application, standalone/Team transport, and event-selective relays
  -> consumer-owned projection/output only
```

The one transformer therefore precedes both the default processors and listener dispatch. A downstream consumer cannot receive the minimal provider source shape.

### 6.2 Complete affected-consumer inventory

| Current boundary | Target responsibility | Removed competing behavior | Required proof |
| --- | --- | --- | --- |
| `FileChangeEventProcessor`, `FileChangeInvocationContextStore`, and file-change payload accessors | On the first admitted `write_file`/`edit_file` start, initialize one file-operation context containing exact run, turn, invocation/segment identity, source tool, target, arguments, and streamed content without replacing an existing context. A later matching `TOOL_EXECUTION_STARTED` may enrich tool/path/argument facts but preserves structural identity plus accumulated content/status. Canonical content finds that exact context and verifies its stored source tool before appending. Canonical end finds the same context and changes presentation status without reading end type. Tool terminal consumes it. Turn terminal clears matching-turn contexts; the pipeline run-release hook clears the run on accepted termination. | End-time `segment_type`/tool-name fallback; record overwrite on repeated active start or later tool start; ID-only context use without stored-turn agreement; leaked run contexts. | First start -> content -> matching tool start -> content -> end -> tool terminal preserves file deltas; same-type repeated active start is swallowed upstream and cannot reset content; wrong turn/ID is mutation-free; end has no type; turn/run cleanup works. |
| `RuntimeMemoryEventAccumulator` and `AgentRunMemoryRecorder` | Preserve the current transcript/history owner. Segment accumulation accepts exact canonical text/reasoning content, uses a private compound `{turnId,segmentId}` key, appends only to an admitted segment, flushes the exact segment on end and exact turn on terminal, and preserves existing tool-trace/assistant-complete ordering. | Segment-only `fallback-turn-*`, derived `turn:type` IDs, `assistant` alias, unknown/missing type -> text, ID-only map, and missing-start content synthesis. No separate run-history segment reader exists. | Canonical text/reasoning traces remain exact; tool traces remain ordered; missing turn/ID/type cannot create memory; same segment ID in later turn does not collide. |
| `CompactionRunOutputCollector` | Keep completion-output aggregation only. Accumulate exact canonical `text` content in a private compound-identity map; prefer exact `ASSISTANT_COMPLETE` when present; terminalize on the established turn/idle facts. Ignore segment end for text because canonical end carries no content/type. | Optional/aliased type normalization, missing type -> text, ID aliases, and end-payload final-text extraction. | Canonical deltas assemble once; reasoning/tool content is excluded; type-less/malformed content cannot contribute; diagnostics do not fail or finish compaction. |
| `ImproverRunCompletionWatcher` | Use the same narrow output rule as compaction: exact canonical text content, compound identity, existing `ASSISTANT_COMPLETE` priority, and established turn/idle completion. Ignore segment end for text. | ID/content aliases and terminal text recovered from end. | Canonical deltas assemble; non-text/end facts add nothing; diagnostic errors neither fail nor complete the watcher. |
| `ChannelOutputEventParser`, `ChannelRunOutputEligibilityPolicy`, and `ChannelRunOutputEventCollector` | For direct and Team paths, parse exact canonical text content into stream fragments, accumulate by the already selected delivery plus exact turn, and finalize that accumulated reply on `TURN_COMPLETED`. Segment end contributes no text. Project Team error evidence rather than dropping it. Return before pending-turn creation for either diagnostic variant; a runtime diagnostic with no turn is ineligible. | Provider/item traversal, turn/ID aliases for segment output, missing type -> text, segment-end final-text recovery, and diagnostic-created pending turns. | Direct and Team output match; text deltas deliver once; end adds no duplicate; turn/runtime diagnostics neither delete nor create a pending reply; turn-terminal error still clears its matching pending turn. |
| `ApplicationAgentStreamEventProjector` | Standalone and Team content call one pure exact-type text-delta projection. An `ERROR` projects application failure only when its exact evidence is terminal or remains unclassified under the established application failure rule; both diagnostic evidence variants project no application failure. | Generic `ERROR` -> application failure for a lifecycle diagnostic; any provider/type fallback or projector lifecycle state. | Direct/Team text parity, non-text rejection, both diagnostics ignored, and real terminal failure preserved. |
| `TeamAgentEventAdapter`, `TeamAgentEvent`, Team contract package, and Team WebSocket projector | Remain stateless. Start/content/end use exact canonical fields. Agent-bound `ERROR` carries one exact error-evidence value; the strict wire payload always includes required nullable `error_scope`, `error_effect`, and `turn_id`. Stream-level Team errors use the separate `agent_execution:null` arm and the same required nullable evidence fields. | Manual error-field loss, arbitrary segment type, nullable segment turn, and any provider-specific Team correlation. | Exhaustive domain -> strict DTO projection; runtime and turn diagnostics round-trip without status mutation; malformed/surplus wire input rejects. |
| Standalone `AgentRunEventMessageMapper`, stream models, and content coalescing | Project canonical segment/error DTOs exactly. `ERROR` uses the same required nullable evidence fields as Team. Content coalescing may join only adjacent content whose complete non-delta payload—including exact turn, segment ID, and type—matches. | Generic payload pass-through for AgentRun errors, optional canonical content type, and cross-identity coalescing. | Standalone wire equals Team Agent semantics; diagnostics retain evidence; different turn/segment/type never coalesce. |
| Browser strict parser, Team DTO adapter, `segmentHandler`, `agentStatusHandler`, and presentation state | Use exact `{turnId,segmentId}` segment identity. A diagnostic appends one visible error row but does not terminalize an open segment/message, settle a tool, mark the conversation complete, or alter Agent status. Terminal/unclassified errors preserve their established behavior. | Optional/error evidence loss, type/identity defaults, and treating all error rows as terminal. | Both diagnostic branches are visible and non-terminal; terminal error remains terminal; Team and standalone inputs produce the same state transition. |
| `AgentTurnLifecycleState`, `LifecycleStatusEventTransformer`, `AgentRunCanonicalFailureObserver`, command coordinator, and lifecycle observer | Recognize `TURN_DIAGNOSTIC` and `RUNTIME_DIAGNOSTIC` exhaustively as non-terminal. Lifecycle finalization emits the unchanged status after the diagnostic. Only `TURN_TERMINAL` and `RUNTIME_GLOBAL` drive failure/settlement. | Treating a runtime-scoped diagnostic as `RUNTIME_GLOBAL`, borrowing an active turn, or default terminal handling. | Before/after status equality, no command settlement, no compaction/skill failure, and unchanged terminal evidence behavior. |
| File-change relay, published-artifact relay, Team communication processor, token processors, and other event-selective listeners | Continue to react only to their owned exact event types. They do not parse segment payloads or error evidence and require no data-shape change. | Generic catch-all handling introduced to compensate for the segment cut. | Selection tests prove unrelated canonical segment/diagnostic events do not trigger them. |

### 6.3 File-change bounded local spine

```text
first canonical write/edit SEGMENT_START(turnId,segmentId,type)
  -> FileChangeEventProcessor validates exact file-mutation type and target
  -> FileChangeInvocationContextStore inserts run+turn+invocation context once
matching TOOL_EXECUTION_STARTED(invocationId)
  -> enrich missing tool/path/argument facts only
  -> preserve exact turn/segment identity, accumulated content, and status
canonical SEGMENT_CONTENT(turnId,segmentId,type,delta)
  -> exact context lookup + stored source-tool agreement
  -> append content -> derive streaming FILE_CHANGE
canonical SEGMENT_END(turnId,segmentId)
  -> exact context lookup; no type read
  -> derive pending FILE_CHANGE
canonical tool terminal OR turn/run terminal
  -> consume exact invocation OR clear matching turn/run context
```

This context is legitimate file-operation projection state: it owns target path, arguments, streamed file content, and file-change status. It does not own `absent/active/ended`, choose a segment type, or repair event order. `AgentRunEventPipeline` exposes one narrow processor run-release hook; `AgentRun.terminate()` invokes it inside the existing per-run queue only after termination is accepted. No global cleanup scan or second lifecycle service is introduced.

### 6.4 Team, standalone, application, and browser projection

- `TeamAgentEventAdapter` remains stateless and may still be instantiated per event. It receives only post-pipeline canonical AgentRun events.
- Team start/content/end details require non-empty `turnId`; start/content use the finite shared segment-type vocabulary; content retains required type because it is the authoritative AgentRun projection needed by late subscribers and application filtering.
- The Team strict DTO/schema replaces its open segment type with the exact exported finite schema, uses a non-null turn for segment variants, and retains required type on content. The Team adapter derives nothing and rejects a direct non-canonical bypass.
- The standalone mapper projects the same canonical fields. Browser `SegmentContentPayload.segment_type` is required.
- Standalone and Team application projectors call one pure `projectTextDelta({segmentType,delta})`; only exact `text` becomes a delta.
- Browser content appends to the exact existing segment. A late subscriber that missed start may create the exact segment from required canonical content type. End without local state is a no-op because it cannot reconstruct content.
- Remove `payload.segment_type ?? "text"`, unknown-to-text factory behavior, `lookupKey`, type-plus-ID identity strings, and ID-only segment mutation.

### 6.5 Exact diagnostic projection

`AgentRunErrorEvidence` is the only semantic parser for Agent-bound error scope/effect/turn. Projectors translate its four variants exhaustively and emit required nullable wire fields:

```ts
type AgentErrorWireEvidence = Readonly<{
  error_scope: "turn" | "runtime" | null;
  error_effect: "diagnostic" | "terminal" | null;
  turn_id: string | null;
}>;
```

An unclassified existing error emits three nulls; it is not silently reclassified. Both diagnostic variants remain observable but non-terminal through Team, standalone, browser, external channel, application stream, command/lifecycle, compaction, and skill-improvement consumers.

## 7. Ordering, Replay, And Cleanup Guarantees

- `AgentRunEventDispatchQueue` serializes every source batch and command-produced event for one AgentRun. The lifecycle transformer processes events in array order; it does not reorder or buffer.
- The transformer is the first default-pipeline transformer, before token enrichment, processors, lifecycle-status finalization, and listener dispatch. The cached pipeline remains stateless; `AgentRun` passes its own `AgentSegmentLifecycleState` through the transformer input, just as it passes its run-owned turn lifecycle state.
- State commits per accepted event. A later invalid event in the same batch does not roll back earlier valid emitted facts.
- Browser reconnect/subscription does not create a second server lifecycle state. The live AgentRun keeps its state while subscribers change, and enriched content is sufficient for a late subscriber to create the correct typed segment.
- Start and end replay behavior is defined in section 4. Same-type active start is dropped before processors/listeners; content is never byte-deduplicated.
- Turn terminal, interruption, runtime-global terminal error, offline termination, and accepted AgentRun termination clear segment state plus the matching file-operation projection context through the pipeline-owned lifecycle hooks. Listener unsubscribe alone clears neither owner.
- No state is persisted. Historical transcript data is projected from admitted canonical events; restore does not resume a live partial segment.

## 8. File And Responsibility Mapping

### Add

- `autobyteus-server-ts/src/agent-execution/domain/agent-segment.ts` — finite type, exact identity, source/canonical segment narrowing, and safe constructors.
- `autobyteus-server-ts/src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.ts` — run-owned bounded state machine.
- `autobyteus-server-ts/src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.ts` — strict source admission, canonical enrichment, and diagnostic construction.

### Modify

- `agent-run-error-evidence.ts`, `agent-turn-lifecycle-state.ts`, `lifecycle-status-event-transformer.ts`, `agent-run-canonical-failure-observer.ts`, `agent-run-command-coordinator.ts`, and `agent-run-service.ts` — add/exhaustively preserve non-terminal `RUNTIME_DIAGNOSTIC`; keep terminal evidence behavior unchanged.
- `agent-run.ts`, processor/transformer/pipeline/dispatch contracts, and `default-agent-run-event-pipeline.ts` — construct/pass the run-owned state, synchronize successful command acceptance/termination through the existing queue, invoke segment lifecycle as the first transformer, and expose one narrow processor run-release hook for accepted termination.
- AutoByteus/Codex/Claude converters/projectors/trackers named in section 5 — emit only the minimal source contract and explicit starts.
- `file-change-event-processor.ts`, `file-change-invocation-context-store.ts`, and `file-change-event-payload-accessors.ts` — use first-start exact run/turn/invocation context, a matching tool-start enrichment that preserves identity/content/status, end without type, insert/merge/consume/turn-clear/run-clear operations, and no repeated-start overwrite.
- `runtime-memory-event-accumulator.ts` and `agent-run-memory-recorder.ts` — consume exact canonical text/reasoning identities and remove segment fallbacks while preserving tool/history sequencing.
- `compaction-run-output-collector.ts` and `improver-run-completion-watcher.ts` — aggregate exact text content only, ignore end text/type, and ignore diagnostics as failure evidence.
- `channel-output-event-parser.ts`, `channel-run-output-eligibility.ts`, and `channel-run-output-event-collector.ts` — use exact canonical content, no end text, carry Team error evidence, and ignore diagnostics before pending-turn mutation.
- `team-agent-event.ts`, `team-agent-event-adapter.ts`, `team-agent-message-dtos.ts`, and `team-agent-event-websocket-projector.ts` — consume finite turn-scoped segments and carry exact nullable error evidence without local state.
- `agent-run-event-message-mapper.ts`, streaming models, and `stream-content-coalescing.ts` — emit exact standalone segment/error DTOs and coalesce only identical exact identity/type.
- `application-agent-stream-event-projector.ts` — share one pure typed content projection and suppress both diagnostic variants from application failure projection.
- browser `messageTypes.ts`, strict parser, `teamStreamDtoAdapters.ts`, `segmentIdentity.ts`, `segmentHandler.ts`, `toolLifecycleHandler.ts`, `segmentTypes.ts`, and `agentStatusHandler.ts` — exact compound identity, strict diagnostic fields, typed late subscription, and non-terminal diagnostic presentation.

### Remove

- per-content `segment_type` emission from Codex/Claude provider source content/end events;
- any unknown-provider-item-to-text default;
- browser optional content type, `?? "text"`, unknown-type text fallback, `lookupKey`, type-plus-ID identity string, and ID-only segment deletion/lookup;
- file-change end-type/tool-name lookup and repeated-start context overwrite;
- memory `fallback-turn-*`, derived segment ID, type alias/default, ID-only segment map, and missing-start segment synthesis;
- compaction/improver/external-channel segment ID/type/text aliases, missing-type-as-text behavior, and end-payload text recovery;
- Team/standalone error evidence loss and browser all-errors-are-terminal handling;
- Team/provider/browser tests that fabricate type on source content or bypass the common lifecycle while claiming provider-boundary coverage.

## 9. Verification Seams

1. **State-machine unit:** interleaved text/tool/reasoning/media segments; exact type enrichment; same-type active start dropped; conflicting start; missing start; content after end; repeated end; required turn; command-accepted identified turn; anonymous-to-exact first start; retired turn; next-turn ID reuse; interruption; turn diagnostic, runtime diagnostic, terminal/global error; runtime termination; ordered same-batch final content before terminal cleanup; and two identical accepted deltas.
2. **AutoByteus actual boundary:** native `start(type) -> content(no type) -> end(no type)` through converter, AgentRun queue/pipeline, Team adapter, strict Team serialization/parsing, and browser transition. Do not inject content type in the fixture.
3. **Codex/Claude normalization:** real normalized text/reasoning/tool source sequences prove one explicit start and minimal content/end before the shared transformer; unknown types fail without text default.
4. **Standalone wire:** the same admitted canonical sequence reaches standalone browser state; missing/unknown/surplus content fields reject before mutation.
5. **File change:** first canonical write start/content, matching tool-start enrichment, further content, and end with no end type preserve every streamed byte and exact structural identity; repeated active start cannot reset it; wrong turn/ID cannot mutate it; tool terminal, turn terminal, and accepted run termination release the exact projection context.
6. **Memory/history:** exact text/reasoning segment identity, later-turn segment-ID reuse, turn flush, and tool-trace ordering work without any segment fallback or missing-start synthesis.
7. **Compaction and skill improvement:** exact content plus `ASSISTANT_COMPLETE` priority produces final output; end has no text/type role; non-text and both diagnostic variants produce no output/failure transition.
8. **External channel:** direct and Team exact text deltas assemble identically and finalize on turn completion; end does not duplicate; both diagnostics are mutation-free while exact terminal error still removes the matching pending turn.
9. **Application:** standalone and Team text content produce identical application deltas, while non-text and both diagnostics produce none; real terminal/unclassified failure behavior remains; no projector state is constructed.
10. **Team/standalone diagnostic wire:** both diagnostic branches round-trip with exact required nullable evidence fields; browser adds a visible row without closing an open message/segment/tool or changing status; malformed/surplus fields reject.
11. **Late subscriber:** canonical typed content with no local browser start creates the exact typed segment; missing type is rejected and does not synthesize text.
12. **Replay/cleanup:** duplicate start/end, repeated identical content, turn completion/interruption, runtime termination, and late post-terminal events match section 4 exactly.
13. **Schema/source hygiene:** package tests prove the Team segment schema is the exact finite vocabulary, rejects an eighth/unknown value, requires non-null segment turns, and stays exhaustively mapped from the server domain; no source content/end producer repeats type; no listed consumer keeps an alias/default/end-text path; no lifecycle map exists outside AgentRun; and no current durable test fabricates the removed source shape.
14. **Live regression:** resume the imported three-runtime matrix only after source review; AutoByteus must clear API-F-024 and all three Team/standalone rows must render ordinary text/tool segment lifecycles without protocol-error cards.
15. **API-owned cleanup prerequisite:** before any new live run, `api_e2e_engineer` removes only its owned nested disposable journal residue, corrects API-REV-035 cleanup evidence, and repeats the protected-target audit required by CR-F-043. Solution/implementation reviewers do not inspect or delete operational data.

## 10. Forbidden Shortcuts

- Store segment lifecycle in `TeamAgentEventAdapter`, TeamRun, WebSocket sessions, application projectors, or browser transport state.
- Add a provider-specific Team branch.
- Put type back on every provider content event merely to satisfy the Team DTO.
- Guess `"text"`, infer type/turn from an ID, accept an arbitrary type string, or search multiple identity shapes.
- Allow source and canonical content shapes as dual current inputs.
- Relax Team/browser validation or make canonical content type optional.
- Reorder source events or buffer content waiting for a missing start.
- Deduplicate content by ID/delta equality.
- Restore type or terminal text to canonical end for a downstream convenience.
- Let a consumer parse provider/item aliases, manufacture a segment turn/ID/type, or create a missing-start segment after the canonical barrier.
- Treat `RUNTIME_DIAGNOSTIC` as `RUNTIME_GLOBAL`, borrow the active turn for an unattributable candidate, or terminalize browser/application/external/command state for either diagnostic.
- Read `AgentSegmentLifecycleState` from file change, memory, compaction, skill, external, Team, application, or browser code.
- Persist partial segment lifecycle state or replay historical canonical content through the source-admission pipeline.
- Keep a test that fabricates per-content provider type and label it an actual provider boundary.

## 11. Change Sequence

1. Add the finite segment domain, run-owned state, and transformer with state-machine tests.
2. Thread state through the existing AgentRun serialized pipeline and cleanup paths; prove all listeners see canonical output.
3. Cut all three provider normalizers to explicit-start/minimal-content/minimal-end, including Claude text and Codex reasoning start production and unknown-type rejection.
4. Cut default processors first: make file-change segment initialization exact/non-replacing, make matching tool-start enrichment preserve content/status/identity, remove end type, add turn/run cleanup, and prove unrelated processors remain event-selective.
5. Cut every AgentRun listener in one consumer slice: memory/history, compaction, skill improvement, external channel, application, standalone/Team egress, and coalescing. Remove aliases/defaults/end-text recovery rather than keeping a mixed input period.
6. Add `RUNTIME_DIAGNOSTIC` to the one error-evidence authority, then update lifecycle/failure/command observers and exact Team/standalone/application/external/browser projection atomically.
7. Cut browser DTOs and segment/error mutation atomically; preserve exact typed late-subscription behavior and remove every default/key fallback.
8. Replace the fabricated Team admission seam with actual native/provider -> AgentRun -> processors/listeners -> Team/standalone/wire/browser/application coverage.
9. Run focused/full source review. Only after Pass may API/E2E correct CR-F-043 cleanup evidence and resume the required three-runtime live matrix.

No compatibility period, dual source shape, or fallback reader is designed.

## 12. Guidance For Implementation

Implement the bounded state machine at the common AgentRun owner first, then treat the pipeline as an atomic source-to-canonical cut: no processor or listener may remain on a source/fallback interpretation. Provider adapters should become simpler, not stateful copies of Team requirements. Downstream state is allowed only when it owns a different subject—file operation, transcript, reply aggregation, or browser presentation—and it must use exact canonical identity. If a supported provider path cannot produce an explicit start, correct that provider's existing normalization owner to emit the start from explicit semantic knowledge before content; never compensate in Team, application, browser, history, or output collectors.
