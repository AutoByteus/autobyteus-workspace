# Design Spec

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Current-State Read

The current browser composer upload path is not run-owned and is also not UI-contract-safe.

Execution path today:
`Composer/App Attachment UI -> fileUploadStore -> POST /rest/upload-file -> MediaStorageService -> <app-data-dir>/media/<category>/<uuid> -> /rest/files/<category>/<filename> -> UI state keyed/labeled/opened by raw path -> WebSocket SEND_MESSAGE -> ContextFile(uri=url)`

Current ownership boundaries:
- Composer/app attachment components own attachment UI state only, but currently rely on raw `path` for key/label/open behavior.
- `fileUploadStore` is a generic upload facade shared by composer uploads and avatar uploads.
- `upload-file.ts` is a shared-media upload boundary, not a run-owned boundary.
- `MediaStorageService` owns shared app-media storage, listing, and deletion.
- `/rest/runs/:runId/file-change-content` is a run-artifact boundary owned by the file-change projection subsystem, not by user input attachments.
- `UserInputContextBuildingProcessor` and `PromptContextBuilder` assume local filesystem paths for readable context ingestion.

Current fragmentation / coupling problems:
- Browser-uploaded composer attachments are stored by media category rather than by run ownership.
- Shared-media listing/deletion can affect run input attachments.
- Uploaded text files remain URL-based and therefore skip prompt-context reading.
- Runtime-specific `/rest/files/...` handling compensates for the wrong upstream owner.
- First-turn uploads occur before final run IDs exist, so naive final-run-path uploads are impossible.
- Web surfaces overload raw `path` as stable key, human label, open target, preview source, and send locator.

## Locked Design Decisions

- Use draft staging for all browser composer uploads, even when the final run/team already exists.
- Final run-owned lookup uses `storedFilename`, not a manifest-backed `attachmentId`.
- Store finalized files directly under `context_files/<storedFilename>`; do not add an extra `files/` subdirectory.
- Use one shared web attachment descriptor plus one shared presentation/open boundary so UI surfaces stop depending on raw locator strings.
- Draft cleanup is locked to:
  - immediate delete on composer removal / clear-all for uploaded draft attachments
  - opportunistic TTL cleanup of abandoned draft uploads older than 24 hours
- No composer-specific backward-compatibility behavior is retained for old `/rest/files/...` attachment flows. Shared `/rest/files/...` stays only where it is still genuinely used by supported non-composer features such as avatars/shared media. No new server-side legacy resolver is added.
- Data migration of already-persisted conversation attachment URLs is not included in this ticket.
- Application focused-member composers are in scope and reuse the same team-member draft/final contract because application state already carries temp/final `teamRunId`.
- In-scope Electron composer surfaces must preserve direct local-path behavior for native OS drag/drop; uploaded-context-file staging is only for browser-style file blobs (upload button, clipboard file paste, browser drag/drop).
- Message-rendering surfaces should display previewable image attachments as compact thumbnails using the same shared presentation helper already used by composer surfaces, with filename-chip fallback when preview resolution fails or the attachment is not an image. Clicking a thumbnail should preview the image in the right-side Files/File Viewer area, not the Artifacts panel and not a separate modal, so uploaded images behave consistently with dragged local-image attachments.

## Intended Change

Introduce a dedicated `context-files` subsystem for browser-uploaded composer attachments.

The target behavior is:
- browser composer uploads stop using shared-media upload/storage/URL boundaries
- all browser composer uploads land in draft context-file storage first
- upload assigns one unique, path-safe `storedFilename` such as `ctx_<token>__<sanitized-original-name>.<ext>`
- draft preview uses draft `context-files/:storedFilename` routes
- send flows finalize draft attachments into final run-owned storage before optimistic user-message append and WebSocket send
- final run-owned retrieval uses dedicated `context-files/:storedFilename` REST routes, not `/rest/files/...` and not `/rest/runs/:runId/file-change-content`
- server-side input preprocessing resolves only final run-scoped context-file URLs into local absolute paths for prompt-context reading and runtime-local media input handling
- composer/app/message UIs render uploaded attachments using `displayName` and `id`, not raw `locator`

## Terminology

