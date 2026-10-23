# Delivery / Release / Deployment Report — remote-run-title (autobyteus-269)

## Scope

A remote run's title (`Small` / `Low`, direct route). The scope is repository finalization to `origin/personal`, then the stable release `v1.5.8` at the user's request. The stable release covers everything merged since `v1.5.7`.

## Project Release Guide

- `RELEASE.md` at `origin/personal` `ca1f09e52a`; its last change concerns the NFS guide only. Deviations: `None`. Proposed fixes: `None`.

## Initial Delivery Integration Refresh

- Bootstrap base `33171e1385`; latest checked `ca1f09e52a` (advanced: the copy-only NFS guide). Checkpoint `89aeb8f5d8`. Method `Merge`, clean, with no file changed on both sides.
- Post-integration checks: DEL-01 (web guards, web suite 653 files / 4686 passed) and DEL-02 (server build, browser probe 6/6) pass. The server is untouched by the base, so API-01 (30/30) holds.

## Verification

- Evidence judged: `Sufficient` for AC-601 … AC-604. The evidence relied on: the API-REV-002 report and scorecard (95%, no category below 90%), probe runs 3–5 and DEL-02, and the API-01 receipt (RC-05/21/22/30).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-601 | RRT-01 … RRT-05 (run 5, DEL-02); API-01 RC-05/21/22 | Stored titles: peer Agent and peer Team "Cut the launch trailer and have it checked. Marker …". The rows show them while active (live contexts present), after a reload, and after owner messages to the Agent and to the Team coordinator (the Team row sampled for 6 s: one text). The header shows the stored title | Proven |
| AC-602 | API-01 RC-30; unit | A 317-character multi-line description gives a one-line, 100-character title for both kinds | Proven |
| AC-603 | RRT-02/03/06 | A plain user run is unchanged. The skill-tagged run reads without the instruction prefix, active and after Stop and reload (the design's stated consistency gain) | Proven |
| AC-604 | review | No migration added; a stored run lists and opens | Proven |
| AC-605 | — | The user's check on his Docker node | User Check: open (user chose to release first) |

- User check needed: `Yes`, AC-605. The user decided to finalize and release a stable version without checking first (2026-10-22).

## Release Decision

- `Stable` `v1.5.8`, by the user, 2026-10-22 ("finalize and release a stable version now").

## Release Notes Summary

- Release notes artifact: `tickets/done/remote-run-title/release-notes.md`, created before finalization.
  - It covers every user-facing change since `v1.5.7`: Remote Collaboration (delegation, Agent Teams, discovery, the Nodes page, titles), the Notification Center, Agent Runtimes and remote sign-in, the NFS guide, MCP client v2 and HTTP-status errors, Electron and library security, and the Skill Improvement removal.
  - It states that going back to an earlier version is not supported (the Skill Improvement data deletion; new remote-collaboration fields that older builds were never checked against), per `RELEASE.md` § Rollback.
- Used for the release via `desktop-release.sh release 1.5.8 --release-notes …`.

## Docs Sync Result

- `docs-sync-report.md`: `Updated` (by the implementation; verified by delivery).

## Ticket State Transition

- Moved to `tickets/done/remote-run-title`: `Yes`.

## Environment Or Persisted-Data Transition Notes

- This ticket: `Not Affected`, with no migration. The release as a whole contains one app-data migration (`remove-skill-improvement-data-migration`, which deletes data once). The release notes tell users to back up first and that going back is not supported.

## Rollback Criteria

- Revert on `personal` and cut a newer release (`RELEASE.md`). Desktop updates never downgrade. Docker users would pin an earlier image, which the notes advise against after the data deletion.

## Finalization Record (DR-001)

### Repository Finalization

- Ticket branch `codex/remote-run-title`, final commit `7e9c0845c5`:
  - path hygiene exit 0; licensing consistent;
  - Secret Gate `origin/personal..HEAD`: 13 commits, PASS;
  - pushed to `origin` as a new branch.
- Finalization target: `origin` / `personal`, still `ca1f09e52a` at every fetch.
- Merge: `finalize/remote-run-title`, `--no-ff`, giving `a3086b9b42` with a tree identical to the ticket branch. Secret Gate PASS.
- `git push origin HEAD:personal`: `ca1f09e52a..a3086b9b42`. Repository finalization: `Completed`.

### Release: stable v1.5.8

- **Decision:** the user's, 2026-10-22 ("finalize and release a stable version now").
  - It is the stable release of everything merged since `v1.5.7` (betas `1.5.8-beta.1` … `beta.8` plus this ticket and the NFS guide).
- **Method:** `RELEASE.md`, from a fresh worktree of `origin/personal` `a3086b9b42` on `finalize/release-1.5.8`.
- **Checks before tagging,** all passed:
  - licensing: "Licensing is consistent.";
  - artifact hygiene: exit 0;
  - Secret Gate over `v1.5.8-beta.8..HEAD` and over all 314 commits of `v1.5.7..HEAD`: PASS;
  - `release_versions.py android-version-code 1.5.8`: `10050899`.
- **Version, tag and release commit:**
  - `desktop-release.sh release 1.5.8 --release-notes tickets/done/remote-run-title/release-notes.md --branch finalize/release-1.5.8 --no-push` made the release commit `73d2141077`. It sets `autobyteus-web/package.json` to `1.5.8` and writes `.github/release-notes/release-notes.md`, identical to the ticket's notes.
  - The tag is the annotated `v1.5.8`.
- **Push:** Secret Gate PASS; `origin/personal` was refetched and unchanged. `git push origin HEAD:personal` gave `a3086b9b42..73d2141077`, then the tag (08:38:05 UTC).
- **Pipelines:**
  - Android APK Release `39749203211`: `success`.
  - iOS App Store Connect Release `39749203168`: `success`.
  - Server Docker Release `39749203181`: `success`.
  - Desktop Release `39749203248`:
    - **attempt 1:** `failure` in "Build macOS ARM64", step "Install Python setuptools for node-gyp". The runner could not resolve `files.pythonhosted.org` ("Failed to resolve IP address … nodename nor servname provided", five retries, exit 1). Every other platform job succeeded, and "Publish GitHub Release" was skipped.
    - **Classification:** a transient runner/network failure, not the tag's content.
    - **Recovery:** the user re-ran the failed job, per `RELEASE.md` § Recovery (re-run only the failed jobs; the tag is untouched).
    - **attempt 2:** `success` for every job, including macOS ARM64 and Publish GitHub Release.
- **Published artifacts:**
  - GitHub release `v1.5.8`: "Latest", not a pre-release, not a draft. The body is the curated notes ("## Before You Update …"). It has 17 assets: the APK and `.sha256`, the Linux x64/ARM64 AppImages, the macOS ARM64/x64 `.dmg`/`.zip` with blockmaps, the Windows `.exe`, and four `latest*.yml`.
  - TestFlight upload by the iOS workflow.
  - Docker `autobyteus/autobyteus-server:1.5.8`, `:latest` and `:beta` all `sha256:ff6bf251b33b…` (amd64, arm64).
- **Release result:** `Completed`, after the transient re-run. It is not a partial release: every artifact is published from the same tag.
- **Rollout:**
  - Desktop installs get `1.5.8` as the stable update; beta-channel installs are also offered it, because it is newer than every 1.5.8 beta.
  - Docker users: `autobyteus-docker upgrade --all --tag latest`.
  - Rollback: the release notes say going back is not supported (back up first); fix forward with `1.5.9`.

### Post-Finalization Cleanup

- Worktrees `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-run-title` and `/Users/normy/autobyteus_org/autobyteus-worktrees/release-1.5.8`: `Completed`, removed with `git worktree remove --force` right after this record's push.
  - Checked first: no process runs from either.
  - Everything tracked is pushed; untracked build output goes with them.
- Local branches `codex/remote-run-title` (`7e9c0845c5`, contained in `origin/personal`), `finalize/remote-run-title` and `finalize/release-1.5.8`: `Completed`, deleted. Remote ticket branch kept.

### Final Status

- Verification: AC-601 … AC-604 `Yes`. AC-605 `No`: the user's check is open, by the user's decision to release first.
- Repository finalization: `Yes` (`a3086b9b42`).
- Release: `Completed` (stable `v1.5.8`; one transient job failure re-run by the user).
- Safe cleanup: `Yes`.
- Unresolved blocker: none for delivery. Open user checks for this release's features: AC-605 (this ticket), AC-408 (remote discovery) and AC-506 (Nodes page).
- Terminal package sent to the Solution Designer: `Yes`.
