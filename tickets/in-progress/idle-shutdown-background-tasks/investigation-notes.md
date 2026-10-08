# Investigation Notes

## Investigation Meta

- Package identifier: `idle-shutdown-background-tasks`
- Request / ticket: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-08: "Idle shutdown of delegated agents kills their running background tasks, so the work stalls silently." Source report: `problem-report.md` (copy of `/Users/normy/autobyteus_org/agpl-dual-licensing-reports/idle-shutdown-kills-background-tasks.md`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks` on `codex/idle-shutdown-background-tasks`
- Resolved base remote / branch / revision: `origin/personal` @ `3a2496c95` (fetched 2026-10-08; the report cites `440a4c948`, two docs-only commits earlier; the cited code is unchanged)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate): `references/requirements-engineering.md` (2026-10-08)
- Investigation status: Requirements and architecture investigation complete (SR-002)

## Initial Request And Clarifications

- Original request: see Project Task description and `problem-report.md`. Confirm the root cause; a delegated agent's background task must no longer be killed silently; settle the expected behavior with the user.
- Clarifications received (user, 2026-10-08, Solution Designer conversation): "the task runs for a long time, more than 10 minutes … our backend killed the agent … its background task is also killed … the agent cannot continue the work, and then it cannot even report back … it cannot report to … the delegator that it finished the job, it's just dead there … For the current being, I think the agent shouldn't stop working just because being idle for a long time."
- User-supplied facts and constraints: The harm is that the agent can neither continue nor report back to its delegator. Direction: an agent waiting on its own background work must not be stopped for being idle.
- Initial ambiguity: Whether the deferral has an upper bound, and whether the user means "no idle shutdown while background work runs" or "no idle shutdown at all" (DEC-001, DEC-002).

## Product And Domain Understanding

- Product area: Task delegation (`delegate_task` copies of Agents/Teams in Agent Team and Agent Org roots), idle shutdown of delegated copies, runtime background tasks (Claude Agent SDK runtime, Antigravity runtime).
- Affected actors or systems: delegated agents (task copies) and team members inside delegated Team copies; the delegator agent waiting for a result; the user who sees the stall.
- Existing purpose of idle shutdown: free runtime resources (CLI processes) of delegated copies that are quiet; a same-root message restores them with their conversation (`docs/modules/agent_team_execution.md` "Idle shutdown", "Wake-on-message").
- Terminology: *background task* = work a runtime runs beyond its current turn and reports separately (`agent-execution/domain/agent-background-task.ts`), shown in the Background Tasks section (`BACKGROUND_TASK_UPDATED`). *Grace period* = `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`, default 600 000 ms.

## Source Log

| Date | Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Doc | `problem-report.md` | Report | Two kills at ~10 min after turn end; output `[killed]` | Confirm in code |
| 2026-10-08 | Runtime | `ls -la /private/tmp/claude-501/…/c6b4e8b7-…/tasks/`; `cat b2fxnu6z3.output` | Evidence still present | `b2fxnu6z3.output` mtime 09:51 CEST (07:51Z), `bvayozjre.output` 10:10 CEST (08:10Z); content `[killed]` | Temporary; evidence copied here |
| 2026-10-08 | Code | `autobyteus-server-ts/src/config/task-execution-idle-shutdown-setting.ts` | Grace value | Default 600 000 ms, range 60 000–86 400 000 ms, read at arm time | — |
| 2026-10-08 | Code | `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` `onAgentStatus`, `onGraceElapsed`, `shutdownAtHead` | Trigger path | `idle`/`offline`/`error` arms the grace timer for every task execution in the agent's chain; `running`/`initializing` cancels. Fire → queue `shutdown` → skip if leased/not live → `adapter.tryShutDownIfQuiet`. "The fire-time quiescence check is the only safety guard." | — |
| 2026-10-08 | Code | `src/agent-team-execution/local/registries/task-agent-execution-registry.ts` `tryShutDownIfQuiet` (l.241–266); `src/agent-org-execution/services/agent-org-task-execution-adapter.ts` l.303–333; `src/agent-team-execution/task-delegation/team-task-execution-adapter.ts` l.255; `root-agent-execution-registry.ts` l.256; `root-team-execution-directory.ts` l.276; `flat-team-execution-manager.ts` l.272 | Quiet check callers | All paths end in `tryPrepareTerminationIfQuiescent` of the agent handle / team | — |
| 2026-10-08 | Code | `src/agent-execution/domain/agent-run-termination.ts` `tryPrepareIfQuiescent` (l.70–86) | Quiet definition | Quiet = no active input dispatch, no interrupt reservation, `activeTurn.kind === "NONE"`, no pending command, input admission quiescent. **No background-task term.** | Root cause |
| 2026-10-08 | Code | `src/agent-execution/backends/claude/session/claude-background-task-registry.ts`; `claude-session.ts` `closeProcess` (l.288–297); `claude-turn-tracker.ts` `close()` (l.272–278) | What shutdown does to Claude tasks | Termination closes the CLI process (kills its background children) and `registry.clear()` publishes running tasks as `stopped` and drops pending/carry-over completions | — |
| 2026-10-08 | Doc | `autobyteus-server-ts/docs/modules/agent_execution.md` l.605–676 | Claude background contract | One CLI process per AgentRun, streaming input; "Run terminate/close … close the process, which stops its background tasks"; a background completion makes the CLI start a turn itself, preceded by `SYSTEM_TASK_NOTIFICATION` | — |
| 2026-10-08 | Code | `src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` `terminate` (l.111–119); `stream/agy-background-task-monitor.ts` | AGY gap | Terminate stops AGY and its background process groups; monitor marks running tasks `stopped`. Daemon steps (dev servers) never exit on their own | Same gap as Claude |
| 2026-10-08 | Doc | `docs/modules/antigravity_cli_runtime.md` l.242–295 | AGY contract | A normal turn end never stops AGY; daemons keep running between turns. AGY daemon exit does not start a turn | — |
| 2026-10-08 | Code | `autobyteus-ts/src/tools/terminal/background-process-context.ts`, `background-process-manager.ts`, tools `start_background_process`/`get_process_output` | Native runtime | Background processes are per agent context; the agent polls them; no completion notification is promised. `stopAll()` has no caller on run termination | Native has no "notified on completion" promise |
| 2026-10-08 | Code/Command | `grep -rn -i background src/agent-execution/backends/codex` (no hits); `codex features list` → `unified_exec stable true` (codex-cli 0.161.0) | Codex | AutoByteus does not surface Codex background terminals; Codex unified exec is polled by the model, no completion notification | Out of scope; record |
| 2026-10-08 | Code | `src/agent-execution/domain/agent-background-task.ts` | Shared vocabulary | Runtime-neutral `running/completed/failed/stopped`; `BACKGROUND_TASK_UPDATED` is not turn activity and never changes run status; not persisted | Architecture: liveness signal source |
| 2026-10-08 | Doc | `docs/modules/agent_team_execution.md` l.530–575 | Liveness/idle contract | One liveness predicate; open work = an agent `initializing`/`running`; idle shutdown only for task executions; root stop disposes timers | Preserved behavior |
| 2026-10-08 | Doc | `tickets/done/claude-sdk-background-task-lifecycle/requirements-doc.md` | History | Option 1 (disable background) shipped; Option 2 (streaming input, background support) followed (`claude-sdk-streaming-input-session`), so background tasks are now a supported Claude feature | Background tasks are supported behavior |
| 2026-10-08 | User | Solution Designer conversation | Direction | Agent must not stop working because it is idle while its work runs; must be able to report back to its delegator | DEC-001/002 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger / Contract | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Delegated Claude agent starts a `run_in_background` Bash/Monitor task and ends its turn | Turn ends → status `idle` → grace timer armed → after 10 min the quiet check passes (no turn, no input) → AgentRun terminated → CLI process closed → background task killed (`[killed]`), registry marks it `stopped` | Work silently lost; no completion notification; delegator never receives a result | Report + code above | High |
| BEH-002 | System | Same, AGY runtime: a `run_command` step still running at turn end | Same timer path → AGY `terminate` kills AGY and its background groups | Same loss | `agy-agent-run-backend.ts`, AGY docs | High (code); not reproduced live |
| BEH-003 | System | Shut-down copy receives a later same-root message | Chain restored with conversation; Claude CLI resume reports "Background shell command didn't finish before the previous session ended" (per report) | Agent learns only when someone happens to message it | Report, `agent_team_execution.md` wake-on-message | Medium (CLI text from report) |
| BEH-004 | System | Quiet delegated copy with no background work | Shut down after grace; woken by message | Resource release | Docs | High — preserved |
| BEH-005 | System | Background task finishes while the run is alive (Claude) | CLI starts a turn itself, `SYSTEM_TASK_NOTIFICATION` precedes it; agent continues and can report back | Works when the run is alive | `agent_execution.md` | High — preserved |
| BEH-006 | System | Codex / native AutoByteus runs with polled background processes | No completion-notification promise; not tracked as background tasks | Unchanged | Code | Medium |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `RootTaskExecutionLifecycle` | Arms/cancels grace timers from agent status; serialized shutdown | Must not shut down while background work runs | Re-arm trigger when a background task ends without a turn (AGY daemon exit; Claude completion always starts a turn) |
| `AgentRunTermination.tryPrepareIfQuiescent` | Quiet predicate | Needs a "no running background task" term (or an equivalent check before it) | Where the runtime-neutral signal lives (backend lifecycle snapshot vs. AgentRun-level background-task view) |
| `ClaudeBackgroundTaskRegistry`, `AgyBackgroundTaskMonitor` | Runtime owners of background task state | Already know which tasks are running | Expose a running-count/flag through `AgentRunBackend` |
| `BACKGROUND_TASK_UPDATED` | UI snapshot | Can carry the stop reason/summary for visibility | Whether a stop-reason summary is added |
| Team-level quiet check (`flat-team-execution-manager.ts` l.272) | Team copy quiet only if every member is quiet | Member background tasks keep the Team copy alive automatically if the agent-level check covers them | Confirm |

## Structural And Payload Surface Inventory

- Payload surfaces: `BACKGROUND_TASK_UPDATED` payload (`summary` field already exists); no persisted data.
- Structural surfaces: `AgentRunBackend` interface (`getLifecycleSnapshot`), `AgentRunTermination`, task-execution lifecycle/schedule, server settings.
- Potential structural impacts: lifecycle/concurrency change in idle shutdown (Medium); possibly a new server setting if a bound is approved; no API, persistence or security change expected.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| Delivery Engineer live observation (2026-10-08) | Claude delegated agent monitoring GitHub release runs with `run_in_background` | Killed ~10 min after turn end twice; monitored runs were still `in_progress` | Confirms BEH-001 at default grace | `problem-report.md`; task output files (mtimes above) |
| Code trace (this note) | Quiet check | No background-task term in any quiet predicate | Root cause confirmed | Source Log |

A shortened-grace automated reproduction is required by the Task (AC-001) and belongs to implementation/validation.

## Stakeholder And User Evidence

| Source | Need / Problem | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User, 2026-10-08 | Agent must keep working while its background work runs, so it can continue and report to its delegator | Explicit | REQ-001, REQ-002 | Bound? (DEC-002) |
| Delivery Engineer report | At minimum tell the agent if its task was killed | Report | REQ-003 | — |

## External Contracts, Standards, And Dependencies

| Contract | Version | Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Claude Agent SDK / CLI background tasks | SDK 0.3.280 | Background children die with the CLI process; resume cannot reattach them | `agent_execution.md`, report | "Survive shutdown" option is not feasible for Claude |
| AGY CLI | 1.2.13 | Daemons live while AGY lives; groups stopped on AGY stop | AGY docs | Daemons that never exit keep the run alive indefinitely without a bound |

## Persisted Data And State Facts

- No persisted data affected. Background task state is runtime-only and not persisted.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. UI change limited to the existing Background Tasks view text, if any.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `problem-report.md` | Delivery Engineer (copied) | Original report and evidence | All | BEH-001 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether a Claude `monitor` task (Monitor tool) is reachable in AutoByteus sessions (docs say Monitor is not enabled) | Scope of "background task" kinds | Architecture | Open |
| RSK-001 | Risk | Without a bound, a stuck or never-ending background task (AGY dev-server daemon, an infinite loop) keeps a delegated copy and its CLI process alive until Task DONE, root stop or server stop | Resource use | DEC-002 (user) | Open |
| RSK-002 | Risk | AGY daemon exit does not start a turn, so the idle timer must be re-armed when the last background task ends | Otherwise the copy never shuts down after its work ends | Architecture | Open |
| UNK-002 | Unknown | Exact CLI text the agent sees on resume after a kill | Wording of REQ-003 notice | Architecture/validation | Open |

## Is Idle Shutdown Still Needed? (user question 2026-10-08)

User: "do you know what is the reason of having this idle there? do we still need it? earlier we design it because we do not know how to release the resource … now people manage via task. when task is done, the resources are released. please check"

| Date | Source | Finding |
| --- | --- | --- |
| 2026-10-08 | `tickets/done/task-delegation-resource-lifecycle/requirements-doc.md` (approved 2026-09-29) | Idle shutdown was introduced when `delegate_task` became a pure spawn and task records were deleted: "Children are managed as resources, not tasks: a quiet child is shut down after a grace period". REQ-004 rationale: **"Prevent leaked children"**. DEC-001 set the 10 min grace. At that time nothing else could release a child except root stop. |
| 2026-10-08 | `tickets/done/project-task-manager-linked-delegation/requirements-doc.md` BEH-007, AC-007, REQ-006 | Task DONE then became an explicit release: it stops the assigned Agent/Team, its members, brought-in helpers and task-owned sub-delegations "without the idle grace delay". At that point idle shutdown was kept for "unrelated/unlinked work" (delegations without a Task). |
| 2026-10-08 | Commit `a2a7b37bc` (2026-10-06) "make @ delegate and every delegated copy closable" | A description-only `delegate_task` from an unowned sender now creates a Task with no Project and returns its `task_id`; `@` mentions steer to `delegate_task`. **Since 2026-10-06 every new delegated copy is owned by a Task and can be released with DONE.** Code: `root-task-execution-lifecycle.ts` `delegate()` (`adHocTask` join); helpers via `ensureTaskHelper` require a Task-owned sender. |
| 2026-10-08 | `compositions/build-studio-server.ts` l.191–232, `standalone-application-host/start-standalone-application-host.ts` l.232–284 | The Task side (`TaskAgentResourcePort`) is composed for the studio server and the standalone application host. |
| 2026-10-08 | `docs/modules/agent_team_execution.md` "Root reopen", "Root stop" | Root stop stops every live child; after a server restart no child is live ("every recorded child starts shut down") until a message wakes it. |

What idle shutdown still covers today:
- A Task still open but its worker waiting (the delegator has not marked DONE yet, or forgets to): the worker's runtime process stays alive until DONE, root stop or server stop if idle shutdown is removed.
- Copies created before 2026-10-06 that have no owning Task (legacy runs): they start shut down after a restart and stay live after a wake until root stop.
- Resource cost of an idle live child: one runtime process per Agent (Claude CLI, Codex app-server thread, AGY process) — not measured here.

What idle shutdown breaks:
- Background-task waits (this ticket, BEH-001/002).
- Every wake after shutdown is a restore (resume of the provider session), which costs time and is a source of restore bugs.

Things that must stay even without idle shutdown: the wake/restore path (needed after a server restart and for DONE reactivation), DONE release, root stop.

Touch points if idle shutdown is removed (`grep -rln "IDLE_SHUTDOWN_GRACE|idleShutdown|tryShutDown.*IfQuiet|TaskExecutionIdleShutdownSchedule"`): `task-execution-idle-shutdown-schedule.ts`, `root-task-execution-lifecycle.ts`, the three root adapters (team, org, standalone), task agent/team registries, `flat-team-execution-manager.ts`, `team-run*.ts`, `root-agent-execution-registry.ts`, `root-team-execution-directory.ts`, `config/task-execution-idle-shutdown-setting.ts`, `services/server-settings-service.ts`, docs (`agent_team_execution.md`, `codex_integration.md`), ~10 unit/integration/E2E tests.

## Architecture Investigation Findings

Authorities read (design reading gate, 2026-10-08): `references/architecture-design.md`, `design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–2 (settings value only). No closer `DESIGN*.md` applies.

Command: `grep -rn "IfQuiescent|IfQuiet|tryQuiesceIfAlreadyQuiescent|TaskExecutionIdleShutdownSchedule|idleShutdown|resolveTaskExecutionIdleShutdownGraceMs|beginTaskExecutionEventRetirement|AgentOrgTaskEventRetirement|\"shutdown\"" src`, plus follow-up greps for `taskExecutionIdleShutdown`, `publishAgentOffline`, `unregisterTerminated`, `TaskExecutionTeardownIndeterminateError`, `shuttingDown`, `acquireLiveLease|withLiveLease`.

| ID | Path | Finding | Classification |
| --- | --- | --- | --- |
| AF-01 | `agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.ts` | Grace timers per task execution | Idle-only |
| AF-02 | `root-task-execution-lifecycle.ts` | `schedule`, `onGraceElapsed`, `shutdownAtHead`, `armLive`, the `leases` counter (read only by `shutdownAtHead`), `gracePeriodMs`/`timers` options. `onAgentStatus` also forwards status to the Task side (`taskExecutionsStatusChanged`) — that part stays. `acquireLiveLease`/`withLiveLease` restore the chain at the queue head before delivery — restore stays; the lease counting/re-arm is idle-only | Mixed |
| AF-03 | `root-task-execution-command-queue.ts` | Command kind `"shutdown"` | Idle-only kind |
| AF-04 | `root-task-execution-adapter.ts` | `tryShutDownIfQuiet` in the adapter interface; doc of `taskExecutionChainFor` says "for idle shutdown and restore" | Idle-only member |
| AF-05 | `team-task-execution-adapter.ts` l.243–265; `agent-org-task-execution-adapter.ts` l.303–333 (+ `beginTaskExecutionEventRetirement`, `publishAgentOffline`, `enterLifecycleFailStop` use there); `standalone-root-task-execution-adapter.ts` l.297–325 | Three adapter implementations of quiet shutdown + offline publishing after it | Idle-only |
| AF-06 | `agent-org-execution/services/agent-org-task-event-retirement.ts`; `agent-org-run.ts` l.74, 89, 108, 271 | Suppresses teardown status events during quiet shutdown; only `begin` caller is the idle path | Idle-only |
| AF-07 | `root-agent-execution-registry.ts` `tryShutDownTaskIfQuiet` + `shuttingDown`; `root-team-execution-directory.ts` `tryShutDownRootTaskTeamIfQuiet` + `shuttingDown` + `unregisterTerminated`; `team-run-resolver.ts` `unregisterTerminated` (reactivation uses `retireTerminated` instead) | Idle-only |
| AF-08 | `task-agent-execution-registry.ts` `tryShutDownIfQuiet` + `shuttingDown`; `task-team-execution-registry.ts` `tryShutDownIfQuiet` + `shuttingDown`; `flat-team-execution-manager.ts` `tryShutDownDirectTaskExecutionIfQuiet`, `tryPrepareTerminationIfQuiescent`, `cancelDeferredPreparation` (the `quiescing` state is also used by normal `prepareTerminationOnce` and stays); `flat-team-run-backend.ts`, `team-run-backend.ts`, `team-run.ts` pass-throughs | Idle-only |
| AF-09 | `configured-agent-execution-handle.ts` l.240; `flat-team-agent-execution-handle.ts` l.92; `agent-run-manager.ts` l.205 `tryPrepareAgentRunTerminationIfQuiescent`; `agent-run.ts` l.253; `agent-run-termination.ts` `tryPrepareIfQuiescent` + `tryingQuiescent` (also referenced inside `prepare()`); `agent-run-input-admission-state.ts` `tryQuiesceIfAlreadyQuiescent` | The only callers of the "if quiescent" chain are AF-07/AF-08 | Idle-only |
| AF-10 | `task-delegation-command.ts` `TaskExecutionTeardownIndeterminateError` | Thrown only by AF-07 quiet paths; caught only by AF-05 | Idle-only |
| AF-11 | `config/task-execution-idle-shutdown-setting.ts`; `services/server-settings-service.ts` l.32–35, 180–187 | Setting + predefined registration | Idle-only |
| AF-12 | Option plumbing `idleShutdown` / `taskExecutionIdleShutdown`: `team-task-execution-service-contract.ts` l.38, `team-task-execution-service.ts` l.21, `root-team-run.ts` l.104/141, `agent-org-run-options.ts` l.32, `agent-org-run.ts` l.120, `standalone-agent-run-root.ts` l.104/155 | Test/timer injection for idle shutdown | Idle-only |
| AF-13 | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` l.129–131 | LLM-facing text: "A copy that stays quiet is shut down after a while; a message to its run ID restores it with its conversation." Other "shut-down delegated agent" phrases remain true (after a restart) | Must change |
| AF-14 | `task-execution-running-work.ts` comment "so an errored child neither blocks root open work nor avoids shutdown" | Open-work predicate stays; comment changes | Comment |
| AF-15 | `server-settings-service.ts` l.226–249 | A stored key that is no longer predefined is listed as a custom setting (editable, deletable) and has no reader | Stale value directly usable |
| AF-16 | Non-live copies still arise without idle shutdown: root reopen/server restart (no handles), DONE release then reactivation. Restore path (`assertRestorableChain`, `restoreChain`, wake command) and `isLive` remain needed | Preserved |
| AF-17 | Tests touching idle shutdown: `tests/unit/agent-collaboration/{root-task-execution-lifecycle,root-task-reactivation,task-agent-resource-dispatch,task-agent-resource-quiet-generation,task-execution-status,task-reactivation-backends}.test.ts`, `tests/unit/agent-org-execution/{agent-org-task-idle-shutdown,agent-org-task-shutdown-event-retirement}.test.ts`, `tests/unit/agent-team-execution/{task-agent-execution-registry-liveness,team-run}.test.ts`, `tests/integration/agent-team-execution/{mixed-team-run-backend,task-delegation-tool-lifecycle}.integration.test.ts`, `tests/fixtures/task-release-generation-fixtures.ts`, `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` (uses `GRACE_MS = 60_000`) | Rewrite/delete |
| AF-18 | Docs: server `docs/modules/agent_team_execution.md` (Liveness, Idle shutdown, Grace period, Wake-on-message, Open work, Root stop, file list l.830), `agent_orgs.md` l.292/409/415, `agent_tools.md` l.314, `codex_integration.md` l.633–642; web `docs/agent_teams.md` l.124/182, `docs/agent_orgs.md`, `docs/settings.md` l.518/609 | Docs sync |

## Requirement Implications

- Root cause is confirmed: the quiet predicate ignores live runtime background tasks; Claude and AGY are affected; Codex/native/ACP have no notification promise and no tracked background tasks.
- "Survive shutdown and restore" is not feasible for Claude (tasks are CLI children; resume cannot reattach), so it is recorded as rejected.
- The user's direction makes "do not shut down while background work runs" the primary requirement; the notice on kill remains for any shutdown that still stops background tasks (bound, if approved; root stop and Task DONE are explicit actions and unchanged).

## Notes For Architecture Design

- Map SCN-001..SCN-004. Keep the single liveness/quiet authority; add the background-task condition there rather than in a parallel timer.
- Verify Team copies inherit the behavior through member quiet checks.
- Test hook: `RootTaskExecutionLifecycle` already accepts `gracePeriodMs` and `timers` options.
