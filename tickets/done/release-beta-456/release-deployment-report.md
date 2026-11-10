# Delivery / Release / Deployment Report — release-beta-456

## Release / Publication / Deployment Scope

A release request (`Release Requested`, Project Task autobyteus-456): a new beta pre-release from `personal`, after autobyteus-455. There is no change to the software. Docs sync, the handoff summary and Verify From Evidence do not apply; the release guide's checks are the verification.

- Requested by: the user, relayed by the Project Task Manager on 2026-11-10: "Yes please, we release after the Daily Assistant is fixed."
- Content (`git log --merges --first-parent v1.5.13-beta.1..origin/personal`, re-checked before the notes):

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `eaeb5ee733` | autobyteus-450 `conversation-file-open-450` (file fixes; needs the new Android APK) | its `release-notes.md` |
| `354e6893b3` | `docker-setup-code-wait-feedback` (launcher feedback) | its `release-notes.md` |
| `20b0694fbb` | autobyteus-455 `daily-assistant-delegation-target` (the Daily Assistant at `/daily_assistant`) | its `handoff-summary.md`; the ticket has no `release-notes.md` |

- Not included: autobyteus-447 and autobyteus-435, not merged at the re-check.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `fd0eb664c3`
- Deviations from the guide and why:
  - **The smoke check exited 1.**
    - Codex was waived by the user for its token limit. That is the exception the guide allows.
    - The worktree row failed because delivery wrote its report into the worktree during the run. The cause is proven (Checks Before Tagging); it was not rerun.
  - **The beta notes carry a short "What's new" above the generated notes.** The guide puts only the "What you need to do" section there; the handoff asked for the feature lines too.
- Proposed guide fixes, and whether the user agreed: `None`
- Created by this delivery: `No`

## Checks Before Tagging

