# Release Report — release-1.5.12-stable-438 (autobyteus-438): stable v1.5.12

## Release / Publication / Deployment Scope

- Release request (`Release Requested`, Solution Designer; handoff `handoff-release-requested.md`): stable **v1.5.12**, exactly the content of `v1.5.12-beta.11` (`72c95ddc9e`). No software change: `git diff --stat v1.5.12-beta.11 <merged state> -- . ':!tickets'` is empty. Only the version number and the curated notes change.
- No validated package: docs sync, the handoff summary and Verify From Evidence do not apply. The release guide's checks are the verification.

## Project Release Guide

- `RELEASE.md` on `origin/personal` `af75cdd544`, stable path (curated notes, GitHub "Latest", Docker `:latest`).
- Deviations: `None`. The Secret Gate before tagging ran over `v1.5.11..HEAD` (everything the stable adds since the previous stable), wider than the previous tag `v1.5.12-beta.11`.
- Proposed guide fixes: `None`.

## Settled With The User (2026-11-09)

| Item | Decision, in the user's words where required |
| --- | --- |
| Smoke check waivers | "Waive for token limit": **Codex and Grok waived** for v1.5.12 on their token limits only. The beta waivers did not carry over; this waiver was asked for at release time. |
| Curated notes, user actions first | the draft was presented; no changes requested ("we release the stable version based on the latest beta") |
| autobyteus-447 (15 server e2e files fail since the node key gate) | delivery's judgement, presented to the user: all 15 fail at the gate because the tests send no key (436's `API-05-server-e2e.log`: 69 `NODE_CREDENTIAL_REQUIRED`, `expected 401 to be 200` ×9, GraphQL data undefined after the refusal); none fails inside its feature. They therefore prove nothing either way about those features under the gate. The product evidence for the stable is 437's and 436's validation, the betas in daily use, and today's smoke check. Judged sufficient for a stable, with that residual risk, and 447 recommended first after the release. Accepted by the user (no objection). |
| autobyteus-441 (phone key capabilities, expiry) | not built; stated in the notes' "Good To Know" (a paired phone reads any node file read-only until revoked; phone keys do not expire) |
| autobyteus-430 (standalone application host) | stated in "Good To Know": no key check yet; keep it on localhost |
| Docker | `:latest` (and `:beta`) move to 1.5.12; the user's nodes are updated later on his word |
| License | unchanged: `LICENSING.md` and `LICENSE` identical to `v1.5.11` and `v1.5.12-beta.11`; `check_licensing.py` passes |

## Release Notes

- Curated from the archived `release-notes.md` of the 16 tickets with notes among the 34 first-parent merges `v1.5.11..v1.5.12-beta.11`, plus user-visible merges without notes (autobyteus-387 DeepSeek Harness, 385 Runs view, 390, 393, 415, 440, restart-reliability-3), for users going from v1.5.11 straight to v1.5.12. The layout follows v1.5.11: What you need to do, Good To Know, What's New, Improvements, Fixes, Upgrade Notes.
- Delivery checks on the facts: the Keychain item is "AutoByteus Safe Storage" (`productName: 'AutoByteus'`, `autobyteus-web/build/scripts/build.ts`); the Docker order is reinstall launcher → `upgrade --all --tag latest` → `setup-code`, because a node on an older version has no control socket for the code; the Runs view is new since 1.5.11 (Workspaces and Projects were in 1.5.11).
- Artifact: `tickets/done/release-1.5.12-stable-438/release-notes.md`; the release script wrote it to `.github/release-notes/release-notes.md` unchanged (`diff`: identical).

## Repository Finalization

- Ticket branch `codex/release-1.5.12-stable-438` (`17dca90686`: the notes, the archived ticket): Secret Gate PASS, pushed.
- `finalize/release-1.5.12-stable-438` from `origin/personal` `af75cdd544`, `git merge --no-ff` → `fd5cab4406`; Secret Gate PASS; pushed `af75cdd544..fd5cab4406`.
- Release commit `8338f97e59 chore(release): bump workspace release version to 1.5.12` (version and curated notes file); Secret Gate `fd5cab4406..HEAD` PASS; pushed `fd5cab4406..8338f97e59` after checking `origin/personal` was unchanged.
- Tag: annotated `v1.5.12` on `8338f97e59`, pushed. Android versionCode `10051299` (within limits).

## Checks Before Tagging (merged state `fd5cab4406`)

