# API/E2E Execution Coverage Report — phone-background-tasks-473 (autobyteus-473): the phone's Activity shows the open agent's background tasks; a late viewer sees current tasks

## Round

- Coverage investigation: `tickets/in-progress/phone-background-tasks-473/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2; Delivery Engineer DR-001 blocked at the re-integration: `origin/personal` moved `931a1feeb6` → `87b7f16c9d` (autobyteus-480, merged as `4ea0901811`), and the phone probe stopped on duplicate case IDs MSP-44…46 (this ticket's background-task cases and 480's heading-link cases). Merged-state code `6f667d2552` (the renumber below on `a0ee023441`).
- Round 2 change: this ticket's cases renumbered MSP-44…46 → MSP-47…49 (`6f667d2552`: `mobile-background-tasks-cases.mjs` IDs, cross-references and four screenshot names; the case list and timing line in `mobile-shell-probe.mjs`); no case used MSP-47…49. Earlier records (implementation handoff IMP-11, code reviews, round 1 here) name them MSP-44…46, their IDs at the time.
- Rerun plan: the merge brings 480's Markdown heading-link change (web, its own probe cases); this ticket's product code is unchanged, so its round-1 in-app, desktop and fresh-start cases stand (TESTING.md rerun by impact: they exercise nothing 480 changes). Rerun: the server build, the phone bundle and the full phone probe on the merged state.
- Round 1 trigger (kept for reference): round 1; Code Reviewer CRR-001 Pass; code `f33b3c772a`, handoff `66f87db2b5` + `9b921e9489` (base `origin/personal` @ `931a1feeb6`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-02 needed four runs: run 1 never selected the run (a deep link does not select one; `desktop-run1/`); run 2 expanded the workspace in the left list, but the run is one level deeper (under its agent), so no run was selected (its folder was cleared before the next run, not kept); run 3 opened the run from the Runs view, but its 240 s task had ended before the reload read (timing; the panel then correctly showed it Completed; `desktop-run2-task-ended/`); run 4 (a 600 s task) is the result (`desktop/`).
  - API-04's `test:e2e:background-tasks-panel` is stale since `7bd0bbea4a` (FU-002); the desktop panel's preserved behavior rests on its specs (IMP-06) and the real desktop window of API-02.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473/tickets/in-progress/phone-background-tasks-473/evidence/api-e2e/`
  - `android/journey.md` (every in-app step's command and output), `android/shots/`, `android/node-473.log`; `desktop/desktop-ac003.log` and screenshots (runs 1 and 3 in `desktop-run1/`, `desktop-run2-task-ended/`); `scripts/` (temporary tools: `node-473.mjs`, `say.mjs`, `bg-steps.mjs`, `desktop-ac003.mjs`, `fs01-fresh-start.sh`, and 472's `droid.mjs`, `state.mjs`)

## Routing Classification

