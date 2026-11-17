# Investigation Notes

## Investigation Meta

- Package identifier: `background-task-restart-notice` (Project Task `autobyteus-448`, merged with autobyteus-481)
- Request / ticket: autobyteus-448 "Agents with a running background task: show them as busy (not idle), and after an automatic update or any restart tell them in context that the software shut down and their background tasks were stopped, so they check and continue"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice`
- Repository mode: `Git`
- Task worktree / branch: same path, branch `codex/background-task-restart-notice`
- Resolved base: `origin/personal` @ `4cbf9e78812f0c6d063d243e84ac37a1b2119fe9` (fetched 2026-11-17; includes autobyteus-338, 461, 473)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-17): `references/requirements-engineering.md`, `references/ticket-scope.md` (updated skill version), `references/finding-the-cause.md`
- Investigation status: requirements-phase investigation complete; decisions for the user open

## Initial Request And Clarifications

- Original request (2026-11-09, the user, condensed): agents idle and waiting for a background task never learn after an automatic update that the task was killed; notify them after the restart so they restart the tasks or continue.
- Clarifications (Task comments): 2026-11-12 "very important": an agent with a running background task should not be shown as idle; after an update restart **or any shutdown and restart** it is never told, so it never continues; a friendly in-context message naming the cause (update, manual shutdown or restart, crash), saying the background tasks were stopped, asking it to check, restart them or continue; scope to settle by the team: every kind of restart, every runtime, idle-with-background AND mid-turn agents. 2026-11-12 merged with 481 (part 2: show such agents as busy); decisions for the user: the wording shown, and whether messages to such an agent are queued or delivered at once. 2026-11-17: dispatched on the founder's word; first re-check against 461; part 1 first, then part 2; release only on his word.
- Screenshots (Task context files 40.jpg, 41.jpg): the phone header of a Software Engineering Team's implementation engineer reads "Running · in software engineering team" with the Stop button; its reply describes its ticket at "about 40% done". The user did not say whether that agent lost a background task; they illustrate an agent in a team that was working.

## Source Log

| Date | Source Type | Exact Source | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `autobyteus-server-ts/src/restart-resume/busy-run-recorder.ts` L20-46 | Who is recorded at shutdown | Only runs whose status is `initializing` or `running` and that a collaboration root places (`placeOf`); written once, at graceful shutdown (`server-runtime.ts` L209: `recorder.record()` then `app.close()`) | Gap for idle runs with background tasks |
| 2026-11-17 | Code | `restart-resume/busy-run-record.ts` | Record shape | `<appDataDir>/restart-resume/busy-runs.json`, entries `{root, agentRunId, place: host|member, status, recordedAt, version}`; transient | — |
| 2026-11-17 | Code | `restart-resume/restart-resumer.ts` L60-90, L136-171 | Who is resumed | Only when the entry's release differs from the server's (update restart); record removed before any resume; bottom-up along `delegatedFrom` (461 DS-9); closed Tasks skipped (461 DS-15); notice admitted only as first input | Non-update restarts and crashes: nothing |
| 2026-11-17 | Code | `restart-resume/restart-notice.ts` L20-30 | Notice text | "The application restarted at … after an update to …. Your previous turn was interrupted. Tool calls that were running have unknown results …"; nothing about background tasks | Wording |
| 2026-11-17 | Doc | `tickets/done/restart-resume/requirements-doc.md` DEC-001, DEC-003, AC-004 | 285's scope decisions | **DEC-001 decided by the user 2026-11-01: option A, update restarts only** ("a plain quit is a choice to stop, and an unasked resume the next morning spends money"); DEC-003 idle runs not recorded; AC-004: a non-update restart resumes and notifies nothing | Conflicts with the 2026-11-12 request: user decision needed |
| 2026-11-17 | Code | `shutdown/server-process-shutdown.ts` L40-80 | Can the node tell why it stops? | SIGINT, SIGTERM and the desktop's IPC `request` all call the same `request()`; no reason is carried. A crash or kill leaves no record (the recorder runs only in cleanup) | Cause known at next start: update (version change), graceful otherwise, crash = no graceful record |
| 2026-11-17 | Code | `agent-execution/backends/*` `hasRunningBackgroundTasks()` and `backgroundTaskInspection` | What each runtime knows | AutoByteus (338): manager, real, `current()` lists tasks with command; Claude: `ClaudeBackgroundTaskRegistry`, real, `current()`; Antigravity: monitor, real, `current()`; Codex: `hasRunningBackgroundTasks()` returns `false`, tasks only by async `snapshot` read (safe executable label, no command); ACP (Grok Build, DeepSeek): none | Per-runtime coverage |
| 2026-11-17 | Code | `agent-execution/domain/agent-run.ts` L180-205 | Facade | `listRunningBackgroundTasks()` is native-only (338 capability); `inspectBackgroundTasks()` gives every runtime's view (473: `event-stream` with `current()`, Codex `snapshot`) | Use the inspection view for the restart list |
| 2026-11-17 | Code | `agent-execution/domain/agent-run-termination.ts` L76-81 | Quiet check | Idle shutdown already treats a running background task as work | — |
| 2026-11-17 | Doc | `tickets/done/phone-background-tasks-473/requirements-doc.md` L18, DEC-002 | Status reading | 473 left "Idle while a background task runs" to its own Task (now part 2 here): needs node-side status for every runtime and list; wording is the user's | Part 2 |
| 2026-11-17 | Code | `autobyteus-web` grep for a background-running flag | Part 2 current state | No list or header reads a "background task running" flag; status is the turn status | Part 2 is new |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Update restart, agent mid-turn | recorded at graceful stop → resumed with notice after the update | Woken, told the turn was interrupted; background tasks not mentioned | recorder, resumer, notice | High (Read) |
| BEH-002 | Operational | Update restart, agent idle with a running background task | not recorded | Never told; waits forever | recorder L41 | High (Read; the 473 SD found the same) |
| BEH-003 | Operational | Plain quit/relaunch, Restart server, node stop/start | record written but discarded at start (not an update) | Nothing, for any agent | resumer L77-80; 285 AC-004 | High |
| BEH-004 | Operational | Crash, forced kill, power loss | no record | Nothing | shutdown L40-80 | High |
| BEH-005 | User | Viewing an agent idle with a running background task | status = turn status | Shown "Idle" (desktop and phone lists/headers); the Activity tab lists its tasks (473) | 473 L18 | High |
| BEH-006 | System | Message sent to an agent idle with a running background task | delivered at once (starts a turn) | — | input admission | High |

## Runtime coverage (what the node can list per run at shutdown)

| Runtime | Knows running background tasks | List with command | Notes |
| --- | --- | --- | --- |
| AutoByteus (native) | Yes | Yes | `current()`; 338 never reports host-shutdown ends |
| Claude | Yes | Yes (command when known) | registry `current()` |
| Antigravity | Yes | Yes | monitor `current()` |
| Codex | Only by an async snapshot read | label only (executable basename) | `hasRunningBackgroundTasks()` false today |
| Grok Build, DeepSeek (ACP) | No | No | not reported by the runtime |

## Runtime, Probe, Or Reproduction Findings

- The gap is established by reading (the recorder's status filter and the resumer's update-only rule); the isolated-node before/after reproduction the Task asks for is part of validation (API/E2E), with the existing shutdown E2E fixtures (`autobyteus-server-ts/tests/e2e/shutdown/`) as the starting point.
- Temporary diagnostics: None.

## Persisted Data And State Facts

- `busy-runs.json`: transient, consumed at the next start; any new or wider record of the same kind stays transient (no user data).
- Agent memory: notices are recorded as system notices (existing path); no stored-data shape change expected.

## Supplemental Artifact Inventory

None yet.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| U-1 | Unknown | Why the screenshot's agent read "Running" (mid-turn or a runtime keeping its turn open for a background step, e.g. Antigravity) | Not needed for the requirement; noted for part 2 | Open |
| R-1 | Risk | Covering crashes needs a record kept current while the node runs (not only at shutdown) | Architecture | Open |

## Requirement Implications

- Part 1 needs: who is told (mid-turn and background-waiting runs), after which restarts, woken or told with the next input, the message, the per-runtime task list.
- The 2026-11-12 request ("any shutdown and restart") conflicts with the user's own 285 DEC-001 (update restarts only; no unasked resume after a quit): the user decides.
- Part 2 needs a node-published "background task running" flag per run for every runtime that can say so, and the user's wording.
