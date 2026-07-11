# Design Spec

## Architecture Review Reset

Architecture review round 4 passed a terminal-only combined-`tool_call` design. The user subsequently reopened the requirement, clarified that native AutoByteus already owns complete model-issued arguments before execution, and approved provider-specific timing under one split call/result semantic contract. Round-4 implementation authorization is therefore superseded and has been explicitly suspended.

The worktree’s current source/test modifications implement superseded update and terminal-only designs. They remain preserved for provenance. This design uses bootstrap commit `3effb76ab56d4d1bb876ad0623a8e5eb7093a584` as the clean current-state code basis and treats adaptation/removal of paused changes as first-class implementation work.

### Prior finding reconciliation

| Finding | Revised resolution |
| --- | --- |
| DR-001 — latest persisted call state versus historical read overlay | A neutral physical lifecycle index exposes the actual call row and actual result row separately. Writers use only physical call/result presence and call-side fields. Historical result-side argument overlay exists only in `buildToolInteractions(...)`. |
| DR-002 — active compaction versus complete-corpus context | `CompactionWindowPlanner` receives active records as the sole block/eligibility/pruning scope and a complete-corpus call-context index only for identity/name/argument enrichment. Archive-only raw IDs cannot enter active removal sets. |
| DR-003 — compound identity and reconstructed accumulator state | Physical lifecycle groups are keyed by `(turn_id, tool_call_id)` and hydrated from active plus complete archives through `RunMemoryWriter`. Live provider-observation state may be ephemeral, but call-written/result-written state is durable. |
| DR-004 — missing tool-call ID | Native batches reject before mutation. Asynchronous server events skip/log. Anonymous persisted IDs and queues are removed. |
| DR-005 — Codex provider-late root cause | Full frame capture, parser/converter execution, follow-up grace capture, and installed schema confirm web-search start placeholders, terminal action availability, and no separate client-visible result body. The converter expresses argument absence; the accumulator defers only that call. |

## Current-State Read

### Native AutoByteus

`LlmPhase` receives complete `ToolInvocation` objects and calls `MemoryManager.ingestAssistantToolResponse(...)` before `ToolPhase` executes anything. `buildToolIntentTraces(...)` already appends a `tool_call` containing model-issued name/arguments and projects the assistant tool-call message into Working Context.

Later, `buildToolResultTraces(...)` creates a separate `tool_result` but repeats `event.toolName` and `event.toolArgs`. This is the primary native data waste. Result events may be ingested individually and later as an ordered batch; current duplicate suppression rescans active result rows.

Tool preparation can replace invocation arguments for execution. That explains the one observed historical `edit_image` difference, but the user selected model-issued invocation arguments as raw call semantics. Native preparation is no longer a reason to delay or rewrite the raw call.

Native compaction already has the correct high-level timing: after a tool-producing LLM response, compaction can be requested but is executed immediately only when no tool invocation exists. The Working Context unit builder groups one assistant call batch plus matching results and the planner protects the trailing group. These are existing owners to preserve and cover, not replace.

### Codex App Server

Codex provider payloads are normalized by the Codex item parser/converter before the server memory recorder observes them. Ordinary command, file-change, MCP, and dynamic calls commonly expose useful arguments at approval/start. Hosted `webSearch` starts instead carry `query:""` and `action:{type:"other"}`; completion exposes search/open-page/find-in-page action data.

Complete-frame probes and the installed App Server schema found no separate structured search-result body. AutoByteus currently synthesizes a small completion object from status/action metadata. Codex owns the hosted search and semantic model-context compaction internally; AutoByteus is an observer of the exposed lifecycle.

The current converter emits `arguments:{}` for the placeholder start. The shared accumulator consequently persists an empty call, then terminal handling repeats enriched arguments on the result. The converter boundary is the only owner that can truthfully distinguish placeholder absence from explicit no-argument input.

### Claude Agent SDK

`ClaudeSessionToolUseCoordinator` observes and retains the SDK `tool_use`/permission input before emitting `TOOL_EXECUTION_STARTED`. Its start event therefore has authoritative name/arguments. Terminal events repeat that observed input, and the shared accumulator repeats it again in raw storage. Claude fits early call plus minimal result without provider-specific delay.

### Shared server persistence

`AgentRunMemoryRecorder` serializes run events through a per-run promise queue and creates `RuntimeMemoryEventAccumulator`. The accumulator currently:

- keys state by call ID alone;
- defaults missing arguments to `{}`;
- writes call metadata at approval/start;
- writes name/arguments again on result;
- invents anonymous IDs when identity is absent; and
- ignores interruption events.

`RunMemoryWriter` is a thin store/snapshot facade, but its all-optional trace DTO permits invalid call/result combinations. Recorder detachment deletes accumulator state. `RunMemoryFileStore` already owns active plus complete-archive reading, raw-ID deduplication, and provider-boundary rotation.

### Shared readers and compaction

Core `buildToolInteractions(...)` is the natural logical interaction owner, but it keys by bare call ID and does not apply the historical terminal-side argument overlay that server replay currently implements locally. Server replay/work trace, native safety/recovery, recent-turn formatting, and raw compaction contain additional split-row assumptions.

Provider boundary rotation can archive an early call before its result is appended. The corpus scan found 228 initial cross-file pairs. Future minimal results therefore cannot be interpreted from active rows alone, but archive context must not make archive IDs eligible for active pruning.

## Intended Change

Keep the existing raw event subjects and contract their ownership:

