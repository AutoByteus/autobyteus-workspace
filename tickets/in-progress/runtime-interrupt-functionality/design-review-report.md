# Architecture Review Report — runtime-interrupt-functionality

## Review metadata

- Reviewer: architecture_reviewer
- Review round: Round 19 — memory fact-ingestion vs same-turn continuation addendum
- Date: 2026-05-14
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality`
- Branch: `codex/runtime-interrupt-functionality`
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/design-spec.md`
- Code-review/design-impact context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality/review-report.md`

## Decision

**APPROVED for implementation.**

The latest addendum improves the architecture. It correctly separates:

1. **fact/history ingestion** — owned by `MemoryManager`; from
2. **same-turn LLM continuation** — owned by `AgentTurn`, `AgentTurnRunner`, `ToolPhase`, and the turn execution state machine.

This resolves the earlier risk that interruption-specific memory APIs could leak turn lifecycle semantics into the memory subsystem. The target now uses generic memory operations plus an explicit LLM-safe projection step. This is a stronger and cleaner boundary than both prior alternatives:

- `MemoryManager.finalizeInterruptedTurn(...)` — rejected because memory should not finalize turns.
- `MemoryManager.ingestInterruptionMarker(...)` as the main abstraction — rejected because interruption is not the central memory primitive; committed facts are.

No blocking architecture findings remain in this addendum.

## Scope of this review

This review focused on the latest memory-boundary refinement:

- completed tool results before interrupt are committed facts/history;
- completed tool results must not be fed to the LLM as same-turn continuation after interrupt;
- natural assistant output already emitted/visible is remembered, partial when appropriate;
- unsafe provider-native tool-call fragments are repaired/fenced before the next LLM request;
- `MemoryManager` exposes generic fact-ingestion and projection APIs rather than turn-lifecycle or interruption-specific APIs.

The review also checked consistency with the already-approved final-state architecture:

- event-centric inbound model with `AgentEventInbox`, `AgentEventScheduler`, and thin `InboxEventHandler`s;
- `AgentTurn` aggregate owns private execution handle and turn-local ports/scope;
- `AgentTurnRunner`, `LlmPhase`, `ToolPhase`, typed pipelines, `TurnToolInputPort`, and `TurnExecutionScope` own normal turn flow;
- `AgentExternalEventNotifier` remains the external observable-event projection boundary;
- no `AgentOutbox` wrapper;
- no old `WorkerEventDispatcher` / legacy handler-chain normal turn ownership;
- no `activeTurnTask` / `activeRunner` peer state in runtime state;
- no whole pre-turn working-context restore on normal interrupt.

## Architecture assessment

### 1. Memory ownership boundary

**Pass.**

The design now assigns memory responsibilities to memory-native operations:

- `ingestUserMessage(...)`
- `ingestAssistantResponse(...)`
- `ingestToolIntents(...)`
- `ingestToolResults(...)`
- optional `appendRawTrace(...)`
- `projectWorkingContextForNextLlm(...)`

This follows the Single Responsibility Principle:

- `MemoryManager` stores committed facts and projects prompt context.
- `AgentTurn` / `AgentTurnRunner` / `ToolPhase` decide whether the turn continues or stops.
- `LLMRequestAssembler` reads already-projected context; it does not own interruption repair policy.

The design no longer makes `MemoryManager` a turn lifecycle participant. That is the correct boundary.

### 2. Fact ingestion vs continuation commit

**Pass.**

The key architectural distinction is now explicit:

- A completed tool result can be **remembered** as a fact.
- The same result can be **withheld from same-turn LLM continuation** when the turn was interrupted before continuation.

The `appendToWorkingContext` option is acceptable when interpreted narrowly:

- `appendToWorkingContext: false` must mean “do not append this fact as an immediate provider-native continuation message.”
- It must not mean “do not remember the fact.”

The design states this clearly enough through FR-019 / AC-016 and the memory projection contract.

### 3. Interrupted-turn projection spine

**Pass.**

The DS-011 / CDF-013 spine is now coherent:

```text
accepted user input / emitted assistant facts / completed tool facts
  -> generic MemoryManager fact ingestion / raw trace retention
  -> AgentTurn interrupted outcome stops same-turn continuation
  -> MemoryManager.projectWorkingContextForNextLlm({ mode: 'llm_safe', ... })
  -> provider-safe future working context
  -> next LLM request remembers the interrupted history without invalid tool protocol