- `Draft attachment`: a browser-uploaded composer attachment stored before send under draft context-file storage.
- `Final attachment`: a browser-uploaded composer attachment stored under final run-owned `context_files/` storage after send finalization.
- `Stored filename`: the server-generated filename used both on disk and in draft/final `context-files/:storedFilename` routes.
- `Locator`: the authoritative string sent downstream or opened by the browser helper; for uploaded attachments it is a draft/final context-file URL, for workspace-local attachments it is the local/workspace path.
- `Web attachment descriptor`: the shared frontend object used by composer/app/message surfaces.
- `Owner descriptor`: the explicit subject identity used by upload/finalize/read/delete boundaries.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Composer/App upload action | Draft attachment persisted with `storedFilename` | `ContextFileUploadService` | Defines how browser uploads enter owned draft storage instead of shared media |
| DS-002 | Primary End-to-End | Composer/App remove/clear action | Draft attachment bytes deleted and draft subtree pruned as needed | `ContextFileUploadStore` + draft delete route | Locks early-deletion behavior for abandoned unsent uploads |
| DS-003 | Primary End-to-End | First/subsequent send | Final run-owned attachment URLs in optimistic message + WebSocket payload | `ContextFileFinalizationService` | Solves the draft-to-final ownership gap before runtime processing |
| DS-004 | Return-Event | UI preview/open action | Attachment opened with correct File Viewer/browser/workspace behavior | `contextAttachmentPresentation` | Closes the web-contract gap identified in review |
| DS-005 | Primary End-to-End | WebSocket `SEND_MESSAGE` with final context-file URLs | Local absolute file paths available to prompt/runtime processors | `ContextFileLocalPathResolver` | Makes uploaded text/media attachments usable by downstream processors |
| DS-006 | Bounded Local | Upload/finalize/delete entrypoint | Expired draft files older than 24 hours pruned | `ContextFileDraftCleanupService` | Prevents indefinite draft-storage leaks without a background scheduler |

## Primary Execution Spine(s)

- `Composer/App UI -> ContextFileUploadStore.uploadAttachment -> POST /rest/context-files/upload -> ContextFileUploadService -> Draft Context-File Layout`
- `Composer/App UI -> ContextFileUploadStore.removeAttachment / clearUploadedDraftAttachments -> DELETE draft context-file route -> Draft subtree prune`
- `Send Store -> Run/Team Creation/Restore -> ContextFileUploadStore.finalizeDraftAttachments -> POST /rest/context-files/finalize -> Final run-owned context_files/<storedFilename> -> Optimistic message append -> WebSocket SEND_MESSAGE`
- `WebSocket SEND_MESSAGE -> ContextFileLocalPathResolver -> UserInputContextBuildingProcessor / CodexUserInputMapper -> Runtime`
- `Composer/App/UserMessage UI -> contextAttachmentPresentation -> workspace open, File Viewer preview for requested previewable uploaded-image thumbnails, or browser open (per authoritative attachment-open policy)`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Browser composer uploads call a dedicated context-file upload API that generates one path-safe stored filename and writes bytes into draft storage under the explicit draft owner. | Composer/App UI, ContextFileUploadStore, Context Files REST Upload Route, ContextFileUploadService | `ContextFileUploadService` | MIME/type inference, stored filename generation, draft cleanup trigger |
| DS-002 | When a user removes an uploaded draft attachment before send, the frontend calls a mirrored draft delete route so the staged file is deleted immediately and empty draft directories are pruned. | Composer/App UI, ContextFileUploadStore, Draft Delete Route | `ContextFileUploadStore` | Only uploaded draft items trigger server deletion; workspace paths are local UI removal only |
| DS-003 | Before optimistic append and stream send, send stores finalize all uploaded draft attachments into final run-owned storage and rewrite those descriptors to final run-scoped URLs while preserving stored filename and display name. | Send Store, Run/Team Creation Boundary, ContextFileFinalization API, ContextFileFinalizationService | `ContextFileFinalizationService` | Team-member final path derivation, app reuse through team context, idempotent moves |
| DS-004 | UI surfaces render labels via `displayName`, key rows/chips by `id`, derive image preview URLs via one helper, render previewable image attachments as compact thumbnails in message surfaces, and delegate every attachment-open decision to one authoritative UI boundary. That boundary routes workspace paths to the file explorer, previewable uploaded-image thumbnails in sent messages to right-side Files/File Viewer preview, and other uploaded/external attachments to browser-open behavior. UI components may pass file-explorer/browser callbacks into that boundary, but they must not branch locally on attachment kind, preview URL, or source kind to choose a route themselves. | Composer/App UI, UserMessage UI, contextAttachmentPresentation, fileExplorer store | `contextAttachmentPresentation` plus Electron-native drop branch in each in-scope composer UI | Embedded Electron local-path preview/open behavior, File Viewer preview routing for uploaded images, generic URL preview/open behavior, message-surface thumbnail fallback and right-side preview consistency |
| DS-005 | Runtime input processors receive final context-file URLs, resolve them into local absolute paths through one resolver boundary, and then proceed with readable text ingestion or runtime-local image handling without shared-media assumptions. | AgentStreamHandler / TeamStreamHandler, ContextFileLocalPathResolver, UserInputContextBuildingProcessor, CodexUserInputMapper | `ContextFileLocalPathResolver` | URL parsing, path safety, draft-route rejection |
| DS-006 | Every upload/finalize/delete entrypoint opportunistically prunes draft files older than 24 hours using file mtimes and removes empty directories on the way out. | Upload/Finalize/Delete Routes, ContextFileDraftCleanupService, Draft Layout | `ContextFileDraftCleanupService` | TTL policy, recursive empty-directory pruning |

