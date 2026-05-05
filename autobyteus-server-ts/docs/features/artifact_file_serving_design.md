# Artifact File Serving Design (TypeScript)

## Scope

Covers the current Artifacts-tab serving design. The active runtime uses two
separate projections:

- `FILE_CHANGE` plus the run-file-changes projection for **Agent Artifacts**
  (touched files and generated outputs).
- `MESSAGE_FILE_REFERENCE_DECLARED` plus the team-level message-file-reference
  projection for message references shown as **Sent Artifacts** and
  **Received Artifacts** in the focused member's Artifacts tab.

Message references do not replace or extend the chat message renderer. Raw paths
in inter-agent messages remain normal text; the Artifacts tab opens referenced
content through persisted team reference identity.

## Relevant TS Modules

- Runtime derivation:
  - `src/agent-execution/domain/agent-run-file-change.ts`
  - `src/agent-execution/domain/agent-run-file-change-path.ts`
  - `src/agent-execution/domain/agent-run-message-file-reference.ts`
  - `src/agent-execution/events/agent-run-event-pipeline.ts`
  - `src/agent-execution/events/default-agent-run-event-pipeline.ts`
  - `src/agent-execution/events/dispatch-processed-agent-run-events.ts`
  - `src/agent-execution/events/processors/file-change/file-change-event-processor.ts`
  - `src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts`
  - `src/agent-execution/events/processors/file-change/file-change-output-path.ts`
  - `src/agent-execution/events/processors/file-change/file-change-payload-builder.ts`
  - `src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.ts`
  - `src/agent-execution/events/processors/message-file-reference/message-file-reference-payload-builder.ts`
  - `src/services/message-file-references/message-file-reference-explicit-paths.ts`
  - `src/agent-team-execution/services/publish-processed-team-agent-events.ts`
- Live projection owners:
  - `src/services/run-file-changes/run-file-change-service.ts`
  - `src/services/run-file-changes/run-file-change-path-identity.ts`
  - `src/services/message-file-references/message-file-reference-service.ts`
  - `src/services/message-file-references/message-file-reference-identity.ts`
  - `src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`
- Persistence and historical reads:
  - `src/services/run-file-changes/run-file-change-projection-store.ts`
  - `src/run-history/services/run-file-change-projection-service.ts`
  - `src/services/message-file-references/message-file-reference-projection-store.ts`
  - `src/services/message-file-references/message-file-reference-projection-service.ts`
- API boundaries:
  - `src/api/graphql/types/run-file-changes.ts`
  - `src/api/rest/run-file-changes.ts`
  - `src/api/graphql/types/message-file-references.ts`
  - `src/api/rest/message-file-references.ts`
- Streaming transport:
  - `src/services/agent-streaming/agent-run-event-message-mapper.ts`

## High-Level Flow

For Agent Artifacts:

1. Runtime backends convert provider events into normalized `AgentRunEvent` batches.
2. `AgentRunEventPipeline` processes each batch once before subscriber fan-out. Native AutoByteus teams keep one backend-owned native event bridge per active team run so a native event is converted, enriched, and processed once, then fanned out to all server subscribers.
3. `FileChangeEventProcessor` derives `FILE_CHANGE` only for explicit file mutations or known generated-output tools (`generate_image`, `edit_image`, `generate_speech`, including the AutoByteus image/audio MCP forms).
4. `RunFileChangeService` consumes `FILE_CHANGE`, canonicalizes path identity, and updates the run projection. For team-member events, the projection remains scoped to the member run id.
5. The service persists metadata-only state to `<run-memory-dir>/file_changes.json`; AutoByteus/native team-member runs use the member memory directory under `agent_teams/<teamRunId>/<memberRunId>/`.
6. The frontend hydrates rows through `getRunFileChanges(runId)` and continues live updates from `FILE_CHANGE`.
7. The viewer fetches `/runs/:runId/file-change-content?path=...` to stream the current file bytes.

For message-reference artifacts:

1. `send_message_to` accepts natural `content` plus optional explicit `reference_files` absolute local paths.
2. Team managers emit synthetic `INTER_AGENT_MESSAGE` events only after the recipient runtime accepts the inter-agent message; the event payload carries normalized `reference_files`.
3. Those synthetic events pass through the shared `AgentRunEventPipeline` before team fan-out.
4. `MessageFileReferenceProcessor` reads only `INTER_AGENT_MESSAGE.payload.reference_files` and derives `MESSAGE_FILE_REFERENCE_DECLARED`; message prose is not scanned for paths.
5. `MessageFileReferenceService` consumes the derived events, dedupes by deterministic team/sender/receiver/path identity, and persists metadata under the team run directory.
6. Active projection reads wait for pending same-team updates so immediate opens can resolve just-declared references.
7. The frontend hydrates rows through `getMessageFileReferences(teamRunId)` and continues live updates from `MESSAGE_FILE_REFERENCE_DECLARED`.
8. `messageFileReferencesStore` projects the same canonical team row as **Sent Artifacts** for the sender and **Received Artifacts** for the receiver.
9. The viewer fetches `/team-runs/:teamRunId/message-file-references/:referenceId/content` to stream bytes only after the server resolves the persisted reference.

## Live Event Semantics

### `FILE_CHANGE`

This is the authoritative Agent Artifacts event. It carries the canonical path,
type, status, source tool, timestamps, and optional transient `content` for live
`write_file` preview.