- Task size: `Medium`; Architectural risk: `High`; Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` for the implementation's durable test changes (`tests/e2e/mobile-background-tasks-cases.mjs` MSP-44…46, `mobile-shell-probe.mjs` wiring, the 473 server and web specs); API/E2E changed no durable test

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `9b921e9489` (code `f33b3c772a`) | own AVD `apie2e473_api35` (android-35, Pixel 6 profile), headless, port 5640 | debug APK of this branch (`API-00-builds.log`; no Android change); WebView 124 | `adb root` for input; deleted afterwards |
| ENV-2 | same | macOS 26 arm64 | host node `autobyteus-server-ts/dist/app.js` (built after the last server commit) serving the rebuilt phone bundle; `127.0.0.1:51964` = `10.0.2.2:51964` | a Claude run (`claude_agent_sdk`, `haiku`) on the local Claude login (real HOME/USER/LOGNAME, as the repository's live Claude suites; the runs added sessions to the user's Claude history); temp data root |
| ENV-3 | same | macOS, headless Chrome 1440×1000 | `pnpm dev` of this worktree on 127.0.0.1:5473 against ENV-2 (`BACKEND_NODE_BASE_URL`); the node's credential on loopback requests only | node allows that origin |
| ENV-4 | same | macOS, headless Chrome | phone probe and panel probe, clean env | probe-owned stacks |
| ENV-5 | `f33b3c772a` | macOS 26 arm64 | fresh clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` | removed afterwards |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-004; AC-001…003 on scripted AGY in Chrome | server, web | Reused: IMP-01…12 | — | Pass | `evidence/implementation/` | as in the handoff | `f33b3c772a` changes only the phone component's locale after IMP-11; API-04 reruns the phone probe on it |
| API-01 | AC-001, AC-002, REQ-001 | Android app; Claude run | `android/journey.md`: `say.mjs send` "Use the Bash tool with run_in_background set to true to run exactly: sleep 60; echo BG-473-ONE; exit 3 …"; node view `running`; `bg-steps.mjs open-activity` (real taps: run → ⋮ → Activity); `wait failed`; then `say.mjs send` (another client) "… sleep 45; echo BG-473-TWO; exit 0 …"; `wait running` | ENV-1, ENV-2 | Pass | `android/journey.md`, `android/shots/API-01-ac001-listed.png`, `API-01-ac001-ended.png`, `API-01-ac002-live.png` | AC-001: `"counts": "1 running"`, row `running` "Run delayed echo command in background … sleep 60; echo BG-473-ONE; exit 3 … Started 06:44 AM"; 35.7 s later with Activity open: `failed`, end "Background command … failed with exit code 3" (the node's view the same); AC-002: the new task `running`, first, 1053 ms after the request; `vvScale` 1 | — |
| API-03 | the reconnect repair | Android app | with Activity open on the running second task: `cmd connectivity airplane-mode enable`; the node's view `completed`; then `airplane-mode disable`; `wait completed` | ENV-1, ENV-2 | Pass | `android/journey.md` (API-03), `android/shots/API-03-offline-after-end.png`, `API-03-back-online.png` | offline: `"online": false`, the row still `running` while the node shows `completed`; back online: `completed`, "… completed (exit code 0)", `"2 ended"`, 2121 ms after reconnecting | — |
| API-02 | AC-003, REQ-002, REQ-003 | desktop window | `scripts/desktop-ac003.mjs` (run 4): a running `sleep 600` task; the Runs view → the run; Activity tab → Background Tasks; `page.reload()`; read again | ENV-2, ENV-3 | Pass | `desktop/desktop-ac003.log`, `desktop/desktop-opened.png`, `desktop/desktop-after-reload.png`; runs 1 and 3 in `desktop-run1/`, `desktop-run2-task-ended/` | `PASS the running task is listed when the window opens the run`; `PASS after a reload the Progress/Activity panel lists the running task (AC-003)`: "Background Tasks 1 running · 4 total", the running row first, the ended rows with their summaries; one `AgentBackgroundTaskView` read after the reload | run 1 shows a pre-existing "Checking…" with no run selected → FU-001 |
| API-04 | AC-005 | phone probe; desktop panel probe | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…`; `… test:e2e:background-tasks-panel --output-dir …` | ENV-4 | Pass for this ticket's scope | `API-04-mobile-shell.log`, `API-04-mobile-shell/mobile-shell-probe.json`, `API-04-background-tasks-panel/evidence.json` | phone probe 46 of 46 `Pass` incl. MSP-44…46 and the tool-call and Codex cases, cleanup clean, `unknownBrowserErrors: 0`; panel probe BT-UI-001 `+ 'Current count unavailable' - '0 running · 0 total'` | the panel probe is stale since `7bd0bbea4a` (2026-10-26), after its last change (2026-10-05); the panel is unchanged by this ticket → FU-002 |
| FS-01 | build (changed `generated/graphql.ts`) | fresh clone | `scripts/fs01-fresh-start.sh f33b3c772a <clone>`: `git clone --no-local`, `pnpm install --frozen-lockfile`, `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`, then release-desktop.yml's Prisma and terminal-runtime verify steps | ENV-5 | Pass | `FS-01-fresh-start.log` | `build exit 0`; `[typecheck] production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`, `PASS`; `schema engine darwin-arm64: present`, `query engine darwin-arm64: present`; `verify resources exit 0`, `verify app exit 0` | signing and notarization need the runner's secrets: not tested |
| API-04 r2 | AC-005, MSP-47…49 on the merged state | full phone probe after `pnpm -C autobyteus-server-ts build` and `build:mobile-web` on the merged state | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…` | ENV-4 (round 2, `6f667d2552`) | Pass | `r2-API-04-mobile-shell.log`, `r2-API-04-mobile-shell/mobile-shell-probe.json`, `r2-builds.log` | 49 of 49 `Pass`: this ticket's MSP-47…49 and 480's MSP-44…46 among them; the duplicate-ID guard passes; cleanup `rootRemoved: true`, `unknownBrowserErrors: 0` | — |
| C-03 | Antigravity missed end (RSK-001) | — | — | — | Not seen | — | — | accepted residual; the in-app runs used Claude |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-01 (Claude, Android app), R-IMP and API-04 r2 (MSP-47, formerly MSP-44, AGY) | Proven |
| AC-002 | Yes | API-01, R-IMP and API-04 r2 (MSP-48, formerly MSP-45) | Proven |
| AC-003 | Yes | API-02 (Claude, desktop window), R-IMP and API-04 r2 (MSP-49, formerly MSP-46, AGY) | Proven |
| AC-004 | Yes | R-IMP (IMP-02, IMP-04: AutoByteus end to end; registry, monitor, view units); API-01/02 (Claude's view through GraphQL, running and ended) | Proven |
| AC-005 | Yes | API-04 r2 (phone probe 49/49 on the merged state), API-04, R-IMP (IMP-03, IMP-06), API-02 | Proven; the panel probe is stale (FU-002) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 96% | AC-001…005 on real surfaces, a real Claude CLI | — |
| Changed-boundary execution directness | 85% | 96% | the node's `current()` with real Claude frames, the app's WebView, a desktop window | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real runtime, real network loss and reconnect | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | real login, pairing, emulator | emulator; one Claude model |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | failed exit, completed exit, offline across an end, reload | Antigravity missed end (accepted) |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | phone section, desktop panel after reload | — |
| Durable regression coverage quality and relevance | 90% | 92% | MSP-44…46, server and web specs, the BGT-01 e2e | the panel probe is stale (FU-002); the live Claude journeys are temporary |

- Overall final confidence: 95% (94.6%, simple average)
- Every critical acceptance criterion directly proven: `Yes`; any applicable category below 90%: `No`
- Gap below the 95% target: durable coverage (the panel probe, FU-002); the surface that would close it is the probe's update, outside this ticket

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed): Android emulator with the app, a live Claude runtime, a desktop browser window, a fresh-start build
- Gap it addressed: Claude's real background-task frames through `current()`, the app's WebView, network loss, a reload

## Persisted-Data Transition Checks

- `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`

## Durable Coverage Changed In The Codebase

Round 2: `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs` and `mobile-shell-probe.mjs` (`6f667d2552`, the MSP-44…46 → MSP-47…49 renumber, API/E2E). Round 1: none by API/E2E.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| A phone | Android 15 emulator | — |
| Model inference | real Claude `haiku` (local login) | a few cents; sessions added to the user's Claude history |

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| AVD `apie2e473_api35`, emulator-5640, adb forward | killed, deleted, removed | `adb devices` empty; other AVDs untouched |
| Host node, its Claude CLI and the running `sleep 600` task | SIGTERM (the CLI and its task ended with the node); the temp root removed (re-created once by the node's shutdown, then removed) | none left; the other Claude processes on this machine belong to another node (port 53949) and were not touched |
| `pnpm dev` on 5473, headless Chrome | stopped | port free |
| Fresh clone `/tmp/abtest473/fs01` and its logs | removed | — |
| `/tmp/abtest473/state.json` (credential), `pairing-link.txt` | deleted | — |
| Evidence secret scan | `own_`/`mra_` 20+ chars, the pairing code, `access_token=` with a value | no match |

## Latest Authoritative Result

- Result: `Pass` (round 2, merged state)
- Durable test changes for the proportional test-code review: `6f667d2552` (API/E2E, the renumber); the implementation's MSP cases and specs were reviewed in CRR-002
- Next recipient: Code Reviewer — proportional test-code review of `6f667d2552`
- Follow-ups: FU-001, FU-002 (API/E2E), FU-003 (delivery: case IDs collide between parallel tickets)
- Notes: release only on the user's word.
