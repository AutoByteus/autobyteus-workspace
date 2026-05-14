# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/design-spec.md`
- Code Review Report Reviewed For Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/review-report.md`
- Current Review Round: 18
- Trigger: Addendum review after the user identified that the earlier `MemoryManager.finalizeInterruptedTurn(...)` name leaked turn-lifecycle language into the memory boundary. The design now uses memory-native APIs: `MemoryManager.ingestInterruptionMarker(...)` and `MemoryManager.refreshWorkingContextProjection(...)`.
- Prior Review Round Reviewed: Round 17 approved the memory-ownership rework conceptually, but used the now-rejected `finalizeInterruptedTurn(...)` method name in the review report.
- Latest Authoritative Round: 18
- Current-State Evidence Basis: Architecture-reviewer skill and shared design principles reloaded. Requirements, investigation notes, design spec, current code-review report, and current source greps were inspected, especially `MemoryManager.ingestInterruptionMarker(...)`, `MemoryManager.refreshWorkingContextProjection(...)`, `WorkingContextSnapshot`, `AgentRuntimeState`, `AgentTurnRunner`, `AgentTurn`, `LLMRequestAssembler`, CDF-013, DS-011, FR-019, AC-016, INV-013, INV-014, and Work Package 4A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1-6 | Earlier iterative reviews/addenda | Earlier blocker set resolved by Round 6 | N/A | Prior result was Pass | No | Superseded by later reviews. |
| 7 | Fresh independent architecture review | Rechecked design from first principles | AR-B-005 | Fail / NEEDS DESIGN REWORK | No | Approval routing into active turn input was incomplete. |
| 8 | AR-B-005 rework review | AR-B-005 and previous blockers | None | Pass | No | Approval route completed. |
| 9 | Second-stage inbox/scheduler/TurnToolInputPort refinement | Rechecked unified inbox model | None blocking | Pass | No | Superseded by later event-centric design. |
| 10 | Phase naming symmetry addendum | Rechecked phase naming | None blocking | Pass | No | `LlmPhase` / `ToolPhase` approved. |
| 11 | External event boundary correction | Rechecked outbound model | None blocking | Pass | No | `AgentExternalEventNotifier` replaced `AgentOutbox`. |
| 12 | Consumer-event parity addendum | Rechecked inter-agent/system consumers | None blocking | Pass | No | CDF-010A / DS-010 approved. |
| 13 | Event-centric inbound rework | Rechecked wrapper-removal target | None blocking | Pass | No | `AgentEventInbox` / scheduler / event-centric target approved. |
| 14 | CR-019 handler naming rework | Rechecked event-inbox dispatch naming and guardrails | None blocking | Pass | No | `InboxEventHandler` naming resolved CR-019. |
| 15 | AgentTurn encapsulation review | Rechecked `AgentTurn`, runner, and active task ownership | AR-B-006 | Fail / NEEDS DESIGN REWORK | No | Active turn execution/run handle needed to be encapsulated by `AgentTurn`. |
| 16 | AR-B-006 rework review | AR-B-006 | None blocking | Pass / APPROVED FOR IMPLEMENTATION | No | `AgentTurn` aggregate boundary approved. |
| 17 | Interrupted-turn memory ownership rework | AR-B-006 and previous final-state guardrails | None blocking | Pass / APPROVED FOR IMPLEMENTATION | No | `MemoryManager` owns interrupted-turn retention/projection; superseded by Round 18 naming refinement. |
| 18 | Memory-native API naming addendum | Round 17 memory ownership pass | None blocking | **Pass / APPROVED FOR IMPLEMENTATION** | Yes | `ingestInterruptionMarker(...)` and `refreshWorkingContextProjection(...)` replace the turn-lifecycle-sounding `finalizeInterruptedTurn(...)` name. |

## Reviewed Design Spec

Latest authoritative memory/interrupt shape:

```text
interrupt = execution control, not memory erase

accepted / emitted / executed before interrupt
  -> committed history
unsafe incomplete provider-native continuation
  -> fenced / summarized / not continued
```

Approved ownership split:

```text
AgentRuntime / AgentTurn / AgentTurnRunner / LlmPhase / ToolPhase
  own execution interruption, phase cancellation, settlement outcome, and late-result fencing

MemoryManager / WorkingContextSnapshot
  own raw trace retention, working-context state, compaction/snapshot consistency,
  interrupted-turn marker/projection, and future provider-safe prompt context

