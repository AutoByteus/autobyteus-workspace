# API/E2E Execution Coverage Report — autobyteus-572 (chat-media-path-playback)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; IR-001 from the Implementation Engineer (direct route, Medium / Low; code `02320583a5`, `d165d3143a`, `04034bc797`, `b856241b59`).
- Prior round reviewed: None.
- Deviations from the plan, and why:
  - MSP-91 makes the download fail by killing the node mid-download and starting it again. Chrome's offline emulation (tried first) does not break a download already under way.
  - The whole server `test:integration` and `pnpm test:e2e` are `Next Round`. They take about three hours on this machine, and this round ends in a failure in the phone's web viewer, which they do not exercise. They run in the round that validates the fix.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback/tickets/in-progress/chat-media-path-playback/evidence/api-e2e/` (index `README.md`).

## Routing Classification

- Task size: `Medium`. Architectural risk: `Low`. Input route: `Direct Low-Risk`. Successful-output route: `Delivery`. Test-code review: `Not Required — direct low-risk route`. This round: `Fail` → failure-origin review (Code Reviewer).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `b856241b59` (`02320583a5`, `d165d3143a`); probes `4adbafdf4d` and the MSP-91 tightening in this round's docs commit | macOS 26.5.2, Node v22.23.1, headless Chrome (playwright-core 1.58.2), ffmpeg 8.0.1 | built `dist` and phone bundle of this worktree (`build-server.log`; `build:mobile-web` exit 0); alpha/beta/epsilon/zeta probe nodes | phone 390×844 touch (en-US; a second phone zh-CN); load 38–70; `fseventsd` busy |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-006 (unit), QR | Web unit, typechecks, guards | Reused IMP-03, IMP-04, IMP-06 | — | Pass | — | — | Web source unchanged since `d165d3143a` (`04034bc797` renames spec cases); IMP-04's one failure is FU-002 (on the base) |
| API-02 | AC-005 (gate unchanged), D-5 | Server unit, typecheck | Reused IMP-02, IMP-05 | — | Pass | — | — | Server code unchanged since `02320583a5`; IMP-05's watcher failures are FSEvents (measured there) |
| API-03 | AC-001, AC-005, AC-006, REQ-005 | Phone (production bundle) on epsilon: a broken download and Retry, in and outside the run's folder; a zh-CN phone; the gate and path rules on the media routes | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-03-msp91-outside-retry --cases=MSP-91` (MSP-91 requiring Retry on both routes) | ENV-1 | **Fail** | `API-03-msp91-outside-retry/mobile-shell-probe.json`, `MSP-91-outside-failed.png`, `MSP-91-inside-failed.png`, `MSP-91-inside-after-retry.png` | `"error": "REQ-005, AC-006 outside: the failure offers Retry (a plain message with Retry)"`; `outside.state.alert` `"The file preview could not be opened."`, `outside.state.retry` `false`; every other MSP-91 criterion holds (below) | Inside the folder (the player): `"This video could not be played. Retry"`, Retry shows `"Loading video…"` with progress again, then it plays (`readyState: 4`, `duration: 20`). Outside (the phone's node-file viewer): a plain message with no Retry; tapping the link again plays it. Never "not available" on either. The other MSP-91 criteria pass, as also in API-05: no key gives 401 on `/rest/workspaces/…/content` and `/rest/node-files/content`; the phone's key reads with `content-length` = the file's size (`9725165`); a path climbing out of the folder gives 400 with no file bytes (73-byte answer); the zh-CN phone shows "正在加载视频…" with "x / 9.7 MB" rising over 92 samples and plays |
| API-04 | REQ-001 | Phone: a video sent as a Team message's reference (Team on epsilon, lead's `send_message_to` with `reference_files`), Messages → the reference, 8 Mbit/s | `… --cases=MSP-92` (in API-05) | ENV-1 | Pass | `API-05-mobile-shell/mobile-shell-probe.json` `cases["MSP-92"]`, `MSP-92-reference-loading.png`, `MSP-92-reference-playing.png` | `loadingTexts` `"ref-572.mp4 Loading reference file..."`; `final.media` `{"tag":"video","blob":true,"readyState":4,"duration":20}`; `notAvailableShown: false`; `playersLoadingView: false` | The reference viewer has its own download (`CollaborationMessageReferenceViewer.vue`, `response.blob()`) and its own loading text. The handoff's "x MB without a total" for Org/Team/collaboration references does not appear; REQ-001 holds (it says it is loading, never "not available") |
| API-05 | AC-001…AC-006, REQ-003 | Whole phone probe: MSP-89…92 and every other case (desktop windows included) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-05-mobile-shell` | ENV-1 | 90 of 91 cases Pass; MSP-59 Fail (outside this ticket, FU-004) | `API-05-mobile-shell/mobile-shell-probe.json`, `MSP-89-*.png`, `MSP-9[0-2]-*.png`, `MSP-59-*.png` | MSP-89: `bigProgress` 94 and 95 samples, `mediaReads` `"count":9,"keyInHeader":9,"keyInUrl":[]`, missing `"This video could not be played. Retry"`; MSP-90, MSP-91 (then without the Retry check on the outside route), MSP-92 `"result": "Pass"`; cleanup `"serversLeft":0,"rootRemoved":true` | MSP-59 (autobyteus-483): after `terminateAgentRun`, the phone's Activity row still read "running" 30 s later; it passes alone (API-05b). The diff touches nothing there |
| API-05b | — | MSP-47…49, MSP-59 alone | `… --cases=MSP-47,MSP-48,MSP-49,MSP-59` | ENV-1 | Pass | `API-05b-background-tasks-rerun/mobile-shell-probe.json` | `"result": "Pass"` | Rule 9 rerun; its cause is not established (FU-004) |
| API-06 | AC-005, D-5 | Server integration (whole) | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | — | Next Round | — | — | Deferred to the fix's round (see Round) |
| API-07 | D-5 | Server E2E (whole, scripted AGY gate) | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm test:e2e` | — | Next Round | — | — | As API-06 |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 MSP-89 (no "not available" in any timeline; loading with progress), MSP-91 (Retry shows loading again), MSP-92; API-01 | Proven | — |
| AC-002 | Yes | API-05 MSP-89 (`insideBig`, `outsideBig`: progress rising to 9.7 MB, then plays) | Proven | — |
| AC-003 | Yes | API-05 MSP-89 (video and audio in and outside the folder, a delegated run) | Proven | — |
| AC-004 | Yes | API-05 MSP-90, MSP-31, MSP-37 | Proven | — |
| AC-005 | Yes | API-05 MSP-89 (key in the header on 9 of 9 reads, none in a URL), MSP-91 (no key → 401 on both media routes; a climbing path → 400, no bytes), API-02 | Proven (whole server suites: Next Round) | — |
| AC-006 | Yes | API-05 MSP-89 (missing video, inside: plain + Retry), API-03 MSP-91 (inside: plain + Retry; **outside: plain, no Retry**) | **Not Proven**: the phone's node-file route (a path outside the run's folder) shows no Retry | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | 80% | AC-001…AC-005 | AC-006 not met on the outside route |
| Changed-boundary directness | 85% | 95% | phone bundle on real nodes, both routes, the gate | — |
| Integration realism | 80% | 94% | real nodes, a killed node, Team references | throttling by CDP |
| Environment fidelity | 85% | 90% | built `dist` and phone bundle | whole server suites not yet run (Next Round) |
| Failure / lifecycle | 70% | 85% | a broken download and Retry; a missing file | the outside route's Retry missing |
| User surface | 75% | 95% | en and zh-CN phones, desktop windows | no real device |
| Durable coverage | 85% | 94% | MSP-89…92 | — |