`FileChangeEventProcessor` is the only owner of derived file-change semantics.
It recognizes known mutation tools and known generated-output tools with explicit
output path semantics. Unknown tools with generic `file_path`/`filePath` fields
remain lifecycle/activity events only.

### `MESSAGE_FILE_REFERENCE_DECLARED`

This is the authoritative message-reference Artifacts event. It carries the
persisted reference identity, team id, sender/receiver run ids and optional
member names, normalized absolute local path, inferred artifact type, message
type, `createdAt`, and `updatedAt`.

Reference derivation is metadata-only during delivery. It does not check whether
the referenced path exists and does not read file content. Existence,
file-vs-directory, readability, and MIME handling belong to the referenced-content
REST route.

`reference_files` is the sole declaration source. Paths mentioned only in
message prose remain ordinary text and never create message-reference rows.

Runtime diagnostics use the `[message-file-reference]` prefix and intentionally
log concise event-level metadata: content length, explicit reference count,
reference paths when present, projection ids, validation failures, and content
failure reason codes. They must not log full inter-agent message content by
default.

### Published-artifact transport

Published-artifact events may still exist for application/runtime consumers, but
the current Artifacts tab does not depend on them. They are not the authoritative
serving path for changed or referenced files.

## Source Of Truth

### Listing / reopen

- Active runs read from the in-memory `RunFileChangeService` projection.
- Historical runs read normalized metadata from `<run-memory-dir>/file_changes.json`.
- Active AutoByteus/native team-member runs read from the same `RunFileChangeService` projection by member run id.
- Historical AutoByteus/native team-member runs resolve through team metadata and `TeamMemberMemoryLayout`, then read `agent_teams/<teamRunId>/<memberRunId>/file_changes.json`.
- Active team references read from the in-memory `MessageFileReferenceService` projection.
- Historical team references read normalized metadata from `agent_teams/<teamRunId>/message_file_references.json`.

### Agent Artifact preview bytes

- `GET /runs/:runId/file-change-content?path=<canonical-path>`
- The route resolves the indexed canonical path back to an absolute path and streams the current bytes from disk.
- `404` means the row is not indexed or the current file no longer exists.
- `409` means an active-run row exists but the final file is not yet present on disk.

### Message-reference bytes

- `GET /team-runs/:teamRunId/message-file-references/:referenceId/content`
- The route resolves the persisted reference first, validates that the stored path is still absolute, and streams the current local file bytes.
- `400` means the stored reference path is invalid.
- `403` means the referenced file is not readable.
- `404` means the reference is missing, the file no longer exists, or the path is not a file.
- This route is read-only and intentionally has no raw-path-only or legacy receiver-owned compatibility equivalent.

### Conversation media

Assistant-message media URL transformation remains a separate concern handled by
response customization and media storage. It is not the Artifacts tab source of
truth.

## Durable Storage

Agent Artifacts persist metadata here:

```text
<run-memory-dir>/file_changes.json
```

- metadata only; no committed content snapshots
- transient `content` is stripped before persistence
- for team-member runs, `<run-memory-dir>` is the member directory, for example `agent_teams/<teamRunId>/<memberRunId>`
- writes are atomic within the target directory: temp file first, then rename into `file_changes.json`
- no fallback to `run-file-changes/projection.json`

Message-reference artifacts persist metadata here:

```text
agent_teams/<teamRunId>/message_file_references.json
```

- metadata only; no content snapshots
- one canonical projection per team run
- atomic temp-file + rename writes
- no member-level duplicate projections
- no historical message-text backfill

## Current Guarantees

- Agent Artifacts have one row per canonical path.
- Produced Agent Artifacts stay scoped to the producing member run in team contexts; they do not become team-level rows and do not use message-reference storage.
- Multiple subscribers to an active AutoByteus team run must see the same processed `FILE_CHANGE` sequence from one native stream bridge, not duplicate or diverging pipeline output.
- Live `write_file` preview remains available through `FILE_CHANGE` content updates.
- `FILE_CHANGE` is a state-update stream with runtime-shaped pre-available updates.
- Known generated image/audio outputs share the same list and preview boundary as file changes.
- Message-derived references appear under **Sent Artifacts** or **Received Artifacts**, not inside the Agent Artifacts projection.
- Inter-agent message text remains non-clickable and is not parsed by the frontend for reference creation.
- Referenced content is opened by persisted `teamRunId + referenceId` identity only.
- Reopen/history works from metadata while previews use current filesystem bytes; this includes historical AutoByteus team-member `file_changes.json` rows read through the existing run-file GraphQL/REST/content authority.
- Legacy-only run-file-change projections and stale receiver-owned reference authorities are unsupported by design and behavior.

## Removed / Non-Authoritative Paths

The following are no longer the active Artifacts-tab serving path:

- `RunFileChangeService` derivation from generic segment/tool/denial events
- tool-result processors that copied media or emitted artifact events for the Artifacts tab
- `/workspaces/:workspaceId/content` as the Artifacts viewer boundary
- copied media-storage URLs as the primary artifact preview source
- `run-file-changes/projection.json` compatibility hydration
- frontend Markdown/chat parsing as message-reference authority
- raw-path-only message-reference content routes
- legacy receiver-owned message-reference content routes
- legacy receiver-owned GraphQL query arguments
- member-scoped duplicate reference projection files
- inserting message-derived references into `RunFileChangeService` or `runFileChangesStore`
- a single generic reference section in place of **Sent Artifacts** and **Received Artifacts**
