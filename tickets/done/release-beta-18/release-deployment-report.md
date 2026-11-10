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
  - **The user's waiver, in his words:** **"Waive please"** (2026-11-10).
    - **Source:** a direct user message in the delivery engineer's own conversation (the session that received this release request from the Solution Designer). It was a user turn, not an agent message. The Solution Designer did not relay it.
    - **When:** between 13:43:38Z, when the smoke run ended and delivery asked the question, and 14:17:04Z, the commit time of `b8324b5a0`, which first records it. The session shows no exact timestamp for the message.
    - **What it answered:** delivery sent the waive-or-wait question to the Solution Designer and also ended its summary to the user with it: waive the Grok runtime for this release and tag now, or wait for xAI's rolling 24-hour window and rerun the full smoke check. The next user turn in the delivery conversation was "Waive please", and delivery acted on it as the answer.
    - The words match beta.3's waiver, but they were not taken from that record. They arrived as a new user turn in this conversation, after this release's question.
  - Earlier waivers (beta.2 "Waive for token limit", beta.3 "Waive please" for one Grok case) did not carry over; this one was asked anew.
  - DeepSeek Harness is not part of the smoke run (handoff; also not installed here).

## Release Decision

- Decision: `Beta`
- Decided by: the user ("we should create a new beta", relayed by the PM, 2026-11-10)

## Version / Tag / Release Commit

- Version from `python3 scripts/release_versions.py next-beta`: `1.5.13-beta.4`.
- Release commit `1ca4be9bf` `chore(release): bump workspace release version to 1.5.13-beta.4`, made by `bash scripts/desktop-release.sh beta --branch finalize/release-beta-18 --no-push`. It changes only `autobyteus-web/package.json`, from `1.5.13-beta.3` to `1.5.13-beta.4`, and sits on the merge `f8365d966`.
- Annotated tag `v1.5.13-beta.4` on `1ca4be9bf`, pushed at 2026-11-10T14:17:54Z.
- The tag contains `e88588aa96` (autobyteus-12, agent semantic memory): `git merge-base --is-ancestor` checked before tagging. It does not contain autobyteus-464, merged afterwards.

## Repository Finalization

- Ticket branch: `codex/release-beta-18`. The handoff `614620d66` and the record `b8324b5a0` were pushed after the Secret Gate passed (`origin/personal..HEAD`).
- Finalization target: `origin/personal`. It was unmoved at `16947ba68` before the merge push, and at the merge before the release push.
- Merge into target: `finalize/release-beta-18` from `origin/personal`; `git merge --no-ff` gave `f8365d966` (tree identical to the ticket branch, Secret Gate PASS on the merged state), pushed `16947ba68..f8365d966`. Then the release commit `f8365d966..1ca4be9bf`. autobyteus-464 (`ee46b5931`, task-copy assignment race) merged into `personal` after the tag, so it is not in this beta; this publication record goes on top of that later `personal` (`cc14e72b5`).
- User's checkout of the target branch (`/home/autobyteus/workspace/autobyteus-workspace`): on `personal`, no local commits. It is fast-forwarded with `git fetch` and `git merge --ff-only origin/personal` after this record's push; the result is in the terminal message.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Pipelines triggered and their results. All four were watched together by one poll every 60 s that stops at the first failure:

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 42832658652 | success (14:24:29Z) |
| iOS App Store Connect Release | 42832658607 | success, TestFlight upload (14:40:44Z) |
| Server Docker Release | 42832658596 | success; image 14:50:05Z, server packages 15:11:03Z–15:13:04Z |
| Desktop Release | 42832658629 | success (15:13:12Z) |

- Failed jobs: none.
- Published artifacts checked:
  - `gh release view v1.5.13-beta.4`: `isPrerelease: true` with **23 assets**, the complete set: macOS arm64 and x64 `.dmg`, `.zip` and their blockmaps; Linux x64 and arm64 AppImages; Windows `.exe`; Android APK and `.sha256`; six `autobyteus-server-1.5.13-beta.4-linux-{x64,arm64}.{tar.gz,json,json.sig}` files; four `latest*.yml` files.
  - Order: every `latest*.yml` (15:13:07Z–15:13:08Z) is newer than all six server package files (15:11:03Z–15:13:04Z).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.13-beta.4` and `:beta` both point to `sha256:b7ed16ba4e6e…`. `:latest` stays on `v1.5.12` (`sha256:2d8affe595e0…`).
  - Release page: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.13-beta.4
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`, as below.

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-18/release-notes.md`, put above the GitHub generated notes after all four workflows succeed (`RELEASE.md` § Beta notes with a user action).
- Ticket "What you need to do" sections: autobyteus-12's `release-notes.md` has none. The node, desktop and Android lines come from the handoff and the unchanged Android/launcher paths.
- "What's new" is autobyteus-12's `release-notes.md`.
- Result: put above the generated notes after all four succeeded, with `gh release edit v1.5.13-beta.4 --notes-file`. The body starts with `## What you need to do`; the generated "Full Changelog" lines stay below (twice, from the desktop and Android jobs, as on beta.3). The assets are unchanged (23).

## Rollback Criteria

- No stored data conversion: autobyteus-12's data decision is `Directly Usable — No Migration`; an older build ignores the new field and folder. Rolling back is possible: install the previous version, or pin the earlier Docker tag; `:beta` only moves forward. A defect is fixed forward with the next beta.

## Post-Finalization Cleanup

- Created by this delivery, removed after this record's push: the worktree `/home/autobyteus/workspace/.codex/worktrees/release-beta-18`; the local branches `codex/release-beta-18` and `finalize/release-beta-18`; the temp files `/tmp/rb18`, `/tmp/rb18-bin`; the smoke check's step logs (`/tmp/release-smoke-01hdkd4b`). The result is in the terminal message.
- Remote branch: `origin/codex/release-beta-18` is kept, as for earlier tickets.
- No test instances were left running. The user's running app and nodes were not touched.

## Final Status

- Verification complete (the release guide's checks; the Grok runtime waived by the user): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`. Beta `v1.5.13-beta.4` is complete: 4/4 workflows, 23 assets, notes, `:beta`.
- Applicable safe cleanup complete or not required: run after this record's push; result in the terminal message
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal message/reference: `Delivery Completed` to the Solution Designer
