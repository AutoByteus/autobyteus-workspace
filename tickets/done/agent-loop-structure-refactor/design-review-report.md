# Design Review Report — agent-loop-structure-refactor

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/requirements-doc.md` (Approved 2026-10-11; SR-001 text, DEC-001 = named outcome handlers, DEC-002 = ToolPhase assess only)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: `task-brief.md`, `approval-request.md`, `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: `SR-003` (SR-001 approved basis; SR-002 evidence)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Solution Designer handoff "Architecture Design Complete" (Medium / High), 2026-10-11
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `codex/agent-loop-structure-refactor` @ `beb6b3b49` (no source changes yet). Code read:
  - `agent/loop/llm-phase.ts` (full `run()`, l.65-445);
  - `agent/loop/agent-turn-runner.ts` (full);
  - `agent/agent-turn.ts` (full, including `startToolInvocationBatch`, `postToolApproval`, `postToolResult`);
  - `agent/loop/turn-tool-input-port.ts` (registration and post validation);
  - `agent/streaming/handlers/llm-streaming-response-handler.ts` (`buildInvocation` turnId);
  - `memory/raw-trace-ingestion.ts` (`normalizeNativeToolCallBatch` turnId use);
  - `agent/loop/llm-phase-compaction.ts`;
  - `agent/pipelines/llm-response-pipeline.ts` and its unit test;
  - `autobyteus-ts/package.json` and `TESTING.md`.
  
  Greps covered batch APIs, `toolInvocationBatches`, `processFinalResponse` callers (src, tests, server) and the pipeline export.

## Routing Classification Review

- Task size: `Medium` (about 8 files inside `autobyteus-ts/src/agent`, no provider/server/web change). Confirmed.
- Architectural risk: `High`. Confirmed: the ownership of the main agent-loop path is restructured, the batch-lifecycle owner moves, and subtle ordering (fences, commit/rollback, segments, CON-002/CON-004) must be preserved across every AutoByteus-runtime turn.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. This is a pure structural refactor (REQ-001 zero observable change), keeping the layering with no `AgentLoop` (REQ-002). The approved structural outcomes are REQ-003..REQ-006 and REQ-008, constrained by CON-001..CON-006, the interrupt fences, rollback-vs-commit and the output-limit recovery contract.
- Relevant existing behavior and evidence confirmed: Yes. Every structural fact the design relies on was re-verified on `beb6b3b49`:
  - the concerns (a)–(g) in `run()`;
  - batch start in `LlmPhase` (l.311) and clear in the runner (l.122-125);
  - the re-derivation at l.411;
  - the dead `toolInvocationBatches` (only one test reads it);
  - the `activeTurn` fallback, whose single caller always passes `turnId`;
  - `bindRequestPrefix` immediately before `executeIfAuthorized('after_final_response')`;
  - the summary port built with `toolSchemas`;
  - the stream started with `conversationRequestKwargs`/`conversationRequestOptions`.
- Scope guardrail confirmed: Yes. The design touches only `agent/loop`, `agent-turn.ts`, `llm-response-pipeline.ts`, tests and the doc. `ToolPhase`, the stream handler API, `conversation-request.ts`, `LlmPhaseSummaryPort` and `LLMRequestAssembler` are all unchanged.
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable: N/A (none)
- Remaining material ambiguity: None

| Behavior ID | Kind | Design Alignment | Trigger / Contract And Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass (settlement orders in Concrete Examples match l.261-321 and l.322-386; fences kept; D-05 window verified, P-001) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass (CON-001..CON-006 check below) | Confirmed | — |

### Compaction invariants (requested focus)

