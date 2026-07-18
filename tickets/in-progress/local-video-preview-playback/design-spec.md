# Design Spec

## Status

`Ready for architecture review` — based on the requirements approved by the user on 2026-07-18.

## Current-State Read

The approved behavior basis is [requirements.md](./requirements.md), the source/runtime trace is [investigation-notes.md](./investigation-notes.md), and decisive same-version evidence is retained in [runtime-probe-evidence.md](./runtime-probe-evidence.md).

The current BEH-001 path correctly reaches the renderer's native video element: File Explorer recognizes the video, constructs an encoded `local-file://` URL for an absolute path in a trusted embedded Electron window, and `FileViewer.vue` renders `VideoPlayer.vue`. `useAuthorizedObjectUrl` intentionally passes that custom URL through rather than buffering it as a Blob. Those renderer routing decisions are healthy and must remain.

The broken boundary is in `electron/main.ts`. The file contains an inline `installProtocols()` function that is invoked only after `await app.whenReady()`. It installs `protocol.handle('local-file', ...)`, but no pre-ready `protocol.registerSchemesAsPrivileged(...)` call exists. The handler validates through the healthy `localFileValidation.ts` owner, then calls `net.fetch(file:)` without preserving Chromium's incoming `Range` request. Electron 42.4.1 consequently rejects the media source before metadata (`MediaError.code = 4`); adding streaming privilege fixes metadata/playback, while a correct `206` byte response is additionally required for seeking.

The structural defect is a missing lifecycle/response invariant, not a broken click handler or an over-restrictive filesystem validator. Electron bootstrap, URL decoding, validation delegation, response semantics, and resource cleanup currently have no cohesive local-file protocol owner. The design must make the two lifecycle phases explicit without moving filesystem authorization out of `localFileValidation.ts`.

BEH-002 exposes a separate viewer-local gap: `VideoPlayer.vue` only knows whether it received a URL. It never observes the native media `error` event, so an unavailable resource or unsupported codec remains a black `0:00` player. This state belongs to the video viewer, not global File Explorer state, because transport may succeed while Chromium decoding still fails.

Constraints:

- Scheme privilege registration must occur once and before Electron ready; handler installation must occur after ready.
- The existing renderer capability gate, `local-file` scheme name, encoded URL shape, and `validateReadableRegularFile` boundary remain authoritative.
- The handler must support macOS/POSIX paths and the existing Windows drive-letter URL shape.
- Local image, audio, PDF, Excel, and CSV viewers also use `local-file://`; MIME/full-response behavior must remain compatible.
- Streaming must avoid whole-file materialization and close the opened handle on completion, cancellation, and error.
- No source file or persisted application data may be changed.

## Intended Change

Create an explicit Electron `local-file-protocol` capability area with one public lifecycle boundary:

1. `registerLocalFileProtocolScheme()` declares only `{ standard: true, stream: true }` immediately during main-module startup, before `bootstrap()` can await ready.
2. `installLocalFileProtocol()` installs the handler after `app.whenReady()`.
3. The handler delegates to one response-policy owner that decodes the existing URL, reuses `validateReadableRegularFile`, opens and stats the validated file, resolves MIME with a direct `mime-types` dependency, parses at most one byte range, and returns a `200`, `206`, `404`, `405`, or `416` response as applicable.
4. A byte-stream owner reads only the selected byte window and owns idempotent handle closure across completion, cancellation, and read failure.
5. `VideoPlayer.vue` gains a local media-attempt state. A native/resource failure replaces the failed player with a localized `role="alert"` message and `Retry`; retry remounts a fresh media element and refreshes the resolved resource. A changed URL clears stale failure state.

The visible happy-path layout and native controls remain. The failed state stays centered within the existing black player surface, uses readable high-contrast text, and exposes a keyboard-operable button with visible focus styling. The UI displays a generic localized message rather than native pipeline text or an absolute path.

### Viewer State Model

| State | Condition | Rendered Outcome | Transition |
| --- | --- | --- | --- |
| `No source` | `props.url` and `resolvedUrl` are absent and no load error exists | Existing localized “Video URL is not available” placeholder | New URL -> `Media attempt` |
| `Media attempt` | A resolved URL exists and no resource/native media error is active | Fresh `<video controls>` with existing styling; no autoplay | `loadedmetadata` keeps player; native `error` -> `Failed`; URL change -> fresh `Media attempt` |
| `Failed` | `useAuthorizedObjectUrl.error` or the current video element's native `error` fires | Localized generic alert plus `Retry`; failed media element is removed | `Retry` -> clear error, refresh resolver, increment attempt key -> `Media attempt`; URL change -> fresh `Media attempt` |

