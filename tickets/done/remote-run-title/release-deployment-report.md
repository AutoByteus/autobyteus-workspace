# Delivery / Release / Deployment Report — remote-run-title (autobyteus-269)

## Scope

A remote run's title (`Small` / `Low`, direct route). The scope is repository finalization to `origin/personal`, then the stable release `v1.5.8` at the user's request. The stable release covers everything merged since `v1.5.7`.

## Project Release Guide

- `RELEASE.md` at `origin/personal` `ca1f09e52a`; its last change concerns the NFS guide only. Deviations: `None`. Proposed fixes: `None`.

## Initial Delivery Integration Refresh

- Bootstrap base `33171e1385`; latest checked `ca1f09e52a` (advanced: the copy-only NFS guide). Checkpoint `89aeb8f5d8`. Method `Merge`, clean, with no file changed on both sides.
- Post-integration checks: DEL-01 (web guards, web suite 653 files / 4686 passed) and DEL-02 (server build, browser probe 6/6) pass. The server is untouched by the base, so API-01 (30/30) holds.

## Verification

- Evidence judged: `Sufficient` for AC-601 … AC-604. The evidence relied on: the API-REV-002 report and scorecard (95%, no category below 90%), probe runs 3–5 and DEL-02, and the API-01 receipt (RC-05/21/22/30).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-601 | RRT-01 … RRT-05 (run 5, DEL-02); API-01 RC-05/21/22 | Stored titles: peer Agent and peer Team "Cut the launch trailer and have it checked. Marker …". The rows show them while active (live contexts present), after a reload, and after owner messages to the Agent and to the Team coordinator (the Team row sampled for 6 s: one text). The header shows the stored title | Proven |
| AC-602 | API-01 RC-30; unit | A 317-character multi-line description gives a one-line, 100-character title for both kinds | Proven |
| AC-603 | RRT-02/03/06 | A plain user run is unchanged. The skill-tagged run reads without the instruction prefix, active and after Stop and reload (the design's stated consistency gain) | Proven |
| AC-604 | review | No migration added; a stored run lists and opens | Proven |
| AC-605 | — | The user's check on his Docker node | User Check: open (user chose to release first) |

- User check needed: `Yes`, AC-605. The user decided to finalize and release a stable version without checking first (2026-10-22).

## Release Decision

- `Stable` `v1.5.8`, by the user, 2026-10-22 ("finalize and release a stable version now").

## Release Notes Summary

- Release notes artifact: `tickets/done/remote-run-title/release-notes.md`, created before finalization.
  - It covers every user-facing change since `v1.5.7`: Remote Collaboration (delegation, Agent Teams, discovery, the Nodes page, titles), the Notification Center, Agent Runtimes and remote sign-in, the NFS guide, MCP client v2 and HTTP-status errors, Electron and library security, and the Skill Improvement removal.
  - It states that going back to an earlier version is not supported (the Skill Improvement data deletion; new remote-collaboration fields that older builds were never checked against), per `RELEASE.md` § Rollback.
- Used for the release via `desktop-release.sh release 1.5.8 --release-notes …`.

## Docs Sync Result

- `docs-sync-report.md`: `Updated` (by the implementation; verified by delivery).

## Ticket State Transition

- Moved to `tickets/done/remote-run-title`: `Yes`.

## Environment Or Persisted-Data Transition Notes

- This ticket: `Not Affected`, with no migration. The release as a whole contains one app-data migration (`remove-skill-improvement-data-migration`, which deletes data once). The release notes tell users to back up first and that going back is not supported.

## Rollback Criteria

- Revert on `personal` and cut a newer release (`RELEASE.md`). Desktop updates never downgrade. Docker users would pin an earlier image, which the notes advise against after the data deletion.
