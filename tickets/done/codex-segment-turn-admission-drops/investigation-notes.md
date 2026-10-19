# Investigation Notes

## Investigation Meta

- Package identifier: `codex-segment-turn-admission-drops`
- Request / ticket: Project Task "Codex runs drop whole turns of agent output (CODEX_SEGMENT_TURN_INACTIVE / CONFLICT): possible content loss" — follow-up FU-001 of autobyteus-143 (`segment-lifecycle-error-flood`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), created 2026-10-18.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops`, branch `codex/codex-segment-turn-admission-drops`
- Resolved base remote / branch / revision: `origin/personal` @ `cba6b85122` (fetched 2026-10-19; tag `v1.5.6-beta.8`; contains the merged autobyteus-143 fix, `tickets/done/segment-lifecycle-error-flood`)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from refreshed `origin/personal`. No dependency install yet (investigation was read-only on source and user data).
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-19); `AGENTS.md`, `TESTING.md` (2026-10-19). Architecture gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (2026-10-19, see design spec).
- Investigation status: Complete. Cause explained for 100% of the agent-text rejections and for the residual rejections (rollout-verified for 99 of 130 residual lines).

## Initial Request And Clarifications

- Original request: the user's `server.log` has 1,963 `[CodexSegmentTurnAdmissionRejected]` warnings (by event/reason: `item/agentMessage/delta` INACTIVE 1,269; `item/completed` INACTIVE 327; `item/started` INACTIVE 229; `item/completed` CONFLICT 133; `item/started` CONFLICT 5), about 127 runs, most from `codex_45ce1b9e80ea42db869dc86615d51fc3` (1,070) and `solution_designer_ef2854b4b6584744a63b5674a0899293` (651), in bursts of up to 438. Find why the Codex thread loses its active turn (resume/attach mid-turn, steer/append, or app-server-started turns), confirm whether agent text is lost in history, fix it if it is a product bug, bound the gate's per-event logging; reproduce in isolation per TESTING.md; the user's real data stays untouched.
- Clarifications received: none needed.
- User-supplied facts and constraints: read the user's log and data read-only; test in isolation; a user-visible fix ships with the next release.
- Initial ambiguity: the Task treats all 1,963 lines as one current problem. The log spans 2026-08-18 → 2026-10-18 (it is never rotated), so the date of each burst matters.

## Product And Domain Understanding

- Product area: Codex App Server runtime adapter — the per-run `CodexThread`, its exact-turn segment admission gate, and the turn lifecycle it tracks.
- Affected actors or systems: the user watching a Codex-backed agent's chat; run history (`raw_traces*.jsonl`); the server log.
- Existing user or operational purpose: the gate keeps each Codex item notification (`item/started`, `item/agentMessage/delta`, `item/completed`, `item/reasoning/completed`) bound to the exact turn the thread is running, so output is never attributed to the wrong turn.
- Relevant terminology:
  - *Active turn*: `CodexThread.activeTurnId`, set by `turn/started` (or the `turn/start` response), cleared by a matching `turn/completed`, a terminal error, a failed thread status or client close.
  - *INACTIVE*: an item arrives while the thread has no active turn. *CONFLICT*: an item names a turn different from the active one.
  - *Late item*: an item notification of turn T that Codex sends after T has already ended (completed or interrupted).
  - *Rollout*: Codex's own session record `~/.codex/sessions/YYYY/MM/DD/rollout-*-<threadId>.jsonl` (event_msg `task_started`, `task_complete`, `turn_aborted`, `item_completed` with `turn_id`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` `handleAppServerNotification` (l.254–283) | Gate location | Governed item events are checked against `this.activeTurnId`; a rejection logs one `[CodexSegmentTurnAdmissionRejected]` block (`runtimeKind, runId, nativeEventName, reasonCode`, 6 log lines) and returns before conversion. No item type, no turn ids, no bound. | Logging change target |