- `tool_call` owns invocation identity, name, and authoritative arguments;
- `tool_result` owns correlated terminal result/error only;
- provider boundaries decide when arguments are available;
- lifecycle owners decide whether call/result have already been written;
- the persistence facade writes already-decided records;
- the physical store owns active/archive access;
- the logical interaction builder owns historical read overlay and one-activity projection.

New native and Claude calls remain early. Ordinary Codex calls remain early when arguments are explicit. Codex hosted web-search calls are deferred until terminal action availability, then the call is appended immediately before its minimal result. No call update, combined terminal call, new persisted name, or migration is introduced.

## Supplemental Solution Artifacts

| Artifact | Scope | Status | Relationship |
| --- | --- | --- | --- |
| `tool-trace-contract.md` | Exact shapes, argument presence, runtime matrix, state machine, crash/reconstruction, compaction, read precedence | Revised; user-approved basis | Normative clarification of this design and requirements |
| `codex-search-web-lifecycle-probe.md` | Direct App Server frames, actual parser/converter output, schema/result-body audit, historical classification | Complete evidence; conclusion user-approved | Evidence for Codex boundary decisions |

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior Change / Cleanup / Refactor.
- Design issue: Yes.
- Root cause classification: `Boundary Or Ownership Issue` plus `Shared Structure Looseness`.
- Refactor needed now: Yes, bounded and clean-cut.
- Why: Result construction accepts invocation fields it does not own. Provider argument availability is collapsed into `{}`, while several consumers duplicate correlation policy. The superseded terminal-only response moved authority to the wrong boundary and weakened native durability.
- Design response: Tighten trace-specific write shapes, preserve provider-normalized argument presence, add one neutral physical lifecycle index, centralize logical read overlay, and keep compaction’s active and corpus scopes explicit.
- Deferred refactor: None required for the in-scope behavior. Provider-specific opaque result payload cleanup is intentionally outside scope and named as residual duplication risk.

## Terminology

- **Authoritative arguments**: the explicit invocation argument object exposed by the owning runtime boundary; property absence means not available.
- **Early call**: a call written before execution/terminal because authoritative arguments are already visible.
- **Deferred call**: a call withheld because authoritative arguments are absent, then written when a later event supplies them.
- **Minimal result**: a raw result whose tool-specific fields are only call ID, result, and error.
- **Physical lifecycle group**: actual call/result rows grouped by compound identity without semantic argument overlay.
- **Call context index**: call-side identity/name/arguments derived from physical lifecycle groups for read enrichment.
- **Read-effective overlay**: historical-only rule allowing result-side name/arguments to complete a logical interaction.
- **Active scope**: records whose IDs may participate in current compaction eligibility/pruning.
- **Complete-corpus context scope**: active plus complete archive records used only to resolve meaning and durable lifecycle state.

## Design Reading Order

1. Follow the provider/native write spines to see when call readiness is established.
2. Follow the terminal return spines to see how minimal results are appended.
3. Inspect physical lifecycle grouping and reconstruction.
4. Inspect logical read overlay and the two compaction scopes.
5. Derive files, dependencies, removals, and sequence from those owners.

## Legacy Removal Policy (Mandatory)

This is a clean-cut future-write change:

- current writers stop putting name/arguments on result rows;
- terminal-only combined calls are not retained behind a flag;
- `tool_call_update` is not retained;
- Codex placeholder `{}` is not retained as an authoritative call;
- no dual write, version branch, compatibility wrapper, or migration path is added;
- historical extra fields remain readable through ordinary permissive projection, not current-writer compatibility logic.

Zero combined terminal `tool_call` records were found in the live corpus during redesign, so no persisted prototype shape requires support.

## Persisted Data / State Transition Decision

Decision: `Directly Usable — No Migration`.

| Evidence | Consequence |
| --- | --- |
| Historical JSON rows are permissive supersets | Result-side name/args can remain physically present and ignored/overlaid by normal reads |
| Every scanned logical result matched a compound call | New minimal results can rely on call correlation |
| Historical Codex/native exceptions contain useful late/effective evidence | Preserve them in read overlay; do not delete/rewrite |
| ~2.72 GB physical corpus and ~243.4 MB duplicate bytes | Bulk cleanup adds high I/O/recovery risk without correctness benefit |
| Zero combined terminal calls found | No prototype-schema read branch needed |

No migration owner, ledger, startup gate, backup workflow, Memory Sync change, or maintenance rewrite is designed.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | Native model tool invocation | Raw call + Working Context call | `MemoryManager` | preserves native issued intent before execution |
| DS-002 | Return/event | Native terminal/interrupt result | Minimal raw result + Working Context result | `MemoryManager` | removes duplicate metadata and closes protocol |
| DS-003 | Primary end-to-end | Claude/Codex ready start/approval | Raw call + Working Context call | `RuntimeMemoryEventAccumulator` | persists early provider calls when arguments exist |
| DS-004 | Primary end-to-end | Provider deferred observation | Call then minimal result at terminal | `RuntimeMemoryEventAccumulator` | handles Codex hosted search without placeholder/update |
| DS-005 | Return/event | Provider terminal/interruption | Minimal raw result + Working Context result | `RuntimeMemoryEventAccumulator` | owns outcome, dedupe, denial, interruption |
| DS-006 | Bounded local | Recorder event callback | Serialized accumulator mutation | `AgentRunMemoryRecorder` | prevents concurrent state races |
| DS-007 | Primary read | Active/archive raw rows | One logical tool interaction | core memory read subsystem | one projection for new/historical data |
| DS-008 | Bounded local | Native compaction request | Safe pre-next-LLM compaction | native compaction owners | unresolved tool batch is a protocol barrier |
| DS-009 | Bounded local | Active raw rows + corpus call context | Active-only compaction plan/digests | `CompactionWindowPlanner` | handles cross-file minimal results without pruning archives |
| DS-010 | Primary construction | Recorder/manager reconstruction | Hydrated physical lifecycle state | writer/manager composition owners | durable call/result dedupe across detach/crash |

