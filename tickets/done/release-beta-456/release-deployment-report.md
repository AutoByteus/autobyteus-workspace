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

Pending (recorded after publication)

## Repository Finalization

Pending (recorded after publication)

## Release / Publication / Deployment

Pending (recorded after publication)

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-456/release-notes.md`. A beta uses GitHub generated notes; the notes are put above them after the workflows succeed (`RELEASE.md` § Beta notes with a user action).
- Tickets whose "What you need to do" sections were used:
  - autobyteus-450: the Android APK;
  - `docker-setup-code-wait-feedback`: reinstall the launcher.
- Added by delivery:
  - update the nodes and the desktop channel line, as the handoff asked;
  - the Daily Assistant peer setting, from 455's residual risk 3.
- A short "What's new" from the three tickets is also above the generated notes, as the handoff asked. Pending (recorded after publication)

## Post-Finalization Cleanup

Pending (recorded after publication)

## Rollback Criteria

- No stored data changes in any of the three tickets. Rolling back is possible: install the previous version, or pin the earlier Docker tag; `:beta` only moves forward.
- A defect is fixed forward with the next beta.

## Final Status

Pending (recorded after publication)
