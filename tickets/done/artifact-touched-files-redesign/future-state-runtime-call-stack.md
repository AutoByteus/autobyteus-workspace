# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-subsystem loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v4`
- Requirements: `tickets/done/artifact-touched-files-redesign/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/done/artifact-touched-files-redesign/proposed-design.md`
- Source Design Version: `v4`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-005`, `DS-006`
  - Ownership sections: `Ownership Map`, `Derived Implementation Mapping`, `Concrete Target Behavior Notes`, `Architecture-Quality Re-Entry Addendum (v4)`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.
- Every use case declares which spine(s) it exercises from the approved design basis.
- If a use case primarily validates a bounded local spine, it states that explicitly.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001, DS-003, DS-004, DS-005 | Primary End-to-End | Frontend touched-entry projection | Requirement | R-001, R-002, R-006, R-012 | N/A | `write_file` appears immediately, streams, and becomes available without losing inspectability | Yes/Yes/Yes |
| UC-002 | DS-001, DS-002, DS-003, DS-004, DS-005 | Primary End-to-End | Frontend touched-entry projection | Requirement | R-001, R-003, R-005, R-007, R-012 | N/A | `edit_file` appears immediately, refreshes without fake rediscoverability, and resolves to full file content | Yes/Yes/Yes |
| UC-003 | DS-002, DS-004, DS-005 | Return-Event | Success-authorized backend output projection + frontend artifact-event reconciliation | Requirement | R-001, R-004, R-011 | N/A | Successful generated output becomes a visible touched entry and previewable asset/file | Yes/Yes/Yes |
| UC-004 | DS-004 | Bounded Local | Artifact content viewer | Requirement | R-005, R-007 | N/A | Clicking a touched text/code row resolves and shows the current full file content | Yes/Yes/Yes |
| UC-005 | DS-003, DS-004 | Return-Event | Frontend lifecycle reconciliation | Requirement | R-008 | N/A | Failed or denied touched-file operation remains visible and inspectable | Yes/Yes/Yes |
| UC-006 | DS-001, DS-002, DS-005 | Primary End-to-End | Frontend touched-entry projection | Design-Risk | R-009, R-010 | Prove live artifact UX mounts and updates with no GraphQL/persisted-artifact dependency | Live artifact UX mounts and updates with no GraphQL/persisted-artifact dependency | Yes/Yes/N/A |
| UC-007 | DS-002, DS-005 | Bounded Local | Discoverability owner in `agentArtifactsStore.ts` | Design-Risk | R-012 | Prove refresh-only artifact updates do not retrigger discoverability for an existing row | Refresh-only artifact updates do not steal focus or reselect | Yes/Yes/N/A |
| UC-008 | DS-002 | Return-Event | Success-authorized backend output projection | Design-Risk | R-004 | Prove denied/failed output-tool results cannot emit availability-shaped artifact events | Failed generated-output tool results do not create touched rows | Yes/Yes/N/A |
| UC-009 | DS-006 | Primary End-to-End | Shared streaming conversation projection boundary | Design-Risk | R-001 | Prove all streaming handlers use one authoritative conversation/segment projection boundary instead of mixing handler exports with lower-level projection internals | Shared handlers mutate conversation state through one authoritative projection boundary | Yes/Yes/N/A |

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - Keep websocket wire-event names `ARTIFACT_UPDATED` and `ARTIFACT_PERSISTED` during this ticket, but reinterpret them as live touched-file signals rather than DB-persistence confirmations.
  - Narrow runtime semantics explicitly:
    - `ARTIFACT_UPDATED` = freshness/metadata only; it must not claim success by itself.
    - `ARTIFACT_PERSISTED` = success-authorized availability for a file/output path.
  - Tighten the caller-facing store boundary so handlers call explicit domain operations (`refresh...`, `markAvailable...`, `ensureTerminalStateFromLifecycle...`) instead of one generic artifact-event upsert API.
  - Introduce one explicit streaming conversation projection boundary so handlers never mix `segmentHandler.ts` exports with lower-level segment-construction/identity internals.
  - Rename the backend processor from `AgentArtifactPersistenceProcessor` to `AgentArtifactEventProcessor` while preserving its registration position in the tool-result processor chain.
- Retirement plan for temporary logic (if any):
  - No DB-backed artifact read/write logic remains after this ticket.
  - Any future naming cleanup from `artifact` to `touched-file` is a separate semantic refactor and not required for this runtime shape.

## Use Case: UC-001 `write_file` appears immediately, streams, and becomes available without losing inspectability

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`, `DS-004`, `DS-005`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `segmentHandler.ts` + `agentArtifactsStore.ts`
- Why This Use Case Matters To This Spine:
  - This is the strongest current UX path and must remain intact while the projection semantics are simplified.

