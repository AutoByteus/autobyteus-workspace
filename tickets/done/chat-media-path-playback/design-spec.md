# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (CRR-001 Design Impact: Retry on the phone viewer's own failure state, D-7)
- Approved requirements: `requirements-doc.md` at SR-002, approved by the **user** (2026-11-20; DEC-001 = A: keep today's security rules, show the download honestly).
- User approval of the design: `Not required`.
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback/tickets/in-progress/chat-media-path-playback/investigation-notes.md`
- Authorities read (this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md` (Cases 2, 3, 5), `autobyteus-server-ts/docs/design/node_access_model.md`.
- Conflicts: None.

## Current-State Read

- The phone downloads every protected media file whole before showing it; there are two download owners:
  - **Workspace route** (an absolute path inside the open agent's folder; a relative path in chat is not a file link at all, DEC-003): `mobileFileOpening.ts:39` → `openFile` → `fileExplorerContentActions.ts:261-266` sets `url` to `/rest/workspaces/<id>/content?path=…` at once → the player's `useAuthorizedObjectUrl` (`useAuthorizedObjectUrl.ts:41-75`) downloads it (`fetchAuthorizedResourceBlob`, `authorizedResourceUrl.ts:63-77`) while `resolvedUrl` is null → `VideoPlayer.vue:19-21` / `AudioPlayer.vue:3-6` show "… URL is not available." for the whole download (reproduced: 9.6 s for 9.7 MB at 8 Mbit/s).
  - **Node-file route** (outside the folder): `mobileFileOpening.ts:42` → `useMobileNodeFile.ts:40-60` → `loadNodeFileFromUrl` (`nodeFileContent.ts:38-50`, `response.blob()`) while `MobileFileViewer.vue:20` shows "Opening…".
- Neither download reports progress, and the node's file replies have no length: `sendUserFile` (`autobyteus-server-ts/src/api/rest/user-file-reply.ts:16-21`) sends a stream without `Content-Length` (13 callers).
- `AudioPlayer` shows the raw download error text (`AudioPlayer.vue:5`) and has no Retry; `VideoPlayer` has a plain failure + Retry (`VideoPlayer.vue:3-8`).
- Desktop: the player gets the URL directly (no phone credential, `mobileNodeSessionStore.ts:113`); embedded absolute paths use `local-file:` with Range. Unchanged by this ticket.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` — web: one progress-reading helper, the two download owners report progress, one loading view used by video, audio and the phone viewer, the audio player's failure state, localization; server: `sendUserFile` declares the file's length (the type change touches its 13 callers mechanically); tests and probes.
- Architectural risk: `Low` — no security, credential, route-permission or path-rule change (REQ-004: the phone's key stays in the request header); no persistence; no new owner beyond a small helper; the response gains a standard `Content-Length` header. The two existing download owners keep their ownership.
- Escalation trigger: any need to change how the phone authenticates media, a route permission, or the path rules (that is FU-001's ground).

## Design Decisions

- **D-1 The download reports its progress.** New `readResponseBlobWithProgress(response, onProgress)` (`autobyteus-web/utils/download/responseBlobProgress.ts`): reads the body with its reader, calls `onProgress({ loaded, total })` (`total` from `Content-Length`, `null` when absent), returns the `Blob` (type from `Content-Type`). Used by `fetchAuthorizedResourceBlob` (new optional `onProgress` argument) and `loadNodeFileFromUrl` (same). A response without a body falls back to `response.blob()`.
- **D-2 The players show loading, not "not available".** `useAuthorizedObjectUrl` returns `loading` and `progress` refs (set while it downloads; cleared on success, failure, unmount or a new source). `VideoPlayer` and `AudioPlayer` render, in order: failure (plain text + Retry) → loading (`MediaLoadingState`) → the element → "… URL is not available." only when there is no URL at all and nothing loads.
- **D-3 One loading view.** `MediaLoadingState.vue` (`components/fileExplorer/viewers/`): spinner, "Loading video…" / "Loading audio…" / "Loading file…", and "4.1 of 9.7 MB" when the total is known (else "4.1 MB"), `role="status"`. The size text comes from one formatter in the same file (`formatLoadingProgress`).
- **D-4 The phone's node-file route shows the same view.** `useMobileNodeFile` exposes `progress`; `MobileFiles` passes it to `MobileFileViewer`, which shows `MediaLoadingState` (with the file's type) instead of the bare "Opening…" while a node file loads. Text files keep "Opening…" when no progress is reported yet.
- **D-5 The node declares the file's length.** `UserFileContent` gains a required `size: number | null`; `sendUserFile` sets `Content-Length` when it is a number. Callers that stat the file pass its size: workspace content and static (`workspaces.ts`), node files (`node-file-reader.ts` returns the size from the opened handle's `stat`), `files.ts`, `context-files.ts`, `run-file-changes.ts`; callers that receive a stream from another module pass the size where that module has it, else `null` (`agent-org-references.ts`, `team-communication.ts`, `agent-collaboration-references.ts`; each named in the implementation handoff). No compression is installed, so the length is the body's length.
- **D-7 (SR-004) Retry on the phone viewer's own failure state.** `MobileFileViewer` gets a `retryable: boolean` prop and emits `retry`; its failure branch (`MobileFileViewer.vue:20`) shows the plain message and, when `retryable`, a Retry button (min 44 px, the same label as the players'). `MobileFiles` wires both mounts:
  - node-file mount (`MobileFiles.vue:78-85`): `useMobileNodeFile` returns `reload()` (reads the current source again: new serial, release the old object URL, reset progress, `load`) and the refusal kind; `retryable` = the refusal is `failed` or `not-found` (not `folder`); `retry` → `reload()`.
  - workspace mount (`MobileFiles.vue:69-75`): `retryable` = an open error is shown; `retry` → `explorer.openFileReadOnly(openPath)` (an explicit open reads the file again, autobyteus-450).
  The players keep their own failure + Retry (D-2, D-6); a media file whose download fails inside the player never reaches this branch.
- **D-6 Audio failure like video.** `AudioPlayer` gets `VideoPlayer`'s failure state: plain "This audio could not be played." with Retry (`refresh`), no raw error text.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003. Web: `utils/download/responseBlobProgress.ts` (Add), `utils/remoteAccess/authorizedResourceUrl.ts`, `utils/fileExplorer/nodeFileContent.ts`, `composables/useAuthorizedObjectUrl.ts`, `composables/mobile/useMobileNodeFile.ts`, `components/fileExplorer/viewers/{VideoPlayer,AudioPlayer}.vue`, `components/fileExplorer/viewers/MediaLoadingState.vue` (Add), `components/mobile/views/{MobileFileViewer,MobileFiles}.vue`, localization (`tools.ts` en/zh-CN: new keys; the generated catalogs are not edited by hand). Server: `api/rest/user-file-reply.ts` and its callers; `node-files/node-file-reader.ts` (size). Tests; the phone probe's durable media cases (replacing the scratch `MSP-572`); a desktop probe case.
- Derived consumers: `sendUserFile`'s 13 callers (each passes `size`); `fetchAuthorizedResourceBlob` callers (the new argument is optional: image/PDF/thumbnail callers unchanged); `loadNodeFileFromUrl` callers (store `_loadNodeFile`, `useMobileNodeFile`; the store passes no callback: desktop unchanged); `useAuthorizedObjectUrl` callers (new refs unused elsewhere: unchanged).
- Deliberately left alone: authentication (header key, gate, permissions, revocation), path rules, desktop embedded `local-file:`, the desktop store's node-file loading text, images/PDF viewers' behavior, Range/streaming (FU-001).
- Follow-ups: FU-001 (streaming without keys in links).

## Behavior → Path Map

| BEH | Path after |
| --- | --- |
| BEH-001 phone inside the folder | store url → player `useAuthorizedObjectUrl` (progress) → `MediaLoadingState` → element |
| BEH-002 phone outside the folder | `useMobileNodeFile` (progress) → `MobileFileViewer` `MediaLoadingState` → player with the object URL (no second download: a `blob:` URL is used as is) |
| BEH-004/005/006 desktop | unchanged |
| BEH-007 failure | inside the player (workspace media): the player's plain text + Retry; before a player exists (node files; workspace open errors): the phone viewer's plain text + Retry (not for a folder), D-7 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`.
- Design issue found: `Yes` — a loading state expressed by absence (`resolvedUrl === null` means both "loading" and "no URL"; Principle 13 behavior by absence) and duplicated failure presentation (video vs audio).
- Triggers: Behavior by absence (13) → explicit `loading`/`progress` (D-2); Several kinds (1): both phone routes, video/audio, inside/outside, delegated runs, desktop windows (D-4, tests); Capability reuse (4): the existing download owners report progress, no new downloader.
- Root cause classification: `Missing Invariant` (a viewer always says what is happening).
- Refactor needed now: `No` beyond the explicit states.

## Spines

- DS-001 phone inside: `tap path → openMobileFilePath → openFile (url) → FileViewer → VideoPlayer/AudioPlayer → useAuthorizedObjectUrl → fetchAuthorizedResourceBlob(onProgress) → readResponseBlobWithProgress → node GET (header key; Content-Length) → object URL → element`.
- DS-002 phone outside: `tap path → openMobileFilePath → openNodeFile → useMobileNodeFile → loadNodeFileFromUrl(onProgress) → readResponseBlobWithProgress → node GET → object URL → MobileFileViewer → player`.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `AudioPlayer`'s raw `resourceError` text | Internal words | D-6 plain failure + Retry |
| Bare "Opening…" for media node files on the phone | No progress | `MediaLoadingState` |
| Scratch `MSP-572` in `mobile-file-open-cases.mjs` | Scratch | Durable phone media cases |

## Persisted Data

- `Not Affected`.

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| Optional `size` defaulting silently | Rejected: required `size: number | null`, each caller decides |

## Change Sequence

1. Failing tests: unit for the players' states (loading never shows "not available"), progress helper, `useAuthorizedObjectUrl` loading/progress, `useMobileNodeFile` progress; server unit: `Content-Length` on workspace content and node files.
2. D-5 server; D-1 helper and its two callers; D-2/D-3/D-6 viewers; D-4 phone node-file view; localization.
3. (SR-004) Unit: `useMobileNodeFile.reload()` reads again and resets progress; `MobileFileViewer` shows Retry when `retryable`, emits `retry`, none for a folder. Probes: MSP-91's outside-folder Retry after a killed node (reloads and plays); an outside-folder path to a missing video: plain message + Retry, the file then created, Retry opens and plays it; an outside-folder folder path: message, no Retry.
4. Probes: phone (production bundle): video and audio inside and outside the folder, a delegated run's conversation (a relative link is recorded as a plain link, FU-003), a ~10 MB video on a throttled link (progress text rises; plays), a missing file (plain text + Retry); network record shows no key in any `/rest` URL; desktop window: the same links play. Remove the scratch case.

## Risks

- R-1: very large videos still download whole and use the phone's memory (accepted by DEC-001; FU-001).
- R-2: a length that changes while the file is read (a file being written) makes the progress total wrong; the download still completes.

## Guidance For Implementation

- Reproduction: `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-572 --output-dir=<dir>` in `autobyteus-web` (needs `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`); `SD572_THROTTLE_KBPS=8000` shows the 9.6 s "Video URL is not available." on the ~10 MB inside video. The fix turns that timeline into the loading view with rising progress.
- Synthetic media only (ffmpeg `lavfi` sources, as the scratch case does); no private paths in fixtures or commits.
