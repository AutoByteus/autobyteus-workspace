# API/E2E Execution Coverage Report — ios-demo-mode-279 (autobyteus-279): the iOS app's built-in demo for App Review

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 2; Code Reviewer CRR-003 (failure-origin review of F-1 → IR-002, reviewed `49e69c9887..4ad317c20d`); HEAD `4ad317c20d`
- Prior round reviewed: round 1 (`API-REV-001`, `Fail` F-1, 88%). The delta since round 1 is iOS-only: 14 Swift files (the placeholder-name migration, one name rule, new core tests); no build input, no web or server change
- Deviations from the investigation's plan, and why:
  - Round 2 reran only what IR-002 can change, as CRR-003 asked: the iOS fresh-start build with its core tests and iPhone smoke, API-04 (the shipped app → update, Paste a link, the injected scan, Type an address) with the names on the page **and** on the native screens. The phone probe, the web and iPad demo checks, the share extension and the download keep their round-1 results (untouched paths; see Cases).
  - The node ran from a new FS-DOCKER clone at `4ad317c20d` (same server and web code as round 1).
  - FS-iOS run 1 and API-04a run 1 collided: I started the shipped app's test on the same simulator while FS-iOS's smoke used it, and both failed (my scheduling, not the product). The smoke step was rerun alone (`FS-iOS-smoke-run2.log`); every earlier FS-iOS step had passed in run 1.
  - API-04b needed four runs; each began from a clean install of the shipped app (`run-base.sh`). Runs 1–2: my query for the page's node button (WebKit does not expose it as a button). Run 3: after reopening the current node from the native list, the page came back as it was left, its connection sheet still open, so the run list behind it was hidden from accessibility (an observation, not a failure; see Notes). Run 4 closes the sheet: `Pass`.
  - Host load average 13–585 (other processes on this machine, not mine; `ReportCrash` and `fseventsd` busy). No case was lost to it this round.
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/evidence/api-e2e/`
  - Round 2, `r2/`: `FS-iOS-run1-collided.log` (clone … core tests, all `exit=0`; the smoke collided), `FS-iOS-smoke-run2.log`, `FS-iOS-smoke/`, `FS-iOS-AutoByteusMobileCoreTests.xcresult`, `FS-DOCKER.log`; `API-04a-shipped-app*.log` and `-shots/` (one per clean install: runs 2–4 and the final), `API-04a-shipped-app-run2-saved-entry.txt`, `API-04b-update*.log` and `-shots/` (runs 1–3 and the final), `API-04b-saved-after-update.txt`, `API-04c-type-address*`, `API-04d-paste-link*`, `API-04e-scan*`; `node-279.log`, `node-279-server.log`
  - Round 1: `FS-*.log`, `api-01-*`, `api-01b-*`, `ios/`
  - `scripts/` (temporary tools: `fs-ios.sh`, `fs-other.sh`, `node-279.mjs`, `run-ui.sh`, `run-new.sh`, `run-base.sh` (round 2), `ios/ApiE2E279UITests.swift` (round 2: `recordNames`), `ios/ApiE2E279ShippedAppUITests.swift`; the test files were only ever added to clones)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (this round: `Pass` → the code reviewer's test-code review of `4352ec81fa`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `4ad317c20d`; round 1: `429af9bd66` | macOS 26 arm64, Xcode 26.1.1 (the runner selects 26.3), Node 22.23.1, pnpm 10.28.2 | fresh clones (`git clone --no-local`, 0 prior build folders) under `~/.cache/abtest279` (not symlinked) | the workflow's default bundle ids; unsigned |
| ENV-2 | `429af9bd66` (+ API/E2E's `mobile-code-wrap-cases.mjs` fix) | macOS, headless Chrome | the phone probe's alpha/beta nodes from the round-1 FS-DOCKER clone | clean env (`env -i`, temp HOME) |
| ENV-3 | round 2: `4ad317c20d` app; base `8430d9ef12` app | my own simulators `apie2e279-iphone` (iPhone 17 Pro Max) and `apie2e279-ipad` (iPad Air 11-inch (M3)), iOS 26.1, English; created again for round 2 | the fresh-start clone's app (`CURRENT_PROJECT_VERSION` 2) with my temporary UI tests, installed over the shipped app (1.3.82, build 1) | deleted afterwards |
| ENV-4 | round 2: `4ad317c20d` | macOS | a real node (`node-279.mjs`) from the round-2 FS-DOCKER clone, named "Test Node 279", bound to `192.168.2.158` and admitting only `192.168.2.158/32`; scripted AGY; the run "Fact Checker" | 5-minute pairing codes made just before each run, kept in `/tmp` only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-002…008 (unit, probes, simulator); IR-002's checks | — | IMP-01…IMP-15 | — | Reused (`Pass`) | implementation handoff | — | IMP-13…15: IR-002's core tests and its simulator rows |
| FS-iOS | build inputs; AC-011 (iOS); IR-002's core tests | `release-ios.yml` `build-ios` | `scripts/fs-ios.sh <worktree> 4ad317c20d ~/.cache/abtest279/fs-ios r2 apie2e279-iphone`; the smoke step rerun alone (`ios-simulator-smoke.sh`, the job's variables) | ENV-1 | `Pass` (round 2) | `r2/FS-iOS-run1-collided.log`, `r2/FS-iOS-smoke-run2.log`, `r2/FS-iOS-smoke/summary.txt`, `r2/FS-iOS-AutoByteusMobileCoreTests.xcresult` | `# fresh: 0 prior build folders`; "The demo answers all 252 compiled operations"; clone … core tests each `exit=0`; core `Executed 56 tests, with 0 failures` (42 in round 1; IR-002's new tests, incl. the migration's, from a non-symlinked path); smoke `Executed 8 tests, with 0 failures`, "Smoke UI tests: executed and passed without skips" | run 1's smoke collided with my own API-04a run on the same simulator ("Early unexpected exit … before establishing connection"); my scheduling |
| FS-DOCKER | build inputs (`build-mobile-web.mjs`) | the server image's builder stage | `scripts/fs-other.sh docker … 4ad317c20d …` | ENV-1 | `Pass` (round 2) | `r2/FS-DOCKER.log` | each `exit=0`; "The /mobile build holds no demo code." | also the node's build for API-04 |
| FS-DESKTOP | build inputs (web `package.json`, `nuxt.config.ts`, lockfile) | `release-desktop.yml` macOS arm64 | round 1 | ENV-1 | `Pass` (round 1; still valid: IR-002 changes no desktop input) | `FS-DESKTOP.log`, `FS-DESKTOP-verify.log` | `[typecheck] PASS`; the DMG and zip; `[terminal-runtime] ok` | — |
| API-01 | AC-011, AC-008 | real phone shell, isolated nodes | round 1 | ENV-2 | `Pass` (round 1, with a test fix; still valid: no web change since) | `api-01-mobile-shell.log`, `api-01b-msp50-52.log` | 87 cases; after the fix `MSP-52 Pass`, `mobile-shell probe: Pass` | the fix: `mobile-code-wrap-cases.mjs` (`4352ec81fa`) |
| API-02 | AC-006 | the share extension from Safari; the app | round 1 | ENV-3, ENV-4 | `Pass` (round 1; still valid: IR-002 does not touch the extension or the kept-share path) | `ios/API-02*` | the four extension messages; the app acts once | — |
| API-03 | AC-007, TR-012 | iPad app, the demo | round 1 | ENV-3 | `Pass` (round 1; still valid: no web or layout change) | `ios/API-03-ipad-rotation-shots/` | the run stays open across rotations | — |
| API-04a | REQ-013 (the existing data) | the shipped app pairs and saves | `scripts/run-base.sh r2 API-04a-shipped-app` (a clean install of `8430d9ef12`, `ApiE2E279ShippedAppUITests`, a fresh link; then the saved entry decoded from the app group) | ENV-3, ENV-4 | `Pass` | `r2/API-04a-shipped-app.log`, `r2/API-04a-shipped-app-shots/shipped-app-paired.png` | `saved entries: [{'displayName': 'AutoByteus Desktop', 'baseURL': 'http://192.168.2.158:49768'}]` (F-1's starting point, as in round 1) | the same on each of the four clean installs |
| API-04b | AC-001, REQ-013; F-1 | the new app installed over the shipped app | `run-new.sh testUpdateOpensTheSavedComputer iphone API-04b-update` (no reset): opens at launch; the page's node button and connection sheet; "Switch node" → the native start screen, the row's More, the Remove sheet and its confirmation (Cancel); the row reopened; the same again | ENV-3, ENV-4 | `Pass` (F-1 resolved) | `r2/API-04b-update.log`, `r2/API-04b-update-shots/update-*.png`, `update-page-names.txt`, `update-native-names.txt`, `update-reopened-*`; `r2/API-04b-saved-after-update.txt` | page: `page node button: Test Node 279, Connected. Connection`, sheet `["Connected", "Test Node 279"]`; native: `native rows: ["AutoByteus node, Online, current node"]`, `More for AutoByteus node`, Remove sheet `AutoByteus node`, "Remove AutoByteus node from this phone? …"; the same after reopening; stored: `autobyteus.migrations.saved-node-display-name-placeholder done`, the backup `…:before-display-name-placeholder` holds "AutoByteus Desktop", the entry's name is now the host (never shown) | as CRR-003 expects: natively "AutoByteus node" until the page reports `paired` with a name (only a new pairing does). Reopening the current node returns its page as it was left (here, the connection sheet still open): observation |
| API-04c | AC-001 | Type an address (reset) | `run-new.sh testTypeAnAddress iphone API-04c-type-address` | ENV-3, ENV-4 | `Pass` | `r2/API-04c-type-address.log`, `-shots/type-address-*.png`, `type-address-native-names.txt` | `landed=run list` (the web view kept its pairing); page `Test Node 279, Connected. Connection`; native `AutoByteus node, Online, current node`, Remove sheet `AutoByteus node`; no address shown as a name (round 1: "192.168.2.158") | — |
| API-04d | AC-001 | Paste a link (reset) | `run-new.sh testPasteALink iphone API-04d-paste-link paste` | ENV-3, ENV-4 | `Pass` | `r2/API-04d-paste-link.log`, `-shots/` | "Test Node 279" on the page and natively (row, More, Remove sheet, confirmation), and again after a relaunch | — |
| API-04e | AC-001 | the scanned code (injected, reset) | `run-new.sh testScannedPairingCode iphone API-04e-scan scan` | ENV-3, ENV-4 | `Pass` | `r2/API-04e-scan.log`, `-shots/` | "Test Node 279" on the page and natively | — |
| API-05 | C-03 (residual) | Download of a 40 MB PDF from a real node | round 1 | ENV-3, ENV-4 | `Pass` (measured, round 1; still valid: untouched path) | `ios/API-05-pdf-download-shots/pdf-download-timing.txt` | `sheetAt=4.38 s; maxRead=1.82 s` | — |
| NT-01 | build-only `release-ios.yml` | GitHub runner | — | — | `Not Tested` | — | — | needs the branch pushed (RELEASE.md, DESIGN.md rule 12); API/E2E does not push. For delivery, on the right word |
| NT-02 | AC-002 camera, AC-003 airplane mode, AC-009, AC-010, REQ-012(3) | device, TestFlight | — | — | `Not Tested` | — | — | only on the founder's word (REQ-014); nothing went to Apple, TestFlight or App Store Connect |

## Failures

None open. F-1 (round 1) is resolved by IR-002: API-04b, run 4.

- Not failures of this ticket: FS-iOS run 1's smoke and API-04a run 1 (my two runs on one simulator); API-04b runs 1–3 (my test's queries; run 3 also shows the kept page state below); FS-iOS's symlinked-path failure (round 1, FU-005).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04a…e (the update opens the saved computer under the node's own name; QR injected, Paste a link, Type an address with a real node), FS-iOS smoke, R-IMP | `Proven` on the simulator | — |
| AC-002 | Yes | R-IMP (IMP-09/10), FS-iOS smoke (demo code, demo link, Try demo), API-02 | `Proven` on the simulator; the real camera `Only The User Can Check` | the founder's device (REQ-014): a real camera scan; tried: the injected scan and the URL route on my simulator |
| AC-003 | Yes | R-IMP (IMP-07; `testTheDemoWebViewBlocksTheNetwork`), FS-iOS smoke | `Proven` on the simulator; airplane mode `Only The User Can Check` | the founder's device |
| AC-004 | Yes | R-IMP (IMP-07 at three sizes: 0 findings, 0 errors) | `Proven` (the Solution Designer's own sweep on the build is its step) | — |
| AC-005 | Yes | FS-iOS smoke (`testTryDemoThenLeaveDemoThenColdLaunch`), R-IMP | `Proven` | — |
| AC-006 | Yes | API-02, R-IMP | `Proven` | — |
| AC-007 | Yes | API-03, R-IMP | `Proven` | — |
| AC-008 | No | API-01, R-IMP | `Proven` | — |
| AC-009 | Yes | FS-iOS (fresh install, smoke), API-02…05 (no crash on iPhone and iPad) | `Proven` on simulators; TestFlight `Only The User Can Check` | the founder's word (REQ-014) |
| AC-010 | Yes | — | `Only The User Can Check` | the review notes' walkthrough on the build/TestFlight, on the founder's word |
| AC-011 | Yes | API-01, FS-iOS (core, smoke), FS-DESKTOP (typecheck) | `Proven` (Android untouched) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 90% | FS-*, API-01…05; F-1 closed by API-04b | device-only parts (NT-02) | the founder's device check |
| Changed-boundary execution directness | 88% | 93% | the shipped app's real saved entry migrated by the new app; names read on the page and the native screens | — | — |
| Cross-boundary integration realism and mock gap | 85% | 92% | a real node, pairing, the app group's real data | simulator, not a device | device |
| Environment, configuration, identity, and fixture fidelity | 82% | 88% | fresh clones for each release job, outside symlinked paths | Xcode 26.1.1 locally vs 26.3 on the runner; the build-only run not run | NT-01 |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 92% | the migration's marker and backup; reopen; relaunch; resets | the migration runs once per install: a second update not exercised (the unit tests cover the marker) | — |
| User-surface, browser, and desktop-shell confidence | 85% | 92% | screenshots of the page, the native list, the Remove sheet and confirmation | an old entry reads "AutoByteus node" natively until a new pairing (designed) | — |
| Durable regression coverage quality and relevance | 90% | 90% | IR-002's core tests (56 pass); the existing suites; MSP-52 repaired | the update path itself has only temporary UI tests | durable UI tests for TR-012 |

- Overall post-repository confidence: 86%
- Overall final confidence: 91% (91.0%, simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `Yes` (environment fidelity: NT-01 and the runner's Xcode)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: the release workflow's build-only run (NT-01); device-only checks (NT-02); C-03's ~1.8 s stall on a 40 MB download (round 1); the update path covered by temporary UI tests only

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (fresh-start builds), `Browser` (the phone probe, round 1), `Other` (the iOS app on simulators with a real node, the shipped app's update)
- Confidence gap or residual risk it addresses, and the expected gain: IR-002's migration and name rule on real saved data from the shipped app; the native screens' names
- Browser validation needed, and why or why not: not again this round (no web change since round 1)
- If `Not Required`: —
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed, and any deviation from the investigation's plan: FS-DESKTOP (round 1; IR-002 changes no desktop input)
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-01 (web); FS-DESKTOP (packaging, terminal runtime)
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and its confidence consequence: signing and the other platforms (runners)

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: IR-002's one-time placeholder-name migration (`SavedNodeDisplayNamePlaceholderMigration`): a saved entry named "AutoByteus Desktop" gets its host as the name, once, with a backup and a marker
- Representative existing data used: a computer saved and paired by the shipped app (`8430d9ef12`) on my simulator, from a clean install each time
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the transition outcome: API-04a (before: `'displayName': 'AutoByteus Desktop'`), API-04b (after: marker `done`, backup with "AutoByteus Desktop", the name now the host; the computer opens paired; shown as "AutoByteus node" natively and as the node's own name on the page)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No` (one migration at start)
- Residual untested persisted-data risk: a second update after the marker (covered by IR-002's unit tests, not run end to end)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No` (the migration is the approved transition for REQ-013)
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (round 2); round 1's change below is still under review

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (`4352ec81fa`, round 1) | Updated: the host-fit walk skips `display: contents` ancestors (no box), this change's single-pane wrappers | API-01 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| An iPhone, an iPad | iOS 26.1 simulators | device checks need the founder's word (REQ-014) | camera, airplane mode, TestFlight |
| The camera scan | the Debug-only injected code (`AUTOBYTEUS_UI_TEST_SCANNED_CODE`) | no camera on a simulator | the scanner's camera path |
| Model inference | the scripted AGY CLI | no provider | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Simulators `apie2e279-iphone`, `apie2e279-ipad` (round 2) | Yes | `simctl delete` | deleted; others untouched |
| Fresh clones (`~/.cache/abtest279/fs-ios`, `fs-docker`), the base project (`~/.cache/abtest279/base`), DerivedData `~/.cache/abtest279/dd-base`, `/private/tmp/abtest279/dd-new` and the one `AutoByteusMobile-*` folder whose workspace path was my clone | Yes | removed | other DerivedData folders untouched |
| Node `node-279.mjs` and its temp root | Yes | stopped by its control file | "node done; temp root removed: true"; no process left |
| Temporary UI tests | Yes | only ever in the clones (removed); kept as evidence in `scripts/ios/` | the worktree's UI tests unchanged |
| iOS `.xcresult` bundles of API-04 (the runner's environment holds pairing links) and screen recordings | Yes | removed from the evidence; screenshots and texts exported first | text scan of `r2/` clean (no `pairing=` value, no credential) |
| Other processes on this machine (the load) | No | not touched | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: only the user can check: AC-002 (camera), AC-003 (airplane mode), AC-009 (TestFlight), AC-010 (the review notes on the build)
- Next recipient from `get_handoff_rules`: Code Reviewer (Large/High Pass: the proportional test-code review of `4352ec81fa`)
- Notes:
  - F-1 is resolved: after the update the page shows the node's own name ("Test Node 279"), and the native screens show "AutoByteus node" for the old entry. "AutoByteus Desktop" and the address appear nowhere (row, More, Remove sheet, confirmation, connection sheet). New pairings by Paste a link and the scanned code keep "Test Node 279" everywhere, also after a relaunch. With Type an address, the page shows the node's name, natively "AutoByteus node".
  - Observation (not a failure, no requirement covers it): "Switch node" → tapping the current node returns its page exactly as left, so a connection sheet opened before is still open. Harmless; noted for the reviewer.
  - NT-01 (the build-only `release-ios.yml` run) needs the branch pushed: delivery, on the right word. FU-005 stays recorded.