### Goal

A `write_file` operation should create a touched-entry row as soon as the path is known, stream text into that row, remain visible while pending, and become available from the actual workspace file after success.

### Preconditions

- Active agent run is subscribed to websocket events.
- Runtime emits `SEGMENT_START`, zero or more `SEGMENT_CONTENT`, and `SEGMENT_END` for `write_file`.
- Tool lifecycle success/failure messages still flow through the live stream.

### Expected Outcome

- One touched row keyed by `runId:path` exists as soon as streaming starts.
- The row streams content live while status is `streaming`.
- After stream end, the row remains visible as `pending`.
- After success and/or availability event, the row becomes `available` and the viewer can resolve the current workspace file content.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
├── autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentStart(payload, context)
│   └── autobyteus-web/stores/agentArtifactsStore.ts:upsertTouchedEntryFromSegmentStart(runId, { invocationId, path, sourceTool: 'write_file', status: 'streaming' }) [STATE]
│       └── autobyteus-web/stores/agentArtifactsStore.ts:announceLatestVisibleEntry(runId, entryId) [STATE]
├── autobyteus-web/components/layout/RightSideTabs.vue:handleLatestVisibleTouchedEntryChange(runId, entryId) [STATE]
└── autobyteus-web/components/workspace/agent/ArtifactsTab.vue:handleLatestVisibleTouchedEntryChange(runId, entryId) [STATE]

