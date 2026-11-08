# Delivery / Release / Deployment Report — phone-node-name-privacy (autobyteus-433)

## Release / Publication / Deployment Scope

- Ticket: `phone-node-name-privacy` (Project Task `autobyteus-433`)
- Classification (unchanged): `task_size = Medium`, `architectural_risk = Low`, route `Direct Low-Risk`
  - Architecture review, source code review and test-code review: `N/A — not applicable`.
  - Failure-origin reviews CRR-001 and CRR-002 by the code reviewer.
- Current delivery revision: **DR-002**, which supersedes DR-001's `Blocked`. It covers verification on the integrated state, docs sync, archive and finalization into `personal`. **No release.**
- DR-001 (kept for the record): the first base refresh found a semantic `MainActivity.kt` conflict between autobyteus-432 D-2 and this ticket's DS-006/DEC-010 and routed it to the Solution Designer as `Design Impact`. SR-006 / DEC-011 resolved it, implementation merged it (IR-005, `e8516bce5c`), and API/E2E round 4 validated the merge.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `b690a5dfdb` (identical in the ticket branch)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/phone-node-name-privacy/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/phone-node-name-privacy/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `eebbc2b8ee`
- Latest tracked remote base reference checked: `origin/personal` `b690a5dfdb` (fetched at the start of DR-002, 2026-11-08)
- Base advanced since bootstrap or previous refresh: `Yes` since bootstrap (24 commits); `No` since the IR-005 merge
- New base commits integrated into the ticket branch: `Yes`, by IR-005's merge `e8516bce5c` (parents `9b617b0d52`, `b690a5dfdb`), after DR-001's block and SR-006
- Local checkpoint commit result: `Completed` (DR-001, `0eaca5f23a`)
- Integration method: `Merge`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. API/E2E round 4 on the merge:
  - IMP-17 (web, 189 tests) and IMP-18 (93 JVM, 12 instrumented);
  - the server build and typecheck at baseline;
  - the full probe, 20/20;
  - the emulator cases API-04/05/06/08/08b/09/10/11 and API-14 (autobyteus-432 full screen on a Docker node).
- Post-integration verification result: `Passed`
- No-rerun rationale: DR-002 itself integrated no new commits (`origin/personal` was still `b690a5dfdb`), so round 4 is the rerun on the current state
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: execution report round 4 (Acceptance-Criteria Proof, Cases marked (r4) and API-14). Final confidence 95%, target met, no category below 90%. All on the merged APK and `/mobile` bundle.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-04 (r4) `emulator-r4/API-04-07-page-reloaded-no-session-name.json` | `"headerName": "Test Desktop"`, `"sessionNodeName": "(absent)"`, `"nodeName": "Test Desktop"` | Proven. `User Check` for the HTTPS `*.ts.net` part, after a release (below) |
| AC-002 | API-04 (r4) `API-04-08-sheet-connected.json` | `sheetText` "Test Desktop / Connected / Switch node / 1 node on this phone / Unpair from Test Desktop" | Proven |
| AC-004, AC-009, QR-001 | My own scan of all 39 round-4 `.txt`/`.xml` dumps for `hostbox`, `nodebox`, `dockbox`, `example-tailnet`, `home.arpa`, `ts.net`, `4733[1-3]`, `://`, `webpage`, `ERR_` | Only `API-05-02-typed.xml`, the Type an address sheet echoing what was typed. REQ-004/BEH-005 keep that on purpose | Proven |
| AC-007 | API-14 (d) `API-14-11-failed-reload-from-full.png`; `API-14-09-overlay-from-full.txt`; API-08/08b/09/11 (r4) | The screenshot shows only the opaque "Can’t reach Test Docker Node" overlay with the advice and Retry/Edit/Browser. The link overlay dump has only its own texts | Proven |
| AC-010 | API-02 (r4) `API-02-r4-mobile-shell-full.log`; API-10 (r4) | `mobile-shell probe: Pass`, `unexpected browser errors: []`, 20 cases | Proven |
| SR-006 DEC-011 | API-14 `API-14-window-states.log`, `API-14-03-full-screen.png` | <ul><li>`full-screen-entered` → `ROTATION_90 … SENSOR_LANDSCAPE … visible=false`; `exit-2` → `ROTATION_0 … UNSPECIFIED … visible=true`.</li><li>`reload-case` and `switch-case: node list` → `ROTATION_0`; `back to the page` → `ROTATION_90 … SENSOR_LANDSCAPE` (item 3).</li><li>`overlay-case` → `ROTATION_0`; `down-case-2` → `ROTATION_0 … bars=visible=true`.</li><li>The screenshot shows the landscape viewer with Android's full-screen hint.</li></ul> | Proven, apart from reopening at `full=1`, which can't be reached on a device (432 FU-002) and is covered by `DesktopFullScreenRequestTest` |

