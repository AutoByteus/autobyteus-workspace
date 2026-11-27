# Release Report — release-v1.5.15-beta.2 (autobyteus-650): beta v1.5.15-beta.2

Status: **released** — all four workflows succeeded: Android on attempt 1, and Desktop, Docker and iOS after **one rerun of their failed jobs** (runner and package-mirror trouble, plus one timing-sensitive UI test that passed on the rerun; see "Failed jobs"), 27 of 27 assets, GitHub **pre-release** (GitHub Latest stays `v1.5.14`); **iOS 1.5.15 (363)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); Docker `:beta` moved to the new beta, `:latest` stays on `v1.5.14`; images at **system level 2**; nothing sent to App Store review. **Codex was waived for this beta by the founder, in advance** (below): the release smoke passed 10 of 13, and the three Codex cases failed only on Codex's usage limit.

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`): the Solution Designer, 2026-11-25; the Task (`/project_task_manager`, autobyteus-650), on the founder's words recorded in the Task: "Version because we just finished one thing, waive for codex usage limits" and "Release a new beta version".
- Base `origin/personal` @ `32aa87d429` (re-checked before the cut and before the push: unchanged); `next-beta` → `1.5.15-beta.2`; no `v1.5.15-beta.2` tag existed locally or on origin before the push. The previous beta is `v1.5.15-beta.1`; GitHub Latest is `v1.5.14`.
- Content since `v1.5.15-beta.1` (26 commits; `evidence/delivery/pretag-tickets.txt`): **autobyteus-647** (the file viewer has no line numbers, an empty media reference says so, the iPhone plays in iOS's own player screen, one shared PDF worker, the file status line clears on a run switch) and **autobyteus-649** (no runtime's system prompt carries the "Long-Running Commands" section; the habit is a global-memory note), plus the finalization records.
- Checked from the diff `v1.5.15-beta.1..32aa87d429`: **no released app-data migration, Prisma, Docker, workflow or script file changed, and `RELEASE.md` is unchanged (0 files; no test file either)**. The released migration order is unchanged (`migrations:record-released` changed nothing), so the release commit holds only the version bump. System level stays 2. `pnpm-lock.yaml` gained the direct dependency `pdfjs-dist 4.10.38` (autobyteus-647; `pnpm install --frozen-lockfile` passed). The Android app itself has no change since beta.1 (0 Android files); the iOS app has (`NativeMediaPlayer.swift`, `AuthorizedMediaLoader.swift`), so the iPhone needs the new TestFlight build.

## Project Release Guide

- `RELEASE.md` at `32aa87d429` (unchanged since `v1.5.14`), followed end to end: the desktop signing-readiness check (with the process-only HTTPS rewrite of the `github.com-ryan` alias; the shared remote is unchanged), the Server Docker system-level check, licensing and hygiene checks, the Secret Gate over everything the release adds, the live release smoke, then `scripts/desktop-release.sh beta --branch finalize/release-v1.5.15-beta.2 --no-push`; the failed jobs were triaged and rerun as its Recovery says.
- **Deviations:** (a) the Codex cases were waived by the founder (below), as RELEASE.md allows ("the user waives that runtime for this release and the waiver is recorded"); (b) the finalize branch was fast-forwarded to the archived release ticket instead of merged `--no-ff` (it only adds record commits, as in earlier releases). Proposed fixes to RELEASE.md: none. The macOS in-job retry (`follow-ups.md` FU-002) is still unfixed and would not have helped here: the macOS jobs never got a runner.

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001, fingerprint `e26a2e74…`; run again by the release script, exit 0 (witness unchanged) |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 ("Licensing is consistent", 8839 files) / exit 0 (105565 files; 105585 after the ticket was archived, run again, passed) |
| `scripts/check_secrets.sh v1.5.15-beta.1..HEAD` | **PASS** (26 commits, no secrets) |
| `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py`, run 1 (2026-11-25 13:56:28Z to 13:58:20Z on `32aa87d429`, no load imposed) | **exit 1, 10 of 13 PASS**: Claude 3/3, **Grok 3/3**, Antigravity 2/2, AutoByteus 2/2; **Codex 0/3** (all three scenarios, the same error: `You've hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits or try again at Nov 27th, 2026 7:43 AM.`, `RUNTIME_ERROR`); models `claude haiku, codex gpt-5.6-luna, grok grok-4.7`; durations live 83 s, antigravity 19 s, autobyteus 8 s |

