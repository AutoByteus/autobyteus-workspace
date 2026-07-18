# Requirements Doc

## Status

`Approved` — user approved this requirements basis on 2026-07-18.

## Goal / Problem Statement

When a user selects a supported local video from the Files panel in the packaged AutoByteus Electron app, the right-side preview must load metadata and support normal playback instead of remaining black at `0:00`. The fix must preserve the trusted local-file validation boundary, support media seeking without loading the whole source into renderer memory, and show a clear recovery state when a video cannot be played.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Selecting the reported local H.264 MP4 opens the right-side native video controls, but Electron rejects the unprivileged `local-file://` media response; the player stays black at `0:00`. | Selecting a supported local video loads a finite duration and allows play, pause, and seek. | The Files item, tab, and native-control interaction model remain unchanged. | FR-001, FR-002, FR-003 / AC-001, AC-002, AC-003 |
| BEH-002 | A media-element failure is not observed by `VideoPlayer.vue`, so the same black `0:00` player remains visible without an explanation or recovery action. | A missing, unreadable, invalid, or non-decodable video leaves loading deterministically and shows an accessible failure message with a retry action. | The preview remains read-only and does not modify or transcode the source file. | FR-004 / AC-004, AC-005 |
| BEH-003 | The Electron main process accepts only an absolute, readable regular file at the `local-file://` boundary, but its handler discards the media byte-range request and returns an ordinary `net.fetch(file:)` response. | The same validation remains authoritative; a valid local media request receives MIME-correct, byte-range-capable streaming semantics, while invalid or unsatisfiable requests fail deterministically. | The trusted Electron-only capability gate and main-process validation remain in place; no arbitrary renderer filesystem API or remote-client local-path access is added. | FR-001, FR-002, FR-005 / AC-003, AC-006, AC-007 |
| BEH-004 | Image, audio, PDF, Excel, and text previews share parts of the local preview path; no regression was reported for non-video viewers. The missing Electron streaming privilege can also affect local audio. | Local video is fixed, local audio remains compatible with the streaming scheme, and unrelated viewer behavior is unchanged. | Existing file-type selection, workspace routing, text IPC, object-URL authorization, and non-video presentation remain unchanged. | FR-006 / AC-008 |

## Investigation Findings