## Ownership Map

- `ContextFileUploadStore` owns frontend upload/finalize/delete orchestration for composer attachments only.
- `contextAttachmentPresentation` owns shared display label, stable key, preview source, and authoritative open/preview routing behavior for composer/app/message surfaces.
- `ContextFileUploadService` owns draft ingress placement and stored-filename generation.
- `ContextFileFinalizationService` owns draft-to-final promotion while preserving stored filename and display metadata.
- `ContextFileReadService` owns draft/final attachment streaming from explicit owner descriptors and stored filename.
- `ContextFileDraftCleanupService` owns draft TTL pruning and empty-directory pruning.
- `ContextFileLocalPathResolver` owns final URL-to-local-path resolution for runtime consumers.
- `UserInputContextBuildingProcessor` remains the governing owner of input normalization, but it must depend on `ContextFileLocalPathResolver` instead of rolling its own URL/path rules.
- `CodexUserInputMapper` remains the governing owner of Codex payload mapping, but it must depend on `ContextFileLocalPathResolver` instead of shared-media-specific `/rest/files/...` parsing.
- `MediaStorageService` remains the owner of shared media only; it must no longer govern composer attachments.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Context-file REST upload/finalize/read/delete routes | `ContextFileUploadService` / `ContextFileFinalizationService` / `ContextFileReadService` / `ContextFileDraftCleanupService` | Transport boundary for browser clients | Storage layout policy inside callers |
| `ContextFileUploadStore` | Backend context-file services | Frontend async/UI orchestration | Direct DOM/UI rendering rules |
| `contextAttachmentPresentation` | Shared attachment descriptor rules | One authoritative UI contract for display/open/preview routing behavior | Upload sequencing or transport concerns |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Composer/app use of `fileUploadStore.uploadFile()` | Mixed shared-media ownership is the root problem | `ContextFileUploadStore` + context-file REST routes | In This Change | Avatar/shared-media callers stay on shared-media upload path |
| Shared-media `/rest/files/...` as composer attachment preview identity | Category/path ownership is wrong for run-owned inputs | Draft/final `context-files/:storedFilename` routes | In This Change | Keep `/rest/files/...` only for still-supported non-composer features |
| Shared-media-specific `/rest/files/...` resolution inside runtime context-input handling for new sends | It compensates for the wrong upstream owner | `ContextFileLocalPathResolver` on final context-file URLs | In This Change | Resolver must reject draft URLs |
| Path-only web attachment contract | Raw locator currently carries too many meanings | Shared `ContextAttachment` descriptor + `contextAttachmentPresentation` | In This Change | Applies to composer/app/message surfaces |
| Manifest-backed `attachmentId` plan from round-1 design | User chose simpler route-based lookup | Stored-filename lookup directly from owner root | In This Change | No manifest store in revised design |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Stored filename generation | DS-001 | `ContextFileUploadService` | Generate path-safe unique filenames that preserve readable original-name tail | Prevent collisions without manifest indirection | UI/store starts inventing storage names |
| Draft layout builder | DS-001, DS-002, DS-003, DS-006 | Upload/finalize/read/delete/cleanup services | Compute safe draft paths | Draft staging is a storage concern, not a UI concern | Send stores would start owning filesystem rules |
| Final layout builder | DS-003, DS-005 | Finalize/read/path resolver services | Compute safe final paths under run memory roots | Final storage must match existing run memory ownership | Routes/processors would each invent owner paths |
| Team member run-id derivation | DS-003, DS-005 | Finalization/read services | Derive final member-run storage identity from `teamRunId + memberRouteKey` | Frontend does not need final memberRunId | Client code would duplicate server-only identity logic |
| Shared attachment display/open helper | DS-004 | Web surfaces | Standardize label/key/open/preview behavior | Avoid raw locator coupling in multiple components | Components diverge and regress |
| Draft cleanup / TTL | DS-001, DS-002, DS-003, DS-006 | Draft cleanup service | Remove abandoned draft subtrees | Staging creates non-final assets | Draft folders leak indefinitely |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Final run-owned folder layout | `agent-memory/store` layouts | Reuse | Existing run/team-member directory ownership is correct | N/A |
| Shared media upload/list/delete | `media-storage-service` | Reuse for shared media only | Still correct for avatars/global assets | Not right for run-owned context attachments |
| Run artifact preview route | `run-file-changes` subsystem | Do Not Reuse As Owner | It is projection/index owned by runtime-produced file changes | Uploaded context attachments are not file-change projections |
| Team member run-id derivation | `run-history/utils/team-member-run-id.ts` | Reuse | Existing server-side algorithm already derives final member-run storage identity from `teamRunId + memberRouteKey` | Final context-file APIs keep `memberRouteKey` explicit |
| Web attachment presentation/open behavior | No single owner today | Create New | Current logic is duplicated and path-driven | Shared helper is needed across composer/app/message |
| Draft staging lifecycle | No existing subsystem | Create New | First-turn upload staging and TTL cleanup are new concerns | No existing owner expresses draft attachment lifecycle |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `context-files` (server) | Composer attachment upload, draft staging, finalization, read/delete routes, local-path resolution, TTL cleanup | DS-001, DS-002, DS-003, DS-005, DS-006 | Upload/finalize/read/delete/path-resolution owners | Create New | New authoritative owner for browser composer uploads |
| `agent-memory` / `run-history` shared identity/layout | Run-owned memory roots and team-member run-id derivation | DS-003, DS-005 | Finalization/read/path-resolution services | Extend | Reuse existing memory ownership and run-id helper |
| `shared-media` | Avatar/global media upload and listing | Outside main scope; interacts with DS-001 via separation | Shared-media owner only | Reuse | Context uploads must stop depending on it |
| `composer upload orchestration` (web) | Draft/final owner selection, upload/finalize/delete calls, optimistic message normalization | DS-001, DS-002, DS-003 | Agent/team/application send stores and composer UIs | Extend | Frontend must finalize staged attachments before send |
| `web attachment presentation` | Label, key, preview, open behavior | DS-004 | Composer/app/message UIs | Create New | Closes review finding DI-001 |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | server `context-files` | REST transport boundary | Upload/finalize/read/delete routes for context attachments | One transport entry boundary for one subject | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-upload-service.ts` | server `context-files` | Upload owner | Accept multipart upload, generate stored filename, place bytes into draft storage | One owner for ingress placement and response descriptors | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-finalization-service.ts` | server `context-files` | Finalization owner | Promote draft attachments into final run-owned storage | One owner for draft lifecycle transition | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-read-service.ts` | server `context-files` | Read owner | Resolve owner + stored filename and stream bytes | One subject-specific read boundary | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-draft-cleanup-service.ts` | server `context-files` | Cleanup owner | TTL prune draft files and empty directories | One owner for cleanup policy | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | server `context-files` | Resolver owner | Parse final context-file URLs to absolute local paths | Shared URL->path logic belongs in one place | Yes |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | server `context-files` | Layout helper | Safe draft/final folder and file path derivation | One file for path derivation rules | Yes |
| `autobyteus-web/stores/contextFileUploadStore.ts` | web composer upload orchestration | Frontend upload owner | Upload draft attachments, delete draft attachments, finalize drafts | One store per subject avoids mixing with avatar uploads | Yes |
| `autobyteus-web/utils/contextFiles/contextAttachmentPresentation.ts` | web attachment presentation | Shared presentation boundary | Stable keys, labels, preview URLs, and open behavior | One UI contract owner across surfaces | Yes |
| `autobyteus-web/utils/contextFiles/contextFileOwner.ts` | web composer upload orchestration | Owner descriptor builder | Build draft/final owner descriptors from active context | Shared across agent/team/application send flows | Yes |
| `autobyteus-web/types/conversation.ts` | web shared data model | Shared structure | Replace path-only model with shared attachment descriptor | One shared UI model for composer/message attachments | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Draft/final owner descriptors | `context-file-owner.ts` (web) and `context-file-owner-types.ts` (server) | composer upload / server context-files | Upload/finalize/read/delete must all talk about the same explicit owner identity | Yes | Yes | Generic catch-all upload metadata blob |
| Shared web attachment descriptor | `types/conversation.ts` | shared web model | Composer/app/message surfaces need one attachment contract | Yes | Yes | Raw path bag with optional extras |
| Display/open behavior | `contextAttachmentPresentation.ts` | web attachment presentation | Prevent UI surfaces from each inventing their own path parsing | Yes | Yes | A second upload store |
| Final context-file URL parsing | `context-file-local-path-resolver.ts` | server `context-files` | Prompt processor and Codex mapper need one rule | Yes | Yes | Ad hoc parser snippets in multiple processors |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ContextFileOwnerDescriptor` | Yes | Yes | Low | Keep explicit variants: standalone draft, standalone final, team-member draft, team-member final |
| `UploadedContextAttachment` | Yes | Yes | Low | Keep `storedFilename`, `locator`, `displayName`, `id`, `phase`, and `type`; do not overload `locator` as label or key |
| `WorkspaceContextAttachment` | Yes | Yes | Low | Keep local path semantics separate from uploaded semantics |

### Authoritative UI Open / Preview Contract

`contextAttachmentPresentation.openAttachment(...)` is the single authoritative frontend routing boundary for attachment-open behavior. UI components may choose *when* to call it, but they must not choose *how* the attachment is opened. They may provide capabilities such as file-explorer/browser callbacks, but they must not inspect attachment fields like `kind`, `type`, `previewUrl`, or `locator` in order to route around the boundary.

Expected caller inputs:

```ts
contextAttachmentPresentation.openAttachment(attachment, {
  workspaceId,
  isEmbeddedElectronRuntime,
  openWorkspaceFile,
  openFilePreview,
  preferFileViewerForPreviewableImages,
  openBrowserUrl,
})
```

Required routing policy:

1. `workspace_path` attachments:
   - open through `openWorkspaceFile(locator, workspaceId)` when available.
2. Previewable non-`workspace_path` image attachments when `preferFileViewerForPreviewableImages === true`:
   - if `openFilePreview` and `workspaceId` are available, normalize the attachment to a previewable absolute URL/path and route it into `openFilePreview(...)` so the right-side Files/File Viewer shows it.
   - if File Viewer preview dependencies are missing, fall back to generic browser-open behavior.
3. All other uploaded/external attachments:
   - use browser-open behavior.

This keeps message-surface uploaded-image preview consistent with dragged local-image behavior without letting message components hand-code file-explorer routing.

### Shared Web Attachment Descriptor

`autobyteus-web/types/conversation.ts` should replace the path-only attachment shape with a discriminated union similar to:

```ts
export type ContextAttachment =
  | {
      kind: 'workspace_path';
      id: string;          // absolute path
      locator: string;     // same absolute path
      displayName: string; // basename(path)
      type: ContextFileType;
    }
  | {
      kind: 'uploaded';
      id: string;               // storedFilename
      locator: string;          // draft or final /rest/.../context-files/:storedFilename URL
      storedFilename: string;
      displayName: string;      // original filename
      phase: 'draft' | 'final';
      type: ContextFileType;
    }
  | {
      kind: 'external_url';
      id: string;          // normalized URL
      locator: string;
      displayName: string; // derived label
      type: ContextFileType;
    }
    };
