# Requirements Doc

## Status (`Design-ready` — User Approved 2026-08-01)

## Goal / Problem Statement

Fix the contradiction where a selected agent is visibly `Running` and streaming work but the composer does not expose an active interrupt action. Simplify the agent lifecycle contract so the backend emits one self-healing, runtime-neutral status projection alongside streamed output, and the frontend does not maintain an independently divergent interrupt-permission state.

The simple canonical rule is:

- `initializing`: a command has been accepted but no authoritative current turn is open yet;
- `running`: the runtime has a current open turn, and that turn is interruptible through the supported run/member route;
- `idle`: the runtime is live and reusable but has no current open turn;
- `error`: the current turn or runtime reached a terminal failure;
- `offline`: the runtime is unavailable or terminated.

A safety qualification is required: a stream event means `running` only when it belongs to the current open turn. Late output from an already completed/retired turn must still render but must not reopen busy state.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A selected member can show `Running` while the primary composer button remains the blue send icon because `currentStatus` and `canInterrupt` are separately stored and can diverge. | For a supported current open turn, `Running` and the enabled red stop/interrupt action are one coherent projection; the UI cannot represent `Running` as send-ready. | Existing targeted single-agent and team-member interrupt commands and member identity validation remain in use. | REQ-001, REQ-002, REQ-008, REQ-009; AC-001, AC-002, AC-009 |
| BEH-002 | Status snapshots/events are sparse and multiple backend paths can publish `running` with different `can_interrupt` values; supported local direct-message/artifact/system notifications also bypass the shared processor/finalizer and reach run listeners directly. | Every outward agent activity/lifecycle message, whether runtime-, local-service-, or processor-derived, is accompanied by the backend's current canonical status projection, ordered so current-turn activity repairs the frontend to `running` before/with rendering and terminal activity repairs it immediately afterward. | Existing content, reasoning, tool, inter-agent, todo, artifact, and system-task messages retain their normal payloads and rendering. | REQ-003, REQ-004, REQ-005, REQ-010; AC-003, AC-004, AC-010, AC-011 |
| BEH-003 | Idle/error/offline detection is spread among runtime projectors, command overlays, lifecycle fallbacks, snapshots, and frontend `isSending` cleanup; a retained local `initializing` override can shadow fresh backend current-turn evidence during reconnect. | `TURN_COMPLETED` or `TURN_INTERRUPTED` for the current turn immediately settles a live runtime to `idle`; terminal turn/runtime failure settles to `error`; termination/unavailability settles to `offline`; reconnect reconciles fresh current-turn evidence into the same projection and returns `running` rather than stale startup. | Recoverable tool/diagnostic errors do not terminalize the whole turn, and racy idle/initializing evidence does not close an identified current turn. | REQ-005, REQ-006, REQ-007, REQ-011; AC-004, AC-005, AC-006, AC-007, AC-012 |
| BEH-004 | Generic old-turn activity previously caused stale `running`; current safeguards track retired/current turn identity, but derived statuses can still carry non-interruptible `running`. | Current-turn correlation remains mandatory: late output for retired turn A renders without changing status; it cannot close/reopen newer turn B or convert idle to running. | Late output is not discarded from transcript/activity/history. | REQ-004, REQ-012; AC-008, AC-011, AC-012 |
| BEH-005 | The composer button can be disabled while `handleKeyDown` still invokes the primary action on Enter; production traces show a second user turn was recorded while the first continued. | Mouse, keyboard, and programmatic primary-action paths share one guard. While `initializing` or `running`, send cannot start another turn; `running` routes the action to interrupt. | Shift+Enter/newline behavior and normal idle send behavior remain unchanged. | REQ-008, REQ-009; AC-009, AC-013, AC-014 |

## Investigation Findings

