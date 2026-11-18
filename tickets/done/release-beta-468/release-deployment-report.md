# Delivery / Release / Deployment Report — release-beta-468

## Release / Publication / Deployment Scope

A release request (`Release Requested`, Project Task autobyteus-468): a new beta pre-release from `personal`. There is no change to the software. Docs sync, the handoff summary and Verify From Evidence do not apply; the release guide's checks are the verification.

- Requested by: the user, relayed by the Project Task Manager on 2026-11-10: "Okay let's release a new beta". He said it after hearing the contents and that the desktop and nodes restart on the update.
- Content (`git log --merges --first-parent v1.5.13-beta.2..HEAD`, re-checked just before tagging):

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `d88e3f4ec6` | autobyteus-435 `small-follow-ups-batch-435`, 14 small fixes; needs the new Android APK | its `handoff-summary.md` (no `release-notes.md`) |
| `bd45d07aa2` | autobyteus-338 `run-bash-background`, background commands for `run_bash` | its `release-notes.md` |
| `bcd0750636` | autobyteus-447 `server-e2e-node-credential-447`, test code only | not in the notes; nothing visible to users |

- Launcher: `scripts/public/docker/` is unchanged since `v1.5.13-beta.2`, so there is no reinstall this time. The notes point users coming from an older beta to that beta's note.
- Excluded by the Task, and none of them merged: 457, 461, 464, 460, 462, 463 and 465–467.
- The user's running app and nodes were not touched. Teams 457, 461 and 464 run there; they update themselves on the beta channel.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `2ea04c565c`. It is unchanged since `v1.5.13-beta.2`; the base changed only `TESTING.md`.
- Deviations from the guide and why:
  - **The smoke check exited 1.** One Grok case failed on xAI's per-minute request limit, and the user waived it. That is the exception the guide allows.
  - **The beta notes carry a "What's new" above the generated notes.** The handoff asked for it.
- Proposed guide fixes, and whether the user agreed: `None`
- Created by this delivery: `No`

## Checks Before Tagging

