# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Package identifier: `claude-sdk-streaming-input-session`
- Request / ticket: Follow-up approved by the user on 2026-09-24 in `claude-sdk-background-task-lifecycle`: migrate the Claude Agent SDK backend to streaming input mode. Start request: "since its released. now we could work on the second ticket right?"
- Requirements owner: solution_designer
- Date: 2026-09-24
- Approval state and reference: Approved by the user on 2026-09-25 through explicit decisions on every open item: DEC-002 (SR-003), DEC-001 (SR-004), DEC-003/005/006 ("I accept … your earlier recommendations: turns claude starts by itself, messages to a busy agent, roll out, and no background task UI", SR-005) and DEC-004 ("lets keep also use inline image in this ticket", SR-006). Direction confirmed earlier: "We should keep one process per agent run. That's definitely right."
- Exact approved requirements baseline: this document at SR-006 (BEH-001..008, UC-001..005, REQ-001..011, AC-001..013, SCN-001..007, DEC-001..006 decided)
- Behavior-defining supplements: none. `probe-evidence/` (incl. `image-probe-results.md`) is evidence only

## Problem And Desired Outcome

- Problem: the Claude backend starts a new Claude CLI process for every turn and closes it when the turn ends (SDK "single message input" mode). Consequences:
  - background work dies at turn end (temporarily avoided by disabling it in v1.4.78);
  - interrupt kills the whole process;
  - messages sent to a busy agent must wait for its turn to end;
  - every turn pays process startup.
  The SDK documents streaming input mode (one long-lived process per session) as the preferred mode for hosted interactive agents.
- Desired outcome: each Claude agent run keeps one Claude session process for the whole life of the run, like the Codex runtime keeps its app-server. Background tasks work end to end; interrupt stops only the current turn; messages reach a busy agent; the temporary v1.4.78 workaround is removed.
- Observable definition of success: an agent can start a long build in the background, keep talking, and later report the result on its own. A teammate's message reaches a working Claude agent without waiting for its turn to end. Stop ends the turn without restarting Claude.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | Background Bash disabled; foreground ceiling 30 min | Background Bash enabled and survives turn end; the completion reaches the agent; CLI default timeouts restored | — | Probe E-S1 |
| BEH-002 | User/System | SCN-003 | A message to a busy agent waits for its turn to end | Delivered into the running turn | FIFO ordering; exactly-once delivery | Probe E-S2 |
| BEH-003 | User | SCN-004 | Interrupt kills the process | Interrupt ends the current turn; process and conversation stay live | Stop button semantics; `TURN_INTERRUPTED` | Probe F |
| BEH-004 | System | SCN-005 | New process per turn; none while idle | One process per run, alive for the whole run (including while idle) and closed only by run terminate/close or server shutdown | Conversation continuity (resume) | Codex app-server lifecycle (`codex-app-server-client-manager.ts`) |
| BEH-006 | System | SCN-006 | Terminate closes the active query | Terminate closes the process and its background tasks | Terminate semantics | — |
| BEH-007 | System | SCN-005 | Restored runs resume by session id | Unchanged, via reopen | Yes | — |
| BEH-005 | User | SCN-007 | Image context files reach Claude as text path references; the model must call `Read` to see them | Image context files are sent to Claude inline as image content blocks with the message, like Codex and native AutoByteus | Non-image context files keep path references | Probes G/H/I |
| BEH-008 | User | SCN-002 | No provider-initiated turns exist | A turn Claude starts itself (e.g. after a background task finishes) appears as a normal agent turn with a short notice | — | Probe E-S1 |

## Scope Guardrail

### In-Scope Use Cases

- UC-001: A Claude agent runs long work in the background and reports on it later (standalone and team).
- UC-002: The user or a teammate sends a message to a Claude agent that is working.
- UC-003: The user stops a Claude agent's current turn and continues the conversation.
- UC-004: A Claude run keeps its session process for its whole life, and restored runs resume seamlessly.
- UC-005: The user attaches an image to a message for a Claude agent.

### Out Of Scope