[ASYNC] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentContent(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:appendTouchedEntryStreamContent(runId, invocationId, delta) [STATE]

[ASYNC] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentEnd(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryPending(runId, invocationId) [STATE]

[ASYNC] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionSucceeded(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryAvailableByInvocation(runId, invocationId) [STATE]

[ASYNC] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactPersisted(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryAvailableFromArtifactPersisted(runId, { path, type: 'file', workspaceRoot }) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] workspace path not yet resolvable after success
autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshSelectedArtifactContent()
├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:resolveArtifactContentEndpoint() [STATE]
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:useBufferedWriteContent() [STATE]
```

```text
[ERROR] tool execution fails or is denied before availability
autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionFailed(payload, context)
└── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryFailedByInvocation(runId, invocationId) [STATE]
```

### State And Data Transformations

- Segment metadata `{ path, invocationId }` -> deterministic touched-entry identity `runId:path`
- Stream delta chunks -> in-memory buffered content for the active write row
- Tool success + artifact availability metadata -> row status `available` + `workspaceRoot`
- Buffered stream content -> fallback viewer content until file-backed content is available

### Observability And Debug Points

- Logs emitted at:
  - `AgentStreamingService.ts:logMessage(message)` for segment lifecycle
  - backend runtime event debug logging if enabled in `agent-stream-handler.ts`
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None blocking for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 `edit_file` appears immediately and refreshes to full file content without diff rendering

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-005`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `segmentHandler.ts` + `artifactHandler.ts` + `toolLifecycleHandler.ts`
- Why This Use Case Matters To This Spine:
  - This is the main UX gap the ticket is fixing: the touched row must exist before the later runtime update event arrives, and repeated update events must not pretend the row is newly visible each time.

### Goal

An `edit_file` operation should create a visible touched row immediately from the segment metadata, stay inspectable without diff rendering, refresh as runtime update events arrive, and resolve to the current full file content without refresh-only updates retriggering discoverability.

### Preconditions

- Runtime emits `SEGMENT_START` for `edit_file` with a path.
- Runtime may emit one or more `ARTIFACT_UPDATED` events during or after the edit.
- Runtime emits either a tool-success lifecycle event or a final `ARTIFACT_PERSISTED` equivalent for update completion.

### Expected Outcome

- `edit_file` row is visible immediately as `pending`.
- Clicking the row before success may show pre-edit or in-progress workspace content; this is acceptable while status stays `pending`.
- `ARTIFACT_UPDATED` refreshes row metadata but does not emit a second discoverability event for the same row.
- After lifecycle success or persisted completion, the row becomes `available` and the viewer shows the latest full file content.
- No diff-only rendering is required inside the artifact panel.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
├── autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentStart(payload, context)
│   └── autobyteus-web/stores/agentArtifactsStore.ts:upsertTouchedEntryFromSegmentStart(runId, { invocationId, path, sourceTool: 'edit_file' }) [STATE]
│       └── autobyteus-web/stores/agentArtifactsStore.ts:announceLatestVisibleArtifact(runId, entryId) [STATE]
├── autobyteus-web/components/layout/RightSideTabs.vue:watch(latestVisibleArtifactSignal) [STATE]
└── autobyteus-web/components/workspace/agent/ArtifactsTab.vue:watch(latestVisibleArtifactSignal) [STATE]

[ASYNC] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactUpdated(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:refreshTouchedEntryFromArtifactUpdate(runId, { path, workspaceRoot, type }) [STATE]

[ASYNC] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionSucceeded(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryAvailableByInvocation(runId, invocationId) [STATE]

[ASYNC] autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshSelectedArtifactContent()
├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:resolveArtifactContentEndpoint() [STATE]
└── fetch(workspaceContentUrl, { cache: 'no-store' }) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] native runtime completion arrives as `ARTIFACT_PERSISTED` before or instead of lifecycle success
autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactPersisted(payload, context)
└── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryAvailableFromArtifactPersisted(runId, { path, workspaceRoot, type }) [STATE]
```

```text
[FALLBACK] user clicks the row before the file content has changed on disk
autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshSelectedArtifactContent()
├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:resolveArtifactContentEndpoint() [STATE]
└── fetch(currentWorkspaceFileUrl, { cache: 'no-store' }) [IO]  # returns pre-edit/in-progress content while row remains `pending`
```

```text
[ERROR] edit is denied or fails after the row was created
autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolDenied(payload, context)
└── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryFailedByInvocation(runId, invocationId) [STATE]
```

### State And Data Transformations

- Segment metadata `{ path, invocationId }` -> touched-entry identity and `pending` state
- Runtime `ARTIFACT_UPDATED` payload -> row freshness (`updatedAt`), type, `workspaceRoot` without discoverability replay
- Tool success or persisted completion -> row lifecycle transition from `pending` to `available`
- Workspace file bytes -> full content shown in viewer

### Observability And Debug Points

- Logs emitted at:
  - `AgentStreamingService.ts:logMessage(message)` for `SEGMENT_START` and `ARTIFACT_UPDATED`
  - activity logs already routed by `toolLifecycleHandler.ts`
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None blocking for the target design.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Generated output path becomes a visible touched entry and previewable asset/file

### Spine Context

- Spine ID(s): `DS-002`, `DS-004`, `DS-005`
- Spine Scope: `Return-Event`
- Governing Owner: `AgentArtifactEventProcessor` + `artifactHandler.ts`
- Why This Use Case Matters To This Spine:
  - Generated image/video/audio/pdf/csv/excel outputs do not have an early segment-stream projection path and therefore rely on the backend event projection spine.

### Goal

When a tool result successfully resolves an output path/URL, the backend should emit a live artifact event and the frontend should create a touched row that users can click to preview immediately.

### Preconditions

- Tool result has succeeded; `event.error` is empty and `event.isDenied` is false.
- Tool result processor can infer an output path and optional output URL from the tool result.
- Websocket runtime stream is connected.

### Expected Outcome

- Backend emits a live `ARTIFACT_PERSISTED` payload only after tool-result success is confirmed.
- Frontend creates an `available` touched row for the output.
- The right panel can switch to `Artifacts`, and the user can preview the file or asset.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:handle(event, context) [ASYNC]
├── autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts:process(event, context) [ASYNC]
│   ├── event.isDenied / event.error check [STATE]
│   ├── autobyteus-server-ts/src/utils/artifact-utils.ts:extractCandidateOutputPath(toolArgs, result) [STATE]
│   ├── autobyteus-server-ts/src/utils/artifact-utils.ts:inferArtifactType(outputPath) [STATE]
│   └── autobyteus-ts/src/agent/events/notifiers.ts:notifyAgentArtifactPersisted({ path, type, url, workspace_root, agent_id }) [ASYNC]
├── autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts:map(event) [STATE]
└── autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:forwardRunEvent(connection, runId, event) [ASYNC]
    └── autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
        └── autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactPersisted(payload, context)
            └── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryAvailableFromArtifactPersisted(runId, { path, type, url, workspaceRoot, sourceTool: 'generated_output' }) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] output URL is absent but the output path is valid
autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactPersisted(payload, context)
└── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryAvailableFromArtifactPersisted(runId, { path, type, workspaceRoot }) [STATE]
```

```text
[ERROR] processor cannot infer a path/type from the successful tool result
autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts:process(event, context)
└── return event  # no touched-row creation; result remains visible only in progress/activity UI
```

### State And Data Transformations

- Successful tool result payload -> inferred output path + artifact type + optional URL
- Persisted runtime event payload -> touched-entry row in `available` state
- URL or workspace path -> preview source for `FileViewer`

### Observability And Debug Points

- Logs emitted at:
  - backend tool-result event processor debug/info logs
  - `agent-stream-handler.ts:forwardRunEvent(...)` runtime debug logs when enabled
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None blocking for the target design.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 Clicking a touched text/code row resolves and shows the current full file content

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Bounded Local`
- Governing Owner: `ArtifactContentViewer.vue`
- Why This Use Case Matters To This Spine:
  - The user’s explicit product requirement is about what appears in the viewer after clicking a touched file, not about backend storage.

### Goal

Whenever a user selects a text/code touched row, the artifact viewer should show the current full file content unless the row is an actively streaming `write_file`, in which case the stream buffer remains the temporary source.

### Preconditions

- A touched row is already visible and selected.
- Viewer can determine file type.
- Viewer can resolve either a workspace content URL or an in-memory stream buffer.

### Expected Outcome

- Text/code rows display full current file content.
- Active streaming writes temporarily display buffered content.
- Deleted files show a file-not-found state.
- Missing endpoint resolution falls back gracefully without calling any GraphQL artifact query.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/agent/ArtifactsTab.vue:selectArtifact(entry) [STATE]
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshSelectedArtifactContent() [ASYNC]
    ├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:updateFileType(entry.path) [STATE]
    ├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:resolveArtifactContentEndpoint(entry) [STATE]
    ├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:shouldUseBufferedWriteContent(entry) [STATE]
    └── fetch(workspaceContentUrl, { cache: 'no-store' }) [IO]
        └── autobyteus-web/components/fileExplorer/FileViewer.vue:render(file) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] selected row is an active streaming write
autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshSelectedArtifactContent()
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:useBufferedWriteContent() [STATE]
```

```text
[ERROR] workspace file no longer exists
fetch(workspaceContentUrl, { cache: 'no-store' }) [IO]
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:markDeletedState() [STATE]
```

### State And Data Transformations

- Selected touched row -> file-type classification
- Workspace path -> REST content endpoint
- REST response text -> `FileViewer` text payload
- 404 response -> deleted-file UI state

### Observability And Debug Points

- Logs emitted at:
  - browser console on fetch failure/error handling
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None blocking for this bounded local spine.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 Failed or denied touched-file operation remains visible and inspectable

### Spine Context

- Spine ID(s): `DS-003`, `DS-004`
- Spine Scope: `Return-Event`
- Governing Owner: `toolLifecycleHandler.ts`
- Why This Use Case Matters To This Spine:
  - Failure visibility is currently incomplete and must be deliberate in the future state rather than an accidental byproduct of pending-write logic.

### Goal

If a touched-file operation that already has a visible row is denied or fails, that row should remain visible with failed status and still be inspectable.

### Preconditions

- A touched row already exists from `SEGMENT_START` or a prior artifact event.
- Runtime emits either `TOOL_DENIED` or `TOOL_EXECUTION_FAILED` with the relevant invocation ID.

### Expected Outcome

- The row status becomes `failed`.
- The row stays in the touched-file list.
- The viewer still resolves either buffered attempted content (`write_file`) or current workspace file content (`edit_file`).

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolDenied(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryFailedByInvocation(runId, invocationId) [STATE]

[ASYNC] autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshSelectedArtifactContent()
├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:shouldUseBufferedWriteContent(entry) [STATE]
└── fetch(workspaceContentUrl, { cache: 'no-store' }) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] failure event arrives for a tool that never created a touched row
autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionFailed(payload, context)
└── autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:syncTouchedEntryTerminalStatus(context, invocationId, segment, 'failed')
    └── autobyteus-web/stores/agentArtifactsStore.ts:ensureTouchedEntryTerminalStateFromLifecycle(runId, { path, sourceTool, status: 'failed' }) [STATE]
```

```text
[ERROR] selected failed row points to a deleted file path
fetch(workspaceContentUrl, { cache: 'no-store' }) [IO]
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:markDeletedState() [STATE]
```

### State And Data Transformations

- Invocation ID -> touched-row lookup via stored `sourceInvocationId`
- Lifecycle failure/deny payload -> row status `failed`
- Failed row + source tool -> viewer chooses buffer or workspace fetch path

### Observability And Debug Points

- Logs emitted at:
  - lifecycle parser/handler warnings for malformed payloads
  - browser console on content-resolution failure
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None blocking for the target design.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 Live artifact UX mounts and updates with no GraphQL/persisted-artifact dependency

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`, `DS-005`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agentArtifactsStore.ts`
- Why This Use Case Matters To This Spine:
  - The ticket intentionally removes the backend persistence/query path, so the runtime model must explicitly show that live UX is store-and-stream driven.

### Goal

The artifact panel should mount from live store state only and remain empty until runtime messages create touched rows. No GraphQL artifact fetch should be part of the active-run call path.

### Preconditions

- User opens the right-side `Artifacts` tab during an active run.
- No historical restore behavior is in scope.

### Expected Outcome

- The panel reads touched rows from the live store only.
- When no rows exist yet, the empty state remains visible.
- Future runtime segment/event messages populate the panel without any persisted-artifact query.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/layout/RightSideTabs.vue:renderArtifactsTab() [STATE]
└── autobyteus-web/components/workspace/agent/ArtifactsTab.vue:setup()
    ├── autobyteus-web/stores/activeContextStore.ts:getActiveAgentContext() [STATE]
    ├── autobyteus-web/stores/agentArtifactsStore.ts:getArtifactsForRun(runId) [STATE]
    ├── autobyteus-web/stores/agentArtifactsStore.ts:getLatestVisibleArtifactIdForRun(runId) [STATE]
    └── autobyteus-web/components/workspace/agent/ArtifactList.vue:render() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] no touched rows exist yet
autobyteus-web/components/workspace/agent/ArtifactList.vue:renderEmptyState() [STATE]
```

### State And Data Transformations

- Active run context -> run-scoped store lookup
- Store rows -> grouped list presentation
- No persisted metadata hydration path exists in the runtime model

### Observability And Debug Points

- Logs emitted at:
  - none required in primary flow
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None; the deliberate answer is removal of the GraphQL/persistence path from live UX.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-007 Refresh-only artifact updates do not steal focus or reselect

### Spine Context

- Spine ID(s): `DS-002`, `DS-005`
- Spine Scope: `Bounded Local`
- Governing Owner: `agentArtifactsStore.ts`
- Why This Use Case Matters To This Spine:
  - Stage 8 round 5 found that refresh-only artifact updates were still being treated like first-visibility discoverability events.

### Goal

When a row already exists, repeated `ARTIFACT_UPDATED` events should refresh metadata only. They must not cause the right panel to auto-switch again or the artifact tab to re-select the row as if it were newly visible.

### Preconditions

- A touched row already exists and has already emitted its initial discoverability signal.
- Runtime emits one or more `ARTIFACT_UPDATED` events for the same path.

### Expected Outcome

- The row metadata refreshes.
- No second discoverability signal is emitted for the same refresh-only event.
- `RightSideTabs.vue` and `ArtifactsTab.vue` stay stable unless a genuinely new row becomes visible or an explicit new segment-start re-touches the path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactUpdated(payload, context)
    └── autobyteus-web/stores/agentArtifactsStore.ts:refreshTouchedEntryFromArtifactUpdate(runId, { path, workspaceRoot, type }) [STATE]
        └── # no discoverability announcement for an existing row
```

### Branching / Fallback Paths

```text
[FALLBACK] `ARTIFACT_UPDATED` arrives before any row exists for the path
autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactUpdated(payload, context)
└── autobyteus-web/stores/agentArtifactsStore.ts:refreshTouchedEntryFromArtifactUpdate(runId, { path, workspaceRoot, type }) [STATE]  # creates a pending row only if it did not already exist
```

### State And Data Transformations

- Existing row + runtime update payload -> refreshed metadata without discoverability replay
- Missing row + runtime update payload -> first visible `pending` row plus one discoverability signal

### Observability And Debug Points

- Logs emitted at:
  - `AgentStreamingService.ts:logMessage(message)` for repeated update events
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None blocking for the target design.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-008 Failed generated-output tool results do not create touched rows

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Return-Event`
- Governing Owner: `AgentArtifactEventProcessor`
- Why This Use Case Matters To This Spine:
  - Stage 8 round 5 found that output-path extraction was still able to bypass real success ownership and emit availability-shaped artifact events for failed results.

### Goal

A denied or failed generated-output tool result must not emit an availability-shaped artifact event and must not create a touched row in the artifact panel.

### Preconditions

- Tool result is terminal and indicates denial or failure (`event.isDenied` or `event.error`).
- No earlier segment-start touched row exists for that generated-output tool.

### Expected Outcome

- Backend emits no `ARTIFACT_PERSISTED` / availability-shaped artifact event.
- Frontend creates no touched row for the failed generated output.
- Failure remains visible in progress/activity UI only.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:handle(event, context) [ASYNC]
└── autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts:process(event, context) [ASYNC]
    ├── event.isDenied / event.error check [STATE]
    └── return event  # no notifier call, no artifact event emitted
```

### Branching / Fallback Paths

```text
[FALLBACK] failed result belongs to `write_file` / `edit_file`, which already created a row from segment start
autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolExecutionFailed(payload, context)
└── autobyteus-web/stores/agentArtifactsStore.ts:markTouchedEntryFailedByInvocation(runId, invocationId) [STATE]
```

### State And Data Transformations

- Failed/denied tool result -> no output-availability event emission
- File-tool failure with existing row -> lifecycle failure state update only

### Observability And Debug Points

- Logs emitted at:
  - backend tool-result event processor debug logging when a result is skipped for failure/deny
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No`

### Open Questions

- None blocking for the target design.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`


## Use Case: UC-009 Shared streaming handlers use one authoritative conversation projection boundary

### Spine Context

- Spine ID(s): `DS-006`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-web/services/agentStreaming/streamConversationProjection.ts`
- Why This Use Case Matters To This Spine:
  - This is the architecture-quality follow-up discovered after the milestone commit. The shared streaming subsystem needs one explicit owner for conversation message/segment projection so handlers stop mixing `segmentHandler.ts` exports with lower-level projection internals.

### Goal

Any streaming handler that needs to read or mutate `AgentContext.conversation.messages` should do so through one authoritative boundary. Synthetic tool lifecycle segment creation, active AI-message creation, segment lookup, append/remove mutation, and segment identity wiring must be encapsulated beneath that owner.

### Preconditions

- A websocket event arrives that requires segment/message projection work.
- The handler knows its domain intent (for example: ensure a tool lifecycle segment exists, append an error segment, or append a team/system notification segment).
- The new `streamConversationProjection.ts` boundary exists and is the only handler-facing API for shared conversation projection.

### Expected Outcome

- `segmentHandler.ts` remains a concrete `SEGMENT_*` handler and no longer exports the shared projection owner.
- `toolLifecycleHandler.ts` ensures or looks up segments only through `streamConversationProjection.ts` and does not directly call `createSegmentFromPayload(...)`, `setStreamSegmentIdentity(...)`, or direct `aiMessage.segments.push(...)`.
- `agentStatusHandler.ts` and `teamHandler.ts` append message segments through the same projection boundary.
- Internal projection mechanics can change without changing the higher-level handlers.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleToolApprovalRequested(payload, context)
    └── autobyteus-web/services/agentStreaming/streamConversationProjection.ts:ensureToolLifecycleSegment(context, { invocationId, toolName, argumentsPayload }) [STATE]
        ├── autobyteus-web/services/agentStreaming/streamConversationProjection.ts:findProjectedSegmentByInvocationAlias(context, invocationId) [STATE]
        ├── autobyteus-web/services/agentStreaming/streamConversationProjection.ts:getOrCreateActiveAIMessage(context) [STATE]
        ├── autobyteus-web/services/agentStreaming/protocol/segmentTypes.ts:createSegmentFromPayload(payload) [STATE]  # internal to the projection owner
        ├── autobyteus-web/services/agentStreaming/streamConversationProjection.ts:assignProjectionIdentity(segment, invocationId, segmentType) [STATE]
        └── autobyteus-web/services/agentStreaming/streamConversationProjection.ts:appendProjectedSegment(aiMessage, segment) [STATE]
```

```text
[ENTRY] autobyteus-web/services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
└── autobyteus-web/services/agentStreaming/handlers/teamHandler.ts:handleInterAgentMessage(payload, context)
    └── autobyteus-web/services/agentStreaming/streamConversationProjection.ts:appendMessageSegment(context, interAgentMessageSegment) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] matching tool lifecycle segment already exists
autobyteus-web/services/agentStreaming/streamConversationProjection.ts:ensureToolLifecycleSegment(context, request)
└── autobyteus-web/services/agentStreaming/streamConversationProjection.ts:returnExistingProjectedSegment(segment) [STATE]
```

```text
[ERROR] malformed event payload means no projection work should occur
relevant-handler.ts:handle*(payload, context)
└── relevant-handler.ts:warnInvalidPayload(...) [STATE]
```

### State And Data Transformations

- handler-local intent -> projection-boundary request shape
- invocation id / segment type -> projected segment identity
- direct array mutation -> projection-owner internal mechanism
- shared context conversation state -> one authoritative mutation boundary

### Observability And Debug Points

- Logs emitted at:
  - existing handler warning paths for malformed payloads
  - optional projection-boundary debug logging if later introduced
- Metrics/counters updated at:
  - none currently modeled in scope
- Tracing spans (if any):
  - none currently modeled in scope

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`)
  - `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`)
  - `No`
- Any naming-to-responsibility drift detected? (`Yes/No`)
  - `No` once the projection boundary is explicit and `segmentHandler.ts` stops acting as a shared projection API.

### Open Questions

- Whether invocation-alias normalization should be extracted into its own reusable owned file during the same refactor or left as a follow-up after the boundary split.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
