# Investigation Notes

## Investigation Meta

- Package identifier: `agent-loop-structure-refactor`
- Request / ticket: Project Task `project_task_0e310af7-80c6-4f0c-9a8b-5fd7d7392a7b`, "Refactor the agent-loop structure in autobyteus-ts (pure refactor)". Delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor` / `codex/agent-loop-structure-refactor`
- Resolved base remote / branch / revision: `origin/personal` @ `beb6b3b49` (fast-forwarded 2026-10-11; it includes the compaction cache reuse merge `edd8f8469` and the Step 2 merge `26795afa0`). Original bootstrap base: `e50826755`.
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created. Brief copied to `task-brief.md` (identical to the archived `tickets/done/anthropic-incomplete-content-block/follow-up-agent-loop-structure.md` apart from the created-task line).
- Bootstrap blocker: None.
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate): `.claude/skills/solution-designer/references/requirements-engineering.md` (read earlier in this conversation, 2026-10-10); `DESIGN.md`; `TESTING.md`; `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`.
- Investigation status: Requirements investigation complete. Architecture investigation will resume after compaction cache reuse (project_task_1c0ac46f) lands.

## Initial Request And Clarifications

- Original request: Pure refactor of the agent loop. Keep `AgentRuntime → AgentWorker → AgentTurnRunner → LlmPhase/ToolPhase`; add no `AgentLoop` class. Address four points:
  1. split `LlmPhase`;
  2. phases read turn state from `AgentTurn`;
  3. make the turn runner's outcome handling explicit only if it helps;
  4. optionally assess `ToolPhase`.
- Clarifications received (relayed by the Project Task Manager, 2026-10-10):
  - Order agreed: compaction cache reuse (1c0ac46f) lands first, then this refactor goes on top.
  - The compaction team's six invariants must be preserved (see CON-001..CON-006).
  - Their seams are stable: `ConversationSummaryPort`/`SummaryAttemptResult`/`SummaryRequestIdentity`, `LlmPhaseSummaryPort`, `conversationRequestKwargs`/`conversationRequestOptions`, `LLMRequestAssembler.bindRequestPrefix(tools)`, `BaseLLM.releaseConversation(id, {signal})`.
  - They will merge `origin/personal` before their code review.
- Initial ambiguity: the extent of points 3 and 4 (see DEC-001, DEC-002).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` @ `e50826755` (440 lines) | Point 1 | `run()` spans l.64-439 (~375 lines). Concerns in one method: (a) capacity/budget and compaction-executor setup (l.96-150); (b) call identity and request assembly with `compaction_blocked` (l.151-178); (c) settlement closures `restoreRequest`/`releaseRequest` (l.180-191); (d) stream consumption, accumulation, reasoning-segment emission, handler feeding (l.217-256); (e) finish classification and per-outcome settlement (output-limited, normal) including memory ingestion and token-usage notification (l.258-318); (f) interruption and provider-error handling (l.319-383); (g) post-response compaction evaluation and execution, outcome return (l.385-438) | Design |
| 2026-10-10 | Code | `agent/loop/agent-turn-runner.ts` (305 lines) | Point 3 | The `while (true)` loop (l.61-145) handles 4 LLM outcomes (`output_limited`, `compaction_blocked`, `final`, `tool_invocations`); the tool branch is inline (~50 lines: status events, ToolPhase, result pipeline, lifecycle, batch clear, memory ingest, continuation). Helpers already exist for final/exhaustion/recovery note | Design: extract the tool-continuation branch into a named step; the outcome switch stays a plain `switch` |
| 2026-10-10 | Code | `agent/agent-turn.ts` (341 lines) | Point 2 | Owns `nextLlmCallSequence()`, `isContinuation`/`beginContinuation()` (Step 2) and the tool-batch state (`startToolInvocationBatch`, `activeToolInvocationBatch`, `clearActiveToolInvocationBatch`) | — |
| 2026-10-10 | Command | `grep -rn toolInvocationBatches autobyteus-ts/src autobyteus-server-ts/src` | Point 2 / dead code | `AgentTurn.toolInvocationBatches` is pushed (l.330) and never read in src. One test reference: `tests/unit/agent/tool-invocation.test.ts` | Dead state: remove |
| 2026-10-10 | Code | `llm-phase.ts` l.308, l.408; `agent-turn-runner.ts` l.122-125 | Point 2 | The batch lifecycle is split across owners: `LlmPhase` starts it, the runner clears it, and `LlmPhase` re-derives "has tool calls" from `turn.activeToolInvocationBatch && parsedToolInvocationCount > 0` and re-reads `streamingHandler.getAllInvocations()` | One owner for the batch lifecycle |
| 2026-10-10 | Code | `agent/pipelines/llm-response-pipeline.ts` l.34-51 | Point 2 | Falls back to `context.state.activeTurn?.turnId` when `turnId` is not passed. Its only caller (`agent-turn-runner.ts` l.243) always passes `turnId` | Dead fallback: candidate removal (verify no other caller; tests) |
| 2026-10-10 | Code | `agent/pipelines/agent-input-pipeline.ts` l.87-91 | Point 2 | Validates that `context.state.activeTurn` matches the passed turn: a real invariant guard, not derived state | Keep |
| 2026-10-10 | Code | `agent/loop/tool-phase.ts` (416 lines) | Point 4 | Already decomposed: `run` (41), `runOneInvocation` (~162: malformed rejection, preprocess, approval, tool lookup, preparation, execution or external wait, result), `prepareToolExecution`, `waitForExternalToolResult`, `publishExternalToolResultLog`, `waitForApproval`, `publishApprovalInterrupted` | Assessment: no owner problem; at most an intra-file split of `runOneInvocation` (DEC-002) |
| 2026-10-10 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse` (uncommitted; base `46e94fdea`) | Overlap | `llm-phase.ts` changes about 15 lines (summary port, conversation-request helpers, `bindRequestPrefix` before after-final compaction, `getParentModelIdentifier` removed); `llm-request-assembler.ts`, `llm/base.ts`, `memory/compaction/*`; new `conversation-request.ts`, `llm-phase-summary-port.ts` | Sequencing: their work lands first |
| 2026-10-10 | Test | `autobyteus-ts/tests/unit/agent/loop/*` (8 files), `tests/integration/agent/*` (e.g. `output-limit-recovery-flow`, `provider-native-tool-continuation-flow`, `tool-approval-flow`, `incomplete-tool-call-resume-recovery`, `working-context-snapshot-restore-flow`) | Safety net | Existing behavior is broadly covered at unit and integration level | Verification intent |
| 2026-10-11 | Command | `git diff e50826755 beb6b3b49 -- agent/loop/llm-phase.ts agent/llm-request-assembler.ts agent/loop/agent-turn-runner.ts agent/agent-turn.ts` | Re-check after 1c0ac46f landed | `llm-phase.ts` is now 445 lines. It gains `LlmPhaseSummaryPort` (passed to `PendingCompactionExecutor`, with `tools: toolSchemas`), `conversationRequestKwargs`/`conversationRequestOptions` on the stream call, and `assembler.bindRequestPrefix(request.tools)` before after-final compaction. `getParentModelIdentifier` is gone. The assembler gains a public `bindRequestPrefix`, binds before compaction (first call only) and again before the checkpoint. The runner and `AgentTurn` are unchanged. These match the relayed seams exactly. All findings (`run()` concerns, split batch lifecycle, dead `toolInvocationBatches`, dead `activeTurn` fallback with its single caller passing `turnId`) re-verified | ASM-001 confirmed |
| 2026-10-10 | Doc | `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | Ownership contract | Documents the worker/turn-runner/phase ownership; must be updated with the new collaborators | Docs sync |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Any agent turn on the AutoByteus runtime | Worker → TurnRunner → LlmPhase (assemble, stream, classify, settle) → ToolPhase → continuation … → final | All events, statuses, segments, memory writes, rollback/commit, token usage, compaction and interrupt semantics as today | Source Log | High |
| BEH-002 | Contract | Compaction cache reuse invariants (1c0ac46f) | Conversation request built once via `conversation-request.ts`; prefix binding order; one tools source; LLM idle during compaction; append-only history; compaction usage events | Must hold after the refactor | PTM relay 2026-10-10; their design-spec | High |

## Relevant Codebase And Technical Facts

See the Source Log. Key structural facts: (1) `LlmPhase.run` concerns (a)–(g); (2) the batch lifecycle is split across owners; (3) the dead `toolInvocationBatches`; (4) the dead `activeTurn` fallback; (5) the runner's inline tool branch.

## Structural And Payload Surface Inventory

- Payload surfaces: none.
- Structural surfaces: `agent/loop/*` (LlmPhase, runner, ToolPhase), `agent/agent-turn.ts`, `agent/pipelines/llm-response-pipeline.ts`, `docs/agent_runtime_loop_and_interrupt.md`. Shared with 1c0ac46f: `llm-phase.ts`, `llm-request-assembler.ts`.
- Potential structural impacts: internal ownership refactor only. No API, persistence, security, concurrency-semantics or deployment change.

## Runtime, Probe, Or Reproduction Findings

N/A: a pure refactor with no defect to reproduce.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via the brief and PTM) | Cleaner agent loop, no behavior change, keep the layering, no AgentLoop | Strong | REQ-001..REQ-006 | DEC-001, DEC-002 |
| Compaction team (1c0ac46f) | Six invariants, stable seams, landing order | Strong (agreed) | CON-001..CON-006, REQ-007 | — |

## Persisted Data And State Facts

- Not affected: no stored shape, trace type or history content changes.

## Product Design Request Context / Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `task-brief.md` | Solution Designer (authored in 3c6c098c) | Original brief | Request | All | Current | Request context |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | 1c0ac46f lands with the seams relayed as stable | The design builds on them | Verified on 2026-10-11 against the merged code (`edd8f8469`) | Confirmed |
| RSK-001 | Risk | Their landing may shift `llm-phase.ts` further | Design drift | Re-checked 2026-10-11: the shift is as relayed. The design will be written against `beb6b3b49` | Resolved |
| RSK-002 | Risk | A behavior-neutral refactor could still change event or status ordering subtly | Silent regressions | The full existing suites, plus ordering assertions where coverage is thin | Open |

## Architecture Investigation Findings

(To be extended after approval and after 1c0ac46f lands.)

## Requirement Implications

- This is a refactor, so the requirements are preserved behavior plus structural outcomes the user explicitly asked for (the keep/no-AgentLoop constraints and the four points).
- The compaction invariants become explicit preserved constraints.
