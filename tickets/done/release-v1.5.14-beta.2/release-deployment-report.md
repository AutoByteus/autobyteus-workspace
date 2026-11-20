# Release Report — beta v1.5.14-beta.2 (Task autobyteus-563)

## Result: Released (tagged, all four workflows succeeded, 27 of 27 assets, GitHub pre-release). The first attempt was a partial release for about 1 hour 20 minutes (see Failures).

## Release Decision
- `Beta`, authorized by the founder on 2026-11-19 through the project task manager and the Solution Designer: "Let's release a beta version please. Waive for grok is we don't have usage limits for grok." Addendum from the Solution Designer: the waiver covers a usage-limit failure only; any other Grok failure goes to the Solution Designer first.
- Version `v1.5.14-beta.2` (`python3 scripts/release_versions.py next-beta`; previous `v1.5.14-beta.1`), cut from the latest `origin/personal` @ `422a2955c5`.

## Project Release Guide
- `RELEASE.md` on `origin/personal` @ `422a2955c5` (read from the integrated worktree): checks before tagging (licensing, hygiene, Secret Gate, release smoke), no build-only run before a tag, the script that now records the released migration order, the four workflows, 23 assets plus the Linux sidecars, recovery. Deviations: none. Proposed guide fixes: FU-2 (a preflight line for the production desktop trust).

## Contents
- 223 commits since `v1.5.14-beta.1` (it is an ancestor of `422a2955c5`). Five tickets add a folder under `tickets/done` in the range, each with release notes: `send-on-unbound-stream` (540), `ubuntu-appimage-sandbox-startup` (5), `interrupt-idempotent-stop` (533), `journal-omit-agy-schema-reads` (560), `follow-ups-of-461-500`. The merge of the previous beta's records (autobyteus-538, `914eb36577`) is also in the range.
- The release commit `a728fbcad3` also records two new app-data migrations in `released-migration-order.json`: `20261119_delegated_run_own_attachment_links` and `20261119_delegated_run_own_attachment_links_after_task_agent_own_run`.

## Checks before tagging (clean worktree on `422a2955c5`, frozen install, `prebuild`)
| Check | Result |
| --- | --- |
| `check_licensing.py`, `check_repository_artifact_hygiene.py` | pass (`evidence/delivery/pretag-checks.log`) |
| `scripts/check_secrets.sh v1.5.14-beta.1..HEAD` (223 commits) | PASS |
| Release smoke, first run | 12 of 13: Claude 3 of 3 (haiku), Codex 3 of 3 (`gpt-5.6-luna`), Antigravity 2 of 2, AutoByteus 2 of 2, Grok 2 of 3. Fallback model `grok-4.5 (pinned grok-4.7 not offered)` |
| Release smoke, rerun with `GROK_E2E_MODEL=grok-4.7` | **13 of 13**, models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`, live 279 s |

## Grok decision: no waiver was needed
- First run: `grok · brand-new team member` failed with `RUN_MODEL_NOT_OFFERED: designer can't start: its saved model 'grok-4.5' is not offered by Grok Build now` — not a usage limit, so under the addendum it was not waived and went to the Solution Designer with the cause analysis. Cause: the Grok CLI's offered-model list changes between calls; the smoke script resolved its fallback once, then the product's start-time model check (autobyteus-461/500, correct behaviour) found `grok-4.5` no longer offered. The failure is in the check, not the product (FU-1).
- The founder's decision: rerun once; waive only if the instability recurs. The rerun passed 3 of 3 on `grok-4.7`. `grok models` captured before the rerun (twice) and after it showed only `grok-4.7` (default), logged in (`evidence/delivery/grok-models-captures.txt`). The Solution Designer separately saw the login line flicker ("not authenticated" once, then "logged in"); it did not recur in my captures.

## Cutting the release
- `bash scripts/desktop-release.sh beta --branch finalize/release-1514-2 --no-push`: release commit `a728fbcad3` (`autobyteus-web/package.json` to `1.5.14-beta.2` and the recorded migration order), annotated tag `v1.5.14-beta.2`; `origin/personal` was still `422a2955c5`; pushed `422a2955c5..a728fbcad3` to `personal`, then the tag, 2026-11-20 about 06:12Z.

## Failures: triage, action, result
| Job | Classification | Log line | Action | Result |
| --- | --- | --- | --- | --- |
| Desktop Release `44685600710` → Build Linux x64 and Build Linux ARM64 (first attempt, step "Prepare desktop public trust or disposable build-only identity") | **Ours (configuration)**: the same commit would fail again until the repository variable is set; not the runner or a service | `Error: Production desktop public anchor is not provisioned` at `scripts/desktop-package/prepare-build-trust.mjs:13`, with `DESKTOP_TRUST_MODE: production` and `DESKTOP_RELEASE_PUBLIC_KEY:` empty | The `Sign authenticated Linux desktop releases` and `Publish GitHub Release` jobs were skipped; the release was partial (Android, iOS, Docker published). Escalated to the Solution Designer with the log and the RELEASE.md rule (a missing trust anchor is a release blocker; no replacement production keys). Delivery did not create, set or read any key, secret or variable. The Linux team (Task 564) provisioned the repository variable and the `desktop-release-signing` environment | After that, `gh run rerun 44685600710 --failed` on the same commit: Linux x64 and ARM64 builds, the signing job and the publish job succeeded (evidence below) |
- macOS ARM64, macOS Intel and Windows succeeded on the first attempt. The macOS staple failure of earlier releases (clean-runner-build-order FU-4) did not recur.

