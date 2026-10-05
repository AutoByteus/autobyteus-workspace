# Delivery / Release / Deployment Report — DR-006

## Result
**Finalized and released as beta v1.4.95-beta.1. Cleanup of the ticket worktree is deferred: it is blocked by API test instances still running from that worktree.** Classification: **Large / High / Reviewed**. Finalization target: **origin/personal**.

Known open item, carried from SR-027: **REQ-BL-010 is partially delivered**. AC-017 is not met and FAPI-013 is open. The catalog-driven Codex multi-agent case (openai/codex#50880) was deferred by the user.

DR-005 pre-image: `delivery-evidence/dr-005/` and the git history of this file.

## User Verification
Received 2026-10-05 as the user's instruction "finalize and release a new version", corrected to "i meant a new beta version". It covers candidate `335f78c20` and accepts the known open item.

## Repository Finalization
| Step | Result |
| --- | --- |
| Target refresh after verification | origin/personal `fc79fad14`, unchanged since verification and an ancestor of HEAD. No reintegration needed. |
| Ticket archive | Moved to `tickets/done/project-task-manager-linked-delegation/`. The archive is curated: 5083 files committed; 875 raw snapshots and >200-char paths excluded and listed in `ARCHIVE-EXCLUSIONS.md`. The full 5958-file folder is kept at `/Users/normy/autobyteus_org/autobyteus-worktrees/.task-safety-backups/project-task-manager-linked-delegation/full-ticket-archive/`. |
| Final ticket commit | `43d95677f`: the 9 docs plus the curated archive, staged by explicit path. No `dist/` or `electron-dist/`. `check_repository_artifact_hygiene.py` passed. |
| Ticket branch push | `origin/codex/project-task-manager-linked-delegation` pushed (kept by convention). |
| Target merge and push | Fast-forward: origin/personal `fc79fad14..43d95677f`. |

## Release (beta)
- Method: the documented `bash scripts/desktop-release.sh beta`, run in a clean temporary worktree with `--branch release-beta-tmp-ptm --no-push`. The main `personal` checkout has other tickets' uncommitted files, so it was not used. The pushes were then done as the script instructs: `release-beta-tmp-ptm:personal` and the tag.
- Version: `python3 scripts/release_versions.py next-beta` gave `1.4.95-beta.1` (next patch after stable v1.4.94). Release commit `19dee40b3` "chore(release): bump workspace release version to 1.4.95-beta.1" (autobyteus-web/package.json). Annotated tag `v1.4.95-beta.1` (`befa05ab5`). origin/personal is now `19dee40b3`.
- Tag-push workflows, all **completed / success**:
  - Desktop Release 37347966287
  - Android APK Release 37347966374
  - iOS App Store Connect Release 37347965547
  - Server Docker Release 37347965458
- GitHub Release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.95-beta.1. It is a **pre-release**, not a draft, with 17 assets: macOS arm64/x64 dmg+zip with blockmaps, Linux x64/arm64 AppImage, Windows exe, Android APK with sha256, and `latest*.yml` updater metadata. Notes are GitHub-generated, the documented behavior for beta tags, so no curated release-notes.md was required.
- Rollout: desktop users receive it only with "Receive beta updates" on. Docker publishes `autobyteus/autobyteus-server:1.4.95-beta.1`; it never moves `:latest`, and `:beta` moves only if this is the newest tag.

## Cleanup
- Done: the temporary release worktree `release-beta-1.4.95` and local branch `release-beta-tmp-ptm` were removed.
- **Deferred:** the ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation` and local branch `codex/project-task-manager-linked-delegation`. The API test instance `iso-54775-990c` (pids 79981/80926 …) is running from this worktree's `autobyteus-web/electron-dist/`. Those instances are API-owned and wait for the user's word. Removing the worktree now would delete a running app's binaries.
- Remaining after the instances stop: remove the worktree, delete the local branch, and drop stash `76b8fd003` (superseded DR-002 docs).

## Rollback
- Beta: unpublish or delete the GitHub pre-release and tag `v1.4.95-beta.1`. Stable users are unaffected.
- Source: revert `43d95677f` (docs/archive), or the ticket commits, on personal.
