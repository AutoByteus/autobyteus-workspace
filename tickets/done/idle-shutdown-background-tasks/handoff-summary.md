# Handoff Summary — idle-shutdown-background-tasks (SR-003 hybrid)

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks`
- Ticket branch: `codex/idle-shutdown-background-tasks` (local only, not pushed yet)
- Base / finalization target: `origin/personal` @ `3a2496c95`. Re-fetched at delivery start; the base had not advanced, so the integration method was "Already current".
- Verified candidate: the ticket branch HEAD that contains this file (delivery commit on top of `d08b6c5e9`)
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed (architecture review, source review, API/E2E, test-code review).

## What Changed

- A delegated copy (Agent or Team, including members and brought-in helpers) is **not idle-shut-down while its runtime reports a running background task**: Claude `run_in_background`, or an AGY daemon step. There is no time limit (DEC-005).
- When the last task ends (completed, failed or stopped), the grace period re-arms, and an otherwise quiet copy is shut down one grace period later. This also covers AGY, where no turn follows the task's end.
- Unchanged: quiet copies with nothing running (all runtimes), the grace setting, wake-on-message, Task DONE, root stop and server stop.
- The agent-facing collaboration contract, server docs, web docs and TESTING.md describe the rule.
- The superseded SR-002 removal was fully reverted outside `tickets/`. Net product diff: `git diff 3a2496c95 HEAD -- . ':!tickets'`.

Key code: `AgentRunBackend.hasRunningBackgroundTasks()` (Claude registry, AGY monitor; others `false`), `root-task-execution-lifecycle.ts` (quiet check + `onAgentBackgroundTaskEnded` re-arm), root forwards in Team/Org/Standalone roots, and `team-task-execution-service.ts`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-002 Pass |
| Source review | CRR-003 Pass (9.5/10) |
| API/E2E | API-REV-001 Pass, final confidence 95.2% |
| Test-code review | CRR-004 Pass, no findings (one editorial nit fixed in delivery) |
| Live Claude delegated background task (AC-001/005) | Pass: task completed 89 s after idle, reported, offline 60 s after quiet |
| Live AGY delegated daemon 180 s (AC-002/004) | Pass: same AGY process across two grace periods; offline 60 s after exit |
| Scripted hybrid E2E in Agent/Team/Org roots (AC-002/003/004/006/007) | Pass; fails on base |
| Live mixed runtimes (AutoByteus/Codex/Claude) regression | Pass 4/4 |
| Full unit suite | No new failures (43 pre-existing failures in 15 files, identical on base) |
| Delivery smoke (checkpoint `d08b6c5e9`) | 7 files and 152 tests passed |

## How To Verify

Quick, without model calls (about 3 minutes):

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts --no-watch
```

Hands-on, in the app built from this worktree:
1. Set **Delegated agent idle shutdown grace period** (`AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`) to `60000`.
2. In a team, delegate to a Claude agent: "run `sleep 120 && echo done` in the background, wait for it, then report the output to me."
3. Expected: the delegated copy stays live past 60 s and is not shown as `offline`. The task completes, the copy reports `done` to you, and about 60 s after that it goes `offline`.
4. Delegate a plain short task with no background work. It goes `offline` about 60 s after finishing, and a message to it wakes it as before.

## Residual Risks (accepted)

- QR-002/DEC-005: if an AGY daemon is killed externally, or a Claude terminal frame is missed, the copy stays live until Task DONE, root stop or server stop. It is never killed by mistake.
- Server stop with a running task, and AC-003 with a Claude member, are covered at unit level only.
- TESTING.md rule 9: 43 pre-existing unit failures and some base integration failures are identical on base. They are reported separately and are not fixed here.
- DEC-003 (notice to the agent when a run end stops its background tasks) is deferred as a separate-ticket candidate.

## Delivery Artifacts

- Docs sync: `tickets/done/idle-shutdown-background-tasks/docs-sync-report.md`
- Release notes: `tickets/done/idle-shutdown-background-tasks/release-notes.md`
- Release/deployment report: `tickets/done/idle-shutdown-background-tasks/release-deployment-report.md`
- Delivery revision record: `tickets/done/idle-shutdown-background-tasks/delivery-revision-record.md` (DR-001)

## Awaiting

Explicit user verification. The user also decides on release: finalize only, or publish a new version with the repository's release helper.
