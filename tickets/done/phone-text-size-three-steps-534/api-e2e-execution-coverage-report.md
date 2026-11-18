# API/E2E Execution Coverage Report — phone-text-size-three-steps-534 (autobyteus-534)

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/tickets/in-progress/phone-text-size-three-steps-534/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; IR-001 (SR-001, code `d4a14666a4`), then — mid-round — IR-002 (SR-002, the founder's request: Settings last in the run's ⋮; code `a8f2680e2a`, HEAD `6df3a5c12f`). As the solution revision record asks, this one round covers SR-001 and SR-002 together.
- Prior round reviewed: None
- Deviations from the plan, and why:
  - API-02's first run (11:28–11:45) overlapped the SR-002 commits in this worktree (11:35–11:37) and read a mixed state of `MobileRunMenu.vue` and its spec (2 failures in "Settings always, and last"); discarded and rerun on IR-002 with HEAD checked before and after.
  - API-08 and API-09 added on IR-002: the run menu's VNC Viewer + Settings order needs a node desktop, which the probe lacks; the device check (API-09) was added when the scorecard without it came to 94.7 %.
  - The Android emulator was first left out (investigation); API-09 is that check.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/tickets/in-progress/phone-text-size-three-steps-534/evidence/api-e2e/` (header: `README.md`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test code changed by API/E2E)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | IR-001 `d4a14666a4` (bundle built by the implementation 11:11) | macOS 26 arm64, Node v22.23.1, headless Chrome | probe stack `--hold` (this worktree's server `dist`); alpha serves `dist/public` = this ticket's bundle or, switched by `swap.sh`, the base bundle `bd2053ee51` | host phone 412×915 (360×800 where named), DPR 2, en-US/zh-CN, origin `http://10.0.2.2:<port>` through a local proxy, paired with the stack's own link; load 60–140 |