## Primary Execution Spine(s)

### DS-001 — native early call

```text
LLM provider response
  -> LlmPhase parses ToolInvocation batch
  -> MemoryManager.ingestAssistantToolResponse
  -> strict tool-call trace builder
  -> MemoryStore appends tool_call
  -> WorkingContextSnapshot appends assistant tool-call message
  -> ToolPhase may begin execution
```

`MemoryManager` owns validation and sequencing. `ToolPhase` never writes memory and does not report prepared arguments for persistence.

### DS-003 — server early call

```text
Claude/Codex provider payload
  -> provider converter emits normalized explicit arguments
  -> AgentRun publishes AgentRunEvent
  -> AgentRunMemoryRecorder queue
  -> RuntimeMemoryEventAccumulator validates compound identity/readiness
  -> RunMemoryWriter appends tool_call + snapshot call
  -> RunMemoryFileStore / Working Context snapshot
```

Provider conversion owns semantic presence. The accumulator never reparses provider-native fields.

### DS-004 — server deferred call then result

```text
Codex item/started(webSearch placeholder)
  -> converter emits TOOL_EXECUTION_STARTED without arguments
  -> recorder queue -> accumulator retains observed identity/name only
  -> no raw/WC call

Codex item/completed(webSearch final action)
  -> converter emits terminal event with explicit arguments + outcome
  -> recorder queue -> accumulator writes tool_call + WC call
  -> accumulator writes minimal tool_result + WC result
  -> writer/store preserve that order
```

A crash between terminal call and result leaves an honest pending call. Result-first ordering is forbidden.

### DS-007 — logical read

```text
RunMemoryFileStore active + complete archives
  -> physical raw-ID dedupe/order
  -> buildToolTraceLifecycleIndex(compound identity)
  -> buildToolInteractions(call facts + historical read overlay)
  -> recovery / compaction / replay / work-trace projection
  -> one visible tool activity
```

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Native already has the complete model-issued subject; preserving this spine gives durable crash evidence and avoids artificial pending aggregation. |
| DS-002 | Terminal native outcome is a second event with a smaller subject. Correlation, not copied metadata, joins it to the call. |
| DS-003 | Provider calls are early only when the provider adapter explicitly says arguments exist. |
| DS-004 | A truly late provider call is delayed without adding an update or changing every runtime. |
| DS-005 | Denial/failure/interruption are terminal outcomes owned by the same accumulator state machine. |
| DS-006 | One serialized queue is the concurrency boundary; writer and accumulator require no locks. |
| DS-007 | Physical grouping stays neutral; historical semantic overlay stays read-only. |
| DS-008 | Model-context compaction waits for a protocol-safe boundary, not raw storage completion alone. |
| DS-009 | Corpus context supplies meaning only; active rows retain removal authority. |
| DS-010 | Durable physical rows restore lifecycle flags after accumulator destruction without persisting another state schema. |

## Spine Actors / Main-Line Nodes

| Node | Role | Concrete ownership |
| --- | --- | --- |
| `LlmPhase` | native initiating surface | parse response, register batch, request/defer compaction |
| `MemoryManager` | native memory lifecycle owner | call/result validation, physical lifecycle state, raw/WC sequencing, dedupe |
| provider converter/coordinator | provider adaptation owner | native payload extraction and argument-presence truth |
| `AgentRunMemoryRecorder` | server event serialization/composition | queue, attach/detach, accumulator construction |
| `RuntimeMemoryEventAccumulator` | server tool-memory lifecycle owner | readiness, compound state, call/result ordering, terminal policy |
| `RunMemoryWriter` | thin persistence facade | map strict write input to store and snapshot; expose lifecycle query |
| `RunMemoryFileStore` | physical storage owner | active/archive corpus, raw-ID dedupe, append, rotation, pruning |
| physical lifecycle index | neutral grouping owner | actual call/result rows by compound identity |
| `buildToolInteractions` | logical read owner | read-effective name/args/outcome/status/provenance |
| Working Context compaction owners | native model-context owner | protocol units, protected suffix, compactable prefix |
| raw compaction planner | active evidence compaction owner | active blocks/frontier/removal IDs plus context-enriched digests |

## Ownership Map

| Concern | Owner | Explicit non-responsibility |
| --- | --- | --- |
| Native model-issued args | `MemoryManager` via `ToolInvocation` | does not adopt prepared execution args |
| Codex placeholder versus explicit args | Codex converter | does not persist or dedupe |
| Claude observed input | Claude coordinator/converter | does not write raw storage |
| Server call readiness/terminal sequencing | accumulator | does not inspect Codex/Claude native envelopes |
| Physical append/snapshot | writer/store | does not decide readiness or historical overlay |
| Durable call/result grouping | physical lifecycle index | does not compute effective args/status |
| Historical effective args | logical interaction builder | never feeds current writers |
| Native semantic compaction | Working Context planner/executor | does not depend on Codex provider context |
| Provider semantic compaction | Codex/Claude provider | AutoByteus only records boundary/rotates evidence |
| Active raw pruning | compaction planner/store | archive context cannot add removable IDs |

## Thin Entry Facades / Public Wrappers

