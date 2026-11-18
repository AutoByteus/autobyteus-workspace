# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-002 Pass (2026-11-10)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-03: the first run failed on a stale fixture assertion (the old behavior REQ-009 changed); the fixture was updated and rerun (Durable Coverage Changed).
  - API-12 (BGT-09): planned as a team member delegating to a teammate; the platform refuses that (`COLLABORATION_SELF_TARGET_REJECTED`: talk with a teammate, do not delegate). Rewritten as a standalone native agent delegating to a top-level native agent, the current delegation shape.
  - API-13: the first run's OpenAI case started its two builds 4.6 s apart, so they ended 4.7 s apart and arrived in two notices (correct per REQ-004); the test now releases both builds together after the first turn and was rerun.
  - API-17 added: server typecheck with the new test files (baseline rule).
  - A baseline fix in the shared `NativeRuntimeLiveHarness` (GraphQL calls lacked the node owner credential) was needed before any native live suite could run (commit `60900cd0f7`).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | product code `ddd594d07b` (branch head `b09e5fdbb7` at start; later commits add tests and ticket files only) | macOS 26 arm64, bash 3.2.57, `/bin/sh` bash | node 22.23.1; vitest 4.1.12; server `dist/` and SDKs built by `test:integration:prepare` at `b09e5fdbb7` | `env -i PATH HOME=<resolved temp> TMPDIR` for E2E; test-owned data dirs and DB |
