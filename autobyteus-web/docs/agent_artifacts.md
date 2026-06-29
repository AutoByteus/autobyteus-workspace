# Agent Artifacts and Team Communication References

## Overview

The desktop and mobile Artifacts surfaces are intentionally run-file-change only.
They list files that the focused agent run produced or touched through explicit
mutation/generated-output runtime events.

Team-route `send_message_to.reference_files` are no longer owned by the
Artifacts tab. They are child rows of Team Communication messages in the Team
tab. The message body stays natural and self-contained; `reference_files` is the
structured attachment/reference list used to register previewable files under the
accepted `recipient_name` message that carried them. Direct exact-run
`send_message_to(target_agent_run_id=...)` messages carry their references in
the target runtime input/event metadata but intentionally do not create Team
Communication reference rows.

Task-delegation `reference_files` are also outside the Artifacts tab, but they
are not Team Communication rows. They are task-owned reference rows carried on
`TASK_DELEGATION_EVENT` metadata and rendered inside the Team tab `Tasks`
master/detail surface.

## Agent Artifacts

Agent Artifacts cover:

- `write_file`
- `edit_file`
- generated outputs from known output-producing tools (`generate_image`,
  `edit_image`, `generate_speech`, including Agent Tools MCP route-backed
  forms)

Canonical runtime shape:

```ts
interface RunFileChangeEntry {
  id: string; // runId:path
  runId: string;
  path: string; // canonical relative-in-workspace or absolute outside-workspace
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  status: 'streaming' | 'pending' | 'available' | 'failed';
  sourceTool: 'write_file' | 'edit_file' | 'generated_output';
  sourceInvocationId: string | null;
  content?: string | null; // transient live write buffer only
  createdAt: string;
  updatedAt: string;
}
```

Rules:

- One row per `runId + canonical path`.
- Team-member produced artifacts remain scoped to the producing member run id.
- Current filesystem content is the source of truth for committed previews.
- `content` is transient and only used for live buffered `write_file` rendering.
- Generic `file_path`/`filePath` fields are not Agent Artifact evidence unless
  returned by a known generated-output tool or paired with explicit
  output/destination semantics.
- `FILE_CHANGE` is a state-update stream, not an exact-one occurrence guarantee.

## Team Communication References

Team Communication owns message references for accepted `recipient_name`
deliveries:

```ts
interface TeamCommunicationMessage {
  messageId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberName?: string | null;
  receiverRunId: string;
  receiverMemberName?: string | null;
  content: string;
  messageType: string;
  createdAt: string;
  updatedAt: string;
  referenceFiles: TeamCommunicationReferenceFile[];
}

interface TeamCommunicationReferenceFile {
  referenceId: string;
  path: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  createdAt: string;
  updatedAt: string;
}
```

Rules:

- Accepted team-route `INTER_AGENT_MESSAGE` payloads are processor input for Team
  Communication messages. The live/store authority is the derived
  `TEAM_COMMUNICATION_MESSAGE`; direct exact-run messages without team projection
  fields are ignored by this store.
- Reference rows come only from explicit `payload.reference_files` /
  `payload.reference_file_entries`; message prose is not scanned and raw paths
  are not linkified.
- One durable team-level projection is stored at
  `agent_teams/<teamRunId>/team_communication_messages.json`.
- Reference content opens by message-owned identity:
  `/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`.
- The focused member sees sent/received message perspectives in the Team tab.
  The left list hierarchy is `Sent` / `Received` -> counterpart member name ->
  message -> reference file, without repeated `To` / `From` group prefixes.
- Team Communication rows are compact, email-like rows. The row shell is a
  non-interactive container; message summaries and reference-file rows are
  sibling buttons so reference controls are never nested inside a message
  summary button.
- Selecting a message shows its content in the detail pane through the shared
  Markdown renderer while keeping raw absolute paths as plain text. Selecting a
  reference switches that same pane to the message-owned reference viewer.
- Mobile Team Communication renders the same structured `referenceFiles` as
  tappable phone rows instead of collapsing them to an inert count. Mobile uses
  the same message-owned identity (`teamRunId`, `messageId`, `referenceId`) in a
  full-screen wrapper and returns to the same message list/focused-member
  context on close. Mobile does not scan message prose for paths.

## Task Delegation References

The Team tab `Tasks` section owns task-delegation references for active
delegated tasks:

```ts
interface TeamReferenceFile {
  referenceId: string;
  path: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  createdAt: string;
  updatedAt: string;
}
```

Rules:

- Task reference rows come from `TASK_DELEGATION_EVENT.referenceFiles`, which is
  derived from explicit task-delegation `reference_files` on the task ledger
  record. The Tasks UI does not parse Team Communication messages or raw
  Markdown/prose for paths.
- The left Tasks navigator shows reference rows only under the selected task.
  Selecting a reference switches the whole right detail pane from task body to
  file preview and Back returns to the task body.
- Reference content opens by task-owned identity:
  `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`.
- Primary visible Tasks UI hides raw task ids and task-kind badges; those values
  belong in the collapsed Technical details block, not in the main reference
  picker.
- Tasks is status/read/focus oriented. It never owns Approve/Deny controls or
  approval command target construction; pending approval remains Activity-owned.

## Data Flow

