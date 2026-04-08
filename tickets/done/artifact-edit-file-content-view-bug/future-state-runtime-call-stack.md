# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/artifact-edit-file-content-view-bug/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/in-progress/artifact-edit-file-content-view-bug/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `Solution Sketch`, `Spine-Led Dependency And Sequencing Map`
  - Ownership sections: `File Placement Plan`, `Implementation Work Table`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `ArtifactContentViewer` | Requirement | R-001 | N/A | Click edited-file row and render file content | Yes/Yes/Yes |
| UC-002 | DS-001 | Primary End-to-End | `ArtifactContentViewer` | Requirement | R-002 | N/A | Use workspace-backed fetch as source of truth for edited file | Yes/No/Yes |
| UC-003 | DS-002 | Primary End-to-End | `segmentHandler` | Requirement | R-003 | N/A | Preserve streamed write-file preview | Yes/No/Yes |
| UC-004 | DS-003 | Bounded Local | `ArtifactContentViewer` | Design-Risk | R-004 | Selected artifact becomes fetchable after late metadata enrichment | Auto-refresh after success-time enrichment | Yes/N/A/Yes |
| UC-005 | DS-003 | Bounded Local | `ArtifactsTab` | Requirement | R-005 | N/A | Same-row click retries content resolution | Yes/N/A/Yes |

## Transition Notes

- No backend contract change is required for this scoped fix.
- The target state preserves current artifact visibility semantics and repairs the selected-viewer refresh contract.

## Use Case: UC-001 Click edited-file row and render file content

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `ArtifactContentViewer`
- Why This Use Case Matters To This Spine: it is the direct user-visible failure being fixed.
- Why This Spine Span Is Long Enough: it covers the initiating click/selection surface, the authoritative touched-entry selection state, the viewer’s content-resolution boundary, and the downstream file-render result.

### Goal

Render current file content instead of an empty pane when the user selects an `edit_file` artifact row.

### Preconditions

- The artifact row exists in the run’s touched-entry list.
- The row path points to a readable file in the active workspace.

### Expected Outcome

- The viewer resolves the workspace content URL and renders the current file bytes as text/preview content.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/agent/ArtifactList.vue:@select(artifact)
└── autobyteus-web/components/workspace/agent/ArtifactsTab.vue:selectArtifact(artifact) [STATE]
    └── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:watch(selectedArtifactInputs) [STATE]
        └── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshResolvedContent() [ASYNC]
            ├── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:artifactUrl(computed) [STATE]
            ├── fetch(/workspaces/:workspaceId/content?path=...) [IO]
            └── autobyteus-web/components/fileExplorer/FileViewer.vue:render(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the selected edited-file row is not yet workspace-resolvable
autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshResolvedContent()
└── wait for later selectedArtifactInputs change or retry signal before next fetch attempt
```

```text
[ERROR] if workspace fetch returns 404 or non-200
fetch(/workspaces/:workspaceId/content?path=...) [IO]
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:setDeletedOrErrorState(...) [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Use workspace-backed fetch as source of truth for edited file

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `ArtifactContentViewer`
- Why This Use Case Matters To This Spine: it preserves the product rule that `edit_file` content comes from the workspace endpoint, not diff payloads.
- Why This Spine Span Is Long Enough: it spans the selected artifact inputs, workspace resolution boundary, and final rendered content boundary.

### Goal

Ensure `edit_file` content resolution prefers workspace fetch whenever possible.

### Preconditions

- Selected artifact is `edit_file`.
- Viewer can derive a workspace id and relative content path.

### Expected Outcome

- The viewer fetches workspace content instead of showing diff/patch payloads or stale empty fallback content.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:watch(selectedArtifactInputs) [STATE]
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:artifactUrl(computed) [STATE]
    ├── autobyteus-web/stores/agentContextsStore.ts:getRun(runId) [STATE]
    ├── autobyteus-web/stores/workspace.ts:workspaces[workspaceId] [STATE]
    └── fetch(/workspaces/:workspaceId/content?path=...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if no resolvable workspace path exists
autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:artifactUrl(computed)
└── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:deferToNextRefreshOrRetry() [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Preserve streamed write-file preview

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `segmentHandler`
- Why This Use Case Matters To This Spine: the bug fix must not regress the current streamed `write_file` experience.
- Why This Spine Span Is Long Enough: it spans segment ingress, store buffering, viewer selection, and final render behavior.

### Goal

Keep buffered `write_file` streaming preview working while the viewer changes for edited-file refresh.

### Preconditions

- The selected artifact is a `write_file` entry still buffering streamed content.

### Expected Outcome

- The viewer continues to use buffered content and avoids unnecessary workspace fetch.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentStart(write_file)
└── autobyteus-web/stores/agentArtifactsStore.ts:upsertTouchedEntryFromSegmentStart(...) [STATE]
    └── autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentContent(write_file)
        └── autobyteus-web/stores/agentArtifactsStore.ts:appendArtifactContent(...) [STATE]
            └── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:displayContent(computed) [STATE]
                └── autobyteus-web/components/fileExplorer/FileViewer.vue:render(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if viewer refresh logic mistakenly treats streaming write_file as workspace-fetchable
autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:usesBufferedWriteContent(computed)
└── guard keeps buffered content path authoritative
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Auto-refresh after success-time enrichment

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `ArtifactContentViewer`
- Why This Use Case Matters To This Spine: it addresses the exact stale-selected-row defect identified in investigation.
- Why This Spine Span Is Long Enough: as a bounded local spine, it covers the selected viewer owner from artifact-field change to refetch.
- If `Spine Scope = Bounded Local`, Parent Owner: `ArtifactContentViewer`

### Goal

Refetch content automatically when the selected artifact becomes fetchable after late status/workspace metadata enrichment.

### Preconditions

- The edited-file row is already selected.
- The selected artifact object may be mutated in place by the store.

### Expected Outcome

- The viewer reruns content resolution when selected-artifact fetchability inputs change.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts:handleArtifactUpdated(...) [STATE]
└── autobyteus-web/stores/agentArtifactsStore.ts:refreshTouchedEntryFromArtifactUpdate(...) [STATE]
    └── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:watch(selectedArtifactInputs) [STATE]
        └── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshResolvedContent() [ASYNC]
            └── fetch(/workspaces/:workspaceId/content?path=...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if enrichment still does not produce a resolvable URL
autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshResolvedContent()
└── keep unresolved state until next enrichment or retry click
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 Same-row click retries content resolution

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `ArtifactsTab`
- Why This Use Case Matters To This Spine: it gives the user an explicit retry path without introducing a separate reload control.
- Why This Spine Span Is Long Enough: as a bounded local spine, it covers the selection owner from same-row click to retry signal handoff.
- If `Spine Scope = Bounded Local`, Parent Owner: `ArtifactsTab`

### Goal

Allow clicking the same artifact row to trigger a fresh content-resolution attempt.

### Preconditions

- The user clicks an artifact row that is already selected.

### Expected Outcome

- The viewer receives a new retry signal and reruns content resolution.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/agent/ArtifactList.vue:@select(artifact)
└── autobyteus-web/components/workspace/agent/ArtifactsTab.vue:selectArtifact(artifact) [STATE]
    └── autobyteus-web/components/workspace/agent/ArtifactsTab.vue:incrementViewerRefreshSignal() [STATE]
        └── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:watch(selectedArtifactInputs) [STATE]
            └── autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:refreshResolvedContent() [ASYNC]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
