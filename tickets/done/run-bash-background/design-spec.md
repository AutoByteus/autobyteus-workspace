# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (ARCH-REV-002 items AR-003 IFS, AR-007 chain, AR-010; SR-004 answered ARCH-REV-001)
- Approved requirements baseline: `requirements-doc.md` at SR-004 (AR-002 narrowing approved by the user, 2026-11-10); SR-003 (DEC-006 both ways, the user, 2026-11-10); SR-001 approved by the user on 2026-11-09 in the Solution Designer conversation (DEC-001 option B "we return the pid … use bash to kill it"; DEC-004 448 separate; "I'll agree with your … recommended decisions" for DEC-002, DEC-003, DEC-005).
- Behavior-defining supplements: none (prototype and probes are evidence).
- User approval of the design: `Not required` (the Task asked for the user's decision before building; the user decided every open question at requirements level).
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/run-bash-background/investigation-notes.md`
- Authorities read (2026-11-09): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (rules 7-12, project documents list), `/GLOSSARY.md` (no "background" entry). Data Migration Guideline not needed: no persisted data changes (see Persisted Data).
- Project design-principle conflicts or discrepancies: DESIGN.md rule 10 (stored names follow renames) does not apply: this is a removal absorbed by the always-present `run_bash`, the same disposition the user chose for `read_media_file` in autobyteus-328. Recorded, no conflict.

## Current-State Read

- Every native command, foreground or background, starts through the host-wide `NativeCommandProcessScope.start` (`autobyteus-ts/src/tools/terminal/command-execution/native-command-process-scope.ts` L21-45): an anchor process owns a new process group; `AnchoredCommandHandle.completion` settles once with `{kind:'result',code,signal}` / `interrupted` / `failed` (`anchored-command-launcher.ts` L10-11, L79-85).
- Per agent, `BackgroundProcessManager` (`background-process-manager.ts`, 102 lines) holds a PID map and 1 MB ring buffers; it is attached ad hoc to the agent context by `getBackgroundManager` (`background-process-context.ts` L14-30). On completion it records only `status='exited'` (L43-46): the exit code is dropped. `stopAll()` (L88-96) has no production caller.
- Foreground `run_bash` adopts surviving group members after the shell exits and lists them as `backgroundProcesses` (`shell-command-executor.ts` L38-45; prototype P3: two rows for one `( … ) &`, no exit code).
- The native backend reports no background work (`autobyteus-agent-run-backend.ts` L106 `backgroundTaskInspection: unsupported`, L174-177 `hasRunningBackgroundTasks(): false`) and accepts only `start_turn` input (L200-210): input posted while a native turn runs becomes the next turn (`agent-run-input-admission-state.ts` L170-185).
- Platform notices go through `AgentRun.postUserMessage` with a SYSTEM message carrying `sender_id`, suppression and preface metadata (`tool-list-update-notice-builder.ts` L29-35, `restart-notice.ts` L37-47); native memory records the preface as a `system_task_notification` trace (`memory-ingest-input-processor.ts` L54-62) and the journal shows `Notice:`. Notice sources plug into `AgentRunPlatformNotices` (`agent-run-platform-notices.ts`), wired in both hosts (`build-studio-server.ts` L376, `start-standalone-application-host.ts` L272).
- The runtime-neutral `BACKGROUND_TASK_UPDATED` event (`agent-background-task.ts`) feeds the web Background Tasks panel and re-arms delegated idle shutdown (`standalone-agent-run-root.ts` L412, `agent-org-run.ts` L337, `team-task-execution-service.ts` L50); `hasRunningBackgroundTasks()` keeps a copy from idle shutdown (`agent_team_execution.md` L670-690). Claude and Antigravity produce it.
- Run end: native Terminate removes the agent (`autobyteus-agent-run-backend.ts` L290-330); the worker loop's `finally` runs `AgentShutdownOrchestrator` (`agent-worker.ts` L222-236; steps: LLM, tools, MCP). No step touches background commands (prototype P4: they survive until host close).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: two packages and several owners: every `run_bash` call now runs through one command wrapper with a foreground-done signal (executor completion rule, anchor control frames), the manager rewrite, output log, a new agent shutdown step; server native backend, the `AgentRunBackend` contract (every backend declares the new capability), `AgentRun`, a new notice subsystem wired in both hosts, the journal translation, the built-in template, five docs and the glossary; four tools removed.
- Architectural risk: `High`
- Risk rationale: model-facing tool contract changes (run_bash schema and result; four tools removed); **every run_bash call changes how it ends** (foreground-done frame instead of shell exit); a shared backend contract gains a capability; new asynchronous behavior (timers, waking an idle run, batching, end attribution); lifecycle change (run end stops commands; idle shutdown waits for native commands).
- Escalation trigger: if the wrapper changes the result of ordinary foreground commands (exit code, output, `exit`/`set -e`/heredoc/quoting), adds measurable latency (> 20 ms per call), or a killed command's end regularly arrives after the kill's `run_bash` returned, return a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Prototype P1/P2 | `prototype/background-completion.prototype.test.ts`, `prototype-run.log` | Completion carries exit code; tail available; 300 ms window split 3 ends, 1 s batched them | Manager records the end; notice settle 2 s | — |
| Prototype P3 | same | Shell `&` survivors: no exit code, duplicate rows | Listing by post-exit survivors replaced: the wrapper names its jobs in `FOREGROUND_DONE` (`backgroundTasksStarted`) | — |
| Prototype P4 | same | Dropping the manager leaves commands running | New shutdown step stops them | — |
| Kill probe | `prototype/kill-pid-probe.{mjs,log}` | Plain launch: `kill <pid>` leaves 3 of 4 processes; with `trap 'trap - TERM; kill -TERM 0' TERM; … & wait $!` none remain; the anchor survives (it ignores TERM) | Background launch wrapper | Edge shells (heredoc in command) to verify in tests |
| Code | `agent-run-platform-notices.ts`; `tool-list-update-service.ts` | Notice sources are `AgentRunInputPreface & AgentRunLifecycleObserver`; busy delivery by `postUserMessage` | New notice source reuses the slot and the post path | — |
| Code | `memory-ingest-input-processor.ts` L54-62 | Preface metadata → `system_task_notification` trace | Notice recorded and journaled without memory changes | — |
| Code | `agent-worker.ts` L222-236; `agent-shutdown-orchestrator.ts` | Shutdown steps run at every agent stop | Run-end cleanup as a shutdown step | — |
| Code | `memory-sync-path-policy.ts` | Memory folders are synced to the hub | Output files go to the OS temp area, not the memory folder | — |
| Data | local traces | Claude agents: `run_in_background` 454 files, `TaskStop` 4, `TaskOutput` 1 | No stop/output tool (user's DEC-001) | — |
| Wrapper skeleton probe (SR-004/005) | `prototype/wrapper-skeleton-probe.sh`, `wrapper-skeleton-probe.log` (bash 3.2.57, macOS) | 12 cases pass (case 12, SR-005: strict mode `set -euo pipefail; IFS=$'\n\t'` with two jobs reports 3 and 7): exit 3; `set -e` with a failing job (job 3 reported) and a failing foreground (rc 1); `set -x` (only the user's trace line); a user EXIT trap stops its server at command end (job reported 143); `exec >/dev/null 2>&1` (frames and marker still arrive); two jobs (3, 7); background form under bash: `kill <pid>` leaves nothing; background form under `sh` (5); `kill -0` on a killed job fails 13 ms after the kill; plain `&` job with children: children remain after `kill <pid>` (accepted narrowing) | Command Wrapper Contract | WSL and Linux bash not run here (implementation tests) |
| Shell-stays-parent probe (2026-11-10) | investigation notes, Runtime findings | bash 3.2: after the foreground part the shell reports its `&` job pids (+0.01 s) and, polling `kill -0` and `wait <pid>`, each job's exit code as it ends (3 at +0.33 s, 7 at +1.04 s); a disowned job is unknown | One wrapper for every call; plain `&` jobs become background tasks (DEC-006) | `exec` in a command replaces the wrapper (falls back to today's behavior) |

## Intended Change

Every `run_bash` call runs through one command wrapper: the user's command runs in the wrapper shell; when its foreground part ends the wrapper sends a control frame (exit code, pids of `&` jobs still running) and the call returns; the wrapper then stays alive as the parent of those jobs and sends a frame with each job's exit code or signal as it ends. `run_in_background: true` is the same path with the whole command as the one job (it also forwards TERM so `kill <pid>` stops everything the command started). Each job is a background task tracked by the agent's `BackgroundProcessManager`, with its output in a per-call file. Ends seen during the agent's own `run_bash` call are reported in that call's result; the rest are delivered by a new platform notice source as one batched SYSTEM notice (waking an idle run after a 2 s settle, or after a busy run's turn). The native backend reports background tasks (panel, idle shutdown). A new shutdown step stops a run's commands at run end. The four background tools are removed. Jobs that detach themselves are not tracked.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-007. Areas: `autobyteus-ts` terminal tools/manager/launch, agent shutdown steps, package exports; server native backend, `AgentRunBackend` capability + `AgentRun` facade, new `background-task-notices` subsystem and its wiring in both hosts, system notice sender ids, journal translation, built-in Daily Assistant template, docs (`terminal_tools.md`, `agent_tools.md`, `agent_work_journal.md`, `agent_execution.md`, `agent_team_execution.md`), `GLOSSARY.md`.
- Derived consumers: `TerminalResult` JSON (model sees it; journal `runBashResult` reads `stdout`/`stderr`/`exitCode`/`timedOut` only: unaffected); `BACKGROUND_TASK_UPDATED` consumers (web store, idle-shutdown re-arm in three roots, standalone host idle shutdown): unchanged contract, now also fed by native; `hasRunningBackgroundTasks` (quiet check): native now true while a command runs.
- Deliberately left alone: other runtimes' background behavior; restart resume / 448; FU-003/FU-006 start robustness; interactive terminals; agent package repositories; Codex snapshot inspection; the web panel UI.
- Follow-ups: None found during design.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / ACs | Trigger | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, AC-001 | `run_bash(run_in_background: true)` | Current-State bullets 1-3 | Starts at once; returns pid, cwd, output file | DS-001 |
| BEH-002 | System | REQ-002/004/015, AC-002/004/005 | command ends | P1, P2 | End recorded; reported in a run_bash result or one notice | DS-002, DS-003, DS-004 |
| BEH-003 | System | REQ-003, AC-003 | end while idle | backend L174-177 | Notice wakes the run | DS-004 |
| BEH-004 | System | REQ-006, AC-007 | agent reads output | manager | `tail <outputFile>` | DS-001 (file) |
| BEH-005 | System | REQ-007, AC-005 | `kill <pid>` via run_bash | kill probe | Whole command stops; end reported | DS-003 |
| BEH-006 | System | REQ-008, AC-008 | — | tool files | Tools removed | Removal plan |
| BEH-007 | Operational | REQ-009, AC-006 | Terminate, delete, Task close, root stop | P4 | Commands stopped, no notice | DS-005 |
| BEH-008/009 | Operational/User | REQ-010, AC-009 | idle grace; panel | backend L106, L174 | Native reports background tasks | DS-002 |
| BEH-010 | System | REQ-013, AC-012 | live run | — | Manager lists commands | DS-002 |
| BEH-011 | User | REQ-014, AC-013 | Stop | executor L20-27 | Unchanged: background keeps running | — |
| BEH-012 | Contract | REQ-008, AC-008 | run start | resolver L133-137 | Unchanged: unknown names skipped | — |
| BEH-013 | User | REQ-012, AC-011 | journal | translation L73-80 | `(background)` line; `Notice:`; old converters kept | DS-001 |
| BEH-014 | System | REQ-011, AC-010 | `cmd &` in a foreground call | P3; shell-stays-parent probe | Call returns at foreground end; each live job is a background task (start listed, end reported); detached jobs untracked | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `prototype/background-completion.prototype.test.ts` + log | Mechanics of start/end/batch/stop | REQ-001-004, 009 | Basis of DS-001/002 | Evidence |
| `prototype/kill-pid-probe.mjs` + log | `kill <pid>` with a wrapper | REQ-007 | Basis of the launch wrapper; start of the implementation's wrapper test | Evidence |
| `agents-package-files-naming-background-tools.txt` | 35 public files | REQ-008 | Hand-over for the later package Task | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (feature plus removal).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - Capability-area reuse: status, events, notices, shutdown are needed. Reused: `BACKGROUND_TASK_UPDATED`, `AgentRunPlatformNotices`, `postUserMessage`, `AgentShutdownOrchestrator`.
  - Legacy cleanup: the four tools and the `backgroundProcesses` listing are replaced; removed, not kept.
  - Behavior by absence: today "the agent is never told" and "commands outlive the run" follow from nothing handling them; the design gives each an explicit owner and rule.
  - Responsibility overload (prevented): the manager would grow past one concern with output files; output logging is its own file.
  - Several kinds or forms: `run_bash` has two entry forms (foreground, background); each is traced (DS-001, DS-003). Commands end three ways (own exit, agent kill, platform stop); each is attributed (DS-002/005).
- Root cause classification: `Boundary Or Ownership Issue`: the end of a command has no owner that turns it into something the agent or the platform sees, and the run's lifetime does not own its commands.
- Refactor needed now: `Yes`, bounded: the manager becomes the per-run owner of background command records (start, end, attribution, stop at run end); output logging split out.
- Evidence: Current-State bullets 2, 4, 6; P1, P3, P4.
- Design response: see spines and file mapping.
- Intentional deferrals: the ad hoc `_backgroundProcessManager` attachment stays (one accessor, `getBackgroundManager`, used by tools, backend and shutdown step); making it a declared `AgentContext` member is cosmetic here. Residual risk: none for this scope.

## Terminology

- **Background task** (platform word, new in `GLOSSARY.md`): work a run started that continues beyond its tool call and is reported separately (`BACKGROUND_TASK_UPDATED`, Background Tasks panel, notices). For the native runtime a background task is either a command started with `run_bash(run_in_background: true)` or an `&` job of a foreground `run_bash` call that was still running when the call's foreground part ended. Processes that detach themselves are not background tasks.
- **Background process** (native terminal layer only): the OS process group of a native background command; `BackgroundProcessManager` keeps the native word, as today.
- **Background task notice**: the platform SYSTEM notice telling a run that background tasks it started have finished (sender `system.background_task_notifier`).
- **Unreported end**: a recorded end not yet included in a run_bash result or a notice.

## Legacy Removal Policy (Mandatory)

- Obsolete: the four tool files and their registration; `BackgroundProcessOutput`; the `backgroundProcesses` field of `TerminalResult`; listing adopted survivors; the manager's in-memory output ring as the read path.
- Compatibility wrappers kept: `None`. The journal converters for the four retired names stay because recorded traces in existing journals still reach them (REQ-012): they are live code for historical data, not a compatibility path for the tools.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: `toolNames` in agent definitions (app data, built-in template, package repos); recorded traces and journals naming the retired tools.
- Change: tool names disappear from the registry.
- Reader behavior: the native resolver skips unknown names with a warning (`autobyteus-agent-tool-resolver.ts` L133-137); `run_bash` is always added (`autobyteus-runtime-tool-exposure.ts` L8-13). Journal converters keep rendering recorded calls.
- Decision: `Directly Usable — No Migration`.
- Rationale: nothing breaks and no capability is lost (run_bash has it); same disposition the user chose in autobyteus-328. Output files are temporary runtime state, not persisted app data.
- Supports: AC-008, AC-011.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 004, 013, 014 | model calls `run_bash` (foreground with `&` jobs, or `run_in_background`) | tool result at foreground end: exit code, output, started background tasks (pid, text, output file) | `run_bash` tool + `BackgroundProcessManager` | Starting background work, both entry forms |
| DS-002 | Return-Event | BEH-002, 008, 009, 010, 014 | wrapper `JOB_ENDED` frame (or the wrapper's own exit for a call whose control was lost) | `BACKGROUND_TASK_UPDATED` published; end recorded unreported | `BackgroundProcessManager` → native backend | Every end becomes a fact the platform sees |
| DS-003 | Primary End-to-End | BEH-002, 005 | model calls foreground `run_bash` (e.g. `kill <pid>`) | result includes ends seen during the call | `run_bash` tool via manager | Reporting where the agent already is (REQ-015) |
| DS-004 | Primary End-to-End | BEH-002, 003 | end published for a run with unreported ends | one SYSTEM notice delivered (new turn, or preface on the next input) | `BackgroundTaskNoticeService` | The completion notice |
| DS-005 | Primary End-to-End | BEH-007, 014 | run Terminate / Task close / root stop / delete | commands stopped, output folder removed, no notice | `BackgroundProcessCleanupStep` | Run owns its commands |
| DS-006 | Bounded Local | BEH-002/003 | end event | flush after settle when idle | `BackgroundTaskNoticeService` per-run state | Batching and wake policy |

## Primary Execution Spine(s)

- DS-001: `Model tool call -> run_bash tool (marks call start) -> BackgroundProcessManager.run(command, cwd, {background}) -> CommandWrapper script -> NativeCommandProcessScope.start -> AnchoredCommandHandle (control frames decoded) -> FOREGROUND_DONE frame {exitCode, jobs[{pid, text}]} -> manager registers each job as a background task and switches the call's output to its BackgroundOutputLog -> run_bash result {exitCode, stdout, stderr, effectiveCwd, backgroundTasksStarted[], backgroundTasksEnded[]}` (background form: result `{pid, status: running, effectiveCwd, outputFile}`)
- DS-002: `Wrapper JOB_ENDED frame {pid, exitCode | signal} -> AnchoredCommandHandle -> BackgroundProcessManager records end (duration, tail from the output log) -> manager change listener -> AutoByteusAgentRunBackend -> BACKGROUND_TASK_UPDATED to source listeners -> AgentRun subscribers (panel, idle shutdown, notice service)`; when the last job ends the wrapper exits, the anchor sends RESULT and the scope retires the group as today
- DS-003: `Model tool call (foreground) -> run_bash tool marks call start -> manager.run -> FOREGROUND_DONE + stdout end marker seen -> end-of-call settle (manager: any of this agent's running tasks whose pid no longer exists (host `process.kill(pid, 0)`) gets up to 300 ms for its JOB_ENDED frame) -> run_bash tool takes ends since the mark (manager marks them reported) -> result.backgroundTasksEnded`
- DS-004: `BACKGROUND_TASK_UPDATED (ended) -> BackgroundTaskNoticeService schedules flush -> [run idle and settle elapsed] -> AgentRun.takeUnreportedBackgroundTaskEnds -> backend capability -> manager marks reported -> notice builder -> AgentRun.postUserMessage(SYSTEM notice) -> native turn -> SYSTEM_TASK_NOTIFICATION published when forwarded`
  - Alternate: external input arrives first → `AgentRunPlatformNotices.takePreface` asks the service → same take → notice rides as the input's preface.
- DS-005: `Run Terminate -> backend.terminate -> removeAgent -> AgentWorker finally -> AgentShutdownOrchestrator -> BackgroundProcessCleanupStep -> manager.stopAllForRunEnd (scope.stop each owned handle, ends marked run-ended) -> BackgroundOutputLog folder removed`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The tool resolves cwd as today and asks the manager to run the command. The manager launches the wrapper through the host scope: the wrapper runs the user's command in its own shell (so `&` jobs are its children), and when the foreground part ends sends one control frame with the exit code and the jobs still running. The call returns at that moment with its output; each job becomes a background task whose further output goes to the call's log file. With `run_in_background` the whole command is the single job and the result is just its pid and output file | run_bash, manager, wrapper, scope | manager | wrapper text, control frames, output log, WSL path |
| DS-002 | The wrapper polls its jobs and, when one ends, sends its pid and exit code or signal; the manager records the end with duration and the log's last lines, tells its listener, and the native backend maps it to a background task snapshot. When no job is left the wrapper exits and the group is retired as today | wrapper, handle, manager, backend | manager (facts), backend (publication) | mapping to `AgentBackgroundTask` |
| DS-003 | A foreground run_bash notes when it began; when its foreground part has ended it gives any of the agent's tasks that is already gone (a `kill <pid>` it just ran, a user EXIT trap) up to 300 ms for its end frame (the wrapper polls every 100 ms; probe: the killed pid disappears 13 ms after `kill`), then takes the unreported ends recorded since the mark, so a self-stop is reported in place. WSL: no liveness check; a late end falls back to the notice | run_bash, manager | manager (attribution) | — |
| DS-004 | The notice service follows native runs; an end schedules a flush; while the run is busy it waits for idle; when idle it waits 2 s for more ends, takes all unreported ends and posts one SYSTEM notice; if a user or agent message arrives first, the notice rides on it | service, AgentRun, backend, manager | service (delivery policy) | notice builder, sender id |
| DS-005 | When the agent stops for any run-end reason, its shutdown stops each owned process group through the scope (verified), marks those ends as run-ended (never reported) and removes the run's output folder | worker, orchestrator, cleanup step, manager | cleanup step | — |

## Spine Actors / Main-Line Nodes

`run_bash` tool; `BackgroundProcessManager`; `NativeCommandProcessScope` (unchanged); `AutoByteusAgentRunBackend`; `AgentRun`; `BackgroundTaskNoticeService`; `AgentShutdownOrchestrator` + `BackgroundProcessCleanupStep`.

## Ownership Map

- `BackgroundProcessManager` (per agent context): runs every call through the wrapper; owns background task records (from `run_in_background` and from `&` jobs) (pid, command, cwd, startedAt, outputFile, status, end), adopted foreground survivors (handles only), the reported/unreported state of each end, the change listener, `stopAllForRunEnd`. Single owner of "what ended and whether it was reported".
- `run_bash` tool: owns the tool contract (params, result shapes) and the DS-003 attribution window (mark at call start, take at call end).
- `AutoByteusAgentRunBackend`: owns publication of native background tasks (`BACKGROUND_TASK_UPDATED`, `hasRunningBackgroundTasks`, `backgroundTaskInspection: event-stream`) and exposes the `backgroundTaskNotices` capability (`takeUnreportedEnds`).
- `AgentRun`: thin facade `takeUnreportedBackgroundTaskEnds()`, `listRunningBackgroundTasks()` and `backgroundTaskNoticesSupported`.
- `BackgroundTaskNoticeService`: owns delivery policy: which runs, settle timer, busy/idle wait, batching, building and posting the notice, publishing `SYSTEM_TASK_NOTIFICATION` when forwarded, preface hand-over.
- `BackgroundProcessCleanupStep`: owns run-end cleanup of background commands and output files.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRun.takeUnreportedBackgroundTaskEnds()`, `AgentRun.listRunningBackgroundTasks()` | backend capability → manager | services depend on `AgentRun`, never on backends | batching, timing |
| backend `backgroundTaskNotices.takeUnreportedEnds()`, `backgroundTaskNotices.listRunning()` | manager (`takeUnreported()`, `list()` filtered to running) | runtime-neutral capability on the backend contract | notice text |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | user DEC-001 | `run_bash(run_in_background)` | registration removed in `register-tools.ts` |
| `.../tools/get-background-processes.ts` | unused (0 traces); notice + panel | DS-002/004 | |
| `.../tools/get-process-output.ts` | output file | `tail <outputFile>` | |
| `.../tools/stop-background-process.ts` | user DEC-001 | `kill <pid>` + wrapper | |
| `BackgroundProcessOutput` (types.ts L80-101), its export (`index.ts` L18) | Dead once get-process-output is gone (only caller: manager.getOutput) | — | |
| `manager.getOutput`, `manager.listProcesses`, `manager.refresh`, `manager.startCommand`, `manager.stopProcess`, `manager.stopAll` | Dead: callers are the removed tools only (`stopAll` had none) | `startBackground`, `list`, `stopAllForRunEnd` | |
| `TerminalResult.backgroundProcesses`, `adoptObservedProcesses`, the executor's post-exit `scope.members` survivor listing | Replaced: the wrapper names its jobs; non-job survivors (detached) stay owned by the scope lease without listing | `FOREGROUND_DONE` frame + manager | detached processes still stopped at run end/app quit while they stay in the group |
| Ring buffer as read path | output file | `BackgroundOutputLog` keeps a small tail for the notice | `OutputBuffer` still used by foreground? No: foreground collects Buffers; `OutputBuffer` stays only if the tail uses it (decide in implementation; remove if unused) |
| Integration tests for the four tools (`tests/integration/tools/terminal/terminal-tools.test.ts` parts, `run-bash-openai-schema.test.ts` references, `built-in-agent-bootstrapper.test.ts`, `model-router-tools.test.ts`, server shutdown fixtures naming the tools) | tests follow the code (DESIGN.md rule 11) | new tests | rewrite to `run_bash` background |
| Three names in `built-in-agents/templates/daily-assistant/agent-config.json` | tools removed | run_bash default | |

## Return Or Event Spine(s) (If Applicable)

DS-002 (above).

## Bounded Local / Internal Spines (If Applicable)

DS-006, parent `BackgroundTaskNoticeService`, per tracked run (states Idle, Pending, Settling, InFlight; the service holds the taken ends of an InFlight batch itself):
`end event -> Pending -> (run running? wait for AGENT_STATUS idle) -> Settling (2 s) -> flush: take unreported (+ any held batch) -> empty? -> Idle : post notice -> InFlight -> forwarded: publish SYSTEM_TASK_NOTIFICATION, drop batch -> Idle | failed / not accepted: batch back -> Pending | cancelled or run released: drop -> Idle` (an end arriving while InFlight is taken by the next flush)
A `takePreface` call while Pending or Settling takes the ends (plus any held batch) into a preface and goes InFlight. Return rules (AR-007): `prefaceDelivered` or `forwarded` → publish `SYSTEM_TASK_NOTIFICATION` and drop the batch; `prefaceReturned` or post `failed` / not accepted → the held ends go back to Pending (next flush or preface carries them again, merged with newer ends); `cancelled` (root-shutdown fencing) or `runReleased` → drop. The manager marks ends reported when taken; the service is then their only holder until delivered.
Each notice also lists the agent's background tasks that are still running (pid, command, started), from `AgentRun` (Solution Designer DEC-013), so a compacted conversation still sees what runs.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `CommandWrapper` | DS-001/002 | manager | Builds the script of the Command Wrapper Contract below for a bash invocation (foreground form) or any POSIX shell (background form) | One parent for both entry forms (probes) | in the tool, it would be duplicated per mode |
| Control frames | DS-001/002 | handle | Grammar below; written to fd 63 (a duplicate of the original stderr made before the user block), decoded by `AnchorControlDecoder` for host and WSL; body ≤ 2,048 bytes | A channel user redirections cannot capture | user stderr must stay byte-identical apart from frames |
| `BackgroundOutputLog` | DS-001/002/005 | manager | One log per call that leaves background tasks: `<os tmpdir>/autobyteus-background-tasks/<agentId>/call-<startMs>-<anchorPid>.log` (shell-visible path; WSL translation); everything the call's stdout and stderr receive after their end markers is appended; every task of that call names this file as `outputFile`; `lastLines` of a task = the log's last 20 lines (≤ 2,000 chars) when that task ended, so it may include other tasks' lines of the same call (the tool description and the notice say so); removes the agent folder at run end | Reading and tail (AR-005) | memory folder would be synced |
| Background task mapping | DS-002 | backend | record → `AgentBackgroundTask` (`taskId: String(pid)`, `kind: shell`, `description`/`command`: the command, status, `summary`: "exit code N" / "signal X") | Contract mapping | in the manager, it would couple autobyteus-ts to server vocabulary |
| `background-task-notice-builder` | DS-004 | service | Notice text, SYSTEM message with metadata, `SYSTEM_TASK_NOTIFICATION` event | Same shape as other notices | — |

## Command Wrapper Contract (SR-004)

Owned by `command-wrapper.ts`; verified by `prototype/wrapper-skeleton-probe.sh` (bash 3.2.57, 12 cases). `<cmd>` is the user's text appended as written, never parsed. `<n>` is a per-call nonce. Frames are `\036<n>:BODY\037` written to fd 63; the stdout end marker is `\036<n>:END\037` written to fd 62.

Foreground form (bash only):

```bash
exec 62>&1 63>&2                                   # channels the user's redirections cannot capture
__ab_fg_end() {                                    # runs once, at the foreground end
  __ab_rc=$1
  builtin set +e +u +o pipefail; builtin unset IFS; builtin trap - ERR DEBUG   # shell-state reset (set -x already off)
  __ab_user_exit=$(builtin trap -p EXIT); builtin trap - EXIT
  # a user EXIT trap runs now, when the command ends, as it does today
  case "$__ab_user_exit" in ''|*__ab_fg_end*) ;; *) __ab_run() { builtin eval "$1"; }; builtin eval "__ab_run ${__ab_user_exit#trap -- }";; esac
  builtin trap '' TERM                             # the wrapper outlives a group TERM so it can report
  builtin unset -f jobs 2>/dev/null; __ab_pids=$(jobs -p); __ab_pids=$(builtin echo $__ab_pids)
  builtin printf '\036<n>:END\037' >&62           # stdout boundary
  builtin printf '\036<n>:FOREGROUND_DONE:%s:%s\037' "$__ab_rc" "$__ab_pids" >&63
  while builtin test -n "$__ab_pids"; do          # bash 3.2 has no `wait -n`: poll
    __ab_left=
    for __ab_p in $__ab_pids; do
      if builtin kill -0 "$__ab_p" 2>/dev/null; then __ab_left="$__ab_left $__ab_p"
      else builtin wait "$__ab_p"; builtin printf '\036<n>:JOB_ENDED:%s:%s\037' "$__ab_p" "$?" >&63; fi
    done
    __ab_pids=$__ab_left; builtin test -n "$__ab_pids" && builtin command sleep 0.1
  done
  builtin exit "$__ab_rc"
}
builtin trap '{ __ab_rc=$?; builtin set +x; } 2>/dev/null; __ab_fg_end "$__ab_rc"' EXIT   # `exit`, `set -e`
{
<cmd>
}
{ __ab_rc=$?; builtin set +x; } 2>/dev/null       # silent `set -x` off
__ab_fg_end "$__ab_rc"
```

Background form (POSIX `sh`; used for bash and the `sh` fallback; the user's code runs only inside the job):

```sh
exec 62>&1 63>&2
( trap 'trap - TERM; kill -TERM 0' TERM           # `kill <pid>` reaches everything the command started
  {
<cmd>
  } & wait $!                                      # `wait` is interruptible; a foreground child would defer the trap (AR-001)
) &
__ab_job=$!
trap '' TERM
printf '\036<n>:END\037' >&62
printf '\036<n>:FOREGROUND_DONE:0:%s\037' "$__ab_job" >&63
wait "$__ab_job"; printf '\036<n>:JOB_ENDED:%s:%s\037' "$__ab_job" "$?" >&63
```

Rules:
- Frame grammar: `FOREGROUND_DONE:<rc 0-255>:<pid>( <pid>)*` (pids may be empty), `JOB_ENDED:<pid>:<status 0-255>`; digits and spaces only; body ≤ 2,048 bytes (a call with more jobs than fit reports the first ones; the rest are owned but untracked). The decoder keeps today's READY/STARTED/RESULT frames for WSL and accepts these for both targets.
- Call boundary: the call's result is the stdout bytes before the stdout `END` marker and the stderr bytes before the `FOREGROUND_DONE` frame; later bytes of both streams go to the call's `BackgroundOutputLog` when it has tasks (and are dropped otherwise, there being no reader). The call returns when both are seen. If the shell exits without them (`exec`, a user EXIT trap that replaced the wrapper's and then `exit`), the call returns at RESULT as today and any processes left are owned by the scope lease, untracked.
- Shell-state reset happens before any wrapper code after the user block: `set -x` off silently, `+e +u +o pipefail`, `unset IFS` (default word splitting; ARCH-REV-002 AR-003), ERR/DEBUG traps cleared; wrapper commands use `builtin` (user functions cannot shadow them; aliases are not expanded in non-interactive bash); `jobs` is called after `unset -f jobs` because bash keeps the job table for a bare `$(jobs -p)` only.
- Timeout and Stop apply to the foreground part, as today: they stop the whole group (jobs included).
- Shells: the posix resolver's `sh` fallback (resolver L92-100, Android `/system/bin/sh`) runs foreground calls unwrapped (no `&` tracking; the survivor listing is removed everywhere, so `sh` calls return no job list) and supports the background form. WSL runs the same scripts in its bash.
- `kill <pid>` on a plain `&` job stops that process only (R-F, accepted).

## Ownership Boundaries

- autobyteus-ts owns facts (records, attribution, stop); the server owns publication and delivery. The notice service never reads the manager directly: it goes through `AgentRun` → backend capability.
- The scope stays the only signaller of process groups for platform stops; agents' own `kill` is their shell action.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `BackgroundProcessManager` | scope handles, output log, wrapper | run_bash, backend, cleanup step | tools or backend calling `scope` for background commands | add a manager method |
| `AgentRun` | backend capability | notice service | service importing the native backend or autobyteus-ts manager | extend the facade |

## Dependency Rules

- `run_bash` → manager → scope/wrapper/log. Backend → manager (via `getBackgroundManager(agent.context)`), never the scope.
- Notice service → `AgentRun` only; registered as a source in `AgentRunPlatformNotices` in both hosts.
- No server code depends on autobyteus-ts terminal internals other than the manager's public API and record type.
- autobyteus-ts never imports server vocabulary.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `run_bash` params `command`, `cwd`, `timeout_seconds`, `run_in_background` (boolean, default false) | one command | start foreground or background | — | `timeout_seconds` limits the foreground part only (a timeout stops the whole group, as today); ignored in background |
| Foreground result `backgroundTasksStarted: BackgroundTaskStart[]` | `&` jobs still running at foreground end | — | `pid` | `command` = the call's command text; all tasks of a call share its `outputFile` |
| Background start result `{ pid, status: "running", effectiveCwd, outputFile }` | the background command | — | `pid` | |
| Foreground result `TerminalResult` + optional `backgroundTasksEnded: BackgroundTaskEnd[]` | ends seen during the call | — | `pid` per end | |
| `BackgroundTaskEnd { pid, command, outcome, durationMs, outputFile, lastLines }`, `outcome` = `{ exitCode }` (wait status 0-128) \| `{ signal }` (status 129-255 read as signal n = status-128; R-2) \| `{ error }` (control frames lost: the wrapper exited without `JOB_ENDED`, e.g. `exec`) | one ended task | shared by result, notice, mapping | `pid` | an ended record whose pid is reused by a new task in the same run is replaced (R-1) |
| `BackgroundTaskStart { pid, command, effectiveCwd, outputFile, startedAt }` | one started task | background-form result and `backgroundTasksStarted` items | `pid` | `command` = the run_bash command text of the call that started it (no job text is parsed or framed) |
| `manager.run(command, cwd, { background })` (one entry for both forms; returns the call outcome: exit code, output before the markers, started tasks), `manager.markCallStart(): number`, `manager.takeEndsSince(mark)`, `manager.takeUnreported()`, `manager.list()`, `manager.hasRunning()`, `manager.onChange(listener)`, `manager.stopAllForRunEnd()` | per agent | — | `pid` | ends whose handle stop reason is `host-shutdown` or run end are recorded `reportable: false` and never taken (AR-007) |
| `AgentRunBackend.backgroundTaskNotices: { kind: "unsupported" } \| { kind: "platform"; takeUnreportedEnds(): readonly BackgroundTaskEnd[]; listRunning(): readonly BackgroundTaskStart[] }` | a run | — | run | native: `platform`; others `unsupported`. The manager is the one owner of both facts; the service never derives the running set from events (DEC-013) |
| `AgentRun.takeUnreportedBackgroundTaskEnds()`, `AgentRun.listRunningBackgroundTasks()` | a run | facade | run | return `[]` when unsupported; the notice builder reads the running list at flush time (started time from `BackgroundTaskStart.startedAt`) |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| run_bash | Yes (one command, two modes by an explicit flag) | Yes | Low | — |
| backend capability | Yes | Yes | Low | — |
| manager API | Yes | Yes (pid within one agent) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Platform concept | background task | Yes | Yes (panel, event, journal "background task <id>") | Low | add to `GLOSSARY.md` |
| Native process layer | background process (`BackgroundProcessManager`) | Yes | Yes | Low | — |
| Param | `run_in_background` | Yes | Same as Claude's Bash | Low | — |
| Notice sender | `system.background_task_notifier` | Yes | matches other `system.*_notifier` | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Process groups, verified stop | `NativeCommandProcessScope` | Reuse | unchanged |
| Background task reporting | `BACKGROUND_TASK_UPDATED`, `hasRunningBackgroundTasks` | Reuse | panel and idle shutdown follow |
| Notice delivery | `AgentRun.postUserMessage`, `AgentRunPlatformNotices`, preface metadata | Reuse | memory and journal already handle it |
| Run-end cleanup | `AgentShutdownOrchestrator` steps | Extend | every run-end path passes it |
| Delivery policy | — | Create New (`background-task-notices`) | no existing owner for timed, waking delivery |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal` | tool, manager, wrapper, output log, types | DS-001/002/003/005 | Extend |
| `autobyteus-ts/src/agent/shutdown-steps` | cleanup step | DS-005 | Extend |
| `autobyteus-server-ts/src/agent-execution` | backend capability, AgentRun facade, native backend publication | DS-002/004 | Extend |
| `autobyteus-server-ts/src/background-task-notices` | delivery policy, builder | DS-004/006 | Create New (sibling of `tool-list-updates`, `skill-update-notices`) |
| `autobyteus-server-ts/src/agent-work-journal` | `(background)` rendering | — | Extend |

