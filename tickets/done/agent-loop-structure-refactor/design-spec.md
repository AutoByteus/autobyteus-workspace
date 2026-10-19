# Design Spec — agent-loop-structure-refactor

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` SR-001 text (SR-002 evidence only). Approved by the user on 2026-10-11: "yes. lets go" and "if you think the problem is still true, then you're certain that you can make it a cleaner. Go for it." DEC-001 = named outcome handlers; DEC-002 = ToolPhase assess only.
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/investigation-notes.md`
- Authorities read (design gate; read in this conversation, re-applied 2026-10-11): `references/architecture-design.md`, `design-principles.md`, repository `DESIGN.md`, `TESTING.md`, `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`. No package-level `DESIGN.md` in `autobyteus-ts`.
- Design basis code: `origin/personal` @ `beb6b3b49` (includes compaction cache reuse `edd8f8469`).
- Conflicts or discrepancies: None.

## Current-State Read

`AgentWorker` runs one `AgentTurnRunner` per turn. The runner loops over `LlmPhase.run()` outcomes (`output_limited`, `compaction_blocked`, `final`, `tool_invocations`) and runs `ToolPhase` for tool batches.

`LlmPhase.run()` (`llm-phase.ts`, 445 lines) is one ~380-line method with seven concerns:
- (a) per-call setup: request capacity, compaction budget, reporter, `PendingCompactionExecutor` with `LlmPhaseSummaryPort`, tool schemas, assembler;
- (b) call identity and request assembly, including `compaction_blocked`;
- (c) commit/rollback closures;
- (d) stream consumption: accumulation, reasoning segments, stream-handler feeding;
- (e) finish classification and per-outcome settlement (memory ingestion, token usage);
- (f) interruption and provider-error handling;
- (g) post-response compaction evaluation and execution.

Turn state:
- The tool-batch lifecycle is started by `LlmPhase` (l.311) and cleared by the runner (l.122-125).
- `LlmPhase` re-derives "has tool calls" from `turn.activeToolInvocationBatch && parsedToolInvocationCount > 0` and re-reads the handler's invocations (l.411).
- `AgentTurn.toolInvocationBatches` is written but never read.
- `LLMResponsePipeline` falls back to `context.state.activeTurn?.turnId`, although its single caller always passes `turnId`.

The runner's loop carries a ~50-line inline tool-continuation branch. `ToolPhase` is already decomposed (investigation notes).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: About 8 source files, all inside `autobyteus-ts/src/agent`:
  - `llm-phase.ts`;
  - new `llm-response-stream-collector.ts`;
  - `llm-phase-compaction.ts`;
  - `agent-turn-runner.ts`;
  - `agent-turn.ts`;
  - `pipelines/llm-response-pipeline.ts`;
  - affected tests;
  - one doc.
  
  No provider, server or web change.