- `AgentRunMemoryRecorder` is a serialized composition facade; the accumulator owns tool policy.
- `RunMemoryWriter` is a persistence facade; `RunMemoryFileStore` owns physical corpus behavior.
- `MemoryManager` is not a thin wrapper: it is the authoritative native lifecycle owner.
- `buildHistoricalReplayEvents(...)` is a presentation transformer; it consumes core interaction facts rather than owning correlation policy.

## Removal / Decommission Plan (Mandatory)

| Remove/decommission | Replacement |
| --- | --- |
| Result-side `toolName` / `toolArgs` construction in native builder | strict minimal result builder |
| Server result write input carrying name/args | discriminated `tool_result` variant |
| Codex web-search placeholder `arguments:{}` | absent `arguments` at start; terminal explicit args |
| Accumulator `Map<toolCallId,...>` | compound-keyed runtime state hydrated from physical groups |
| Anonymous persisted tool ID counter/queue | validate and skip/log missing identity |
| Active-only result dedupe scans | maintained lifecycle index initialized from complete corpus |
| Server-local replay correlation policy | core physical groups + logical interactions |
| Result digest dependence on result-side tool name | call-context lookup |
| Terminal-only combined call serializer/predicate/tests | restored split call/result contract |
| Native pending/effective argument maps and ToolPhase persistence callback from paused implementation | early call semantics; no effective-arg persistence |
| `historical-tool-trace-read.ts` prototype | authoritative lifecycle/interaction owners |
| `tool-trace-correlation.ts` prototype | concrete physical lifecycle index |

Historical result-side fields are not removed from files and require no compatibility wrapper.

## Return Or Event Spine(s)

### DS-002 — native result return

```text
ToolPhase execution/denial/failure
  -> ToolResultEvent
  -> result processor / continuation sequencing
  -> MemoryManager.ingestToolResults
  -> strict minimal result builder
  -> MemoryStore append
  -> Working Context ToolResultPayload
```

Whole-batch identity validation occurs before mutation. Event name/args may be used for live protocol validation but are not persisted on the result.

### DS-005 — provider terminal return

```text
provider terminal payload
  -> provider converter/coordinator
  -> TOOL_EXECUTION_SUCCEEDED/FAILED/DENIED/INTERRUPTED
  -> recorder queue
  -> accumulator resolve physical/live state
  -> ensure call exists (write only if self-contained)
  -> append minimal result + Working Context result
```

### Controlled turn interruption

```text
native/server turn interruption
  -> lifecycle owner enumerates call-written/result-missing identities in that turn
  -> append minimal interruption result per persisted call
  -> mark complete
  -> protocol safety / operation boundary
```

Deferred observations without authoritative arguments cannot be turned into fabricated calls.

## Bounded Local / Internal Spines

### Server accumulator state machine

Parent: `RuntimeMemoryEventAccumulator`.

```text
normalize identity -> load/create compound state
  -> merge non-empty name
  -> preserve argument absence versus explicit object
  -> write call when ready and not written
  -> on terminal ensure call or reject insufficient state
  -> write minimal result when not written
  -> update state / suppress duplicates
```

State mutation occurs only on the recorder queue.

### Recorder queue

Parent: `AgentRunMemoryRecorder`.

```text
event callback -> state.queue.then(recordRunEvent) -> drain -> detach/delete
```

Construction asks `RunMemoryWriter` for physical lifecycle groups. The recorder never accesses the writer’s private store.

### Physical lifecycle grouping

Parent: core memory read subsystem.

```text
ordered tool_call/tool_result rows
  -> validate compound identity
  -> first physical call anchor
  -> first physical result terminal
  -> ToolTraceLifecycleGroup
```

No result-side args are applied at this layer.

### Logical interaction projection

Parent: core memory read subsystem.

```text
physical group / active records + optional corpus call context
  -> call-side name/args
  -> historical result-side overlay for reads only
  -> terminal outcome/status/provenance
  -> one ToolInteraction
```

### Native Working Context compaction

Parent: existing native compaction subsystem.

```text
LLM response may request compaction
  -> tool batch opens protocol group
  -> request stays pending while group incomplete
  -> every result/interruption closes expected IDs
  -> protocol-safe projection
  -> execute pending compaction before next LLM
```

### Active raw compaction

Parent: `CompactionWindowPlanner`.

```text
complete corpus -> physical call-context index (no removal IDs)
active records -> InteractionBlockBuilder(active, context)
  -> active structural frontier/eligibility
  -> ToolResultDigestBuilder(result, call context)
  -> eligible active trace IDs only
```

## Core Data And State Contracts

### Neutral identity

Retain/add `memory/models/tool-call-identity.ts`:

```ts
type ToolCallIdentity = Readonly<{
  turnId: string;
  toolCallId: string;
}>;

createToolCallIdentity(turnId, toolCallId): ToolCallIdentity | null;
toolCallIdentityKey(identity): string;
```

It contains no name, arguments, outcome, or historical overlay.

### Strict current-write variants

Core/server current writers use discriminated shapes equivalent to:

```ts
type ToolCallTraceInput = TraceEnvelopeInput & {
  traceType: 'tool_call';
  toolCallId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
};

type ToolResultTraceInput = TraceEnvelopeInput & {
  traceType: 'tool_result';
  toolCallId: string;
  toolResult: unknown;
  toolError: string | null;
};
```

The result variant has no name/args members. Non-tool variants have no tool members. `RawTraceItem.fromDict(...)` remains permissive for historical rows.

### Physical lifecycle group

Add a concrete core capability at `memory/tool-trace-lifecycle-index.ts`:

```ts
type ToolTraceLifecycleGroup = Readonly<{
  identity: ToolCallIdentity;
  call: RawTraceItem | null;
  result: RawTraceItem | null;
}>;

buildToolTraceLifecycleIndex(records): ReadonlyMap<string, ToolTraceLifecycleGroup>;
```

