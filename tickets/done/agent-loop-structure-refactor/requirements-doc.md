# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `agent-loop-structure-refactor`
- Request / ticket: Project Task `project_task_0e310af7-80c6-4f0c-9a8b-5fd7d7392a7b`
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-10
- Approval state and reference: **Approved** by the user on 2026-10-11 in the desktop conversation: "yes. lets go" and "if you think the problem is still true, then you're certain that you can make it a cleaner. Go for it." This approves SR-001/SR-002 with the recommended DEC-001 (named outcome handlers) and DEC-002 (ToolPhase assess only).
- Exact approved requirements baseline / solution revision: SR-001 text (SR-002 evidence only)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: The agent loop's layering is sound, but its main step is overloaded.
  - `LlmPhase.run()` is a single ~375-line method with seven intertwined concerns:
    - setup;
    - call identity and assembly;
    - settlement closures;
    - stream consumption and segment emission;
    - finish classification and per-outcome settlement;
    - interruption and error handling;
    - post-response compaction.
  - Turn state ownership is fragmented. The tool-batch lifecycle is started by `LlmPhase` and cleared by the runner, and `LlmPhase` re-derives "has tool calls" from turn state.
  - Dead state and fallbacks remain.
  - `AgentTurnRunner`'s loop carries a ~50-line inline tool-continuation branch.
- Affected actors or systems: Maintainers of `autobyteus-ts` and every AutoByteus-runtime agent (behavior must not change).
- Desired outcome: Each step of the agent loop has one clear owner and readable methods, turn state is owned and read through `AgentTurn`, and dead code is removed. Observable behavior is identical.
- Observable definition of success:
  - all existing unit, integration and gated live suites pass unchanged in their assertions (only structural test updates allowed);
  - architecture review confirms the ownership split;
  - the runtime-loop doc matches the code.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | One agent turn runs Worker → TurnRunner → LlmPhase → ToolPhase → continuations, with the current events, statuses, segments, memory writes, rollback/commit, token usage, compaction, interrupts and output-limit recovery | Same behavior, produced by a restructured `LlmPhase`/runner with single-owner collaborators | All of it, including event and status ordering | Source Log |
| BEH-002 | Contract | SCN-002 | Compaction cache reuse (after 1c0ac46f lands) depends on six invariants | Unchanged | CON-001..CON-006 | PTM relay; 1c0ac46f design |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User / maintainers | A maintainable agent loop | Clear owners, smaller methods | No behavior change; keep the layering; no AgentLoop |
| Compaction team (1c0ac46f) | Cached compaction | Their seams and invariants intact | Lands first |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A maintainer reads or changes one LLM call's handling (request, stream, settlement, compaction) and finds one owner per concern | SCN-001 |
| UC-002 | A maintainer adds or changes a turn-loop outcome | SCN-001 |

### Out Of Scope

- Any change to observable behavior, events, statuses, persisted data, provider adapters, or server/web contracts.
- `AgentWorker`/`AgentRuntime`/event inbox and scheduling.
- Compaction policy or mechanics (owned by 1c0ac46f), beyond keeping its seams wired.
- Input/response/tool-result pipelines, beyond removing the dead `activeTurn` fallback.
- New frameworks, generic state-machine libraries, or an `AgentLoop` class.

### Non-Goals

- Performance changes.
- Reducing line counts for their own sake.

### Preserved Behavior Boundary

