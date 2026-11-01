# Restart Resume

## Scope

After an **update restart**, the agent runs that were mid-turn when the node shut down continue by themselves, each
told once that the application restarted (autobyteus-285).

- An update restart is a start of a different release on the same data: the desktop's "Install update and restart",
  automatic updates, a Docker node's in-place update, an image upgrade.
- Only update restarts resume (the user's decision, DEC-001 = A). A plain quit and relaunch, Restart server, or
  `docker stop`/start resumes nothing; the record is discarded at the next start.
- Only busy runs (`initializing` or `running`) are recorded. Idle runs are untouched.
- Only runs held by a collaboration root are recorded: standalone hosts, Team and Org members, delegated copies.
  Application-owned and system-owned runs (the Application platform, the Model Router agent) recover by their owners.

Out of scope: a hard kill or power loss (no record is written; FU-001), showing the user a run that could not resume
(FU-002), a failed Docker trial that restores a data copy (FU-003), per-node settings (autobyteus-286).

## TS Source

- `src/restart-resume/release-identity.ts` — `readReleaseIdentity()`: the server's release version from
  `dist/release-identity.json`, written by `scripts/write-release-identity.mjs` in `build:full` from the
  `autobyteus-web` package version (the release version). A server run from `src` has no stamp and never counts a
  restart as an update.
- `src/restart-resume/busy-run-record.ts` — the record's shape, reader and writer:
  `<appDataDir>/restart-resume/busy-runs.json` = `{ entries: [{ root, agentRunId, place, status, recordedAt, version }] }`.
- `src/restart-resume/busy-run-recorder.ts` — `BusyRunRecorder.record()`.
- `src/restart-resume/restart-resumer.ts` — `RestartResumer.resumeAfterUpdate()`.
- `src/restart-resume/restart-notice.ts` — `buildRestartNotice(...)`, the only producer of the notice.
- `src/compositions/restart-resume-composition.ts` — composes both around the process's run services.
- `src/compositions/collaboration-root-resolver.ts` — `CollaborationRootResolver.resolveOrRestore(root)`, the one
  root resolution shared with inbound remote messages: `null` means no such root here; any other failure is thrown.
- `ActiveCollaborationRootDirectory.placeOf(agentRunId)` — the active root holding a run and its place (`host`,
  `member`, `delegated`), from each root's `hasAgentExecution` and `isDelegatedRun`.

## Recording at shutdown

`server-runtime.ts` makes the shutdown cleanup `record(); app.close()`. The recorder therefore runs inside the 10 s
shutdown bound and before any `preClose` hook, so before anything is interrupted.

1. It snapshots the process `AgentRunManager`'s live runs and keeps those `initializing` or `running`.
2. For each, `placeOf` gives its root and place; a run without a root is not recorded.
3. Only when there are entries: it merges with a record not yet consumed (entries of runs not recorded now are kept,
   with their own version) and writes the file atomically.

It never deletes and never throws. With no busy runs it writes nothing, so a quit right after an update relaunch, before
the resumer ran, keeps the update's record for the next start.

## Resuming at startup

After `recoverAfterListen`, `resumeAfterUpdate()` runs in the background; it never blocks or fails startup.

1. Read the record. Missing: nothing to do. Unreadable or invalid: logged and removed.
2. Delete it before any resume, so a resume that fails or crashes the server is never repeated.
3. Keep the entries whose recorded release differs from this server's (both known). The others are dropped with one
   log line.
4. Per root: first its delegated runs, then its host and members. A host's or member's notice lists the delegated runs
   of its root that were accepted. The coordinating member of a Team or Org copy is not recorded, so every resumed
   member is told.
5. At most 3 posts run at once. A host waiting for its delegated runs holds no slot.
6. A cheap pre-filter, before restoring: skip a run that is already live, and a run whose root was stopped on purpose
   (`terminatedAt`), archived or deleted.
7. **Restore without posting**, through the root: `resolveOrRestore(root)`; a standalone host is then made ready
   (`ensureHostReady`); a member or delegated run starts on the notice itself. Restoring posts no input.
8. **Re-check after the restore**: the root's history must still show no `terminatedAt` and no archive. This check is
   final: archiving refuses an active run or root. (Archiving a standalone host whose host is not live ends the root
   instead; the later post is then refused, and an admitted turn is fenced.) If it fails, nothing is posted, and the
   idle restored run stops as usual.
9. **Post a notice the run admits only as its first input** (`onlyAsFirstInput`, below), through the root so its fences
   apply:
   - a standalone host: `root.postHostUserMessage({ message, postOptions })` (a host takes no `executeAgentCommand`);
   - members and delegated runs: `root.executeAgentCommand(id, { kind: "post_message", message, postOptions })`. A
     closed Task's copy is refused by its root's fence.
10. A refusal or a failure is logged and the run is not counted as resumed. `AGENT_RUN_INPUT_NOT_FIRST` is logged as
    "the run already had input": a user's message, a coordinating run's `send_message_to` or a peer's message reached
    the restored run first, and it continues with that.

**First input only.** `AgentRunInputOptions.onlyAsFirstInput` is decided in `AgentRunInputAdmissionState.reserve`,
inside the run's dispatch queue: the input is refused with `AGENT_RUN_INPUT_NOT_FIRST` when this run instance has
already reserved or admitted any input. A restored run is a new instance, so the notice is admitted unless something
reached the run first; a message that arrives after the notice is queued after it as usual. There is no window between
a check and the post. A remote child's node admits its own input, so a first-input-only post to a remote child is
refused (`REMOTE_RUN_FIRST_INPUT_UNSUPPORTED`); remote children are never recorded here (each node resumes its own runs).

A delegated run's resumed turn can message its host before the host's notice. The host then had input first, so its
notice is refused: it continues with that input and does not get the notice or the list.

## The notice

A SYSTEM input from `system.restart_resume`, in the shape of the platform's other notices:

```
The application restarted at <time> after an update to <version>.
Your previous turn was interrupted.
Tool calls that were running have unknown results; check before repeating any of them.
These runs you delegated were resumed too and are working: <names>.   (host or member, when any were accepted)
```

- `message_id` = `restart-resume:<recordedAt>:<agentRunId>`, `dedupe_key` = `agent_run_input:<agentRunId>:<message_id>`:
  display and projection keys, not a send guard.
- Every place shows it the same way: `restartNoticeLifecycleObserver` publishes the run's own
  `SYSTEM_TASK_NOTIFICATION` when the input is forwarded (as the Model Router does). The sender is in memory's recorded
  set, so the notice shows live and after a reload, for a host, a member and a delegated run.
- The member handle composes that observer with its own and publishes no `member_input` for a platform notice (a
  message carrying a platform preface, read before the post), so a member's window shows it once, as a system notice.
