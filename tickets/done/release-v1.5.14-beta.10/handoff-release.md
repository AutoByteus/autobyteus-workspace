# Release Requested — v1.5.14-beta.10 (Project Task autobyteus-629)

- From: Solution Designer, 2026-11-23 · To: `/delivery_engineer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); the Task states "Founder approved cutting beta release `v1.5.14-beta.10` from the latest `origin/personal` … to soak the new post-`beta.9` merges before stable `v1.5.14`".
- Release kind: **beta**, version **`v1.5.14-beta.10`** (next after published `v1.5.14-beta.9`; `v1.5.14-beta.10` exists neither locally nor on `origin`, checked 2026-11-23).
- Nothing to design: work already merged, no software change requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14-beta.10`
- Branch: `codex/release-v1.5.14-beta.10`
- Base: `origin/personal` @ `e5d878832b` (merge of autobyteus-53), fetched 2026-11-23; 36 commits since `v1.5.14-beta.9`, with the merges of autobyteus-377 (`87ca2ceb99`), autobyteus-588 (`1b7b4dc334`) and autobyteus-53 (`e5d878832b`); their tickets are archived under `tickets/done/`. A newer `origin/personal` at cut time is allowed by the Task.
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/release-v1.5.14-beta.10/` (this file)

## The Task's direction, in its words (follow `RELEASE.md` strictly)

1. **Base:** Latest `origin/personal` (`e5d878832b` or newer if already fast-forwarded on `origin/personal` at cut time). Includes:
   - **`autobyteus-377`** (Antigravity native tool results & parallel-call arguments, Work Journal renderer revision 5)
   - **`autobyteus-588`** (Antigravity capsule tool drift warning `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY`)
   - **`autobyteus-53`** (continue a stopped run on another model — model hand-over)
2. **Pre-tag gates:**
   - Secret / leak gate (`gitleaks` / `RELEASE.md` checks).
   - Full live `release_smoke.py` (with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`).
   - Standing Grok waiver rule: waive a Grok case **only** if it fails solely on a usage/quota limit ("Waive grok if no usage limit anymore"); any other runtime or non-usage-limit failure requires the founder's explicit words.
3. **Release notes:**
   - Start with **"What you need to do"** (normal update from `beta.8`/`beta.9`; note Work Journal re-renders once at revision 5 on next turn; keep the `29`/`615` notes for anyone upgrading from `beta.7` or older).
   - Summarize changes since `v1.5.14-beta.9`.
4. **Build & publish all four workflows together:**
   - Desktop Release (verify `latest*.yml` after all six server packages), Docker (`:beta` moves to `v1.5.14-beta.10`; `:latest` stays on stable `v1.5.13`), Android, and iOS (TestFlight upload).
   - Never move or delete a published tag.
5. **Finalization:**
   - Record commit on `origin/personal`, fast-forward the founder's checkout (`git fetch` + `git merge --ff-only`), remove release worktree/branch/temp files, and save the verified record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-beta.10-<taskId>-20261123/`.

## Notes

- If a merge since beta.9 adds a released migration or changes the Docker system part, the notes' "What you need to do" must say so (the Task expects a normal update from beta.8/beta.9); check it, as the release guide's checks do.
- Beta.8/beta.9 FU-001 (the macOS in-job signing/notarization retry) is still unfixed; the job-level rerun is the known recovery.
- Return `Delivery Completed` to the Solution Designer when the completion gates pass.
