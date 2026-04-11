# Implementation Plan — Unified Artifacts Current-Filesystem Model

## Preconditions

- Requirements status: `Design-ready`
- User approval status: `Approved on 2026-04-11`
- Architect review status: `Round-1 design impacts resolved`
- API/E2E re-entry status: `Requirement-gap correction applied after round 2`
- Scope: unify artifact/file-change ownership for the Artifacts area while preserving live `write_file` streaming UX

## Rework Summary

This revision keeps the previously approved unification direction and incorporates two later upstream corrections:

1. **Architect review round 1** preserved and now-resolved:
   - `DI-001` — canonical effective-path identity
   - `DI-002` — generated-output discovery when success events omit arguments
2. **API/E2E validation round 2** requirement-gap correction:
   - no legacy compatibility may remain for `run-file-changes/projection.json`
   - `file_changes.json` is now the only supported persisted source for this feature
   - old runs stored only in the removed legacy path are intentionally unsupported unless migrated out of band
3. **Code review round 1** confirmed the same upstream gap under finding `RQ-001` and requires implementation re-entry plus renewed API/E2E validation after fallback removal.

## Approved Direction

Keep **Artifacts** as the user-facing label, but make the underlying implementation one unified run-scoped touched-file/output model owned by the existing `run-file-changes` subsystem for this iteration.

The primary semantic changes are:

1. **Current filesystem becomes the source of truth** for viewed content.
2. **Persisted run memory becomes metadata-only** via `<run-memory-dir>/file_changes.json`.
3. **Generated media/document outputs join the same model** as `write_file` and `edit_file`.
4. **Artifact-area dependence on `ARTIFACT_*` events and copied media URLs is removed.**
5. **Live `write_file` buffering stays transient** for in-progress UX only.
6. **Canonical path identity collapses workspace-relative and workspace-internal absolute references to one row.**
7. **Generated-output discovery is owned by the unified service through invocation-context retention.**
8. **No production fallback remains for `run-file-changes/projection.json`.**

This ticket intentionally prioritizes semantic unification over class/file renaming churn. Existing service/store class names such as `RunFileChangeService` and `runFileChangesStore` may stay for now even though their ownership broadens.

## Preserved Architect Findings And Resolution

### `DI-001` — Canonical effective-path identity
**Resolution:** `RunFileChangeEntry.path` becomes the canonical effective-path identity, not the raw observed string.

Canonicalization rule:
1. normalize slashes and trim the observed path;
2. if the path resolves inside the run workspace root, persist/display it as a workspace-relative POSIX path;
3. if the path is absolute and resolves outside the workspace root, persist/display it as a normalized absolute POSIX path;
4. if no workspace root exists and the path is relative, preserve the normalized relative string as a best-effort fallback.

This canonicalization is applied consistently in:
- live row upsert
- generated-output row upsert
- persisted write path
- historical projection read normalization
- GraphQL hydration
- REST route lookup
- frontend row identity (`runId:path`) and selection

Concrete examples with workspace root `/repo`:
- observed `src/app.ts` -> canonical `src/app.ts`
- observed `/repo/src/app.ts` -> canonical `src/app.ts`
- observed `/repo/./src/../src/app.ts` -> canonical `src/app.ts`
- observed `/tmp/output.png` -> canonical `/tmp/output.png`

### `DI-002` — Generated-output discovery when success events omit arguments
**Resolution:** the unified owner uses invocation-scoped tool context captured at `TOOL_EXECUTION_STARTED` and retained until completion.

Mechanism:
- on `TOOL_EXECUTION_STARTED`, capture `invocation_id`, `tool_name`, and sanitized tool arguments for **all** tools, not just `write_file` / `edit_file`;
- on `TOOL_EXECUTION_SUCCEEDED`, generated-output discovery uses this precedence:
  1. output path extracted from success `result`
  2. output path extracted from cached start arguments by `invocation_id`
  3. output path extracted from success `arguments` if present
