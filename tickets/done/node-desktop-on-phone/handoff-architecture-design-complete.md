# Handoff — Architecture Design Complete: S3 (autobyteus-407)

- Package: `node-desktop-on-phone`, SR-002 (revised for ARCH-REV-001; see solution-revision-record.md); Task autobyteus-407 (S3 of autobyteus-394); requested by `/project_task_manager` for the user; prerequisite autobyteus-415 delivered
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone`, branch `codex/node-desktop-on-phone`, base `origin/personal` @ `e427a0c9cfeab1a0959ec1ce6f00e394a8405b15`; finalization target `origin/personal`. Ticket documents uncommitted.
- Approval: user (parent requirements; placement in his own words); DEC-S3-1…8 within the direction, user informed
- Classification: `task_size = Large`, `architectural_risk = High`

## Summary

Phone: a **VNC Viewer** entry in a run's ⋮ menu (only when the paired node has a node desktop and the run is local) opens `MobileNodeDesktop`: View only and fitted, pinch/pan/double-tap zoom in View only, Control switch with a keyboard bridge, in-page full screen, disconnect on hidden and View only reconnect via a connection policy extracted from the S1 tile. Server: `NodeDesktopViewers` admits within 4 per node / 2 per phone (close 4429) and re-checks open phone streams every 20 s (non-overlapping, cut-off ≤ 25 s) with the shared auth service.

## Points for the reviewer

1. Registry ownership (admission + re-check) vs the stream (notification only).
2. Extraction of the visibility/reconnect policy (one owner for both clients).
3. Zoom only in View only (noVNC coordinates under a transform).
4. MP-001 as the first implementation step; Android untouched unless it fails.

## Documents

requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md (this folder); parent package `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/`; S1 archive `/Users/normy/autobyteus_org/autobyteus-ticket-archives/node-desktop-through-node-server-405/tickets/done/node-desktop-through-node-server/`.

## Route

Architecture Design Complete, Large/High → `/software_engineering_team/architecture_reviewer`.
