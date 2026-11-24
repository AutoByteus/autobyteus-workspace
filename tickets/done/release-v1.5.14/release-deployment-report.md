# Release Report — release-v1.5.14 (autobyteus-635): STABLE v1.5.14

Status: **released** — all four workflows succeeded on attempt 1, 27 of 27 assets, GitHub release **`v1.5.14` is Latest** (not a pre-release, not a draft); **iOS 1.5.14 (357)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); Docker **`:latest`, `:beta` and `:1.5.14` are one index** at **system level 2**; nothing sent to App Store review. **Codex was waived for this stable by the founder** (below): the release smoke passed 10 of 13, and the three Codex cases failed only on Codex's usage limit.

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`): the Solution Designer, 2026-11-24; the Task (`/project_task_manager`, autobyteus-635): "Founder approved cutting **STABLE release `v1.5.14`** from the latest `origin/personal`".
- Base `origin/personal` @ `fab18b2068` (re-checked before the cut and before the push: unchanged); no `v1.5.14` tag existed locally or on origin before the push. The previous stable is `v1.5.13`; the previous beta is `v1.5.14-beta.10`.
- Content since `v1.5.13` (1110 commits; `evidence/delivery/pretag-tickets.txt`): all of `v1.5.14-beta.1` to `beta.10`, plus two merges that **ship in this stable without a beta**: **autobyteus-628** (the conversation keeps its own order, and every row time is the node's) and **autobyteus-627** (agent packages and skill sources can be private GitHub repositories, imported and updated with the node's GitHub token, sent only to GitHub).
- Checked from the diff `v1.5.14-beta.10..fab18b2068`: **no app-data migration, Prisma, Docker, workflow or script file changed (0 files)** and `RELEASE.md` is unchanged (0 files). The only Docker mention is a new E2E test. The released migration order is unchanged, so the release commit holds only the version bump and the synced notes. System level stays 2.
- As the Task asked, the notes start with **"What you need to do"**: (1) Docker nodes: `autobyteus-docker upgrade --all` (system level 2); (2) the one-way conversion of saved organization runs (autobyteus-29), so do not go back to `v1.5.13` or older after the first start; (3) update the app and the paired nodes together (autobyteus-615 and autobyteus-628's node-stamped times). Autobyteus-627's private GitHub repositories are in "What's New".

## Project Release Guide

- `RELEASE.md` at `fab18b2068` (unchanged since beta.10), followed end to end: the desktop signing-readiness check (with the process-only HTTPS rewrite of the `github.com-ryan` alias; the shared remote is unchanged), the Server Docker system-level check, licensing and hygiene checks, the Secret Gate over everything the release adds, the live release smoke, then `scripts/desktop-release.sh release 1.5.14 --release-notes … --no-push`.
- **Deviations:** (a) the Codex cases were waived by the founder (below), as RELEASE.md allows ("the user waives that runtime for this release and the waiver is recorded"); (b) the finalize branch was fast-forwarded to the archived release ticket instead of merged `--no-ff` (it only adds record commits, as in beta.6 to beta.10). Proposed fixes to RELEASE.md: none. Beta.8/beta.9's FU-001 (the macOS in-job retry) is still unfixed and did not matter this time: macOS Intel x64 passed the first time.

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001, fingerprint `e26a2e74…`; run again by the release script, exit 0 (witness unchanged) |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 ("Licensing is consistent", 8782 files) / exit 0 (104781 files) |
| `scripts/check_secrets.sh v1.5.13..HEAD` | **PASS** (1110 commits, no secrets) |
| `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py`, run 1 (2026-11-24 09:24:32Z to 09:26:36Z on `fab18b2068`, no load imposed) | **exit 1, 10 of 13 PASS**: Claude 3/3, **Grok 3/3**, Antigravity 2/2, AutoByteus 2/2; **Codex 0/3** (all three scenarios, the same error: `You've hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits or try again at Nov 27th, 2026 7:43 AM.`, `RUNTIME_ERROR`); models `claude haiku, codex gpt-5.6-luna, grok grok-4.7`; durations live 90 s, antigravity 22 s, autobyteus 10 s |

