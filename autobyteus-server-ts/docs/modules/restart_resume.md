# Restart Resume

## Scope

After any restart, every agent run that was mid-turn or waiting for a background task it started is told once, by a
**restart reminder**, that the application restarted, why, and what became of any background tasks it started: stopped
by an update or a restart, possibly still running and no longer tracked after an unexpected stop (autobyteus-448,
extending autobyteus-285).

- **Who is told.** Runs held by a collaboration root (standalone hosts and Team and Org members; a delegated run is one
  of these in its own root, autobyteus-461) that were `initializing` or `running`, or `idle` with a running background
  task (`AgentRun.hasRunningBackgroundTasks()`, from `runningBackgroundTaskCount` over its background-task view: AutoByteus, Claude and Antigravity report it; Codex is asked through its
  background-task view at a graceful stop only; Grok Build and DeepSeek (ACP) report none, so their runs are told only
  when mid-turn). Application-owned and system-owned runs (the Application platform, the Model Router agent) recover by
  their owners.
- **The cause** (`restart-cause.ts`): an `update` when the entry was recorded by another release than this server's; a
  `restart` after any other graceful stop (quit and relaunch, Restart server, `docker stop`/start; the node is not told
  which); an `unexpected_stop` when the previous session ended without a graceful stop (a crash, a forced quit or a
  power loss).
- **How they are told** (the user's DEC-001 B). After an update, the runs are woken: the reminder is posted as their
  first input. After any other restart, nothing is woken: the reminder rides the run's next input (from the user or
  another agent), at no cost until then.
- **Exactly once**, whichever comes first: the wake or the next input. A run whose Task is closed, or whose root is
  archived, terminated or gone, gets none.

Out of scope: showing the user a run that could not resume (FU-002 of autobyteus-285), a failed Docker trial that
restores a data copy (FU-003 of autobyteus-285), per-node settings (autobyteus-286), showing an agent with a running
background task as such (part 2 of autobyteus-448).

## TS Source

- `src/restart-resume/release-identity.ts` — `readReleaseIdentity()`: the server's release version from
  `dist/release-identity.json`, written by `scripts/write-release-identity.mjs` in `build:full` from the
  `autobyteus-web` package version (the release version). A server run from `src` has no stamp and never counts a
  restart as an update.
- `src/restart-resume/busy-run-record.ts` — the record's shape, tolerant reader and writer:
  `<appDataDir>/restart-resume/busy-runs.json` =
  `{ entries: [{ root, agentRunId, place, status, backgroundTasks, recordedAt, version }], shutdownAt? }`. A record of
  an earlier release (no `backgroundTasks`, no `shutdownAt`) reads with those defaults.
- `src/restart-resume/busy-run-recorder.ts` — `BusyRunRecorder`: `startSession()` (the live record) and `record()`
  (the graceful final write).
- `src/restart-resume/restart-cause.ts` — `restartCauseOf(entry, shutdownAt, currentVersion)`.
- `src/restart-resume/restart-resumer.ts` — `RestartResumer`: `takePreviousSession()` at startup and
  `resumeAfterRestart(previous)` after listening.
- `src/restart-resume/restart-reminder-record.ts` — `<appDataDir>/restart-resume/restart-reminders.json` =
  `{ reminders: [{ root, agentRunId, place, cause, version, restartedAt, interruptedTurn }] }` (facts; the text is built at
  delivery).
- `src/restart-resume/restart-reminder-service.ts` — `RestartReminderService`, the only owner of the reminders file:
  the pending reminders and their delivery.
- `src/restart-resume/restart-notice.ts` — `buildRestartNoticeText(...)` (one text for the wake and the next input) and
  `buildRestartNotice(...)` (the wake's SYSTEM input).
- `src/compositions/restart-resume-composition.ts` — composes the recorder and resumer around the process's run
  services. `build-studio-server.ts` creates the reminder service first and passes it to the notice slot
  (`AgentRunPlatformNotices`: runtime hand-over, then the restart reminder, then tool list, skill and background task
  notices) and to this composition.
- `src/compositions/collaboration-root-resolver.ts` — `CollaborationRootResolver.resolveOrRestore(root)`, the one
  root resolution shared with inbound remote messages: `null` means no such root here; any other failure is thrown.
- `ActiveCollaborationRootDirectory.placeOf(agentRunId)` — the active root holding a run and its place (`host` or
  `member`), from each root's `hasAgentExecution`. When several roots claim a run, it logs and prefers the host.

## The startup order (`server-runtime.ts`)

`buildStudioServer` → `takePreviousSession()` → `recorder.startSession()` → cleanup becomes `record(); app.close()` → …
listen → `recoverAfterListen` → `resumeAfterRestart(previous)` (in the background) → background tasks.

The previous session's record is taken before this session records anything, so it is never overwritten; a start that
fails before the take leaves it for the next start.

## The live record

While the node runs, every 2 s the recorder lists the runs to tell (above) from the process `AgentRunManager` and
`placeOf`. It rewrites the record only when the list changed (`recordedAt` is not a change), or removes it when the
list is empty; a check during a write is skipped. So after a crash the record is at most 2 s old and has no
`shutdownAt`.

At a graceful stop the cleanup runs `record()` first, inside the 10 s shutdown bound and before any `preClose` hook, so
before anything is interrupted. It stops the checks, waits for a write in progress, adds the idle runs whose runtime
answers only through its background-task view (Codex; asked at once, at most 1 s in total), and writes the final list
with `shutdownAt` (or removes the record when nobody is to be told). `record()` does nothing before `startSession()` and
never throws.

## Taking the previous session

`takePreviousSession()` runs right after the server is built. It never throws.

1. Read the record. Missing: nothing to do. Unreadable or invalid: logged and removed.
2. Give every entry its cause and hand all of them to the reminder service as pending reminders
   (`interruptedTurn` = the run was mid-turn). The service saves them before `add()` resolves.
3. Only then remove the record. If the reminders could not be saved, the record is kept and the failure logged; the new
   session's next change rewrites the record, so that log line is the only certain outcome.
4. Prune: the pending reminders of runs whose Task is closed, or whose root is archived, terminated or gone, are dropped.
5. Return the update entries for the wake.

## Delivering a reminder

The reminder service holds each run's reminder as pending, claimed (by the wake) or in flight (as a preface). Only a
pending reminder can be taken. A newer restart replaces a run's older pending reminder, keeping `interruptedTurn` when
either had it. Every change is saved, so a reminder survives the next restart until it is delivered.

**The next input.** The service is a source of `AgentRunPlatformNotices`. When a run takes an external input (either
dispatch kind), the slot asks it after the runtime hand-over; a pending reminder becomes the input's preface (one
dispatch, one turn), the run publishes it as its system notice and memory records it. Delivered: removed. Returned (the
dispatch was not forwarded): pending again.

