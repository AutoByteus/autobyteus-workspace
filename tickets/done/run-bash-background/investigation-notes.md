# Investigation Notes

## Investigation Meta

- Package identifier: `run-bash-background` (Project Task `autobyteus-338`)
- Request / ticket: autobyteus-338 "Simplify native background commands: one run_bash that can run in the background and tells the agent when it finishes (design first; maybe retire the four background tools)"; read together with autobyteus-448 (idle agents not told after a restart that their background task was killed), whose text reached me only through 338's comment (`get_project_task` on 448 is out of scope for this run).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background` on `codex/run-bash-background`
- Resolved base remote / branch / revision: `origin/personal` @ `374e35a60e4d2f6a24eefcc709ba3ab6070da127` (fetched 2026-11-09)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the fetched base; `pnpm install --frozen-lockfile --filter autobyteus-ts` run in the worktree for the prototype.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate, 2026-11-09): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; also `/DESIGN.md` (rule 10 and the migration policy pointer, read early because the Task names it).
- Investigation status: Requirements-phase investigation complete; architecture-phase investigation starts after the user's decisions (requirements doc DEC-001 to DEC-005).

## Initial Request And Clarifications

- Original request: investigate and design a simpler way for native agents to run commands in the background, probably `run_bash` alone with a background option and a notification when the command finishes; compare keeping the four background tools plus a notice (a), run_bash only (b), or something between (c); idle-agent wake-up, batching, lifecycle, other runtimes, tool retirement and stored names, journal wording, and the load problems FU-003/FU-006 of autobyteus-333.
- Clarifications received: the user's comment of 2026-11-09 (in 338): GO; "our own run_bash should support this parameter, and then remove the other unneeded ones"; the design must say what the platform knows about background commands per run (the list 448 needs) and propose whether 448 is solved inside this Task or follows it.
- User-supplied facts and constraints: Claude's Bash has `run_in_background`; the user saw background work with completion notices work well in Claude Code; the platform already pushes notices into running agents (skill-update, tools-updated).
- Initial ambiguity: whether reading output and stopping need a tool at all; whether a notice may wake an idle agent; what happens at run end.

## Product And Domain Understanding