```

Rules:
- UI lists/chips key by `id`, not by `locator`.
- UI labels render `displayName`, not `locator`.
- Uploaded attachments keep the same `storedFilename` and `id` before and after finalization; only `locator` and `phase` change.
- No dedicated legacy attachment variant is introduced for old composer uploads. Generic URL handling is sufficient where a supported shared-media URL still exists for other features.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | server `context-files` | REST transport boundary | `POST upload`, `POST finalize`, `GET draft`, `DELETE draft`, `GET final` routes for context attachments | Subject-specific transport boundary | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-upload-service.ts` | server `context-files` | Upload owner | Validate multipart file, generate stored filename, place bytes into draft storage, return uploaded descriptor payload | Single subject ingress owner | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-finalization-service.ts` | server `context-files` | Finalization owner | Move draft attachments into final run-owned subtrees while preserving stored filename and display metadata | Single lifecycle transition owner | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-read-service.ts` | server `context-files` | Read/delete owner | Resolve explicit owner identity + stored filename to file bytes or deletion target | Single subject read/delete owner | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-draft-cleanup-service.ts` | server `context-files` | Cleanup owner | Opportunistic TTL cleanup and empty-directory pruning | Single cleanup-policy owner | Yes |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | server `context-files` | Resolver owner | Resolve final context-file URLs to local absolute paths for downstream processors | Shared owned resolver | Yes |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | server `context-files` | Layout boundary | Safe draft/final folder and file path derivation for stored-filename lookup | Shared path concern only | Yes |
| `autobyteus-web/stores/contextFileUploadStore.ts` | web composer upload orchestration | Frontend upload/finalize/delete owner | Upload composer attachments, delete uploaded draft attachments, finalize drafts before send | One subject-specific client owner | Yes |
| `autobyteus-web/utils/contextFiles/contextAttachmentPresentation.ts` | web attachment presentation | Shared UI boundary | Stable key, display label, preview source, and authoritative open/preview routing behavior, including uploaded-image -> File Viewer preview when requested by message surfaces | One subject-specific presentation owner | Yes |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | web composer UI | UI boundary | Use attachment descriptor + upload store + presentation helper | Keeps UI focused on interaction only | Yes |
| `autobyteus-web/applications/socratic_math_teacher/components/AppContextFileArea.vue` | web composer UI | UI boundary | Same attachment descriptor and presentation behavior for application composer, including the same Electron-native local-path drag/drop preservation used by the main composer | Reuses same client owner | Yes |
| `autobyteus-web/components/conversation/UserMessage.vue` | web message UI | UI boundary | Render previewable image attachments as compact thumbnails, pass click events to the shared presentation/open boundary, and keep filename-chip fallback for the rest | Message view stops depending on raw path and local routing logic | Yes |
| `autobyteus-web/applications/socratic_math_teacher/components/AppUserMessage.vue` | web message UI | UI boundary | Mirror the same thumbnail-vs-chip behavior and delegate click routing to the shared presentation/open boundary | Keeps app message UI aligned with standard conversation UI | Yes |
| `autobyteus-web/stores/agentRunStore.ts` | web send orchestration | Send owner | Finalize uploaded draft attachments after run creation/restore and before optimistic append/send | Existing owner already governs send lifecycle | Yes |
| `autobyteus-web/stores/agentTeamRunStore.ts` | web send orchestration | Team send owner | Finalize uploaded draft attachments after team creation/restore and before optimistic append/send | Existing owner already governs team send lifecycle | Yes |
| `autobyteus-web/stores/applicationRunStore.ts` | web send orchestration | Application send owner | Reuse the same focused-member finalization step using temp/final `teamRunId` | Existing owner already governs app-team send lifecycle | Yes |
| `autobyteus-web/types/conversation.ts` | web shared model | Shared structure | Shared attachment descriptor union | Shared model extension | Yes |

## Ownership Boundaries

- Composer/app UIs must depend on `ContextFileUploadStore` for upload/delete/finalize entrypoints.
- Composer/app/message UIs must depend on `contextAttachmentPresentation` for key/label/open/preview behavior and must not fork attachment-open routing logic locally.
- Send stores remain the authoritative owners of send sequencing; attachment finalization must happen inside send owners, not inside UI components.
- REST transport routes are thin facades over context-file services.
- Draft layout derivation, cleanup, and stored-filename validation remain internal to server context-file services.
- Prompt processor and Codex mapper must use `ContextFileLocalPathResolver`; they must not parse context-file URLs or memory paths directly.
- Shared-media upload/storage remains encapsulated behind the shared-media subsystem and is no longer a dependency of browser composer attachment flows.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ContextFileUploadStore` | owner-descriptor building, REST upload/finalize/delete calls | Composer/app UI components and send stores | UI components calling raw `/upload-file` or raw context-file routes directly | Add explicit upload/delete/finalize methods on the store |
| `contextAttachmentPresentation` | label/key derivation, preview URL resolution, authoritative open/preview routing behavior | Composer/app/message UI components | Components directly parsing locator strings for labels, previewability, or open mode, or directly calling `fileExplorerStore.openFile/openFilePreview(...)` based on attachment properties | Expand helper methods, not per-component string logic |
| `context-files` REST routes | upload/finalize/read/delete services + layout/cleanup internals | Browser clients | Callers constructing memory paths themselves | Expose explicit owner-descriptor APIs, not filesystem concerns |
| `ContextFileLocalPathResolver` | route parsing + safe path resolution | Prompt processor, Codex mapper | Processors parsing URLs or memory roots themselves | Expand resolver methods, not ad hoc parsing |
| `MediaStorageService` | shared media root and list/delete behavior | Avatar/shared-media callers only | Composer attachment flows depending on media root | Move composer flows entirely to context-file subsystem |

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `POST /rest/context-files/upload` | Composer attachment upload | Upload one browser file into draft owner storage | explicit draft owner descriptor + multipart file | Returns uploaded descriptor fields including `storedFilename`, `displayName`, `locator`, `phase='draft'` |
| `POST /rest/context-files/finalize` | Draft attachment finalization | Move one or more draft attachments into final owner | explicit draft owner descriptor + explicit final owner descriptor + `attachments[{ storedFilename, displayName }]` | Returns normalized uploaded descriptors with final URLs while preserving the original uploaded label |
| `GET /rest/drafts/agent-runs/:draftRunId/context-files/:storedFilename` | Draft standalone attachment read | Stream draft attachment bytes | `draftRunId + storedFilename` | Preview only |
| `DELETE /rest/drafts/agent-runs/:draftRunId/context-files/:storedFilename` | Draft standalone attachment delete | Delete one staged standalone attachment | `draftRunId + storedFilename` | Used on composer remove/clear |
| `GET /rest/drafts/team-runs/:draftTeamRunId/members/:memberRouteKey/context-files/:storedFilename` | Draft team-member attachment read | Stream draft attachment bytes | `draftTeamRunId + memberRouteKey + storedFilename` | Used for team and application focused-member drafts |
| `DELETE /rest/drafts/team-runs/:draftTeamRunId/members/:memberRouteKey/context-files/:storedFilename` | Draft team-member attachment delete | Delete one staged team-member attachment | `draftTeamRunId + memberRouteKey + storedFilename` | Used for team and application focused-member drafts |
| `GET /rest/runs/:runId/context-files/:storedFilename` | Final standalone run attachment read | Stream final attachment bytes | `runId + storedFilename` | Final standalone route |
| `GET /rest/team-runs/:teamRunId/members/:memberRouteKey/context-files/:storedFilename` | Final team-member attachment read | Stream final attachment bytes | `teamRunId + memberRouteKey + storedFilename` | Final team-member route for team and application flows |
| `ContextFileUploadStore.uploadAttachment(...)` | Frontend composer upload | Upload one browser attachment | explicit draft owner descriptor + `File` | Returns `UploadedContextAttachment` |
| `ContextFileUploadStore.deleteDraftAttachment(...)` | Frontend draft removal | Delete one uploaded draft attachment | explicit draft owner descriptor + uploaded descriptor | No-op for workspace/external items |
| `ContextFileUploadStore.finalizeDraftAttachments(...)` | Frontend draft finalization | Finalize staged uploaded attachments before send | draft owner descriptor + final owner descriptor + attachment list | Returns normalized list with final uploaded locators |
| `contextAttachmentPresentation.openAttachment(...)` | Web attachment presentation | Open or preview attachment correctly through one authoritative routing boundary | shared descriptor union + caller options (`workspaceId`, `openWorkspaceFile`, `openFilePreview`, `preferFileViewerForPreviewableImages`, runtime flags) | Uses workspace open for `workspace_path`; when caller requests File Viewer preview and the attachment is a previewable uploaded/non-workspace image, routes that attachment into `fileExplorer.openFilePreview(...)`; otherwise uses browser open for uploaded/external URLs. Callers pass capabilities only and must not duplicate the routing branch locally. |
| `ContextFileLocalPathResolver.resolve(locator)` | Final context-file URL resolution | Convert final run-scoped context-file URL to local absolute path | final standalone/team-member URL or external/local path | Draft URLs are rejected from send-time resolution |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Final attachment route shape | `GET /rest/runs/run_abc/context-files/ctx_f93ad1__diagram.png` and `GET /rest/team-runs/team_abc/members/solution_designer/context-files/ctx_f93ad1__diagram.png` | `GET /rest/files/images/uuid.png` or `GET /rest/runs/run_abc/file-change-content?path=context_files/a.png` | Shows why ownership is run/member scoped and filename-based |
| Uploaded descriptor after upload | `{ kind:'uploaded', id:'ctx_f93ad1__diagram.png', storedFilename:'ctx_f93ad1__diagram.png', locator:'/rest/drafts/agent-runs/temp-run-1/context-files/ctx_f93ad1__diagram.png', displayName:'diagram.png', phase:'draft', type:'Image' }` | `{ path:'/rest/files/images/uuid.png', type:'Image' }` | Shows how UI keeps label and stable identity separate from locator |
| Uploaded descriptor after finalize | `{ kind:'uploaded', id:'ctx_f93ad1__diagram.png', storedFilename:'ctx_f93ad1__diagram.png', locator:'/rest/runs/run_123/context-files/ctx_f93ad1__diagram.png', displayName:'diagram.png', phase:'final', type:'Image' }` | `{ path:'/rest/drafts/agent-runs/temp-run-1/context-files/ctx_f93ad1__diagram.png', type:'Image' }` | Shows draft-to-final transition keeps filename/id stable while locator changes |
| Finalize request payload | `{ draftOwner:{ kind:'agent_draft', draftRunId:'temp-run-1' }, finalOwner:{ kind:'agent_final', runId:'run_123' }, attachments:[{ storedFilename:'ctx_f93ad1__Quarterly_notes_2026.txt', displayName:'Quarterly notes 2026 ???.txt' }] }` | `{ draftOwner:{...}, finalOwner:{...}, storedFilenames:['ctx_f93ad1__Quarterly_notes_2026.txt'] }` | Shows finalize preserves the original uploaded label even when the stored filename is sanitized |
| UI label/open behavior | `UserMessage` shows a compact thumbnail for a previewable image attachment, uses `displayName='diagram.png'` as tooltip/fallback label, and delegates thumbnail clicks to `contextAttachmentPresentation.openAttachment(...)` with `openWorkspaceFile:(locator, workspaceId)=>fileExplorerStore.openFile(locator, workspaceId)` plus `openFilePreview:(url, workspaceId)=>fileExplorerStore.openFilePreview(url, workspaceId)` so the helper alone routes the image into the right-side File Viewer using a previewable absolute URL; non-image chips still delegate through the same helper | `UserMessage` renders `/rest/runs/run_123/context-files/ctx_f93ad1__diagram.png` as raw text, opens a separate modal, routes thumbnail clicks to the Artifacts panel, or hand-codes `if (uploaded && previewUrl) fileExplorerStore.openFile(...)` in the component | Closes the review gap on message/composer/app surfaces while improving image readability and matching dragged-file behavior |
| Processor dependency | `UserInputContextBuildingProcessor -> ContextFileLocalPathResolver` | `UserInputContextBuildingProcessor -> parse URL itself + inspect memory roots` | Enforces one authoritative resolver boundary |

