# Handoff — Architecture Design Complete: S1 (autobyteus-405)

- Package: `node-desktop-through-node-server`, SR-002 (revised for ARCH-REV-001; see solution-revision-record.md SR-002)
- Task: autobyteus-405 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), slice S1 of autobyteus-394; requested by `/project_task_manager` for the user; depends on S0 (autobyteus-402, delivered, merge `dc8bee36b6`)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server`, branch `codex/node-desktop-through-node-server`, base `origin/personal` @ `9e0681bf39b43f4aecb893866d0e7d50c19cbaf7`; finalization target `origin/personal`. Uncommitted: the ticket folder and `docs/design-cases.md` (Case 16).
- Ticket folder: `tickets/in-progress/node-desktop-through-node-server/`
- Approval: requirements approved by the user (autobyteus-394 at SR-004, 2026-11-06; parent IDs kept); the user reviewed the parent design that defines S1 and asked for the slice Tasks; DEC-S1-1 decided within the direction.
- Classification: `task_size = Large`, `architectural_risk = High` → independent architecture review.

## What the design does

- Server: new `src/node-desktop/` — `resolveNodeDesktop` (node desktop at `127.0.0.1:5900` exactly when the server runs under the Docker starter), `RfbViewerInputFilter` (handshake + table-driven framing; View only drops input; resize and xvp always dropped; −316 removed from SetEncodings; unknown types fail closed), `NodeDesktopStream` (TCP bridge, 8 MiB/1 MiB backpressure, close propagation, metadata-only log). Routes `GET /rest/node-desktop` → `{ available }` and `/ws/node-desktop?mode=view|control` behind the shared `authorizeRemoteAccessWebSocket`.
- Web: `nodeDesktopClient.ts`, `nodeDesktopWs` endpoint, `useVncSession` without password/resize, `NodeDesktopTile` (renamed; disconnects when the window is hidden; mode switch reconnects), `VncViewer` availability states; "AutoByteus VNC Hosts" removed.
- Launcher/compose: only the backend port; no host env; `v9`.

## Points for the reviewer

1. D-3 availability tied to the existing Docker-node fact (`STARTER_SOCKET_ENV`) so S1 works on today's images after an in-place update.
2. D-5 the filter as the View only boundary, incl. the −316 removal (investigation S1-05; design case 16).
3. DEC-S1-1: phones keep the shared policy (no phone-only branch before S3); overlap with autobyteus-403/404 through that shared policy.
4. D-4 mode fixed per stream (reconnect on switch).

## Documents

requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md (this folder). Parent package (evidence, probes): `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/` (investigation-notes.md AF-01…AF-17 and runtime findings; `probes/`).

## Route

Handoff rule: Architecture Design Complete, Large/High → `/software_engineering_team/architecture_reviewer`.
