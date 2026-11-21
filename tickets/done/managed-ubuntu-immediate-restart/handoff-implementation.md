# Handoff — Architecture Design Complete (autobyteus-16, SR-002), direct implementation

- Package `managed-ubuntu-immediate-restart`; Project Task autobyteus-16, Project `project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda`; requested by `/project_task_manager` on the user's direction of 2026-11-21.
- Classification: Architecture Design Complete; task_size `Medium`; architectural_risk `Low` → handoff rule 2, `/implementation_engineer` (no independent architecture review).
- Worktree `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-immediate-restart`, branch `feature/managed-ubuntu-immediate-restart`, base `origin/personal` `9514a05a0e` (contains autobyteus-15 merge `470aab6dd5`). Finalization target `origin/personal`. No release; never the user's installation.
- Ticket folder: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-immediate-restart/tickets/in-progress/managed-ubuntu-immediate-restart/`

## Request (user's direction)

Managed Ubuntu with Update automatically on: install and reopen as soon as the verified update is ready, as on Mac; busy runs get the existing restart notice afterwards and continue. Remove the busy-agent and 5-minute input waits. Mac/Windows/portable unchanged. Keep everything else from autobyteus-15. Copy (en, zh-CN) without waiting language, Mac's wording where it applies. Verify on a disposable managed Ubuntu guest: reopens on N+1 with no click while an agent is busy; that agent gets the restart notice; Quit stays closed. Merge, verify, clean up; no release.

## Approval

Requirements SR-001 approved by the Solution Designer within the user's direction, user informed 2026-11-21. Design approval not required.

## Work

`design-spec.md`: immediate admission at autobyteus-15's existing `eligible()` checks with a new `restarting` event (→ `installing`); remove the safe-moment wait, input activity, busy query, `/rest/busy-runs`, the count functions and application contract methods, the waiting copy and their tests (Removal plan); Mac's switch keys for `managed-restart`; docs and glossary. Keep the Quit latch, `finish` settlement, failures, click, opt-out, `managed-quit` untouched. `appUpdater.ts` must not grow.

## Risk

ASM-001: the managed AppImage's server carries the release stamp so the notice says "update" (read-established; proven by AC-002 on the guest).

## Files

`requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `follow-ups.md` (empty).

## Expected next action

Implementation, then the team's normal validation route.
