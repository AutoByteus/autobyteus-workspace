# Investigation Notes

## Investigation Meta

- Package identifier: `segment-lifecycle-error-flood`
- Request / ticket: Project Task "Investigate: a full screen of 'An Error Occurred: A runtime segment event violated the canonical lifecycle contract.' in a Claude Agent SDK agent's chat (possible product bug)", delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), reported by the user 2026-10-18.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood`, branch `codex/segment-lifecycle-error-flood`
- Resolved base remote / branch / revision: `origin/personal` @ `1c718202b2` (fetched 2026-10-18; contains `v1.5.6-beta.2`)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile` and server `prebuild` succeeded.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-18); `AGENTS.md`, `TESTING.md` (2026-10-18). Architecture gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (2026-10-18, see design spec).
- Investigation status: Complete for the Claude cause (reproduced, mechanism instrumented); Codex rejections classified (separate cause, follow-up).

## Initial Request And Clarifications

- Original request: explain why a Claude Agent SDK team member (implementation engineer of team run `software_engineering_team_842188724b884b62adaa0decfd93278b`, member run `implementation_engineer_f54d90f354554c45bf4f180a2f4f9dca`) shows a chat full of red cards "An Error Occurred — A runtime segment event violated the canonical lifecycle contract." while the agent shows Idle and appears to work; answer whether it is a bug and whether content is lost; regression or older; decide what the user should see; fix it if it is a clear product bug.
- Clarifications received: none needed; the delegator states the direction (investigate, reproduce in isolation, report cause and recommended fix, fix if clear product bug, tests, ships with the next beta/release).
- User-supplied facts and constraints: runtime `claude_agent_sdk`; user runs v1.5.6-beta.1; the user's real data stays untouched (read log and run memory only); reproduce in isolation; TESTING.md applies.
- Initial ambiguity: the server log has 1,965 Codex rejections; whether they relate to the Claude symptom.

## Product And Domain Understanding

- Product area: agent run event pipeline (canonical turn/segment lifecycle), Claude Agent SDK runtime (provider-initiated turns after background tasks), chat rendering of turn diagnostics.
- Affected actors or systems: the user watching an agent's chat; every Claude Agent SDK run that uses background tasks (Bash `run_in_background`, Monitor, subagents); AgentRun status consumers (status dot, Stop control, input admission, idle shutdown evaluation).
- Existing user or operational purpose: the chat shows the agent's text, tool calls and turn status live; background tasks let Claude keep working and resume on its own when a task finishes.
- Relevant terminology:
  - *Turn*: one canonical AgentRun turn (`TURN_STARTED` … `TURN_COMPLETED`/`TURN_INTERRUPTED`/error).
  - *Provider-initiated turn*: a turn Claude CLI starts on its own (`system/init` while idle), e.g. after a background task completes. Introduced by the streaming-input Claude session (`26450e6b08`, first released in `v1.4.85`).
  - *Segment*: a text/reasoning/tool block of a turn (`SEGMENT_START`/`SEGMENT_CONTENT`/`SEGMENT_END`).
  - *Runtime lifecycle snapshot*: `backend.getLifecycleSnapshot()`, the runtime's *live* current turn/phase.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | User | Task screenshots `ctx_f015e3c5ad6a__user-screenshot-1.png`, `ctx_9e0cb5dd952f__user-screenshot-2.png` | Symptom | Repeated cards "An Error Occurred / A runtime segment event violated the canonical lifecycle contract."; a normal Bash tool card between them; header status "Idle". No agent text visible. | Explain cards, missing text, Idle |
