# Requirements Doc

## Status (`Design-ready` — Binary Team Activity Presentation Revision User Approved 2026-08-03)

## Goal / Problem Statement

Fix the contradiction where a selected agent is visibly `Running` and streaming work but the composer does not expose an active interrupt action. Simplify status ownership across both agents and agent teams so each domain subject carries only the state it actually owns:

- **Agent/member run:** `offline | initializing | idle | running | error`.
- **Team definition:** no runtime status.
- **Team run:** binary `isActive`, meaning a live `TeamRun` is registered in the authoritative server active-run directory and remains terminable.
- **Team presentation:** a team-run row visualizes that run's `isActive`; its parent agent-team/definition group visualizes whether any child run is active. These are binary activity indicators, not five-state team lifecycles.
- **Task delegation/execution:** its existing task-domain stage when that business state is shown; it is not a team or agent runtime status.

The simple canonical agent rule remains:

- `initializing`: a command has been accepted but no authoritative current turn is open yet;
- `running`: the runtime has a current open turn, and that turn is interruptible through the supported run/member route;
- `idle`: the runtime is live and reusable but has no current open turn;
- `error`: the current turn or runtime reached a terminal failure;
- `offline`: the agent runtime is unavailable or terminated.

A stream event means agent `running` only when it belongs to the current open turn. Late output from an already completed/retired turn must still render but must not reopen busy state.

For a team, member activity is deliberately not folded upward. A live team remains `isActive=true` when its members are idle, running, initializing, or in error. A team becomes inactive only when it is not present as a live registered team run; connection state, content-delta arrival, and member aggregation are not substitutes for that fact.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A selected member can show `Running` while the primary composer button remains the blue send icon because `currentStatus` and `canInterrupt` are separately stored and can diverge. | For a supported current open turn, `Running` and the enabled red stop/interrupt action are one coherent projection; the UI cannot represent `Running` as send-ready. | Existing targeted single-agent and team-member interrupt commands and member identity validation remain in use. | REQ-001, REQ-002, REQ-008, REQ-009; AC-001, AC-002, AC-009 |
| BEH-002 | Status snapshots/events are sparse and multiple backend paths can publish `running` with different `can_interrupt` values; supported local direct-message/artifact/system notifications also bypass the shared processor/finalizer and reach run listeners directly. | Every outward agent activity/lifecycle message, whether runtime-, local-service-, or processor-derived, is accompanied by the agent backend's current canonical status projection, ordered so current-turn activity repairs the frontend to `running` before/with rendering and terminal activity repairs it immediately afterward. | Existing content, reasoning, tool, inter-agent, todo, artifact, and system-task messages retain their normal payloads and rendering. | REQ-003, REQ-004, REQ-005, REQ-010; AC-003, AC-004, AC-010, AC-011 |
| BEH-003 | Idle/error/offline detection is spread among runtime projectors, command overlays, lifecycle fallbacks, snapshots, and frontend `isSending` cleanup; a retained local `initializing` override can shadow fresh backend current-turn evidence during reconnect. | `TURN_COMPLETED` or `TURN_INTERRUPTED` for the current turn immediately settles a live agent runtime to `idle`; terminal turn/runtime failure settles to `error`; termination/unavailability settles to `offline`; reconnect reconciles fresh current-turn evidence into the same projection and returns `running` rather than stale startup. | Recoverable tool/diagnostic errors do not terminalize the whole turn, and racy idle/initializing evidence does not close an identified current turn. | REQ-005, REQ-006, REQ-007, REQ-011; AC-004, AC-005, AC-006, AC-007, AC-012 |
| BEH-004 | Generic old-turn activity previously caused stale `running`; current safeguards track retired/current turn identity, but derived statuses can still carry non-interruptible `running`. | Current-turn correlation remains mandatory: late output for retired turn A renders without changing status; it cannot close/reopen newer turn B or convert idle to running. | Late output is not discarded from transcript/activity/history. | REQ-004, REQ-012; AC-008, AC-011, AC-012 |
| BEH-005 | The composer button can be disabled while `handleKeyDown` still invokes the primary action on Enter; production traces show a second user turn was recorded while the first continued. | Mouse, keyboard, and programmatic primary-action paths share one guard. While `initializing` or `running`, send cannot start another turn; `running` routes the action to interrupt. | Shift+Enter/newline behavior and normal idle send behavior remain unchanged. | REQ-008, REQ-009; AC-009, AC-013, AC-014 |
| BEH-006 | The original UI copied one child run's five-state `AgentTeamStatus` onto the definition row; the delivered candidate removed the dot entirely. User feedback on that candidate says the parent agent-team name now lacks an at-a-glance signal that one or more child team runs are active. | The definition remains free of an owned runtime status field, but its workspace/running group row shows a binary presentation summary: active when **any** child run has authoritative `isActive=true`, otherwise inactive. It never selects a representative run's agent-like status. | Definition grouping, count, ordering, expansion, avatar, and run creation remain available. | REQ-013, REQ-020; AC-016, AC-026 |
| BEH-007 | A root team run owns a five-state aggregate derived from member agent/subteam states and separately owns `isActive`. Frontend hydration repeatedly converts `isActive` to status and status back to active. | A root team run owns only binary `isActive`, sourced from authoritative live registration. Member states never determine team activity. | Team creation, restore, termination, history, selection, exact member routing, and member snapshots remain supported. | REQ-014, REQ-015, REQ-018; AC-017, AC-018, AC-019, AC-020, AC-024 |
| BEH-008 | The original team-run row used a five-color aggregate; the delivered candidate correctly switched actions to `isActive` but removed the run-row dot. User feedback says the row is clearer when liveness remains visible beside the run name. | Stop is available exactly while `isActive`; inactive persisted runs may be archived/deleted under their existing lifecycle constraints. Every root team-run row shows a binary activity indicator derived directly from that run's `isActive`. A local `stopPending` flag only prevents duplicate requests. | Existing confirmation, toast/error, draft deletion, cleanup behavior, and leaf-agent five-state dots remain. | REQ-016, REQ-018, REQ-020; AC-017, AC-018, AC-022, AC-023, AC-026 |
| BEH-009 | The current ticket branch removes aggregate team status, but a task team created inside an ordinary subteam carries child-local logical-team coordinates after its leaf member/source paths are rebased to the root stream. Live routing loses the relative leaf selector and reconnect mapping rejects the snapshot. | Public/frontend five-state team status remains removed. Every live and initial leaf-agent status uses one internally consistent coordinate frame at each team boundary, including task teams below one or more ordinary subteams. Team liveness, task stage, failures, and open-work checks remain separately owned. | Per-member `AGENT_STATUS` identity/payload, task-delegation records/stages, explicit operation errors, and the supported nested `delegate_task` path remain observable. | REQ-015, REQ-017, REQ-019; AC-020, AC-021, AC-024, AC-025 |

