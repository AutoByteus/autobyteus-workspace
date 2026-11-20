# API/E2E Execution Coverage Report — autobyteus-572 (chat-media-path-playback)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 2. IR-002 (D-7, SR-004) after round 1's Fail (API-03: no Retry on the phone viewer's own failure state), classified `Design Impact` by CRR-001. Code `f2894c65e1` (web only; server unchanged since `02320583a5`).
- Prior round reviewed: API-REV-001 (Fail).
- Deviations from the plan, and why:
  - MSP-91's outside step taps the phone viewer's own Retry (D-7) instead of the link again. The implementation suggested it, and it is the user's action.
  - After the node restarts, MSP-91 waits until the node serves the file before tapping Retry. Right after a restart the node answers a read of the run's folder 404 until it registers the folder again (FU-005). My first round-2 attempt tapped Retry 3 s after the restart and met that window.
  - The whole server E2E ran as three runs. One `pnpm test:e2e` was stopped at the 2-hour limit for a single command after 143 of 283 files under load. The 140 files it did not reach ran in two batches. The failed files then ran one at a time.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback/tickets/in-progress/chat-media-path-playback/evidence/api-e2e/` (index `README.md`).

## Routing Classification

- Task size: `Medium`. Architectural risk: `Low`. Input route: `Direct Low-Risk`. Successful-output route: `Delivery`. Test-code review: `Not Required — direct low-risk route`.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `f2894c65e1` (server `02320583a5`); probes `9505c9039e` | macOS 26.5.2, Node v22.23.1, headless Chrome (playwright-core 1.58.2), ffmpeg 8.0.1 | server `dist` of this worktree (`build-server.log`, server unchanged since); phone bundle rebuilt for round 2 (`build:mobile-web` exit 0) | phone 390×844 touch (en-US; a second phone zh-CN); load 30–70; `fseventsd` 120–170 % |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-006 (unit), QR | Web unit, typecheck, guards | Reused IMP-10, IMP-11 (round 2), IMP-03/04/06 (round 1) | — | Pass | — | — | IMP-11's one failure is FU-002 (on the base) |
| API-02 | AC-005, D-5 | Server unit, typecheck | Reused IMP-02, IMP-05 | — | Pass | — | — | Server unchanged since |
| API-03 | AC-001, AC-005, AC-006, REQ-005 | Phone on epsilon (MSP-91): a broken download (the node killed mid-download, then started) and Retry, in and outside the run's folder; a zh-CN phone; the gate and path rules | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-03r2-msp91-outside-retry --cases=MSP-91` | ENV-1 | Pass | `API-03r2-msp91-outside-retry/mobile-shell-probe.json`, `MSP-91-outside-failed.png`, `MSP-91-outside-after-retry.png`, `MSP-91-inside-after-retry.png`, `MSP-91-zh-CN-loading.png` | inside `"This video could not be played. Retry"`, then Retry: `readyState: 4`, `duration: 20`; outside `"The file preview could not be opened."` with `retry: true`, then Retry shows the loading view again and plays (`readyState: 4`); gate `workspaceNoKey 401`, `nodeFileNoKey 401`, `climbingWithKey 400` (73 bytes), `workspaceWithKey 200` with `length` = the file's size; zh `"正在加载视频…"`, 94 rising "x / 9.7 MB" samples, `played: true`; no unexpected browser error | Round 1's failing criterion (outside Retry) now holds. `inside.readsAfterRestart` `[[5,404],[2525,200]]` (FU-005). The first round-2 attempt is kept on this machine, not in the ticket |
| API-04 | REQ-001 | Phone: a Team message's reference video (MSP-92) | in API-05 | ENV-1 | Pass | `API-05-mobile-shell/mobile-shell-probe.json` `cases["MSP-92"]`, `MSP-92-*.png` | `"Loading reference file..."` while it loads, then `readyState: 4`, `duration: 20`; never "not available" | The reference viewer has its own download and loading text; the handoff's "x MB without a total" for references does not apply |
| API-05 | AC-001…AC-006, REQ-003 | Whole phone probe: MSP-89 (incl. the implementation's D-7 steps: a missing outside video with Retry, then created and played; a folder path without Retry), MSP-90…92 and every other case (desktop windows included) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-05-mobile-shell` | ENV-1 | 90 of 91 Pass; MSP-41 Fail (known, autobyteus-458 FU-003) | `API-05-mobile-shell/mobile-shell-probe.json`, `MSP-89*.png`, `MSP-9[0-2]*.png` | MSP-89…92 `"result": "Pass"`; cleanup `"serversLeft":0,"rootRemoved":true` | MSP-41: an own save read back twice by the file watcher (`readsAfterSave: 2`). It is recorded as 458's FU-003, I saw it on autobyteus-540, and this diff does not touch it. Round 1's run is kept as `API-05-mobile-shell-round1/` (90/91, MSP-59 → FU-004) |
| API-05b | — | MSP-47…49, MSP-59 alone (round 1) | `… --cases=MSP-47,MSP-48,MSP-49,MSP-59` | ENV-1 | Pass | `API-05b-background-tasks-rerun/` | `"result": "Pass"` | FU-004 |
| API-06 | AC-005, D-5 | Server integration (whole) | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | ENV-1 | Pass for the changed scope | `API-06-server-integration.log` | `Test Files  3 failed \| 86 passed \| 20 skipped (109)`; `file-system-watcher` 5: `ENVIRONMENT: the OS delivered no file event within 10 s (FSEvents under load)`; `studio-server-http-contract` (an MCP preflight, 5 s timeout) and `skill-update-notice-service` (`afterEach` 10 s, closing its watcher) | The files that send user files pass |
| API-06b | — | The two non-watcher integration files alone | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/studio-server-http-contract.integration.test.ts tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts --no-watch` | ENV-1 | Pass | `API-06b-integration-rerun.log` | `Test Files  2 passed (2)`, `Tests  34 passed (34)` | |
| API-07 | D-5 | Server E2E (whole, scripted AGY gate) | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm test:e2e` | ENV-1 | Not complete: stopped at the 2-hour limit after 143 of 283 files (8 with failures) | `API-07-server-e2e-whole.excerpt.log` (full: `.log.gz`) | 135 files `✓`; 8 `❯ … failed` | Completed by API-07a/b/c |
| API-07a/b | D-5 | The 140 files API-07 did not reach, in two batches of 70 | same env, `pnpm -C autobyteus-server-ts exec vitest run <files>` (lists in each log's header) | ENV-1 | 57 pass, 81 gated skips; 2 failed (rerun in API-07c) | `API-07a-server-e2e-batch-a.log`, `API-07b-server-e2e-batch-b.log` | `Test Files  1 failed \| 36 passed \| 33 skipped (70)`; `Test Files  1 failed \| 21 passed \| 48 skipped (70)` | |
| API-07c | D-5 | The 10 failed E2E files, one at a time | same env, `vitest run --fileParallelism=false <10 files>` | ENV-1 | 8 Pass; 2 Fail outside the diff | `API-07c-server-e2e-failed-files-rerun.log` | `Test Files  2 failed \| 8 passed (10)`; `✓ … request-origin-and-phone-routes.e2e.test.ts (11 tests)`; `agent-package-definitions-live-refresh`: `WATCHING again: not met within 30000 ms` (package folder watcher); `provider-secret-lifecycle-graphql`: `serves five warm credential descriptor reads within…` `Test timed out in 5000ms` | Neither file reads user files. The package watcher has failed on FSEvents on this machine all day (also on autobyteus-533 and 540). The credential warm-read time limit failed the same way on another branch (an API/E2E run's journal, 2026-11-18: `provider-secret-lifecycle-graphql.e2e.test.ts (6 tests \| 3 failed)`) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 MSP-89 (no "not available" in any timeline), MSP-91 (Retry shows loading again on both routes), MSP-92; API-01 | Proven | — |
| AC-002 | Yes | API-05 MSP-89 (`insideBig`, `outsideBig`: progress rising to 9.7 MB, then plays) | Proven | — |
| AC-003 | Yes | API-05 MSP-89 (video and audio in and outside, a delegated run) | Proven | — |
| AC-004 | Yes | API-05 MSP-90, MSP-31, MSP-37 | Proven | — |
| AC-005 | Yes | API-05 MSP-89 (key in the header on every media read, none in a URL); API-03 MSP-91 (no key → 401 on both media routes; a climbing path → 400, no bytes); API-06; API-07 + 07a/b/c (every file that serves user files passes); API-02 | Proven | — |
| AC-006 | Yes | API-03 MSP-91 (a broken download: plain message + Retry on both routes, Retry plays); API-05 MSP-89 (a missing video inside: plain + Retry; outside: plain + Retry, then created and played; a folder: plain, no Retry) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Final | Supports | Residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 96% | every AC by real-stack cases | — |
| Changed-boundary directness | 96% | the phone bundle on real nodes, both routes, the gate | — |
| Integration realism | 95% | real nodes, a killed node, Team references, a second (zh-CN) phone | throttling by CDP |
| Environment fidelity | 94% | built `dist` and phone bundle | server suites green only serially; FSEvents-bound watcher files |
| Failure / lifecycle | 95% | broken downloads and Retry on both routes; missing file; folder | a Retry in the 2.5 s after a node restart fails once (FU-005, outside) |
| User surface | 95% | en and zh-CN phones, desktop windows | no real device |
| Durable coverage | 95% | MSP-89…92 | — |

- Overall final confidence: 95.1% (simple average). Every critical AC directly proven: `Yes`. Category below 90%: `No`. Target met: `Yes`.
- Residual risks: R-1 (large videos download whole; FU-001); R-2 (a length that changes while read); FU-004, FU-005.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed: phone bundle and desktop windows on real nodes; whole server suites).

## Compatibility / Legacy Scope Check

- Compatibility introduced or tolerated: `No`.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` | Added MSP-91, MSP-92 (round 1); round 2: MSP-91 taps the phone viewer's Retry outside the folder and waits until the node serves again before Retry | API-03, API-04, API-05 |

- Test-code review: `Not Required — direct low-risk route`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| A slow phone link | CDP network throttling (8 Mbit/s) | emulation in Chrome |
| A broken download | the node process killed mid-download, then started | a Wi-Fi drop on a real phone was not reproduced (Chrome's offline emulation does not break a download under way) |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe nodes, phones, Chrome, temp roots | Yes | the probe's `finally` | `"serversLeft":0,"rootRemoved":true` |
| The E2E command stopped at the 2-hour limit and its wait loop | Yes | the stopped run's processes ended with it; the wait loop was killed | none left (`ps`) |
| `/tmp/api572/` (trial runs, logs, evidence left out of the commit) | Yes | to remove when the ticket closes | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient: the Delivery Engineer (direct low-risk route; no test-code review by policy).
- Notes: round 1's failure (AC-006 outside the folder) is resolved by D-7 (API-03). New follow-up FU-005 (404 for a run's folder right after a node restart). FU-004 (MSP-59) stays.