| Constraint | Design treatment | Verdict |
| --- | --- | --- |
| CON-001 one conversation request | `LlmPhase` still calls `streamMessages(request.outboundMessages, conversationRequestKwargs(agentId, request.tools), conversationRequestOptions({...}))`. The collector receives only the iterable. The summary port is constructed "exactly as today" | Pass |
| CON-002 prefix-binding order | The assembler is unchanged (binds before pre-request compaction and before the checkpoint). `executeAfterFinalResponse` does `bindRequestPrefix(requestTools)` immediately before `executeIfAuthorized('after_final_response')` (DS-004) | Pass |
| CON-003 one tools source | `requestTools = request.tools` for binding. The summary port still gets `toolSchemas`, which is the array passed into `prepareRequest` (today's shape, unchanged) | Pass |
| CON-004 LLM idle during compaction | After-final execution runs only on a final outcome without tool invocations, after `collector.consume` and settlement, as today (l.414-439) | Pass |
| CON-005 append-only history | No memory-write change; ingestion points are unchanged | Pass |
| CON-006 compaction usage events | Summary port and notifier wiring unchanged | Pass |

### Interrupt fences (requested focus)

The Guidance requires every `throwIfAborted`/`runAbortable`/`iterateAbortable` kind string to be kept in its relative order. The Concrete Examples give the exact normal and output-limited orders, which match today's code:

- normal: `post_llm_stream` after handler finalize and reasoning end; `llm_tool_intents` or `llm_assistant_response` before ingestion; commit last;
- output-limited: `post_llm_stream`, then commit, then ingest text;
- the runner's fences (`turn_loop`, `llm_phase_ready_status`, `post_llm_phase`, `compaction_recovery_wait`, `pending_tool_invocation`, `post_tool_phase`, `post_tool_result_pipeline`, `pre_tool_terminal_lifecycle`, `post_tool_terminal_lifecycle`, `post_tool_continuation_pipeline`, `tool_continuation_status`, `pre_/post_llm_response_pipeline`) are moved verbatim into the named handlers.

Pass. Note R-2: the `llm_stream_finalize` fence is not named in D-03; it must stay after stream iteration and before finish classification.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked | Internally Complete | Consistent With Core | Status/Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `task-brief.md` | Pass | Pass | Pass | Pass | Pass (request context) | — |
| `approval-request.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | design-spec "Task Design Health Assessment" | — |
| Root cause explicit and evidence-backed | Pass | Responsibility drift (`run()` concerns a–g) plus boundary/ownership (split batch lifecycle), both verified in code | — |
| Refactor decision explicit | Pass | Yes (user request; evidence holds) | — |
| Reflected in concrete sections | Pass | D-01..D-06, D-08; removal plan; ToolPhase deferral reasoned (D-07) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | Ownership | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary turn dispatch | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary LLM call | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Bounded stream consumption | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Bounded after-final compaction | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `LlmPhase.run` | Pass | Pass | Pass | Pass | The runner never reaches the collector or `LlmCallCompaction` |
| `LlmResponseStreamCollector` | Pass | Pass | Pass | Pass | `LlmPhase` neither feeds the handler nor emits reasoning segments |
| `AgentTurn` | Pass | Pass | Pass | Pass | Only the runner mutates the batch |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runner → `LlmPhase`, `ToolPhase`, pipelines, turn | Pass | Pass | Pass | Pass | — |
| `LlmPhase` → collector, compaction, assembler, conversation-request, memory | Pass | Pass | Pass | Pass | — |
| Collector → handler, segments, response types (never memory or turn) | Pass | Pass | Pass | Pass | Gets the execution scope for fences only |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `LlmPhase.run` / `LlmPhaseOutcome` (unchanged) | Pass | Pass | Pass | Low | Pass |
| Collector `consume`, finalization modes, getters, `buildResponse` | Pass | Pass | Pass | Low | Pass (see R-1 on per-path response shapes) |
| `LlmCallCompaction.create` / `evaluateAfterResponse` / `executeAfterFinalResponse` | Pass | Pass | Pass | Low | Pass |
| `processFinalResponse(..., { isError?, turnId })` (`turnId` required) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Text/tool segments | Pass | Pass (handler reused, owned by the collector) | N/A | Pass | — |
| Compaction evaluation | Pass | Pass (`evaluateLlmPhaseCompaction` reused) | N/A | Pass | — |
| Stream consumption | Pass | Pass | Pass (owns accumulation state, the reasoning lifecycle and the handler; not empty indirection) | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Serves Right Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent/loop` | Pass | Pass | Pass | Pass | No new folder |
| `agent` (turn, pipelines) | Pass | Pass | Pass | Pass | Dead-code removal only |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Reasoning-segment end (3 inline variants) | Pass | Pass (collector-private) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentTurn` | Pass | Pass (dead array removed) | Pass | N/A | Pass | — |
| `LlmPhaseOutcome` | Pass | Pass | Pass | N/A | Pass | Unchanged |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm-response-stream-collector.ts` (Add) | Pass | Pass | Pass | Pass | — |
| `llm-phase.ts` | Pass | Pass | Pass | Pass | — |
| `llm-phase-compaction.ts` (extended to `LlmCallCompaction`) | Pass | Pass | Pass | Pass | Keeps the existing compaction helper home |
| `agent-turn-runner.ts`, `agent-turn.ts`, `llm-response-pipeline.ts`, doc, tests | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent/loop/*` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentTurn.toolInvocationBatches` | Pass | N/A | Pass | Pass | Only reference outside src is `tests/unit/agent/tool-invocation.test.ts:57`, which needs a structural update |
| `LLMResponsePipeline` `activeTurn` fallback (2 sites) | Pass | Pass | Pass | Pass | The only src caller passes `turnId`; the unit test already passes `turnId`; no server caller. `autobyteus-ts` is a workspace package (exported via `pipelines/index.ts`, but there are no external callers) |
| Inline closures and stream loop | Pass | Pass | Pass | Pass | — |
| `LlmPhase` batch start and re-derivation | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compat Retained | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Moved internals | No (no re-exports) | Pass | Pass | — |

## Persisted-Data Transition Verdict

N/A. No stored shape, trace type or content changes (REQ-001 requires identical memory writes).

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Golden tests first, then steps 2–7 with one commit each | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run()` shape | Yes | Pass | Pass | Pass | — |
| Settlement orders (normal, output-limited) | Yes | Pass | Pass | Pass | Matches the code line for line |
| Runner dispatch | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### P-001 — The registration window moved by D-05 could let something observe a missing batch

The question: moving `turn.startToolInvocationBatch` from inside `LlmPhase` (l.311) to the start of the runner's tool step, could anything observe the absent batch between the two points?

- Related approved requirement: REQ-001, REQ-004; interrupt fences
- Relevant behavior IDs: BEH-001
- Initiating basis kind: `User` + `System`
- Candidate triggers, each a real supported action:
  - an interrupt (the user clicks Stop);
  - a tool approval (the user approves a tool);
  - an external tool result arriving between `LlmPhase` ingesting the tool response and the runner's tool step.
- Forward path, verified in code:
  - `startToolInvocationBatch` does three things:
    - It sets `invocation.turnId = turnId`. This is a no-op, because the handler builds every invocation with the same `this.turnId` (`llm-streaming-response-handler.ts:113-120`) and `normalizeNativeToolCallBatch` reads `invocation.turnId ?? turnId`.
    - It sets `activeToolInvocationBatch`. Only the runner's clear (l.122) and `AgentTurn.postToolResult` read it.
    - It registers ids with `TurnToolInputPort`, whose only effect is to let a post pass `validatePost`.
  - An approval is accepted only for an invocation in `pendingToolApprovals`. That map is populated by `ToolPhase.storePendingToolInvocation`, which runs after the new registration point.
  - A tool result is accepted only when a result waiter exists. Waiters are created only inside `ToolPhase`.
  - An interrupt in the window throws at `llm_compaction` (inside `LlmPhase`) or at `post_llm_phase`. The runner's interruption path uses memory (`finalizePendingToolCallsForTurn`), not the batch. `interrupt()` closes the port and clears the known ids either way.
  - The only operation that throws inside `startToolInvocationBatch` (a turnId mismatch) now sits outside `LlmPhase`'s catch, but it cannot happen for handler-built invocations.
- Lifecycle consequence: none observable.
- Reachability: `Not Reachable`. No supported action can observe the difference.
- Review consequence: the D-05 timing argument holds, with no machinery required. AC-003 asserts the ordering.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, the design is implementable on `beb6b3b49`, and no in-scope machinery depends on an unsupported premise.

## Findings

None.

## Classification

N/A (Pass)

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks And Implementation Notes (non-blocking)

- **R-1, per-path response shapes.** `buildResponse()` is described as "today's normal-path shape", but the output-limited settlement builds `CompleteResponse({ content, usage, finish })` (l.284), with no reasoning, media or native turn. The failed path and the interrupted partial also use their own shapes (l.337-341, l.384). Keep each path's exact shape: give the collector a path-specific builder, or build the response in `LlmPhase` from the getters. Existing LlmPhase unit tests may assert these shapes (AC-001: assertions unchanged).
- **R-2, `llm_stream_finalize` fence.** It is not named in D-03. It must stay after stream iteration and before finish classification and the `buildResponseStopError` throw, either at the end of `collector.consume` or as `LlmPhase`'s first step after consume.
- **R-3, finalization idempotency.** `abandonInterrupted`/`abandonFailed` can follow `completeNormally` (an interrupt at `post_llm_stream`, `llm_tool_intents` or `llm_assistant_response`, or an ingestion error). They must then emit nothing: the handler and the reasoning segment are already closed, exactly as today's `streamFinalized`/`currentReasoningPartId` guards behave. Cover this in collector unit tests and, ideally, add one golden scenario: interrupt at `post_llm_stream` after reasoning was streamed.
- **R-4, golden snapshot determinism.** Segment ids (`segment_<uuid>:reasoning_<uuid>`, handler ids) and timestamps are random. Normalize them in the golden comparison, but keep ordering and the per-segment identity relations.
- **R-5, test command.** `autobyteus-ts/package.json` `test` is a stub that exits 1. Use the TESTING.md command, `pnpm -C autobyteus-ts exec vitest run tests/unit`, plus the integration folders, instead of `pnpm -C autobyteus-ts test` as written in AC-001 and the Guidance.
- **R-6, runtime settings.** Pass the single `CompactionRuntimeSettingsResolver` and settings that `LlmPhase` uses for `requestCapacity` into `LlmCallCompaction.create`, rather than resolving again. This is not observable, but it keeps one settings snapshot per call.
- **R-7, output-limit counter reset.** In the `switch`, reset the consecutive-stop counter for `compaction_blocked` as well as for `final` and `tool_invocations`. Today the reset precedes the `compaction_blocked` branch.
- **RSK-002.** Ordering drift is the main residual risk. It is mitigated by golden tests written first and by step commits. Suggested extra golden scenarios: output-limit exhaustion (4 stops) and a `content_filter` stop error.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 Not Reachable, so no machinery or finding)
- Notes: Implement in the stated sequence: golden tests on unchanged code first, then one commit per step with the golden tests green, and AC-002 gated live suites through the test-owned vault.