| 2026-10-19 | Code | `.../codex/thread/codex-segment-turn-admission.ts` | Rule | INACTIVE when no active turn; CONFLICT when any explicit turn id ≠ active; EXPLICIT_INVALID for empty/non-string ids. The rejection result carries only the reason. | Rule stays |
| 2026-10-19 | Code | `.../codex/thread/codex-thread-notification-handler.ts`, `codex-thread-input-submission.ts`, `codex-client-thread-router.ts` | Where the active turn is set/cleared | Set: `turn/started`, or `turn/start` response when `activeTurnId === null && lastTerminalTurnId !== turnId`. Cleared: matching `turn/completed`; terminal `error`; failed `thread/status/changed`; client close. Steer (`turn/steer`) never changes it. Router matches by `threadId`. | Leads checked |
| 2026-10-19 | Code / Git | `git show fb65f564f6` "fix(codex): preserve retrying turn lifecycle" (2026-09-02; first tag `v1.4.67`); ticket `tickets/done/codex-runtime-event-stream-reconnect/` | Prior fix | Before it, every native `error` with a resolvable turn — including `willRetry: true` ("Reconnecting… n/5") — called `markTurnFailed`, clearing the active turn while Codex kept running the same turn. That ticket diagnosed run `codex_45ce1b9e…` with exactly these rejections and content loss. Regression tests: `tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` (l.1394–1509), `codex-thread-event-converter.test.ts`, `codex-tool-log-correlation.test.ts`. | Main cause already fixed |
| 2026-10-19 | Data (read-only) | `~/.autobyteus/server-data/logs/server.log` (2,984,996 lines, 2026-08-18 → 2026-10-18) parsed by `probes/parse_rejections.py` | Distribution in time | 1,963 blocks; date = nearest preceding timestamp. 2026-08-31: 804, 2026-09-01: 869, 2026-09-02: 54 → **1,727 (88%) on 31 Aug – 2 Sep**. Every other day ≤ 18. After 2026-09-03: **130 lines in 58 runs, 0 `agentMessage/delta`** (item/completed CONFLICT 83, INACTIVE 38; item/started INACTIVE 5, CONFLICT 4). | Two populations |
| 2026-10-19 | Data (read-only) | `probes/correlate_rollouts.py` over all 127 runs → `evidence/all-rollout-correlation.txt` | Where the text loss is | All **1,269** `agentMessage/delta` rejections belong to the two named runs (`codex_45ce1b9e…` 684, `solution_designer_ef2854b4…` 585), both 31 Aug – 2 Sep. No other run ever lost a text delta. | Text loss is historical only |
| 2026-10-19 | Data (read-only) | `~/.codex/sessions/2026/08/31/rollout-…-01a056dd-ada3-72f2-afa1-02d3fc2c09c3.jsonl` vs `memory/agent_teams/software_engineering_team_d8d005d1…/solution_designer_ef2854b4…/raw_traces*.jsonl` | Content loss for run ef2854b4 | Turn `01a05701…` ran 08:48:30–09:19:30 UTC in Codex. AutoByteus history stops at 09:02:37 (user "continue please"). After that Codex produced 14 commands, 15 reasoning items and 1 final agent message for that turn; none are in history. Log rejections for the run in that window: 32 started + 32 completed (= 31 items + 1) and 585 text deltas. The next turn `01a0571d…` (09:19:30) is recorded normally. | Confirmed loss |
| 2026-10-19 | Code (reasoning on evidence) | `codex-thread-input-submission.ts` l.47 | Why "continue please" did not recover | Pre-fix: a `willRetry` error marks the turn failed (`lastTerminalTurnId = T`, active cleared) while Codex keeps running T. The user's next message goes as `turn/start`; Codex joins it into the still-running T and returns T; the guard `lastTerminalTurnId !== turnId` (meant for a completion that races the response) refuses to re-adopt T, so all of T's remaining output is dropped until T ends. Matches the ef2854b4 sequence. Direct proof of the retry error for this run is not available: Codex's `~/.codex/logs_2.sqlite` only covers 2026-10-16 onward, and rollouts do not store error events. | Consistent with fb65f564f6 cause; residual risk noted (RSK-002) |
| 2026-10-19 | Data (read-only) | `probes/correlate_rollouts.py` (cutoff 2026-09-03) → `evidence/residual-rollout-correlation.txt` | Cause of the 130 residual lines | Thread ids resolved for 50 of 58 runs (99 lines). For those runs the rollout's count of `item_completed` written **after the item's own turn ended** matches the log's `item/completed` rejections exactly in 43 runs; total 97 late items vs 91 logged rejections. Expected reason also matches (next turn running → CONFLICT; none → INACTIVE). Item types: CommandExecution 95, McpToolCall 2. 8 runs (31 lines) have no retrievable rollout. | Residual = late tool items |
| 2026-10-19 | Data (read-only) | `probes/late_item_details.py` on 5 rollouts | Nature of late items | 20 of 25 sampled late items belong to `turn_aborted: interrupted` turns, 5 to normally completed turns. Delay after the turn end: 0.01 s to 554 s (one case 16.9 h). All `process_id`-bearing command executions (Codex keeps parallel/background exec sessions running after a Stop) or an MCP call already in flight. Status mostly `completed`, exit 0. | Codex protocol behavior, not lost turn tracking |
| 2026-10-19 | Data (read-only) | rollout `01a1148d…` + memory `solution_designer_05432e34…` | Visibility of late items | Interrupted turn `01a11493…`: a `python3` command and a `get_handoff_rules` MCP call complete 0.08 s / 0.5 s after the abort; the log has `item/started` + `item/completed` rejections for that run (INACTIVE ×2, CONFLICT ×2), i.e. Codex sent even the *start* after the abort. Neither call appears in run history. | Follow-up candidate (tool visibility), see FU-001 |
| 2026-10-19 | Code | `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` `terminalizeOpenToolSegmentsForInterruptedTurn`; `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` `interruptTurn`/`completeTurn` | What the user sees for a tool cut by a Stop | Live chat marks every still-open tool card of the interrupted turn `interrupted`. History records "Tool execution interrupted." for a tool whose call trace exists; a tool whose call was never persisted is dropped at turn end. | Preserved; late result is not needed for the interrupted state |
| 2026-10-19 | Data (read-only) | server.log context of bursts | Leads "resume/attach mid-turn", "app-server-started turns" | Bursts sit inside one long-running turn, not after a server restart (the 31 Aug restart at 09:35:52 is after the burst). No `turn/started` gap: the following turn was recorded. Steer never clears the active turn (code). | Leads ruled out |
| 2026-10-19 | Command | `sqlite3 -readonly ~/.codex/logs_2.sqlite` | Codex retry evidence | Covers 2026-10-16 07:42 → 2026-10-19 only; no rows for the burst threads. | Evidence limit |
| 2026-10-19 | Code | `src/agent-execution/events/processors/segment-lifecycle/agent-segment-rejection-log.ts`, `agent-segment-lifecycle-state.ts` (merged autobyteus-143) | Existing bounded-log pattern | AgentRun-level rejections log one detailed line per turn account plus a count summary at run lifecycle boundaries (`[AgentSegmentLifecycleRejected]`, `[AgentSegmentLifecycleRejectedSummary]`). | Reuse the same pattern for the Codex gate |
| 2026-10-19 | Code | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Contract doc | Documents willRetry and stale-boundary policy; does not describe the gate's rejection logging. | Doc update target |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System (historical, fixed) | Codex reports a transient provider error with `willRetry: true` ("Reconnecting… n/5") and keeps running the same turn | Before `fb65f564f6` (≤ v1.4.66): the error ended the turn in AutoByteus; every later item of that turn was rejected INACTIVE; a user message sent meanwhile was joined into the same Codex turn and not re-adopted | Rest of the turn (text, tools, reasoning) missing from chat and history. Since v1.4.67: the error is a diagnostic and the turn stays active | `fb65f564f6`; `tickets/done/codex-runtime-event-stream-reconnect`; log distribution; ef2854b4 rollout vs memory | High for codex_45ce (proven by that ticket); high-but-indirect for ef2854b4 (UNK-001) |
| BEH-002 | System | The user stops a Codex turn (or a turn completes) while a command or MCP call that Codex already dispatched is still running | Codex ends the turn (`turn/completed`, status interrupted/completed), then later sends `item/started`/`item/completed` for that tool with the ended turn's id. The gate rejects it: INACTIVE when no turn runs, CONFLICT when the next turn already runs | The late item is never attributed to another turn. Live chat already shows the tool `interrupted` (if its start was seen). Its late result and, rarely, a tool whose start also arrived late, are not shown and not in history | Rollout correlation; web/memory code | High |
| BEH-003 | Operational | Any gate rejection | One 6-line `console.warn` block per rejected event, with no item type, no turn ids; unbounded (bursts of 438 → 2,628 lines) | Hard to diagnose (which item? which turn?) and floods the log when a whole turn is rejected | `codex-thread.ts`, `codex-thread-event-debug.ts`, server.log | High |
| BEH-004 | Contract | Exact-turn admission of governed Codex item events | Accept only when the event's explicit turn ids all equal the active turn, or none is given and an active turn exists (inherit) | No cross-turn misattribution | `codex-segment-turn-admission.ts` | High |