Input must already be physical-store ordered/deduped when active/archive precedence matters. First valid call/result wins within one logical lifecycle; later duplicates remain ignored evidence for current state.

### Native lifecycle state

`MemoryManager` maintains a private map of physical lifecycle groups/keys initialized from the complete corpus. It updates the map after successful append and uses it for:

- call/result duplicate suppression;
- result-before-call rejection;
- interruption enumeration;
- compound identity validation.

It does not retain mutable effective argument state or depend on `ToolInteraction`.

### Server runtime state

```ts
type RuntimeToolState = {
  identity: ToolCallIdentity;
  toolName?: string;
  toolArgs?: Record<string, unknown>; // absence means not ready
  callRawTraceId?: string;
  resultRawTraceId?: string;
  callProjected: boolean;
};
```

Hydration copies call-side name/args from `group.call` only and result presence from `group.result`. It never copies historical result-side args. `callProjected` initializes true for a persisted call; existing protocol-safety recovery handles a crash between raw call and snapshot write.

### Logical interaction

`ToolInteraction` includes compound identity, call/result raw IDs, read-effective name/arguments, outcome, status, and anchor/terminal timestamps needed by projections. It is derived and never accepted by a writer.

Read precedence follows `tool-trace-contract.md`: call first, historical result overlay only when physically present, result outcome, result-row terminal status including null success.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Codex payload parser | Codex converter | extract action fields; no persistence |
| Claude observed-invocation map | Claude coordinator | preserve SDK input for event emission |
| raw serializer | writer/store | type-specific physical field presence |
| Working Context snapshot | memory lifecycle owners | provider protocol projection |
| protocol safety repairer | `MemoryManager` | fence dangling calls after crash/interruption |
| provider compaction boundary recorder | server accumulator | record/rotate provider boundary; no semantic summarization |
| run-history transformer | run-history projection | interleave logical tool activities with other events |
| work-trace renderer | evidence UI/text | render replay events; no raw correlation logic |

## Existing Capability / Subsystem Reuse Check

| Need | Existing capability | Decision |
| --- | --- | --- |
| Native call/result persistence | `MemoryManager` + raw ingestion builders | Extend; do not create another lifecycle service |
| Provider extraction | Codex converter / Claude coordinator | Extend Codex presence semantics; keep Claude |
| Server lifecycle | `RuntimeMemoryEventAccumulator` | Refactor in place |
| Serialized events | recorder queue | Reuse unchanged |
| Physical corpus | `RunMemoryFileStore` | Reuse through writer facade |
| Logical activity | `buildToolInteractions` | Extend as authoritative projection |
| Compaction protocol group | existing Working Context unit/planner | Preserve and add coverage |
| Migration | existing migration/Memory Sync systems | Explicitly not used |

## Subsystem / Capability-Area Allocation

| Subsystem | Allocation |
| --- | --- |
| Core memory models/persistence | identity, strict serialization, physical lifecycle index, logical interaction |
| Native agent/memory | early call, minimal result, interruption, dedupe, WC coordination |
| Provider adapters | argument availability and normalized terminal facts |
| Server agent memory | recorder composition, accumulator lifecycle, writer facade |
| Native compaction | Working Context barrier and active raw planning |
| Server run history/work trace | map core logical interactions into presentation |
| Delivery docs | document new split contract and provider timing |

## Draft File Responsibility Mapping

| File/area | Draft responsibility |
| --- | --- |
| `models/tool-call-identity.ts` | neutral compound identity |
| `tool-trace-lifecycle-index.ts` | physical call/result grouping only |
| `models/raw-trace-item.ts` | permissive envelope read + trace-specific serialization |
| `raw-trace-ingestion.ts` | strict native call/minimal-result construction |
| `memory-manager.ts` | native lifecycle/dedupe/WC sequencing |
| `tool-interaction-builder.ts` / model | read-effective logical activity |
| native compaction/safety/recovery files | consume physical/logical context without repeated correlation |
| Codex item converter | omit placeholder start arguments |
| server recording models | discriminated trace inputs |
| accumulator | provider-agnostic readiness/terminal state machine |
| writer/recorder | persistence facade and reconstructed physical state composition |
| server replay/normalizer | preserve fields and map core interactions |

## Reusable Owned Structures Check

- Compound identity repeats across native, server, reads, and compaction: retain one tight core model.
- Physical call/result grouping repeats across writer hydration and reads: add one concrete lifecycle index.
- Historical effective overlay does not belong in the physical group: keep it only in logical interaction projection.
- Native and server runtime states differ: share identity/groups, not a mostly optional generic pending-state bag.
- Strict call/result inputs share only the raw envelope through discriminated composition.

## Shared Structure / Data Model Tightness Check

| Structure | Tightness decision |
| --- | --- |
| `ToolCallIdentity` | two required fields only |
| `ToolTraceLifecycleGroup` | actual call/result references only; no copied metadata/outcome status |
| `RuntimeToolState` | server-only availability/projection state; no provider envelope |
| `ToolCallTraceInput` | call metadata only |
| `ToolResultTraceInput` | identity/outcome only |
| `ToolInteraction` | derived read model, never persistence input |

## Final File Responsibility Mapping