- Overall final confidence: 90.4% (simple average). Every critical AC directly proven: `No` (AC-006). Category below 90%: `Yes` (AC proof, failure/lifecycle). Target met: `No`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed on the phone bundle and desktop windows; the whole server suites in the next round).

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` | Added MSP-91, MSP-92; the phone's deliberate browser lines for MSP-91 | API-03, API-04, API-05 |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe nodes, phones, Chrome, temp roots | Yes | the probe's `finally` | `"serversLeft":0,"rootRemoved":true` |
| `/tmp/api572/` (trial runs, the phone build log, the evidence left out of the commit) | Yes | to remove when the ticket closes | — |

## Preliminary Classification (On `Fail`)

- `Design Impact`. REQ-005 ("A failure shows a plain message with Retry") and AC-006 ("A missing/refused file: plain message + Retry") apply to UC-003's failure states of the video/audio viewers, and REQ-002 has two phone routes. The design's failure decisions (D-6, BEH-007) give the players (the route inside the run's folder) a plain message with Retry. They leave the phone's node-file route (outside the folder, D-4: `MobileFileViewer`) with its existing "The file preview could not be opened." and no Retry. The implementation follows the design. So either the design adds a Retry to the phone viewer's media failure, or the requirements say the outside route's failure needs none; that decision is the Solution Designer's.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-006 (the outside route's Retry).
- Preliminary classification and recommended owner: `Design Impact`, Solution Designer (after the Code Reviewer's failure-origin review).
- Next recipient: the Code Reviewer (failure-origin review).
- Notes: follow-up FU-004 (MSP-59) recorded; the handoff's note about references showing "x MB" is corrected above (API-04).
