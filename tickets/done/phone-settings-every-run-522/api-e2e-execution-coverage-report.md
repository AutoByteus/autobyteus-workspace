# API/E2E Execution Coverage Report — phone-settings-every-run-522 (autobyteus-522): phone Settings for every run

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; Implementation Engineer IR-001 (direct route); code `ce61209db1` + `4e9d7c4067` (a spec move), documents `d0ad333141`; base `origin/personal` @ `3722dbb1d8`
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-04 ran in the Android app against the probe's held stack (`--hold`: alpha + beta, its emulator pairing link) instead of Chrome: the stack has the PTM's peer runs, and the app is the founder's surface.
  - The host's load average was 140–165 throughout (other work on this machine). In the emulator this produced system dialogs ("Bluetooth keeps stopping", "System UI isn't responding"), an expired pairing code, and `input tap` held ~800 ms (a long press, no click); taps were switched to one write to the touch device. Each is noted in the transcripts.
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522/tickets/in-progress/phone-settings-every-run-522/evidence/api-e2e/`
  - `api-01-mobile-shell*`, `api-01b-msp33-*`, `api-01c-msp33-base-*`, `api-01c-*-bundle-*.log`, `build-mobile-web.log`, `API-00-apk-build.log`
  - `android/journey.md` and `android/shots/` (API-02, API-03), `android/node-522*.log`; `android-peer/journey.md` and `android-peer/shots/` (API-04)
  - `scripts/` (temporary tools: `node-522.mjs`, `api.mjs`, `pair.sh`, `ph.mjs`, `step.sh`, `reload-sample.mjs`, and 472/458's `droid.mjs` adapted)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (API/E2E changed no durable test)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `d0ad333141` (code `ce61209db1`, `4e9d7c4067`) | macOS 26 arm64, headless Chrome 157 | the phone probe's alpha/beta nodes (`autobyteus-server-ts/dist`, no server change on this branch); the phone bundle rebuilt from HEAD (`build-mobile-web.log`); scripted AGY and Grok Build | clean env (`env -i`, temp HOME); host load average 100–165 |
| ENV-2 | same | own AVD `apie2e522_api35` (android-35 google_apis arm64, Pixel 6, page 412 CSS px at DPR 2.625), headless, port 5640, `-gpu host`, 2 GB | debug APK of this branch (`API-00-apk-build.log`) | `adb root`; taps written to the touch device; WebView DevTools on tcp:9522; deleted afterwards |
| ENV-3 | same | macOS | host node `node-522.mjs` (`dist/app.js`, temp root and HOME, own credential; scripted AGY and Grok Build; Project Task Manager, Fact Checker, Release Notes Writer, Changelog Helper, Delivery Team, Docs Review Team, Delivery Org) | paired by a Phone Access link shared into the app (`ACTION_SEND`) |
| ENV-4 | same | macOS | the probe's stack held (`test:e2e:mobile-shell --hold`): alpha and its peer beta-node, the probe's data (the PTM's peer task runs) | the app paired with the stack's emulator link |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001…007 (unit and Chrome parts) | — | IMP-522-repro-before, -phone-probe-cases (MSP-60…72), -guards, -typecheck, -web-unit (+ rerun), -run-menu-specs | — | Reused (`Pass`) | implementation handoff rows | — | ran on `ce61209db1`/`4e9d7c4067`, the code validated; the repro shows MSP-67/68/72 without Settings and MSP-69's BEH-005 on the base |
| API-01 | AC-001…007 | phone bundle in Chrome | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/api-01-mobile-shell`; then `--cases=MSP-33` ×2, and ×2 with the base's versions of the six product files in a bundle built from them | ENV-1 | `Pass` (in scope) | `api-01-mobile-shell.log`, `api-01-mobile-shell/mobile-shell-probe.json`, `api-01b-msp33-{1,2}.log`, `api-01c-msp33-base-{1,2}.log` | all 72 cases ran: `MSP-67 Pass` … `MSP-72 Pass`, MSP-60…66 Pass; 71 Pass; `MSP-41 Fail` (`readsAfterSave` 2); one unknown browser error in MSP-33: "Failed to fetch runtime availabilities: Error: Failed to fetch" | MSP-41 is the base flake (autobyteus-458 FU-003: fails on base sources too; TESTING.md's busy-`fseventsd` note). The MSP-33 error repeats 2/2 and 2/2 on the base sources → base, FU-001. Out of scope |
| API-02 | AC-001 | the Android app | `android/journey.md` API-02: node: a PTM run delegates `/delivery_team`; its lead `HOLD_TURN`. App: PTM → "delivery team" (unfolded by its chevron) → lead → ⋮ → Settings → stop icon → Grok Build / Grok 4.7 → Save → ⋮ → Settings → ← → a message | ENV-2, ENV-3 | `Pass` | `android/journey.md`, `android/shots/API-02-*.png` | menu `["Artifacts","Files","Messages","Activity","Settings"]`; `"status":"Running · in delivery team"`, stop "Stop run"; after the tap task team `isActive false`, PTM `isActive true` (before: true), `"runtimeDisabled":false`, `"error":null`, toasts `[]`; node `/lead:grok_build`/`grok-4.7`, `/mate` `antigravity_cli`; reopened "Grok Build"/"Grok 4.7"; the lead's user messages end with "oc", its last answer "PINEAPPLE\ndone" (scripted Grok) | the typed text lost characters (`adb input text` under the load); the message still went from the app and the lead continued on Grok |
| API-03 | REQ-002, REQ-003 (a Team member's task team; RU-02) | the Android app | `android/journey.md` API-03: a standalone Docs Review Team's reviewer delegates `/delivery_team`; its mate `HOLD_TURN`; app: Docs Review Team → reviewer → "delivery team" → mate → Settings → stop → Grok Build / Grok 4.7 → Save | ENV-2, ENV-3 | `Pass` | `android/shots/API-03-*.png` | `"Running · in delivery team"`, stop; after the tap task team `false`, Docs Review Team `true`; rows open, no error; node: task team `/mate:grok_build/grok-4.7`, `/lead` unchanged; Docs Review Team members unchanged | the design's row "a task team's member opened in a standalone Team's tree" |
| API-04 | AC-006, REQ-004, R-001 (RU-03) | the Android app on the held stack | `android-peer/journey.md`: PTM → peer task run "publisher" → ⋮ → Settings; `scripts/reload-sample.mjs 20000` (a recorder added before the document, then `Page.reload`) ×3 | ENV-2, ENV-4 | `Pass` | `android-peer/journey.md`, `android-peer/shots/API-04-*.png` | menu `["Artifacts","Files","Activity","Settings"]`; `"remote":"This run is on beta-node. Its runtime and model can be changed only on that node."`, `rows:false, save:false, stop:false`; reloads 4–6: `[{"text":null},{"at":2138…,"text":"This run is on beta-node. …"}]` | no empty node name: the sentence appears only with the screen, already named. Runs 1–3 recorded nothing (the sampler's session closed early; fixed) |
| API-05 | AC-007 | desktop | the full probe's desktop-window cases (MSP-01, 15, 39…42, 44…46, 50…52) in API-01; `git diff --stat 3722dbb1d8 HEAD` touches no file outside the phone shell, its catalog keys and specs | ENV-1 | `Pass` | `api-01-mobile-shell.log` | the desktop cases Pass (MSP-41 base flake) | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 (the app), API-01 (MSP-67) | `Proven` | — |
| AC-002 | Yes | API-01 (MSP-68) | `Proven` | — |
| AC-003 | Yes | API-01 (MSP-69; R-IMP's repro fails on the base) | `Proven` | — |
| AC-004 | Yes | API-01 (MSP-70) | `Proven` | — |
| AC-005 | Yes | API-01 (MSP-71, MSP-61, MSP-65) | `Proven` | — |
| AC-006 | Yes | API-04 (the app), API-01 (MSP-72), R-IMP (catalog) | `Proven` | — |
| AC-007 | Yes | API-01 (458's MSP-60…66 and every other case; MSP-41 and MSP-33's line are base, FU), API-05, R-IMP (web suite) | `Proven` | — |
| REQ-002/003 for a Team member's task team | No | API-03 | `Proven` | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 97% | API-01…05, R-IMP | — | — |
| Changed-boundary execution directness | 90% | 96% | the app's WebView with real taps; the node's state after each step | — | — |
| Cross-boundary integration realism and mock gap | 88% | 94% | real nodes, a real peer node, pairing; scripted runtimes (the ticket's rule) | no provider runtime | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 90% | own AVD, the branch's APK | a heavily loaded host: tap injection changed, typed text lost characters | a quiet host |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 95% | live working and stopped members, stop scope (task team vs delegator vs Team), a reload on a peer run | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 96% | screenshots of every state on the device | — | — |
| Durable regression coverage quality and relevance | 92% | 93% | MSP-67…72 (implementation); 458's cases | the full probe still ends `Fail` on two base issues (FU-001; 458 FU-003) | those follow-ups |

- Overall post-repository confidence: 89%
- Overall final confidence: 94% (94.4%, simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%): the gap is the loaded host's effect on the emulator and the base-side probe failures; nothing in scope is unproven
- Confidence-limiting residual risks: FU-001 and 458 FU-003 keep the full probe red until fixed on the base

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (the Android app on an emulator, against a test node and the probe's held two-node stack) and `Browser` (the phone probe)
- Confidence gap or residual risk it addresses, and the expected gain: the founder's surface (the app's WebView), the stop's scope on real delegated runs, a peer run's sentence across a reload
- Browser validation needed, and why or why not: yes; the change is phone UI
- If `Not Required`: —
- If `Blocked`: —

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A phone | Android 15 emulator | no device for automated runs | tap injection under a loaded host |
| Model inference | the repository's scripted AGY and Grok Build CLIs | the ticket's rule (no provider keys) | no provider-specific behavior |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| AVD `apie2e522_api35`, emulator-5640, adb forward | Yes | `adb emu kill`, `avdmanager delete avd` | deleted; `adb devices` empty; other AVDs untouched |
| Host node `node-522.mjs`, temp root and HOME | Yes | `/tmp/abtest522/stop` → SIGTERM | "temp root removed: true" |
| The probe's held stack (alpha, beta, frontend) | Yes | SIGTERM | `serversLeft: 0`, `rootRemoved: true` |
| Base-sources check of MSP-33 | Yes | six product files checked out from the base, bundle built, probe run; then `git checkout HEAD --` and the bundle rebuilt | `git status` clean for `autobyteus-web`; `api-01c-head-bundle-rebuild.log` |
| `/tmp/abtest522` (credential, pairing links, the stack's log), temp HOMEs | Yes | removed | — |
| Other worktrees' processes and nodes on this machine | No | not touched | — |
| Evidence secret scan | Yes | `own_`/`mra_` 20+ chars, the pairing code, `access_token=` with a value | no match |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient from `get_handoff_rules`: Delivery Engineer (direct Small / Low; no durable test change by API/E2E; test review `Not Required — direct low-risk route`)
- Notes: final confidence 94%. Out of scope and recorded: FU-001 (MSP-33's console line on New run reload, base) and autobyteus-458 FU-003 (MSP-41, base). The branch is 13 commits behind `origin/personal` (autobyteus-515, a TESTING.md note); delivery integrates.
