# Follow-up Tasks — mid-turn input for runtimes without active-turn append

Requested by the user on 2026-10-13, during `active-run-skill-update-notice` (SR-003): "for autobyteus can we support mid turn interrupt and then send this notification? … for antigravity and grok as well? maybe we could create 3 followup ticket".

## Context

- `active-run-skill-update-notice` delivers skill-update notices (and agent messages already behave the same way) through `AgentRun.postUserMessage`.
- Mid-turn delivery happens only where the backend declares `inputCapabilities.activeTurnAppend: "supported"`: Codex (`codex-agent-run-backend.ts:36`) and Claude (`claude-agent-run-backend.ts:18`).
- AutoByteus (`autobyteus-agent-run-backend.ts:91`), Antigravity (`agy-agent-run-backend.ts:20`) and ACP (`acp-agent-run-backend.ts:31`; Grok builds an ACP backend) declare `unsupported`. `AgentRunInputAdmissionState.claimNext` (`agent-run-input-admission-state.ts:184`) therefore queues input for a busy run until the turn ends, and it then becomes the next turn.
- Goal of all three: a message (agent message, skill-update notice, user follow-up) sent to a busy agent reaches it **during** the current turn, without losing the work in progress.
- Each ticket flips its backend's capability to `supported` once real append works. No change is needed in `skill-update-notices`; it automatically benefits.

## FT-1 — AutoByteus native runtime: accept input during an active turn

- **Why feasible:** we own the engine (`autobyteus-ts`).
  - `AgentEventScheduler` (`autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts:15–16`) claims only `runtime_lifecycle` and `active_turn` lanes while a turn is active. `turn_start` inputs wait until it ends.
  - The server backend rejects `append_to_active_turn` (`autobyteus-agent-run-backend.ts:153–161`).
- **Suggested direction (for the team to design):** at the next step boundary of the active turn (after the current tool results, before the next LLM call), fold pending external inputs into the turn's next LLM request. Then declare `activeTurnAppend: "supported"` and implement `append_to_active_turn` in the backend.
- **Not recommended:** interrupting the turn and resending. It stops in-flight tool work and LLM output, which the agent then has to recover.
- **Must preserve:** turn and tool-call ordering, tool approval flow, compaction and recovery, memory and history (the appended input recorded in the same turn), and the interrupt/stop behavior.
- **Done when:** an agent message or skill notice sent to a busy AutoByteus agent reaches it before its next LLM call in the same turn, verified with real runs and tests.

## FT-2 — Antigravity (`agy` CLI): mid-turn input

- **Current state:** the AGY backend declares `activeTurnAppend: "unsupported"`; input waits for the turn to end.
- **Investigate:** whether the `agy` CLI supports injecting input into a running turn (streaming stdin, a steer/queue command, or a session API).
  - **If yes:** implement `append_to_active_turn` and declare `supported`.
  - **If no:** bring the trade-off to the user: (a) keep next-turn delivery, or (b) stop the turn and resend with the new input, losing the in-progress step. Recommend with evidence.
- **Testing aid:** the scripted CLI `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (see `TESTING.md`).
- **Done when:** decided and implemented per the investigation, verified with real or scripted runs.

## FT-3 — Grok (ACP backend): mid-turn input

- **Current state:** Grok builds an ACP backend (`acp-agent-run-backend.ts:31`, `activeTurnAppend: "unsupported"`).
- **Investigate:** whether the Grok build CLI or the ACP protocol supports a prompt or message during an in-progress turn (a session update, queued prompt or cancel-and-continue semantics).
  - Because the capability lives in the shared ACP backend, decide whether the change is Grok-specific or applies to every ACP runtime.
  - **If unsupported:** bring the same trade-off as FT-2 to the user.
- **Done when:** decided and implemented per the investigation, verified with real runs (Grok credits; see `TESTING.md` for the throwaway `GROK_HOME`).