| 2026-10-18 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.ts` | Source of the message | `diagnostic(event)` emits one `ERROR {code: AGENT_SEGMENT_LIFECYCLE_INVALID, error_scope: turn, error_effect: diagnostic}` for **every** rejected segment event that carries a turn id, including every `SEGMENT_CONTENT` delta. Nothing is logged; the rejected event is dropped. | Flood + silent server |
| 2026-10-18 | Code | `.../segment-lifecycle/agent-segment-lifecycle-state.ts` | Admission rules | `reconcileBeforeBatch(snapshot)` opens the snapshot's current turn; `openTurn(X)` retires any different active turn; retired turns can never reopen; segment start/content/end of a retired turn → `REJECTED`. `REJECTED` carries no reason. | Root cause |
| 2026-10-18 | Code | `.../events/dispatch-processed-agent-run-events.ts`; `domain/agent-run.ts` `publishSourceEvents` | When the snapshot is read | Each source batch is queued on the run's dispatch queue; the snapshot is read **when the queued task runs** (`input.getRuntimeLifecycleSnapshot()` inside `enqueue`), i.e. the live runtime state, which can be ahead of the batch being processed. | Root cause |
| 2026-10-18 | Code | `.../lifecycle-status/agent-turn-lifecycle-state.ts`; `agent-run.ts` `reconcileRecovery()` | Status state | Same rules: `reconcileRuntimeSnapshot` opens the live snapshot's turn; `openIdentifiedTurn(X)` retires a different active turn; retired never reopens. `reconcileRecovery()` reconciles with the live snapshot after every dispatched batch, on status reads and on input claims. | Status shows idle during the affected turn |
| 2026-10-18 | Code | `backends/claude/session/claude-turn-tracker.ts`, `claude-session.ts`, `claude-background-task-registry.ts` | Claude turn production | A provider turn opens on `system/init` while idle and emits `TURN_STARTED{origin: provider}` + a notice ("Background task completed: …" or "Claude started a turn on its own."). The CLI may run a task-notification CLI turn and then start another turn immediately; both are separate canonical turns. Events are emitted synchronously from the frame pump. | Two turns within milliseconds |
| 2026-10-18 | Code | `backends/claude/backend/claude-agent-run-backend.ts` | Delivery path | Session event → converter → `publishSourceEvents` → AgentRun listener, synchronously up to the queue `enqueue`; `getLifecycleSnapshot()` projects the live session (`activeTurnId`). | Snapshot-at-arrival would equal the state right after the event |
| 2026-10-18 | Data (read-only) | `~/.autobyteus/server-data/memory/agent_teams/software_engineering_team_842188724b884b62adaa0decfd93278b/implementation_engineer_f54d90f354554c45bf4f180a2f4f9dca/raw_traces_active.jsonl` (592 records) | What was recorded | Turn `…bc1f1e85` (input) 10:15:54–10:58:45: assistant text and tools recorded normally. 10:58:46.086 notice in turn `…813430b1` "Background task completed: Wait in background until dev stack is ready (completed) / Wait for readiness signal (completed)". 10:58:46.539 notice in turn `…0cd1e66e` "Claude started a turn on its own.". From then to 11:02:53: 30 tool calls + 30 results recorded, **0 assistant text records**. | Content loss in history, exact Claude shape |
| 2026-10-18 | Data (read-only) | `~/.autobyteus/server-data/logs/server.log` (283 MB) `grep f54d90f354554c45bf4f180a2f4f9dca`; `grep "dropped a '\|ProviderSegmentAdmission"` | What the server logged | Only 15 unrelated "Memory file missing" lines for the run; no rejection, anomaly or provider-segment log. The generic transformer logs nothing. | Log gap |
| 2026-10-18 | Data (read-only) | server.log aggregate of `[CodexSegmentTurnAdmissionRejected]` blocks | Classify Codex | 1,963 parsed: `item/agentMessage/delta` INACTIVE 1,269; `item/completed` INACTIVE 327; `item/started` INACTIVE 229; `item/completed` CONFLICT 133; `item/started` CONFLICT 5; 127 runs, but 1,070 from `codex_45ce1b9e80ea42db869dc86615d51fc3` and 651 from `solution_designer_ef2854b4b6584744a63b5674a0899293`, in long bursts (up to 438 consecutive). | Separate cause; follow-up |
| 2026-10-18 | Code | `backends/codex/thread/codex-thread.ts` `handleAppServerNotification`; `codex-segment-turn-admission.ts` | Codex gate | The Codex gate runs in the Codex thread on the native notification, compares to the thread's own `activeTurnId`, logs `[CodexSegmentTurnAdmissionRejected]` and drops the event **before** conversion; it never produces a chat card and never involves the AgentRun queue. | Not the Claude cause |
| 2026-10-18 | Command | `git log --diff-filter=A -- …/claude-turn-tracker.ts`; `git tag --contains` | Regression timing | Segment admission/retirement: `a0a1073cb9`/`6a2ac70de7` (2026-08-13, first in `v1.4.53`). Claude streaming session with provider-initiated turns: `26450e6b08` (2026-09-25, first in `v1.4.85`). The race is reachable for Claude since `v1.4.85`. Recent changes (skill-update notice, input-state cadence `1496628f7d` — not even in beta.1 —, memory refactor) do not touch the turn/segment states. | Not a recent regression |
| 2026-10-18 | Code | `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` `handleError` | Rendering | A `diagnostic` turn error appends one `error` segment (red card) to the current AI message per event; no dedupe. | Flood presentation |
| 2026-10-18 | Code | `codex-thread-notification-handler.ts` (willRetry → diagnostic) | Other diagnostic producers | Provider retry notices also use `error_effect: diagnostic`; that channel is legitimate and stays. | Preserve |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Claude finishes a turn while a background task it started is still running; the task completes; Claude CLI runs a task-notification turn and then starts another turn on its own | Turn T0 completes → T1 (provider, notice "Background task completed…") opens and settles within ms → T2 (provider, notice "Claude started a turn on its own.") opens and works | All of T2's text segments are rejected: every `SEGMENT_START`/`CONTENT`/`END` becomes a red diagnostic card; T2 text never appears and is not recorded in run memory; T2 tool calls/results still show | User traces; probe case 1 | High (reproduced, instrumented) |
| BEH-002 | System | Same as BEH-001 | During T2 | AgentRun status is `idle` while Claude is running T2 (header "Idle") | Probe case 3 (`STATUS-MID-T2 idle`); screenshots | High |
| BEH-003 | System | Any segment event rejected by the segment lifecycle | Per rejected event | One chat card per rejected event (deltas included); nothing logged; no reason recorded | Transformer code | High |
| BEH-004 | System | Same Claude frames, but the run's event queue drains between T1 and T2 | Control | No rejection; T2 text shows | Probe case 2 | High |
| BEH-005 | System | Codex app-server item notifications while the Codex thread has no/different active turn | Codex thread gate | Logged `[CodexSegmentTurnAdmissionRejected]`, event dropped, no chat card | server.log; codex-thread.ts | High for mechanism; cause of the untracked turns unknown |
| BEH-006 | System | Provider retry (`willRetry`) and other legitimate turn diagnostics | Diagnostic channel | Shown as a card in the chat | codex notification handler | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `events/processors/segment-lifecycle/agent-segment-lifecycle-state.ts` | Run-owned segment admission; own copy of active/retired turn tracking | Must not retire a newer turn because older queued events arrive after a live snapshot | Distinguish snapshot-known (provisional) turns from event-observed turns |
| `events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | Run-owned turn/status state; same retirement rule | Status must stay running during the newer turn | Same rule; shared semantics with segment state |
| `events/dispatch-processed-agent-run-events.ts` | Queues batch processing; reads live snapshot at processing time | Evidence timing | Whether to capture snapshot at arrival (optional hardening) |
| `domain/agent-run.ts` `reconcileRecovery()` | Live reconcile of turn state outside the pipeline (status read, input claim, post-batch) | Live snapshot ahead of queued events also hits turn state | Fix must hold for live reconciles, not only pipeline reconciles |
| `segment-lifecycle/agent-segment-lifecycle-event-transformer.ts` `diagnostic()` | One ERROR per rejected event; no log | Chat flood, no server evidence | Per-turn dedupe; reasoned log |
| `autobyteus-web/.../agentStatusHandler.ts` `handleError` | Appends a card per diagnostic error | Works unchanged when the server emits at most one per turn | No web change needed |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: none changed. Run memory (`raw_traces*.jsonl`) gains the text that is currently lost (normal writer, no format change).
- Existing readers, writers, or contracts that consume them: `runtime-memory-event-accumulator` (unchanged).
- Evidence paths: user raw traces above.

