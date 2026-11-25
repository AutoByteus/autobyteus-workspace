# Release Requested — v1.5.15-beta.2 (Project Task autobyteus-650)

- From: Solution Designer, 2026-11-25 · To: `/delivery_engineer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the founder's words recorded verbatim in the Task (speech-to-text, two messages): "Version because we just finished one thing, waive for codex usage limits" and "Release a new beta version".
- Release kind: **beta**, version **`v1.5.15-beta.2`** (next after `v1.5.15-beta.1`; the tag exists neither locally nor on `origin`, checked 2026-11-25).
- Nothing to design: work already merged, no software change requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.15-beta.2`
- Branch: `codex/release-v1.5.15-beta.2`
- Base: `origin/personal` @ `32aa87d429` ("docs(viewer-polish-647): record the finalization (autobyteus-647)"), fetched 2026-11-25. First-parent since `v1.5.15-beta.1`: the beta.1 record `bc4351cad7`, the merge of 649 (`383c3a7d96`) and its record, the merge of 647 (`91cb17b06d`) and its record. Use a newer tip if one has landed (the founder's rule: a beta is always the latest personal branch).
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/release-v1.5.15-beta.2/` (this file)
- Pre-check: `git diff --name-only v1.5.15-beta.1..32aa87d429` outside `tickets/` touches no migration, Prisma, Docker, workflow, script file or RELEASE.md; confirm with the release guide's checks.

## The Task's direction, in its words (follow `RELEASE.md` strictly, as for beta.1)

1. Secret / leak gate; full live `release_smoke.py` with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`.
2. **Codex waiver, this beta ONLY, usage-limit failures only:** the founder's words above. Still run the smoke normally; waive Codex only if Codex fails solely on its usage limit (it resets Nov 27, 7:43 AM). Any other Codex failure, or any non-Grok-usage-limit failure on another runtime, stops and asks the founder. Standing Grok usage-limit-only waiver also applies. Record the waiver verbatim in the release report.
3. Release notes start with "What you need to do" (normal update from `v1.5.15-beta.1`; the iPhone app needs the new TestFlight build for the iOS player-screen change; keep the older notes for anyone upgrading from earlier versions), then every user-visible change since `v1.5.15-beta.1`, one Full Changelog line.
4. All four workflows together (Desktop pre-release, Docker `:beta` moves and `:latest` stays on `v1.5.14` at System level 2, Android, iOS TestFlight); `latest*.yml` after the six server packages; never move or delete a published tag.
5. Finalization: record commit on `origin/personal`; bring the founder's checkout up to date with `git fetch` and `git merge --ff-only` (his unrelated local changes stay untouched; report line); remove the release worktree, branch and temp files; record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.15-beta.2-<taskId>-20261125/`.

Done when (Task): tag and GitHub pre-release published and verified (assets, four workflows green, Docker `:beta` digest, notes), smoke result with the waiver recorded verbatim, founder's checkout in sync, cleanup done, follow-ups recorded. The post-Nov-27 Codex smoke stays in autobyteus-637.

## Notes

- 649's release notes are written in its archived ticket (`tickets/done/remove-long-running-prompt-649/release-notes.md`); they state plainly that how well agents wait without the section was never measured.
- Any stop: report `Blocked` to the Solution Designer with evidence and options; I ask the founder and relay his words verbatim.
- The macOS in-job signing/notarization retry is still unfixed; the job-level rerun is the known recovery.
- Return `Delivery Completed` to the Solution Designer when the completion gates pass.