Run on `codex/release-beta-468` at `b45a886d5f` (`origin/personal` `2ea04c565c` plus the handoff document only), after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`:

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: exit 0, which includes tracked imports
- `scripts/check_secrets.sh v1.5.13-beta.2..HEAD`: PASS, 61 commits
- `python3 scripts/release_smoke.py`: exit 1, released on the user's waiver of one Grok case. The run was 2026-11-10T12:33:34Z–12:36:51Z on `b45a886d5f`; the summary is in `evidence/DEL-01-release-smoke.log`.
  - **Pass:**
    - Claude (haiku), 3/3;
    - Codex (`gpt-5.6-luna`), 3/3;
    - Grok (`grok-4.7`), 2/3: new run + restore in a linked workspace, and a brand-new team member;
    - Antigravity (scripted), 2/2;
    - AutoByteus (deterministic LLM), 2/2;
    - worktree left unchanged: pass. Delivery wrote nothing in the worktree during the run.
  - **Grok "different same-named skill": FAIL, waived.** `ACP_PROMPT_FAILED` "Rate limited: API error (status 429 Too Many Requests) … Requests per Minute (actual/limit): 21/21". This is the account's per-minute request limit, a quota refusal in `RELEASE.md`'s terms. The same runtime passed its other two cases in the run.
    - The user waived it for this release, in his own words at the release decision: **"Waive please"** (2026-11-10). It answered delivery's question offering either a waiver of this Grok case because of xAI's rate limit, or a full rerun, which would have been Grok's third run of the day against its daily token tier.
    - The beta.2 waiver ("Waive for token limit", Codex) did not carry over.
  - DeepSeek Harness is not part of the smoke run (handoff).

## Release Decision

- Decision: `Beta`
- Decided by: the user ("Okay let's release a new beta", relayed by the Project Task Manager, 2026-11-10)

## Version / Tag / Release Commit

- Release commit `c60ebbb9fc` `chore(release): bump workspace release version to 1.5.13-beta.3`. It changes only `autobyteus-web/package.json`, from `1.5.13-beta.2` to `1.5.13-beta.3`, and sits on the merge `b2caa36f39`.
- Annotated tag `v1.5.13-beta.3` on `c60ebbb9fc`, pushed at 2026-11-10T12:45:35Z. The number comes from `release_versions.py next-beta`.
- The tag contains exactly 435, 338 and 447. autobyteus-12 (agent semantic memory, `e88588aa96`) merged into `personal` after the tag, so it is not in this beta.

## Repository Finalization

- Ticket branch: `codex/release-beta-468`. The handoff `b45a886d5f` and the record `5a3c362a1a` were pushed after the Secret Gate passed.
- Finalization target: `origin/personal`. It was unmoved at `2ea04c565c` before the merge push and the release push.
- Merge into target: `finalize/release-beta-468` from `origin/personal`, `git merge --no-ff` gave `b2caa36f39` (tree identical, Secret Gate PASS), pushed `2ea04c565c..b2caa36f39`. Then the release commit `b2caa36f39..c60ebbb9fc`. This record commit goes on top of the later `personal` (`1d273dd8ab`, autobyteus-12); see `delivery-revision-record.md`.
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `Updated to 1d273dd8ab`, the then-current `origin/personal`, 2026-11-10. It was on `personal` with no local commits, 24 commits behind; `git fetch`, then `git merge --ff-only origin/personal`, exit 0. Its 42 uncommitted entries were kept untouched. After this record's push it is fast-forwarded once more to the record commit; that result is in the terminal message.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Pipelines triggered and their results. All four were watched together by one poll every 60 s that stops at the first failure:

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 42818487349 | success |
| iOS App Store Connect Release | 42818487326 | success (TestFlight upload) |
| Server Docker Release | 42818487425 | success; image 13:07:19Z, server packages 13:27–13:28Z |
| Desktop Release | 42818487315 | success; all four completed by 13:29:39Z |

- Failed jobs: none.
- Published artifacts checked:
  - `gh release view v1.5.13-beta.3`: `isPrerelease: true` with **23 assets**, the complete set:
    - macOS arm64 and x64: `.dmg`, `.zip` and their blockmaps;
    - Linux x64 and arm64 AppImages;
    - Windows `.exe`;
    - Android APK and `.sha256`;
    - six `autobyteus-server-1.5.13-beta.3-linux-{x64,arm64}.{tar.gz,json,json.sig}` files;
    - four `latest*.yml` files.
  - Order: every `latest*.yml` (13:28:49Z) is newer than all six server package files (13:27:04Z–13:28:20Z).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.13-beta.3` and `:beta` both point to `sha256:fb7fcdb79e3f…`. `:latest` stays on `v1.5.12` (`sha256:2d8affe595e0…`).
  - Release page: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.13-beta.3
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`, as below.

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-468/release-notes.md`. It is put above the GitHub generated notes after the workflows succeed (`RELEASE.md` § Beta notes with a user action).
- Ticket "What you need to do" sections: none of the three tickets has a `release-notes.md` section of that kind.
  - The Android APK line comes from 435's handoff summary (REQ-004, REQ-005).
  - The node and desktop lines come from the handoff.
- "What's new" comes from 338's `release-notes.md` and 435's handoff summary. Internal-only items are left out: REQ-002 removed code, REQ-012 is a contracts key.
- Result: Put above the generated notes after all four succeeded, with `gh release edit v1.5.13-beta.3 --notes-file`. The body starts with `## What you need to do`, and the generated "Full Changelog" link stays below. The assets are unchanged (23).

## Post-Finalization Cleanup

- Created by this delivery and removed after the record push:
  - the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-468`;
  - the local branches `codex/release-beta-468` and `finalize/release-beta-468`;
  - the temp files `/tmp/rb468-*`;
  - the smoke check's step logs (`<temp>/release-smoke-d3e2g7g3`).
- Remote branch: `origin/codex/release-beta-468` is kept, as for earlier tickets.
- No test instances were started. The user's running app and nodes were not touched.

## Rollback Criteria

- No stored data changes: 435's data is `Not Affected`, and 338's is `Directly Usable — No Migration`; the older build still has the retired tools. Rolling back is possible: install the previous version, or pin the earlier Docker tag; `:beta` only moves forward.
- A defect is fixed forward with the next beta.

## Final Status

- Verification complete (the release guide's checks; one Grok case waived by the user): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`. Beta `v1.5.13-beta.3` is complete: 4/4 workflows, 23 assets, `:beta`.
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal message/reference: `Delivery Completed` to the Solution Designer