- on `TOOL_EXECUTION_FAILED`, `TOOL_DENIED`, success handling, or run detach, clear the cached invocation context.

This avoids requiring a broader runtime event-shape change and matches the current Codex/Claude reality where start events carry arguments more reliably than success events.

Concrete example:
- start event: `generate_image`, `invocation_id=i-1`, `arguments={ output_file_path: "images/cute-otter.png" }`
- success event: `generate_image`, `invocation_id=i-1`, `result={ success: true }`
- unified owner looks up cached start context, recovers `images/cute-otter.png`, canonicalizes it, and emits one `FILE_CHANGE_UPDATED` row with `type=image`.

## API/E2E Requirement-Gap Correction

### Clean-cut storage rule
- `file_changes.json` is the only supported persisted storage file for this feature.
- Production code must not read, hydrate from, or serve compatibility behavior for `run-file-changes/projection.json`.
- Historical runs stored only in the removed legacy path are intentionally unsupported after this redesign.

### Consequences
- Previous legacy fallback design language is superseded.
- Previous positive validation scenarios for legacy fallback must be removed or inverted to assert unsupported behavior.
- Any implementation handoff language that retained legacy compatibility is now stale.

## Architecture Decisions

### AD-001 — Canonical persisted storage file
- Canonical file: `<run-memory-dir>/file_changes.json`
- Persisted contents: metadata/index only
- Persisted `content` snapshots: removed
- No production fallback read or compatibility behavior for `run-file-changes/projection.json`

### AD-002 — Canonical backend owner
- Continue to use `RunFileChangeService` as the single live owner for Artifacts-area rows in this iteration.
- Broaden its domain from text-only file changes to all run-scoped touched/output files.
- Remove dependence on separate artifact processors/events for generated outputs.

### AD-003 — Canonical live event family
- Keep `FILE_CHANGE_UPDATED` as the live WebSocket message name for this ticket.
- Broaden its payload semantics to include generated outputs.
- `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` are deprecated for the Artifacts area and should no longer be required by the frontend or the unified backend owner.

### AD-004 — Canonical content-serving boundary
- Reuse the run-scoped REST boundary for content resolution.
- Canonical behavior: stream the **current file bytes** for any indexed touched/output file.
- Text viewers fetch text from this route; media/document viewers use the same route as a URL.
- The route must resolve:
  - workspace-relative canonical paths against the run’s workspace root
  - absolute canonical paths exactly as indexed by the run metadata
- The route must authorize access by first requiring that `runId + canonicalPath` exists in the run-scoped index.

### AD-005 — Streaming semantics
- `write_file` keeps transient in-memory delta buffering for live preview.
- Buffered text remains optional/transient on live payloads only.
- Buffered text is not written to `file_changes.json`.
- After the file exists, the viewer should prefer the current file-serving route.

### AD-006 — Media/document handling
- Generated `image` / `audio` / `video` / `pdf` / `csv` / `excel` outputs are just typed touched/output files.
- The artifact-area path should no longer copy them into app media storage to create preview URLs.
- Assistant-message media segment handling via `MediaUrlTransformerProcessor` remains unchanged.

### AD-007 — Canonical path identity helper (`DI-001`)
Introduce one authoritative helper in the backend owner folder, e.g.:
- `autobyteus-server-ts/src/services/run-file-changes/run-file-change-path-identity.ts`

Owned responsibilities:
- convert raw observed paths into canonical persisted/displayed `path`
- resolve canonical `path` back into current absolute filesystem path when possible
- answer whether a canonical path is workspace-relative or external absolute
- provide one helper reused by live upsert, historical read normalization, route lookup, and tests/examples

Canonical persisted/displayed rule:
- **inside workspace** -> canonical workspace-relative POSIX path
- **outside workspace** -> canonical absolute POSIX path

