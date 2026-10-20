# Delivery / Release / Deployment Report

Ticket `stable-release-v1-5-7` (autobyteus-213). Stable release **v1.5.7**. Delivery revision `DR-001`. Result: **Delivery Completed**.

## Release / Publication / Deployment Scope

- Release the `origin/personal` tip as stable v1.5.7, with the curated notes since v1.5.6.
- Requested by the user, 2026-10-20: "release the latest … whatever on the personal", and "please release a stable version for me now thanks a lot".

## Project Release Guide

- Release guide: `RELEASE.md` (Stable), as on `origin/personal` @ `9227d61597`
- Deviations from the guide and why: `None`
- Proposed guide fixes: `None`

## Candidate And Integration

- Candidate: `origin/personal` @ `9227d61597` at cut time, fetched again just before the push. It is v1.5.7-beta.4 plus the MCP Bulk Import fix (merge `b70caf79c8`) plus delivery records. That fix is the only product change since `v1.5.7-beta.4` (`git log --first-parent v1.5.7-beta.4..9227d61597`), and the notes cover it.
- Ticket branch `codex/stable-release-v1-5-7` (ticket documents only; archived to `tickets/done/`) @ `dd7feca55d`, pushed.
- Finalize branch from `origin/personal`; `--no-ff` merge `bcb8517271`.
- Checks on the merged state: `python3 scripts/check_licensing.py` exit 0; `python3 scripts/check_repository_artifact_hygiene.py` exit 0; worktree clean.
- No post-integration product rerun: this ticket changes no product code, and the candidate is the already-finalized `personal` tip, each change validated by its own ticket.

## Verification

- Evidence judged: `Sufficient`. This is a release ticket; its criteria are the published results below. No user check needed.

| AC | How It Was Checked | What Was Seen | Judgement |
| --- | --- | --- | --- |
| AC-001 | `gh release view v1.5.7 --json isPrerelease,isDraft,assets`; `gh api repos/AutoByteus/autobyteus-workspace/releases/latest` | `pre: false`, `draft: false`, 17 assets; `releases/latest` = `v1.5.7` | Proven |
| AC-002 | `gh run watch --exit-status` on each run | Desktop Release `39370798640`, Android APK Release `39370798684`, iOS App Store Connect Release `39370798666`, Server Docker Release `39370798660`: all `success` | Proven |
| AC-003 | `git merge-base --is-ancestor v1.5.7 origin/personal`; `git diff --name-only 9227d61597 v1.5.7` | The tag commit `79b638e787` is on `personal`. Outside `tickets/`, the diff touches only `.github/release-notes/release-notes.md` and `autobyteus-web/package.json` (version `1.5.7`). The product commits since beta.4 are the MCP Bulk Import fix only | Proven |
| AC-004 | `gh release view v1.5.7 --json body` compared with the archived `release-notes.md` | Identical apart from one trailing newline GitHub adds. No internal IDs, review rounds or paths (grep for `AC-`, `REQ-`, `DEC-`, `autobyteus-<n>`, `tickets/`: none) | Proven |
| AC-005 | Read the body | "Before You Update": back up first; a one-way conversion; no installing an older version; support pointer (GitHub issues); update the app and nodes together. Upgrade Notes: Docker `:1.5.7`/`:latest`/`:beta`, back up the volume | Proven |
| AC-006 | `docker buildx imagetools inspect autobyteus/autobyteus-server:{1.5.7,latest,beta}` | All three are digest `sha256:821e777d8e88b348d983b4febae70a87e2eb61784f3dd3118704e7886ffcdae4` with `linux/amd64` and `linux/arm64` | Proven |
| AC-007 | Release assets; `gh release download v1.5.7 -p latest-mac.yml` / `latest.yml` | `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml` present, `version: 1.5.7`. `AutoByteus_personal_android-1.5.7-release.apk.sha256` present | Proven |
| AC-008 | This record on `origin/personal`; cleanup below | See Repository Finalization and Cleanup | Proven |

## Release Decision

- Decision: `Stable` v1.5.7
- Decided by: the user (words above)

## Version / Tag / Release Commit

- `bash scripts/desktop-release.sh release 1.5.7 --release-notes tickets/done/stable-release-v1-5-7/release-notes.md --branch finalize/stable-release-v1-5-7 --no-push`
- Release commit `79b638e787` (`autobyteus-web/package.json` 1.5.7; `.github/release-notes/release-notes.md` byte-identical to the archived notes). Annotated tag `v1.5.7` (object `edd713541b`).
- `python3 scripts/release_versions.py android-version-code 1.5.7` = `10050799` (within the limits)

## Repository Finalization

- `origin/personal` was unchanged at `9227d61597` just before `git push origin HEAD:personal` (→ `79b638e787`), then `git push origin v1.5.7`.
- After the tag, `origin/personal` advanced with an unrelated ticket (test-vault-developer-experience, `89741cecec`..`e34adf6b0f`). It is not part of v1.5.7 and ships with the next release. This record was committed on top of that tip.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Method: `Project Release Guide`
- Pipelines: all four succeeded (AC-002)
- Published artifacts checked: 17 assets (Android APK and `.sha256`; Linux x64/ARM64 AppImages; macOS ARM64/x64 `.dmg`/`.zip` and blockmaps; Windows `.exe`; four `latest*.yml`). Docker as in AC-006. iOS: the TestFlight upload workflow succeeded.
- Result: `Completed`
- Release notes handoff: `Used` (`tickets/done/stable-release-v1-5-7/release-notes.md`)

## Post-Finalization Cleanup

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-7`: removed after this record is pushed, then `git worktree prune`
- Local branches `codex/stable-release-v1-5-7`, `finalize/stable-release-v1-5-7` and `record/stable-release-v1-5-7`: deleted after a containment check against `origin/personal`
- Remote ticket branch: kept, as for earlier tickets

## Rollback Criteria

- No rollback: v1.5.7 carries the delegated-copy data migration. The notes tell users to back up, not to install an older version, and to open an issue instead. Problems are fixed forward.

## Informational Items From The Handoff

- The user's own Docker node (localhost:8001) update, and his check of the sudden-shutdown restore fix: no answer recorded yet. Not blocking.

## Final Status

- Verification complete: `Yes`
- Repository finalization complete: `Yes`
- Release complete: `Yes`
- Safe cleanup: `Completed` (see above)
- Unresolved blocker: `None`
- Terminal package sent to `/solution_designer`: `Yes`
