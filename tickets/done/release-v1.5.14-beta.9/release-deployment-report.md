# Release Report — release-v1.5.14-beta.9 (autobyteus-626): beta v1.5.14-beta.9

Status: **released** — all four workflows succeeded (Desktop Release and iOS on attempt 2, each after one platform failure; Android and Docker on attempt 1), 27 of 27 assets, GitHub pre-release; **iOS 1.5.14 (355)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); Docker images at **system level 2**; nothing sent to App Store review.

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`): the Solution Designer, 2026-11-23; the PM's Task: "Founder approved cutting beta release v1.5.14-beta.9 from the latest origin/personal".
- Base `origin/personal` @ `13575c21f8` (re-checked before the cut and before the push: unchanged); `next-beta` → `1.5.14-beta.9`; no `v1.5.14-beta.9` tag existed on origin.
- Content since `v1.5.14-beta.8` (15 commits; `evidence/delivery/pretag-tickets.txt`): one ticket, **autobyteus-619** (the Memory page's Agent Teams list holds team roots only, so a Team inside an Org stays under its Org; faithful upgrade-ledger tests; two test fixes). Its non-test source change is two server files in `agent-memory/services`; no app-data migration, Prisma, Docker, workflow or script change (0 files), so the released migration order is unchanged and the release commit holds only the version bump.

## Project Release Guide

- `RELEASE.md` at `13575c21f8` (unchanged since beta.8), followed end to end: the desktop signing-readiness check (with the process-only HTTPS rewrite of the `github.com-ryan` alias; the shared remote is unchanged), the Server Docker system-level check, the Secret Gate over everything the release adds, and the live release smoke. Deviations: the finalize branch was fast-forwarded to the archived release ticket instead of merged `--no-ff` (it only adds record commits on top of `origin/personal`, as in beta.6 to beta.8); no other. Proposed fixes: none to RELEASE.md. The workflow follow-up of beta.8 (FU-001) is extended in `follow-ups.md` FU-001.

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001, fingerprint `e26a2e74…`; run again by the release script, exit 0 |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 / exit 0 |
| `scripts/check_secrets.sh v1.5.14-beta.8..HEAD` | PASS (15 commits) |
| `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py`, run 1 (14:24:41Z to 14:26:46Z, no load imposed) | **exit 0, 13 of 13 PASS**: Claude 3/3, Codex 3/3, **Grok 3/3**, Antigravity 2/2, AutoByteus 2/2; models `claude haiku, codex gpt-5.6-luna, grok grok-4.7`; durations live 94 s, antigravity 20 s, autobyteus 9 s |

- Evidence: `evidence/delivery/pretag-*.log|txt`, `pretag-release-smoke-run1.{log,load-samples.log,grok-startups.jsonl}`, `smoke-run.sh`, `grok-log-extract.py` (timing and catalog fields only).
- **Grok: no waiver was needed**; it passed all three scenarios on its first run.
- The smoke's load (host's own, nothing imposed): 1-minute average 42.27 at the start, then 40.05, 33.96, 25.25 and 33.97 at the 30 s samples; the 5-minute average 20.6 to 23.7. Grok's 7 processes started in 160 to 200 ms (`max_startup_elapsed_ms` 179, 164, 170, 191, 160, 200, 174). The first Grok process (the model-list read) again logged `had_real_catalog: false`, `model_count: 2` (Grok's built-in list), and the summary still shows `grok-4.7`: the stale-catalog case of autobyteus-551 happened live a third time and was handled.

## Release Decision

- Decision: `Beta`. Decided by: the PM's Task ("Founder approved cutting beta release v1.5.14-beta.9 from the latest origin/personal"), through the Solution Designer. No further question was asked.

## Release Notes

- `release-notes.md` (this folder): starts with `## What you need to do` (from beta.8 a normal update; from beta.7 or older, 615's update-together note and 29's one-way conversion of saved organization runs, with its paired-node note; the Docker system-level 2 note; the TestFlight build 355; desktop beta updates), then `## What's fixed since beta.8` (the Memory page) and a pointer to the beta.8 notes for everything new since beta.7. Sections used: the beta.8 "What you need to do" items (autobyteus-615, autobyteus-29), as the Task asks; autobyteus-619 has no such section. One `**Full Changelog**` line.

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.14-beta.9 --no-push`; its trust check passed (witness `v1.5.14-beta.6`, run 44901757001); `migrations:record-released` changed nothing (the registry-order test passed, `Tests 1 passed`). Release commit **`ae21ae019b`** (`chore(release): bump workspace release version to 1.5.14-beta.9`; one file, `autobyteus-web/package.json`), annotated tag **`v1.5.14-beta.9`** (tag object points at `ae21ae019b`).
- Secret Gate `origin/personal..HEAD` PASS (2 commits) before the push; `origin/personal` fast-forwarded `13575c21f8 → ae21ae019b`, then the tag, at 14:28:05Z.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 45194517927 | success, **attempt 2** (macOS Intel x64 rerun) |
| Server Docker Release | 45194515385 | success, attempt 1 |
| Android APK Release | 45194515029 | success, attempt 1 |
| iOS App Store Connect Release | 45194517640 | success, **attempt 2** ("Build And Test iOS App" rerun) |

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| 45194517927 attempt 1, "Build macOS Intel x64" › "Build Electron macOS Intel x64" (14:29:51Z to 14:44:50Z) | Platform (Apple's timestamp service; the same commit passed on the rerun, and macOS ARM64 of the same run signed and notarized) | At the signing step, after the bundles were listed: `Build process failed: Error: codesign --sign … --force --options runtime --entitlements …entitlements.mac.helper.renderer.plist …/AutoByteus Helper (Renderer).app…` and `…/AutoByteus Helper (Renderer): The timestamp service is not available.`; then `ELIFECYCLE Command failed with exit code 1`. The in-job retry did not run: its pattern list (`Failed to notarize via notarytool`, `appears to be offline`, `-1009`, `No network route`, `timed out`) does not contain this message (`evidence/delivery/rollout-desktop-attempt1-macos-x64-failure.log`) | one rerun of only the failed job after the run completed: `gh run rerun 45194517927 --failed` (14:55:00Z), as RELEASE.md Recovery says | attempt 2 passed (all jobs success, the publish job ran) |
| 45194517640 attempt 1, "Build And Test iOS App" (created 14:29:33Z, cancelled 14:44:34Z) | Platform (GitHub's hosted `xcode-27` runner pool: no runner was ever assigned) | The job has `runner_name ""`, `labels ["xcode-27"]`, **0 steps listed**, and no log (the log API answers HTTP 404 BlobNotFound); `conclusion cancelled` 15 minutes after it was created; "Validate iOS Publish Secrets" and "Archive And Upload To App Store Connect" skipped (`evidence/delivery/rollout-ios-attempt1-no-runner.txt`) | one rerun of only the failed job: `gh run rerun 45194517640 --failed` (14:45:34Z) | attempt 2 got a runner at once and passed all three jobs |

- The macOS Intel x64 job has now failed on its first attempt on two releases in a row (beta.8: Apple's notary; beta.9: Apple's timestamp service), each time only the job-level rerun worked. Beta.8's FU-001 (the in-job retry cannot give a second try) is extended in this folder's `follow-ups.md` FU-001: the retry's pattern list also misses `The timestamp service is not available`.
- Android and Docker were seen finished at 14:35:30Z and 14:37:02Z; the iOS upload (attempt 2) succeeded at 15:15:37Z; Desktop attempt 2 was seen finished at 15:20:02Z.

### iOS

- **Build: 1.5.14 (355)** (`iOS build number: 355`; `MARKETING_VERSION: 1.5.14`, `CURRENT_PROJECT_VERSION: 355`, attempt 2).
- Xcode_27.2, iPhoneOS SDK 27.2; "all 18 slots match the logo (on #1E3A8A)"; "The demo answers all 252 compiled operations"; core tests "Executed 56 tests, with 0 failures"; the UI smoke suite `Selected tests` passed.
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `6ab5148e-f36f-408b-8afc-f57ceae38f8e`; **no ITMS message** (0 lines). Nothing sent to App Store review; no reply to Apple.

### Published artifacts checked

- Pre-release, not a draft; GitHub Latest stays `v1.5.13`.
- **27 of 27 assets** (2 Android, 6 server packages, 15 desktop files, 4 `latest*.yml`); the four `latest*.yml` (15:19:37Z) are newer than all six `autobyteus-server-*` files (last 14:36:36Z) (`evidence/delivery/published-state.txt`).
- Docker (registry API): `:1.5.14-beta.9` = `:beta` = index `sha256:c9a6d19983…`, linux/amd64 `sha256:53886580f3…` and linux/arm64 `sha256:8233eda10c…`, the package jobs' digests ("The pushed … index lists linux/amd64 sha256:53886580… and linux/arm64 …"); `:latest` = `1.5.13` = `sha256:13df73db92…`, unchanged; `:1.5.14-beta.8` is still `sha256:7fb3791fcb…`.
- **System level 2:** both image builds "System level 2: the system part is unchanged (61cd87f9…)" and "Wrote server-package.json: 1.5.14-beta.9 linux-<arch>, Node modules 127, system level 2, 66 migrations"; the released server package descriptions (x64 and arm64) have `systemLevel: 2`.
- Notes: `release-notes.md` above the generated notes with **one** `**Full Changelog**` line (the generated body had two identical lines; the duplicate removed); the body starts with `## What you need to do`; pre-release kept.
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

## Repository Finalization

- Release commit `ae21ae019b` and the tag are on `origin` (above). The record commit (this folder, with the iOS build number filled in, the rollout evidence and `follow-ups.md`) follows on `origin/personal` as a fast-forward after a fetch and a Secret Gate.
- User's checkout, worktree cleanup and the record copy: recorded in the terminal message and `delivery-revision-record.md` after the record commit.

## Rollback Criteria

- Revert the release commit and the merge on `personal` and cut a new release. Desktop updates never downgrade; `:beta` and `:latest` only move forward; pin an earlier Docker tag to go back.
- A user who already started beta.8 or this beta has had saved organization runs converted (autobyteus-29): that conversion cannot be undone, and the notes say so (RELEASE.md, Rollback). This release adds no data conversion of its own.

## Final Status

- Verification complete (RELEASE.md's checks): `Yes`
- Repository finalization complete: recorded in `delivery-revision-record.md` after the record commit
- Release complete: `Yes` (four workflows green, 27 of 27 assets, Docker and TestFlight verified)
- Unresolved blocker: `None`
