# Release Requested — v1.5.14-beta.8 (Project Task autobyteus-621)

- From: Solution Designer, 2026-11-23 · To: `/delivery_engineer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on the founder's explicit word, recorded in the Task's comment: "Yess please from the latest original personal".
- Release kind: **beta**, version **`v1.5.14-beta.8`** (the next after published `v1.5.14-beta.7`; `v1.5.14-beta.8` does not exist locally or on `origin`, checked 2026-11-23).
- Nothing to design: work already merged, no software change requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14-beta.8`
- Branch: `codex/release-v1.5.14-beta.8`
- Base: `origin/personal` @ `dad158474c` ("docs(message-reference-own-log-615): finalization record (autobyteus-615)"), fetched 2026-11-23. The Task allows a newer `origin/personal` if it has fast-forwarded at cut time.
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/release-v1.5.14-beta.8/` (this file)

## The Task's direction, in its words (follow `RELEASE.md` strictly)

1. **Base:** Latest `origin/personal` (`dad158474c` or newer if already fast-forwarded on `origin/personal` at cut time). Includes `551` (Grok reliability), `590`+`586` (Phone Activity details + Nuxt typecheck fix), `602` (`TF-04`), `599` (stale runtime session recovery), `579` (unreadable-file error state & busy-host test limits), `585` (platform restart notice rows), `609`+`575` (Stopped tool status/icon, relative chat Markdown links, stopped-run background tasks, post-restart file reads, `pnpm check:contract-dist`), and `615` (Messages reference files on delegated runs).
2. **Pre-tag gates:**
   - Secret / leak gate (`gitleaks` / `RELEASE.md` checks).
   - Full live `release_smoke.py` (with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`).
   - Standing Grok waiver rule: waive a Grok case **only** if it fails solely on a usage/quota limit ("Waive grok if no usage limit anymore"); any other runtime or non-usage-limit failure requires the founder's explicit words.
3. **Release notes:**
   - Start with **"What you need to do"**: clearly note **`autobyteus-615`**'s compatibility note (the desktop/phone app and paired Docker/remote nodes must be updated together to open each other's message reference files because the reference route was unified).
   - Summarize all user-visible changes since `v1.5.14-beta.7`.
4. **Build & publish all four workflows together:**
   - Desktop Release (verify `latest*.yml` after all six server packages), Docker (`:beta` moves to `v1.5.14-beta.8`; `:latest` stays on stable `v1.5.13`), Android, and iOS (TestFlight upload).
   - Never move or delete a published tag.
5. **Finalization:**
   - Record commit on `origin/personal`, fast-forward the founder's checkout (`git fetch` + `git merge --ff-only`), remove release worktree/branch/temp files, and save the verified record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-beta.8-<taskId>-20261123/`.

## Notes from the Solution Designer

- This is the first release smoke after autobyteus-551 (Grok reliability). 551's DEC-006 named this smoke as the check of a second fully loaded run: please record the smoke's load and, if convenient, Grok's start-up times from `~/.grok/logs/unified.jsonl` (timing and catalog fields only; never auth fields). Grok should pass without a waiver.
- Return `Delivery Completed` to the Solution Designer when the completion gates pass.
