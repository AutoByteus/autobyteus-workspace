# API/E2E Execution Coverage Report — phone-run-model-runtime-458 (autobyteus-458, with autobyteus-506's build items): a readable phone conversation, Text size, the composer corners, Settings for a run's runtime and model, and a stop that reports success

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; Implementation Engineer IR-001 (direct route); code `ec5b81f912`, documents `075c7274f0`, base `origin/personal` @ `3b59ef0be1`. API/E2E commits on top: `cdb3ad0025` (baseline test fix), `1054deb132` (MSP-08), and this round's evidence commit (MSP-65 and the documents).
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-02/03/04 used a host node of my own (`scripts/node-458.mjs`) instead of the probe's `--hold` stack: AC-005 needs a restart of the node without a model on the same port and data, which the held stack cannot do.
  - The emulator's Wi-Fi network had an empty routing table in this cold boot (the app could not reach `10.0.2.2`); Wi-Fi was switched off so the app used the emulator's `eth0` route. Environment only (progress log 11:21).
  - API-03 found F-1; MSP-65 was added to keep it reproducible (durable coverage).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458/tickets/in-progress/phone-run-model-runtime-458/evidence/api-e2e/`
  - `android/journey.md` (every in-app step's exact command and JSON output), `android/shots/`, `android/node-458.log`, `android/node-458-server.log`
  - `desktop/desktop-team-stop.log`, `desktop/desktop-team-stop-*.png`, `desktop/desktop-composer-corner.png`
  - `api-01-mobile-shell*/`, `api-01b-rerun*`, `api-01c-msp08*`, `api-01-copy-shortcut-macos.log`, `api-03b-msp65*`, `api-05-*`, `api-05b-u03-*`, `api-05c-u03-base-sources*`, `API-00-apk-build.log`, `build-mobile-web.log`
  - `scripts/` (temporary tools: `node-458.mjs`, `api.mjs`, `ph.mjs`, `step.sh`, `desktop-team-stop.mjs`, and 472's `droid.mjs` adapted)

## Routing Classification

- Task size: `Medium`; Architectural risk: `Low`; Input route: `Direct`
- Successful-output route would be: Delivery Engineer (test-code review `Not Required`, direct low-risk route)
- This round: `Fail` → Code Reviewer, failure-origin review of F-1

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | product `ec5b81f912`; probes `1054deb132` (+ MSP-65) | macOS 26 arm64, headless Chrome 157 | the phone probe's own alpha/beta nodes (`autobyteus-server-ts/dist`, unchanged by this branch), the phone bundle rebuilt from this worktree (`build-mobile-web.log`, 11:32 local, after the last product commit), scripted AGY and Grok Build | clean env (`env -i`, temp HOME) |
| ENV-2 | `1054deb132` (product `ec5b81f912`) | own AVD `apie2e458_api35` (android-35 google_apis arm64, Pixel 6: 1080×2400, page 412 CSS px at DPR 2.625), headless, port 5640, 2 GB | debug APK of this branch (`API-00-apk-build.log`); WebView 124.0.6367.219 | `adb root`; Wi-Fi off (see Round); WebView DevTools forwarded to tcp:9458; deleted afterwards |
| ENV-3 | same | macOS | host node `dist/app.js` on 127.0.0.1 (`10.0.2.2` from the emulator), temp root and HOME, own launch credential; scripted AGY (`gemini-3.8-flash-low`, plus `gemini-retiring-458` until the API-04 restart), scripted Grok Build (`grok-4.7`) | paired by a Phone Access link shared into the app (`ACTION_SEND`) |
| ENV-4 | same | macOS, headless Chrome 157 | desktop window: `pnpm dev` of this worktree on 5458 against ENV-3's node; the composer probes' own stacks | 1440×1000 |

## Cases

| Case ID | Criteria | Surface | Steps | Env | Result | Evidence | Key Facts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001…009 unit and Chrome parts, AC-009 desktop agent/Org-copy stops | — | the implementation's IMP-458-* (web unit 760 files, typecheck, guards, MSP-59…64, DCP-001/003, AFS-001) | — | Reused (no product change since) | `evidence/implementation/` | — |
| API-01 | AC-001, 002, 004, 005 (woken run), 006, 008 | phone bundle, Chrome | full `test:e2e:mobile-shell` (clean env); reruns of the failed cases | ENV-1 | **Pass** after two test fixes | `api-01-mobile-shell.log` (60 Pass, 4 Fail), `api-01b-rerun.log`, `api-01c-msp08.log` | MSP-59…64 Pass and every later case unaffected. MSP-08: stale expectation (the menu now ends with Settings, UIS-002; for a Team member and a standalone agent) → updated (`1054deb132`), Pass. MSP-50/51: every desktop copy empty: the cases pressed `Control+C`, which copies nothing in Chrome on macOS (`api-01-copy-shortcut-macos.log`: `Control+C` "" vs `ControlOrMeta+C` text; the cases last passed in a Linux container) → baseline test fix `cdb3ad0025`, Pass. MSP-41 (one extra read after the desktop editor's own save) and an unknown desktop console error in MSP-50 ("Failed to open run … changed before projection commit") did not recur: intermittent, base paths (FU-003) |
| API-02 | AC-001, 002, 003 (phone), 004, 006 | the Android app | `android/journey.md` API-02: real taps on the paired app | ENV-2, ENV-3 | **Pass** | `android/shots/API-02-*.png` | conversation bodies at x 12, width 388 (412 − 24), 17 px / 25.5, composer 8 px from the bottom, text-area corners 11 px; ⋮: Artifacts, Files, Messages, Activity, Settings + Text size; stopped lead: "Stopped · in Delivery Team", Grok Build → Model "Choose", Save disabled; Grok 4.7 → Save → conversation; node: lead `grok_build`/`grok-4.7`, mate unchanged; reopened Settings shows them; "continue TEAM-458-CONTINUE" typed in the app ran on the scripted Grok (its fixture answer "PINEAPPLE done", Team active); idle agent and working agent (`HOLD_TURN`): red stop icon (`rgb(239,68,68)`, "Stop run", no text), rows and Save disabled; one tap → Stopped, rows open, node `isActive false`, no toast, no red card; the idle one then saved Grok Build / grok-4.7; Text size Large applied at once (19 / 28.5), app force-stopped and relaunched (new process) → still Large, menu shows Large pressed; back to Standard |
| API-03 | AC-004 (Org), REQ-008 (Org and Team member stop) | the Android app | Org run "Delivery Org" (planner = agent; squad = Team of reviewer, editor) | ENV-2, ENV-3 | **Fail (F-1)**; stopped Org members Pass | `android/shots/API-03-*.png`; `api-03b-msp65.log` | stopped planner ("Stopped · in Delivery Org") and squad's reviewer ("Stopped · in squad"): change + Save → the node holds only that member's new selection; reopen shows it. **Live Org member, one tap on the stop icon: the Org run stops on the node, then the app leaves Settings for `/mobile/?unsupported=desktopWorkspace` ("Unsupported on phone — The desktop workspace isn't on the phone. Your runs are here.")**: reviewer and planner, 2/2 in the app; MSP-65 1/1 in Chrome. Team member (lead) stop from Settings: Stopped, rows open, the screen stays (it took ~60 s: the woken lead sat in "Starting" on the scripted Grok restore before the stop completed — runtime fixture, not this ticket) |
| API-04 | AC-005 (model not offered) | the Android app + node restart | stopped agent: Model → "Retiring test model"; node restarted without it (offered: []); Save | ENV-2, ENV-3 | **Pass** | `android/shots/API-04-*.png` | red card: "'gemini-retiring-458' is not offered by Antigravity CLI now. Refresh the model list and choose again. Saved settings were not changed."; screen stays; node unchanged (`antigravity_cli`/`gemini-3.8-flash-low`) |
| API-05 | AC-003 (desktop), AC-008, AC-009 (desktop Team) | desktop window; composer probes | `desktop-team-stop.mjs` (3 rounds with the Team never opened, 3 with its lead's conversation open; Runs view "Terminate team"); `test:e2e:chat-composer-polish`; `test:e2e:chat-composer-menus-open-upward` | ENV-4 | **Pass** for 458's parts | `desktop/desktop-team-stop.log`, `api-05-*.log`, `api-05b-u03-*.log`, `api-05c-u03-base-sources.log` | working Team stopped 6/6 on the node in 3.2–4.3 s, no "Failed to terminate team", no console warning; desktop composer: text area radius 11 px in the 12 px box (`desktop-composer-corner.png`: the lower border continuous); `chat-composer-polish` T01–T07 Pass; `menus-open-upward` U01, U02, U04–U06 Pass, U03 Fail 3/3 — the same failure with the base's versions of every web source this ticket modifies (not this ticket; FU-002) |

## Failures

| ID | What fails | Where | Reproduction | Expected (requirement) | Evidence |
| --- | --- | --- | --- | --- | --- |
| F-1 | After the one-tap stop of a **live Org member** (an Org's direct agent or an Org Team member) in phone Settings, the Org run stops on the node but the phone leaves Settings and shows the run list with "Unsupported on phone — The desktop workspace isn't on the phone" (`/mobile/?unsupported=desktopWorkspace`). The rows never open; the user lands on an error banner for an action that succeeded. | `MobileRunSettings.vue` → `useRunStopAction` (`agent_org` subject) → `useWorkspaceHistorySubjectActions().execute({ action: 'stop' })`. Its stop branch (`composables/useWorkspaceHistorySubjectActions.ts` ~60–66), when the current route is that Org (`rootSubjectKind=agent_org&orgRunId=…`, which the phone's Org run screen carries), always runs `router.replace({ path: '/workspace', query: { …route.query, mode: 'history' } })` — whatever the shell (the `shell: 'mobile'` setup only guards the open/select path, and `useRunStopAction` passes none). The phone's feature gate maps `/workspace` to `desktopWorkspace` (`utils/mobileFeatureGates.ts` ~52) | 3/3: in the app with the reviewer and the planner (`android/journey.md` API-03); `test:e2e:mobile-shell --cases=MSP-65` (`api-03b-msp65.log`: `"url":"/mobile/?unsupported=desktopWorkspace"`, `stopped.open: false`, node `isActive false`) | REQ-008 / UXJ-004 / VIS-017: one tap stops the run (for an Org member the Org run, as on the desktop), **then the rows open** on the Settings screen | `android/shots/API-03-7-org-after-stop.png`, `API-03-8-planner-after-stop.png`; MSP-65 screenshots |

- Not failures of this ticket: MSP-08 (stale expectation, fixed), MSP-50/51 (macOS copy shortcut, baseline test fix), MSP-41 and the run-open console error (intermittent, base; FU-003), U03 (base; FU-002), the emulator's Wi-Fi routes (environment).

## Acceptance-Criteria Proof

| AC | Proven | Where | Status |
| --- | --- | --- | --- |
| AC-001 | Yes | MSP-59 (412, 360 px; the inter-agent arrow and type line), API-02 in the WebView (388 px at 12, 17/25.5, one avatar and name per turn) | Proven |
| AC-002 | Yes | MSP-60 (each step at once; reload), API-02 (kept across an app restart) | Proven |
| AC-003 | Yes | API-02 (phone corners 11 px), API-05 (desktop 11 px in the 12 px box, screenshot) | Proven |
| AC-004 | Yes | MSP-61, API-02 (Team member in the app, "continue" on the new runtime), API-03 (Org direct agent and Org Team member) | Proven |
| AC-005 | Yes | API-04 (a model not offered after a node restart: the node's words, nothing changed), MSP-62 (a run woken before Save) | Proven |
| AC-006 | Partly | MSP-63/64 and API-02 (live idle and working agents), API-03 (Team member) — **the Org member's stop fails REQ-008 (F-1)** | **Failed for Org members** |
| AC-007 | Yes | R-IMP (catalog test, localization guards); no hard-coded text seen on the phone screens | Proven |
| AC-008 | Yes | full phone probe (all cases pass with the two test fixes), `chat-composer-polish`, `menus-open-upward` except the base U03, desktop conversation unchanged (MSP-50 desktop conversation Pass) | Proven (U03 base, FU-002) |
| AC-009 | Yes | R-IMP unit tests and DCP-001/003, AFS-001; API-05 working Team stopped 6/6 from the desktop run tree without a false failure; API-02 phone stops without the red card | Proven |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 80% | AC-001…005, 007…009 proven on real surfaces | AC-006 fails for an Org member (F-1) |
| Changed-boundary execution directness | 85% | 95% | the app's WebView with real taps, a real node restart, a desktop window | — |
| Cross-boundary integration realism and mock gap | 85% | 92% | real nodes, real pairing; scripted runtimes by the ticket's rule | scripted runtimes (no provider) |
| Environment, configuration, identity, and fixture fidelity | 85% | 90% | own AVD, the branch's APK, pairing link | emulator Wi-Fi workaround |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 90% | refusal after a restart, woken run, app restart, idle/working/Team/Org stops | F-1 open |
| User-surface, browser, and desktop-shell confidence | 85% | 85% | screenshots of every state, desktop composer | F-1 lands on an error banner |
| Durable regression coverage quality and relevance | 88% | 92% | MSP-59…65; MSP-08 and MSP-50/51 repaired | MSP-65 fails until F-1 is fixed |

- Overall final confidence: 89% (89.1%, simple average)
- Every critical acceptance criterion directly proven: `No` (AC-006 for Org members); any applicable category below 90%: `Yes` (requirement proof, user surface)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed): the Android app on an emulator, a node restarted without a model, a desktop window
- Gap it addressed: the WebView, an app restart, Org members, a "not offered" refusal, the desktop Team stop

## Persisted-Data Transition Checks

- `Not Affected` (localStorage `autobyteus.phone.textSize` is new; read back after an app restart)

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`

