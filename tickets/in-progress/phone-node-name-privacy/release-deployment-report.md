# Delivery / Release / Deployment Report — phone-node-name-privacy (autobyteus-433)

## Release / Publication / Deployment Scope

- Ticket: `phone-node-name-privacy` (Project Task `autobyteus-433`)
- Classification (unchanged): `task_size = Medium`, `architectural_risk = Low`, route `Direct Low-Risk` (architecture review, source code review and test-code review `N/A — not applicable`; the code reviewer did two failure-origin reviews, CRR-001 and CRR-002)
- Validated candidate: code `60adcf3bc8` (IR-004, SR-005), API/E2E round 3 `Pass` (API-REV-003, `7b91b2165a`), 95%
- **Current state: `Blocked` at the first delivery step (latest-base integration refresh): `Design Impact`, routed to the Solution Designer.** Nothing was finalized, pushed, merged or released.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the ticket worktree's `HEAD` (`0eaca5f23a`; unchanged from base `eebbc2b8ee`), which matches `origin/personal` `b690a5dfdb`
- Deviations from the guide and why: `None` (finalization not reached)
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: not written yet. It is written only after the branch matches the integrated latest base, which it does not yet.
- Handoff summary status: `Blocked`
- Delivery revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `eebbc2b8eed0e83cd3627298d8a7abec19c7d02f`
- Latest tracked remote base reference checked: `origin/personal` `b690a5dfdb11ff94a325829782757710fa31de39` (fetched 2026-11-08)
- Base advanced since bootstrap: `Yes`, 24 commits, among them autobyteus-432 (phone VNC Viewer desktop full screen, merge `b427d2644d`) and autobyteus-426 round 2
- New base commits integrated into the ticket branch: `No` (merge aborted)
- Local checkpoint commit result: `Completed`, `0eaca5f23a`. It commits the code reviewer's failure-origin records `code-review-report.md` and `code-review-revision-record.md`, which were untracked in the ticket folder.
- Integration method: `Merge` (`git merge --no-ff --no-commit origin/personal`), then `git merge --abort`
- Integration result: `Blocked`. Five files conflict:

