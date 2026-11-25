# Release Report — release-v1.5.15-beta.1 (autobyteus-645): beta v1.5.15-beta.1

Status: **released** — all four workflows succeeded on attempt 1, 27 of 27 assets, GitHub **pre-release** (GitHub Latest stays `v1.5.14`); **iOS 1.5.15 (361)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); Docker `:beta` moved to the new beta, `:latest` stays on `v1.5.14`; images at **system level 2**; nothing sent to App Store review. **Codex was waived for this beta by the founder, in advance** (below): the release smoke passed 10 of 13, and the three Codex cases failed only on Codex's usage limit.

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`): the Solution Designer, 2026-11-25; the Task (`/project_task_manager`, autobyteus-645): "Founder approved cutting beta release `v1.5.15-beta.1` from the latest `origin/personal`".
- Base `origin/personal` @ `4a25b19dd7` (re-checked before the cut and before the push: unchanged); `next-beta` → `1.5.15-beta.1`; no `v1.5.15*` tag existed locally or on origin before the push. The previous stable is `v1.5.14`.
- Content since `v1.5.14` (114 commits; `evidence/delivery/pretag-tickets.txt`): **autobyteus-618** (text and code files wrap in the file viewer), **autobyteus-574** (the phone apps play node videos in their own player, by range, with a version cache; file routes answer ranges) and **autobyteus-642** (audio and message attachments in the same player, the desktop file viewer keeps 400 px, more highlighted languages) — 574 and 642 ship together in this release, as 642's handoff requires (C-6; no earlier tag holds 574's merge) — and **autobyteus-638** (a restart keeps a person's running agent and team runs running).
- Checked from the diff `v1.5.14..4a25b19dd7`: **no released app-data migration, Prisma, Docker, workflow or script file changed, and `RELEASE.md` is unchanged (0 files)**; the one match is a test file (`autobyteus-server-ts/tests/app-data-migrations/agent-org-units-own-runs-v1/agent-org-units-path-rewrite.test.ts`). The released migration order is unchanged (`migrations:record-released` changed nothing), so the release commit holds only the version bump. System level stays 2. So "What you need to do" says a normal update from `v1.5.14`.

## Project Release Guide

- `RELEASE.md` at `4a25b19dd7` (unchanged since `v1.5.14`), followed end to end: the desktop signing-readiness check (with the process-only HTTPS rewrite of the `github.com-ryan` alias; the shared remote is unchanged), the Server Docker system-level check, licensing and hygiene checks, the Secret Gate over everything the release adds, the live release smoke, then `scripts/desktop-release.sh beta --branch finalize/release-v1.5.15-beta.1 --no-push`.
- **Deviations:** (a) the Codex cases were waived by the founder (below), as RELEASE.md allows ("the user waives that runtime for this release and the waiver is recorded"); (b) the finalize branch was fast-forwarded to the archived release ticket instead of merged `--no-ff` (it only adds record commits, as in beta.6 to beta.10 and stable v1.5.14). Proposed fixes to RELEASE.md: none. The macOS in-job retry (v1.5.14 FU-002) is still unfixed and did not matter this time: macOS Intel x64 passed the first time.

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001, fingerprint `e26a2e74…`; run again by the release script, exit 0 (witness unchanged) |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 ("Licensing is consistent", 8836 files) / exit 0 (105373 files; 105393 after the ticket was archived, run again, passed) |
| `scripts/check_secrets.sh v1.5.14..HEAD` | **PASS** (114 commits, no secrets) |
| `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py`, run 1 (2026-11-25 05:46:22Z to 05:48:26Z on `4a25b19dd7`, no load imposed) | **exit 1, 10 of 13 PASS**: Claude 3/3, **Grok 3/3**, Antigravity 2/2, AutoByteus 2/2; **Codex 0/3** (all three scenarios, the same error: `You've hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits or try again at Nov 27th, 2026 7:43 AM.`, `RUNTIME_ERROR`); models `claude haiku, codex gpt-5.6-luna, grok grok-4.7`; durations live 88 s, antigravity 23 s, autobyteus 12 s |

