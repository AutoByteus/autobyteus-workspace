# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete — requirements approved; design ready for architecture review`
- Investigation Goal: Identify why a selected local video opens in the packaged Electron Files preview but remains black at `0:00`, prove the cause against the user's actual media and Electron version without disturbing the running app, and establish the smallest secure production-path fix and validation boundary.
- Scope Classification: `Medium`
- Scope Classification Rationale: The visible symptom is confined to one viewer, but the correct fix crosses renderer preview state, Electron's pre-ready custom-scheme lifecycle, main-process filesystem validation, MIME and byte-range response behavior, and realistic Electron execution.
- Scope Summary: Repair supported local-video metadata loading, play/pause, seek, and failure recovery in the Electron Files preview; retain the trusted local-file validation boundary and preserve unrelated viewers.
- Primary Questions Resolved:
  1. What exact URL and production path does the video element use? `local-file://` from File Explorer state through `VideoPlayer.vue` to the Electron protocol handler.
  2. Is the reported video absent, corrupt, badly encoded, or not fast-start? No; the exact H.264 MP4 is readable, decodable, and fast-start.
  3. What concrete media error occurs under the shipped runtime? Electron 42.4.1 produces `MediaError.code = 4`, `readyState = 0`, and `duration = NaN` with current protocol semantics.
  4. Why does it occur? The custom scheme is never registered with Electron's required streaming privilege before ready.
  5. Is adding `stream: true` alone sufficient? It fixes metadata and playback from the start, but not seeking because the current handler drops `Range` and returns an ordinary `200`.
  6. What contract is sufficient? A pre-ready standard streaming scheme plus validated MIME-correct single-range/full-file responses backed by a cancel-safe byte stream.
  7. Does the refreshed task base retain the same defect? Yes; the relevant handler is identical to the user's running source.

## Request Context