**The wake after an update** (`resumeAfterRestart`, in the background; it never blocks or fails startup):

1. Roots are resumed bottom-up along `delegatedFrom` (`DelegationIndex.parentOf`, one hop): every run is its own root,
   and a root's depth is the number of recorded roots above it, so a run delegated to resumes before the run that
   delegated to it. A run's reminder lists the resumed runs it delegated to (one hop) that were accepted, whatever its
   place. Without the Task records loaded, every root is at depth 0 and no reminder lists any.
2. At most 3 posts run at once. A root waiting for the runs it delegated to holds no slot.
3. A cheap pre-filter, before restoring: skip a run that is already live, a run whose Task is closed, and a run whose
   root was stopped on purpose (`terminatedAt`), archived or deleted.
4. **Restore without posting**, through the root: `resolveOrRestore(root)`; a standalone host is then made ready
   (`ensureHostReady`); a member starts on the reminder itself. Restoring posts no input.
5. **Re-check after the restore**: the root's history must still show no `terminatedAt` and no archive. This check is
   final: archiving refuses an active run or root.
6. **Claim the reminder.** None to claim means an input reached the run first and carried it: nothing is posted.
7. **Post it as an input the run admits only as its first** (`onlyAsFirstInput`), through the root so its fences apply:
   a standalone host by `root.postHostUserMessage({ message, postOptions })`, a member by
   `root.executeAgentCommand(id, { kind: "post_message", message, postOptions })`.
8. Accepted: the claim is settled delivered. Refused (`AGENT_RUN_INPUT_NOT_FIRST`: an input reached the run first while
   the reminder was claimed) or failed: it is returned, pending again, so the run's next input carries it.

**First input only.** `AgentRunInputOptions.onlyAsFirstInput` is decided in `AgentRunInputAdmissionState.reserve`,
inside the run's dispatch queue: the input is refused with `AGENT_RUN_INPUT_NOT_FIRST` when this run instance has
already reserved or admitted any input. A restored run is a new instance, so the reminder is admitted unless something
reached the run first. A remote child's node admits its own input, so a first-input-only post to a remote child is
refused (`REMOTE_RUN_FIRST_INPUT_UNSUPPORTED`); remote children are never recorded here (each node tells its own runs).

## The reminder

A SYSTEM notice from `system.restart_resume` (DEC-003):

```
[Platform notice — application restarted]

The application restarted at 2026-11-17 22:20 UTC (reason: an update to v1.5.14).
Your previous turn was interrupted; check the results of any tool calls that were running before you repeat them.   (mid-turn only)
If you started any background tasks, the restart stopped them. Check what you still need: restart it, or continue your work.
These runs you delegated were resumed too and are working: <names>.   (the wake, when any were accepted)
```

The reason is `an update to v<version>`, `a restart`, or `an unexpected stop (a crash, a forced quit or a power loss)`.
The time is UTC for the agent (it knows no zone of the node); the conversation card (`SystemTaskNotificationSegment`,
desktop and phone) shows it in the viewer's own time zone, e.g. `18 Nov 2026, 06:41 CET` (autobyteus-526,
`autobyteus-web/utils/restartReminderLocalTime.ts`); the stored and model-facing text stay UTC.
After an unexpected stop the background-task line is instead (DEC-008; a crash runs no cleanup, so a native command
group can outlive the server):

```
If you started any background tasks, some may still be running: the application stopped unexpectedly and could not stop them, and any that are still running are no longer tracked, so you will not be told when they finish. Check them (for example with `ps` and the pids you were given); stop any you still need and start them again so they are tracked, or continue your work.
```

- The wake's input: `message_id` = `restart-resume:<restartedAt>:<agentRunId>`, `dedupe_key` =
  `agent_run_input:<agentRunId>:<message_id>`: display and projection keys, not a send guard.
- Every place shows the wake the same way: `restartNoticeLifecycleObserver` publishes the run's own
  `SYSTEM_TASK_NOTIFICATION` when the input is forwarded. A reminder that rides an input is published by `AgentRun`
  when that input is forwarded. The sender is in memory's recorded set, so the reminder shows live and after a reload.
- The member handle publishes no `member_input` for a platform notice (a message carrying a platform preface, read
  before the post), so a member's window shows it once, as a system notice.