- Evidence: `evidence/delivery/pretag-*.log|txt`, `pretag-release-smoke-run1.{log,load-samples.log,grok-startups.jsonl}`, the three step logs `pretag-release-smoke-run1-{live,antigravity,autobyteus}.log`, `smoke-run.sh`, `grok-log-extract.py` (timing and catalog fields only), `release-script.log`, `published-state.txt`, `rollout-ios-key-lines.txt`.
- No other failure in any runtime. The step logs print error-level lines inside passing tests: the `SKILL_LINKS_LIVE_COLLISION` refusals of the "refuses a configured-skill run on a different same-named workspace skill" scenario (the scenario expects that refusal; it PASSES for Claude and Grok), the Antigravity step's "could not use skill 'env-skill'" and `TOOL_LIST_UPDATE_APPLY_FAILED` for a resumed deleted run (the Antigravity step passed 10 of 10 tests). The only FAIL lines are the three Codex cases, and the only refusals that ended a case are the nine "usage limit" lines of those cases.
- **Grok: no waiver was needed**; it passed all three scenarios on its first run, with its 7 processes starting in 178 to 195 ms. The smoke's load (the host's own, nothing imposed): 1-minute average 41.86 at the start, then 41.58, 37.50, 40.20, 37.92, and 36.96 at the end.

## Codex waiver (RELEASE.md, Checks Before Tagging; the founder's decision)

- **Authority.** The founder's advance waiver, relayed in the Task and the Solution Designer's request, verbatim (2026-11-25): **"Now release a new beta. Waive for codex because I have no more codex usage limits now"** (`codex-waiver.md`). Scope: Codex for `v1.5.15-beta.1` only, usage-limit failures only. Any other failure would have stopped the release.
- **The condition was met:** Codex failed only on its usage limit (nine "usage limit" lines in the live log, nothing else), so the release was cut without asking again.
- **What stays untested:** Codex on the merged state. Codex last passed the smoke on beta.9's commit (`13575c21f8`); it was waived for beta.10, for stable v1.5.14 and for this beta. No file with `codex` in its path changed since `v1.5.14` (0 files). Shared code changed: the restore of running runs at server start (autobyteus-638, all runtimes) and the file routes (autobyteus-574 and 642; not a run path). Claude and Grok runs through the shared start path passed (6 of 6).
- **The gap stays open** until a Codex smoke passes: three releases in a row without one (`follow-ups.md`, FU-001). The limit runs until Nov 27, 2026 7:43 AM.

## Release Decision

- Decision: `Beta`. Decided by: the Task and the founder's approval, through the Solution Designer; the Codex waiver by the founder's words above.

## Release Notes

