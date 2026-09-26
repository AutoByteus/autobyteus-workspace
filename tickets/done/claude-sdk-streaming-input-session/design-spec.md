# Design Spec — Claude runtime on SDK streaming input (one live session process per run)

## Solution And Approval Basis

- Current solution revision ID: `SR-012` (adds usage accounting across process generations after CR-002 / API-F-001; SR-011 reviewed in ARCH-REV-004)
- Approved requirements baseline: `requirements-doc.md` at SR-011 (SR-006 plus REQ-012/AC-014..016, DEC-007 = A, user approval 2026-09-26). Earlier basis: SR-006 (BEH-001..008, UC-001..005, REQ-001..011, AC-001..013, SCN-001..007, DEC-001..006 all decided by the user on 2026-09-24/25; quotes in the requirements Document Status and SR-003..SR-006).
- Behavior-defining supplements: none. `probe-evidence/` is evidence only.
- Design status: `Ready` (round 5: the new section "Usage Accounting Across Process Generations (SR-012)" needs review; every other section is unchanged since ARCH-REV-004 Pass)
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/investigation-notes.md` (see "Architecture Investigation Findings (SR-007)" and "Architecture Review Round 1 Evidence (SR-008)").
- Base: `origin/personal` @ `6f7b5e371` (v1.4.81).

## Current-State Read

- `ClaudeSession.executeTurn` (`backends/claude/session/claude-session.ts`) opens one SDK `query({prompt: string})` per AutoByteus turn via `ClaudeSdkClient.startQueryTurn`. It iterates chunks, breaks on the terminal `result`, and closes the query in `finally`, so the CLI exits every turn (root cause, predecessor ticket). The turn id is locally generated at `startTurn`. Interrupt = `AbortController.abort()` + wait for settle. A per-turn `ClaudeActiveTurnExecution` and `activeQueriesByRunId` map track the one query.
- `ClaudeProviderSessionLifecycle` owns the provider UUID and enforces create-then-resume **per query**.
- `ClaudeAgentRunBackend` declares `activeTurnAppend: "unsupported"`, so AgentRun keeps input for a busy Claude agent in its FIFO until the canonical terminal (BEH-002).
- `ClaudeSdkClient.buildQueryOptions` forces `CLAUDE_CLI_RUNTIME_POLICY_ENV` (v1.4.78 temporary fix) and the explicit 10-tool built-in list.
- Image context files reach Claude only as text paths (`appendContextFileReferenceSection`); Codex and native AutoByteus send them inline.
- Token accounting (`claude-session-token-usage.ts` → `token-usage/projections/claude-sdk-model-usage-reconciler.ts`) already differences cumulative `modelUsage` per session and raw model.
- AgentRun (`domain/agent-run.ts`, `input/agent-run-input-admission-state.ts`) is provider-agnostic and already supports provider-announced turns (`TURN_STARTED` for any id) and append dispatch (Codex).

Health: the per-turn query is a lifecycle ownership mismatch with the CLI, not a local defect. The Claude session layer must be restructured around a run-lifetime process. AgentRun, the event pipeline, and the web need no structural change.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: rewrites the Claude session/turn layer (about 8 session files replaced or reshaped, plus 4 new owners), changes the SDK client API, flips the backend input capability, adds one event path (Claude notice → `SYSTEM_TASK_NOTIFICATION`), adds one memory trace type plus a history replay mapping, inline image building, and replaces several unit, integration and E2E suites.
- Architectural risk: `High`
- Risk rationale:
  - concurrency/lifecycle change: a process outlives turns; provider-initiated turns; mid-turn input; uuid attribution across merged/split CLI turns; interrupt with queued input; crash reopen;
  - contract change: Claude now supports `append_to_active_turn`;
  - reliance on an SDK option not declared in the `Query.interrupt()` signature (`interrupt({cancelQueued:true})`, protocol-documented and capability-advertised; RSK-006);
  - additive persisted memory trace type.
- Escalation trigger: return to Solution Designer if any of these hold:
  - the CLI emits turn boundaries that break the tracker invariants below (e.g. output frames with no preceding `init` while IDLE that are not provider turns);
  - `interrupt_cancel_queued_v1` is not advertised by a supported CLI, or an input reported `cancelled` still runs;
  - the usage reconciler double-counts or loses usage in the streaming lifecycle;
  - AgentRun needs a contract change beyond declaring append support.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Design Decision Supported |
| --- | --- | --- | --- |
| E-S1, O | `probe-evidence/probeE.log`, `probeO.log` | Background completion while idle → the CLI starts its own turn (`origin: task-notification`); background tasks survive `interrupt()` | Provider-initiated canonical turns; notice; interrupt keeps the process |
| J | `probeJ.log` | Completion while busy is absorbed into the running turn; foreground Bash also emits `task_*` | Notices come only from background-set tasks consumed by a provider-initiated turn |
| E-S2, M | `probeE.log`, `probeM.log` | Mid-turn input is picked up at the next tool boundary; inputs written while idle can run as consecutive CLI turns; `still_queued` input runs after interrupt | Canonical turn spans consecutive CLI turns while written input is unanswered; interrupt cancels still-queued inputs |
| F | `probeF.log` | `interrupt()` → `error_during_execution`/`aborted_tools`; process alive | Interrupt via `Query.interrupt()`; no abort |
| L | `probeJ.log` | `SIGKILL` → iterator throws; `resume` restores context | Crash handling + lazy reopen |
| K | `probeK-short.log` | HTTP MCP calls are not auto-backgrounded | No MCP background handling |
| N | `probeN.log` | `usage` per turn, `modelUsage`/cost cumulative | Keep the existing reconciler; verify (RSK-007) |
| G/H/I | `image-probe-results.md` | Base64/url image blocks work; the CLI resizes, detects formats, survives bad data, persists across resume | Inline images via content blocks, with no local resizing |
| P (both CLIs), P-prewait, Q | `probeP.log`, `probeP-prewait.log`, `probeQ.log` | `interrupt({cancelQueued:true})` cancels a queued input atomically; a Stop that arrives before the CLI reads the input does not cancel it (it runs and is answered); turns open with `system/init`; completion after the last tool boundary → a CLI-started turn immediately after the `result` | Uuid-accounted settlement; frame classification; completion carry-over |
| Code | `domain/agent-run.ts` L126-360 | Append is chosen only for an IDENTIFIED active turn; `acceptCommand` with the same open turn id is idempotent | Backend contract below |

## Intended Change

Replace the per-turn query with **one streaming-input SDK query per Claude AgentRun**, opened lazily on the first input (new or restored run) and closed only by run terminate/close, server shutdown, or an unexpected exit (reopened on the next input via `resume`). A new session-owned **turn tracker** derives canonical AgentRun turns from the CLI stream plus written input uuids, including turns the CLI starts itself (announced with a `SYSTEM_TASK_NOTIFICATION`). Claude declares `activeTurnAppend: "supported"`. Interrupt uses `Query.interrupt({cancelQueued:true})`, which atomically cancels still-queued inputs. Image context files become inline image blocks. The v1.4.78 policy env is deleted.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-004 | System | REQ-001, REQ-006; AC-001, AC-006, AC-007 | First input to a run; run terminate; server restart | Process per turn | One process per run for its whole life; lazy open; resume after restart | SPINE-1, SPINE-4 |
| BEH-002 | User/System | REQ-004; AC-003, AC-004 | Input while busy | Waits in FIFO | Written into the live session; attributed by uuid | SPINE-1, SPINE-2 |
| BEH-001, BEH-008 | System | REQ-002, REQ-003, REQ-009; AC-002, AC-010 | Background Bash; completion while idle | Disabled | Enabled; completion → notice + provider-initiated turn | SPINE-2, SPINE-3 |
| BEH-003 | User | REQ-005; AC-005 | Stop | Kills process | `interrupt()`, cancel still-queued uuids, `TURN_INTERRUPTED`; process and background tasks live on | SPINE-5 |
| BEH-006 | System | REQ-007; AC-008 | Terminate/close/shutdown | Closes the query | Closes the process (tasks die with it) | SPINE-4 |
| — | System | REQ-008; AC-009 | Unexpected exit | N/A | Active turn fails visibly; next input reopens via resume | SPINE-4 |
| BEH-005 | User | REQ-011; AC-012, AC-013 | Image attached | Path text | Inline image content blocks | SPINE-1 |
| BEH-007 | System | REQ-006; AC-007 | Restored run | Resume per turn | Resume once per process open | SPINE-4 |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `probe-evidence/*.mjs`, `*.log`, `image-probe-results.md` | Evidence for every tracker rule below. `lib.mjs` + probes can seed live API/E2E checks |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (runtime lifecycle migration)
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` (process lifetime owned per turn instead of per run)
- Refactor needed now: `Yes`
- Evidence: predecessor root cause; probes A–O; SDK streaming docs (investigation SR-002).
- Design response: a run-lifetime session process owner; a stream-derived turn tracker; the SDK client exposes a streaming session handle instead of per-turn queries; per-turn execution objects and the policy env are removed.
- Intentional deferrals: background-task UI (DEC-006); inline documents (DEC-004 scope).

## Terminology

- **CLI turn**: frames from the CLI between a turn opener (`system/init`, or the first content frame after a `result`) and its `result`.
- **Canonical turn**: the AgentRun turn (`turn_id`) the Claude backend announces with `TURN_STARTED` and settles with `TURN_COMPLETED`/`TURN_INTERRUPTED`/turn-terminal `ERROR`. It may span several consecutive CLI turns.
- **Written input**: an `SDKUserMessage` with our `uuid` written into the session input channel, not yet listed in any `result.user_message_uuids`.
- **Provider-initiated turn**: a CLI turn that opens (`system/init`) while the tracker is IDLE (e.g. after a background-task completion).
- **Accounted uuid**: a written uuid that is listed in some `result.user_message_uuids` (answered, including aborted results) or in an interrupt response `cancelled` list.

## Legacy Removal Policy (Mandatory)

- Policy: no backward compatibility; remove legacy code paths. There is no single-message fallback (DEC-005).

## Persisted Data / State Transition Decision

- Stored subject: external-runtime memory raw traces (per run, JSONL/records written by `external-runtime-memory-writer.ts`).
- Change: a new additive trace type `system_task_notification` (`content`, `sender_id`, `turnId`, `ts`), **written only for Claude background-task notices** (`sender_id === "system.claude_background_task"`). Other producers (e.g. skill-improvement notices on Codex or Claude runs) are not recorded, so their history behavior is unchanged (ARCH-F-004).
- Readers: `raw-trace-to-historical-replay-events.ts` gains one mapping. Older runs simply have no such traces.
- Claude provider session ids and transcripts are unchanged; existing runs resume normally.
- Decision: `Directly Usable — No Migration` (additive type. The reviewer confirmed that all trace readers treat `traceType` as an open string and that replay skips unknown types).

## Data-Flow Spine Inventory

- SPINE-1 Input: `AgentRun.dispatchUserInput(start_turn | append_to_active_turn)` → `ClaudeAgentRunBackend` → `ClaudeSession.submitInput` → **synchronously** `ClaudeTurnTracker.registerInput` (uuid allocated; may emit `TURN_STARTED`) → awaited `ClaudeSessionProcess.ensureOpen()` + `ClaudeUserMessageBuilder` (text + inline images + carried-over background completions) → `ClaudeSdkStreamingSession.send()` → CLI stdin. Any failure after `registerInput` → the tracker fails that canonical turn (turn-terminal `ERROR`), and the dispatch still returns `forwarded` with that turn id (ARCH-F-006; same as today's `startTurn` failure path).
- SPINE-2 Output/turns: CLI stdout → `ClaudeSdkStreamingSession.messages` → `ClaudeSessionProcess` pump → `ClaudeTurnTracker.observe(frame)` → the existing content/tool/text projectors and token usage, stamped with the canonical turn id → `ClaudeSessionEvent`s → `ClaudeSessionEventConverter` → AgentRun pipeline.
- SPINE-3 Background notice: `background_tasks_changed` / `task_started` / `task_notification` → `ClaudeBackgroundTaskRegistry` → on provider-initiated turn open → `SYSTEM_TASK_NOTIFICATION` session event → converter → AgentRun → web conversation + memory trace → run-history replay.
- SPINE-4 Process lifecycle: `ClaudeSessionManager.create/restore` → `ClaudeSession` (process not yet open) → first input → open (create or resume binding) → run lifetime → `terminate/close` → `ClaudeSessionProcess.close()`; unexpected stream end/throw → tracker fails the active turn → state CLOSED_UNEXPECTEDLY → next input reopens with `resume`.
- SPINE-5 Interrupt: `AgentRun.interrupt(turnId)` → backend → `ClaudeSession.interrupt(turnId)` → clear pending approvals → `streamingSession.interrupt({cancelQueued:true})` → the tracker records `cancelled` uuids and marks the turn interrupt-requested → the settlement rule (below) settles the turn when every written uuid is answered or cancelled → `TURN_INTERRUPTED` (or `TURN_COMPLETED` if the Stop arrived too early to affect anything; P-prewait).

## Spine Narratives (Mandatory)

### Frame classification (ARCH-F-002)

The tracker classifies every raw frame by `type`/`subtype`, from unfiltered captures (`probeP.log`, `probeQ.log`). **Only `system/init` opens a turn. Unknown frame kinds never open a turn.**

| Class | Frame kinds | While IDLE | While ACTIVE |
| --- | --- | --- | --- |
| Opener | `system/init` | Open a provider-initiated canonical turn | Mark `cliTurnOpen = true` (continuation) |
| Terminal | `result` (any subtype) | Anomaly (see below) | Apply the settlement rule |
| Turn content | `assistant`, `user` (tool_result, replays), `stream_event`, `system/compact_boundary`, `system/status`, `system/thinking_tokens`, `tool_progress`, `tool_use_summary`, and the other content frames the existing projectors handle | Anomaly | Forward to the projectors with the canonical `turnId` |
| Task | `system/background_tasks_changed`, `system/task_started`, `system/task_updated`, `system/task_progress`, `system/task_notification` | Registry only | Registry only (+ consumption tracking, SPINE-3) |
| Ignored | `command_lifecycle` (undeclared; diagnostics log only), `rate_limit_event`, `system/session_state_changed`, `system/notification`, `system/api_retry`, `auth_status`, any unknown kind | Ignore | Ignore |

Anomaly handling: log a warning with the frame kind and drop the frame. Never fabricate a canonical turn. Anomalies are covered by a unit test and surfaced in the escalation trigger.

### Canonical turn tracker (`ClaudeTurnTracker`, the single owner of canonical turn identity)

State: `IDLE` | `ACTIVE { turnId, origin: "input" | "provider", written: Set<uuid>, answered: Set<uuid>, cancelled: Set<uuid>, cliTurnOpen: boolean, interruptRequested: boolean, hadErrorResult: boolean }`.

Turn ids are `${runId}:turn:${randomUUID()}`, unique across the run's persisted history including after restore (ARCH-F-003).

1. `registerInput(dispatch)` runs synchronously and first in `submitInput` (before any await). It allocates the input uuid, then:
   - `start_turn` + IDLE → allocate `turnId`, ACTIVE(origin input), emit `TURN_STARTED`, add uuid to `written`, return `turnId`.
   - `start_turn` + ACTIVE (AgentRun raced a provider turn it had not yet observed; the reviewer verified this against `observeTurnStarted`/`applyDispatchResult`) → add uuid, return the active `turnId`. No second `TURN_STARTED`.
   - `append_to_active_turn(expected)` + ACTIVE with `turnId === expected` and not `interruptRequested` → add uuid, return `turnId`.
   - Anything else → reject `{forwarded:false, code:"CLAUDE_APPEND_TURN_MISMATCH"}` (a user-readable message), with no fallback to start. This mirrors the Codex contract. The reject happens before any `TURN_STARTED`, so it never violates AgentRun's "rejected after turn start" rule.
2. `failTurn(turnId, error)` (open/build/send failure after `registerInput`, ARCH-F-006): emit turn-terminal `ERROR` for the canonical turn, go IDLE. No uuid in it was sent, or the process is gone.
3. **Settlement rule (single rule, ARCH-F-001).** It is evaluated after every `result` and after every interrupt response. A canonical turn settles when **`cliTurnOpen === false` and every uuid in `written` is in `answered ∪ cancelled`**. The settle kind is:
   - turn-terminal `ERROR` if `hadErrorResult` (a non-interrupt error result occurred in this canonical turn);
   - else `TURN_INTERRUPTED` if `interruptRequested` and (any uuid was cancelled or any result in the turn after the interrupt had `terminal_reason` `aborted_*`/`error_during_execution`);
   - else `TURN_COMPLETED` (this includes a Stop that arrived before the CLI read the input, P-prewait: the input ran and was answered).

   After settling: IDLE. If not yet settleable, stay ACTIVE. The CLI will run the remaining written input as the next CLI turn (probe M), and that turn's `system/init` is a continuation.
4. `result` handling: add `user_message_uuids` to `answered`, set `cliTurnOpen = false`, record `hadErrorResult` for error subtypes other than interrupt aborts, emit token usage for the canonical `turnId`, then evaluate settlement.
5. Process exit while ACTIVE (SPINE-4): emit turn-terminal `ERROR`, IDLE. Unaccounted uuids died with the process (they did not run to completion and are reported failed by AgentRun).
6. Invariants:
   - I-1: every emitted `TURN_STARTED` is followed by exactly one settle (completed/interrupted/error) on every path (settlement rule, `failTurn`, exit, close).
   - I-2: no canonical turn is opened by anything other than `registerInput` (start) or `system/init` while IDLE.
   - I-3: a written uuid is never dropped from accounting. It leaves only via a `result` listing it, a `cancelled` response listing it, or process exit/close.

### SPINE-3 background notice rules (`ClaudeBackgroundTaskRegistry`, ARCH-F-005)

- `background_tasks_changed` replaces the live background set (id, type, description). `task_started` supplies descriptions. `task_notification` for a task that is or was in the background set records a completion `{taskId, description, status, seenAt}` as **unconsumed**. Foreground-task notifications (probe J) are ignored.
- **Consumption (ARCH-F-007):** an unconsumed completion becomes consumed only when, in the same CLI turn and **before `interruptRequested` is set**, both of the following happen after the notification: a `user` frame (tool_result) and then an `assistant` frame. The assistant frame shows that a new model call, which includes the queued notification, actually ran (probe J: notification 10.4 s → tool_result 24.4 s → assistant 26.9 s). Frames observed after `interruptRequested` never count. This covers the abort-generated `user` frames "The user doesn't want to proceed…" and "[Request interrupted by user for tool use]" (probes F, O, P `cq`). Completions still unconsumed at a `result` stay pending (probe Q: the model call in progress when the notification arrived has no preceding tool_result, so it is not consumed, and the CLI then starts its own turn).
- **Provider-initiated turn open:** drain all pending completions into one `SYSTEM_TASK_NOTIFICATION` (`sender_id: "system.claude_background_task"`, content `Background task completed: <description> (<status>)`, one line each), emitted right after `TURN_STARTED`. If none are pending, emit `Claude started a turn on its own.`.
- **Stop (`cancelQueued` dequeues queued uuid-less task notifications, per the SDK doc):** when a canonical turn settles as `TURN_INTERRUPTED`, pending completions are (a) announced in that turn before `TURN_INTERRUPTED` with the same notice text plus ` — Claude was stopped before reporting it`, and (b) kept as **carry-over**. The next input written to the CLI gets a leading text block `[System note: background task <id> (<description>) finished with status <status> while you were stopped; its output is at <output_file>.]` so the agent is still informed (REQ-002). Carry-over clears once it has been sent.
- Process exit/close clears the registry (the tasks died with the process).

### SPINE-4 lifecycle

`ClaudeSessionProcess` states `NOT_OPEN → OPEN → CLOSED | EXITED`.
- `ensureOpen()` builds the binding from `ClaudeProviderSessionLifecycle` (create with the reserved UUID on the first open, `resume` afterwards), starts the pump, and reads `capabilities` from the first `system/init`.
- If `interrupt_cancel_queued_v1` is missing, log a warning. The settlement rule still holds, but a Stop then cannot cancel queued input. That input runs and is accounted before the turn settles. This is not a compatibility path: the same rule simply observes different CLI behavior.
- The pump runs `for await` over the session messages. A normal end or throw while not closing → `EXITED`: the tracker fails the active turn (turn-terminal `ERROR` with the stderr diagnostics from `ClaudeProcessDiagnostics`), the registry is cleared, pending tool approvals are cleared.
- The next `submitInput` reopens via `resume`. `close()` (terminate/cleanup) marks closing, clears approvals, closes the query, awaits the pump, and never emits errors.

### SPINE-5 interrupt

Send state (ARCH-F-008): the session keeps each written uuid of the active canonical turn as `unsent` (registered, still in awaited `ensureOpen`/message build) or `sent` (`send()` returned). `submitInput` checks the uuid's state after its awaits, immediately before `send()`, and skips the send if the uuid has been cancelled.

- **Only unsent uuids** (e.g. Stop during the first or restored process open, or during an image read), whatever the process state (NOT_OPEN, opening, OPEN): mark them `cancelled` locally, make no SDK call, and settle through the normal settlement rule (`cliTurnOpen` is false, everything is accounted) → `TURN_INTERRUPTED`. An in-progress open continues and leaves the process OPEN for later input; a failed open after this is only logged, because no turn is active.
- **Some sent uuids** (process OPEN): mark the unsent ones `cancelled` locally as above, then call `interrupt({cancelQueued:true})` for the sent ones as described below.
- A process that is EXITED or CLOSED with an ACTIVE turn cannot occur: exit and close settle the turn first.

`interrupt(turnId)` verifies that ACTIVE `turnId` matches, sets `interruptRequested`, and clears and flushes pending approvals (existing coordinator). It then calls `streamingSession.interrupt({cancelQueued:true})`, adds the response's `cancelled` uuids to `cancelled`, and evaluates settlement. It resolves once the turn has settled (on the interrupted `result`, or immediately if all uuids are already accounted). The interrupt abort result (`error_during_execution` with `terminal_reason` `aborted_*` after `interruptRequested`) is not an error.

## Ownership Map

| Owner | Owns | Must not |
| --- | --- | --- |
| `ClaudeSdkClient` / `ClaudeSdkStreamingSession` | SDK loading, option building (tools list, env, MCP, `canUseTool`, executable path), the input channel, typed `send/interruptAndCancelQueued/close`, and the capability snapshot | Turn semantics, AgentRun concepts |
| `ClaudeSessionProcess` | Process open/resume/close, the pump, and exit detection | Turn ids, event naming |
| `ClaudeTurnTracker` | Canonical turn identity and settlement, input uuid attribution | SDK calls (receives callbacks), UI text formatting beyond notice text |
| `ClaudeBackgroundTaskRegistry` | The live background set and pending completions | Emitting turn events |
| `ClaudeUserMessageBuilder` | `AgentInputUserMessage` → `SDKUserMessage` (uuid, text, image blocks) | I/O beyond reading image files |
| `ClaudeSession` | Composition and public operations (`submitInput`, `interrupt`, `approveTool`, `terminate`, status snapshot) | Direct SDK access |
| `ClaudeAgentRunBackend` | AgentRun contract mapping, `activeTurnAppend: "supported"` | Turn bookkeeping |

## Removal / Decommission Plan (Mandatory)

- `ClaudeSdkClient.startQueryTurn`, `closeQuery` and the per-turn option shape → replaced by `openStreamingSession`.
- `CLAUDE_CLI_RUNTIME_POLICY_ENV` and its merge (REQ-009).
- `session/claude-active-turn-execution.ts` (delete); the per-turn `AbortController` interrupt path in `claude-session.ts`; `activeQueriesByRunId` in the manager, cleanup and state input.
- The per-query `buildNextQueryBinding/noteQueryOpened/closeCurrentQuery` cycle in `ClaudeProviderSessionLifecycle` → reshaped to a per-process-open binding.
- `appendContextFileReferenceSection` use for **image** files in the Claude path (non-image files keep it).
- Tests: `tests/integration/runtime-management/claude/client/claude-sdk-client-runtime-policy.integration.test.ts` (delete); `tests/e2e/runtime/claude-agent-background-bash-policy.e2e.test.ts` (replace with a background-task E2E); the pre-existing failing `claude-session.test.ts` interrupt/resume cases and the 3 mocked-SDK tests in `claude-agent-websocket-interrupt-resume.e2e.test.ts` (rewrite for the new lifecycle; do not skip).
- Docs: the `agent_execution.md` paragraphs "one `query({ prompt: string })` per AgentRun `start_turn` … does not use SDK `streamInput`", "Claude CLI runtime policy", "Claude active-turn closure … does not call SDK `Query.interrupt()`", and "AutoByteus and Claude declare append unsupported" → rewritten.

## Off-Spine Concerns

- Tool approvals (`canUseTool`): unchanged callback. Approvals during provider-initiated turns work the same way (the callback is query-level). Clear them on interrupt/exit/close.
- Workspace skill materialization, Agent Tools MCP descriptor: computed once per process open (currently per turn). Tool exposure and the MCP descriptor are fixed at bootstrap (`claude-session-bootstrapper.ts`, `ClaudeAgentToolsMcpSessionState.ensureDescriptor`), so a mid-run change is Not Reachable (review P-007) and there is no reopen-on-change.
- System prompt capture (`captureClaudeSystemInstructions`): once per process open.
- Selected-model binding for token usage (`claude-selected-model-turn-binding.ts`): resolve once per process open, and apply it to every result.
- Process diagnostics: keep the stderr buffer per process open.

## Dependency Rules

- `backends/claude/session/*` may depend on `runtime-management/claude/client` types, but only `ClaudeSessionProcess` calls the streaming session handle.
- `ClaudeTurnTracker` and `ClaudeBackgroundTaskRegistry` are pure (no SDK, no timers, no I/O). They are unit-testable against recorded probe frame sequences.
- No other module imports SDK message types except through the existing normalizers.

## Interface Boundary Mapping

```ts
// runtime-management/claude/client/claude-sdk-client.ts
openStreamingSession(options: ClaudeSdkStreamingSessionOptions): Promise<ClaudeSdkStreamingSession>;

interface ClaudeSdkStreamingSession {
  readonly messages: AsyncIterable<unknown>;              // raw SDK frames, the single consumer is the pump
  send(message: ClaudeSdkUserMessage): void;              // writes to the input channel
  interruptAndCancelQueued(): Promise<{ stillQueued: string[]; cancelled: string[] }>;
      // Query.interrupt({cancelQueued:true}); the option is undeclared in the d.ts signature, so it is
      // passed through one typed adapter here. Missing fields are normalized to [].
  readonly capabilities: ReadonlySet<string> | null;      // from the first system/init
  close(): void;                                          // ends the input channel and closes the query
}
// ClaudeSdkStreamingSessionOptions = the previous per-turn options minus prompt/abortController,
// plus sessionBinding (create|resume), systemPrompt, model, cwd, mcpServers, allowedTools,
// permissionMode, reasoning options, stderr, canUseTool.

// backends/claude/session/claude-session.ts
submitInput(message: AgentInputUserMessage, dispatch: { kind: "start_turn" } | { kind: "append_to_active_turn"; turnId: string }):
  Promise<{ accepted: true; turnId: string } | { accepted: false; code: string; message: string }>;
interrupt(turnId: string): Promise<void>;
```

The backend maps `submitInput` onto `AgentRunBackendInputDispatchResult` (`forwarded`, `turnId`, `platformAgentRunId`).

## Existing Capability Reuse Check

- AgentRun input admission, append dispatch and the canonical lifecycle: reused, **except the claim rule, which is corrected in "Shared AgentRun Append Claim (SR-011)"**. The original "reused unchanged" premise was false (IMP-DI-001).
- `SYSTEM_TASK_NOTIFICATION` canonical event and web rendering: reused (skill-improvement precedent).
- Token-usage reconciler (cumulative `modelUsage`): reused; verify (RSK-007).
- Content-block/tool/text projectors (`claude-session-content-block-processor.ts`, `claude-text-segment-projector.ts`, `claude-session-tool-use-coordinator.ts`): reused per frame with the tracker's turn id. The text projector becomes per canonical turn (created at turn open, finished at settle).
- Codex image URI resolution (`codex-user-input-mapper.ts`): extract the shared local-path/data-URL/http classification into `agent-execution/shared/context-image-source.ts` and use it from both Codex and Claude. This keeps one policy for resolving image URIs.

## Final File Responsibility Mapping

| File (under `autobyteus-server-ts/`) | Status | Responsibility |
| --- | --- | --- |
| `src/runtime-management/claude/client/claude-sdk-client.ts` | Modify | `openStreamingSession`; remove `startQueryTurn`/`closeQuery`/policy env; keep model discovery/capacity unchanged |
| `src/runtime-management/claude/client/claude-sdk-streaming-session.ts` | New | Input channel (async queue), typed handle, the `interrupt({cancelQueued:true})` adapter, the capability snapshot |
| `src/agent-execution/backends/claude/session/claude-session-process.ts` | New | Open/resume/close, pump, exit detection, diagnostics |
| `src/agent-execution/backends/claude/session/claude-turn-tracker.ts` | New | Canonical turn state machine (rules above) |
| `src/agent-execution/backends/claude/session/claude-background-task-registry.ts` | New | Background set + pending completions + notice text |
| `src/agent-execution/backends/claude/session/claude-user-message-builder.ts` | New | SDK user message with uuid, text, inline images (AC-012/013) |
| `src/agent-execution/shared/context-image-source.ts` | New | Shared image URI classification (local path, `file://`, data URL, http); used by Codex mapper and Claude builder |
| `src/agent-execution/backends/claude/session/claude-session.ts` | Rewrite | Composition; `submitInput`, `interrupt`, `terminate`, status snapshot |
| `src/agent-execution/backends/claude/session/claude-provider-session-lifecycle.ts` | Modify | Binding per process open |
| `src/agent-execution/backends/claude/session/claude-active-turn-execution.ts` | Delete | — |
| `src/agent-execution/backends/claude/session/claude-session-manager.ts`, `claude-session-cleanup.ts`, `claude-session-state-input.ts` | Modify | Drop `activeQueriesByRunId`; close the process on terminate/close |
| `src/agent-execution/backends/claude/session/claude-session-output-events.ts`, `claude-session-token-usage.ts`, `claude-text-segment-projector.ts` | Modify | Stamp the tracker turn id; interrupt results are not errors |
| `src/agent-execution/backends/claude/events/claude-session-event-name.ts`, `claude-session-event-converter.ts` | Modify | Add `SYSTEM_TASK_NOTIFICATION` → `AgentRunEventType.SYSTEM_TASK_NOTIFICATION {sender_id, content}` |
| `src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts` | Modify | `activeTurnAppend: "supported"`; map both dispatch kinds |
| `src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Modify | Use the shared `context-image-source.ts` (no behavior change) |
| `src/agent-execution/domain/system-task-notification-senders.ts` | New | Neutral home of `CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID = "system.claude_background_task"`, imported by both the Claude backend and agent-memory |
| `src/agent-memory/services/runtime-memory-event-accumulator.ts`, `src/agent-memory/store/external-runtime-memory-writer.ts`, `src/agent-memory/domain/memory-recording-models.ts` | Modify | Record the `system_task_notification` trace **only** for that sender id. Test that skill-improvement notices on Codex/Claude runs are still not recorded (ARCH-F-004) |
| `src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Modify | Replay it as `SYSTEM_TASK_NOTIFICATION` |
| `docs/modules/agent_execution.md`, `docs/modules/token_usage.md` (note only) | Modify | Lifecycle, append, interrupt, images, notice |
| Tests | Modify/New | Tracker and registry unit tests from recorded probe frame sequences; builder unit tests; client streaming unit tests; backend append tests; session integration (fake SDK stream) for crash/reopen/interrupt-with-queued; live E2E (gated `RUN_CLAUDE_E2E=1`) for AC-001..AC-009, AC-012 on PATH and bundled CLIs |

Web (`autobyteus-web`): no change expected (the notice already renders). Verify only.

## Concrete Shape Guidance

Conversation for a background build (AC-002):
```
TURN_STARTED t1 → assistant "starting build in background" → TURN_COMPLETED t1   (status idle)
… ~6 min …
TURN_STARTED t2 → SYSTEM_TASK_NOTIFICATION "Background task completed: Build macOS Electron app (completed)"
             → assistant "Build finished: …/AutoByteus.app" → TURN_COMPLETED t2
```

Interrupt with queued input (probe P `cq`): A starts t3; B is appended into t3 while a tool runs (`written={A,B}`) → Stop → `interrupt({cancelQueued:true})` returns `cancelled:[B]` → the aborted `result` answers `[A]` → accounted = {A, B}, `cliTurnOpen=false` → `TURN_INTERRUPTED t3`. AgentRun marks A and B interrupted, and B never ran.

Stop too early (probe P-prewait): A is written and Stop arrives before the CLI reads A → `cancelled:[]` → A runs, and its `result` answers `[A]` → settle `TURN_COMPLETED t4` (nothing was interrupted).

Completion during a long tool, then Stop (probe J shape + probe O shape, ARCH-F-007): the background task completes (unconsumed) while a foreground tool runs → Stop → abort frames `user` tool_result "The user doesn't want to proceed…" and `user` "[Request interrupted…]" arrive after `interruptRequested`, so they do not count → aborted `result` → `TURN_INTERRUPTED t7` preceded by the notice `Background task completed: … — Claude was stopped before reporting it` → the next input carries the `[System note: background task … finished …]` block.

Stop during the first open (ARCH-F-008): A is registered (`TURN_STARTED t8`) while `ensureOpen` spawns/resumes the process → Stop → A is unsent, so it is marked cancelled with no SDK call → `TURN_INTERRUPTED t8` → the open completes and the process stays OPEN; A is never sent.

Completion during the final reply (probe Q): the t5 `result` arrives with the completion unconsumed → `TURN_COMPLETED t5` → `system/init` while IDLE → `TURN_STARTED t6` + notice `Background task completed: … (completed)` → reply → `TURN_COMPLETED t6`.

## Backward-Compatibility Rejection Log (Mandatory)

- Single-message mode fallback: rejected (DEC-005).
- Keeping the policy env "just in case": rejected (REQ-009).
- An idle-close timer: rejected by the user (DEC-002).

## Change / Refactor Sequence

1. SDK client streaming handle + unit tests (fake SDK), plus a **live** gated check (`RUN_CLAUDE_E2E=1`, PATH and bundled CLIs) that `interrupt({cancelQueued:true})` returns `cancelled` and that a queued input does not run (probe P `cq` as the template). The `system/init` capabilities are asserted.
2. Tracker + registry (pure) with frame-sequence tests derived from the unfiltered captures (P, P-prewait, Q) plus probes E, F, J, M, O. This includes every frame class, the anomaly path, invariants I-1..I-3, the consumption rule for probes J, Q and the J+O Stop sequence (abort frames do not consume), and Stop with unsent uuids in every process state.
3. Message builder + shared image source (Codex mapper migrated with unchanged tests).
4. Session/process rewrite, manager/cleanup, backend capability flip; delete the per-turn code and the policy env.
5. Notice event + memory trace + history replay.
6. Docs; replace the E2E suites; live validation on both CLIs.

## Key Tradeoffs

- The canonical turn spans CLI turns: this matches AgentRun's append contract without changing AgentRun, at the cost of a canonical turn sometimes containing more than one CLI result.
- Stop uses `cancelQueued:true`: atomic for user input (the SDK's documented Stop-button mode), but it also drops queued background-task notifications. The registry announces and carries those forward.
- The process is kept for the run's life (user decision): about 150–170 MB per live Claude run.

## Risks

- RSK-002 (attribution races, now closed by uuid accounting); RSK-004 (crash).
- RSK-006: the `cancelQueued` option is undeclared in the d.ts signature. It is isolated in one adapter, capability-checked, and covered by a live gated test.
- RSK-007 (usage baseline after a crash reopen): verify against the SDK-documented zeroed crash results and the resumed saved total.
- Process memory (accepted).
- Append rejection if a canonical turn settles while AgentRun still sees it active (same as Codex; the entry fails visibly and is not lost silently).

## Guidance For Implementation

- Derive tracker tests from the recorded probe logs before wiring the session.
- Keep a single pump per process; never call `query.next()` elsewhere.
- Never emit `TURN_STARTED` without a matching settle on every exit path (settlement rule, `failTurn`, exit, close). Invariants I-1..I-3 must be unit-tested.
- Use `lib.mjs`-style probes for live verification; they run in about 1 minute each on `haiku`.

## Review Round 1 Resolution (ARCH-REV-001 → SR-008)

| Finding | Resolution | Evidence |
| --- | --- | --- |
| ARCH-F-001 (High) | Mechanism = `interrupt({cancelQueued:true})` (atomic, documented Stop mode, capability-advertised). Settlement is one uuid-accounted rule (answered ∪ cancelled, and no open CLI turn) and the `cliTurnOpen`-only immediate settle is removed. A too-early Stop settles `TURN_COMPLETED`. REQ-002 side effect handled by announcement + carry-over. Interface, RSK-006, examples and step 1 updated | Probes P `cq`/`cam` on the PATH 2.1.281 and bundled 2.1.280 CLIs; P-prewait; SDK d.ts L4398-4420 |
| ARCH-F-002 (Medium) | Explicit frame classification table; only `system/init` opens; unknown kinds are ignored; anomalies are dropped and logged | Unfiltered captures P/Q |
| ARCH-F-003 (Low) | `${runId}:turn:${randomUUID()}` | — |
| ARCH-F-004 (Medium) | Recording scoped to `sender_id === "system.claude_background_task"`; other producers are unchanged; test added | Review P-005 |
| ARCH-F-005 (Unclear) | Probed: a completion after the last tool boundary → the CLI starts its own turn right after the `result`. The registry keeps unconsumed completions (consumption = a later `user` frame in the same CLI turn) and notices them in that turn | Probe Q; probe J |
| ARCH-F-006 (Low) | `registerInput` is synchronous and first. Later failures go to `failTurn` (turn-terminal `ERROR`), and the dispatch returns `forwarded` with the turn id | AgentRun `applyDispatchResult` |
| P-007 | Closed: Not Reachable | Review |

## Review Round 2 Resolution (ARCH-REV-002 → SR-009)

| Finding | Resolution |
| --- | --- |
| ARCH-F-007 (Medium) | Consumption requires a `user` tool_result followed by an `assistant` frame after the notification, both before `interruptRequested`. Abort-generated frames never count. The Stop sequence was added to the examples and step-2 tests |
| ARCH-F-008 (Low) | Per-uuid send state. Unsent uuids are cancelled locally without an SDK call, in any process state; the SDK interrupt covers only sent uuids. The in-flight `submitInput` skips a cancelled send. An open in progress continues |
| Non-blocking (constant placement) | `CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID` moved to neutral `agent-execution/domain/system-task-notification-senders.ts` |

## Shared AgentRun Append Claim (SR-011, IMP-DI-001, REQ-012)

### Current defect

`AgentRunInputAdmissionState.claimNext` (`src/agent-execution/input/agent-run-input-admission-state.ts` L154-157) looks only at the first non-terminal entry and returns null unless that entry is `queued`. The entry whose `start_turn` opened the active turn stays `forwarded` until that turn's terminal, so a second input is never claimed as `append_to_active_turn`. This makes Codex `turn/steer` and Claude mid-turn delivery unreachable in the normal case (IMP-DI-001 repro: post A, then B → one `start_turn` dispatch only). The defect dates from `1e7837929`/`3f3aafa7c` (2026-08-13/15).

### Target claim rule (owner: `AgentRunInputAdmissionState`, shared by all runtimes)

`claimNext(selection)`:
1. Unchanged guards: no claim while `activeClaim` exists, while `selection.hasPendingTurnStart`, or while an interrupt reservation is active (`AgentRun.claimNextInput`).
2. Walk the non-terminal entries in FIFO order:
   - `forwarded` entry whose `associatedTurnId === selection.activeTurn.turnId` (the active IDENTIFIED turn): **skip**. It is already inside the running turn and will finish at that turn's terminal.
   - First `queued` entry reached → candidate.
   - Any other state before a candidate (`reserved`, `committed`, `claimed`, or `forwarded` into a different or unknown turn): **stop**, return null. This keeps FIFO order and the existing reservation semantics.
3. Candidate dispatch:
   - `activeTurn.kind === "NONE"` and no entries were skipped → `start_turn` (today's behavior).
   - `activeTurn.kind === "IDENTIFIED"`, `capabilities.activeTurnAppend === "supported"`, and the candidate is not marked `notInto === activeTurn.turnId` → `append_to_active_turn(activeTurn.turnId)`.
   - Otherwise → null. This covers unsupported runtimes, which keep waiting, and ANONYMOUS turns.

Runtimes without append support (native AutoByteus, and AGY if it declares unsupported) are unaffected because step 3 returns null exactly as today.

### Definitely-undelivered append (AC-016)

- `AgentRunBackendInputDispatchResult` gains an optional `undeliveredRetryAsStart?: true`. It is valid only with `forwarded:false` on an `append_to_active_turn` dispatch, and only when the backend guarantees that nothing reached the provider.
- `applyDispatchResult` for such a result returns the entry to `queued` at its original FIFO position and records `notInto = <that turnId>`. There is no failure notification. The entry becomes claimable as `start_turn` after that turn's canonical terminal (or as an append into a *different* later turn). The `notInto` mark prevents a busy retry loop against the same turn.
- Backends that set it:
  - Claude: the tracker's `CLAUDE_APPEND_TURN_MISMATCH` rejection. It is always pre-send, so delivery is definitely not done.
  - Codex: only the local pre-check in `codex-thread.ts` `appendInput` (`activeTurnId !== expectedTurnId`, before any RPC). An RPC-level `turn/steer` rejection stays a visible failure, as today, because delivery cannot be proven not to have happened.
- Any other `forwarded:false` result keeps today's behavior (visible failure; no fallback). The `agent_execution.md` rule "never falls back to start" is narrowed to "never falls back to start unless the backend proves the input was not delivered".

### Invariants preserved

- FIFO: appends are claimed in entry order, one active claim at a time. A skipped entry is always earlier and already inside the active turn.
- Exactly-once: an appended entry is `forwarded` with `associatedTurnId = T` and finishes at T's canonical terminal. The Claude tracker keeps T open until every written uuid is answered or cancelled, and Codex steer semantics are unchanged.
- Interrupt reservation: unchanged; no appends while one is active. Entries appended into T resolve `interrupted` with T.
- Termination: `prepareTermination` quiesces admission and drains; queued entries may now be appended into the active turn instead of waiting. They still resolve at a terminal before quiescence completes. Root-shutdown fencing is unchanged (it cancels only committed/queued entries).

### Files and tests (additions to Final File Responsibility Mapping)

| File | Status | Responsibility |
| --- | --- | --- |
| `src/agent-execution/input/agent-run-input-admission-state.ts` | Modify | Claim rule above; the `notInto` mark; requeue on `undeliveredRetryAsStart` |
| `src/agent-execution/input/agent-run-input-contract.ts` | Modify | Optional `undeliveredRetryAsStart` on the dispatch result |
| `src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts` | Modify | Set it for `CLAUDE_APPEND_TURN_MISMATCH` |
| `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`, `.../codex/thread/codex-thread.ts` | Modify | Distinguish the local pre-check mismatch (retryable) from an RPC rejection (not retryable) |
| `docs/modules/agent_execution.md` "Active Input And Interrupt Command Results" | Modify | Describe the claim rule and the narrowed fallback rule; Claude now declares append support |
| `tests/unit/agent-execution/input/agent-run-input-admission-state.test.ts`, `tests/unit/agent-execution/agent-run.test.ts` | Modify/New | IMP-DI-001 repro (post A then B → append into A's turn); B and C ordered; a reservation ahead blocks; an interrupt reservation blocks; a pending start blocks; unsupported runtime still waits; `undeliveredRetryAsStart` requeues without failure and without a retry loop; an ambiguous rejection still fails; termination with appended entries |
| `tests/unit/agent-execution/backends/codex/*`, `.../claude/claude-agent-run-backend.test.ts` | Modify | Retryable vs non-retryable mapping |
| API/E2E | New | AC-014: gated live Codex check (a message to a busy Codex agent is steered into the same turn) plus fake-CLI/fake-app-server websocket E2E for Claude (AC-003) and Codex. AC-016 race via fake backends. Team `send_message_to` to a busy member for both runtimes (AC-004) |

### Classification impact

It stays `Large` / `High`. This adds a shared input-contract change that affects Codex runtime behavior (mid-turn delivery now reachable) and narrows a documented rule. Independent architecture review is required for this section.

## Usage Accounting Across Process Generations (SR-012, CR-002 / API-F-001 / RSK-007)

### Evidence

- API/E2E API-REV-001, live on PATH 2.1.283 and bundled 2.1.280 (`api-e2e-evidence/c08-life-05-crash-and-usage.log`, `c08b-rsk007-usage-probe.log`):
  - After SIGKILL, the resumed process restarts its cumulative `modelUsage` from the **last clean-exit persisted total** (0 in the test). The first post-crash result's cumulative equalled its main-loop usage (16,084).
  - `reconcileClaudeSdkResult` sees a regression against the same session and raw-model checkpoint and suppresses the row (`claude_sdk_selected_regressed`). This loses one completed turn per crash.
  - A clean close followed by restore continues from the persisted total and counts correctly (13,930 / 14,015 == main loop).
- On base, every turn was its own process and exited cleanly, so this loss did not happen. This is a regression against REQ-010.
- Origin is not always 0. A restored run that crashes later restarts from its restore-time total. If that origin plus the new turn exceeds the pre-crash checkpoint, the reset is **not detectable** as a regression, and the reconciler would under-count silently. So a regression-only rule is insufficient.

### Rule (owner: token-usage reconciler; signal owner: Claude session)

1. The Claude session marks the **first result of every process generation opened with `resume`** by setting `claude_sdk_series_restart: true` on that result's `TOKEN_USAGE_UPDATED` params. This covers first input after restore, reopen after an unexpected exit, and reopen after any close. The session knows this from `ClaudeSessionProcess` (binding kind + a first-result flag per open). It does not need to know whether the previous exit was clean.
2. `reconcileClaudeSdkResult` (`src/token-usage/projections/claude-sdk-model-usage-reconciler.ts`), for an observation with `claude_sdk_series_restart: true`:
   - **Selected row** (matched): the admitted delta is the observation's **per-turn main-loop usage** (`claude_sdk_main_loop_usage`: input, output, cache read, cache creation). The CLI's result `usage` is documented as per turn (probe N), so it does not depend on the unknown restart origin. The selected-model checkpoint for this session is then **set to the observed cumulative row**, which re-anchors the series. Flag: `claude_sdk_series_restart_main_loop_delta`, not `regressed`.
   - Non-selected rows: re-anchor the checkpoint to the observed row without contributing (they never reach the public meter).
   - Selected match missing or ambiguous, or main-loop usage unavailable: keep today's handling (flags and partial), with no guessing.
3. Observations without the marker keep today's cumulative differencing and regression semantics unchanged. That includes same-process turns (exact) and `create` generations (zero origin).
4. The first result of a `create` generation is unchanged: a new session has a zero origin, so differencing is exact.

### Why this rule

- It is correct for any restart origin (0, restore-time total, or anything else), because it never reads the cumulative value across a generation boundary.
- Approximation: main-loop usage excludes selected-model usage by auxiliary loops within that one turn (e.g. background compaction). There are no Agent/subagent tools in AutoByteus's tool list. This applies to at most one turn per process open, and the flag marks it.
- There is no persisted lifecycle state and no new series identity; the existing checkpoint JSON shape is unchanged.

### Files and tests (additions)

| File | Status | Responsibility |
| --- | --- | --- |
| `src/agent-execution/backends/claude/session/claude-session.ts` / `claude-session-process.ts` | Modify | Track the first result per resume-opened generation; pass the marker |
| `src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Modify | Emit `claude_sdk_series_restart` |
| `src/agent-execution/domain/claude-sdk-usage.ts` (payload types) | Modify | Optional `claude_sdk_series_restart` field |
| `src/token-usage/projections/claude-sdk-model-usage-reconciler.ts` | Modify | Rule 2 |
| `docs/modules/token_usage.md` | Modify | Correct "a resumed process continues from the totals its transcript saved" to "only after a clean exit". Document the series-restart rule and its flag |
| `tests/unit/token-usage/...reconciler...test.ts` | Modify/New | Crash restart from origin 0 (the regression case), restart from a restore-time origin whose value exceeds the old checkpoint (undetectable-reset case), clean restore, same-process turns unchanged, create unchanged, missing main-loop usage |
| `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` `-t "RSK-007"` | Existing | Already encodes the intended outcome (counted, not regressed, main-loop ≤ total ≤ cumulative) |

### OBS-2 (inherited `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`)

Decision: AutoByteus does **not** override an operator's explicit environment. That would be a new hidden policy, which is the reverse of REQ-009. Instead:
- when the streaming session opens and the spawn env contains `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, log one warning per process open that background tasks are disabled by the environment;
- add an operator note to `agent_execution.md`.

Files: `claude-sdk-client.ts` (warning at `openStreamingSession`), `docs/modules/agent_execution.md`.

### Classification impact

It stays `Large` / `High`. This change touches the shared token-usage reconciler contract (a new observation field and rule) for Claude observations only.
