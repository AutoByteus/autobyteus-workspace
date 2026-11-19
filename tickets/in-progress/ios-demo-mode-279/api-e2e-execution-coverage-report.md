# API/E2E Execution Coverage Report — ios-demo-mode-279 (autobyteus-279): the iOS app's built-in demo for App Review

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; Code Reviewer CRR-001 Pass (reviewed range `8430d9ef12..429af9bd66`); HEAD `429af9bd66`
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-01 ran from the FS-DOCKER clone (fresh, built from `429af9bd66`), not the worktree: the same code, and no reliance on the worktree's build folders.
  - FS-iOS needed three runs: a clone under `/tmp` or `/private/tmp` makes an unchanged core test fail (symlinked path; FU-005); run 3 from `~/.cache/abtest279` passes.
  - API-02's text cases use a page's own Share button (Web Share API), not a Safari text selection (the selection raised the keyboard without an edit menu).
  - The simulators took the Mac's German locale; I set both to English so the system UI (paste prompt, Safari) matches my tests.
  - Host load average 90–210 for long stretches (other work on this machine): one stalled `xcodebuild` run, an expired 5-minute pairing code; noted per case.
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/evidence/api-e2e/`
  - `FS-iOS.log` (+ `FS-iOS-run1-symlinked-path.log`, `FS-iOS-run2-private-tmp.log`), `FS-iOS-AutoByteusMobileCoreTests.xcresult`, `FS-iOS-smoke/`; `FS-DOCKER.log`; `FS-DESKTOP.log`, `FS-DESKTOP-verify.log`
  - `api-01-mobile-shell.log`, `api-01-mobile-shell/`, `api-01b-msp50-52.log`, `api-01b-msp50-52/`
  - `ios/` (each iOS case's log and `<case>-shots/` screenshots exported from its result bundle; node logs)
  - `scripts/` (temporary tools: `fs-ios.sh`, `fs-other.sh`, `node-279.mjs`, `run-ui.sh`, `run-new.sh`, `ios/ApiE2E279UITests.swift`, `ios/ApiE2E279ShippedAppUITests.swift`; the test files were only ever added to clones)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (on Pass); this round: `Fail` → failure-origin review

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `429af9bd66` | macOS 26 arm64, Xcode 26.1.1 (the runner selects 26.3), Node 22.23.1, pnpm 10.28.2 | fresh clones (`git clone --no-local`, 0 prior build folders) per release job | the workflow's default bundle ids; unsigned |
| ENV-2 | `429af9bd66` (+ API/E2E's `mobile-code-wrap-cases.mjs` fix) | macOS, headless Chrome | the phone probe's alpha/beta nodes from the FS-DOCKER clone (fresh server build, this branch's `/mobile`) | clean env (`env -i`, temp HOME) |
| ENV-3 | `429af9bd66` app; base `8430d9ef12` app | my own simulators `apie2e279-iphone` (iPhone 17 Pro Max) and `apie2e279-ipad` (iPad Air 11-inch (M3)), iOS 26.1, English | the fresh-start clone's app (DemoWeb built there) with my temporary UI tests; the shipped app built from the base | deleted afterwards |
| ENV-4 | `429af9bd66` | macOS | a real node (`node-279.mjs`) from the FS-DOCKER clone, bound to `192.168.2.158` and admitting only `192.168.2.158/32`; scripted AGY; a run with a 40 MB PDF; Safari test pages on `127.0.0.1:52790` | 5-minute pairing codes made just before each run, kept in `/tmp` only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-002…008 (unit, probes, simulator) | — | IMP-01…IMP-12 | — | Reused (`Pass`) | implementation handoff | — | on `c572234f0f` / `df18856ea4`, runtime-equal to HEAD |
| FS-iOS | build inputs; AC-011 (iOS) | `release-ios.yml` `build-ios` | `scripts/fs-ios.sh <worktree> 429af9bd66 ~/.cache/abtest279/fs-ios <evidence> apie2e279-iphone`: clone; `pnpm install --frozen-lockfile`; `prepare-demo-web.sh --build`; `ios-release-contract-check.py`; `generate-project.sh`; simulator build; core tests; `ios-simulator-smoke.sh` | ENV-1 | `Pass` | `FS-iOS.log`, `FS-iOS-AutoByteusMobileCoreTests.xcresult`, `FS-iOS-smoke/` | `# fresh: 0 prior build folders`; "The demo answers all 252 compiled operations"; each step `exit=0`; core `Executed 42 tests, with 0 failures`; smoke `Executed 8 tests, with 0 failures`, "Smoke UI tests: executed and passed without skips" | runs 1–2 failed `SavedNodeEntryKeysMigrationTests` from a symlinked `/tmp` path (environment; FU-005) |
| FS-DOCKER | build inputs (`build-mobile-web.mjs`) | the server image's builder stage | `scripts/fs-other.sh docker …`: install, three contract builds, `prisma generate`, server build, `build:mobile-web` | ENV-1 | `Pass` | `FS-DOCKER.log` | each `exit=0`; "The /mobile build holds no demo code." | on macOS; the Linux image itself is the release run's |
| FS-DESKTOP | build inputs (web `package.json`, `nuxt.config.ts`, lockfile) | `release-desktop.yml` macOS arm64 | `scripts/fs-other.sh desktop …`: install; `build:electron:mac -- --arm64` (TESTING.md's variables); the job's two verify steps | ENV-1 | `Pass` | `FS-DESKTOP.log`, `FS-DESKTOP-verify.log` | `[typecheck] PASS`; "The /mobile build holds no demo code."; the DMG and zip; `[terminal-runtime] ok: node-pty spawn probe`; `# exit: 0` | signing, notarization, x64, Windows, Linux: runners only |
| API-01 | AC-011, AC-008 | real phone shell, isolated nodes | `env -i … pnpm -C <fs-docker>/autobyteus-web test:e2e:mobile-shell --output-dir=…`; then `--cases=MSP-50,MSP-51,MSP-52` with the fixed probe | ENV-2 | `Pass` (with a test fix) | `api-01-mobile-shell.log`, `api-01b-msp50-52.log`, `api-01b-msp50-52/MSP-52-*.png` | 87 cases, 86 Pass, no unknown browser error; MSP-52's only finding "the root does not fit its hosts: [{\"tag\":\"div\",\"cls\":\"contents\",\"right\":0…}]" with `past: []`; after the fix `MSP-52 Pass`, `mobile-shell probe: Pass` | the two hosts are this change's `display: contents` single-pane wrappers (`MobilePairedShell.vue`): no box, so no cut; `mobile-code-wrap-cases.mjs` now skips them (a test this change made untrue) |
| API-02 | AC-006 | the share extension from Safari; the app | `run-new.sh testShareFromSafariPairingLink / OtherText / SelectedText` (temporary UI tests) | ENV-3, ENV-4 | `Pass` | `ios/API-02a-*`, `API-02b-*`, `API-02c-share-page-text*` | `message=Saved. Open AutoByteus to connect.` → the run list; `message=Saved. Open AutoByteus to use it as an address.` → Type an address pre-filled with the page's address; `message=Saved. Open AutoByteus to see the demo.` → "Welcome to the demo"; `message=AutoByteus couldn’t read text or a link from this share.` | the extension's preview truncates at "pairing=…" |
| API-03 | AC-007, TR-012 | iPad app, the demo | `run-new.sh testRotationKeepsTheOpenRun ipad …` | ENV-3 | `Pass` | `ios/API-03-ipad-rotation-shots/rotate-*.png` | "Daily Assistant" open in portrait, landscape (two panes, the run on the right, no ←), portrait again | landscape screenshot stored rotated (XCUITest) |
| API-04 | AC-001, REQ-013 | the shipped app → update; the new first screen with a real node | `ApiE2E279ShippedAppUITests` on the base app; `run-new.sh testUpdateOpensTheSavedComputer / testTypeAnAddress / testPasteALink / testScannedPairingCode` | ENV-3, ENV-4 | **`Fail` (F-1)**; connect paths `Pass` | `ios/API-04a-shots/shipped-app-paired.png`, `ios/API-04b-update-shots/update-opened.png`, `ios/API-04c…e-*` | shipped: "Test Node 279 · Connected"; updated: the saved computer opens at launch on its paired run list, **named "AutoByteus Desktop"**; Paste a link and the scanned code: "Test Node 279"; Type an address: "192.168.2.158" | see F-1 |
| API-05 | C-03 (residual) | Download of a 40 MB PDF from a real node | `run-new.sh testLargePdfDownload iphone …` | ENV-3, ENV-4 | `Pass` (measured) | `ios/API-05-pdf-download-shots/pdf-download-timing.txt`, `pdf-share-sheet.png` | `sheetAt=4.38 s; reads=15; maxRead=1.82 s; reads>1s=1` | a short main-thread stall (~1.8 s) while the 40 MB file is decoded, at host load ~100; the share sheet offers the PDF |
| NT-01 | build-only `release-ios.yml` | GitHub runner | — | — | `Not Tested` | — | — | needs the branch pushed (RELEASE.md, DESIGN.md rule 12); API/E2E does not push. For delivery, on the right word |
| NT-02 | AC-002 camera, AC-003 airplane mode, AC-009, AC-010, REQ-012(3) | device, TestFlight | — | — | `Not Tested` | — | — | only on the founder's word (REQ-014); nothing went to Apple, TestFlight or App Store Connect |

## Failures

| ID | What fails | Where | Reproduction | Expected | Evidence |
| --- | --- | --- | --- | --- | --- |
| F-1 | After the update, a computer the shipped iOS app saved shows the shipped app's default name **"AutoByteus Desktop"** in the run list's node button, where the shipped app showed the node's own name ("Test Node 279") | The shipped app saves every computer with `displayName: "AutoByteus Desktop"` (decoded from the app group: `{"displayName":"AutoByteus Desktop","baseURL":"http://192.168.2.158:51679",…}`). 279 adds the iOS shell bridge (`window.AutoByteusShell`, Android's contract): its `hello.nodeName` is the saved entry's name, and the page shows it (`utils/remoteAccess/shellBridge.ts` `nodeName`). Without a bridge (the shipped app) the page showed the name from its own pairing. A computer paired in the new app is saved under the node's name ("Test Node 279"), so only computers saved before the update are affected: the founder's own | 2/2 (`API-04b-update-run1`, `API-04b-update`): the shipped app pairs (`API-04a`), the new app installed over it opens the computer named "AutoByteus Desktop"; same node, same minute | REQ-013 / the Preserved Behavior Boundary: existing saved computers keep working **and their behavior** after the update; the real `/mobile` experience unchanged except DC-007, DC-011 and the iPad layout | `ios/API-04a-shots/shipped-app-paired.png` vs `ios/API-04b-update-shots/update-opened.png` |

