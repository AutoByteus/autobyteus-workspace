# Docs Sync Report

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
