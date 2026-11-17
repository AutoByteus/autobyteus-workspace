# API/E2E Execution Coverage Report — shell-command-time-limits-483

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/shell-command-time-limits-483/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/shell-command-time-limits-483/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/shell-command-time-limits-483/api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (direct route, Medium/Low)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - LCL-CLAUDE-PROMPT (a live look at the prompt Claude received) dropped: AC-011's verification intent is unit (composer and each backend's prompt), already proven (API-R1); the live runs show the effect instead (LCL-LONG-CLAUDE-HABIT).
  - The new phone case is MSP-59 (MSP-50 and MSP-56 were already taken by other case files).
  - Two baseline fixes were needed to run planned gated suites at all (Rule 9; own commit `ea86a9affe`): the Claude live harness had no stream sequence since autobyteus-461 (every case got `AGENT_STREAM_UNAVAILABLE`), and native BGT-09 watched a view that has carried only communication since 461.
  - LCL-LONG-AGY-DAEMON asserts the end on the stream, not on the view: the AGY view lists running tasks only (pre-existing; FU-003).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483/tickets/in-progress/shell-command-time-limits-483/evidence/` (API-* files and folders)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | product `c77d83ef27` (no product file changed after it); tests `48d2a4da58` / baseline fix `ea86a9affe` | macOS 26 (darwin 25.5) arm64, load average 70–130 from other work | Node 22.23.1; in-process studio server (`startStudioE2eRuntimeServer`), own temp data root; host CLIs `claude` 2.1.325 (and the SDK-bundled 2.1.280 in API-02), `codex` 0.169.0, `grok` 1.0.88, `agy` 1.5.10 | `env -i` with real `HOME`, `USER`, `LOGNAME` (signed-in CLIs; AGY on the host login: adds conversations to the user's `agy` history, as do Codex/Claude sessions); test vault `~/.autobyteus-test/vault` (native gpt-5.4-mini); Claude model haiku; Codex gpt-6.1-terra medium; AGY gemini-3.8-flash-high |
| ENV-2 | same | same | Native transport with a scripted model (no provider), real processes | temp `HOME` |
| ENV-3 | same | same | Phone probe: `autobyteus-server-ts/dist` built from this worktree (alpha/beta nodes), production phone bundle (`build:mobile-web`), headless Chrome, scripted AGY CLI | probe-owned stack and data roots |
| ENV-4 | `c77d83ef27` | same | Fresh clone `/tmp/fsb-483`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` (TESTING.md env), Electron 42.11.16 | unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false`) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-003 (server env, unit), AC-004, AC-005/006/008 mapping, QR-001, AC-011 | server units | Reused: IMP-02, IMP-10 | — | Pass | (implementation handoff) | (implementation handoff) | No source file changed after `fa09807536`/`c77d83ef27`; evidence readable |
| API-R2 | AC-005..AC-009 (web units) | web specs | Reused: IMP-04 (+ IMP-10 catalog spec) | — | Pass | (handoff) | (handoff) | Web source unchanged since `0f0a234dab` |
| API-R3 | AC-010; AC-005..AC-009 rendered on desktop | browser probe | Reused: IMP-08 | — | Pass | (handoff) | (handoff) | Panel, probe and fixture unchanged since `0f0a234dab` |
| API-R4 | QR-001 | contracts, codegen | Reused: IMP-01, IMP-09 | — | Pass | (handoff) | (handoff) | Unchanged |
| API-01 LCL-LONG-CLAUDE-FG | AC-001 | real server → Claude Code Bash, foreground | `vitest run tests/e2e/runtime/long-command-time-limits-live.e2e.test.ts --maxConcurrency=12 -t LCL-LONG` (env in the file header; `RUN_LONG_COMMAND_LIMITS_E2E=1`) | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-CLAUDE-FG.json`, `API-01-long-runs/API-01-excerpt.txt`, `API-01-long-runs/vitest.log` | `"toolResultMs": 669396`, `"done": "fg finished after 661s"`, tool result `LONG_JOB_DONE fg after 660s`, `tasks: []`; Bash args have no `timeout` and no `run_in_background` | 11-minute foreground command returned its own output in the same tool call; never moved to the background |
| API-01 LCL-LONG-CLAUDE-BG | AC-002 (Claude), REQ-001 | real server → Claude Code background Bash | same run | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-CLAUDE-BG.json`, excerpt | samples `(2067, True), (2127, True)`; `bg finished after 2104s`; ended `status completed, end_reason null, exit_code 0`; view `completed … exitCode 0` | Alive past 30 min; not stopped at the old 30-min default |
| API-01 LCL-LONG-CLAUDE-TL | AC-005 (live), REQ-003 | real server → Claude Code per-call background limit | same run | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-CLAUDE-TL.json`, excerpt | `"timeout": 300000, "run_in_background": true`; last snapshot `status stopped, end_reason time_limit, exit_code null`, summary `…was stopped after reaching its background time limit` at 324 s | Also in the smoke (`/tmp`, not kept): same result |
| API-01 LCL-LONG-CLAUDE-HABIT | AC-012 (observational) | real server → Claude agent with the new prompt section | same run | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-CLAUDE-HABIT.json`, excerpt | `suiteStarts: 1`, `sleepCalls: 0`, one Bash call `bash run-tests.sh` with `run_in_background: true`; reply `Yes, it passed … "ALL 42 TESTS PASSED"` | One observed run (evidence, not a guarantee, as AC-012 says) |
| API-01 LCL-LONG-CODEX-BG | AC-002 (Codex), REQ-008 | real server → Codex `exec_command` past its turn | same run | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-CODEX-BG.json`, excerpt | samples `(2050, True)`; `codex finished after 2103s`; snapshot row `status completed, exitCode 0` | No stop on a clock |
| API-01 LCL-LONG-GROK-BG | AC-002 (Grok), REQ-008 | real server → Grok `run_terminal_command` | same run; then retries alone (`-t LCL-LONG-GROK`) by `/tmp/lcl-scripts/grok-retry.sh` | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-GROK-BG.json`, `API-01-grok/` | `API-01-grok/LCL-LONG-GROK-BG.json`: tool result `Background task d7fbe8f8-… started`; samples `(2046, True), (2106, True)`; `grok finished after 2104s`; killed `null`; `API-01-grok/attempts.log` `attempt 3 exit 0` / `PASS`; `API-01-grok/vitest.log` `1 passed` | First tries were refused by the Grok plan (`429 … free-usage-exhausted … 609708/600000`, rolling 24 h) or timed out in model discovery under load; attempt 3 (13:05Z) was accepted. AutoByteus shows Grok's `run_terminal_command` as `run_bash`. The view answers `unsupported` for Grok (as designed). Observation: Grok started no turn of its own when the job ended (none within 60 s after it; no notice) — see Latest Authoritative Result |
| API-01 LCL-LONG-AGY-DAEMON | AC-002 (Antigravity), REQ-008 | real server → AGY daemon `run_command` | same run | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-AGY-DAEMON.json`, excerpt | samples `(2051, True)`; `agyd finished after 2103s`; ended `status completed, end_reason null, exit_code 0` (stream); view after end `currentTasks: []` | View membership pre-existing (FU-003) |
| API-01 LCL-LONG-AGY-BG | REQ-008 (Antigravity, non-daemon) | real server → AGY `run_command` past `WaitMsBeforeAsync` | same run | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-AGY-BG.json`, excerpt | samples `(2104, True)`; `agyb finished after 2103s`; turn `TURN_COMPLETED` with `LONG_JOB_DONE agyb after 2103s` | The turn stays open until the command ends (AGY behaviour) |
| API-01 LCL-LONG-NATIVE-BG | AC-002 (native), REQ-008 | real server → native `run_bash` (gpt-5.4-mini) | same run | ENV-1 | Pass | `API-01-long-runs/LCL-LONG-NATIVE-BG.json`, excerpt | samples `(2106, True)`; ended `status completed, summary null, end_reason null, exit_code 0`; notice `exit code 0 after 35m 3s` | — |
| API-01 LCL-ENV-DEFAULT | REQ-001, AC-004 (live) | real server → Claude Code env | `… -t LCL-ENV` | ENV-1 | Pass | `API-01-env/LCL-ENV-DEFAULT.json`, `API-01-env/vitest.log` | `"output": "MAX=7200000 DEFAULT=7200000"` | — |
| API-01 LCL-ENV-SETTINGS | AC-003 (settings `env`), ASM-001 | Claude Code settings `env` (project source in the run workspace) | same | ENV-1 | Pass | `API-01-env/LCL-ENV-SETTINGS.json` | `"output": "MAX=900000 DEFAULT=7200000"` | ASM-001 holds for the setting sources AutoByteus loads; the user's own `~/.claude/settings.json` was not edited (TESTING.md) |
| API-01 LCL-ENV-SERVER | AC-003 (server env, live) | server process env | same | ENV-1 | Pass | `API-01-env/LCL-ENV-SERVER.json` | `"output": "MAX=900000 DEFAULT=7200000"` | — |
| API-02 | AC-006, AC-007, AC-008-adjacent (Claude) | Claude runtime pieces + real Claude CLI (2.1.325 and bundled 2.1.280) | `env -i … RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | ENV-1 | Pass | `API-02-claude-background/vitest.log`, `API-02-claude-background/run1-before-harness-fix.log` | `Tests  12 passed (12)`; run 1: `seen: ERROR` / `AGENT_STREAM_UNAVAILABLE` | Run 1 failed 12/12 at connect (harness stale since 461); baseline fix `ea86a9affe`; new assertions: completed `exit_code 0`, failed `exit_code 3`, terminate and crashed CLI `stopped` + `run_ended` |
| API-03 | AC-006, AC-007, AC-008 (native), QR-001 | real server, real processes, scripted model | `env -i … RUN_NATIVE_BACKGROUND_TASK_E2E=1 vitest run tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` | ENV-2 | Pass | `API-03-native-transport/vitest.log`, `BGT-0*.json`; `API-03-native-transport-bgt09/vitest.log`, `BGT-09.json` | BGT-01..08 `✓`; BGT-06 Terminate → `stopped, end_reason run_ended, exit_code null`; BGT-08 outside kill → `summary "signal SIGTERM", end_reason null`; BGT-09 rerun `1 passed`, `"quietToOfflineMs": 60168` | BGT-09 failed in the full run (view carries communication only since 461); baseline fix `ea86a9affe`, rerun alone passed |
| API-04 | AC-006, AC-007 (Antigravity) | real server + real `agy` | `env -i … RUN_AGY_BACKGROUND_E2E=1 vitest run tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts -t '(a)\|(b)\|(c)'` | ENV-1 | Pass | `API-04-agy-live/vitest.log`, `l-agy-0{1,2,3}-*.json` | (a) `completed, exit_code 0`; (b) `failed, exit_code 3`; (c) `stopped, end_reason run_ended`, `stoppedReceivedByMutationResponse: true` | — |
| API-05 | AC-006, AC-007 (phone), REQ-004 | production phone bundle | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-47,MSP-48,MSP-49,MSP-59` | ENV-3 | Pass | `API-05-phone/probe.log`, `API-05-phone/probe/mobile-shell-probe.json`, `MSP-47-activity-failed.png`, `MSP-59-activity-run-ended.png` | MSP-47 ended row `"end": "exit code 1"`; MSP-59 ended row `"status": "stopped"`, `"end": "Stopped: the run ended"`; `mobile-shell probe: Pass` | Attempt 1 failed in setup (AGY model discovery timed out at load ~88; `probe-attempt1-setup-timeout.log`) |
| API-FSB | build inputs (contracts, generated GraphQL) | release build from a clean clone | `evidence/API-FSB-fresh-start-build.sh <worktree> c77d83ef27 /tmp/fsb-483` | ENV-4 | Pass | `API-FSB-fresh-start-build.log`, `API-FSB-fresh-start-build.sh` | `[typecheck] PASS`, `Prisma OK`, `[terminal-runtime] ok: node-pty spawn probe`, `## RESULT: PASS` | Signing/notarization, x64, Linux, Windows need the runner: not tested |
| API-06 | test edits type-check | server + web typecheck | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-06-typechecks.log` | server `test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` `PASS`; web `87 in 37 files (baseline 87 in 37 files)` `PASS` | First server run flagged 8 typing errors in the new suite (`tasks()` rows untyped), fixed before the commit |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 LCL-LONG-CLAUDE-FG | Proven | — |
| AC-002 | Yes | API-01 LCL-LONG-CLAUDE-BG, -CODEX-BG, -AGY-DAEMON, -AGY-BG, -NATIVE-BG, -GROK-BG | Proven (all five runtimes: each > 30-min background command completed, none stopped) | — |
| AC-003 | Yes | API-R1 (unit), API-01 LCL-ENV-SERVER, LCL-ENV-SETTINGS | Proven | The user's own `~/.claude/settings.json` was not edited (TESTING.md forbids it); the project setting source exercises the same settings `env` rule |
| AC-004 | Yes | API-R1, API-01 LCL-ENV-DEFAULT | Proven | — |
| AC-005 | Yes | API-R1 (parser), API-01 LCL-LONG-CLAUDE-TL (live stream + view), API-R2/API-R3 (desktop line rendered from `time_limit`), phone component spec in API-R2 | Proven | Low-memory stop not producible on demand (same code path; unit-pinned wording) |
| AC-006 | Yes | API-02 (Claude exit 0/3), API-03 (native), API-04 (AGY exit 0/3), API-05 MSP-47 (phone `exit code 1`), API-R3 (desktop `Exit code 1`) | Proven | — |
| AC-007 | Yes | API-02 (Claude terminate + crash → `run_ended`), API-03 BGT-06 (native), API-04 (c) (AGY), API-05 MSP-59 (phone line), API-R3 (desktop line) | Proven | — |
| AC-008 | No | API-R1, API-R2, API-03 BGT-08 (native `kill` → `signal SIGTERM`, no reason) | Proven | — |
| AC-009 | No | API-R2, API-R3 (BT-UI-010) | Proven | — |
| AC-010 | No | API-R3 | Proven | — |
| AC-011 | Yes | API-R1 (composer + each backend's prompt tests) | Proven | — |
| AC-012 | No (observational) | API-01 LCL-LONG-CLAUDE-HABIT | Proven (one observed run) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | API-R1..R4; API-01..05 | AC-003 settings `env` proven through the project setting source, not the user's own settings file; low-memory stop not produced live | a user-file check by the founder if wanted |
| Changed-boundary execution directness | 75% | 96% | API-01 (real CLIs read the variables; real ends mapped), API-02..04, API-05 | desktop panel lines rendered from fixture rows (reused probe), not from a live run | a desktop window on a live server |
| Cross-boundary integration realism and mock gap | 70% | 95% | API-01/02/04 real CLIs; API-03 real processes; API-05 real nodes + phone bundle | in-process server, not the packaged app's embedded server (Electron Node 24) | an isolated desktop instance |
| Environment, configuration, identity, and fixture fidelity | 75% | 93% | ENV-1 host CLIs and logins as users have them; API-FSB clean clone | Claude Code 2.1.325 / Grok 1.0.88 / Codex 0.169.0 / AGY 1.5.10 only (RSK-002 on upgrades; the new suite re-checks them) | rerun the suite after CLI upgrades |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | time limit (TL), exit 3, terminate (Claude/native/AGY), crashed CLI, outside kill, run end on the phone | low memory not live | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | API-R3 desktop probe, API-05 phone bundle, API-FSB | desktop Electron window not opened (no shell change) | isolated instance |
| Durable regression coverage quality and relevance | 85% | 96% | new gated suite + four updated suites; baseline fixes make two stale suites runnable again | gated suites run only with their gates | — |

- Overall post-repository confidence: 79% (reused unit/spec/probe evidence; live boundaries unproven) → broader validation required.
- Overall final confidence: 95.1%
- Calculation method: simple average of the seven final scores.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: CLI versions change (RSK-002; mitigated by the new re-runnable suite); the user's own `~/.claude/settings.json` path not exercised; the Grok completion observation below.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (real server with the real runtime CLIs), `Browser` (phone production bundle), `Other` (fresh-start release build)
- Confidence gap or residual risk it addresses, and the expected gain: repository tests mock the CLIs; whether the real CLIs honour the variables, keep 35-minute jobs alive, report their ends in the wording the reader expects, and whether the phone bundle shows the lines, is only visible live. Gain: direct proof of AC-001/002/003/005/007.
- Browser validation needed: yes for the phone bundle (TESTING.md); the desktop panel is covered by the reused probe IMP-08.
- If `Not Required`: N/A.
- If `Blocked`: N/A

## Desktop Application Validation (When Applicable)

- Approach executed: web-equivalent desktop panel by the reused browser probe (IMP-08); desktop build by API-FSB. No isolated desktop instance: no shell behavior changed.
- Cases proving web-equivalent behavior: API-R3; shell-specific: none changed; API-FSB proves the release build with the changed contracts and generated types.
- Effect on any already-running desktop application: `None` (own data roots and ports; the user's AutoByteus and `~/.autobyteus` untouched).
- Behavior not directly proven and its confidence consequence: a live-ended task rendered in the desktop Electron window (the desktop probe renders the same stream rows; low).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (fields always present: every live snapshot carried `end_reason`/`exit_code`, null where unknown)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/long-command-time-limits-live.e2e.test.ts` | Added | API-01 | — |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` | Updated (end reason / exit code) | API-02 | — |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Updated (baseline fix: stream sequence) | API-02 | — |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` | Updated (BGT-06/08 end reason; BGT-09 baseline fix) | API-03 | — |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` | Updated (exit code, run end) | API-04 | — |
| `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs`, `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (MSP-47 line; MSP-59 added; header) | API-05 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)
- Diff or repository evidence supplied for removed paths: None removed.
- Commits: `ea86a9affe` (baseline fix), `48d2a4da58` (this ticket's coverage), then the documents/evidence commit.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Native model in API-03 | scripted LM Studio-compatible server | the suite pins exact turn timing; API-01 LCL-LONG-NATIVE-BG uses a real model | none for the end fields (real processes) |
| AGY CLI in API-05 | scripted AGY CLI (`agy-failure-cli.mjs`) | the phone probe's design; API-04 and API-01 use the real `agy` | none for the phone rendering |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, runs, definitions, data roots (API-01..04) | Yes | each suite's `afterAll` (terminate runs, delete definitions, remove data roots); leftover job pids killed by pid file | No `long-job.sh`/`run-tests.sh` process left (`ps` checked) |
| Smoke runs `/tmp/lcl-smoke`, Grok retries `/tmp/lcl-grok-*`, scripts `/tmp/lcl-scripts` | Yes | removed after the round | removed (the evidence they held was copied into `evidence/` first) |
| Fresh clone `/tmp/fsb-483` | Yes | `rm -rf` after the build | removed |
| Phone probe stack | Yes | probe's own cleanup | probe reported Pass; no process left |
| `autobyteus-server-ts/dist`, `autobyteus-web/dist` (build outputs for API-05) | Yes | untracked build outputs; left in the worktree | not committed |
| Temporary diagnostic in `claude-live-agent-harness.ts` (printed ERROR payloads) | Yes | reverted before the fix | file restored, then the real fix applied |
| Sessions in the CLIs' own histories (Claude, Codex, AGY on the host login) | Yes (created) | not removable without touching the user's CLI data | recorded here, as TESTING.md asks |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None. Optional for the founder: AC-003 with his own `~/.claude/settings.json` (not edited by tests per TESTING.md; the project setting source proves the same rule).
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Medium/Low, passed)
- Notes:
  - Verified limits per runtime (REQ-008 record): Claude 2 h foreground and background with the new defaults (11-min foreground and 35-min background completed; a per-call 5-min limit stops with `time_limit`); Codex 0.169.0, Grok 1.0.88, Antigravity 1.5.10 (daemon and non-daemon) and native each let a 35-minute background command run to completion (exit 0), none stopped it on a clock.
  - Observation for the Solution Designer (not an AC failure): in the Grok run, Grok started no turn of its own when the background job ended (none within 60 s; no notice), although the Grok section says "its completion appears in the conversation; act on it". The section also gives the waiting tool (`get_command_or_subagent_output`), so an agent that must wait can still wait; whether Grok's completion reaches the agent only at its next turn was not determined in this round.
  - Follow-up FU-003 (AGY view lists running tasks only) recorded; pre-existing.
  - Baseline fixes `ea86a9affe` (Claude live harness stream sequence; native BGT-09 observation) are test-only and unrelated to this ticket's product change.
  - Docs for delivery's sync (from the implementation handoff): `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`; TESTING.md needs no change (the new suite is found through its file header).
