# Handoff — Architecture Design Complete (autobyteus-15, SR-002)

- Package: `managed-ubuntu-auto-restart`; Project Task autobyteus-15, Project `project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda`; requested by `/project_task_manager` on the user's clarification of 2026-11-21.
- Classification: `Architecture Design Complete`; task_size `Medium`; architectural_risk `High`.
- Route (handoff rules, 2026-11-21): rule 1, task_size=Large or architectural_risk=High → `/architecture_reviewer`.
- Worktree: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-auto-restart`, branch `feature/managed-ubuntu-auto-restart`, base `origin/personal` at `7591aa307fac13c7ca8d2bdf8059054e22cf597a`; ticket documents committed on the branch (see `git log -1`). Finalization target `origin/personal`. No release; never the user's installation.
- Ticket folder: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-auto-restart/tickets/in-progress/managed-ubuntu-auto-restart/`

## Original request

Task description: "choosing Update automatically is consent to download, install and reopen the updated managed Ubuntu desktop without clicking Install and restart or quitting first. Today beta.3 offers beta.4 as ready for next quit. Deliver that unattended behavior when safe without interrupting active work; do not reopen after an intentional user Quit, change opt-out behavior, or weaken signing and sandbox checks. Align notification copy with behavior. Solution Designer to determine safe timing and handling of failures. Verify a signed update with the old and new app versions observed on managed Ubuntu, including deferral during work and subsequent no-click relaunch. Merge, verify and clean up; no release or alteration of the user's installation."
User comment: "make the behavior consistent. Use existing Mac automatic install/restart as the user-facing reference; change managed Ubuntu rather than removing Mac functionality. Verify no second click is needed after deferral, and that an intentional Quit still stays closed."

## Approval basis

Requirements SR-001 approved by the Solution Designer within the direction (the Task delegates safe timing and failure handling; no `Needs user` decision); user informed in this run on 2026-11-21. No supplements. Design approval by the user not required.

## What the solution does

- Managed Ubuntu, switch on, launched by the launcher: a verified stage installs through the existing restart path and the app reopens by itself at a **safe restart moment**: no busy run on the app's own node (mid-turn or with a running background task, process and application runs) and no in-app input for 5 minutes. No upper bound; Quit still installs and stays closed; the click still works; switch off/channel change cancels (REQ-001..REQ-006).
- Failures follow Mac's contract: refused/confirmed-old reopens the old version with "Automatic update failed. Nothing was changed.", not retried automatically; unknown outcome keeps today's no-second-server rule; no restart channel → `managed-quit` mode, waits for quit (REQ-003, DEC-004, DEC-007).
- Design (`design-spec.md`): `ManagedUpdateSession` keeps all managed authority; `finish`'s overloaded `automatic` boolean is split into `consent` and `ending`; Quit during a restart in progress ends closed; new `SafeRestartMoment` (timing loop), `UserInputActivity` (in-app input), `fetchBusyRunCount` (own-node HTTP with launch credential); server busy rule extracted from the restart recorder into `agent-execution/services/busy-runs.ts`, application scope `countBusy`, new `GET /rest/busy-runs`; `activationMode` gains `managed-restart`; copy in en/zh-CN; managed composition moves out of the 500-line composition root.

## Points for review attention

- DS-001 re-checks in the safe callback and the arming/cancel list (Guidance For Implementation).
- DS-003 Quit during restart (also applies to a click-started restart; Quit wins).
- Server route under NA-2 without a permission row (A-F06).
- ASM-001 (input events on Ubuntu Wayland) is left to validation in the guest; the busy check protects agent work regardless.

## Open risks and follow-ups

- RSK-001 long agent work defers indefinitely (accepted, DEC-002).
- FU-001 (not urgent, not yet sent): whether Mac/Windows/portable should also wait for a safe moment; sent when the ticket leaves the team.

## Files

- `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `follow-ups.md` (this folder).

## Expected next action

Independent architecture review of SR-002. Requirement or design findings return to the Solution Designer.