No new global store state, IPC method, server route, autoplay policy, or custom controls are introduced.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | FR-001, FR-002, FR-003, FR-007 / AC-001, AC-002, AC-003, AC-009 | User selects a supported local video from the embedded Electron Files panel. | Investigation “Relevant Existing Behavior” BEH-001; exact Electron probe in the supplement. | Preserve selection/tab/native controls; load finite duration and support play, pause, and seek through the corrected scheme/response contract. | `FileItem -> useWorkspaceFileExplorer -> fileExplorerContentActions -> VideoPlayer -> local-file protocol -> validator -> range stream -> Chromium video` / DS-001, DS-004 |
| BEH-002 | User | FR-004, FR-005 / AC-004, AC-005 | Current resolved video fails resource loading or native decoding; user may activate Retry or select another URL. | Investigation BEH-002; `VideoPlayer.vue` and `useAuthorizedObjectUrl.ts` trace. | Replace silent black failure with localized accessible alert and fresh retry; URL change clears stale state. | Failure return: `protocol/decode failure -> media/resource event -> VideoPlayer alert`; recovery: `Retry -> fresh attempt -> resolver/protocol -> video` / DS-002, DS-003 |
| BEH-003 | Contract | FR-001, FR-002, FR-005, FR-007 / AC-003, AC-006, AC-007 | Trusted embedded renderer requests an encoded absolute `local-file://` resource with no range or one byte range. | Investigation BEH-003; `main.ts`, `localFileValidation.ts`, privilege/range probes. | Preserve validation-first security; add explicit scheme lifecycle, MIME, deterministic status/headers, bounded streaming, and cleanup. | `register before ready`; later `Request -> protocol owner -> decode -> validate -> open/stat -> range/MIME -> Response -> byte stream -> cleanup` / DS-004 |
| BEH-004 | Contract | FR-006 / AC-008 | Existing image/audio/PDF/Excel/CSV or text preview is selected. | Investigation BEH-004; `_loadLocalFile`, `FileViewer`, `AudioPlayer`, text IPC/workspace routing. | Preserve type routing and presentation. Local audio uses the corrected standard streaming scheme; non-media local resources receive MIME-correct full responses; text remains on existing IPC/GraphQL paths. | Binary/document: existing selection -> existing viewer -> local-file protocol -> validated full/range response; text path unchanged / DS-005, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md` | Retained evidence for exact media identity, Electron failure, scheme privilege, playback, ranges, seek, cancellation, and cleanup | FR-001, FR-002, FR-003, FR-005 / AC-001, AC-002, AC-003, AC-006, AC-007, AC-009 | Establishes why both lifecycle registration and range-capable cancel-safe streaming are required; constrains the response and E2E design but adds no intended behavior. | `Complete`; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `Yes`
- Evidence: `main.ts` installs the custom handler only after ready, never declares streaming privilege, and drops the observed `Range: bytes=0-`. The exact Electron 42.4.1 differential probe changes from code-4/NaN duration to correct metadata when streaming is declared, and seeking works only after correct range responses. The inline bootstrap function has no owner for two-phase lifecycle or response cleanup.
- Design response: Introduce one explicit local-file protocol capability owner, keep `localFileValidation.ts` authoritative, extract response/stream internals behind that owner, and keep media failure/retry state in `VideoPlayer.vue`.
- Refactor rationale: Adding only a privilege call to `main.ts` would directly fix `0:00` but leave native seek broken and leave response/resource invariants scattered in an already broad bootstrap file. The bounded extraction is necessary to enforce the complete approved behavior and make its security/resource rules testable.
- Intentional deferrals and residual risk: AudioPlayer-specific native error UI is not added because the approved visible recovery change is video-specific; audio receives corrected transport and is regression-tested. Platform codec availability remains an Electron constraint and is surfaced by the new generic video error state. Windows execution is not available on the reported host, so durable URL/range tests cover its path shape while later platform execution remains normal release coverage.

## Terminology

- **Local-file protocol owner**: The Electron main-process capability that owns `local-file` scheme registration, handler installation, and the response-policy boundary. It does not own filesystem trust policy.
- **File byte window**: A tight pair `{ start, length }` identifying the bytes a response body may read. `end` is derived and is not stored redundantly.
- **Media attempt**: One mounted video-element load identified by a monotonically changing renderer-local key. Retrying or changing the source creates a new attempt.
- **Single byte range**: One `Range: bytes=...` selector. Multipart ranges are intentionally unsupported and receive `416` without bytes.

## Design Reading Order

This spec follows the mandatory order: verified current state and approved behavior; design health/removal/data decision; spines and owners; boundaries and interfaces; capability/file allocation; then sequencing, tradeoffs, risks, and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope path: the inline `installProtocols()` and `net.fetch(file:)` response branch in `electron/main.ts`.
- Clean cut: `main.ts` will call the new lifecycle boundary only. There will be one `local-file` handler and one response implementation, with no fallback to the old ordinary fetch response.
- Preserved contracts are not compatibility layers: the scheme name, encoded URL shape, renderer capability gate, and validator are current authoritative contracts used by supported production behavior.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: User-owned local files outside application persistence; reported MP4 is 13,620,424 bytes and representative large MP4 is 607,568,129 bytes.
- Relevant code-model, serialization, semantic, or physical-store change: None. Renderer media-attempt state is ephemeral component state only.
- Normal reader/writer behavior and representative evidence: Preview reads validated bytes; no writer is added. `ffmpeg`/Electron probes read unchanged source bytes.
- Required semantics and invariants under direct use: Preserve every source byte, return only the requested valid window, and never modify/transcode/relocate the file.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Validation before read; no path/native error disclosure in the UI; no unrestricted renderer filesystem capability.
- Decision: `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The task changes transport and ephemeral UI behavior only. Rewriting or copying files would provide no correctness benefit and would introduce unacceptable I/O/corruption risk.
- Acceptance criteria or design constraints supported by this decision: FR-002, FR-005 / AC-006, AC-007.