Rejected leads (scenario classification):
- *Resume/attach mid-turn*: no burst follows a restart or attach; the burst windows lie inside one live turn. Not the cause in this evidence.
- *Steer/append into a running turn*: `turn/steer` does not change the active turn (code). The 31 Aug "continue please" was a `turn/start` while AutoByteus had already (wrongly) ended the turn; it is a consequence of BEH-001, not a cause.
- *Turns the app-server starts itself*: every Codex turn in the sampled rollouts has a `task_started` that AutoByteus recorded as a turn; no unrecorded turn found.

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `codex/thread/codex-thread.ts` | Owns per-run thread state and runs the gate | Logging bound and accounting belong to the thread (per run, per thread lifetime) | Where to keep per-turn rejection accounts; which notifications are boundaries |
| `codex/thread/codex-segment-turn-admission.ts` | Pure admission rule | Admission outcomes must not change | Rejection result may need the rejected event's turn id for the account key |
| `codex/events/codex-thread-event-debug.ts` `logCodexSegmentTurnAdmissionRejection` | Log format | Add item type, turn ids; add a summary format | Keep formats in this existing log owner |
| `codex/thread/codex-thread-manager.ts` `releasePreparation` | Thread release (clears listeners, approvals, MCP, unbinds) | Pending counts must be flushed at release | One flush call at release |
| AgentRun segment lifecycle (autobyteus-143) | Bounded rejection logging pattern | Consistency | Same account semantics, different layer (no import across layers) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: none. Server log lines only (diagnostic, no consumer contract).
- Existing readers, writers, or contracts that consume them: none in code; humans and investigation scripts read the log.
- Evidence paths: server.log.

