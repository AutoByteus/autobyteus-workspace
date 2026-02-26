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

## Incremental Refinement (`2026-02-26`) - Team Folder Name Readability

### Additional Sources Consulted
- `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
- runtime memory path inspection inside `autobyteus-workspace-superrepo-main-allinone-1` container

### Additional Findings
- Team run IDs were generated as `team_<8-char-random>`, so top-level team folders under `memory/agent_teams/` were not human-distinguishable by team name.
- Team definition metadata (`teamDefinitionName`) is already resolved in create/lazy-create flows and can be reused to build readable team-run IDs without changing folder hierarchy contracts.

### Additional Implications
- Introduce a dedicated utility for team-run ID normalization/generation to keep resolver logic simple and testable.
- Keep existing prefix and suffix stability (`team_..._<8hex>`) while inserting readable team slug for operator usability.
