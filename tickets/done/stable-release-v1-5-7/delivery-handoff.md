# Handoff to the Delivery Engineer: stable v1.5.7 (autobyteus-213)

- What: publish stable **v1.5.7** per RELEASE.md (Stable). The user's words (2026-10-20): "release the latest … whatever on the personal" and "just ask a delivery engineer to do the stable release".
- Candidate: the **`origin/personal` tip at cut time** (now `9227d61597` = v1.5.7-beta.4 + the autobyteus-190 MCP Bulk Import fix + delivery records). Use the standard stable path from a finalize branch off origin/personal.
- Notes: `tickets/in-progress/stable-release-v1-5-7/release-notes.md` (curated, since v1.5.6). Archive the ticket to `tickets/done/stable-release-v1-5-7/` and pass that path to `--release-notes`. Editorial fixes are fine. If a product change lands on personal before the cut that the notes don't cover, add it the same way or ask me.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-7`, branch `codex/stable-release-v1-5-7` (ticket documents only).
- Done when (Task): v1.5.7 is a non-prerelease marked Latest with 17 assets; Desktop, Android, iOS and Server Docker all succeeded on the tag; Docker `:1.5.7`, `:latest` and `:beta` are correct on amd64 and arm64; the release body equals the archived notes; the tag is on personal; the delivery record is merged; worktree and branches cleaned up. Report how each point was verified.
- Requirements and acceptance criteria: `requirements-doc.md` (AC-001..AC-008). Evidence: `investigation-notes.md`.
- Informational, not blocking: the Task asks whether the user also wants his own Docker node (localhost:8001) updated, and whether he has checked the sudden-shutdown restore fix after a backup. I asked him; record his answer if he gives it.