- Inline **documents** (PDF, DOCX, …) stay path references; only images become inline (DEC-004).
- A background-task panel, per-task stop button, or running-task indicator in the UI — DEC-006.
- Exposing more Claude built-in tools (the explicit 10-tool list stays; `Monitor`/`Agent`/etc. stay hidden).
- Codex and AutoByteus-native runtimes; live model/permission switching mid-run.
- Keeping background tasks alive across server restart or run terminate.

### Non-Goals

- A compatibility flag to fall back to single-message mode (clean cut; DEC-005).

### Preserved Behavior Boundary

BEH-007; tool approval flow; AutoByteus team tools and skills; token usage/cost accounting per turn; run history and memory recording; canonical lifecycle rules in `docs/modules/agent_execution.md`; the explicit built-in tool list.

### Review Authority

Standard: blocking findings must cite REQ/AC/BEH IDs; scope changes are Requirement Gaps needing user approval.

## Requirements

| ID | Requirement | Behavior IDs | Priority |
| --- | --- | --- | --- |
| REQ-001 | Each live Claude run uses one long-lived Claude session process across its turns (SDK streaming input), instead of one process per turn | BEH-004 | Must |
| REQ-002 | Background Bash commands keep running after the agent's turn ends and are only stopped by the rules in REQ-007/REQ-008. The completion is delivered to the same agent | BEH-001 | Must |
| REQ-003 | A turn Claude starts without new input (e.g. after a background task completes) is a first-class turn: status goes running → idle, output streams to the UI and team, it is recorded in memory/run history, token usage is counted, and it can be interrupted. It is preceded by a notice in the conversation, emitted as the existing canonical `SYSTEM_TASK_NOTIFICATION` event, summarizing why it started (e.g. "Background task completed: <description> (<status>)"); the notice is also recorded in run history | BEH-008 | Must |
| REQ-004 | Input accepted while a Claude turn is active (from the user or a teammate) is delivered into the running Claude session without waiting for the turn to end. Order is preserved, and each input's accepted/forwarded/completed status resolves exactly once | BEH-002 | Must |
| REQ-005 | Interrupt ends the current turn only. The Claude process, the conversation and already-running background tasks stay alive, and the next message is answered without a restart | BEH-003 | Must |
| REQ-006 | The Claude session process lives exactly as long as its agent run. There is no idle timer or other automatic close. It is closed only by run terminate/close (standalone or via team terminate), by server shutdown, or by an unexpected exit (REQ-008). A restored run (e.g. after a server restart) opens its process on activation or first input and resumes with full conversation context | BEH-004, BEH-007 | Must |
| REQ-007 | Run terminate/close and server shutdown close the Claude process, which stops its background tasks. No orphaned Claude processes remain | BEH-006 | Must |
| REQ-008 | If the Claude process exits unexpectedly, the active turn (if any) ends with a visible error, and the next input reopens the session via resume | BEH-004 | Must |
| REQ-009 | The temporary v1.4.78 policy (`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, `BASH_MAX_TIMEOUT_MS=1800000`) is removed; Claude CLI defaults apply | BEH-001 | Must |
| REQ-010 | Preserved behavior (see boundary) keeps working | — | Must |
| REQ-011 | Image context files attached to a message for a Claude agent (local path, `file://`, data URL, or http(s) URL) are delivered to Claude inline as image content with that message, so Claude sees them without a tool call. Non-image context files keep today's path-reference behavior. An unreadable image yields a visible, non-fatal outcome and the session continues | BEH-005 | Must |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-005 | Three consecutive messages to one Claude run | One Claude CLI process serves all three turns (same pid); context is retained | Live E2E + process check |
| AC-002 | REQ-002, REQ-003 | SCN-002 | Agent runs `sleep 20; echo done > marker` in the background and ends its turn | Status goes idle; after about 20 s, a notice plus a new agent turn appear without user input; the marker exists; the turn is recorded in run history with token usage | Live E2E (server, websocket) |
| AC-003 | REQ-004 | SCN-003 | Second user message sent while the agent runs a 20 s foreground command | Delivered into the running turn; the agent's reply addresses both; both inputs resolve completed exactly once | Live E2E + unit |
| AC-004 | REQ-004 | SCN-003 | Teammate `send_message_to` a Claude member that is mid-turn | Delivered into the running turn (no wait for turn end) | Live team E2E |
| AC-005 | REQ-005 | SCN-004 | Stop during a long foreground command | `TURN_INTERRUPTED`; same pid afterwards; the next message is answered; a background task started earlier is still running | Live E2E |
| AC-006 | REQ-006 | SCN-005 | Run left idle (no turn, no background task), then a new message | Same process (same pid) answers; no process was closed or re-spawned while idle | Live E2E + process check |
| AC-007 | REQ-006, BEH-007 | SCN-005 | Server restart, then a message to a restored Claude run | A new process resumes the session; the agent recalls an earlier fact | Integration/live |
| AC-008 | REQ-007 | SCN-006 | Terminate a run with a running background task | Process and task processes exit; no orphan remains | Live E2E + `ps` |
| AC-009 | REQ-008 | — | Kill the Claude CLI process mid-turn | Turn ends with a visible error; the next message works and has context | Integration/live |
| AC-010 | REQ-009 | — | Query options inspection | Neither policy variable is set by AutoByteus | Unit |
| AC-012 | REQ-011 | SCN-007 | User attaches a screenshot (local context file) and asks about it; Claude has no Read call in that turn | Claude answers from the image; no `Read` tool call is needed | Live E2E |
| AC-013 | REQ-011 | SCN-007 | Attached image path is missing/unreadable, or an http image fails | The message still reaches Claude with a clear note that the image could not be attached (or Claude's graceful reply); no crash; session continues | Unit + integration |
| AC-011 | REQ-010 | — | Existing Claude unit/integration/E2E suites; tool approval; team tools | Pass (pre-existing known failures in the rewritten area are fixed or replaced, not skipped) | Suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Expected Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User → Claude agent | Long build without blocking the conversation | "build the Electron app" | Agent starts the build in the background, stays responsive | Supported Normal |
| SCN-002 | System | Claude CLI | Background task completes | Task exit | Notice + agent turn reporting the result | Supported Normal |
| SCN-003 | User/System | User or teammate | Steer or inform a working agent | Message while running | Delivered mid-turn | Supported Normal |
| SCN-004 | User | User | Stop the current turn | Stop button | Turn ends, session continues | Supported Normal |
| SCN-005 | System/Operational | Server | Keep the session for the run's life; resume after restart | Run lifetime / restore | Same process while the run lives; resume after restart | Supported Normal |
| SCN-007 | User | User → Claude agent | Show Claude a screenshot | Attach image + message | Claude sees and discusses the image | Supported Normal |
| SCN-006 | User/Operational | User / server | End a run | Terminate / shutdown | Process and tasks stop | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small). The only new UI element is the system notice before a Claude-initiated turn (REQ-003), shown in the conversation with the existing system-message styling. No new controls. Prototype: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| QR | Related | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-006, REQ-007 | Operability | Exactly one Claude process per live Claude run, and none after the run is terminated/closed or the server shuts down (no orphans). Memory scales with live Claude runs (about 170 MB physical footprint each, measured 2026-09-25); closing unused runs is the user's lever via terminate |
| QR-002 | REQ-001 | Compatibility | Works with the PATH `claude` and the SDK-bundled CLI |
| QR-003 | REQ-004, REQ-005 | Reliability | No lost or duplicated inputs across mid-turn delivery, message merging, interrupt and reopen |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` schema change. Stored Claude session ids and run history remain valid. Background task output files are CLI-owned temp files, and loss at process close is acceptable.

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| Claude Agent SDK 0.3.280 streaming input (`query({prompt: AsyncIterable})`, `interrupt()`, result `origin`/`user_message_uuids`) | Documented contracts only; do not rely on undocumented `priority` | SDK docs; probes E/F |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `probe-evidence/probeE.*`, `probeF.*` | Live streaming-mode evidence | Evidence only |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | About 170 MB (physical footprint) per live Claude run is acceptable; users terminate runs they no longer need. An idle close can be a later, separate change if memory becomes a real problem | Accepted by the user (DEC-002) |

## Open Decisions And Questions

| ID | Question | Recommendation (written into the REQs) | Alternatives | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | How to show a turn Claude starts by itself | **Decided 2026-09-25 by the user: a notice line in the conversation, sent as the existing canonical `SYSTEM_TASK_NOTIFICATION` event** (the same event and conversation rendering already used for team task-delegation notices), carrying the task description and status from Claude's `task_notification`; the agent's turn follows as normal. User: "if you use a system task notification then that's a good one" | No notice | Decided |
| DEC-002 | Idle process policy | **Decided 2026-09-25 by the user: no idle timer. The process lives as long as the run, like Codex; only terminate/close/shutdown (or a crash) ends it.** User: "it should leave as long as the run … no idle timer … similar to codex runtime … more understandable codes" | — | Decided |
| DEC-003 | Messages to a busy Claude agent | Deliver into the running turn (like Codex) | Keep waiting for the turn to end | **Decided: deliver into the running turn (like Codex).** User 2026-09-25: "I accept … your earlier recommendations: turns claude starts by itself, messages to a busy agent, roll out, and no background task UI" |
| DEC-004 | Inline images/documents | **Decided 2026-09-25 by the user: include inline images in this ticket** ("if use inline image is not complicated … lets do it in this ticket"; "do some experiments, and find out how to inline image, then lets keep also use inline image in this ticket"). Probes G/H/I show it is simple | — | Decided |
| DEC-005 | Rollout | Clean switch; remove the v1.4.78 policy env; no fallback flag | Keep single-message mode behind a flag for one release | **Decided: clean switch; remove the v1.4.78 policy env; no fallback flag.** User 2026-09-25: "I accept … your earlier recommendations: turns claude starts by itself, messages to a busy agent, roll out, and no background task UI" |
| DEC-006 | Background task UI (indicator/stop per task) | Out of scope (later ticket) | Include now | **Decided: no background-task UI in this ticket.** User 2026-09-25: "I accept … your earlier recommendations: turns claude starts by itself, messages to a busy agent, roll out, and no background task UI" |

## Traceability

| REQ | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-004 | BEH-004 | AC-001 | SCN-005 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-001, SCN-002 |
| REQ-003 | UC-001 | BEH-008 | AC-002 | SCN-002 |
| REQ-004 | UC-002 | BEH-002 | AC-003, AC-004 | SCN-003 |
| REQ-005 | UC-003 | BEH-003 | AC-005 | SCN-004 |
| REQ-006 | UC-004 | BEH-004, BEH-007 | AC-006, AC-007 | SCN-005 |
| REQ-007 | UC-004 | BEH-006 | AC-008 | SCN-006 |
| REQ-008 | UC-004 | BEH-004 | AC-009 | — |
| REQ-009 | UC-001 | BEH-001 | AC-010 | — |
| REQ-010 | all | — | AC-011 | — |
| REQ-011 | UC-005 | BEH-005 | AC-012, AC-013 | SCN-007 |

## Architecture Phase Input

- Technical facts to verify: turn-boundary signals (`system init`/`result`, `session_state_changed`); uuid-based input attribution including merged messages and races with CLI-initiated turns; approval callbacks in CLI-initiated turns; crash detection; process lifetime vs. AgentRun lifecycle; interaction with the AgentRun FIFO when the provider opens a turn.
- Known risks: RSK-001..005 in the investigation notes. Expected classification: Large / High, so independent architecture review applies.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: `Yes`
- Desired and preserved behavior explicit: `Yes`
- Scope and non-goals clear: `Yes`
- REQ/AC testable and traceable: `Yes`
- Scenarios covered: `Yes`
- UI/UX: `Yes` (small; no prototype needed)
- Assumptions/decisions visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-09-25; see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