BEH-001 and BEH-002 in full. Cross-cutting invariants:
- interrupt fences (`throwIfAborted`/`runAbortable` at the same seams);
- rollback-vs-commit semantics per outcome;
- the output-limit recovery contract from anthropic-incomplete-content-block (D-04/D-05);
- CON-001..CON-006.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, AC, or preserved-behavior ID.
- A finding that would introduce new behavior is a `Requirement Gap` and requires user approval.
- Adjacent concerns become non-blocking recommendations or separate tickets.
- Reviewer comments do not amend this basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Observable behavior of the agent loop is unchanged: events, statuses, segment events, memory contents and raw traces, rollback/commit, token-usage events, compaction, interrupt and output-limit recovery behavior | BEH-001, BEH-002 | Must | Pure refactor | Brief |
| REQ-002 | Keep the layering `AgentRuntime → AgentWorker → AgentTurnRunner → LlmPhase / ToolPhase`; introduce no `AgentLoop` class and no empty forwarding layer | BEH-001 | Must | User constraint | Brief "Keep" |
| REQ-003 | Split `LlmPhase` so each of its concerns has one owner. At minimum: stream consumption, segment emission and response/finish assembly move into one collaborator, and `LlmPhase` remains the owner of one LLM call (request preparation, settlement, outcome selection) | BEH-001 | Must | Weak spot 1 | Brief point 1 |
| REQ-004 | Turn state is owned by `AgentTurn` and read through it; phases do not re-derive it. The tool-batch lifecycle has one owner. Dead turn state (`toolInvocationBatches`) and dead fallbacks (`activeTurn` turn-id fallback in the response pipeline) are removed | BEH-001 | Must | Weak spot 2; no dead code | Brief point 2; investigation |
| REQ-005 | `AgentTurnRunner` outcome handling is made explicit where it removes real complexity (see DEC-001). It must not introduce a generic state-machine framework | BEH-001 | Should | Weak spot 3 | Brief point 3 |
| REQ-006 | `ToolPhase` is assessed. Changes are limited to what DEC-002 approves | BEH-001 | Could | Weak spot 4 | Brief point 4 |
| REQ-007 | Implementation starts only after compaction cache reuse (project_task_1c0ac46f) has landed on `personal`; the design is re-checked against the merged code first | BEH-002 | Must | Agreed order | PTM relay 2026-10-10 |
| REQ-008 | `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` is updated to the new ownership | BEH-001 | Must | Doc is canonical | Investigation |

## Constraints From Compaction Cache Reuse (preserved; relayed 2026-10-10)

| Constraint ID | Invariant |
| --- | --- |
| CON-001 | One definition of the conversation request: the agent's call and the cached summary request both use `conversation-request.ts` (`logicalConversationId`, `tools`, `promptCacheScope: 'conversation'`), the same `sanitizeMediaInputMessages` output and the same tool schemas. No re-creation of arguments in a new collaborator |
| CON-002 | Prefix-binding order: before compaction in `prepareRequest`; again before the recovery checkpoint; before after-final compaction in `LlmPhase`; on tool continuations |
| CON-003 | One tools source: `request.tools` is what is sent, what the summary port uses and what the binding digest uses |
| CON-004 | The agent's LLM is idle during compaction: after-final compaction runs only with no tool invocations, after the stream is fully consumed; never while a stream is open |
| CON-005 | History is append-only: no re-render, edit or delete of earlier messages in a normal turn; no pre-render in the agent (the adapter renders once) |
| CON-006 | Compaction usage events use the same notifier, with `ingestion_kind: 'autobyteus_compaction'` and llm_call_id `<turnId>:compaction:<operationId>:<attempt>` |

