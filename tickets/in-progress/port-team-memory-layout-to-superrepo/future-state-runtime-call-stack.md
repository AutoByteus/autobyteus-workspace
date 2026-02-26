# Future-State Runtime Call Stack

## Version
- Current Version: `v1`

## Design Basis
- `tickets/in-progress/port-team-memory-layout-to-superrepo/proposed-design.md` (`v1`)

## Use-Case Coverage
| use_case_id | source_type | requirement_ids | primary | fallback | error |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | REQ-001,REQ-002,REQ-005,REQ-006 | Yes | N/A | Yes |
| UC-002 | Requirement | REQ-002,REQ-004,REQ-006 | Yes | N/A | Yes |
| UC-003 | Requirement | REQ-003,REQ-006 | Yes | N/A | Yes |
| UC-004 | Requirement | REQ-007 | Yes | N/A | Yes |

## UC-001 Team Create/Send Persists Canonical Team-Member Layout
1. `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:createAgentTeamRun(...)`
2. `.../agent-team-run.ts:resolveRuntimeMemberConfigs(...)`
   - computes canonical `memoryDir = memory/agent_teams/<teamRunId>/<memberRunId>`
3. `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRunWithId(...)`
4. `autobyteus-ts/src/agent/factory/agent-factory.ts:createRuntimeWithId(...)`
   - explicit `memoryDir` detected and leaf layout options set
5. `autobyteus-ts/src/memory/store/file-store.ts` and `working-context-snapshot-store.ts`
   - writes under canonical member leaf path
6. `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
   - persists team manifest and per-member `run_manifest.json`

### Error branch
- Invalid member path segments or missing member config fails fast with explicit error.

## UC-002 Team Continue Restores Canonical Member Layout
1. `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:sendMessageToTeam(...)`
2. `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:continueTeamRun(...)`
3. continuation service reconstructs canonical member `memoryDir` via layout store
4. runtime resumes and appends into same canonical member subtree

### Error branch
- Missing team manifest/member binding aborts restore path.

## UC-003 Team Member Projection Reads Canonical Member Folder
1. `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts:getTeamMemberRunProjection(...)`
2. `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts:getProjection(...)`
3. `autobyteus-server-ts/src/run-history/services/team-member-memory-projection-reader.ts:getProjection(...)`
4. returns member conversation/summary/lastActivity from canonical member subtree

### Error branch
- Unknown `memberRouteKey` returns member-not-found error.

## UC-004 Team Delete Removes Canonical Team Artifacts
1. `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts:deleteTeamRunHistory(...)`
2. `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:deleteTeamRunHistory(...)`
3. removes `memory/agent_teams/<teamRunId>` recursively and index row

### Error branch
- Active runtime guard denies delete until terminated.