### Migration Plan

`N/A` — no persisted schema or stored data changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Supported local-video selection | Playable/seekable native video controls | File Explorer state owns selection/resource identity; local-file protocol owns byte delivery; `VideoPlayer` owns media presentation | Shows the complete real user path across renderer/main-process boundaries. |
| DS-002 | Return-Event | BEH-002 | Protocol/resource/decode failure | Accessible viewer failure state | `VideoPlayer.vue` | Makes asynchronous native failure visible instead of leaving black `0:00`. |
| DS-003 | Primary End-to-End | BEH-002, BEH-003 | User activates `Retry` | A fresh media attempt either loads or truthfully returns to failure | `VideoPlayer.vue` | Proves retry is a new load, not merely hidden text or reuse of the failed element. |
| DS-004 | Bounded Local | BEH-001, BEH-003, BEH-004 | `local-file` `Request` inside installed handler | Correct `Response` body completion/cancellation and file-handle closure | Local-file protocol owner | Captures the internal validation/range/stream lifecycle that caused the defect. |
| DS-005 | Primary End-to-End | BEH-004 | Existing supported non-video local preview selection | Existing viewer receives compatible content; local audio can stream | Existing File Explorer/viewer dispatch plus local-file protocol | Guards shared-scheme consumers and preserved paths. |

## Primary Execution Spine(s)

- DS-001: `File item activation -> workspace-scoped File Explorer action -> trusted local-file URL state -> FileViewer video dispatch -> VideoPlayer media attempt -> Electron local-file protocol boundary -> filesystem validator -> MIME/range response -> cancel-safe file byte stream -> Chromium media pipeline -> native play/pause/seek controls`
- DS-003: `Retry button -> VideoPlayer clears current failure and increments attempt identity -> useAuthorizedObjectUrl.refresh -> fresh video element/source load -> Electron local-file protocol -> Chromium metadata/decode -> playable controls or DS-002 failure`
- DS-005: `Supported local image/audio/PDF/Excel selection -> existing File Explorer URL state -> existing viewer -> Electron local-file protocol -> validation and compatible full/range response -> existing presentation`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A supported user click becomes the existing encoded local resource identity. The video viewer mounts one attempt; Electron validates and serves only the requested file bytes; Chromium loads metadata and controls the media timeline. | File selection, local resource identity, media attempt, validated response, media playback | Existing File Explorer owner + local-file protocol owner + `VideoPlayer` at their respective boundaries | MIME lookup, localization, logging, tests |
| DS-002 | A response failure or Chromium decode failure emits outward through the video/resource event boundary; `VideoPlayer` removes the failed element and renders an alert without exposing raw native text. | Media failure event, viewer failure state | `VideoPlayer.vue` | Localization and accessibility |
| DS-003 | Retry resets only viewer-local state, refreshes any authorized object URL, increments the attempt key, and mounts a new video element so the same URL causes a fresh load. | Retry command, media-attempt identity, refreshed source | `VideoPlayer.vue` | Cache prevention in protocol responses |
| DS-004 | Inside the installed handler, the owner decodes one path, validates it, opens/stats it, calculates one response window, creates headers, hands the opened handle to the byte stream, and guarantees closure on every terminal path. | Local-file request, validated path, opened file, byte window, response | Local-file protocol owner | Existing validator, MIME resolver, safe logging |
| DS-005 | Shared-scheme non-video viewers keep their current selection/dispatch flow. The new handler supplies MIME-correct full responses; audio may use byte ranges under the same media contract. | Existing local resource identity and viewer | Existing viewer dispatch + local-file protocol owner | Regression coverage |

## Spine Actors / Main-Line Nodes

| Node | Role On Spine | Owns |
| --- | --- | --- |
| `fileExplorerContentActions` | Existing renderer selection/resource-identity owner | Trusted-context check, absolute-path check, type routing, encoded `local-file` URL state |
| `FileViewer.vue` | Thin existing viewer dispatcher | File-type-to-viewer mapping only |
| `VideoPlayer.vue` | Video presentation/recovery owner | Current media attempt identity, native/resource error state, Retry transition, accessible UI |
| `local-file-protocol.ts` | Authoritative Electron protocol boundary | Scheme identity, pre-ready registration, post-ready installation, handler exposure |
| `local-file-response.ts` | Internal response-policy owner | URL decoding, method policy, validation delegation, open/stat lifecycle, MIME/range/status/header response planning |
| `file-byte-stream.ts` | Internal resource-lifecycle owner | Reading one file byte window and idempotent close on completion/cancel/error |
| `localFileValidation.ts` | Existing shared filesystem-validation boundary | Absolute-path, regular-file, existence/readability policy |
| Chromium `<video>` | Platform media consumer | Metadata/decode/playback controls and native media events; codec availability |

## Ownership Map