Stable seams to keep as-is:
- `ConversationSummaryPort` / `SummaryAttemptResult` / `SummaryRequestIdentity`;
- `LlmPhaseSummaryPort`;
- `conversationRequestKwargs` / `conversationRequestOptions`;
- `LLMRequestAssembler.bindRequestPrefix(tools)`;
- `BaseLLM.releaseConversation(id, {signal})`.

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Merged refactor on top of 1c0ac46f | All existing `autobyteus-ts` unit and integration suites and server suites pass; assertions are unchanged except for structural updates (constructor/import moves), each justified in the handoff | — | `pnpm -C autobyteus-ts test`, server suites |
| AC-002 | REQ-001 | BEH-001 | Gated live suites with test-vault keys (output-limit recovery, Anthropic prompt caching, compaction cache reuse) | Same results as before the refactor | — | Real-provider runs via the test vault |
| AC-003 | REQ-001 | BEH-001 | Recorded event sequences for a final answer, a tool cycle, output-limit recovery, interrupt mid-stream and provider error | Identical ordered event and status sequences before and after (golden comparison) | — | New characterization tests written before the refactor |
| AC-004 | REQ-002, REQ-003 | — | Code | `LlmPhase` delegates stream consumption, segments and response assembly to one collaborator; no `AgentLoop`; no forwarding-only class | — | Architecture and code review |
| AC-005 | REQ-004 | — | Code | No phase re-derives turn state; one owner of the batch lifecycle; `toolInvocationBatches` and the `activeTurn` fallback are gone | — | Review plus grep/tsc |
| AC-006 | REQ-005, REQ-006 | — | Code | Runner and ToolPhase changes match DEC-001/DEC-002 | — | Review |
| AC-007 | CON-001..CON-006 | BEH-002 | Compaction tests from 1c0ac46f | Pass unchanged; the conversation-request helpers are still the only builders | — | Their suites plus review |
| AC-008 | REQ-008 | — | Docs | The runtime-loop doc names the new collaborators and owners | — | Docs review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Agent user | Any agent turn | Chat or team run on the AutoByteus runtime | Agent ready | Message → LLM call(s) → tools → … → final | Identical to today | Interrupt, provider error, output-limit recovery, compaction blocked: identical | Supported Normal Scenario | Existing suites | REQ-001..REQ-006, AC-001..AC-006 |
| SCN-002 | Contract | Compaction cache reuse | Cached summary request | After-final or pre-request compaction | Compaction due | As defined by 1c0ac46f | Unchanged | — | Supported Explicit Edge Scenario | 1c0ac46f design | CON-001..CON-006, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-003 | Reliability | Zero differences in recorded event/status sequences | Characterization scenarios | Golden tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| project_task_1c0ac46f | Lands first; seams stable | PTM relays 2026-10-10 | RSK-001 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `task-brief.md` | Original brief | All | Current | Request context |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | 1c0ac46f seams stay as relayed | Design basis | PTM relays changes | Open |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How far to make the turn runner's outcome handling explicit? | Weak spot 3 | **Recommended:** extract the ~50-line inline tool-continuation branch into its own named step and handle each LLM outcome through one explicit `switch` with one handler per outcome (helpers for final/exhaustion/recovery already exist). No state-machine class or library. **Alternative:** leave the runner as is | User | Decided 2026-10-11: named outcome handlers |
| DEC-002 | `ToolPhase`: change or not? | Weak spot 4 (optional) | It is already decomposed into 7 methods with one owner; only `runOneInvocation` (~162 lines) is long but cohesive (one invocation's lifecycle). **Recommended:** no `ToolPhase` change in this ticket, to keep the refactor focused; record the assessment. **Alternative:** split `runOneInvocation` into named private steps within the same file | User | Decided 2026-10-11: assess only, no change |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002, AC-003 | SCN-001, SCN-002 | — |
| REQ-002 | UC-001 | BEH-001 | AC-004 | SCN-001 | task-brief |
| REQ-003 | UC-001 | BEH-001 | AC-004 | SCN-001 | task-brief |
| REQ-004 | UC-001 | BEH-001 | AC-005 | SCN-001 | — |
| REQ-005 | UC-002 | BEH-001 | AC-006 | SCN-001 | — |
| REQ-006 | UC-001 | BEH-001 | AC-006 | SCN-001 | — |
| REQ-007 | — | BEH-002 | AC-007 | SCN-002 | — |
| REQ-008 | UC-001 | BEH-001 | AC-008 | — | — |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001, SCN-002.
- Constraints to preserve: REQ-001, REQ-002, CON-001..CON-006, interrupt fences, the output-limit recovery contract.
- Deferred to design: collaborator boundaries and names; where settlement and post-response compaction live; batch-lifecycle owner; runner step extraction.
- Technical facts to verify after 1c0ac46f lands: the merged `llm-phase.ts`/assembler shape; the summary-port wiring site.
- Known risks: RSK-001 (drift), RSK-002 (subtle ordering changes).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-11)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