### AD-008 — Invocation-context cache for generated outputs (`DI-002`)
Introduce one owned helper for invocation-scoped tool context, e.g.:
- `autobyteus-server-ts/src/services/run-file-changes/run-file-change-invocation-cache.ts`

Owned responsibilities:
- record `tool_name`, `arguments`, and pre-extracted candidate output path from `TOOL_EXECUTION_STARTED`
- retrieve/consume that context on success/failure/deny
- clear all run-scoped invocation context on run detach

Why a dedicated helper:
- keeps `RunFileChangeService` focused on projection logic
- makes the generated-output correlation mechanism explicit and testable
- avoids spreading invocation-retention logic across converters, processors, and route code

## Target Data Model

### Persisted run-memory shape

```json
{
  "version": 2,
  "entries": [
    {
      "id": "run-123:assets/report.pdf",
      "runId": "run-123",
      "path": "assets/report.pdf",
      "type": "pdf",
      "status": "available",
      "sourceTool": "generated_output",
      "sourceInvocationId": "tool-abc",
      "createdAt": "2026-04-11T10:00:00.000Z",
      "updatedAt": "2026-04-11T10:00:03.000Z"
    }
  ]
}
```

### Persisted field rules
- Keep:
  - `id`
  - `runId`
  - `path` (canonical effective-path identity)
  - `type`
  - `status`
  - `sourceTool`
  - `sourceInvocationId`
  - `createdAt`
  - `updatedAt`
- Remove from persisted storage:
  - `content`
  - `backendArtifactId`
  - `url`
  - `workspaceRoot`

### Live in-memory / WebSocket payload rules
- `content` may remain optional/transient for live `write_file` preview only.
- `content` must not be written to disk.
- `type` broadens from only `'file'` to the existing artifact/file-type union.
- `sourceTool` broadens to include `'generated_output'`.
- `path` in live payloads is already canonical; frontend must not invent a second identity scheme beyond slash normalization.

## Change Inventory

