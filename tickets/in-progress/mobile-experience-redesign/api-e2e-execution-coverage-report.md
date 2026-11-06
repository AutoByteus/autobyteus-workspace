# API/E2E Execution Coverage Report — mobile-experience-redesign (autobyteus-277)

## Round

- Coverage investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md) (round 2: section "Round 2 Plan")
- API/E2E revision record: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-002`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 2. The code reviewer's CRR-005 Pass, code `400457d5f7` (HEAD `3e3ce3961b`, then `23c0c35395`, documents only). The basis is requirements SR-005 and design SR-006.
- Prior round reviewed: round 1, `API-REV-001` (Fail: F-01…F-09), evidence under `evidence/api-e2e/` (outside `round-2/`).
- Deviations from the plan:
  - The design's `TESTING.md` "phone rule" is not added, at the user's direction. The project documents hold only what every future change follows, and the probe's header carries the phone specifics.
  - At the user's request, `TESTING.md` was trimmed of one-suite details and a dated note, in two commits of its own: `c5319f0bf4` and `dce25fdd50`.
  - One API 34 attempt was lost to the emulator's own system restart; logcat shows no app crash. The rerun is the evidence.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/evidence/api-e2e/`. Round 2 is under `round-2/`; round 1's still-valid cases are in the folder root.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` after a passing round; this round fails.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `400457d5f7` (code) | macOS, Node v22.23.1 | Two test-owned nodes from this worktree's `dist/app.js`. No server change since round 1, so the build stays valid. The production phone bundle is rebuilt (`round-2/mobile-web-build.log`, `exit 0`) and served by alpha at `/mobile`. The desktop window runs on `nuxt dev`. Headless Chrome | Phone at 390×844 and 360×800, paired over `http://192.168.77.10:<alpha>`. That origin is not a secure context: `isSecureContext: false`, `crypto.randomUUID: undefined`. Runtimes: scripted AGY and the recorded Grok replay |
| ENV-2 | same | Android 15 emulator, AVD `autobyteus277_api35` (WebView 124) | This branch's debug APK: Gradle reports every task up to date with the sources (`round-2/ADR-apk-build.log`) | The held ENV-1 stack through a counting proxy at `http://10.0.2.2:<proxy>`. Taps and the Back key go through adb |
| ENV-3 | same | Android 14 emulator, AVD `autobyteus277_api34` (WebView 113) | same APK | same |
| ENV-4 | same | macOS | Playwright WebKit 26.0 (private browsers path), iPhone 13 profile | The held stack |
| ENV-5 | `400457d5f7` + this round's probe edits | macOS | The existing probe stacks | As each probe's header says |

## Cases

