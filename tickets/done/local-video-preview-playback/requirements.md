# Requirements Doc

## Status

`Refined / explicitly approved — ready for architecture review round 6 after CR-005 design correction` — on 2026-07-18 the user approved both the video behavior basis and Option 1 for newly unsupported locator metadata: retain it in the current session/live echo, exclude it from executable/durable server payloads, and allow it to disappear after a fresh reload. Valid files and valid locators remain durable as before. CR-005 changes no user-visible outcome; it corrects the internal Electron capability boundary required to preserve approved PDF/Excel behavior.

## Goal / Problem Statement

When a user selects a supported local video from the Files panel in the packaged AutoByteus Electron app, the right-side preview must load metadata and support normal playback instead of remaining black at `0:00`. The fix must preserve the trusted local-file validation boundary, support media seeking without loading the whole source into renderer memory, and show a clear recovery state when a video cannot be played.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | On the base, Electron rejects the unprivileged local media response. The first reviewed implementation added a standard streaming scheme but preserved `local-file:///Users/...`; Electron canonicalized it to `local-file://users/...`, so the valid video still received `404` and entered the failure UI. | Selecting a supported local video loads a finite duration and allows play, pause, and seek. | The Files item, tab, and native-control interaction model remain unchanged. | FR-001, FR-002, FR-003 / AC-001, AC-002, AC-003 |
| BEH-002 | The base viewer silently leaves a black `0:00` element. The first implementation now correctly converts the canonicalization-triggered media failure into the approved accessible alert and Retry state; that working containment must survive URL-contract rework. | A missing, unreadable, invalid, or non-decodable video leaves loading deterministically and shows an accessible failure message with a retry action. | The preview remains read-only and does not modify or transcode the source file. | FR-004 / AC-004, AC-005 |
| BEH-003 | The base handler validates absolute readable regular files but discards media ranges. The first implementation added correct response policy yet used a standard-scheme URL whose empty authority allowed Chromium to reinterpret the first POSIX segment as hostname before validation. CR-005 then proved that enabling the additional viewer capabilities without a request-identity gate would also let ordinary HTTP or Blob child frames fetch local-file bytes. | The same validation remains authoritative; one unambiguous case-preserving URL contract carries a valid absolute path to MIME-correct full/range responses. Before the handler, only a live registered workspace-shell **main frame** may request the scheme; subframes, unregistered web contents, wrong/invalid identities, and invalid authority/path/range requests fail without bytes. | The trusted Electron-only capability boundary and main-process validation remain in place. No browser-partition, child-frame, remote-client, file-enumeration, write, Node, shell, `file://` bypass, or new binary IPC capability is added. | FR-001, FR-002, FR-005 / AC-003, AC-006, AC-007 |
| BEH-004 | File Explorer image/audio/PDF/Excel previews and embedded absolute workspace-image context thumbnails share `local-file://`. Fixed-authority rework corrected URL identity, but API/E2E round 3 showed that the reviewed `{ standard, stream }` privileges block PDF.js XHR and Excel Fetch before `protocol.handle` from both HTTP and packaged-representative `file://` origins. | Local video is fixed; image/audio/thumbnails remain compatible; and PDF.js XHR plus Excel Fetch reach the same canonical validated protocol only from the registered workspace-shell main frame. | Existing file-type selection, valid context-attachment presentation/open behavior, workspace routing, text IPC, object-URL authorization, viewer implementations, and non-video presentation remain unchanged. | FR-001, FR-005, FR-006 / AC-007, AC-008 |
| BEH-005 | The Context Files UI accepts pasted locator text; `hydrateContextAttachment` classifies `local-file://` as `external_url`; message send/projection retains it; presentation and type-only send partitioning treat it as executable. Valid legacy empty-authority POSIX and drive-authority Windows locators can therefore be stored or hydrated outside the two derived builders. Multi-character opaque authorities are retained as locators but the current main decoder rejects them, and an image-typed opaque locator can enter `image_urls` and fail runtime media normalization. | A valid legacy absolute local-file locator is transformed once at context ingestion/hydration into the canonical fixed-authority current model before presentation or a new send. Canonical locators remain canonical and executable. Unsupported opaque/wrong/adorned locators remain visible/removable in the composer and remain label metadata in the current local message without a preview/open action, but are excluded from `context_file_paths`, `image_urls`, and all server/runtime media execution so the text and valid attachments can still send. Existing historical records containing unsupported locators remain readable as metadata. Per the user's approved Option 1, a newly quarantined unsupported locator is not written to durable runtime projection and may disappear after fresh reload. | Valid text paste, valid attachment display/removal/message projection, non-local external locator behavior, and all existing executable attachment routing remain. | FR-005, FR-006, FR-007 / AC-007, AC-008, AC-010 |