| ENV-2 | as ENV-1 | as ENV-1 | as ENV-1, in-process studio server + scripted LM Studio model (`LMSTUDIO_HOSTS` → suite-owned HTTP server) | no credentials; idle-shutdown grace 60 000 ms (minimum) |
| ENV-3 | as ENV-1 | as ENV-1 | as ENV-2 with real providers: Anthropic `claude-sonnet-5-5`, OpenAI `gpt-5.4-mini` | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (read-only; no key read or logged) |
| ENV-4 | as ENV-1 | Linux arm64 container `node:22-bookworm` (Docker 29.0.1), bash 5.2.15 | `autobyteus-ts/dist` from the worktree, mounted read-only | — |
| ENV-5 | as ENV-1 | macOS 26 arm64 | isolated desktop instance of this worktree's build (`isolated-app start --build`) | own data root and ports; test vault |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | R-0, AC-001/005/007/010 (local) | wrapper, macOS | `IMP-02` | — | Pass | (IMP-02 row) | (IMP-02 row) | ran on `ddd594d07b`; no product code changed since |
| API-R02 | BEH-001..007/010/011/014, AC-008 (tool absent), AC-012 | terminal units | `IMP-03` | — | Pass | (IMP-03 row) | (IMP-03 row) | ran on `ddd594d07b` |
| API-R03 | R-0, R-6, `sh` fallback | wrapper, Linux | `IMP-08` | — | Pass | (IMP-08 row) | (IMP-08 row) | ran on `ddd594d07b` |
| API-R04 | regression | autobyteus-ts full | `IMP-04` | — | Pass | (IMP-04 row) | (IMP-04 row) | ran on `e26460bf57`; `git diff --name-only e26460bf57 ddd594d07b` = `command-wrapper.ts` + its test (+ tickets); those paths were rerun by IMP-02/03/08 |
| API-R05 | regression; AC-011 converters; AC-012 | server typecheck, unit, targeted | `IMP-05`, `IMP-06`, `IMP-07` | — | Pass | (IMP rows) | (IMP rows) | no server source changed after `e26460bf57`; same CR-001 argument. API-17 reran the typecheck with the new tests |
| API-01 | regression | server in-process integration (never run on this branch) | `pnpm -C autobyteus-server-ts test:integration:prepare` then `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-01-server-integration.log` | `Test Files  90 passed \| 20 skipped (110)`, `Tests  524 passed \| 69 skipped (593)`, `exit=0` | skipped files are gated live/provider suites |
| API-02 | AC-006, REQ-009 | real `dist/app.js` server: Terminate and SIGTERM with a busy run holding a `run_bash(run_in_background)` command (changed fixture) | `env -i PATH HOME TMPDIR RUN_BUSY_STOP_NOW_E2E=1 TEST_BUSY_STOP_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-02-busy-run-stop-now.log`, `API-02-busy-run-stop-now/*.json` | `"terminate":{…"foregroundGone":true}`, `"shutdown":{"exit":{"code":0…},"survivors":[],"markedLeft":[]}`, `Tests  2 passed (2)` | — |
| API-03 | REQ-009, BEH-010 | real standalone application host: an application-ended run, then host close | `env -i … RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-03-native-standalone-shutdown/vitest.log`, `…/native-standalone-host-result.json`; run 1: `API-03-run1-stale-assertion/` | `"step": "run end stopped its commands", "value": {"elapsedMs": 757}`; observations all `absent: true, anchorAbsent: true`; run 1: `ordinary agent end retains previews … null !== 426` | run 1 failed on the stale assertion (expected the ended run's commands to keep serving; REQ-009 / the user's DEC-003 stop them, which run 1 observed). Fixture updated, rerun Pass |
| API-04 | AC-001, AC-003, AC-007, AC-008, AC-011, REQ-010 (panel contract), QR-002, QR-004 | real server + native runtime + scripted model, real processes | BGT-01 of `env -i … RUN_NATIVE_BACKGROUND_TASK_E2E=1 BACKGROUND_TASK_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-04-12-transport/BGT-01.json`, `vitest-results.log` | `"startToResultMs": 133`; `"aliveAtStartResult": true`; `"noticeAfterEndMs": 2024`; `"view": {"__typename": "AgentBackgroundTaskEventStream"}`; journal `Command: echo first-line; sleep 5; echo done-line (background) → started pid …` and `Notice:`; four `… not found in registry. Skipping.` warnings; `storedToolNames` unchanged | definition stored with `run_bash` + the four retired names; the model's tool list has none of them |
| API-05 | AC-002 | same | BGT-02 | ENV-2 | Pass | `API-04-12-transport/BGT-02.json` | `"endedBeforeTurnEndMs": 3036`, `"noticeAfterTurnMs": 2025`; notice `exit code 3 after 2s … Last lines:\n    failing` | the model was still answering (5 s) when the command failed |
| API-06 | AC-004, AC-012 (DEC-013 list) | same | BGT-03 | ENV-2 | Pass | `API-04-12-transport/BGT-03.json` | `"endSpreadMs": 562`; one notice request naming three pids and `Still running: pid … (started hh:mm:ss UTC)` | one `SYSTEM_TASK_NOTIFICATION` |
| API-07 | AC-005, REQ-007, REQ-015 | same + real `npm run dev` (npm → sh → node server → node worker) | BGT-04 | ENV-2 | Pass | `API-04-12-transport/BGT-04.json` | kill result `backgroundTasksEnded: [{… "command": "npm run dev", "outcome": {"signal": "SIGTERM"} …, "lastLines": "…listening on …\nworker ready"}]`; `group` 7 processes; `"survivors": []`; panel `stopped`/`signal SIGTERM`; no notice in 5 s | — |
| API-08 | AC-010 | same | BGT-05 | ENV-2 | Pass | `API-04-12-transport/BGT-05.json` | first result `exitCode 0`, `stdout "started\n"`, one `backgroundTasksStarted`; notice `exit code 7 after 2s`; kill of a job → `{"signal": "SIGTERM"}` in the kill's result; child alive after its parent job's kill; `& disown` → no task; `"goneAfterTerminateMs": 830` | DEC-012 narrowing and the untracked-detached rule observed as approved |
| API-09 | AC-006, REQ-009, QR-004 | same | BGT-06 | ENV-2 | Pass | `API-04-12-transport/BGT-06.json` | `"goneAfterTerminateMs": 743`; output folder removed; 2 model requests only (no notice) | — |
| API-10 | AC-013, REQ-014 | same | BGT-07 | ENV-2 | Pass | `API-04-12-transport/BGT-07.json` | `TURN_INTERRUPTED`; background pid alive and `running` after Stop; notice `exit code 0 after 8s` with `bg-done` | — |
| API-11 | AC-002 (signal), RU-02 | same | BGT-08 | ENV-2 | Pass | `API-04-12-transport/BGT-08.json` | notice `killed by SIGTERM after …s`; panel `stopped`/`signal SIGTERM` | killed by the test process (outside the agent) while idle |
| API-12 | AC-009, REQ-010 | standalone native agent delegates to a top-level native agent; idle-shutdown grace 60 s | BGT-09 | ENV-2 | Pass | `API-04-12-transport/BGT-09.json` | `"idleToOutcomeMs": 77089` (≥ 60 000, no `offline` before the report); `"task": ["running@-22", "completed@74972"]`; `"workerNotices": 1`; `"quietToOfflineMs": 60019` | the notice woke the idle copy; it reported with `send_message_to` |
| API-13 | ASM-002; AC-001/002/003/004/007 with real models; the requirements' success definition | real server + real providers | `env -i … AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_NATIVE_BACKGROUND_TASK_LIVE_E2E=1 BACKGROUND_TASK_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-background-task-live.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-13-live/BGT-LIVE-ANTHROPIC.json`, `API-13-live/BGT-LIVE-OPENAI.json`, `API-13-live/vitest-results.log`; run 1: `API-13-live-run1-spaced-ends/` | both: two `run_in_background: true` starts (86-135 ms), `reads: [{"command": "tail -n 3 …/call-….log"}]`, `"progressReadUsesTail": true`, `endsInResults []`, one notice naming both pids with `exit code 0` / `exit code 1` and their last lines; replies `Build A: passed, exit code 0` / `Build B: failed, exit code 1` | run 1 (OpenAI): ends 4.7 s apart → two notices, each end once (REQ-004 as specified); the model's turn-2 reply guessed build B's result before its notice (model quality, out of scope) |
| API-14 | AC-002/AC-007 last lines (C-02/C-03) | manager on macOS bash 3.2 and Linux bash 5.2 | `node …/API-14-lastlines-order-probe.mjs 50`; `docker run --rm -v "$PWD:$PWD:ro" -w "$PWD" node:22-bookworm node …/API-14-lastlines-order-probe.mjs 50` | ENV-1, ENV-4 | Pass | `API-14-lastlines-order-probe.mjs`, `API-14-lastlines-macos.log`, `API-14-lastlines-linux.log` | each variant `"tasks": 50, "lastLineMissing": 0, "differsFromFileTail": 0, "noEnd": 0`; `"result": "Pass"` (both) | 200 tasks per platform, 10 concurrent; stdout last line after a 5 000-line burst included |
| API-15 | AC-009 panel part, BEH-009, AC-003 on the user surface | real desktop app (worktree build) with a native run | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault pnpm --silent isolated-app start --build`; Chat → built-in Daily Assistant, runtime AutoByteus, model gpt-5.4-mini; send "Use run_bash with run_in_background set to true to run exactly: for i in 1 … 20; do echo panel step $i; sleep 1; done; echo PANEL_CHECK_DONE -- Do not wait …"; Activity → Background Tasks; wait; `isolated-app stop` | ENV-5 | Pass | `API-15-desktop-panel/API-15-panel-dom.log`, `03-panel-running-expanded.png`, `04-panel-completed-notice.png` | while running: `1 running · 1 total … Running Shell`; after: `0 running · 1 total … Completed Shell exit code 0`; conversation `[Platform notice — background tasks finished] … exit code 0 after 20s … Last lines: … PANEL_CHECK_DONE`, then the woken reply `PANEL_CHECK_DONE` | the built-in Daily Assistant (template changed by this ticket) ran run_bash; `stop` reported `"forced": true` (instance quit path; data root and ports released, `list` empty) |
| API-16 | R-0/R-6 on WSL; bridge exit | Windows + WSL | — | — | Not Tested | — | — | no Windows host or WSL here; cannot be emulated on macOS |
| API-17 | test-code type safety | server typecheck incl. new tests | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-17-server-typecheck.log` | `production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`, `[typecheck] PASS` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 (133 ms, command alive), API-13 (86-135 ms, two real models), API-15, API-R01 | Proven | — |
| AC-002 | Yes | API-05 (busy, exit code 3, notice 2.0 s after the turn), API-11 (signal), API-13, API-14 (last lines = file tail, macOS and Linux) | Proven | — |
| AC-003 | Yes | API-04 (notice 2 024 ms after the end, QR-002), API-12, API-13, API-15 | Proven | — |
| AC-004 | No | API-06 (ends within 562 ms → one notice), API-13 | Proven | — |
| AC-005 | Yes | API-07 (`npm run dev`: 7 processes, none left; signal in the kill's own result; panel stopped; no notice), API-R01 | Proven | — |
| AC-006 | Yes | API-09 (group gone in 743 ms, no notice, folder removed), API-02, API-03 | Proven | — |
| AC-007 | No | API-04 (tail while running and after), API-13 (models used `tail -n 3 <outputFile>`), API-14 | Proven | — |
| AC-008 | No | API-04 (definition with the four names starts; model sees run_bash only; four skip warnings; stored names unchanged), API-R02, API-R05 | Proven | — |
| AC-009 | No | API-12 (copy kept 77 s idle past a 60 s grace; re-armed: offline 60.0 s after quiet), API-15 (panel rows running → completed `exit code 0`) | Proven | — |
| AC-010 | Yes | API-08 (exit 7 via notice, kill of a job in result, children until run end, disown untracked, Terminate clears), API-R01, API-R03 | Proven | — |
| AC-011 | No | API-04 (journal `Command: … (background) → started pid …`, `Notice:`), API-R05 (historical rows) | Proven | — |
| AC-012 | No | API-06 (`Still running:` list from the per-run list), API-R02, API-R05 | Proven | — |
| AC-013 | Yes | API-10 (Stop: background keeps running, notice arrives) | Proven | — |
| R-0/R-6 on Windows (WSL), bridge exit | — (risk, not an AC) | API-R03 covers the same wrapper on Linux bash 5.2 | Only The User Can Check | Tried: no Windows host or WSL on this macOS machine, and WSL cannot be emulated here. Linux bash 5.2 runs the same wrapper text (IMP-08) and the manager's last-lines path (API-14). Needs a Windows machine: run `run-bash-wrapper.test.ts` (or the IMP-08 harness) under WSL, and check that a detached `cmd >/dev/null 2>&1 & disown` does not keep the bridge alive |

ASM-002 (models read output with `tail`): validated. Both real models (Claude Sonnet 5.5, GPT-5.4 mini) read progress with `tail -n 3 <outputFile>` taken from the start result, without being told the command (API-13).

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | API-04..12, API-02/03; final adds API-13 (ASM-002), API-15 | WSL (user-only) | — |
| Changed-boundary execution directness | 95% | 95% | real wrapper, processes, server, native turns (API-04..12); real models (API-13); real app (API-15) | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | scripted inference only in API-04..12; real providers in API-13; real app in API-15 | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | macOS full stack; Linux wrapper (API-R03) and manager last lines (API-14) | server E2E not run on Linux (platform-independent JS above the manager); WSL is user-only | a Linux container server run |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Terminate, Stop, SIGTERM, standalone host, delegated idle, outside kill, kill in result, disown, children (API-02/03, API-07..12) | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | API-15: real panel rows running → completed; notice card and woken reply | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | two gated suites (scripted + live), updated standalone fixture, typecheck clean (API-17) | gated suites run only when their gate is set (project convention) | — |

- Overall post-repository confidence: 90% (simple average 90.0)
- Overall final confidence: 95% (simple average 95.0)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: WSL (user-only); start robustness under heavy load (FU-003 of autobyteus-333, out of scope by DEC-005)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (API-13), `Project Desktop Validation` (API-15), `Other` (Linux container probe, API-14)
- Confidence gap it addresses: ASM-002 and the success definition need real models; native panel rows need the real renderer; the code review's open Linux last-lines ordering (C-02/C-03). Gain: user surface 75 → 95, AC proof 90 → 95, realism 90 → 95, environment 90 → 95.
- Browser validation needed, and why: yes, through the real desktop app (the panel is runtime-neutral and proven for Claude/AGY, but native rows had never been rendered)
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: isolated instance of this worktree's build, driven like a user (click, type, Enter) through browser automation attached to its control port; DOM text read for assertions; screenshots as support.
- Cases proving web-equivalent behavior: API-15. Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None` (own data root and ports, removed at stop).
- Behavior not directly proven: none for the panel.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: an agent definition stored with `run_bash` + the four retired names (API-04); the built-in Daily Assistant (API-15); historical journal rows (API-R05)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-04, API-15, API-R05
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (retired names are skipped, not mapped)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` | Added (gate `RUN_NATIVE_BACKGROUND_TASK_E2E=1`, no credentials) | API-04..API-12 | — |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-live.e2e.test.ts` | Added (gate `RUN_NATIVE_BACKGROUND_TASK_LIVE_E2E=1` + test vault) | API-13 | — |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-fixture.mjs`, `native-standalone-host-shutdown.e2e.test.ts` | Updated: an application-ended run's commands stop at run end (was: keep serving) | API-03 | the replaced assertion `ordinary agent end retains previews` encoded the behavior REQ-009 (the user's DEC-003) removed |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Updated: baseline fix, GraphQL through the credential-attaching fetch (`60900cd0f7`); `url` getter (`e4e106f93a`) | API-04..API-13 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model inference (API-02/03, API-04..12) | scripted LM Studio-compatible HTTP server (`LMSTUDIO_HOSTS`) | deterministic busy/idle timing and an exact view of what the model received | closed by API-13 (real models) and API-15 (real app with a real model) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `evidence/API-14-lastlines-order-probe.mjs` | Yes | kept as evidence (a 200-repetition ordering probe does not belong in a durable suite) | kept |
| Probe workspaces `$TMPDIR/api14-*` (200, empty) | Yes | removed | removed |
| In-process servers, data dirs, runs, definitions, command processes | Yes | suites' `afterAll`/`afterEach` (terminate, delete, kill tagged leftovers) | none left (`ps` check) |
| Docker containers | Yes | `--rm` | removed |
| Isolated instance `iso-65260-431f` | Yes | `isolated-app stop` | stopped; data root removed; `list` empty |
| Server/SDK `dist/` build outputs | Yes | untracked build outputs, not committed (TESTING.md) | kept |
| `$TMPDIR/autobyteus-background-tasks/<uuid>` folders dated 11:37-12:01 | No (created before this run started) | left alone | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: WSL (R-0/R-6 and the bridge exit on Windows) — user-only
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes: two pre-existing test problems were found and fixed in test code: the shared native live harness lacked the node owner credential (baseline fix), and the standalone host fixture asserted the old run-end behavior. No product defect found. Observed and correct per the requirements: ends seconds apart arrive as separate notices (API-13 run 1).