- Not failures of this ticket: MSP-52's stale host check (fixed in the test); FS-iOS runs 1–2 (symlinked checkout path, FU-005).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 (QR injected, Paste a link, Type an address with a real node; the saved computer opens after an update), FS-iOS smoke, R-IMP | `Not Proven` (F-1: the saved computer's name changes) | — |
| AC-002 | Yes | R-IMP (IMP-09/10), FS-iOS smoke (demo code, demo link, Try demo), API-02 (the demo link via a share) | `Proven` on the simulator; the real camera `Only The User Can Check` | the founder's device (REQ-014): a real camera scan; tried: the injected scan and the URL route on my simulator |
| AC-003 | Yes | R-IMP (IMP-07 probes record any external request; `testTheDemoWebViewBlocksTheNetwork`), FS-iOS smoke | `Proven` on the simulator; airplane mode `Only The User Can Check` | the founder's device |
| AC-004 | Yes | R-IMP (IMP-07 at three sizes: 0 findings, 0 errors) | `Proven` (the Solution Designer's own sweep on the build is its step) | — |
| AC-005 | Yes | FS-iOS smoke (`testTryDemoThenLeaveDemoThenColdLaunch`), R-IMP | `Proven` | — |
| AC-006 | Yes | API-02 (the extension's own sheet: four messages; the app acts once), R-IMP | `Proven` | — |
| AC-007 | Yes | API-03 (rotation keeps the open run), R-IMP (IMP-10, probes at 820×1180, 1180×820) | `Proven` | — |
| AC-008 | No | API-01, R-IMP | `Proven` | — |
| AC-009 | Yes | FS-iOS (fresh install, smoke), API-02…05 (no crash on iPhone and iPad) | `Proven` on simulators; TestFlight `Only The User Can Check` | the founder's word (REQ-014) |
| AC-010 | Yes | — | `Only The User Can Check` | the review notes' walkthrough on the build/TestFlight, on the founder's word |
| AC-011 | Yes | API-01, FS-iOS (core, smoke), FS-DESKTOP (typecheck) | `Proven` (Android untouched) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 80% | FS-*, API-01…05 | F-1 (REQ-013); device-only parts | F-1's fix; the founder's device check |
| Changed-boundary execution directness | 85% | 92% | real node, the shipped app updated, the real share sheet, rotation | — | — |
| Cross-boundary integration realism and mock gap | 85% | 92% | a real node, pairing, Safari | simulator, not a device | device |
| Environment, configuration, identity, and fixture fidelity | 80% | 88% | fresh clones for each release job | Xcode 26.1.1 locally vs 26.3 on the runner; the build-only run not run | NT-01 |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 90% | update path, expired/blank shares, large file | — | — |
| User-surface, browser, and desktop-shell confidence | 85% | 88% | screenshots of every state | F-1 is user-visible | F-1's fix |
| Durable regression coverage quality and relevance | 88% | 88% | the existing suites pass; MSP-52 repaired | the update path, the share sheet and rotation have no durable test (temporary UI tests) | durable UI tests for TR-012 |

- Overall post-repository confidence: 85%
- Overall final confidence: 88% (88.3%, simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-001: F-1)
- Any final applicable category below `90%`: `Yes` (requirement proof, environment fidelity, user surface, durable coverage)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1; the release workflow's build-only run (NT-01); device-only checks (NT-02); C-03's ~1.8 s stall on a 40 MB download

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (fresh-start builds), `Browser` (the phone probe), `Other` (the iOS app on simulators with a real node, the shipped app's update, Safari's share sheet)
- Confidence gap or residual risk it addresses, and the expected gain: build inputs on a fresh clone; the real phone shell; the native iOS paths against a real node
- Browser validation needed, and why or why not: yes (the phone shell changed)
- If `Not Required`: —
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed, and any deviation from the investigation's plan: FS-DESKTOP (the packaged arm64 app built from a fresh clone, the job's verify steps); the desktop conversation's DC-007 is in the phone probe's desktop-window cases (API-01)
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-01 (web); FS-DESKTOP (packaging, terminal runtime)
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and its confidence consequence: signing and the other platforms (runners)

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Directly Usable — No Migration` (saved computers)
- Representative existing data used: a computer saved and paired by the shipped app (`8430d9ef12`) on my simulator
- Approved transition followed without an unnecessary migration: `Yes` (the entry is read as is; the web view keeps its pairing)
- Cases proving the direct-use outcome: API-04 (the update opens it, paired)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: F-1 (the entry's stored default name is now shown)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` | Updated: the host-fit walk skips `display: contents` ancestors (no box), this change's single-pane wrappers | API-01 | — |

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
| Simulators `apie2e279-iphone`, `apie2e279-ipad` | Yes | `simctl delete` | deleted; others untouched |
| Fresh clones (`~/.cache/abtest279/fs-ios`, `fs-docker`, `fs-desktop`), the base project (`/tmp/abtest279/base`), DerivedData `/private/tmp/abtest279/dd-*` and three `AutoByteusMobile-*` folders whose workspace path was one of my clones | Yes | removed | — |
| Node `node-279.mjs` and its temp root | Yes | the job was stopped at its 2-hour background limit; the temp root removed by hand | no process left |
| Safari test pages server (`127.0.0.1:52790`) | Yes | stopped | — |
| Temporary UI tests | Yes | only ever in the clones (removed); kept as evidence in `scripts/ios/` | the worktree's UI tests unchanged |
| iOS `.xcresult` bundles of API-02…05 (one held a pairing link in the runner's environment), one raw attachment with an expired code | Yes | removed from the evidence; screenshots exported first | text scan clean; screenshots show no code |
| Other processes on this machine (the load) | No | not touched | — |

## Preliminary Classification (On `Fail`)

- F-1: `Local Fix` (implementation): the iOS bridge's name for an entry saved before the update. For example, the page's own paired name over a legacy default, or renaming the entry when the page reports its node; the failure-origin review decides.

## Latest Authoritative Result

- Result: `Fail` (F-1)
- Criteria not proven, or parts only the user can check: AC-001 (F-1); only the user can check: AC-002 (camera), AC-003 (airplane mode), AC-009 (TestFlight), AC-010 (the review notes on the build)
- Preliminary classification and recommended owner (on `Fail`): `Local Fix`, implementation engineer (via the code reviewer's failure-origin review)
- Next recipient from `get_handoff_rules`: Code Reviewer (failure-origin review)
- Notes: everything else passes: the three release jobs' fresh-start builds, the phone probe (with one stale check fixed), the share extension's four messages from Safari, the update path (it opens, paired), the connect paths with a real node, rotation. NT-01 (the build-only `release-ios.yml` run) needs the branch pushed: delivery, on the right word. FU-005 recorded.
