# Investigation Notes

## Investigation Meta

- Package identifier: `shell-command-time-limits-483`
- Request / ticket: Project Task `autobyteus-483` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483`, branch `codex/shell-command-time-limits-483`
- Resolved base remote / branch / revision: `origin/personal` at `4cbf9e78812f0c6d063d243e84ac37a1b2119fe9` (fetched 2026-11-17)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md, Finalization Target)
- Bootstrap result: worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/shell-command-time-limits-483/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-17). Architecture gate: `references/architecture-design.md`, `references/design-principles.md`, `references/handoff.md`, `references/project-documents.md`, repository `DESIGN.md` (2026-11-17).
- Investigation status: complete for requirements and design.

## Initial Request And Clarifications

- Original request: Task autobyteus-483 (description and 9 comments, read with `get_project_task` 2026-11-17). Three points: (1) shell command time limits at runtime launch; (2) the Activity tab says why a background task stopped; (3) agent habit for long jobs.
- Clarifications received (founder, through the PM, in the Task comments; the last one governs):
  - 2026-11-17 final direction: "if the provider allows us to run a foreground task longer, we should set it longer; and for a background task it should be 2 hours by default, if possible." Set every limit to the longest the runtime allows, with 2 hours as the target; where a limit is a hard cap, say so and change nothing there. Verify each runtime by a test on the shipped version (Claude first, then Codex, Antigravity, Grok, native). Points 2 and 3 stay. Release only on his word.
  - The 45-minute and cache-based variants (2026-11-16) were replaced by the 2-hour decision (2026-11-17); the team still checks the cache facts and tells him only if they change what he wants.
  - 473 follow-ups FU-001 (no-run panel loads forever) and FU-002 (stale panel probe) are to be done together with point 2.
  - Point 3 (agent habit) was left out of agents-107 by the user; this ticket decides where it lives.
- User-supplied facts and constraints: incident of 2026-11-12 (four identical waiters, one stopped after its background time limit); the founder's rule "if not customizable, change nothing about the limit".
- Initial ambiguity: whether the Claude limits are customizable in the version AutoByteus runs; which binary AutoByteus actually runs.

## Product And Domain Understanding

- Product area: agent runtimes (Claude Agent SDK, Codex, Antigravity, Grok Build, DeepSeek harness, native AutoByteus), the Activity tab's Background Tasks panel (desktop) and the phone's background-task list (autobyteus-473), and the platform system prompt composed for every run.
- Affected actors or systems: agents that run long builds/test suites; the user watching the Activity tab; the founder deciding limits.
- Existing user or operational purpose: background tasks let an agent keep working while a long command runs; the panel shows those tasks.
- Relevant terminology: *foreground command* (the tool call waits for it), *background command / background task* (keeps running beyond the tool call or turn), *time limit* (a runtime stops the command), *auto-background* (a runtime moves a foreground command to the background instead of stopping it), *completion notice* (the runtime tells the agent the command ended).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Contract | `autobyteus-server-ts/package.json:33` | SDK version | `@anthropic-ai/claude-agent-sdk` `0.3.280` (bundled CLI `2.1.280`, `claudeCodeVersion` in its package.json) | — |
| 2026-11-17 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-executable-path.ts:73-94` | Which Claude binary runs | `resolveClaudeCodeExecutablePath()` uses `CLAUDE_CODE_EXECUTABLE_PATH`/`CLAUDE_CODE_PATH`/`CLAUDE_CLI_PATH`, else `which claude`, else the string `claude`. The SDK's bundled binary is never passed. | The Claude Code version is the user's installed one |
| 2026-11-17 | Runtime | `ps -o command -p $PPID` inside this run | Which binary the installed app runs | `/Users/normy/.local/bin/claude` → `~/.local/share/claude/versions/2.1.325`, parent `/Applications/AutoByteus.app/.../server/dist/app.js`, env `CLAUDE_AGENT_SDK_VERSION=0.3.280` | Probe 2.1.325 |
| 2026-11-17 | Code | `claude-sdk-client.ts:318-353` (`buildQueryOptions`), `claude-sdk-spawn-environment.ts:61-68` | Where the child environment is built | `env: spawnEnvironment` = copy of `process.env`, auth policy, then `applyClaudeOneHourPromptCacheDefault` (sets `ENABLE_PROMPT_CACHING_1H=1` only when the variable is undefined). `settingSources: ["user","project","local"]` (`claude-sdk-setting-sources.ts`) | The new defaults belong next to the cache default |
| 2026-11-17 | Code | `autobyteus-server-ts/src/runtime-management/claude/claude-prompt-cache-setting.ts` | Existing pattern for a Claude Code env default | Default applied only when absent, so an explicit user choice wins; server setting `CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE` can switch it off; UI in `autobyteus-web/components/settings/ClaudeRuntimeCard.vue` | Reuse the absent-only rule |
| 2026-11-17 | Command | `strings -n 8 .../claude-agent-sdk-darwin-arm64/claude` (2.1.280) | Foreground limits in the bundled CLI | `var p=120000,d=600000; oSe(): BASH_DEFAULT_TIMEOUT_MS>0 ? it : 120000; sSe(): BASH_MAX_TIMEOUT_MS>0 ? max(it, default) : max(600000, default)`. No upper clamp. No "background time limit" text found in 2.1.280. | — |
| 2026-11-17 | Command | `strings -n 8 ~/.local/share/claude/versions/2.1.325` | Limits in the CLI the app actually runs | Same foreground functions (`y4`, `RQ`). Background: `Kra=1800000` (30 min), `xRo=7200000` (2 h); background default `zln() = min(max(30 min or a smaller server flag, BASH_DEFAULT_TIMEOUT_MS), backgroundMax)`; background max `v$e() = min(max(2 h or a smaller server flag, BASH_MAX_TIMEOUT_MS), 2^31-1)`. A server flag can only lower the code limit (`pt()`: flag accepted when `300000 ≤ flag ≤ code limit`), and the env values are applied after it with `max`. Stop causes `HRo`: `deadline` → "stopped after reaching its background time limit", `memory_pressure` → "stopped because the system is running low on memory". | Variables govern all four Claude limits |
| 2026-11-17 | Command | same, `RIt(...)` | Summary text of an ended background command | `Background command "<desc>" completed (exit code N[: note])`, `... failed with exit code N`, `... was <stopped after reaching its background time limit / stopped because the system is running low on memory / stopped>` | Reason is only in the summary text |
| 2026-11-17 | Contract | `claude-agent-sdk/sdk.d.ts:5738-5768` `SDKTaskNotificationMessage` | Structured fields | `status: completed/failed/stopped`, `reason?: 'worker_restart'`, `summary`, `output_file`; no exit code or stop-cause field | Parse summary; map `worker_restart` |
| 2026-11-17 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-background-task-registry.ts:155-160, 249-263, 315-327` | How Claude task ends reach the panel | `task_notification` → `finishTask(status, summary)`; process exit → `clear()` publishes running tasks as `stopped` with no summary | Add end reason here |
| 2026-11-17 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-background-task.ts` | Runtime-neutral task vocabulary and wire payload | Fields `task_id, kind, description, command, status, summary, started_at`; strict parser | Extend with end reason and exit code |
| 2026-11-17 | Code | `.../backends/autobyteus/autobyteus-background-task-reporter.ts:9-25` | Native end mapping | exit code → completed/failed, `summary "exit code N"`; signal → stopped, `summary "signal X"` | Carry exit code as a field |
| 2026-11-17 | Code | `.../backends/antigravity/stream/agy-background-task-monitor.ts:79-110` | AGY end mapping | exit message → completed/failed with summary; `stopAll()` (AGY stopped) → `stopped` with no summary | Mark run-end stops |
| 2026-11-17 | Code | `.../backends/codex/thread/codex-background-task-view.ts:115-171` | Codex panel rows | Snapshot rows with `status` and `exitCode`; desktop panel already prints "Exit code N" | No change needed for Codex rows |
| 2026-11-17 | Code | `autobyteus-web/components/progress/BackgroundTaskPanel.vue`, `components/mobile/views/MobileBackgroundTasks.vue`, `composables/useBackgroundTaskPanelView.ts` | What the user sees | Chip `Stopped` (grey) for every stop; summary as a clamped 2-line button (desktop) / `endOf()` (phone). `useBackgroundTaskPanelView` leaves `mode='loading'` when `runId` is empty (watch at lines 85-90 sets loading, `refresh()` returns early) → FU-001 | Reason line; no-run state |
| 2026-11-17 | Code | `autobyteus-web/tests/e2e/background-tasks-panel-probe.mjs`, `tests/e2e/fixtures/background-tasks-panel.page.vue` | FU-002 | Probe expects pre-473 texts | Update in this ticket |
| 2026-11-17 | Code | `autobyteus-ts/src/tools/terminal/tools/run-bash.ts:14-37, 51-64`; `command-execution/shell-command-executor.ts:40-48` | Native limits | Foreground `timeout_seconds` default 30, model-chosen, no maximum; on timeout the command is killed (`timedOut`). Background (`run_in_background`) has no time limit (`timeoutSeconds: null`); stopped when the run ends | No limit to raise |
| 2026-11-17 | Command | `strings` of `~/.codex/packages/standalone/releases/0.169.0-aarch64-apple-darwin/bin/codex` | Codex limits | `exec_command`: "Runs a command in a PTY, returning output or a session ID for ongoing interaction"; after `yield_time_ms` the process keeps running as a "background terminal"; the model waits with `write_stdin` ("Waited for background terminal"). No wall-clock stop of background terminals found. | No limit to raise; no completion notice to the model found |
| 2026-11-17 | Command | `strings` of `~/.grok/downloads/grok-1.0.88-macos-aarch64` | Grok limits | `run_terminal_command.block_until_ms` default 30000 ms, then "moved to the background ... Process is still running" (not killed); `GROK_MAX_FOREGROUND_BLOCK_MS` can lower the block; background commands have no wall-clock stop found; completion "appears in the conversation"; waits with `get_command_or_subagent_output` are clamped to 1 hour (`GROK_MAX_WAIT_BLOCK_MS` can only shorten) | No limit to raise |
| 2026-11-17 | Command | `strings` of `~/.local/bin/agy` (1.5.10) | Antigravity limits | `run_command` with `WaitMsBeforeAsync`; "Commands that do not finish within the specified wait time continue running in the background as tasks; the system will notify you when they finish"; `RunCommandToolConfig.max_timeout_ms` exists in the harness config (not set by AutoByteus); no wall-clock stop text found | No limit to raise; verify by test |
| 2026-11-17 | Code | `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts`, `carpenter-prompt-sections.ts:60-64` | Where per-runtime instructions can live | Native prompt adds `## Bash Operating Practice`; every other runtime's backend factory calls `composeSharedCarpenterPrompt` (`claude-session-bootstrapper.ts:103`, `codex-thread-bootstrapper.ts:213`, `agy-agent-run-backend-factory.ts:63`, `acp-agent-run-backend-factory.ts:155`) | Each backend can pass its own section |
| 2026-11-17 | Code | `autobyteus-server-ts/src/background-task-notices/services/background-task-notice-service.ts` | Native completion notice | Native runs get a SYSTEM notice when a background task ends | — |
| 2026-11-17 | Code | `run-history/projection/historical-replay-event-types.ts`, `agent-memory/services/runtime-memory-event-accumulator.ts` | Is task state persisted | Only background-task *notices* are stored in history; `BACKGROUND_TASK_UPDATED` task snapshots are live, in memory (`claude-background-task-registry.ts` `view`, AGY monitor, native manager) | Persisted data not affected |
| 2026-11-17 | Web | Anthropic prompt caching (`claude-api` knowledge; code comment in `claude-prompt-cache-setting.ts` cites code.claude.com/docs/en/prompt-caching) | Founder's cache question | Claude runs already request the 1-hour cache (autobyteus-273). A wait longer than 1 hour with no model call lets the cache expire; the next call writes the prompt to the cache again once (cost, not correctness). | No change to the founder's 2-hour decision |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | A Claude run's agent runs a foreground Bash command | AutoByteus spawns the user's `claude` with `process.env` (+ auth policy + 1h cache default); the Bash tool's default timeout is 120 s, max 600 s; a main-agent command that times out is moved to the background | A command longer than 2 min (or 10 min with an explicit timeout) is moved to the background and then counts against the background limit | 2.1.325 strings; probe A (Measured) | High |
| BEH-002 | System | A Claude agent runs a background Bash command, or a foreground one is moved there | Background default 30 min, max 2 h in 2.1.325; at the limit Claude Code stops it and notifies | Long suites stopped after 30 min unless the model sets a timeout; never past 2 h | 2.1.325 strings; Task incident 2026-11-12 | High (2.1.280 shows no background limit) |
| BEH-003 | User | The user opens the Activity tab of a run with ended background tasks | Each task shows a status chip (Running/Completed/Failed/Stopped/Unknown) and, for an ended task, the runtime's summary text (desktop: 2-line clamp; phone: 3 lines) | A time-limit stop and a stop at run end both read "Stopped"; the cause is only inside Claude's summary text | `BackgroundTaskPanel.vue`, `MobileBackgroundTasks.vue` | High |
| BEH-004 | User | The Activity tab with no agent run selected | `useBackgroundTaskPanelView` stays `loading` | "Checking this agent's background tasks…" and "Current count unavailable" forever | 473 FU-001; composable watch | High |
| BEH-005 | System | Native/Codex/Grok/Antigravity long commands | Native: background unlimited, foreground model-chosen; Codex: PTY session continues; Grok and Antigravity: move to background after a wait, no stop | No runtime other than Claude stops a long command on a clock | strings; native code | Medium for Codex/Grok/AGY (Read, not run) |
| BEH-006 | System | Composition of each run's system prompt | Native prompt has `Bash Operating Practice`; other runtimes get no shell guidance from AutoByteus | No AutoByteus guidance about long jobs, waiting or duplicate waiters | composer | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `claude-sdk-spawn-environment.ts` | Builds the Claude child env | The 2-hour defaults go here, absent-only | One more `apply…Default` beside the cache one |
| `claude-background-task-registry.ts` | Claude task view | End reason + exit code from `task_notification` | Small pure parser of Claude's summary text |
| `agent-background-task.ts` | Wire vocabulary | New optional fields `end_reason`, `exit_code` | Strict parser accepts absent → null |
| `agent-presentation-contracts` / web `types/backgroundTask.ts` | Shared task types | Add the two fields | Web store, handler, GraphQL `currentTasks` |
| `BackgroundTaskPanel.vue`, `MobileBackgroundTasks.vue` | Display | Reason line | Shared presentation helper so desktop and phone say the same |
| `carpenter-prompt-composer.ts` | System prompt | Per-runtime long-command section | Input field filled by each backend |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents: prompt section texts (one per runtime family); localization strings (en, zh-CN); probe fixture page.
- Existing readers, writers, or contracts that consume them: composer; `useLocalization`.
- Evidence paths: above.