- `fileExplorerContentActions` remains the authority for whether a renderer state may contain a local-file URL. It must not learn MIME, ranges, or filesystem streaming.
- `VideoPlayer.vue` owns only presentation-local media lifecycle. It must not parse protocol status, read files, or mutate global File Explorer error state.
- `local-file-protocol.ts` is the public main-process authority. It owns ordering and installation, not the detailed file validation policy.
- `local-file-response.ts` is internal to that authority and owns request-to-response transformation. It may call the validator and byte stream; `main.ts` and renderer code may not call it.
- `file-byte-stream.ts` owns the opened handle once a response body is created. The response owner must close the handle itself on every path that returns no stream.
- `localFileValidation.ts` remains a shared authoritative boundary used independently by text IPC and local-file protocol. Neither caller may reproduce its validation logic.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `electron/main.ts` lifecycle calls | `local-file-protocol.ts` | Places pre-ready and post-ready calls in the application lifecycle | URL parsing, MIME/range policy, stream construction, or cleanup |
| `FileViewer.vue` video dispatch | `VideoPlayer.vue` | Reuses shared file-type presentation boundary | Media attempt/error/retry state |
| `useWorkspaceFileExplorer.openFilePreview` | File Explorer store/content actions | Binds actions to current workspace identity | Local protocol or media behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Inline `installProtocols()` in `electron/main.ts` | It cannot express pre-ready registration and mixes response policy into broad bootstrap | `electron/local-file-protocol/local-file-protocol.ts` | In This Change | Delete function entirely; do not retain delegating wrapper. |
| `net.fetch(pathToFileURL(...))` local-file response path | Drops media ranges and has no explicit byte/cleanup policy | `local-file-response.ts` + `file-byte-stream.ts` | In This Change | No fallback branch. |
| `net`, `protocol`, and `URL` imports used only by the removed inline handler | Dead after extraction | New owner-local imports | In This Change | Keep `pathToFileURL` in `main.ts` because renderer startup URLs still use it. |
| Silent failed `<video>` rendering | Violates approved failure/retry behavior | `VideoPlayer.vue` media-attempt state and alert | In This Change | Preserve no-source placeholder separately. |

## Return Or Event Spine(s) (If Applicable)

- DS-002: `Protocol non-success or Chromium decode rejection -> useAuthorizedObjectUrl.error or native <video error> -> VideoPlayer validates event belongs to current attempt -> set local failure -> unmount failed video -> localized role=alert + Retry`
- A successful retry returns through DS-001. A failed retry re-enters DS-002 without accumulating listeners or stale state.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `local-file-protocol.ts` / response internals.
- DS-004: `Request -> require GET/HEAD -> decode existing local-file URL -> validateReadableRegularFile -> open validated path -> file-handle stat -> parse no-range/single-range -> resolve MIME and headers -> HEAD/empty response closes immediately OR GET hands handle/window to byte stream -> repeated positional read/enqueue -> close on EOF/cancel/error`.
- Why it matters: The defect lives in this lifecycle. Making it explicit prevents response status/header logic and file-handle cleanup from being scattered across bootstrap callbacks.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Filesystem validation | DS-001, DS-004, DS-005 | Local-file response | Reuse absolute/readable/regular-file policy | Existing shared security authority also serves text IPC | Duplicated security policy and drift |
| MIME lookup | DS-004, DS-005 | Local-file response | Map validated path extension through `mime-types`; fallback `application/octet-stream` | Preserve all current local binary/document types | Media/document regressions or hand-maintained divergent allowlist |
| Logging | DS-004 | Protocol boundary | Log unexpected internal failures by category without exposing raw error text to UI | Operational diagnosis | Response owner becomes UI/error-policy blob |
| Localization | DS-002, DS-003 | VideoPlayer | English/Simplified Chinese generic failure and Retry labels | Product localization/accessibility policy | Native/protocol layers gain presentation text |
| Cache prevention | DS-003, DS-004 | Local-file response | `Cache-Control: no-store` so Retry/new attempts observe current local-file availability/bytes | Same URL must cause a fresh read | Viewer adds query-string protocol knowledge |
| Unit/component coverage | All | Owning source boundaries | Protect lifecycle args, responses/ranges/cleanup, and UI transitions | Existing coverage gaps | Production code gains test-only switches |
| Real Electron validation | DS-001, DS-003, DS-004, DS-005 | Cross-boundary accepted package | Exercise actual custom scheme/media pipeline | Browser mocks cannot prove Electron media semantics | Implementation unit layer overclaims E2E confidence |

## Ownership Boundaries

Authority changes at four explicit boundaries:

1. **File Explorer resource identity boundary:** accepts an already selected path plus embedded/trusted context and produces opaque renderer state. It remains unchanged.
2. **Video presentation boundary:** accepts `url: string | null`; owns media attempt/error/retry state and emits no filesystem authority outward.
3. **Electron local-file protocol boundary:** accepts Electron `Request` only after the app lifecycle registered/installed the scheme. It encapsulates all local-file response mechanisms.
4. **Filesystem validation boundary:** accepts a decoded candidate path and returns either a normalized readable regular-file path or a stable failure. It remains shared and authoritative.

The local-file response may depend on validation, but it may not weaken or replicate it. `main.ts` may depend on the protocol boundary and the validator for the separate text IPC use case; it must not depend on protocol internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `registerLocalFileProtocolScheme` / `installLocalFileProtocol` | Electron scheme descriptor, handler callback, response owner | `electron/main.ts` | `main.ts -> protocol.handle` plus `main.ts -> local-file-response` | Extend the protocol owner, not main bootstrap. |
| `createLocalFileResponse` (protocol-internal boundary) | URL decode, open/stat, range plan, headers, stream transfer | Installed local-file handler only | Renderer/main bootstrap calls response helpers | Keep internal exports limited to tests/owned module. |
| `validateReadableRegularFile` | Path normalization/stat/access policy | Text IPC and local-file response | Either caller reimplements absolute/existence/readability rules | Extend validator only when shared filesystem policy truly changes. |
| `VideoPlayer.vue` component contract | Attempt key, media/resource error state, retry transition | `FileViewer.vue` | FileViewer/store manipulates video DOM/load state | Add a deliberate component prop/event only if a new approved cross-component need appears. |