Paths are relative to the evidence folder.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | All (component), AC-010 | Web unit/component suite | Reused IMP-09 | — | Pass | (handoff) | `Test Files  701 passed (701)` | Ran on `400457d5f7` |
| API-04 | — | Typecheck, guards | Reused IMP-02, IMP-03 | — | Pass | (handoff) | `[typecheck] PASS`; the guards pass | Ran on `400457d5f7`. My later edits are probe `.mjs` files and `TESTING.md` |
| API-06 | REQ-011 | Android instrumented tests | Reused IMP-08 | — | Pass | (handoff) | — | API 35 and API 34; no Android file changed since |
| MSP-01 | AC-001 | Real stack, phone + desktop window | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…/round-2/MSP-run-3` | ENV-1 | Pass | `round-2/MSP-run-3/mobile-shell-probe.json` | 8 runs; `phoneIds` = `desktopIds`; `"foldBefore": "Show older (3)"` | |
| MSP-02 | AC-002, AC-002a | Real stack + desktop window | same | ENV-1 | Pass | `cases.MSP-02`, `MSP-02-tree.png`, `MSP-02-desktop-tree.png` | `phoneTitles` match the desktop's lines: writer "Write the release notes.", squad "Review the docs site.", "Spare work. Marker SPARE.", "Draft the changelog. Marker LEAD-DELEGATED."<br>`memberTitles` are all null.<br>`teamRows`: lead, mate and changelog helper all at depth 1 (DEC-009).<br>`liveStatuses ["idle","offline"]` with the root open.<br>`unselected {"seen": ["idle"], …, "afterRootOpened": "offline"}` (DEC-013) | The live case uses a running root (the PTM), per the ARCH-REV-004 residual |
| MSP-03 | AC-003, AC-003a | Real stack | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-03 --output-dir=…/round-2/MSP-run-4-MSP-03` | ENV-1 | Pass | `round-2/MSP-run-4-MSP-03/mobile-shell-probe.json`, `MSP-03-*.png` | Six kinds, each `reached: true`, `shownOnPhone: true`, `marked: "true"`, with scroll kept:<br>task agent; task-team member; Team run → "lead"; Org run → "planner"; Org whose first member is a Team → "reviewer · in squad"; Org member | Over the non-secure origin. MSP-run-3's MSP-03 missed one read-back because of my lookup (the reviewer's address is `/docs_review_team/reviewer`); fixed and rerun |
| MSP-04 | AC-003 (approve) | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-04` | `"optionId": "allow-once"` | |
| MSP-05 | AC-003 alternates | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-05` | Snapshots `opening` → `open:lead` only; Org entry kept; Forward and reload as round 1 | C-04 not seen |
| MSP-06 | AC-004 | Two servers | as MSP-01 | ENV-1 | Pass | `cases.MSP-06`, `MSP-06-*.png` | `"onBeta": true, "live": true`; placeholder "Message publisher on beta-node…"; no Upload; notice "beta-node isn't reachable …"; `"recovered": true` | |
| MSP-07 | AC-006 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-07` | `"freshAgent": "Project Task Manager"`; after the Org run and ←: `"orgMarked": "true"`, `"orgAgent": "Release Notes Writer"`; `"statesDuringFirst": ["open"]` | |
| MSP-08 | AC-007 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-08` | Menu order; one artifact shown directly; no Messages for a standalone agent | |
| MSP-09 | AC-008 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-09`, `MSP-09-unpair-confirm.png`, `MSP-09-after-unpair.png` | `"confirmOnTop": {"onTop": true, "hit": "Unpair"}`; `"sessionLeft": null`; peer "beta-node 2 agents · 1 teams" | C-06 not seen: the bar recovered by itself |
| MSP-10 | AC-009 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-10` | As round 1 | |
| MSP-11 | AC-005, QR-001 | Real stack, both sizes | as MSP-01 | ENV-1 | Pass | `cases.MSP-11`, `MSP-11-*.png` | No phone-owned control under 44×44; no horizontal scroll; Back walks `files→run→list`, `messages→run→list` at both sizes | `sharedSmall` lists only shared components: the composer's Upload 28 and Send 36, the artifact viewer's zen toggle 28, the context-files strip |
| MSP-12 | DS-001, R-001, R-002 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-12` | Reads at 2.8 s, 7.8 s, 12.8 s on the list; none on the run screen, a view or hidden; 493 ms after ←; 19 ms when shown; 6.2 KB per read; first rows 469 ms | |
| MSP-13 | E-27 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-13` | One read `401`, then pairing | Revoked (403): FU-003 |
| MSP-14 | AC-002 alternate | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-14` | `"gone": true, "reloaded": false` | |
| ADR-01 | AC-010, AC-011 | Android shell | `node scripts/android-journey.mjs <hold.json> <apk> …/round-2/ADR-run-2-api35` | ENV-2 | Pass | `round-2/ADR-run-2-api35/android-journey.json`, `ADR-01-3-run-list.png` | Real pairing; the list renders below the status bar | API 34: Pass (`round-2/ADR-run-3-api34`) |
| ADR-02 | AC-005 | Android | same | ENV-2 | Pass | `android-journey.json` | `["files","run","list"]`, `["messages","run","list"]` | |
| ADR-03 | AC-008, AC-010 | Android | same | ENV-2 | Pass | `ADR-03-*.png` | `"confirmOnTop": true`, `"afterUnpairTap": "pairing"` | F-03 is fixed on the device |
| ADR-04 | R-002 | Android | same | ENV-2 | Pass | `android-journey.json` | 0 reads in 25 s in the background; a read on return; the new run listed | |
| ADR-05 | AC-011 | Android 15 | same | ENV-2 | Pass | `ADR-05-*.png` | `"openedByCenterTap": 1`; `bars.webView {"top": 136, "bottom": 2337}`, between `statusBars.bottom 136` and `navigationBars.top 2337` | Observed: the system Back key with the ⋮ menu open leaves the run screen, which the spec does not define (TR-007: "tap outside closes") |
| ADR-06 | AC-003a | Android, over HTTP | same | ENV-2 | Pass | `ADR-06-message-sent.png` | `"reached": true, "shown": true`, `"context": {"secure": false, "randomUUID": "undefined"}` | Typed and sent with real taps to the delegated task agent |
| ADR-07 | AC-011, REQ-011 (C-12), REQ-003 | Android 15 and 14, keyboard open | same; API 34: `--only=ADR-01,ADR-07 … round-2/ADR-run-3-api34` | ENV-2, ENV-3 | Fail | `round-2/ADR-run-2-api35/ADR-07-keyboard-open.png`, `round-2/ADR-run-3-api34/ADR-07-keyboard-open.png`, `…/ADR-07-control-scrolltop-0.png`, both `android-journey.json` | `"noDoublePadding": true` on both: the WebView ends at the keyboard (`webView.bottom 1517` = `ime.top 1517`), and the page equals the WebView's height.<br>Fail: `"conversationScrollTop": 330` (API 35) and `327` (API 34); `"gapToKeyboard": 929` and `921`.<br>Control, same keyboard: `scrollTop` set to 0 gives `"controlGapToKeyboard": 62` | F-10 |
| IOS-02 | QR-004 | WebKit | `node scripts/ios-webkit-journey.mjs … round-2/IOS-run-2 …` | ENV-4 | Pass | `round-2/IOS-run-2/ios-webkit-journey.json` | `"result": "Pass"`, `"messageShown": true`, no horizontal scroll, `"unknownErrors": []` | |
| DSK-01 | AC-010 | Desktop, two servers | `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree --output-dir=…/round-2/DSK-01` | ENV-5 | Pass | `round-2/DSK-01.log` | `remote-runs-in-tree probe: Pass` | |
| DSK-02 | AC-010 | Desktop, fixtures | four fixture probes, `--output-dir …/round-2/DSK-02/<name>` | ENV-5 | Pass | `round-2/DSK-02/*.log` | "… probe passed." ×4 | |
| DSK-03 | AC-010 | Desktop | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir …/round-2/DSK-03 --cases BR-001` | ENV-5 | Pass | `round-2/DSK-03.log` | `Task closure tree probe: Pass` | |
| UPD-LRL-004 | Preserved Messages unavailable | Real stack | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases LRL-004 --output-dir …/round-2/UPD-LRL` | ENV-5 | Pass | `round-2/UPD-LRL.log` | `Summary: 1 Pass, 0 Fail` | |
| UPD-WVC-004, UPD-OSR, UPD-NVP (NVP-04), IOS-01, API-05 (B08) | as round 1 | — | Round 1 | — | Pass (still valid) | `UPD-WVC/`, `UPD-OSR/`, `UPD-NVP/`, `IOS-run-1/`, `API-05/` | as round 1 | Nothing they exercise changed (see the investigation's Round 2 Plan) |

## Findings

| Finding | Criteria | What happens | Cause (evidence) | Preliminary classification, owner |
| --- | --- | --- | --- | --- |
| F-10 | REQ-003 (the run screen is the bar and the conversation), REQ-011 (the composer stays visible), AC-005 | On Android, typing a message with the keyboard open hides the conversation. The composer jumps under the bar, and a keyboard-tall blank fills the rest. This happens on Android 15 and on Android 14 | When the WebView shrinks for the keyboard, the browser scrolls the focused textarea into view through the shared conversation view's root (`data-testid="mobile-run-conversation"`, `overflow: hidden`, so it can be scrolled by script). Nothing scrolls it back: `scrollTop` 330 and 327. With `scrollTop` set to 0, the composer sits right above the keyboard (gap 62 px; `ADR-07-control-scrolltop-0.png`). There is no double padding (C-12 is closed). The shell's insets are not the cause: API 34 resizes the classic way and shows the same | Local Fix, implementation (the phone's run screen) |
| F-01…F-09 (round 1) | — | — | Resolved or decided: see the revision record's Prior Failure Resolution | — |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-01, MSP-12, MSP-09; round 1 WVC-004 (empty) | Proven | QR-003's 2 s on his phone and network (here: 0.47 s browser, ~0.5 s emulator, 6.2 KB per read) |
| AC-002 | Yes | MSP-02, MSP-14 | Proven | — |
| AC-002a | Yes | MSP-02 | Proven | — |
| AC-003 | Yes | MSP-03, MSP-04, MSP-05, MSP-07, ADR-06 | Proven for the cases opened and sent (typing on Android: F-10) | — |
| AC-003a | Yes | MSP-03 (non-secure origin), ADR-06 (Android over HTTP) | Proven | — |
| AC-004 | Yes | MSP-06 | Proven | — |
| AC-005 | Yes | MSP-11, ADR-02, ADR-05, ADR-07, IOS-02 | Not Proven (F-10 on Android while typing) | His confirmation on his phone |
| AC-006 | Yes | MSP-07, round 1 API-05 B08 | Proven | — |
| AC-007 | Yes | MSP-08, MSP-11 (reference screen now matches VIS-011's controls), round 1 UPD-OSR | Proven | — |
| AC-008 | Yes | MSP-09, ADR-03 | Proven | — |
| AC-009 | Yes | MSP-10 | Proven | — |
| AC-010 | Yes | ADR-01, ADR-03, MSP-10, IOS-01/02, DSK-01…03, UPD-*, API-01 | Proven (emulators) | His Android device |
| AC-011 | Yes | ADR-05 (API 35), ADR-01 (API 34) | Proven for bars and the ⋮ centre tap. The composer is not under the keyboard (no double padding), but F-10 moves it | His phone |

## Validation Confidence Scorecard

| Category | Final | What Supports It | Residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 85% | All ACs but AC-005 (F-10) | F-10 |
| Changed-boundary execution directness | 95% | Production bundle on real nodes; this branch's APK; WebKit | — |
| Cross-boundary integration realism | 95% | Two nodes, real streams and credentials, non-secure origin | Scripted runtimes |
| Environment, identity, fixture fidelity | 90% | Emulators API 35 and 34; HTTP pairing like a LAN or tailnet | His device and network |
| Failure, edge, lifecycle, recovery | 95% | Node down and back, peer down and Retry, 401, background, restart, Task DONE, unpair | Revoked device (FU-003) |
| User surface, browser, device | 80% | MSP-11, ADR-*, IOS-02 | F-10 |
| Durable regression coverage | 92% | `test:e2e:mobile-shell` (updated for SR-005), four updated probes | The device journeys are ticket scripts |

- Overall: 90% (simple average). Categories below 90%: requirement proof (85%) and user surface (80%), both because of F-10.
- Every critical AC directly proven, apart from user-only parts: `No` (AC-005, F-10).

## Broader Validation Decision

- `Required`, executed: browser on real nodes; Android 15 and 14 emulators with this branch's APK; WebKit.

## Persisted-Data Transition Checks

- `Not Affected`. Round 1's NVP-04 and ADR-03 (pairing kept across an app restart) still hold; ADR-03 passed again this round.

## Compatibility / Legacy Scope Check

- None observed.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | MSP-01…14 | SR-005/SR-006 expectations (DEC-009, DEC-010, DEC-013); a second Org whose first member is a Team (AC-003a); the Org run row in MSP-07; header names the non-secure origin; the reviewer's address lookup; the hold output carries ids and the workspace |
| `TESTING.md` | Updated (user's request) | — | `c5319f0bf4`, `dce25fdd50`: one-suite details and a dated note removed |
| Round 1's updates (`node-vocabulary-probe.mjs`, `large-runs-load-less-cases.mjs`, `workspace-views-chooser-cases.mjs`, `owner-scoped-file-reads-probe.mjs`, the probe added) | — | — | `70555b16d9` (round 1); unchanged this round |

## Dependencies Mocked Or Emulated

As round 1: scripted runtimes, a routed private origin, and an emulated hidden page in MSP-12 (ADR-04 shows the real background).

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Probe stacks and the held stack | `finally` / SIGINT | `{"frontendExited": true, "serversLeft": 0, "rootRemoved": true}` |
| Emulators `autobyteus277_api35`, `autobyteus277_api34` | `adb emu kill`; AVDs kept for the next round | Not running |
| `/tmp/autobyteus277-pw-browsers` | Kept for the next round | — |
| `scripts/android-journey.mjs` (ADR-06, ADR-07, `--only`), `scripts/ios-webkit-journey.mjs` | Kept with the evidence | — |

## Preliminary Classification

- `Local Fix`, implementation: F-10 (the phone's run screen with the keyboard open).
- Observation, not a finding: the system Back key while the ⋮ menu is open leaves the run screen (ADR-05); the spec defines only "tap outside closes".
- Follow-ups unchanged: FU-002…FU-006.

## Latest Authoritative Result

- Result: `Fail`
- Not proven: AC-005 (F-10). User-only parts: QR-003 and AC-005's confirmation on his phone, his Android device.
- Next recipient: `/software_engineering_team/code_reviewer`, failure-origin review.
- Notes: every round-1 failure is resolved or decided. All SR-005 criteria (AC-002a, AC-003a, AC-011's bars and centre tap) pass, and the desktop regression passes.
