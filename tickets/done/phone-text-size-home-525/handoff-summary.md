# Handoff Summary

## Summary Meta

- Ticket: `phone-text-size-home-525` (Project Task `autobyteus-525`; requested by `/project_task_manager` for the founder)
- Date: `2026-11-18`
- Classification: `task_size: Medium`, `architectural_risk: Low`; route: direct (no architecture review; code review of the VNC Viewer failure-origin only, CRR-001; API/E2E `API-REV-001` Fail, `API-REV-002` Pass, `API-REV-003` Pass on the merged base, final confidence 95%; test-code review Not Required, no durable test code changed by API/E2E).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/phone-text-size-home-525`, base `origin/personal` @ `ff13782f36` at bootstrap. Integrated twice: `3f19d41aa7` (53 commits, autobyteus-522 and autobyteus-448 part 2; six conflicts resolved by implementation, merge `65d67674a9`, IR-003) and `93f3b9cde8` (22 commits, autobyteus-493, server and docs only; clean merge `537fba6d9e`). Product code of this ticket is final at `12ecf1bf29` (IR-002) plus the merge resolutions.

## Delivery Summary

- Delivered scope:
  - **One phone-wide Text size on the run list.** The run list's top bar has a ⋮ at its right end that opens **On this phone** with the **Text size** group (Small 15, Standard 17, Large 19, Largest 21 px). A step applies at once to every phone screen, with the menu open; the run's ⋮ no longer has Text size. Same stored key (`autobyteus.phone.textSize`), same four values, default Standard: a step chosen in the earlier build is kept (AC-004), and the first screen after a restart is already at the step.
  - **Scaling.** On the phone page the app font owner `appFontSizeStore` takes the phone step as its source (plugin `06.appFontSize.client.ts`, `isMobileRemoteAccessRuntime()`): root font size 16 px × step/17, so every rem-based screen follows; the conversation is `1.0625rem` (15/17/19/21 px); Monaco's size follows (14 px × step/17, rounded); fixed-px 11 px chips follow through `assets/css/phone-text-size.css` (phone only); run rows' geometry is in rem; run names and subtitles keep one line with an ellipsis (DEC-004). The desktop path (Settings → Display → App font size) is unchanged and never reads the phone step.
  - **VNC Viewer (DEC-008, found by API/E2E round 1).** In Control mode Keyboard and Clipboard moved from the top bar to the right end of the status row, so the bar fits at every step on 360 px (also at Standard, which fixed FU-002).
  - Removed: `usePhoneTextSize.ts`, its spec, the monitor's `--pc-size`/`data-text-size`, the `mobile.settings.textSize*` keys. Added: `MobileOnThisPhoneMenu.vue`, `phoneTextSizeSteps.ts`, `phone-text-size.css`, the `mobile.onThisPhone.*` catalogs (en, zh-CN).
- Docs synced (`docs-sync-report.md`): `autobyteus-web/docs/remote_access.md` (run list ⋮, Text size rewritten, conversation sizes, VNC Viewer Control layout) and `autobyteus-web/docs/content_rendering.md` (the viewer's font source on the phone). `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `GLOSSARY.md` need no change.
- Durable coverage: web unit tests (store both sources, steps, DOM writer, the new menu, the run menu without Text size, run rows, monitor, catalogs, `MobileNodeDesktop.spec.ts` pins the two rows' order) and the phone probe: MSP-60 (home control, each step, reload), MSP-66 (reads the root step), MSP-74 (every phone screen at Largest at 360 and 412 px, 40 screens; it was MSP-67 until the merge with autobyteus-522).

## Verification Summary

- Verified from evidence by delivery; every critical acceptance criterion (AC-001…007) is directly proven, and so is AC-008 (not critical). The only part no one but the founder can check is his own view of the result on his phone; it gates the release, not the merge (his word: "release only on my word").
- Final confidence 95% (target 95% met); no category below 90%.
- Key evidence (files opened and what they showed, in `release-deployment-report.md`):
  - AC-001/003/004, Android app, real taps, own AVD, WebView 124: root 16 / 14.12 / 17.88 / 19.76 px, conversation 15/17/19/21 px, the menu open and the step marked after each tap, restart at Largest with the first screen already at Largest (`evidence/api-e2e/r3-android/`).
  - AC-004, a step stored by the base build: kept after the bundle update (`r3-upgrade/API-06-upgrade.json`).
  - AC-006, Standard against the new base on the same node and data: 218 of 219 text elements equal (the one is an age label re-matched as ages advanced); pixels differ only at the new ⋮, the age labels, a pulsing status dot and the removed Text size block in the run menu (`r3-walks/API-05-*`).
  - AC-005, every text on 15 screens ×21/17 (241 elements, 0 diffs), the 11 px chip 11 → 13.59 px; 40 screens clean at Largest in the probe, including 522's remote-run Settings and 448's background-task row; the real VNC Viewer on a live node desktop: 16 of 16 layouts fit at 360/412 px × four steps × View only/Control, Keyboard and Clipboard work, also on the Android app at Largest (`r3-walks/API-07-scale.json`, `r3-vnc-live/`).
  - AC-007, the desktop page: 16 / 18 / 20 px for Default / Large / Extra large; a stale phone step is ignored; no phone control (`r3-desktop/API-09-desktop.json`).
- Integrated-state check (`release-deployment-report.md`): the base's newest 22 commits touch only `autobyteus-server-ts` (`src`, `tests`, `docs`), `GLOSSARY.md` and archived tickets: no web, `autobyteus-ts` or contract change, no build input. Both typechecks at their baselines (server `1012 in 316 files`, web `87 in 37 files`, 0 production errors), and the phone probe on a rebuilt server and phone bundle of the merged state.

## Residual Risks For The User

- The founder's view of the result on his phone (DEC-001 the control's place, DEC-004 the one-line ellipsis, DEC-008 the VNC Viewer's bar) is not done. His decisions can be revisited on his word. A release waits for it.
- At Largest on a 360 px phone the VNC Viewer's status text in Control mode reads "Conne…" (the connection state is still shown by the dot); this is DEC-008's trade.
- The 22 px conversation avatar and 12 px margins are fixed px and do not scale (design: unless a problem is seen); at Largest the avatar looks a little small next to 21 px text, and nothing overlaps.
- Not tested: a physical phone (an Android 15 emulator with WebView 124 and Chrome emulation stood in), the iOS shell, other WebView versions.
- The VNC Viewer's rendered layout is not in durable automation (the probe has no node desktop; API/E2E's recommendation, not blocking).

## Follow-ups

- FU-001 (desktop fixed-px text) is in `follow-ups.md` (the Solution Designer sends it). FU-002 is resolved by DEC-008. Recommendation, not a follow-up record: a VNC Viewer case in the phone probe once it can start a node desktop.

## Release

- No release: RELEASE.md's default (the user did not ask for one) and the founder's word, "release only on his word", which has not been given: he first sees the result on a phone-size page. A release is available: `release-notes.md` (no `## What you need to do` section: no user action) holds the user-facing notes for the next beta or stable release. A beta (`vX.Y.Z-beta.N`) is what the Task named; delivery has not made it.