Run on `codex/release-beta-456` at `8791266d5e` (`origin/personal` `fd0eb664c3` plus the handoff document only), after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`:

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: exit 0, which includes tracked imports
- `scripts/check_secrets.sh v1.5.13-beta.1..HEAD`: PASS, 35 commits
- `python3 scripts/release_smoke.py`: exit 1, released on the user's waiver for Codex. The run was 2026-11-10T07:16:12Z–07:18:12Z on `8791266d5e`; the summary is in `evidence/DEL-01-release-smoke.log`.
  - **Pass:**
    - Claude (haiku), 3/3: new run + restore in a linked workspace, a brand-new team member, a different same-named skill;
    - Grok (`grok-4.5`; the pinned `grok-4.7` was not offered), 3/3;
    - Antigravity (scripted), 2/2;
    - AutoByteus (deterministic LLM), 2/2.
  - **Codex (`gpt-5.6-luna`), 3/3 FAIL, waived.** Every case failed with `RUNTIME_ERROR` "You've hit your usage limit … try again at 10:31 AM", a quota refusal (`RELEASE.md`). A one-prompt probe before the run (`evidence/DEL-00-codex-quota-probe.log`, 07:12:56Z) showed the same limit.
    - The user waived Codex for this release, in his own words at the release decision: **"Waive for token limit"** (2026-11-10). It answered delivery's question offering a waiver of the Codex smoke check because of its usage limit, as the alternative to waiting until 10:31.
    - The previous waivers did not carry over (handoff).
  - **"worktree left unchanged": FAIL, caused by delivery, not the product.** `git status changed: ?? tickets/in-progress/release-beta-456/release-deployment-report.md`. Delivery wrote that file during the run; its mtime is 07:16:25Z, inside the run.
    - The smoke run itself left nothing. `release-notes.md` (07:13:29Z) and the untracked `dist/` folders predate it, and no other path changed.
    - Delivery did not rerun: a rerun would spend Grok's second run of the day (`RELEASE.md`: about two per 24 hours), and Codex would still fail on its quota until 10:31.
    - Lesson for delivery: write nothing in the worktree while the smoke check runs.

## Release Decision

- Decision: `Beta`
- Decided by: the user ("Yes please, we release after the Daily Assistant is fixed.", relayed by the Project Task Manager, 2026-11-10)

## Version / Tag / Release Commit

- Release commit `f78b60dddd` `chore(release): bump workspace release version to 1.5.13-beta.2`. It changes only `autobyteus-web/package.json`, from `1.5.13-beta.1` to `1.5.13-beta.2`, and sits on the merge `165c10670b`.
- Annotated tag `v1.5.13-beta.2` on `f78b60dddd`, pushed at 2026-11-10T07:20:07Z. The number comes from `release_versions.py next-beta`; the base is the next patch after the stable `v1.5.12`.

## Repository Finalization

- Ticket branch: `codex/release-beta-456`. The handoff `8791266d5e` and the record `abc80bdfd8` were pushed after the Secret Gate passed.
- Finalization target: `origin/personal`. It was unmoved at `fd0eb664c3` before each push.
- Merge into target: `finalize/release-beta-456` from `origin/personal`, `git merge --no-ff` gave `165c10670b` (tree identical, Secret Gate PASS), pushed `fd0eb664c3..165c10670b`. Then the release commit `165c10670b..f78b60dddd`, then this record commit (see `delivery-revision-record.md`).
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `Updated to f78b60dddd` (the release commit), 2026-11-10. It was on `personal` with no local commits, 4 commits behind; `git fetch`, then `git merge --ff-only origin/personal`, exit 0. Its 42 uncommitted entries were kept untouched. After this record's push it is fast-forwarded once more to the record commit; that result is in the terminal message.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Pipelines triggered and their results. All four were watched together by one poll every 60 s that stops at the first failure (`RELEASE.md` § Watching The Rollout):

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 42774559088 | success |
| iOS App Store Connect Release | 42774559130 | success (TestFlight upload) |
| Server Docker Release | 42774559007 | success; image 07:46:45Z, server packages 08:11Z |
| Desktop Release | 42774559121 | success; all four completed by 08:12:25Z |

- Failed jobs: none.
- Published artifacts checked:
  - `gh release view v1.5.13-beta.2`: `isPrerelease: true` with **23 assets**, the complete set per `RELEASE.md`:
    - macOS arm64 and x64: `.dmg`, `.zip` and their blockmaps;
    - Linux x64 and arm64 AppImages;
    - Windows `.exe`;
    - Android APK and `.sha256`;
    - six `autobyteus-server-1.5.13-beta.2-linux-{x64,arm64}.{tar.gz,json,json.sig}` files;
    - four `latest*.yml` files.
  - Order: every `latest*.yml` (08:11:57Z) is newer than all six server package files (08:11:32Z–08:11:54Z).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.13-beta.2` and `:beta` both point to `sha256:f454a2277948…`. `:latest` stays on `v1.5.12` (`sha256:2d8affe595e0…`).
  - Release page: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.13-beta.2
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`, as below.

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-456/release-notes.md`. A beta uses GitHub generated notes; the notes are put above them after the workflows succeed (`RELEASE.md` § Beta notes with a user action).
- Tickets whose "What you need to do" sections were used:
  - autobyteus-450: the Android APK;
  - `docker-setup-code-wait-feedback`: reinstall the launcher.
- Added by delivery:
  - update the nodes and the desktop channel line, as the handoff asked;
  - the Daily Assistant peer setting, from 455's residual risk 3.
- A short "What's new" from the three tickets is also above the generated notes, as the handoff asked. After all four succeeded, `release-notes.md` was put above the generated notes with `gh release edit v1.5.13-beta.2 --notes-file`. The body now starts with `## What you need to do`, and the generated "Full Changelog" link stays below. The assets are unchanged (23).

## Post-Finalization Cleanup

- Created by this delivery and removed after the record push:
  - the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-456`;
  - the local branches `codex/release-beta-456` and `finalize/release-beta-456`;
  - the temp files `/tmp/rb456-*`, `/tmp/actions.md`, `/tmp/generated.md`, `/tmp/notes.md`;
  - the smoke check's step logs (`<temp>/release-smoke-ztak1mly`).
- Remote branch: `origin/codex/release-beta-456` is kept, as for earlier tickets.
- No test instances were started.

## Rollback Criteria

- No stored data changes in any of the three tickets. Rolling back is possible: install the previous version, or pin the earlier Docker tag; `:beta` only moves forward.
- A defect is fixed forward with the next beta.

## Final Status

- Verification complete (the release guide's checks; Codex waived by the user): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`. Beta `v1.5.13-beta.2` is complete: 4/4 workflows, 23 assets, `:beta`.
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal message/reference: `Delivery Completed` to the Solution Designer