| ENV-2 | IR-002 `a8f2680e2a` (HEAD `6df3a5c12f`) | macOS, Node v22.23.1 | web unit suite; server typecheck | — |
| ENV-3 | IR-002 (bundle built by the implementation 11:46 at `a8f2680e2a`) | macOS, headless Chrome | `node-534.mjs`: this worktree's server with `AUTOBYTEUS_STARTER_SOCKET` set (so it offers its node desktop, bridged to 127.0.0.1:5900) + test-owned container `abtest534-desktop` (`autobyteus/autobyteus-server:beta`, its Xvnc; loopback only; port 5900 was free); an agent run "Desktop Helper" and a Team run "Desk Team" (lead, mate) with one message; scripted Antigravity | host phone as ENV-1 |
| ENV-4 | IR-002 | Android 15 emulator, own AVD `apie2e534_api35` (android-35 google_apis arm64, Pixel 6, 412 CSS px, DPR 2.625), headless, `emulator-5650`, WebView Chrome/124 | debug APK of this branch (`API-00-apk-build.log`; no Android change) | paired with ENV-3's node (link shared into the app) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 004, 005 | unit, guards, typecheck, probe | Reused: IMP-01, IMP-01b, IMP-02, IMP-03, IMP-04 (IR-001: MSP-60 three steps and saved-`small` start, MSP-74 40 screens); IMP-05, IMP-06, IMP-07 (IR-002: MSP-08, MSP-60, MSP-67 with Settings last) | — | Pass | (implementation handoff Checks Run) | — | IR-002 changes only the run menu, its specs and the probe, so IMP-01…04 hold for the Text size part |
| API-02 | AC-003, 004, 005 | whole web unit suite | `pnpm -C autobyteus-web test:nuxt --run` | ENV-2 | Pass | `API-02-web-unit-full.log` | `Test Files  767 passed (767)`, `Tests  5772 passed \| 2 skipped (5774)`, `HEAD before 6df3a5c12f, after 6df3a5c12f; worktree code changes during the run: 0` | the earlier run on a mixed state is discarded (progress log); the unrelated `applicationHostStore.spec.ts` load failure of IMP-01 did not recur |
| API-03 | — | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | ENV-2 | Pass | `API-03-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `[typecheck] PASS` | server untouched by both IRs |
| API-04 | AC-001…003 | — | (folded into API-01) | — | — | — | — | — |
| API-05 | AC-002 (SCN-002 by its real trigger) | upgrade from the released page | base `bd2053ee51` served: run list ⋮ → Small; `swap.sh head`; reload; run list; ⋮; a conversation (`screens.mjs small-upgrade`) | ENV-1 | Pass | `upgrade/API-05-small-upgrade.json`, `upgrade/API-05-1…4-*.png` | base after the tap: `"stored": "small", "root": 14.1176`; after the update: `"step": "standard", "root": 16, "runName": 15`, `"firstScreen": {"root": "16px", "step": "standard"}`; menu `"header": "Text size", "heading": false, "text": "Text size A A A"`, Standard `"pressed": "true"` and focused; conversation `"feed": 17`; storage `"keys": 4, "changed": []`, `textSize` `small` → `small`; `errorsAfterUpdate: []` | valid on IR-002: it never opens the run's ⋮ |
| API-06 | AC-001 (zh-CN) | the menu's labels | `screens.mjs menu-zh` at Standard 412 px and Largest 360 px | ENV-1 | Pass | `menu-zh/API-06-menu-zh.json`, `menu-zh/API-06-zh-*-menu.png` | `label 本机设置` (accessible name only), `header 文字大小`, `heading False`, text `'文字大小 A A A'`, buttons `标准 / 大 / 特大`, the saved step pressed; menu box `14.8…355.1` of 360; `visibleOnThisPhone False`; errors `[]` | valid on IR-002 |
| API-07 | AC-003 (REQ-004) | base vs head, every walked screen, Standard and Largest | `screens.mjs walk {base,head}-{standard,largest}` (bundles alternated); `compare.mjs same`; `DIFF_PREFIX=… pixeldiff.py` | ENV-1 | Pass | `walks/API-07-same-{standard,largest}.json`, `walks/API-07-pixels-{standard,largest}.json`, `walks/API-07-diff-*.png`, `walks/{base,head}-*.png` | Standard `matched 254`, Largest `matched 238`; the On-this-phone menu differs as intended (heading and Small gone, header "Text size", three wider buttons); the 23 Standard diffs are run names next to age labels `1m`/`2m` (base) vs `3m` (head) (`w 271.98→270.03`); pixels elsewhere: ages, a running run's pulsing dot (`animate-pulse`), setup icons loading at runtime, 4 anti-aliased pixels on the run screen's ⋮ | ran on IR-001; still valid on IR-002 except the run-menu screen, whose order is SR-002 (API-01, API-08, API-09) |
| API-08 | AC-005 (REQ-005; SCN-004) | the run's ⋮ on a node with a node desktop | `node-534.mjs` + `menu-order.mjs`: the agent run and the Team lead, ⋮ entries, then Settings and VNC Viewer opened from the menu; Standard 412 and Largest 360 | ENV-3 | Pass | `menu-order/API-08-menu-order.json`, `menu-order/API-08-*-menu.png`, `menu-order/API-08-node.log` | agent run `["Artifacts","Files","Activity","VNC Viewer","Settings"]`; Team lead `["Artifacts","Files","Messages","Activity","VNC Viewer","Settings"]`; both widths; `settingsOpened: true`, `vncOpened: true`; menu inside the screen (`9.9…350.1` of 360), `sideways: false`; errors `[]` | the founder's case (a Team member with VNC Viewer); the probe has no node desktop |
| API-09 | AC-001, 003, 005 | the Android app | `android.mjs pair`, `steps` (Standard, Large, Largest by real taps), `run-menu` (agent run and Team lead) | ENV-3, ENV-4 | Pass | `android/API-09-android.jsonl`, `android/API-09-{standard,large,largest}-{1-home-menu,2-home,3-conversation}.png`, `android/API-09-run-menu-{agent-run,team-lead}.png` | root `16 / 17.8824 / 19.7647`, run name `15 / 16.7647 / 18.5294`, feed `17 / 19 / 21`, menu open and the step pressed after each tap, `sideways: false`; run ⋮ at Largest: agent run `[… "Activity","VNC Viewer","Settings"]`, Team lead `["Artifacts","Files","Messages","Activity","VNC Viewer","Settings"]` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (three steps, header, no "On this phone"; zh-CN) | Yes | API-01 (unit, MSP-60), API-05 (menu), API-06 (zh-CN), API-09 (device) | Proven | — |
| AC-002 (saved Small → Standard) | Yes | API-01 (unit, MSP-60 start), API-05 (real upgrade from the released page) | Proven | — |
| AC-003 (every screen and desktop as in 525) | Yes | API-01 (MSP-74, desktop specs), API-02, API-07, API-09 | Proven | — |
| AC-004 (no Small in source, catalogs, tests, probe) | No | API-01 (catalog test, typecheck), API-02, my grep (investigation: only absence assertions and the saved-`small` scenario remain) | Proven for code; phone docs are delivery's docs sync (`autobyteus-web/docs/remote_access.md` l.22, l.24–26; `docs/content_rendering.md` l.212) | — |
| AC-005 (Settings last in the run's ⋮) | Yes | API-01 (unit four cases, MSP-60/67), API-02, API-08 (with VNC Viewer, live), API-09 (device) | Proven | — |
| The founder's own view | No | — | Only The User Can Check | his phone and taste before release |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | every AC directly, incl. the real upgrade path and the founder's menu case | phone docs pending (delivery) | — |
| Changed-boundary execution directness | 85% | 96% | production bundle; the real component on a node with a desktop; the device | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real nodes, pairing, the released page's own control writing `small` | scripted runtimes | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 94% | own AVD and branch APK; base bundle from `bd2053ee51`; test-owned container on loopback | host load; host phone through a proxy | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | saved `small` with every other key unchanged and no error; first screen; zh-CN | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 96% | browser at 412/360, Standard/Largest; Android WebView by real taps | — | — |
| Durable regression coverage quality and relevance | 90% | 94% | specs (three steps, saved `small`, four run-menu cases), MSP-60/67/74, full suite green | VNC Viewer + Settings order only in unit tests (the probe has no node desktop) | a node-desktop case in the phone probe |

- Overall post-repository confidence: 85%
- Overall final confidence: 95% (666 / 7 = 95.1)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (production phone bundle), `Other` (Android app on an emulator; a node with a node desktop)
- Gap addressed: the real upgrade from a released page that chose Small; zh-CN; every screen against the base; the run menu with VNC Viewer; the founder's device
- Browser validation needed: yes — the changed boundary is the phone page

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: `autobyteus.phone.textSize = small` written by the released page's own Small button
- Approved transition followed without an unnecessary migration: `Yes` (stored value left as is; no write at start)
- Cases: API-05 (and IMP-01/IMP-04)
- Version-specific runtime branch or fallback observed: `No` (the generic reader; no `small` branch in the code)
- Residual risk: None

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`
- Legacy retention observed: `No` (no `small` step, key or branch remains)
- Durable coverage only for compatibility: `No` (the saved-`small` tests prove REQ-003, an approved requirement)