## Legacy Removal / Non-Compatibility Rule

- This change is a clean-cut replacement for browser composer uploads.
- Remove old composer-specific `/rest/files/...` generation, preview identity, and runtime parsing/normalization paths in scope.
- Do not add any composer-specific compatibility resolver or dual-path behavior for old attachment flows.
- Keep the shared-media `/rest/files/...` route only because supported non-composer features still use it (for example avatars/shared media). That retained route is not part of the new composer-upload contract.
- Data migration that rewrites already-persisted conversation attachment URLs is not included in this ticket.

## Migration / Refactor Sequence

1. Add server `context-files` subsystem: layout rules, upload/finalize/read/delete/cleanup services, REST routes.
2. Add stored-filename generation rules and draft/final route descriptor builders.
3. Add web shared attachment descriptor and `contextAttachmentPresentation` helper.
4. Add `ContextFileUploadStore` with upload/delete/finalize methods.
5. Switch composer components (`ContextFilePathInputArea.vue`, application equivalent) to the new store and presentation helper, while preserving the Electron-native `getPathForFile(...)` branch for OS drag/drop in every in-scope composer UI.
6. Extend `contextAttachmentPresentation.openAttachment(...)` so it becomes the single authoritative attachment-open/preview owner for UI surfaces, including:
   - workspace/local attachments -> existing file-explorer open path
   - uploaded previewable images -> file-explorer preview path using an absolute run-scoped URL
   - other uploaded/external attachments -> existing generic open behavior
