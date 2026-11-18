# Docs Sync Report

This report covers both deliveries of the ticket. Part 2 (DR-004) comes first; part 1 (DR-001) follows unchanged below.

# Part 2 — the status shown (DR-004)

## Scope

- Ticket: `background-task-restart-notice` (Project Task `autobyteus-448`), **part 2: an agent with a running background task is shown as such (UC-002, AC-005, AC-006)**. `task_size: Large`, `architectural_risk: High`.
- Trigger: code reviewer handoff after CRR-010 (IR-006), 2026-11-18. It follows DR-002 (the base conflicts, resolved by IR-005) and DR-003 (the probe case ID collision, resolved by IR-006).
- Bootstrap base reference for part 2: `origin/personal` @ `895cf3992d` (part 1's record).
- Integrated base reference used for docs sync: `origin/personal` @ `c0869d58e9`, merged as `96216eb642`. It contains autobyteus-483, 458, 515, 522 and 524.
- Post-integration verification reference: `evidence/DEL-R3-post-integration/` (`release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the change already documents the count on every status route: server `agent_execution`, `antigravity_cli_runtime`, `restart_resume`, `remote_collaboration`, the streaming protocol design doc, and the web `agent_execution_architecture.md`. Delivery confirmed those against the merged code. It also corrected the `AGENT_STATUS` payload and Stop-button descriptions that still named the removed `can_interrupt` (FU-006, widened), and added the new status to the glossary.
- Why this should live in long-lived project docs: the status payload and what decides the Stop button are the contract every client of the run streams builds on, and "Background task running" is a user-facing term.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | the count from the background-task view; 483's end text merged beside it (IR-005); `AgentRunBackend.hasRunningBackgroundTasks()` gone | Updated | the command overlay `AGENT_STATUS { status: "initializing" }` no longer names `can_interrupt` |
| `autobyteus-server-ts/docs/modules/restart_resume.md`, `antigravity_cli_runtime.md`, `remote_collaboration.md` | count sources, the peer summary (`backgroundTasksRunning` required) | No change (updated by implementation) | `AgentRun.hasRunningBackgroundTasks()` still exists (`agent-run.ts` line 196, used by `busy-run-recorder.ts`) |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | run-status feed entry carries the count | No change (updated by implementation) | — |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | the Codex `AGENT_STATUS` projection | Updated | payload is `{ status, background_tasks_running }` (0 for Codex, BTS-05); `can_interrupt` removed from the text and three mapping rows |
| `autobyteus-web/docs/agent_execution_architecture.md` | the status payload, the mapping to text and dot, the Team rule (implementation); the frontend lifecycle model | Updated | FU-006: the Stop button comes from the status word (`resolveAgentPrimaryAction`), not `can_interrupt`. Six other mentions in the same sections and the `AGENT_STATUS` table row were fixed as well |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | the `AGENT_STATUS` payload for integrators | Updated | payload now has `background_tasks_running`, not `can_interrupt`; the Stop guidance follows the status word, and a running background task does not grant Stop |
| `autobyteus-web/docs/settings.md` | repeats the old lifecycle text | Needs follow-up | the stale duplicate of `agent_execution_architecture.md`, already recorded as FU-001 of autobyteus-338; not edited here |
| `GLOSSARY.md` | the new user-facing status | Updated | entry "Background task running" |
| `DESIGN.md`, `TESTING.md`, `RELEASE.md` | project documents (changed on the base by other tickets) | No change | no ticket report recorded a discrepancy. One possible rule for TESTING.md is not added here: start a probe once after a base merge to run its duplicate-ID check (DR-003). The check already exists, and the stage that merges can run it |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | correction (FU-006) | Stop button from `AGENT_STATUS.status` via `resolveAgentPrimaryAction`; history and recovery rules in status words; table row names `background_tasks_running` | `can_interrupt` is in no server, web or contract source |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | correction | payload shape, Stop guidance, core types, troubleshooting | same, and the payload gained the count |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | correction | Codex status projection and three rows | same |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | correction | command overlay payload | same |
| `GLOSSARY.md` | new term | "Background task running" | DEC-004 wording, the Team rule, Codex 0 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `AgentRunBackend.hasRunningBackgroundTasks()` in the contract and six backends | the run's count, `runningBackgroundTaskCount` over the background-task view, read by `AgentRun` | server `agent_execution.md` |
| `can_interrupt` in `AGENT_STATUS` (removed earlier; docs stale) | the status word decides Stop | web `agent_execution_architecture.md`, `agent_integration_minimal_bridge.md` |
| `remoteTaskExecutionSummaryDtoSchema` (FU-005, removed in CR-002) | the peer channel's `RemoteRunSummary` | `remote_collaboration.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket, finalize per `RELEASE.md`, clean up the worktree.

# Part 1 — the restart reminder (DR-001)

## Scope

- Ticket: `background-task-restart-notice` (Project Task `autobyteus-448`, merged with autobyteus-481), **part 1: the restart reminder (UC-001)**. Part 2 (UC-002, the status shown) follows in this ticket as a later round (DEC-007). `task_size: Medium`, `architectural_risk: High`, route: architecture review (ARCH-REV-002/003) → implementation (IR-001, IR-002) → code review (CRR-001, CRR-002 failure origin, CRR-003) → API/E2E (API-REV-001 Fail F-1, API-REV-002 Pass) → test-code review (CRR-004) → delivery.
- Trigger: code reviewer handoff "part 1 ready for delivery" after CRR-004, 2026-11-17.
- Bootstrap base reference: `origin/personal` @ `4cbf9e7881`.
- Integrated base reference used for docs sync: `origin/personal` @ `4cbf9e7881` (the branch was already current; no new base commits).
- Post-integration verification reference: not rerun. The validated state is the current base (`release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the change already updated the restart-resume module doc, two execution docs, the module README and the glossary. Delivery confirmed them against the final code, including the DEC-008 wording, and fixed one sentence from autobyteus-338 that DEC-008 proved wrong.
- Why this should live in long-lived project docs: what a run is told after a restart, and what becomes of its background commands after a graceful stop versus a crash, is standing behavior that later runtime, restart and part 2 work builds on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | owner doc: live busy-run record (`busy-runs.json` shape, `shutdownAt`), causes, reminder text, delivery once | No change (updated by implementation) | both background-task lines match `restart-notice.ts` (`STOPPED_BACKGROUND_LINE`, `UNEXPECTED_STOP_BACKGROUND_LINE`); reason strings match RR-01/02/03 |
| `GLOSSARY.md` | restart reminder, busy run | No change (updated by implementation) | names the DEC-008 "no longer tracked" case |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | notice order; autobyteus-338's native background tasks section | Updated | its "After an app restart the commands are gone" was true only for a graceful stop: after a crash they keep running untracked (RR-02 `stillRunningWhenReminded`, RR-09; FU-004) |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `README.md` | restart reminder references | No change (updated by implementation) | — |
| `autobyteus-ts/docs/terminal_tools.md` | owned command lifetime | No change | already says crashes and power loss are outside the stop guarantee |
| `DESIGN.md` | project design rules | No change | the change follows rule 10 (`busy-runs.json` kept with a widened meaning), as the code review records |
| `TESTING.md` | testing guideline | No change | the new gated suite follows the `RUN_<GATE>=1` pattern and the test vault rule; no ticket report recorded a discrepancy |
| `RELEASE.md` | release guide | No change | finalization followed it without deviation |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | correction | an update or restart stops native commands at the graceful stop; after an unexpected stop they may keep running untracked; either way the restart reminder tells the run (link to Restart Resume) | DEC-008 and RR-02/RR-09 evidence |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| restart reminder | which runs are recorded (mid-turn, or idle with a running background task), the three causes, the cause-specific background-task line, wake after an update vs riding the next input, exactly once | `design-spec.md` (SR-004), `requirements-doc.md` DEC-003/DEC-008 | `restart_resume.md`, `GLOSSARY.md` (implementation) |
| commands after a crash | not stopped by anything; the agent is told to check with `ps` | DEC-008, FU-004 | `restart_resume.md`, `agent_execution.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `busy-runs.json` written only at shutdown for mid-turn runs, resumed only after an update | a live record rewritten as the list changes, marked `shutdownAt` at a graceful stop; reminders for every cause | `restart_resume.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, finalization of part 1 per `RELEASE.md`; the ticket stays open for part 2.
- Notes: follow-ups FU-001, FU-002 and FU-004 are recorded by earlier roles in `follow-ups.md`. Delivery adds none.
