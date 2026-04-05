# Investigation Notes

Use one canonical file:
- `tickets/in-progress/<ticket-name>/investigation-notes.md`

Purpose:
- capture durable investigation evidence in enough detail that later stages can reuse the work without repeating the same major searches unless facts have changed
- keep the artifact readable with short synthesis sections, but preserve concrete evidence, source paths, URLs, commands, and observations

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: the refactor changes runtime terminology, ownership boundaries, ticket-local architecture artifacts, and likely stream/event contracts, but it does not yet require cross-repo implementation or release work in this ticket phase.
- Investigation Goal: define a precise future architecture for an explicit outer `AgentTurn` concept and a renamed inner `ToolInvocationBatch` concept before any implementation starts.
- Primary Questions To Resolve:
  - Where does the current outer durable turn identity actually live at runtime?
  - What does the current `ToolInvocationTurn` object own, and why is its name misleading?
  - Should `MemoryManager` remain agent-scoped or become a per-turn dependency?
  - Do segment events currently expose outer-turn identity?
  - What file/class ownership split would make the future implementation clearer?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-04 | Command | `git symbolic-ref refs/remotes/origin/HEAD` | Resolve workflow bootstrap base branch | `origin/personal` is the tracked default branch in this repo context | No |
| 2026-04-04 | Command | `git fetch origin personal` | Refresh remote state before creating ticket branch/worktree | Remote refresh succeeded; safe bootstrap from latest tracked `origin/personal` | No |
| 2026-04-04 | Command | `git worktree add -b codex/agent-turn-model-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/agent-turn-model-refactor origin/personal` | Create dedicated ticket worktree/branch per workflow | Dedicated ticket worktree/branch created successfully | No |
| 2026-04-04 | Command | `rg -n "activeTurnId|ToolInvocationTurn|turnId|turn_id|SegmentEventData|notifyAgentSegmentEvent|agent turn" autobyteus-ts/src autobyteus-ts/docs autobyteus-ts/tests` | Find all runtime/doc/test references related to turns, batches, and segment payloads | Confirmed outer turn state, inner batch class, lifecycle payloads with `turn_id`, and segment payload gap | No |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Inspect current runtime owner for active turn state | Outer turn state is a loose `activeTurnId` field on runtime state; `activeToolInvocationTurn` is separate transient state | Yes |
| 2026-04-04 | Code | `autobyteus-ts/src/memory/memory-manager.ts` | Inspect turn creation, sequencing, and trace ownership | `MemoryManager` is agent-scoped, creates turn IDs, owns per-turn sequence counters, ingests traces for many turns, and manages working-context snapshot/compaction | Yes |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/tool-invocation-turn.ts` | Inspect current inner settlement object | Current class owns only expected invocation IDs and result settlement order; this is batch semantics, not outer-turn semantics | Yes |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Inspect where tool batches and segment events are emitted | Handler reuses `activeTurnId`, constructs `ToolInvocationTurn(activeTurnId, toolInvocations)`, assigns `invocation.turnId`, and emits segment events without outer turn identity | Yes |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts` | Inspect turn-safe result settlement | Results are backfilled from `activeTurnId`, checked against the current batch turn, and aggregated before continuation | Yes |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/handlers/tool-lifecycle-payload.ts` | Inspect stream/runtime lifecycle payload identity | Tool lifecycle payloads already include `turn_id`, so lifecycle events are more explicit than segment events | No |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/streaming/segments/segment-events.ts` | Inspect segment event model | `SegmentEvent` carries `event_type`, `segment_id`, `segment_type`, and `payload`, but no outer-turn identity field | Yes |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | Inspect stream payload classes | Tool lifecycle payloads include `turn_id`, but `SegmentEventData` does not | Yes |
| 2026-04-04 | Code | `autobyteus-ts/src/agent/tool-invocation.ts` | Inspect invocation-level identity model | Each invocation can store `turnId`, which is consistent with an outer turn concept but still uses ambiguous naming | Yes |
| 2026-04-04 | Doc | `autobyteus-ts/docs/turn_terminology.md` | Check existing architecture terminology | Docs already describe an outer durable conversation turn and inner `ToolInvocationBatch`; code has not caught up fully | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`
  - `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
  - `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts`
- Execution boundaries:
  - user-input ingestion starts or preserves the durable turn
  - LLM streaming emits segments and may create grouped tool invocations
  - tool-result settlement gates continuation back into the input pipeline
- Owning subsystems / capability areas:
  - agent runtime state
  - memory subsystem
  - streaming/event subsystem
  - tool lifecycle/settlement handlers
- Optional modules involved:
  - none needed for understanding; ownership is mostly file-level today
- Folder / file placement observations:
  - current turn-related responsibilities are split between `src/agent/context`, `src/agent/handlers`, `src/agent`, and `src/memory`, which is workable but naming is inconsistent across those files.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | `activeTurnId`, `activeToolInvocationTurn` | stores outer active turn ID plus transient tool settlement object | outer and inner turn-like concepts are separate but both use turn terminology | runtime state should likely hold `activeTurn: AgentTurn | null` plus an inner batch field on that object |
