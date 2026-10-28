# Delivery / Release / Deployment Report — release-v1.5.9 (autobyteus-319)

## Release / Publication / Deployment Scope

- **Release request:** stable `v1.5.9` from `origin/personal`, following RELEASE.md (Solution Designer `Release Requested`, Task `autobyteus-319`).
  - Requested by the user: "it is worth releasing a stable version now, before the next work".
- **Contents:** everything on the beta line since `v1.5.8`, that is `v1.5.9-beta.1` … `v1.5.9-beta.15`.
- **Release source:**
  - `origin/personal` `3edb93687f`, the merge of `codex/release-v1.5.9` onto `e8a7539f41`.
  - Its software content equals the tested `v1.5.9-beta.15` (`517cf5b604`). `git diff --name-only v1.5.9-beta.15 3edb93687f` outside `tickets/` lists only `.gitleaks.toml`: the secret-scan config, which is not in any build.
- **Not in scope:** the user's Docker nodes and app (not touched; he upgrades them himself), and no code change.

## Project Release Guide

- Release guide: `RELEASE.md` on `origin/personal`, last changed by `aca8655bdd` (build-only run before every tag; watch the four runs together; the beta.14 case study).
- Deviations from the guide and why: `None`.
- **The Secret Gate finding and its fix.**
  - The gate over everything the release adds (`v1.5.8..HEAD`, 654 commits) blocked, so nothing was pushed until it was resolved. The match was rule `aws-access-token` in `autobyteus-server-ts/tests/memory-search/memory-search-index-units.test.ts` L98, commit `bc374d4b7c` (2026-10-26; that file is now under `tests/unit/memory-search/`).
  - Checked by shape and context, as the guide says: the value is `AKIA` followed by the consecutive alphabet run `ABCDEFGHIJKLMNOP`. It is a fixture of the secret masker's unit test, beside equally synthetic `sk-abcdef…` and `ghp_abcdef…` values. It is not a credential and was never tested at a provider.
  - Fix, following the guide's rule for false positives: the narrowest `.gitleaks.toml` entry, with its reason (`c7d523adb4`). It allowlists that exact value only, for the `aws-access-token` rule only. A shape-based entry would have to stay on the generic rule.
  - Rescan: `v1.5.8..HEAD` PASS (653 commits with the entry in the working tree; then 655 commits on the merged state `3edb93687f`).
  - The value has been public since `v1.5.9-beta.13`. Because it is synthetic, no rotation is needed.
- Proposed guide fixes: `None` new.
  - From autobyteus-294, still awaiting the user's answer: a local server Docker build before tagging when the server or the Docker web inputs change. Not needed here: the software is identical to beta.15, whose Docker release succeeded.

## Handoff Summary