| Path | Change | Final responsibility |
| --- | --- | --- |
| `autobyteus-ts/src/memory/models/tool-call-identity.ts` | Add/retain and adapt paused file | compound identity/key |
| `autobyteus-ts/src/memory/tool-trace-lifecycle-index.ts` | Add | physical grouping and call-context derivation |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Modify | result null-key serialization; permissive historical read |
| `autobyteus-ts/src/memory/raw-trace-ingestion.ts` | Modify | early call builder and minimal result builder |
| `autobyteus-ts/src/memory/memory-manager.ts` | Modify | compound physical state, strict validation/dedupe, minimal result/WC sequencing, interruption |
| `autobyteus-ts/src/memory/models/tool-interaction.ts` | Modify | compound/provenance-aware logical model |
| `autobyteus-ts/src/memory/tool-interaction-builder.ts` | Modify | authoritative read-effective projection |
| `autobyteus-ts/src/memory/index.ts` | Modify | export identity/lifecycle/read APIs needed by server |
| core store abstractions / `run-memory-file-store.ts` | Modify only where needed | expose complete ordered corpus through existing ownership |
| `memory-manager-tool-protocol-safety.ts` and recovery projector/bootstrapper | Modify | compound complete-corpus facts and pending-call fencing |
| `compaction/interaction-block-builder.ts` | Modify | active blocks with external call-context recognition |
| `compaction/compaction-window-planner.ts` | Modify | explicit active records + corpus context input |
| `compaction/tool-result-digest-builder.ts` and relevant formatter/prompt files | Modify | digest minimal result using resolved call context |
| `agent/loop/agent-turn-runner.ts` | Modify only if needed | finalize controlled interruptions before repair; no effective-state callback |
| `agent/loop/tool-phase.ts` | Revert paused terminal-only change / otherwise unchanged | execution only; no persistence-state callback |
| Codex `events/codex-item-event-converter.ts` | Modify | omit non-authoritative web-search start arguments |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | Modify | discriminated strict trace inputs |
| `services/runtime-memory-event-accumulator.ts` | Modify | compound readiness/terminal state machine |
| `services/agent-run-memory-recorder.ts` | Modify | construct accumulator with physical lifecycle groups |
| `store/run-memory-writer.ts` | Modify | strict append mapping + lifecycle-group query facade |
| `services/raw-trace-record-normalizer.ts` | Modify as needed | preserve permissive historical fields/outcome values |
| `run-history/.../raw-trace-to-historical-replay-events.ts` | Modify | consume authoritative interactions; preserve non-tool interleaving |
| paused prototype files | Remove | no role in target |
| affected native/server tests | Modify/add | contracted behavior and regressions |

No new folder hierarchy is warranted; the core memory subsystem already owns these concrete concerns.

## Ownership Boundaries

### Native

Callers use `MemoryManager.ingestToolIntents`, `ingestToolResults`, and `finalizePendingToolCallsForTurn`. They never access lifecycle maps/builders/stores directly. `ToolPhase` reports execution results only.

### Provider adapters

Converters/coordinators translate native payloads into normalized events and own argument-property presence. They do not decide raw dedupe or append order.

### Server

Recorder serializes and composes. Accumulator decides lifecycle. Writer persists decided variants and exposes physical queries. Store owns files. No caller above writer accesses the store.

### Reads

Physical lifecycle index owns grouping, logical interaction builder owns semantic overlay, and presentation/compaction owners consume those outputs. Writers never consume `ToolInteraction`.

## Boundary Encapsulation Map

| Caller | Authoritative boundary | Internal mechanism not bypassed |
| --- | --- | --- |
| `LlmPhase` / result processors | `MemoryManager` | raw builder/store/lifecycle map |
| recorder | `RuntimeMemoryEventAccumulator` + `RunMemoryWriter` facade | store internals |
| accumulator | normalized `AgentRunEvent` | Codex/Claude native payload parsers |
| server history/work trace | core interaction projection | ad hoc result overlay |
| compaction executor | compaction planner | store pruning/context internals |

## Dependency Rules

Allowed:

- native loop -> `MemoryManager` subject APIs;
- provider native payload -> provider converter -> normalized event;
- recorder -> accumulator and writer facade;
- accumulator -> normalized payload extractors, identity, writer;
- writer -> strict recording models, core physical lifecycle index, private store;
- logical readers -> physical groups + interaction builder;
- compaction planner -> active records + read-only call-context index.

Forbidden:

- native `ToolPhase` -> memory store;
- accumulator -> Codex/Claude native parser or tool-name-specific branch;
- recorder -> writer plus private store;
- writer -> provider lifecycle policy or historical effective overlay;
- current writer -> `ToolInteraction`;
- result builder -> tool name/arguments;
- active compaction -> archive raw IDs for pruning;
- presentation transformer -> independent call/result precedence;
- runtime business code -> migration/version discriminator.

## Interface Boundary Mapping

| Interface | Subject | Input/identity | Responsibility |
| --- | --- | --- | --- |
| `buildToolTraceLifecycleIndex(records)` | physical tool lifecycle | ordered raw rows | group actual call/result by compound identity |
| `buildToolInteractions(records, options?)` | logical interaction | records plus optional call context | read-effective projection only |
| `MemoryManager.ingestToolIntents(...)` | native calls | invocation batch/turn | validate, append calls, WC calls |
| `MemoryManager.ingestToolResults(...)` | native outcomes | result batch/turn | require call, dedupe, append minimal results, WC results |
| `MemoryManager.finalizePendingToolCallsForTurn(...)` | native interruption | turn/reason | minimal error results for call-written/result-missing identities |
| Codex web-search start converter | provider observation | native item | omit `arguments` for placeholder state |
| `RuntimeMemoryEventAccumulator.recordRunEvent(...)` | server lifecycle | normalized event | readiness/terminal state machine |
| `RunMemoryWriter.readToolTraceLifecycleGroups()` | durable physical state | current memory root | delegate complete-corpus grouping |
| `RunMemoryWriter.write(...)` | persistence operation | strict trace variant + optional snapshot update | append then project |
| `CompactionWindowPlanner.plan(...)` | active compaction | active rows, active turn, call context | active-only eligibility/digests |