- Product area: native AutoByteus runtime (`autobyteus-ts` terminal tools) and the server's native backend, notices and run lifecycle.
- Affected actors or systems: agents on the native runtime (their model), the user watching a run, delegating agents waiting for task agents, the work journal, the Background Tasks panel, idle shutdown of delegated copies, restart resume.
- Existing purpose: let an agent run long commands (builds, test suites, dev servers) without blocking its turn.
- Relevant terminology: *background command* (a command the agent left running beyond its tool call); *completion notice* (a platform system notice that a background command ended); *run Terminate* (ends a run); *Stop* (interrupts the current turn); *idle shutdown* (a delegated copy is shut down after a quiet grace period).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-09 | Code | `autobyteus-ts/src/tools/terminal/tools/{run-bash,start-background-process,get-background-processes,get-process-output,stop-background-process}.ts` | The five tools | run_bash: `command`, `cwd`, `timeout_seconds` (default 30); its description already steers to `cmd > log 2>&1 &` and returns adopted `backgroundProcesses`. The four tools are thin wrappers over `BackgroundProcessManager` keyed by PID | — |
| 2026-11-09 | Code | `autobyteus-ts/src/tools/terminal/background-process-manager.ts` (102 lines) | Background registry | Per-agent PID map plus 1 MB output ring buffer per command. `startCommand` on completion sets `status='exited'` and **discards the exit code**. `stopAll()` exists but has no production caller (also FU-003 of busy-quit-shutdown-orphan) | E-1, P1, P4 |
| 2026-11-09 | Code | `background-process-context.ts` | Manager lifetime | One manager per agent context, stored as `_backgroundProcessManager` on the context; a new context (restore) gets a new empty manager | P4 |
| 2026-11-09 | Code | `command-execution/{shell-command-executor,native-command-process-scope,anchored-command-launcher,process-group-observer,posix-command-anchor-script}.ts` | How commands start, end and stop | Every command (foreground and background) starts through `NativeCommandProcessScope.start`: an anchor process owns a new process group; two `ps` snapshots establish identity within a 1.5 s budget; `handle.completion` resolves with `{kind:'result',code,signal}` / `interrupted` / `failed`. Foreground run_bash adopts surviving group members after the shell exits (`scope.members`) | Design reuse |
| 2026-11-09 | Code | `autobyteus-server-ts/src/compositions/native-command-shutdown.ts`, `build-studio-server.ts` L252-503 | Host lifetime | One `NativeCommandProcessScope` per server process, closed at server shutdown (`preClose`/`onClose`): all native commands are stopped at app quit | BEH-012 |
| 2026-11-09 | Doc | `autobyteus-ts/docs/terminal_tools.md` "Owned command lifetime and host shutdown" | Intended lifetime | "Ending an individual agent or completing a turn does not close the host scope or terminate its previews." Run end deliberately leaves commands running until host close | DEC-003 |
| 2026-11-09 | Doc | `tickets/done/busy-quit-shutdown-orphan/follow-ups.md` FU-003 | Earlier finding | "Native AutoByteus background processes outlive a run Terminate … a product decision" | DEC-003 |
| 2026-11-09 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` L106, L174-177, L200-240 | Native backend contract | `backgroundTaskInspection = unsupported`; `hasRunningBackgroundTasks()` returns `false` ("polled by the agent and not reported"); `dispatchUserInput` supports only `start_turn` ("AutoByteus does not support active-turn input append") | BEH-003, BEH-008 |
| 2026-11-09 | Code | `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` L150-195; `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts` | Input while busy | AgentRun queues input; with `activeTurnAppend: unsupported` a queued input becomes the next turn when the active turn ends. An idle native run starts a turn on input at once | REQ-003 |
| 2026-11-09 | Code | `autobyteus-server-ts/src/tool-list-updates/services/tool-list-update-service.ts`, `tool-list-update-notice-builder.ts`; `skill-update-notices/…`; `restart-resume/restart-notice.ts` | The existing notice path | Busy runs: `AgentRun.postUserMessage(SYSTEM message with sender_id, suppression and preface metadata)` and a `SYSTEM_TASK_NOTIFICATION` event once forwarded. Idle runs: tool/skill notices wait for the next external input (`AgentRunInputPreface`) and **never wake** an idle run; the restart notice wakes a run on purpose | REQ-002/003 |
| 2026-11-09 | Code | `autobyteus-server-ts/src/agent-execution/domain/system-task-notification-senders.ts` | Notice senders | `system.claude_background_task` (Claude), `system.skill_update_notifier`, `system.tool_list_update_notifier`, `system.restart_resume`, … | New sender needed |
| 2026-11-09 | Code/Doc | `claude/session/claude-background-task-registry.ts`; `docs/modules/agent_execution.md` L815-905 | Claude runtime | Claude CLI `Bash` `run_in_background`; tasks tracked by `ClaudeBackgroundTaskRegistry`; a completion **starts a turn the CLI opens itself** after a `SYSTEM_TASK_NOTIFICATION` ("Background task completed: …"); completions carry an output file; `TaskOutput` / `TaskStop` tools; run Terminate/close stops its tasks; Stop leaves them running; delegated copies are not idle-shut-down while one runs | Other runtimes |
| 2026-11-09 | Code/Doc | `antigravity/stream/agy-background-task-monitor.ts`; `docs/modules/antigravity_cli_runtime.md` L285-320 | AGY runtime | `run_command` with `IsDaemon`/`RunPersistent`; daemon exit detected by polling AGY message files every 2 s; reported as background tasks; "a daemon's exit starts no turn"; stop of AGY stops tasks | Other runtimes |
| 2026-11-09 | Code/Doc | `codex/thread/codex-background-task-view.ts`; `agent_execution.md` "Read-only Codex background-task inspection" | Codex runtime | Provider-tracked background terminals, read-only snapshot inspection; no completion wake in our integration; `hasRunningBackgroundTasks` false for idle shutdown | Other runtimes |
| 2026-11-09 | Code | `grok/grok-build-tool-projection.ts` L107, `deepseek-harness/…-tool-projection.ts` L92, `acp/backend/acp-agent-run-backend.ts` L67, L95 | Grok Build / DeepSeek harness (ACP) | Their shell tools (`run_terminal_command`, `bash`) are projected as `run_bash`; ACP reports no background tasks | Other runtimes |
| 2026-11-09 | Code/Doc | `agent-execution/domain/agent-background-task.ts`; `docs/modules/agent_team_execution.md` L670-690; `standalone-host-idle-shutdown.ts` | Shared background-task vocabulary | `BACKGROUND_TASK_UPDATED {task_id, kind, description, command, status, summary, started_at}` drives the web Background Tasks panel and re-arms idle shutdown when a task ends; `hasRunningBackgroundTasks()` keeps a delegated copy from idle shutdown. Native reports none | REQ-010 |
| 2026-11-09 | Code | `restart-resume/{busy-run-recorder,busy-run-record,restart-resumer}.ts` | autobyteus-285 | Records only runs `running`/`initializing` at graceful shutdown; resumes after an update with a notice. Idle runs with background commands are not recorded: the gap 448 describes | DEC-004 |
| 2026-11-09 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts` L8-13; `autobyteus-agent-tool-resolver.ts` L133-137 | Stored tool names | `run_bash`, `read_file`, `edit_file`, `write_file` are always given to native agents; unknown names in a definition are skipped with a warning | REQ-008, no migration |
| 2026-11-09 | Doc | `tickets/done/read-file-media-merge/requirements-doc.md` DEC-001, DEC-002; `design-spec.md` L11 | Precedent autobyteus-328 | Retired `read_media_file`: no app-data migration (user decided), rule 10 not engaged (a removal absorbed by an always-present tool, not a rename); public package files changed in a separate ticket after a stable release | DEC-008 |
| 2026-11-09 | Code | `autobyteus-server-ts/src/agent-work-journal/rendering/runtimes/autobyteus-translation.ts` L73-80, L170-200; `journal-actions.ts` L21, L100-110; `docs/modules/agent_work_journal.md` L168-186 | Journal vocabulary (autobyteus-331) | `Command: <cmd> (background)`; `Read output of background task <id>`; `Stop background task <id>`; system notices render as `Notice:`; Claude's `Bash run_in_background` already renders `(background)` | REQ-012 |
| 2026-11-09 | Code | `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent-config.json` | Built-in agent | Lists `get_process_output`, `start_background_process`, `stop_background_process` | REQ-008 |
| 2026-11-09 | Command | `git grep -l -E "start_background_process\|get_background_processes\|get_process_output\|stop_background_process" origin/main` in `/Users/normy/autobyteus_org/autobyteus-agents` (`45012f0`) | Public package files | 35 files: 34 `agent-config.json` (every one also lists `run_bash`) and `agents/agent-package-creator/skills/agent-package-creation/references/package-anti-patterns.md` L125. List: `agents-package-files-naming-background-tools.txt`. The private agents repo names them in 18 files | REQ-008, DEC-008 |
| 2026-11-09 | Data | `rg` over `~/.autobyteus/server-data/memory` raw traces (12 GB, local) | How native agents use the tools | Trace files naming each tool as `tool_name`: `start_background_process` 55 files (147 trace lines), `get_process_output` 30 (103), `stop_background_process` 21 (56), `get_background_processes` 0; `run_bash` 7,803 files. Lines count both call and result traces | Usage is real but light; nobody lists |
| 2026-11-09 | Data | `rg -l` over `~/.autobyteus/server-data/memory` for `"tool_name":"TaskStop"`, `KillShell`, `KillBash`, `TaskOutput`, `BashOutput`, `"run_in_background":true`, and commands containing `kill`/`pkill` | How Claude agents stop and read background work in practice | Trace files: `run_in_background:true` 454; `TaskStop` 4; `TaskOutput` 1; `KillShell`/`KillBash`/`BashOutput` 0; shell commands with `kill`/`pkill` 557 (all runtimes). Claude agents start background work often and almost never use the dedicated stop/output tools; they use shell commands | Supports the user's DEC-001 B |
| 2026-11-09 | Doc | `tickets/done/read-file-media-merge/follow-ups.md` FU-003, FU-006; `tickets/done/code-quality-leftovers/follow-ups.md` FU-003 | Load problems | FU-003: native command start (`ps` snapshots, 1.5 s budget) fails under heavy load (load average 13-55); FU-006: one `pwd` under load printed the test process's directory, cause not found. Both affect every run_bash call, foreground included | DEC-005 |
| 2026-11-09 | Data | `rg` over `~/.autobyteus/server-data/memory` for `Command control deadline exceeded`, `Command failed: ps -axo`, `Command anchor is not a live exclusive process group` | Have FU-003/FU-006 start failures hit real native agents? | Every hit (6 team runs, 2026-11-01 to 11-09) is a Claude agent running the `autobyteus-ts` test suite or quoting the follow-up text; **0** native `run_bash`/`start_background_process` results carry these errors | DEC-005: seen only in test runs under heavy load |
| 2026-11-09 | Command | Prototype `prototype/background-completion.prototype.test.ts`, log `prototype/prototype-run.log` | Feasibility | See Runtime findings P1-P5 | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Agent wants a long command to run while it keeps working | Two paths: `run_bash` with shell `&` (adopted survivors listed in `backgroundProcesses`) or `start_background_process` (returns `pid`) | Command runs; result returns at once with PIDs | tool sources; P3 | High |
| BEH-002 | System | Agent wants to know when the command ends | Agent must poll `get_process_output` (status `running`/`exited`) | No exit code is ever reported (start path discards it; `&` path never had it); a forgotten poll means the agent never learns | manager L43-46; P1, P3 | High (Reproduced) |
| BEH-003 | System | Command ends while the agent is idle | Nothing happens | Agent is never told | backend L174-177 | High |
| BEH-004 | System | Agent reads output | `get_process_output(pid, lines)` from a 1 MB in-memory ring buffer; `&` with redirection captures nothing | Lost when the run's context goes | manager; docs | High |
| BEH-005 | System | Agent stops a command | `stop_background_process(pid)`: verified group stop through the scope | `stopped` / `not_found` | tool; P5 | High |
| BEH-006 | System | Agent lists its commands | `get_background_processes` | Never used in 12 GB of local traces | data count | Measured |
| BEH-007 | Operational | User Terminates or deletes a run, a Task closes a task agent, a delegated copy is idle-shut-down | Run ends; its background commands keep running, invisible to any agent, until the app quits | Restored run cannot see or stop them | P4; docs; FU-003 (284) | High (Reproduced) |
| BEH-008 | Operational | Delegated native copy waits for its background command | Idle shutdown after the grace period (default 10 min) | The copy is shut down while its build runs; BEH-007 follows | team docs L670-690; backend L174-177 | High (Read) |
| BEH-009 | User | User opens the Background Tasks panel of a native run | `unsupported` | No native rows | backend L106 | High |
| BEH-010 | System | App quits or restarts (update) | Host scope close stops every native command | Busy runs resumed after an update (285); idle runs not told (448) | native-command-shutdown.ts; restart-resume | High |
| BEH-011 | System | User presses Stop (interrupt) | Foreground command is stopped (`tool-abort`); background commands keep running | — | shell-command-executor L20-27 | High |
| BEH-012 | Contract | Stored agent definitions name tools | Unknown names skipped; `run_bash` always present | Definition still starts | resolver; exposure | High |
| BEH-013 | User | User reads a native run's work journal | `start_background_process` → `Command: … (background)`; `get_process_output` → `Read output of background task <pid>`; `stop_background_process` → `Stop background task <pid>` | Historical journals render recorded calls | journal translation | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `NativeCommandProcessScope` (host lifetime) | Leases, verified group stop, close at host shutdown | Background mode can reuse it unchanged | Per-run ownership of leases is needed for "stop at run end" |
| `AnchoredCommandHandle.completion` | Exactly-once settlement with exit code/signal | Everything a completion notice needs exists (P1) | Who observes it and turns it into a notice |
| `BackgroundProcessManager` | Per-agent PID view and ring buffers | Becomes the per-run background command registry | Keep exit code, output file, end event; per-run stop |
| `AgentRun.postUserMessage` + `SYSTEM_TASK_NOTIFICATION` | The platform notice path | Completion notice uses it; native input while busy becomes the next turn | New sender id; memory/journal recording follows the existing notices |
| `AgentRunBackend.hasRunningBackgroundTasks` / `BACKGROUND_TASK_UPDATED` | Cross-runtime background-task contract | Native can report like Claude/AGY | Backend must observe manager changes |
| Native foreground `run_bash` `&` adoption | Lists survivors | P3 shows two rows for one `(… ) &`, no exit code | Keep ownership, stop listing (DEC-006) |
| Restart resume (285) | Busy runs only | 448 needs the per-run background list at shutdown | REQ-013 supplies it |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Tool schemas exposed to models (run_bash; the four tools); tool descriptions.
- Built-in template `daily-assistant/agent-config.json`; 35 public package files, 18 private package files (other repositories).
- Work-journal fixtures naming the tools (`tests/fixtures/agent-work-journal/work-journal-builtin-tools.json`, `synthetic-run-traces.ts`).
- Docs: `autobyteus-ts/docs/terminal_tools.md`, `autobyteus-server-ts/docs/modules/{agent_tools,agent_work_journal,agent_execution,agent_team_execution}.md`.

