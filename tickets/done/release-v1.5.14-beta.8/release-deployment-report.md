# Release Report — release-v1.5.14-beta.8 (autobyteus-621): beta v1.5.14-beta.8

Status: **released** — all four workflows succeeded (Desktop Release on attempt 2 after one platform failure of the macOS Intel x64 notarization; Android, Docker and iOS on attempt 1), 27 of 27 assets, GitHub pre-release; **iOS 1.5.14 (354)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); Docker images at **system level 2**; nothing sent to App Store review.

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`): the Solution Designer, 2026-11-23, on the founder's explicit word relayed by the PM: "Yess please from the latest original personal".
- Base `origin/personal` @ `dad158474c` (re-checked before the cut and before each push: unchanged); `next-beta` → `1.5.14-beta.8`; no `v1.5.14-beta.8` tag existed on origin.
- Content since `v1.5.14-beta.7` (216 commits; `evidence/delivery/pretag-tickets.txt`): 551 (Grok starts under load, offers the real model list, sees workspace skills), 590 with 586 (the phone's Activity details), 602 (a test-only fix, nothing user-visible), 599 (a run continues when its runtime lost the saved session), 579 (file viewer error state, busy-host test limits), 585 (platform notices get their own row), 609 with 575 (Stopped tool status, relative links in chat, stopped-run background tasks, post-restart file reads), 615 (Messages reference files of delegated runs), and **29 (an Org run is a container of runs; one-way app-data conversion of saved organization runs)**.
- **autobyteus-29 was not named in the Task's list** ("Includes 551, 590+586, 602, 599, 579, 585, 609+575, 615") but is on `origin/personal` and so in "the latest original personal" that the founder asked for. Its release notes carry a `## What you need to do` section (a first-start conversion that cannot be undone; upgrade paired nodes together), and it adds 25 entries to the released app-data migration order. I included it, put its action in the notes next to 615's, and tell the Solution Designer.

## Project Release Guide

- `RELEASE.md` at `dad158474c` (unchanged by the base commits), followed end to end: the desktop signing-readiness check (with the process-only HTTPS rewrite of the `github.com-ryan` alias; the shared remote is unchanged), the Server Docker system-level check, the Secret Gate over everything the release adds, and the live release smoke. Deviations: the finalize branch was fast-forwarded to the archived release ticket instead of merged `--no-ff` (it only adds record commits on top of `origin/personal`, as in beta.6 and beta.7); no other. Proposed fixes: none to RELEASE.md. A workflow follow-up is in `follow-ups.md` (FU-001).

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001, fingerprint `e26a2e74…`; run again by the release script, exit 0 |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 / exit 0 (8740 / 104223 tracked files) |
| `scripts/check_secrets.sh v1.5.14-beta.7..HEAD` | PASS (216 commits) |
| `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py`, run 1 (08:13:58Z to 08:16:04Z, no load imposed) | **exit 0, 13 of 13 PASS**: Claude 3/3, Codex 3/3, **Grok 3/3**, Antigravity 2/2, AutoByteus 2/2; models `claude haiku, codex gpt-5.6-luna, grok grok-4.7`; durations live 96 s, antigravity 19 s, autobyteus 8 s |

- Evidence: `evidence/delivery/pretag-*.log|txt`, `pretag-release-smoke-run1.{log,load-samples.log,grok-startups.jsonl}`, `smoke-run.sh`, `grok-log-extract.py`.
- **Grok: no waiver was needed.** Grok passed all three scenarios on its first run, so the founder's standing rule (waive Grok only on a usage limit) was not exercised. A second smoke run was not made: RELEASE.md asks for one passing run, and Grok's free tier allows about two runs a day.

### For autobyteus-551's DEC-006: the smoke's load and Grok's start-ups

