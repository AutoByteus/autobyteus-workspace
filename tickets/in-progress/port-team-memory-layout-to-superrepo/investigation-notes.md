# Investigation Notes

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal-team-memory-layout` (source branch and file history)
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` (target branch state)
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/in-progress/port-team-memory-layout-to-superrepo/requirements.md`
- `source/autobyteus-ts` commits: `8b7470a`
- `source/autobyteus-server-ts` commits: `60a113d`, `02317b8`

## Current Findings
- Ticket bootstrap completed: branch created in target super repo.
- Requirements captured in Draft status.
- Team-memory source commit set is isolated and deterministic:
  - `autobyteus-ts@8b7470a`: explicit leaf `memoryDir` handling and tests.
  - `autobyteus-server-ts@60a113d`: canonical team-member layout/read/restore/manifests and tests.
  - `autobyteus-server-ts@02317b8`: readable team-member run folder IDs and tests.
- Patches were applied into super repo using directory-prefixed `git apply`.
- One reject hunk in `team-member-run-projection-service.ts` was resolved manually to match source logic.
- Post-apply parity check across all touched files reports `ALL_MATCH` with source files.

## Constraints
- Port scope is restricted to team-memory layout only.
- Avoid carrying unrelated branch changes.

## Open Unknowns
- Final verification status for targeted test suites in super repo environment.

## Implications For Design/Implementation
- Porting strategy is validated: replay source team-memory commits as patch sets into physical super-repo directories.
- Next step is targeted execution checks and final scope guard review before committing.
