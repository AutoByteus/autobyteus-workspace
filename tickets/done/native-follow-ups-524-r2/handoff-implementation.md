# Handoff — autobyteus-524 round 2 (`native-follow-ups-524-r2`): FU-006 and FU-007

- Status: `Architecture Design Complete` — `task_size: Small`, `architectural_risk: Low` → direct implementation route
- Package: `native-follow-ups-524-r2`, revision `SR-001`
- Task: `autobyteus-524` round 2; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); scope set by the founder 2026-11-18 ("only do the two and three")
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2`, `codex/native-follow-ups-524-r2`; base `origin/personal` at `0570c47fd9`; finalization target `origin/personal`
- Release: only on the founder's word
- After delivery: the PM wants the per-round cleanup and a record copy (as for round 1)

## What to build

1. **FU-006:** in `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts`, hide the DeepSeek harness like the other runtime CLIs: set `DEEPSEEK_HARNESS_COMMAND` to a command that does not exist (restore it after). Prove on this Mac, where `~/.local/bin/dsh` is installed.
2. **FU-007:** at process shutdown, do not close OS file watches; the exit releases them. Give `AgentPackageFolderWatcher` and `SkillFolderWatcher` a shutdown stop (closed, timers cleared, entries dropped, listeners ignored; no `chokidar.close()` / `fs.watch.close()`), and have the feed composition's `close()` and the skill-update notices' `close()` (both called only from process shutdown; verify) use it. `close()` itself keeps releasing OS watches for all other callers.

## Evidence

Closing the package-folder watch blocks the main thread 2–13 s on a loaded Mac (chokidar's synchronous close part 2.0–6.8 s, the presence `fs.watch.close()` up to 2.2 s); with the OS close skipped at shutdown, 10/10 stops took 48–166 ms at load 100–125 (investigation RF-001…RF-004).

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2/tickets/in-progress/native-follow-ups-524-r2/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2/tickets/in-progress/native-follow-ups-524-r2/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2/tickets/in-progress/native-follow-ups-524-r2/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2/tickets/in-progress/native-follow-ups-524-r2/solution-revision-record.md`
- `evidence/built-server-stop-probe.mjs` (reproduction), `evidence/RF-00*.jsonl`

## Open risks

ASM-001: other platforms not measured (the change only removes work).
