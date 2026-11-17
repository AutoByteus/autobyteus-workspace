# API/E2E Execution Coverage Report — phone-run-model-runtime-458 (autobyteus-458, with autobyteus-506's build items): a readable phone conversation, Text size, the composer corners, Settings for a run's runtime and model, and a stop that reports success

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 3; Delivery Engineer DR-001 blocked on the merged state `15c1fa5b56` (origin/personal `e16f0b0d55`: autobyteus-448 part 1, autobyteus-483): the phone probe's duplicate-ID guard stops on MSP-59 (483's background-task case and this ticket's conversation case). This ticket's MSP-59 is renumbered MSP-66 (MSP-56…58 are 461's; MSP-65 was the highest); its two screenshot names follow; `mobile-shell-probe.mjs`'s case list says MSP-60…66. Earlier records (IR-001/IR-002, rounds 1–2 here, CRR-001/002) name it MSP-59. Rerun on the merged state: server build and phone bundle, the full phone probe, the AC-007 localization checks (483 changed the shared catalog), the web unit suite and typecheck. Product code of this ticket unchanged since `6ddf9bb8f5`; the in-app and desktop cases of rounds 1–2 stand (the merge brings no change to the code they exercise: 483's phone changes are the background-task Activity section, covered by MSP-47…49, 59).
- Round 2 trigger: Implementation Engineer IR-002 (CR-001 Local Fix, from `code-review-report.md` CRR-001 on API-REV-001's F-1); code `6ddf9bb8f5`, documents `1b53150c63`. Round 1: IR-001, code `ec5b81f912`.
- Prior round reviewed: round 2 (API-REV-002, Pass). Round 1 (API-REV-001, Fail F-1) was rechecked in round 2.
- Rerun plan (rerun by impact): `git diff --stat 41638611b4 6ddf9bb8f5` changes only `useWorkspaceHistorySubjectActions.ts` (the stop's `/workspace` write runs off the phone shell only), `useRunStopAction.ts` (passes the caller's shell), `MobileRunSettings.vue` (passes `'mobile'`) and their specs. Desktop callers pass no shell (unchanged path). Rerun: the phone bundle, API-01 (full probe, incl. MSP-65), API-03 (Org stops in the app, Save after the stop), API-05's desktop Org-member Settings stop (preserved, requested by CRR-001). Still valid from round 1 (they exercise nothing the fix touches: agent and Team stops, conversation, Text size, refusal): API-02, API-04, API-05's Team stop and composer cases.
- Deviations from the investigation's plan, and why:
  - Round 1: API-02/03/04 used a host node of my own (`scripts/node-458.mjs`), not the probe's `--hold` stack: AC-005 needs a node restart without a model on the same port and data. API-03 found F-1; MSP-65 was added.
  - Round 2: the full probe stopped after MSP-52 on "AgyDiscoveryError: Antigravity model discovery timed out" in the setup of MSP-53…55 (host load average 70–110 from other worktrees' test runs); MSP-53…55 and MSP-32 ran separately. MSP-41 was investigated with 14 extra runs (FU-003). The emulator was restarted with `-gpu host` after "isn't responding" under that load (render thread starved).
  - Emulator networking: in two of three cold boots the default Wi-Fi network had an empty routing table; Wi-Fi was switched off so the app used `eth0`. Environment only.
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458/tickets/in-progress/phone-run-model-runtime-458/evidence/api-e2e/`
  - round 3: `r3-builds.log`, `r3-api-01-mobile-shell*`, `r3-api-01b-rest*`, `r3-guard-localization-boundary.log`, `r3-audit-localization-literals.log`, `r3-localization-tests.log`, `r3-web-unit.log`, `r3-typecheck.log`
  - round 2: `r2-api-01-mobile-shell*`, `r2-api-01b-rest*`, `r2-msp41-*`, `r2-android/journey.md` and `r2-android/shots/`, `r2-desktop/desktop-org-stop.log` and screenshots, `r2-build-mobile-web.log`
  - round 1: `api-01-*`, `api-01b-*`, `api-01c-*`, `api-03b-msp65*`, `api-05*`, `android/`, `desktop/`, `API-00-apk-build.log`, `build-mobile-web.log`
  - `scripts/` (temporary tools: `node-458.mjs`, `api.mjs`, `ph.mjs`, `step.sh`, `r2-setup.sh`, `r2-org-stop.sh`, `desktop-team-stop.mjs`, `desktop-org-stop.mjs`, and 472's `droid.mjs` adapted)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Code Review`: CRR-001 routes the round after the fix to the test-code review of the three API/E2E test commits and the new specs ("Then the test review covers the three API/E2E commits and the new specs")
- Proportional test-code review decision: `Required` (requested by CRR-001) for `cdb3ad0025`, `1054deb132`, `41638611b4` and IR-002's specs

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | round 3: merged `15c1fa5b56` + the MSP-66 renumber (this round's commit); round 2: `1b53150c63` (code `6ddf9bb8f5`); round 1: `41638611b4` (code `ec5b81f912`) | macOS 26 arm64, headless Chrome 157 | the phone probe's alpha/beta nodes (`autobyteus-server-ts/dist`, unchanged by this branch); the phone bundle rebuilt after the last product commit (`r2-build-mobile-web.log`, `build-mobile-web.log`); scripted AGY and Grok Build | clean env (`env -i`, temp HOME); host load average 70–110 in round 2 |
| ENV-2 | same | own AVD `apie2e458_api35` (android-35 google_apis arm64, Pixel 6: 1080×2400, page 412 CSS px at DPR 2.625), headless, port 5640, 2 GB; round 2 last boot `-gpu host` | debug APK of this branch (`API-00-apk-build.log`; no Android change since); WebView 124.0.6367.219 | `adb root`; Wi-Fi off where its routes were missing; WebView DevTools on tcp:9458; deleted after each round |
| ENV-3 | same | macOS | host node `dist/app.js` on 127.0.0.1 (`10.0.2.2` from the emulator), temp root and HOME, own launch credential; scripted AGY (`gemini-3.8-flash-low`; `gemini-retiring-458` until API-04's restart), scripted Grok Build (`grok-4.7`) | paired with a Phone Access link shared into the app (`ACTION_SEND`) |
| ENV-4 | same | macOS, headless Chrome 157 | desktop window: `pnpm dev` of this worktree on 5458 against ENV-3's node; the composer probes' own stacks | 1440×1000, en |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001…009 (unit, Chrome parts), CR-001 | — | IMP-458-r2-guards, -typecheck, -web-unit, -phone-probe-cases (MSP-59…65), -desktop-org-stop (AFS-002), -unit-repro (the four CR-001 tests fail before, pass after) | — | Reused (`Pass`) | implementation handoff IR-002 rows | — | ran on `6ddf9bb8f5`, the commit validated; AFS-002 stops the Org through GraphQL, so the desktop Settings stop click is API-05's |
| API-01 | AC-001, 002, 004, 005 (woken run), 006, 008; CR-001 | phone bundle in Chrome | round 3 (merged state): `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/r3-api-01-mobile-shell`; then `--cases=MSP-13,24…31,34,35,37,56…58,39…42,44…46,50…55,32` (`r3-api-01b-rest`). Round 2: `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/r2-api-01-mobile-shell`; then `--cases=MSP-13,MSP-53,MSP-54,MSP-55,MSP-32` | ENV-1 | `Pass` | `r3-api-01-mobile-shell.log`, `r3-api-01-mobile-shell/mobile-shell-probe.json`, `r3-api-01b-rest.log`, `r3-api-01b-rest/mobile-shell-probe.json`; round 2: `r2-api-01-mobile-shell.log`, `r2-api-01b-rest.log` | round 3: no duplicate-ID stop; `[mobile-shell] MSP-66 Pass`, MSP-60…65 Pass, `MSP-59 Pass` (483); run 1: 38 Pass, then MSP-24…27's setup `AgyDiscoveryError: Antigravity model discovery timed out` (host load ~70); `r3-api-01b-rest.log`: 29 Pass incl. MSP-41, `mobile-shell probe: Pass`; all 66 cases Pass, `unknownBrowserErrors` 0 in both. Round 2: `[mobile-shell] MSP-65 Pass`, MSP-59…64 Pass; 60 Pass in the full run; `r2-api-01b-rest.log`: MSP-13, 53, 54, 55, 32 Pass; `unknownBrowserErrors` 0 | every case passes except MSP-41, intermittent on the base too (FU-003). The full run stopped at MSP-53…55's setup ("Antigravity model discovery timed out", host load), so those ran separately. Round 1: 60 Pass, 4 Fail; MSP-08 (stale: Settings in the menu) fixed `1054deb132`; MSP-50/51 (`Control+C` copies nothing on macOS, `api-01-copy-shortcut-macos.log`) baseline fix `cdb3ad0025` |
| R3-MERGED | AC-007, AC-008 (merged state) | localization, web unit, typecheck | `pnpm guard:localization-boundary`; `pnpm audit:localization-literals`; `NUXT_TEST=true vitest run localization/`; `NUXT_TEST=true vitest run` (full web suite), then the timed-out spec alone; `pnpm typecheck` (all in `autobyteus-web`, merged state) | ENV-1 | `Pass` | `r3-guard-localization-boundary.log`, `r3-audit-localization-literals.log`, `r3-localization-tests.log`, `r3-web-unit.log`, `r3-web-unit-rerun.log`, `r3-typecheck.log` | `# exit: 0` (guards); `Test Files  13 passed (13)`, `Tests  32 passed (32)` (catalogs); `Test Files  1 failed \| 760 passed (761)` then the spec alone `Tests  3 passed (3)`; `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` | the full-suite failure was two 5 s timeouts in `CollaborationMessagesOrgRoot.integration.spec.ts` (not touched by 458) at host load ~100–130; it passes alone |
| API-02 | AC-001, 002, 003 (phone), 004, 006 | the Android app | round 1, `android/journey.md` API-02 (real taps): stopped Team lead → ⋮ → Settings → Grok Build → Grok 4.7 → Save → reopen → "continue"; live idle and working agents → stop icon → one tap → Save; Text size Large → force-stop → relaunch | ENV-2, ENV-3 | `Pass` (round 1, still valid) | `android/journey.md`, `android/shots/API-02-*.png` | bodies `[12,388,…]`, `fontSize 17`, `lineHeight 25.5`, `composerGap 8`, corners `11px`; node lead `grok_build`/`grok-4.7`, mate unchanged; "PINEAPPLE done"; stop `rgb(239, 68, 68)` "Stop run"; after the tap `isActive false`, `runtimeDisabled false`, `error null`; Large `19 / 28.5` after the relaunch | the fix does not touch agent or Team stops |
| API-03 | AC-004 (Org), AC-006, REQ-008 (Org member stop); F-1 | the Android app | round 2, `r2-android/journey.md` API-03 via `scripts/r2-org-stop.sh`: a Delivery Org run; the planner held working (`HOLD_TURN`), then the squad's reviewer idle; each: open in the app → ⋮ → Settings → one tap on the stop icon → node, URL, Settings → Runtime Grok Build, Model Grok 4.7 → Save | ENV-2, ENV-3 | `Pass` (F-1 resolved) | `r2-android/journey.md`, `r2-android/shots/r2-API-03-planner-working-{1,2,3}-*.png`, `r2-API-03-reviewer-idle-{1,2,3}-*.png` | live: `"status":"Running · in Delivery Org"` / `"Idle · in squad"`, stop "Stop run"; after the tap: org `"isActive": false`, URL `…&memberAddress=/planner&screen=settings` (`/squad`), `"status":"Stopped · in Delivery Org"`, `"runtimeDisabled":false`, `"error":null`, toasts `[]`; after Save: `screen=run`, node planner and reviewer `grok_build`/`grok-4.7`, others unchanged | round 1 Fail (F-1: `/mobile/?unsupported=desktopWorkspace` after the Org stop, 2/2 in the app); round 1's stopped-Org-member saves still hold. The first round-2 attempt was disturbed by a script loop and ANR dialogs from the host load (notes in the transcript) |
| API-04 | AC-005 (model not offered) | the Android app + node restart | round 1, `android/journey.md` API-04: stopped agent → Model "Retiring test model" → node restarted without it → Save | ENV-2, ENV-3 | `Pass` (round 1, still valid) | `android/shots/API-04-3-refused.png` | `"error":"'gemini-retiring-458' is not offered by Antigravity CLI now. Refresh the model list and choose again. Saved settings were not changed."`; node `gemini-3.8-flash-low` | the fix does not touch Save |
| API-05 | AC-003 (desktop), AC-008, AC-009 (desktop Team); CR-001 desktop preserved | desktop window; composer probes | round 2: `node scripts/desktop-org-stop.mjs <evidence>/r2-desktop` (planner, squad/reviewer: live → Settings → `existing-run-stop` one click). Round 1: `desktop-team-stop.mjs` (6 rounds), `test:e2e:chat-composer-polish`, `test:e2e:chat-composer-menus-open-upward` | ENV-4 | `Pass` | `r2-desktop/desktop-org-stop.log`, `r2-desktop/*.png`; `desktop/desktop-team-stop.log`, `desktop/desktop-composer-corner.png`, `api-05-*.log` | `PASS /planner`, `PASS /squad/reviewer`: URL `/workspace?…&mode=history…`, `settingsOpen: true`, `stopStill: false`, alerts `[]`, toasts `[]`; Team: `PASS closed-1…3`, `PASS open-1…3`; `areaRadius ["11px","11px"]`; composer-polish T01–T07 Pass | menus-open-upward U03 fails at 1024×440, the same with the base's web sources (FU-002) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (MSP-66, MSP-59 before round 3, at 412 and 360 px), API-02 | `Proven` | — |
| AC-002 | Yes | API-01 (MSP-60), API-02 (kept across an app restart) | `Proven` | — |
| AC-003 | No | API-02 (phone), API-05 (desktop) | `Proven` | — |
| AC-004 | Yes | API-01 (MSP-61), API-02 (Team member, "continue"), API-03 (Org direct agent and Org Team member) | `Proven` | — |
| AC-005 | Yes | API-04 (not offered after a restart), API-01 (MSP-62, woken run) | `Proven` | — |
| AC-006 | Yes | API-01 (MSP-63, 64, 65), API-02 (idle, working agent; Team member), API-03 (working Org direct agent, idle Org Team member: stays on Settings, rows open, Save works) | `Proven` | — |
| AC-007 | No | R-IMP (catalog test, localization guards); R3-MERGED (the same on the merged state, 483's catalog included) | `Proven` | — |
| AC-008 | Yes | API-01 (full probe), API-05 (desktop composer, Org Settings stop preserved), R-IMP (web suite) | `Proven` | U03 and MSP-41 fail on the base too (FU-002, FU-003) |
| AC-009 | Yes | R-IMP (unit, DCP-001/003, AFS-001), API-05 (working Team stopped 6/6 from the run tree), API-02 (phone stops without the red card) | `Proven` | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | API-01…05, R-IMP | — | — |
| Changed-boundary execution directness | 88% | 96% | API-02/03/04 (WebView, real taps), API-05 (desktop window) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 93% | real nodes, pairing, node restart; scripted runtimes (the ticket's rule) | no provider runtime | a live runtime (out of the ticket's rule) |
| Environment, configuration, identity, and fixture fidelity | 85% | 92% | own AVD, the branch's APK, pairing link, clean env | emulator networking and GPU workarounds under host load | a quiet host |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 95% | refusal after a restart, woken run, app restart, idle/working agent, Team and Org stops | — | — |
| User-surface, browser, and desktop-shell confidence | 88% | 95% | screenshots of every state; desktop composer and Org stop | — | — |
| Durable regression coverage quality and relevance | 90% | 94% | MSP-60…66; MSP-08, MSP-50/51 repaired; IR-002 specs | MSP-41 and U03 flaky/failing on the base (FU-002, FU-003) | those follow-ups |

- Overall post-repository confidence: 88%
- Overall final confidence: 94% (94.4%, simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%): the gap is environmental (host load, emulator workarounds) and the base-side flaky checks; no in-scope behavior is unproven
- Confidence-limiting residual risks: scripted runtimes only (the ticket's rule); MSP-41 (FU-003) and U03 (FU-002) outside this ticket

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone bundle in Chrome, a desktop window) and `Other` (the Android app on an emulator; a node restart)
- Confidence gap or residual risk it addresses, and the expected gain: the app's WebView, an app restart, Org members, a "not offered" refusal, the desktop Team and Org stops
- Browser validation needed, and why or why not: yes; the change is UI and routing
- If `Not Required`: —
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed, and any deviation from the investigation's plan: a `pnpm dev` desktop window against a test node (web-equivalent renderer); no Electron shell change in this ticket
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-05 (web-equivalent); no shell-specific behavior changed
- Effect on any already-running desktop application: `None` (the user's AutoByteus and its data were not touched)
- Behavior not directly proven and its confidence consequence: none

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` in round 3 (the renumber); `No` in round 2; `Yes` in round 1

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (`cdb3ad0025`) | Updated: copy with `ControlOrMeta+C` (baseline fix: MSP-50/51 on macOS) | API-01 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`1054deb132`) | Updated: MSP-08 expects Settings last (Team member, standalone agent) | API-01 | — |
| `autobyteus-web/tests/e2e/mobile-run-settings-cases.mjs`, `mobile-shell-probe.mjs` (round 3 commit) | Updated: this ticket's MSP-59 renumbered MSP-66 (483 took MSP-59 on the base); its screenshot names `MSP-66-*`; the probe's case list MSP-60…66 | API-01 | — |
| `autobyteus-web/tests/e2e/mobile-run-settings-cases.mjs` (`41638611b4`) | Added: MSP-65, a live Org member's Settings stop (stops the Org, stays on Settings, rows open) | API-01, API-03 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A phone | Android 15 emulator | no device for automated runs | networking/GPU workarounds under host load |
| Model inference | the repository's scripted AGY and Grok Build CLIs | the ticket's rule (no provider quotas) | no provider-specific behavior |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| AVD `apie2e458_api35`, emulator-5640, adb forward (both rounds) | Yes | `adb emu kill`, `avdmanager delete avd` | deleted; `adb devices` empty; other AVDs untouched |
| Host node `node-458.mjs` (both rounds), its temp root and HOME | Yes | `/tmp/abtest458/stop` → SIGTERM, root removed | "temp root removed: true" |
| `pnpm dev` on 5458, headless Chrome | Yes | stopped | port free |
| Base-sources checks (U03, MSP-41) | Yes | the base's versions of 458's modified web sources checked out, then `git checkout HEAD --` | `git status` clean for `autobyteus-web` |
| `/tmp/abtest458/state.json` (credential), `pairing-link.txt`, temp HOMEs | Yes | deleted | — |
| Probe-generated video inputs, MSP-41 rerun screenshots | Yes | removed from the evidence | — |
| Other worktrees' nodes and scripted CLIs seen during the runs | No | not touched | — |
| Evidence secret scan | Yes | `own_`/`mra_` 20+ chars, the pairing code, `access_token=` with a value | no match |

## Latest Authoritative Result

- Result: `Pass` (round 3, merged state)
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner (on `Fail`): — (round 1's F-1: `Local Fix`, implementation; resolved by `6ddf9bb8f5`)
- Next recipient from `get_handoff_rules`: the Delivery Engineer, who sent round 3 (DR-001): the merged state passes. The code reviewer's test-code review (CRR-002) has already been recorded; the round-3 test change is a renumber only
- Notes: final confidence 94%; below 95% only through the environment (host load average 70–150 from other work on this machine: two probe setups and one unit spec timed out and passed on rerun) and the base-side flaky checks (FU-002, FU-003)