- Evidence: `evidence/delivery/pretag-*.log|txt`, `pretag-release-smoke-run1.{log,load-samples.log,grok-startups.jsonl}`, the three step logs `pretag-release-smoke-run1-{live,antigravity,autobyteus}.log`, `smoke-run.sh`, `grok-log-extract.py` (timing and catalog fields only; no auth field is read), `release-script.log`.
- No other failure in any runtime: the only refusals in the live log are the Codex "usage limit" lines.
- **Grok: no waiver was needed**; it passed all three scenarios on its first run. Its 7 processes started in 176 to 427 ms (427, 191, 178, 185, 181, 200, 176 ms; the 427 ms one is the first process, which also did the first model-catalog load). The smoke's load (the host's own, nothing imposed): 1-minute average 93.73 at the start, then 83.02, 69.85, 61.33, 63.02, and 62.38 at the end. This is for the DEC-006 data (Grok startup under host load): Grok passed with the host load average near 60 to 95.

## Codex waiver (RELEASE.md, Checks Before Tagging; the founder's decision)

- **Authority.** The standing rule ("Waive grok if no usage limit anymore") covers Grok only; the Task's strict gate says Codex is not pre-waived and needs the founder's explicit words. The release was **held before any commit, tag or push** (blocked message to the Solution Designer with the options: waive, wait for the reset, or free Codex earlier).
- **The founder's words, verbatim, directly to the delivery engineer in its conversation on 2026-11-24: "Waive codex I trust it works"** (`codex-waiver.md`, `codex-waiver-question.md`).
- **Scope: Codex for STABLE `v1.5.14` only.** It does not carry over to any later release.
- **Reason, as the founder gave it:** he trusts that Codex works. The refusal was a quota refusal only (nothing else failed), and the limit runs until Nov 27, 2026 7:43 AM.
- **What stays untested:** Codex on the merged state. Codex last passed the smoke on beta.9's commit (`13575c21f8`; also beta.7 and beta.8) and was waived for beta.10. Since beta.10 one Codex source file changed (`codex-agent-runtime-strategy.ts`: the latest-version check now passes the node's GitHub token reader, from autobyteus-627; not the run path) plus four Codex tests; shared code every runtime uses also changed (autobyteus-628's conversation order and node times; autobyteus-53's run-model-selection and runtime-switch). Claude and Grok runs through those paths passed on the merged state (6 of 6).
- **Recommendation (not a decision):** run the full release smoke with Codex after Nov 27, 2026 7:43 AM, before relying on Codex for anything that matters, and note the result in the next release's report (`follow-ups.md`, FU-001).

## Release Decision

- Decision: `Release` (stable). Decided by: the Task and the founder's approval, through the Solution Designer; the Codex waiver by the founder's words above.

## Release Notes

