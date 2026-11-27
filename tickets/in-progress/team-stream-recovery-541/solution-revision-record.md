# Solution Revision Record

## SR-001 (2026-11-27)

- Trigger: autobyteus-541 from `/project_task_manager`. It merges 533 FU-001…005 and FU-007 with 540 FU-001…003.
- Status: requirements Approved (Solution Designer within the direction, user informed); design Ready.
- Findings:
  - A's gap reproduced (run 3): the probe's wire reordered two frames, and a prototype proves it reorders them. The server's order is correct.
  - What remains is the Team view's recovery, which waits for the user, where the Org recovers by itself.
  - B and C are as the follow-ups describe. C also affects active standalone runs.
  - The unused `activeRunRecoveryCoordinator` is dead code.
- Decisions:
  - DEC-001: automatic Team stream recovery, like the Org's;
  - DEC-002: no Initializing placeholder for existing contexts;
  - DEC-003: the status at open comes from the run-status feed;
  - DEC-004: retry once, then keep the current context;
  - DEC-005: an explicit timeout on the slow spec.
- Classification: `Large` / `High`. Routing: architecture review.