## Draft File Responsibility Mapping

See Final mapping (no extraction changed it beyond `BackgroundTaskEnd`).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `BackgroundTaskStart`, `BackgroundTaskEnd` (run_bash results, capability, notice, mapping) | `autobyteus-ts/src/tools/terminal/types.ts` | terminal | one shape each for a started and an ended task | Yes | Yes (replace `BackgroundProcessInfo` and `BackgroundProcessOutput`, both removed) | a bag of optional fields |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `BackgroundTaskEnd.outcome` | Yes: exactly one of `{ exitCode: number }`, `{ signal: string }`, `{ error: string }` (control loss or cleanup unconfirmed) | Yes | Low | three explicit variants |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` (Modify) | terminal | run_bash | schema + description (background, `kill <pid>`, `tail <outputFile>`), foreground attribution window, background branch |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts` (Modify, rewrite) | terminal | manager | records, attribution, listener, stop at run end, adoption |
| `autobyteus-ts/src/tools/terminal/background-output-log.ts` (Add) | terminal | output log | file path, append, tail, removal, shell-visible path |
| `autobyteus-ts/src/tools/terminal/command-execution/command-wrapper.ts` (Add) | terminal | wrapper | wrapper script for both forms |
| `autobyteus-ts/src/tools/terminal/command-execution/anchor-control-protocol.ts`, `anchored-command-launcher.ts` (Modify) | terminal | handle | decode the new frames for host and WSL; expose foreground-done and job-ended events; completion of the call = `FOREGROUND_DONE` (or RESULT when control is lost, e.g. `exec`) |
| `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts` (Modify) | terminal | executor | foreground timeout/abort apply to the foreground part; returns at `FOREGROUND_DONE` with the job list; no survivor listing |
| `autobyteus-ts/src/tools/terminal/types.ts` (Modify) | terminal | types | `TerminalResult` (drop `backgroundProcesses`; add `backgroundTasksStarted: BackgroundTaskStart[]`, `backgroundTasksEnded: BackgroundTaskEnd[]`, both omitted when empty), `BackgroundTaskStart`, `BackgroundTaskEnd`; remove `BackgroundProcessInfo`, `BackgroundProcessOutput` |
| `autobyteus-ts/src/tools/terminal/index.ts`, `src/index.ts` (Modify) | exports | — | export manager accessor and types used by the server |
| `autobyteus-ts/src/tools/register-tools.ts` (Modify) | tools | — | drop four registrations |
| four tool files (Remove) | | | |
| `autobyteus-ts/src/agent/shutdown-steps/background-process-cleanup-step.ts` (Add) + orchestrator/index (Modify) | agent | cleanup step | stop at run end; never fails the orchestrator (logs unconfirmed) |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts` (Modify) | execution | contract | `backgroundTaskNotices` capability |
| `.../domain/agent-run.ts` (Modify) | execution | facade | `takeUnreportedBackgroundTaskEnds()`, `listRunningBackgroundTasks()` |
| `.../backends/autobyteus/autobyteus-agent-run-backend.ts` (Modify) + `autobyteus-background-task-reporter.ts` (Add) | execution | native backend | subscribe to manager, map and deliver `BACKGROUND_TASK_UPDATED`, `hasRunningBackgroundTasks`, capability; inspection `event-stream` |
| other backends (acp, agy, claude, codex) + test doubles (Modify) | execution | | `backgroundTaskNotices: { kind: "unsupported" }` |
| `autobyteus-server-ts/src/background-task-notices/{background-task-notices.ts, services/background-task-notice-service.ts, services/background-task-notice-builder.ts}` (Add) | notices | service | DS-004/006 |
| `.../agent-execution/domain/system-task-notification-senders.ts` (Modify) | | | `BACKGROUND_TASK_NOTICE_SENDER_ID` |
| `compositions/build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts` (Modify) | composition | | create, add to `AgentRunPlatformNotices`, close |
| `agent-work-journal/rendering/runtimes/autobyteus-translation.ts` (Modify) | journal | | `run_bash` with `run_in_background` → `(background)` + started pid |
| `built-in-agents/templates/daily-assistant/agent-config.json` (Modify) | | | remove three names |
| docs: `autobyteus-ts/docs/terminal_tools.md`, server `docs/modules/{agent_tools,agent_work_journal,agent_execution,agent_team_execution}.md`, `GLOSSARY.md` (Modify) | | | |

## Applied Patterns (If Any)

Observer (manager change listener → backend); small state machine per run (DS-006).

## Target Subsystem / Folder / File Mapping

As Final mapping. New folder `autobyteus-server-ts/src/background-task-notices/` mirrors `tool-list-updates/` (`<name>.ts` composition + `services/`).

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal` | Mixed Justified | Yes | Low | existing layout |
| `autobyteus-server-ts/src/background-task-notices` | Off-Spine Concern | Yes | Low | same as sibling notice subsystems |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Start result | `{"pid":4123,"status":"running","effectiveCwd":"/w/app","outputFile":"/tmp/autobyteus-background-tasks/<agent>/call-1762680000000-4120.log"}` | returning the anchor pid (TERM ignored) | `kill <pid>` must work |
| Kill reported in place | `run_bash("kill 4123")` → `{"exitCode":0,"effectiveCwd":"/w/app","backgroundTasksEnded":[{"pid":4123,"command":"npm run dev","outcome":{"signal":"SIGTERM"},"durationMs":312000,"outputFile":"…","lastLines":"…"}]}` | a later notice turn for the agent's own kill | REQ-015 |
| Notice | `[Platform notice — background tasks finished]` blank line, then per task: `- pid 4123 \`pnpm build\`: exit code 0 after 2m 14s. Output: <file> (shared by tasks started in the same call). Last lines:` and indented lines; then `Still running: pid 4130 \`npm run dev\` (started 10:02)` | one notice per task | REQ-002/004 |
| Ownership | `service -> AgentRun -> backend capability -> manager` | `service -> getBackgroundManager(...)` | boundary |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the four tools as aliases | stored definitions name them | Rejected | names skipped; run_bash present |
| Keep `backgroundProcesses` in foreground results | agents used `&` | Rejected | `backgroundTasksStarted` named by the wrapper (SR-003/004) |
| Map old tool names to run_bash | — | Rejected | — |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. autobyteus-ts: command wrapper and control frames first, with the regression suite for ordinary foreground commands (R-0) and the `&`-job cases (AC-010); then types (`BackgroundTaskStart`, `BackgroundTaskEnd`), output log, manager rewrite, run_bash background + attribution, executor adoption change; unit/integration tests (start, end with exit code, signal, `kill <pid>` leaves nothing, attribution, run-end stop, WSL path where testable).
2. autobyteus-ts: cleanup step + orchestrator; remove four tools, registration, dead manager methods and `BackgroundProcessOutput`; exports.
3. Server: backend capability on the contract and all backends; native reporter and capability; `AgentRun` facade.
4. Server: notice subsystem, sender id, wiring in both hosts; unit tests with fake timers (busy → after turn, idle → 2 s settle, batching, preface hand-over, released run).
5. Journal translation, built-in template, tests that named the tools, docs, glossary.
6. Live native E2E (TESTING.md): AC-001 to AC-013 with a real model (test vault).

