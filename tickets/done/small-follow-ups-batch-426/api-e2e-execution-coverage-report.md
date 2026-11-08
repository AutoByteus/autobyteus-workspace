# API/E2E Execution Coverage Report — small-follow-ups-batch-426, round 1

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, second execution (rerun), after CRR-005 Pass at head `d115f1601d` (last code commit `c8b4b659cd`; SR-008 answers F-API-001 and F-API-002). The first execution was after CRR-002 at `42a86a5e93` (API-REV-001, Fail)
- Prior round reviewed: API-REV-001 (Fail: F-API-001, F-API-002). Rerun plan by impact: the coverage investigation § Round 2 Rerun Plan. Rows marked "(r2)" below are this execution; the other rows stand from API-REV-001
- Deviations from the investigation's plan, and why:
  - API-05b was added. The model-free gated suites (scripted AGY CLI, 57 files) launch runs into workspaces, which D-08 now checks (RR-03), and the default suite skips them.
  - Four baseline fixes were made (TESTING rule 9, each in its own commit, none caused by this ticket): `023a9a3ff9` (B04's probe fixture), `898fbd2a31` (the NVP probe: origin and Memory helper), `0bce7bac01` (the skill-notice suites' text).
  - One stale test was updated to REQ-008 (API-AGG, committed in `903387bc78`).
  - API-07 to API-09 used CDP clicks on the product's own controls to reach the screens; the checked behavior itself ran in the real WebView.
  - In API-09, the Paste text was typed with the system keyboard, because the emulator has no shell command to put text on the phone's clipboard. The phone clipboard was read back with the system paste key.
  - The Docker server package was built from a copy of the Dockerfile without its `# syntax=` line, because the daemon's Docker Hub lookup for that frontend hung. The build steps are unchanged.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (changed durable test: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `42a86a5e93` | macOS 26 (Darwin 25.5), arm64 | Node v22.23.1, pnpm; Vitest | repository suites in the worktree |