## Durable Coverage Changed In The Codebase

- Added, updated, or removed by API/E2E: `No`
- Recommendation (not blocking): a phone-probe case with a node desktop would put the VNC Viewer + Settings order into durable rendered coverage.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Agent runtimes | scripted Antigravity (and the probe's Grok Build) | project rule for probes | none for this change |
| A phone on the LAN | host Chrome through a proxy with the emulator's origin; the Android emulator | no device for automated runs | none material |
| Node desktop | this worktree's server told it is a Docker node + the beta image's Xvnc | the probe has none | none for the menu |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| held probe stack `/tmp/abtest534/hold` | Yes | SIGINT to my own process (matched by its output folder) | `{'frontendExited': True, 'serversLeft': 0, 'rootRemoved': True}` |
| `dist/public` symlink during API-05…07 | Yes | link removed, bundle moved back | `dist/public` is the bundle directory again |
| base worktree `/tmp/abtest534/base` (`bd2053ee51`) | Yes | `git worktree remove --force`, `prune` | removed |
| node-534 (twice) | Yes | `/tmp/abtest534v/stop` | `node done; stopped 0; temp root removed: true` both times |
| container `abtest534-desktop` (twice, `--rm`, loopback 5900) | Yes | `docker stop` | removed; port 5900 free; other containers untouched |
| AVD `apie2e534_api35`, `emulator-5650`, adb forward | Yes | `adb forward --remove-all`, `adb emu kill`, `avdmanager delete avd` | deleted |
| `/tmp/abtest534`, `/tmp/abtest534v` (pairing links, phone storage) | Yes | deleted | gone; never in evidence |
| Evidence secret scan | Yes | grep `own_`/`mra_`/`mhub_` 20+, `pairing=`, `access_token=` with a value | no match |

## Latest Authoritative Result

- Result: `Pass` (IR-001 + IR-002, SR-001 + SR-002)
- Criteria not proven, or parts only the user can check: the founder's own view before release
- Next recipient from `get_handoff_rules`: `/delivery_engineer`
- Notes: docs sync for delivery: `autobyteus-web/docs/remote_access.md` l.22, l.24–26 (Small, "On this phone" heading, Settings "right after Activity" → last), `docs/content_rendering.md` l.212. Concurrent edits in the worktree during a validation run spoiled one suite run; delivery may want the branch quiet while it verifies.