- `release-notes.md` (this folder), put above the generated notes of the pre-release with **one** `**Full Changelog**` line (the generated body had two identical lines; the duplicate removed). It starts with `## What you need to do`: a normal update from `v1.5.14` (no data conversion, no Docker system change); update the phone apps for the new player (Android APK; iOS TestFlight **1.5.15 (361)**) together with the nodes; Docker nodes (a node on `v1.5.14` updates in place; older ones need `autobyteus-docker upgrade --all --tag beta`; `:latest` stays on `v1.5.14`); desktop beta updates; and, for `v1.5.13` or older, the `v1.5.14` release notes. Then `## What's new since v1.5.14`, and `## Good to know`. No internal ids. The pre-release stays a pre-release.
- Tickets' "What you need to do" sections used: none — 574 and 642 state that no user action is needed and 618 and 638 have none; the action items come from the Task's direction and this delivery's checks (above).

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.15-beta.1 --no-push`; its trust check passed (witness `v1.5.14-beta.6`, run 44901757001); `migrations:record-released` changed nothing (the registry-order test passed, `Tests 1 passed`). Release commit **`6fac26225c`** (`chore(release): bump workspace release version to 1.5.15-beta.1`; one file, `autobyteus-web/package.json`), annotated tag **`v1.5.15-beta.1`** (tag object `8d6bbb4978`, pointing at `6fac26225c8db64d0fa0a373e9f12dde2e9d8256`).
- Secret Gate `origin/personal..HEAD` PASS (2 commits) before the push; `origin/personal` fast-forwarded `4a25b19dd7 → 6fac26225c`, then the tag, at 05:51Z on 2026-11-25. The tag has not been moved or deleted.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 45556417337 | success, attempt 1 (macOS Intel x64 passed the first time; no rerun) |
| Server Docker Release | 45556417524 | success, attempt 1 |
| Android APK Release | 45556417285 | success, attempt 1 |
| iOS App Store Connect Release | 45556417580 | success, attempt 1 |

- No job failed, so there is no failed-job table and no rerun. Android and Docker were seen finished at 06:00:15Z and 06:02:21Z, Desktop at 06:21:18Z, iOS at 06:33:56Z.

### iOS

- **Build: 1.5.15 (361)** (`iOS build number: 361`; `MARKETING_VERSION: 1.5.15`, `CURRENT_PROJECT_VERSION: 361`).
- Xcode_27.2, iPhoneOS SDK 27.2; "all 18 slots match the logo (on #1E3A8A)"; "The demo answers all 255 compiled operations"; the unit and implementation tests "Executed 91 tests, with 1 test skipped and 0 failures"; the UI smoke suite `Selected tests` passed (8 tests, 0 failures).
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `e9c62b95-cfb3-47e4-b550-bc67e0efdf66`; **no ITMS message** (0 lines). Nothing sent to App Store review; no reply to Apple.

### Published artifacts checked (`evidence/delivery/published-state.txt`)

- **Pre-release, not a draft**; **GitHub Latest stays `v1.5.14`**; target `6fac26225c8db64d0fa0a373e9f12dde2e9d8256`.
- **27 of 27 assets** (2 Android, 6 server packages, 15 desktop files, 4 `latest*.yml`); the four `latest*.yml` (06:21:02Z) are newer than all six `autobyteus-server-*` files (last 06:00:10Z).
- Docker (registry API): **`:1.5.15-beta.1` = `:beta` = index `sha256:55d11b2ca4…`**, linux/amd64 `sha256:3407b3bd58…` and linux/arm64 `sha256:19d9587300…`, the package jobs' digests ("The pushed … index lists linux/amd64 sha256:3407b3bd… and linux/arm64 sha256:19d95873…"; "Moved `…-server:beta` to `…-server:1.5.15-beta.1`"). **`:latest` = `:1.5.14` = `sha256:70dee9a69e…`, unchanged**; `:1.5.14-beta.10` is still `sha256:0f283df89d…`.
- **System level 2:** both image builds "System level 2: the system part is unchanged (61cd87f9…)" and "Wrote server-package.json: 1.5.15-beta.1 linux-<arch>, Node modules 127, system level 2, 66 migrations" (the same 66 as `v1.5.14`); the released server package descriptions (x64 and arm64) have `systemLevel: 2`.
- Notes: the body starts with `## What you need to do`, equals `release-notes.md` plus one `**Full Changelog**` line.
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

## Repository Finalization

- Release commit `6fac26225c` and the tag are on `origin` (above). The record commit (this folder, with the iOS build number, the published state, `delivery-revision-record.md` and `follow-ups.md`) follows on `origin/personal` as a fast-forward after a fetch and a Secret Gate.
- The founder's checkout, the worktree cleanup and the record copy: recorded in the terminal message and `delivery-revision-record.md`.

## Rollback Criteria

- Revert the release commit and the merges on `personal` and cut a new release. Desktop updates never downgrade; turning beta updates off waits for the next newer stable. `:beta` only moves forward; pin `:1.5.14` (the stable, which `:latest` still is) to go back on Docker.
- This release adds no app-data migration and no data conversion. A user who already started `v1.5.14` has had saved organization runs converted (autobyteus-29): that cannot be undone, and the `v1.5.14` notes say so (RELEASE.md, Rollback).

## Final Status

- Verification complete (RELEASE.md's checks; Codex waived by the founder): `Yes`
- Repository finalization complete: recorded in `delivery-revision-record.md` after the record commit
- Release complete: `Yes` (four workflows green on attempt 1, 27 of 27 assets, pre-release, Docker `:beta` moved and `:latest` unchanged, TestFlight uploaded)
- Unresolved blocker: `None`. Accepted, unverified risk: Codex on the merged state (waived by the founder for this beta only).