- Architectural risk: `High`
- Risk rationale: It restructures ownership inside the agent loop's main path (the LLM-call owner, the tool-batch lifecycle owner, the runner's outcome dispatch). It must preserve subtle ordering: interrupt fences, commit vs rollback, segment-event and status ordering, compaction prefix binding (CON-002) and LLM idleness (CON-004). The blast radius is every AutoByteus-runtime turn.
- Escalation trigger: Any golden sequence (AC-003) differs; any compaction invariant test fails; any need to change a public type outside `agent/loop` (other than `AgentTurn`, `LLMResponsePipeline`); any need to change `ToolPhase` or the stable compaction seams. Return a `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `llm-phase.ts` @ `beb6b3b49` | Concerns (a)–(g) in one method | D-01..D-04 | — |
| Code read | `agent-turn-runner.ts` | Inline tool branch; 4 outcomes | D-06 | — |
| Grep | `toolInvocationBatches`, batch APIs, `processFinalResponse(` | Dead array; split batch owner; dead fallback | D-05 | — |
| Diff | `e50826755..beb6b3b49` | Compaction seams exactly as relayed | CON preservation | — |
| Tests | `tests/unit/agent/loop/*`, `tests/integration/agent/*` | The runner test mocks `LlmPhase`/`ToolPhase` at module level; LlmPhase tests drive `run()` | Keep the `run()` signature and outcome union | — |

## Intended Change

- **D-01 — `LlmResponseStreamCollector` (new; concern d).** It owns consuming one provider stream for one LLM call:
  - abortable iteration with the same fences (`llm_stream`, `llm_stream_chunk`);
  - accumulation of text, reasoning, media URLs, provider-native turn, usage and finish;
  - the reasoning-segment lifecycle (start, content, end; ids from the same `segment_<uuid>:reasoning_<uuid>` scheme);
  - the owned `LlmStreamingResponseHandler` (feed and all finalization modes).
  
  Its API:
  - `consume(stream, scope)`;
  - getters `finish`, `usage`, `text`, `reasoning`;
  - `buildResponse()` (full `CompleteResponse`, today's normal-path shape);
  - finalization, each idempotent and ending the reasoning segment with today's metadata:
    - `completeNormally(): ToolInvocation[]` (handler `finalize()`, returns invocations, or `[]` when tool calls are disabled);
    - `completeOutputLimited(errorText): string[]` (handler `finalizeOutputLimited`);
    - `abandonInterrupted(reason)`;
    - `abandonFailed(message)`.
  
  The collector does **not** create the stream. `LlmPhase` still calls `llmInstance.streamMessages(request.outboundMessages, conversationRequestKwargs(agentId, request.tools), conversationRequestOptions({...}))` and hands the iterable over (CON-001, CON-003).
- **D-02 — `LlmCallCompaction` (concerns a-compaction, g).** This extends `llm-phase-compaction.ts`, which already owns `evaluateLlmPhaseCompaction`, into a small per-call owner created by `LlmCallCompaction.create({...})` only when automatic compaction is enabled. It holds:
  - the reporter, runtime-settings resolver, compaction token budget (policy applied), and `PendingCompactionExecutor` with `LlmPhaseSummaryPort({ agentId, llm, tools: toolSchemas, requestCapacity, notifier })`, constructed exactly as today;
  - `executor` (given to `LLMRequestAssembler`);
  - `evaluateAfterResponse(usage)`, which wraps the unchanged `evaluateLlmPhaseCompaction`;
  - `executeAfterFinalResponse({ assembler, requestTools, turnId, signal, context, notifier })`. This does `assembler.bindRequestPrefix(requestTools)`, then `executeIfAuthorized('after_final_response')`, with today's error notification `LLM_IMMEDIATE_COMPACTION_FAILED` and `compactionRecovery.publish()` (CON-002 order kept).
  
  Request capacity (also used for token-usage percentages) stays resolved once per call by `LlmPhase` and is passed in.
- **D-03 — `LlmPhase` keeps one LLM call's orchestration (concerns b, c, e, f).** `run()` becomes a short sequence of named private steps:
  1. `beginCall` (validation, identity `turn.nextLlmCallSequence()`, budget, tool schemas, compaction, assembler);
  2. `assembleRequest` (returns `compaction_blocked` as today);
  3. start the stream and `collector.consume`;
  4. classify `collector.finish` → `throw buildResponseStopError` | `settleOutputLimited` | `settleCompleted`;
  5. catch → `settleInterrupted` (rethrow) | `settleFailed` (final error outcome);
  6. `compaction.evaluateAfterResponse`;
  7. outcome selection, with `executeAfterFinalResponse` only for a final outcome without tool calls.
  
  Commit/rollback stays in `LlmPhase` (owner of the call's recovery snapshot) as private methods replacing the closures, with the same `recoverySettled` guard. Token-usage notification becomes a private method with the identical payload. Ordering inside each settle method mirrors today's code line for line (see the Concrete Examples section).
- **D-04 — Outcome carries the invocations.** `LlmPhase` returns `tool_invocations` with the invocations from `collector.completeNormally()`. It no longer reads `turn.activeToolInvocationBatch` or re-reads the handler. Memory ingestion (`ingestAssistantToolResponse`) stays in `settleCompleted` at the same point.
- **D-05 — One owner for the tool-batch lifecycle; dead state removed (REQ-004).**
  - `AgentTurnRunner` owns the batch lifecycle. It calls `turn.startToolInvocationBatch(invocations)` at the start of its tool step, immediately after `LlmPhase` returns `tool_invocations` and before the `PendingToolInvocationEvent` statuses, and it clears the batch as today.
  - `LlmPhase` no longer touches batches.
  - Remove `AgentTurn.toolInvocationBatches` (dead).
  - Remove the `context.state.activeTurn` fallback in `LLMResponsePipeline.processFinalResponse`: make `turnId` a required `string` option.
  - Timing note: registration moves from just before memory ingestion (inside `LlmPhase`) to just after `LlmPhase` returns. Nothing between those points reads the batch or can deliver an approval or external result, so there is no observable change. AC-003 asserts it.
- **D-06 — Runner outcome handlers (DEC-001).** The loop body becomes:
  - fences;
  - ready status;
  - `llmPhase.run`;
  - `switch (outcome.kind)` with one handler each:
    - `output_limited` → `handleOutputLimited(outcome, state)`, which returns either the next input or a completed `TurnOutcome` (counter, note, `beginContinuation`, exhaustion; today's code moved verbatim);
    - `compaction_blocked` → `waitForCompactionRetry()`;
    - `final` → `completeWithFinalResponse` (exists);
    - `tool_invocations` → `runToolStep(outcome, interruptedProjection)`, which returns the next input. This is today's inline block: batch start (D-05), pending statuses, `ToolPhase.run`, result pipeline with statuses and lifecycle, batch clear, `ingestToolResults`, `beginContinuation`, continuation pipeline, status.
  
  The consecutive-stop counter resets for every non-`output_limited` outcome, as today. No state-machine class.
- **D-07 — `ToolPhase` unchanged (DEC-002).** The assessment is recorded: one owner, already decomposed; `runOneInvocation` is long but covers one invocation's lifecycle.
- **D-08 — Docs.** Update `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` (Turn Execution Ownership): `LlmPhase` (call owner), `LlmResponseStreamCollector`, `LlmCallCompaction`, runner tool step and batch ownership.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..REQ-006, REQ-008; AC-001..AC-006, AC-008 | Any agent turn | Source Log | Preserved; structure changes only | DS-001, DS-002, DS-003 |
| BEH-002 | Contract | REQ-007, CON-001..CON-006; AC-007 | Compaction cache reuse | 1c0ac46f merged | Preserved | DS-002, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `task-brief.md` | Original brief | All | Source of the four points | Request context |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor`
- Current design issue found: `Yes`
- Structural triggers:
  - **Responsibility overload:** `LlmPhase.run` has 7 concerns in ~380 lines (evidence above).
  - **Authoritative boundary / derived state:** `LlmPhase` reads `turn.activeToolInvocationBatch` to decide its own outcome; the batch lifecycle has two owners.
  - **Dead code:** `toolInvocationBatches`; the `activeTurn` fallback.
  - Ruled out: **empty indirection.** Each new piece owns concrete state or lifecycle. The collector owns accumulation state, the reasoning-segment lifecycle and the handler; `LlmCallCompaction` owns the executor, reporter and budget for one call. No `AgentLoop`.
- Root cause classification: `File Placement Or Responsibility Drift` (LlmPhase) plus `Boundary Or Ownership Issue` (batch lifecycle).
- Refactor needed now: `Yes` (the user's explicit request; the evidence holds on `beb6b3b49`).
- Design response: D-01..D-06, D-08.
- Intentional deferrals: `ToolPhase` (D-07; no owner problem).

## Terminology

- **LLM call:** one `LlmPhase.run()` invocation (one request attempt).
- **Collector:** `LlmResponseStreamCollector`.

## Legacy Removal Policy (Mandatory)

- Policy: no backward compatibility. The old inline code paths are replaced, not wrapped. No re-exports of moved internals.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored shape, trace type or content changes; REQ-001 requires identical memory writes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Turn trigger | Turn outcome | `AgentTurnRunner` | Outcome dispatch (D-06) |
| DS-002 | Primary End-to-End | BEH-001, BEH-002 | `LlmPhase.run` | `LlmPhaseOutcome` | `LlmPhase` | The split (D-01..D-04) |
| DS-003 | Bounded Local | BEH-001 | Stream iterable | Collected response plus finalized segments | `LlmResponseStreamCollector` | Stream consumption |
| DS-004 | Bounded Local | BEH-002 | Final outcome without tools | After-final compaction done | `LlmCallCompaction` | CON-002, CON-004 |

## Primary Execution Spine(s)

- DS-001: `AgentWorker -> AgentTurnRunner.run -> [loop] LlmPhase.run -> switch(outcome) -> handleOutputLimited | waitForCompactionRetry | completeWithFinalResponse | runToolStep(-> AgentTurn.startToolInvocationBatch -> ToolPhase.run -> result pipeline -> memory -> continuation)`
- DS-002: `LlmPhase.run -> beginCall (identity, budget, LlmCallCompaction, assembler) -> assembleRequest -> llm.streamMessages(conversationRequest*) -> LlmResponseStreamCollector.consume -> classify finish -> settle (commit|rollback, memory, usage) -> LlmCallCompaction.evaluate/executeAfterFinalResponse -> outcome`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The runner dispatches each LLM outcome to one named handler. The tool step owns the batch lifecycle and builds the continuation | Turn, outcome, tool batch | `AgentTurnRunner` | `output-limit-recovery.ts` policy |
| DS-002 | `LlmPhase` prepares one call, starts the stream with the shared conversation-request helpers, lets the collector consume it, settles memory and usage per finish, runs after-response compaction, and returns the outcome | LLM call, request, response | `LlmPhase` | Collector, `LlmCallCompaction`, assembler |
| DS-003 | The collector iterates chunks under the turn's fences, accumulates response parts, emits reasoning segments, feeds the stream handler, and finalizes in exactly one mode | Chunk, segment | Collector | `LlmStreamingResponseHandler` |
| DS-004 | For a final outcome without tools, the call's compaction owner binds the request prefix and runs authorized after-final compaction after the stream is fully consumed | Compaction | `LlmCallCompaction` | `PendingCompactionExecutor`, `LlmPhaseSummaryPort` |

## Spine Actors / Main-Line Nodes

`AgentTurnRunner`, `LlmPhase`, `LlmResponseStreamCollector`, `LlmCallCompaction`, `ToolPhase`, `AgentTurn`.

## Ownership Map

- `AgentTurnRunner`: turn sequencing; outcome dispatch; tool-batch lifecycle; output-limit recovery counter; continuation input.
- `LlmPhase`: one LLM call's identity, request assembly, stream start, recovery-snapshot settlement (commit/rollback), memory ingestion per outcome, token-usage notification, finish classification, outcome selection.
- `LlmResponseStreamCollector`: stream iteration under fences; accumulated response parts; reasoning-segment lifecycle; stream-handler lifecycle and finalization mode.
- `LlmCallCompaction`: per-call compaction wiring (reporter, budget, executor with summary port); threshold evaluation; after-final execution including the prefix binding.
- `AgentTurn`: turn state (call sequence, continuation flag, active tool batch).

## Thin Entry Facades / Public Wrappers (If Applicable)

None.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `AgentTurn.toolInvocationBatches` | Dead: pushed in `startToolInvocationBatch`, never read in src (grep) | — | In This Change | Update `tests/unit/agent/tool-invocation.test.ts` if it asserts the array |
| `LLMResponsePipeline` `context.state.activeTurn?.turnId` fallback (2 sites) | Dead: its single caller passes `turnId` | Required `turnId` option | In This Change | |
| Inline closures `restoreRequest`/`releaseRequest`/`notifyTokenUsage` and inline stream loop in `LlmPhase.run` | Replaced | Private methods; collector | In This Change | |
| `LlmPhase` → `turn.startToolInvocationBatch` and the `activeToolInvocationBatch` re-derivation | Split ownership / derived state | Runner tool step; outcome invocations | In This Change | |

## Return Or Event Spine(s) (If Applicable)

Segment events: the collector emits reasoning events, and the handler emits text and tool events, in the same order as today. No new events.

## Bounded Local / Internal Spines (If Applicable)

- DS-003 (parent: collector): `for await chunk (fences) -> accumulate -> reasoning segment start/content -> handler.feed -> [end] completeNormally | completeOutputLimited | abandonInterrupted | abandonFailed`.
- DS-004 (parent: `LlmCallCompaction`): `bindRequestPrefix(request.tools) -> executeIfAuthorized('after_final_response') -> on error: compactionRecovery.publish + LLM_IMMEDIATE_COMPACTION_FAILED`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `output-limit-recovery.ts` (unchanged) | DS-001 | Runner | Policy texts and limit | Existing | — |
| `conversation-request.ts` (unchanged) | DS-002 | `LlmPhase`, summary port | One request definition | CON-001 | Re-created arguments break the cache |
| `buildResponseStopError` (unchanged, stays in `llm-phase.ts`) | DS-002 | `LlmPhase` | Stop error text | Existing | — |

## Ownership Boundaries

- The collector never touches memory, recovery snapshots or the turn; `LlmPhase` never iterates the stream.
- `LlmCallCompaction` is the only place in the loop that executes compaction after a response. Pre-request compaction stays inside `LLMRequestAssembler` (unchanged).
- Only the runner starts and clears tool batches.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LlmPhase.run` | Collector, `LlmCallCompaction`, assembler | `AgentTurnRunner` | The runner using the collector or compaction directly | Extend `LlmPhaseOutcome` |
| `LlmResponseStreamCollector` | `LlmStreamingResponseHandler`, reasoning segments | `LlmPhase` | `LlmPhase` feeding the handler or emitting reasoning segments | Add a collector method |
| `AgentTurn` | Batch, sequence, continuation | Runner, `LlmPhase` (sequence and continuation reads only) | Phases mutating the batch | — |

## Dependency Rules

- `agent-turn-runner.ts` → `llm-phase.ts`, `tool-phase.ts`, pipelines, `agent-turn.ts`. Never the collector or `LlmCallCompaction`.
- `llm-phase.ts` → collector, `llm-phase-compaction.ts`, assembler, `conversation-request.ts`, memory manager.
- Collector → streaming handler, segment events, response types. Never memory or the turn (it receives the execution scope only for fences).
- `llm-phase-compaction.ts` → `PendingCompactionExecutor`, `LlmPhaseSummaryPort`, token budget, reporter.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LlmPhase.run(input, context, turn, notifier): Promise<LlmPhaseOutcome>` | LLM call | Unchanged signature and union | — | Tests keep mocking it |
| `new LlmResponseStreamCollector({ turnId, notifier, toolCallsEnabled })` | Stream | — | turnId | |
| `collector.consume(stream, executionScope): Promise<void>` | Stream | Iterate with fences | — | Throws interruption and provider errors unchanged |
| `collector.completeNormally(): ToolInvocation[]` / `completeOutputLimited(text): string[]` / `abandonInterrupted(reason)` / `abandonFailed(message)` | Finalization | Exactly-once finalization | — | Idempotent guard |
| `collector.buildResponse(): CompleteResponse`; getters `text`, `reasoning`, `usage`, `finish` | Response | Parts | — | |
| `LlmCallCompaction.create(input): LlmCallCompaction \| null` | Per-call compaction | Wiring | — | null when disabled |
| `compaction.executor`, `evaluateAfterResponse(usage)`, `executeAfterFinalResponse(input)` | Compaction | As in D-02 | turnId | |
| `LLMResponsePipeline.processFinalResponse(response, context, notifier, { isError?, turnId })` | Final response | `turnId` required | turnId | |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Collector | Yes | Yes | Low | — |
| `LlmCallCompaction` | Yes | Yes | Low | — |
| `processFinalResponse` | Yes | Yes (now required) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Stream consumer | `LlmResponseStreamCollector` | Yes | Low | — |
| Per-call compaction | `LlmCallCompaction` | Yes | Low | — |
| Runner tool step | `runToolStep` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Tool/text segment handling | `LlmStreamingResponseHandler` | Reuse (owned by the collector) | Unchanged | — |
| Compaction evaluation | `evaluateLlmPhaseCompaction` | Reuse inside `LlmCallCompaction` | Unchanged | — |
| Stream consumption | — | Create New (collector) | Today it lives inline in `LlmPhase` | Not the handler's job (the handler owns segments for text and tools, not accumulation, reasoning or finish) |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop` | Call orchestration, collector, per-call compaction, runner | DS-001..DS-004 | Runner, `LlmPhase` | Extend | No new folder |
| `autobyteus-ts/src/agent` (turn, pipelines) | Turn state; final-response pipeline | DS-001 | Runner | Modify | Dead code removal |

## Draft File Responsibility Mapping

As in the Final File Responsibility Mapping (no draft changes).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reasoning-segment end with metadata (3 variants inline today) | Collector private method | agent/loop | One lifecycle | Yes | Yes | A general segment utility |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LlmPhaseOutcome` | Yes | Yes | Low | Unchanged union |
| `AgentTurn` | Yes | Yes (dead array removed) | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent/loop/llm-response-stream-collector.ts` (Add) | agent/loop | Collector | DS-003 | One owner | Handler |
| `src/agent/loop/llm-phase.ts` (Modify) | agent/loop | `LlmPhase` | D-03, D-04 | Call owner | Collector, compaction |
| `src/agent/loop/llm-phase-compaction.ts` (Modify) | agent/loop | `LlmCallCompaction` plus the existing `evaluateLlmPhaseCompaction` | D-02 | Per-call compaction | — |
| `src/agent/loop/agent-turn-runner.ts` (Modify) | agent/loop | Runner | D-05, D-06 | Turn owner | — |
| `src/agent/agent-turn.ts` (Modify) | agent | Turn | Remove dead array | — | — |
| `src/agent/pipelines/llm-response-pipeline.ts` (Modify) | agent/pipelines | Pipeline | Required `turnId` | — | — |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` (Modify) | docs | — | D-08 | — | — |
| `tests/unit/agent/loop/llm-response-stream-collector.test.ts` (Add), `tests/integration/agent/agent-loop-event-sequence.test.ts` (Add, golden) | tests | — | AC-003 and collector units | — | — |

## Applied Patterns (If Any)

None beyond owner extraction. The runner `switch` is a plain dispatch, not a state-machine framework.

## Target Subsystem / Folder / File Mapping

As in the final mapping; no new folders. `agent/loop` already holds the loop owners and their helpers.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent/loop` | Main-Line Domain-Control | Yes | Low | Two new or extended owners beside their parent |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| `LlmPhase.run` shape | `const call = this.beginCall(...); const assembled = await this.assembleRequest(call); if (assembled.blocked) return { kind: 'compaction_blocked' }; const collector = new LlmResponseStreamCollector(...); try { await collector.consume(this.startStream(call, request), turn.executionScope); outcomeState = this.settle(call, request, collector); } catch (e) { if (interrupted) { this.settleInterrupted(...); throw e; } return this.settleFailed(...); } return this.finishCall(call, request, outcomeState);` | A 380-line inline method; the collector creating its own stream arguments | D-03, CON-001 |
| Settlement order (normal) | `collector.completeNormally()` → `throwIfAborted('post_llm_stream')` → `buildResponse` → `notifyTokenUsage` → [tools: `throwIfAborted('llm_tool_intents')`, `ingestAssistantToolResponse`] / [none: `throwIfAborted('llm_assistant_response')`, `ingestAssistantResponse`] → `commit` | Reordering fences or the ingestion/commit order | Identical ordering (AC-003) |
| Settlement order (output-limited) | `throwIfAborted('post_llm_stream')` → `commit` → ingest text-only if non-empty → `collector.completeOutputLimited(...)` → `buildResponse` (content, usage, finish) → `notifyTokenUsage` | — | Mirrors today |
| Runner dispatch | `switch (outcome.kind) { case 'tool_invocations': nextInput = await this.runToolStep(outcome, completed); stops = 0; continue; … }` | A state-machine class or transition table | DEC-001 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the `activeTurn` fallback "just in case" | Caution | Rejected | Required `turnId` |
| Keep `toolInvocationBatches` for debugging | — | Rejected | Removed |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Characterization first (AC-003), on unchanged code.** Add `tests/integration/agent/agent-loop-event-sequence.test.ts` with a scripted LLM. It records ordered segment events, status events, notifier calls (token usage, errors), memory ingestion calls and working-context results for these scenarios:
   - final text answer;
   - one tool cycle;
   - output-limit recovery (tool cut, then success);
   - interrupt mid-stream;
   - provider error;
   - `compaction_blocked` then retry;
   - after-final compaction requested.
   
   Snapshot them. They must pass on the base commit.
2. Extract `LlmResponseStreamCollector` (D-01); `LlmPhase` uses it. Golden tests stay green.
3. Extract `LlmCallCompaction` (D-02). Golden plus compaction suites stay green (CON-001..CON-006).
4. Restructure `LlmPhase.run` into the named steps (D-03, D-04).
5. Move batch ownership to the runner; remove dead state and fallback (D-05).
6. Runner outcome handlers and tool step (D-06).
7. Docs (D-08). Full suites; gated live suites through the test vault (AC-002).

Each step is a separate commit with the golden tests green.

## Key Tradeoffs

- **The collector owns the handler** (rather than `LlmPhase` owning both) so that stream-side lifecycles finalize in one place. `LlmPhase` cannot then emit segments directly: accepted.
- **Batch start moves to the runner.** This gives one owner. The registration point moves slightly later, but no observable difference exists (D-05; asserted by AC-003).
- **`ToolPhase` untouched** (DEC-002).

## Risks

- RSK-002: subtle ordering drift. Mitigated by golden tests written before any change, plus step-wise commits.
- Compaction regressions (CON-002/004). Mitigated by keeping `bindRequestPrefix` immediately before `executeIfAuthorized`, by after-final compaction running only after the collector completes, and by the 1c0ac46f suites.

## Guidance For Implementation

- Do not change `LlmPhaseOutcome`, `LlmPhase.run`'s signature, `ToolPhase`, the stream handler's API, `conversation-request.ts`, `LlmPhaseSummaryPort` or `LLMRequestAssembler`.
- Keep every `throwIfAborted`/`runAbortable`/`iterateAbortable` kind string and its relative order.
- **Tests:**
  - `pnpm -C autobyteus-ts test` and the server suites (TESTING.md);
  - the golden suite (step 1);
  - collector unit tests (each finalization mode, reasoning segment ids and metadata, idempotency);
  - gated live suites (output-limit recovery, Anthropic prompt caching, compaction cache reuse), with credentials imported into a test-owned vault from `/Users/normy/.autobyteus/server-data/.env` via `pnpm secrets:import` (never the user's app database).
