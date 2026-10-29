# Handoff — Architecture Design Complete

- Package: `unclean-shutdown-delegated-run-restore`, solution revision `SR-001`
- Result: `Architecture Design Complete` — `task_size: Medium`, `architectural_risk: High`
- Route applied (get_handoff_rules): High risk → `/software_engineering_team/architecture_reviewer` (independent architecture review). No other rule matches.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Project Task `project_task_08d76577-e89b-484d-9f38-cc1ed94ef95e`, on behalf of the user.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore/tickets/in-progress/unclean-shutdown-delegated-run-restore/`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore`, `codex/unclean-shutdown-delegated-run-restore`; base `origin/personal` @ `f171032e88d3016bf34821fbe00336f8c42c355e`; finalization target `origin/personal` (RELEASE.md). Ticket documents are uncommitted in the worktree.

## Original request

After a sudden host shutdown, the user's Docker node (`autobyteus-server-0`, `:8001`) refuses "continue" on the delegated marketing Team: "The delegated Team at '/marketing_team' is shut down and its saved conversation is unavailable (indeterminate); it cannot be restored." Find the cause, whether data was lost, and fix it so an unclean shutdown cannot make a run unrestorable (or the refusal is clear); tests must simulate truncated and half-written files; the fix ships in the next beta and the user checks it after a backup.

## Findings (evidence: investigation-notes.md)

- Failing copy: `marketing_team_0bdbbad72fb8417eb42504d363a69c60` (started 11:57:50 UTC); its coordinator `marketing_content_creator_59ff6d5ef3374f82ae84b6416573cd32` has `raw_traces_active.jsonl` of 360,448 bytes whose last 1,241 bytes are zero bytes (file size reached the disk at the 13:20 UTC power loss, the data did not). 243 complete records precede it.
- Cause: the restore check (`AgentConversationActivityInspector`) parses every line strictly; the zero-filled end is an unparseable line → `indeterminate` → refusal. Reproduced on a copy.
- Latent defects found on the same path: the store's repair cuts at a byte count applied to a string (leaves 603 zero bytes with this file; leaves torn fragments with non-ASCII content), and an append after a damaged end is glued to it and deleted on the next read — every new record would have been lost after a restore.
- Data loss: only the local trace of what was written after 13:19:51 UTC (the in-flight "Review Package: X Draft v4" write at 13:20:27). The AGY runtime's own conversation DB (integrity ok, 248 steps), the work journal, message logs and team tree are intact.
- Extent: one damaged file on node-0 (1,719 JSON/JSONL files scanned on a copy); none on node-1/node-2; on the desktop only the memory-sync mirror of the same file.

## Approval basis

Requirements approved by the Solution Designer within the Task's direction (user informed). DEC-008 — repairing the user's real file now (back up, then cut it at byte 359,207) — is `Needs user`, an operational action outside this basis; it does not block review or implementation.

## Expected output

Independent architecture review of `design-spec.md` against `requirements-doc.md`. Points worth scrutiny: the DESIGN.md rule 7 reading (cutting a damaged end vs never changing unreadable data), treating zero bytes as absent anywhere, lazy repair instead of a startup scan, the per-store-instance end check before append, and leaving per-append sync to FU-001.

## Open risks / follow-ups

RSK-001 (shared foundation; full reruns), RSK-002 / FU-001 (no per-append sync), FU-002 (server display readers keep their own lenient reader).

## Constraints for every downstream role

The user's data (Docker volumes, `~/.autobyteus`, the node) is read-only; no tests on his node or data or copies of it (TESTING.md); do not stop or restart his node. Evidence copies live outside the repo at `/Users/normy/autobyteus_org/unclean-shutdown-evidence/` and are never test data.

## Attached

`handoff-architecture-design-complete.md`, `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (all in the ticket folder).
