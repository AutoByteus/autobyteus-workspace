# Delivery / Release / Deployment Report

## Scope

- `imported-team-defaults-edit`, `Small` / `Low`, direct route.
- Finalize into `personal`, then release a beta (AC-007).

## Project Release Guide

- `RELEASE.md` at `c285adf6bf`. No deviation.

## Integration Refresh

- Bootstrap base and latest base checked: `origin/personal` @ `c285adf6bf` (2026-10-14). The base had not advanced; `Already current`.
- No rerun was needed:
  - API-002 validated this exact state.
  - Delivery changed docs and ticket records only.
  - Licensing and hygiene pass.

## Verification

- AC-001..AC-006: verified from evidence. See `handoff-summary.md` → Verification.
- AC-007: the user's check on the beta. Done; see Final Status.

## Docs Sync

- `docs-sync-report.md`: `Updated`.

## Ticket State Transition

- Moved to `tickets/done/imported-team-defaults-edit/` before the final commit.

## Persisted Data

- No app data changes. Package files change only on explicit user saves.

## Rollback

- Revert the merge on `personal` and cut the next beta.
- Package files already saved by users stay as saved; they are ordinary package edits.

## Repository Finalization

- Ticket branch `codex/imported-team-defaults-edit` (local only, never pushed; last commit `34eb69556a`).
- Target advanced after verification: `No`. `origin/personal` stayed at `c285adf6bf`.
- `finalize/imported-team-defaults-edit` from `origin/personal`. `git merge --no-ff` gave `3e9f62d2cd`. Licensing and hygiene pass. The untracked application SDK `dist/` folders were deleted first, as the guide requires.
- The base was confirmed unchanged. Then `git push origin HEAD:personal` moved it `c285adf6bf..50b7436229`.
- Status: `Completed`.

## Release

- Decision: a beta, because AC-007 asks for the user's check on a beta, and the package came marked urgent with a beta waiting.
- `desktop-release.sh beta --branch finalize/imported-team-defaults-edit --no-push` created `50b7436229` (`1.5.4-beta.1 → 1.5.4-beta.2`) and the annotated tag `v1.5.4-beta.2`. `personal` was confirmed to equal the release commit. Then `git push origin v1.5.4-beta.2`.

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | `38571718652` | success, 13:30 UTC |
| iOS App Store Connect Release | `38571718646` | success, 13:44 UTC |
| Desktop Release | `38571718642` | success, 13:51 UTC |
| Server Docker Release | `38571718666` | success, 14:02 UTC |

- GitHub pre-release https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.4-beta.2 has 17 assets.
- Docker `autobyteus/autobyteus-server:1.5.4-beta.2` is published for amd64 and arm64. `:beta` points to the same digest (`sha256:7ae42550109e…`). `:latest` is untouched.
- Result: `Completed` (not partial). Release notes: GitHub-generated for the pre-release. The ticket's `release-notes.md` is kept for the next stable release.

## Cleanup

- Worktree `imported-team-defaults-edit` removed and pruned.
- Local branches deleted: `codex/imported-team-defaults-edit` (was `34eb69556a`) and `finalize/imported-team-defaults-edit` (was `50b7436229`). No remote branch.
- Status: `Completed`.

## Final Status

- Verification:
  - AC-001..AC-006 from evidence (delivery).
  - AC-007 by the user: on 2026-10-14 the user wrote "checked works", after being asked to update to 1.5.4-beta.2, edit the Software Engineering Team's default model in an imported package and save it without the read-only error.
- Repository finalization: `Yes` (merge `3e9f62d2cd`; release commit `50b7436229`).
- Release: `Completed` (`v1.5.4-beta.2`, four of four workflows, 17 assets, Docker `:beta`).
- Cleanup: `Yes`.
- Unresolved blocker: none.
- Terminal package eligible: `Yes`; sent to `/solution_designer` after this record is pushed.

## DR-002 — Stable Release v1.5.4 (Task Reopened For One Step)

- Trigger: `/solution_designer` reopened the Task for one step (`/Users/normy/autobyteus_org/autobyteus-delivery-receipts/imported-team-defaults-edit/stable-release-request.md`). The user had tested beta `v1.5.4-beta.2` and explicitly asked for a **stable** release.
- Version: `1.5.4`.
  - The highest stable tag was `v1.5.3`, so the next patch is `1.5.4`.
  - The betas `1.5.4-beta.1` and `.2` were previews of it.
  - The stable carries everything on `personal` since `v1.5.3`: per-call TPS (`output-tps-precision`) and imported Team/Org editing (`imported-team-defaults-edit`).
  - `release_versions.py android-version-code 1.5.4` accepts the version.
- Curated notes:
  - `stable-v1.5.4-release-notes.md` combines the user-facing notes of the two tickets, in the `.github/release-notes/template.md` format (committed `cc46647494`).
  - `delegated-copy-model-change` and the earlier tickets were already in the `v1.5.3` notes, so they were not repeated.
  - The `stale-e2e-test-baseline-fix` ticket changed tests only, so it was not repeated either.
- Procedure per `RELEASE.md`:
  - Clean worktree of `origin/personal` @ `93650721df`.
  - Notes committed, then licensing and hygiene pass.
  - `desktop-release.sh release 1.5.4 --release-notes … --branch finalize/stable-v1.5.4 --no-push` created `907c861ff4` (`1.5.4-beta.2 → 1.5.4`), synced `.github/release-notes/release-notes.md`, and created the annotated tag `v1.5.4`.
  - The base was confirmed unchanged. Then `git push origin HEAD:personal` moved it `93650721df..907c861ff4`.
  - `personal` was confirmed to equal the release commit. Then `git push origin v1.5.4`.
- Deviations from `RELEASE.md`: none worth noting.
  - The guide takes the notes from "the ticket's `release-notes.md`".
  - This stable spans two tickets, so I combined their notes into one file in the `imported-team-defaults-edit` ticket folder, following the `stable-v1.5.2-release-notes.md` precedent.
  - The two source ticket notes are unchanged.

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | `38675491456` | success, 03:22 UTC |
| iOS App Store Connect Release | `38675491459` | success, 03:31 UTC |
| Desktop Release | `38675491457` | success, 03:43 UTC |
| Server Docker Release | `38675491450` | success, 03:53 UTC |

- GitHub release https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.4:
  - not a draft, not a pre-release, and marked **Latest**. `v1.5.4-beta.1` and `.2` stay pre-releases.
  - 17 assets: macOS arm64 and x64 `.dmg` and `.zip` with blockmaps; Linux x64 and arm64 AppImages; the Windows `.exe`; `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and `latest-linux-arm64.yml`; the Android APK and its `.sha256`.
  - The body is the curated notes.
- Docker `autobyteus/autobyteus-server`: `1.5.4`, `:latest` and `:beta` all point to digest `sha256:8c6724d5e830…`, for amd64 and arm64.
- Result: `Completed` (not partial).
- Cleanup:
  - The release worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-v1-5-4` and the local `finalize/stable-v1.5.4` branch are removed after this record is pushed. The branch was never pushed.
  - The orphan directory `stale-e2e-baseline-fix` was already deleted with the user's OK ("i guess we could clean them up").
  - No other worktree or branch of these tickets remains.
