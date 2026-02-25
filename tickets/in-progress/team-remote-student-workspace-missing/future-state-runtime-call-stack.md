# Future-State Runtime Call Stack

## Version
v1

## Design Basis
Small-scope solution sketch from:
- `/Users/normy/autobyteus_org/autobyteus-workspace/tickets/in-progress/team-remote-student-workspace-missing/implementation-plan.md`

## Use-Case Coverage
| use_case_id | primary path | fallback path | error path |
| --- | --- | --- | --- |
| UC-1 local team projection includes remote workspace label | Yes | Yes | N/A |
| UC-2 embedded member remains workspaceId-based | Yes | N/A | N/A |

## UC-1: Local Team Projection Includes Remote Workspace Label

### Entry
- `autobyteus-web/stores/runTreeStore.ts:getTeamNodes()`

### Primary Path (remote member with override)
1. `autobyteus-web/stores/runTreeStore.ts:getTeamNodes()` iterates `teamContextsStore.allTeamInstances`.
2. For each member row, call:
   - `autobyteus-web/stores/runTreeStore.ts:resolveLiveTeamMemberWorkspaceRootPath(teamContext, memberRouteKey, memberContext, workspaceStore)`.
3. Inside resolver, decision gate:
   - If `memberContext.config.workspaceId` resolves to a local workspace absolute path via `resolveWorkspaceRootPath(workspaceStore, workspaceId)`, return that path.
   - Else continue fallback.
4. Fallback decision gate for remote path:
   - Resolve member key candidates: `[memberRouteKey, leaf(memberRouteKey)]`.
   - Read `teamContext.config.memberOverrides[candidate]?.workspaceRootPath`.
   - Return first non-empty trimmed value.
5. `getTeamNodes()` assigns returned path to `TeamMemberTreeRow.workspaceRootPath`.
6. UI renders chip:
   - `autobyteus-web/components/workspace/history/TeamRunsSection.vue` checks `member.workspaceRootPath` and displays leaf name.

### Fallback Path (no override found)
1. Resolver checks `workspaceId` path; none found.
2. Resolver checks overrides by route key and leaf key; none found.
3. Resolver returns `null`.
4. Member row renders without workspace chip.

### Async/Event Boundaries
- None in primary projection path (synchronous computed/store path).

### State Mutations
- No persistent mutation required; projection-only in getter output.

### Data Transformations
- `workspaceId -> absolutePath` (embedded/local).
- `memberOverrides[memberKey].workspaceRootPath -> normalized path` (remote/local fallback).
- `workspaceRootPath -> UI leaf name` via `workspacePathLeafName(...)`.

## UC-2: Embedded Member Remains WorkspaceId-Based

### Entry
- `autobyteus-web/stores/runTreeStore.ts:getTeamNodes()`

### Primary Path
1. Resolver receives memberContext with embedded member `workspaceId`.
2. `resolveWorkspaceRootPath(workspaceStore, workspaceId)` returns absolute path.
3. Resolver returns this absolute path immediately.
4. No override lookup is needed.

### Decision Gates
- Gate 1: valid local workspace path exists for workspaceId -> use it.
- Gate 2: otherwise fallback to override lookup path.

## Notes
- This artifact models target behavior for temporary/local team context projection only.
- Persisted/history team rows already read `workspaceRootPath` from manifest member bindings and are unchanged.
