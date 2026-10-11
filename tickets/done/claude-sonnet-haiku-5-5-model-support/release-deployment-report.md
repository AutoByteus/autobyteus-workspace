# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

- Ticket `claude-sonnet-haiku-5-5-model-support`: Claude Sonnet 5.5 and Haiku 5.5 in autobyteus-ts, with an exact-value Anthropic request policy.
- Classification (SR-007): task_size `Small`, architectural_risk `Low`, direct route.
  - Architecture review: `N/A — not applicable`.
  - Test-code review: `Not Required`.
  - The user-requested independent code review CRR-001 was addressed by SR-007, IR-002 and API-REV-003.
  - Delivery did not reclassify.
- Repository finalization into `origin/personal`, then the new stable release `v1.5.1`, both requested by the user with the verification.
- Current delivery revision: `DR-004`. Evidence for this round is in `delivery-evidence/dr-004/`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/claude-sonnet-haiku-5-5-model-support/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/claude-sonnet-haiku-5-5-model-support/delivery-revision-record.md`
- Current delivery revision ID: `DR-004`

## Initial Delivery Integration Refresh (DR-003)

- Bootstrap base: `origin/personal` @ `ff227eb72`. The IR-002 rebase brought the branch onto `228cd9b5e`, which API-REV-003 then validated.
- At DR-003 the base was unchanged (`Already current`). The delivery docs commit was `2aa2a6062`.

## Post-Verification Re-Integration (DR-004)

- Target re-fetched after verification: `origin/personal` had moved to `96da4ba32`.
  - That commit adds only files under `tickets/done/delegated-copy-task-locator/` (the beta.3 delivery records).
  - No code, docs or tests outside that folder changed.
- Delivery-owned edits protected before re-integration: `Yes`. The docs were already committed in `2aa2a6062`, and the ticket folder was untouched by the merge.
- Integration method: merge `origin/personal` into the ticket branch, giving `80b3ef38b`, with no conflicts.
- Post-integration checks, logged in `delivery-evidence/dr-004/post-integration-check.log`:
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/llm`: 74 files, 524/524 passed.
  - `tsc -p tsconfig.build.json --noEmit`: clean.
- Renewed user verification: `Not required`. The handoff state did not change in any user-facing way.

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Reference: `user-verification.md`. On 2026-10-11 the user wrote: "verified finaliize and release a new stable version."

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Result: `Updated`, committed in `2aa2a6062`:
  - `token_usage.md` (CR-005)
  - `secret_management.md` (D-SR7-6)
  - `provider_model_catalogs.md` (rewrap)
- `TESTING.md`: origin's version, unchanged.

## Ticket State Transition

- Ticket moved to `tickets/done/claude-sonnet-haiku-5-5-model-support`: `Yes`, in archive commit `6530910b1`. The folder had been untracked until then.
- Pre-commit scan of the 69 files:
  - no credentials, no Windows-invalid names;
  - longest path 117 characters;
  - the two files over 5 MB follow existing evidence precedent.

## Repository Finalization

- Bootstrap context source: `solution-handoff.md`. Base and target are both `origin/personal`.
- Ticket branch commit result: `Completed`. The ticket commits are, in order:
  - `bc1777e02`
  - `68269cfae`
  - `b38d0a909`
  - `31132efcf`
  - `2aa2a6062`
  - `80b3ef38b`
  - `6530910b1`
- Ticket branch push result: `Completed`. New branch `origin/codex/claude-5-5-model-support` @ `6530910b1`.
- Target branch update: a temporary clean worktree, `autobyteus-worktrees/release-v1.5.1`, was created at `origin/personal@96da4ba32`. The main checkout was not touched.
- Merge into target result: `Completed`.
  - `--no-ff` merge `5c5404a00`. Its tree is identical to the verified branch (`git diff --quiet`).
  - The checks are logged in `delivery-evidence/dr-004/finalization-hygiene.log`:
    - licensing: 0
    - artifact hygiene: 0
    - Windows-invalid tracked paths: 0
- Push target branch result: `Completed`: `96da4ba32..5c5404a00 HEAD -> personal`.
- Repository finalization status: `Completed`

## Version / Tag / Release Commit

- Version choice: the highest stable tag was `v1.5.0`, and the betas were `v1.5.1-beta.1..3`. The stable release is therefore `v1.5.1`.
  - `release_versions.py android-version-code 1.5.1` returns `10050199`, which is accepted.