## Interface Boundary Check

- Every lifecycle API has an explicit subject and compound identity.
- Property absence carries readiness; no generic selector or provider enum is required.
- The writer query returns neutral physical state, not effective semantic state.
- The compaction API names both scopes instead of hiding an archive scan inside active planning.
- No new empty forwarding facade is introduced.

## Main Domain Subject Naming Check

- `ToolCallIdentity`, `ToolTraceLifecycleGroup`, `ToolInteraction`, `RuntimeToolState`, `ToolCallTraceInput`, and `ToolResultTraceInput` name concrete subjects.
- Avoid names such as `ToolActivityManager`, `ToolTraceHelper`, `Support`, or `CorrelationService`.
- Persisted names remain exactly `tool_call` and `tool_result`.

## Applied Patterns

- **Adapter**: Codex/Claude boundary conversion, including argument availability.
- **State machine**: accumulator’s observed/call-written/complete progression.
- **Serialized event loop**: recorder queue.
- **Repository/facade**: writer/store physical boundary.
- **Derived projection**: physical lifecycle index then logical interaction.

Patterns stay inside clear owners; none becomes a generic coordination layer.

## Target Subsystem / Folder / File Mapping

```text
autobyteus-ts/src/memory/
  models/
    raw-trace-item.ts
    tool-call-identity.ts
    tool-interaction.ts
  raw-trace-ingestion.ts
  tool-trace-lifecycle-index.ts
  tool-interaction-builder.ts
  memory-manager.ts
  compaction/
    interaction-block-builder.ts
    compaction-window-planner.ts
    tool-result-digest-builder.ts
  restore/
    working-context-recovery-projector.ts

autobyteus-server-ts/src/
  agent-execution/backends/codex/events/
    codex-item-event-converter.ts
  agent-memory/
    domain/memory-recording-models.ts
    services/runtime-memory-event-accumulator.ts
    services/agent-run-memory-recorder.ts
    services/raw-trace-record-normalizer.ts
    store/run-memory-writer.ts
  run-history/projection/transformers/
    raw-trace-to-historical-replay-events.ts
```

The layout is intentionally flat within established capability areas. Identity, physical lifecycle, and logical interaction are separate files because they have different owners/semantics; no new generic trace module is created.

## Folder Boundary Check

- Provider readiness remains under Codex provider events.
- Shared physical/logical trace semantics remain in core memory.
- Native sequencing remains in native memory/loop.
- Server lifecycle/persistence remains in agent-memory service/store depths.
- Presentation mapping remains in run-history.
- No file is placed in a vague shared/helpers folder.

## Concrete Examples / Shape Guidance

### Native `run_bash`

```text
model call(command="large heredoc")
  -> raw tool_call(name=run_bash,args={command:"large heredoc"})
execute
  -> raw tool_result(result="...",error=null)
```

The command is physically stored once.

### Native prepared `edit_image`

```text
model call(args={input:"relative.png"})
  -> raw tool_call(args={input:"relative.png"})
prepare execution -> {input_images:["/absolute/relative.png"]}
execute -> failure
  -> raw tool_result(result=null,error="...")
```

Raw call records model intent. Result does not become an execution-argument container.

### Claude early call

```text
SDK tool_use(id,name,input)
  -> TOOL_EXECUTION_STARTED(arguments=input)
  -> raw tool_call(name,input)
SDK tool_result
  -> raw tool_result(result,error)
```

### Codex hosted search

```text
item/started: query="", action=other
  -> normalized start has no arguments property
  -> no raw/WC call

item/completed: query="cats", action=search
  -> raw tool_call(name=search_web,args={query:"cats",action_type:"search"})
  -> raw tool_result(result=<existing completion metadata>,error=null)
```

### Null success

```json
{
  "trace_type": "tool_result",
  "tool_call_id": "call_null",
  "tool_result": null,
  "tool_error": null
}
```

The pair is successful because a result row exists and has no error.

### Two-call compaction barrier

```text
assistant -> call A + call B
result B -> group incomplete, compaction still pending/protected
result A -> group complete, pending compaction may execute before next LLM
```

### Cross-file pair

```text
archive: tool_call(turn=t,id=c,name=run_bash,args=...)
active:  tool_result(turn=t,id=c,result=...,error=null)

corpus call context -> active digest/name/args
active plan/removal IDs -> result row and other active IDs only
```

### Crash

```text
early call written -> process crashes -> raw call remains pending; never auto-retry
deferred placeholder only -> process crashes -> no raw tool row; never fabricate
deferred terminal call written -> crash before result -> honest pending call
```

## Backward-Compatibility Rejection Log (Mandatory)

| Rejected approach | Reason |
| --- | --- |
| Rewrite old result rows without name/args | No correctness need; multi-GB operational risk |
| Schema-version branch | Ordinary trace types/fields already distinguish behavior |
| Dual old/new writer flag | Keeps redundant result shape authoritative |
| `tool_call_update` | Adds a third record/semantic subject for a provider-specific case |
| Combined terminal `tool_call` | Over-generalizes Codex, weakens native durability, changes intuitive names |
| In-place call rewrite | Violates append-oriented storage and adds crash/atomicity complexity |
| Result args only when different | Keeps result responsible for invocation metadata and makes writers compare semantic objects |
| Provider-specific branch in accumulator | Bypasses adapter authority; presence is sufficient |
| Anonymous tool IDs | Corrupts identity and dedupe semantics |
| Support for unshipped combined prototype rows | Corpus scan found none; clean-cut replacement applies |

