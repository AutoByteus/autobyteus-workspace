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

Pending (recorded after publication)

## Repository Finalization

Pending (recorded after publication)

## Release / Publication / Deployment

Pending (recorded after publication)

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-468/release-notes.md`. It is put above the GitHub generated notes after the workflows succeed (`RELEASE.md` § Beta notes with a user action).
- Ticket "What you need to do" sections: none of the three tickets has a `release-notes.md` section of that kind.
  - The Android APK line comes from 435's handoff summary (REQ-004, REQ-005).
  - The node and desktop lines come from the handoff.
- "What's new" comes from 338's `release-notes.md` and 435's handoff summary. Internal-only items are left out: REQ-002 removed code, REQ-012 is a contracts key.
- Result: Pending (recorded after publication)

## Post-Finalization Cleanup

Pending (recorded after publication)

## Rollback Criteria

- No stored data changes: 435's data is `Not Affected`, and 338's is `Directly Usable — No Migration`; the older build still has the retired tools. Rolling back is possible: install the previous version, or pin the earlier Docker tag; `:beta` only moves forward.
- A defect is fixed forward with the next beta.

## Final Status

Pending (recorded after publication)
