# Delivery / Release / Deployment Report — autobyteus-574 (phone-video-574)

Delivery ran in two rounds. Round DR-001 integrated the base and sent one gap in the proof of AC-001 on iOS back to API/E2E (below); round DR-002 judged the new evidence, verified the integrated tree, ran the build-only Android and iOS release runs on the final head and finalized. This report is the DR-002 report.

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`, without a release. The code reviewer's handoff reads "documentation sync, finalization and release per RELEASE.md"; no document of the ticket and no message from the user or the Solution Designer asks for a release, and `RELEASE.md` makes none the default, so none was made. A release is available: `release-notes.md` holds the user-facing notes.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from the merged tree (`origin/personal` `6cdd1b7bd4`; the ticket never changed it). Not created by this delivery.
- Deviations from the guide and why: `None`. Delivery reran more than the guide's minimum after new base commits (one relevant check and both typechecks): the whole server unit and web suites, the media phone cases, both rebuilds, and the build-only Android and iOS release runs on the final head. The ticket changes every file route's reply, a bridge message that carries the credential and two native apps, and the iOS release job runs a new timing-sensitive loader test on a runner image a Mac does not have.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: `docs-sync-report.md` is current.

## Delivery Round History

**DR-001 (evidence requested, 2026-11-24).** Delivery opened API/E2E's evidence and found one gap in the proof of AC-001 (critical): on iOS the user's seek is AVKit's scrubber, and API/E2E's O-4 showed the picture freezing after a scrubber drag, unattributed (the frame-count control IOS-8 could not exclude a loader defect). Delivery asked API/E2E for three controls: the same drag against a plain file, a frame-content comparison, a byte comparison.

**Result.** The controls attributed the freeze to the product: the same drag on a plain file plays on, through the loader it stops (3 of 3), and the loader's bytes and frames were identical to the file's (F-3). Failure-origin review CRR-005: `Local Fix` in the iOS loader (CR-003). IR-003 declared the file available on demand; API/E2E then found that this made playback fall below real time over a link with a 20 to 50 ms round trip (F-4; CRR-007, CR-004); IR-004 added a read-ahead (one streaming fetch answers AVFoundation's small reads). CRR-008 `Pass`; API-REV-005 `Pass` (93.6 %); CRR-009 `Pass`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `4b73fccae2`
- Latest tracked remote base reference checked: `origin/personal` `6cdd1b7bd4` (`git fetch origin personal`, 2026-11-24, at the start of DR-002 and again before the final merge)
- Base advanced since bootstrap or previous refresh: `Yes`. Round DR-001: 1 commit (`c1147c8917`, the v1.5.14 release record; tickets only), merged as `d7399a925b`. Round DR-002: 8 more commits (autobyteus-618, text and code files wrap in the file viewer's editor; 5 non-ticket files: `MonacoEditor.vue` and its spec, `docs/content_rendering.md`, `mobile-file-word-wrap-cases.mjs`, `mobile-shell-probe.mjs`; no file in common with the ticket), merged as `0ee8e7fb8b`, no conflict.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` in DR-001 (`158b7b2c80`): the Architecture Reviewer's round-2 `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-002) were uncommitted. Nothing was uncommitted in DR-002.
- Integration method: `Merge` (`git merge --no-ff origin/personal`)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (commands and results below; evidence in `evidence/delivery/`)