- Evidence: `evidence/delivery/pretag-*.log|txt`, `pretag-release-smoke-run1.{log,load-samples.log,grok-startups.jsonl}`, the three step logs `pretag-release-smoke-run1-{live,antigravity,autobyteus}.log`, `smoke-run.sh`, `grok-log-extract.py` (timing and catalog fields only), `release-script.log`, `rollout-*.txt`, `published-state.txt`.
- No other failure in any runtime: the only FAIL lines are the three Codex cases, and the only refusals that ended a case are the nine "usage limit" lines of those cases (live step log); Antigravity passed 10 of 10 and AutoByteus 4 of 4 of their own tests.
- **Grok: no waiver was needed**; it passed all three scenarios on its first run, with its 7 processes starting in 163 to 176 ms. The smoke's load (the host's own, nothing imposed): 1-minute average 31.56 at the start, then 37.11, 35.00, 38.42, and 39.32 at the end.

## Codex waiver (RELEASE.md, Checks Before Tagging; the founder's decision)

- **Authority.** The founder's advance waiver, in the Task and the Solution Designer's request, verbatim (2026-11-25; speech-to-text, two messages): **"Version because we just finished one thing, waive for codex usage limits"** and **"Release a new beta version"** (`codex-waiver.md`). Scope: Codex for `v1.5.15-beta.2` only, usage-limit failures only. Any other failure would have stopped the release.
- **The condition was met:** Codex failed only on its usage limit, so the release was cut without asking again.
- **What stays untested:** Codex on the merged state: **four releases in a row without a Codex pass** (beta.10, stable v1.5.14, beta.1 and this beta; the last pass was beta.9's commit `13575c21f8`). One Codex source file changed since beta.1: `codex-thread-bootstrapper.ts` (autobyteus-649 stopped passing the removed prompt section to the composer; it is the run-start path). API/E2E recorded what Codex received on that path: the `thread/start` instructions of all three live requests end as expected, with no "Long-Running Commands" section (`tickets/done/remove-long-running-prompt-649/evidence/API-02-semantic-memory-live-codex/API-02-wire-ending-check.txt`); only the model turn was refused by the same usage limit.
- The limit resets Nov 27, 2026 7:43 AM. The Codex smoke after that is tracked in autobyteus-637 (the Task), and here as `follow-ups.md` FU-001.

## Release Decision

- Decision: `Beta`. Decided by: the Task and the founder's words above, through the Solution Designer; the Codex waiver by the same words.

## Release Notes

- `release-notes.md` (this folder), put above the generated notes of the pre-release with **one** `**Full Changelog**` line (the generated body had two identical lines; the duplicate removed). It starts with `## What you need to do`: a normal update from `v1.5.15-beta.1` (no data conversion, no Docker system change); **the iPhone and iPad need the new TestFlight build, 1.5.15 (363)**, for the iOS player-screen change; Android has no app change; Docker nodes (a node on `v1.5.14` or beta.1 updates in place; older ones need `autobyteus-docker upgrade --all --tag beta`; `:latest` stays on `v1.5.14`); desktop beta updates; and pointers to the beta.1 and v1.5.14 notes for older versions. Then `## What's new since v1.5.15-beta.1` (the five autobyteus-647 changes and the removed prompt section) and `## Good to know` (the removed section's effect was never measured; the simulator-only check of the silent switch; beta.1's two known issues are fixed). No internal ids.
- Tickets' "What you need to do" sections used: none. 647's and 649's notes state that no user action is needed; the action items come from the Task's direction and this delivery's checks.

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.15-beta.2 --no-push`; its trust check passed (witness `v1.5.14-beta.6`, run 44901757001); `migrations:record-released` changed nothing (the registry-order test passed, `Tests 1 passed`). Release commit **`0202164730`** (`chore(release): bump workspace release version to 1.5.15-beta.2`; one file, `autobyteus-web/package.json`), annotated tag **`v1.5.15-beta.2`** (tag object `543b4d1fe1`, pointing at `02021647300a010217359b8cc9492e3ebe0a566c`).
- Secret Gate `origin/personal..HEAD` PASS (2 commits) before the push; `origin/personal` fast-forwarded `32aa87d429 → 0202164730`, then the tag, at 14:00:28Z on 2026-11-25. The tag has not been moved or deleted.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 45629380472 | attempt 1 failed (both macOS jobs not given a runner); `gh run rerun --failed` at 14:23:57Z; **attempt 2 success** (finished 14:49:39Z) |
| Server Docker Release | 45629380553 | attempt 1 failed (linux/arm64 image build: package mirror 503); `gh run rerun --failed` at 14:23:57Z; **attempt 2 success** (finished 14:32:26Z) |
| Android APK Release | 45629388332 | success, attempt 1 |
| iOS App Store Connect Release | 45629381562 | attempt 1 failed (one UI smoke test in the build-and-test job); `gh run rerun --failed` at 14:23:57Z; **attempt 2 success** (finished 15:05:31Z) |

### Failed jobs (attempt 1 of the tag push; every classification and rerun below is per RELEASE.md, Recovery)

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| Desktop Release 45629380472: "Build macOS Intel x64" (job 139259004833) and "Build macOS ARM64" (job 139259005079) | **Platform** (GitHub macOS runner capacity) | job annotations: `The job was not acquired by Runner of type hosted even after multiple attempts` (both; no step ran; both cancelled at 14:16:52Z); `Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times` (`rollout-desktop-attempt1-macos-no-runner.txt`). The other three build jobs and the Linux signing job passed. RELEASE.md names "The job was not acquired by Runner" as a platform example. | `gh run rerun 45629380472 --failed` (only the two macOS jobs and the publish job reran) | both macOS builds, the publish job and the updater files passed on attempt 2 |
| Server Docker Release 45629380553: "Build Server Image (linux/arm64)" (job 139258204617), step "Build and push the image" | **Platform** (Launchpad PPA mirror outage) | `#17 … 503  Service Unavailable [IP: 185.125.189.187 443]`; `E: Failed to fetch https://ppa.launchpadcontent.net/xtradeb/apps/ubuntu/dists/noble/main/binary-arm64/Packages  503  Service Unavailable`; `process "/bin/sh -c apt-get update && apt-get install -y --no-install-recommends git ripgrep curl ca-certificates …" did not complete successfully: exit code: 100` (`rollout-docker-attempt1-arm64-apt-503.txt`). The amd64 build had passed. Nothing was tagged or pushed. | `gh run rerun 45629380553 --failed` (not "re-run all": the amd64 image from attempt 1 is used as it is) | arm64 build, "Publish Server Image" and both package jobs passed on attempt 2 |
| iOS App Store Connect Release 45629381562: "Build And Test iOS App" (job 139259161856), step "Generate, build, and run implementation checks" | **Unclear**, settled by one rerun: passed, so not ours; treated as runner slowness on a timing-sensitive test (`follow-ups.md` FU-003) | `DemoUITests.swift:48: error: … testScanningTheDemoCodeOpensTheDemo : XCTAssertTrue failed` (the test waited 30 s for the text "Demo code found"); `Executed 8 tests, with 1 failure`; `** TEST FAILED **`; the runner's accessibility checks took 1 to 2 s each (`Capturing element debug description`, `Ignoring failure to get hierarchy for remote element … kAXErrorServerNotFound`) (`rollout-ios-attempt1-demo-scan-test.txt`). The 91 unit tests had passed. `DemoUITests.swift` is unchanged since `v1.5.15-beta.1`, where the same 8-test suite passed (`Executed 8 tests, with 0 failures`); 647's handoff summary records its build-only iOS release run on the final head as passed. | `gh run rerun 45629381562 --failed` (once) | attempt 2: the same test `passed (32.625 seconds)`, `Executed 8 tests, with 0 failures`; archive and upload succeeded |

- No second failure of any job, so none is classified as ours. No code, workflow or version changed because of these failures.

### iOS

- **Build: 1.5.15 (363)** (`iOS build number: 363`; `MARKETING_VERSION: 1.5.15`, `CURRENT_PROJECT_VERSION: 363`; the number follows the workflow run, so beta.1's was 361). Attempt 1 failed before archive and upload, so only one build reached TestFlight.
- Xcode_27.2, iPhoneOS SDK 27.2; "all 18 slots match the logo (on #1E3A8A)"; "The demo answers all 255 compiled operations"; "Executed 91 tests, with 1 test skipped and 0 failures"; the UI smoke suite `Selected tests` passed (8 tests, 0 failures).
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `7cceac6c-8456-48db-8122-c1f9bb69f32f`; **no ITMS message** (0 lines). Nothing sent to App Store review; no reply to Apple (`evidence/delivery/rollout-ios-key-lines.txt`).

### Published artifacts checked (`evidence/delivery/published-state.txt`)

- **Pre-release, not a draft**; **GitHub Latest stays `v1.5.14`**; target `02021647300a010217359b8cc9492e3ebe0a566c`.
- **27 of 27 assets** (2 Android, 6 server packages, 15 desktop files, 4 `latest*.yml`); the four `latest*.yml` (14:49:36Z) are newer than all six `autobyteus-server-*` files (last 14:32:22Z).
- Docker (registry API): **`:1.5.15-beta.2` = `:beta` = index `sha256:218d2f1f1c…`**, linux/amd64 `sha256:3527dd2e17…` and linux/arm64 `sha256:c4f0faefdb…`, the package jobs' digests ("The pushed … index lists linux/amd64 sha256:3527dd2e… and linux/arm64 sha256:c4f0faef…"; "Moved `…-server:beta` to `…-server:1.5.15-beta.2`"). **`:latest` = `:1.5.14` = `sha256:70dee9a69e…`, unchanged**; `:1.5.15-beta.1` is still `sha256:55d11b2ca4…`.
- **System level 2:** both image builds "System level 2: the system part is unchanged (61cd87f9…)" and "Wrote server-package.json: 1.5.15-beta.2 linux-<arch>, Node modules 127, system level 2, 66 migrations" (the same 66 as beta.1); the released server package descriptions (x64 and arm64) have `systemLevel: 2`.
- Notes: the body starts with `## What you need to do` and equals `release-notes.md` plus one `**Full Changelog**` line.
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

## Repository Finalization

- Release commit `0202164730` and the tag are on `origin` (above). The record commit (this folder, with the iOS build number, the failed-job triage, the published state, `delivery-revision-record.md` and `follow-ups.md`) follows on `origin/personal` as a fast-forward after a fetch and a Secret Gate.
- The founder's checkout, the worktree cleanup and the record copy: recorded in the terminal message and `delivery-revision-record.md`.

## Rollback Criteria

- Revert the release commit and the merges on `personal` and cut a new release. Desktop updates never downgrade; turning beta updates off waits for the next newer stable. `:beta` only moves forward; pin `:1.5.15-beta.1` or `:1.5.14` (the stable, which `:latest` still is) to go back on Docker.
- This release adds no app-data migration and no data conversion. A user who already started `v1.5.14` has had saved organization runs converted (autobyteus-29): that cannot be undone, and the `v1.5.14` notes say so (RELEASE.md, Rollback). A saved run keeps the prompt it started with, so the removed prompt section needs no data step to bring back.

## Final Status

- Verification complete (RELEASE.md's checks; Codex waived by the founder): `Yes`
- Repository finalization complete: recorded in `delivery-revision-record.md` after the record commit
- Release complete: `Yes` (four workflows green after one rerun of the failed jobs, 27 of 27 assets, pre-release, Docker `:beta` moved and `:latest` unchanged, TestFlight uploaded)
- Unresolved blocker: `None`. Accepted, unverified risk: Codex on the merged state (waived by the founder for this beta only).
