# Proposed Design

## Design Version
- Current Version: `v1`

## Artifact Basis
- `tickets/in-progress/port-team-memory-layout-to-superrepo/investigation-notes.md`
- `tickets/in-progress/port-team-memory-layout-to-superrepo/requirements.md` (`Design-ready`)

## Summary
Replay the validated team-memory commits from source repos into the super repo's physical directories and keep behavior aligned with canonical team-member memory layout.

## Architecture Direction Decision
- Chosen direction: `Modify` + `Add` (direct port of existing implementation, no compatibility branches).
- Rationale: preserve already-validated team-memory behavior while switching delivery target from submodule pointers to physical in-repo code.
- Layering fitness: `Pass`.

## Current State (As-Is)
1. Super repo `personal` branch lacks the team-memory layout implementation.
2. Team-member canonical stores/readers/tests are missing in `autobyteus-server-ts`.
3. Explicit leaf `memoryDir` semantics are missing in `autobyteus-ts`.

## Target State (To-Be)
1. `autobyteus-ts` uses explicit leaf `memoryDir` semantics for team-member runtime paths.
2. `autobyteus-server-ts` persists/reads canonical team-member memory + run manifests.
3. Team-member run folder IDs use readable slug + stable hash format.

## Change Inventory
| Change ID | Type | Target Path Prefix | Source Commit | Description |
| --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-ts/src` + tests | `8b7470a` | Explicit leaf `memoryDir` behavior in runtime stores and factory.
| C-002 | Modify/Add | `autobyteus-server-ts/src/run-history` + tests | `60a113d` | Canonical team-member layout stores/readers, continuation + projection alignment, member manifest persistence.
| C-003 | Modify/Add | `autobyteus-server-ts/src/run-history/utils` + tests/docs | `02317b8` | Readable team-member run folder IDs and contract coverage.

## Naming Decisions
| Item | Decision | Rationale |
| --- | --- | --- |
| `team-member-memory-layout-store` | Keep | Clear ownership of canonical member path generation.
| `team-member-run-manifest-store` | Keep | Matches persisted contract responsibility.
| team-member folder id format | Use readable slug + stable hash | Improves inspectability while preserving uniqueness.

## Naming Drift Check
| Item | Name Match | Action |
| --- | --- | --- |
| `team-member-run-projection-service.ts` | Yes | N/A |
| `team-member-memory-projection-reader.ts` | Yes | N/A |
| `team-member-run-id.ts` | Yes | N/A |

## Allowed Dependency Direction
- `GraphQL Resolver -> Team Run Services -> Run-History Stores`
- `Team Run Services -> runtime config -> autobyteus-ts memory stores`

## Decommission / Cleanup
- Remove reliance on non-canonical team-member projection path for team-member run queries.
- No backward-compat path retained for legacy team-member `memory/agents/<memberRunId>` reads in this port.

## Use-Case Coverage Matrix
| use_case_id | requirement_ids | primary | fallback | error | runtime call stack section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | REQ-001,REQ-002,REQ-005,REQ-006,REQ-008 | Yes | N/A | Yes | UC-001 |
| UC-002 | REQ-002,REQ-004,REQ-006,REQ-008 | Yes | N/A | Yes | UC-002 |
| UC-003 | REQ-003,REQ-006,REQ-008 | Yes | N/A | Yes | UC-003 |
| UC-004 | REQ-007,REQ-008 | Yes | N/A | Yes | UC-004 |
