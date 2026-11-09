# Delivery / Release / Deployment Report — phone-registered-folders-436 (autobyteus-436)

## Release / Publication / Deployment Scope

- Ticket branch `codex/phone-registered-folders-436`, `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Release: **Beta**, the next after `v1.5.12-beta.10`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` `a85bf4f38d` (unchanged since the previous delivery read it).
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.
- Build-only release run: not required. The ticket changes no release workflow, packaging, runner or build step/gate (server route, phone views, tests, docs).

## Handoff Summary

- Handoff summary artifact: `tickets/done/phone-registered-folders-436/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/phone-registered-folders-436/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `97ed263074`
- Latest tracked remote base reference checked: `origin/personal` `a85bf4f38d`
- Base advanced since bootstrap: `Yes` (one commit: the beta.10 release record, two ticket documents)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`27a3f0b06f`, the code reviewer's untracked CRR-001/CRR-002 records)
- Integration method: `Merge` (`e8d8b1a073`), no conflicts
- Post-integration executable checks rerun: `Yes`: `npx vitest run tests/e2e/node-files` (autobyteus-server-ts) → `Test Files 1 passed`, `Tests 5 passed` (`evidence/delivery/DR1-node-files-e2e.log`)
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`. API-REV-001 Pass, final confidence 95%, no category below 90%, every critical AC directly proven, no user-only part.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-01 `evidence/api-e2e/API-01-mobile-shell.log` | 23 `[mobile-shell] MSP-xx Pass` lines, including MSP-16/17 (file links outside the run's folder) | Proven |
| AC-002 | R-IMP IMP-05 `evidence/implementation/IMP-05-server-e2e-node-files-access.log`; `tests/e2e/node-files/node-files.e2e.test.ts`; DR1-01 | `node-files.e2e.test.ts (5 tests)` pass: owner and phone read; peer and memory sync 403 `NODE_ROUTE_NOT_PERMITTED`, none 401; POST/PUT/DELETE not served | Proven |
| AC-003 | IMP-05; API-02 `API-02-docker/API-02-phone-docker.log` | `404 NODE_FILE_NOT_FOUND`, `400 NODE_FILE_IS_FOLDER`; relative and `..` 400; symbolic link followed | Proven |
| AC-004 | API-01 MSP-16, API-02b, API-03 `API-03-unreadable/API-03-unreadable.log` | the two messages; `NODE_FILE_UNREADABLE` → "The file preview could not be opened." | Proven |
| AC-005 | API-02, API-02b `API-02-docker/API-02b-conversation.log` | a test-owned Docker node over Tailscale: `tap /home/autobyteus/shared/ac005-notes.md: opens read-only ("…SHARED-MARKER-436…")`, `ac005-large.pdf (18 MB): {"canvases":1,"drawn":true}, 721 ms` | Proven |
| AC-006 | API-01 23/23, API-04 desktop probes, API-05 + `API-05-base-comparison.log` | 15 server e2e files fail identically on the base `97ed263074` (0 tests failing on the branch that pass on the base) → FU-004 (urgent) | Proven for this ticket |

- More evidence requested: `None`.
- User check needed: `No`. The real-phone large-PDF item is a residual risk, not an AC part.

## Release Decision

- Decision: `Beta`
- Decided by: the user, in advance for this ticket: "There will be a new ticket coming for the deploy, so for this new ticket we also deploy a new beta version, and of course the same waive conditions." The waiver: the Codex and Grok runtimes of `scripts/release_smoke.py` are waived only on a usage-limit refusal.

## Docs Sync Result

- Docs sync artifact: `tickets/done/phone-registered-folders-436/docs-sync-report.md`
- Docs sync result: `No impact` by delivery (the ticket's own doc updates are in `271656acc0`).

## Release Notes Summary

- `tickets/done/phone-registered-folders-436/release-notes.md` (written by delivery). It has no `## What you need to do` section: the phone page comes from the node, so updating the node is enough and the Android app is unchanged.

## Ticket State Transition

- Ticket moved to `tickets/done/phone-registered-folders-436/`: `Yes` (`971478a0c4`); `scripts/check_repository_artifact_hygiene.py` passed before the final commit.

## Repository Finalization

- Bootstrap context source: `RELEASE.md` § Finalization Target.
- Ticket branch `codex/phone-registered-folders-436` at `971478a0c4`: Secret Gate PASS (11 commits), pushed.
- Finalization target: `origin` / `personal`; target advanced after verification: `No` (`a85bf4f38d` at each fetch).
- Merge: `finalize/phone-registered-folders-436` from `origin/personal`, `git merge --no-ff` → `6f3fe39b8b`; Secret Gate on the merged state PASS; pushed `a85bf4f38d..6f3fe39b8b`.
- After the release commit: pushed `6f3fe39b8b..72c95ddc9e` (fetched and checked unchanged first).
- Repository finalization status: `Completed`.

## Checks Before Tagging (merged state `6f3fe39b8b`)

| Check | Result | Evidence (`evidence/delivery/`) |
| --- | --- | --- |
| `python3 scripts/check_licensing.py` | Pass | `DR1-pretag-licensing.log` |
| `python3 scripts/check_repository_artifact_hygiene.py` | Pass | `DR1-pretag-hygiene.log` |
| `scripts/check_secrets.sh v1.5.12-beta.10..HEAD` | Pass | `DR1-pretag-secrets.log` |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | Pass | `DR1-pretag-install.log`, `DR1-pretag-prebuild.log` |
| `python3 scripts/release_smoke.py` | Pass under the user's waiver: Claude 3/3, Antigravity 2/2 and AutoByteus 2/2 PASS; Grok 1 PASS, 2 FAIL on `429 Too Many Requests: subscription:free-usage-exhausted` (quota); Codex 3/3 FAIL on `You've hit your usage limit` (quota). Both are waived by the user on a usage limit only. Models `claude: haiku`, `codex: gpt-5.6-luna`, `grok: grok-4.7` | `DR1-pretag-release-smoke.log` |

## Version / Tag / Release Commit

- `bash scripts/desktop-release.sh beta --branch finalize/phone-registered-folders-436 --no-push` → `72c95ddc9e chore(release): bump workspace release version to 1.5.12-beta.11`, annotated tag `v1.5.12-beta.11`; Secret Gate over `6f3fe39b8b..HEAD` PASS; tag pushed.

## Release / Publication / Deployment

- Applicable: `Yes` (Beta `v1.5.12-beta.11`).
- Method: `Project Release Guide` (Cutting The Release, Watching The Rollout, Recovery).
- Pipelines: Desktop Release `42570258166`, Android APK Release `42570258165`, iOS App Store Connect Release `42570258280`, Server Docker Release `42570258186`.
- Delivery's own miss: the first watchers (`gh run watch` per run) reported only when every run had finished, so the Android failure at 2m 40s was not acted on until the user pointed it out. The guide asks for action on the first failure. From then on, a poll stops at the first failed job.

| Failed Run And Job | Classification | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| `42570258165` attempt 1, Build Android APK / Build APK | Platform | `Downloading https://services.gradle.org/distributions/gradle-8.13-bin.zip` → `java.io.IOException: Server returned HTTP response code: 504 for URL: https://github.com/gradle/gradle-distributions/releases/download/v8.13.0/gradle-8.13-bin.zip` (`evidence/delivery/DR1-android-run1-failure.log`): the Gradle wrapper's download, before any project code | `gh run rerun 42570258165 --failed` | attempt 2 failed identically |
| `42570258165` attempt 2, same job | Platform (not "unclear": the cause is in the log) | the same 504 (`DR1-android-run2-failure.log`). GitHub status: unresolved incident "Increased timeouts due to surge in anonymous users", created `2026-11-09T05:59:07Z` (the run started `05:58:02Z`). The same URL downloads from this machine (200). beta.10's Android run `42557024043` succeeded at `03:33Z`, and `git diff v1.5.12-beta.10 v1.5.12-beta.11 -- autobyteus-android .github/workflows/release-android.yml` is empty | on the user's word ("it's from GitHub itself … re-trigger it"), rerun again while the incident was still open: `gh run rerun 42570258165 --failed` (attempt 3) | attempt 3 failed: `Downloading from https://services.gradle.org/distributions/gradle-8.13-bin.zip failed: timeout (10000ms)` at 06:12Z (`DR1-android-run3-failure.log`), incident still investigating |
| `42570258166` attempt 1, Build Linux ARM64 / Build Electron Linux ARM64 | Platform | the project build finished; electron-builder then failed to fetch its AppImage tool: `cannot resolve https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage-12.0.1/appimage-12.0.1.7z: status code 504` → `ERR_ELECTRON_BUILDER_CANNOT_EXECUTE` (`evidence/delivery/DR1-desktop-linux-arm64-failure.log`); the same GitHub incident, 06:05Z | on the user's word, `gh run rerun 42570258166 --failed` as soon as the Desktop run finished (it re-runs the failed builds and the publish job) | superseded by the final rerun below |
| `42570258166` attempt 1, Build Linux x64 | Platform | `cannot resolve https://github.com/electron/electron/releases/download/v42.11.16/electron-v42.11.16-linux-x64.zip: status code 504` (`evidence/delivery/DR1-desktop-linux-x64-failure.log`), 06:05Z, the same incident | the same Desktop rerun | superseded by the final rerun below |
| `42570258165` attempt 3 | Platform (the same incident; the download host redirects to GitHub's release storage) | see above | no blind rerun: one rerun of Android and Desktop's failed jobs once GitHub marks the incident resolved and the Desktop run has finished | superseded by the final rerun below |
| `42570258166` attempt 1, Build Windows x64 | Platform | `cannot resolve https://github.com/electron/electron/releases/download/v42.11.16/electron-v42.11.16-win32-x64.zip: status code 504`, 06:11Z, the same incident (`DR1-desktop-windows-x64-failure.log`) | the same Desktop rerun after the incident resolves | superseded by the final rerun below |
| `42570258165` attempt 4 (started 06:20Z from the user's GitHub account) | Platform | `Server returned HTTP response code: 504 for URL: https://github.com/gradle/gradle-distributions/releases/download/v8.13.0/gradle-8.13-bin.zip`, 06:22Z | — | failed |
| Desktop `42570258166` attempt 1 complete: macOS ARM64, macOS Intel x64 success; Windows x64, Linux x64, Linux ARM64 failure (504s above); Publish skipped. iOS `42570258280` success. | — | — | on the user's word ("retrigger the failed one"), while the incident was still open: `gh run rerun 42570258166 --failed` (attempt 2) and `gh run rerun 42570258165 --failed` (attempt 5) | **both succeeded** |

- Final pipeline results: Desktop Release `42570258166` **success** (attempt 2: Windows x64, Linux x64, Linux ARM64 and the publish job; macOS from attempt 1); Android APK Release `42570258165` **success** (attempt 5); iOS App Store Connect Release `42570258280` **success** (attempt 1); Server Docker Release `42570258186` **success** (attempt 1). All the failures were the platform's (GitHub incident "Increased timeouts due to surge in anonymous users", from 05:59Z): no code change, no new version, the tag unchanged.
- Published artifacts checked: `gh release view v1.5.12-beta.11`: `isPrerelease: true`, **23 assets**, including the APK, the Windows `.exe` and both Linux AppImages. Publish order: all four `latest*.yml` are newer than all six `autobyteus-server-*` files (`evidence/delivery/DR1-release-asset-order.tsv`). Docker Hub `autobyteus/autobyteus-server:1.5.12-beta.11` and `:beta` at `sha256:5eae0a7ae68a…`.
- Beta notes with a user action: none. The release's only ticket since `v1.5.12-beta.10` is this one, and its notes have no `## What you need to do`, so the generated notes stand alone.
- Release/publication/deployment result: `Completed` (a partial release from about 06:00Z until the reruns finished).
- Release notes handoff result: `Not required` for a beta (generated notes).
- Lesson for the release guide (proposed, not changed): none; the guide's Watching The Rollout already says to watch the four runs together and act on the first failure. Delivery's watchers did not; that is delivery's practice, not a gap in the guide.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436`
- Worktree removal and prune, and deletion of the local `codex/phone-registered-folders-436` and `finalize/phone-registered-folders-436` branches (both in `origin/personal`): after this record is pushed; the result is reported in the terminal message.
- Remote branch cleanup result: `Not required` (the repository keeps `codex/*` branches).

## Rollback Criteria

- Revert the merge on `personal` and cut a new beta. The change adds a read-only route and phone views, with no persisted data.

## Final Status

- Verification complete: `Yes` (from the evidence)
- Repository finalization complete: `Yes`
- Applicable release complete: `Yes` (beta `v1.5.12-beta.11`, 4/4 workflows, 23/23 assets)
- Applicable safe cleanup: `Yes`, after this record is pushed
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
