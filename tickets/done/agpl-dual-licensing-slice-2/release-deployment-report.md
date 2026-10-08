# Delivery / Release / Deployment Report — agpl-dual-licensing, Slice 2

Not legal advice. A lawyer should review `CLA.md` and the licence wording (REQ-011).

## Release / Publication / Deployment Scope

- Package: `agpl-dual-licensing` Slice 2 (ticket `agpl-dual-licensing-slice-2`): REQ-007, REQ-008 (manual CLA), REQ-010, REQ-011.
- `task_size` Medium, `architectural_risk` Low, direct route (ARCH-REV, code review and test-code review `Not Applicable`).
- Upstream: SR-007, IR-001 (`411bac9c9`), API-REV-001 Pass (95%).
- Release: **stable `v1.4.98`**, at the user's explicit instruction ("finalize and release a new stable version"). This overrides the solution handoff's "no release" default.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agpl-dual-licensing-slice-2/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agpl-dual-licensing-slice-2/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `714c41324`
- Latest tracked remote base reference checked: `origin/personal` @ `714c41324`
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Completed` (`ca1d74908`)
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (smoke)
  - `check_licensing.py` exit 0
  - unittest 12 OK
  - packaging integration test 4/4
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: user, 2026-10-08: "finalize and release a new stable version"
- Renewed verification required after later re-integration: `No` (target unchanged at `714c41324` until the merge)
- Renewed verification received: `Not needed`

## Docs Sync Result

- Docs sync artifact: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agpl-dual-licensing-slice-2/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/electron_packaging.md`, `autobyteus-server-ts/docker/README.md`

## Ticket State Transition

- Ticket moved to `tickets/done/agpl-dual-licensing-slice-2`: `Yes` (`287b164b3`)
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agpl-dual-licensing-slice-2/`

## Repository Finalization

- Bootstrap context source: `solution-handoff.md` (target `origin/personal`)
- Ticket branch: `codex/agpl-dual-licensing-slice-2`
- Ticket branch commit result: `Completed` (`287b164b3`)
- Ticket branch push result: `Completed` (`origin/codex/agpl-dual-licensing-slice-2`)
- Finalization target remote / branch: `origin` / `personal`
- Target advanced after verification / acceptance: `No`
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. Done in the ticket worktree, detached at the fetched `origin/personal`. The main checkout on `personal` holds unrelated uncommitted work and was left untouched.
- Merge into target result: `Completed`. `--no-ff` merge `311f46427` "Merge verified agpl-dual-licensing slice 2 (licence in shipped software, CLA, release gate)". `check_licensing.py` exit 0 on the merged tree.
- Push target branch result: `Completed`, `714c41324..311f46427 HEAD -> personal`
- Repository finalization status: `Completed`

## Version / Tag / Release Commit

- Method: documented release helper `scripts/desktop-release.sh release 1.4.98 --release-notes tickets/done/agpl-dual-licensing-slice-2/release-notes.md --branch release-v1.4.98 --no-push`.
  - The script requires a clean checkout on the named branch, and the main `personal` checkout is dirty with unrelated work. So the helper ran on a temporary local branch at the merged `personal` tip.
  - The release commit and tag were then pushed exactly as the helper does: branch first, then tag.
- **Pre-push gate finding:** the first prepared release tree failed `check_licensing.py`.
  - Cause: the curated notes said "Apache License 2.0", and `.github/release-notes/release-notes.md` is not in the checker's claim allowlist.
  - Action: the local commit and tag were discarded and never pushed. The notes were reworded to say the SDKs "keep their existing permissive license" and v1.4.97 and earlier "remain available under the license they were published with" (`2914f5be6`). The release was then re-prepared.
  - Result: `check_licensing.py` exit 0 and `check_repository_artifact_hygiene.py` exit 0 on the exact tagged tree.
- Release commit: `440a4c948` "chore(release): bump workspace release version to 1.4.98" (`autobyteus-web/package.json` 1.4.98-beta.2 → 1.4.98; `.github/release-notes/release-notes.md` synced).
- Push: `311f46427..440a4c948 HEAD -> personal`; tag `v1.4.98` (annotated) pushed.

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Release Script` (tag-triggered GitHub workflows)
- Workflow runs (all `completed/success`):
  - Desktop Release `37744849591` (08:03:30Z)
  - Android APK Release `37744849670` (07:44:41Z)
  - iOS App Store Connect Release `37744849583` (07:55:36Z)
  - Server Docker Release `37744849835` (08:15:43Z)
