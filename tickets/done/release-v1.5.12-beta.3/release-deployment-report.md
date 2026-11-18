# Delivery / Release / Deployment Report — release v1.5.12-beta.3 (autobyteus-397)

## Release / Publication / Deployment Scope

A release request with no software change. The user asked the delivery engineer directly, in its own session. No Task or team relayed the request. The Project Task Manager recorded it afterwards as autobyteus-397. The user's words, verbatim (2026-11-06):

- First, in advance: "there will be a deliery request later, so i would like to have one new beta version. thanks a lot. i say this inadvance". Nothing was cut then.
- The request: "please release a new beta thanks".
- The waiver, after the smoke result: "wavie codex and grok please".

Docs sync, the handoff summary and verification from evidence do not apply. The release guide's checks are the verification.

- Final tag: **`v1.5.12-beta.3`** (annotated) on commit `dad7a89c95` (`chore(release): bump workspace release version to 1.5.12-beta.3`). The commit changes only `autobyteus-web/package.json`.
- Tip released: `origin/personal` **`2f2a361aac`**, plus the version bump. That tip passed the checks and the build-only run. `personal` did not move between the checks, the build-only run and the push.

## Project Release Guide

- Release guide followed: `RELEASE.md` at `origin/personal` `2f2a361aac` (last changed in `d6bcff577b`). It was read in the release worktree, not in the main checkout, which is 2023 commits behind and has an older guide.
- **The guide changed during the release.** Commit `7e87db8026` (dated 12:27 UTC, the user's decision of 2026-11-06) removed the build-only run before every tag and added "Triage every pipeline failure first". It reached `personal` after this release's tag push at 12:14 UTC. So this release still ran the build-only run under the old rule, as the new guide's own case study says: "releases tagged before this change reached `personal` (up to `v1.5.12-beta.3`) still followed the old rule". The steps after the tag (rollout watch, triage) follow the new guide. No pipeline failed, so no triage was needed.
- Other deviations: none.
- Proposed guide fixes: `None`.

## What The Tag Carries

From `git log --merges --first-parent v1.5.12-beta.2..2f2a361aac` (`evidence/REL-04-tag-contents.log`):

| Merge | Ticket |
| --- | --- |
| `8136e251c2` | autobyteus-387 deepseek-dsh-runtime-investigation: DeepSeek Harness as an agent runtime through the credential proxy's provider relay |
| `42c4ee95d1` | autobyteus-388 left-panel-follow-ups: the Projects view notices runs added or removed elsewhere within one poll |
| `b855fcca3f` | autobyteus-390 run-expand-motion: delegated rows in the Runs view show in place on expand, with no slide |

## Checks Before Tagging

All run on `2f2a361aac` (`evidence/REL-01`, `REL-02`, `REL-02a`, `REL-02b`, `REL-03`):

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: `Repository artifact hygiene check passed.`
- `scripts/check_secrets.sh v1.5.12-beta.2..HEAD`: `PASS (no secrets found)`, 67 commits. Also run on the bump commit (`origin/personal..HEAD`, 1 commit): PASS.
- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`: exit 0.
- `python3 scripts/release_smoke.py`: **10/13**, exit 1.
  - PASS: Claude 3/3, Grok 3/3, Antigravity 2/2, AutoByteus 2/2.
  - Models: `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.5 (pinned grok-4.7 not offered)"}`.
  - Codex 0/3: every case was refused by the ChatGPT account quota: "You've hit your usage limit. … try again at Nov 10th, 2026 10:31 AM." This is not a code failure.
  - **Runtime waiver, in the user's words verbatim:** "wavie codex and grok please" (2026-11-06). Scope: Codex and Grok, `v1.5.12-beta.3` only. Grok passed, so its waiver was recorded but not needed.
- Build-only release run `42213150758` (`pnpm release:test --ref personal`) on `2f2a361aac`: **success**. All five desktop targets built, and Publish was skipped as designed. This run was required by the guide in force at the time (see above).

## Release Notes

None of the three carried tickets has a `release-notes.md`, so there is no `## What you need to do` section. The beta has GitHub's generated notes only, and no notes edit was made.

## Version / Tag / Release Commit

- `python3 scripts/release_versions.py next-beta` → `1.5.12-beta.3`. The tag did not exist on the remote before.
- The untracked SDK `dist/` folders were deleted so the tree was clean. Then, on `finalize/release-v1.5.12-beta.3` from `origin/personal`: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.12-beta.3 --no-push` → commit `dad7a89c95` and annotated tag `v1.5.12-beta.3`.
- `personal` was fetched again (still `2f2a361aac`). Then `git push origin HEAD:personal` (`2f2a361aac..dad7a89c95`) and `git push origin v1.5.12-beta.3`, at 12:14:44 UTC.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Project Release Guide`.
- Pipelines (`evidence/REL-05-rollout.log`) were watched together, polled every minute, and set to stop on the first failure. All four succeeded:

| Workflow | Run | Finished (UTC) |
| --- | --- | --- |
| Desktop Release | `42216180889` | 12:43:32 |
| Android APK Release | `42216181031` | 12:21:02 |
| iOS App Store Connect Release | `42216181068` | 12:42:30 |
| Server Docker Release | `42216181097` | 13:12:04 |

- Published artifacts:
  - GitHub release `v1.5.12-beta.3`: pre-release, not a draft, published 12:20:52 UTC, **23/23 assets**:
    - macOS ARM64 and x64 `.dmg` and `.zip`, each with a blockmap
    - Linux x64 and ARM64 AppImages
    - the Windows `.exe`
    - four `latest*.yml` files
    - the Android APK and its `.sha256`
    - six `autobyteus-server-1.5.12-beta.3-linux-{arm64,x64}.{tar.gz,json,json.sig}` files
  - GitHub "Latest" is still `v1.5.11`.
  - Docker Hub `autobyteus/autobyteus-server`:
    - `:1.5.12-beta.3` = `sha256:9c5aa01bb2fc…`
    - `:beta` moved to the same digest (13:05 UTC)
    - `:latest` is unchanged: `sha256:28042aca8bc7…`, last updated 2026-11-02 (`v1.5.11`)
- Failed jobs: none, so no triage was needed.
- Release/publication/deployment result: `Completed`.

## What The User Should Check After Updating

- Desktop with **Settings > Updates > Receive beta updates** on: the app offers 1.5.12-beta.3, and after installing, Settings > Updates shows 1.5.12-beta.3.
- Docker nodes: `autobyteus-docker upgrade --all --tag beta`, or the node's in-place server update. The node then reports 1.5.12-beta.3.

## Repository Finalization

- Release commit on `personal`: `dad7a89c95` (above).
- This request's records are on `codex/release-v1.5.12-beta.3`, branched from the latest `origin/personal`. They are merged `--no-ff` into `personal` after the rollout, with the Secret Gate run on the merged state. Ticket folder: `tickets/done/release-v1.5.12-beta.3/`.

## Recovery And Rollback

- Never move or delete the published tag. A problem in the tag's content is fixed on `personal` and shipped as the next beta.
- Rollback: desktop updates never downgrade, and turning beta updates off waits for the next stable. Docker users pin an earlier version tag.

## Untested Scope

- Codex release smoke: 0/3 ran, because the account quota was exhausted (waived by the user).