### Structural Surfaces

- Runtime modules: `CodexThread` (gate call site), admission rule result type, the Codex debug-log module, thread release in `CodexThreadManager`.
- Existing structural surfaces that can support the approved behavior: all of the above; no new boundary needed.
- Evidence paths: as in the Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: none (log text only).
- Persistence schema or invariant change: none.
- Security or privacy boundary change: none (turn ids are opaque UUIDs already logged by the AgentRun-level rejection log).
- Concurrency or lifecycle change: none (same single-threaded notification handling; accounts are per thread).
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: none.
- Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `python3 -I probes/parse_rejections.py ~/.autobyteus/server-data/logs/server.log` (read-only) | Whole log | Counts by event/reason/run/date and bursts as listed above | Two populations | `probes/parse_rejections.py` |
| `python3 -I probes/correlate_rollouts.py <log> 2026-09-03` | Residual runs | 43/50 exact per-run match; 97 late items vs 91 rejections | Residual = late items of ended turns | `evidence/residual-rollout-correlation.txt` |
| `python3 -I probes/correlate_rollouts.py <log> 2026-08-01` | All runs | Text-delta rejections only in the two Aug 31–Sep 2 runs | Text loss historical | `evidence/all-rollout-correlation.txt` |
| `python3 -I probes/late_item_details.py <rollouts>` | 5 residual threads | Late items are command/MCP completions after `turn_aborted`/`task_complete` | Drop is correct; no turn tracking fault | console output recorded above |
| Reproduction of the gate behavior | Not run against a live Codex: the residual mechanism is Codex protocol behavior seen in the user's rollouts, and the willRetry mechanism is already covered by `fb65f564f6`'s unit/integration tests. The logging change is proven at the server unit layer (TESTING.md: backend logic → server tests) | — | — | — |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Delegating Task (`/project_task_manager`, user's request) | Explain cause, answer content loss, fix if product bug, bound per-event logging, ship user-visible fix next release | Direction | REQ-001..REQ-004 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Codex App Server v2 notifications | Installed Codex CLI (user's) | `error` carries `willRetry`, `threadId`, `turnId`; item notifications carry the item's own `turnId`, also when sent after the turn ended | Prior ticket schema dump; rollouts | Codex may change late-item behavior; the gate rule handles both |

## Persisted Data And State Facts