| Check | Command | Result |
| --- | --- | --- |
| `DEL-01` server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, `PASS` |
| `DEL-01` web typecheck | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-02` contract `dist/` | `pnpm check:contract-dist` | `PASS: the tracked dist/ of 3 contract packages matches their source.` |
| `DEL-03` whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | `Test Files 1085 passed \| 5 skipped (1090)`, `Tests 9076 passed \| 9 skipped (9085)` |
| `DEL-03` whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `Test Files 806 passed (806)`, `Tests 6156 passed \| 2 skipped (6158)` |
| `DEL-04` rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `exit 0` each; "The /mobile build holds no demo code." |
| `DEL-05` the media phone cases (the viewer this ticket changed) | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-89,MSP-90,MSP-91,MSP-92` | `mobile-shell probe: Pass`, four cases `Pass`, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0` (the 19 `failedRequests` are aborted health polls and revoked blob URLs, as in API/E2E's own run) |
| `DEL-06` build-only Android release run on the final head | `gh workflow run release-android.yml --ref codex/phone-video-574 -f publish_release=false -f release_ref=codex/phone-video-574` | run `45478679986` on `0ee8e7fb8b`: `Resolve Android Release Metadata` success, `Build Android APK` success, `Publish Android APK To GitHub Release` skipped; nothing published |
| `DEL-06` build-only iOS release run on the final head | `gh workflow run release-ios.yml --ref codex/phone-video-574 -f publish_app_store_connect=false -f release_ref=codex/phone-video-574` | run `45478686275` on `0ee8e7fb8b`: `Resolve iOS Release Metadata` success, `Build And Test iOS App` success (Xcode 27 on the runner, which runs `AutoByteusMobileCoreTests`: the new read-ahead and frame-waiting loader tests; 26 min 52 s), `Validate iOS Publish Secrets` and `Archive And Upload` skipped; nothing published |
| Build-input rule (TESTING.md "Fresh-start build") | `git diff --name-only 4b73fccae2...HEAD` | matches: `autobyteus-android/app/build.gradle.kts` (Media3 1.5.1), `autobyteus-ios/scripts/ios-simulator-smoke.sh`, `autobyteus-ios/scripts/fake-mobile-server.py`. Implementation proved the fresh Android build (IMP-08) and the build-only runs (IMP-09) on `8e666f6c78`; no build input changed after it except the smoke script's one `-skip-testing` line, which API/E2E ran (smoke run: 8 tests, 0 failures, `evidence/api-e2e/ios/smoke/smoke-summary.log`). Delivery's build-only runs above cover the final source |
| Secret Gate | `scripts/check_secrets.sh origin/personal..HEAD` | `PASS` (37 commits) before the first push; repeated on the merged state in the Finalization Record |

- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable (new base commits were integrated). Not rerun by delivery: the Android and iOS journeys on emulators and simulators, the whole server integration and E2E suites and the whole phone probe (API/E2E ran them on the ticket's code: SI-1 `92 passed | 21 skipped`, `523 passed`; server unchanged since `8e666f6c78`, and the base's new commits are web-only); the iOS core tests (82 of 82 in API/E2E's R5-IOS-U) ran again on the runner in the iOS build-only run.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` at `6cdd1b7bd4`; checked again before the final merge (Repository Finalization).
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-005: Acceptance-Criteria Proof, 93.6 % final confidence, no category below 90 %, every critical criterion `Proven`), the evidence files its Cases table names (opened below), `code-review-report.md` (CRR-001 to CRR-008), `api-e2e-test-review-report.md` (CRR-004, CRR-009), and the integrated-state rerun above. The 95 % default target is not met; the report bounds it by the environment (emulators and simulators, no physical phone or real network), and the categories that carry it are 91 %.
- What was mocked or not tested: Android emulator (API 35) and iOS simulator (iOS 26.1), no physical phone and no real Wi-Fi or tailnet (the node sits behind a local proxy with a 1.5 MB/s limit and an added latency of 0, 20 and 50 ms); the agent is a scripted Antigravity echoing paths; a media message on a live run (DEC-006); LRU eviction at 500 MB was not reached; the packaged desktop window was not opened (the desktop's change is only the routes' headers, proven in Chromium with the owner credential, DSK-1); signing, notarization and the App Store upload need the release runners.
- Accepted unverified risk (`DEC-006`): AC-001 "from a media message" on a live stack. The Solution Designer's evidence decision (a): a real video media segment needs a paid, non-deterministic video model; its URL form is `/rest/files/<relativePath>`, the `files.ts` route the ticket makes ranged (AC-005 covers it), and the tile calls the same `play(url)` as Files; the bridge, player and routes were proven live from Files and a chat link (AND-13 played that URL form through the bridge). Delivery checked that the decision covers exactly what was not tested.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (a video starts at once and seeks by range, header only) | Android: AND-1, AND-2b, AND-3, AND-13 and `ac003-android-2.json`; iOS: R5-IOS-2, R5-IOS-DL, R5-IOS-LAT, R5-IOS-U (`R5/r5-lat-tc.png`, `r5-dl-summary.log`, `r5-core.log`, `r5-requests.txt`); R3-O4-a…e for the freeze | Android on host GPU: playing about 1.2 to 1.7 s after the tap, a tap at the middle plays after 1.7 s, `bytes=0-1` 206 then ranged reads with the phone header; iOS: the burnt-in timecode after the scrub jumps to about 15 s and runs at 1× at 0, 20 and 50 ms of latency (`r5-lat-tc.png`); at 50 ms `delivered 13893634 bytes in 10.0 s; real-time playback needs at least 5339896`; core test `playing after 0.76 s; at the middle 0.62 s after the seek`, `Executed 82 tests, with 0 failures`; the plain file played on after the same drag and the shipped loader stopped (R3-O4-a, the control delivery asked for) and the fix removed it | Proven (both apps, simulator and emulator); the media message: DEC-006; a scrub on a physical iPhone over a real network: recommended before a release, not checked |
| AC-002 (reopen reads nothing again; a changed file is fetched anew) | AND-4, AND-10, AND-12, R2-AND-9; IOS-4, IOS-5, IOS-12, R5-IOS-2, R5-IOS-13 | Android reopen: only the 2-byte probe, changed file: new `ETag`, the screen shows CHANGED-574, node removal: `video-cache` 206,960 KB, 49 files to 92 KB, 0 files; iOS reopen: `fetched again of the cached: 0`, only the probe in the request log, node removal: 6 files to 0 | Proven |
| AC-003 (the credential only in the header; a page cannot make the app send it elsewhere) | AND-7, IOS-10 (scans), R2-AND-8, R2-IOS-9 (refusals), R5 `proxy-log.json`; delivery's source check | scans: 0 occurrences in logcat, the cache and database, the proxy and stack logs (Android) and in 2,772 files (iOS); `/rest/../graphql`, `/rest/%2e%2e/graphql`, `/rest/../mobile/` and six more URLs refused before anything is sent, the control `/rest/files/…` opens; round 5's proxy log: 737 entries, the 21 file requests all `206` with the phone header and no credential in a URL (the 44 URL-credential entries are the page's own WebSocket `access_token`, which NA-8 allows); the iOS video sources log one line, the error type's name; the scans ran before the loader rework, whose code review found the header-only rule unchanged | Proven |
| AC-004 (full screen: landscape, bars hidden, position kept; Android in-page video) | AND-5, AND-6, IOS-2, IOS-3, IOS-14 | Android: `ROTATION_90`, status and navigation bars `visible=false`, exit `ROTATION_0` and the position kept (`before: 7.877, after: 9.245, paused: false` for the in-page video); iOS: landscape for a wide video, portrait for a tall one, the player's close and Back both return to the page | Proven (R-1: on iOS the Back bar stays over the landscape video, for the user's judgement) |
| AC-005 (file routes answer ranges, a version, revalidation) | AC5-1 (`AC-005/ac005.log`), DSK-1, SI-1, SE-1; delivery's server unit run | each route: `Accept-Ranges: bytes`, `ETag`, `Cache-Control: no-cache`, 206 for `bytes=100-199`, `1000-`, `-500` with the exact bytes (SHA-256), 416 `bytes */22866620`, 304 on `If-None-Match`, 200 for several ranges, 401 without a credential; Chromium reloads a rewritten file new (`FIRST VERSION` to `SECOND VERSION`, 300,000 to 200,000 bytes); whole server unit `9076 passed` on the merged tree; SE-1 failures are outside the ticket (below) | Proven |
| AC-006 (unchanged without the player: a browser, an older app, the desktop) | AND-11, WS-1, DSK-1, R2-MSP-89…92; delivery's `DEL-05` | the old app's `hello` has no `videoPlayer` and the page plays the video itself (one 200 of 4,228,009 bytes with the phone header, no `VideoPlayerActivity`); the whole phone probe 103 cases, 97 `Pass`, MSP-89 to 92 `Pass`, the six failures outside the ticket; delivery's MSP-89 to 92 on the merged tree `Pass`, `unknownBrowserErrors: 0` | Proven (an old iOS app was not built: the same `hello` rule) |