| ENV-2 | `42a86a5e93` product + the updated probe (committed in `903387bc78`) | macOS arm64 | Chrome (playwright-core, headless); probe-owned servers from `autobyteus-server-ts/dist` built 2026-11-07 22:14–22:20 on `42a86a5e93`; phone bundle `build:mobile-web` from the same commit; `nuxt dev` for the desktop window | phone 390×844 on `http://192.168.77.10:<port>` routed to the node; desktop 1440×1000; locale en-US, UTC |
| ENV-3 | server source of `85d26ed1e8` (unchanged to `903387bc78`) | macOS arm64 | Vitest server E2E, clean env (`env -i PATH HOME=<resolved temp> TMPDIR`); Brief Studio package from `test:integration:prepare` | test-owned servers and databases per suite; API-05b adds `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<tests/fixtures/agy-failure-cli.mjs>` |
| ENV-4 | Android debug APK built from the worktree (Android unchanged since `ea8897ee53`); node = mobile-shell probe `--hold` (dist and phone bundle of `42a86a5e93`) | emulator `autobyteus277_api35`, Android 15, WebView 124.0.6367.219, headless | app data cleared, then paired by a shared pairing link (`http://10.0.2.2:<port>`) | CDP via `adb forward … webview_devtools_remote_<pid>`; uiautomator; screencap |
| ENV-5 | ENV-4's APK; node = test-owned container from `autobyteus/autobyteus-server:beta` with this worktree's server package (`1.5.12-beta.7`, linux/arm64) mounted read-only | emulator as ENV-4; Docker Desktop arm64 | node desktop Xvnc :99 in the container, `xclip` for its clipboard | published on `127.0.0.1` only; no volumes; removed with `docker rm -f -v` |
| ENV-6 | `903387bc78`, fresh clone (`git clone --no-local`) | macOS arm64 | `pnpm install --frozen-lockfile`, then the release job's `build:electron:mac -- --arm64` and its verify steps | env per TESTING § Fresh-start build; no signing (`CSC_IDENTITY_AUTO_DISCOVERY=false`) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | all web items (regression) | whole web unit/component suite | `pnpm -C autobyteus-web test:nuxt --run` | ENV-1 | Pass | `API-01-web-full-suite.txt` | `Test Files  718 passed (718)`, `Tests  5357 passed \| 2 skipped (5359)` | the first full green run on the final commit (IMP-08 was red, then only touched specs ran) |
| API-10 | AC-012, AC-013 | docs | `grep` over `autobyteus-web/docs`, `docs/design-cases.md` (in the file) | ENV-1 | Pass | `API-10-docs-read.txt` | `(no match)` for `TeamCommunicationReferenceViewer`; `agent_artifacts.md:199` owner row; `design-cases.md:94-95` (277 and 426 bullets), `:239` Case 17 | the D-13 Case 17 "fix" wording is for the Solution Designer (not a test) |
| API-02 | AC-010 | browser probe (fixture GraphQL) | `pnpm -C autobyteus-web test:e2e:fresh-run-auto-approval --output-dir=<evidence>/API-02` | ENV-2 (+ baseline fix `023a9a3ff9`) | Pass | `API-02-summary.txt`, `API-02/` (JSON, screenshots, `nuxt-dev.log`); first run `API-02-run1-fixture-gap/` | `failures: []`; `"B04": "Pass"`; B04 asserts the members line reads `<customized> of <total> customized` counted from the rows that read "Customized" (probe :434) | Run 1: all eight scenarios passed, but the probe failed on 16 × `Unexpected GraphQL operation GetProjects`. The fixture had no answer for the Projects list, which has been always on since `0fd2656528`. That is a test cause, not this ticket: baseline fix `023a9a3ff9` (TESTING rule 9) |
| API-03 | AC-011 | browser probe, probe-owned real servers, `nuxt dev` on the LAN address | `pnpm -C autobyteus-web test:e2e:node-vocabulary --output-dir=<evidence>/API-03` | ENV-2 (+ baseline fix `898fbd2a31`) | Pass | `API-03-summary.txt`, `API-03/`; earlier runs `API-03-run1-origin-refused/`, `API-03-run2-memory-select/` | `NVP-05: Pass … "sources": ["local"], "cardHasReason": true`; `unexpectedBrowserErrors: []`; screenshot `API-03/NVP-05-card-held-back.png` ("Memory Sync is waiting for its data migration.") | NVP-05 had never run to completion before. Run 1: beta refused the LAN window origin (`REMOTE_ACCESS_ORIGIN_REFUSED`, autobyteus-403's gate), so NVP-02 failed. Run 2: D-11's wait got NVP-05 through the backend restart and the card passed. Its Memory helper then waited for a source select that the page shows only for more than one source (`44ac4d3344`). Both causes are in the probe: baseline fix `898fbd2a31`. Incidental: the screenshot shows "Public address (en0)" candidates after the private and tailnet ones (D-18) |
| API-04 | AC-001, AC-002, AC-003, AC-008 (phone), AC-019 (phone); REQ-002 preserved (401 rule, network down) | phone production bundle on a probe-owned real node | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-04` (all 19 cases) | ENV-2 | **Fail** (MSP-13, MSP-18); 17 Pass | `API-04-summary.txt`, `API-04-D02-failure-analysis.txt`, `API-04/` (JSON, screenshots, server/frontend logs); diagnostic runs `API-04-run1/`, `API-04-run2/` | MSP-07 `refusals` (the three texts), `registeredAdded: []`. MSP-19 `unpaired.node: []`, `paired.feed[0].accessToken: true`, `afterUnpair.feedOpenedAfter: 0`. MSP-17 `"status": "This file is available only on the host workspace."`, `composer: 0`. MSP-13 `openPhoneAfterCheck {'pairing': 0, …}`. MSP-18 `openCheck {'bar': 'Connected', …}`, `offThenDown {'bar': 'Connected', …}`; `offStart {'bar': 'Phone access off', …}` | **Pass:** D-08 phone field (MSP-07); D-01 feed (MSP-19, also the desktop window still opens the feed); D-19 read-only status (MSP-17, screenshot `MSP-17-read-only-status.png`); the 401 rule; a revoked or Phone-Access-off phone's check on opening; "on again" Check. **Fail:** a Check on an open phone that lists its runs. Revoked stays "Connected" with the session kept (AC-002), and so does Phone Access off (AC-003). Off, then node down, ends "Connected", not "Can’t reach" (AC-003 alternate). Cause: `useRunHistorySectionLoad.readHistory` reports `{ ok: true }` for a failed Check read (see the analysis file). Also found: FU-003 (`localhost:8000/health`, pre-existing, hidden until now by the removed exemption) |
| API-06 | AC-008 (desktop half) | desktop renderer: `nuxt dev` against a test-owned node from the worktree dist, headless Chrome | temporary journey `API-06/api-06-desktop-folder-refusal.mjs.txt`: New chat → model Antigravity CLI (scripted CLI) → typed folder → send; `/definitely/not/a/folder-426`, `/etc/hosts`, `relative/dir`, an existing folder | ENV-2 | Pass | `API-06/API-06-result.json`, `API-06-missing.png`, `API-06-file.png`, `API-06-existing.png`, `server.log`, `frontend.log` | `"shown": true, "genericShown": false` for `missing` and `file`; `"registeredAdded": []`; `existing … "registered": true, "errorShown": false`; the screenshot toast "No folder at this path." | `relative/dir` is refused in the folder form by the desktop's existing client check ("Enter an absolute folder path."), before any launch. The console also logs `Error creating workspace metadata` and `Chat send failed` for each refusal (existing logging) |
| API-05 | AC-006, AC-008, AC-014, AC-018; RR-03; every E2E that registers a workspace | server E2E (real HTTP/GraphQL/WebSocket, test-owned servers) | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e`; then the four failed files again: `cd autobyteus-server-ts && env -i … pnpm exec vitest run <4 files> --no-watch` | ENV-3 | Pass (after the API-AGG update and the Brief Studio build) | `API-05-server-e2e.txt` | `Test Files  4 failed \| 112 passed \| 120 skipped (236)`; rerun `Test Files  4 passed (4)`, `Tests  29 passed (29)`; ticket files, e.g. `✓ tests/e2e/workspaces/workspace-path-refusal-run-launch.e2e.test.ts (1 test)`, `✓ tests/e2e/node-desktop/node-desktop-routes.e2e.test.ts (9 tests)`, `✓ tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts (14 tests)` | One failure came from D-08: `× API-AGG: public registration is not mkdir; …` registered a missing folder, which REQ-008 now refuses. That test was stale and is updated: the refusal and no mkdir are asserted, and the aggregate part uses a real folder. Three runtime files stopped at `Brief Studio importable package missing … build it with: pnpm -C autobyteus-server-ts test:integration:prepare` (an environment prerequisite); after that build they pass. The 120 skipped files are gated suites |
| API-05b | RR-03; run-launching E2E after D-08 | server E2E gated on `RUN_AGY_FAILURE_E2E` (scripted AGY CLI, no model) | `cd autobyteus-server-ts && env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture> pnpm exec vitest run <57 files> --no-watch`; rerun of 2 files | ENV-3 | Pass (after baseline fix `0bce7bac01`) | `API-05b-gated-agy-e2e.txt` | `Test Files  2 failed \| 53 passed \| 2 skipped (57)`; rerun `Test Files  2 passed (2)`, `Tests  5 passed (5)` | No D-08 failure in the delegation and launch suites. The two failures were `agy-skill-update-notice-*`, which expected the notice text from before `f9c1a8d5e3` (autobyteus-320 made its paths inline code). That is a test cause, not this ticket: baseline fix `0bce7bac01` |
| API-07 | AC-007; RR-01; escalation trigger (b) | Android WebView (`TrustedNavigationPolicy` via `AutoByteusWebView`) | Product path: the Delivery Team lead → ⋮ → Artifacts → `preview-426.html` (the scripted lead wrote it; its script reports `AutoByteusShell`). CDP: frame tree, frame eval, then the blocked cases (`API-07-webview-preview.txt`) | ENV-4 | Pass | `API-07-webview-preview.txt`, `API-07-preview-loaded.png`, `API-07-neg-*.png`, `API-07-other-origin-external.png`, `API-07-cdp.mjs.txt`, `API-07-hold-html-artifact.mjs.txt` | `iframe → {"src":"blob:http://10.0.2.2:56731/…","sandbox":"allow-scripts"}`; inside: `{"selfOrigin":"null","shell":"undefined","parentAccess":"blocked-SecurityError"}`; main frame `"shell":"object"`; main-frame blob: `text="Navigation blocked" … blob:http://10.0.2.2:56731/2e63c255-…`; `file:` `Not allowed to load local resource`; other origin `START u0 {act=android.intent.action.VIEW dat=https://example.com/...}` | The preview loads in place, so the WebView reported it as a subframe and trigger (b) does not fire. A foreign-origin `blob:` and `file:` are refused by Chromium before the policy. `javascript:` URLs are not navigations: they ran in the document that set them, which D-07 does not change; the policy's own `javascript:` Block is unit-tested (`TrustedNavigationPolicyTest` :45, :73, IMP-12) |
| API-08 | AC-004; REQ-003; RR-02 | Android lifecycle + phone web shell | Files → `docs/guide.md`; Home; `adb shell am kill org.autobyteus.mobile`; Recents → the card. Run A: the task the share started. Run B: a launcher task. Run C: the node removed while dead (`saved_nodes.xml` via `run-as`) | ENV-4 | **Fail** (user-visible outcome); Android restore and the alternate pass | `API-08-process-death-restore.txt`, `API-08-1…6-*.png` | Run B: `document loaded with … /mobile/?screen=files&workspace=agent_ws_229c…&file=docs/guide.md` then `location.href http://10.0.2.2:56731/mobile/, history.length 1` (run list). Run A: `Can’t reach Alpha Test Node` / `This code has expired.` Run C: `Scan the QR code on your computer` | **Pass:** the Android side saves and reopens exactly the open node and URL in the new process, and the removed node gives the ordinary start. **Fail:** the user does not get the page back. (1) The phone web shell's run-screen URL names no run, so a fresh load lands on the list (277; MSP-05 asserts it); design premise E-03 does not hold. (2) A task a shared pairing link started re-handles that link after every process death (RR-02), showing an expired-code screen |
| API-09 | AC-005; U-01 | Android WebView + noVNC + a real node desktop (test-owned Docker node) | View only, then Control. Paste: a real tap on the box, typed text, "Send to desktop", then `xclip -o` in the container. Copy: `xclip` on the desktop, "Copy", then the system paste into the box (`API-09-node-desktop-clipboard.txt`) | ENV-5 | Pass | `API-09-node-desktop-clipboard.txt`, `API-09-1…7-*.png`, `API-09-Dockerfile.monorepo.nosyntax.txt` | View only: `clipboard-open false`; Control: `"clipboardLabel": "Clipboard"`; desktop clipboard `PHONE-TO-DESKTOP-426`; `"copyLabel":"Copied","fallback":null`; phone paste → `"DESKTOP-TO-PHONE-426"` | U-01 measured: `execCommand('copy')` writes the phone clipboard from the WebView on `http://` (`navigator.clipboard` and `navigator.permissions` are undefined there). "Not connected → no Clipboard" and "no read on open" are left to the specs (IMP-09) |
| API-11 | build (guard script changed) | release desktop build from a fresh clone | `/tmp/426-api-scripts/api-11-fresh-build.sh 903387bc78` (copy: `API-11-fresh-build.sh.txt`): clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with TESTING's env, "Verify bundled Prisma", "Verify packaged terminal runtime" | ENV-6 | Pass | `API-11-fresh-start-build.txt`, `API-11-fresh-build.sh.txt` | `install exit 0`; `build exit 0`; `[guard:localization-boundary] Passed.`; `[typecheck] production errors: 0`; `prisma verify exit 0`; `[terminal-runtime] ok: node-pty spawn probe`, `terminal verify exit 0` | The install came from pnpm's content store, and no worktree build output was in the clone. Signing, notarization and the other OS builds need the runner: Not Tested |
| API-R1 | REQ-006, 008, 018 (unit) | server unit, architecture, typecheck | Reused: IMP-03 + IMP-06, IMP-04 | — | Pass | (handoff) | (handoff) | No server source changed after `85d26ed1e8`, the commit those checks ran on |
| API-R2 | AC-001, 002, 003, 005, 008, 016, 017, 019 (spec part) | web specs, guards, typecheck | Reused: IMP-09, IMP-10, IMP-11, IMP-14 | — | Pass | (handoff) | (handoff) | IMP-14 reran on `1d2cdd15ab` everything changed after IMP-09; API-01 reran the whole web suite |
| API-R3 | AC-004, AC-007 (unit part); QR-001 | Android unit; manifest | Reused: IMP-12 | — | Pass | (handoff) | (handoff) | Android unchanged since `ea8897ee53` |
| API-R4 | AC-016 | rendered Phone Setup | Reused: IMP-13 | — | Pass | (handoff) | (handoff) | Its files are unchanged since `b1d92c7ced` |
| API-R5 | AC-014 (R-01) | AR-14 timing | Reused: IMP-05 | — | Pass | (handoff) | (handoff) | A measurement; the test itself ran in API-05 |

| API-01 (r2) | all web items (regression after SR-008) | whole web suite | `pnpm -C autobyteus-web test:nuxt --run` | ENV-1 at `d115f1601d` | Pass | `API-01-r2-web-full-suite.txt` | `Test Files  718 passed (718)`, `Tests  5361 passed \| 2 skipped (5363)` | — |
| API-04 (r2) | AC-001, AC-002, AC-003, AC-008 (phone), AC-019 (phone); REQ-002 preserved | phone production bundle on a probe-owned real node | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-04-r2` (all 19 cases); phone bundle rebuilt on `d115f1601d` | ENV-2 at `d115f1601d` | Pass | `API-04-r2-summary.txt`, `API-04-r2/` (JSON, screenshots, logs) | `"result": "Pass"`, `unknownBrowserErrors: 0`. MSP-13 `openPhoneAfterCheck {"pairing": 1, "sessionLeft": null}`, `credentialChecks ["phone-unknown-credential 401", "phone 403", "phone-revoked 403"]`. MSP-18 `openCheck {"bar": "Phone access off", …, "rows": 27, …}`, `offThenDown {"bar": "Not reachable", "banner": "Can’t reach Alpha Test Node. Check", …}`. MSP-12 `checksDuringPoll 0` | F-API-001 resolved. Probe updated this execution: operation names from the query text; MSP-12 asserts the poll sends no `PhoneCredentialCheck`; MSP-13/18 record each check's answer. The connection sheet says "Not reachable" while the bar says "Phone access off" (`openCheck.sheet`), the implementation handoff's known risk |
| API-02 (r2) | AC-010 | browser probe | as API-02, `--output-dir=<evidence>/API-02-r2` | ENV-2 at `d115f1601d` | Pass | `API-02-r2/` | `failures []`; B01…B08 Pass | rerun because its page renders the desktop run section (`useRunHistorySectionLoad` changed) |
| API-03 (r2) | AC-011 | browser probe | as API-03, `--output-dir=<evidence>/API-03-r2` | ENV-2 at `d115f1601d` | Pass | `API-03-r2/` | `"result": "Pass"`, NVP-01…05 Pass, `unexpectedBrowserErrors: []` | rerun because NVP-04 opens the phone shell (its check changed) |
| API-08 (r2) | AC-004a | Android lifecycle + phone web shell | API-08-r2-steps.sh.txt: on `/mobile?unsupported=desktopWorkspace` → Home → `am kill` → Recents; Run A share-started task, Run B launcher task, Run D a new share while dead, Run C node removed while dead | ENV-4 at `d115f1601d` (APK and phone bundle) | Pass | `API-08-r2-process-death-restore.txt`, `API-08-r2-*.png`, `API-08-r2-hold/` (receipt) | A and B after: `"loadedWith":"http://10.0.2.2:50737/mobile/?unsupported=desktopWorkspace"`, `"notice":true`, `"pairing":false`, `text="Unsupported on phone"`; D: `loadedWith … /mobile?pairing=…`, `devices after: 2`; C: `text="Scan the QR code on your computer"`, devices still 2 | F-API-002 resolved for AC-004a. Run C also shows that a recreated activity does not re-run the share that started it (a re-run would have paired a third device) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 (MSP-19), API-R2 (`app.spec.ts`) | Proven | — |
| AC-002 | Yes | API-04 (r2) MSP-13: the check on opening and the open phone's Check both land on pairing with the session removed (credential checks `phone 403`, `phone-revoked 403`); API-R2/IMP-15/16 specs | Proven | — |
| AC-003 | Yes | API-04 (r2) MSP-18: the open phone's Check while off (27 runs listed), the check on opening while off, on again → Connected with runs, off → node down → "Can’t reach", back → Connected; session kept throughout | Proven | — |
| AC-004a | Yes | API-08 (r2): share-started and launcher tasks reload the same node and `/mobile` URL (navigation entry) with no expired-code screen; a new share while dead connects; node removed → ordinary start; API-R3/IMP-15 unit tests of the restore and the re-delivery rule | Proven | — |
| AC-004b | — | Round 2 (DEC-013): run screens; in this round a run screen still comes back as the list (API-REV-001 API-08 Run B) | Not in this round | — |
| AC-005 | Yes | API-09, API-R2 | Proven | — |
| AC-006 | No | API-05 (`node-desktop-routes.e2e.test.ts`), API-R1 | Proven | — |
| AC-007 | Yes | API-07, API-R3 | Proven | — |
| AC-008 | Yes | API-04 (MSP-07, phone), API-06 (desktop), API-05 (GraphQL refusal, RR-03 run launch, registered missing folder still loads), API-05b, API-R1/R2 | Proven | — |
| AC-010 | No | API-02 | Proven | — |
| AC-011 | No | API-03 | Proven | — |
| AC-012 | No | API-10 | Proven | — |
| AC-013 | No | API-10 | Proven (the Case 17 "fix" wording is for the Solution Designer) | — |
| AC-014 | No | API-05, API-R5 | Proven | — |
| AC-016 | Yes | API-R4 (IMP-13 rendered), API-R2 | Proven | — |
| AC-017 | Yes | API-R2 (guard, zh-CN spec), API-01 | Proven | — |
| AC-018 | No | API-R1 (unit), API-05 (Memory Sync E2E); incidental render in `API-03/NVP-05-card-held-back.png` | Proven | — |
| AC-019 | Yes | API-04 (MSP-17 phone read-only, MSP-16 writable), API-R2 (spec) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | API-01 (r2), API-04 (r2), API-08 (r2), API-02/03 (r2); API-05…07, 09…11 and API-R1…R5 standing | AC-004b is round 2 by decision (DEC-013); the D-13 Case 17 "fix" wording is for the Solution Designer | — |
| Changed-boundary execution directness | 95% | 95% | API-04 (r2) (the phone's credential check against a real node's 401/403/200), API-08 (r2) (real process death), API-07, API-09 | — | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | API-04 (r2) real bundle ↔ real node; API-09 noVNC ↔ Xvnc; API-05/05b | — | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | ENV-1…6 (r2: d115f1601d APK and phone bundle) | an emulator rather than a physical phone (standard Activity lifecycle and the system WebView engine; negligible for these behaviors); API-09's typed Paste text and Dockerfile frontend line (deviations noted) | a physical device run |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | MSP-13 (401, revoked), MSP-18 (off, on, off → down), MSP-09 (down), API-08 (r2) A–D, API-07 blocked cases | — | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | API-04 (r2), API-06, API-07…09, API-R4, API-11 | the connection sheet still says "Not reachable" while the bar says "Phone access off" (known, accepted in the implementation handoff's Known Risks) | — |
| Durable regression coverage quality and relevance | 95% | 95% | MSP-07/13/17/18/19 and MSP-12's no-check-from-the-poll assertion; API-AGG; OpenPageRestoreTest for the restore and re-delivery rule | process death itself is emulator-only (the project has no Android instrumented E2E layer) | — |

- Overall post-repository confidence: 95% (round 1 first execution: 77%)
- Overall final confidence: 95% (round 1 first execution: 76%)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. Known and accepted: the connection sheet's "Not reachable" while Phone Access is off; AC-004b in round 2; FU-001…FU-003 outside the ticket

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone bundle, desktop renderer), `Live API` (server E2E), `Lifecycle` and `Other` (Android emulator, Docker node desktop), `Project Desktop Validation` (fresh-start build)
- Confidence gap it addressed: the phone's real client against a node's real refusals; the WebView navigation rule; process death; the clipboard on `http://`; every workspace-registering E2E after D-08
- Browser validation needed: yes. The phone-bundle rule in TESTING, and D-02/D-08/D-19/D-01 cross the client–server boundary on the phone
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: no Electron main, preload or IPC code changed. The desktop renderer's D-08 path ran in a browser window against a real node (API-06). The build input that changed was proven by a fresh-start packaged build (API-11).
- Cases proving web-equivalent behavior: API-06, API-R4. Shell-specific: none changed; API-11 builds and verifies the packaged app.
- Effect on any already-running desktop application: `None` (all servers test-owned on free ports; the user's Docker nodes `autobyteus-server-0/1/2` untouched)
- Behavior not directly proven and its confidence consequence: none beyond the failures above

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: a registered workspace whose folder is gone (API-05, `workspaces-graphql` / D-08 E2E from IMP-07); the Android saved-node store and saved-instance state (API-08)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-05
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: MSP-17, MSP-18, MSP-19 (new); MSP-13, MSP-07 (updated); per-case expected browser lines and the `failedRequests` log (`903387bc78`); operation names from the query text, MSP-12's "the poll sends no credential check", MSP-13/18 recording each check's answer (committed with this report) | Added / Updated | API-04, API-04 (r2) | The removed app-wide `KNOWN_BROWSER_LINES` entry exempted the unpaired phone's feed retries to `localhost:8000` (REQ-001/D-01 removes them). Its `ERR_CONNECTION_REFUSED` alternative also hid FU-003. Replaced by MSP-19's socket log, the per-case expected lines, and an FU-003 exemption tied to that exact failed request |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (API-AGG) | Updated (`903387bc78`) | API-05 | — |
| `autobyteus-web/tests/e2e/fresh-run-auto-approval-probe.mjs` (fixture answers `GetProjects`) | Updated, baseline fix (`023a9a3ff9`) | API-02 | — |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` (allowed window origin; one-source Memory page) | Updated, baseline fix (`898fbd2a31`) | API-03 | — |
| `autobyteus-server-ts/tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts`, `agy-skill-update-notice-transport.e2e.test.ts` (inline-code notice text) | Updated, baseline fix (`0bce7bac01`) | API-05b | — |

- Added or updated paths attached for proportional test-code review: `Yes` (`autobyteus-web/tests/e2e/mobile-shell-probe.mjs`, `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts`, and the three baseline-fixed test files)
- Diff or repository evidence supplied for removed paths: the `KNOWN_BROWSER_LINES` removal is in `git show 903387bc78 -- autobyteus-web/tests/e2e/mobile-shell-probe.mjs`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtimes / models | scripted AGY CLI (`agy-failure-cli.mjs`), recorded Grok ACP replay | no provider calls are needed for these behaviors | none for this ticket |
| Phone hardware | Android emulator (Android 15, WebView 124) | no physical device attached | WebView version and OEM differences |
| Phone LAN path | probe's routed private origin `192.168.77.10`; emulator's `10.0.2.2` | test isolation | none material (Host/Origin kept) |
| B04 fixture GraphQL | the probe's own fixture | the probe's design | proves the client rule only |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (API-02/03/04, hold stack) | Yes | the probes' `finally` | receipts: `serversLeft: 0`, `rootRemoved: true`, frontend exited |
| API-06 temporary journey (server, `nuxt dev`, Chrome, temp root) | Yes | script `finally` | `"rootRemoved": true`, children exited |
| Emulator `autobyteus277_api35` session, debug app | Yes | `adb uninstall org.autobyteus.mobile`, `adb forward --remove-all`, `adb emu kill` | removed; `adb devices` empty |
| Docker container `api426-node`, `/tmp/426-server-package` | Yes | `docker rm -f -v api426-node`, `rm -rf` | removed (`docker ps -a --filter name=api426` empty) |
| Temp HOMEs for E2E runs | Yes | `rm -rf` | removed |
| `applications/brief-studio/dist/importable-package` | Yes (built by `test:integration:prepare`) | kept: an untracked build output the suites need | untracked |
| Fresh clone `/tmp/426-fresh-clone` | Yes | `rm -rf` after API-11 | removed |
| Temporary scripts `/tmp/426-api-scripts/` | Yes | copies kept as evidence (`*.mjs.txt`, `*.sh.txt`) | — |

## Preliminary Classification (On `Fail`)

API-REV-002: not applicable (Pass). The API-REV-001 findings below are kept for history and are resolved: F-API-001 by SR-008's credential check (API-04 (r2) MSP-13, MSP-18); F-API-002 by SR-008's re-delivery rule and the narrowed REQ-003 (AC-004a, API-08 (r2)), with run screens in round 2 (AC-004b, DEC-013).


- **F-API-001 — `Design Impact` (AC-002, AC-003; D-02 / DS-002 / SR-005).** The phone's Check does not learn that its own history read failed. `useRunHistorySectionLoad.readHistory` returns `{ ok: true }` for a failed read when runs are already listed (`listsAnyRun()` guard). It also does so when a quiet poll supersedes the Check's read during the up-to-10-second readiness wait (the generation check in `fetchTree`'s catch). So `remoteAccessReadRefusal` is never reached on an open phone: revoked and Phone-Access-off phones stay "Connected", and off → node down ends "Connected". The design traced the error to `readHistory`'s `cause` but not through its `ok` decision (`API-04-D02-failure-analysis.txt`). How the Check learns its own read's failure, given the quiet poll and the store's single error, is a design choice. Recommended owner: Solution Designer.
- **F-API-002 — `Design Impact` (AC-004; D-03 / DS-003, premise E-03, RR-02).** The Android restore reopens the saved URL, but the user does not get the page back:
  - (a) the phone web shell's run-screen URL names no run, and a fresh load lands on the run list, so E-03 ("the WebView's current URL names the open page") does not hold;
  - (b) an activity a shared pairing link started re-handles that link after every process death, showing "This code has expired" (RR-02 accepted the order, but REQ-003's outcome is lost for those users).

  Recommended owner: Solution Designer.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None` (AC-004b is round 2 by DEC-013)
- Preliminary classification and recommended owner: N/A (Pass). API-REV-001's F-API-001 and F-API-002 are resolved (see the revision record)
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Pass, architectural_risk=High: proportional test-code review)
- Notes (API-REV-002): every round-1 criterion is proven on its real surfaces; the durable test changes go to proportional test-code review.
- Notes (API-REV-001, history):
  - Everything else is proven on its real surfaces.
  - Rerun plan after the fixes: MSP-13, MSP-18 (and the full mobile-shell probe if the phone bundle changes widely), API-08, and API-01 for web changes. API-07, API-09 and API-05/05b stay valid unless their exercised code changes.
  - Follow-up FU-003 was added to `follow-ups.md`.

---

# Ticket Round 2 (items 9, 20, 21, 22, 23) — API/E2E execution

## Round

- Coverage investigation: the same file, § Ticket Round 2
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md` (rows `T2-*`)
- Round and trigger: ticket round 2, after CRR-007 Pass (Full Review of IR-005). Base `d785ded109`, head `a3bc0525cd` (last code commit `736b51f87a`)
- Prior round reviewed: round 1 (API-REV-001/002, Pass). Its results cover round-1 code; round-2 product changes are D-09, D-20, D-21, D-22, D-23 only
- Deviations from the plan:
  - MSP-20's running → idle uses one long tool call (the scripted CLI's `CALL_TOOLS` with `delayMs`), because Stop generation leaves a scripted agent in `error`, not `idle`.
  - The AC-009c hidden/background check moved into MSP-20, where a hub is known to be in the read; MSP-12 records its list count instead of requiring one.
  - NP-13's control changed from the `nuxt dev` origin (which answers as alpha) to a plain HTTP server.
  - One debug run was cut off by the app's restart and was discarded.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/evidence/api-e2e/` (files `T2-*`)

## Routing Classification

- Task size `Medium`; architectural risk `High`; input route `Reviewed`; successful-output route `Code Review`; proportional test-code review: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| T2-ENV-1 | `a3bc0525cd` product; probes as committed in `94d7dca6b4` | macOS arm64 | Node v22.23.1; headless Chrome; probe-owned servers from `autobyteus-server-ts/dist` and `build:mobile-web` built on `a3bc0525cd` (04:41–04:44); `nuxt dev` | phone 390×844 on `http://192.168.77.10:<port>`; desktop 1440×1400; en-US, UTC; `lvh.me` resolves to 127.0.0.1 |
| T2-ENV-2 | `a3bc0525cd` | macOS arm64 | Vitest server E2E, clean env (`env -i`), Brief Studio package present | `RUN_AGY_FAILURE_E2E=1` + scripted AGY CLI for T2-04b |
| T2-ENV-3 | `94d7dca6b4`, fresh clone | macOS arm64 | `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64`, verify steps | TESTING § Fresh-start build env; no signing |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T2-01 | AC-009a, b, c, d (runtime); round-1 phone criteria (regression) | desktop Runs view + phone production bundle on a probe-owned node | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/T2-01` (all 20 cases) | T2-ENV-1 | Pass | `T2-01-summary.txt`, `T2-01/` (JSON, `MSP-20-*.png`, logs); debug runs `T2-01-debug/`, `T2-01-debug3/` | MSP-20 `quiet`: `"desktopStatusReads": 3, "desktopViewReads": 0, "phoneStatusReads": 3, "phoneViewReads": 0`, desktop read `"bytes": 1650, "statuses": 7, "hubBytes": 511, "hubStatuses": 2`, phone read `556`. `running`: `"desktopAfterNodeMs": 4570, "phoneAfterNodeMs": 4992`, view reads 0. `idleAgain`: `210` / `828` ms, view reads 0. `phoneHidden`: `"onRunScreen": 0, "inBackground": 0, "firstReadAfterShownMs": 41`. `openRun`: `"statusReads": 2, "hubInRead": 0`. `third`: `5272` / `5277` ms, `"desktopViewReads": 1, "phoneViewReads": 1`. `stop`: offline `1942` / `2364` ms, one view re-read each. MSP-02 `unselected.changeMs` within one poll | Every unchanged poll sent only the status read and no view read. A state change alone caused no view read; a new child or the stop caused exactly one per surface. The phone polls the states only with its list on screen. The 7 statuses in the desktop read are the hub's 2 plus another listed run's 5 (≤ 10 children, 1650 bytes) |
| T2-02 | AC-020 (2) | Nodes page (Change address), probe-owned servers | `pnpm -C autobyteus-web test:e2e:remote-nodes-page --output-dir=<evidence>/T2-02` (NP-01…13) | T2-ENV-1 | Pass | `T2-02-summary.txt`, `T2-02/` (`NP-13-*.png`); first run `T2-02-run1-control/` | NP-13 `"refused": "The node at this address doesn’t accept the name lvh.me. Add lvh.me to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address."`, `"notNode": "Something answers there, but it isn't an AutoByteus node."`, `"before" == "after"` | AC-020 (3), the connect flow trying a refused name, is not reachable in the real page (see the investigation). It is covered by `nodeConnectionErrorText.spec.ts` (IMP-R2-01) and the server E2E's `host_refused` attempt (T2-04) |
| T2-03 | AC-021 | token-statistics probe on fixed days | `pnpm -C autobyteus-web test:e2e:token-statistics-ui --day=2026-12-07` / `--day=2026-12-20` / (no `--day`) | T2-ENV-1 | Pass | `T2-03-token-statistics-days.txt`, `T2-03-<day>/` | `result Pass failures []` for each day; `clock {"day": "2026-12-07", …}`, `{"day": "2026-12-20", …}`, `{"day": "real clock"}` | The 1st is IMP-R2-04's run on the final code |
| T2-04 | AC-020 (1), AC-023, D-09 server read, regression | server E2E | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | T2-ENV-2 | Pass | `T2-04-server-e2e.txt` | `Test Files  117 passed \| 120 skipped (237)`; `✓ tests/e2e/remote-collaboration/peer-host-refused.e2e.test.ts (2 tests)` | `peer-host-refused` ran (not skipped): `lvh.me` resolves to 127.0.0.1 here. No failure |
| T2-04b | D-09 server read (standalone root), regression | server E2E gated on `RUN_AGY_FAILURE_E2E` | `cd autobyteus-server-ts && env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm exec vitest run <57 files> --no-watch` | T2-ENV-2 | Pass | `T2-04b-gated-agy-e2e.txt` | `Test Files  55 passed \| 2 skipped (57)` | the 2 skipped need other gates |
| T2-R1 | AC-009d, AC-020 (1), AC-023 (focused) | server/web focused tests | Reused: IMP-R2-01 | — | Pass | (handoff) | (handoff) | code unchanged since `23483d0cf8` |
| T2-R2 | AC-022 | model-routing probe | Reused: IMP-R2-03 | — | Pass | (handoff) | `Result: Pass` | nothing it drives changed after `c4521d4402` |
| T2-R3 | all round-2 items | web suite, server unit, both typechecks | Reused: IMP-R2-05 | — | Pass | (handoff) | `Test Files  721 passed (721)`; `952 passed \| 5 skipped (957)` | ran at `736b51f87a`, the last code commit |
| T2-R4 | AC-021 (the 1st) | token probe | Reused: IMP-R2-04 (12-01 rerun) | — | Pass | (handoff) | `IMP-R2-ts-2026-12-01-rerun Pass` | on the final code |
| T2-05 | build (`generated/graphql.ts` changed) | release desktop build from a fresh clone | `/tmp/426-api-scripts/api-11-fresh-build.sh 94d7dca6b4` (copy `API-11-fresh-build.sh.txt`) | T2-ENV-3 | Pass | `T2-05-fresh-start-build.txt` | `install exit 0`; `build exit 0`; `[typecheck] production errors: 0`; `prisma verify exit 0`; `[terminal-runtime] ok: node-pty spawn probe`, `terminal verify exit 0` | signing, notarization and other OS builds need the runner: Not Tested |

## Acceptance-Criteria Proof (ticket round 2)

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-009a | Yes | T2-01 (MSP-20 quiet, running, idleAgain; bytes), T2-R3 specs | Proven | — |
| AC-009b | Yes | T2-01 (MSP-20 third, stop) | Proven | — |
| AC-009c | Yes | T2-01 (MSP-20 phone timings, phoneHidden; MSP-12 status reads per window) | Proven | — |
| AC-009d | No | T2-01 (MSP-20 openRun: `hubInRead 0`), T2-R1 spec | Proven | — |
| AC-020 | Yes | (1) T2-04 `peer-host-refused` (ran), T2-R1; (2) T2-02 NP-13; (3) T2-R1 web spec + T2-04's `host_refused` attempt (not reachable in the real page: the investigation's reason, DEC-017 / FU-004) | Proven | — |
| AC-021 | No | T2-03 (12-07, 12-20, today), T2-R4 (12-01) | Proven | — |
| AC-022 | No | T2-R2 | Proven | — |
| AC-023 | No | T2-R1, T2-R3, T2-04 (`request-origin-and-phone-routes` 11/11) | Proven | — |

## Validation Confidence Scorecard (ticket round 2)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | T2-01…05, T2-R1…R4 | AC-020 (3) through the page is not reachable by design; spec- and server-proven | — |
| Changed-boundary execution directness | 85% | 95% | MSP-20 against a real node's status read and runs; NP-13 against a real Host gate | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real servers, real scripted runtimes, real browser network log | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | probe-owned stacks; `lvh.me` → 127.0.0.1 | the poll timings depend on this machine's load (all well inside one poll) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | run stop → offline; a new child; hidden/background; refused name vs non-node answer; days 1/7/20 | — | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | desktop Runs view and phone list (MSP-20); Nodes page (NP-13); fresh-start build | the Workspaces tree is not separately measured (it uses the same section load, collaboration store and row component as the Runs view; specs IMP-R2-01/05) | — |
| Durable regression coverage quality and relevance | 85% | 95% | MSP-20, MSP-02 (a), MSP-12, NP-13 in the repository probes | — | — |

- Overall post-repository confidence: 86% (reused implementation checks only)
- Overall final confidence: 95%
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. The Workspaces tree is covered by shared code and specs, not by its own probe step; AC-020 (3) is spec- and server-proven by design (FU-004)

## Broader Validation Decision (ticket round 2)

- Decision: `Required` (executed). Modes: `Browser` (desktop Runs view, phone bundle, Nodes page), `Live API` (server E2E), `Project Desktop Validation` (fresh-start build)
- Gap addressed: the poll's real request pattern and bytes (only a browser network log can show "no view read"); the phone's poll gating; the Nodes page's text from a real server refusal; the generated GraphQL in a release build

## Durable Coverage Changed In The Codebase (ticket round 2)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: MSP-20 (new); MSP-02 part (a) (updated: REQ-009 replaces 277 DEC-013's "updated once the root is opened"); MSP-12 (status reads per window); phone network log records `runIds` | Added / Updated (`94d7dca6b4`) | T2-01 | MSP-02's old assertion (`unselectedSeen.length === 1`, the row kept its last read) asserted behavior REQ-009 intentionally changes. It is replaced by "the dot follows within one poll without opening the root" |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs`: NP-13 (new) | Added (`94d7dca6b4`) | T2-02 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated (ticket round 2)

Scripted AGY CLI for every agent turn (no provider calls); probe-owned servers. The token probe's shifted clock (`--day`) is the design's own test seam (D-21).

## Temporary Methods And Cleanup (ticket round 2)

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| probe stacks (T2-01, T2-02, T2-03 ×3) | Yes | the probes' `finally` | receipts `serversLeft: 0`, `rootRemoved: true`; token probe frontend/backend `terminated` |
| the interrupted debug run's temp data root | Yes | removed by hand after the app restart (`mobile-shell-probe-ARKYBb`) | removed |
| temp HOMEs (T2-04, T2-04b), fresh clone (T2-05) | Yes | `rm -rf` | removed |

## Latest Authoritative Result (ticket round 2)

- Result: `Pass`
- Criteria not proven: `None`
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Pass, architectural_risk=High: proportional test-code review of `94d7dca6b4`)
- Notes: round 1's results stand for round-1 code (unchanged by round 2 apart from the shared files the full suites and the full mobile-shell probe reran)
