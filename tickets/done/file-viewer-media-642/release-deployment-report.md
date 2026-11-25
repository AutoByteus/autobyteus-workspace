# Delivery / Release / Deployment Report — autobyteus-642 (file-viewer-media-642)

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`, without a release. The code reviewer's handoff reads "documentation sync, finalization and release per RELEASE.md"; no document of the ticket and no message from the user or the Solution Designer asks for a release, and `RELEASE.md` makes none the default, so none was made. A release is available: `release-notes.md` holds the user-facing notes. **C-6 applies to any release: autobyteus-574 and this ticket ship in the same release** (Release Decision below).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from the merged tree (`origin/personal` `45d1b4309c`; the ticket never changed it). Not created by this delivery.
- Deviations from the guide and why: `None`. Delivery reran more than the guide's minimum after new base commits (one relevant check and both typechecks): the whole server unit, integration and web suites, eleven phone cases and both rebuilds, and ran the build-only Android and iOS release runs on the final head. The ticket changes five REST routes, three web viewers and both native apps, and the iOS release job runs the iOS Core tests and the simulator smoke script on a runner image a Mac does not have.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: `docs-sync-report.md` is current.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `5c0db3a801`
- Latest tracked remote base reference checked: `origin/personal` `45d1b4309c` (`git fetch origin personal`, 2026-11-25, at the start of delivery and again before the final merge)
- Base advanced since bootstrap or previous refresh: `Yes` (autobyteus-638, a restart keeps a person's runs running: 25 non-ticket files, `autobyteus-server-ts` src 13, tests 10, docs 2; no file in common with the ticket's 103)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`a146c83f69`): the Architecture Reviewer's round-6 `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-002 to ARCH-REV-006) were uncommitted
- Integration method: `Merge` (`git merge --no-ff origin/personal`), merge commit `0813c4f30e`; no conflict
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (commands and results below; evidence in `evidence/delivery/`)