### Structural Surfaces

- `autobyteus-ts` terminal tools and manager; tool registration (`register-tools.ts`).
- Server native backend (`autobyteus-agent-run-backend.ts`), notice services, `system-task-notification-senders.ts`, agent memory's recorded notice senders.
- Run lifecycle: terminate, Task close, idle shutdown (reads `hasRunningBackgroundTasks`).
- Evidence paths: Source Log above.

### Potential Structural Impacts To Investigate

- API or external-contract change: model-facing tool set (run_bash schema; retired tools). No GraphQL/REST change expected; `BACKGROUND_TASK_UPDATED` already exists.
- Persistence schema or invariant change: none expected (output files are temporary; stored definitions untouched).
- Security or privacy boundary change: output files on disk hold command output (as `> log` does today); location and cleanup to design.
- Concurrency or lifecycle change: yes (completion observation, batching, wake, per-run stop at run end).
- Deployment/migration: no app-data migration (precedent 328).
- Confirmed: present (lifecycle), absent (persistence), unknown (none material).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| P1 prototype on the real anchored launcher, scope and `ps` | Three background starts | 3 starts took 365-373 ms in total (≈120 ms each, unloaded); completions arrived with `{kind:'result',code:0}` and `{code:3}`; the output tail was available | Measured / Reproduced | REQ-001/002 feasible with the existing scope; exit code is available but discarded today | `prototype/prototype-run.log` |
| P2 batching | Ends 80-180 ms apart | A 300 ms window split them into 2 notices; a 1,000 ms window gave 1 notice | Reproduced | Batching must be by delivery moment plus a short settle window, not a tight fixed window (REQ-004) | same |
| P3 run_bash `(sleep 0.5; exit 7) &` today | Shell `&` | Two adopted entries (subshell and `sleep`) for one command; after the end `status:'exited'`, no exit code anywhere | Reproduced | Shell `&` cannot carry a completion notice with an exit code; DEC-006 | same |
| P4 drop the per-agent manager (what Terminate does today) | Run end | `sleep 30` still alive after the manager is dropped; stopped only by `scope.close()` | Reproduced | BEH-007; REQ-009 needs per-run stop | same |
| kill-pid probe (`prototype/kill-pid-probe.mjs`, log beside it) | Agent runs `kill <pid>` on a command with children, inside an anchor-like group whose leader ignores SIGTERM | Plain `bash -c <cmd>`: the command's bash dies, its subshell and both `sleep`s keep running. Wrapped with `trap 'trap - TERM; kill -TERM 0' TERM; <cmd> & wait $!`: no process of the command remains; the leader survives (as the real anchor does) | Reproduced | REQ-007 feasible with a launch wrapper | `prototype/kill-pid-probe.log` |
| shell-stays-parent probe (2026-11-10, bash 3.2.57 macOS; script inline in the conversation, not kept) | `(sleep 1; exit 7) & (sleep 0.3; exit 3) & echo …` run by a wrapper shell that, after the foreground part, stays alive and reaps its `&` jobs | Foreground done at +0.01 s with both job pids; `JOB_ENDED exit=3` at +0.33 s, `exit=7` at +1.04 s. A `disown`ed child: 0 jobs known | Reproduced | A parent that knows `&` jobs is possible for jobs the run_bash shell starts itself; detached children (disown, nohup, setsid, daemons) stay unknowable | user question 2026-11-10 |
| Wrapper skeleton probe (SR-004): `prototype/wrapper-skeleton-probe.sh`, log beside it | The corrected wrapper (both forms) in its own process group, bash 3.2.57 and sh | 11 of 11 as intended: exit 3; `set -e` failing job reported 3 and failing foreground rc 1; `set -x` shows only the user's line; a user EXIT trap stops its server at command end (143); `exec >/dev/null 2>&1` keeps frames and marker; two jobs 3 and 7; background form: `kill <pid>` leaves nothing (bash) and exit 5 (sh); killed job's pid gone 13 ms after `kill`; plain `&` job with children: children remain after `kill <pid>` | Reproduced | Command Wrapper Contract; DEC-012 narrowing; AR-006 settle bound | `prototype/wrapper-skeleton-probe.log` |
| P5 stop by id | Stop | Outcome `stopped`; completion reads `{kind:'result',code:null,signal:'SIGTERM'}` | Reproduced | A stop on request must be known to the platform (by the stop path) to suppress or label its notice | same |