- **Licensing gate on GitHub runners:** the "Check licensing consistency" step was `completed/success` in all four workflows. This was the API/E2E residual "gate on GitHub runners"; it is now proven.
- GitHub Release `v1.4.98`: **Latest**, not a pre-release, not a draft, published 07:44:38Z. Assets:
  - macOS arm64/x64 DMG + ZIP + blockmaps
  - Windows `.exe`
  - Linux x64/arm64 AppImage
  - Android APK + sha256
  - `latest*.yml` updater metadata (mac, win, linux, linux-arm64)
- Docker Hub `autobyteus/autobyteus-server`: `1.4.98`, `latest` and `beta` all point to `sha256:8aa17b23…5187`.
- Release notes handoff result: `Used` (archived `tickets/done/agpl-dual-licensing-slice-2/release-notes.md` → `.github/release-notes/release-notes.md`)

## Verification Checks (published artifacts)

- Published `AutoByteus_personal_macos-arm64-1.4.98.zip`:
  - `Contents/Resources/{LICENSE,LICENSING.md,NOTICE}` are present and byte-identical (`cmp`) to `autobyteus-web/LICENSE`, root `LICENSING.md` and root `NOTICE`.
  - `Info.plist` `NSHumanReadableCopyright` = "Copyright © 2026 Yu Zheng (AutoByteus). Licensed under AGPL-3.0-only or a commercial license."
  - Signing/notarization: the Desktop workflow's signing-policy verification passed for both macOS architectures.
- Published Docker `autobyteus/autobyteus-server:1.4.98`:
  - `org.opencontainers.image.licenses` = `AGPL-3.0-only` on both `linux/amd64` and `linux/arm64` (`docker buildx imagetools inspect`).
  - In the pulled arm64 image, the sha256 of `/app/LICENSE` (`0d96a4ff…`), `/app/LICENSING.md` (`ff416568…`) and `/app/NOTICE` (`c781cf26…`) equal the repo files.
- Not separately inspected: Windows `LegalCopyright` on the `.exe`. It comes from the same electron-builder `copyright` value, and the Windows build succeeded.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2`
- Worktree cleanup result: `Completed` (after this record was pushed)
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed` (`codex/agpl-dual-licensing-slice-2`, temporary `release-v1.4.98`)
- Remote branch cleanup result: `Not required` (repo convention keeps `codex/*` remote branches)

## Release Notes Summary

- Release notes artifact: `tickets/done/agpl-dual-licensing-slice-2/release-notes.md`. Created at the user's release request, after verification, because the release was not planned before it.
- Covers everything since v1.4.97: the licence change (AGPL + commercial, licence files in apps/images, CLA), Archive all runs, agent context files on Project Tasks, and the restored Team group icon.
- Release notes status: `Updated`, `Used`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none
- Delivery action required: `None`

## Rollback Criteria

- If the release is bad, publish a fixed patch release (`v1.4.99`) via the release helper. Do not delete a published stable release that users may already have auto-updated to.
- If the licensing gate falsely blocks a later release, fix the flagged file or extend the checker allowlist through a normal ticket.

## Follow-ups (not blockers)

- **Checker allowlist gap:** `.github/release-notes/release-notes.md` is not allowlisted, so any future release notes that mention the earlier licence by name fail the release gate. Delivery worked around it by rewording. Consider allowlisting that file or documenting the constraint in the release helper (Solution Designer to decide).
- **Runtime problem reported at the user's request:** idle shutdown kills delegated agents' background tasks. See `/Users/normy/autobyteus_org/agpl-dual-licensing-reports/idle-shutdown-kills-background-tasks.md`, sent to the Solution Designer for the Project Task Manager.
- UD-001 / UD-002 (pre-existing), lawyer review, deleting the unused `v1.4.98-beta.1` tag, and `author.email`.

## Final Status

- Explicit user testing/verification complete: `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (Completed: stable v1.4.98)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: see delivery-revision-record DR-002