- More evidence requested: `None`
- User check needed: `Yes`, for the AC-001 part only: an HTTPS session at a real `*.ts.net` name on the user's own phone and node.
  - API/E2E showed it can't be built: the node refuses `http://…ts.net` pairing, and API 34+ can't be made to trust a test CA.
  - The check needs both the app and his nodes updated, so it can only happen after a release, and a release is cut from `personal` after finalization. Waiting for it before finalizing would deadlock.
  - The evidence covers the rule itself: the name rule never reads the address (unit tests with a `ts.net` session; the emulator with a nameless session and a typed `ts.net` node). The check confirms the result on his setup rather than proving new behavior.
  - So I finalize without a release and hand the check to the Solution Designer to raise with the user when he releases.
- User check reference: pending, after the user's next release
- Re-verification after later re-integration: `Not needed`. `origin/personal` was unchanged at `b690a5dfdb` before the merge into `personal` (see Repository Finalization).

## Release Decision

- Decision: `No release`
- Decided by: `solution-handoff.md` Constraints ("Release only on the user's word") and the `RELEASE.md` default. The user has not asked for a release. A release is available. When it comes, it must ship the APK and the node's `/mobile` page together, and `release-notes.md` carries the `## What you need to do` item.

## Docs Sync Result

- Docs sync artifact: `tickets/done/phone-node-name-privacy/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-android/README.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md`. `DESIGN.md`, `TESTING.md` (API/E2E's `82e4807f11`) and `RELEASE.md` were reviewed and needed no delivery change.

## Ticket State Transition

- Ticket moved to `tickets/done/phone-node-name-privacy`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/done/phone-node-name-privacy/` (and on `personal` after the merge)

## Version / Tag / Release Commit

- None (no release).

## Repository Finalization

- Bootstrap context source: `solution-handoff.md` (Workspace); `RELEASE.md` Finalization Target
- Ticket branch: `codex/phone-node-name-privacy`
- Finalization target: `origin` / `personal`, merged with `--no-ff` from `finalize/phone-node-name-privacy`
- Results of the commit, Secret Gate, pushes and merge: recorded in the delivery record entry DR-002 and the final delivery commit on `personal`

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (kept in the archived ticket for the next release)

## Post-Finalization Cleanup

- Dedicated ticket worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy`, removed after the push to `personal` (result recorded in DR-002)
- Untracked build output (`autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`): never committed; removed with the worktree

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration`
- Delivery action required: `None`. Saved entries whose stored name is their host are shown as "AutoByteus node" without being rewritten (API-05).

## Rollback Criteria

- No migration. Reverting the merge on `personal` rolls it back (`RELEASE.md` Rollback). After a release, an app/node version mismatch shows as "Connecting to …"; the fix is to update the node, not to roll back.

## Final Status

- Verification complete: `Yes`, from the evidence. The AC-001 user check follows a release and is handed on.
- Repository finalization complete: see DR-002
- Applicable release/deployment/rollout complete or not required: `Not required`
- Applicable safe cleanup complete or not required: see DR-002
- Unresolved blocker: `None`
