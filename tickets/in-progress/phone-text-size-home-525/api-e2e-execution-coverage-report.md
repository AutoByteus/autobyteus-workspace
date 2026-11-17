# API/E2E Execution Coverage Report — phone-text-size-home-525 (autobyteus-525)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (direct route, `Medium` / `Low`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-10 added during execution: VNC Viewer was the one REQ-005 screen nobody had seen; reading its bar showed a likely overflow, so it was measured (no node desktop is available to the probe stacks).
  - API-09 ran on `pnpm dev` of the worktree: the held probe stack starts no desktop frontend.
  - The first held stack's pairing code expired (5 min lifetime) before the emulator was ready; the second stack's setup hit "AgyDiscoveryError: Antigravity model discovery timed out" under host load (~150, as recorded in autobyteus-458); the third stack was used for API-05…08. Each cleaned up (`serversLeft: 0, rootRemoved: true`). Harness-side fixes during API-05/07 (not product): the proxy first sent every host (including the icon CDN) to the node, and the Files walk assumed a file name; the walks were rerun after the fix.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/evidence/api-e2e/` (header for its JSON/PNG files: `evidence/api-e2e/README.md`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (this round: `Fail` → failure-origin review by the code reviewer)
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test code changed this round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `7c7f3d2e79` (HEAD `66691f49d6`: ticket docs only) | macOS 26 arm64, Node v22.23.1 | web unit suite (vitest), server typecheck | host load 75–150 |
| ENV-2 | same | macOS | held probe stack: `node tests/e2e/mobile-shell-probe.mjs --hold` (alpha, beta from `autobyteus-server-ts/dist`, scripted AGY/Grok, the probe's runs); alpha serves `autobyteus-web/dist/public` (head bundle built 22:21 after `7c7f3d2e79`; holds `mobile-on-this-phone`) or, switched by `swap.sh`, the base bundle (`ff13782f36`, built in a separate worktree) | probe-owned temp root; alpha port shown in `hold.json` only |
| ENV-3 | same | Android 15 emulator, own AVD `apie2e525_api35` (android-35 google_apis arm64, Pixel 6 1080×2400; page 412 CSS px, DPR 2.625), headless, `emulator-5650` | debug APK of this branch (`API-00-apk-build.log`), Android System WebView Chrome/124.0.6367.219 | paired with ENV-2's alpha via `http://10.0.2.2:<port>` link shared into the app (`ACTION_SEND`) |
| ENV-4 | same | macOS, headless Chrome (playwright-core 1.58.2) | host phone on ENV-2: origin `http://10.0.2.2:<port>` through a local proxy to alpha (same Host/Origin as the emulator), the emulator phone's stored pairing copied in | 412×915, DPR 2, isMobile, en-US, UTC |
| ENV-5 | same | macOS, headless Chrome | `pnpm dev` of the worktree, desktop page `/` | 1440×1000, no node |
| ENV-6 | same | macOS, headless Chrome | `dist/public` (head phone bundle) served at `/mobile/` by `scripts/vnc-bar.mjs` (setup page; plugin 06 applies the stored step) | 360×800 and 412×800, DPR 2, isMobile |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 004, 007, 008; QR-002 | unit/component, guards, web typecheck | Reused: IMP-01, IMP-03, IMP-04 | — | Pass | (implementation handoff Checks Run) | — | ran on `7c7f3d2e79`; `git diff --name-only 7c7f3d2e79 HEAD` lists only `tickets/` files |
| API-02 | AC-007; stale tests | whole web unit suite | `pnpm -C autobyteus-web test:nuxt --run` | ENV-1 | Pass | `API-02-web-unit-full.log` (excerpt) | `Test Files  765 passed (765)`, `Tests  5743 passed \| 2 skipped (5745)` | no test outside IMP-01's 191 files was made untrue by the change |
| API-03 | — (TESTING both typechecks) | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-03-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `[typecheck] PASS` | — |
| API-04 | AC-001…006, QR-001, REQ-006/007 | production phone bundle | Reused: IMP-02 (MSP-66, MSP-60, MSP-67) | — | Pass | (implementation handoff Checks Run) | — | same commit and bundle; MSP-67 does not include VNC Viewer (see API-10) |
| API-05 | AC-006 | base vs head phone bundle, same node and data, Standard | `screens.mjs walk base-standard standard` (base served) → `swap.sh head` → `screens.mjs walk head-standard-2 standard`; `compare.mjs same`; `pixeldiff.py` | ENV-2, ENV-4 | Pass | `walks/API-05-same.json`, `walks/API-05-pixels.json`, `walks/API-05-diff-run-list.png`, `walks/API-05-diff-run-menu.png`, `walks/API-05-diff-setup.png`, `walks/base-standard-*.png`, `walks/head-standard-2-*.png` | `"totals": {"screens": 14, "matched": 217, "diffs": 7}`: all 7 are `mobile-run-name/title … w 264.75→263.06` next to an age label that read `21m` in the base walk and `22m` in the head walk; root `16px` on every screen of both; pixels: 0 on activity, artifacts, conversation, file-viewer, files, new-run, new-run-agent-sheet, settings; run list and sheets differ only at x 340…386 (the new ⋮ and the age labels); run-menu only the removed Text size block; setup only two icons (absent in `base-standard` and in the first `head-standard` walk too: icon load timing) | Standard renders as the base on every walked screen apart from the intended ⋮ and run-menu removal |
| API-06 | AC-004 (beta.9 carry-over), QR-001 | stored step across a bundle update | base served: open a run → run ⋮ → Text size → Largest → run list; `swap.sh head`; reload; run list; home ⋮; open the run (`screens.mjs upgrade`) | ENV-2, ENV-4 | Pass | `upgrade/API-06-upgrade.json`, `upgrade/API-06-1…5-*.png` | base after the choice: `"stored": "largest", "root": 16, "feed": 21`; head after the update: `"step": "largest", "root": 19.7647, "runName": 18.5294`, `"firstScreen": {"root": "19.7647px", "step": "largest"}`; conversation `"feed": 21`, `"pressed": "mobile-text-size-largest"` | `Directly Usable — No Migration` proven with a value written by the old page |
| API-07 | REQ-005, REQ-006 | head bundle, Standard vs Largest, every walked screen | `screens.mjs walk head-standard standard`, `… head-largest largest`, `compare.mjs scale`; `screens.mjs chips largest|standard` (Activity of every run, elements with the 11 px class) | ENV-2, ENV-4 | Pass | `walks/API-07-scale.json`, `walks/head-largest-*.png`, `walks/API-07b-chips.json`, `walks/API-07b-largest-approver-activity.png`, `walks/API-07b-standard-approver-activity.png` | `"totals": {"screens": 15, "matched": 241, "diffs": 0}` (every text ×21/17 within 0.02; Monaco 14→17; the four preview letters exempt); unmatched only age labels (`12px` → `14.8235px`); `sidewaysB False` on every screen; Approver's system-instruction item `"Available"` `px 11` at Standard, `13.5882` at Largest | screens: run list, On this phone, connection sheet, unpair, New run, its agent sheet, conversation, run ⋮, Artifacts, Files, `src/app.ts` viewer, Activity, Settings, setup page. Messages is not offered for these runs (not Team/Org members); MSP-67 covers it |
| API-08 | AC-001, 003, 004, 005; QR-001 | the Android app (WebView) | `android.mjs pair` (APK install, link shared, run list); `android.mjs steps` (real taps: ⋮ → Standard/Small/Large/Largest; tap outside; open the first run; ←); `android.mjs restart` (force-stop at Largest, launch, poll the page, `screenrecord`) | ENV-2, ENV-3 | Pass | `android/API-08-android.jsonl`, `android/API-08-{standard,small,large,largest}-{1-home-menu,2-home,3-conversation}.png`, `android/API-08-restart-run-list.png`, `android/API-08-restart.mp4`, `android/API-08-restart-frames-1-40.png`, `android/API-08-restart-frames-39-45.png` | per step `root` 16 / 14.1176 / 17.8824 / 19.7647, `rootStyle` 100% / 88.2353% / 111.765% / 123.529%, `runName` 15 / 13.2353 / 16.7647 / 18.5294, `feed` 17 / 15 / 19 / 21, `menuOpen: true` and `pressed` = the step right after the tap, `sideways: false`; restart: `"firstScreen": {"shown": true, "root": "19.7647px", "step": "largest"}`; frames show only the native splash, "Connecting to Alpha Test Node", "Connected to Alpha Test Node" before the run list | The page reads 16 px before plugin 06 runs, while the app's own overlay covers it; no web screen is shown at the old size |
| API-09 | AC-007 | desktop page start | `scripts/desktop.mjs desktop` | ENV-5 | Pass | `desktop/API-09-desktop.json`, `desktop/API-09-*.png` | no choice `root 16px`, `data-app-font-size=default`, `phoneAttr: null`, `onThisPhone: 0`; stale `autobyteus.phone.textSize=largest` → still `16px`, `phoneAttr: null`; Display `large` → `18px` (`112.5%`), `extra-large` → `20px` (`125%`) | the script's `--app-*` variable names were wrong (empty values); editor/terminal px stay proven by the desktop specs in IMP-01 |
| API-10 | REQ-005 (VNC Viewer controls), REQ-007, AC-005 | VNC Viewer top bar, production CSS | `scripts/vnc-bar.mjs vnc <dist/public>`: the bar's exact markup (MobileScreenBar + MobileNodeDesktop `#actions`, English labels, icons as same-size boxes) inserted in the real phone page at Standard/Large/Largest × 360/412 px, View only and Control | ENV-6 | **Fail** | `vnc/API-10-vnc-bar.json`, `vnc/API-10-412-largest-control.png`, `vnc/API-10-360-largest-control.png`, `vnc/API-10-360-large-control.png`, `vnc/API-10-412-standard-control.png`, `vnc/API-10-360-standard-control.png`, other `vnc/API-10-*.png` | Control: `"width":412,"step":"largest"…"headerScrollWidth":443,"titleWidth":19.8,"fullScreenRight":442.8,"fullScreenPastEdge":true`; `360 large … "fullScreenRight":403.5`; `360 largest … "fullScreenRight":442.8`; View only: clean at every step and width; `412 standard control` clean (title 60.3); `360 standard control` `"fullScreenRight":363.7` (before this ticket: FU-002). Screenshot `API-10-412-largest-control.png`: the full-screen button cut at the right edge, the title shows "V" with no ellipsis | reconstruction, not the live component: no node desktop in the probe stacks. The markup is copied from the current source (`MobileNodeDesktop.vue` l.11–58, `MobileScreenBar.vue` l.4–18; `barButtonClass` l.181) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-04, API-08 | Proven | — |
| AC-002 | Yes | API-01, API-04, API-05 (run-menu diff: only the Text size block) | Proven | — |
| AC-003 | Yes | API-04, API-07, API-08 | Proven | — |
| AC-004 | Yes | API-01, API-04, API-06, API-08 (restart) | Proven | — |
| AC-005 | Yes | API-04 (MSP-67: 34 screens), API-07, API-08; **API-10 fails** | **Not Proven** — VNC Viewer in Control mode does not fit at Large (360 px) and Largest (360 and 412 px) | — |
| AC-006 | Yes | API-04, API-05 | Proven | — |
| AC-007 | Yes | API-01, API-02, API-09 | Proven | — |
| AC-008 | No | API-01 | Proven | — |
| The founder's view of the result (DEC-001, DEC-004) | No | — | Only The User Can Check | his taste on his phone before release (Task); the evidence screenshots are ready for him |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 50% | API-01…09 prove AC-001…004, 006…008 directly | AC-005 fails for VNC Viewer (API-10) | the fix, then API-10 again |
| Changed-boundary execution directness | 85% | 95% | production phone bundle, real Android WebView, real taps | API-10 is a markup reconstruction | a live node desktop |
| Cross-boundary integration realism and mock gap | 85% | 93% | real nodes, pairing, bundle update on the same origin | scripted runtimes; host phone uses a copied pairing | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 92% | own AVD, branch APK, base bundle built from `ff13782f36` | host load; harness proxy | a quieter host |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | reload, app restart, upgrade, stale phone value on the desktop | storage-unavailable path only in unit tests | — |
| User-surface, browser, and desktop-shell confidence | 80% | 60% | 34 + 15 screens at Largest, 4 steps on the device | VNC Viewer Control bar overflows | the fix |
| Durable regression coverage quality and relevance | 90% | 90% | MSP-60/66/67, new specs, full suite green | VNC Viewer not in MSP-67 (no node desktop in the probe) | a node-desktop case in MSP-67 |