AgentExternalEventNotifier / stream/UI
  own external observable projection of already-published facts
```

Approved CDF-013 target:

```text
Accepted user input / emitted assistant facts / completed tool facts
  -> MemoryManager raw trace history
  -> AgentTurn interrupted outcome
  -> MemoryManager.ingestInterruptionMarker({ scope: { kind: 'agent_turn', id: turnId }, reason })
  -> MemoryManager.refreshWorkingContextProjection({ mode: 'provider_safe', fenceScope: { kind: 'agent_turn', id: turnId } })
  -> provider-safe working-context projection with interruption marker
  -> next LLM request uses remembered interrupted history
```

The design explicitly rejects the old normal-interrupt shape:

```text
AgentTurnRunner catches interruption
  -> restore working context to pre-turn checkpoint
```

This is the correct direction. It keeps the memory/history authoritative boundary in `MemoryManager` and prevents UI/raw/event history from diverging from future prompt context.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current task posture | Pass | Design spec classifies this as a larger behavior/refactor with boundary/ownership issues, including memory ownership on interrupt. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Investigation notes trace current code: `startActiveTurn` creates a working-context checkpoint, runner interruption calls `restoreWorkingContextForInterruptedTurn`, and `MemoryManager.restoreWorkingContextTurnCheckpoint` resets future prompt context despite raw/UI history retaining facts. | None. |
| Refactor needed now / no refactor needed decision is explicit | Pass | FR-019, CDF-013, DS-011, INV-013/014, and Work Package 4A require removing whole-turn restore and adding memory-owned interrupted-turn projection. | None. |
| Refactor decision is supported by concrete design sections | Pass | Requirements, investigation notes, data-flow spines, ownership maps, boundary rules, contracts, invariants, file mapping, and work packages all name `MemoryManager` as the owner. | None. |

## Prior Findings Resolution Check

| Prior Round / Report | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Round 15/16 | AR-B-006 | Blocking Design Impact, resolved in Round 16 | Still resolved | `AgentRuntimeState` remains selector/router only; `AgentTurn` owns private execution handle; current design still forbids `activeTurnTask`, `activeRunner`, and `registerActiveTurnTask(...)`. | Not reopened. |
| New memory rework | Memory ownership issue | Design-impact rework requested | Resolved in design | `MemoryManager.ingestInterruptionMarker(...)` appends memory history and `MemoryManager.refreshWorkingContextProjection(...)` owns provider-safe prompt projection; normal interrupt must not restore working context to pre-turn checkpoint. | Ready for implementation. |
| Code Review Round 27 / Review Round 14 | CR-019 | Design Impact | Still resolved | Event-inbox dispatch targets remain `InboxEventHandler`s under `agent/event-inbox/handlers`. | Not reopened. |
| Round 13 | Event-centric target | Approved | Still accepted | Final inbound model remains `AgentEventInboxEntry -> AgentEventScheduler -> InboxEventHandler`, with typed runtime events as canonical payloads. | Not reopened. |
| Round 11-12 | `AgentExternalEventNotifier` / consumer parity | Approved | Still accepted | `AgentExternalEventNotifier` remains external observable boundary; `AgentOutbox` remains rejected. | Not reopened. |
| Earlier | Legacy handler-chain blockers | Resolved | Still accepted | Runner/phases own normal turn flow; old normal-flow handlers remain removed. | Not reopened. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CDF-001 | Runtime bootstrap | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-002 | External event to turn | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-003 | Input processing to LLM leg | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| CDF-004 | LLM phase | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-005 | Final response/output | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-006 | Tool invocation phase | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-007 | Tool result continuation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-008 | Interrupt active turn | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-009 | Pending approval response | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-010 | External observable-event publication | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-010A | Inter-agent/system communication projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-011 | Terminal shutdown | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-012 | External/async tool result delivery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| CDF-013 | Interrupted-turn memory projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

### Focused Spine Notes

- DS-001/CDF-008 remain coherent: side-band interrupt targets `AgentTurn.executionScope`, active phases abort/abandon, the turn settles interrupted, and runtime stays reusable.
- DS-002 now correctly splits LLM-phase interruption from memory policy: `LlmPhase` closes/interruption-finalizes streaming protocol and skips normal completed-assistant ingestion; memory-owned projection handles any already emitted facts safely.
- DS-003 preserves completed/executed tool facts while still suppressing unsafe same-turn continuation and fencing late results.
- DS-006/DS-007 keep active-turn execution and tool-port state inside `AgentTurn`/`TurnToolInputPort` without moving memory rollback into the turn aggregate.
- DS-008/DS-009 still route approval/result events through event inbox, scheduler, thin handlers, runtime-state active-turn identity routing, and `AgentTurn` posting methods.
- DS-010 remains a return/event spine through `AgentExternalEventNotifier`; no outbox resurrection is introduced.
- DS-011/CDF-013 is complete: committed facts enter memory/history, interrupted outcome triggers memory marker ingestion and projection refresh, future working context is provider-safe, and next LLM requests read the memory-owned projection.

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent runtime / interrupt control | Pass | Pass | Pass | Pass | Execution control only; does not own memory rollback. |
| Agent turn aggregate | Pass | Pass | Pass | Pass | Owns execution internals and settlement, not working-context projection. |
| Agent turn runner / phases | Pass | Pass | Pass | Pass | Report outcomes/facts and use memory APIs; do not edit snapshots directly. |
| MemoryManager / working context | Pass | Pass | Pass | Pass | Correct authoritative owner for raw trace retention and future prompt projection. |
| Agent event inbox / scheduler / handlers | Pass | Pass | Pass | Pass | Existing approved event-centric inbound architecture is preserved. |
| AgentExternalEventNotifier | Pass | Pass | Pass | Pass | External observable projection remains separate from memory and control flow. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Interrupted-turn memory projection | Pass | Pass | Pass | Pass | `MemoryManager.ingestInterruptionMarker(...)` plus `MemoryManager.refreshWorkingContextProjection(...)` are the right memory-native operations; an optional memory-owned projector remains acceptable for complex projection logic. |
| Provider-safe working-context projection | Pass | Pass | Pass | Pass | Projection is behind memory boundary; `LLMRequestAssembler` remains a reader. |
| Turn interruption outcome | Pass | Pass | Pass | Pass | `AgentTurnRunner` returns `TurnOutcome`; `AgentTurn` records settlement; memory consumes outcome metadata. |
| Active turn execution handle | Pass | Pass | Pass | Pass | Still private to `AgentTurn`; not reopened. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentTurn` | Pass | Pass | Pass | Pass | Pass | Execution aggregate only, no memory checkpoint/restore role. |
| `MemoryManager.ingestInterruptionMarker` input | Pass | Pass | Pass | Pass | Pass | Scope metadata anchors the memory marker without implying turn lifecycle ownership. |
| `MemoryManager.refreshWorkingContextProjection` input | Pass | Pass | Pass | Pass | Pass | Projection/fence options are memory-native and do not control turn execution. |
| Working-context interrupted-turn marker/projection | Pass | Pass | Pass | Pass | Pass | Examples distinguish safe summary/marker from invalid native tool-call fragments. |
| Raw memory trace history | Pass | Pass | Pass | Pass | Pass | Append-only committed facts are separate from provider-safe working-context projection. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Whole-turn working-context restore on normal interrupt | Pass | Pass | Pass | Pass | Replaced by memory-native interruption marker ingestion plus provider-safe projection refresh. |
| `AgentTurn` / `AgentRuntimeState` working-context checkpoint/restore policy | Pass | Pass | Pass | Pass | Explicitly forbidden for normal interrupt. |
| Runtime-state peer active task/run concept | Pass | Pass | Pass | Pass | Still rejected. |
| `AgentOutbox` / duplicate publisher wrapper | Pass | Pass | Pass | Pass | Still rejected. |
| Event-inbox `processors/` / `*EventProcessor` target naming | Pass | Pass | Pass | Pass | Still rejected in favor of `InboxEventHandler`. |
| Old normal-flow handler chain | Pass | Pass | Pass | Pass | Still removed from normal turn flow. |

