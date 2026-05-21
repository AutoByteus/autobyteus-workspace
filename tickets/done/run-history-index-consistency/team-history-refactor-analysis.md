# Team Run History Refactor Analysis

Date: 2026-05-21

## Executive Judgment

The standalone-only run-history refactor is not sufficient. Team run history has the same architecture smell and an observed partial-index bug in local data.

Team run metadata migration and team run history-index migration are separate concerns:

- Existing `20260517_team_run_metadata_member_tree` migrates team metadata shape under `memory/agent_teams/<teamRunId>/team_run_metadata.json` from legacy flat `memberMetadata` to canonical recursive `memberTree`.
- It does not migrate or repair `memory/team_run_history_index.json`.
- Current local data has 142 valid team metadata files but only 140 team-history index rows; two metadata-backed team runs are missing from the team history index.

Therefore the current ticket should be expanded, or a blocking follow-up should be created before treating run-history index consistency as solved.

## Current Team History Data Evidence

Local data directory: `/Users/normy/.autobyteus/server-data/memory`

Observed counts:

```text
memory/agent_teams directories: 148
with team_run_metadata.json: 142
valid team metadata JSON: 142
canonical memberTree metadata: 142
legacy flat metadata: 0
team_run_history_index.json rows: 140
metadata-backed team runs missing from index: 2
stale team index rows without metadata: 0
```

Missing metadata-backed team runs:

```text
team_software-engineering-team_1479a41d
team_software-engineering-team_918ba294
```

This is the same incomplete-index failure class as standalone agent history.

## Current Team History Flow

Frontend history query:

```text
listWorkspaceRunHistory
  -> WorkspaceRunHistoryService
  -> TeamRunHistoryService.listTeamRunHistory()
  -> TeamRunHistoryIndexService.listRows()
  -> TeamRunHistoryIndexStore
  -> memory/team_run_history_index.json
  -> if rows.length === 0, rebuildIndexFromDisk()
  -> otherwise trust existing index
  -> read team metadata for each indexed row
  -> overlay active runtime/member status
  -> return team history rows
```

Problem: a non-empty but incomplete `team_run_history_index.json` remains trusted. Missing team metadata directories are not reconciled unless the index is completely empty.

## Current Team History Index Shape

File: `memory/team_run_history_index.json`

Current type: `autobyteus-server-ts/src/run-history/store/team-run-history-index-record-types.ts`

```ts
interface TeamRunIndexFileRecord {
  version: number;
  rows: TeamRunIndexRowRecord[];
}

interface TeamRunIndexRowRecord {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: "ACTIVE" | "IDLE" | "ERROR";
  deleteLifecycle: "READY" | "CLEANUP_PENDING";
}
```

### Field audit

| Field | Current purpose | Judgment | Target owner/shape |
| --- | --- | --- | --- |
| `version` | File schema marker. | Remove. The app-data migration record is the version/migration boundary. Keeping a file version encourages source dual-schema branches. | No file wrapper; use plain row array. |
| `teamRunId` | Identity. | Keep. | Team history catalog row. |
| `teamDefinitionId` | Grouping/display and restore adjacency. | Keep in catalog for fast grouping. | Team history catalog row. |
| `teamDefinitionName` | Display cache. | Keep in catalog; not needed in resume metadata. | Team history catalog row. |
| `workspaceRootPath` | Workspace grouping. | Keep in catalog for fast list grouping. | Team history catalog row. |
| `summary` | History title/list summary. | Keep in catalog; update only on first/explicit summary fill. | Team history catalog row. |
| `lastActivityAt` | Recency sorting/display. | Remove from persisted catalog. It forces activity writes and is lower-value than stable creation ordering. | Use `createdAt` for list ordering; compute detailed activity from member projections when opening a team if needed. |
| `lastKnownStatus` | Persisted live-ish fallback. | Remove. Cold-start team state is offline; active/error status should be runtime/command projection. | `TeamRunStatusProjectionService` or equivalent live projection in response. |
| `deleteLifecycle` | Frontend delete/archive affordance gating; reserves `CLEANUP_PENDING`. | Remove for current personal product. Source search shows backend never writes `CLEANUP_PENDING`; it is always `READY`. If deferred cleanup is introduced later, use a dedicated cleanup job state. | Derived frontend action eligibility from active status + safe persisted identity, or future cleanup subsystem. |

Target team history row:

```ts
type TeamRunHistoryIndexRowRecordV2 = {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
  summary: string;
  createdAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
};

type TeamRunHistoryIndexFileRecordV2 = TeamRunHistoryIndexRowRecordV2[];
```

## Current Team Metadata Shape

File: `memory/agent_teams/<teamRunId>/team_run_metadata.json`

Current type: `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts`

```ts
interface TeamRunMetadata {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  memberTree: TeamRunMemberMetadata[];
}
```

### Top-level metadata field audit

| Field | Current purpose | Judgment | Target owner/shape |
| --- | --- | --- | --- |
| `teamRunId` | Resume identity. | Keep. | Team metadata. |
| `teamDefinitionId` | Restore team definition/config. | Keep. | Team metadata. |
| `teamDefinitionName` | Stable team-run display/manifest snapshot. | Keep in metadata and copy to catalog. It is low-write and useful when team definitions are renamed/deleted. | Team metadata + team history catalog row. |
| `coordinatorMemberRouteKey` | Restore routing/focus. | Keep. | Team metadata. |
| `createdAt` | Stable creation/list ordering. | Keep in metadata and copy to catalog; fix mapper so refresh/restore preserves it instead of rewriting it. Legacy values remain treated as potentially unreliable during migration. | Team metadata + team history catalog row. |
| `updatedAt` | Activity/metadata refresh time. | Remove from target metadata. It is not needed for history and must not be reused as a list activity driver. | Not a history-list persisted driver. |
| `archivedAt` | User visibility state. | Keep in metadata and copy to catalog; archive/unarchive updates both through one serialized catalog operation. | Team metadata + team history catalog row. |
| `memberTree` | Recursive topology and member runtime configs for restore. | Keep. | Team metadata. |

Target team metadata:

```ts
type TeamRunMetadataV2 = {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  createdAt: string;
  archivedAt?: string | null;
  memberTree: TeamRunMemberMetadataV2[];
};
```

### Member metadata field audit

| Field group | Fields | Judgment |
| --- | --- | --- |
| Base identity/topology | `memberKind`, `memberRouteKey`, `memberPath`, `memberName`, `memberRunId` | Keep. Required for restore, member addressing, tree UI, and memory layout. |
| Optional descriptive fields | `role`, `description` | Keep for now. They are config/display facts and low-write. |
| Agent member runtime config | `runtimeKind`, `platformAgentRunId`, `agentDefinitionId`, `llmModelIdentifier`, `autoExecuteTools`, `skillAccessMode`, `llmConfig`, `workspaceRootPath`, `applicationExecutionContext` | Keep. These are equivalent to standalone resume/config facts. `platformAgentRunId` is a backend run mapping, not a display status. |
| Subteam member config | `teamDefinitionId`, `teamRunId`, `coordinatorMemberRouteKey`, `memberTree` | Keep. Required for nested team restore/topology. |

## Current Write-Frequency Problem

`TeamRunService.recordRunActivity()` currently does both:

```text
buildMetadata(run)
write team_run_metadata.json
recordRunActivity(... lastKnownStatus, lastActivityAt ...)
write team_run_history_index.json
```

`TeamRunMetadataMapper.buildMetadata()` sets both `createdAt` and `updatedAt` to `new Date().toISOString()` each time it builds metadata. That means metadata refresh can rewrite the stable creation time and the team index gets activity/status writes. Target behavior: new team runs receive one `createdAt`; restore/refresh receives the previous metadata and preserves `createdAt`, `teamDefinitionName`, and `archivedAt`; `updatedAt` is removed and never drives history ordering.

## Target Team Data Flow

Normal team history list:

```text
Frontend history query
  -> WorkspaceRunHistoryService
  -> TeamRunHistoryService
  -> TeamRunHistoryCatalogService.listCatalogRows()
  -> in-memory catalog loaded from team_run_history_index.json
  -> TeamRunHistoryService reads team_run_metadata.json only for those indexed row ids
  -> TeamRunStatusProjectionService overlays live team/member status
  -> return team history
```

No directory discovery, full metadata scan, rebuild, or repair runs during normal list/catalog initialization. Row-scoped metadata reads are allowed only because the team GraphQL item still needs `memberTree`/member topology; missing metadata for an indexed row is logged/skipped, not repaired in the list path.

Team startup app-data migration:

