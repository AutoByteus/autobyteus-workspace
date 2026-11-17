# Handoff Summary

## Summary Meta

- Ticket: `background-task-restart-notice` (Project Task `autobyteus-448`, merged with autobyteus-481; Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Scope: the whole ticket. Part 1 (UC-001, AC-001..AC-004) was delivered in DR-001 (`895cf3992d`). Part 2 (UC-002, AC-005..AC-006) is delivered in DR-004, after DR-002 and DR-003 were blocked at the base refresh.
- Date: `2026-11-18`
- Classification:
  - Part 1: `task_size: Medium`, `architectural_risk: High`.
  - Part 2: `task_size: Large`, `architectural_risk: High`.
  - Route for both: architecture review → implementation → code review → API/E2E → test-code review → delivery.
  - Part 2 rounds:
    - CRR-005 Fail (CR-002), then CRR-006 Pass.
    - API-REV-003 Pass.
    - CRR-007 Pass.
    - DR-002 base conflicts → IR-005, CRR-008, API-REV-004 Pass (94%), CRR-009.
    - DR-003 probe ID collision → IR-006, CRR-010.
- Current Status: `Verified from evidence / finalized on personal; no release; ticket archived`
- Branch: `codex/background-task-restart-notice`.
  - Part 2 base `895cf3992d`.
  - Integrated by merge three times: `990ff9a3d4` (IR-005, `ff13782f36`), `e93d477539` (delivery, autobyteus-522) and `96216eb642` (delivery, autobyteus-524 @ `c0869d58e9`).
  - Product code final at `d7fdd7db6f` (test rename) on top of `a9e5676630`.

## Delivery Summary

- Part 1, the restart reminder (finalized in DR-001): after a restart, each run that was mid-turn or idle with a running background task gets one reminder with the time (UTC) and cause. Its background-task line depends on the cause:
  - update or restart: "the restart stopped them";
  - unexpected stop: "some may still be running … no longer tracked".
  - After an update the run is woken with it; otherwise it comes with the next input. It is delivered exactly once.
- Part 2, the status shown:
  - Every agent status carries the run's running background task count (`background_tasks_running`), derived once from the runtime's background-task view.
  - All five status routes carry it: agent stream, team stream, run-status feed (summed for Team and Org run states), peer summary, and the Org view.
  - Desktop and phone lists, headers and the phone Settings screen show an idle agent with tasks as "Background task running" / "N background tasks running" (zh-CN "后台任务运行中" / "N 个后台任务运行中"), with a steady blue dot and no Stop. A Team ranks busy > background > error > idle > offline.
  - Messages are still delivered at once.
  - `AgentRunBackend.hasRunningBackgroundTasks()` is removed from the contract and all six backends.
  - Codex shows Idle by design.
- Docs (part 2):
  - From implementation: server `agent_execution`, `antigravity_cli_runtime`, `restart_resume`, `remote_collaboration`, the streaming protocol design doc, web `agent_execution_architecture.md`.
  - At delivery: the stale `can_interrupt` descriptions in web `agent_execution_architecture.md` (FU-006), `agent_integration_minimal_bridge.md`, server `codex_raw_event_mapping.md` and `agent_execution.md`; the glossary entry "Background task running" (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery; no user check needed. AC-005 and AC-006 are directly proven on the merged build (`release-deployment-report.md`, Verification):
  - BTS-01: a message delivered after 24–25 ms while a task runs.
  - BTS-06: autobyteus-483's three end paths beside the count.
  - MSP-73 / IMP-21: the phone run screen and the Settings screen "Background task running", blue dot; nine phone cases pass next to autobyteus-522's.
  - P2-10: the real desktop app with a real model shows "2 background tasks running" in English and zh-CN.
- Final confidence: 94%, no category below 90%. The 95% gaps are:
  - a Team member in error and the Org view's status, proven at unit level;
  - ACP and Linux not run.
  - Delivery checked that the Org route reads the same snapshots and presentation frames as the live-proven Team route.
- Integrated state:
  - DEL-R2: web and server typechecks, phone-run web specs 50/50.
  - DEL-R3: three typechecks, autobyteus-ts terminal suites 197/197.
- Secret Gate PASS on the ticket commits and the merged state; artifact hygiene PASS.

## Residual Risks For The User

- FU-002 (part 1): after a restart the reminder card shows twice in the web conversation and the first-turn reply is hidden (pre-existing turn-id reuse).
- FU-004 (part 1): after a crash, native background commands keep running untracked. The agent is told.
- A Team member in error with background tasks, and the Org view's status: unit level only.
- ACP (Grok Build, DeepSeek) live and a Linux desktop: not tested.
- Codex agents show "Idle" while their background terminals run (by design: Codex's view is a snapshot).
- `agent-run.ts` is at the 500 non-empty line limit.
- The reminder's time reads `2026-11-17 12:10 UTC`; the user's DEC-003 sample showed `22:20`.

## Follow-ups

- `follow-ups.md`:
  - FU-001: flaky watcher test.
  - FU-002: duplicate reminder card.
  - FU-004: crash orphans.
  - FU-005: resolved in this ticket.
  - FU-006: resolved by delivery's docs sync.
  - FU-007: unused running-panel components.
  - FU-008: three browser probe fixtures.
  - FU-009: stale runtime-list E2E and the shutdown budget under load.
- Also relevant: autobyteus-338's FU-001, the stale `autobyteus-web/docs/settings.md` duplicate. It still repeats the old `can_interrupt` text.

## Release

- No release: the user did not ask for one, and that is RELEASE.md's default. `release-notes.md` holds the user-facing notes for both parts.
