# Release Report — release-v1.5.14-beta.10 (autobyteus-629): beta v1.5.14-beta.10

Status: **released** — all four workflows succeeded on attempt 1, 27 of 27 assets, GitHub pre-release; **iOS 1.5.14 (356)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); Docker images at **system level 2**; nothing sent to App Store review. **Codex was waived for this beta by the founder** (below): the release smoke passed 10 of 13, and the three Codex cases failed only on Codex's usage limit.

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`): the Solution Designer, 2026-11-23; the PM's Task: the founder approved cutting beta `v1.5.14-beta.10` from the latest `origin/personal` "to soak the new post-beta.9 merges before stable v1.5.14".
- Base `origin/personal` @ `e5d878832b` (re-checked before the cut and before the push: unchanged); `next-beta` → `1.5.14-beta.10`; no `v1.5.14-beta.10` tag existed on origin.
- Content since `v1.5.14-beta.9` (36 commits; `evidence/delivery/pretag-tickets.txt`): **autobyteus-377** (Antigravity native tool results and the arguments of parallel calls in the Work Journal, renderer revision 5), **autobyteus-588** (a log warning when the Antigravity capsule's tool list names a tool the CLI's registry lacks), **autobyteus-53** (continue a stopped AutoByteus run on another model: a model hand-over), and the finalization records. No app-data migration, Prisma, Docker, workflow or script change since beta.9 (0 files), and `RELEASE.md` unchanged; the released migration order is unchanged and the release commit holds only the version bump.
- As the Task and the request asked, "What you need to do" says a normal update from beta.8 or beta.9, names the one-time Work Journal re-render, keeps the 29/615 notes for beta.7 or older, and says there is no data conversion or Docker system change in this beta (checked: no migration, level 2 unchanged).

## Project Release Guide

- `RELEASE.md` at `e5d878832b` (unchanged since beta.9), followed end to end: the desktop signing-readiness check (with the process-only HTTPS rewrite of the `github.com-ryan` alias; the shared remote is unchanged), the Server Docker system-level check, the Secret Gate over everything the release adds, and the live release smoke. **Deviations: the Codex cases were waived by the founder (below), as RELEASE.md allows ("the user waives that runtime for this release and the waiver is recorded").** The finalize branch was fast-forwarded to the archived release ticket instead of merged `--no-ff` (it only adds record commits, as in beta.6 to beta.9). Proposed fixes: none to RELEASE.md. Beta.8/beta.9's FU-001 (the macOS in-job retry) is still unfixed and did not matter this time.

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001, fingerprint `e26a2e74…`; run again by the release script, exit 0 |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 / exit 0 |
| `scripts/check_secrets.sh v1.5.14-beta.9..HEAD` | PASS (36 commits) |
| `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py`, run 1 (2026-11-23 20:23:07Z to 20:24:57Z, no load imposed) | **exit 1, 10 of 13 PASS**: Claude 3/3, **Grok 3/3**, Antigravity 2/2, AutoByteus 2/2; **Codex 0/3** (all three scenarios, the same error: `You've hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits or try again at Nov 27th, 2026 7:43 AM.`, `RUNTIME_ERROR` / `CODEX_TURN_FAILED`); models `claude haiku, codex gpt-5.6-luna, grok grok-4.7`; durations live 80 s, antigravity 19 s, autobyteus 9 s |

- Evidence: `evidence/delivery/pretag-*.log|txt`, `pretag-release-smoke-run1.{log,load-samples.log,grok-startups.jsonl}` and the three step logs `pretag-release-smoke-run1-{live,antigravity,autobyteus}.log`, `smoke-run.sh`, `grok-log-extract.py` (timing and catalog fields only).
- No other failure in any runtime: the only refusals in the live log are the nine "usage limit" lines of the three Codex cases.
- **Grok: no waiver was needed**; it passed all three scenarios on its first run, with its 7 processes starting in 158 to 203 ms. The smoke's load (the host's own, nothing imposed): 1-minute average 43.7 at the start, then 54.6, 48.7 and 47.8, 50.8 at the end.

## Codex waiver (RELEASE.md, Checks Before Tagging; the founder's decision)

- **Authority.** The standing rule ("Waive grok if no usage limit anymore") covers Grok only. A Codex waiver needs the founder's explicit words, so the release was **held and not cut** (blocked message to the Solution Designer, 2026-11-23, with the options: waive, wait for the reset, or free Codex earlier).
- **The founder's words, verbatim, in the Solution Designer's conversation on 2026-11-24: "Waive codex please I'm confident it's working"** (`codex-waiver-question.md`).
- **Scope: Codex for `v1.5.14-beta.10` only.**
- **Reason, as the Solution Designer recorded it:** Codex's usage limit runs until Nov 27, 2026 7:43 AM; the refusal was a quota refusal only (nothing else failed); and no file with `codex` in its path has changed since beta.9 (0 of the files changed).
- **What stays untested:** Codex on the merged state. Autobyteus-53 changes shared run-model-selection code (`run-model-selection-service.ts`, `run-model-selection.ts`, `runtime-switch.ts`, `studio-run-model-config-service.ts`) that every runtime's run start passes through; Claude and Grok runs, which use it, passed on the merged state (6 of 6).
- **Recommendation (the Solution Designer's; not the founder's decision, and he did not comment on it):** do not cut stable `v1.5.14` without a passing Codex smoke.

