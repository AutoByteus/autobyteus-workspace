# Release Requested — v1.5.14-beta.9 (Project Task autobyteus-626)

- From: Solution Designer, 2026-11-23 · To: `/delivery_engineer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); the Task states "Founder approved cutting beta release `v1.5.14-beta.9` from the latest `origin/personal`".
- Release kind: **beta**, version **`v1.5.14-beta.9`** (next after published `v1.5.14-beta.8`; `v1.5.14-beta.9` exists neither locally nor on `origin`, checked 2026-11-23).
- Nothing to design: work already merged, no software change requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14-beta.9`
- Branch: `codex/release-v1.5.14-beta.9`
- Base: `origin/personal` @ `13575c21f8` ("docs(follow-ups-615-619): finalization record (autobyteus-619)"), fetched 2026-11-23; 15 commits since `v1.5.14-beta.8`. A newer `origin/personal` at cut time is allowed by the Task.
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/release-v1.5.14-beta.9/` (this file)

## The Task's direction, in its words (follow `RELEASE.md` strictly)

1. **Base:** Latest `origin/personal` (`13575c21f8` or newer if already fast-forwarded on `origin/personal` at cut time). Includes **`autobyteus-619`** (fixes the Memory page's Agent Teams list regression from `autobyteus-29` that shipped in `beta.8` — team lists show team roots only while an Org's inner Team stays under its Org — plus faithful upgrade ledger tests and 573/573 green server E2E).
2. **Pre-tag gates:**
   - Secret / leak gate (`gitleaks` / `RELEASE.md` checks).
   - Full live `release_smoke.py` (with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`).
   - Standing Grok waiver rule: waive a Grok case **only** if it fails solely on a usage/quota limit ("Waive grok if no usage limit anymore"); any other runtime or non-usage-limit failure requires the founder's explicit words.
3. **Release notes:**
   - Start with **"What you need to do"** (note that if upgrading from `beta.7` or older, `autobyteus-29` converts saved organization runs one-way on first start and `autobyteus-615` requires updating the app and paired nodes together; from `beta.8`, normal update).
   - Summarize changes since `v1.5.14-beta.8`.
4. **Build & publish all four workflows together:**
   - Desktop Release (verify `latest*.yml` after all six server packages), Docker (`:beta` moves to `v1.5.14-beta.9`; `:latest` stays on stable `v1.5.13`), Android, and iOS (TestFlight upload).
   - Never move or delete a published tag.
5. **Finalization:**
   - Record commit on `origin/personal`, fast-forward the founder's checkout (`git fetch` + `git merge --ff-only`), remove release worktree/branch/temp files, and save the verified record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-beta.9-<taskId>-20261123/`.

## Note

- Beta.8's FU-001 (the macOS notarization in-job retry fails on attempt 2) is not fixed yet; if notarization fails again, the job-level rerun of beta.8 is the known recovery (RELEASE.md Recovery).
- Return `Delivery Completed` to the Solution Designer when the completion gates pass.
