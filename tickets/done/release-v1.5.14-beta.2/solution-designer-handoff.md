# Handoff — release request: beta v1.5.14-beta.2 (package release-beta-1514-2)

Classification: **Release Requested** (nothing to design; no requirements, notes or design written).

## Request
Task autobyteus-563 (Project project_a1377344-25db-482a-97cc-ecfdb0fb495a), requested by /project_task_manager on the founder's authorization of 2026-11-19, in his words: "Let's release a beta version please. Waive for grok is we don't have usage limits for grok".

- Release kind: **beta** pre-release; expected version **v1.5.14-beta.2** (the last tag is `v1.5.14-beta.1`); the version, steps and checks come from `RELEASE.md` and the release guide. Always cut from the latest `origin/personal` at the cut.
- Include everything merged on `personal`; leave nothing out. Verify the exact range `v1.5.14-beta.1..HEAD` (223 commits at this handoff) when writing the notes.
- **Grok waiver:** the founder waived the Grok smoke check "if we don't have usage limits for grok", as the Task puts it: run the smoke first; waive Grok only if Grok fails on a usage limit (find the cause otherwise, TESTING.md Rule 9); record the waiver and the reason in the release report as `RELEASE.md` requires.
- Keep GitHub `Latest` on stable `v1.5.13`; Docker `:beta` moves to `1.5.14-beta.2`, `:latest` stays on `1.5.13`.

## Expected content since v1.5.14-beta.1 (merges seen on origin/personal, to verify)
- autobyteus-540 (send on an unbound stream: a message is never lost silently): **notes start with "What you need to do"**: the app and every node it connects to must be updated to this release together, because the reconnect snapshot adds `input_state`.
- autobyteus-5 (protected Ubuntu AppImage startup and authenticated managed updates).
- autobyteus-560 (Work Journal omits Antigravity's successful MCP schema reads; renderer revision 2 → 3: a one-time re-render and re-index of existing journals; the ticket's release notes are in `tickets/done/journal-omit-agy-schema-reads/release-notes.md` on personal).
- autobyteus-533 (interrupt-idempotent stop), the follow-ups of 461/500 and other merges in the range: check against the tag ancestry and each archived ticket's `release-notes.md`; the earlier autobyteus-348 notes (GraphQL clean cut) shipped in v1.5.11-beta.11.
- **Release notes start with "What you need to do"** in plain language: the app + nodes updated together (540) and the one-time journal re-render (560).

## Context
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-1514-2`; branch `codex/release-beta-1514-2`; base `origin/personal` @ 422a2955c5 (fetched 2026-11-19); finalization target `origin/personal`.
- Rollout and record gates (from the Task): all four workflows green (Desktop, Server Docker, Android, iOS), 23 assets with `latest*.yml` published after the server packages; record copy in `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-beta.2-autobyteus-563-20261119/` with `archive.sha256` verified; clean up the release worktree, temporary branches and `/tmp` leftovers. No other release work is in this request (ignore any mention of autobyteus-279).
- Known open items that are not blockers by themselves: the scripted-Antigravity discovery timeout flake under load (Task autobyteus-562); the macOS staple retry gap (FU-4 of clean-runner-build-order): rerun as before if it recurs.

## Expected output
`Delivery Completed` to the Solution Designer with the release report (version, tag, published artifacts, checks, Grok decision); I verify the receipt and report to the project task manager.