- Affected stored or external subject: none written by the change. Historical: run history (`raw_traces*.jsonl`) of the two Aug 31–Sep 2 runs lacks the dropped turns' content.
- Location and representative shape: N/A for the change.
- Approximate volume: 2 runs; ef2854b4 turn `01a05701…` from 09:02:37 to 09:19:30 UTC (31 items incl. 1 final agent message); codex_45ce turns per the prior ticket.
- Current readers and writers: unchanged.
- Required semantics or data that must be preserved: user data untouched.
- Acceptable loss, reset, rebuild, or regeneration: the historical gap stays (DEC-004). The text exists in Codex's own rollouts under `~/.codex/sessions`.
- Remaining evidence gap: none for the change.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Other fields: N/A — not applicable.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/codex-segment-turn-admission-drops/probes/parse_rejections.py` | Solution Designer | Read-only log parser (counts, bursts, dates) | Evidence | — | Current | Evidence only |
| `.../probes/correlate_rollouts.py` | Solution Designer | Read-only log ↔ Codex rollout correlation per run | Evidence | — | Current | Evidence only |
| `.../probes/late_item_details.py`, `.../probes/bracket_times.py`, `.../probes/list_late.py` | Solution Designer | Read-only detail helpers | Evidence | — | Current | Evidence only |
| `.../evidence/residual-rollout-correlation.txt`, `.../evidence/all-rollout-correlation.txt` | Solution Designer | Correlation output | Evidence | — | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Direct proof that run ef2854b4's turn was ended by a `willRetry` error (Codex logs rotated) | Cause attribution for 651 lines | Indirect evidence is strong (same shape, same window as the proven codex_45ce run, before the fix, only possible clear paths are error/status/close; text loss then stopped for 6.5 weeks after v1.4.67). Accepted | Closed as indirect |
| UNK-002 | Unknown | 8 residual runs (31 lines) have no retrievable rollout | Residual cause coverage | Same event/reason shape as verified runs; accepted | Accepted |
| RSK-001 | Risk | Codex tool calls whose start arrives only after a Stop are never shown, and late results of interrupted tools are not shown | Transparency of side-effecting tools (9 such starts in 6.5 weeks) | Out of scope (different behavior, crosses the AgentRun ended-turn rule); FU-001 | Follow-up |
| RSK-002 | Risk | If any future defect wrongly ends a running Codex turn, the `lastTerminalTurnId` guard stops a later user message from re-adopting that turn, so the rest of the turn is dropped | Amplifies a future defect | No current cause known; the bounded detailed log now names the event's and the active turn id so it is diagnosable. FU-002 records it | Follow-up (watch) |

## Architecture Investigation Findings

- Entry: `CodexAppServerClient` notification → `CodexClientThreadRouter.handleAppServerNotification` (match by `threadId`) → `CodexThread.handleAppServerNotification` → gate `resolveCodexSegmentTurnAdmission(method, params, activeTurnId)` → on accept: `applyAppServerNotification` (turn/status side effects) → listeners → `CodexAgentRunBackend` converter → `AgentRun`. On reject: `logCodexSegmentTurnAdmissionRejection` and return.
- The gate runs before the notification handler, so turn boundaries (`turn/started`, `turn/completed`) are applied in the handler after the gate; they are never governed events themselves.
- Thread lifetime: one `CodexThread` per run preparation; released through `CodexThreadManager.releasePreparation` (clears listeners, approvals, pending MCP, unbinds handlers). Client close calls `CodexThread.handleClientClosed`.
- `CodexThread` already owns other per-thread registries (`CodexPendingMcpToolCallRegistry`, `CodexModelCallTiming`) as small composed classes — the established shape for a rejection-account owner.
- Root cause classification for the logging defect: missing invariant (diagnostic logging has no bound and lacks the identifying fields); owner and boundary are right.

## Requirement Implications

- No admission-rule change: the residual rejections are correct drops (REQ-001).
- The only code change needed now is bounded and more informative gate logging (REQ-002..REQ-004).
- Text loss is historical; the product fix (`fb65f564f6`) shipped in v1.4.67 and stays covered by its tests (REQ-005 preserved).
- Tool visibility after a Stop and the re-adoption guard are follow-ups, not this ticket.

## Notes For Architecture Design

- Scenarios to realize: SCN-001 (late tool items after a Stop/turn end), SCN-002 (a whole turn rejected, e.g. a future regression or the pre-fix willRetry case).
- Constraints: admission outcomes unchanged; no new chat output; turn ids are fine to log; no import from AgentRun event processors into the Codex backend.
- Technical questions for design: account key and lifetime; summary boundaries; where release flushes.