| File | Conflict | Kind |
| --- | --- | --- |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | 4 hunks: `openPage` (433 `currentWebHost?.destroy()` + `pageState.open` + `setContentView(…shownName)` against 432 `destroyWebHost()` + `firstPageShown` + `showScreen(…displayName)`); the web host's callbacks (432 adds `onPageStarted = { desktopFullScreen.reset() }` and `onPageFinished` → `showPage()`; 433 removed both callbacks); `showPage` (433 renders `diagnostic = pageState.overlay`; 432 renders `diagnostic = null` and calls `desktopFullScreen.pageShown()`); `showWebDiagnostic` (433 `pageState.onDiagnostic` + `showPage()`; 432 `leaveCurrentScreen(Screen.Web)` + `showScreen(…diagnostic…)`, which resets full screen) | **Semantic: needs a design decision** (below) |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/ShellBridge.kt` | KDoc only: each side describes its own message (`pageReady` / `desktopFullScreen`) | Mechanical (union) |
| `autobyteus-web/utils/remoteAccess/shellBridge.ts` | Header comment only, as above | Mechanical (union) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Phone route handler: 433's baseline fix (a request cut off by a closed context is not answered as refused, `f7bb05f5ec`) against 432/426's added `runIds` field on `phoneNet` | Mechanical (keep both) |
| `docs/design-cases.md` | Both tickets added a "Case 18" | Mechanical (renumber 433's to Case 19) |

- Post-integration executable checks rerun: `No` (no integrated state exists)
- Post-integration verification result: `Blocked`
- Delivery edits started only after integrated state was current: `Yes`. Docs sync, the handoff summary and the release notes were not started.
- Handoff state current with latest tracked remote base: `No`
- Blocker: the `MainActivity.kt` conflict. The two authoritative designs disagree about the same mechanism:
  - autobyteus-432's design spec, **D-2 Reset rule** (AR-432-002; `tickets/done/phone-viewer-landscape-fullscreen/design-spec.md` on `origin/personal`, line 64). Desktop full screen is reset on **every main-frame page start (`onPageStarted`)**, on every screen other than the plain open page, which includes **the page with a diagnostic**, and whenever the web host is destroyed. `showPage()` is the one path that keeps full screen (`desktopFullScreen.pageShown()`).
  - This ticket's design spec, **DS-006 / DEC-010** (SR-005; `design-spec.md` line 172, "Removed"). It removes `AutoByteusWebView`'s `onPageStarted`/`onPageFinished` callbacks ("`onPageStarted` had no production use"). It also renders every in-page overlay through `showPage()` with `pageState.overlay`, so a return from Switch node keeps the overlay.
  - A mechanical merge either revives a callback SR-005 removed, or drops 432's reset on page start. Taking 433's `showPage` with 432's `pageShown()` would keep landscape and hidden bars under a "Can't reach" overlay, which breaks 432's D-2. Taking 432's `showWebDiagnostic` would bypass `pageState` and break this ticket's AC-007 (the overlay must survive Switch node and come back).
  - Open decisions for the merged design:
    - (1) Where desktop full screen resets on a new main-frame document now that the WebView load callbacks are gone. Candidates: a WebView `onPageStarted` kept only for the reset, `pageReady`, or a main-frame error.
    - (2) Whether `showPage()` with an overlay counts as "the plain page" for D-2. It should not, so it must reset and not call `pageShown()`.
    - (3) What a `desktopFullScreen(on)` bridge message does while an overlay is up and the WebView is `INVISIBLE`.
  - It also needs the matching tests: 432's `DesktopFullScreenControllerTest` and `DesktopFullScreenWindowTest`, plus 433's `OpenPageStateTest` and the instrumented smoke test.

## Verification

Judged on the pre-integration candidate (`60adcf3bc8` / `9446d19783` / `7b91b2165a`). It must be re-judged on the integrated state after the reconciliation and API/E2E's rerun.

- Evidence judged: `Sufficient` for the candidate (re-judgement required after re-integration)
- Evidence relied on: the execution report's Acceptance-Criteria Proof (round 3) and the Cases rows marked (r3), API-12 and API-13; final confidence 95% (target 95%, no category below 90%)

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-04 (r3) `emulator-r3/API-04-07-page-reloaded-no-session-name.json` | `"headerName": "Test Desktop"`, `"sessionNodeName": "(absent)"`, `hello` reply `"nodeName": "Test Desktop"` | Proven. The HTTPS `*.ts.net` session on the user's own phone and node is a `User Check` (below) |
| AC-002 | API-04 (r3) `API-04-08-sheet-connected.{json,png}` | `sheetText` "Test Desktop / Connected / Switch node / 1 node on this phone / Unpair from Test Desktop", `"sheetAddressLine": false`; the screenshot shows the sheet without an address | Proven |
| AC-004, AC-009, QR-001 | My own scan of all 53 round-3 `.txt`/`.xml` dumps for `hostbox`, `nodebox`, `example-tailnet`, `home.arpa`, `ts.net`, `4733[1-3]`, `://`, `webpage`, `ERR_` | Only one match: `API-05-02-typed.xml`, the Type an address sheet showing what the user typed. REQ-004/BEH-005 keep that on purpose. | Proven |
| AC-007 | API-08 (r3) `API-08-03-reload-while-down.png`, `API-08-05-back-while-down.txt`; API-11 (r3) `API-11-05-reload-loaded-page-drop.txt`; API-13 | The screenshot shows only the opaque "Can’t reach Test Desktop" overlay with the Tailscale/Wi-Fi advice and Retry/Edit/Browser, and nothing behind it. Each dump holds only the overlay's texts, including the failure over a loaded page (round 2's failure) and on Android 14 / WebView 113 | Proven |
| AC-010 | API-02 (r3) `API-02-r3-mobile-shell-full.log` | `mobile-shell probe: Pass`, `unexpected browser errors: []` | Proven |

