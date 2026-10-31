# Architecture Design Complete — update-restart-reliability (autobyteus-339), SR-004

## SR-004 (2026-10-31): D1 revised for CRR-002 / F-API-001 — read this first
- **What failed.** SR-003's `forceCloseConnections` cut requests in progress. Cut `createAgentRun`s left prepared-only
  runs, and completed runs whose client never got the ID (API-02/02B). The base build completed them (API-03).
- **New D1.** `installClientConnectionClose(app)` (`src/shutdown/client-connection-close.ts`), used by the four
  servers: one `preClose` step that destroys connections that never sent a request, lets requests in progress finish
  within 2 s, then closes the rest. P-004 proves both paths. `SERVER_CLOSE_OPTIONS` is removed.
- **Requirements.** REQ-001 and DEC-002 revised within the direction (the Solution Designer, the user informed);
  AC-002 is tightened (no prepared-only or unacknowledged run) and AC-008 added. D2 is unchanged.
- **Review focus for ARCH-REV-002:**
  - the close order inside Fastify `preClose` (503 for new requests while closing; the native drain; the WebSocket
    close);
  - socket tracking (`connection` / `request` / `upgrade`);
  - the 2 s grace against 284's 10 s bound;
  - the residual cut after 2 s (FU-004).
- **Design case.** Added to `docs/design-cases.md` Case 5.

The SR-003 handoff follows unchanged.

# (SR-003) Architecture Design Complete — update-restart-reliability (autobyteus-339)

From `/solution_designer`, 2026-10-31. Task `autobyteus-339` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`),
requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).

## Result
- `Architecture Design Complete`. **task_size = Medium, architectural_risk = High.**
- Requirements Approved by the user, 2026-10-31 (SR-002). User approval of the design: Obtained (see design spec).

## Goal and original request
Two leftovers of autobyteus-284 that block the unattended update restart (the user's decision: busy agents continue
automatically after an update, no human; autobyteus-285).
- **FU-008:** a busy shutdown could stall for 10 s (the bound fires, exit 1).
- **FU-007:** "Install update and restart" stops after an incomplete shutdown.

Done when:
- the stall cause is found and fixed, with a repeat run and counts;
- the user's FU-007 decision is implemented;
- the work is finalized on `personal`.

No release unless asked; separate test data only.

## What the investigation established (read `investigation-notes.md` § FU-008 reproduction and cause)
- 2 stalls in 78 valid desktop busy quits (P-002); 0 in 10 server-level runs (P-001).
- In the stalled run **no** run cleanup had started. One client connection that never sent a request kept Fastify's
  `server.close()` open, and the studio's run cleanup is an `onClose` hook, which runs only after the HTTP server has
  closed.
- 0 such connections in 59 clean runs. P-003 reproduces the mechanism deterministically, and shows
  `forceCloseConnections: true` fixes it.
- FU-008's "Org stage" was an inference; that stage is not involved.

## Design (read `design-spec.md`)
- **D1:** `SERVER_CLOSE_OPTIONS = { forceCloseConnections: true }` for all four Fastify servers (studio, standalone
  application, Agent Tools MCP local, credential-proxy local).
- **D2:** `ElectronApplication.prepareForInstall`: after a rejected stop, install when the server process is
  confirmed gone (`BaseServerManager.isServerProcessGone()` → `ApplicationShutdown.acceptIncompleteStopForInstall()`);
  otherwise today's error.

## Review focus
1. Is cutting in-flight requests at shutdown safe for every client flow (DEC-002)? The Docker update request returns
   202 before the stop.
2. The `forceCloseConnections` semantics in Fastify 5.12.7: it runs after the `preClose` hooks, so the native drain and
   the WebSocket close still run first.
3. The install rule's ownership: the sequence in `ElectronApplication`, the fact in `BaseServerManager`, the state in
   `ApplicationShutdown`.
4. The `will-quit` / `quitAndInstall` interplay after `acceptIncompleteStopForInstall`.

## Workspace and artifacts
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability`, branch
  `codex/update-restart-reliability`, base `origin/personal` @ `a977b2c1bc`.
- Ticket folder `tickets/in-progress/update-restart-reliability/`:
  - `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`,
    `fu-007-options.md`;
  - `evidence/`: probes P-001 to P-003, the repro series and both stalled runs.

## Constraints
- Test on separate data only: an isolated app or a temporary data root, never the user's installed app or data.
- Live Codex uses `gpt-6.1-terra`. No release.

## Route
The handoff rule for architectural_risk High → `/software_engineering_team/architecture_reviewer`, 2026-10-31.
