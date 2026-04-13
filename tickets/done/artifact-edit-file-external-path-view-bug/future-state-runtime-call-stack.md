# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` file/network IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments use `# ...`
- The target model below is the redesign target, not a trace of current code.

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v2`
- Requirements: `tickets/done/artifact-edit-file-external-path-view-bug/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `tickets/done/artifact-edit-file-external-path-view-bug/proposed-design.md`
- Source Design Version: `v2`
- Referenced Sections:
  - Spine inventory sections: `DS-001` through `DS-005`
  - Ownership sections: `Ownership Map`, `Subsystem / Capability-Area Allocation`, `Ownership-Driven Dependency Rules`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001, DS-003 | Primary End-to-End | `RunFileChangeService` | Requirement | `REQ-001`, `REQ-003`, `REQ-007` | N/A | Live `write_file` row plus buffered preview | Yes/Yes/Yes |
| UC-002 | DS-001, DS-003, DS-004 | Primary End-to-End | `RunFileChangeService` | Requirement | `REQ-001`, `REQ-004`, `REQ-005`, `REQ-008` | N/A | `edit_file` commit snapshot and committed-content rendering | Yes/Yes/Yes |
| UC-003 | DS-002, DS-004 | Primary End-to-End | `RunFileChangeProjectionService` | Requirement | `REQ-005`, `REQ-006`, `REQ-007` | N/A | Historical reopen hydrates file changes from run memory | Yes/Yes/Yes |
| UC-004 | DS-003 | Bounded Local | `RunFileChangeService` | Requirement | `REQ-002`, `REQ-009` | N/A | Same-path retouch updates one visible row without public `changeId` | Yes/N/A/Yes |
| UC-005 | DS-005 | Return-Event | `RunFileChangeService` | Requirement | `REQ-010` | N/A | Failed or denied file change stays visible | Yes/N/A/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - The current `run-artifacts` path-manifest route may exist briefly while Stage 6 is in flight, but it is not part of the target file-change behavior below.
- Retirement plan for temporary logic:
  - Remove the current file-backed use of `run-artifacts`, raw segment-derived file-row synthesis, and file-backed authority from `agentArtifactsStore` during implementation.

## Use Case: UC-001 Live `write_file` Row Plus Buffered Preview

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `RunFileChangeService`
- Why This Use Case Matters To This Spine:
  - It proves live file changes no longer originate from browser inference.
- Why This Spine Span Is Long Enough:
  - It starts at runtime event production, crosses backend file-change ownership, and ends at the viewer rendering the buffered content.

### Goal

Create and update one visible file-change row for a live `write_file` while showing the live buffered content through backend-owned state.

### Preconditions

- Agent run is active.
- A `write_file` invocation has started.

### Expected Outcome