- **Load during the smoke** (`pretag-release-smoke-run1.log`, `.load-samples.log`; nothing imposed, the host's own load): 1-minute load average 41.60 at the start, then 36.86, 27.81, 29.42 and 33.15 at the 30 s samples, 34.18 at the end; the 5-minute average 32.9 to 35.3; `fseventsd` 0.4%. So this run was **not** held at a load of 40 or more throughout (DEC-006's wording): it ran at a load of about 28 to 42.
- **Grok's start-up times** (Grok's own log from a byte offset taken before the run; timing and catalog fields only, no auth field): 7 Grok processes, `max_startup_elapsed_ms` 171, 169, 174, 181, 173, 167, 161 (none above 181 ms; the 551 bounds are 90 s).
- **The stale model catalog happened live again**: the first Grok process of the run (pid 48293, 08:14:58Z) logged `had_real_catalog: false`, `model_count: 2` (Grok's built-in list) with the refresh watcher triggered, and the smoke's summary still shows `grok: grok-4.7`, so the announced list was read and a model AutoByteus offered was accepted at run start.

## Release Decision

- Decision: `Beta`. Decided by: the founder's word above, through the PM and the Solution Designer. No further question was asked.

## Release Notes

- `release-notes.md` (this folder): starts with `## What you need to do` (615's compatibility note first, as the Task asked: update the app and every node you connect to together because the message-reference link changed and the old route is gone; then 29's one-way conversion and paired-node upgrade; the Docker system-level 2 note; the TestFlight build 354; desktop beta updates), then `## What's new` (all user-visible changes since beta.7) and `## Good to know` (the trusted-workspace consequence of Grok's workspace skills and other caveats). Sections used: **autobyteus-615** and **autobyteus-29** (their `## What you need to do`), plus the others' user-visible bullets. One `**Full Changelog**` line.

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.14-beta.8 --no-push`; its trust check passed (witness `v1.5.14-beta.6`, run 44901757001); `migrations:record-released` **wrote 25 new entries** (the Org own-runs conversion family) to `released-migration-order.json` and the registry-order test passed (`Tests 1 passed`). Release commit **`807d501cec`** (`chore(release): bump workspace release version to 1.5.14-beta.8`; the file list: `released-migration-order.json`, `autobyteus-web/package.json`), annotated tag **`v1.5.14-beta.8`** (tag object points at `807d501cec`).
- Secret Gate `origin/personal..HEAD` PASS (2 commits) before the push; `origin/personal` fast-forwarded `dad158474c → 807d501cec`, then the tag, at 08:18:21Z.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 45137545425 | success, **attempt 2** (macOS Intel x64 rerun) |
| Server Docker Release | 45137545168 | success, attempt 1 |
| Android APK Release | 45137545174 | success, attempt 1 |
| iOS App Store Connect Release | 45137545153 | success, attempt 1 |

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| 45137545425 attempt 1, "Build macOS Intel x64" › "Build Electron macOS Intel x64" (08:19:47Z to 08:30:51Z) | Platform (Apple's notary service; the same commit passed on a rerun, and macOS ARM64 of the same run was notarized) | After "[macSign] AutoByteus macOS signing policy completed": `Build process failed: Error: Failed to notarize via notarytool` with the notarytool log `"status": "Invalid"`, `"statusSummary": "Archive contains critical validation errors"`, `"message": "Package AutoByteus.zip has no signed executables or bundles. No tickets can be generated."` and the warning `"The archive at AutoByteus.zip could not be unpacked."`. The workflow's in-job retry then logged `Transient Apple notarization/network failure detected on attempt 1/3. Retrying...` and attempt 2 died at once: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "prepare:shared" not found`, `exit code 254` (`evidence/delivery/rollout-desktop-attempt1-macos-x64-failure.log`) | one rerun of only the failed job: `gh run rerun 45137545425 --failed` (08:44:35Z), as RELEASE.md Recovery says | attempt 2 passed (all jobs success, the publish job ran), so the failure was not the commit's |

- **The in-job retry is broken (ours, FU-001).** Whatever Apple's first answer meant, the workflow's own retry of the whole build in the same checkout fails before building ("Command prepare:shared not found"), so it never gives notarization a second try. It did not change the outcome here (the job-level rerun worked) and is recorded for the Solution Designer in `follow-ups.md`.
- Android and Docker finished first (08:25:06Z and 08:27:24Z), iOS at 08:58Z, Desktop attempt 2 at 09:11Z.

### iOS

- **Build: 1.5.14 (354)** (`iOS build number: 354`; `MARKETING_VERSION: 1.5.14`, `CURRENT_PROJECT_VERSION: 354`).
- Xcode_27.2, iPhoneOS SDK 27.2; "all 18 slots match the logo (on #1E3A8A)"; "The demo answers all 252 compiled operations"; core tests "Executed 56 tests, with 0 failures"; the UI smoke suite `Selected tests` passed.
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `51a017a1-ad00-462f-9f1e-59c13e7cbcdb`; **no ITMS message** (0 lines) in the log. Nothing sent to App Store review; no reply to Apple.

### Published artifacts checked

- Pre-release, not a draft; GitHub Latest stays `v1.5.13`.
- **27 of 27 assets** (2 Android, 6 server packages, 15 desktop files, 4 `latest*.yml`); the four `latest*.yml` (09:11:11Z) are newer than all six `autobyteus-server-*` files (last 08:26:58Z) (`evidence/delivery/published-state.txt`).
- Docker (registry API): `:1.5.14-beta.8` = `:beta` = index `sha256:7fb3791fcb…`, exactly linux/amd64 `sha256:003dcbb306…` and linux/arm64 `sha256:47a786c9e0…`, the two package jobs' digests; `:latest` = `1.5.13` = `sha256:13df73db92…`, unchanged.
- **System level 2:** both image builds "System level 2: the system part is unchanged (61cd87f9…)" and "Wrote server-package.json: 1.5.14-beta.8 linux-<arch>, Node modules 127, system level 2, 66 migrations"; the released server package descriptions (x64 and arm64) have `systemLevel: 2`.
- Notes: `release-notes.md` above the generated notes with **one** `**Full Changelog**` line (the generated body had two identical lines; the duplicate removed); the body starts with `## What you need to do`; pre-release kept.
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

## Repository Finalization

- Release commit `807d501cec` and the tag are on `origin` (above). The record commit (this folder, with the iOS build number filled in, the rollout evidence and `follow-ups.md`) follows on `origin/personal` as a fast-forward after a fetch and a Secret Gate.
- User's checkout, worktree cleanup and the record copy: recorded in the terminal message and `delivery-revision-record.md` after the record commit.

## Rollback Criteria

- Revert the release commit and the merges on `personal` and cut a new release. Desktop updates never downgrade; `:beta` and `:latest` only move forward; pin an earlier Docker tag to go back.
- **This release cannot be rolled back after the first start:** it carries the one-way conversion of saved organization runs (autobyteus-29); the notes say so and tell users who need to go back to contact support instead of installing an older version (RELEASE.md, Rollback).

## Final Status

- Verification complete (RELEASE.md's checks): `Yes`
- Repository finalization complete: recorded in `delivery-revision-record.md` after the record commit
- Release complete: `Yes` (four workflows green, 27 of 27 assets, Docker and TestFlight verified)
- Unresolved blocker: `None`
