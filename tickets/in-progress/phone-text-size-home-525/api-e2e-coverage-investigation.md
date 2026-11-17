# API/E2E Coverage Investigation — phone-text-size-home-525 (autobyteus-525)

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/requirements-doc.md` (SR-001)
- Investigation Notes: `…/phone-text-size-home-525/investigation-notes.md`
- Solution Revision Record: `…/phone-text-size-home-525/solution-revision-record.md`
- Design Spec (required on every route): `…/phone-text-size-home-525/design-spec.md` (`Medium` / `Low`)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `…/phone-text-size-home-525/implementation-handoff.md` (IR-001, code `7c7f3d2e79`, evidence `66691f49d6`)
- Implementation Revision Record: `…/phone-text-size-home-525/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `…/phone-text-size-home-525/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 on the direct low-risk route
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

One phone-wide Text size (Small/Standard/Large/Largest = 15/17/19/21 px) chosen from a ⋮ "On this phone" menu on the run list header (REQ-001/002), gone from the run's ⋮ (REQ-003), kept under `autobyteus.phone.textSize` with the same values (REQ-004). On the phone page `appFontSizeStore` takes the step as its source (plugin 06 chooses once): root font size = 16 × step/17 px, Monaco 14 × step/17 rounded; the conversation is `1.0625rem` (exact 15/17/19/21 px) (REQ-005, DEC-003); fixed px follow on the phone only: run-row rails in rem, `html[data-phone-text-size] .text-[11px]` (REQ-006, DEC-005/006); Largest clean at 360 and 412 px (REQ-007); desktop unchanged (REQ-008); en/zh-CN keys (REQ-009). Standard renders as today (AC-006); QR-001 no size jump after start; QR-002 ≥ 44 px targets.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (choose the size on the home screen), SCN-002 (every phone screen at the chosen size), SCN-003 (desktop unchanged).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 Upgrade from beta.9: a phone that chose a step in the run's ⋮ on the old phone page (base bundle) opens the new page at that step everywhere (AC-004's carry-over). Trigger: the node's `/mobile` bundle is updated, the phone reloads.
  - SCN-A2 The real Android app: the founder uses the Android WebView shell, not Chrome; the step is chosen by real taps and kept over an app restart (force-stop + launch), applied from the first screen (QR-001).
  - SCN-A3 Text that does not follow the step on a phone screen (any fixed-px text that the implementation's fit check does not see, since it checks overflow, not size).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 control on the home screen, gone from run ⋮; same key | Changed | REQ-001…004, DEC-001/002 | unit specs + MSP-60 (reused) + Android taps (API-08) + upgrade carry-over (API-06) |
| BEH-002 every phone screen scales; conversation exact px; fixed px follow | Changed | REQ-005…007 | MSP-60/67 (reused) + scaling sweep (API-07) + Android at four steps (API-08) |
| BEH-003 phone code text follows | Changed | REQ-006, DEC-006 | MSP-67 Monaco 17 px (reused); API-07 four steps |
| BEH-004 desktop unchanged | Preserved | REQ-008 | desktop unit specs (reused IMP-01) + full web unit suite (API-02) + desktop page check (API-09) |
| AC-006 Standard as today | Preserved | AC-006 ("probe measurement + screenshot comparison with the base") | A/B of base and head bundles on the same node and data (API-05) |
| `usePhoneTextSize`, run-menu block, `mobile.settings.textSize*`, `--pc-size` | Removed | Legacy Removal Policy | grep (done: only absence assertions remain); full unit suite for stale tests (API-02) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | store sources, plugin 06, new menu, run menu, run row, monitor, catalogs | IMP-01 (191 files) | specs outside those folders that the change made untrue | full `test:nuxt` (API-02) |
| Browser integration / user journey | Yes | phone page rendering at four steps | IMP-02 (MSP-60/66/67 on the production phone bundle) | Standard vs base not compared; unscaled fixed-px text not detected by the fit check; `text-[11px]` chips not rendered | API-05, API-07 on the phone bundle |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (preserved) | plugin 06 desktop branch | desktop specs in IMP-01 | real desktop page root/attributes | API-09 desktop page |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | page start applies the stored step before mount (QR-001); Android app restart | MSP-60 reload first-screen root | Android WebView restart | API-08 |
| Persisted-data transition | Yes | same key/values, new reader | `phoneTextSizeSteps.spec.ts`, MSP-60 reload | a value written by the beta.9 page | API-06 |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Android System WebView renders fractional root sizes | none | fractional root in WebView 124 | API-08 |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525`, branch `codex/phone-text-size-home-525`
- Project type and runtime stack: pnpm monorepo; Nuxt 3 web app (`autobyteus-web`, phone page `/mobile` = production phone bundle `dist/public`), Node server (`autobyteus-server-ts/dist/app.js`), Android WebView shell (`autobyteus-android`)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/TESTING.md` (no closer `TESTING*.md`)
- Conflicting, missing, or unclear project instructions: None. `autobyteus-web/docs/remote_access.md:26` still names `usePhoneTextSize` and the run-menu location (docs, not a test: for delivery's docs sync).
- Changed build-input paths: `None` (`git diff --name-only ff13782f36...HEAD`: web sources, tests, catalogs, CSS and ticket docs only); no fresh-start build case.
- Required environment variables or secrets available: `N/A` (scripted runtimes; no provider key)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers | layers and commands | `pnpm -C autobyteus-web test:nuxt`; guards; both typechecks; phone behavior proven on the phone bundle with `test:e2e:mobile-shell` |
| `TESTING.md` § Choosing the path | both typechecks for any TS change | `pnpm -C autobyteus-web typecheck` (reused IMP-04), `pnpm -C autobyteus-server-ts typecheck` (API-03) |
| `TESTING.md` § Android emulators | device checks | own AVD from an installed image, own `-port`, `-no-window`, address only that serial, delete afterwards; no `uiautomator dump` in landscape |
| `TESTING.md` § Browser probes; `mobile-shell-probe.mjs` header | probe stack | prerequisites server build + `build:mobile-web`; `--hold` keeps the stack and writes a pairing link for `http://10.0.2.2:<alpha port>` to `hold.json` |
| `autobyteus-android/README.md` § Build, Install | APK | `./gradlew :app:assembleDebug`; `adb install -r`; the app loads `/mobile` from the node |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | how the node serves `/mobile` | reads `autobyteus-web/dist/public` on each request, so a bundle swap on a held stack serves the other bundle with the same node and data |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Probe stack (alpha, beta nodes, runs) held | `autobyteus-web` | `node tests/e2e/mobile-shell-probe.mjs --hold --output-dir=<fresh>` | probe-owned temp root, free ports | `hold.json` written | SIGINT; cleanup receipt `serversLeft: 0, rootRemoved: true` |
| Base phone bundle | `/tmp/abtest525/base` (git worktree at `ff13782f36`) | `pnpm install --frozen-lockfile`, `nuxt prepare`, `build:mobile-web` | separate checkout | `dist/public/index.html` | `git worktree remove --force` |
| Host Chrome as a phone | ticket-owned harness `evidence/API-scripts/` | Playwright, proxy for `10.0.2.2:<port>` → `127.0.0.1:<port>` (so Host/Origin are the emulator's) | 412×915 DPR 2, isMobile | page shows the run list | browser closed, proxy closed |
| Android emulator | — | own AVD `apie2e525_api35` (android-35 google_apis arm64, Pixel 6), `-no-window -port 5650` | WebView DevTools forwarded to tcp:9525 | `sys.boot_completed` | `adb emu kill`, `avdmanager delete avd` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Runs with conversations, Team, files, Activity | the probe's `setUp` (scripted AGY/Grok) | probe-owned temp root, never `~/.autobyteus` | removed by the probe |
| Phone pairing | `hold.json` emulator link (single use) shared to the app (`ACTION_SEND`); the host Chrome phone gets the same phone's stored pairing copied from the WebView (layout checks only; never printed) | link and credential never written to evidence | gone with the node's temp root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: the base (beta.9-equivalent) phone page stores Largest through its run ⋮ Text size; the head page then opens at Largest on every screen.
- Evidence planned: API-06 (A → B on the same origin and node).
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `display/fontSize/__tests__/phoneTextSizeSteps.spec.ts` (new) | steps, metrics, storage read/write | REQ-004/005, AC-004 | Still Valid | IMP-01 | reuse |
| `stores/__tests__/appFontSizeStore.phoneTextSize.spec.ts` (new) | phone source; throws before init | DS-001/002 | Still Valid | IMP-01 | reuse |
| `stores/__tests__/appFontSizeStore.spec.ts`, `DisplaySettingsManager.spec.ts`, `MonacoEditor.spec.ts`, `Terminal.spec.ts` | desktop path | AC-007 | Still Valid (unchanged) | IMP-01 | reuse |
| `MobileOnThisPhoneMenu.spec.ts` (new), `MobileRunMenu.spec.ts` (new), `MobileRunList.spec.ts` (updated) | menu, run menu without Text size, rem rails | AC-001/002/005, QR-002 | Still Valid | IMP-01 | reuse |
| `MobileRunMenu.textSize.spec.ts` (removed) | Text size in the run ⋮ | obsolete by REQ-003 | Stale / Remove (done by implementation) | design Removal plan; replaced by `MobileOnThisPhoneMenu.spec.ts`, `MobileRunMenu.spec.ts` | none |
| `AgentEventMonitor.phoneConversation.spec.ts`, `mobileSettingsCatalog.spec.ts` (updated) | no step wiring; keys moved | REQ-009 | Still Valid | IMP-01 | reuse |
| `tests/e2e/mobile-run-settings-cases.mjs` MSP-60 (rewritten), MSP-66, MSP-67 (new) | home control, four steps, reload, Largest sweep | AC-001…005, QR-001 | Still Valid | IMP-02 | reuse; MSP-61…65 untouched |
| other web specs outside the 191 files | — | — | Unclear until run | — | API-02 full suite |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 004, 007, 008; QR-002 | unit/component | Reused | IMP-01, IMP-03, IMP-04 | ran on `7c7f3d2e79`; `git diff --name-only 7c7f3d2e79 HEAD` touches only the ticket folder |
| API-02 | AC-007; stale tests | whole web unit suite | Existing Test | `pnpm -C autobyteus-web test:nuxt --run` | IMP-01 ran 191 related files only; finds tests the change made untrue elsewhere |
| API-03 | — (TESTING both typechecks) | server typecheck | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | TESTING.md requires both typechecks for a TS change |
| API-04 | AC-001…006, QR-001, REQ-006/007 | production phone bundle | Reused | IMP-02 (MSP-66, MSP-60, MSP-67) | same commit and bundle (`dist/public` built 22:21 after `7c7f3d2e79`, holds `mobile-on-this-phone`) |
| API-05 | AC-006 | phone bundle, base vs head, same node and data | Temporary Probe | held probe stack; host Chrome phone at 412 px, Standard; for each screen: computed font sizes and boxes of every visible text element and a screenshot, on the base bundle and then the head bundle; compare | a pixel/geometry A/B against another build does not belong in the durable probe (it needs a second checkout and build) |
| API-06 | AC-004 (beta.9 carry-over) | persisted step across the bundle update | Temporary Probe | base bundle: run ⋮ → Text size → Largest; swap to head bundle; reload; root 19.76 px, conversation 21 px, home menu marks Largest | needs the old bundle; one-time upgrade path |
| API-07 | REQ-005, REQ-006 (SCN-A3) | phone bundle, head | Temporary Probe | same screens at Standard and Largest; every visible text element's font-size ratio must be 21/17 (exceptions: the four preview letters, Monaco by its own rounding, svg); a rendered `text-[11px]` chip measured | the fit check of MSP-67 does not see text that stays small; decides whether a durable assertion is worth adding |
| API-08 | AC-001, 003, 004, 005; QR-001 | the Android app (WebView) | Journey | own AVD; debug APK; pair with the held stack's emulator link; real taps: ⋮ → each of the four steps; measure root, run name, conversation; screenshots of home and conversation per step; force-stop + launch at Largest: first-screen root | the founder's device; WebView fractional root |
| API-09 | AC-007 | desktop page | Temporary Probe | `pnpm dev` of the worktree (the held stack has no desktop frontend), desktop page `/` in host Chrome: no `data-phone-text-size`, no On this phone, root 16 px; a stale phone step ignored; Display Large → 112.5 %, Extra large → 125 % | real desktop page start path (plugin 06 desktop branch) |
| API-10 | REQ-005 (VNC Viewer controls), REQ-007, AC-005 | production phone bundle CSS | Temporary Probe | added during execution: the VNC Viewer bar (exact markup of `MobileScreenBar.vue` + `MobileNodeDesktop.vue` actions, View only and Control) inserted in the real phone page served from `dist/public`, at Standard/Large/Largest × 360/412 px; full-screen button inside the screen, header not wider than the screen, title readable | no node desktop in the probe stacks; reading the bar's classes showed all actions are `flex-shrink-0` (Control mode about 436 px at Largest), so it had to be measured; a durable probe case needs a node desktop (Docker beta image, as autobyteus-432 did) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None planned at the start; API-07 decides whether a scaling assertion joins MSP-67.

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None (the implementation removed `MobileRunMenu.textSize.spec.ts`; recorded above with its replacement).

## Live Environment And Fixture Plan

- Startup order: server build and phone bundle current (checked); base bundle built in `/tmp/abtest525/base`; probe `--hold`; AVD boot; APK install; pairing link shared to the app; host Chrome phone through the proxy with the copied pairing.
- Environment choices: viewport 412×915 DPR 2 (Pixel 6 width, same as the emulator); en-US; UTC.
- Readiness: `hold.json`; `adb shell getprop sys.boot_completed` = 1; WebView DevTools socket.
- Evidence: JSON measurements per screen and step, screenshots (host and `adb exec-out screencap`), transcript of each Android step.
- Owned processes and temporary state: the held probe (SIGINT), proxy, Chrome, AVD, base worktree, `/tmp/abtest525`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| VNC Viewer controls and clipboard at Largest on a live node desktop | the probe's nodes have no node desktop (needs the Docker beta image with a desktop, as autobyteus-432) | The bar was measured with the real CSS and markup instead (API-10: Fail in Control mode); the clipboard sheet's classes are rem and full width | No | after the fix: rerun API-10, and the live check on a Docker node desktop if the fix changes the bar's structure |
| The founder's own phone and taste (DEC-001/DEC-004) | his device and judgement | Low | Yes | delivery takes it to the founder (release only on his word) |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md:26` still says Text size uses `usePhoneTextSize` | docs sync (not a validation failure) | grep | delivery engineer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`. After API-07: every text on 14 screens scaled exactly; a durable Standard-vs-Largest scaling assertion would double MSP-67's run (two full sweeps) for a check that found nothing; kept as the ticket's temporary probe (scripts in `evidence/api-e2e/scripts/`). API-10 belongs in MSP-67 once a node desktop is available to the probe (recommendation for the fix round).
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: —