## Durable Coverage Changed In The Codebase

| Path | Change | Commit |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` | copy with `ControlOrMeta+C` (baseline test fix: MSP-50/51 on macOS) | `cdb3ad0025` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | MSP-08 expects Settings last (Team member and standalone agent) | `1054deb132` |
| `autobyteus-web/tests/e2e/mobile-run-settings-cases.mjs` | MSP-65: a live Org member's Settings stop stops the Org run and stays on Settings with the rows open (fails today: F-1) | this round's evidence commit |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| A phone | Android 15 emulator | Wi-Fi off (routing) |
| Model inference | the repository's scripted AGY and Grok Build CLIs | no provider (the ticket's rule) |

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| AVD `apie2e458_api35`, emulator-5640, adb forward | `adb emu kill`, `avdmanager delete avd` | deleted; `adb devices` empty; other AVDs untouched |
| Host node (`node-458.mjs`), its temp root and HOME | `/tmp/abtest458/stop` → SIGTERM, root removed | "temp root removed: true" |
| `pnpm dev` on 5458, headless Chrome | stopped | port free |
| Base-sources check of U03 | the base's versions of the 14 modified web sources checked out, probe run, then `git checkout HEAD --` | `git status` clean for `autobyteus-web` |
| `/tmp/abtest458/state.json` (credential), `pairing-link.txt`; temp HOMEs | deleted | — |
| Probe-generated video inputs under `api-01-mobile-shell/msp-53-55-files/` | removed from the evidence | — |
| Evidence secret scan | `own_`/`mra_` 20+ chars, the pairing code, `access_token=` with a value, the credential itself | no match |

## Latest Authoritative Result

- Result: `Fail` — F-1 (a live Org member's stop in phone Settings leaves for the "Unsupported on phone" list); everything else in scope passes
- Recommended next owner: Code Reviewer (failure-origin review of F-1); after a fix, rerun: MSP-65, MSP-59…64, the Org stop in the app (API-03), and the full phone probe
