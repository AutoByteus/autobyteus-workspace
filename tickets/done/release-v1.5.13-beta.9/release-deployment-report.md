# Release Report — release-v1.5.13-beta.9 (autobyteus-519): beta v1.5.13-beta.9

Status: **Completed: beta v1.5.13-beta.9 published (4/4 workflows, 23/23 assets).**

## Scope

- Release request (`Release Requested`, Solution Designer; `handoff-release-requested.md`): one beta, v1.5.13-beta.9, from `origin/personal`. The founder's words (2026-11-17): "Let's release one beta version."
- No validated package: docs sync, the handoff summary and Verify From Evidence do not apply; the release guide's checks are the verification.
- Content since `v1.5.13-beta.8`: autobyteus-448 part 1 (restart reminder), autobyteus-483 (shell command time limits, background-task end reasons), autobyteus-458 with 506 (phone Settings, Text size, readable conversation, the stop rule); then autobyteus-514 (desktop and Docker packages without the Claude Agent SDK's platform binaries), merged into `personal` during this release. The founder's decision (2026-11-17, relayed by the Solution Designer): "Yeah of course you to shoot include right because the beta the beta should always be the latest personal branch I believe". beta.9 carries it. 514 was proven by build-only run 44105389247 (five desktop targets) and a packaged macOS Claude turn; a Claude turn on Windows, on Linux and inside a Docker node was not run (stated in the notes).

## Project Release Guide

- `RELEASE.md` on `origin/personal` (read at `2b73308ce5`, unchanged at `fc9da63bd2`). New since the previous delivery read it: both typechecks after new base commits; record the released migrations before the script.
- Deviations: `None` so far.

## Before Cutting

- Apple developer agreement: beta.7's notarization was refused (`HTTP status code: 403. A required agreement is missing or has expired`); the founder accepted the agreement on 2026-11-17 and beta.8's notarization passed the same day (`tickets/done/search-memory-default-tool-496/release-deployment-report.md`, line 208). Delivery cannot query Apple from this machine (no notarization credentials outside the runners); the macOS jobs are the next proof.
- Released migrations: no migration added since `v1.5.13-beta.8` (`git diff v1.5.13-beta.8 HEAD -- autobyteus-server-ts/src/app-data-migrations` empty); `RELEASED` in `app-data-migration-registry-order.test.ts` unchanged, as the guide says for a release that adds none; the test passes.

## Checks Before Tagging — Run 1 (on `1c1f6f27cb`, base `2b73308ce5`)

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`: pass.
- Typechecks: server `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; web `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`.
- Registry-order test: 3/3 pass. `check_licensing.py`, `check_repository_artifact_hygiene.py`, `check_secrets.sh v1.5.13-beta.8..HEAD`: pass.
- `release_smoke.py`, run 1: Claude 3/3, Codex 3/3, AutoByteus 2/2 PASS; Grok 0/3 `Grok Build model discovery timed out`; Antigravity `agy-linked-skills-transport.e2e.test.ts` `Hook timed out in 60000ms`; the AutoByteus e2e `configured-skill-on-demand-loading.e2e.test.ts` › "keeps ordinary native tools and configured skill reads explicit in the same active run" FAIL at line 291: `expected [ '## Agent Identity', …(5) ] to deeply equal [ '## Agent Identity', …(4) ]`, received `+ "## Long-Running Commands"`. Load average 99–142.
- Run 2 (the same commit, the one rerun that decides): Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2 PASS; Grok 2/3 (one `ACP_REQUEST_TIMEOUT: initialize did not respond in time`); the same e2e failure, identical.

| Failure | Classification | Log Lines | Action | Result |
| --- | --- | --- | --- | --- |
| Antigravity `agy-linked-skills-transport` hook timeout (run 1) | Platform (this machine's load, 85–140) | `Error: Hook timed out in 60000ms.` | one rerun | Pass on run 2 |
| Grok model discovery / ACP initialize timeouts | Platform-shaped (load), not a usage limit: the founder's standing waiver ("Waive grok if no usage limit anymore") does not cover it | `Grok Build model discovery timed out`; `ACP_REQUEST_TIMEOUT: initialize did not respond in time` | rerun on the final merged state | **Pass 3/3 on the final state (run 3)**; the founder had also waived Grok for this release in his own words (2026-11-17, to delivery): "I will waive for grok because I have no usage limit now". The waiver was not needed. |
| `configured-skill-on-demand-loading.e2e.test.ts:291` | **Ours**: autobyteus-483 deliberately added "## Long-Running Commands" to every runtime prompt; this e2e still expects the old four sections (identical on both runs) | the assertion above | sent to the Solution Designer as a new change with the local check (the stage that changes a runtime prompt reruns the prompt-section e2e) | **Waived for this release by the founder**, in his words (2026-11-17, relayed by the Solution Designer): "Let's release without a fixing the test and creator follow up follow up we'll fix the stale tests". The fix becomes a follow-up Task through the PM. |

## Release Notes

- `tickets/done/release-v1.5.13-beta.9/release-notes.md`: the user-action section placed above the generated notes ("What you need to do" first; point (b) checked in code, see the release request's reply).

## Checks Before Tagging — Final (on `8152ded1d7`: `origin/personal` `fc9da63bd2` with autobyteus-514, merged as `a62c905d79`, plus this ticket's documents)

- `pnpm install --frozen-lockfile`, server `prebuild`: pass.
- Typechecks (new base commits came in): server `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; web `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`.
- Registry-order test: pass (no migration since beta.8). `check_licensing.py`, `check_repository_artifact_hygiene.py`, `check_secrets.sh v1.5.13-beta.8..HEAD`: pass.
- `release_smoke.py` (run 3): Claude 3/3, Codex 3/3, Grok 3/3, Antigravity 2/2, AutoByteus 2/2 PASS; the only failure is the waived stale e2e (`configured-skill-on-demand-loading.e2e.test.ts:291`). Models `claude: haiku`, `codex: gpt-5.6-luna`, `grok: grok-4.7`.
- Evidence: `evidence/delivery/DR1-pretag2-*` (summaries; the full step logs stay in the temp folders the script printed).


## Cutting And Rollout

- Release commit `1fdca761aa` (`chore(release): bump workspace release version to 1.5.13-beta.9`, only `autobyteus-web/package.json`), annotated tag `v1.5.13-beta.9`, by `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.13-beta.9 --no-push`; Secret Gate `fb95f90e23..HEAD` PASS; `origin/personal` checked unchanged (`fc9da63bd2`); pushed `fc9da63bd2..1fdca761aa HEAD -> personal` and the tag.
- Workflows: iOS App Store Connect Release `44123355591`, Android APK Release `44123355184`, Server Docker Release `44123354990`, Desktop Release `44123354947`.

| Failed Run And Job | Classification | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| Desktop `44123354947` attempt 1, Build macOS ARM64 and Build macOS Intel x64: `cancelled` at 16:30:03Z | Platform (GitHub runner capacity) | check-run annotations: `The job was not acquired by Runner of type hosted even after multiple attempts`; `Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times.` No step ran. | `gh run rerun 44123354947 --failed` (16:38Z), after the user asked "Did you look at the Mac OS job": delivery's poll had stopped only on `failure` and missed `cancelled` (records 2026-11-17-R8 in the reflections; the poll now stops on any non-success) | attempt 2: both macOS builds success at 17:02Z (signing and notarization passed: the Apple agreement is in effect) |
| Desktop attempt 2, Publish GitHub Release, "Wait for the server packages" | Not a failure of its own: the Server Docker Release had not published the six server packages within the 60-minute wait | `##[error]The server packages of v1.5.13-beta.9 did not appear within 60 minutes; missing: autobyteus-server-1.5.13-beta.9-linux-x64.tar.gz …` (18:06Z) | RELEASE.md Recovery "The server packages are missing": when all six were on the release (19:19Z), `gh run rerun 44123354947 --failed` (only the publish job, attempt 3) | success; `latest*.yml` at 19:21:56Z, after the six server packages |
| Server Docker `44123354990`, Build and push default multi-arch image, in progress since 16:16Z (beta.6 53 min, beta.7 53 min, beta.8 32 min for the whole job) | Under investigation: GitHub's runners are at normal speed today (Desktop Linux x64 6 min vs 7, Windows 15 vs 18, Android 3 vs 3); the lockfile is unchanged; the only change to the image build is autobyteus-514's `claude-agent-sdk-binary-packaging.mjs` step (a full walk of the server package's `node_modules`, run per architecture, arm64 under QEMU; not run inside Docker by 514's validation) | the step log is available only when the job ends | the user's screenshot of the live log showed it on `#45 [linux/arm64 runtime 2/16] RUN apt-get update && apt-get install …`; the job log after cancelling: no output from `16:41:43Z` to the cancel at `18:11Z` (a hang, not 514's step, which took ~2 s: `Removed 233 MB of Claude Agent SDK platform binaries`). Classified Platform (apt-get hung under QEMU or a stalled Debian download). `gh run cancel 44123354990`, then `gh run rerun 44123354990 --failed` | attempt 2 success (job 18:12–19:12Z; the same apt-get step 274 s); both server package jobs success |

- Android APK Release: success. iOS App Store Connect Release: success.

### Final Results

- All four workflows **succeeded**: iOS App Store Connect Release `44123355591` (attempt 1, TestFlight upload), Android APK Release `44123355184` (attempt 1), Server Docker Release `44123354990` (attempt 2), Desktop Release `44123354947` (attempt 3: macOS rebuilt in attempt 2; publish in attempt 3). No failure was ours; the tag was never moved.
- GitHub release `v1.5.13-beta.9`: `isPrerelease: true`, not a draft, **23 assets** (`evidence/delivery/DR1-release-asset-order.tsv`); GitHub "Latest" stays `v1.5.12`. Order: the six `autobyteus-server-*` files by 19:19:37Z, all four `latest*.yml` from 19:21:56Z.
- Docker Hub: `autobyteus/autobyteus-server:1.5.13-beta.9` and `:beta` at `sha256:60e6d6e7f290…`; `:latest` unchanged at `sha256:2d8affe595e0…` (1.5.12).
- Notes: GitHub's generated notes with the release ticket's `## What you need to do` / `## Good to know` above them (`gh release edit --notes-file`; `evidence/delivery/DR1-published-beta-notes.md`). None of the four tickets had its own user-action section.
- Apple: both macOS builds signed and notarized in attempt 2: the developer agreement is in effect.
- Point (b) observed live: this delivery's own run, mid-turn when the desktop updated, received at 19:26Z "The application restarted at 2026-11-17 19:26 UTC (reason: an update to v1.5.13-beta.9). Your previous turn was interrupted; … If you started any background tasks, the restart stopped them. …", as the notes say for a mid-turn agent.
- Release/publication result: `Completed` (a partial release from about 16:30Z to 19:22Z: installers, APK and TestFlight were out; desktops were offered the update only after the publish rerun).

### Docker build time (FU-002)

- Attempt 2's log: the image was built in about 27 min; `#109 exporting to GitHub Actions Cache` took 1653.7 s (27.5 min); arm64 under QEMU: `build:mobile-web` 521 s, server `build` 453 s, `pnpm install` 305 s, runtime `apt-get` 274 s (`evidence/delivery/DR1-docker-attempt2-timings.log`; attempt 1's hang: `DR1-docker-attempt1-hang-excerpt.log`).
- autobyteus-520, merged into `personal` during this release (`499a887e13`), already builds each architecture on its own native runner and exports no GitHub Actions cache; it does not add a time limit to the runtime `apt-get`. FU-002 keeps that remainder; it ships with the next release.

## Follow-ups

- `follow-ups.md`: FU-001 (the stale 483 prompt-section e2e, the founder's follow-up), FU-002 (Docker build time; mostly done by autobyteus-520). The Solution Designer sends them through the PM.

## Final Status

- Verification (the guide's checks before tagging, with the founder's waivers): `Yes`. Repository finalization: `Yes` (`personal` at the release commit `1fdca761aa`, then this record). Release: `Completed`. Blocker: `None`. Cleanup: after this record is pushed (the terminal message reports it).