## Investigation Findings

- The original screenshot state is representable because the header reads agent `currentStatus`, while the composer reads a separate `canInterrupt` field.
- The matched live Codex team trace shows current-turn reasoning, assistant, and tool output continuing after the screenshot text. It also shows a second distinct user turn recorded 13 seconds after the first submission and before the first turn's first reasoning event completed.
- A read-only live team WebSocket probe later returned the correct member snapshot `AGENT_STATUS { status: "running", can_interrupt: true }`. The backend can know the active turn, but sparse/racy status events and separately mutable frontend permission allow disagreement until later repair.
- Earlier production evidence proves late tool/provider events can arrive after their original turn completed; “stream received means agent busy” must be qualified by current-turn identity.
- Architecture review confirmed supported local `AgentRun.emitLocalEvent` origins bypass the shared processor/finalizer, and a retained `AgentRun` startup override can shadow fresh runtime current-turn evidence.
- The team-definition dot is not a definition fact. `workspaceHistoryTeamDefinitionGroups.ts` copies `representativeRun.currentStatus` from the most recently active child run into the definition display group.
- The backend already has the simpler team authority: `AgentTeamRunManager.activeRuns` plus `getActiveRun()` registration/liveness check. Team history and resume APIs already expose `isActive` from that owner.
- The current server separately derives five-state team status from member snapshots through `deriveTeamApiStatus`; the frontend then converts team activity to `Running`/`Offline` and later converts the aggregate status back to activity for actions. This circular representation is unnecessary.
- A live team with idle or errored members remains registered and must remain stoppable. A WebSocket disconnect, a temporary frontend draft, or a hydrated historical context does not change server team liveness.
- Removing the aggregate requires separating its non-presentation consumers: task stage remains task-owned; member statuses remain agent-owned; explicit failures remain events/results; task-team settlement receives an explicit internal open-work predicate rather than a public team status.
- Expanded source review proved that “any team depth” includes a supported task team launched by a leaf agent inside an ordinary persistent subteam. Root-stream leaf member/source and logical-team coordinates must be rebased together; a transport fallback must not guess missing scope.
- Post-delivery user feedback distinguishes removing the five-state team aggregate from removing all visual activity. The accepted correction is binary: a run dot reads only that run's `isActive`, while a parent agent-team/definition dot reads `runs.some(run => run.isActive)`.