```mermaid
flowchart LR
  A[Runtime events] --> B[AgentRunEventPipeline]
  B --> C[FileChangeEventProcessor]
  C --> D[FILE_CHANGE]
  D --> E[RunFileChangeService]
  E --> F[<run-memory-dir>/file_changes.json]
  D --> G[runFileChangesStore]
  G --> H[Desktop ArtifactsTab: Agent Artifacts]
  G --> U[MobileArtifacts: focused run/member Agent Artifacts]

  I[Accepted team-route INTER_AGENT_MESSAGE] --> J[TeamCommunicationMessageProcessor]
  J --> K[TEAM_COMMUNICATION_MESSAGE]
  K --> L[TeamCommunicationService]
  L --> N[agent_teams/<teamRunId>/team_communication_messages.json]
  K --> M[team websocket]
  M --> P[teamCommunicationStore]
  N --> O[GraphQL: getTeamCommunicationMessages]
  P --> R[Team tab: Team Communication]
  R --> S[TeamCommunicationReferenceViewer]
  S --> T[REST: message reference content route]
  P --> V[MobileTeamMessages]
  V --> W[MobileTeamReferenceViewer]
  W --> S

  X[TASK_DELEGATION_EVENT] --> Y[team task execution projection]
  Y --> Z[Team tab: Tasks]
  Z --> AA[TeamTaskReferenceViewer]
  AA --> AB[TeamReferenceFileViewer]
  AB --> AC[REST: task reference content route]
```

## Frontend Owners

| Owner | Path | Responsibility |
| --- | --- | --- |
| Agent Artifact store | `autobyteus-web/stores/runFileChangesStore.ts` | Owns hydrated/live rows for touched files and generated outputs. |
| Agent Artifact stream ingestion | `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts` | Applies `FILE_CHANGE` payloads into the Agent Artifact store. |
| Agent Artifact hydration | `autobyteus-web/services/runHydration/runContextHydrationService.ts` | Loads `getRunFileChanges(runId)`. |
| Desktop Artifacts tab | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Displays only run-scoped Agent Artifacts in the desktop right-side panel. |
| Mobile Artifacts view | `autobyteus-web/components/mobile/MobileArtifacts.vue` | Displays only run-scoped Agent Artifacts for the mobile-selected agent run or focused team member run, using the same run artifact store and `ArtifactContentViewer` rather than the desktop right-panel layout. |
| Mobile focused-run identity | `autobyteus-web/composables/mobile/useMobileFocusedRunIdentity.ts` | Centralizes the mobile agent/team focused run-id guard shared by Activity and Artifacts so stale mobile selections do not leak artifacts or activity from another run. |
| Team Communication store | `autobyteus-web/stores/teamCommunicationStore.ts` | Owns hydrated/live inter-agent messages and focused sent/received message perspectives. |
| Team Communication hydration | `autobyteus-web/services/runHydration/teamCommunicationHydrationService.ts` | Loads `getTeamCommunicationMessages(teamRunId)`. |
| Team Communication panel | `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Renders compact sent/received message rows, sibling reference-file controls, and Markdown message detail. |
| Team reference viewer | `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Opens a reference through the message-owned content route and owns local inline/maximized preview state. |
| Mobile Team messages | `autobyteus-web/components/mobile/MobileTeamMessages.vue` | Renders the focused member's Team Communication messages in the mobile shell and exposes each structured reference file as a tappable phone row. |
| Mobile Team reference wrapper | `autobyteus-web/components/mobile/MobileTeamReferenceViewer.vue` | Wraps `TeamCommunicationReferenceViewer` in a full-screen mobile surface, passes message-owned identity through, and disables rich HTML preview for mobile. |
| Team reference presentation helper | `autobyteus-web/utils/teamCommunication/referenceFilePresentation.ts` | Centralizes reference display-name and icon selection so desktop and mobile Team Communication rows do not duplicate file-type presentation policy. |
| Team Tasks section | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Owns the Tasks master/detail state, selected task/reference, right-pane task body, waiting-for-Activity notice, and explicit Focus controls. |
| Team Tasks row | `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` | Renders compact task navigator rows and selected-task reference rows. |
| Task reference route wrapper | `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Builds the task-owned content route from `teamRunId + taskId + referenceId` and supplies Back-to-task behavior. |
| Task reference preview shell | `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | Route-agnostic read-only Team reference shell used for task references; delegates raw/preview/media/PDF/CSV/Excel rendering to `FileViewer`. |
| Generic Team reference type/presentation | `autobyteus-web/types/teamReferenceFile.ts`, `autobyteus-web/utils/teamReferences/*` | Shared task-reference file model and file-type/name/icon presentation for the Tasks surface. |

## Viewer Resolution

`ArtifactContentViewer` resolves only Agent Artifact rows. Desktop and mobile
Artifacts surfaces both delegate preview/content loading to this viewer; mobile
remote access therefore keeps using the authorized run content route instead of
opening workspace files directly.

1. Live `write_file` row with `streaming` or `pending` status -> buffered inline
   `content`.
2. Failed row -> explicit failure state.
3. Non-`available` row -> pending state.
4. Available row -> `/runs/:runId/file-change-content?path=...`.

Team Communication reference previews use `TeamCommunicationReferenceViewer` and
never use the run-file-change route. The message viewer owns its local
maximize/restore state independently of Agent Artifact display-mode controls:
users can open the preview inline, maximize it to a viewport shell, restore with
the control or `Escape`, and keep switching between Raw and Preview while
maximized. The mobile wrapper uses the same viewer/content route in a
phone-sized full-screen surface, but disables rich HTML preview so mobile
reference files stay on authorized raw/Markdown/media/PDF/CSV/Excel loading
paths rather than an unauthenticated static HTML preview path.

Task-delegation reference previews use `TeamTaskReferenceViewer` and
`TeamReferenceFileViewer`. The route identity is task-owned
(`teamRunId + taskId + referenceId`), not message-owned, and the preview occupies
the Tasks right pane with an explicit Back-to-task affordance. The generic task
reference shell uses authorized fetch/object URLs and the shared read-only
`FileViewer` modes for text/Markdown, protected media, PDF, CSV, and Excel
content.
