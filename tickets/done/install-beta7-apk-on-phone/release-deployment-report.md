# Delivery / Release / Deployment Report — install-beta7-apk-on-phone (autobyteus-425)

## Release / Publication / Deployment Scope

- `Release Requested` (device install): install the official Android APK of the already published release `v1.5.12-beta.7` on the user's own phone over USB, as an update. Nothing in the software changes; no new release, tag or build.
- The user's words: "can you ask the solution designer from the previous team to install the newest apk to my phone. i already plugged in my phone".

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `270a89a608` (last changed `277660ed19`).
- Deviations from the guide and why: `None`. The guide's tagging and rollout steps do not apply: the release was already published and verified (`tickets/done/one-step-phone-pairing/release-deployment-report.md`). Its Deployment section says users receive a release through its published artifacts; this install uses the published APK.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: N/A for a release request (the handoff file `handoff-release-requested.md` holds the request).
- Delivery revision record: `tickets/done/install-beta7-apk-on-phone/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Verification

The release request's checks are the verification:

| Check | Result |
| --- | --- |
| Device | one device over USB, `1173b7e9`: Xiaomi `25067PYE3C` (product `luming`), Android 16 (SDK 36) |
| Installed before | `org.autobyteus.mobile` `versionName=1.5.12-beta.4`, `versionCode=10051204` |
| APK source | GitHub release `v1.5.12-beta.7` (pre-release), `gh release download` of `AutoByteus_personal_android-1.5.12-beta.7-release.apk` and its `.sha256` into a new temporary folder |
| Checksum | `shasum -a 256 -c` → `OK`; `d1b1e28c44a72cce1b0e9de2cd710b92683d399e81cd7af7d31c012e6d63f240` |
| APK identity | `aapt2 dump badging`: `org.autobyteus.mobile`, `versionCode='10051207'`, `versionName='1.5.12-beta.7'` (an upgrade, not a downgrade); `apksigner verify`: signer certificate SHA-256 `82300c43e2b74ae48fa648a1ec09ea760c775e24cbe5d6b2ed5d5b28458f2104` |
| Install | `adb -s 1173b7e9 install -r <apk>` → `Performing Streamed Install`, `Success` (an update over the existing app, so the signature matched the installed one) |
| Installed after | `versionName=1.5.12-beta.7`, `versionCode=10051207`, `lastUpdateTime=2026-11-07 17:07:43`; `firstInstallTime=2026-09-27 11:23:51` unchanged, so the app was not uninstalled and its data (saved nodes, pairings) was kept |

- Nothing else was read from the phone (only the `getprop` model/version and the package's `dumpsys` version lines). No screenshots. No app data cleared, nothing uninstalled, no other setting changed.

## Release Decision

- Decision: `Deployment` (device install of the existing beta).
- Decided by: the user (quoted above), through the Project Task Manager and the Solution Designer (Task autobyteus-425).

## Docs Sync Result

- N/A for a release request: no software change.

## Ticket State Transition

- Ticket moved to `tickets/done/install-beta7-apk-on-phone`: `Yes`

## Version / Tag / Release Commit

- None: the installed artifact is the existing `v1.5.12-beta.7` (release commit `84596c87b8`).

## Repository Finalization

- Ticket branch: `codex/install-beta7-apk-on-phone`; its only content is this ticket record (handoff file, this report, the revision record), merged `--no-ff` into `personal` after the Secret Gate, per the release guide.

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Other` (adb install of the published release asset)
- Pipelines triggered and their results: none.
- Published artifacts checked against what the release should produce: the APK's SHA-256 matches the release's `.sha256`.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required`

## Post-Finalization Cleanup

- Temporary files: `/tmp/beta7-apk.o8x1Zd` (APK and `.sha256`) removed.
- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/install-beta7-apk-on-phone`; removed after the merge, with the local branches.
- Remote branch cleanup result: `Not required`

## Rollback Criteria

- To go back, the user would install an older APK; Android refuses a downgrade with `install -r`, and a downgrade would need uninstalling, which removes the app's saved nodes and pairings. Not planned.

## Final Status

- Verification complete: `Yes` (checksum, version before and after)
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`
