# Handoff Summary

## Summary Meta

- Ticket: `background-task-restart-notice` (Project Task `autobyteus-448`, merged with autobyteus-481; Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Scope of this handoff: **part 1, the restart reminder (UC-001, AC-001..AC-004)**. Part 2 (UC-002, AC-005/AC-006: the status shown) follows in this ticket as a later round (DEC-007). The ticket stays in `tickets/in-progress/` and its worktree and branch stay for part 2.
- Date: `2026-11-17`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: architecture review (ARCH-REV-002, ARCH-REV-003 for DEC-008), implementation (IR-001, IR-002), code review (CRR-001 Pass; CRR-002 failure origin: Requirement Gap F-1; CRR-003 Pass), API/E2E (API-REV-001 Fail F-1, API-REV-002 Pass, confidence 94%), test-code review (CRR-004 Pass).
- Current Status: `Part 1 verified from evidence / finalized on personal; no release`
- Branch: `codex/background-task-restart-notice`, base `origin/personal` @ `4cbf9e7881` at bootstrap and at delivery (no new base commits). Product code final at `b78555d7bb`. Finalized: `--no-ff` merge `e479be4539` pushed to `origin/personal`.

## Delivery Summary

- Delivered scope (part 1):
  - While the node runs, it keeps a live record (`busy-runs.json`) of runs that are mid-turn or idle with a running background task, rewritten when that list changes and marked `shutdownAt` at a graceful stop.
  - After a restart, each recorded run gets one restart reminder naming the time (`YYYY-MM-DD HH:MM UTC`) and cause: an update to vX, a restart, or an unexpected stop.
  - The background-task line depends on the cause. After an update or restart: "the restart stopped them". After an unexpected stop (DEC-008): "some may still be running … no longer tracked …", and the agent is told to check with `ps`.
  - After an update the run is woken with the reminder. Otherwise the reminder rides the run's next input. It is delivered exactly once either way; a closed Task or an archived root gets none.
  - Runtimes covered: AutoByteus, Claude and Antigravity whenever their idle runs have a background task; Codex at a graceful stop; ACP (Grok Build or DeepSeek) runs only when mid-turn.
- Docs: `autobyteus-server-ts/docs/modules/restart_resume.md`, `agent_execution.md`, `agent_team_execution.md`, module `README.md`, `GLOSSARY.md` (implementation); at delivery, `agent_execution.md`'s native background task section is corrected for crashes (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery; no user check needed. AC-001..AC-004 (part 1) are directly proven. The critical ones (AC-001, AC-002, AC-004) were opened in their evidence files (`release-deployment-report.md`, Verification).
- Final confidence is 94%, no category below 90%. The 1-point gap to the 95% target is FU-002, which the Solution Designer kept as a follow-up (SR-004).
- Key evidence:
  - `evidence/API-R2-restart-suite/RR-01..RR-09.json` (built server across real restarts, kills and updates; Claude, Codex and OpenAI live).
  - `evidence/API-15-desktop/02-after-restart-reminder.png` (real app: the agent checks with `run_bash` and answers "The nightly build was stopped by the restart … I can restart it if you want").
  - `evidence/API-12-before-base/` (before the change: no record, no reminder).
- Secret Gate PASS on the ticket commits and on the merged state; artifact hygiene PASS.

## Residual Risks For The User

- FU-002: in the web conversation view, the reminder card shows twice after a restart and the run's first-turn reply is hidden. A restored native run reuses `turn_0001`, which is pre-existing on base. The agent gets the reminder once.
- FU-004: after a crash, native background commands keep running untracked. Out of scope by the user's decision; the agent is now told.
- ACP (Grok Build or DeepSeek) live is not tested: `dsh` is not installed, and ACP reports no background tasks by construction.
- API-01: two watcher integration files failed for an environmental reason (`fseventsd` saturated). They are unrelated to this change (FU-001 is the same family).
- The time reads `2026-11-17 12:10 UTC`; the user's DEC-003 sample showed `22:20`. The full date in UTC is unambiguous for an agent; the wording is otherwise the user's.

## Follow-ups

- `follow-ups.md`: FU-001 (flaky watcher test), FU-002 (duplicate card), FU-004 (crash orphans). Delivery added none.

## Release

- No release: the user did not ask for one, and that is RELEASE.md's default. `release-notes.md` holds user-facing notes for part 1. Part 2 will add its own.