```

This spine fixes the reproduced bug class: later LLM context must not behave as if the interrupted request never happened.

### 4. Tool-result scenario from user discussion

**Pass.**

For the concrete scenario:

1. User asks to create a game.
2. LLM emits natural text and a tool call.
3. Tool execution completes and result is fetched.
4. Interrupt happens before the tool result is fed back to the LLM.

The target behavior is now correctly defined:

- accepted user message: retained;
- emitted natural assistant text: retained as assistant history/fact, partial if needed;
- tool intent: retained as observed intent/fact where safe;
- completed tool result: retained as committed fact/raw history;
- same-turn continuation with that tool result: suppressed after interrupt;
- next LLM prompt: built from a repaired LLM-safe projection, not raw invalid tool-call fragments.

This is the right semantic split.

### 5. No whole-turn rollback on normal interrupt

**Pass.**

The design explicitly rejects the previous checkpoint restore behavior for normal interrupt. That is necessary.

A normal interrupt is control-flow cancellation, not history erasure. Restoring the entire pre-turn working context after already accepted/emitted/executed facts creates inconsistent truth between UI/event history and future LLM context. The updated design removes that contradiction.

Terminal `stop()` / shutdown cleanup can remain separate and terminal; that is not changed by this addendum.

### 6. Compatibility with event-centric architecture

**Pass.**

The memory changes do not disturb the approved event-centric architecture:

- inbound commands/events still enter through `AgentEventInbox` and scheduler-selected thin `InboxEventHandler`s;
- interrupt remains side-band through `AgentRuntime.interrupt()` and does not wait behind inbox scheduling;
- tool approval/result events still route through runtime-state identity selection and then into `AgentTurn` / `TurnToolInputPort`;
- observable output remains through `AgentExternalEventNotifier`;
- the external stream/UI projection remains observational and does not advance turn control.

### 7. Data-flow spines reviewed

| Spine | Review result |
|---|---|
| DS-001 / CDF-008 interrupt command to active turn settlement | Pass. Interrupt remains side-band and settles active turn without stopping runtime. |
| DS-002 LLM-phase interruption and partial assistant/memory handling | Pass. Partial/emitted assistant facts are retained when observable/committed; unsafe protocol fragments are fenced. |
| DS-003 tool-phase interruption and late-result fencing | Pass. Completed facts are retained; late/unsafe same-turn continuation is suppressed/fenced. |
| DS-006 / DS-007 active-turn aggregate and tool input port | Pass. Turn internals remain encapsulated in `AgentTurn`; runtime state does not own runner handles. |
| DS-008 approval event routing | Pass. Approval remains event-inbox -> handler -> runtime-state identity check -> `AgentTurn` / `TurnToolInputPort`. |
| DS-009 external/async tool-result routing | Pass. External results route to active turn by identity; stale/interrupted outcomes are fenced. |
| DS-010 inter-agent/system external observable projection | Pass. Memory addendum does not break notifier/event-stream/team communication projection. |
| DS-011 / CDF-013 interrupted-turn memory projection | Pass. Fact retention and continuation suppression are now complete and well-owned. |

## Design-principle evaluation

### Single Responsibility Principle

**Pass.**

- `AgentTurn`: aggregate root for turn identity, turn-local state, execution scope, tool input port, private execution handle, settlement.
- `AgentTurnRunner`: finite LLM/tool/continuation algorithm.
- `ToolPhase`: tool invocation/approval/result collection and continuation decision in the active turn.
- `MemoryManager`: fact ingestion, raw trace retention, working-context projection.
- `LLMRequestAssembler`: reads projected context and assembles provider request.

The latest design avoids making `MemoryManager` a hidden lifecycle controller.

### Separation of lifetimes

**Pass.**

Runtime lifecycle, turn execution, tool batch state, memory history, and external observable streams remain distinct lifetimes.

The memory projection may be refreshed because a turn was interrupted, but the memory subsystem does not own the turn’s lifetime.

### Structured cancellation

**Pass.**

Interrupt remains owned by `TurnExecutionScope` and turn/phase services. Memory records facts and projects safe future context after the turn outcome is known; it does not cancel work.

### Command/event separation

**Pass.**

Internal commands/events drive runtime behavior. External observable events publish facts only. Memory facts are not used as a turn-control bus.

### Encapsulation

**Pass.**

The latest addendum improves encapsulation by preventing runtime/turn lifecycle vocabulary from leaking into `MemoryManager` API names.

### Idempotence and late-result safety

**Pass with implementation attention.**

The design requires stale/late post-interrupt approvals and tool results to be fenced. The memory API must also avoid duplicating committed facts if a result is observed through both an execution return path and a late external callback. That is an implementation-level idempotence requirement, but the architecture has a clear place to enforce it: fact ingestion keyed by turn/tool invocation/result identity.

## Non-blocking implementation guidance

These are not design blockers, but they should be preserved during implementation:

1. **Keep `appendToWorkingContext` narrow.**
   It controls immediate working-context append/continuation shape, not whether facts are retained.

2. **Prefer typed fact ingestion over broad raw trace writes.**
   `appendRawTrace(...)` should remain supplementary. Core user/assistant/tool facts should go through typed ingestion APIs so projection can reason about them safely.

3. **Make fact ingestion idempotent by identity.**
   Use stable turn ID, invocation ID, result ID/source event, or equivalent dedupe keys to avoid duplicate remembered tool facts.

4. **Project before the next LLM request.**
   The safety-critical step is that the next LLM request reads the repaired LLM-safe projection, not stale pre-interrupt context or invalid raw provider-native fragments.

5. **Represent operation-boundary notes deliberately.**
   If the projection needs to tell the next LLM that prior work was interrupted, use a memory-owned projected note/summary. Do not reintroduce a turn-lifecycle API on `MemoryManager`.

## Blocking findings

None.

## Non-blocking findings

None requiring design rework.

## Final verdict

**APPROVED for implementation.**

The latest addendum is architecturally better than the earlier memory-interruption API shapes. It correctly models interruption as a turn execution concern and memory as a generic fact/history/projection concern. It preserves committed history without continuing unsafe same-turn protocol after interruption.

Recommended routing: implementation may proceed from the updated requirements, investigation notes, and design spec.