- One visible row exists for the normalized path.
- The frontend renders buffered content from backend-owned live file-change updates.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts:convertItemEvent(...)
├── autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:emitEvent(...) [ASYNC]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:handleRunEvent(runId, event) [STATE]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:normalizeFileChangeEvent(event) [STATE]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:loadProjection(runId) [IO]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:upsertEntryByPath(projection, normalizedPath, invocationId) [STATE]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:appendWriteBuffer(projection, normalizedPath, delta) [STATE]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:saveProjection(runId, projection) [IO]
│   └── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:publishLiveDelta(runId, normalizedPath) [ASYNC]
├── autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts:handleFileChangeDelta(...) [STATE]
├── autobyteus-web/stores/runFileChangesStore.ts:appendBufferedContent(runId, path, delta) [STATE]
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:renderBufferedFileChange(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if a websocket client reconnects mid-write
autobyteus-web/services/runHydration/runFileChangeHydrationService.ts:hydrateRunFileChanges(...)
└── autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts:getRunFileChangeProjection(runId) [ENTRY]
```

```text
[ERROR] if projection persistence fails
autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:saveProjection(...) [IO]
└── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:markEntryFailed(...) [STATE]
```

### State And Data Transformations

- runtime event -> normalized file-change signal
- normalized signal -> path-keyed file-change row
- streamed delta -> buffered row content

### Observability And Debug Points

- Logs emitted at:
  - file-change normalization failure
  - projection save failure
- Metrics/counters updated at:
  - live file-change upsert count
  - buffered write delta count

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for current scope.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 `edit_file` Commit Snapshot And Committed-Content Rendering

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `RunFileChangeService`
- Why This Use Case Matters To This Spine:
  - It captures the key redesign improvement over the stopgap: committed content comes from run-memory snapshots, not current-path reads.
- Why This Spine Span Is Long Enough:
  - It starts at the live edit event, crosses commit/snapshot capture, and ends at the viewer reading committed content from the server.

### Goal

Make an `edit_file` row inspectable only after final effective content has been captured into run memory.

### Preconditions

- Agent run is active.
- `edit_file` invocation started with a target path.

### Expected Outcome

- The row appears while pending.
- After successful completion, a committed snapshot exists under agent-run memory.
- The viewer renders committed content from the run-memory content route.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:emitEvent(...) [ASYNC]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:handleRunEvent(runId, event) [STATE]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:upsertEntryPending(projection, normalizedPath, invocationId) [STATE]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:captureCommittedContent(runId, normalizedPath) [ASYNC]
│   │   └── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:writeSnapshot(runId, normalizedPath, content) [IO]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:markEntryAvailable(projection, normalizedPath, snapshotRef) [STATE]
│   ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:saveProjection(runId, projection) [IO]
│   └── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:publishLiveUpsert(runId, normalizedPath) [ASYNC]
├── autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts:handleFileChangeUpserted(...) [STATE]
├── autobyteus-web/stores/runFileChangesStore.ts:upsertEntry(...) [STATE]
├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshResolvedContent(...)
└── autobyteus-server-ts/src/api/rest/run-file-changes.ts:getFileChangeContent(runId, path) [ENTRY]
    ├── autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts:getEntry(runId, path)
    ├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:readSnapshot(snapshotRef) [IO]
    └── autobyteus-server-ts/src/api/rest/run-file-changes.ts:sendText(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if committed content snapshot cannot be captured but failure is explicit
autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:captureCommittedContent(...)
└── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:markEntryFailed(...) [STATE]
```

```text
[ERROR] if the viewer asks for a non-existent committed snapshot
autobyteus-server-ts/src/api/rest/run-file-changes.ts:getFileChangeContent(...)
└── autobyteus-server-ts/src/api/rest/run-file-changes.ts:return404(...)
```

### State And Data Transformations

- pending edit row -> committed snapshot ref
- snapshot ref -> content response payload

### Observability And Debug Points

- Logs emitted at:
  - snapshot capture failure
  - content-route missing snapshot
- Metrics/counters updated at:
  - committed edit count
  - snapshot write count

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Snapshot policy for large/binary files remains out of current scope.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Historical Reopen Hydrates File Changes From Run Memory

### Spine Context

- Spine ID(s): `DS-002`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `RunFileChangeProjectionService`
- Why This Use Case Matters To This Spine:
  - It is the main new behavior the stopgap route could not deliver.
- Why This Spine Span Is Long Enough:
  - It starts at run reopen/hydration and ends at the reopened viewer reading persisted committed content.

### Goal

Restore file-backed rows for a historical agent run without deriving them from conversation or current filesystem paths.

### Preconditions

- Agent run has persisted file-change projection and at least one committed snapshot.

### Expected Outcome

- Reopened run hydrates the file-change list from backend projection.
- Viewer can open committed content from persisted snapshot storage.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/runHydration/runContextHydrationService.ts:loadRunContextHydrationPayload(...)
├── autobyteus-server-ts/src/api/graphql/types/run-history.ts:getRunProjection(runId) [ENTRY]
├── autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts:getRunFileChangeProjection(runId) [ENTRY]
│   └── autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts:getProjection(runId)
│       └── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:readProjection(runId) [IO]
├── autobyteus-web/services/runHydration/runFileChangeHydrationService.ts:hydrateRunFileChanges(runId, projection) [STATE]
├── autobyteus-web/stores/runFileChangesStore.ts:replaceRunProjection(runId, projection) [STATE]
├── autobyteus-web/components/workspace/agent/ArtifactsTab.vue:selectFirstAvailableFileChange(...)
└── autobyteus-server-ts/src/api/rest/run-file-changes.ts:getFileChangeContent(runId, path) [ENTRY]
```

### Branching / Fallback Paths

```text
[FALLBACK] if no persisted file-change projection exists for the run
autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts:getProjection(...)
└── return empty projection
```

```text
[ERROR] if projection exists but referenced snapshot is missing
autobyteus-server-ts/src/api/rest/run-file-changes.ts:getFileChangeContent(...)
└── autobyteus-server-ts/src/api/rest/run-file-changes.ts:return404(...)
```

### State And Data Transformations

- persisted projection JSON -> frontend file-change row list
- snapshot ref -> committed content bytes

### Observability And Debug Points

- Logs emitted at:
  - projection read failure
  - missing snapshot during historical read
- Metrics/counters updated at:
  - historical file-change projection reads

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None blocking current scope.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 Same-Path Retouch Updates One Visible Row Without Public `changeId`

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `RunFileChangeService`
- Why This Use Case Matters To This Spine:
  - It proves path-keyed identity is enough in current scope.
- Why This Spine Span Is Long Enough:
  - This bounded local flow is the relevant internal owner loop for same-path retouches.
- If `Spine Scope = Bounded Local`, Parent Owner:
  - `RunFileChangeService`

### Goal

Ensure a later touch of the same normalized path updates the existing row instead of creating a second visible row.

### Preconditions

- Projection already contains a row for the normalized path.

### Expected Outcome

- Existing row is updated in place.
- Latest effective content becomes authoritative for that row.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:handleRunEvent(runId, event) [STATE]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:normalizePath(rawPath) [STATE]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:findEntryByPath(projection, normalizedPath) [STATE]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:replaceLatestState(existingEntry, nextState) [STATE]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:saveProjection(runId, projection) [IO]
└── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:publishLiveUpsert(runId, normalizedPath) [ASYNC]
```

### Branching / Fallback Paths

```text
[ERROR] if path normalization fails
autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:normalizePath(rawPath)
└── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:ignoreInvalidPath(...)
```

### State And Data Transformations

- raw path -> normalized path
- existing row -> updated row with latest state/content ref

### Observability And Debug Points

- Logs emitted at:
  - invalid path normalization
- Metrics/counters updated at:
  - same-path retouch count

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None blocking current scope.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 Failed Or Denied File Change Stays Visible

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Return-Event`
- Governing Owner: `RunFileChangeService`
- Why This Use Case Matters To This Spine:
  - The redesign must preserve visibility for failed file changes rather than dropping rows.
- Why This Spine Span Is Long Enough:
  - It starts at terminal runtime failure and ends at the visible failed row state in the UI.

### Goal

Keep failed or denied file changes visible with terminal failed state.

### Preconditions

- A file-change row already exists or failure arrives with enough path metadata to create it.

### Expected Outcome

- Failed row remains visible with explicit failed state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:handleRunEvent(runId, event) [STATE]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:upsertEntryByPath(projection, normalizedPath, invocationId) [STATE]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:markEntryFailed(projection, normalizedPath, error) [STATE]
├── autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts:saveProjection(runId, projection) [IO]
├── autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts:handleFileChangeUpserted(...) [STATE]
└── autobyteus-web/stores/runFileChangesStore.ts:upsertEntry(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if failure arrives without usable path metadata
autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:handleRunEvent(...)
└── log and drop uncorrelatable failure
```

### State And Data Transformations

- terminal runtime failure -> explicit failed file-change row

### Observability And Debug Points

- Logs emitted at:
  - uncorrelatable failure event
- Metrics/counters updated at:
  - failed file-change count

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None blocking current scope.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