| Check | Command | Result |
| --- | --- | --- |
| `DEL-01` server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, `PASS` |
| `DEL-01` web typecheck | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-02` contract `dist/` | `pnpm check:contract-dist` | `PASS: the tracked dist/ of 3 contract packages matches their source.` |
| `DEL-03` whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | `Test Files 1089 passed \| 5 skipped (1094)`, `Tests 9105 passed \| 9 skipped (9114)` |
| `DEL-03` whole server integration suite | `test:integration:prepare`; `test:integration` | `Test Files 92 passed \| 21 skipped (113)`, `Tests 523 passed \| 71 skipped (594)` (API/E2E's SI-1: the same) |
| `DEL-03` whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `Test Files 808 passed (808)`, `Tests 6258 passed \| 2 skipped (6260)` |
| `DEL-04` rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `exit 0` each; "The /mobile build holds no demo code." |
| `DEL-05` the phone cases of this ticket and of the base that share the viewer | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-89,MSP-90,MSP-91,MSP-92,MSP-108,MSP-109,MSP-110,MSP-111,MSP-112,MSP-113,MSP-114` | `mobile-shell probe: Pass`, eleven cases `Pass`, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0` (the 23 `failedRequests`: 21 `ERR_ABORTED`, and 2 `ERR_CONTENT_LENGTH_MISMATCH` of MSP-91's node-restart read, which cuts connections on purpose and appears the same in API/E2E's whole probe) |
| `DEL-06` build-only Android release run on the final head | `gh workflow run release-android.yml --ref codex/file-viewer-media-642 -f publish_release=false -f release_ref=codex/file-viewer-media-642` | run `45535819387` on `0813c4f30e`: `Resolve Android Release Metadata` success, `Build Android APK` success (3 min), `Publish Android APK To GitHub Release` skipped; nothing published |
| `DEL-06` build-only iOS release run on the final head | `gh workflow run release-ios.yml --ref codex/file-viewer-media-642 -f publish_app_store_connect=false -f release_ref=codex/file-viewer-media-642` | run `45535821825` on `0813c4f30e`: `Resolve iOS Release Metadata` success, `Build And Test iOS App` success (Xcode 27 on the runner; 22 min 27 s; runs `AutoByteusMobileCoreTests` and `ios-simulator-smoke.sh`), `Validate iOS Publish Secrets` and `Archive And Upload` skipped; nothing published |
| Build-input rule (TESTING.md "Fresh-start build") | `git diff --name-only 5c0db3a801...HEAD` | matches only `autobyteus-ios/scripts/ios-simulator-smoke.sh` and `autobyteus-ios/scripts/fake-mobile-server.py` (the `*/scripts/**` glob); no Gradle file, `project.yml`, `package.json` or tsconfig changed, as the code reviewer said. The iOS release job runs the smoke script, and the build-only iOS run above ran it on the final head, so no fresh clone build is added |
| Secret Gate | `scripts/check_secrets.sh origin/personal..HEAD` | `PASS` (45 commits) before the first push; repeated on the merged state in the Finalization Record |

- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable (new base commits were integrated). Not rerun by delivery: the Android and iOS journeys on emulators and simulators and the whole phone probe (API/E2E ran them; IR-006 changed only the iOS loader and API/E2E's test file, and API/E2E ran the audio class 10 of 10 and 574's video class 8 of 8 on it; the base's new commits are server-side); the Android JVM tests and the iOS Core tests beyond the runner's run (the Android release job only assembles; IMP-06 and IMP-14 cover them).
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` at `45d1b4309c`; checked again before the final merge (Repository Finalization).
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-002: Acceptance-Criteria Proof, 93.4 % final confidence, no category below 90 %, every critical criterion `Proven`), the evidence files its Cases table names (opened below), `code-review-report.md` (CRR-001 to CRR-007), `api-e2e-test-review-report.md` (CRR-008), and the integrated-state rerun above. The 95 % default target is not met; the report bounds it by the environment (no physical phone).
- What was mocked or not tested: Android emulator (API 35) and iOS simulator (iOS 26.1), no physical phone and no real network (the node sits behind a local proxy with a 1.5 MB/s limit and per-case latency and slower rates); the agent is a scripted Antigravity echoing paths and writing references; a media message from a generating model is not run (autobyteus-574's DEC-006 covers its URL form); **the sound, the Ring/Silent switch and a screen lock on a physical iPhone (DEC-007)**; the packaged desktop window was not opened (the probe drives the same web code in a desktop window under `nuxt dev` with the owner credential); signing, notarization and the App Store upload need the release runners.
- Evidence decisions with an untested part (`DEC-*`): **DEC-007**, the iOS audio session. The Solution Designer decided a design change (the app's session is `.playback` with `.moviePlayback` while the player shows) and verified it by a test-host check of the session's category; what stays untested on a simulator is the switch itself and the sound heard. The decision names that part for the physical-iPhone check before a release. It does not block finalization: nothing is released. DEC-008 (the chat code blocks, `FileDisplay.vue` removed) and DEC-001 to DEC-003 are design decisions with no untested part.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (a message reference serves ranges; its video or audio streams or plays natively) | `server/ac001-server.json` (SRV-1), AND-R1…R4, IOS-D, IOS-E, IOS-F, MSP-114 (API/E2E's and delivery's run), WS-1 (MSP-92) | the real node's reference route for an MP4, M4A, MP3, text, PDF and PNG: `200` exact bytes, `Accept-Ranges: bytes`, an `ETag`, `Cache-Control: no-store`, `206` with the exact slices, `416 bytes */<size>`, `304`, `200` whole for two ranges, `401` without a credential; deleted: `404`; zero-byte: `200` empty and its probe `416` (the held item). Desktop (delivery's rerun): the video reference plays from the route with `currentTime 1.11`, `readyState 4`, the viewer's `bytes=0-0` probe `206`, then `bytes=0-` `206` as media, not a blob. Apps: the native player opens and plays, the page's `bytes=0-0`, the player's `bytes=0-1` and one streaming read, the phone header only; text, PDF and image open as today; a deleted reference shows its message. The PDF's `suffix: exact False` is the harness's expected slice (`subarray(length - 500)` of a 388-byte file is `subarray(-112)`), not the server: its `Content-Range` is `bytes 0-387/388` | Proven |
| AC-002 (audio plays natively in both apps, seeks by range, reopens from the cache, no credential) | AND-A1…A5, AND-C, AND-N, IOS-A, IOS-B, IOS-G, IOS-Z, IOS-CR, R2-IOS-C, R2-IOS-START, R2-IOS-CLASS, R2-IOS-V; `R2-ios/m4a-seek-requests.txt`, `r5-summary.log`, `scans/*.txt`, the R2 proxy log | Android: MP3 from the chat link started in 497 ms, reopen only the probe; an M4A over 50 ms and 150 KB/s seeks with `bytes=940303-` `206` 0.44 s after the tap; Ogg/Opus and WebM play natively; node removal `media-cache` 32,548 KB to 76 KB. iOS on a fresh 120 s M4A over 50 ms and 60 KB/s: after the scrubber drag, `bytes=693716-` `206` at 589 ms and `bytes=930111-` (the middle) `206` at 2.2 s, header only (round 1: nothing from the middle in 3 s, F-1); the class `NativeMediaRealNodeUITests` 10 of 10; 574's video class 8 of 8, `delivered 13696434 bytes in 10.0 s; real-time playback needs at least 5345721`; start about 1.0 s on a cold simulator; Ogg and WebM stay in the page; scans: 0 occurrences of the credential in 2,766 files (iOS) and in logcat, the cache and the logs (Android); the R2 proxy log: 663 entries, 18 file requests `206` with the phone header, none with a credential in a URL (the 45 URL-credential entries are the page's WebSocket `access_token`, which NA-8 allows); the media sources log only an error type or a code | Proven; the sound, the Ring/Silent switch and a lock: DEC-007, a physical iPhone before a release |
| AC-003 (the desktop file viewer is at least 400 px wide) | MSP-111 (API/E2E's and delivery's run); the web layout spec in the whole web suite | delivery's run: 1440×900 and 1280×800 at the default 450 px panel: stacked, viewer 450, a wrapped row shows 42 characters; a 700 px panel: split, tree 250, viewer 449; divider far right: viewer 400 (tree 299); far left: tree 150 | Proven |
| AC-004 (more types highlighted: the file viewer and chat code blocks) | MSP-112, MSP-113 (both runs); `languageDetector.spec.ts` (38 tests) in the whole web suite | delivery's run: each of yaml, yml, toml, sh, bash, zsh, go and the rest opens with more than one Monaco token class; Prism token spans for every fence name on desktop and phone (yaml, yml, toml, bash, sh, shell, zsh, …); Python, TypeScript, JSON and Markdown unchanged | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No` to finalize. A physical iPhone check of the sound, the Ring/Silent switch and a lock is required before a release (DEC-007).
- User check reference, when needed: `N/A` (handoff summary, "Residual Risks For The User")
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default (the user did not ask for a release in the request or later; the handoff's wording "and release per RELEASE.md" names the guide, not a release). A release is available.
- **C-6, for whoever releases: ship autobyteus-574 and this ticket in the same release.** This ticket renames the bridge (`playVideo` to `playMedia`, `videoPlayer` to `mediaPlayer`) and the apps' cache folder (`video-cache` to `media-cache`) on the premise that no release holds 574 (DEC-003). Delivery checked it: `git tag --contains 7cbab1f7c2` (574's merge) lists no tag at the start of delivery and again before the final merge. Both are on `personal` once this ticket is finalized, so a release cut from `personal`'s head carries both. If 574 had been released alone, its installed apps would fall back to the page path (graceful), and its `video-cache` folder would stay unused on the phone.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/features/remote_access.md` (User Files), `autobyteus-web/docs/content_rendering.md` (Highlighted File Types), `docs/ios_mobile_access.md` (the tests line), and a correction in autobyteus-574's archived `release-notes.md`; kept from the ticket: NA-8 in `node_access_model.md`, web `file_explorer.md`, `remote_access.md`, `agent_artifacts.md`, `docs/android_mobile_access.md`, `docs/design-cases.md`, both app READMEs
- No-impact rationale (if applicable): n/a

## Ticket State Transition

- Ticket moved to `tickets/done/file-viewer-media-642`: `Yes` (before the first push of the final commit)
- Archived ticket path: `tickets/done/file-viewer-media-642`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642`, branch `codex/file-viewer-media-642`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch: `codex/file-viewer-media-642` (delivery pushes with the explicit refspec; the branch was pushed once before the build-only runs).
- Finalization target remote / branch: `origin` / `personal`, `--no-ff` merge from a `finalize/file-viewer-media-642` branch (RELEASE.md).
- The outcome (commits, push, the user's checkout, cleanup) is in the "Finalization Record" at the end of this report, written after the push.

## Release / Publication / Deployment

- Applicable: `No`
- Method: `None` (no release was asked for)
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` for this finalization; `release-notes.md` is archived with the ticket for the next release (no `## What you need to do`: an app without the new player keeps today's path).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` for the node (no stored field, no migration). The apps' video cache folder is renamed `media-cache` (`cache/media-cache` on Android, `Library/Caches/media-cache` on iOS); nothing released used `video-cache` (C-6).
- Delivery action required: `None`
- Result and evidence: n/a

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Revert the finalization merge on `personal`. Nothing persisted changes shape. The node's reference routes return to a stream whole, and the page and the apps return to the bridge names of autobyteus-574; revert 574 with it if its names are to return in an app already built from `personal` (C-6).

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

- Ticket branch `codex/file-viewer-media-642`: committed (tip `e24356e0c1`) and pushed to `origin` with the explicit refspec `HEAD:refs/heads/codex/file-viewer-media-642` (`0813c4f30e..e24356e0c1`, a fast-forward of the tip pushed earlier for the build-only release runs). Secret Gate on `origin/personal..HEAD` before the push: `PASS`, 46 commits.
- Target refreshed before the merge: `git fetch origin personal` showed `45d1b4309c`, which the ticket branch already contained (merge `0813c4f30e`); no re-integration and no re-verification were needed. C-6 was checked again at the same time: `git tag --contains 7cbab1f7c2` (autobyteus-574's merge) lists no tag.
- Merge: on `finalize/file-viewer-media-642` (from `origin/personal` `45d1b4309c`), `git merge --no-ff codex/file-viewer-media-642` = `28c2509aa2` (parents `45d1b4309c` and `e24356e0c1`; the merged tree equals the ticket branch's tree, `8b6e3cfbdd`). Secret Gate on the merged state: `PASS`, 47 commits. Hygiene check (`scripts/check_repository_artifact_hygiene.py`) on the archived tree: passed (105 373 tracked files).
- Push: `git push origin HEAD:personal` `45d1b4309c..28c2509aa2`; `origin/personal` = `28c2509aa2` afterwards.
- Release: none (no tag, no version bump, no pipeline beyond the two build-only runs, which published nothing).
- This record: committed on `finalize/file-viewer-media-642` and pushed to `origin/personal` as the commit that follows `28c2509aa2`.
- The user's checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, on `personal`): `git fetch`, then `git merge --ff-only origin/personal` after this record's push, only if it is on `personal` with no local commits and git accepts it; nothing is stashed, reset or checked out there. The result (commit, or why not) is in the terminal message.
- Cleanup, after this record's push: `git worktree remove --force /Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642` (only git-ignored and untracked build output remains), `git worktree prune`, delete the local branches `finalize/file-viewer-media-642` and `codex/file-viewer-media-642`, and delete delivery's own `/tmp/del642` and `/tmp/del642-*.txt`. Remote branch: `Not required` (the repository keeps pushed `codex/*` branches). API/E2E keeps `/tmp/api642` until the Solution Designer asks. The result is in the terminal message.
