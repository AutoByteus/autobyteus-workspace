Status: Complete

# What Changed

- Kept the backend-owned grouped workspace history contract unchanged.
- Redesigned inactive historical team hydration so first open loads only the focused or coordinator member projection.
- Added shell-member support and per-member historical load-state tracking on the team runtime context.
- Moved historical member-demand loading behind store-owned boundaries:
  - `focusMemberAndEnsureHydrated(...)`
  - `ensureHistoricalMembersHydratedForView(...)`
- Removed the dormant historical-context pruning workaround because the redesign fixes the actual eager-hydration cost center.

# Root Cause

The freeze was caused by eager historical hydration, not by the summary label itself.

- Opening an inactive historical team run fetched projections for every member up front.
- On long-running team histories, that meant loading very large projection payloads even though focus mode initially needed only one member conversation.
- Live investigation against your stored data measured the first two software-engineering team runs at roughly `28.30 MB` and `18.07 MB` of serialized member projection payload.
- The old workaround pruned dormant historical contexts after the fact, but it did not fix the expensive first-open boundary.
- The redesign fixes the real issue by making inactive historical team hydration focused-member-first and lazy for the rest.

# User-Visible Impact

The expected verification path is now:

1. Load the workspace sidebar.
2. Open one stored software-engineering team run.
3. Open a second stored software-engineering team run.
4. The frontend should remain responsive because the second stored run no longer preloads every member projection on first open.
5. Click a different member inside a stored historical team run.
6. Only that member should hydrate on demand.
7. Switch to `grid` or `spotlight`.
8. Additional historical members should hydrate progressively after the mode switch instead of during first open.

Coordinator-first historical open behavior remains intact, and live active teams still use the existing eager/live hydration path.

# Validation

- Focused frontend validation passed: `5` files, `81/81` tests.
- Focused backend/API validation passed: `5` files, `14/14` tests.
- Live worktree probe confirmed:
  - frontend on `3000` serves the ticket worktree frontend
  - backend on `8000` serves the ticket worktree backend
  - `/workspace` returns `200 OK`
  - GraphQL still exposes grouped workspace-history fields `agentDefinitions` and `teamDefinitions`
- Code review round `10` passed with no findings.
- Repo-wide Nuxt typecheck was attempted but remains unusable as a gate because it still fails on unrelated pre-existing errors outside this ticket slice.

# Finalization

- User verification was explicitly confirmed on `2026-04-12`.
- Ticket archived to `tickets/done/team-history-grouped-runs`.
- Ticket branch commit `b0f80aed` was pushed to `origin/codex/team-history-grouped-runs`.
- The work was merged into `origin/personal` and pushed.
- Desktop release `v1.2.75` was published from `personal` with ticket-local release notes.
- Dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/team-history-grouped-runs` was removed, worktree metadata was pruned, and the local branch `codex/team-history-grouped-runs` was deleted.

# Live Sessions

- None. Historical test servers on `3000` and `8000` were stopped during Stage 10 cleanup.