7. Update `UserMessage.vue` and application-specific `AppUserMessage.vue` to render compact thumbnails for previewable image attachments, delegate thumbnail/click routing to `contextAttachmentPresentation`, pass the needed file-explorer callbacks into that helper, remove any local uploaded-image `fileExplorerStore.openFile/openFilePreview(...)` routing branches, and use filename-chip fallback for the rest.
8. Update standalone/team/application send stores so sends do:
   - create/restore final run/team identity if needed
   - finalize uploaded draft attachments
   - rewrite uploaded descriptors to final run-scoped URLs
   - only then append optimistic message and send WebSocket payload
9. Add `ContextFileLocalPathResolver` and update `UserInputContextBuildingProcessor` and `CodexUserInputMapper` to depend on it.
10. Remove composer dependency on shared upload store and remove dead shared-media context parsing for new behavior.
11. Remove in-scope composer-specific legacy `/rest/files/...` dependencies; do not add migration or compatibility seams for old composer attachment flows.

## Key Tradeoffs

- Stored-filename lookup is simpler than a manifest-backed `attachmentId` design and matches the user’s preferred complexity level, but it requires strong filename validation to prevent path traversal and collisions.
- Staging all browser uploads in draft storage keeps delete/TTL behavior simple and uniform, but it adds a required finalize step before every send.
- Separate standalone/team-member final read routes keep ownership explicit and avoid ambiguous owner lookup.
- A shared web attachment descriptor adds structure to UI state, but it removes the current path overloading problem and is necessary for clean behavior across composer/app/message surfaces.
- Clean-cut removal of composer-specific `/rest/files/...` behavior keeps the codebase aligned with the no-legacy principle, while shared-media `/rest/files/...` remains only for still-supported non-composer features.