- Temporary diagnostics: the prototype was copied to `autobyteus-ts/tests/prototype-338.test.ts` only to be collected by vitest, run, and deleted after each run (worktree only, never committed).
- Reproduction for implementation to start from: `tickets/in-progress/run-bash-background/prototype/background-completion.prototype.test.ts` (command in its header). P3 and P4 describe today's behavior that the change replaces; P1/P2/P5 show the target mechanics.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user (Task 2026-10-30) | Polling costs tokens and models forget; Claude Code's background + notice works well | Direct | REQ-001-004 | — |
| The user (comment 2026-11-09) | run_bash gets a run-in-background parameter like other runtimes; remove the unneeded tools | Direct | DEC-001 | Whether a stop tool counts as "needed" |
| The user (448, via 338 comment) | Idle agents waiting for a background task must be told after a restart | Direct | DEC-004, REQ-013 | Inside or after |
| Local traces | `get_background_processes` never used; start/output/stop used in tens of runs | Measured | Listing tool not needed | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Code CLI background Bash | SDK 0.3.280 / CLI 2.1.283 per repo docs | `run_in_background`, output file, `TaskOutput`, `TaskStop`, completion starts a turn | `agent_execution.md` L815-905; registry `outputFile` | Read, not re-run here |
| POSIX process groups | OS | `kill -TERM -<pgid>` stops a whole group; the anchor ignores SIGTERM | anchor script L9 | PGID reuse after the group ends (option b) |

