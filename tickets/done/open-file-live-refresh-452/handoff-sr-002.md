# Handoff — autobyteus-452, SR-002: Architecture Design Complete

- Package: `open-file-live-refresh-452` (Project Task `autobyteus-452`, approved by the user 2026-11-11)
- Result: `Architecture Design Complete`; `task_size: Medium`, `architectural_risk: Low`
- Route (`get_handoff_rules`, 2026-11-11): `/software_engineering_team/implementation_engineer` (Small or Medium with Low risk → direct implementation)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452`, branch `codex/open-file-live-refresh-452`, base `origin/personal` at `827f1e68dc`; finalization target `origin/personal`. No product code is changed. The ticket documents are on disk, not committed. The server and phone bundle are already built.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452/tickets/in-progress/open-file-live-refresh-452/`

## Request

A file viewer left open refreshes by itself within a few seconds when the agent rewrites the file, in four cases: an unexpanded folder, an atomic rewrite, images and PDFs. Constraints:
- no new reads when nothing changed (no polling);
- unsaved edits kept;
- the phone reads with its key;
- isolated nodes;
- DESIGN.md and TESTING.md;
- release only on the user's word.

## Cause (reproduced; `investigation-notes.md`)

- The node's watcher sees every change, but `ModifyNodeSynchronizer` sends nothing for a file whose folder is not loaded in the node's lazy tree (cases A, C, D).
- The window reloads only Text on `modify` (C, D).
- The atomic rewrite in a loaded folder already works (B): the watcher reports it as a `change`.

## Build (`design-spec.md`)

- `modify` becomes `{ type: 'modify', path }` (workspace-relative, POSIX), sent for every file change, and also for a file `add`.
- The window matches open files by path and reloads them with 450's `_reloadOpenFile`: text refetch with the draft kept, media `contentRevision`.
- No viewer changes.

## Overlap

autobyteus-471/472 (another SD) work in the same viewer area. Direct messages between Tasks are refused, so the PM relays. This change touches no viewer component. Whoever merges second rebases and reruns the other's cases.

## Reproduction to start from

`node /Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452/tickets/in-progress/open-file-live-refresh-452/evidence/repro/open-viewer-refresh-repro.mjs --output-dir=<fresh>`. Today A, C and D have no re-read; after the fix ≤ 3 s, and A shows `A-VERSION-2`.

## Open items

- RSK-001: measure the message count for a burst (design step 4).
- FU-001 (files outside the workspace) is in `follow-ups.md`.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/repro/open-viewer-refresh-repro.mjs` (results in `evidence/repro-run-1/`).
