# Investigation Notes — managed Ubuntu restarts as soon as ready, like Mac (autobyteus-16)

## Investigation Meta

- Package identifier: `managed-ubuntu-immediate-restart` (Project Task autobyteus-16)
- Request / ticket: autobyteus-16 "Make managed Ubuntu automatic updates restart as soon as ready, like Mac", Project `project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda`
- Workspace root: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-immediate-restart`
- Repository mode: `Git`
- Task worktree / branch: path above, `feature/managed-ubuntu-immediate-restart`
- Resolved base: `origin/personal` at `9514a05a0e2d9546d3db018d8842eb0ba1ea6d6c` (fetched 2026-11-21; contains the autobyteus-15 merge `470aab6dd5`)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; ticket folder `tickets/in-progress/managed-ubuntu-immediate-restart/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (2026-11-21, this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; design phase: `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, repository `DESIGN.md`, `autobyteus-web/AGENTS.md`
- Investigation status: complete

## Initial Request And Clarifications

- Request: the Task above (user's direction of 2026-11-21): managed Ubuntu with Update automatically on installs and reopens as soon as the verified update is ready, as on Mac; busy runs get the existing restart notice afterwards and continue. Remove the busy-agent and 5-minute input waits. Keep everything else from autobyteus-15. Copy without waiting language, Mac wording where it applies. Verify on a disposable managed Ubuntu guest. No release, no change to the user's installation.
- User comment: "no specific reason for Ubuntu to differ, so follow Mac's approach."
- Ambiguity: what the downloaded row shows between readiness and the restart (DEC-002).

## Source Log

| ID | Source | Observation | Established |
| --- | --- | --- | --- |
| F-01 | `git diff --stat 470aab6dd5^1 470aab6dd5` | autobyteus-15 added: `electron/updater/safeRestartMoment.ts`, `electron/application/userInputActivity.ts`, `electron/server/embeddedBusyRuns.ts`, wait wiring in `composeManagedUpdates.ts` / `electronApplication.ts:88`, server `api/rest/busy-runs.ts`, `compositions/busy-run-count-composition.ts`, `inspectBusyAgentRuns` / `finalizeBusyRuns` in `agent-execution/services/busy-runs.ts`, application-scope `inspectBusyAgentRuns` / `finalizeBusyAgentRuns` and contract `inspectBusy` / `finalizeBusy`, unit test `busy-run-count.test.ts`, an e2e case for `/rest/busy-runs`, copy keys `readyToRestart`, `auto.explain(On).managedRestartApp`, GLOSSARY "Safe restart moment" | Read |
| F-02 | `electron/application/managedUpdateSession.ts` (current) | `watchForRestart()` arms `restartMoment.watch` when `eligible()` (same stage/generation, restart channel, no intent, no latched Quit, switch on, channel matches, not blocked); the callback re-checks `eligible()` then `finish(stage, generation, { consent: 'automatic', ending: 'reopen' })`. Quit latch (`before-quit`), settlement and failure handling are independent of the wait | Read |
| F-03 | `agent-execution/services/busy-runs.ts`; `restart-resume/busy-run-recorder.ts` | The recorder uses `busyStatusOf` and `inspectBackgroundWork(…, "snapshot")`; `inspectBusyAgentRuns`, `finalizeBusyRuns`, `BusyRunCount`, `BUSY_RUN_OBSERVATION_BUDGET_MS` and the `"all"` source serve only the busy count | Read (grep of callers) |
| F-04 | `tickets/done/automatic-app-node-updates` REQ-002, AC-002, AC-003, DEC-001 | Mac/native: install and restart as soon as the download is done, also on a busy machine; busy agents resume after the restart (285 path) | Read |
| F-05 | `autobyteus-server-ts/src/restart-resume/restart-cause.ts`, `release-identity.ts`; `scripts/write-release-identity.mjs`; `package.json` `build:full` | An entry is an `update` when its recorded release differs from the server's stamp `dist/release-identity.json`, written by `build:full` from `autobyteus-web/package.json` for every packaged server (platform-independent). Graceful stop records busy runs (`server-runtime.ts:216`); the managed restart stops the server through the same `ApplicationShutdown` | Read; to be shown on the guest (AC-002) |
| F-06 | `docs/modules/restart_resume.md:14` | Application-owned and system-owned runs recover by their own means, not the restart reminder — same coverage as Mac | Read |
| F-07 | `localization/messages/en/updateNotifications.ts:29-31,90-91` | Mac switch copy: "Install new versions on your channel as soon as they are downloaded. The app restarts by itself." / "New versions on your channel install as soon as they are downloaded, and the app restarts by itself. Switch off to update by hand." | Read |
| F-08 | `electron/updater/appUpdater.ts:304-313,508-515` | The click path sets `installing` when the session accepts; the automatic path shows `installing` only at `activating` (after the server stop) | Read |
| F-09 | `wc -l` | `appUpdater.ts` 555 lines (over the limit, pre-existing); `electronApplication.ts` 492 | Measured |

## Relevant Existing Behavior

| ID | Behavior | Evidence |
| --- | --- | --- |
| BEH-001 | Managed, switch on, verified stage: waits for no busy run and 5 minutes without input, then installs and reopens | F-01, F-02 |
| BEH-002 | Busy collaboration runs at a graceful stop are recorded and, after an update, woken with the restart notice | F-05 |
| BEH-003 | Quit latch, failures, click, opt-out, channel, blocked version, copy for `managed-quit` | autobyteus-15 |
| BEH-004 | Mac/Windows/portable: install at once | F-04 |

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Assumption | The managed AppImage's server carries the release stamp, so a managed N→N+1 restart marks busy runs `update` | Read (F-05); proven on the guest (AC-002) | Open |
| RSK-001 | Risk | A restart now interrupts a user typing a message (unsent text is not saved) and application-owned runs (no reminder) | Same as Mac; accepted by the user's direction | Accepted |

## Architecture Investigation Findings

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| A-F01 | F-02 | All admission checks already live in `eligible()`; only the wait sits between it and `finish` | Replace the watch with an immediate admission on the same check |
| A-F02 | F-03 | Removing the count leaves `busyStatusOf` and the snapshot inspection with one consumer (the recorder) | Keep them in `busy-runs.ts`; drop the `"all"` source and the count functions |
| A-F03 | F-08 | Without the wait the stop starts right after readiness; the row would read "Downloaded" until `activating` | Session emits `restarting` at admission; `AppUpdater` shows `installing`, as the click and Mac do |

## Notes For Architecture Design

Design is in `design-spec.md` (same SR).
