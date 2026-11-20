# Release Report — beta v1.5.14-beta.3 (Task autobyteus-570)

## Result: Released (tagged, all four workflows succeeded on the first attempt, 27 of 27 assets, GitHub pre-release; iOS uploaded to TestFlight)

## Release Decision
- `Beta`, authorized by the founder on 2026-11-20 through the project task manager and the Solution Designer: "If the iOS demo mode is finished we should release". He confirmed this means a beta so the iOS Demo Mode build goes to TestFlight automatically, not a submission to Apple App Review.
- Version `v1.5.14-beta.3` (`python3 scripts/release_versions.py next-beta`; previous `v1.5.14-beta.2`), cut from the latest `origin/personal` @ `67b85023b2`, which had not moved.

## Project Release Guide
- `RELEASE.md` on `origin/personal` @ `67b85023b2` (unchanged since beta.2): checks before tagging (licensing, hygiene, Secret Gate, release smoke), no build-only run before a tag, the four workflows, 27 assets, recovery. Deviations: none, apart from the recorded Grok waiver below.

## Contents
- 37 commits since `v1.5.14-beta.2` (an ancestor of `67b85023b2`). One ticket: `ios-demo-mode-279` (iOS Demo Mode: Try demo, the Android-style start screen, Share to AutoByteus, iPad two panes, Download; phone follows the reply after a send, read-only artifacts, bundled icons), plus the beta.2 release records. The only workflow change is `.github/workflows/release-ios.yml`: it installs pnpm and Node and builds the bundled demo (`autobyteus-ios/scripts/prepare-demo-web.sh --build`) before the iOS build.
- The release commit `fa6632cbca` only bumps `autobyteus-web/package.json`; no new app-data migration.

