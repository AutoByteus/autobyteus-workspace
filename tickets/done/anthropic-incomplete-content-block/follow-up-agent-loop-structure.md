# Follow-up Ticket Request — Agent loop structure: split LlmPhase and tighten turn-loop ownership

- **Created:** Project Task `project_task_0e310af7-80c6-4f0c-9a8b-5fd7d7392a7b`, "Refactor the agent-loop structure in autobyteus-ts (pure refactor)". Status TODO (not dispatched), blocked until this ticket's Step 2 lands. Confirmed by `/project_task_manager` on 2026-10-10.

- Requested by: the user, 2026-10-10, in the anthropic-incomplete-content-block conversation ("regarding the weakspots, maybe you can ask project task manager to create one follow up ticket for this").
- Origin: Project Task `project_task_3c6c098c-2a8b-4f46-b020-1c2f30eeb5f9` (anthropic-incomplete-content-block), Solution Designer `/software_engineering_team/solution_designer`.
- Type: Refactor (no intended product-behavior change).

## Context: current structure (`autobyteus-ts/src/agent`)

```
AgentRuntime          public control: start/stop, submit input, interrupt (side-band)
  └─ AgentWorker      runtime event loop: lifecycle, bootstrap/shutdown, picks the next
                      turn trigger from AgentEventInbox, one active turn at a time
       └─ AgentTurnRunner   the agent loop for one turn: LLM → tools → LLM … until final/error/interrupt
            ├─ LlmPhase     one model call
            └─ ToolPhase    one tool batch (approval, preprocessing, execution)
```

Canonical doc: `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`. The macro layering is sound and should be kept. No new `AgentLoop` class is wanted (it would be an empty forwarding layer; `AgentTurnRunner` is the agent loop).

## Weak spots found (evidence at `origin/personal` `d28c56d5d`)

1. **`LlmPhase` responsibility overload (main item).**
   - `src/agent/loop/llm-phase.ts` is 386 lines; `run()` is one method of about 330 lines with six concerns:
     - (a) request preparation, including pre-request compaction orchestration and token-budget/capacity resolution;
     - (b) stream consumption and UI segment emission (reasoning segment handling inline, `LlmStreamingResponseHandler` feeding);
     - (c) response assembly (`CompleteResponse`);
     - (d) memory settlement (commit vs rollback of the request recovery snapshot; ingesting the assistant/tool response);
     - (e) token-usage notification;
     - (f) error classification and post-response compaction.
   - `llm-phase-compaction.ts` and `llm-phase-tools.ts` were extracted earlier; the method is still the hotspot.
   - Suggested direction, to be decided in that ticket's design: extract stream consumption plus segment emission plus response/finish assembly into one collaborator (e.g. an LLM response stream collector owned by the loop), and keep request preparation, settlement and outcome selection in `LlmPhase`.
2. **Turn state leaking into phases.**
   - The LLM call ID used to be derived from the tool-batch count (`toolInvocationBatches.length + 1`). anthropic-incomplete-content-block Step 2 already fixes this (`AgentTurn.nextLlmCallSequence()`, `beginContinuation()`/`isContinuation`; design D-08).
   - The follow-up should audit for any remaining turn state that phases derive instead of reading from `AgentTurn`.
3. **`AgentTurnRunner` loop is an implicit state machine.**
   - It is a `while (true)` that branches on the LLM-phase outcome: `compaction_blocked`, `final`, `tool_invocations`, and after this ticket `output_limited`.
   - It is still readable, but each new outcome adds a branch plus status/notification sequencing in the same method (257 lines).
   - Assess whether an explicit outcome-to-transition structure (bounded local state machine inside the runner) improves clarity. Only adopt it if it removes real complexity.
4. **Optional:** assess `ToolPhase` (400 lines: approval wait, preprocessing, execution, result building) for the same overload pattern.

## Constraints

- Pure refactor: preserve all behavior, events, status sequencing, memory/rollback semantics, interrupt fences and compaction behavior. Existing agent/loop tests are the safety net.
- Follow `DESIGN.md` ("start simple; no speculative frameworks") and the design principles (no empty indirection layers; split by real owner).
- **Sequencing:** start after anthropic-incomplete-content-block **Step 2** lands. That step rewrites parts of `llm-phase.ts`, `agent-turn-runner.ts`, `agent-turn.ts` and `llm-streaming-response-handler.ts`; doing this refactor in parallel would conflict.
- Update `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` to match.

## Estimated size

Medium to Large (agent-loop internals in `autobyteus-ts`; no server/web impact expected). Risk: needs an architecture review because it restructures the agent loop.