### Structural Surfaces

- Runtime modules: the two run-owned lifecycle states, the segment lifecycle transformer, AgentRun event dispatch.
- Existing structural surfaces that can support the approved behavior: both states already own active/retired turn tracking and snapshot reconciliation; the transformer already owns the diagnostic.
- Evidence paths: as listed in the Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: none. The `ERROR` DTO shape (`code`, `message`, `error_scope: turn`, `error_effect: diagnostic`, `turn_id`) is unchanged; only frequency and message text change.
- Persistence schema or invariant change: none.
- Security or privacy boundary change: none.
- Concurrency or lifecycle change: yes — the turn-ordering rule of the run-owned lifecycle states (single run, serialized dispatch queue; no new concurrency).
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: none.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `pnpm -C autobyteus-server-ts exec vitest run <probe> --no-watch` (probe placed temporarily under `tests/unit/zz-investigation/`, removed after the run; base `1c718202b2`) | Case 1: real `ClaudeSession` on a scripted SDK stream (fake SDK helper) → real `ClaudeAgentRunBackend` → real `AgentRun`. Input turn starts a background task and completes; task completes; CLI emits `init` + `result{origin: task-notification}` (T1, no model output), then `init` + two assistant texts + `result` (T2), all in one burst | `TURN_STARTED T1`, notice, `TURN_COMPLETED T1`, `TURN_STARTED T2`, notice, then **6× `ERROR AGENT_SEGMENT_LIFECYCLE_INVALID`** (2 text segments × start/content/end), `TURN_COMPLETED T2`; no T2 segment delivered | Reproduces the user's shape exactly | `probes/claude-provider-turn-segment-race.probe.test.ts`, `evidence/probe-run-base-1c718202b2.txt` |
| same, instrumented `openTurn` | Case 1 | `openTurn(T2) active null -> T2` (from the **live snapshot** while T1's queued batch is processed) → `openTurn(T1) active T2 -> T1 retired=[…, T2]` → T2 can never reopen | Root cause mechanism | same |
| same | Case 2 (control): identical frames with the queue drained between T1's result and T2's init | Zero diagnostics; both T2 texts delivered | Timing race, not malformed Claude events | same |
| same | Case 3: status mid-T2 | `run.getStatusSnapshot().status === "idle"` while T2 is running | Status symptom has the same cause | same |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (screenshots, Task) | Chat flooded with jargon error cards; agent appears Idle while working; asks "is this a bug, do I lose content" | Strong | Fix the cause; no flood; honest single notice when output really cannot be shown | None |
| Delegator Task | "a diagnostic of this kind should not flood the chat; decide what is right (merge, hide, show once)" | Direction | Decision delegated to Solution Designer (DEC-002) | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Agent SDK / CLI streaming input | SDK in repo (`claude-turn-tracker` probes J/M/O) | CLI may start turns on its own (`system/init` while idle) and run consecutive CLI turns back to back | tracker + background-task registry code | None for this fix |
| `@autobyteus/agent-presentation-contracts` turn error DTO | in repo | `error_scope: turn`, `error_effect: diagnostic`, `turn_id` required | `agent-presentation-message-dtos.ts` | Unchanged |

## Persisted Data And State Facts

- Affected stored or external subject: none written differently in shape. Lost text of affected past turns is not in AutoByteus memory and is not recoverable by this fix (it remains in Claude's own session files under `~/.claude`, outside AutoByteus).
- Location and representative shape: N/A
- Approximate volume: N/A
- Current readers and writers: unchanged
- Current unknown/extra-field behavior: unchanged
- Required semantics or data that must be preserved: existing run memory and histories untouched.
- Acceptable loss, reset, rebuild, or regeneration: none introduced.
- Privacy, retention, compliance, downtime, or operational constraints: none.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Other fields: N/A — not applicable.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/segment-lifecycle-error-flood/probes/claude-provider-turn-segment-race.probe.test.ts` | Solution Designer | Reproduction probe (real ClaudeSession + backend + AgentRun on a scripted SDK stream) | Investigation evidence; basis for the durable regression test | AC-001, AC-002, AC-003 | Current | Evidence only, no approval needed |
| `tickets/in-progress/segment-lifecycle-error-flood/experiments/` (experiment-results.md, turn-race-experiment.probe.test.ts, E2/E3/E4 patches) | Solution Designer | Design experiments requested by the user | Evidence for the design decision | REQ-001, REQ-002; AC-001..AC-003 | Current | Evidence only |
| `tickets/in-progress/segment-lifecycle-error-flood/evidence/probe-run-base-1c718202b2.txt` | Solution Designer | Probe output on the base revision | Evidence | AC-001..AC-003 | Current | Evidence only. Note: case 1's `openTurn` instrumentation stays patched for later cases in that run, so cases 2–3 also print `openTurn` lines |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Why the two Codex runs had whole bursts of item notifications while their Codex thread tracked no (or another) active turn | Possible separate content loss for Codex | Follow-up Task for the Project Task Manager (FU-001) | Open, out of scope |
| RSK-001 | Risk | While a run shows idle during an untracked turn, idle-dependent behavior (Stop availability, input admission as start_turn, root idle-shutdown evaluation) may act on a working run | Raises severity of BEH-002 | Fixed by REQ-002; regression covered by AC-003 | Addressed by the fix |
| ASM-001 | Assumption | Other runtimes (Codex, AGY, Grok, AutoByteus) only benefit from the corrected ordering rule; a turn the runtime itself reports via events is unaffected | Shared state change | Verified by the full server unit/integration suites | To verify in implementation |

## Architecture Investigation Findings

- Entry: `ClaudeSession.handleFrame` (async frame pump) → `ClaudeTurnTracker.observe` → listener → `ClaudeSession.emitRuntimeEvent` → `ClaudeAgentRunBackend` converter → `AgentRun.publishSourceEvents` → `dispatchProcessedAgentRunEvents` → **queued** `pipeline.process` (`LifecycleStatusEventTransformer`, `AgentSegmentLifecycleEventTransformer`, …) → listeners (websocket, memory accumulator, team adapters).
- Two run-owned states each implement "active turn + retired set": `AgentTurnLifecycleState` (status) and `AgentSegmentLifecycleState` (segments). Both open a turn from a runtime snapshot and both retire a different active turn on `openTurn`. Neither knows whether its active turn came from an event (ordered with the stream) or from a snapshot (possibly ahead of the stream).
- Snapshot reads: pipeline (`reconcileBeforeBatch` / `reconcileRuntimeSnapshot` at queued-processing time) and outside the pipeline (`AgentRun.reconcileRecovery()` on status read, input claim, post-batch, compaction recovery change). Both can run while older batches are still queued.
- Root cause: a snapshot that is ahead of the queued event stream opens the newer turn T2; the older turn T1's queued `TURN_STARTED` then retires T2 as if T2 were stale. Retirement is permanent, so the whole T2 is rejected (segments) and untracked (status).
- The flood is a second, independent defect: the transformer turns each rejected event into its own chat card and leaves no server evidence.

### Design experiments (requested by the user, 2026-10-18)

Full record: `experiments/experiment-results.md`. Throwaway worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood-experiments` (detached at `1c718202b2`). Scoring probe `experiments/turn-race-experiment.probe.test.ts`, cases X1–X6.

| Method / Command | Variant | Observation | Design implication |
| --- | --- | --- | --- |
| `pnpm -C autobyteus-server-ts test:unit` in the ticket worktree (base) | E0 | 720 files passed, 4 skipped, exit 0 (baseline green) | Comparison basis |
| related integration (23 files listed from `tests/integration` that reference AgentRun/lifecycle states/pipeline) | E0 | 20 passed, 3 skipped | Comparison basis |
| probe X1–X6 | E0 | X1: 6 diagnostics, turn-2 text lost; X2: idle mid-turn; **X5: 3 diagnostics, turn-1 text lost** (second loss pattern: snapshot retires a stream-observed turn) | BEH-007 added |
| related unit (60 files) | E1 (snapshot never opens turns) | probe passes; 22 tests fail (interrupt targeting, active-turn append, quiescence, root shutdown, input-state cadence, snapshot reconcile) | The turn state answers two questions: command-side "now" (needs the live snapshot) and projection-side "which turn do queued events belong to" (needs ordered evidence) |
| probe + related unit | E2 (provisional snapshot turn, in each state separately) | all pass, 623/623 | Rule works |
| probe | E3 (snapshot captured at batch arrival) | all pass | Works only if every backend's state is updated synchronously before its batch reaches AgentRun; Codex states the opposite in `codex-agent-run-backend.ts` (`terminateRun` comment); AutoByteus native stream is asynchronous; does not cover `AgentRun.reconcileRecovery()` live reconciles → rejected |
| probe + related unit + related integration | E4 (E2's rule in one shared owner used by both states) | all pass; related integration 20/3 as base; diff +115/−63 in 3 files | Chosen |

## Requirement Implications

- The fix must make both run-owned states keep the newer turn when older queued events arrive after a snapshot named it (REQ-001, REQ-002).
- The diagnostic must stay (it is the only user-visible sign of real content loss) but be shown at most once per turn in plain language (REQ-003) and be logged with a reason (REQ-004).
- Codex rejections are a separate defect class (different layer, no chat effect) → follow-up, not this ticket.

## Notes For Architecture Design

- Scenarios to realize: SCN-001 (two provider turns back to back), SCN-002 (genuine late segment events after a turn ended), SCN-003 (status during a provider turn).
- Constraints: keep the `ERROR` DTO contract; keep retirement of genuinely ended turns; keep snapshot reconciliation for runs whose turn is known only from the snapshot (e.g. restored/attached mid-turn); no web change required.
- Technical questions answered in the design: where the "snapshot-known vs event-observed" distinction lives; whether to also capture the pipeline snapshot at batch arrival.
