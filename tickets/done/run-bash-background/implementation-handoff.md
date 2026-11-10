# Implementation Handoff

## Upstream Artifact Package

All paths below are in `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/`.

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High) and passed (ARCH-REV-003); this package goes to code review.
- Requirements doc: `requirements-doc.md` (Approved, SR-005)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-005)
- Design spec: `design-spec.md` (Ready, SR-005)
- Supplemental task artifacts: `prototype/wrapper-skeleton-probe.sh` + `.log`, `prototype/kill-pid-probe.mjs` + `.log`, `prototype/background-completion.prototype.test.ts` + `prototype-run.log`, `options-report.md`, `agents-package-files-naming-background-tools.txt`
- Design review report: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `code-review-report.md` (CRR-001, CR-001), `code-review-revision-record.md`, `evidence/CR-001-bash-logout-probe.md`

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002: code review CRR-001 finding CR-001, Local Fix)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 baseline)
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001` (Fail, CR-001), `CRR-002` (Pass, CR-001 resolved in `ddd594d07b`; `code-review-report.md`, `code-review-revision-record.md`)
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`
- Worktree / branch / commits: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background`, branch `codex/run-bash-background`, base `374e35a60e` (origin/personal). Commits: `6a4df1c54b` (baseline test fix, unrelated test), `bad24354ee` (autobyteus-ts), `13319ccf6a` (run_bash result rule), `65ca3171c9` (server, docs, glossary), `c434d852ac` (dead `isProcessRunning` removed), `e26460bf57` (wrapper output kept out of a stopped call's stderr), `ddd594d07b` (CR-001: the wrapper ends without the `exit` builtin), then the ticket-documents commit named in the handoff message. Code: `374e35a60e..ddd594d07b`; the CR-001 delta is `e26460bf57..ddd594d07b`.

What it does: every `run_bash` call runs through one command wrapper (`autobyteus-ts/src/tools/terminal/command-execution/command-wrapper.ts`). The call returns when the foreground part ends; each `&` job still running is a background task, with the wrapper as its parent reporting its exit code or signal. `run_in_background: true` is the same path with the whole command as one job that forwards TERM, so `kill <pid>` stops everything it started. The agent's `BackgroundProcessManager` owns the tasks; an end is reported once, in the agent's own `run_bash` result (`backgroundTasksEnded`) or in one batched SYSTEM notice the server's `BackgroundTaskNoticeService` delivers (waking an idle run after a 2 s settle). The native backend publishes the tasks as `BACKGROUND_TASK_UPDATED` (panel, idle-shutdown quiet check). Run end stops the commands (`BackgroundProcessCleanupStep`). `start_background_process`, `get_background_processes`, `get_process_output` and `stop_background_process` are removed.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: two packages; every `run_bash` call now ends at a wrapper frame; model-facing tool contract changed (new parameter and result fields, four tools removed); a shared backend contract gained a capability; asynchronous delivery that wakes idle runs; run-end lifecycle change.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The design's escalation triggers were checked: ordinary foreground results unchanged (IMP-02, IMP-08); latency lower, not higher (IMP-09: mean 95 ms vs 215 ms on base); a killed command's end arrived inside the kill's own result in every run (IMP-02 cases 8 and 10, IMP-08).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | `run_bash(run_in_background)` returns at once with pid, cwd, output file | `tools/run-bash.ts` → `BackgroundProcessManager.run(…, { background: true })` → `wrapCommand(…, 'background')` → `ShellCommandExecutor.execute` → scope/launcher → `FOREGROUND_DONE` → `{ pid, status: 'running', effectiveCwd, outputFile }` | Implemented; start ≈ 100 ms; a start failure throws (tool error result) |
| BEH-002 | Each end reported with exit code/signal, duration, last lines, output file | wrapper `JOB_ENDED` → `AnchoredCommandHandle.onJobEnded` → `manager.recordEnd` (`backgroundTaskOutcome`, `BackgroundOutputLog.lastLines`) → run_bash result or notice | Implemented; `{ error }` when the wrapper exits without a frame |
| BEH-003 | Notice wakes an idle run | `BackgroundTaskNoticeService.flush` → `AgentRun.postUserMessage(SYSTEM notice)` | Implemented (integration test); live wake is API/E2E |
| BEH-004 | Output in a file read with `tail` | `background-output-log.ts` (`<tmpdir>/autobyteus-background-tasks/<agentId>/call-<ms>-<anchorPid>.log`, synchronous appends, 20-line/2,000-char tail) | Implemented |
| BEH-005 | `kill <pid>` stops the whole `run_in_background` command | background form `trap 'trap - TERM; kill -TERM 0' TERM` | Implemented; nothing remains (IMP-02 case 8, IMP-08) |
| BEH-006 | Four tools retired | tool files and registrations removed; `BackgroundProcessInfo`/`BackgroundProcessOutput`, dead manager methods, survivor listing removed | Implemented |
| BEH-007 | Run end stops background commands, no notice | `AgentShutdownOrchestrator` → `BackgroundProcessCleanupStep` (first step) → `manager.stopAllForRunEnd` (scope stop `run-end`, ends never reportable, output folder removed) | Implemented |
| BEH-008/009 | Native reports background tasks (panel, idle shutdown) | `autobyteus-background-task-reporter.ts` → `BACKGROUND_TASK_UPDATED`; `hasRunningBackgroundTasks()` = `manager.hasRunning()`; inspection `event-stream` | Implemented; panel rendering not exercised (no frontend change) |
| BEH-010 | Per-run list of background commands | `manager.list()` (start + end); backend `listRunning()`; `AgentRun.listRunningBackgroundTasks()` | Implemented |
| BEH-011 | Stop leaves background tasks running | timeout/abort apply until `FOREGROUND_DONE` only (`shell-command-executor.ts`) | Preserved |
| BEH-012 | Definitions naming retired tools keep starting | resolver unchanged (skips unknown names); template updated | Preserved; no migration |
| BEH-013 | Journal: `(background)` line; `Notice:`; old journals render | `autobyteus-translation.ts` (`backgroundCommand` for `run_bash` with `run_in_background` and recorded `start_background_process`) | Implemented |
| BEH-014 | `&` jobs of a foreground call are background tasks | foreground wrapper `FOREGROUND_DONE:<rc>:<pids>` → `backgroundTasksStarted`; later output to the call's log | Implemented; detached processes untracked, stopped at run end while in the group |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Deviations From The Design Text (Implementation Refinements)

None changes approved behavior or an ownership boundary. Each is recorded for the reviewer.

1. **User block runs with fds 62/63 closed** (`{ … } 62>&- 63>&-`). Bash restores both after the block and before an EXIT trap (checked on 3.2 and 5.2, `-c` mode, which production uses). On bash 4+ (Linux, WSL) the processes the command starts no longer inherit the wrapper's channels, which removes the R-6 inheritance at its source (IMP-08 "R-6"). Bash 3.2 (macOS host) still leaks its saved copies as fds 10/11, which is harmless on the host.
2. **No-op at the start of each block** (`builtin :`, `:` in the background form): an empty or comment-only command would otherwise be a syntax error inside `{ }` (today `bash -c ''` exits 0).
3. **User EXIT trap:** `$?` equals the command's status when the trap body runs (`__ab_status`), and the wrapper's own EXIT trap stays installed while it runs, so `trap 'rc=$?; …; exit $rc' EXIT` keeps the exit code and the job tracking. When the user's trap replaced the wrapper's and the command then exits (`exit`, `set -e`), the call falls back to the shell's exit, as the contract states.
4. **Background form writes to fds 1/2 directly**, not via `exec 62>&1 63>&2`: dash and mksh (the `sh` fallback) accept single-digit fds only (`exec 62>&1` runs a command named `62`). The user's code runs only inside the job's subshell, so the wrapper's fds cannot be redirected by it.
5. **Separate wrapper nonce** from the WSL anchor's nonce: the anchor's `START`/`RELEASE` nonce stays unknown to user code; WSL stderr goes through the anchor decoder, then the wrapper decoder.
6. **`ProcessGroupObserver.establish` reads a fresh snapshot.** Found during implementation: concurrent callers share one in-flight `ps` read, and a read begun before the new anchor existed made `establish` fail ("Command anchor is not a live exclusive process group" → the call returned `explicit-stop`). Calls now return before their retirement's own `ps` read, so back-to-back calls hit it often (a `tail` right after an end failed this way).
7. **A failed start says why:** `Command did not start: <reason>` instead of `explicit-stop` (the start's own cleanup used to hide it).
8. **Output log written synchronously** (one fd, `writeSync`): the file holds every byte the reported `lastLines` show when the end is reported.
9. **Per-call resolver factory** in the manager, so the host's per-execution child environment (`terminalChildEnvironment`) is still evaluated for every call as `run_bash` did.
10. **`BackgroundProcessCleanupStep` runs first** in the orchestrator: it never fails, and a failing later step (the orchestrator stops at the first failure) can no longer leave the run's commands running.
11. **`compositions/platform-notice-sources.ts`** creates and closes the tool list, skill and background task notice subsystems for both hosts, instead of wiring the new subsystem separately in each host. `build-studio-server.ts` was at exactly 500 effective lines; the separate wiring took it to 512. The helper also removes the duplicated wiring (studio host 500 → 483, standalone host 375 → 368 effective lines). Close order unchanged (tool list, skill, then background task).
12. **Background start result goes through `omitEmptyToolResultFields`**, as the retired `start_background_process` result did (the documented tool-result rule for objects a runtime renders).
13. **`FOREGROUND_DONE` job list capped** by the wrapper to fit the 2,048-byte frame body (jobs beyond it stay owned by the group, untracked), as the contract allows.
14. **25 ms drain on the shell-exit path** (unwrapped `sh` calls, `exec`): the output read used to rely on the survivor `ps` reads; retirement may now belong to the scope's maintenance loop.
15. **The frame and job-loop section of the wrapper runs with its stderr discarded.** When a stop's TERM (timeout, Stop, run end) ends the user's block, bash runs the EXIT trap without restoring the block's closed fds 62/63 (deviation 1): the frame writes failed with `Bad file descriptor` and bash's job status line (`Terminated: 15`) went into the call's stderr. The frames are not needed then (the stop settles the call). IMP-02/IMP-08 assert a clean stderr for timeout and Stop.
16. **The wrapper ends without the `exit` builtin (CR-001).** `__ab_fg_end` returns the status (`__ab_status "$__ab_rc"`) instead of `builtin exit`: a login shell (`bash -lc`, as every call runs) reads `~/.bash_logout` when `exit` runs, so every foreground call had run the user's logout script. As the script's last command the return value is the exit code; from the EXIT trap the shell keeps the status that ended it. Logout reads and exit codes now equal the plain `bash --noprofile --norc -lc` on every path (ordinary command 0, `&` job 0, `exit 3` 1, `set -e` failure 0, `exit` in a user EXIT trap 1; IMP-02, IMP-08).

## Key Files Or Areas

- autobyteus-ts: `src/tools/terminal/command-execution/command-wrapper.ts` (new), `anchor-control-protocol.ts`, `anchored-command-launcher.ts`, `shell-command-executor.ts`, `non-interactive-shell-resolver.ts`, `native-command-process-scope.ts` (`holds`, `run-end` stop reason), `process-group-observer.ts`; `src/tools/terminal/background-process-manager.ts` (rewrite), `background-output-log.ts` (new), `types.ts`, `tools/run-bash.ts`, `background-process-context.ts`, `index.ts`; `src/agent/shutdown-steps/background-process-cleanup-step.ts` (new), orchestrator; `src/index.ts`, `src/tools/register-tools.ts`; four tool files removed.
- autobyteus-server-ts: `agent-execution/backends/agent-run-backend.ts` (capability), all backends, `autobyteus/autobyteus-agent-run-backend.ts`, `autobyteus/autobyteus-background-task-reporter.ts` (new), `domain/agent-run.ts`, `domain/system-task-notification-senders.ts`; `background-task-notices/` (new); `compositions/platform-notice-sources.ts` (new), both hosts; `agent-memory/services/runtime-memory-event-accumulator.ts` (recorded sender); `agent-work-journal/rendering/runtimes/autobyteus-translation.ts`; Daily Assistant template.
- Docs: `autobyteus-ts/docs/terminal_tools.md`, `terminal_android_direct_shell_backend_design.md`; server `docs/modules/{agent_execution,agent_team_execution,agent_tools,agent_work_journal,tool_list_updates,skill_update_notices}.md`; `GLOSSARY.md`.
- Tests: new `autobyteus-ts/tests/integration/tools/terminal/run-bash-wrapper.test.ts` (R-0 suite), `tests/unit/tools/terminal/background-process-manager.test.ts` (rewritten), `command-execution/call-output-lifetime.test.ts` (replaces `output-capture-lifetime`), launcher boundary tests; server `tests/integration/background-task-notices/…`, `tests/unit/agent-execution/backends/autobyteus/autobyteus-background-tasks.test.ts`; tests naming the retired tools rewritten; e2e shutdown fixtures switched to `run_bash(run_in_background)`.

## Important Assumptions

- Production always runs the wrapper with `bash -c` (`-lc`); bash's restoration of block redirections before the EXIT trap was verified in `-c` mode (script-file mode differs on bash 3.2).
- ASM-002 (models read output with `tail`) is not testable here; API/E2E with a live model.

## Known Risks

- R-0: covered by the wrapper suite on macOS bash 3.2 (IMP-02) and Linux bash 5.2 + dash (IMP-08). WSL not run (no Windows host); WSL runs the same scripts on its bash (4+), through the existing anchor decoder chained with the wrapper decoder (unit-tested, IMP-03).
- R-6: on bash 4+ the user's processes no longer inherit fds 62/63 (deviation 1, IMP-08). Processes that keep stdout/stderr (no redirection) hold the call's pipes as before this change.
- R-B: a killed command's end can still arrive after the kill's call (WSL always, no host liveness check; host beyond 300 ms) → one short notice.
- R-F, R-C, R-1, R-2, R-4, R-5, R-7, R-D, R-E: as accepted in the design.
- FU-003 of autobyteus-333 (start under heavy load, out of scope by DEC-005): under heavy CPU load starts miss their budget (IMP-10: `Command control deadline exceeded`, `Process observation deadline exceeded`). An earlier full parallel run of the autobyteus-ts suite hit it in terminal integration cases; the run at the final commit passed (IMP-04). A failed start now names its reason (deviation 7) instead of `explicit-stop`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (feature plus removal)
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision: `Refactor Needed Now` (manager as per-run owner; output log split)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the manager is the one owner of task records, report state and run-end stop; the notice service depends on `AgentRun` only; the backend reaches the manager through `getBackgroundManager` only; platform stops go through the scope only.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (journal converters for the retired names render recorded calls in existing journals, REQ-012)
- Dead code in the touched files and modules removed: `Yes` — four tools, `BackgroundProcessInfo`, `BackgroundProcessOutput`, `BackgroundProcessStatus`, manager `capture`/`releaseUnusedCapture`/`startCommand`/`adoptObservedProcesses`/`listProcesses`/`getOutput`/`stopProcess`/`stopAll`/`refresh`/`processCount`, `TerminalResult.backgroundProcesses`, survivor listing, `ProcessGroupObserver.isProcessRunning` (only caller was `manager.refresh`). `OutputBuffer` kept: still used by `TerminalSessionManager` (interactive sessions); the manager no longer uses it (decision the design left to implementation).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` — `BackgroundTaskStart`, `BackgroundTaskEnd` with a three-variant `outcome`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — largest changed source file `build-studio-server.ts` 483 effective lines (500 at base; deviation 11); manager rewrite 193 added / 85 removed lines (below 220); new files ≤ 196 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes` — no migration; stored definitions naming the retired tools keep starting (resolver unchanged); historical journals keep rendering.
- Direct-use evidence: `built-in-agent-bootstrapper.test.ts`, `runtime-translations.test.ts` (historical rows kept) in IMP-06.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` were run in the worktree (the server was not installed before). No dependency or lockfile change.
- The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build outputs of the server typecheck's prepare step (not committed, per TESTING.md).