- User report (2026-07-18): after clicking the local video shown in the Files panel, the right-side preview cannot play it. The user is currently running the packaged Electron app and asked for investigation and guidance on how this could be tested.
- Supplied screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_1026dfe5bd6946f8883ffdd6567c6220/solution_designer_cc807b0967194123aee8ecaea7cb7f40/context_files/ctx_ba279df70d9f__image.png`.
- Visible symptom: the preview renders a black native video element with controls at `0:00`, but no duration, playback, explanation, or recovery action.
- The screenshot's conversation names `multi-nodes-part-2_youtube_smaller.mp4` and describes it as an approximately 13 MB, 5m30s, 1920x1246, 30 fps H.264 MP4 without audio.
- The user did not request a player redesign, autoplay, transcoding, codec installation, or a broader file-viewer change.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback`
- Current Branch: `codex/local-video-preview-playback`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback`
- Bootstrap Base Branch: refreshed `origin/personal`
- Remote Refresh Result: `git fetch --prune origin personal` succeeded on 2026-07-18; the task base is `dbc83fdb51c1e158b5707c219dd8574dc49fa493` (`chore(release): bump workspace release version to 1.4.17`).
- Task Branch: `codex/local-video-preview-playback`, based on and tracking `origin/personal`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Running App Context:
  - main PID observed: `55298`
  - embedded-server child PID observed: `55906`
  - packaged app: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - Electron: `42.4.1`
  - running source commit: `af78a9307611f58c383ea5b5c9d8dd727deeb918`
  - embedded server port: `29695`
  - data directory: `/Users/normy/.autobyteus/server-data`
  - application log: `/Users/normy/.autobyteus/logs/app.log`
- Notes For Downstream Agents: The user's running package came from a different task worktree. Investigation did not restart it, attach DevTools, edit it, or alter the source video. Separate hidden Electron 42.4.1 probes with isolated `/tmp` user-data paths provided deterministic evidence. Validate implementation in the reviewed task worktree rather than modifying the running package in place.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md` | Durable investigation-evidence supplement; not an intended-behavior specification | Exact file identity and decode evidence; current Electron failure; privilege differential; small/large file playback, range, seek, cancellation, and stream cleanup findings; official Electron contract | `requirements.md`, `investigation-notes.md`, `design-spec.md` | FR-001, FR-002, FR-003, FR-005 / AC-001, AC-002, AC-003, AC-006, AC-007, AC-009 | `Complete` | `N/A` — records observed facts | Carry forward with the reviewed package. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-18 | Other | User report and supplied screenshot at the path above | Establish symptom and UI context | File selection reaches a native video element, which remains black at `0:00` without error feedback. | No |
| 2026-07-18 | Repo | `git symbolic-ref --short refs/remotes/origin/HEAD`; `git ls-remote --symref origin HEAD`; `git fetch --prune origin personal` | Resolve and refresh the authoritative base before investigation | Remote HEAD/current upstream are `origin/personal`; refresh succeeded at `dbc83fdb...`. | No |
| 2026-07-18 | Setup | Created branch `codex/local-video-preview-playback` and worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback` from refreshed `origin/personal` | Avoid contaminating the user's dirty shared checkout and running app worktree | Isolated task workspace is ready; all durable task artifacts live under its ticket folder. | No |
| 2026-07-18 | Command | `ps -axo pid,ppid,command` filtered for Electron/AutoByteus; packaged binary and child-process inspection | Identify the actual runtime and embedded server without restarting it | Located packaged app, PIDs, port `29695`, data dir, runtime worktree, and Electron 42.4.1. | No |
| 2026-07-18 | Repo | Compared relevant files at running commit `af78a930...` and task base `dbc83fdb...` | Exclude version skew as the cause | The relevant `local-file` handler and video viewer behavior are the same. | No |
| 2026-07-18 | Code | `autobyteus-web/components/fileExplorer/FileItem.vue`; `composables/useWorkspaceFileExplorer.ts`; `stores/fileExplorerContentActions.ts`; `components/fileExplorer/FileExplorerTabs.vue`; `components/fileExplorer/FileViewer.vue`; `components/fileExplorer/viewers/VideoPlayer.vue`; `composables/useAuthorizedObjectUrl.ts` | Trace the supported renderer production path | Absolute embedded-window media is encoded as `local-file://`; `VideoPlayer` passes it directly to `<video>` and observes neither native media errors nor metadata state. | No |
| 2026-07-18 | Code | `autobyteus-web/electron/main.ts`; `electron/localFileValidation.ts`; shell/window construction | Trace the protocol lifecycle and security boundary | Handler installs only after `app.whenReady`; no privileged-scheme registration exists; validation correctly requires a readable absolute regular file; default session is used. | No |
| 2026-07-18 | Repo | `git log`, `git blame`, commit `47fd56803`, and `git log -S"protocol.handle('local-file'"` | Determine whether the defect was newly introduced and whether an existing owner exists | Inline protocol owner dates to the flattened app (`b1c89884e`); July 17 strengthened path validation/encoding but did not add media privileges/ranges. The defect is latent rather than video-file-specific. | No |
| 2026-07-18 | Data | `find`, `stat`, SHA-256, `ffprobe`, MP4 atom inspection, and sampled `ffmpeg` decode for `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4` | Test file integrity/codec/container hypotheses | Exact file exists, is H.264/avc1 yuv420p, 330.533333 seconds, 13,620,424 bytes, fast-start, no audio, and decodes successfully. | No |
| 2026-07-18 | Web | [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol/) | Verify version-current official scheme/media requirements | Privileged scheme registration must occur before ready and only once; media protocols require `stream: true`; `stream` defaults false; standard schemes receive generic URI behavior. | No |
| 2026-07-18 | Trace | Separate hidden Electron 42.4.1 protocol probe mirroring current `protocol.handle -> net.fetch(file:)` against the exact file | Reproduce outside the user's UI while preserving the actual runtime boundary | Chromium requested `Range: bytes=0-`; current response was `200` without length/range headers; `<video>` emitted code 4 with duration NaN. | No |
| 2026-07-18 | Trace | Same probe with only `{ stream: true }` | Isolate the direct metadata/playback cause | Exact file loaded metadata/duration and played from the start, proving missing streaming privilege causes the reported `0:00`; seek to 120 seconds reset to 0. | No |
| 2026-07-18 | Trace | Same probe with `{ standard: true, stream: true }`, validated MIME-correct `206` response, and cancel-safe byte stream | Establish the sufficient behavior contract | Exact file loaded, played, sought to 120 seconds, and continued playback. | No |
| 2026-07-18 | Trace | Large-file probe using `autobyteus_software_engineering_team_combined_no_audio.mp4` (607,568,129 bytes, 2063.066667 seconds) | Verify efficient seek/cancellation behavior, not merely 13 MB success | Chromium cancelled the initial stream after about 1 MiB and requested `bytes=525303808-`; a byte-oriented cancel-safe stream sought to 1800 seconds. Generic `Readable.toWeb(fs.createReadStream(...))` failed cancellation with `PIPELINE_ERROR_READ`. | Implementation and E2E must preserve this invariant. |
| 2026-07-18 | Test | Searched current durable tests for File Explorer viewers and Electron local-file behavior | Find existing coverage and ownership gaps | `localFileValidation.spec.ts` covers validation; no `VideoPlayer` test or protocol response/range test exists. | Add targeted durable coverage. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select a previewable local video entry in an embedded Electron workspace. | `FileItem.handleClick` -> `useWorkspaceFileExplorer.openFilePreview` -> Pinia `fileExplorerContentActions._openFileWithMode` -> `determineFileType` -> `_loadLocalFile` -> encoded `local-file://` URL -> `FileExplorerTabs` -> `FileViewer` -> `VideoPlayer` -> direct `<video src>` -> Electron `protocol.handle` -> `validateReadableRegularFile` -> `net.fetch(file:)`. | Selection, type detection, tab activation, and video rendering succeed. Metadata fails because the scheme lacks streaming privilege, leaving `0:00`; source stays read-only. | Source trace; exact Electron probe; user screenshot. |
| BEH-002 | User | Select a video whose custom-scheme load fails or whose bytes Chromium cannot decode. | The same path reaches `<video>`, but `VideoPlayer.vue` only renders an error when `useAuthorizedObjectUrl` cannot produce a URL. Direct `local-file://` URLs bypass that fetch path, and the component has no native `error` listener. | Native resource/decode failures remain an unexplained black player; no retry action exists. | `VideoPlayer.vue:1-18`; `useAuthorizedObjectUrl.ts:37-68`; screenshot. |
| BEH-003 | Contract | A renderer with the trusted Electron local-file capability requests an encoded absolute local media/document URL. | `fileExplorerContentActions` gates construction by embedded-window context, absolute path, and `hasTrustedElectronLocalFileCapability`; main process parses the URL and calls `validateReadableRegularFile` before returning bytes. | Only readable absolute regular files pass this boundary. The handler nevertheless drops incoming ranges and does not provide the response contract media needs. | `fileExplorerContentActions.ts:97-133`; `main.ts:473-493`; `localFileValidation.ts:17-40`; probe. |
| BEH-004 | Contract | Image, audio, video, Excel, and PDF local previews share `local-file://`; text uses an Electron IPC read; workspace/remote content uses existing REST/authorized object URL behavior. | `_loadLocalFile` routes binary/document types to the custom scheme; `FileViewer` selects the viewer; `AudioPlayer` also uses a native media element. | The fix can affect all local-file consumers and can improve local audio streaming, while text and remote/browser paths should remain unchanged. | `fileExplorerContentActions.ts:114-164`; `FileViewer.vue:64-107`; `AudioPlayer.vue`; `useAuthorizedObjectUrl.ts`. |