## Dependency Rules

- `electron/main.ts -> local-file-protocol.ts` is allowed for the two lifecycle calls.
- `local-file-protocol.ts -> local-file-response.ts -> localFileValidation.ts + file-byte-stream.ts + mime-types` is allowed.
- `file-byte-stream.ts` may depend on Node `fs/promises` types/runtime only; it must not import Electron, UI, MIME, validation, or logging policy.
- `local-file-response.ts` may log unexpected failures through the existing Electron logger but may not send raw errors/paths to the renderer.
- `VideoPlayer.vue -> useAuthorizedObjectUrl` is preserved; it may use Vue-local state and localization only.
- `FileViewer`, store code, and composables must not import protocol internals or Node filesystem modules.
- `main.ts` must not register a second handler, parse local-file URLs, or retain a response fallback.
- The protocol owner must not bypass `validateReadableRegularFile` or broaden accepted paths.
- No server route or preload IPC may be added as an alternate media byte path.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `registerLocalFileProtocolScheme(): void` | `local-file` scheme capability | Register `{ standard: true, stream: true }` before ready | Constant scheme identity only | Called once at main module startup. |
| `installLocalFileProtocol(): void` | `local-file` request handling | Install exactly one post-ready handler | Constant scheme identity only | Handler delegates; no second session/partition. |
| `createLocalFileResponse(request: Request): Promise<Response>` | One local-file request | Convert method/URL/range into a validated response | Electron/Web `Request` whose URL scheme is `local-file:` | Internal to protocol owner; testable without renderer. |
| `validateReadableRegularFile(filePath: string)` | Local filesystem candidate | Enforce trusted absolute readable regular-file policy | Decoded platform path string | Existing public boundary; unchanged. |
| `createFileByteStream(handle, window)` | One opened file byte window | Positional reads and idempotent close | Open `FileHandle` + `{ start, length }` | Internal; ownership of handle transfers on success. |
| `VideoPlayer(url)` | Video presentation | Render current attempt and recovery state | URL string or null | Existing prop contract unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Scheme registration | Yes | Yes | Low | Constant scheme; no caller-supplied name. |
| Handler installation | Yes | Yes | Low | Constant default-session boundary. |
| Local response | Yes | Yes | Low | Reject wrong scheme/malformed URL before validation. |
| Validator | Yes | Yes | Low | Keep decoded absolute path contract. |
| Byte stream | Yes | Yes | Low | Store only `start + length`; validate before transfer. |
| VideoPlayer | Yes | Yes | Low | Keep one URL prop; attempt identity stays internal. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Scheme lifecycle owner | `local-file-protocol.ts` | Yes | Low | Do not call it generic `protocolHelper`. |
| Request/response policy | `local-file-response.ts` | Yes | Low | Keep it local-file-specific. |
| Resource body | `file-byte-stream.ts` / `FileByteWindow` | Yes | Low | Avoid generic `streamUtils`. |
| Viewer attempt | `mediaAttemptKey` in `VideoPlayer.vue` | Yes | Low | Avoid global “reload version” state. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Absolute/readable/regular validation | `electron/localFileValidation.ts` | Reuse | It already owns and tests this policy for protocol and text IPC. | N/A |
| Electron custom-scheme lifecycle/response | Inline callback in broad `main.ts`; no capability area | Create New | Lifecycle, ranges, MIME, and cleanup form one cohesive main-process capability and cannot remain correctly owned inline. | Server/file-explorer UI areas are wrong process/boundary. |
| MIME resolution | Workspace already uses `mime-types` in other packages | Reuse dependency pattern; add direct web dependency | Avoid duplicated extension maps and cover current viewer families. | N/A |
| Authorized remote/object resource resolution | `useAuthorizedObjectUrl` | Reuse | Retry should continue to work for credentialed sources without changing transport. | N/A |
| Video failure/retry | Existing `VideoPlayer.vue` | Extend | State is specific to one viewer instance and native media event. | A store/global error manager would be misplaced. |
| Localized local-preview messages | `localization/messages/*/tools.ts` | Extend | These non-generated catalogs already own deliberate local-preview failures. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron local-file protocol | Scheme lifecycle, request/response, range/MIME, stream cleanup | DS-001, DS-003, DS-004, DS-005 | `local-file-protocol.ts` | Create New within existing Electron subsystem | Small focused folder justified by lifecycle + response + resource-depth separation. |
| Electron local-file validation | Trusted path policy | DS-004 | `localFileValidation.ts` | Reuse | Remains at current shared path because text IPC also calls it. |
| File Explorer viewers | Video media-attempt/recovery presentation | DS-001, DS-002, DS-003 | `VideoPlayer.vue` | Extend | No store/state-model expansion. |
| Localization | English/zh-CN product strings | DS-002, DS-003 | Existing catalog runtime | Extend | Use manual `tools.ts`, not generated outputs. |
| Project documentation | Durable description of trusted protocol and viewer behavior | All | Delivery-stage docs sync | Extend | `file_explorer.md` and `electron_packaging.md`; delivery engineer owns final sync. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `electron/local-file-protocol/local-file-protocol.ts` | Electron local-file protocol | Public lifecycle owner | Scheme constant, privilege registration, handler installation | Keeps Electron lifecycle API together | Delegates response |
| `electron/local-file-protocol/local-file-response.ts` | Electron local-file protocol | Internal response owner | Decode, method, validation, open/stat, range plan, MIME, headers/status | These decisions form one request-to-response policy | Uses `FileByteWindow`, validator |
| `electron/local-file-protocol/file-byte-stream.ts` | Electron local-file protocol | Internal resource owner | Positional read loop and handle closure | Resource lifecycle is independently testable and must not be mixed with HTTP policy | Defines tight window shape |
| `components/fileExplorer/viewers/VideoPlayer.vue` | Viewer | Component owner | Media attempt, error, retry, accessible failure UI | One component instance owns the state | Uses existing composable |
| `localization/messages/{en,zh-CN}/tools.ts` | Localization | Catalog boundary | Two deliberate messages per locale | Existing local-preview catalog owner | Existing catalog type |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Byte window passed from response planner to stream | Define/export `FileByteWindow` from `file-byte-stream.ts` | Electron local-file protocol | Both response planner and stream require the same exact read identity | Yes — `{ start, length }`, derive end | Yes | General-purpose filesystem range DTO |
| Parsed range response plan | Keep discriminated union private in `local-file-response.ts` | Electron local-file protocol | Used only by response policy, so extraction would add empty indirection | Yes | Yes | Cross-subsystem HTTP range library |
| Media attempt identity | Keep scalar `mediaAttemptKey` in `VideoPlayer.vue` | Viewer | Only one component consumes it | Yes | Yes | Store/global retry generation |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `FileByteWindow { start, length }` | Yes | Yes | Low | Derive inclusive end as `start + length - 1`; never carry start/end/length together. |
| Private range plan union | Yes | Yes | Low | Distinguish `full`, `partial`, and `unsatisfiable`; no nullable mix of status/range. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/local-file-protocol/local-file-protocol.ts` | Electron local-file protocol | Authoritative public boundary | Exact scheme privileges and two-phase lifecycle API | Cohesive external protocol ownership | Calls response owner |
| `autobyteus-web/electron/local-file-protocol/local-file-response.ts` | Electron local-file protocol | Internal response policy | Decode URL; allow GET/HEAD; validate; open/stat; full/single-range plan; MIME/status/headers; handle transfer/close | One transformation policy | Imports `FileByteWindow`, validator, MIME |
| `autobyteus-web/electron/local-file-protocol/file-byte-stream.ts` | Electron local-file protocol | Internal resource owner | Byte-oriented Web `ReadableStream`, positional reads, idempotent close | Isolates the cancellation-sensitive resource lifecycle | Exports `FileByteWindow` |
| `autobyteus-web/electron/local-file-protocol/__tests__/local-file-protocol.spec.ts` | Electron tests | Lifecycle contract evidence | Exact privileges and one handler registration | One lifecycle subject | Mocks Electron protocol |
| `autobyteus-web/electron/local-file-protocol/__tests__/local-file-response.spec.ts` | Electron tests | Response/resource contract evidence | Paths, MIME, full/range/416/invalid, bytes, cancellation/cleanup | Exercises owned request-to-response boundary | Uses temp files; can directly test byte stream cleanup |
| `autobyteus-web/electron/main.ts` | Electron bootstrap | Thin lifecycle caller | Invoke registration before ready; install after ready; remove inline handler | Existing app entry remains entry-only | Uses public protocol boundary |
| `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue` | File Explorer viewer | Video presentation owner | Attempt key, error/reset/retry, alert/button | User-visible state is component-local | Reuses authorized URL composable |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/VideoPlayer.spec.ts` | Nuxt component tests | Viewer-state evidence | Native/resource error, alert, retry remount, URL reset, no-source | One component behavior subject | Mocks composable refs/refresh |
| `autobyteus-web/localization/messages/en/tools.ts` | Localization | English catalog | Generic video failure and Retry strings | Existing deliberate local-preview catalog | Existing merge runtime |
| `autobyteus-web/localization/messages/zh-CN/tools.ts` | Localization | zh-CN catalog | Equivalent translated strings | Existing deliberate local-preview catalog | Existing merge runtime |
| `autobyteus-web/package.json`; root `pnpm-lock.yaml` | Package management | Direct dependency contract | Add `mime-types` production dependency and `@types/mime-types` development dependency to web importer | Electron package must not rely on transitive workspace availability | Existing versions/pattern |
| `autobyteus-web/docs/electron_packaging.md`; `docs/file_explorer.md` | Documentation | Delivery-stage durable docs | Explain scheme lifecycle/ranges/validation and video failure/retry | Existing canonical docs | Updated by delivery engineer after validation |