## Checks Run

Evidence files are in `tickets/in-progress/run-bash-background/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | `e26460bf57` | macOS 26 arm64, node 22.23.1 | all autobyteus-ts sources | — | Pass | `evidence/IMP-01-ts-typecheck.log` | `exit=0` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run tests/integration/tools/terminal/run-bash-wrapper.test.ts` (the 12 probe cases, the R-0 list incl. the CR-001 logout case, background tasks, through `runBash` and the real launcher) | `ddd594d07b` | macOS, bash 3.2.57 | `command-wrapper.ts`, launcher, executor, manager, output log, `run-bash.ts` | BEH-001/002/004/005/007/011/014; AC-001, AC-005, AC-006 (local), AC-007, AC-010; R-0, R-7, R-F | Pass | `evidence/IMP-02-wrapper-suite-macos.log` | `Tests  26 passed (26)`; `✓ … reads ~/.bash_logout of the login shell exactly as often as the plain shell does, with the same exit code (CR-001)` (fails on `e26460bf57`: `[ 'echo hi', +0, 1 ]` vs `[ 'echo hi', +0, +0 ]`) |
| IMP-03 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal tests/integration/tools/terminal …run-bash-openai-schema… …tool-approval-flow… tests/unit/agent/shutdown-steps …tool-result-json…` | `ddd594d07b` | macOS, bash 3.2.57 | terminal package, decoder/launcher boundary, manager, cleanup step, tool schema | BEH-001 to 007, 010, 011, 014; AC-008 (tool absent), AC-012 | Pass | `evidence/IMP-03-ts-terminal-suites.log` | `Test Files  34 passed (34)`, `Tests  211 passed (211)` |
| IMP-04 | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts exec vitest run` (full suite) | `e26460bf57` | macOS | all of autobyteus-ts | regression | Pass | `evidence/IMP-04-ts-full-suite.log` | `Test Files  394 passed | 27 skipped (421)`, `Tests  2401 passed | 99 skipped (2500)` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` | `e26460bf57` | macOS | server src and tests | contract change in all backends | Pass | `evidence/IMP-05-server-typecheck.log` | `production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`, `[typecheck] PASS` |
| IMP-06 | `pnpm -C autobyteus-server-ts test:unit` (full) | `65ca3171c9` | macOS | all server unit tests | regression; BEH-012/013 | Pass | `evidence/IMP-06-server-unit-full.log` | `Test Files  966 passed | 5 skipped (971)`, `Tests  8211 passed | 9 skipped (8220)`. Later commits changed one server test file and the wrapper text; the affected files are rerun in IMP-07 |
| IMP-07 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution tests/integration/background-task-notices tests/integration/tool-list-updates tests/integration/skill-update-notices tests/unit/compositions tests/unit/standalone-application-host tests/architecture tests/agent-work-journal tests/unit/agent-memory tests/unit/built-in-agents tests/unit/model-routing` | `e26460bf57` | macOS | native backend + reporter, all backends, `AgentRun`, notice service and builder, platform notice sources, hosts, journal, memory sender set, template | BEH-002/003/008/009/010/012/013; AC-002, AC-003, AC-004, AC-008, AC-009 (quiet check input), AC-011, AC-012 | Pass | `evidence/IMP-07-server-targeted.log` | `Test Files  216 passed | 5 skipped (221)`, `Tests  2172 passed | 8 skipped (2180)` |
| IMP-08 | `docker run --rm -v "$PWD:$PWD:ro" -w "$PWD" node:22-bookworm node tickets/in-progress/run-bash-background/evidence/IMP-08-linux-wrapper-harness.mjs` | `ddd594d07b` (dist built from it) | Linux arm64 container, bash 5.2.15, `/bin/sh` = dash | same as IMP-02 on Linux, `sh` fallback | R-0, R-6 (no fd 62/63 inheritance), BEH-005/014, AC-010 | Pass | `evidence/IMP-08-linux-wrapper.log`, `evidence/IMP-08-linux-wrapper-harness.mjs` | `"passed":23,"failed":0`; `PASS CR-001 … [["echo hi",0,0],…,["exit 3",3,1],["set -e; false; echo no",1,0],["trap 'exit 4' EXIT; true",4,1],…]`; `PASS R-6 jobs do not inherit fds 62/63 (bash 4+)`; `PASS sh fallback (/usr/bin/dash)` |
| IMP-09 | 40 sequential `runBash(ctx,'true')` on base (temporary worktree) and on this change | base `374e35a60e`; change `65ca3171c9` | macOS, bash 3.2.57 | foreground call path | design escalation trigger (latency) | Pass | `evidence/IMP-09-run-bash-latency.log` | `change … mean=95.2ms` vs `base … mean=215.5ms` |
| IMP-10 | 40 parallel `runBash(ctx,'sleep 5',null,1)` under 64 CPU hogs (temporary file) | `c434d852ac` + wrapper fix | macOS | start path | cause of the only full-suite failure seen before IMP-04 | Cause found (FU-003) | `evidence/IMP-10-start-under-load-cause.log` | `Command did not start: Process observation deadline exceeded` |