## Investigation Findings

- The screenshot's source file exists at `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4`, is readable, and is a valid fast-start H.264 High Profile/yuv420p MP4 with duration `330.533333` seconds and size `13,620,424` bytes. `ffmpeg` decoded a sampled frame without error.
- The reported production path is `FileItem.vue -> useWorkspaceFileExplorer -> fileExplorerContentActions -> local-file:// -> Electron protocol.handle -> VideoPlayer.vue`. A second supported producer is `contextAttachmentPresentation -> local-file:// -> embedded absolute workspace-image thumbnail`.
- `electron/main.ts` installs `protocol.handle('local-file', ...)` only after `app.whenReady()` and never calls `protocol.registerSchemesAsPrivileged(...)` before ready.
- Electron's official protocol contract says media protocols must opt into `stream: true`; a same-version Electron 42.4.1 probe against the exact file reproduced `MediaError.code = 4` with current semantics and loaded the correct duration after adding the streaming privilege.
- The media request includes `Range: bytes=0-`, but the current handler discards it. A streaming-only probe could play from the start but reset an attempted seek to `0`. A standard streaming scheme with valid `206`, `Content-Range`, `Content-Length`, and `Accept-Ranges` behavior successfully sought both the reported 13 MB file and a representative 607 MB local MP4.
- API/E2E proved that standard-scheme consumption rewrites the old triple-slash `local-file:///Users/...` to handler URL `local-file://users/...`, losing the absolute path's first-segment identity before decoding.
- A corrective Electron 42.4.1 differential showed: stream-only preserves the old URL and handles the 13 MB video but fails the approved large-file later-range seek; standard+stream with fixed URL authority `local-file://local/<encoded absolute path>` preserves case/significant characters and successfully plays/seeks both videos.
- A repository trace confirmed the supported external-locator path `ContextFilePathInputArea paste -> hydrateContextAttachment -> external_url -> message send/hydration -> contextAttachmentPresentation`. Valid old empty-authority POSIX and drive-authority Windows forms can be transitioned before media presentation; arbitrary opaque authorities were never accepted as paths by the current main decoder.
- A retained Electron 42.4.1 authored/property/handler probe proved that standard-scheme normalization erases authored ports and credentials and lowercases the authority before `protocol.handle`, while query and fragment remain handler-observable. Handler requirements must therefore apply to the normalized request. Supported context ingestion can reject raw credentials/ports/query/fragments before DOM assignment.
- Architecture round 3 traced `unsupported_local_file(type: Image)` through the existing type-only send partition into `image_urls`, server `ContextFile(IMAGE)`, LLM media mapping, and media-source normalization. The current optimistic/local user message already retains the complete attachment objects independently of the executable WebSocket arrays, and team echo merging can preserve current non-executable state without adding a metadata-only server transport.
- Architecture round 4 accepted the AR-003 technical design but identified the fresh-reload disappearance of newly unsupported metadata as a user-visible history decision. After being shown the bounded current-session option versus a new metadata-only persistence feature, the user explicitly chose Option 1 on 2026-07-18: no added durable transport; valid files/locators continue to persist normally.
- API/E2E round 3 proved that `{ standard: true, stream: true }` serves image/audio/video but blocks PDF.js XHR and Excel Fetch before the handler. In Electron 42.4.1, `corsEnabled` alone serves XHR but not Fetch, `supportFetchAPI` alone serves neither cross-protocol consumer, and the combination serves both from HTTP and packaged-representative `file://` origins.
- A separate same-version security differential proved that enabling both capabilities without an authorization gate lets foreign-HTTP and same-origin Blob child frames receive local-file bytes. `protocol.handle` receives no usable origin/referrer/fetch-metadata headers, but default-session `webRequest.onBeforeRequest` retains the exact requesting `webContentsId` and `WebFrameMain`. Requiring the live registered shell's exact main frame preserved top-frame HTTP/file Fetch and XHR while canceling both child-frame requests before the handler with zero bytes.
- Durable probe detail is retained in [runtime-probe-evidence.md](./runtime-probe-evidence.md), [url-identity-probe-evidence.md](./url-identity-probe-evidence.md), and [fetch-capability-probe-evidence.md](./fetch-capability-probe-evidence.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md` | Runtime evidence for the reported file, current Electron failure, scheme privileges, byte ranges, playback, and seek | FR-001, FR-002, FR-003, FR-005 | AC-001, AC-002, AC-003, AC-006, AC-007 | Complete / approval `N/A` | Supports the requirements; does not define additional intended behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md` | Corrective runtime evidence for standard-scheme canonicalization, stream-only limits, fixed-authority identity, authored/property/handler normalization, response matrix, and small/large seek | FR-001, FR-002, FR-003, FR-005, FR-006, FR-007 | AC-001, AC-002, AC-003, AC-006, AC-007, AC-009, AC-010 | Complete / approval `N/A` | Corrects the internal URL/privilege evidence and constrains the raw-ingress/handler split; does not change approved user-visible behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/fetch-capability-probe-evidence.md` | Electron 42.4.1 PDF-XHR/Excel-Fetch privilege matrix plus handler-observability and main-frame authorization differential | FR-001, FR-005, FR-006, FR-007 | AC-007, AC-008, AC-009 | Complete / approval `N/A` | Corrects CR-005's capability premise and constrains the pre-handler trusted-frame gate; does not change approved user-visible behavior. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` — the renderer/main wire identity had no single serialization contract, and the reviewed protocol lifecycle omitted both the capabilities required by established XHR/Fetch consumers and the pre-handler frame-authorization invariant those capabilities require.
- Refactor posture: `Likely Needed`
- Evidence basis: The base local-file boundary validates files correctly but lacked two-phase scheme lifecycle and media range invariants. API/E2E exposed both the unstable old URL identity and, later, the inability of a two-privilege standard scheme to serve preserved PDF.js XHR/Excel Fetch. The retained CR-005 differential proves the exact four-capability requirement and the separate probe proves an ungated combination reaches executable child frames.
- Requirement or scope impact: Keep one explicit local-file protocol owner and `localFileValidation.ts` authority; establish one fixed-authority build/parse contract; make the live registered workspace-shell main frame the explicit pre-handler request-authorization boundary; isolate valid legacy context-locator transformation at context hydration; add one current-kind submission owner before agent/team streaming plus identity-matched live-echo retention; retain the approved viewer-local error/retry and established viewer implementations.

## Recommendations

1. Register `local-file` before Electron becomes ready with exactly `standard`, `stream`, `supportFetchAPI`, and `corsEnabled`; do not add `secure`, CSP bypass, service-worker, code-cache, extension, or `webSecurity` exceptions.
2. Build only `local-file://local/<case-preserving encoded absolute path>` URLs through one shared renderer/main wire contract. Require the exact fixed authority and decode only `pathname`; reject old empty/drive authorities and arbitrary multi-character authorities without fallback.
3. Before `protocol.handle`, filter the default session's `local-file://*/*` requests by live `WorkspaceShellWindow` identity and exact main-frame object. Cancel missing, destroyed, unregistered, browser-partition, and subframe requests; a successful frame or URL check alone still must not bypass the existing filesystem validator.
4. Keep the renderer on opaque `local-file://` URLs; do not replace the design with `file://`, unrestricted IPC bytes, or whole-file Blob buffering.
5. Make `VideoPlayer.vue` observe native media errors and provide localized, accessible retry feedback.
6. Preserve valid legacy absolute local-file context locators by transforming them into the canonical current form at context ingestion/hydration, before current-model presentation or submission planning; do not teach the Electron protocol parser legacy forms.
7. Replace type-only attachment partitioning with one current-kind-aware submission plan used by both agent/team paths. Retain unsupported metadata in the current local message/live echo, but never transmit it through executable media arrays or add a metadata-only transport for newly invalid input.

## Scope Classification

`Medium`

The visible behavior is narrow, but the correct fix crosses renderer state, current context hydration/submission, Electron pre-ready protocol registration, main-process file validation, byte-stream response semantics, and realistic packaged-runtime validation.

## In-Scope Use Cases

1. Select a supported local video from the Files panel and load its metadata in the right-side preview.
2. Play, pause, and seek within that supported video using the existing native controls.
3. Seek within a larger supported local video without first buffering the complete file into renderer memory.
4. Receive a clear, retryable failure state for a missing, unreadable, malformed, or Chromium-unsupported video.
5. Continue previewing existing supported non-video types without regression.
6. Continue rendering an embedded absolute workspace-image context thumbnail through the corrected shared local-file identity without changing its attachment meaning or valid open behavior.
7. Paste or hydrate a valid legacy absolute local-file context locator and continue presenting/sending it through the canonical current identity without adding a second transport or a steady-state protocol compatibility decoder.
8. Paste an unsupported local-file locator, retain its label/removal state in the current UI/message/live echo, and send the message text plus any valid attachments without submitting that locator as executable context or media; per the approved Option-1 lifecycle, the newly unsupported label may be absent after fresh reload.
9. Preview an existing local PDF or Excel file through its unchanged viewer from development HTTP and packaged `file://` shell origins, while a script running in an embedded/Blob child frame cannot Fetch/XHR the same readable local-file URL.

## Out of Scope

- Video editing, transcoding, thumbnail generation, or changing the user's media bytes.
- Adding codecs that the shipped Electron/Chromium build does not decode.
- Redesigning the native video controls or autoplaying selected videos.
- Changing remote/browser workspace media transport, server workspace routes, the media library, general conversation-media transport beyond the bounded local-file locator transition, or artifact viewers.
- Broadening trusted local preview activation beyond a registered workspace-shell main frame, exposing arbitrary `file://` URLs, or giving browser content, embedded child frames, or remote clients host-path access.
- Refactoring unrelated Electron bootstrap, File Explorer state, or other viewer components.
- Durable cross-restart storage for newly unsupported locator metadata; the user explicitly selected current-session-only retention. Existing historical records remain readable and valid attachment durability is unchanged.

## Functional Requirements

- `FR-001`: Electron must register the existing `local-file` scheme exactly once before `app.whenReady()` with `{ standard: true, stream: true, supportFetchAPI: true, corsEnabled: true }`. It must not enable any other scheme privilege or disable `webSecurity`. Renderer URLs must use one fixed lowercase authority and place the complete case-preserving encoded absolute path in `pathname` so standard-scheme consumption does not reinterpret a filesystem segment as hostname.
- `FR-002`: One canonical renderer/main local-file URL contract must build only already-absolute POSIX or Windows drive-letter paths. At the handler boundary it must accept only the normalized fixed authority, reject handler-observable query/fragment or wrong authority, decode pathname once into the matching platform absolute-path shape, then pass the candidate to the existing main-process local-file validation boundary; the protocol owner must serve validated files with correct MIME type and single-byte-range semantics suitable for Chromium media loading and seeking.
- `FR-003`: For a supported video, the existing native video element must load a finite duration and permit play, pause, and seek without autoplaying.
- `FR-004`: `VideoPlayer.vue` must convert resource-fetch or native media-element failure into a visible, localized, accessible error state with an explicit retry action; changing the URL must clear stale failure state and start a fresh load.
- `FR-005`: At supported raw-locator ingress, credential-, port-, query-, fragment-, wrong-authority-, opaque-authority-, and malformed local-file locators must be rejected from preview/open presentation before DOM assignment and from executable agent submission. An unsupported current attachment must not enter `context_file_paths`, `image_urls`, server `ContextFile`, LLM media arrays, or media normalization; its current client label/removal/message metadata remains while the text and valid attachments continue to send. At the default-session request boundary, only the exact main frame of a live registered `WorkspaceShellWindow` may proceed; missing/destroyed/unregistered web contents and every child frame—including foreign-HTTP and same-origin Blob/HTML-preview frames—must be canceled before `protocol.handle`. At the normalized handler boundary, wrong authorities and surviving query/fragments, invalid paths, directories, unavailable/unreadable files, malformed ranges, and unsatisfiable ranges must fail without source bytes. Electron-erased credentials/ports remain subject to the same validator. The trusted shell main frame retains only the existing path-addressed read-only preview model; no browser-partition, child-frame, remote-client, file-enumeration, write, Node, shell, `file://`, or new binary IPC capability is added.
- `FR-006`: Existing text, image, audio, PDF, and Excel preview routing/presentation plus embedded absolute workspace-image context-thumbnail and valid external local-file locator presentation must remain unchanged except that all usable local binary/document requests use the canonical URL, local audio uses the corrected standard streaming scheme, and the established PDF.js XHR/Excel Fetch consumers use the reviewed Fetch/CORS-capable scheme from the authorized shell main frame.
- `FR-007`: The implementation must keep scheme/authority/path serialization in one canonical renderer/main wire-contract owner, isolate legacy context-locator transformation at the context hydration boundary, make current attachment submission eligibility one explicit web owner used before both agent and team streaming, and keep scheme lifecycle, default-session main-frame request authorization, and response policy under the Electron local-file protocol boundary with live shell identity supplied by `WorkspaceShellWindowRegistry`, rather than duplicating URL algorithms, adding a protocol compatibility decoder/metadata-only or document-byte transport, or adding another inline response branch to `electron/main.ts`.

## Acceptance Criteria

- `AC-001`: Given the reported H.264 MP4 (or an equivalent fixture) on an authorized local preview path, selection displays a finite duration of approximately `5:30` rather than `0:00`.
- `AC-002`: The same video can be played and paused through the native controls, with current time advancing while playing.
- `AC-003`: Seeking to a later valid timestamp completes at that timestamp and playback can continue; a larger supported local video can trigger a later byte-range read rather than requiring the entire source to be materialized in renderer memory.
- `AC-004`: Given a media-element decode/source failure, the black controls are replaced by a visible alert explaining that the video could not be played and offering `Retry`.
- `AC-005`: Activating `Retry` creates a fresh media load attempt, and changing to a new URL clears the previous media error.
- `AC-006`: A valid single `Range` request receives `206` with correct `Content-Range`, `Content-Length`, `Accept-Ranges: bytes`, and MIME headers; a valid no-range request receives the full file without changing it.
- `AC-007`: The exact fixed authority with a case-preserving absolute pathname from a registered live workspace-shell main frame reaches normal method/range policy. The same canonical readable URL requested by a foreign-HTTP child frame, same-origin Blob/HTML-preview child frame, a main-process `net.fetch` with no renderer-frame identity, missing/destroyed frame, or unregistered web contents is canceled before `protocol.handle` and returns no bytes. At raw context-locator ingress, old valid absolute forms transition to canonical while credentials/ports/query/fragments, wrong/opaque authorities, and malformed local-file locators do not reach preview/open presentation. At the handler, wrong authority, surviving query/fragment, relative/invalid platform path, directory, missing/unreadable file, malformed multi-range, and unsatisfiable range return deterministic non-success responses without file bytes. A manually authored port/credential URL that Electron normalizes to the indistinguishable canonical handler URL remains subject to the same authorization, validation, and response policy rather than an unenforceable raw-adornment assertion. Realistic method/range coverage must originate from the authorized shell main frame; a test harness must not bypass this requester boundary with privileged main-process `net.fetch`.
- `AC-008`: From representative development HTTP and packaged `file://` workspace-shell main-frame origins, real PDF.js XHR and Excel Fetch requests reach the canonical handler and render/parse expected fixture content; representative existing File Explorer image, local audio, embedded absolute workspace-image context thumbnail, and valid external local-file context locator checks show no regression; text preview continues through its existing IPC/GraphQL path. No viewer-specific fallback or second byte transport is used.
- `AC-009`: Validation includes Electron 42.4.1 or the packaged app's actual Electron version, records authored attribute, resolved media property/current source, and handler URL for a case-sensitive POSIX path plus URL-significant characters and representative port/credential/query/fragment adornments, and distinguishes raw-ingress enforcement from normalized-handler enforcement rather than relying only on browser/Node URL mocks.
- `AC-010`: Pasting a valid legacy empty-authority POSIX locator or hydrating a valid stored legacy POSIX/Windows-drive locator produces one canonical fixed-authority in-memory locator before presentation and any new send. Canonical inputs are idempotent. Given `local-file://opaque/image.png` or another unsupported wrong/adorned locator, the composer retains its label/removal identity and the optimistic/current user message retains its label, including after an identity-matched empty or mixed valid team echo, but the agent/team WebSocket payload contains it in neither `context_file_paths` nor `image_urls`; no server/runtime `ContextFile`, LLM media normalization, preview, file-viewer, browser-open, protocol, or file-byte request occurs; text and valid attachments still submit. Existing historical unsupported records remain displayable, while newly quarantined unsupported inputs are not added to durable runtime projection and therefore are absent after fresh reload. Non-local external locators remain unchanged.

## Constraints / Dependencies

- The reported app is a packaged macOS Electron build running from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` with Electron `42.4.1`.
- The task branch is based on refreshed `origin/personal` at `dbc83fdb51c1e158b5707c219dd8574dc49fa493`; the running binary source at `af78a9307611f58c383ea5b5c9d8dd727deeb918` contains the same relevant protocol handler.
- `protocol.registerSchemesAsPrivileged` may be called only before Electron ready and only once; the design must make that lifecycle ordering explicit.
- The shell uses Electron's default session, so application-level protocol registration/handling and its one filtered `webRequest.onBeforeRequest` authorization owner are the correct session boundary. Browser tool views use `persist:autobyteus-browser`, where the handler is not installed.
- `WorkspaceShellWindow` uses `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, blocks navigation, and denies new windows. These protections remain required; the frame gate must compare the request's exact `WebFrameMain` object with the registered shell's live `webContents.mainFrame`, not compare untrusted URL strings.
- The clean-cut internal URL contract is `local-file://local/<case-preserving encoded absolute path>`; `local` is a constant protocol marker and never a filesystem segment.
- Every supported renderer producer and the Electron lifecycle/response boundary must use the same subject-specific URL contract; no endpoint may independently concatenate the scheme/authority or recover a filesystem path from an arbitrary hostname.
- Existing composer submission eligibility remains unchanged: trimmed message text is required, so excluding unsupported attachments never creates an attachment-only empty execution.
- Electron standard-scheme normalization is part of the contract: ports and credentials may be absent by handler delivery, authority is lowercase, and query/fragment remain observable under Electron 42.4.1. Handler guarantees apply to the request actually received; supported raw context locators are checked before preview/open assignment.
- Paths may contain uppercase/case-sensitive segments, spaces, Unicode, `%`, `#`, Windows drive letters, and other URL-significant characters. The full path must stay in `pathname` across authored URL, resolved media URL, and handler request.
- Byte streams must close file handles on completion, cancellation, and error.
- MIME resolution must cover all file types already permitted to enter the existing local-file media/document path.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: User-owned local video and other previewed files; ephemeral File Explorer/context-thumbnail derived URLs; and context message/projection locators that may retain a valid legacy `local-file:///absolute/POSIX/path` or `local-file://C:/Windows/path` string.
- Required outcome: `Migration Required` — isolated deterministic read/ingress transformation before the normal current attachment model is used.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve every source file and workspace-path locator byte-for-byte. Transform valid legacy absolute local-file locators in memory to the fixed-authority current form; canonical inputs remain unchanged. Existing persisted unsupported locator strings remain readable as explicit non-executable metadata and are never rewritten. Under the explicitly approved Option-1 outcome, a newly pasted unsupported locator is quarantined in current client attachment/message/live-echo state only and is intentionally excluded from executable and durable server/runtime payloads, so it may disappear after fresh reload; no new metadata-only transport or store is introduced. Valid attachment/locator persistence remains unchanged.
- Unacceptable data loss or corruption: Any modification, truncation, relocation, deletion, or transcoding of a source file.
- Relevant availability, maintenance-window, or rollout constraints: None identified.
- Related requirement and acceptance-criteria IDs: FR-002, FR-005, FR-006, FR-007 / AC-007, AC-008, AC-010

## Assumptions

- The selected screenshot item is the located `multi-nodes-part-2_youtube_smaller.mp4` file.
- Existing native video controls and the current black preview background are acceptable when media is playing.
- A generic user-facing error is preferable to exposing native Chromium pipeline text or absolute host paths.
- English and Simplified Chinese localization remain required under the repository's localization policy.

## Risks / Open Questions

- Exact large-file memory/cancellation behavior must be rerun in the implemented fixed-authority path. The corrective probe succeeded with the current cancel-safe implementation and a later nonzero range, but post-rework API/E2E remains authoritative.
- Chromium-supported codecs vary by shipped platform/runtime; the UI must report unsupported content truthfully rather than promising every `.mp4`, `.mov`, `.avi`, `.mkv`, or `.webm` will decode.
- Windows URL and drive-letter parsing needs durable coverage because the reported runtime is macOS but the handler is cross-platform.
- Legacy context-locator transition must remain isolated from the protocol parser and be idempotent; existing persisted projections are not centrally rewritable, so the hydration boundary must complete transformation before ordinary model/presentation use.
- Submission eligibility must preserve all current/local message attachment objects while deriving executable arrays from current kind. Unsupported inputs are not durably written on new sends; historical unsupported records remain readable. A future product requirement for cross-restart retention of newly rejected input would require a separately approved metadata-only persistence contract.
- Electron documents that a `webRequest` frame may be absent after navigation/destruction; the authorization boundary must fail closed. Real PDF.js XHR/Excel Fetch plus all existing media consumers must prove they retain the registered main-frame identity under both representative shell origins.
- Electron uses one listener per `webRequest` event. The local-file protocol boundary must own the filtered default-session `onBeforeRequest` listener; future default-session request policy must compose through that owner rather than overwrite it.
- No unresolved product decision blocks design. On 2026-07-18 the user explicitly approved the intended error/retry and seek behavior and subsequently chose Option 1 for current-session-only retention/fresh-reload disappearance of newly unsupported locator metadata.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| Select and load supported local video | FR-001, FR-002, FR-003, FR-005, FR-007 |
| Play/pause/seek supported local video | FR-002, FR-003 |
| Seek larger video efficiently | FR-001, FR-002 |
| Video failure and retry | FR-004, FR-005 |
| Preserve other preview behavior | FR-005, FR-006 |
| Preserve embedded local context-image thumbnail behavior | FR-002, FR-005, FR-006, FR-007 |
| Preserve valid external local-file context locators | FR-002, FR-005, FR-006, FR-007 |
| Quarantine unsupported local-file attachment while sending valid message content | FR-005, FR-007 |
| Preserve PDF.js XHR and Excel Fetch without granting child-frame local-file reads | FR-001, FR-005, FR-006, FR-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | The exact reported file or equivalent H.264 fixture loads metadata through the Electron custom scheme. |
| AC-002 | Native playback advances and pauses. |
| AC-003 | Small and larger local videos seek through byte-range-capable streaming. |
| AC-004 | Native media error becomes visible, accessible UI feedback. |
| AC-005 | Retry and URL-change recovery reset viewer state correctly. |
| AC-006 | Protocol full/single-range response contract. |
| AC-007 | Trusted-main-frame request authorization plus local-file validation and invalid-range security/error contract. |
| AC-008 | Real PDF.js XHR/Excel Fetch from HTTP/file shell origins plus non-video/audio/context-thumbnail regression coverage. |
| AC-009 | Realistic Electron execution boundary. |
| AC-010 | Context locator transition, idempotence, agent/team executable-send exclusion, current-message plus mixed live-echo metadata retention, historical-read/new-invalid reload behavior, and preserved non-local locator behavior. |

## Approval Status

Approved explicitly by the user on 2026-07-18 in two decisions:

1. The user approved supported-video playback/seeking and the visible error-with-Retry behavior.
2. After the AR-004 choice was explained, the user replied “okayyy. lets og with option 1,” explicitly selecting current-session/live-echo retention with fresh-reload disappearance for newly unsupported locator metadata rather than a new durable metadata feature. Valid attachments and valid locators continue to persist normally.

The CR-005 correction preserves already-approved established PDF/Excel behavior and adds no visible feature. It clarifies the existing “trusted Electron-only capability gate” as the exact main frame of a live registered workspace shell and tightens the boundary by canceling embedded/Blob/foreign child-frame requests before the handler. The top shell already owns path-addressed read-only File Explorer/text-preview authority; no browser, child-frame, enumeration, write, Node, shell, `file://`, or new binary IPC authority is approved or introduced. Therefore the existing user approval remains applicable; this is a technical design correction, not a new product choice.

The revised package also preserves the established valid context-locator path. Unsupported opaque/wrong/adorned locators cannot enter executable/durable submission; the approved bounded outcome retains their current UI/message metadata without adding a web/server/core persistence schema. A future request to persist newly rejected input across restart would be a new product requirement. All three supplemental runtime evidence artifacts are approval `N/A` because they record observed facts rather than intended behavior.