- Overall post-repository confidence: 84%
- Overall final confidence: 82% (simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-005)
- Any final applicable category below `90%`: `Yes` — requirement proof (50%), user surface (60%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: API-10 failure

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (production phone bundle in Chrome; desktop page) and `Other` (the Android app on an emulator)
- Confidence gap or residual risk it addresses: AC-006 against the base, the founder's device (WebView, fractional root, restart), the beta.9 value, text that does not scale, the VNC Viewer screen
- Browser validation needed: yes; rendered layout and the phone bundle are the changed boundary
- If `Blocked`: —

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: `autobyteus.phone.textSize = largest` written by the base (beta.9-era) page through its run ⋮
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-06 (and API-08 restart, MSP-60 reload)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (grep: `usePhoneTextSize`, `--pc-size`, `mobile.settings.textSize` appear only in assertions that they are gone)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: — (the implementation's removal of `MobileRunMenu.textSize.spec.ts` is recorded in the investigation with its replacements)

Recommendation for the fix round: add the VNC Viewer bar at Largest (Control mode) to MSP-67 once the probe has a node desktop, or as a component-level layout check the project accepts.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtimes | the probe's scripted AGY / Grok Build | project rule for probes; no provider needed for sizes | none for this change |
| A phone on the LAN | Android emulator (`10.0.2.2`); host Chrome through a proxy with the same origin | no device for automated runs | none material |
| Node desktop (VNC) | API-10 rebuilds the bar's markup in the real phone page | the probe nodes have no desktop | the live component's state logic is not exercised (only its layout) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| three held probe stacks (`/tmp/abtest525/hold*`) | Yes | SIGINT | each `{'frontendExited': True, 'serversLeft': 0, 'rootRemoved': True}` |
| AVD `apie2e525_api35`, `emulator-5650`, adb forward tcp:9525 | Yes | `adb forward --remove-all`, `adb emu kill`, `avdmanager delete avd` | deleted; `emulator-5640` / `apie2e522_api35` belong to autobyteus-522 and were not touched |
| base worktree `/tmp/abtest525/base` (`ff13782f36`) | Yes | `git worktree remove --force`, `prune` | removed |
| `dist/public` switched to a symlink during API-05/06 | Yes | link removed, head bundle moved back | `dist/public` is the head bundle directory again |
| `pnpm dev` (API-09), static server and proxies | Yes | process group SIGTERM/SIGKILL; servers closed | none left |
| copied phone pairing (`/tmp/abtest525/phone-storage.json`), pairing link file | Yes | deleted with `/tmp/abtest525` | gone; never in evidence |
| harness scripts | Yes | kept in `evidence/api-e2e/scripts/` (ticket-owned) | — |
| Evidence secret scan | Yes | grep `own_`/`mra_`/`mhub_` 20+, `pairing=`, `access_token=` with a value | no match |

## Preliminary Classification (On `Fail`)

- `Local Fix` (implementation engineer): the phone VNC Viewer's top bar (`MobileNodeDesktop.vue` `#actions` in `MobileScreenBar.vue`) has four `flex-shrink-0` actions in Control mode; at Large/Largest their rem sizes grow past the screen width. REQ-005 lists "VNC Viewer controls and clipboard" and REQ-007 requires no cut-off at Largest on 360 and 412 px; the design's step 5 asks for sizing fixes of screens found unclean (wrapping, max widths). The handoff recorded VNC Viewer as not run.
- If making the bar fit needs a layout change beyond sizing (for example moving Keyboard/Clipboard out of the bar), the design's escalation trigger applies: `Design Impact` to the Solution Designer.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-005 not proven (API-10); the founder's own view before release is his
- Preliminary classification and recommended owner: `Local Fix`, implementation engineer (or `Design Impact` if the bar needs a redesign)
- Next recipient from `get_handoff_rules`: `/code_reviewer` (failure-origin review)
- Notes: docs sync for delivery later: `autobyteus-web/docs/remote_access.md:26` still says Text size uses `usePhoneTextSize` (and the run menu). FU-002 recorded (the same bar at Standard on 360 px, before this ticket). On the rerun: API-10 first; API-05/07 for any screen the fix touches; the rest stays valid unless the fix touches it.