## Applied Patterns (If Any)

- **Authoritative boundary:** `local-file-protocol.ts` exposes the only lifecycle API; bootstrap never reaches its internals.
- **Discriminated response plan:** private `full | partial | unsatisfiable` result prevents nullable/contradictory range fields.
- **Resource ownership transfer:** response owner opens the file and either closes it before returning a bodyless response or transfers the handle exactly once to the stream owner.
- **Keyed retry/remount:** a component-local monotonically changing key guarantees a new native media element for Retry and URL changes without a global state machine.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/local-file-protocol/` | Folder | Electron local-file capability | Lifecycle, response, stream, and colocated tests | The capability has three real depths and deserves a readable main-process boundary | Renderer/UI state, server routes, generic filesystem utilities |
| `.../local-file-protocol.ts` | File | Public protocol owner | Pre-ready privileges and post-ready handler | Electron boundary entry | Byte loop or UI strings |
| `.../local-file-response.ts` | File | Internal response owner | URL/method/validation/range/MIME/headers | Request-to-response policy | Electron app bootstrap or Vue state |
| `.../file-byte-stream.ts` | File | Internal resource owner | File byte-window stream and cleanup | Cancellation-sensitive mechanism | URL/range syntax or validation policy |
| `autobyteus-web/electron/localFileValidation.ts` | File | Existing shared validator | Trusted path policy | Used by protocol and text IPC | MIME/stream/response behavior |
| `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue` | File | Video viewer | Player and recovery UI | Existing viewer location | Node/Electron imports or global store error policy |
| `autobyteus-web/localization/messages/*/tools.ts` | File | Tool/File Explorer catalog | Explicit failure/retry strings | Existing manual override owner | Generated catalog rewrites |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `electron/local-file-protocol/` | Mixed Justified: transport entry + internal response/resource mechanisms under one owner | Yes | Low | Three cohesive files expose depth without one-folder-per-step fragmentation. |
| `electron/` root | Mixed existing application shell | Yes after extraction | Medium -> Low | Removing inline protocol policy reduces the broad main entry's mixed responsibility. |
| `components/fileExplorer/viewers/` | Main-Line presentation | Yes | Low | Video state remains with its actual UI owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Lifecycle ordering | `registerLocalFileProtocolScheme(); ... await app.whenReady(); ... installLocalFileProtocol();` | Calling `registerSchemesAsPrivileged` inside the post-ready handler installer | Electron enforces pre-ready privilege declaration. |
| Handler ownership | `main -> installLocalFileProtocol -> createLocalFileResponse` | `main -> protocol.handle` while also importing range/stream helpers | Prevents mixed-level boundary bypass. |
| Partial response | Request `bytes=100-199` for size 1000 -> `206`, `Content-Range: bytes 100-199/1000`, length `100`, stream `{start:100,length:100}` | Forwarding/ignoring Range and returning an unbounded `200` | Native seeking depends on truthful byte identity. |
| Unsatisfiable response | `bytes=1000-` for size 1000 -> `416`, `Content-Range: bytes */1000`, no body, opened handle closed | Clamping start to last byte or returning source bytes | Meets deterministic no-byte failure invariant. |
| Resource transfer | Open -> validate plan -> hand handle to cancel-safe stream; stream closes exactly once | `Readable.toWeb(fs.createReadStream(...))` with unverified cancellation | Exact large-file probe showed generic adaptation can fail. |
| Retry | Clear failure -> increment key -> `refresh()` -> mount new `<video>` | Hide the alert while retaining the same failed DOM node | Acceptance requires a fresh load attempt. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Retain old `net.fetch(file:)` as fallback when ranged streaming fails | Minimal diff and perceived safety | Rejected | One validated response owner handles full and partial requests; remove old branch. |
| Add `stream: true` but preserve ordinary 200-only behavior | Directly fixes screenshot metadata | Rejected | Add standard+stream privileges and correct full/single-range contract because seek is approved and probed. |
| Fall back to unrestricted `file://` | Avoid custom response work | Rejected | Keep trusted custom scheme and validator. |
| Add new IPC/Blob whole-file path alongside custom scheme | Could make small videos play | Rejected | Stream through the single scheme boundary; no dual media transport or whole-file memory cost. |
| Keep an inline `installProtocols` wrapper delegating to the new owner | Could reduce main diff | Rejected | Delete it; call the public owner directly at the correct lifecycle points. |

