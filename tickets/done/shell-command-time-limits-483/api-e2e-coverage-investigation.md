# API/E2E Coverage Investigation — shell-command-time-limits-483

## Investigation Meta

- Requirements Doc: `tickets/in-progress/shell-command-time-limits-483/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/shell-command-time-limits-483/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/shell-command-time-limits-483/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/shell-command-time-limits-483/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `evidence/claude-timeout-probe/` (Solution Designer's probe)
- Design Review Report: `N/A — not applicable` (direct route, Medium/Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/shell-command-time-limits-483/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/shell-command-time-limits-483/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/shell-command-time-limits-483/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (implementation engineer, 2026-11-17), direct API/E2E validation
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001/REQ-002 (AC-001..AC-004): every Claude run's Claude Code process gets `BASH_DEFAULT_TIMEOUT_MS=7200000` and `BASH_MAX_TIMEOUT_MS=7200000` unless already defined (server env or Claude settings `env`). Built only in `buildClaudeSdkSpawnEnvironment` → `applyClaudeShellTimeLimitDefaults` (DS-001).
- REQ-003/REQ-004 (AC-005..AC-008): `AgentBackgroundTask.endReason` (`time_limit`/`low_memory`/`run_ended`/null) and `exitCode`, required-nullable on the wire (`end_reason`, `exit_code`), GraphQL (`endReason`, `exitCode`), presentation/team-stream contracts. Producers: Claude registry + `readClaudeTaskEnd`, native reporter + `markRunEnding`, AGY monitor (`stopAll` → `run_ended`). One end line on the desktop panel and the phone via `describeBackgroundTaskEnd` (DS-002, DS-003).
- REQ-005 (AC-009): desktop panel `no-run` state.
- REQ-006 (AC-010): panel probe current.
- REQ-007 (AC-011, AC-012): per-runtime "Long-Running Commands" section, last in every runtime's prompt (DS-004).
- REQ-008 (AC-002): Codex, Grok, Antigravity, native: no limit change; a > 30-min background command is not stopped, proven by a long run per runtime.
- QR-001: clean-cut contract (always present, null when unknown).
- Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001..SCN-006.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1 Antigravity long job started as a daemon `run_command` step (`IsDaemon: true`): the only AGY form the panel lists (`agy-background-task-updates-live` L-AGY-04 shows a non-daemon background command keeps the turn open and is not listed). Both forms are real AGY use; AC-002's "shown Completed in the panel" can only be met by the daemon form, and the non-daemon form is the one a model picks for a long build, so both are run.
  - SCN-A2 Claude settings `env` reached through the *project* setting source (`<workspace>/.claude/settings.json`): AutoByteus loads `user`, `project`, `local` sources (`claude-sdk-setting-sources.ts`); a project file is test-owned and does not touch the user's `~/.claude` (TESTING.md: never edit the user's CLI config). It proves ASM-001's precedence rule (a settings `env` value over the process value) for the setting sources AutoByteus loads.
  - SCN-A3 A ended-at-run-end task seen on the phone bundle (terminate a run with a running task while the phone's Activity is open).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 Claude shell limits | Changed | REQ-001, D-1, probe B | Live: foreground 11 min and background 35 min through the real server (AC-001, AC-002); unit IMP-02 (AC-004) |
| REQ-002 absent-only | Changed | DEC-002, ASM-001 | Unit (server env, AC-003); live settings-`env` and server-env checks (SCN-A2) |
| BEH-003 end reason + exit code | Added | REQ-003/004 | Live per producer (Claude time limit / exit / run end / crash; native run end; AGY exit / run end); GraphQL view; panel probe; phone bundle |
| Native `summary "exit code N"` | Removed | design Removal Plan | Native transport e2e asserts `summary: null`, `exit_code` (updated by implementation; run here) |
| BEH-004 no-run | Added | REQ-005 | Reuse IMP-04 spec + IMP-08 probe BT-UI-010 |
| BEH-005 other runtimes | Preserved | REQ-008 | Live 35-min runs for Codex, Grok, AGY (daemon and non-daemon), native |
| BEH-006 prompt sections | Added | REQ-007 | Reuse IMP-02/IMP-10 composer and backend prompt tests; live: the prompt the runtime received (Claude run's system prompt) + AC-012 observation |
| BEH-007 probe | Changed | REQ-006 | Reuse IMP-08; rerun with the phone probe only if web changes |
| Contracts / generated GraphQL | Changed | QR-001 | Fresh-start build (TESTING.md build inputs touched) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | env builder, Claude reader, registry, reporter, monitor | IMP-02 unit | Real CLI wording and real process ends | Gated live suites |
| API / transport / contract | Yes | `BACKGROUND_TASK_UPDATED` payload, GraphQL view, contracts | IMP-01, IMP-02, IMP-09 | Real server stream and view with real runtimes | Gated live suites, native transport e2e |
| Frontend component / state | Yes | helper, panel, phone, composable | IMP-04 | — | Probe |
| Browser integration / user journey | Yes | desktop panel, phone list | IMP-08 desktop probe | Phone production bundle not run | `test:e2e:mobile-shell` MSP-47..49 (+ run-end case) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Activity tab | IMP-08 | — | Probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No (packaging only) | contracts/generated feed the desktop build | — | Release build from a clean clone | Fresh-start build |
| Process / lifecycle | Yes | run end → `run_ended`; Claude process end | Unit with real `terminate()` (native) | Real runtimes' run end | Live terminate per runtime |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Claude Code 2.1.325, Codex 0.169.0, Grok 1.0.88, AGY 1.5.10 | strings + probe B | UNK-001, ASM-001 | Live long runs |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483`, branch `codex/shell-command-time-limits-483`, validated commit `c77d83ef27` plus this round's test commits.
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`), Nuxt/Electron web (`autobyteus-web`), runtime CLIs.
- Project testing guideline path(s): `TESTING.md` (root; no closer `TESTING*.md`).
- Conflicting, missing, or unclear project instructions: TESTING.md "One heavy run at a time": the long live runs are idle (scripts sleeping between model turns), so they run concurrently in one process, as AC-002 allows; builds, probes and other suites run one at a time beside them.
- Changed build-input paths: `autobyteus-agent-presentation-contracts/**`, `autobyteus-team-stream-contracts/**`, `autobyteus-web/generated/graphql.ts` → fresh-start build case API-FSB.
- Required environment variables or secrets available: `Yes` (test vault READY with `provider.openai.api-key`, `provider.anthropic.api-key`; signed-in `claude` 2.1.325, `codex` 0.169.0, `grok` 1.0.88, `agy` 1.5.10 on the host).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing rules | Gated runtime suites in `autobyteus-server-ts/tests/e2e/`; signed-in CLIs need real `HOME`, `USER`, `LOGNAME`; test vault for keys; Node 22; fresh-start build recipe; phone behavior proven on the phone bundle; never edit `~/.claude`, `~/.codex`, `~/.grok`; AGY without `antigravity-oauth-token` runs on the host login (adds conversations to the user's `agy` history) |
| `AGENTS.md` (root) | Repository rules | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` |
| `autobyteus-server-ts/tests/e2e/runtime/*` headers | Gates and commands | `RUN_CLAUDE_E2E`, `RUN_NATIVE_BACKGROUND_TASK_E2E`, `RUN_AGY_BACKGROUND_E2E`; in-process server via `startStudioE2eRuntimeServer`; `initializeLiveServerVault` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | Phone probe | needs `autobyteus-server-ts/dist/app.js` and `build:mobile-web`; `--cases=MSP-47,MSP-48,MSP-49` |
| `.github/workflows/release-desktop.yml` via TESTING.md | Fresh-start build | clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the listed env, then the Prisma/terminal-runtime verify steps |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (live suites) | `autobyteus-server-ts` | `vitest run <file>` | own temp data root, random port | GraphQL answers | `afterAll`: terminate runs, delete definitions, close server, remove data root |
| Phone probe stack | `autobyteus-web` | `pnpm test:e2e:mobile-shell --cases=…` | probe-owned servers, temp HOMEs | probe | probe's cleanup receipt |
| Fresh clone | `/tmp/…` | `git clone --no-local`, `pnpm install --frozen-lockfile`, `build:electron:mac` | heavy CPU | build exit 0 | remove the clone |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definitions, runs | GraphQL `createAgentDefinition`, `createAgentRun` | test-owned data root | removed in `afterAll` |
| Long job | ticket-owned script `long-job.sh` written into each run's temp workspace (a script, not a bare `sleep`) | — | workspace removed |
| Claude settings `env` | `<workspace>/.claude/settings.json` (project source) | never the user's `~/.claude` | workspace removed |
| Provider keys | test vault | read-only; never printed | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Live Claude task lifecycle: completed with summary, failed with "exit code 3" summary, terminate → stopped, crash → stopped | AC-006, AC-007 (Claude) | Needs Update | snapshot type lacks `end_reason`/`exit_code`; terminate/crash do not assert `run_ended` | Add end-reason/exit-code assertions (API-02) |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` | Native tasks with real processes, scripted model; updated by implementation to `exit_code`, `summary: null` | AC-006, AC-008 (native), QR-001 | Needs Update | BGT-06 (Terminate) does not look at the task's last snapshot | Add `stopped` + `run_ended` to BGT-06 (AC-007 native); run the whole file (API-03) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` | Live AGY daemon tasks: completed / failed with summary, terminate → stopped with `summary: null` | AC-006/AC-007 (AGY) | Needs Update | no `exit_code`/`end_reason` assertions | Add them to L-AGY-01..03 (API-04) |
| `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs` (MSP-47..49) | Phone lists a task; on exit 1 shows Failed and `/exit/i` | AC-006 phone | Needs Update | `/exit/i` also matched the old summary; does not prove the end line | Assert `exit code 1`; add MSP-59 run end on the phone (API-05; MSP-50 and MSP-56 were taken) |
| `autobyteus-web/tests/e2e/background-tasks-panel-probe.mjs` | Desktop panel incl. BT-UI-008 end reasons, BT-UI-010 no run | AC-005..AC-010 rendered | Still Valid | IMP-08 Pass on `0f0a234dab`; panel/probe unchanged since | Reused |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Builds a Claude run without the server | — | Needs Update (found while running API-02) | every case got `AGENT_STREAM_UNAVAILABLE`: since autobyteus-461 SR-087 the stream binds only a run with a stream sequence | Baseline fix: `lazyAgentStreamSequences` (own commit) |
| native transport BGT-09 | Delegated copy idle shutdown, observed on the delegator's collaboration view | autobyteus-338 AC-009 | Needs Update (found while running API-03) | since 461 the agent-collaboration view projects only communication (`agent-collaboration-view-projector.ts`) | Baseline fix: watch the copy's own stream, view and `isActive` (own commit) |
| `claude-delegated-background-task`, `claude-team-member-background-task`, `agy-delegated-background-task`, `agy-background-task-live`, `background-step-stop-own-view` e2e | Task lifecycle in other run kinds; assert status/summary | — | Still Valid | assertions on `status`/`summary` keep their meaning; no field removed | Out of this round's runs (the changed fields are proven above) |
| Unit/spec files listed in the handoff | AC-003/004/005/006/008/009/011, QR-001 | — | Still Valid | IMP-02, IMP-04, IMP-10 on their commits; no source change since | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-003 (server env), AC-004, AC-005/006/008 mapping, QR-001, AC-011 | server units | Reused | IMP-02, IMP-10 | source unchanged since `fa09807536`; evidence readable |
| API-R2 | AC-009, AC-005..AC-008 (web) | web specs | Reused | IMP-04 (+ IMP-10 catalog spec) | web source unchanged since `0f0a234dab` |
| API-R3 | AC-010, AC-005..AC-009 rendered (desktop) | browser probe | Reused | IMP-08 | panel, probe, fixture unchanged since `0f0a234dab` |
| API-R4 | QR-001 | contracts, codegen | Reused | IMP-01, IMP-09 | unchanged |
| API-01 | AC-001, AC-002, AC-003 (settings env + server env, live), AC-005, AC-007 (Claude), AC-012, REQ-008 | real server + real CLIs | Durable (gated) | `long-command-time-limits-live.e2e.test.ts` (new): LCL-* cases, see below | Founder asked for a re-runnable test per runtime on the shipped version (Task 2026-11-17); a CLI upgrade can change the limits (RSK-002) |
| API-02 | AC-006, AC-007, AC-008-adjacent (Claude) | real server pieces + real Claude CLI | Existing Test (updated) | `RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | gated suite's assertions extended to the new fields |
| API-03 | AC-006, AC-007, AC-008 (native), QR-001 | real server, real processes, scripted model | Existing Test (updated) | `RUN_NATIVE_BACKGROUND_TASK_E2E=1 vitest run tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` | updated by implementation, never run; BGT-06 extended |
| API-04 | AC-006, AC-007 (AGY) | real server + real `agy` | Existing Test (updated) | `RUN_AGY_BACKGROUND_E2E=1 vitest run tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts -t "\(a\)|\(b\)|\(c\)"` | AGY exit message wording and stop path |
| API-05 | AC-006, AC-007 (phone), REQ-004 | phone production bundle | Existing Test (updated) | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-47,MSP-48,MSP-49,MSP-59` | TESTING.md: phone behavior on the phone bundle |
| API-FSB | build inputs (contracts, generated) | release build | Journey | fresh clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` (TESTING.md env), verify steps | TESTING.md Fresh-start build |
| API-06 | typechecks after test edits | server + web typecheck | Existing Test | `pnpm -C autobyteus-server-ts typecheck`, `pnpm -C autobyteus-web typecheck` | test files changed (server tests are type-checked by both) |

API-01 cases (each is one real run through GraphQL + the agent WebSocket on one in-process server):

| LCL ID | Runtime | What it does | Proves |
| --- | --- | --- | --- |
| LCL-CLAUDE-FG | Claude | foreground `bash long-job.sh 660 …`, no timeout argument | AC-001: tool result is the job's own output; no background task created |
| LCL-CLAUDE-BG | Claude | `run_in_background`, 2,100 s job | AC-002: completed, `exit_code 0`, never stopped at 30 min; view `completed` |
| LCL-CLAUDE-TL | Claude | `run_in_background` with `timeout: 300000` on a 900 s job | AC-005 live: `stopped` + `end_reason: time_limit` |
| LCL-CODEX-BG | Codex | `exec_command` 2,100 s job, turn ends | AC-002 / REQ-008: job not stopped; snapshot row |
| LCL-GROK-BG | Grok | `run_terminal_command` `block_until_ms: 0`, 2,100 s job | AC-002 / REQ-008 |
| LCL-AGY-DAEMON | AGY | daemon `run_command`, 2,100 s job | AC-002 / REQ-008: panel `completed`, `exit_code 0` |
| LCL-AGY-BG | AGY | non-daemon `run_command` with short `WaitMsBeforeAsync`, 2,100 s job | REQ-008: job not stopped (turn stays open) |
| LCL-NATIVE-BG | native (gpt-5.4-mini) | `run_bash` `run_in_background`, 2,100 s job | AC-002 / REQ-008: completed `exit_code 0`, notice |
| LCL-CLAUDE-HABIT | Claude | natural request: run a ~12-min suite and report | AC-012 (observational): one start, no second copy, no sleep loops |
| LCL-CLAUDE-SETTINGS | Claude | workspace `.claude/settings.json` `env.BASH_MAX_TIMEOUT_MS=900000`; agent echoes both variables | AC-003 settings part (ASM-001) |
| LCL-CLAUDE-SERVERENV | Claude | server process env `BASH_MAX_TIMEOUT_MS=900000` (run alone); agent echoes both | AC-003 server-env part, live |

Durations are configurable (`LONG_COMMAND_E2E_SECONDS`, `LONG_COMMAND_E2E_FOREGROUND_SECONDS`); the long cases run concurrently (`-t LCL-LONG`), the env cases alone (`-t LCL-ENV`).

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/runtime/long-command-time-limits-live.e2e.test.ts` | Re-verifies each runtime's long-command limit and Claude's settings precedence on a CLI upgrade (RSK-002, founder's "verify each runtime by a test") |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-02 | `claude-agent-background-task.e2e.test.ts` | snapshot type + `exit_code`/`end_reason` on completed, failed, terminate (`run_ended`), crash (`run_ended`) | — |
| API-03 | `autobyteus-background-task-transport.e2e.test.ts` BGT-06 | last snapshot `stopped`, `end_reason: run_ended`, `exit_code: null` | — |
| API-04 | `agy-background-task-updates-live.e2e.test.ts` L-AGY-01..03 | `exit_code` 0 / 3, `end_reason` null; terminate → `run_ended` | — |
| API-05 | `mobile-background-tasks-cases.mjs` MSP-47; new MSP-59 | `exit code 1` line; run end line on the phone | — |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron + Nuxt renderer.
- Testing guideline used: TESTING.md.
- Web-equivalent behavior: panel lines and no-run state (browser probe, reused IMP-08).
- Shell-specific or lifecycle behavior: none changed; the desktop build consumes the changed contracts and generated types → fresh-start build.
- Chosen validation approach: browser probe + phone bundle + fresh-start build; no isolated desktop instance (no shell behavior changed; the server boundary is proven in-process with the real CLIs).
- How the run avoids disturbing an already-running desktop application: own temp data roots and random ports; no use of `~/.autobyteus`.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/long-command-time-limits-live.e2e.test.ts --no-watch -t LCL-LONG` with `HOME`, `USER`, `LOGNAME` real, `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, `RUN_LONG_COMMAND_LIMITS_E2E=1`.
- Environment choices: Node 22.23.1; Claude model `haiku`; Codex `gpt-6.1-terra` medium (TESTING.md); Grok catalog default with effort `low`; AGY `gemini-3.8-flash-high`; native `gpt-5.4-mini` (test vault).
- Health / readiness checks: runtime availability via GraphQL; first turn completes.
- Seed data / fixtures: one definition per runtime family; the long-job script per workspace.
- Test identities: the host's signed-in CLIs (real HOME); AGY on the host login (adds conversations to the user's `agy` history; Codex and Grok sessions to theirs).
- Evidence: per-case JSON (tool calls, task snapshots, view polls, timings, job files), vitest output.
- Owned processes and temporary state to clean up: runs terminated, definitions deleted, data roots removed, leftover job processes killed by marker.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-005 low-memory stop live | Cannot be produced on demand without starving the shared machine | Low (unit pins the wording, same code path as time limit) | No | — |
| Claude settings `env` in the user's own `~/.claude/settings.json` | TESTING.md forbids editing the user's CLI config; the project source exercises the same `env` merge | Low | Yes (if the founder wants the user-file form checked) | listed for delivery |
| Signing, notarization, Windows/Linux builds | Need the release runner | Low | No | — |

## Ambiguities Or Reroute Triggers

None at planning time. Escalation triggers from the design (a runtime stopping a > 30-min command; the CLI ignoring the variables; settings precedence failing) are routed if observed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one gated suite added; four tests updated)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: long runs and the fresh-start build overlap in time (the runs are idle); other heavy runs are serialized. Round 1 updates: LCL-CLAUDE-PROMPT dropped (AC-011's intent is unit; API-R1); two baseline fixes (rows above); AGY daemon end asserted on the stream (view lists running tasks only; FU-003).
