# Handoff: Architecture Design Complete: seal-migrations-per-folder (autobyteus-280)

- Result: `Architecture Design Complete`, task_size `Large`, architectural_risk `High`
- Package: `seal-migrations-per-folder`; Project Task **autobyteus-280** (autobyteus-204 waits for it); requested by `/project_task_manager` on the user's decision of 2026-10-23
- Revision: SR-001
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder`, branch `codex/seal-migrations-per-folder`, base `origin/personal` @ `27f2d2f72d`; finalization target `origin/personal`. No release unless the user asks.

## Goal (the user)

"Scope the dirty code inside each migration folder itself … we don't compromise our production code", so that a migration can later be retired by deleting its folder. Migrations may share frozen helpers with each other, never with the application.

## Approval

The direction and the sharing decision are the user's (2026-10-23). Everything else is decided within that direction, with the user informed: capability readiness, the G-1 narrowing, the database-client exception, the retention window left for autobyteus-204.

## Key points for review

- **D-1/D-2 (sealed migration area):** `migrations/<one folder each>/` plus one shared `frozen/` layer that only migrations import. Only the members migrations use are frozen; deep services are reproduced only as far as the migration exercises them (S-01, S-07).
- **D-3:** the only production import allowed in the migration area is `config/prisma-client-factory.ts`. `autobyteus-ts` is frozen too (S-08).
- **D-4 (capabilities):** a migration declares `holdsBackCapabilities`, the runner answers `capabilityReadiness()`, and production asks for a capability, never a migration id. G-2 behavior is unchanged.
- **D-5:** G-1 is narrowed from a whole-server block to "custom providers unavailable".
- **D-6:** `autobyteus-ts/src/memory/migration/` moves into the migration area.
- **D-7:** the current message-log pattern moves to its owner.
- **D-8:** a manual retry generically rebuilds readiness and refreshes the capabilities.
- **REQ-008:** the 205 `server_helper` repair, with a compactor fixture.
- **DS-004:** an architecture test plus an unused-frozen-files report. The sequence starts with an exception list that must only shrink.

## Risks

Behavior drift in rewritten deep dependencies (mitigated by unchanged test assertions, newest-first, escalation); callers of the G-1 narrowing; the estimated size of `frozen/`.

## Follow-ups

None yet.

## Route

`get_handoff_rules` → the Large/High rule → `/software_engineering_team/architecture_reviewer`.