Detailed evidence:

- [`production-trace-evidence.md`](./production-trace-evidence.md)
- [`team-status-simplification-evidence.md`](./team-status-simplification-evidence.md)

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` | Evidence-only production trace and live snapshot probe | REQ-001–REQ-012 | AC-001–AC-015 | Complete / N/A | Grounds the agent contradiction, overlapping-send risk, live snapshot capability, and late-event constraint. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md` | Evidence-only team-definition/team-run authority, consumer trace, and post-delivery presentation correction | REQ-013–REQ-020 | AC-016–AC-026 | Complete / N/A | Grounds removal of definition-owned status, preservation of binary team activity cues, member-status preservation, and separation of former aggregate consumers. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` | User-supplied agent UI evidence | REQ-001, REQ-008 | AC-001, AC-009 | Accepted evidence / N/A | Shows agent `Running` while the primary control remains the send icon. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png` | User-supplied team hierarchy evidence | REQ-013–REQ-017 | AC-016, AC-017, AC-021, AC-023 | Accepted evidence / N/A | Shows redundant team-run status plus Stop and independently useful member-agent status dots. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png` | User-supplied team-definition UI evidence | REQ-013 | AC-016 | Accepted evidence / N/A | Shows a runtime-status dot incorrectly rendered on the reusable `Software Engineering Team` definition group. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_0fa01fdeb308__image.png` | User-supplied post-delivery UI evidence and explicit feedback | REQ-016, REQ-020 | AC-023, AC-026 | Approved behavior evidence / Approved 2026-08-03 | Shows the delivered team-definition and team-run rows without activity dots; user feedback explicitly requires binary activity in both positions for clarity. |

## Design Health Assessment (Mandatory)