| Check | Result | Evidence (`evidence/delivery/`) |
| --- | --- | --- |
| `python3 scripts/check_licensing.py` | Pass | `DR1-pretag-licensing.log` |
| `python3 scripts/check_repository_artifact_hygiene.py` | Pass | `DR1-pretag-hygiene.log` |
| `scripts/check_secrets.sh v1.5.11..HEAD` | Pass | `DR1-pretag-secrets.log` |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | Pass | `DR1-pretag-install.log`, `DR1-pretag-prebuild.log` |
| `python3 scripts/release_smoke.py` on `fd5cab4406` | Pass under the user's waiver: Claude 3/3, Antigravity 2/2, AutoByteus 2/2 PASS; **Codex 3/3 FAIL** "You've hit your usage limit … try again at Nov 10th, 2026 10:31 AM"; **Grok 3/3 FAIL** `429 … subscription:free-usage-exhausted` (rolling 24 h). Not covered for this stable: Codex and Grok (also not covered in beta.9–beta.11 for Codex). Models `claude: haiku`, `codex: gpt-5.6-luna`, `grok: grok-4.7` | `DR1-release-smoke-2-merged-state.log`; the first run on `af75cdd544`, before the user's decision, had the same result: `DR1-release-smoke-1.log` |

## Release / Publication / Deployment

- Pipelines: Android APK Release `42579261738`, Desktop Release `42579261668`, iOS App Store Connect Release `42579261608`, Server Docker Release `42579261561`, polled together, stopping at the first failed job.

| Failed Run And Job | Classification | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| Android `42579261738` attempt 1, Build Android APK / Build APK | Platform | `java.io.IOException: Server returned HTTP response code: 504 for URL: https://github.com/gradle/gradle-distributions/releases/download/v8.13.0/gradle-8.13-bin.zip` at 07:28Z, the Gradle wrapper's download, before any project code (`evidence/delivery/DR1-android-run1-failure.log`). GitHub incident "Increased timeouts due to surge in anonymous users" still open ("monitoring"); the same failure class as v1.5.12-beta.11 | `gh run rerun 42579261738 --failed` (attempt 2) | attempt 2 failed |
| Android `42579261738` attempt 2 | Platform | `Downloading from https://services.gradle.org/distributions/gradle-8.13-bin.zip failed: timeout (10000ms)` at 07:30Z (`DR1-android-run2-failure.log`). GitHub at 07:03Z: "The problem with anonymous traffic receiving 504 status codes has been mitigated. We are continuing to observe" | `gh run rerun 42579261738 --failed` (attempt 3) | attempt 3 failed: the same timeout at 07:34Z (`DR1-android-run3-failure.log`); the same URL also answered 504 from delivery's machine (11.5 s) |