## Risks

- If any send path skips finalization, draft URLs could reach runtime processors and fail local-path resolution.
- Stored-filename generation must sanitize aggressively and preserve extension behavior correctly for uncommon MIME types.
- Draft cleanup is opportunistic, so abandoned drafts may survive until the next upload/finalize/delete trigger rather than disappearing exactly at the 24-hour boundary.
- No read-model or data migration is included here; any persisted old attachment URLs that still exist in stored conversations are outside this ticket’s implementation scope.

## Guidance For Implementation

- Generate stored filenames server-side only; clients must never propose final stored filenames.
- Keep stored filename stable from draft upload through final storage.
- Store uploaded files directly under `context_files/<storedFilename>` in final storage and the mirrored draft subtree; do not add manifest files or nested `files/` directories.
- Sanitize stored filenames so route parameters can never include `/`, `..`, or ambiguous encoding tricks.
- Ensure finalize is idempotent per `(draft owner, final owner, storedFilename)` so retries do not duplicate files.
- Make draft routes preview/delete-only; send flows must normalize uploaded descriptors to final routes before runtime submission.
- Centralize final context-file URL parsing in `ContextFileLocalPathResolver`; do not copy parsing into processors.
- Remove composer context-upload dependence on shared-media upload boundaries as part of the same change, not as a later cleanup.