## Persisted Data And State Facts

- Affected stored subject: `toolNames` in agent definitions (app data, the built-in template, package repositories).
- Current readers: native tool resolver skips unknown names; `run_bash` is always added.
- Required semantics: a definition naming retired tools keeps starting and keeps background capability through `run_bash`.
- Acceptable: leftover names stay in stored definitions (harmless, removable in the editor).
- Output of background commands: today in memory only; nothing persisted.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `prototype/background-completion.prototype.test.ts` | Solution Designer | Feasibility prototype P1-P5 | Mechanics only, not production code | REQ-001-004, REQ-007, REQ-009 | Current | Evidence; not behavior-defining |
| `prototype/prototype-run.log` | Solution Designer | Prototype run output (4/4 passed) | — | same | Current | Evidence |
| `agents-package-files-naming-background-tools.txt` | Solution Designer | The 35 public package files | — | REQ-008, DEC-008 | Current | Evidence; hand-over list |
| `options-report.md` | Solution Designer | The report for the user: options, evidence, recommendation | — | DEC-001-DEC-005 | Current | Presented for the user's decisions |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-1 | Risk | Waking an idle agent costs a turn per notice | Token spend | Batching, one entry per command end, no notice for own stops/run end; visible as a Notice | Addressed in REQ-004/005 |
| R-2 | Risk | Option (b): a stop through `kill` in run_bash is not known to the platform: its notice cannot be suppressed (a likely extra turn) and a PGID could be reused after the group ended | Spend; wrong process | DEC-001 | Decided by the user: option B. Mitigated: the kill-pid probe shows a TERM-forwarding wrapper makes `kill <pid>` stop the whole command (plain launch leaves 3 of 4 processes); the agent kills the command pid, not a group id, so no group-id reuse; the extra turn is avoided by REQ-015 in the common case |
| R-3 | Risk | FU-003 start failures under load affect background starts too | Reliability | DEC-005 | Open (user) |
| U-1 | Unknown | Exact text of 448 (out of read scope) | DEC-004 boundary | Taken from the user's words in 338's comment | Accepted |

## Architecture Investigation Findings

To be extended after the requirements basis is approved.

## Requirement Implications

- Exit code and output are available at completion without new process machinery (P1): a notice is cheap to build.
- Shell `&` is not a usable background mechanism for notices (P3): the background option must launch the command as its own anchored command.
- Run end leaves commands running and invisible (P4): either keep that (documented intent) or stop them; this is the user's call (DEC-003).
- Native input while busy becomes the next turn: a notice to a busy native agent arrives right after its current turn.
- The listing tool is unused; output reading can move to a file; stopping is the only capability that needs the platform to know who asked (P5, R-2).

## Notes For Architecture Design

- Map SCN-001 to SCN-010 of the requirements doc.
- Verify: where the completion observer lives (autobyteus-ts manager event vs server backend), memory recording of the new notice sender, output-file location and cleanup, per-run lease ownership for stop-at-run-end, `hasRunningBackgroundTasks` and `BACKGROUND_TASK_UPDATED` emission from the native backend, Windows/WSL behavior of background mode.