## Key Tradeoffs

- Kill through bash (user's choice) vs a stop tool: one tool and familiar `kill`; cost covered by the wrapper and REQ-015, fallback one short notice.
- Output file vs memory buffer: readable with ordinary commands and survives a long run; costs disk under the OS temp area until the run ends.
- Server-side delivery vs runtime self-start: one input owner (AgentRun) for all notices, same as tool/skill/restart notices.

## Risks

- R-0 (regression list, each a test through `run_bash`): bash strict mode `set -euo pipefail; IFS=$'\n\t'` with two jobs (probe case 12), plain commands with exit codes, stdout/stderr bytes identical apart from frames, `exit N`, `set -e` / `set -euo pipefail` (failing foreground; failing job), `set -x`, user EXIT trap (`server & P=$!; trap "kill $P" EXIT; …` stops the server at command end), `exec >log 2>&1`, heredocs, quoting, `cd`, pipelines, `a & b & wait`, user functions named `jobs`/`kill`/`wait`/`printf`/`test`, two jobs with different codes, `exec cmd` (falls back to RESULT completion, tasks `{ error }`), `sh` fallback (foreground unwrapped as today; background form works), WSL. Every call goes through the wrapper: a defect there affects all commands. Mitigation: the user's text is appended unparsed inside `{ …\n}` in the same shell; regression suite over ordinary commands (exit codes, stdout/stderr bytes, `exit N`, `set -e`, heredocs, quoting, `cd`, pipelines, `a & b & wait`); `exec` falls back to completion by RESULT.
- R-A: the wrapper changes command semantics (stdin is already ignored; `{ …\n} &` runs the command in a subshell: `cd`/`export` effects stay inside it, which is already true for a separate command). Tests cover heredoc, `exit N`, `set -e`, quoting.
- R-B: a killed command's end can arrive after the kill's run_bash returned → one notice turn (accepted fallback).
- R-F (accepted by the user, SR-004): `kill <pid>` on a plain `&` job stops that process only; processes it started stay in the verified group until the agent kills them, the run ends or the app quits (probe case 11). The tool description says: use `run_in_background` when you need `kill <pid>` to stop everything a command starts.
- R-1: pid reuse inside one run replaces the ended record.
- R-2: a wait status above 128 is reported as a signal; a real exit code above 128 is indistinguishable and accepted.
- R-4: the nonce prevents accidental collisions with command output, not spoofing by the command itself (it runs in the same shell).
- R-5: each live foreground wrapper forks `sleep 0.1` while jobs run; acceptable at expected counts.
- R-6: fds 62/63 are inherited by everything the command starts (also `>log 2>&1 &` jobs, daemons); host: `dispose()` ends the streams; implementation checks the WSL bridge exits normally when such a process outlives the call.
- R-7: a job the user's own EXIT trap stops appears in the call's result as started and ended (accepted; correct facts).
- R-C: `kill -9 <pid>` cannot be forwarded: the wrapper dies, children stay in the group until run end; the description recommends plain `kill`.
- R-D: FU-003 under heavy load affects background starts like any run_bash (separate Task).
- R-E: output files grow with long-running chatty commands until the run ends.

## Guidance For Implementation

- Reproduction to start from: `prototype/wrapper-skeleton-probe.sh` (11 cases; turn each into a test through `run_bash` and the real launcher), `prototype/kill-pid-probe.mjs` (background form), `prototype/background-completion.prototype.test.ts` P3/P4 (today's behavior that changes: P4 must become "stopped at run end").
- The notice names background tasks from both forms (`run_in_background` and `&` jobs); never processes that detached themselves.
- Keep `getBackgroundManager` the single accessor; do not add a second registry.
- The shutdown step must not throw or return false on unconfirmed stops: log a warning naming the run; the host scope closes them at quit.