- Release notes: `release-notes-v1.5.1.md`, curated to cover everything merged since `v1.5.0`:
  - this ticket
  - delegated-copy-task-locator
  - collapsed-left-panel-expand-keeps-run
  - the Server Docker gzip installer fix
- Command, run in the temporary worktree: `bash scripts/desktop-release.sh release 1.5.1 --release-notes tickets/done/claude-sonnet-haiku-5-5-model-support/release-notes-v1.5.1.md --branch release-v1.5.1 --no-push`
- Release commit `c3ced6563`: `autobyteus-web/package.json` 1.5.1-beta.3 → 1.5.1, and the notes synced to `.github/release-notes/release-notes.md`.
- Pushes, made after re-checking that `personal` was still `5c5404a00`:
  - `5c5404a00..c3ced6563 HEAD -> personal`
  - tag `v1.5.1`
  - Log: `delivery-evidence/dr-004/v1.5.1-release.log`

## Release / Publication / Deployment

- Applicable: `Yes`. The user requested a stable release.
- Method: `Release Script` (`scripts/desktop-release.sh release`) plus the workflows the tag push triggers.
- Workflows, all `success` on attempt 1 at `c3ced6563` (`delivery-evidence/dr-004/workflows-v1.5.1.json`):

  | Workflow | Run | Result |
  | --- | --- | --- |
  | Desktop Release | `38131984986` | success |
  | Android APK Release | `38131985001` | success |
  | iOS App Store Connect Release | `38131984998` | success |
  | Server Docker Release | `38131985046` | success |

- GitHub release `v1.5.1` (`delivery-evidence/dr-004/github-release-v1.5.1.json`):
  - It is **Latest**: `releases/latest` = `v1.5.1`.
  - It is not a pre-release and not a draft. Published 2026-10-11T10:32:06Z.
  - It has 17 assets:
    - macOS arm64/x64 dmg and zip, with blockmaps
    - the Windows exe
    - Linux x64/arm64 AppImage
    - the Android APK and its sha256
    - 4 `latest*.yml` files
  - Its body is the curated notes.
- Updater metadata: all four `latest*.yml` report `version: 1.5.1` (`delivery-evidence/dr-004/v1.5.1-updater-metadata/`).
- Docker: `autobyteus/autobyteus-server` `:1.5.1`, `:latest` and `:beta` share `sha256:725e2ca8…f01a` (amd64, arm64) (`delivery-evidence/dr-004/v1.5.1-docker-tags.txt`).
  - The build log shows "Installed agy: 1.3.3" on both architectures and no "cannot execute binary" (`docker-v1.5.1-agy-excerpt.log`).
- Release helper after the release: `release_versions.py next-beta` gives `1.5.2-beta.1`.
- Release/publication/deployment result: `Completed`

## Post-Finalization Cleanup

- Ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support`: removed with `git worktree remove --force`, then pruned.
  - The only untracked files were the SDK `dist/` build outputs.
  - None of the 4 running isolated instances came from this worktree.
  - Log: `delivery-evidence/dr-004/cleanup.log`.
- Local branch `codex/claude-5-5-model-support` (`6530910b1`): deleted after confirming that `origin/personal` contains it.
- Remote branch `origin/codex/claude-5-5-model-support`: kept as a review reference.
- Temporary worktree `release-v1.5.1` and its branch: removed right after this records commit is pushed.
- Not touched: the main checkout, other worktrees, and their isolated instances.

## Environment Or Persisted-Data Transition Notes

- Persisted-data decision: `Not Affected`. The change adds new catalog rows, and stored run prices are never recalculated.
- Delivery action required: `None`

## Rollback Criteria

- Revert `c3ced6563` and `5c5404a00` on `personal` if an existing Claude model's request shape regresses (provider 400s on Opus 5.5, Sonnet 5, Fable or Sonnet 4.6) or if existing Token Meter prices change.
- Supersede `v1.5.1` with a new release. There is no data migration.

## Follow-Ups (non-blocking)

- `scripts/check_repository_artifact_hygiene.py` still does not reject Windows-invalid path characters. Delivery checked for them separately this round.
- The residual risks carried from API-REV-003 are listed in `handoff-summary.md`.

## Final Status

- Explicit user testing/verification complete: `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (`v1.5.1` fully published)
- Applicable safe cleanup complete or not required: `Yes`. The temporary release worktree is removed after the records push.
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: recorded in `delivery-revision-record.md` DR-004.