### Structural Surfaces

- Runtime modules: Claude spawn environment; Claude task registry; native reporter; AGY monitor.
- Shared interfaces: `AgentBackgroundTask` (server), `BackgroundTask` (web/presentation contracts), GraphQL `AgentBackgroundTaskEventStream.currentTasks`, websocket `BACKGROUND_TASK_UPDATED` message.
- Persistence: none (task snapshots are not stored).
- Evidence paths: above.

### Potential Structural Impacts To Investigate

- API or external-contract change: additive fields on an internal client/server contract (clean cut per DESIGN.md rule 9).
- Persistence schema or invariant change: none.
- Security or privacy boundary change: none.
- Concurrency or lifecycle change: none.
- Deployment, migration, ownership-boundary change: none.
- Confirmed absent, present, or unknown: confirmed absent except the additive contract fields.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `evidence/claude-timeout-probe/run-probe.sh` (Claude Code 2.1.325, `-p`, model haiku), run A without the variables | Foreground `bash long-job.sh` (150 s) | "Command did not complete within its 120s timeout and was moved to the background"; completed later in the background | Reproduced | BEH-001 confirmed | `evidence/claude-timeout-probe/A-default.jsonl` |
| same, run B with `BASH_DEFAULT_TIMEOUT_MS=7200000 BASH_MAX_TIMEOUT_MS=7200000` | Same command | Tool result `PROBE_DONE` in the foreground after 156 s; never moved to the background | Measured | The variables raise the foreground limit in the CLI AutoByteus runs | `evidence/claude-timeout-probe/B-2h.jsonl` |
| first probe attempt with `sleep 150; echo` | — | Claude Code 2.1.325 refuses a bare long `sleep` ("Blocked: sleep 150 followed by…"), so a script file is used | Reproduced | Test commands for the long-run checks must not be a bare `sleep` | probe script comment |