```text
AppDataMigrationRunner.runPending()
  -> TeamRunHistoryIndexV2AppDataMigration if not already succeeded
  -> scan memory/agent_teams/*/team_run_metadata.json
  -> read legacy team_run_history_index.json if present
  -> synthesize missing V2 team catalog rows
  -> backup and write team_run_history_index.json as plain row array
  -> record migration summary/log
```

Allowed steady-state team catalog writes:

- create/prepared team run catalog row plus initial metadata write;
- restore metadata refresh that preserves stable manifest fields and optionally ensures a missing catalog row for that specific team id;
- first/explicit summary fill;
- archive/unarchive, updating metadata `archivedAt` and catalog `archivedAt` together;
- terminate timestamp;
- delete/cancel removal;
- startup app-data migration.

Forbidden steady-state writes:

- ordinary member/team activity only to update `lastActivityAt`;
- live status transitions only to update `lastKnownStatus`;
- metadata refresh only to update `updatedAt`.


## Team V2 Migration Algorithm Clarification

`TeamRunHistoryIndexV2AppDataMigration` should be the only automatic full-scan repair path for team history. It runs after `TeamRunMetadataMemberTreeMigration` and scans `memory/agent_teams/*/team_run_metadata.json`.

Field derivation for each safe team-run directory with valid canonical metadata:

| V2 row field | Derivation / fallback order |
| --- | --- |
| `teamRunId` | Safe directory name is authoritative. If metadata contains a different non-empty `teamRunId`, fail that item instead of silently merging identities. |
| `teamDefinitionId` | metadata `teamDefinitionId` -> existing legacy/V2 index row `teamDefinitionId` -> parse `team_<definitionId>_<suffix>` from directory name -> fail item if still empty. |
| `teamDefinitionName` | existing index row `teamDefinitionName` -> metadata `teamDefinitionName` -> team-definition lookup by id -> `teamDefinitionId` fallback with warning. Existing row wins to preserve historical display for already indexed rows. |
| `workspaceRootPath` | existing index row `workspaceRootPath` if valid -> coordinator leaf member `workspaceRootPath` -> first leaf agent member `workspaceRootPath` -> `null`; canonicalize non-null paths. |
| `summary` | existing non-empty index `summary` -> coordinator raw trace/projection summary if cheaply available -> empty string. No ordinary activity timestamp is written. |
| `createdAt` | existing V2 row `createdAt` -> team directory `birthtime` -> earliest leaf member metadata/prepared timestamp if available -> metadata file `birthtime` -> legacy metadata `createdAt` with warning label because mapper rewrote it historically -> legacy metadata `updatedAt` with warning -> legacy index `lastActivityAt` with warning because it is activity, not creation -> team directory `mtime` with warning -> metadata file `mtime` with warning -> migration time with last-resort warning. |
| `archivedAt` | existing row `archivedAt` if valid -> metadata `archivedAt` if valid -> `null`. |
| `terminatedAt` | existing row `terminatedAt` if valid -> `null`; do not infer termination from legacy `lastKnownStatus`, lack of active runtime, or `lastActivityAt`. |

Reporting rules:

- existing index rows with no metadata directory are `SKIPPED` and omitted from V2 output as stale rows;
- directories without `team_run_metadata.json` are `SKIPPED`, not `FAILED`, because they are not valid team-run metadata items;
- unsafe directory identities, invalid JSON, unsupported legacy metadata after the member-tree migration, or identity mismatches are `FAILED` and omitted;
- metadata-backed rows missing from the legacy team index are `MIGRATED` with detail `missing from legacy index`; this covers the observed `team_software-engineering-team_1479a41d` and `team_software-engineering-team_918ba294` cases;
- the migration backs up the prior `team_run_history_index.json`, writes a plain row array atomically, resets any in-memory team catalog singleton, and records the summary/log through the app-data migration framework.

## Recommended Design Impact

The current design must be revised from "standalone agent history only; team deferred" to "run-history catalog refactor covers both standalone and team history subjects".

Recommended owners:

- `AgentRunHistoryCatalogService`: standalone catalog owner, already designed.
- `TeamRunHistoryCatalogService`: team catalog owner, analogous but not identical because team metadata and member projections are different.
- Shared atomic JSON writer and safe identity helpers may be reused where appropriate.
- `RunHistoryIndexV2AppDataMigration`: standalone index migration.
- `TeamRunHistoryIndexV2AppDataMigration`: team index migration/repair.

The existing `TeamRunMetadataMemberTreeMigration` remains valid and separate; it should run before the team history-index migration because team history row synthesis depends on canonical `memberTree` metadata.