## Rollout (tag push 2026-11-20)
| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 44685600660 | success |
| iOS App Store Connect Release | 44685600671 | success |
| Server Docker Release | 44685600694 | success (both architectures built natively, image and both server packages) |
| Desktop Release | 44685600710 | success after the rerun of the two Linux builds, then `Sign authenticated Linux desktop releases` success, then `Publish GitHub Release` success |

## Published artifacts, checked against `RELEASE.md`
- `gh release view v1.5.14-beta.2`: pre-release `true`, not a draft; **27 assets** (`evidence/delivery/published-assets.txt`).
- **Why 27 and not 23:** the guide's 23 are the Android APK and `.sha256`; Linux x64 and ARM64 AppImages; macOS ARM64 and x64 `.dmg`, `.zip` and blockmaps (8 files); the Windows `.exe`; `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`; and the signed server package per architecture (`.tar.gz`, `.json`, `.json.sig`, 6 files). The four extra files are the Linux signed release sidecars: `AutoByteus_personal_linux-<x64|arm64>-1.5.14-beta.2.AppImage.release.json` and `….release.json.sig`.
- **Order:** every `latest*.yml` (oldest 2026-11-20T07:33:20Z) is newer than all six `autobyteus-server-*` files (newest 06:16:11Z) (`asset-order.txt`).
- **GitHub Latest** stays on stable `v1.5.13`; `v1.5.14-beta.2` is marked pre-release.
- **Docker:** `autobyteus/autobyteus-server:beta` = `1.5.14-beta.2` = `sha256:320fccd5ee01…` (amd64 and arm64, pushed 2026-11-20 06:14Z); `:latest` = `1.5.13` = `sha256:13df73db926a…`, unchanged (`docker-tags.txt`). The image was not pulled or run.

## Linux build, signing and update metadata (for the Linux team's record)
- **Production builds:** Build Linux x64 and Build Linux ARM64 passed after the rerun, on commit `a728fbcad3`; the trust-preparation step accepted the provisioned public anchor (it failed before, with the variable empty).
- **Signing job** `Sign authenticated Linux desktop releases`: success; its step "Sign final AppImages and verify metadata against the embedded public anchor" passed. Log lines (`linux-signing-job.txt`): `Verified signed desktop release 1.5.14-beta.2 x64`, `Validated signing-artifacts/linux-x64/latest-linux.yml: linux-x64 AppImage metadata includes embedded blockMapSize`, and the same for arm64.
- **Metadata:** `latest-linux.yml` and `latest-linux-arm64.yml` list `version: 1.5.14-beta.2` and the AppImage with its `sha512`, `size` (360335650 and 350291736) and `blockMapSize` (375094 and 365156); their `releaseDate` is 2026-11-20T07:27:28Z and 07:28:00Z (`linux-metadata-and-sidecars.txt`).
- **Sidecars:** `*.AppImage.release.json` carries `format 1`, `product autobyteus-personal-desktop`, `os linux`, `arch`, `version 1.5.14-beta.2`, `channel beta`, `size`, `sha256`, `minWriter 1`; each `.sig` is 88 bytes. The sidecars' `sha256` values (`a5cf04ff…` x64, `70736600…` arm64) equal GitHub's digests of the published AppImages. The signature itself was verified by the workflow's signing job, not independently by me.
- No key, secret or variable was read, printed or changed by delivery.

## Release notes
- The notes begin with `## What you need to do` (update the app and every server node it connects to together (540); Ubuntu AppImage users need one administrator authorization at first install (5); the one-time journal re-render and attached-file link conversion happen on their own (560, 461/500)), followed by the generated changelog line, which appeared twice and now appears once. Tickets whose text was used: `send-on-unbound-stream`, `ubuntu-appimage-sandbox-startup`, `journal-omit-agy-schema-reads`, `follow-ups-of-461-500`. None of the tickets used the `## What you need to do` heading; the actions are taken from their notes' "Good to know" and "Upgrade Notes" text (FU-3). Edited with `gh release edit --notes-file` after all workflows succeeded and the assets were complete; the assets did not change.

## Rollback
- Desktop updates never downgrade; revert on `personal` and cut a new beta. Docker `:beta` only moves forward: pin `1.5.14-beta.1` to go back. The two attachment-link migrations keep a backup copy under `app-data-migration-backups`; going back to 1.5.13 reads the converted links (per autobyteus-461/500's notes).

## Final records, user's checkout and cleanup
- The release records (this folder) are merged to `origin/personal` by the commit that adds `tickets/done/release-v1.5.14-beta.2/`; the record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-beta.2-autobyteus-563-20261119/` with `archive.sha256`, the user's checkout update and the cleanup are done immediately after that commit; their results are in the record copy's `record-notes.md` and in the terminal message.

## Final Status
- Release complete: `Yes` (all four workflows succeeded; 27 of 27 assets).