- Proposed follow-up (a new change, for the Solution Designer): the Android release job downloads the Gradle distribution anonymously from GitHub on every run, so a GitHub incident against anonymous traffic fails it (5 attempts on v1.5.12-beta.11, 2+ on v1.5.12). Caching the Gradle distribution in the workflow (for example `gradle/actions/setup-gradle` or an `actions/cache` of `~/.gradle/wrapper/dists`) would remove that dependency. It cannot change this tag.
| Desktop `42579261668` attempt 1, Build Linux x64 | Platform | `cannot resolve https://github.com/electron/electron/releases/download/v42.11.16/electron-v42.11.16-linux-x64.zip: status code 504` at 07:31Z (`DR1-desktop-linux-x64-failure.log`), the same incident | `gh run rerun 42579261668 --failed` once the run has finished | superseded: see the final results |
| Android attempt 3, Desktop Linux x64 | Platform | above | superseded: on the user's word ("can you please retrigger those"), Android rerun at once (attempt 4) and Desktop's failed jobs rerun as soon as its Windows job finishes | superseded: see the final results |
| Desktop `42579261668` attempt 1, Build Linux ARM64 / macOS ARM64 / macOS Intel x64 | Platform | `cannot resolve https://github.com/electron/electron/releases/download/v42.11.16/electron-v42.11.16-{linux-arm64,darwin-arm64,darwin-x64}.zip: status code 504` at 07:33–07:35Z (`DR1-desktop-other-failures.log`) | the same Desktop rerun | superseded: see the final results |
| Desktop attempt 1, Build Windows x64 | Platform | `cannot resolve https://github.com/electron/electron/releases/download/v42.11.16/electron-v42.11.16-win32-x64.zip: status code 504` at 07:38Z | `gh run rerun 42579261668 --failed` at 07:39Z (attempt 2: all five builds and the publish job) | superseded: see the final results |
| Android attempt 4 | Platform | `Downloading from https://services.gradle.org/distributions/gradle-8.13-bin.zip failed: timeout (10000ms)` at 07:40Z; at 07:42Z the same downloads answered from delivery's machine (Gradle 1.4 s, Electron 11.4 s) | `gh run rerun 42579261738 --failed` (attempt 5) | superseded: see the final results |
| Android attempt 5 | Platform | the Gradle download passed; then `Could not GET 'https://github.com/JetBrains/kotlin/releases/download/v2.0.21/kotlin-compiler-embeddable-2.0.21.jar'. Received status code 504 from server: Gateway Time-out` (Maven Central redirects to a GitHub release) at 07:43Z (`DR1-android-run5-failure.log`) | `gh run rerun 42579261738 --failed` (attempt 6), on the user's standing request to retrigger | superseded: see the final results |
| Android attempt 6 | Platform | `Server returned HTTP response code: 504 for URL: https://github.com/gradle/gradle-distributions/releases/download/v8.13.0/gradle-8.13-bin.zip` at 07:45Z (`DR1-android-run6-failure.log`) | no more immediate reruns: GitHub's downloads flap (they answered at 07:42Z and failed again at 07:45Z). Automatic rerun once they answer from delivery's machine three times in a row over about six minutes | superseded: see the final results |
| Desktop attempt 2, Build Linux ARM64 | Platform | `cannot resolve https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage-12.0.1/appimage-12.0.1.7z: status code 504` at 07:46Z (`DR1-desktop-attempt2-linux-arm64-failure.log`) | the same automatic rerun, once the Desktop run has finished | superseded: see the final results |
- iOS App Store Connect Release `42579261608`: **success** (attempt 1, including the TestFlight upload).
| Android attempt 7 (rerun at 07:58Z after three good download checks from delivery's machine) | Platform | `Server returned HTTP response code: 504 for URL: https://github.com/gradle/gradle-distributions/releases/download/v8.13.0/gradle-8.13-bin.zip` at 08:00Z; GitHub at 07:43Z: "a repeated increase in 504 errors for anonymous and unauthenticated traffic, including … release downloads" (incident https://www.githubstatus.com/incidents/c9px7cw2ghrs) | automatic reruns, every ~3 min, only while the failure is that download class, at most 15 | superseded: see the final results |
- Android APK Release `42579261738`: **success** on attempt 9 (automatic reruns at 08:03Z and 08:08Z after attempts 7 and 8 failed on the same Gradle 504/timeout); the signed APK is published on the release.
- Desktop attempt 3: Linux x64, Linux ARM64 (08:05Z) and Windows x64 (08:10Z) failed on `cannot resolve https://github.com/electron/electron/releases/download/v42.11.16/electron-v42.11.16-{linux-x64,linux-arm64,win32-x64}.zip: status code 504`. The user asked for an immediate retrigger; GitHub refuses one while the run's macOS jobs are still running (`POST …/jobs/<id>/rerun` → 403 "The workflow run containing this job is already running"), so the automatic job reruns them as soon as the run finishes.

### Final Results

- All four workflows **succeeded**: Android APK Release `42579261738` (attempt 9; automatic reruns at 08:03Z and 08:08Z), Desktop Release `42579261668` (attempt 4: macOS ARM64 and Intel x64 from attempt 3; Linux x64, Linux ARM64 and Windows x64 rerun automatically at 08:24Z; then the publish job), iOS App Store Connect Release `42579261608` (attempt 1, TestFlight upload), Server Docker Release `42579261561` (attempt 1).
- Every failure was the platform's: GitHub incident "Increased timeouts due to surge in anonymous users" (https://www.githubstatus.com/incidents/c9px7cw2ghrs), 504s and timeouts on anonymous release downloads (the Gradle distribution, a Kotlin compiler jar, the Electron zips, electron-builder's AppImage tool). No code change; the tag `v1.5.12` was never moved; no new version used.
- GitHub release `v1.5.12`: `isPrerelease: false`, `isDraft: false`, **GitHub "Latest"** (`/releases/latest` → `v1.5.12`), **23 assets** (`evidence/delivery/DR1-release-asset-order.tsv`): the APK and `.sha256`; six server packages; both Linux AppImages; macOS arm64/x64 `.dmg`/`.zip` with blockmaps; the Windows `.exe`; `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`. Publish order: every `latest*.yml` is newer than all six `autobyteus-server-*` files.
- Release notes: the published body is the curated `release-notes.md` (identical apart from one trailing blank line; `evidence/delivery/DR1-published-release-notes.md`).
- Docker Hub: `autobyteus/autobyteus-server:1.5.12`, `:latest` and `:beta` all at `sha256:2d8affe595e0…`. The user's nodes are not updated by delivery; he or the PM updates them on his word.
- Release/publication result: `Completed` (a partial release from about 07:28Z until the Desktop publish at the end).

## Follow-ups

- `follow-ups.md`: FU-001 (cache the Gradle and Electron downloads in the release workflows), FU-002 (release the phone apps only when they change; the user's idea), FU-003 (rebuild and publish chosen desktop platforms for an existing tag). The Solution Designer sends them.

## Post-Finalization Cleanup

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-1.5.12-stable-438`: removed and pruned after this record is pushed; local branches `codex/release-1.5.12-stable-438` and `finalize/release-1.5.12-stable-438` deleted (both in `origin/personal`); the remote ticket branch is kept (repository convention). Result reported in the terminal message.

## Final Status

- Verification (the release guide's checks): `Yes`
- Repository finalization: `Yes` (`personal` at the release commit `8338f97e59`, then this record)
- Release: `Yes`. Stable `v1.5.12`, 4/4 workflows, 23/23 assets, Latest, Docker `:latest`
- Unresolved blocker: `None`
- Terminal package eligible for return: `Yes`