- The screenshot's source file exists at `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4`, is readable, and is a valid fast-start H.264 High Profile/yuv420p MP4 with duration `330.533333` seconds and size `13,620,424` bytes. `ffmpeg` decoded a sampled frame without error.
- The supported production path is `FileItem.vue -> useWorkspaceFileExplorer -> fileExplorerContentActions -> local-file:// -> Electron protocol.handle -> VideoPlayer.vue`.
- `electron/main.ts` installs `protocol.handle('local-file', ...)` only after `app.whenReady()` and never calls `protocol.registerSchemesAsPrivileged(...)` before ready.
- Electron's official protocol contract says media protocols must opt into `stream: true`; a same-version Electron 42.4.1 probe against the exact file reproduced `MediaError.code = 4` with current semantics and loaded the correct duration after adding the streaming privilege.
- The media request includes `Range: bytes=0-`, but the current handler discards it. A streaming-only probe could play from the start but reset an attempted seek to `0`. A standard streaming scheme with valid `206`, `Content-Range`, `Content-Length`, and `Accept-Ranges` behavior successfully sought both the reported 13 MB file and a representative 607 MB local MP4.
- Durable probe detail is retained in [runtime-probe-evidence.md](./runtime-probe-evidence.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md` | Runtime evidence for the reported file, current Electron failure, scheme privileges, byte ranges, playback, and seek | FR-001, FR-002, FR-003, FR-005 | AC-001, AC-002, AC-003, AC-006, AC-007 | Complete / approval `N/A` | Supports the requirements; does not define additional intended behavior. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor posture: `Likely Needed`
- Evidence basis: The local-file boundary exists and validates files correctly, but no owner enforces Electron's required two-phase protocol lifecycle (privilege registration before ready, handler installation after ready) or media byte-range response invariant. The current protocol code is embedded in `main.ts`, which allowed this ordering/contract gap.
- Requirement or scope impact: The fix should create one explicit local-file protocol owner, keep `localFileValidation.ts` authoritative for filesystem validation, and add only the viewer-local error/retry state needed to make failures visible.

## Recommendations

1. Register `local-file` as a standard streaming scheme before Electron becomes ready; do not add unnecessary CSP-bypass or remote-access privileges.
2. Move local-file URL parsing and response construction out of `main.ts` into one owned protocol module that validates first and serves single-byte ranges with correct MIME and response headers.
3. Keep the renderer on opaque `local-file://` URLs; do not replace the design with `file://`, unrestricted IPC bytes, or whole-file Blob buffering.
4. Make `VideoPlayer.vue` observe native media errors and provide localized, accessible retry feedback.

## Scope Classification

`Medium`

The visible behavior is narrow, but the correct fix crosses renderer state, Electron pre-ready protocol registration, main-process file validation, byte-stream response semantics, and realistic packaged-runtime validation.

## In-Scope Use Cases

1. Select a supported local video from the Files panel and load its metadata in the right-side preview.
2. Play, pause, and seek within that supported video using the existing native controls.
3. Seek within a larger supported local video without first buffering the complete file into renderer memory.
4. Receive a clear, retryable failure state for a missing, unreadable, malformed, or Chromium-unsupported video.
5. Continue previewing existing supported non-video types without regression.

## Out of Scope

- Video editing, transcoding, thumbnail generation, or changing the user's media bytes.
- Adding codecs that the shipped Electron/Chromium build does not decode.
- Redesigning the native video controls or autoplaying selected videos.
- Changing remote/browser workspace media transport, server workspace routes, the media library, conversation media, or artifact viewers.
- Broadening trusted local preview activation, exposing arbitrary `file://` URLs, or giving remote clients host-path access.
- Refactoring unrelated Electron bootstrap, File Explorer state, or other viewer components.

## Functional Requirements

- `FR-001`: Electron must register the existing `local-file` scheme with the minimum privileges needed for standard URL/media semantics and streaming, and registration must occur before `app.whenReady()`.
- `FR-002`: After validating the decoded absolute path through the existing main-process local-file validation boundary, the local-file protocol owner must serve the file with its correct MIME type and single-byte-range semantics suitable for Chromium media loading and seeking.
- `FR-003`: For a supported video, the existing native video element must load a finite duration and permit play, pause, and seek without autoplaying.
- `FR-004`: `VideoPlayer.vue` must convert resource-fetch or native media-element failure into a visible, localized, accessible error state with an explicit retry action; changing the URL must clear stale failure state and start a fresh load.
- `FR-005`: Invalid paths, directories, unavailable/unreadable files, malformed ranges, and unsatisfiable ranges must fail without returning source bytes; the renderer must receive no general filesystem capability.
- `FR-006`: Existing text, image, audio, PDF, and Excel preview routing/presentation must remain unchanged except that local audio may use the corrected standard streaming scheme.
- `FR-007`: The implementation must keep local-file protocol lifecycle and response policy under one main-process owner rather than adding another inline branch to `electron/main.ts`.

## Acceptance Criteria

- `AC-001`: Given the reported H.264 MP4 (or an equivalent fixture) on an authorized local preview path, selection displays a finite duration of approximately `5:30` rather than `0:00`.
- `AC-002`: The same video can be played and paused through the native controls, with current time advancing while playing.
- `AC-003`: Seeking to a later valid timestamp completes at that timestamp and playback can continue; a larger supported local video can trigger a later byte-range read rather than requiring the entire source to be materialized in renderer memory.
- `AC-004`: Given a media-element decode/source failure, the black controls are replaced by a visible alert explaining that the video could not be played and offering `Retry`.
- `AC-005`: Activating `Retry` creates a fresh media load attempt, and changing to a new URL clears the previous media error.
- `AC-006`: A valid single `Range` request receives `206` with correct `Content-Range`, `Content-Length`, `Accept-Ranges: bytes`, and MIME headers; a valid no-range request receives the full file without changing it.
- `AC-007`: Relative paths, directories, missing/unreadable files, malformed multi-range requests, and unsatisfiable ranges return deterministic non-success responses without file bytes; existing trusted Electron capability gating remains intact.
- `AC-008`: Representative existing image/PDF (non-stream media/document) and local audio preview checks show no regression; text preview continues through its existing IPC/GraphQL path.
- `AC-009`: Validation includes Electron 42.4.1 or the packaged app's actual Electron version and exercises the custom protocol/media element path, not only a browser mock.

## Constraints / Dependencies

- The reported app is a packaged macOS Electron build running from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` with Electron `42.4.1`.
- The task branch is based on refreshed `origin/personal` at `dbc83fdb51c1e158b5707c219dd8574dc49fa493`; the running binary source at `af78a9307611f58c383ea5b5c9d8dd727deeb918` contains the same relevant protocol handler.
- `protocol.registerSchemesAsPrivileged` may be called only before Electron ready and only once; the design must make that lifecycle ordering explicit.
- The shell uses Electron's default session, so application-level protocol registration is the correct session boundary.
- Paths may contain spaces, Unicode, `%`, `#`, Windows drive letters, and other URL-significant characters.
- Byte streams must close file handles on completion, cancellation, and error.
- MIME resolution must cover all file types already permitted to enter the existing local-file media/document path.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: User-owned local video and other previewed files.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve every source file byte-for-byte; preview remains read-only.
- Unacceptable data loss or corruption: Any modification, truncation, relocation, deletion, or transcoding of a source file.
- Relevant availability, maintenance-window, or rollout constraints: None identified.
- Related requirement and acceptance-criteria IDs: FR-002, FR-005 / AC-006, AC-007

## Assumptions

- The selected screenshot item is the located `multi-nodes-part-2_youtube_smaller.mp4` file.
- Existing native video controls and the current black preview background are acceptable when media is playing.
- A generic user-facing error is preferable to exposing native Chromium pipeline text or absolute host paths.
- English and Simplified Chinese localization remain required under the repository's localization policy.

## Risks / Open Questions

- Exact large-file memory/cancellation behavior must be verified in the implemented packaged path, because a Node stream converted generically to a web stream failed a cancellation/seek probe; a byte-oriented cancel-safe stream succeeded.
- Chromium-supported codecs vary by shipped platform/runtime; the UI must report unsupported content truthfully rather than promising every `.mp4`, `.mov`, `.avi`, `.mkv`, or `.webm` will decode.
- Windows URL and drive-letter parsing needs durable coverage because the reported runtime is macOS but the handler is cross-platform.
- No unresolved product decision blocks design. The user explicitly approved the intended error/retry and seek behavior on 2026-07-18.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| Select and load supported local video | FR-001, FR-002, FR-003, FR-005, FR-007 |
| Play/pause/seek supported local video | FR-002, FR-003 |
| Seek larger video efficiently | FR-001, FR-002 |
| Video failure and retry | FR-004, FR-005 |
| Preserve other preview behavior | FR-005, FR-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | The exact reported file or equivalent H.264 fixture loads metadata through the Electron custom scheme. |
| AC-002 | Native playback advances and pauses. |
| AC-003 | Small and larger local videos seek through byte-range-capable streaming. |
| AC-004 | Native media error becomes visible, accessible UI feedback. |
| AC-005 | Retry and URL-change recovery reset viewer state correctly. |
| AC-006 | Protocol full/single-range response contract. |
| AC-007 | Local-file validation and invalid-range security/error contract. |
| AC-008 | Non-video/audio regression coverage. |
| AC-009 | Realistic Electron execution boundary. |

## Approval Status

Approved explicitly by the user on 2026-07-18, including playback/seeking and the visible error-with-retry behavior. The supplemental runtime evidence is approval `N/A` because it records observed facts rather than intended behavior.