- The screenshot state is representable because the header reads `currentStatus`, while the composer reads a separate `canInterrupt` field.
- The matched live Codex team trace shows current-turn reasoning, assistant, and tool output continuing after the screenshot text. It also shows a second distinct user turn recorded 13 seconds after the first submission and before the first turn's first reasoning event completed.
- A read-only live team WebSocket probe later returned the correct snapshot `AGENT_STATUS { status: "running", can_interrupt: true }` for the selected member. This proves the backend can know the active turn, but sparse/racy status events and a separately mutable frontend permission allow disagreement until a later repair.
- The backend shared `LifecycleStatusEventTransformer` synthesizes derived status with `canInterrupt: false`, including a `TURN_STARTED` fallback. The command coordinator can also construct a `running` replacement from a still-non-interruptible startup snapshot. Runtime-specific projectors separately publish `running/can_interrupt=true` after active-turn identity is visible.
- Frontend `handleKeyDown` bypasses `isActionDisabled`; disabled HTML button state does not guard Enter.
- Earlier production evidence proves late tool/provider events can arrive after their original turn completed. Therefore “stream received means busy” must be qualified by current-turn identity rather than applied to all arrival traffic blindly.
- Architecture review confirmed that `AgentRun.emitLocalEvent` is a supported bypass used by accepted direct messaging, artifact publication, skill-improvement notification, and task-delegation notification; processor-derived final events are also outside a pre-processor lifecycle stage.
- `AgentRun.getStatusSnapshot()` currently prefers its retained local override. Claude establishes `RUNNING` plus `activeTurnId` before asynchronous finalization completes, and the command coordinator may broadcast a replacement without updating `AgentRun`, so bind-before-read alone can still return stale `initializing`.