- Outside this ticket, recorded by API/E2E: whole phone probe MSP-17, 58, 65, 82, 87 (autobyteus-628 FU-002) and MSP-61 (autobyteus-609 FU-006); whole server E2E RRB-1 and SID-2 (autobyteus-609 FU-007, a short-`TMPDIR` effect on the base); and two files that failed once in the whole E2E run and passed when run again (`TAU-3`, a snapshot walking a temporary file mid-rename, and a terminal-home case with `/tmp` against `/private/tmp`): environment, not this change.
- More evidence requested (from whom, what, result): DR-001's request to API/E2E (the three O-4 controls): done in API-REV-003, and it found the loader defect F-3.
- User check needed: `No`. A scrubber drag on a physical iPhone over a real network is recommended before a release; it is not required to finalize, and the simulator controls (R3-O4, R5) attribute and remove the freeze there.
- User check reference, when needed: `N/A`
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default (the user did not ask for a release in the request or later; the handoff's wording "and release per RELEASE.md" names the guide, not a release). A release is available.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/features/remote_access.md` (User Files), `autobyteus-web/docs/file_explorer.md`, `autobyteus-web/docs/remote_access.md` (the bridge and its new "Video" paragraph), `docs/android_mobile_access.md`, `docs/ios_mobile_access.md`; kept from the ticket: `autobyteus-server-ts/docs/design/node_access_model.md` (NA-8), `docs/design-cases.md`, `autobyteus-android/README.md`, `autobyteus-ios/README.md`
- No-impact rationale (if applicable): n/a

## Ticket State Transition

- Ticket moved to `tickets/done/phone-video-574`: `Yes` (before the first push of the final commit)
- Archived ticket path: `tickets/done/phone-video-574`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574`, branch `codex/phone-video-574`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch: `codex/phone-video-574` (delivery pushes with the explicit refspec; the branch was pushed once before the build-only runs).
- Finalization target remote / branch: `origin` / `personal`, `--no-ff` merge from a `finalize/phone-video-574` branch (RELEASE.md).
- The outcome (commits, push, the user's checkout, cleanup) is in the "Finalization Record" at the end of this report, written after the push.

## Release / Publication / Deployment

- Applicable: `No`
- Method: `None` (no release was asked for)
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` for this finalization; `release-notes.md` is archived with the ticket for the next release (no `## What you need to do`: an app without the player keeps today's path).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` for the node (no stored field, no migration). The apps create a new private cache folder (`cache/video-cache` on Android, `Library/Caches/video-cache` on iOS) that nothing older reads.
- Delivery action required: `None`
- Result and evidence: n/a

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Revert the finalization merge on `personal`. Nothing persisted changes shape: the node's file routes return to whole-file replies, the apps (store-distributed) return to the page's own player when their next build lacks the player, and the page and an app that has it stay compatible in both directions (DEC-005: the page asks the app's `hello`).

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes` (Finalization Record below)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: run after the record commit's push (Finalization Record, last two bullets); its result is in the terminal message
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: by `send_message_to` after the record commit's push and the cleanup
- Terminal message/reference: the `send_message_to` message to the Solution Designer, address from `get_handoff_rules`

## Finalization Record

Written after the push of the merge, the way earlier tickets recorded theirs.

- Ticket branch `codex/phone-video-574`: committed (tip `1e25d5a14b`) and pushed to `origin` with the explicit refspec `HEAD:refs/heads/codex/phone-video-574` (`0ee8e7fb8b..1e25d5a14b`, a fast-forward of the tip pushed earlier for the build-only release runs). Secret Gate on `origin/personal..HEAD` before the push: `PASS`, 38 commits.
- Target refreshed before the merge: `git fetch origin personal` showed `6cdd1b7bd4`, which the ticket branch already contained (merge `0ee8e7fb8b`); no re-integration and no re-verification were needed.
- Merge: on `finalize/phone-video-574` (from `origin/personal` `6cdd1b7bd4`), `git merge --no-ff codex/phone-video-574` = `7cbab1f7c2` (parents `6cdd1b7bd4` and `1e25d5a14b`; the merged tree equals the ticket branch's tree, `4ddebaabc1`). Secret Gate on the merged state: `PASS`, 39 commits. Hygiene check (`scripts/check_repository_artifact_hygiene.py`) on the archived tree: passed (105 151 tracked files).
- Push: `git push origin HEAD:personal` `6cdd1b7bd4..7cbab1f7c2`; `origin/personal` = `7cbab1f7c2` afterwards.
- Release: none (no tag, no version bump, no pipeline beyond the two build-only runs, which published nothing).
- This record: committed on `finalize/phone-video-574` and pushed to `origin/personal` as the commit that follows `7cbab1f7c2`.
- The user's checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, on `personal`): `git fetch`, then `git merge --ff-only origin/personal` after this record's push, only if it is on `personal` with no local commits and git accepts it; nothing is stashed, reset or checked out there. The result (commit, or why not) is in the terminal message.
- Cleanup, after this record's push: `git worktree remove --force /Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574` (only git-ignored and untracked build output remains, including API/E2E's untracked `autobyteus-web/test-results/`, whose evidence is under `evidence/api-e2e/`), `git worktree prune`, delete the local branches `finalize/phone-video-574` and `codex/phone-video-574`, and delete delivery's own `/tmp/del574` and the two scratch lists `/tmp/del574-*.txt`. Remote branch: `Not required` (the repository keeps pushed `codex/*` branches). API/E2E keeps `/tmp/api574` until the Solution Designer asks. The result is in the terminal message.
