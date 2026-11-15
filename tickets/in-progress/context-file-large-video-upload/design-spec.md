# Design Spec — Large video attachments, per-type configurable limits, localized upload failures

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-002. DEC-002..DEC-009 approved by the Solution Designer within the direction (user informed); DEC-001 (2048 MiB media default) decided by `/project_task_manager` under the user's delegation, message of 2026-11-15 ("use the recommendation … Proceed: approval recorded").
- Behavior-defining supplements: None.
- User approval of the design: `Not required` (the direction does not ask for it).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (same folder)
- Authorities read (2026-11-15): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root, incl. rules 9 and 11 and the Node Access Model pointer), `autobyteus-server-ts/docs/design/node_access_model.md` (NA-2), `autobyteus-web/docs/localization.md`, `TESTING.md`.
- Conflicts or discrepancies: None.

## Current-State Read

The composer (one component, `ContextFilePathInputArea.vue`, used by `ChatComposer.vue` and `AgentUserInputForm.vue` on desktop and the phone bundle) calls `useContextAttachmentComposer.uploadFiles` → `contextFileUploadStore.uploadAttachment` (axios, `POST /rest/context-files/upload`) → `registerContextFileRoutes` upload handler (`api/rest/context-files.ts:87-106`) → `ContextFileUploadService.uploadDraftAttachment` (`context-file-upload-service.ts:25-48`) → `writeContextFileUpload` (`context-file-upload-writer.ts:7-25`) → draft file. The size rule is one constant (`context-file-upload-policy.ts:4`) used by the writer, by the global multipart registration (`build-studio-server.ts:451`, which also caps `/upload-file`), and by `ProjectTaskContextStore` (`project-task-context-store.ts:20,29,145`). Every upload error becomes `400 {detail: <English message>}` (`context-files.ts:103-105`), and the web appends that detail to the localized sentence (`ContextFilePathInputArea.vue:274-289`). Streaming, cleanup on failure/abort, and the absence of timeouts/proxies are correct today (probes P1–P3, investigation notes). The native runtime base64-inlines audio/video for video-capable models (`media-input-sanitizer.ts:62-80` only filters `unsupported`; `gemini-prompt-renderer.ts:61-71` inlines).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: three packages (`autobyteus-server-ts`, `autobyteus-web`, `autobyteus-ts`); about 25 production files across the context-file policy, config/settings, two REST route groups, the Project Task store, the agent-tool contract text, the web composer store/composable/component, the Project Task web client/composable, localization catalogs, and the native runtime's media filter, plus tests and docs.
- Architectural risk: `High`
- Risk rationale: material contract changes — a new REST endpoint (`GET /rest/context-files/size-limits`), a changed error contract of both context-file upload routes (status codes and machine-readable body), two new node settings, changed agent-facing tool description text, and a changed provider-request rule in the native runtime. No persistence or security-boundary change.
- Escalation trigger: any need to change persisted context-file metadata, node access rules, the allowed type list, or the draft TTL; or evidence that a phone browser/WebView reports `File.type` differently from the multipart Content-Type (ASM-001) in a way the published media type list cannot cover.

## Architecture Investigation Evidence

| Source / Probe | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Probe P1–P3 | `probes/probe-results-2026-11-15.txt` | Reproduced message; 600 MiB streams at RSS ≤ 180 MiB; abort leaves no file | No transport rework; writer stays the byte owner | None |
| multipart source | `node_modules/@fastify/multipart/index.js:235-287` | Per-request `opts` deep-merged over plugin options | Each route passes its own `limits.fileSize` | None |
| multipart source | same, `:462-468` | Streaming API: size hit marks `truncated`, file stream ends | Writer maps `truncated` to the typed too-large error | None |
| Fastify config | `node_modules/fastify/lib/config-validator.js` | `requestTimeout` 0 | No timeout change | None |
| Route permissions | `src/api/security/node-route-permissions.ts:118`; node access model NA-2 | Unlisted REST routes open to owner and phone | New GET route readable by a paired phone with no permission row | None |
| Settings pattern | `src/config/task-execution-idle-shutdown-setting.ts`, `server-settings-service.ts:194-210` | Typed setting = key, default, range, `resolve…()` at use time, `normalize…ForPersistence` registered | Same pattern for the two limits | None |
| Web upload transport | `stores/contextFileUploadStore.ts:58-79`, `services/api.ts` | axios instance per bound node; no progress/abort | axios `onUploadProgress` + `signal` | None |
| Inline path | `autobyteus-ts/src/llm/utils/media-input-sanitizer.ts`, `media-payload-formatter.ts:48-70,108-119` | Sanitizer is the single provider-neutral media filter for both request paths (`llm-request-assembler.ts:113`, `llm-phase-summary-port.ts:106`) | Inline size guard belongs there | None |
| Phone probe | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (MSP-28..31 attachments) | Phone bundle attachment cases exist | Add phone cases there | None |