## Derived Layering (If Useful)

`Renderer selection/presentation -> Electron protocol boundary -> response policy -> shared filesystem validation + file stream -> OS file handle`. MIME and logging are off-spine concerns serving response policy. This layering is derived from the actual media request path; it does not introduce a generic transport/service/repository stack.

## Change / Refactor Sequence

1. Add direct `mime-types` and type dependencies to the web package/lockfile.
2. Implement `file-byte-stream.ts` first with tight `{ start, length }` identity and idempotent close semantics; add focused completion/cancel/error tests.
3. Implement `local-file-response.ts`: preserve current URL decoding including Windows drives; enforce GET/HEAD; call existing validator; open/stat; plan full/single range; set MIME, `Accept-Ranges`, `Content-Length`, conditional `Content-Range`, and `Cache-Control: no-store`; close on every no-body/failure path; transfer ownership only when constructing a stream body.
4. Implement `local-file-protocol.ts` with constant scheme, exact minimal privileges, registration entry, and installer entry; add lifecycle tests.
5. Refactor `electron/main.ts`: invoke registration immediately after imports/before bootstrap; replace the post-ready inline installer with `installLocalFileProtocol`; delete inline handler and dead imports. Do not keep a compatibility wrapper.
6. Extend `VideoPlayer.vue` with the approved attempt/error/retry state and accessible presentation. Add explicit English/zh-CN catalog keys and component tests.
7. Run implementation-scoped unit/component tests, Electron TypeScript transpilation, and localization guards/audit. Fix only implementation-owned source/packaging issues at this stage.
8. After source review passes, API/E2E owns realistic Electron 42.4.1/custom-scheme validation for exact/equivalent video metadata, play, pause, seek, later range, failure/retry, audio and non-video regression. Do not claim browser/component mocks prove AC-009.
9. After API/E2E pass and proportional test review, delivery updates `electron_packaging.md` and `file_explorer.md` with validated final behavior.

