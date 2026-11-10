# Delivery / Release / Deployment Report — release-beta-18

## Release / Publication / Deployment Scope

A release request (`Release Requested`, Project Task autobyteus-18): the next beta pre-release from `personal`, `v1.5.13-beta.4`. There is no change to the software. Docs sync, the handoff summary and Verify From Evidence do not apply; the release guide's checks are the verification.

- Requested by: the user, relayed by the PM on 2026-11-10: "we should create a new beta". Purpose: ship agent semantic memory (autobyteus-12), which is not in `v1.5.13-beta.3`.
- Content (`git log --merges --first-parent v1.5.13-beta.3..HEAD`, checked before tagging):

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `e88588aa96` | autobyteus-12 `agent-semantic-memory`: an agent can have its own semantic memory folder | its `release-notes.md` |

  The other first-parent commits are records only: `a7cf08611`, `1d273dd8a` (autobyteus-12 delivery), `16947ba68` (beta.3 publication), and this ticket's handoff and record.
- Unchanged since `v1.5.13-beta.3` (`git diff --name-only v1.5.13-beta.3 HEAD`): no file under `autobyteus-android/`, `autobyteus-ios/` or `scripts/public/docker/`. No new APK action and no launcher reinstall.
- The user's running app and nodes were not touched.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `16947ba68`; unchanged since `v1.5.13-beta.3`.
- Deviations from the guide and why:
  - **The smoke check exited 1.** All three Grok cases were refused by xAI's free-tier token quota, and the user waived Grok for this release. That is the exception the guide allows.
  - `gitleaks` and `pnpm` are not on the default `PATH` in this environment; the checks ran with `~/.local/bin/gitleaks` (8.30.1) and a `corepack pnpm` wrapper.
  - The main checkout here is `/home/autobyteus/workspace/autobyteus-workspace` (the guide names a macOS path).
- Proposed guide fixes, and whether the user agreed: `None`
- Created by this delivery: `No`

## Checks Before Tagging

Run on `codex/release-beta-18` at `614620d66` (`origin/personal` `16947ba68` plus the handoff document only), after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` (both exit 0):

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: exit 0
- `scripts/check_secrets.sh v1.5.13-beta.3..HEAD`: PASS, 22 commits
- `python3 scripts/release_smoke.py`: exit 1, released on the user's waiver of the Grok runtime. Run 2026-11-10T13:41:22Z–13:43:38Z on `614620d66`; summary in `evidence/DEL-01-release-smoke.log`.
  - **Pass:** Claude (`haiku`) 3/3; Codex (`gpt-5.6-luna`) 3/3; Antigravity (scripted) 2/2; AutoByteus (deterministic LLM) 2/2. Delivery wrote nothing in the worktree during the run.
  - **Grok (`grok-4.7`) 0/3: FAIL, waived.** Every case: `ACP_PROMPT_FAILED` "Rate limited: API error (status 429 Too Many Requests): subscription:free-usage-exhausted: You've used all the included free usage for model grok-4.7 for now. Usage resets over a rolling 24-hour window — tokens (actual/limit): 606679/600000". The free tier's 600k tokens per rolling 24 hours were already used today (beta.3's smoke run and autobyteus-12's live Grok runs). This is a quota refusal in `RELEASE.md`'s terms. Grok's runtime path is unchanged since beta.3, and semantic memory was proven on real Grok in autobyteus-12 (API-18).
  - **The user's waiver, in his words:** **"Waive please"** (2026-11-10). It answered delivery's question offering either a waiver of the Grok runtime for this release or waiting for xAI's rolling 24-hour window and rerunning the full smoke check.
  - Earlier waivers (beta.2 "Waive for token limit", beta.3 "Waive please" for one Grok case) did not carry over; this one was asked anew.
  - DeepSeek Harness is not part of the smoke run (handoff; also not installed here).

## Release Decision

- Decision: `Beta`
- Decided by: the user ("we should create a new beta", relayed by the PM, 2026-11-10)

## Version / Tag / Release Commit

- Version from `python3 scripts/release_versions.py next-beta`: `1.5.13-beta.4`.
- Release commit, tag and push: recorded in the publication record (`delivery-revision-record.md`, DR-001 publication entry, and the final version of this report).

## Repository Finalization, Release, Rollout, Cleanup

Recorded after publication in the final version of this report.

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-18/release-notes.md`, put above the GitHub generated notes after all four workflows succeed (`RELEASE.md` § Beta notes with a user action).
- Ticket "What you need to do" sections: autobyteus-12's `release-notes.md` has none. The node, desktop and Android lines come from the handoff and the unchanged Android/launcher paths.
- "What's new" is autobyteus-12's `release-notes.md`.

## Rollback Criteria

- No stored data conversion: autobyteus-12's data decision is `Directly Usable — No Migration`; an older build ignores the new field and folder. Rolling back is possible: install the previous version, or pin the earlier Docker tag; `:beta` only moves forward. A defect is fixed forward with the next beta.
