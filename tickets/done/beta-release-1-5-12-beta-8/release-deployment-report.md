# Delivery / Release / Deployment Report — beta-release-1-5-12-beta-8 (autobyteus-431)

## Release / Publication / Deployment Scope

- `Release Requested`: a beta of everything merged on `personal` since `v1.5.12-beta.7` (`84596c87b8`), base `d785ded109`. No software change in this ticket.
- Included merges: autobyteus-427 (`ea3fbffc8e`, file link in a conversation opens on the phone), autobyteus-412 (`f3079ff2f8`, node card drops a passed update failure; updater files published after the server packages), autobyteus-416 (`432f9b09b3`, node web page and file security), autobyteus-426 round 1 (`a42dbca699`, phone and server follow-ups), autobyteus-425 (`6225a734a3`, records only), plus delivery records and docs, including RELEASE.md.
- The user's words (2026-11-08): "we need a new beta now. If any runtime has token limit, I waive for that, we just need the new beta".

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `d785ded109` (last changed in `df789a89a5`, autobyteus-412: updater files after the server packages, the createdAt check, recovery for missing server packages).
- Deviations from the guide and why: `None`.
- Proposed guide fixes, and whether the user agreed: `None`. The new publish order behaved as the guide describes (below).

## Handoff Summary

- Handoff summary artifact: N/A for a release request (the request is `handoff-release-requested.md`).
- Delivery revision record: `tickets/done/beta-release-1-5-12-beta-8/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Base checked: `origin/personal` @ `d785ded109` (fetched with tags), which is also the worktree's head. Nothing to integrate; no software change.
- `origin/personal` was fetched again before the release push and was still `d785ded109`.

## Verification (the release guide's checks)

Checks before tagging, on `d785ded109` (branch `finalize/beta-release-1-5-12-beta-8`):

| Check | Result |
| --- | --- |
| `python3 scripts/check_licensing.py` | `Licensing is consistent.` (7968 tracked files scanned) |
| `python3 scripts/check_repository_artifact_hygiene.py` | `Repository artifact hygiene check passed.` |
| `scripts/check_secrets.sh v1.5.12-beta.7..HEAD` | 71 commits, `PASS (no secrets found)` |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0, exit 0 |
| `python3 scripts/release_smoke.py` | Claude 3/3, Grok 3/3, Antigravity 2/2 (suite 10/10), AutoByteus 2/2 (suite 4/4) pass. Codex 3/3 refused by its usage limit, waived (below). No other test failed. [evidence/DEL-01-release-smoke-summary.txt](evidence/DEL-01-release-smoke-summary.txt) |

Smoke models: `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.5 (pinned grok-4.7 not offered)"}`.

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| Release smoke, codex ×3 | Platform (provider quota) | `"You’ve hit your usage limit … try again at Nov 10th, 2026 …"` | Waived: the user's "If any runtime has token limit, I waive for that" (2026-11-08), which covers only quota/token-limit refusals | Waived |
| Release pipelines | — | none failed | — | — |

## Release Decision

- Decision: `Beta`
- Decided by: the user (quoted above), Task autobyteus-431, through the Project Task Manager and the Solution Designer.

## Docs Sync Result

- N/A for a release request: no software change.

## Ticket State Transition

- Ticket recorded at `tickets/done/beta-release-1-5-12-beta-8`: `Yes`

## Version / Tag / Release Commit

- Version: `1.5.12-beta.8` (`python3 scripts/release_versions.py next-beta`; the next beta after the highest stable `v1.5.11`).
- Release commit: `a1ea19c0eb` `chore(release): bump workspace release version to 1.5.12-beta.8`, from `bash scripts/desktop-release.sh beta --branch finalize/beta-release-1-5-12-beta-8 --no-push` on a clean tree. The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` were deleted first, and the handoff file was moved aside.
- Tag: annotated `v1.5.12-beta.8` on `a1ea19c0eb`.
- Push: `d785ded109..a1ea19c0eb HEAD -> personal`; `[new tag] v1.5.12-beta.8`.

## Repository Finalization

- Finalization target: `origin/personal`. The release commit was pushed as above. This record follows as a `docs(delivery)` commit after the Secret Gate.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide` (Cutting The Release; Watching The Rollout, with the four runs watched together)
- Pipelines triggered and their results:

| Run | Workflow | Result |
| --- | --- | --- |
| 42439486551 | Android APK Release | success |
| 42439486545 | iOS App Store Connect Release | success (archive and upload to App Store Connect) |
| 42439486629 | Server Docker Release | success (image; server packages linux/amd64 and linux/arm64) |
| 42439486570 | Desktop Release | success (five builds; Publish GitHub Release, including "Wait for the server packages" and "Publish the desktop updater files") |

- Published artifacts checked against what the release should produce:
  - `gh release view v1.5.12-beta.8`: `isPrerelease: true`, not a draft, **23/23 assets**. Desktop installers (macOS arm64 and x64 `.dmg`/`.zip` with blockmaps, Linux x64 and arm64 AppImages, Windows `.exe`), four `latest*.yml`, the APK and its `.sha256`, and six server package files.
  - **createdAt check (autobyteus-412 AC-005), first tag with the new order:** passes. The six `autobyteus-server-*` files were created 03:24:32Z…03:24:46Z, and all four `latest*.yml` at 03:25:17Z, so every `latest*.yml` is newer than every server package file ([evidence/DEL-02-asset-createdAt-order.tsv](evidence/DEL-02-asset-createdAt-order.tsv)). Observed timing: the desktop binaries went up at 03:06:07Z, "Wait for the server packages" waited about 19 minutes (the multi-arch image build finished about 03:18 and the package jobs started at 03:19:32Z), and the updater files followed 31 s after the last package file. That is within the 60-minute limit.
  - Docker Hub: `autobyteus/autobyteus-server:1.5.12-beta.8` and `:beta` have the same digest (`sha256:72b6f46a996b…`). `:latest` = `1.5.11` (`sha256:28042aca8bc7…`), unchanged. The user's Docker nodes were not touched.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`. The tickets in the release (`git log --first-parent v1.5.12-beta.7..HEAD`) are 427, 412, 416, 426 round 1 and 425. Only 416 has a `## What you need to do` section; 427, 412 and 426 round 1 have none, and 425 is records only. After all four runs succeeded, the generated notes got a `## What you need to do` section above them (`gh release edit --notes-file`). It holds a first line asking users to update their nodes (`autobyteus-docker update --all` for the beta track), then 416's two items, `AUTOBYTEUS_ALLOWED_HOSTS` and `AUTOBYTEUS_ALLOWED_ORIGINS`, verbatim from `tickets/done/node-web-page-and-file-security/release-notes.md` (identical to the records copy the request named). Published body: [evidence/DEL-03-published-beta-notes.md](evidence/DEL-03-published-beta-notes.md).

## Post-Finalization Cleanup

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-1-5-12-beta-8`: removed after this record was pushed (`git worktree remove`, `git worktree prune`).
- Local branches `codex/beta-release-1-5-12-beta-8` and `finalize/beta-release-1-5-12-beta-8`: deleted.
- Remote branches: none created (the record goes straight to `personal`).
- Temporary files `/tmp/beta8-delivery`: removed. No test app instances were started.

## Rollback Criteria

- Revert the merges on `personal` and cut the next beta. Desktop updates never downgrade, and `:beta` only moves forward. The included tickets change no stored data (416 and 426 notes: "Rolling back is possible").

## Final Status

- Verification complete (the release guide's checks): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (4/4 workflows, 23/23 assets, createdAt order correct, `:beta` moved, `:latest` unchanged, user actions in the notes)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`
