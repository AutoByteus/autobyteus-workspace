# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved baseline: `requirements-doc.md` SR-001, approved by the User (2026-11-20, option (b), live check waived without credits); requirements unchanged since.
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (incl. the glossary rule), `TESTING.md`.
- Review rounds: ARCH-REV-001 (Fail → SR-002), ARCH-REV-002 (Fail → SR-003: AR-005 one-batch hand-over, AR-006, AR-002/003 leftovers).
- Conflicts: None.

## Current-State Read

`AcpAgentSession` (`acp-agent-session.ts`) knows one kind of turn: the client's prompt (`startTurn` → `session/prompt`, ended by its response, `:151-166, 316-323`). Updates outside a turn are dropped (`:204`); extension notifications become profile effects (`interpretExtNotification`, `:210-221`), of which only `mcp_status` applies outside a turn (`:266`). The Grok profile (`backends/grok/grok-build-session-profile.ts`) already reads `_x.ai/*` traffic. The run backend reports `running` while the session has an active turn (`acp-agent-run-backend.ts:100-107`) and refuses a start dispatch then (`:136`); AgentRun drains held input after each published batch when the run reads idle (`agent-run.ts:357, 366-380, 448-455`) and fails a start dispatch the backend refuses (`agent-run-input-admission-state.ts:226-237`). Claude shows runtime-started turns by opening a canonical turn (origin `provider`) with a `SYSTEM_TASK_NOTIFICATION` notice (`claude-turn-tracker.ts:296-300`, `claude-session.ts:427-432`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` — the shared ACP session's turn lifecycle (a second origin and a hand-over), two effect kinds in the profile contract, the Grok profile's interpretation, one notice sender id in the domain and memory, GLOSSARY.md, the scripted Grok CLI and tests.
- Architectural risk: `High` — it changes the turn lifecycle and concurrency of the shared ACP session (a turn the client did not start, a hand-over from a client turn to it, cancel, idle, held input), used by Grok and DeepSeek runs.
- Escalation trigger: Grok's frames differ from the probes in scripted/live checks; provider content observed before the client prompt's response (RSK-003); any held message failing in the hand-over.

## Architecture Investigation Evidence

Investigation notes: probe 1 `evidence/grok-acp-probe.jsonl` (a provider prompt after an ended client turn); probe 2 `evidence/grok-acp-probe2.jsonl` (A: a job ending during a client turn — frames 211 `turn_completed(client)`, 212 `queue/changed(running task-completed-*)`, 215 `session/prompt` response, provider content after it; B: cancel of a provider prompt, frames 423-424); code reads with file:line.

## Intended Change

