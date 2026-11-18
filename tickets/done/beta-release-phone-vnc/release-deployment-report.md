# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

autobyteus-419, a release request: the next beta, `v1.5.12-beta.6`, from `personal`. It carries:
- autobyteus-407: the node desktop on the phone and in a desktop browser (merge `eafc34b185`).
- autobyteus-415: the Android app keeps its page on rotation (merge `9d5da23341`).
- autobyteus-403: the Origin check and the phone-route guard (merge `6f69dfb52d`).

There is no software change, so docs sync, the handoff summary and Verify From Evidence do not apply. The release guide's checks are the verification.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `ff68bfb5fa`, read in the release worktree. It is unchanged since `v1.5.12-beta.5`.
- Deviations from the guide and why: `None`. To keep the worktree clean for the release script, the release folder (untracked) was moved aside while the script ran and put back afterwards. The tag sits on the smoke-checked commit plus the release commit.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `Not applicable` (release request)
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Release Decision

- Decision: `Beta`
- Decided by: the user, "lets go" (2026-11-07, quoted by the PM in `handoff-release-requested.md`).

## Checks Before Tagging

On `origin/personal` `ff68bfb5fa` (`evidence/DEL-01-checks-before-tagging.log`, `evidence/DEL-02-release-smoke.log`):

- `python3 scripts/check_licensing.py`: exit 0 (7894 tracked files scanned).
- `python3 scripts/check_repository_artifact_hygiene.py`: exit 0.
- `scripts/check_secrets.sh v1.5.12-beta.5..HEAD`: 32 commits, PASS.
- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`: exit 0.
- `python3 scripts/release_smoke.py`: exit 1, waived as below. Summary:

  ```
  claude      new run + restore, linked workspace      PASS
  claude      brand-new team member                    PASS
  claude      different same-named skill               PASS
  codex       (all three scenarios)                    FAIL    RUNTIME_ERROR "You've hit your usage limit … try again at Nov 10th, 2026"
  grok        new run + restore, linked workspace      PASS
  grok        brand-new team member                    PASS
  grok        different same-named skill               PASS
  antigravity brand-new run, linked workspace          PASS
  antigravity brand-new team member, linked workspace  PASS
  autobyteus  brand-new run, linked workspace          PASS
  autobyteus  brand-new team member, linked workspace  PASS
  commit    ff68bfb5fa14b4849acc317371575b349ae8a1dd
  models    {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.5 (pinned grok-4.7 not offered)"}
  result    FAIL
  ```

- **Waiver:** Codex, quota refusal only. The user's words at release time: "waive for codex thanks". Every Codex case failed on the usage limit, and no other runtime failed.

## Version / Tag / Release Commit

- `python3 scripts/release_versions.py next-beta` → `1.5.12-beta.6`.
- `bash scripts/desktop-release.sh beta --branch finalize/beta-release-phone-vnc --no-push` → release commit `c5c4bc8e4a` `chore(release): bump workspace release version to 1.5.12-beta.6` and the annotated tag `v1.5.12-beta.6`.
- `origin/personal` was fetched again and was still `ff68bfb5fa`. Pushed `ff68bfb5fa..c5c4bc8e4a`, then the tag.

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Pipelines triggered:
  - Desktop Release `42337530687`
  - Android APK Release `42337530709`
  - iOS App Store Connect Release `42337530735`
  - Server Docker Release `42337530688`

| Failed Run And Job | Classification | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| Desktop Release `42337530687`, Build macOS ARM64 (attempt 1) | Platform | `error is Error Domain=NSURLErrorDomain Code=-1005 "The network connection was lost."` (`api.apple-cloudkit.com` … `gk.ticket-delivery`); `Build process failed: Error: Failed to staple your application with code: 68`; `The staple and validate action failed! Error 68.` The other four desktop builds succeeded on the same commit. RELEASE.md names this pattern as a platform failure | `gh run rerun 42337530687 --failed` (attempt 2); the tag is unchanged | Attempt 2 succeeded: Build macOS ARM64 and Publish GitHub Release passed |

- Results, all watched together:
  - Android APK Release `42337530709`: success.
  - iOS App Store Connect Release `42337530735`: success.
  - Server Docker Release `42337530688`: success.
  - Desktop Release `42337530687`: success on attempt 2 (see the triage above).
- Published artifacts checked against what the release should produce:
  - GitHub release `v1.5.12-beta.6`: `isPrerelease: true`, 23 of 23 files:
    - macOS ARM64 and x64: `.dmg`, `.zip`, blockmaps;
    - Linux x64 and ARM64 AppImages;
    - the Windows `.exe`;
    - `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`;
    - `AutoByteus_personal_android-1.5.12-beta.6-release.apk` and its `.sha256`;
    - the server packages for `linux-x64` and `linux-arm64` (`.tar.gz`, `.json`, `.json.sig`).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.12-beta.6` and `:beta` both point to `sha256:a5faf256b24b81c46b29f1dba3b6741c417f3437edd0a4129d96d8ce7df7f96e`. `:latest` is unchanged (`sha256:28042aca…`, the stable release).
- The PM was told that `:beta` is published, as the request asked. The user updates his nodes himself, and they were not touched.
- Beta notes with a user action:
  - The release's tickets (`git log --merges --first-parent v1.5.12-beta.5..HEAD`): autobyteus-403, autobyteus-407 and autobyteus-415.
  - Sections used: 403 (`AUTOBYTEUS_ALLOWED_ORIGINS` for a gateway that rewrites the host name without `X-Forwarded-Host`) and 407 (update the Docker node). 415 has no user action.
  - 407's sentence "the Android app itself does not need an update" was adjusted for this combined release: the VNC Viewer needs no app update, but this release's APK carries the rotation fix (`evidence/DEL-03-beta-notes-user-actions.md`).
  - The section was put above the generated notes with `gh release edit … --notes-file` after all four runs succeeded. The tag and the files were unchanged.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`

## Escalation / Reroute

None. The one pipeline failure was the platform's and was fixed by a rerun.

## Rollback Criteria

- Never move or delete `v1.5.12-beta.6`. To back out a change, revert it on `personal` and cut the next beta.
- Desktop updates never downgrade. `:beta` only moves forward; a Docker user pins an earlier version tag to go back.
- 403 and 407 change no stored data.

## Post-Finalization Cleanup

- Release worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-phone-vnc`.
- Right after this record is pushed:
  - Remove and prune the worktree. Its untracked files are build output only.
  - Delete the local `codex/beta-release-phone-vnc` and `finalize/beta-release-phone-vnc` branches.
  - Delete the temp folder `/tmp/abx419`.
  - No test app instances or nodes were created by this release.

## Final Status

- Verification complete: `Yes`. The release guide's checks passed, with Codex waived on quota in the user's words.
- Repository finalization complete: `Yes` (release commit `c5c4bc8e4a` on `personal`)
- Applicable release/deployment/rollout complete: `Yes`. v1.5.12-beta.6: 4 of 4 workflows succeeded (Desktop after one platform rerun), 23 of 23 files, Docker `:beta` moved, PM told.
- Applicable safe cleanup complete or not required: right after this record is pushed (above)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