- Temporary diagnostics: None in the repository; the probe ran in `/tmp/sd483/probe` and its files are copied to the evidence folder.
- Reproduction for implementation to start from: `evidence/claude-timeout-probe/run-probe.sh` (run A shows the 120 s move without the defaults; run B shows the fix's mechanism).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (Task comments 2026-11-16/17) | Commands get killed; a killed long test has to be run again; 2 h default for background, longer foreground where allowed | Explicit decision | REQ-001, REQ-002 | None |
| User (Task) | Activity tab looked like failures when only a waiter timed out | Incident | REQ-004 | None |
| PM / agents-107 analysis | Long-job habit belongs in every runtime's instructions with that runtime's notices and limits | Direction | REQ-007 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Code CLI | user install (2.1.325 here); SDK-bundled 2.1.280 not used | `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS` read from the process env, no upper clamp; background limits derived from them (2.1.325) | strings + probe | A future CLI may change the rules; summary wording may change |
| Claude Code settings `env` | settings sources user/project/local are loaded | A user's own `env` values apply in the child | Claude Code docs (settings `env`) | ASM-001 |
| Codex CLI | 0.169.0 | No clock stop of background terminals | strings | Verify by test |
| Grok Build | 1.0.88 | Wait-then-background; no clock stop | strings | Verify by test |
| Antigravity CLI | 1.5.10 | Wait-then-background; notified when finished | strings | `max_timeout_ms` default unknown; verify by test |
| DeepSeek harness (ACP) | AutoByteus-integrated | Not investigated in depth (not named by the Task) | — | Generic guidance only |

## Persisted Data And State Facts

- Affected stored or external subject: none. Background task snapshots are in-memory and streamed; history stores only notices.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/claude-timeout-probe/` | Solution Designer | Reproduction and measurement of the Claude foreground limit | Claude Code 2.1.325 | REQ-001, AC-001 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | A value the user sets for the two variables in Claude Code's own settings `env` overrides the process value AutoByteus passes | User control without a new AutoByteus setting | API/E2E checks once (AC-003) | Open |
| RSK-001 | Risk | A hung foreground command now blocks a Claude agent up to 2 h instead of 2 min | The founder chose 2 h for both | A new user message moves a running command to the background (Claude Code feature, string "so that a message that arrived while it was running can reach you"); the user can also stop the run | Accepted by direction |
| RSK-002 | Risk | Claude's summary wording may change in a later CLI | End reason would read "not reported" | Parser falls back to the summary; unit test pins current wording | Accepted |
| UNK-001 | Unknown | Codex, Grok, Antigravity behaviour past 30 min is read from strings, not run | Founder asked for a test per runtime | API/E2E long-run checks (AC-002) | Open |

## Architecture Investigation Findings

- Claude child env owner: `buildClaudeSdkSpawnEnvironment` (`claude-sdk-spawn-environment.ts:61-68`) composes auth policy then cache default; it is the single place the CLI env is built (used by `resolveSpawnEnvironment`, `claude-sdk-client.ts:355-371`). The catalog/control query path (`claude-sdk-control-query.ts:44`) runs no Bash and needs nothing.
- Claude task end path: CLI `task_notification` → `ClaudeBackgroundTaskRegistry.observeTaskFrame` (line 155) → `finishTask` → `publish` → `onBackgroundTaskChanged` → `claude-session-event-converter.ts:256` (`buildBackgroundTaskUpdatedPayload(parseBackgroundTaskUpdatedPayload(...))`) → `BACKGROUND_TASK_UPDATED` → websocket mapper / collaboration adapter (`collaboration-agent-presentation-adapter.ts:362`) → web `backgroundTaskHandler.ts` → `agentBackgroundTaskStore` → panel. GraphQL `AgentBackgroundTaskEventStream.currentTasks` seeds a late viewer.
- Run-end stops: Claude `clear()` (process closed); AGY `stopAll()`; native: `autobyteus-agent-run-backend.ts:332-349` awaits `removeAgent(...)` (which stops the run's background commands) while the reporter is still subscribed, and calls `backgroundTaskReporter.stop()` only after it, so run-end ends are published as `stopped` / `signal SIGTERM`, indistinguishable from an agent's own `kill <pid>`.
- No shared presentation of "why it ended" exists; desktop and phone each format end text separately (`BackgroundTaskPanel.vue` exit-code line + summary; `MobileBackgroundTasks.vue` `endOf()`).
- Prompt composition: `SharedCarpenterPromptComposerInput` has no runtime-specific field; native composer appends its own fixed sections.

## Requirement Implications

- The Claude limits are customizable in the CLI AutoByteus runs (Measured), so per the founder's rule both are set to 2 hours; no runtime other than Claude stops a long command on a clock, so nothing changes there except verification.
- The stop reason exists only in Claude's summary text (and `reason: worker_restart`); a runtime-neutral end reason is needed so the panel can say it plainly for every runtime.
- The founder's cache concern does not change the decision: one cache re-write after a long wait.

## Notes For Architecture Design

- Map SCN-001..SCN-005 (requirements doc) to: Claude spawn env; Claude registry; native reporter; AGY monitor; web panel/phone; composer.
- Keep the defaults absent-only (never override an explicit value), like the cache default.
- Additive wire fields; no persisted data; DESIGN.md rule 9 (clean cut between versions) applies.