## Release Decision

- Decision: `Beta`. Decided by: the PM's Task and the founder's approval, through the Solution Designer; the Codex waiver by the founder's words above.

## Release Notes

- `release-notes.md` (this folder): starts with `## What you need to do` (from beta.8 or beta.9 a normal update with no data conversion and no Docker system change; the one-time Work Journal re-render at revision 5; for beta.7 or older, 615's update-together note and 29's one-way conversion of saved organization runs with its paired-node note; the Docker system-level 2 note; the TestFlight build 356; desktop beta updates), then `## What's new since beta.9` (the model hand-over of a stopped run; the Antigravity tool results in the Work Journal; the capsule tool warning) and a pointer to the beta.8 and beta.9 notes. Sections used: the beta.8 "What you need to do" items (autobyteus-615, autobyteus-29) kept for older upgrades; autobyteus-377's re-render note; no new action from 588 or 53. One `**Full Changelog**` line.

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.14-beta.10 --no-push`; its trust check passed (witness `v1.5.14-beta.6`, run 44901757001); `migrations:record-released` changed nothing (the registry-order test passed, `Tests 1 passed`). Release commit **`2340344c85`** (`chore(release): bump workspace release version to 1.5.14-beta.10`; one file, `autobyteus-web/package.json`), annotated tag **`v1.5.14-beta.10`** (tag object points at `2340344c85`).
- Secret Gate `origin/personal..HEAD` PASS (2 commits) before the push; `origin/personal` fast-forwarded `e5d878832b → 2340344c85`, then the tag, at 04:06:09Z on 2026-11-24.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 45324022290 | success, attempt 1 (macOS Intel x64 passed the first time) |
| Server Docker Release | 45324022279 | success, attempt 1 |
| Android APK Release | 45324022271 | success, attempt 1 |
| iOS App Store Connect Release | 45324022523 | success, attempt 1 |

- No job failed, so there is no failed-job table. Android and Docker were seen finished at 04:14:15Z and 04:15:46Z, Desktop at 04:32:40Z, iOS at 04:46:56Z.

### iOS

- **Build: 1.5.14 (356)** (`iOS build number: 356`; `MARKETING_VERSION: 1.5.14`, `CURRENT_PROJECT_VERSION: 356`).
- Xcode_27.2, iPhoneOS SDK 27.2; "all 18 slots match the logo (on #1E3A8A)"; "The demo answers all 252 compiled operations"; core tests "Executed 56 tests, with 0 failures"; the UI smoke suite `Selected tests` passed.
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `7d1ffc60-e4aa-4875-8dbb-9a128fa5750d`; **no ITMS message** (0 lines). Nothing sent to App Store review; no reply to Apple.

### Published artifacts checked

- Pre-release, not a draft; GitHub Latest stays `v1.5.13`.
- **27 of 27 assets** (2 Android, 6 server packages, 15 desktop files, 4 `latest*.yml`); the four `latest*.yml` (04:32:26Z) are newer than all six `autobyteus-server-*` files (last 04:14:52Z) (`evidence/delivery/published-state.txt`).
- Docker (registry API): `:1.5.14-beta.10` = `:beta` = index `sha256:0f283df89d…`, linux/amd64 `sha256:675be4a6c9…` and linux/arm64 `sha256:41ec65058c…`, the package jobs' digests ("The pushed … index lists linux/amd64 sha256:675be4a6… and linux/arm64 sha256:4…"); `:latest` = `1.5.13` = `sha256:13df73db92…`, unchanged; `:1.5.14-beta.9` is still `sha256:c9a6d19983…`.
- **System level 2:** both image builds "System level 2: the system part is unchanged (61cd87f9…)" and "Wrote server-package.json: 1.5.14-beta.10 linux-<arch>, Node modules 127, system level 2, 66 migrations" (the same 66 as beta.9); the released server package descriptions (x64 and arm64) have `systemLevel: 2`.
- Notes: `release-notes.md` above the generated notes with **one** `**Full Changelog**` line (the generated body had two identical lines; the duplicate removed); the body starts with `## What you need to do`; pre-release kept.
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

## Repository Finalization

- Release commit `2340344c85` and the tag are on `origin` (above). The record commit (this folder, with the iOS build number filled in, the rollout evidence and `follow-ups.md`) follows on `origin/personal` as a fast-forward after a fetch and a Secret Gate.
- User's checkout, worktree cleanup and the record copy: recorded in the terminal message and `delivery-revision-record.md` after the record commit.

## Rollback Criteria

- Revert the release commit and the merges on `personal` and cut a new release. Desktop updates never downgrade; `:beta` and `:latest` only move forward; pin an earlier Docker tag to go back.
- This release adds no data conversion. A user who already started beta.8 or later has had saved organization runs converted (autobyteus-29): that cannot be undone, and the notes say so (RELEASE.md, Rollback).

## Final Status

- Verification complete (RELEASE.md's checks; Codex waived by the founder): `Yes`
- Repository finalization complete: recorded in `delivery-revision-record.md` after the record commit
- Release complete: `Yes` (four workflows green, 27 of 27 assets, Docker and TestFlight verified)
- Unresolved blocker: `None`