## Design Health Assessment Evidence

- Change posture: `Bug Fix`
- Candidate root cause classification: `Missing Invariant`
- Refactor posture evidence summary: A bounded refactor is justified. `electron/main.ts` is currently the implicit owner of URL parsing, lifecycle ordering, filesystem validation delegation, and response construction. No module or test enforces the required two-phase invariant: register scheme privileges before ready, then install the handler after ready. The response also lacks a single owner for MIME, range, status/header, byte-stream, cancellation, and cleanup policy. Keep `localFileValidation.ts` as the filesystem-validation owner, but extract one cohesive local-file protocol owner rather than expanding the inline handler.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `main.ts` lifecycle | `installProtocols()` is invoked at line 517 after `await app.whenReady()` at line 500; no pre-ready registration exists. | Electron media capability cannot be bolted on inside the existing late inline function; lifecycle ownership/order must be explicit. | Design a pre-ready registration entry and post-ready installation entry under one module. |
| Current handler | URL parsing, validation dispatch, error logging, and `net.fetch` live inline, with no response-policy abstraction. | The missing range and cleanup policy is an ownership/invariant gap rather than a one-flag-only fix. | Extract a bounded protocol module with pure/testable helpers. |
| Existing validator | `validateReadableRegularFile` already owns absolute-path, regular-file, and readability checks with tests. | Security validation should be reused, not duplicated or replaced by workspace-prefix assumptions. | Preserve it as authoritative dependency. |
| Electron probe | `stream: true` directly fixes metadata but does not fix seeking; valid range streaming fixes both. | A partial flag-only patch would leave user-visible broken seek behavior. | Require end-to-end range acceptance criteria. |
| Large-file probe | Generic Node-to-web stream conversion failed cancellation; byte-oriented cancel-safe stream succeeded. | Stream ownership must explicitly close resources on cancellation/completion/error and must be validated realistically. | Define cleanup invariant and targeted runtime coverage. |
| `VideoPlayer.vue` | Native media errors are not observed. | Even a correct transport cannot promise every codec/file will decode; failure state belongs in the video viewer. | Add localized accessible error and retry locally, not global File Explorer state. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | Converts item clicks into preview/open actions | `handleClick` reaches preview action for previewable files; the user trigger is healthy. | No behavioral redesign needed. |
| `autobyteus-web/composables/useWorkspaceFileExplorer.ts` | Binds File Explorer calls to active workspace ID | Thin delegation works as intended. | No change expected. |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | Determines type and chooses local vs workspace/remote resource route | Encodes absolute trusted media/document paths as `local-file://`; this URL construction is not the failure. | Preserve routing and capability gate. |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | Hosts active file state and `FileViewer` | Store loading/error state ends before the native media element asynchronously fails. | Do not force native media failure into global tab state for this fix. |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | Maps file type to viewer component | Correctly maps `Video` to `VideoPlayer`. | Preserve component dispatch. |
| `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue` | Resolves video URL and renders native controls | No media error listener, retry, or stale-error reset; direct custom URL stays truthy even when media fails. | Own the localized video-specific failure/retry state here. |
| `autobyteus-web/components/fileExplorer/viewers/AudioPlayer.vue` | Renders local/remote audio with native controls | Shares the custom media scheme and can benefit from correct streaming semantics. | Regression-check; no UI expansion required unless implementation impact proves otherwise. |
| `autobyteus-web/composables/useAuthorizedObjectUrl.ts` | Uses credentialed fetch/blob URLs only where needed; passes ordinary/custom URLs directly | `local-file://` is intentionally assigned directly at lines 50-53, so its media errors are not reflected in `resourceError`. | Preserve opaque URL behavior; use media events for decode/load errors. |
| `autobyteus-web/electron/main.ts` | Electron bootstrap and many app-wide handlers | Inline local-file handler installs post-ready, drops range, and returns `net.fetch(file:)`. | Remove local protocol policy from this broad bootstrap file and delegate to a cohesive owner. |
| `autobyteus-web/electron/localFileValidation.ts` | Validates trusted absolute readable regular files | Correct, already tested, and recently strengthened. | Remain authoritative filesystem gate. |
| `autobyteus-web/electron/__tests__/localFileValidation.spec.ts` | Durable validation tests | Covers validation but not protocol registration, ranges, MIME, or stream lifecycle. | Retain and add separate protocol-owner tests. |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/` | Viewer component test location | No `VideoPlayer.spec.ts` exists. | Add viewer error/retry/reset coverage. |
| `autobyteus-web/localization/messages/en/tools.ts` and `zh-CN/tools.ts` | Deliberate English/Simplified Chinese File Explorer overrides merged after generated catalogs | Current VideoPlayer has generated fallback/no-URL strings but no deliberate play-failure/retry labels; the non-generated `tools.ts` files already own local-preview failure messages. | Add explicit video failure/retry keys to these non-generated catalogs; do not hand-edit `tools.generated.ts`. Run localization guards/audit. |

## Runtime / Probe Findings

Full retained evidence: [runtime-probe-evidence.md](./runtime-probe-evidence.md).

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-18 | Repro | User-provided live packaged-app screenshot | Selected video shows native controls on black background at `0:00`, without visible explanation. | Failure is downstream of selection/component mount and before usable metadata. |
| 2026-07-18 | Probe | `ffprobe` JSON/stream inspection, MP4 atom parse, SHA-256, and sampled `ffmpeg` decode of the exact file | 13,620,424-byte fast-start MP4; H.264 High/avc1, yuv420p, 1920x1246, 30 fps, 330.533333 seconds, no audio; decode succeeds. | File corruption, missing `moov`, and source-format hypotheses are rejected. |
| 2026-07-18 | Trace | Hidden Electron 42.4.1 window, isolated user data, exact current handler shape, exact file | Request included `Range: bytes=0-`; response was `200` with MIME but no content length/range support; media emitted code 4, readyState 0, networkState 3, duration NaN. | Reproduces and explains black `0:00` outside user app without inference from screenshot alone. |
| 2026-07-18 | Probe | Add only pre-ready `{ stream: true }` | `loadedmetadata`/`canplay` emitted with 330.533333 seconds; playback advanced. Seek assignment to 120 seconds returned to 0. | Missing streaming privilege is the direct load cause; range handling is also required for complete player behavior. |
| 2026-07-18 | Probe | Add `{ standard: true, stream: true }` plus a correct validated single-range response | Exact file received `206`, loaded, played, sought to 120.000 seconds, and continued. | Establishes sufficient scheme/response behavior. |
| 2026-07-18 | Probe | 607,568,129-byte MP4 seek to 1800 seconds | Chromium cancelled the initial stream around 1 MiB and requested `bytes=525303808-`; cancel-safe byte stream completed seek. | Correct implementation can avoid whole-file materialization and must tolerate cancellation/reopen. |
| 2026-07-18 | Probe | Replace byte-oriented stream with `Readable.toWeb(fs.createReadStream(...))` | Seek/cancellation failed with `PIPELINE_ERROR_READ`. | Do not assume generic stream adaptation satisfies Electron's body/cancellation semantics. |
| 2026-07-18 | Trace | Checked default-session shell creation and protocol registration scope | Workspace windows use the default Electron session, with no partition-specific custom session. | Application-level `protocol` registration is the correct boundary; per-session registration is unnecessary. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: [Electron `protocol` API](https://www.electronjs.org/docs/latest/api/protocol/).
- Version / tag / commit / freshness: Current official Electron documentation consulted on 2026-07-18; the decisive behavior was independently verified under the shipped Electron `42.4.1` binary.
- Relevant contract, behavior, or constraint learned:
  - `protocol.registerSchemesAsPrivileged` must be called before the application ready event and may be called only once.
  - The `stream` privilege defaults to false.
  - Custom protocols used by `<video>` and `<audio>` require `stream: true`.
  - `standard: true` supplies generic URI semantics; the same-version probe verified that `standard + stream` works with the expected media range/cancellation lifecycle here.
- Why it matters: The production handler is installed after ready with no privilege registration, so Chromium rejects the exact local media under an API contract the application never established. This is a main-process lifecycle/response defect, not a Vue click issue or user-media defect.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures:
  - No external service or account is required for the defect.
  - Actual runtime: Electron 42.4.1 from the user's packaged app worktree.
  - Primary media: `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4`.
  - Large-file behavior probe: `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/autobyteus_software_engineering_team_combined_no_audio.mp4`.
- Required config, feature flags, env vars, or accounts: A trusted embedded Electron window/local-file capability is required for the production route; the isolated diagnostic probes use hidden sandboxed windows and unique temporary `userData` paths.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Refreshed `origin/personal`; created the isolated worktree/branch; launched separate Electron scripts from disposable uniquely named `/tmp/autobyteus-*probe*` directories.
- Cleanup notes for temporary investigation-only setup: Probe processes exited and used isolated `/tmp` user-data. Disposable probe directories are not part of the artifact package. The source videos were opened read-only and were not changed. Do not treat raw `/tmp` scripts as durable tests; their decisive outputs are retained in `runtime-probe-evidence.md`.

## Findings From Code / Docs / Data / Logs

1. **The exact file is healthy.** Its bytes, metadata layout, codec/pixel format, and sampled decoding all succeed. Its `moov` atom precedes `mdat`, so this is not a download-progressive-metadata problem.
2. **The renderer production route is behaving as currently written.** File Explorer recognizes the video, opens a tab, builds an encoded opaque `local-file://` URL, maps it to `VideoPlayer`, and supplies it directly to Chromium.
3. **The Electron media contract is incomplete.** `installProtocols()` runs only after ready and calls only `protocol.handle`. Electron therefore never learns that `local-file` may stream media. The current `net.fetch(file:)` response also does not propagate Chromium's incoming range.
4. **The missing privilege is causally proven.** With the exact same Electron binary, file, and handler shape, adding `stream: true` changes the result from media error/code 4/duration NaN to correct 330.533333-second metadata and playable media.
5. **A flag-only fix would be incomplete.** Native video controls include seeking. A streaming-only `200` response played from zero but reset a 120-second seek to zero. Correct single-range `206` behavior fixed it.
6. **The response must be streaming and cancellation-safe.** Chromium cancels an initial stream and opens later byte ranges during large seeks. Whole-file Blob/buffer loading or a fragile Node-to-web stream adaptation would add memory or correctness regressions.
7. **Existing validation is not the defect.** `validateReadableRegularFile` correctly gates absolute readable regular files. It should remain the only filesystem validation policy owner and execute before any source bytes are returned.
8. **The UI hides all native media failures.** `useAuthorizedObjectUrl` cannot report errors for directly assigned custom URLs, and `VideoPlayer.vue` does not subscribe to the media element's `error` event. Unsupported codecs and unavailable files therefore remain black even after transport is fixed unless the viewer adds an error/retry state.
9. **The problem is broader than this one exact file but the task should stay bounded.** Local audio shares the same scheme and requires streaming privilege. Image/PDF/Excel use the scheme but not native media seeking. Remote/browser content uses other paths and must not be reworked.
10. **The running log is not a sufficient media diagnostic.** Current renderer code does not log/propagate the native video error, so absence of an application-log error does not contradict the same-version probe. Implementation should provide user-visible state; it need not expose absolute paths or Chromium pipeline detail.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: User-owned local media/document files outside application storage. Reported file is a 13,620,424-byte MP4; representative large file is 607,568,129 bytes.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers, including unknown/extra-field behavior: File Explorer preview is read-only. This task changes only how validated bytes are served to Chromium and how video load failure is displayed; it adds no writer.
- Representative direct-read or compatibility evidence: `ffprobe`/`ffmpeg` read the reported file successfully; Electron range probes read it without modification; SHA-256 is retained in supplemental evidence.
- Required semantics and invariants preserved by direct use: `Yes` — source bytes are served unchanged; validation precedes reads; no whole-file mutation/transcode/copy is required.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Do not modify, move, delete, transcode, or expose absolute paths in UI errors. Do not broaden renderer filesystem access or replace the trusted custom-scheme gate with unrestricted `file://`.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration is not a candidate and provides no benefit.
- Existing migration framework or lifecycle constraints, only if migration may be required: `N/A`.