## Checks before tagging (clean worktree on `67b85023b2`, frozen install, `prebuild`)
| Check | Result |
| --- | --- |
| `check_licensing.py`, `check_repository_artifact_hygiene.py` | pass (`evidence/delivery/pretag-checks.log`) |
| `scripts/check_secrets.sh v1.5.14-beta.2..HEAD` (37 commits) | PASS |
| `python3 scripts/release_smoke.py` | 10 of 13: Claude 3 of 3 (haiku), Codex 3 of 3 (`gpt-5.6-luna`), Antigravity 2 of 2, AutoByteus 2 of 2, **Grok 0 of 3** (waived, below); models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}` |

## Grok waiver
- **Failure:** all three Grok scenarios failed with `ACP_REQUEST_TIMEOUT: initialize did not respond in time` (`AgentCreationError` for two, `COLLABORATION_AGENT_ACTIVATION_FAILED` for the team member). Not a usage limit, so under the standing rule it was not waived by delivery: it was reported to the Solution Designer, who asked the founder.
- **Founder's decision, in his words:** "Waive for grok." — the Solution Designer relayed it with the instruction to waive without a rerun.
- **Cause:** Grok's ACP `initialize` handshake answered after 16.5, 34.6 and 31.4 seconds (three direct timings of `grok agent --no-leader stdio` at load average about 42, CLI 1.0.89) against the server's 30-second limit (`INITIALIZE_TIMEOUT_MS`, `acp-client-connection.ts:28`), while `grok-4.7` was offered and Grok was logged in (`grok models` twice before the run). `grok --version` answers in 0.01 s. The handshake is slower than in the beta.1 records (older CLI, load about 52: 15.2, 3.2 and 4.6 s). The cause is not established: the CLI version, the machine load, or both. The product code under test did not change in this range.
- **Measurements:** `evidence/delivery/grok-initialize-timing-and-models.txt`; the failure lines: `release-smoke-run1-grok-failure-lines.txt`; the smoke summary: `release-smoke-run1-summary.log`.
- **The other runtimes:** 10 of 10 passed.
- Follow-ups FU-1 and FU-2 (this folder).

## Cutting the release
- `bash scripts/desktop-release.sh beta --branch finalize/release-1514-3 --no-push`: release commit `fa6632cbca`, annotated tag `v1.5.14-beta.3`; `origin/personal` was still `67b85023b2`; pushed `67b85023b2..fa6632cbca` to `personal`, then the tag, 2026-11-20 about 10:34Z.

## Failures
- None. All four workflows succeeded on the first attempt, with no rerun. The Linux production trust step (Task 564) passed; the macOS staple failure of earlier releases did not recur; GitHub gave runners to all jobs.

## Rollout (tag push 2026-11-20)
| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 44721148801 | success |
| iOS App Store Connect Release | 44721148794 | success (uploaded to TestFlight, see below) |
| Server Docker Release | 44721148805 | success |
| Desktop Release | 44721149038 | success (all five builds, the Linux signing job, the publish job) |

## iOS TestFlight upload (only; nothing was submitted to Apple App Review)
- Marketing version `1.5.14`, build number `343` (`MARKETING_VERSION=1.5.14`, `CURRENT_PROJECT_VERSION=343`; the workflow summary prints `iOS marketing/build: 1.5.14 (343)`).
- Steps: Build the bundled demo (the new step) success; Archive and export signed IPA success; Upload IPA to App Store Connect/TestFlight success.
- Upload result from the log: `UPLOAD SUCCEEDED with no errors, 1 warning`, Delivery UUID `0d5f2eb6-2742-4470-98bf-239b5606bce7`. The one warning is informational: "SDK version issue. This app was built with the iOS 26.2 SDK. Starting April 2027, iOS and iPadOS apps must be built with the iOS 27 SDK or later".
- The workflow's own summary states: "This workflow uploads to App Store Connect/TestFlight only. It does not submit for final App Store review or public release." Whether the build is processed and visible to testers in TestFlight, and its review state, were not checked (they are in App Store Connect, not in the workflow).
- Beta.2 had `1.5.14` build 342.

## Published artifacts, checked against `RELEASE.md`
- `gh release view v1.5.14-beta.3`: pre-release `true`, not a draft; **27 assets** (23 plus the four Linux signed-release sidecars `.AppImage.release.json` and `.release.json.sig`, as in beta.2) (`published-assets-and-order.txt`).
- **Order:** every `latest*.yml` (oldest 2026-11-20T11:10:07Z) is newer than all six `autobyteus-server-*` files (newest 10:48:48Z).
- **GitHub Latest** stays on stable `v1.5.13`; `v1.5.14-beta.3` is marked pre-release.
- **Docker:** `autobyteus/autobyteus-server:beta` = `1.5.14-beta.3` = `sha256:76b666e35af0…` (amd64 and arm64); `:latest` = `1.5.13` = `sha256:13df73db926a…`, unchanged (`docker-tags.txt`). The image was not pulled or run.
- **Linux:** the signing job succeeded (`Verified signed desktop release 1.5.14-beta.3 x64` and `arm64`; the metadata validated with embedded blockMapSize). The sidecars' `sha256` and `size` equal GitHub's digest and size of the published AppImages for both architectures; both `.sig` are 88 bytes; the signature itself was verified by the signing job, not independently by me (`linux-signing-job.txt`, `linux-metadata-and-sidecars.txt`).

## Release notes
- The body begins with `## What you need to do`: update from TestFlight to 1.5.14 (343) for Try demo (a TestFlight beta, nothing goes to App Review); a computer saved without a name shows as "AutoByteus node" until its QR code is scanned again; nothing else for the desktop app, Android or nodes. The generated changelog line, which appeared twice, appears once. Source: `tickets/done/ios-demo-mode-279/release-notes.md` (no `## What you need to do` heading of its own; the actions are taken from its "Computers saved in an earlier version" bullet and the iOS bullets). Edited with `gh release edit --notes-file` after all workflows succeeded; the assets did not change.

## Rollback
- Desktop updates never downgrade; revert on `personal` and cut a new beta. Docker `:beta` only moves forward: pin `1.5.14-beta.2` to go back. A TestFlight build cannot be recalled by delivery; testers can install the previous build (342) from TestFlight's build list while it remains available.

## Final records, user's checkout and cleanup
- The release records (this folder) are merged to `origin/personal` by the commit that adds `tickets/done/release-v1.5.14-beta.3/`; the record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-beta.3-autobyteus-570-20261120/` with `archive.sha256`, the update of the user's checkout and the cleanup are done immediately after that commit; their results are in the record copy's `record-notes.md` and the terminal message.

## Final Status
- Release complete: `Yes` (all four workflows succeeded; 27 of 27 assets; iOS uploaded to TestFlight).