- More evidence requested: `None`. Minor note, no action needed: the report's Look For column cites a "`no address parts`" result line, but the dump files don't record that line. I repeated the scan on the files myself (row above).
- User check needed: `Yes`, for the user-only part of AC-001. API/E2E showed it can't build an HTTPS session at a real `*.ts.net` name: the node refuses `http://…ts.net` pairing, and API 34+ can't be made to trust a test CA. The user can check it only after **both** the app and the node serve this change, so in practice after a release, which the user decides (`solution-handoff.md`: "Release only on the user's word"). The Solution Designer should settle with the user how and when to check it before delivery resumes.
- Re-verification after later re-integration: required (reconciled `MainActivity`, both features' tests, an emulator rerun of the AC-007 cases and of 432's full-screen reset)

## Release Decision

- Decision: `No release` so far. The user's word decides; `RELEASE.md` defaults to no release.
- Decided by: `solution-handoff.md` Constraints, "Release only on the user's word"; `RELEASE.md` Release Decision default
- Note for when a release is chosen: RISK-001 / DESIGN.md rule 9. The app and the node's `/mobile` bundle must be updated together. A node that still serves the older bundle leaves the updated app on "Connecting to …" (API-12). The release notes must say this under `## What you need to do`.

## Docs Sync Result

- Docs sync artifact: not written (blocked before docs sync)
- Planned scope, once integrated: `autobyteus-android/README.md`, `docs/android_mobile_access.md` and `autobyteus-web/docs/remote_access.md` (the `hello` reply's `nodeName`, the `pageReady` message, the sheet without an address, "AutoByteus node"). autobyteus-432 changed `autobyteus-android/README.md` and the same docs, so the sync has to merge with them.

## Ticket State Transition

- Ticket moved to `tickets/done/phone-node-name-privacy`: `No`

## Version / Tag / Release Commit

- Not reached.

## Repository Finalization

- Bootstrap context source: `solution-handoff.md` (Workspace)
- Ticket branch: `codex/phone-node-name-privacy` at `0eaca5f23a` (local; checkpoint), not pushed
- Finalization target: `origin` / `personal`
- Repository finalization status: `Blocked`
- Blocker: integration refresh (above)

## Release / Publication / Deployment

- Applicable: `No` (not reached; no release asked for)
- Release/publication/deployment result: `Not required`

## Post-Finalization Cleanup

- Dedicated ticket worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy`. Kept; cleanup is not applicable while delivery is blocked.
- Untracked build output `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` left uncommitted (`RELEASE.md`: never commit build output)

## Escalation / Reroute

- Classification: `Design Impact`
- Recommended recipient: Solution Designer
- Why final handoff could not complete: integrating the latest base would revive or drop behavior that one of two approved designs requires. 433's DS-006/DEC-010 removed the WebView load callbacks and routes overlays through `showPage()`. autobyteus-432's D-2 resets desktop full screen on `onPageStarted` and on the page-with-diagnostic screen, and keeps it only on the plain page. The merged design must decide (1)–(3) above, and the implementation must follow it. The other four conflicts are mechanical and the implementation engineer can resolve them in the same merge. After that, API/E2E reruns on the integrated state, then delivery resumes.

## Release Notes Summary

- Release notes status: not started (blocked). When written, they need a user action: update the Android app and every node together.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (API/E2E Persisted-Data Transition Checks)
- Delivery action required: `None`

## Rollback Criteria

- Not reached. No migration, so a revert of the merge on `personal` would roll it back (`RELEASE.md` Rollback).

## Final Status

- Verification complete: `No`. The candidate's evidence is sufficient, but the integrated state is not verified, and the AC-001 user check is open.
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `Not required`
- Applicable safe cleanup complete or not required: `No` (not reached)
- Unresolved blocker: integration `Design Impact` (MainActivity, autobyteus-432 D-2 against 433 DS-006/DEC-010)
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No`. A `Blocked` handoff was sent instead.