## Constraints / Dependencies / Compatibility Facts

- Electron privilege registration is a one-time pre-ready operation; handler installation remains a post-ready operation.
- The app uses Electron's default session, so app-level scheme registration/handling is sufficient.
- The existing `local-file` URL shape must continue to preserve spaces, Unicode, percent signs, hashes, Windows drive letters, and other URL-significant characters.
- The response owner must determine a MIME type for every existing local-file media/document route or preserve a safe fallback; supported video/audio types must not become `application/octet-stream` accidentally.
- Only a single byte range is needed for Chromium media in scope. Malformed, multi-range, and unsatisfiable ranges must not return bytes and should produce deterministic failure responses.
- Streams/file handles must close on completion, cancellation, and error. Large video should not be materialized entirely in renderer or main-process memory.
- Codec support remains bounded by the shipped Chromium/Electron build. The fix promises correct transport for supported content, not new codec availability.
- English and Simplified Chinese UI strings must follow the repository localization generation/audit workflow.
- Implementation-owned local checks can cover pure protocol helpers/component state; realistic custom-protocol playback and seek belongs in API/E2E after source review.

## Open Unknowns / Risks

- The exact response/body implementation must be tested for cancellation and handle cleanup under the project build, because the generic Node stream adapter failed the investigation probe.
- Windows drive-letter/hostname parsing cannot be live-validated on the reported macOS host; it needs durable unit coverage.
- MIME resolution policy/dependency must cover the extensions already routed to `local-file://`; the design should avoid a hand-maintained media-only map that regresses PDF/Excel/image.
- Shipped Chromium codec availability differs by platform and container details. The viewer must report unsupported content truthfully rather than claim every `.mp4`, `.mov`, `.avi`, `.mkv`, or `.webm` can decode.
- Validating the final packaged path may require building or launching a separate task-worktree package. It must not hijack or terminate the user's existing app/processes.
- No product/design question blocks the proposed solution. The user explicitly approved the intended seek and visible error/retry behavior on 2026-07-18.

## Notes For Architecture Reviewer

- User approval is recorded in `requirements.md`; `design-spec.md` is ready for review.
- Treat [runtime-probe-evidence.md](./runtime-probe-evidence.md) as an evidence supplement with approval `N/A`, not as a source of new product requirements.
- The design should enforce one two-phase protocol lifecycle owner: minimal `{ standard: true, stream: true }` registration before ready and handler installation after ready.
- Reject a design that adds only `stream: true`, because the exact-file probe proves seeking remains broken when `Range` is discarded.
- Reject whole-file Blob/buffer loading or unrestricted `file://`/IPC workarounds. Preserve `localFileValidation.ts` as the authoritative gate and use a cancel-safe byte stream.
- Keep renderer changes local to `VideoPlayer.vue` unless implementation evidence forces broader state ownership. Unsupported codecs remain possible and require visible localized error/retry behavior.
- Required downstream evidence includes pure protocol/range/cleanup tests, component error/retry/reset tests, representative non-video/audio regression checks, and real Electron media load/play/seek verification.