Detailed evidence: [`production-trace-evidence.md`](./production-trace-evidence.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` | Evidence-only production trace and live snapshot probe | REQ-001–REQ-012 | AC-001–AC-015 | Complete / N/A | Grounds the contradiction, overlapping-send risk, live snapshot capability, and late-event constraint. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` | User-supplied UI evidence | REQ-001, REQ-008 | AC-001, AC-002, AC-009 | Accepted evidence / N/A | Shows `Running` while the primary control remains the send icon. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus bounded lifecycle/status `Refactor`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant`, `Boundary Or Ownership Issue`, and `Duplicated Policy Or Coordination`; plus a `Local Implementation Defect` in keyboard action guarding.
- Refactor posture: `Likely Needed`
- Evidence basis:
  - `currentStatus` and `canInterrupt` independently govern header and button and can contradict one another.
  - Command-start reconciliation, shared lifecycle fallback, runtime-specific projectors, snapshots, and frontend hydration all influence status/interrupt state.
  - A derived `running` event is hard-coded non-interruptible even though `running` semantically represents an open turn.
  - Enter does not honor the same disabled guard as the button.
- Requirement or scope impact: A local button toggle is insufficient. The change must establish one backend-owned current-turn projection, stream it redundantly enough to self-heal, remove the independently divergent frontend interrupt flag/contract, and centralize composer action guarding.

## Recommendations

1. Make a runtime-neutral backend current-turn lifecycle projection the only public owner of `offline | initializing | idle | running | error`.
2. Collapse public interrupt eligibility into that lifecycle: for supported run/member execution, `running` means the current turn exists and is interruptible. Remove separately authoritative `can_interrupt`/`canInterrupt` state rather than retaining two values that can disagree.
3. Send the current canonical `AGENT_STATUS` on the same subscriber stream with every outward agent activity/lifecycle event (status-before-current-turn activity; terminal event then terminal status), while retaining initial/reconnect snapshots.
4. Use canonical turn identity. Current-turn output can establish/reinforce `running`; retired-turn output can render but only re-emits the actual current status and never reopens the old turn.
5. Treat `TURN_COMPLETED` and `TURN_INTERRUPTED` as immediate idle boundaries for a live runtime. Do not add a quiet-period timer.
6. Route every primary composer trigger through one guard so Enter cannot bypass disabled/send-versus-interrupt state.

## Scope Classification (`Medium`)

The change crosses the server runtime-neutral lifecycle event pipeline, status WebSocket protocol/snapshots, team-member event wrapping, frontend status projection, and composer interaction guard. It does not require redesigning provider runtime loops or visual styling.

## In-Scope Use Cases

- UC-001: A standalone or team-member command is accepted, transitions through initializing/current-turn running, streams output, completes, and becomes idle.
- UC-002: The selected running agent always exposes an enabled interrupt action and no send action.
- UC-003: The user interrupts a running current turn; the stream terminalizes and settles to idle without a quiet-period guess.
- UC-004: A terminal current-turn/runtime failure settles to error, while a recoverable diagnostic/tool failure leaves the current turn running.
- UC-005: A terminated/unavailable runtime is offline.
- UC-006: The frontend reconnects or hydrates during an active turn and converges from the backend snapshot/next streamed event.
- UC-007: Late activity from completed turn A renders without reopening it; activity/terminal events from A cannot disturb newer turn B.
- UC-008: Mouse click and Enter use the same action guard; no second send is admitted while initializing/running.
- UC-009: Supported AutoByteus, Codex, and Claude runtimes expose the same public lifecycle contract in standalone and team-member flows.

## Out of Scope

- New status colors, labels, or a broader visual redesign.
- Business-stage status such as whether a team specialist has completed its project assignment.
- Suppressing, deleting, or reordering legitimate late transcript/tool/activity content.
- Adding inactivity/quiet-period timers.
- Provider-specific model reasoning or tool-loop redesign.
- Runtime termination/close UI beyond preserving its existing separate semantics.
- Release/deployment unless requested later.

## Functional Requirements

- **REQ-001 — Canonical lifecycle authority:** The backend MUST own one public per-run/member lifecycle projection with exactly `offline`, `initializing`, `idle`, `running`, and `error` meanings defined above. Frontend components MUST consume that projection rather than invent lifecycle from presentation timing.
- **REQ-002 — Running invariant:** For supported agent execution, public `running` MUST mean there is a current open turn addressable by the existing interrupt command. The public/frontend model MUST NOT retain a separately authoritative interrupt-eligibility boolean that can contradict `running`.
- **REQ-003 — Stream companion status:** Every outward agent activity or lifecycle message delivered to a subscriber MUST be accompanied on that stream by the current canonical `AGENT_STATUS` projection. Repeating an unchanged status is allowed and expected; correctness MUST NOT depend on receiving only transition events.
- **REQ-004 — Busy detection:** Before or with output belonging to the current open turn, the stream MUST project `running`; current-turn reasoning, content, tool, inter-agent, todo, or system activity MUST self-heal a stale frontend projection to `running` without waiting for reconnect.
- **REQ-005 — Idle detection:** `TURN_COMPLETED` or `TURN_INTERRUPTED` for the current open turn MUST be followed immediately by `idle` when the runtime remains live/reusable. No delay or quiet-period timer is allowed.
- **REQ-006 — Error detection:** A terminal failure for the current turn or runtime MUST project `error`. A recoverable tool failure or diagnostic message MUST remain content/activity within the current lifecycle and MUST NOT independently terminalize or disable the turn.
- **REQ-007 — Offline detection:** Explicit runtime termination/disposal/unavailability MUST project `offline`; normal turn completion/interruption MUST NOT.
- **REQ-008 — Interrupt UI:** While the selected context is `running`, the primary composer action MUST show an enabled red stop control and route to the existing single-run or exact team-member interrupt command. It MUST NOT show or execute send.
- **REQ-009 — Unified action guard:** Button click, Enter key, and any programmatic primary-action path MUST use the same enabled/action decision. While `initializing`, the primary action MUST be disabled; while `running`, it MUST interrupt; while `idle`, it MAY send only with a valid draft and no blocking upload.
- **REQ-010 — Ordering and self-healing:** For a current-turn activity event, the status companion MUST be ordered early enough that the UI exposes interrupt no later than rendering that activity. For a terminal boundary, the resulting terminal/idle status MUST be ordered after the boundary so the final state is non-running.
- **REQ-011 — Snapshot convergence:** Initial connect, reconnect, history refresh, and active recovery MUST converge on the same canonical projection used for live stream companions and MUST NOT overwrite a newer subscribed live status with a history placeholder.
- **REQ-012 — Turn correlation:** Only output for the current open turn may establish/reinforce `running`. Late output for a retired turn MUST remain observable but MUST re-emit/preserve the actual current lifecycle; it MUST NOT reopen idle or disturb a newer current turn. Duplicate/out-of-order boundaries MUST remain idempotent.

## Acceptance Criteria

- **AC-001:** Given the selected context displays `Running`, the primary composer shows the red stop icon and does not show the send icon.
- **AC-002:** Clicking stop on a running standalone run or focused exact team member sends the existing correctly targeted `INTERRUPT_GENERATION` command.
- **AC-003:** Given a frontend context is stale `idle`/`initializing`, receiving current-turn segment/tool/reasoning activity plus its companion status changes it to `running` and exposes stop before/no later than that activity renders.
- **AC-004:** Given `TURN_COMPLETED(A)` or `TURN_INTERRUPTED(A)` for the current turn, the same live stream settles to `idle`, send-readiness can resume, and stop is removed without timeout or refresh.
- **AC-005:** Given a terminal current-turn or runtime-global failure, the final status is `error` and stop is unavailable.
- **AC-006:** Given a recoverable tool execution failure/diagnostic while turn A remains open, status remains `running` and stop remains available.
- **AC-007:** Given runtime termination/disposal, status becomes `offline`; ordinary completion/interruption remains `idle`.
- **AC-008:** Given `TURN_STARTED(A) -> TURN_COMPLETED(A) -> late activity(A)`, the late activity remains rendered and status remains `idle`.
- **AC-009:** No supported frontend state can end as `currentStatus=running` while rendering the send action because a separate stored interrupt flag is false.
- **AC-010:** A WebSocket trace for standalone and team-member execution shows each non-status activity/lifecycle message paired with the current canonical `AGENT_STATUS`, including unchanged repetitions.
- **AC-011:** Given `TURN_STARTED(A) -> TURN_COMPLETED(A) -> TURN_STARTED(B)`, delayed activity or terminal events for A do not change running/interruptibility for B.
- **AC-012:** Reconnect during a running turn returns `running`; reconnect after current-turn completion returns `idle`; the next activity companion also repairs either stale frontend projection.
- **AC-013:** Pressing Enter while `initializing` does not call send or interrupt, even if a non-empty draft is present.
- **AC-014:** Pressing Enter while `running` calls interrupt and never sends a second user command; Shift+Enter still inserts a newline.
- **AC-015:** Durable coverage validates the public lifecycle and composer behavior across Codex, Claude, and native AutoByteus standalone/team-member paths, including current-turn activity, terminal completion/interruption, terminal error, late old-turn activity, reconnect, and keyboard guarding.

## Constraints / Dependencies

- Existing `AGENT_STATUS` and targeted `INTERRUPT_GENERATION` concepts should be reused; no parallel legacy/new status path is allowed.
- Provider runtime events may arrive asynchronously or out of order. Canonical `turn_id`/`turnId` normalization and retired/current turn tracking must remain authoritative.
- Status repetition increases message count but not provider computation; it is explicitly acceptable for this correctness-first change. Existing content-delta presentation batching may remain as long as companion ordering/repair is preserved.
- Team events require exact member route/run identity and must not fall back to aggregate/team-wide interrupt.
- A frontend transport disconnect alone is not proof that the runtime is offline; reconnect snapshots remain backend-owned.
- Clean-cut replacement is preferred: remove obsolete separate interrupt-state fields/protocol properties and their hydration/reconciliation writes rather than wrapping them.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Run/team metadata, transcripts, raw traces, and frontend in-memory status projection.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all run/team identities, transcripts, raw traces, activity records, and termination metadata unchanged. Live lifecycle is recalculated from active runtime state/events.
- Unacceptable data loss or corruption: Loss/suppression of late activity, incorrect member targeting, or admission of duplicate/concurrent user commands due UI status drift.
- Relevant availability, maintenance-window, or rollout constraints: None known; restarted runtimes naturally rebuild live lifecycle state.
- Related requirement and acceptance-criteria IDs: REQ-011, REQ-012; AC-008, AC-011, AC-012.

## Assumptions

- Every supported runtime can expose a runtime-neutral turn start/current-turn identity and a completion/interruption terminal boundary, directly or through the existing server converter.
- Existing single-agent and exact team-member interrupt routes are valid whenever the corresponding public status is `running`.
- Redundant status companions are preferable to a sparse transition-only protocol for frontend convergence and are acceptable to the user.

## Risks / Open Questions

- The user approved the clean simplification: public `running` itself governs the interrupt action, and the separate `can_interrupt`/frontend `canInterrupt` state is removed rather than repaired.
- Some non-content operational events may omit turn identity. The design must classify them conservatively: they may carry the current projection but cannot create a new turn without current-turn/command evidence.
- The exact wire pairing strategy (one companion per individual message versus one per transport batch) is a design choice, but it must satisfy AC-003, AC-004, and AC-010 without weakening the user's “status travels with streaming” requirement.
- Interrupt-request-in-flight presentation may need a local disabled/pending control state, but it must not become another agent lifecycle authority or turn the control back into send while the turn is still running.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-004, UC-005, UC-006, UC-009 |
| REQ-002 | UC-001, UC-002, UC-003, UC-009 |
| REQ-003 | UC-001, UC-004, UC-006, UC-007, UC-009 |
| REQ-004 | UC-001, UC-002, UC-006, UC-009 |
| REQ-005 | UC-001, UC-003, UC-009 |
| REQ-006 | UC-004, UC-009 |
| REQ-007 | UC-005, UC-009 |
| REQ-008 | UC-002, UC-003, UC-008 |
| REQ-009 | UC-001, UC-002, UC-008 |
| REQ-010 | UC-001, UC-003, UC-004, UC-006 |
| REQ-011 | UC-006, UC-009 |
| REQ-012 | UC-007, UC-009 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Intended Scenario |
| --- | --- |
| AC-001 | Running/header and primary action coherence. |
| AC-002 | Existing interrupt routing remains correct. |
| AC-003 | Stream-driven busy self-healing. |
| AC-004 | Immediate turn-terminal idle detection. |
| AC-005 | Terminal error detection. |
| AC-006 | Recoverable error does not terminalize. |
| AC-007 | Idle versus offline distinction. |
| AC-008 | Late retired-turn output does not reopen busy. |
| AC-009 | Removal of contradictory status/interrupt state. |
| AC-010 | Status companion wire contract. |
| AC-011 | Older turn cannot disturb newer turn. |
| AC-012 | Snapshot/live convergence. |
| AC-013 | Enter respects initializing disabled state. |
| AC-014 | Enter interrupts instead of sending while running. |
| AC-015 | Cross-runtime durable coverage. |

## Approval Status

Approved by the user on 2026-08-01. The approved basis is:

- `running` is the sole public busy/interruptible state;
- separately authoritative `can_interrupt` / frontend `canInterrupt` state is removed;
- current status streams alongside every agent activity/lifecycle message;
- current-turn identity and `TURN_COMPLETED` / `TURN_INTERRUPTED` govern safe busy/idle transitions;
- the Enter-key guard defect exposed by the matched production trace is included.