| Change ID | Type | Target | Summary |
| --- | --- | --- | --- |
| C-001 | Add | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-path-identity.ts` | Authoritative canonical-path identity and absolute-resolution helper reused by live upsert, historical read normalization, REST lookup, and tests. |
| C-002 | Add | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-invocation-cache.ts` | Invocation-scoped tool-context retention for generated-output discovery when success events omit arguments. |
| C-003 | Modify | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-types.ts` | Broaden type/source unions, remove persisted `content`/`backendArtifactId`, and make `path` explicitly canonical identity. |
| C-004 | Modify | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts` | Read/write only the canonical `<memoryDir>/file_changes.json` file; remove legacy fallback behavior entirely. |
| C-005 | Modify | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | Use canonical path helper for all live upserts, integrate invocation cache, stop capturing committed text snapshots, and create generated-output rows from success/result + cached start context. |
| C-006 | Modify | `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | Normalize canonical historical rows and canonicalize route lookups; no legacy projection hydration path remains. |
| C-007 | Modify | `autobyteus-server-ts/src/api/rest/run-file-changes.ts` | Replace snapshot-text semantics with current-file streaming semantics for all indexed file types using canonical lookup and canonical absolute resolution. |
| C-008 | Modify | `autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts` | Align GraphQL row type with metadata-first model while allowing transient `content` on active runs only. |
| C-009 | Remove/Modify | `autobyteus-server-ts/src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.ts`, `agent-artifact-event-processor.ts`, `startup/agent-customization-loader.ts` | Remove Artifacts-area dependence on copied media URLs and emitted artifact events from tool-result processors. |
| C-010 | Modify | `autobyteus-server-ts/src/utils/artifact-utils.ts` and related tests | Reuse path/type inference helpers for generated-output discovery from result and cached start arguments. |
| C-011 | Modify | `autobyteus-web/stores/runFileChangesStore.ts` | Make the store the sole Artifacts-area owner for text + media/doc outputs; broaden unions; keep optional transient `content` only for live write preview. |
| C-012 | Remove/Modify | `autobyteus-web/stores/agentArtifactsStore.ts`, `services/agentStreaming/handlers/artifactHandler.ts`, `components/workspace/agent/ArtifactsTab.vue`, `components/layout/RightSideTabs.vue` | Remove separate generated-output store path from the Artifacts tab and auto-switch logic. |
| C-013 | Modify | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Resolve all artifacts through the run-scoped file route; use buffered content only for in-progress `write_file`; use same route URL for media/docs. |
| C-014 | Modify | `autobyteus-web/components/workspace/agent/ArtifactList.vue`, `ArtifactItem.vue`, related types/tests | Keep UI grouping by file type while consuming one unified canonical-path row model. |
| C-015 | Modify | `autobyteus-web/services/runHydration/*`, GraphQL queries/types | Continue hydrating run file changes as the sole Artifacts-area restore path. |
| C-016 | Modify | Event converters / transport docs / optional handler registration | Deprecate Artifacts-area dependence on `ARTIFACT_*`; either stop producing Codex file-change artifact events or leave them as unused compatibility noise in the short term. |
| C-017 | Modify | Tests, docs, and implementation handoff references | Remove previous positive legacy-compatibility expectations and replace them with canonical single-file semantics plus clean-cut storage documentation. |

## Detailed Design

### 1. Backend projection ownership

`RunFileChangeService` remains the only backend owner for Artifacts-area rows.

#### 1.1 Existing text file flow
- Keep current `SEGMENT_START` / `SEGMENT_CONTENT` / `SEGMENT_END` handling for `write_file`.
- Keep current `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` handling for `write_file` and `edit_file`.
- Before any upsert, canonicalize the observed path with the path-identity helper.
- Remove calls to `captureCommittedContent(...)` for persistence.
- On success, mark the entry `available` without reading/storing the full text.

#### 1.2 Generated output flow (`DI-002`)
On `TOOL_EXECUTION_STARTED` for any tool:
- if `invocation_id` exists, record invocation context in the invocation cache:
  - `toolName`
  - sanitized `arguments`
  - best-effort candidate output path extracted from arguments

On `TOOL_EXECUTION_SUCCEEDED` for non-`write_file` / non-`edit_file` tools:
1. load invocation context by `invocation_id` when available
2. resolve candidate output path in this order:
   - `extractCandidateOutputPath(success.arguments, success.result)`
   - `extractCandidateOutputPath(cached.arguments, success.result)`
   - cached pre-extracted candidate path from start context
   - `extractCandidateOutputPath(null, success.result)`
3. if no candidate path is found, do not create a row
4. if a candidate path is found:
   - canonicalize it with the path-identity helper
   - infer type with `inferArtifactType(...)`
   - upsert one row keyed by `runId:canonicalPath`
   - set `sourceTool = generated_output`
   - set `status = available`
   - set `sourceInvocationId`
   - emit `FILE_CHANGE_UPDATED`
5. clear invocation context for that invocation

On `TOOL_EXECUTION_FAILED` / `TOOL_DENIED`:
- clear invocation context for that invocation
- only mark existing row failed when the tool is `write_file` / `edit_file`; generated-output failures do not create availability rows without a path

#### 1.3 Artifact signal handling
- The unified service should no longer depend on `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` to create or finalize rows.
- During the migration window, the service may ignore them or treat them as compatibility no-ops.
- Final intended state for the Artifacts area: no reliance on a second event family.

### 2. Canonical path identity (`DI-001`)

#### 2.1 Canonicalization algorithm
Given `rawPath` and optional `workspaceRootPath`:
- normalize separators to `/` for persisted/displayed shape
- if `rawPath` is relative and `workspaceRootPath` exists:
  - resolve absolute path under workspace root
  - return relative POSIX path from workspace root
- if `rawPath` is absolute and `workspaceRootPath` exists:
  - if absolute path resolves inside workspace root, return relative POSIX path from workspace root
  - otherwise return normalized absolute POSIX path
- if `workspaceRootPath` does not exist:
  - return normalized raw string

#### 2.2 Absolute resolution algorithm
Given canonical `path` and optional `workspaceRootPath`:
- if canonical `path` is absolute -> resolve as absolute path
- if canonical `path` is relative and `workspaceRootPath` exists -> resolve under workspace root
- otherwise absolute resolution fails (`null`)

#### 2.3 Collision rule
When canonicalization causes two live observations to collapse to the same `runId:canonicalPath`:
- latest update overwrites earlier state on the same row
- when timestamps tie, prefer:
  1. `available` over `pending` / `streaming` / `failed`
  2. non-null transient `content` over null for active live projections only

#### 2.4 Canonicalization ownership points
- `RunFileChangeService`: canonicalize before every upsert and before publishing live payloads
- `RunFileChangeProjectionService`: canonicalize route lookups and optionally normalize loaded rows defensively
- REST route lookup: canonicalize incoming query path before `getEntry` lookup
- Frontend: treat backend `path` as already canonical and use it directly for row ids and selection

### 3. Persisted storage

#### 3.1 Canonical file path
- New canonical path: `<memoryDir>/file_changes.json`
- No dedicated `run-file-changes/` subdirectory

#### 3.2 No legacy read path
`RunFileChangeProjectionStore.readProjection(memoryDir)` should:
1. read `<memoryDir>/file_changes.json`
2. return an empty projection when that file does not exist
3. never read `run-file-changes/projection.json`

This is a clean cut, not a migration shim.

#### 3.3 Write path
- Writer writes only the new flat file.
- No backfill migration job is required.
- New writes are already canonical because live owner canonicalizes before persistence.

### 4. Current-file REST route

`GET /runs/:runId/file-change-content?path=...` remains acceptable as the first-iteration endpoint to minimize churn.

#### 4.1 Request flow
1. canonicalize the incoming query path using the same path-identity helper and the run’s workspace root
2. resolve the indexed entry via `RunFileChangeProjectionService.getEntry(runId, canonicalPath)`
3. if no indexed entry exists, return `404`
4. resolve current absolute file path from canonical `entry.path`
5. if the file exists, stream current bytes with detected MIME type
6. if the file does not exist:
   - return `409` when the row is still `streaming`/`pending` in an active run
   - otherwise return `404`

#### 4.2 Response semantics
- No `415` for binary/media/doc rows anymore; the same route now serves them.
- `cache-control: no-store`
- MIME inferred from the current resolved file path.
- Text viewers may `fetch(...).text()`.
- Media/docs may use the same URL directly.

#### 4.3 Status-vs-filesystem rule
The route must prefer **actual file existence** over stale persisted status alone.
That prevents stale `pending`/`streaming` rows after a crash from blocking current-file viewing if the file actually exists.

### 5. Frontend ownership

#### 5.1 Single store
`runFileChangesStore` becomes the sole Artifacts-area store.

#### 5.2 Store shape
- Broaden `type` from `ArtifactType` reuse to the full existing artifact type union.
- Broaden `sourceTool` to include `generated_output`.
- Keep optional `content` only for live `write_file` buffering.
- Remove dependency on `agentArtifactsStore` in artifact-area rendering, selection, and auto-switch logic.
- Keep `buildArtifactId = runId:path`, where `path` is backend-canonical.

#### 5.3 Hydration
- `getRunFileChanges(runId)` remains the canonical artifact-area hydration query.
- Hydrated entries are metadata-first; active-run hydration may still include transient buffered `content` when available.
- If `file_changes.json` is absent, no historical rows are hydrated for that run.

### 6. Frontend viewer behavior

`ArtifactContentViewer.vue` changes from “text file-change route vs artifact URL” to “one run-scoped file URL for everything.”

#### 6.1 URL resolution
- compute one run route URL for any selected artifact using canonical `artifact.path`
- use buffered `content` only when:
  - `sourceTool === 'write_file'`
  - `status === 'streaming' || status === 'pending'`
  - transient content is present

#### 6.2 Text files
- fetch the run route and render returned text
- `404` => missing/deleted state
- `409` => pending state

#### 6.3 Media/docs
- pass the same run route URL into `FileViewer`
- no dependency on precomputed `artifact.url`

### 7. Processor and event cleanup

#### 7.1 Remove from Artifacts path
- `MediaToolResultUrlTransformerProcessor`
- `AgentArtifactEventProcessor`
- frontend `artifactHandler` / `agentArtifactsStore` from the Artifacts area

#### 7.2 Keep separate conversation media path
Do **not** remove:
- `MediaUrlTransformerProcessor`
- assistant-message media segment flow
- app media storage for assistant-response media hosting

#### 7.3 Transport cleanup strategy
Preferred target state for this ticket:
- Codex file-change item converter stops emitting `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED`
- no new generated-output artifact events are emitted from tool-result processors

Acceptable fallback if blast radius is larger than expected:
- stop consuming `ARTIFACT_*` in the Artifacts area
- leave transport enums/messages temporarily as deprecated compatibility noise

## File Placement / Ownership Boundaries

### Backend
- Primary owner: `autobyteus-server-ts/src/services/run-file-changes/**`
- New shared helper owners:
  - `run-file-change-path-identity.ts`
  - `run-file-change-invocation-cache.ts`
- Read boundary: `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`
- REST boundary: `autobyteus-server-ts/src/api/rest/run-file-changes.ts`
- Supporting helpers: `autobyteus-server-ts/src/utils/artifact-utils.ts`
- Cleanup targets:
  - `autobyteus-server-ts/src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.ts`
  - `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts`
  - `autobyteus-server-ts/src/startup/agent-customization-loader.ts`

### Frontend
- Primary owner: `autobyteus-web/stores/runFileChangesStore.ts`
- Live ingestion: `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts`
- Hydration: `autobyteus-web/services/runHydration/runFileChangeHydrationService.ts`
- UI owners:
  - `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
  - `autobyteus-web/components/layout/RightSideTabs.vue`
- Cleanup targets:
  - `autobyteus-web/stores/agentArtifactsStore.ts`
  - `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`

## Execution Sequence

1. Add canonical path identity helper and invocation cache helper (`C-001`, `C-002`).
2. Broaden backend model and storage format (`C-003`, `C-004`).
3. Update live backend owner to emit unified canonical rows and use invocation-cached generated-output discovery (`C-005`, `C-010`).
4. Canonicalize projection reads and route lookup (`C-006`, `C-007`).
5. Remove processor-driven media artifact ownership (`C-009`).
6. Collapse frontend to one store and one viewer path (`C-011` to `C-015`).
7. Remove/deprecate remaining `ARTIFACT_*` path dependence (`C-016`).
8. Update tests, docs, and stale handoff references (`C-017`).

## Requirement Traceability

| Requirement | Planned Changes |
| --- | --- |
| R-001, R-002 | C-001, C-003, C-005, C-006, C-011, C-012 |
| R-003 | C-003, C-004 |
| R-004, R-012 | C-001, C-006, C-007, C-013 |
| R-005 | C-005, C-011, C-013 |
| R-006 | C-005, C-013 |
| R-007 | C-002, C-005, C-009, C-011 |
| R-008, R-009 | C-004, C-006, C-007, C-015 |
| R-010, R-011 | C-004 |
| R-013 | C-009, C-012, C-016 |
| R-014 | C-011, C-012, C-013 |
| R-015 | C-004, C-017 |

## Verification Plan

### Backend unit
- `run-file-change-path-identity.ts`
  - relative workspace path canonicalizes to same value as workspace-internal absolute path
  - external absolute path remains absolute
  - canonical absolute resolution works for relative-inside-workspace and absolute-outside-workspace cases
- `run-file-change-invocation-cache.ts`
  - records started tool context
  - returns/consumes by invocation id
  - clears on completion and run detach
- `RunFileChangeProjectionStore`
  - writes `file_changes.json`
  - reads only `file_changes.json`
  - returns empty projection when only legacy path exists
- `RunFileChangeService`
  - `write_file` keeps transient buffered content but does not persist it
  - `edit_file` success marks `available` without snapshot capture
  - generated output success creates typed rows from success result + cached start arguments when success payload omits arguments
  - workspace-relative and workspace-internal absolute observations collapse to one row
  - artifact events are no longer required for generated outputs
- `RunFileChangeProjectionService`
  - canonicalizes entry lookup for route consumers
  - does not hydrate from `run-file-changes/projection.json`
- REST route
  - streams text current file
  - streams media/doc current file
  - canonical query path matches canonical stored row even when caller supplies workspace-internal absolute path
  - returns `409` only for not-yet-present pending active rows
  - returns `404` for missing indexed files and for runs with no `file_changes.json`

### Frontend unit/component
- `runFileChangesStore`
  - accepts generated output rows
  - merges/hydrates unified artifact rows keyed by canonical path
- `ArtifactsTab`
  - renders from one store only
- `ArtifactContentViewer`
  - buffered `write_file` preview still works
  - text fetch uses run route
  - image/audio/pdf use run route URL
  - missing/pending states render correctly
- `RightSideTabs`
  - artifact auto-switch still triggers from unified store signal

### Integration / API
- Active run:
  - `write_file` row appears, streams, then reads current file
  - `edit_file` row appears and resolves current file
  - generated image/audio/pdf row appears when success result omits path but start arguments carry it
  - one physical workspace file touched once by relative path and once by workspace-internal absolute path still shows one row
- Historical reopen:
  - rows hydrate from `file_changes.json`
  - clicking an existing current file works
  - missing file shows deleted/missing state
- Clean-cut storage behavior:
  - when only `run-file-changes/projection.json` exists and `file_changes.json` is absent, GraphQL hydration returns no artifact rows and REST lookup returns `404`

## Risks / Mitigations

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Stale `pending` / `streaming` rows after crash | Could block viewing even when file exists | Route prefers actual file existence over persisted status alone. |
| Hidden dependency on `output_file_url` | Removing media URL transformer could break an unseen caller | Search-confirm current consumers; keep removal scoped to tool-result artifact path; preserve `MediaUrlTransformerProcessor`. |
| Broad rename churn | Full symbol rename would inflate scope | Keep `RunFileChange*` class/store names in this iteration; change semantics first. |
| Legacy historical runs become unsupported | Some old runs may show no artifact rows after the clean cut | Make the unsupported behavior explicit in requirements/docs and remove old compatibility expectations from code/tests. |
| Invocation context leak | Cached start arguments could accumulate after aborted runs | Consume on success/failure/deny and clear whole run cache on detach. |
| Dead transport noise from `ARTIFACT_*` | Unused events create confusion | Prefer removing producers; fallback to deprecating and ignoring them. |

## Notes For Implementation Engineer

- Treat this as a **semantic unification** change more than a branding rename.
- Do not reintroduce snapshot persistence just to preserve existing tests; update the tests to the new source-of-truth rule.
- Keep assistant-message media hosting logic separate from the Artifacts area.
- Prefer the invocation-cache approach over broad success-event shape changes for this iteration.
- Remove production fallback for `run-file-changes/projection.json` entirely.
- Update or delete positive legacy-compatibility tests and handoff text that assumed old runs must still hydrate.
- Preserve finding IDs `DI-001` and `DI-002` in any follow-up discussion so the review thread remains traceable.