## Intended Change

Replace the single 25 MiB constant with a per-type, configurable size policy (file limit 25 MiB, media limit 2048 MiB by default), published to clients and enforced by each upload route; give over-limit and unsupported-type refusals a machine-readable reason and limit; make the web refuse over-limit files before sending, show progress and cancel, and render one localized message per failure reason; stop the native runtime from inlining local media larger than 25 MiB.

## Change Scope (Mandatory)

- In scope: UC-001..UC-007. Areas: context-file size policy and upload errors; two new node settings; context-file and Project Task upload routes; Project Task local-copy check; agent-tool `context_files` description text; `/upload-file` gets its own per-request limit (value unchanged); web composer upload store/composable/component and localization; Project Task web upload client/composable; native-runtime media sanitizer; docs that state the old limit or describe uploads.
- Derived consumers: `CONTEXT_FILE_MAX_BYTES` readers — writer, studio-server multipart registration, Project Task store (two checks), tests (`context-file-upload-writer.test.ts`, `project-task-local-context-files.test.ts`, `project-task-boundaries.e2e.test.ts`, route integration tests). Each moves to the new policy; the constant is removed. The upload error body is read by the web store and the Project Task web client only (grep `detail` readers: `useContextAttachmentComposer.ts:91-95`, `projectTaskContextClient.ts:27-30`); both move to the typed failure. Tool description text is asserted in `project-task-tools.test.ts:125` and `task-tool-runtime-parity.test.ts:90,136`; update them.
- Deliberately left alone: Memory Sync (FU-001, own Task; release order RC-001); draft paste re-download (FU-002); `Context Files (n)` label (FU-003); allowed type list; draft TTL; finalization; agent runtimes other than the native one (they already pass video as a path); avatar upload behavior.
- Follow-ups: FU-001, FU-002, FU-003.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing (evidence) | Change / Preserved | Target path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 002, 005; AC-001..005, 015 | Pick/drop/paste in composer | 25 MiB for all (policy.ts:4) | Per-type limits, pre-check, streaming kept | DS-001, DS-002 |
| BEH-002 | User | REQ-004, 006; AC-005, 006, 009 | Failure | raw detail appended | One localized message per reason | DS-001 return, DS-003 |
| BEH-003 | System | REQ-007, 008; AC-007, 008 | Over-limit/abort/cancel | writer cleanup (P1, P3) | Preserved, cancel added | DS-001 |
| BEH-005 | System | REQ-009; AC-010 | Next upload after 24 h | cleanup service | Preserved | unchanged |
| BEH-006 | System | REQ-009; AC-001 | Send | finalize + `Reference files:` | Preserved | unchanged |
| BEH-007 | System | REQ-010; AC-011 | Native turn with media | sanitizer filters only unsupported | Local media > 25 MiB not inlined | DS-005 |
| BEH-008 | User/Contract | REQ-003, 011; AC-012 | Project Task upload / tool copy | same constant, raw text | Same policy, typed errors, localized | DS-004 |
| BEH-009 | User | REQ-006; AC-009 | Remove fails | raw detail appended | Localized only | DS-003 |
| BEH-010 | User | AC-013 | Avatar upload | plugin 25 MiB | Preserved via its own route limit | — |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | REQ / AC | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/large-upload-probe.integration.test.ts.txt` | Reproduction, streaming and abort measurement | AC-002, 007, 008, 015 | P1 becomes a regression test with the new default; P3 shape becomes the abort test | Evidence |
| `follow-ups.md` | Out of scope | — | FU-001..003 | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (with a bug fix in the error message)
- Current design issue found: `Yes`
- Structural triggers:
  - *Several kinds or forms* (P1): one policy serves three entry forms (composer upload, Project Task upload, Project Task tool local copy) and two subjects (media, other). Each form is traced in the behavior map; all use the one policy function.
  - *Derived data* (P11): the client must know which limit applies. Rather than recomputing the media classification in the web, the server publishes `mediaMimeTypes` with the limits; the client reads them.
  - *Responsibility overload / coupling*: the context-file constant also caps the unrelated avatar route through the global plugin registration (`build-studio-server.ts:451`). Fixed by per-route limits.
  - *Vocabulary drift* (P15): "too large" is an English sentence today, not a reason. The reason becomes a code (`CONTEXT_FILE_TOO_LARGE`) with the limit.
  - Ruled out: repeated coordination (one resolver, called at each operation's entry), ambiguous boundary (the new endpoint has one subject), legacy pressure (clean cut, no old error shape kept).
- Root cause classification: `Missing Invariant` (the error carries no reason or limit, so no client can localize) plus `Boundary Or Ownership Issue` (context-file policy governing the avatar route).
- Refactor needed now: `Yes`, bounded: remove the shared constant and the global multipart limit; each route owns its limit.
- Evidence: rows above.
- Design response: below.
- Intentional deferrals: FU-001..003.

## Terminology

- **File limit** — the maximum size of a context file that is not video or audio (setting `AUTOBYTEUS_CONTEXT_FILE_MAX_MB`).
- **Media limit** — the maximum size of a video or audio context file (setting `AUTOBYTEUS_CONTEXT_FILE_MEDIA_MAX_MB`). "Media" here means video and audio only; images use the file limit. (The native runtime's "media input" — image, audio, video — keeps its existing meaning inside `autobyteus-ts`; the new inline cap is named `INLINE_MEDIA_MAX_BYTES` there.)
- **Size limits** — the pair, as published by `GET /rest/context-files/size-limits`.
- `GLOSSARY.md` has no context-file entries; these terms are local to this feature and appear in its docs.

## Legacy Removal Policy (Mandatory)

- Obsolete: `CONTEXT_FILE_MAX_BYTES`; the global multipart `fileSize` tied to it; the English error strings as the only error information; `error.detail` appended in the composer message; the duplicate allowed-type check in `ContextFileUploadService` (the writer owns it).
- Compatibility kept: `None` (DESIGN.md rule 9: web and server change together).

## Persisted Data / State Transition Decision

- `Not Affected`: no stored shape changes. Drafts, finals, Project Task manifests (`sizeBytes` already stored) are untouched. New settings are ordinary server settings with defaults.

## Data-Flow Spine Inventory

| Spine ID | Scope | BEH | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | 001, 003 | Composer pick | Draft file on node / item in composer | `useContextAttachmentComposer` (client), upload route (server) | The user's journey |
| DS-002 | Primary | 001 | Owner saves a setting / env | Next upload's enforcement and pre-check | `context-file-size-limit-settings` | Configurability |
| DS-003 | Return | 002, 009 | Server refusal / network error / cancel | One localized message (or none for cancel) | composable → component | The reported defect |
| DS-004 | Primary | 008 | Project Task upload or tool `context_files` | Task context file | `ProjectTaskContextStore` | Same policy, second surface |
| DS-005 | Primary | 007 | Native turn with media | Provider request | `sanitizeMediaInputMessages` | Agent/provider safety |

## Primary Execution Spine(s)

- DS-001: `Composer (pick) -> useContextAttachmentComposer.uploadFiles -> contextFileUploadStore.readSizeLimits -> [pre-check per file] -> contextFileUploadStore.uploadAttachment (progress, signal) -> POST /rest/context-files/upload -> ContextFileUploadService.uploadDraftAttachment -> writeContextFileUpload -> draft file`
- DS-002: `Server settings / env -> resolveContextFileSizeLimits() -> {upload route cap + writer per-type check, GET size-limits -> web pre-check}`
- DS-004: `Task composer / agent tool -> ProjectTaskContextStore.upload | copy local sources -> writeContextFileUpload | contextFileMaxBytesFor -> task context file`
- DS-005: `LLMRequestAssembler.buildRequestPackage -> sanitizeMediaInputMessages -> [stat local source; > INLINE_MEDIA_MAX_BYTES -> diagnostic, dropped] -> renderer`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | On each pick the composable reads the node's current size limits once, refuses any file over its limit (no request), then uploads the rest in parallel with per-item progress and an abort controller. The route resolves the limits once per request, caps multipart at the larger limit, and the writer enforces the file's own limit while streaming. | context file, size limits | composable / route | failure classification, size formatting |
| DS-002 | A saved or environment value is parsed at each use; an invalid stored value falls back to the default; saving an invalid value is refused by the normalizer. | setting | settings file | settings registry |
| DS-003 | Every failure becomes a typed `ContextFileUploadFailure` (`too_large` + maxBytes, `unsupported_type`, `interrupted`, `other`); the composable groups failures by reason; the component renders one localized line per reason; cancel produces no failure. | failure | composable | localization catalogs |
| DS-004 | Same policy and typed errors; the Project Task REST guard maps the typed errors; the tool path keeps `TASK_CONTEXT_INVALID` with a message naming the applicable limit. | task context file | store | route mapping |
| DS-005 | Before rendering, the sanitizer stats local media paths and omits any above 25 MiB with a diagnostic; the path remains in the message text's `Reference files:`. | media source | sanitizer | — |

## Spine Actors / Main-Line Nodes

Composer component; `useContextAttachmentComposer`; `contextFileUploadStore`; `POST /rest/context-files/upload` and `GET /rest/context-files/size-limits` routes; `ContextFileUploadService`; `writeContextFileUpload`; `resolveContextFileSizeLimits`; `ProjectTaskContextStore`; Project Task REST routes; `sanitizeMediaInputMessages`.

## Ownership Map

- `context-file-upload-policy.ts` (domain): allowed types, media classification, per-type max for a MIME type, the upload cap (larger limit). Owns the rule; holds no setting I/O.
- `context-file-size-limit-settings.ts` (config): keys, defaults, ranges, parse, persistence normalizers, `resolveContextFileSizeLimits()` → bytes. Owns configuration.
- `context-file-upload-errors.ts` (domain): `ContextFileTooLargeError(maxBytes)`, `UnsupportedContextFileTypeError(mimeType)`.
- `writeContextFileUpload`: byte enforcement, type check, exclusive create, cleanup. Signature `(file, filePath, limits)`.
- Upload routes: resolve limits once per request, pass multipart cap and limits down, map typed errors to HTTP.
- `contextFileUploadStore`: transport (limits read, upload with progress/abort), translation of transport outcomes into `ContextFileUploadFailure` / cancellation.
- `useContextAttachmentComposer`: sequence (limits → pre-check → uploads), placeholders with progress and cancel, failure grouping.
- `ContextFilePathInputArea.vue`: rendering only.
- `sanitizeMediaInputMessages`: provider-neutral media filtering, now including the inline size cap.

## Thin Entry Facades / Public Wrappers

| Facade | Owner behind | Why | Must not own |
| --- | --- | --- | --- |
| `GET /rest/context-files/size-limits` | `resolveContextFileSizeLimits` + policy `mediaContextFileMimeTypes` | Publish the policy to clients | Any client-specific formatting |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `CONTEXT_FILE_MAX_BYTES` (`context-file-upload-policy.ts:4`) | Per-type configurable limits | `contextFileMaxBytesFor`, `resolveContextFileSizeLimits` | All readers listed in Change Scope |
| `limits.fileSize` in `build-studio-server.ts:451` | Each multipart route owns its cap | per-request `request.file({limits})` in the three routes | Plugin registered without `limits` |
| `"Uploaded file is too large."` / `"Unsupported file type: …"` thrown as plain `Error` in the writer | Typed errors | `context-file-upload-errors.ts` | `/upload-file` keeps its own 413 text (its own route) |
| Allowed-type check in `ContextFileUploadService.uploadDraftAttachment` (`:29-31`) | Duplicate of the writer's | writer | — |
| `detail` in `ContextAttachmentComposerError` and `errorDetail()` (`useContextAttachmentComposer.ts:32-34,91-95`) | Raw text never shown | `ContextFileUploadFailure` per file | Raw error still logged to console |
| `error.detail` concatenation (`ContextFilePathInputArea.vue:288`) | Same | grouped localized lines | — |
| `e.message` as Project Task upload error text (`useProjectTaskDraft.ts:56`) | Same | localized by failure reason | Non-upload errors there unchanged (out of scope) |

## Return Or Event Spine(s)

DS-003 above. Network error without a response (axios `ERR_NETWORK`, or `ECONNABORTED`) → `interrupted`; axios `CanceledError` (our abort) → cancellation, not a failure; HTTP 413 + `CONTEXT_FILE_TOO_LARGE` → `too_large(maxBytes)`; 415 + `CONTEXT_FILE_TYPE_UNSUPPORTED` → `unsupported_type`; anything else → `other`.

## Bounded Local / Internal Spines

- Writer (parent `writeContextFileUpload`): `multipart stream -> counting Transform (> maxBytes → ContextFileTooLargeError) -> file stream (wx)`; after pipeline: `truncated → ContextFileTooLargeError`; on any error remove the created file. Unchanged shape; only the limit and error types change.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk if on main line |
| --- | --- | --- | --- | --- | --- |
| Failure classification (`contextFileUploadFailure.ts`) | DS-003 | store, Project Task client | Map status/body/network error to a reason | Two transports, one meaning | Each caller re-parses bodies differently |
| Size-limit parsing and per-file max (`contextFileSizeLimits.ts`) | DS-001, DS-004 | composable, Project Task composable | Parse published limits; pick limit by `file.type`; format for display | Shared by two composers | Duplicated rule |
| Settings registration | DS-002 | settings file | Make the keys editable with validation | Existing registry | — |

## Ownership Boundaries

Server: routes are the HTTP boundary; services/stores own the operation; the writer owns bytes; the policy owns the rule; the settings file owns configuration. Web: the store owns transport; the composable owns the sequence; the component renders. The native runtime's sanitizer owns what reaches renderers.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | Fix if thin |
| --- | --- | --- | --- | --- |
| `writeContextFileUpload` | byte counting, type check, cleanup | `ContextFileUploadService`, `ProjectTaskContextStore.upload` | callers re-checking types or sizes themselves | extend writer |
| `contextFileUploadStore` | axios, error translation | composable | composable reading `error.response.data` | extend store |
| `resolveContextFileSizeLimits` | settings access, parsing | routes, `ProjectTaskContextStore` local copy | reading `appConfigProvider.config.get(KEY)` elsewhere | — |

## Dependency Rules

- `config/context-file-size-limit-settings.ts` → `context-files/domain/context-file-upload-policy.ts` (for the `ContextFileSizeLimits` type) only. Domain never imports config.
- Routes → settings resolver + services; services/stores → writer + policy; writer → policy + errors.
- Web: component → composable → store → `services/api`; utilities are leaf modules. Components never read raw error bodies.
- `autobyteus-ts` change is self-contained (no server import).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity / shape | Notes |
| --- | --- | --- | --- | --- |
| `GET /rest/context-files/size-limits` → `200 {fileMaxBytes:number, mediaMaxBytes:number, mediaMimeTypes:string[]}` | node's context-file size policy | publish current limits | none | owner and phone (NA-2) |
| `POST /rest/context-files/upload` errors | upload refusal | `413 {code:"CONTEXT_FILE_TOO_LARGE", detail, maxBytes}`, `415 {code:"CONTEXT_FILE_TYPE_UNSUPPORTED", detail}`, other `400 {detail}` | — | `detail` stays English for logs/API users; clients localize by `code` |
| Project Task `POST …/context-files` errors | same | `413 {error:{code:"CONTEXT_FILE_TOO_LARGE", message, maxBytes}}`, `415 {error:{code:"CONTEXT_FILE_TYPE_UNSUPPORTED", message}}`; other codes unchanged | — | route group's existing `{error}` shape |
| `writeContextFileUpload(file, filePath, limits): Promise<number>` | bytes | enforce | `ContextFileSizeLimits` | throws typed errors |
| `ContextFileUploadService.uploadDraftAttachment(owner, file, limits)` | draft upload | — | — | — |
| `ProjectTaskContextStore.upload(projectId, draftId, file, limits)` | task draft upload | — | — | local copy resolves limits itself |
| `contextFileUploadStore.readSizeLimits()`; `uploadAttachment({owner, file, signal, onProgress})` | transport | — | — | throws `ContextFileUploadError{failure}`; abort rethrows the cancel |
| `projectTaskContextClient.sizeLimits()`; `upload()` throws `ContextFileUploadError` for 413/415 | transport | — | — | — |
| Settings `AUTOBYTEUS_CONTEXT_FILE_MAX_MB` (1–1024, default 25), `AUTOBYTEUS_CONTEXT_FILE_MEDIA_MAX_MB` (1–10240, default 2048) | configuration | — | whole MiB | read per use |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| size-limits GET | Yes | Yes | Low | — |
| upload error bodies | Yes | Yes | Low | — |
| writer signature | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Consistent | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| per-type limits | `ContextFileSizeLimits {fileMaxBytes, mediaMaxBytes}` | Yes | Yes (same names on wire and web) | Low | — |
| refusal reason | `CONTEXT_FILE_TOO_LARGE`, `CONTEXT_FILE_TYPE_UNSUPPORTED` | Yes | Yes | Low | — |
| native inline cap | `INLINE_MEDIA_MAX_BYTES` | Yes | "media" there = image/audio/video, as in that package | Low | documented in Terminology |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Configurable value | typed settings + `ServerSettingsService` predefined settings | Reuse | Established pattern |
| Byte enforcement | `writeContextFileUpload` | Extend | Already streams and cleans up |
| Upload progress/abort | axios | Reuse | Supported in browsers/WebView |
| Number formatting | `useLocalization().resolvedLocale` + `Intl.NumberFormat` | Reuse | Localization rule |
| Media filtering before providers | `sanitizeMediaInputMessages` | Extend | Single filter for both request paths |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| server `context-files` | policy, errors, writer, upload service | DS-001, DS-004 | Extend |
| server `config` + `services/server-settings-service` | settings | DS-002 | Extend |
| server `api/rest` | routes and HTTP mapping | DS-001, DS-003, DS-004 | Extend |
| server `projects` + `agent-tools/project-tasks` | Project Task store, tool text | DS-004 | Extend |
| web `stores`, `composables`, `components/agentInput`, `utils/contextFiles`, `localization` | composer | DS-001, DS-003 | Extend |
| web `services/projects`, `composables/projects` | Project Task composer | DS-004 | Extend |
| `autobyteus-ts` `llm/utils` | inline cap | DS-005 | Extend |

## Final File Responsibility Mapping

(The draft and final mappings coincide; the only extracted shared structures are the two web utilities and the server error file.)

| File | Area | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/context-files/domain/context-file-upload-policy.ts` (modify) | context-files | Remove `CONTEXT_FILE_MAX_BYTES`; add `ContextFileSizeLimits` type, `mediaContextFileMimeTypes` (allowed `video/*` and `audio/*`), `contextFileMaxBytesFor(mimeType, limits)`, `contextFileUploadCapBytes(limits)` |
| `…/context-files/domain/context-file-upload-errors.ts` (add) | context-files | `ContextFileTooLargeError` (`maxBytes`), `UnsupportedContextFileTypeError` (`mimeType`) |
| `…/context-files/services/context-file-upload-writer.ts` (modify) | context-files | `(file, filePath, limits)`; typed errors |
| `…/context-files/services/context-file-upload-service.ts` (modify) | context-files | pass `limits`; drop duplicate type check |
| `autobyteus-server-ts/src/config/context-file-size-limit-settings.ts` (add) | config | keys, defaults, ranges, parse, `resolveContextFileSizeLimits()`, two normalizers |
| `…/src/services/server-settings-service.ts` (modify) | settings | register the two settings with descriptions |
| `…/src/api/rest/context-files.ts` (modify) | api | upload: limits once, `request.file({limits:{fileSize: cap}})`, typed error mapping; add `GET /context-files/size-limits` |
| `…/src/api/rest/project-task-context-files.ts` (modify) | api | upload: same cap; `guarded` maps the two typed errors |
| `…/src/api/rest/upload-file.ts` (modify) | api | own constant `UPLOAD_FILE_MAX_BYTES = 25 MiB` passed per request |
| `…/src/compositions/build-studio-server.ts` (modify) | composition | register multipart without `limits` |
| `…/src/projects/context/project-task-context-store.ts` (modify) | projects | `upload(…, limits)`; typed errors propagate; local copy uses `resolveContextFileSizeLimits()` + `contextFileMaxBytesFor`, message names the applicable limit |
| `…/src/projects/services/project-task-context-drafts.ts` (modify) | projects | pass limits through `uploadContextFile` |
| `…/src/agent-tools/project-tasks/project-task-tool-contract.ts` (modify) | agent-tools | "Same file types and size limits as the app." (4 places) |
| `autobyteus-web/utils/contextFiles/contextFileSizeLimits.ts` (add) | web utils | type, `parseContextFileSizeLimits`, `contextFileMaxBytesFor(file, limits)`, `formatContextFileSizeLimit(bytes, locale)` |
| `autobyteus-web/utils/contextFiles/contextFileUploadFailure.ts` (add) | web utils | `ContextFileUploadFailure`, `ContextFileUploadError`, `contextFileUploadFailureFromResponse(status, body)`, `contextFileUploadFailureFromAxiosError(error)` |
| `autobyteus-web/stores/contextFileUploadStore.ts` (modify) | web | `readSizeLimits()`; `uploadAttachment` with `signal` + `onProgress`; throws `ContextFileUploadError` or rethrows cancel |
| `autobyteus-web/composables/useContextAttachmentComposer.ts` (modify) | web | pre-check, placeholder `progress` + `cancelUpload(key)`, failures grouped by reason; error type `{kind:'upload_failed', failures:[{fileName, failure}]} \| {kind:'remove_failed', fileNames} \| {kind:'uploads_unavailable'}` |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` (modify) | web | one line per reason; `NN%` and cancel on uploading items |
| `autobyteus-web/localization/messages/{en,zh-CN}/agentInput.generated.ts` (modify) | web | keys `upload_too_large`, `upload_unsupported_type`, `upload_interrupted`, `cancel_upload`, `upload_progress` |
| `autobyteus-web/services/projects/projectTaskContextClient.ts` (modify) | web | `sizeLimits()`; upload errors → `ContextFileUploadError` |
| `autobyteus-web/composables/projects/useProjectTaskDraft.ts` (modify) | web | pre-check; localized message by reason (reuses the composer's keys) |
| `autobyteus-ts/src/llm/utils/media-input-sanitizer.ts` (modify) | llm | `INLINE_MEDIA_MAX_BYTES = 25 MiB`; for a local-path source, `fs.stat` size > cap → diagnostic reason `too_large` ("…larger than 25 MB and was not sent inline; the agent can open it from its path."), dropped; applies to image, audio, video |
| Docs (modify) | docs | `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` (limits, settings, error codes, endpoint), `docs/modules/projects.md` and `docs/modules/agent_tools_mcp_server.md` (limit text), `autobyteus-web/docs/projects.md` (limit text), `autobyteus-web/docs/settings.md` (the two settings), `autobyteus-web/docs/chat.md` (progress, cancel, messages) |

## Reusable Owned Structures Check

| Structure | File | Owner | Why shared | Tight |
| --- | --- | --- | --- | --- |
| `ContextFileSizeLimits` (server) | policy | context-files | settings, routes, writer, store | Yes (two numbers) |
| Published limits + `mediaMimeTypes` (web) | `contextFileSizeLimits.ts` | web utils | two composers | Yes |
| `ContextFileUploadFailure` | `contextFileUploadFailure.ts` | web utils | two transports | Yes (discriminated union; `maxBytes` only on `too_large`) |

## Shared Structure / Data Model Tightness Check

All three: one meaning per field, no redundant attributes, low overlap risk.

## Applied Patterns

None beyond the existing typed-setting pattern.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; no new folders. The two new web utilities join the existing `utils/contextFiles/` folder; the server error file joins `context-files/domain/`; the settings file joins `src/config/`.

## Folder Boundary Check

All placements follow existing folders for the same concerns; risk Low.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Composer message | zh-CN, three over-limit videos: `无法附加 VID_1.mp4, VID_2.mp4, VID_3.mp4：文件超过 2 GB 大小限制。` | `无法附加 VID_1.mp4…。 Uploaded file is too large.` | The reported defect |
| Mixed reasons | two lines: `无法附加 a.mp4：文件超过 2 GB 大小限制。` / `无法附加 b.exe：不支持此文件类型。` | one line with the first detail | One message per reason |
| Limit display | 26214400 → `25 MB`; 2147483648 → `2 GB`; 1572864000 → `1.5 GB` (base 1024, ≤ 1 decimal, `Intl.NumberFormat(resolvedLocale)`) | `2048 MiB`, `2.0 GB` | — |
| Route cap | `request.file({ limits: { fileSize: contextFileUploadCapBytes(limits) } })`, writer enforces the per-type limit | raising the global plugin limit | Avatar route stays 25 MiB |
| Pre-check | `if (file.size > contextFileMaxBytesFor(file, limits)) failures.push({fileName, failure:{reason:'too_large', maxBytes}})` before any request | uploading and waiting for 413 | No wasted mobile data |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `{detail}`-only errors and parse English text in the web | Smaller change | Rejected | Typed codes (clean cut, DESIGN.md rule 9) |
| Keep `CONTEXT_FILE_MAX_BYTES` as alias of the file limit | Fewer edits | Rejected | Removed; readers move |
| Skip the pre-check when the limits cannot be read | Resilience | Rejected | A failed limits read reports every picked file as `interrupted` (no response) or `other`; the user retries |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server policy, errors, settings file, settings registration, writer, services/stores, routes (incl. `/upload-file` own limit, plugin without limits), size-limits route, tool text. Server unit + integration tests.
2. `autobyteus-ts` sanitizer cap + unit tests.
3. Web utilities, store, composable, component, catalogs; Project Task client/composable. Web unit tests, guards, typecheck.
4. Docs.
5. Phone-bundle case(s) in `mobile-shell-probe.mjs` (API/E2E stage may own; implementation leaves the web unit coverage complete).

## Key Tradeoffs

- One limits read per pick (one small GET) instead of a cache: always current after a settings change, no invalidation logic.
- Media limit applies to video and audio only; images stay on the file limit because images are inlined into model requests.
- Inline cap fixed at 25 MiB (not a setting): it protects providers and the runtime, and equals today's upload limit, so nothing that worked before changes.

## Risks

- R-001 Memory Sync (FU-001): release order RC-001.
- ASM-001: a phone reporting an empty `File.type` for a video gets the file limit in the pre-check; the server then classifies by the multipart Content-Type (also derived from `File.type`), so client and server agree; worst case a video with unknown type is refused as unsupported, as today.
- Disk use grows with large videos (owner-configurable).

## Guidance For Implementation

- Reproduction to start from: `probes/large-upload-probe.integration.test.ts.txt` P1 (26 MiB mp4 → today 400 "Uploaded file is too large."; after: 200 with the default media limit, and 413 `CONTEXT_FILE_TOO_LARGE` with a lowered setting).
- Tests (TESTING.md layers):
  - Server unit: writer at/over limit for media and non-media, truncated, unsupported, cleanup (AC-002, 003); settings parse/normalize/invalid/default (AC-004); policy classification.
  - Server integration: upload route with production-shaped registration over real HTTP: at limit, over limit (413 body), setting override without restart, abort cleanup (P3 shape), `/upload-file` still 25 MiB (AC-013), size-limits GET (and through the node access gate with a phone credential if an existing harness covers it); Project Task route mapping and tool local copy (AC-012). Update tests asserting the old constant/text.
  - autobyteus-ts unit: sanitizer cap at 25 MiB boundary for local files, non-local sources untouched (AC-011).
  - Web unit: store progress/abort/error translation; composable pre-check makes no request, grouping, cancel without error, interrupted mapping; component renders the zh-CN and en messages with name and limit, and a regression that the screenshot string (raw detail after the sentence) never renders (AC-005, 006, 007, 008, 009); Project Task composable messages (AC-012).
  - Web guards and typecheck; server typecheck.
  - Phone bundle (`test:e2e:mobile-shell`): over-limit pick shows the zh-CN message without a request; a large (> 25 MiB) video attaches with progress (AC-001, 005).
- Keep `detail` English on the wire for logs and API users; the UI never shows it.
- RC-001 goes into the delivery notes: release only with or after the Memory Sync Task.