## File Responsibility Mapping Verdict

| File / Area | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/memory-manager.ts` | Pass | Pass | Pass | Pass | Owns interruption marker ingestion and provider-safe working-context projection. |
| optional `autobyteus-ts/src/memory/working-context-interrupted-turn-projector.ts` | Pass | Pass | Pass | Pass | Optional helper stays under memory if projection logic grows. |
| `autobyteus-ts/src/agent/agent-turn.ts` | Pass | Pass | Pass | Pass | Must not own working-context checkpoint/restore policy. |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Pass | Pass | Pass | Pass | Active-turn selector/router only; no memory rollback. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Pass | Pass | Pass | Pass | Reports interruption outcome; does not reconstruct working context. |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Pass | Pass | Pass | Pass | Reader of `MemoryManager.getWorkingContextMessages()`, not memory policy owner. |
| `autobyteus-ts/src/agent/streaming/handlers/*` | Pass | Pass | Pass | Pass | May finalize open segments as interrupted; not turn-control owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentTurnRunner` / `AgentTurn` -> memory-native marker/projection APIs | Pass | Pass | Pass | Pass | Reporting outcome/scope metadata to `ingestInterruptionMarker(...)` and `refreshWorkingContextProjection(...)` is allowed; direct snapshot restore/editing is forbidden. |
| `MemoryManager` -> working-context projection | Pass | Pass | Pass | Pass | Owns prompt projection and provider-safe fencing. |
| `LLMRequestAssembler` -> `MemoryManager.getWorkingContextMessages()` | Pass | Pass | Pass | Pass | Assembler reads already-projected context only. |
| `AgentRuntimeState` -> active turn | Pass | Pass | Pass | Pass | No memory restore or runner-task peer state. |
| Event stream/UI -> observable history | Pass | Pass | Pass | Pass | Observes facts; does not decide future memory projection. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemoryManager` | Pass | Pass | Pass | Pass | Raw trace + working-context projection authority is clear. |
| `AgentTurn` | Pass | Pass | Pass | Pass | Execution aggregate only. |
| `AgentRuntimeState` | Pass | Pass | Pass | Pass | Active-turn selector only. |
| `AgentTurnRunner` | Pass | Pass | Pass | Pass | Algorithm/outcome owner; memory policy stays out. |
| `AgentExternalEventNotifier` | Pass | Pass | Pass | Pass | External observable boundary only; not resurrected as `AgentOutbox`. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MemoryManager.ingestInterruptionMarker(...)` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.refreshWorkingContextProjection(...)` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.getWorkingContextMessages()` | Pass | Pass | N/A | Low | Pass |
| `AgentTurn.waitForSettlement(...)` | Pass | Pass | Pass | Low | Pass |
| `AgentTurnRunner.run(...) -> TurnOutcome` | Pass | Pass | Pass | Low | Pass |
| `AgentRuntime.interrupt(...)` | Pass | Pass | Pass | Low | Pass |
| `AgentTurn.postToolApproval(...)` / `postToolResult(...)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/` | Pass | Pass | Low | Pass | Correct home for interrupted-turn projection. |
| optional `memory/working-context-interrupted-turn-projector.ts` | Pass | Pass | Low | Pass | Optional split is justified only if projection grows. |
| `agent/agent-turn.ts` | Pass | Pass | Low | Pass | Explicitly excludes memory rollback/projection. |
| `agent/loop/agent-turn-runner.ts` | Pass | Pass | Low | Pass | Algorithm only. |
| `agent/events/notifiers.ts` | Pass | Pass | Low | Pass | Observable publication only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Future LLM context ownership | Pass | Pass | N/A | Pass | Existing `MemoryManager` already feeds `LLMRequestAssembler`; it should own projection. |
| Raw trace retention | Pass | Pass | N/A | Pass | Existing memory subsystem is the right append-only history owner. |
| External observable history | Pass | Pass | N/A | Pass | Existing notifier/event-stream/UI path remains consumer projection. |
| Provider-safe partial protocol fencing | Pass | Pass | Pass | Pass | Optional memory projector is justified if needed for complexity. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Pre-turn working-context restore on normal interrupt | No final retention | Pass | Pass | Must be removed for normal interrupt; bootstrap/snapshot restore remains lifecycle only. |
| `AgentOutbox` wrapper | No | Pass | Pass | Still rejected. |
| Event-inbox processor naming | No | Pass | Pass | Still rejected. |
| Old handler-chain turn control | No | Pass | Pass | Still rejected. |
| Active-turn task peer state | No | Pass | Pass | Still rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence / Work Package Is Realistic? | Temporary Seams Rejected As Final? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Work Package 4A — Memory-owned interrupted-turn projection | Pass | Pass | Pass | Pass |
| AgentTurn aggregate cleanup | Pass | Pass | Pass | Pass |
| Event-centric inbound architecture | Pass | Pass | Pass | Pass |
| Outbound notifier preservation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider-safe interrupted user-only turn | Yes | Pass | Pass | Pass | Example preserves user request plus interruption marker. |
| Provider-safe interrupted tool turn | Yes | Pass | Pass | Pass | Example summarizes completed tool fact without invalid partial native tool protocol. |
| Forbidden pre-turn context restore | Yes | Pass | Pass | Pass | Bad shape is explicitly named. |
| Forbidden invalid native tool protocol fragment | Yes | Pass | Pass | Pass | Bad partial tool-call sequence is explicit. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | UC-009/FR-019/AC-016 and CDF-013/DS-011 cover the reproduced memory divergence. | None before implementation. | Closed for design. |
| Settlement/projection ordering | If active turn clears before `MemoryManager.ingestInterruptionMarker(...)` and `MemoryManager.refreshWorkingContextProjection(...)` complete, a parked next turn could start against stale context. | Implementation should make marker ingestion and projection refresh part of settlement completion before `waitForSettlement()` resolves or before scheduler wake/active-turn clear permits the next turn. Design already implies this via the bounded spine and `already-projected` wording; enforce in code review/tests. | Advisory. |
| Source of partial assistant facts | Some emitted assistant facts may currently exist only as stream/event data, not durable memory trace. | Implement only provider-safe committed/available assistant facts; do not invent content. If partial fact capture is added, keep ingestion/projection memory-owned. | Advisory. |

## Review Decision

- **Pass / APPROVED FOR IMPLEMENTATION**.

The memory-ownership rework is architecturally sound. It correctly treats interrupt as execution control and assigns history/projection policy to `MemoryManager`, the existing owner of raw traces and future LLM working context. The design prevents the reported divergence by removing whole-turn working-context restore on normal interrupt and adding CDF-013/DS-011 for provider-safe interrupted-turn projection.

Earlier final-state rules remain intact: no temporary adapters/middle-state handler chains, no `AgentOutbox`, event-inbox dispatch targets remain `InboxEventHandler`s, no peer active-turn task state outside `AgentTurn`, no old `WorkerEventDispatcher` normal turn loop, and no normal-interrupt pre-turn working-context restore.

## Findings

None blocking.

### Non-blocking implementation advisories

1. Make memory marker ingestion and projection refresh part of interrupted settlement before the next turn can be scheduled. A next LLM request must read the already-refreshed provider-safe projection.
2. Remove normal-interrupt calls to `restoreWorkingContextForInterruptedTurn(...)` / `restoreWorkingContextTurnCheckpoint(...)`, but do not break bootstrap/lifecycle working-context snapshot restore.
3. Keep `AgentTurn` and `AgentTurnRunner` from directly editing `WorkingContextSnapshot`; they may report turn outcome to `MemoryManager.ingestInterruptionMarker(...) / refreshWorkingContextProjection(...)` only.
4. Preserve CDF-007: completed tool facts may be remembered, but unsafe same-turn tool continuation to LLM remains suppressed after interrupt.
5. When retaining partial assistant/tool facts, keep provider validity first: summarize/mark interruption rather than preserving invalid native tool-call fragments.

## Classification

- No blocking `Design Impact`, `Requirement Gap`, or `Unclear` findings remain.
- The interrupted-turn memory ownership issue is resolved at the design level.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The main implementation risk is ordering: if memory marker ingestion/projection refresh occurs after active-turn clear/scheduler wake, a parked message could start before the context projection is refreshed. Tests should verify the next LLM request includes the interrupted turn marker and accepted user input.
- Provider-native tool-call protocols are strict; projection code must prefer safe summaries/markers over invalid partial assistant/tool-call sequences.
- Compaction/snapshot interactions need focused coverage so interrupted-turn projection remains durable and does not corrupt later context restoration.

## Latest Authoritative Result

- Review Decision: **Pass / APPROVED FOR IMPLEMENTATION**
- Notes: Latest authoritative target uses `AgentEventInbox` / `AgentEventScheduler` / `InboxEventHandler`s / `AgentTurn` aggregate / `AgentTurnRunner` algorithm / `LlmPhase` / `ToolPhase` / `TurnToolInputPort` / `TurnExecutionScope` / real processor pipelines / `AgentExternalEventNotifier` / `MemoryManager.ingestInterruptionMarker(...) / refreshWorkingContextProjection(...)` for interrupted-turn memory projection. Round 18 supersedes Round 17 and approves the memory-native API naming refinement.