- After CR-001 (`ddd594d07b`, one line of the wrapper's final section plus a test): IMP-02, IMP-03 and IMP-08 were rerun. IMP-01, IMP-04, IMP-05 and IMP-07 stay at `e26460bf57`; the delta changes only how the wrapper's shell ends (no type, server or contract change), and the full-suite paths it reaches are the ones IMP-02/03/08 rerun.
- Not run, and why: WSL (no Windows host; R-0/R-6 on WSL left to API/E2E or the user's Windows machine); server `test:integration` and server E2E, including the changed shutdown fixtures `tests/e2e/shutdown/busy-run-stop-now-fixture.mjs` and `native-standalone-host-fixture.mjs` (need a built server and their scripted model; API/E2E); live native agent E2E with a real model (AC-001 to AC-013, ASM-002; test vault, API/E2E); Background Tasks panel in a browser or the desktop app (no frontend change).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no frontend code changed. The web Background Tasks panel and the system-notice card consume the existing `BACKGROUND_TASK_UPDATED` and `SYSTEM_TASK_NOTIFICATION` contracts, which the native backend now also produces (unit/integration-tested). Rendering of native rows is for API/E2E to observe.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/AC-007: live native agent starts `sleep 5; echo done` with `run_in_background`; result < 2 s; `tail -n 5 <outputFile>` while running and after.
- AC-002/AC-003/AC-004: busy vs idle notice; three commands ending within 1 s → one notice; idle notice within 5 s of the end.
- AC-005: `npm run dev`-like command with children; `kill <pid>` via run_bash: no process of the group left; the kill's result carries the end (signal); panel row `stopped`; no later notice.
- AC-006: Terminate a run with a running background command: group gone within 10 s; no notice.
- AC-009: delegated native copy idle with a running background command is not shut down after the grace period; re-armed after the end (set `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` low).
- AC-010: `(sleep 2; exit 7) & echo started`; `cmd & disown` not tracked, stopped at Terminate; job with children after `kill <pid>`.
- AC-011: journal of such a run; an old journal with `get_process_output`.
- AC-013: Stop during a background command; the notice still arrives.
- WSL: run `run-bash-wrapper.test.ts` (or the IMP-08 harness logic) on Windows with WSL; check the bridge exits when a detached process outlives the call.
- The shutdown e2e fixtures (changed here) should run once.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: all acceptance criteria at the live-agent level (AC-001 to AC-013), WSL, the panel, and the changed shutdown e2e fixtures. The implementation-scoped checks above do not substitute for them.
