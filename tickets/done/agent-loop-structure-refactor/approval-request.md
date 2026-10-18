# Approval Request — agent-loop-structure-refactor (SR-001)

- Package: `agent-loop-structure-refactor`. Project Task `project_task_0e310af7-80c6-4f0c-9a8b-5fd7d7392a7b`.
- Status: Requirements `Ready for Approval`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor`, branch `codex/agent-loop-structure-refactor`. Base `origin/personal` @ `e50826755`; finalization target `origin/personal`.
- Artifacts: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `task-brief.md` (all in the same folder).

## What I found (post-Step 2 code)

1. **`LlmPhase.run()`** is about 375 lines with seven concerns:
   - setup (budgets, compaction executor);
   - call identity and request assembly;
   - commit/rollback closures;
   - stream consumption and UI segments;
   - finish classification and per-outcome settlement;
   - interrupt and error handling;
   - post-response compaction.
2. **Turn state:**
   - the tool-batch lifecycle is started by `LlmPhase` and cleared by the runner, and `LlmPhase` re-derives "has tool calls" from turn state;
   - `AgentTurn.toolInvocationBatches` is now dead (written, never read);
   - the response pipeline's `activeTurn` turn-id fallback is dead (its only caller always passes the turn id).
3. **`AgentTurnRunner`** handles 4 outcomes in a `while (true)` loop with a ~50-line inline tool-continuation branch.
4. **`ToolPhase`** is already split into 7 methods; only `runOneInvocation` (~162 lines) is long, but it covers one invocation's lifecycle coherently.

## Proposed requirements (summary)

- Zero behavior change: same events, statuses, segments, memory, rollback/commit, token usage, compaction, interrupts and output-limit recovery.
- Proven by the existing suites, by new characterization ("golden") tests of event sequences recorded before the refactor, and by the gated live suites through the test vault.
- Keep the layering; no `AgentLoop`; no forwarding-only classes.
- Split `LlmPhase`: one collaborator for stream consumption, segments and response assembly. `LlmPhase` keeps request preparation, settlement and outcome selection.
- `AgentTurn` owns turn state; one owner for the tool-batch lifecycle; remove the dead state and fallback.
- Preserve the compaction team's six invariants (CON-001..CON-006) and their stable seams.
- Implementation starts only after compaction cache reuse (1c0ac46f) lands; the design is re-checked against the merged code.
- Update the runtime-loop doc.

## Decisions needed

- **DEC-001 (turn runner).** Recommended: move the inline tool-continuation branch into its own named step and handle each LLM outcome through one explicit `switch` with one handler per outcome. No state-machine class or library. Alternative: leave the runner as is.
- **DEC-002 (ToolPhase).** Recommended: assess only and make no change in this ticket, to keep it focused. Alternative: split `runOneInvocation` into named private steps in the same file.

Please approve SR-001 and choose DEC-001 and DEC-002.