## Key Tradeoffs

- **Dedicated protocol folder vs one large `main.ts` callback:** Three cohesive source files add visible structure but remove a broad bootstrap responsibility and make lifecycle/resource invariants testable. This is proportionate to the cross-boundary defect.
- **Direct `mime-types` dependency vs static map:** A small direct dependency is preferable because current local-file consumers span video, audio, images, PDF, CSV, and multiple Excel extensions. A duplicated map would drift from the File Explorer allowlist and platform MIME expectations.
- **Single range vs multipart ranges:** Chromium media needs single ranges for the approved flow. Rejecting multipart with `416` is simpler, deterministic, and avoids a multipart response encoder with no demonstrated product need.
- **Byte-oriented Web stream vs `net.fetch`/Node stream adapter:** The explicit loop is more code, but it provides positional reads and deterministic cancellation cleanup proven necessary by the large-file probe.
- **Viewer-local error vs global file state:** Local state cannot be shared across viewers, but the failure is native-video-specific and ephemeral. Globalizing it would couple decode state to File Explorer resource state without benefit.
- **Generic message vs raw media error:** Generic localized wording is less diagnostic to an end user but avoids leaking paths/native pipeline detail and remains truthful across missing, unreadable, and unsupported-codec failures.

## Risks

- A file can be truncated/replaced after validation/stat. The open handle and bounded reader must close; Chromium will surface failure through the viewer. Live mutation reconciliation is outside approved scope.
- Incorrect byte-stream controller semantics could reproduce `PIPELINE_ERROR_READ`. Unit cleanup tests are necessary but not sufficient; actual Electron seek/cancel validation is mandatory.
- MIME lookup fallback may not make Chromium decode a format that Electron lacks. The UI must not claim codec support.
- Windows URL parsing cannot be live-executed on macOS. Preserve current drive reconstruction and add deterministic tests for `C:` paths, spaces, Unicode, `%`, and `#`.
- Component Retry can be ineffective if it reuses the failed media DOM node. The attempt key/remount is mandatory, not optional styling.
- A second privileged scheme registration or a post-ready call will break the lifecycle contract. Keep one top-level call and one lifecycle owner.
- Building/launching validation from this worktree must not terminate, reuse the data profile of, or overwrite the user's currently running package.

## Guidance For Implementation

- Use only `{ standard: true, stream: true }`; do not add `bypassCSP`, `corsEnabled`, `secure`, or `supportFetchAPI` without new evidence.
- Keep `LOCAL_FILE_SCHEME` private/exported only as needed by the owner/tests; renderer URL construction already uses the stable literal and does not need a cross-process shared package for this bug fix.
- Reject wrong scheme/malformed URL/invalid validated path without opening or returning bytes. Preserve the current Windows reconstruction behavior.
- Recommended response policy:
  - no Range: `200`, full `Content-Length`, `Accept-Ranges: bytes`, MIME, `Cache-Control: no-store`;
  - valid single Range: `206` plus exact `Content-Range` and selected length;
  - malformed/multiple/unsatisfiable Range: `416`, `Content-Range: bytes */<size>`, no body;
  - validation/open failure: generic `404`, no body;
  - non-GET/HEAD: `405`, `Allow: GET, HEAD`, no body;
  - HEAD: same selected/full headers without body and close immediately.
- Accept `start-end`, `start-`, and `-suffix`; clamp an oversized end to file size; reject zero/invalid suffix, start beyond EOF, non-digits, reversed range, and comma-separated multipart ranges. A zero-length file has a valid full `200` with zero body and no valid byte range.
- Open the validated path once per request and use the opened handle's `stat()` for the response size. Close it before returning every bodyless/error response. When a GET body is created, transfer ownership to `file-byte-stream.ts` and make close idempotent.
- Use positional reads bounded by remaining length in a byte-oriented WHATWG `ReadableStream`. Do not materialize the file, create a Blob, or use unverified generic `Readable.toWeb` conversion.
- In `VideoPlayer.vue`, never render raw `resourceError`, `MediaError.message`, protocol URL, or absolute path. Treat either resource or native media error as the same approved generic failure.
- Increment the attempt key for both Retry and URL change. Clear native error on URL change and before refresh. A successful `loadedmetadata` may defensively clear the current-attempt native failure.
- Add explicit strings to non-generated `localization/messages/en/tools.ts` and `zh-CN/tools.ts`; do not hand-edit `tools.generated.ts`.
- Implementation-engineer checks should include focused Electron tests, focused VideoPlayer tests, `pnpm transpile-electron`, and localization boundary/literal guards. API/E2E execution and durable realistic-test decisions remain with `api_e2e_engineer` after code review.