| `autobyteus-ts/src/memory/memory-manager.ts` | `startTurn`, `nextSeq`, ingest methods | owns turn generation, trace sequencing, working-context snapshot, compaction/retrieval | `MemoryManager` is clearly agent-scoped infrastructure, not a per-turn object | future design should keep `MemoryManager` agent-scoped |
| `autobyteus-ts/src/agent/tool-invocation-turn.ts` | `ToolInvocationTurn` | tracks expected invocation IDs and settled results | semantics match batch/settlement, not outer turn | should be renamed to `ToolInvocationBatch` or similar |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | LLM streaming + tool parsing path | reuses `activeTurnId`, creates transient settlement object, assigns `invocation.turnId`, emits segment events | natural place to construct a future `AgentTurn` batch and to attach outer-turn identity to emitted segments | likely main integration point for the future refactor |
| `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts` | result settlement barrier | enforces invocation membership + turn match, then aggregates results | current logic already treats the inner object as a batch inside a durable outer turn | naming can be clarified without changing the fundamental orchestration role |
| `autobyteus-ts/src/agent/streaming/segments/segment-events.ts` | `SegmentEvent` | runtime segment model | no outer-turn field exists | future stream contract may need `agent_turn_id` |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | `SegmentEventData`, lifecycle payloads | typed stream payloads | lifecycle payloads already include `turn_id`; segment payloads do not | asymmetry should be resolved in future design |
| `autobyteus-ts/docs/turn_terminology.md` | terminology doc | describes runtime concepts | doc already says one outer turn can contain multiple `ToolInvocationBatch` instances | design can align code to the documented concept instead of inventing a new inner concept |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-04 | Probe | static code inspection of `memory-ingest-input-processor`, `llm-user-message-ready-event-handler`, and `tool-result-event-handler` | outer turn identity persists across tool-result continuations because TOOL-originated followups do not create a new turn | outer `AgentTurn` should span user input, tool loops, and assistant completion |
| 2026-04-04 | Probe | static code inspection of `tool-lifecycle-payload.ts` and `stream-event-payloads.ts` | lifecycle events already expose `turn_id`, but segment events do not | adding outer-turn identity to segment events is consistent with the current event model direction |
| 2026-04-04 | Probe | static code inspection of `memory-manager.ts` | per-turn sequencing is implemented as `MemoryManager.nextSeq(turnId)` with an internal map | future design can consider moving sequence ownership into `AgentTurn`, but `MemoryManager` itself should remain agent-scoped |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: `N/A`
- Version / tag / commit / release: `N/A`
- Files, endpoints, or examples examined: `N/A`
- Relevant behavior, contract, or constraint learned: `N/A`
- Confidence and freshness: `N/A`

### Reproduction / Environment Setup

- Required services, mocks, or emulators: none
- Required config, feature flags, or env vars: none
- Required fixtures, seed data, or accounts: none
- External repos, samples, or artifacts cloned/downloaded for investigation: none
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add -b codex/agent-turn-model-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/agent-turn-model-refactor origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - dedicated ticket worktree should remain until the full workflow reaches final handoff or explicit cleanup

## External / Internet Findings

| Source | Fact / Constraint | Why It Matters | Confidence / Freshness |
| --- | --- | --- | --- |
| `N/A` | No external research was required for this design-stage refactor | Current repo code and docs were sufficient | High / 2026-04-04 |

## Constraints

- Technical constraints:
  - current runtime already uses `turnId` across memory traces, tool invocations, and lifecycle payloads
  - current segment event model has no explicit outer-turn field
  - workflow must stop before implementation
- Environment constraints:
  - design work must remain inside the dedicated ticket worktree
- Third-party / API constraints:
  - none identified for this stage

## Unknowns / Open Questions

- Unknown: whether future implementation should rename stream payload field to `agent_turn_id` everywhere or preserve `turn_id` at external boundaries for compatibility
- Why it matters: affects cross-repo follow-on scope and migration cost
- Planned follow-up: decide in design stage whether the `autobyteus-ts` target state should be internally explicit while leaving external payload naming staged for later rollout

- Unknown: whether the future `AgentTurn` object should own per-turn sequence generation directly
- Why it matters: affects whether `MemoryManager.nextSeq(turnId)` remains or becomes `AgentTurn.nextSeq()`
- Planned follow-up: evaluate in design stage based on coupling and simplicity

## Implications

### Requirements Implications

- The refactor needs explicit separate concepts for outer turn and inner tool batch.
- The design should explicitly cover segment-event identity, not only memory and tool lifecycle paths.
- The design should define a staged stopping point before implementation, matching the user's request.

### Design Implications

- Introduce an explicit outer `AgentTurn` aggregate in the agent runtime layer.
- Keep `MemoryManager` agent-scoped and make it consume outer-turn identity rather than become owned by each turn.
- Rename `ToolInvocationTurn` to `ToolInvocationBatch` because its behavior is batch settlement, not outer-turn lifecycle.
- Future segment-event contract should likely include `agent_turn_id` to align with the fact that every segment belongs to an outer agent turn.

### Implementation / Placement Implications

- `AgentRuntimeState` is the likely owner of `activeTurn: AgentTurn | null`.
- `AgentTurn` should probably live under `autobyteus-ts/src/agent/`.
- `ToolInvocationBatch` can remain near current `ToolInvocationTurn` placement.
- `LLMUserMessageReadyEventHandler` and `ToolResultEventHandler` are the most affected integration points for the future implementation.

## Re-Entry Additions

Append new dated evidence here when later stages reopen investigation.

### 2026-04-04 Re-Entry Update

- Trigger: `N/A`
- New evidence: `N/A`
- Updated implications: `N/A`