- Original change posture: `Bug Fix`, lifecycle/status `Refactor`, and team-status contract `Cleanup`; original scope `Large`.
- Accepted baseline result: The original `Missing Invariant`, `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `Shared Structure Looseness`, and keyboard `Local Implementation Defect` findings were resolved through `SR-005` and passed architecture, source, API/E2E, and proportional test-code review.
- `SR-006` posture: localized user-approved `Behavior Change`; current design issue signal is `No` in lifecycle/state ownership and `Yes` only for a `Local Presentation Omission`.
- Refactor posture for `SR-006`: `Not Required` beyond a tight boolean-only presentation component and a presentation-group projection.
- Evidence basis:
  - Accepted source has one agent lifecycle authority, one manager-owned team `isActive`, no public aggregate team lifecycle, no definition-owned status, and unified action guards.
  - Exact run rows already carry `isActive`; definition display groups already carry every displayed child run and therefore need no backend/store expansion.
  - Reusing agent `StatusDot` would synthesize an invalid five-state team status and add pulse semantics that binary team liveness does not own.
- Requirement or scope impact: Preserve all accepted lifecycle/state contracts. Add only exact-run and any-child-active presentation projections, localization, and focused frontend coverage.

## Recommendations

1. Keep the approved runtime-neutral five-state lifecycle only for agent/member runs.
2. Collapse public agent interrupt eligibility into that lifecycle: `running` means the current turn exists and is interruptible; remove `can_interrupt`/`canInterrupt` as an independent authority.
3. Carry canonical `AGENT_STATUS` alongside each outward agent activity/lifecycle event, with current-turn and terminal ordering safety.
4. Remove runtime status from team definitions entirely; never copy status from a representative child run.
5. Replace public/frontend five-state team status with `isActive` from the server's active-team-run registry. Use it directly for Stop versus inactive-history actions.
6. Do not infer team activity from member aggregation, deltas, frontend context-map membership, or WebSocket connectivity.
7. Preserve leaf-member `AGENT_STATUS` through the team envelope without changing its status data. Separate task stage, explicit failure, and internal open-work predicates from team liveness.
8. Route every primary composer trigger and every team Stop trigger through one local request guard without making request-pending state another lifecycle authority.

## Scope Classification (`Large`)

The expanded change crosses the server runtime-neutral agent lifecycle pipeline, team-run domain/status aggregation, team WebSocket protocol/snapshots, run-history GraphQL projection, nested/task-team consumers, frontend team context/history/recovery, desktop/mobile presentation, and composer/Stop action guards. It does not redesign provider runtime loops, team definitions, task-delegation business stages, or general visual styling.

## In-Scope Use Cases

- UC-001: A standalone or team-member command is accepted, transitions through initializing/current-turn running, streams output, completes, and becomes idle.
- UC-002: The selected running agent always exposes an enabled interrupt action and no send action.
- UC-003: The user interrupts a running current turn; the stream terminalizes and settles to idle without a quiet-period guess.
- UC-004: A terminal current-turn/runtime failure settles the agent to error, while a recoverable diagnostic/tool failure leaves the current turn running.
- UC-005: A terminated/unavailable agent runtime is offline.
- UC-006: The frontend reconnects or hydrates during an active agent turn and converges from the backend snapshot/next streamed event.
- UC-007: Late activity from completed turn A renders without reopening it; activity/terminal events from A cannot disturb newer turn B.
- UC-008: Mouse click and Enter use the same agent action guard; no second send is admitted while initializing/running.
- UC-009: Supported AutoByteus, Codex, and Claude runtimes expose the same public agent lifecycle contract in standalone and team-member flows.
- UC-010: A workspace team-definition group renders definition metadata, child-run count, and a binary any-child-active indicator without owning or borrowing a five-state runtime status.
- UC-011: A created/restored team run remains active and stoppable regardless of whether its member agents are idle, initializing, running, or errored.
- UC-012: A successfully terminated or otherwise absent server team run is inactive; Stop is unavailable and existing inactive-history actions apply.
- UC-013: A frontend disconnect/reconnect or historical-context open does not manufacture team activity; authoritative server activity converges through history/resume/live lifecycle facts.
- UC-014: Inside a team, each leaf agent independently receives and renders its five-state status and exposes member interrupt only while that member is running.
- UC-015: Nested/task-team display and cleanup use binary live-instance or task-domain lifecycle facts without reintroducing a public five-state team aggregate.
- UC-016: A user scans a collapsed agent-team/definition group and its expanded child run rows and can immediately distinguish whether any run is active and which exact runs are active.

## Out of Scope

- A broad restyling of status colors, icons, row layout, or the workspace navigation.
- Business-stage status for whether a specialist or whole project assignment is complete; existing task-delegation stage remains a separate domain.
- Changing team membership/topology, team creation inputs, routing, or roles.
- Suppressing, deleting, or reordering legitimate late transcript/tool/activity content.
- Adding inactivity/quiet-period timers.
- Provider-specific model reasoning or tool-loop redesign.
- Changing exact standalone/member interrupt commands or adding aggregate/team-wide generation interrupt.
- Release/deployment unless requested later.

## Functional Requirements

- **REQ-001 — Canonical agent lifecycle authority:** The backend MUST own one public per-agent-run/member lifecycle projection with exactly `offline`, `initializing`, `idle`, `running`, and `error` meanings defined above. Frontend components MUST consume that projection rather than invent lifecycle from presentation timing.
- **REQ-002 — Agent running invariant:** For supported agent execution, public `running` MUST mean there is a current open turn addressable by the existing interrupt command. The public/frontend model MUST NOT retain a separately authoritative interrupt-eligibility boolean that can contradict `running`.
- **REQ-003 — Agent stream companion status:** Every outward agent activity or lifecycle message delivered to a subscriber MUST be accompanied on that stream by the current canonical `AGENT_STATUS` projection. Repeating an unchanged status is allowed and expected; correctness MUST NOT depend on transition-only status events.
- **REQ-004 — Agent busy detection:** Before or with output belonging to the current open turn, the stream MUST project `running`; current-turn reasoning, content, tool, inter-agent, todo, or system activity MUST self-heal a stale frontend projection without waiting for reconnect.
- **REQ-005 — Agent idle detection:** `TURN_COMPLETED` or `TURN_INTERRUPTED` for the current open turn MUST be followed immediately by `idle` when the agent runtime remains live/reusable. No delay or quiet-period timer is allowed.
- **REQ-006 — Agent error detection:** A terminal failure for the current turn or agent runtime MUST project `error`. A recoverable tool failure or diagnostic message MUST remain content/activity within the current lifecycle and MUST NOT independently terminalize or disable the turn.
- **REQ-007 — Agent offline detection:** Explicit agent runtime termination/disposal/unavailability MUST project `offline`; normal turn completion/interruption MUST NOT.
- **REQ-008 — Member interrupt UI:** While the selected standalone/member agent context is `running`, the primary composer action MUST show an enabled red stop control and route to the existing single-run or exact team-member interrupt command. It MUST NOT show or execute send.
- **REQ-009 — Unified agent action guard:** Button click, Enter key, and any programmatic primary-action path MUST use the same enabled/action decision. While `initializing`, the primary action MUST be disabled; while `running`, it MUST interrupt; while `idle`, it MAY send only with a valid draft and no blocking upload.
- **REQ-010 — Agent ordering and self-healing:** For a current-turn activity event, the status companion MUST be ordered early enough that the UI exposes interrupt no later than rendering that activity. For a terminal boundary, the resulting terminal/idle status MUST be ordered after the boundary so the final state is non-running.
- **REQ-011 — Agent snapshot convergence:** Initial connect, reconnect, history refresh, and active recovery MUST converge on the same canonical agent projection used for live stream companions and MUST NOT overwrite a newer subscribed live agent status with a history placeholder.
- **REQ-012 — Agent turn correlation:** Only output for the current open turn may establish/reinforce `running`. Late output for a retired turn MUST remain observable but MUST re-emit/preserve the actual current lifecycle; it MUST NOT reopen idle or disturb a newer current turn. Duplicate/out-of-order boundaries MUST remain idempotent.
- **REQ-013 — Team definitions have no owned runtime status:** A team definition/container MUST NOT own, receive, or expose a runtime lifecycle field. Definition grouping MUST NOT select a child/representative run's five-state status. A presentation-only binary “has active runs” summary defined by REQ-020 is allowed and required; existing identity, count, avatar, disclosure, and launch behavior MUST remain.
- **REQ-014 — Canonical team activity authority:** A team run's only public operational lifecycle fact MUST be `isActive: boolean`. `isActive=true` means the run is registered in the authoritative server active-team-run directory and its backend remains live; `isActive=false` means no such live registration exists. Temporary frontend drafts and hydrated history contexts are not active server team runs.
- **REQ-015 — No aggregate team lifecycle:** Member agent statuses MUST NOT be folded into, copied to, or exposed as a five-state team status. The public server/frontend contract MUST remove the aggregate team `status`/`AgentTeamStatus` representation and root aggregate `TEAM_STATUS` stream path rather than retain a parallel compatibility path.
- **REQ-016 — Team action and presentation policy:** Root team Stop visibility/eligibility MUST be derived directly from `isActive`; inactive archive/delete behavior MUST continue to use its existing history lifecycle constraints. Definition-group and root team-run rows MUST NOT render a five-state team dot/label, but MUST render the binary activity indicators defined by REQ-020. Desktop and mobile surfaces that label team-run liveness MUST use only `Active`/`Inactive` semantics.
- **REQ-017 — Member status preservation:** Leaf agent members inside any team depth MUST retain the same canonical five-state `AGENT_STATUS`, exact route/path/run identity, stream self-healing, and interrupt behavior as standalone agents. Live events and initial/reconnect snapshots MUST select the same exact leaf when a task team is launched inside one or more ordinary subteams; all scope coordinates exposed at a parent stream boundary MUST be in that boundary's frame. Removing team aggregate status MUST NOT rewrite, suppress, infer, or transport-guess member state.
- **REQ-018 — Team lifecycle convergence and request pending:** Create/restore success MUST establish active; successful termination/unregistration MUST establish inactive; initial load/reconnect/history refresh MUST converge from the authoritative server fact. A frontend stream disconnect alone MUST NOT set inactive. A local `stopPending`/termination-in-flight flag MAY disable duplicate Stop requests but MUST NOT replace or alter `isActive`; a failed stop keeps the team active and stoppable.
- **REQ-019 — Separate formerly conflated concerns:** Explicit team operation failures MUST remain observable through operation results/events; task delegation/execution MUST retain its task-domain stage; any internal settlement decision requiring “open work” MUST use a dedicated member/task-work predicate. None of these concerns may recreate or depend on a public five-state team aggregate.
- **REQ-020 — Binary team activity indicators:** A root team-run row MUST render a compact binary activity indicator from that exact run's authoritative `isActive`. Its parent agent-team/definition group row MUST render active when at least one displayed child run has `isActive=true`, otherwise inactive. Active MUST use a clear solid blue treatment and inactive a neutral solid gray treatment; neither treatment may pulse or map through `AgentStatus`, member aggregation, representative-run selection, socket state, task stage, or a restored team-status DTO. The same binary source MUST drive accessible `Active`/`Inactive` meaning.

## Acceptance Criteria

- **AC-001:** Given the selected agent context displays `Running`, the primary composer shows the red stop icon and does not show the send icon.
- **AC-002:** Clicking stop on a running standalone run or focused exact team member sends the existing correctly targeted `INTERRUPT_GENERATION` command.
- **AC-003:** Given a frontend agent context is stale `idle`/`initializing`, receiving current-turn segment/tool/reasoning activity plus its companion status changes it to `running` and exposes stop before/no later than that activity renders.
- **AC-004:** Given `TURN_COMPLETED(A)` or `TURN_INTERRUPTED(A)` for the current turn, the same live stream settles the agent to `idle`, send-readiness can resume, and member stop is removed without timeout or refresh.
- **AC-005:** Given a terminal current-turn or agent-runtime-global failure, the final agent status is `error` and member stop is unavailable.
- **AC-006:** Given a recoverable tool execution failure/diagnostic while turn A remains open, agent status remains `running` and member stop remains available.
- **AC-007:** Given agent runtime termination/disposal, agent status becomes `offline`; ordinary completion/interruption remains `idle`.
- **AC-008:** Given `TURN_STARTED(A) -> TURN_COMPLETED(A) -> late activity(A)`, the late activity remains rendered and agent status remains `idle`.
- **AC-009:** No supported frontend agent state can end as `currentStatus=running` while rendering the send action because a separate stored interrupt flag is false.
- **AC-010:** A WebSocket trace for standalone and team-member execution shows each non-status agent activity/lifecycle message paired with the current canonical `AGENT_STATUS`, including unchanged repetitions.
- **AC-011:** Given `TURN_STARTED(A) -> TURN_COMPLETED(A) -> TURN_STARTED(B)`, delayed activity or terminal events for A do not change running/interruptibility for B.
- **AC-012:** Agent reconnect during a running turn returns `running`; reconnect after current-turn completion returns `idle`; the next activity companion also repairs either stale frontend projection.
- **AC-013:** Pressing Enter while the selected agent is `initializing` does not call send or interrupt, even if a non-empty draft is present.
- **AC-014:** Pressing Enter while the selected agent is `running` calls interrupt and never sends a second user command; Shift+Enter still inserts a newline.
- **AC-015:** Durable coverage validates the public agent lifecycle and composer behavior across Codex, Claude, and native AutoByteus standalone/team-member paths, including current-turn activity, terminal completion/interruption, terminal error, late old-turn activity, reconnect, and keyboard guarding.
- **AC-016:** Given a team definition containing zero, one, or multiple live/historical runs in any mixture of member states, it exposes no owned five-state status and never changes because a different run becomes the latest representative; its only activity visual follows the any-child-`isActive` rule in AC-026.
- **AC-017:** Given a root team run is registered/live, it has `isActive=true` and exposes Stop even when all members are idle, one or more members are in error, or no deltas are currently arriving.
- **AC-018:** Given successful team termination/unregistration, `isActive` becomes false, Stop disappears, and existing eligible inactive history actions become available; a failed termination leaves `isActive=true` and Stop available after pending clears.
- **AC-019:** Disconnecting the team WebSocket or navigating away does not by itself set `isActive=false`; reconnect/history refresh obtains the authoritative server activity fact.
- **AC-020:** The workspace/team public contract no longer includes a root aggregate team `status`, root aggregate `TEAM_STATUS`, frontend `AgentTeamStatus`, or a team-context `currentStatus`; no compatibility alias/dual path remains.
- **AC-021:** Live and initial/reconnect member `AGENT_STATUS` messages received through the root team stream retain exact member identity and update only the matching leaf agent's five-state status, including `root -> ordinary subteam(s) -> task team -> leaf`; the selected running member still exposes exact-member interrupt, and no missing-scope fallback treats that leaf as a task-team root.
- **AC-022:** Repeated team Stop clicks while one request is pending produce at most one terminate operation; pending state does not mark the team inactive before server success.
- **AC-023:** Team definition/group and root team-run rows in workspace/running surfaces render no five-state team colors or member-derived status. Their binary dots and any mobile/text labels expose only `Active` or `Inactive` semantics from authoritative run booleans.
- **AC-024:** Workspace history and team resume results derive `isActive` from the authoritative team-run manager and do not derive it from member state, aggregate status, a frontend context map, or socket connection state.
- **AC-025:** Task-team terminal cleanup, operational failure observation, and settlement/open-work decisions continue to function using task/failure/member-work facts with no dependency on a public aggregate team lifecycle.
- **AC-026:** With two child team runs where one has `isActive=true` and one has `isActive=false`, the parent agent-team/definition row renders one solid blue active indicator, the active run row renders solid blue, and the inactive run row renders neutral gray. After the last active run becomes inactive, the parent indicator becomes gray. Collapsing the group preserves the correct parent signal; changing member-agent status, representative ordering, or socket connection alone does not change either binary indicator. Both indicators expose an accessible active/inactive label.

## Constraints / Dependencies

- Existing `AGENT_STATUS` and targeted `INTERRUPT_GENERATION` concepts should be reused for agents; no parallel legacy/new agent status path is allowed.
- Provider runtime events may arrive asynchronously or out of order. Canonical `turn_id`/`turnId` normalization and retired/current turn tracking must remain authoritative.
- Agent status repetition increases message count but not provider computation; it is explicitly acceptable for correctness. Existing content-delta presentation batching may remain if companion ordering/repair is preserved.
- Team events require exact member route/run identity and must not fall back to aggregate/team-wide generation interrupt.
- The team active-run manager is the authoritative boundary. Callers must not depend on both its public team-run liveness result and backend/member internals to decide public activity.
- A frontend transport disconnect alone is not proof that an agent is offline or a team is inactive.
- Clean-cut replacement is required: remove obsolete `can_interrupt`/`canInterrupt` and aggregate team-status fields/events/helpers rather than wrapping them with aliases or dual reads.
- Member status, task-delegation stage, and operation failure are distinct subjects and must remain semantically separate.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Run/team metadata, transcripts, raw traces, activity/task records, termination metadata, and frontend in-memory projections.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all identities, topology, transcripts, traces, activities, task records, summaries, and termination metadata. Agent live lifecycle and team `isActive` are recalculated from active runtime/manager state. Removed aggregate team status is computed live and carries no required stored meaning.
- Unacceptable data loss or corruption: Loss/suppression of late activity, incorrect member targeting, loss of task lifecycle, incorrect team Stop eligibility, or admission of duplicate/concurrent user commands due state drift.
- Relevant availability, maintenance-window, or rollout constraints: None known; frontend and server contract change ships together, and restarted runtimes rebuild live state naturally.
- Related requirement and acceptance-criteria IDs: REQ-011, REQ-012, REQ-014–REQ-020; AC-008, AC-011, AC-012, AC-018–AC-026.

## Assumptions

- Every supported agent runtime can expose a runtime-neutral turn start/current-turn identity and a completion/interruption terminal boundary, directly or through the existing server converter.
- Existing single-agent and exact team-member interrupt routes are valid whenever the corresponding agent status is `running`.
- The server active-team-run manager remains the product authority for whether a root team run is live and terminable.
- Team definitions do not own a runtime status. Their group row may expose only the presentation-derived any-child-active cue defined by REQ-020; users also need exact run activity, child team-run Stop, and member-agent statuses.
- Redundant agent status companions are preferable to sparse transition-only events; no analogous five-state companion is required for the team aggregate because that aggregate is removed.

## Risks / Open Questions

- The complete expanded basis is user-approved. The aggregate team-status paths are already removed in the accepted baseline; SR-006 must preserve that result while restoring only the two binary presentation cues.
- Some non-content agent operational events may omit turn identity. They may repeat current agent status but cannot create a new turn without current-turn/command evidence.
- Interrupt- or stop-request-in-flight presentation may use local disabled/pending state, but it must not become another lifecycle authority.
- Removing root/nested `TEAM_STATUS` requires explicit replacement of three real consumers rather than silent deletion: task-team cleanup, team failure observation, and task-team open-work settlement. REQ-019 fixes the intended semantics; exact interfaces belong in the design revision.
- If a surface has a genuine reason to show a nested team run's liveness, it may consume binary activity; it must not use a five-state member aggregate. Structural team-definition nodes still have no runtime status.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-004, UC-005, UC-006, UC-009, UC-014 |
| REQ-002 | UC-001, UC-002, UC-003, UC-009, UC-014 |
| REQ-003 | UC-001, UC-004, UC-006, UC-007, UC-009, UC-014 |
| REQ-004 | UC-001, UC-002, UC-006, UC-009, UC-014 |
| REQ-005 | UC-001, UC-003, UC-009, UC-014 |
| REQ-006 | UC-004, UC-009, UC-014 |
| REQ-007 | UC-005, UC-009, UC-014 |
| REQ-008 | UC-002, UC-003, UC-008, UC-014 |
| REQ-009 | UC-001, UC-002, UC-008 |
| REQ-010 | UC-001, UC-003, UC-004, UC-006, UC-014 |
| REQ-011 | UC-006, UC-009, UC-014 |
| REQ-012 | UC-007, UC-009, UC-014 |
| REQ-013 | UC-010 |
| REQ-014 | UC-011, UC-012, UC-013, UC-015 |
| REQ-015 | UC-010, UC-011, UC-014, UC-015 |
| REQ-016 | UC-010, UC-011, UC-012, UC-013 |
| REQ-017 | UC-001, UC-002, UC-003, UC-006, UC-009, UC-014 |
| REQ-018 | UC-011, UC-012, UC-013 |
| REQ-019 | UC-011, UC-014, UC-015 |
| REQ-020 | UC-010, UC-011, UC-012, UC-013, UC-016 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Intended Scenario |
| --- | --- |
| AC-001 | Agent running/header and primary action coherence. |
| AC-002 | Existing agent interrupt routing remains correct. |
| AC-003 | Stream-driven agent busy self-healing. |
| AC-004 | Immediate agent turn-terminal idle detection. |
| AC-005 | Terminal agent error detection. |
| AC-006 | Recoverable error does not terminalize the agent. |
| AC-007 | Agent idle versus offline distinction. |
| AC-008 | Late retired-turn output does not reopen agent busy. |
| AC-009 | Removal of contradictory agent status/interrupt state. |
| AC-010 | Agent status companion wire contract. |
| AC-011 | Older agent turn cannot disturb newer turn. |
| AC-012 | Agent snapshot/live convergence. |
| AC-013 | Enter respects agent initializing disabled state. |
| AC-014 | Enter interrupts instead of sending while agent running. |
| AC-015 | Cross-runtime durable agent coverage. |
| AC-016 | Team definitions render no runtime status. |
| AC-017 | Live team remains stoppable independent of member state/deltas. |
| AC-018 | Termination success/failure preserves correct binary activity/actions. |
| AC-019 | Socket state does not masquerade as team liveness. |
| AC-020 | Clean public/frontend removal of aggregate team lifecycle. |
| AC-021 | Per-member team-stream status and interrupt identity remain correct. |
| AC-022 | Team Stop request is idempotently guarded without changing lifecycle. |
| AC-023 | Team presentation uses no five-state aggregate. |
| AC-024 | Team history/resume activity comes from manager authority. |
| AC-025 | Former aggregate consumers use their own domain facts. |
| AC-026 | Team definition-group and exact run rows expose accessible binary activity. |

## Approval Status

### Approved agent lifecycle basis (2026-08-01)

- `running` is the sole public agent busy/interruptible state;
- separately authoritative `can_interrupt` / frontend `canInterrupt` state is removed;
- current agent status streams alongside every agent activity/lifecycle message;
- current-turn identity and `TURN_COMPLETED` / `TURN_INTERRUPTED` govern safe busy/idle transitions;
- the Enter-key guard defect exposed by the matched production trace is included.

### Approved team-status expansion (2026-08-02)

The user explicitly approved the second investigation and requirements update, including:

- team definitions have no owned runtime status, and the then-approved revision removed the borrowed five-state dot;
- root team runs use only authoritative binary `isActive` for liveness and Stop;
- the public/frontend five-state team aggregate and `AgentTeamStatus` are removed cleanly;
- leaf member agents retain the approved five-state lifecycle unchanged through the team stream;
- task stage, explicit failures, internal open-work decisions, socket state, and local Stop pending remain separate facts rather than another team lifecycle.

### Approved binary team-activity presentation correction (2026-08-03)

After inspecting the delivery candidate, the user explicitly required activity to remain visible in both places:

- the exact team-run/instance row shows that run's binary `isActive`;
- the parent agent-team/definition row shows whether any child team run is active;
- both indicators are retained for scan clarity, while the five-state aggregate, representative-run borrowing, and team lifecycle DTO remain removed.

This requirement correction is the authoritative `SR-006` input. It supersedes only the earlier instruction to remove definition/run dots; all lifecycle ownership, agent status, task-team identity, Stop, and aggregate-removal behavior remains approved and unchanged. Fresh architecture review is required before implementation resumes; the prior delivery candidate is no longer completion-ready.
