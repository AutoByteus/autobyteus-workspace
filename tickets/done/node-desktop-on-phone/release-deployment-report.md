# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

autobyteus-407, slice S3 of autobyteus-394: the node desktop on the phone and in a desktop browser.
- Classification: `task_size` `Large`, `architectural_risk` `High`, reviewed route (architecture review passed; CRR-002 Pass; API-REV-001 Pass; CRR-003 test-code review Not Applicable).
- Finalization target: `origin/personal`. No release.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `e427a0c9cf`, read in the ticket worktree.
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `e427a0c9cf`
- Latest tracked remote base reference checked: `origin/personal` `e427a0c9cf`
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Completed`. `b71b542ca7` committed the code reviewer's three uncommitted reports.
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `No`
- Post-integration verification result: `Passed` (the validated state is the integrated state)
- No-rerun rationale: the branch already contains `origin/personal`. The API/E2E runs on `165de82af4` (source `0baf15a981`) are on the final code. Delivery's own edits are two doc sentences. RELEASE.md: delivery audits and does not redo.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on: execution report API-REV-001. Final confidence is 95.0%: every critical AC directly proven, no category below 90%. Delivery opened the files below and checked the lines.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-017 | `API-04-ac017-emulator.txt`; screenshot `API-04-2-view-only-portrait.png` | View only: node mouse `x:300 y:300` after taps, swipe, pinch (`scale(2.75)`), pan, double tap (`scale(1)`); screenshot "Connected · View only" with the node desktop | Proven (physical phone optional by the AC) |
| AC-018 | `API-10-ac018-browser-rerun.txt` | `"mouseOnNode":"x:300 y:300"` ×2 in View only; `scale(4)` then `scale(1)`; Control `x:959 y:540`; `"result":"done"`, `"error":null` | Proven |
| AC-019 | `API-06-ac019-background.txt` | `reason=viewer-closed`; same pid `4335`; after return `Connected · View only`, up `1` | Proven |
| AC-012 | `API-07a-phone-access-off.txt`, `API-07b-revoke.txt`; route E2E "ends open phone streams within 25 s of Phone Access being turned off (AC-012)" | `+4.8s … not allowed up=0`, `close=PHONE_ACCESS_DISABLED`; `+15.6s … up=0`, `close=REMOTE_ACCESS_DEVICE_REVOKED`; reopen refused | Proven |
| AC-021 | `API-08/AC021-results.json`; `API-08-desktop-tile-too-many-retry.txt`; route E2E "refuses a 5th stream node-wide with 4429 before any desktop connection", "refuses a 3rd stream from one phone with 4429 …" | tab 3 `Too many viewers on this node right now`, `Retry`, upstream `2`; device B the same at `4`; Retry connects after a stream leaves; desktop tile shows the same | Proven |
| AC-S3-1 | `API-05-keyboard-gboard.txt` | `"ab"`, `"hello "` once, `"world "` once | Proven |
| AC-S3-2 | IMP-S3-30 (UI tests); `API-09-cr001-availability-error-then-back.txt` | menu without VNC Viewer after `injected-502`; with it on the next run screen | Proven |
| AC-S3-3 | Docs diff | `remote_access.md`, `node_desktop.md`; delivery corrected two stale docs | Proven |

- More evidence requested: `None`.
- User check needed: `No`. AC-017 names a physical phone as "optional, by the user".

## Release Decision

- Decision: `No release`
- Decided by: the RELEASE.md default; no release was asked for this ticket. The user's beta request covered autobyteus-405 (v1.5.12-beta.5).

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/modules/node_desktop.md` (implementation); `docs/android_mobile_access.md`, `autobyteus-web/docs/terminal.md` (delivery)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/node-desktop-on-phone/`

## Version / Tag / Release Commit

Not applicable.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` now. `release-notes.md` is written for the next release that includes this ticket. Its `## What you need to do` (update the Docker node) goes into that release's notes.

## Escalation / Reroute

None.

## Release Notes Summary

- Release notes artifact: `tickets/done/node-desktop-on-phone/release-notes.md`
- Release notes status: `Updated` (for a later release)

## Environment Or Persisted-Data Transition Notes

- Delivery action required: `None`. No stored data changes.

## Rollback Criteria

Revert the merge on `personal`. The phone's VNC Viewer entry and the stream limits go away, and the desktop app's tile returns to its S1 code. There is no data change.

## Finalization Record

(Filled in after the merge.)

## Final Status

(Filled in at the end.)