- `release-notes.md` (this folder), published as the GitHub release body (the body equals the file byte for byte, ignoring the final newline; no `**Full Changelog**` line, as for a stable release). It starts with `## What you need to do` (Docker `autobyteus-docker upgrade --all`; the one-way conversion; update the app and the paired nodes together), then `## Good To Know`, `## What's New`, `## Improvements`, `## Fixes` and `## Upgrade Notes`. It names no internal ticket ids. The same text is synced into `.github/release-notes/release-notes.md` by the release script (part of the release commit).

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh release 1.5.14 --release-notes tickets/done/release-v1.5.14/release-notes.md --branch finalize/release-v1.5.14 --no-push`; its trust check passed (witness `v1.5.14-beta.6`, run 44901757001); `migrations:record-released` changed nothing (the registry-order test passed, `Tests 1 passed`). Release commit **`4b73fccae2`** (`chore(release): bump workspace release version to 1.5.14`; two files: `autobyteus-web/package.json` and `.github/release-notes/release-notes.md`), annotated tag **`v1.5.14`** (tag object `1022f4f38d`, pointing at `4b73fccae2786b5b04e73dd2269dcaab57ff663c`).
- Secret Gate: `v1.5.13..HEAD` (1110 commits, all of the release's content) passed before the cut; the two commits the cut and the archive add (`fab18b2068..4b73fccae2`: the archived ticket and the release commit) were scanned again after the push and passed (`evidence/delivery/postpush-secrets-release-range.log`: 2 commits, PASS). `origin/personal` was fast-forwarded `fab18b2068 → 4b73fccae2`, then the tag, at 09:41:14Z on 2026-11-24. The tag has not been moved or deleted.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 45367547467 | success, attempt 1 (macOS Intel x64 passed the first time; no rerun) |
| Server Docker Release | 45367547491 | success, attempt 1 |
| Android APK Release | 45367547482 | success, attempt 1 |
| iOS App Store Connect Release | 45367548396 | success, attempt 1 |

- No job failed, so there is no failed-job table and no rerun. Android and Docker were seen finished at 09:51:08Z, Desktop and iOS at 10:18:03Z.

### iOS

- **Build: 1.5.14 (357)** (`iOS build number: 357`; `MARKETING_VERSION: 1.5.14`, `CURRENT_PROJECT_VERSION: 357`).
- Xcode_27.2, iPhoneOS SDK 27.2; "all 18 slots match the logo (on #1E3A8A)"; "The demo answers all 255 compiled operations"; core tests "Executed 56 tests, with 0 failures"; the UI smoke suite `Selected tests` passed.
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `70ba4905-49e5-481d-9bcd-2d00a90b463b`; **no ITMS message** (0 lines). Nothing sent to App Store review; no reply to Apple (`evidence/delivery/rollout-ios-key-lines.txt`).

### Published artifacts checked (`evidence/delivery/published-state.txt`)

- **Latest, not a pre-release, not a draft**: `v1.5.14` is the GitHub Latest release; target `4b73fccae2786b5b04e73dd2269dcaab57ff663c`.
- **27 of 27 assets** (2 Android, 6 server packages, 15 desktop files, 4 `latest*.yml`); the four `latest*.yml` (10:10:52Z) are newer than all six `autobyteus-server-*` files (last 09:50:14Z), so the desktop updater only sees `v1.5.14` once the server packages exist.
- Docker (registry API): **`:1.5.14` = `:latest` = `:beta` = index `sha256:70dee9a69e…`**, linux/amd64 `sha256:dff9416658…` and linux/arm64 `sha256:0a6f8cc074…`, the package jobs' digests ("The pushed … index lists linux/amd64 sha256:dff94166… and linux/arm64 sha256:0a6f8cc0…"; the publish job logged "Moved `…-server:beta` to `…-server:1.5.14`"). **Both `:latest` and `:beta` moved.** `:1.5.13` is still `sha256:13df73db92…` and `:1.5.14-beta.10` is still `sha256:0f283df89d…`, both unchanged.
- **System level 2:** both image builds "System level 2: the system part is unchanged (61cd87f9…)" and "Wrote server-package.json: 1.5.14 linux-<arch>, Node modules 127, system level 2, 66 migrations" (the same 66 as beta.10); the released server package descriptions (`autobyteus-server-1.5.14-linux-x64.json` and `-arm64.json`) have `systemLevel: 2`.
- Notes: the body starts with `## What you need to do` and equals `release-notes.md`.
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

## Repository Finalization

- Release commit `4b73fccae2` and the tag are on `origin` (above). The record commit (this folder, with the iOS build number, the published state, `delivery-revision-record.md` and `follow-ups.md`) follows on `origin/personal` as a fast-forward after a fetch and a Secret Gate.
- The founder's checkout, the worktree cleanup and the record copy: recorded in the terminal message and `delivery-revision-record.md`.

## Rollback Criteria

- Revert the release commit and the merges on `personal` and cut a new release. Desktop updates never downgrade; `:latest`, `:beta` and the version tags only move forward; pin `:1.5.13` to go back on Docker. A published tag is never moved or deleted.
- **This release cannot be rolled back after the first start.** The first start converts saved organization runs one way (autobyteus-29); a user who went back to `v1.5.13` or older would have unreadable runs, and the notes say so (RELEASE.md, Rollback). The Docker system level 2 also needs `autobyteus-docker upgrade --all` to move a node to the new image.

## Final Status

- Verification complete (RELEASE.md's checks; Codex waived by the founder): `Yes`
- Repository finalization complete: recorded in `delivery-revision-record.md` after the record commit
- Release complete: `Yes` (four workflows green on attempt 1, 27 of 27 assets, Latest, Docker `:latest` and `:beta` moved, TestFlight uploaded)
- Unresolved blocker: `None`. Accepted, unverified risk: Codex on the merged state (waived by the founder for this stable only).