- Handoff summary: `N/A` for a release request (`delivery-engineer` skill: no validated package; the release guide's checks are the verification).
- Delivery revision record: `tickets/done/release-v1.5.9/delivery-revision-record.md`, `DR-001`.

## Verification (Release Request: The Release Guide's Checks)

- Secret Gate:
  - ticket branch before its first push: PASS;
  - after the allowlist commit: PASS;
  - merged state: PASS;
  - everything the release adds, `v1.5.8..HEAD`: PASS after the false-positive entry.
- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: passed.
- `python3 scripts/release_versions.py android-version-code 1.5.9`: accepted.
- Build-only release run (RELEASE.md § Build-only release run): Desktop Release `40680505735` (`pnpm release:test --ref personal`, head `3edb93687f`): `success` on the first attempt for macOS ARM64, macOS Intel x64, Linux x64, Linux ARM64 and Windows x64. Publish was `skipped`.
- Server Docker: no separate local build. The software is identical to `v1.5.9-beta.15`, whose Docker release (`40662983271`) succeeded and was preceded by the local build DEL-03 of autobyteus-294.

## Release Decision

- Decision: `Stable` `v1.5.9`.
- Decided by: the user, through the Project Task `autobyteus-319`.

## Ticket State Transition

- Archived ticket path: `tickets/done/release-v1.5.9/` (the release notes were archived before the release script, which reads them from there)

## Version / Tag / Release Commit

- Version `1.5.9`: the next patch after the highest stable tag `v1.5.8`. The Android versionCode check passed.
- Release commit: `bd91eeebb6` `chore(release): bump workspace release version to 1.5.9`, made by `scripts/desktop-release.sh release 1.5.9 --release-notes tickets/done/release-v1.5.9/release-notes.md --branch finalize/release-v1.5.9 --no-push`.
  - It sets `autobyteus-web/package.json` to `1.5.9`.
  - It writes `.github/release-notes/release-notes.md`, identical to the ticket's notes (`diff -q`).
- Annotated tag `v1.5.9`.
- Push: Secret Gate on `3edb93687f..bd91eeebb6`: PASS. `origin/personal` was still `3edb93687f`, so I pushed `3edb93687f..bd91eeebb6` and then the tag.

## Repository Finalization

- Ticket branch: `codex/release-v1.5.9`
  - `aae3b334f8`: release notes and the release request;
  - `c7d523adb4`: the Secret Gate allowlist entry;
  - pushed.
- Target: `origin` / `personal`. `origin/personal` was unchanged at `e8a7539f41` before each push.
- Merge: `finalize/release-v1.5.9` from `origin/personal`, `git merge --no-ff` → `3edb93687f`, pushed `e8a7539f41..3edb93687f`.
- Repository finalization status: `Completed`.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Project Release Guide` (RELEASE.md § Cutting The Release, stable).
- Pipelines (tag `v1.5.9`), all four watched together:

  | Workflow | Run | Result | Time (UTC) |
  | --- | --- | --- | --- |
  | Desktop Release | `40684723871` | success | 12:03:25 → 12:32:02 |
  | Server Docker Release | `40684723893` | success | 12:03:25 → 12:39:13 |
  | Android APK Release | `40684723873` | success | 12:03:25 → 12:08:49 |
  | iOS App Store Connect Release | `40684723848` | success | 12:03:25 → 12:32:11 |

- GitHub release `v1.5.9`:
  - **Latest** (`gh api …/releases/latest` → `v1.5.9`), not a pre-release, not a draft, published 2026-10-28T12:08:46Z;
  - its body begins with the curated "## Before You Update";
  - **17 of 17 assets:**
    - the Android APK and its `.sha256`;
    - Linux x64 and ARM64 AppImages;
    - macOS ARM64 and x64 `.dmg`/`.zip` with their blockmaps;
    - the Windows `.exe`;
    - `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`.
- Docker Hub `autobyteus/autobyteus-server`, read through the Docker Hub tags API:
  - `:1.5.9`, `:latest` and `:beta` share the digest `sha256:52ab2f571eda27c3…`, for `linux/amd64` and `linux/arm64`;
  - `:latest` moved because the tag is stable, and `:beta` moved because `v1.5.9` is the newest release tag (`release_versions.py is-newest v1.5.9` → `true`), as RELEASE.md says;
  - `:1.5.9-beta.15` is unchanged (`sha256:b0c7a64ef0b4…`).
- Release/publication/deployment result: **`Completed`**. Nothing was partial.
- `v1.5.9-beta.14` stays as the partial pre-release it is; no published tag was moved or deleted.
- Release notes handoff result: `Used`.

## Release Notes Summary

- Curated, user-facing notes: `tickets/done/release-v1.5.9/release-notes.md`. The release script copies them to `.github/release-notes/release-notes.md` in the tagged revision.
- Format: the same as `v1.5.8`'s notes, in these sections: Before You Update, What's New, Improvements, Fixes, Security, Changes, Known Limitations, Upgrade Notes.
- The warnings the Task requires are in Before You Update:
  - going back is not supported after the Task titles migration (autobyteus-260) and the stored-name renames with backups (autobyteus-290); users who need to go back open an issue instead of installing an older version (RELEASE.md § Rollback);
  - MCP vault moves are user-triggered with a backup first, and going back after a move needs the `mcps.json` backup restored first (autobyteus-244);
  - `list_available_nodes` is now `list_peer_nodes` (autobyteus-290).
- Sources:
  - the curated `release-notes.md` of seven beta-line tickets;
  - the handoff summaries of the other tickets archived since `v1.5.8` (28 in total);
  - the new app-data migrations (`project-task-titles`, `node-identity-file-name`, `memory-sync-source-id-names`, and the desktop and mobile saved-node conversions);
  - the advisory claims checked against autobyteus-248/249, which closed the two advisories `v1.5.8` listed as known.

## Deployment Steps

- No hosted deployment (RELEASE.md § Deployment). The server rollout is the Docker image. The user upgrades his nodes himself with `autobyteus-docker upgrade --all --tag latest`; delivery did not touch them.

## Environment Or Persisted-Data Transition Notes

- The release carries the beta line's app-data migrations (Task titles; node-vocabulary stored names with backups; desktop and mobile saved nodes). No migration is new in this release commit.
- Rollback: not supported after the migrations, as the notes say (RELEASE.md § Rollback): fix forward, or the user contacts support.

## Rollback Criteria

- A regression is fixed forward with `v1.5.10` (or a `1.5.10` beta). Desktop updates never downgrade. `:latest` and `:beta` only move forward.

## Final Status

- Verification complete (the release guide's checks): `Yes`
- Repository finalization complete: `Yes` (`3edb93687f`, release commit `bd91eeebb6`; this record in a docs commit on top)
- Release/deployment/rollout complete: `Yes`
  - `v1.5.9` is GitHub Latest with 17 of 17 assets;
  - all four workflows succeeded;
  - Docker `:1.5.9`, `:latest` and `:beta` are on one image, for amd64 and arm64.
- The user's nodes and app: not touched.
- Cleanup:
  - the release worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.9` and the local `codex/release-v1.5.9` and `finalize/release-v1.5.9` branches are removed after this record is pushed;
  - `origin/codex/release-v1.5.9` is kept as history;
  - `/tmp/ab319` is removed.
- Unresolved blocker: `None`
- Terminal package sent to the Solution Designer: `Yes` (`Delivery Completed`)