1. **Profile contract** (`backends/acp/acp-agent-session-profile.ts`), named after what Grok reports: two effect kinds — `{ kind: "prompt_running"; promptId: string; notice: Readonly<{ content: string; senderId: string }> | null }` (the agent reports a prompt running: the client's own or one it queued itself) and `{ kind: "prompt_completed"; promptId: string; stopReason: string }`. The notice content and its sender id travel in the effect; no profile field. Profiles that never produce them (DeepSeek) are unaffected.
2. **Grok profile** (`backends/grok/grok-build-session-profile.ts`; the interpretation in `backends/grok/grok-build-prompt-signals.ts`):
   - `_x.ai/queue/changed` with a non-empty `runningPromptId` → `prompt_running { promptId, notice: runningText without its <system-reminder> wrapper, trimmed, senderId GROK_PROVIDER_TURN_NOTICE_SENDER_ID — or null when there is no text }`;
   - `_x.ai/session_notification` with `update.sessionUpdate === "turn_completed"` → `prompt_completed { promptId: update.prompt_id, stopReason: update.stop_reason }`.
   The profile reports every such signal; the session decides what it means.
3. **Session** (`backends/acp/session/acp-agent-session.ts`), the single owner of turn lifecycle. A turn has an origin: `input` (a client prompt) or `provider` (a turn the agent runtime started itself; Claude's word for the same concept).
   - **Opening:** one private step for both origins sets state `prompting`, resets `callOrdinal`, `userDeniedInTurn` and the call boundary, starts the converter turn (`TURN_STARTED`) and arms the idle timer; an input turn then sends `session/prompt`; a provider turn emits its notice (rule 4) in the same batch. The session allocates provider turn ids (`randomUUID()`, the backend's scheme); the backend's comment "turn id allocation" is narrowed to input turns.
   - **Input turn bookkeeping:** the first `prompt_running` of an input turn gives that turn's prompt id; `prompt_completed` with that id marks the input prompt as completed (no events, no state change).
   - **Pending provider prompt:** a `prompt_running` with another id that arrives **after** the input prompt is marked completed is remembered (latest one wins) as the pending provider prompt, with its notice. Before that point, a different id is ignored (Grok runs one prompt at a time; probe 2 A shows the queued prompt starts only after the input prompt completes).
   - **Ending an input turn:** on the `session/prompt` response, as today. **Hand-over (AR-005):** when a provider prompt is pending at that moment, the session emits in **one batch** `TURN_COMPLETED`/`TURN_INTERRUPTED`(input) + `TURN_STARTED`(provider) + the notice, and stays `prompting` (the provider turn is now active). AgentRun therefore never sees the run idle between the two turns, keeps any held message, and the session is never `ready` with a prompt request outstanding. If the pending prompt's `prompt_completed` arrived before the response (not observed), the pending prompt is dropped and only the input turn ends.
   - **Opening a provider turn while idle:** `prompt_running` in `ready` opens a provider turn (one batch: `TURN_STARTED` + notice) — probe 1.
   - **Ending a provider turn:** `prompt_completed` with the provider turn's prompt id → `endTurnFor(stopReason)` (`cancelled` → interrupted, otherwise completed), back to `ready`; AgentRun then drains held input as usual.
   - `cancel(turnId)` (sends `session/cancel`; probe 2 B: Grok ends the provider prompt at once with `cancelled`), the idle timer, `close()` and `fail()` treat both origins alike; `close()`/`fail()` also clear a pending provider prompt.
4. **Notice:** `GROK_PROVIDER_TURN_NOTICE_SENDER_ID = "system.grok_provider_turn"` in `agent-execution/domain/system-task-notification-senders.ts`, emitted as `SYSTEM_TASK_NOTIFICATION` with the payload keys the converter's events use (`turn_id`, `sender_id`, `content`, `message_id`) through a converter method `notice(content, senderId)`; the id is added to `RECORDED_SYSTEM_NOTICE_SENDER_IDS` (`agent-memory/services/runtime-memory-event-accumulator.ts`).
5. **Backend:** no change except the comment (item 3). (SR-002's optional item 5 is dropped, AR-006: AgentRun fails a refused start dispatch; held input waits because of AgentRun's own lifecycle, which the one-batch hand-over keeps busy.)
6. **Glossary:** `GLOSSARY.md` (Agent Runtimes) gets **Provider-started turn**: a turn the agent runtime starts itself, without input from AutoByteus (for example after a background command ends), shown in the run with a system notice; Claude CLI and Grok Build; origin `provider`.
7. **Scripted Grok** (`autobyteus-server-ts/tests/e2e/helpers/grok-fake-cli.ts`): replays the probes' frame orders: (a) a provider prompt after an input turn ended (probe 1); (b) a job ending during an input turn, with the hand-over order of probe 2 A (`turn_completed(input)` → `queue/changed(provider)` → `prompt_complete(input)` → response → provider content → `turn_completed(provider)`); (c) cancel of a provider prompt (probe 2 B); a finished tool's late `tool_call_update` keeps the probes' order (before the wake).

## Change Scope (Mandatory)

- In scope: UC-001, UC-002; files: ACP profile contract, ACP session, ACP converter (notice), backend comment, Grok profile + `grok-build-prompt-signals.ts`, notice sender ids, memory accumulator's recorded set, GLOSSARY.md, scripted Grok CLI, tests.
- Derived consumers (Principle 11): the `AcpSessionEffect` union — every branch over effect kinds (session `applyEffects`, test helpers) handles the two new kinds; DeepSeek profile produces none; `RECORDED_SYSTEM_NOTICE_SENDER_IDS` gains one id; the web renders `SYSTEM_TASK_NOTIFICATION` generically (check the notice shows; no web change expected).
- Deliberately left alone: the Grok prompt section text; DeepSeek behaviour; the backend's input and interrupt logic; AgentRun.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Spine |
| --- | --- | --- |
| BEH-001 | REQ-001, 002, 004; AC-001, 003, 005 | DS-001, DS-003 |
| BEH-002 (held input preserved) | REQ-003, REQ-005; AC-002, AC-006 | DS-002 |
| BEH-003 (stop) | REQ-003; AC-002 | DS-002 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (completes runtime behaviour AutoByteus dropped).
- Current design issue found: `No` — the session's single-origin turn model is extended, not bypassed.
- Structural triggers: *Several kinds or forms* (1): turns have two origins (`input`, `provider`) and a hand-over between them; each is traced (open, content, cancel, end, idle, close, held input). *Capability-area reuse* (4): profile effects for agent-specific traffic (existing pattern); `SYSTEM_TASK_NOTIFICATION` for the notice (Claude's pattern). *Vocabulary* (15): `provider` is the one word for a turn the runtime starts itself (Claude's existing origin); GLOSSARY.md gets "Provider-started turn"; effects are named after what Grok reports (`prompt_running`, `prompt_completed`). *Behavior by absence* (13): a provider turn opens on an explicit signal, never because an update arrived outside a turn (those stay dropped). *Split sequence* (2, 13): the hand-over is one session transition emitted as one batch, not two transitions AgentRun could act between.
- Deviations: None. Root cause: `Missing Invariant` (no rule for runtime-started turns). Refactor needed now: `No`.

## Legacy Removal / Persisted Data

- Removal: none. Persisted data: `Not Affected` (the notice is recorded through the existing memory path).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Grok `queue/changed` (running prompt) while the run is idle | `TURN_COMPLETED` / `TURN_INTERRUPTED` of the provider turn | `AcpAgentSession` |
| DS-002 | Return-Event | A user message held, or a stop, during an input or provider turn | message delivered after the provider turn ends; `session/cancel` → `turn_completed(cancelled)` | AgentRun → `AcpAgentRunBackend` → `AcpAgentSession` |
| DS-003 | Bounded local (session) | `prompt_running(other id)` after the input prompt completed | one batch at the `session/prompt` response: input end + provider start + notice | `AcpAgentSession` |

## Primary Execution Spine(s)

- DS-001: `Grok stdout → AcpClientConnection → AcpAgentSession.onExtNotification → Grok profile (prompt_running) → session opening step (provider) → converter: TURN_STARTED + notice → AcpAgentRunBackend.publish → AgentRun (busy) → session/update chunks → converter → … → Grok turn_completed → prompt_completed → endTurnFor → TURN_COMPLETED → AgentRun (idle, drains held input)`.
- DS-002 (held message, job ends mid-turn): `user message during input turn → AgentRun holds it (run busy) → … Grok frame 211 turn_completed(input) → prompt_completed: input prompt marked completed (no events) → frame 212 queue/changed(task-completed-*) → prompt_running: pending provider prompt → frame 215 session/prompt response → one batch [TURN_COMPLETED(input), TURN_STARTED(provider), notice] → AgentRun still busy, message stays held → provider content → turn_completed(provider) → TURN_COMPLETED(provider) → AgentRun idle → drains the held message → backend.dispatchUserInput → new input turn`.

## Ownership Map

- `AcpAgentSession`: turn lifecycle for both origins (open, hand-over, end, cancel, idle, close) and provider turn ids.
- Grok profile: reading Grok's signals into effects (no state).
- Converter: event shapes, including the notice.
- AgentRun (unchanged): holding and draining input by the run's busy/idle state.

## Interface Boundary Mapping

| Interface | Responsibility | Note |
| --- | --- | --- |
| `AcpSessionEffect` `prompt_running` / `prompt_completed` | the agent's prompt signals | profile → session; DeepSeek: none |
| `AcpSessionUpdateConverter.notice(content, senderId)` | the `SYSTEM_TASK_NOTIFICATION` event | beside `usage`/`compaction` |

No new port/adapter; each addition carries a rule or a translation.

## Removal / Decommission Plan (Mandatory)

None.

## Backward-Compatibility Rejection Log (Mandatory)

N/A.

## Concrete Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| Provider turn while idle (probe 1) | in `ready`: `queue/changed{running:"task-completed-X", text:"<system-reminder>…</system-reminder>"}` → batch [TURN_STARTED(provider), notice "Background task \"X\" completed (exit code: 0)…"] | opening a turn whenever any update arrives outside a turn |
| Own prompt | during an input turn, the first `queue/changed` with the input prompt's id → recorded as its prompt id | a second turn |
| Hand-over (probe 2 A, AR-005) | 211 `turn_completed(input)` → mark completed; 212 `queue/changed(task-completed-Y)` → pending; 215 response → one batch [TURN_COMPLETED(input), TURN_STARTED(provider), notice]; a held user message stays held until TURN_COMPLETED(provider) | ending the input turn at 211 (run idle for one batch: AgentRun dispatches the held message; either the backend refuses it and AgentRun fails it, or a second `session/prompt` goes out while the first is outstanding) |
| End of a provider turn | `turn_completed{prompt_id:"task-completed-Y", stop_reason:"end_turn"}` → TURN_COMPLETED | ending on `last_turn_summary` |
| Cancel a provider turn (probe 2 B) | `session/cancel` → `turn_completed{prompt_id:"task-completed-Z", stop_reason:"cancelled"}` → TURN_INTERRUPTED | — |

## Change / Refactor Sequence

1. Effect kinds + Grok interpretation (unit, from the probes' frames).
2. Session (unit): opening step for both origins; provider turn while idle; input prompt id and completion bookkeeping; pending provider prompt only after the input prompt completed; the one-batch hand-over at the response; provider end by matching id; cancel, idle, close/fail (clear pending) for both origins; DeepSeek-like profile (no effects) unchanged.
3. Notice sender id + converter + memory; GLOSSARY.md; backend comment.
4. Scripted Grok (orders a–c) + E2E: AC-001 (provider turn shown), AC-002 (stop), AC-003 (notice in memory after reload), **AC-006 (held message, job ends mid-turn: delivered after the provider turn, never failed, no second concurrent prompt)**.
5. Existing ACP suites (AC-004).
6. Live Grok attempt (AC-005; waived without credits — record the attempt and any refusal).

## Risks

- RSK-003: provider content arriving before the input prompt's response would land in the input turn (not observed: in probe 2 A the response came at t=60.0 and the provider content at t=61.2). Escalation trigger if seen.
- RSK-001 (unchanged): a client prompt sent at the instant Grok starts its own prompt.

## Guidance For Implementation

- Reproduction: `evidence/grok-acp-probe.jsonl` (t=81.4–85.4) and `evidence/grok-acp-probe2.jsonl` (A: t=41.6–61.3, frames 211-215; B: t=112.5–117.1) hold the exact frames to replay in unit tests and the scripted CLI.
- Live Grok tests: the founder's waiver covers a missing-credit refusal only; any other live failure is reported.