## Change Inventory

- **Add**: physical lifecycle index and neutral identity if not retained from paused work.
- **Modify**: strict result serialization/builders, native manager state, logical projection, safety/recovery/compaction consumers.
- **Modify**: Codex web-search start argument presence.
- **Modify**: server discriminated DTO, accumulator, writer, recorder, normalizer, replay.
- **Remove/revert**: terminal-only combined call semantics, effective-state persistence callback, pending aggregation introduced by paused implementation.
- **Remove**: both obsolete prototype correlation/read files.
- **Do not add**: migration, schema/version, compatibility flag, new raw type.

## Migration / Refactor Sequence

1. Preserve current paused diff and establish bootstrap-vs-paused comparison; do not wholesale reset unrelated work.
2. Establish core compound identity and physical lifecycle index with historical split fixtures.
3. Restore/implement trace-specific serializer and strict call/minimal-result builders; delete combined-call terminal predicate/shape.
4. Adapt native `MemoryManager` to early call + minimal result with complete-corpus compound dedupe; remove effective-state/pending terminal aggregation from paused work.
5. Preserve native compaction scheduling and add explicit multi-call barrier coverage; adapt safety/recovery/digest consumers to compound/corpus context.
6. Change Codex web-search start conversion to omit non-authoritative arguments; add direct captured-frame regression.
7. Tighten server write DTOs, adapt writer lifecycle query, construct accumulator with physical groups, and implement provider-agnostic readiness/terminal state.
8. Convert server replay/work trace and native logical consumers to the authoritative interaction projection.
9. Remove old local correlators, anonymous ID logic, result-side metadata writes, combined-call tests/paths, and obsolete prototypes.
10. Run implementation-scoped checks, then source review, API/E2E coverage/execution, proportional test review, delivery refresh/docs.

No migration step exists.

## Test And Validation Design Intent

Implementation-scoped unit/integration intent:

- raw serializer: call omits outcome; result includes null outcome keys and omits name/args; non-tool unaffected;
- identity/lifecycle index: compound keys, active-wins raw-ID input, call/result grouping, duplicates;
- native: early call, minimal success/null/failure/denial/interruption result, individual-plus-batch dedupe, missing-ID atomic rejection, model args unchanged after preparation;
- native compaction: two calls, one result remains protected; second result/interruption releases barrier;
- crash/recovery: unmatched early call fenced unknown, no auto retry, corpus facts used across archives;
- Codex converter: placeholder web-search start has no arguments property; explicit terminal action does; explicit `{}` remains supported for known no-arg tools;
- Codex accumulator: ordinary early call; deferred terminal call before result; insufficient terminal skipped; duplicate terminal suppressed;
- Claude: observed input early, minimal terminal result;
- server reconstruction: archived call + later result, existing result suppresses replay, equal IDs across turns remain distinct;
- compaction: complete context enriches active result/digest while eligible IDs remain active-only;
- logical read: new minimal pair, historical exact duplicate, historical late Codex args, native effective historical args, null success;
- replay/work trace: one activity, correct call anchor/terminal status;
- no migration/Memory Sync/schema branch.

`api_e2e_engineer` owns final existing-test validity decisions, environment setup, broad execution, realistic run/browser decisions, and confidence scoring after source review passes.

## Key Tradeoffs

| Choice | Benefit | Cost / accepted consequence |
| --- | --- | --- |
| Early native/Claude call | durable issued intent; intuitive chronology | unmatched call may remain after crash |
| Deferred only when args absent | preserves late Codex data without update | deferred activity can disappear on hard loss |
| Model-issued native args | singular intuitive call meaning | prepared execution args are not separately audited |
| Minimal result | removes large duplication structurally | readers must correlate with call, including archives |
| Physical index separate from logical overlay | writer safety and clear ownership | two explicit derived levels |
| Active scope plus corpus context | correct cross-file meaning and safe pruning | planner API becomes two-scope |
| No migration | avoids multi-GB operational risk | historical duplicate bytes remain |
| Opaque result unchanged | bounded scope and semantic stability | small provider result-internal overlap may remain |

## Risks

- Missing/empty argument presence can be collapsed accidentally in converter/extractor code.
- Paused terminal-only implementation is broad; adaptation must remove obsolete semantics rather than layer new branches.
- Raw append and Working Context snapshot are not transactional; existing safety repair must remain effective.
- Cross-file context APIs could accidentally leak archive IDs into pruning unless types/tests make scope explicit.
- A future Codex version may expose earlier arguments or a result body; the adapter should follow actual normalized presence without changing persistence owners.
- A late server terminal after reconstruction may lack name/args; it is valid only when a physical persisted call already exists.

## Guidance For Implementation

- Read this design and `tool-trace-contract.md` before touching the preserved paused diff.
- Start from semantic ownership, not from mechanically reverting every modified file.
- Use bootstrap `git show` to identify original behavior and current worktree diff to salvage only still-valid compound identity/read work.
- Do not retain combined-call outcome presence, terminal-only pending maps, or ToolPhase effective-state callbacks.
- Do not solve Codex by branching on `toolName === "search_web"` in the accumulator; fix argument presence at the Codex converter.
- Make illegal current writes unrepresentable through discriminated inputs/builders.
- Keep writer hydration on physical rows and historical overlay on reads.
- Assert active-only pruning IDs in tests.
- Do not run migration or modify historical corpus files.
