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

## SR-002 (2026-11-27)

- Trigger: ARCH-REV-001 failed (AR-001, AR-002 blocking; N-1…N-3).
- AR-001: the automatic recovery would swap the member contexts under the user.
  - D-A6: one commit carries the page-local fields.
  - D-A7: an in-flight send retargets to the member's current context.
  - `interruptPending` is not carried; the failed service has settled its Stops.
  - Walks recorded.
- AR-002: one direction.
  - The store publishes the recovery state.
  - A recovery owner, registered by a client plugin, drives the coordinator.
  - The silent default goes, and a missing owner throws.
- N-1: the recovery ends without counting a failure when its Team is gone, recovered or stopped.
- N-2 and N-3: in the design's Guidance.
- Requirements: REQ-002 says what survives a recovery, and AC-010 is added (existing behavior kept, made explicit). Within the direction, user informed.
- Classification: still `Large` / `High`. Routing: architecture review.
- Design cases:
  - Case 32: replacing an aggregate drops the page's own state on it;
  - Case 33: a store that starts the work it publishes.
