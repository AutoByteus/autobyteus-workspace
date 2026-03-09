# Proposed Design Document

## Design Version

- Current Version: `v2`

## Artifact Basis

- Investigation Notes: `tickets/in-progress/voice-input-bilingual-runtime/investigation-notes.md`
- Requirements: `tickets/in-progress/voice-input-bilingual-runtime/requirements.md`
- Requirements Status: `Refined`

## Summary

Implement the next Voice Input release as a managed bilingual extension with separate install and enable state, stored under the canonical AutoByteus home-folder data root, and backed by a local managed worker process instead of one-shot CLI transcription.

- The desktop app keeps the current `Extensions` product surface.
- Voice Input lifecycle becomes:
  - `Install`
  - `Enable`
  - `Disable`
  - `Reinstall`
  - `Remove`
- The extension registry persists install state separately from enabled state and language preference.
- Electron and the server runtime share one canonical base data root helper so Voice Input installs under `~/.autobyteus/extensions`.
- Electron manages one local worker process for Voice Input and communicates with it through a structured local protocol.
- Platform backends differ behind that contract:
  - macOS arm64 -> MLX-based bilingual backend
  - macOS x64 / Linux x64 / Windows x64 -> shared `faster-whisper`-based bilingual backend
- The dedicated runtime repository continues to publish pinned release assets, but the release now carries only lightweight worker bundles plus manifest metadata.
- Backend dependencies and bilingual model assets are installed locally on the user machine during `Install`.

## Goals

- Fix the extension storage-root bug by deriving extension paths from the canonical AutoByteus base data root.
- Separate install state from active-use state.
- Support `Auto`, `English`, and `Chinese`.
- Support English-only, Chinese-only, and mixed Chinese-English dictation.
- Suppress no-speech/silence hallucinations instead of appending garbage text into drafts.
- Keep transcription local to the user’s machine.
- Keep the release/download architecture based on the dedicated runtime repository.
- Keep GitHub Release payloads small by removing model archives from the release lane.
- Preserve a clear app-owned contract between renderer, Electron, and runtime.

## Legacy Removal Policy

- Policy: `No migration and no legacy retention in scope.`
- Consequences:
  - do not preserve the old `userData` extension location as a supported runtime path
  - do not keep the old English-only one-shot runtime contract as an alternate code path
  - do not revive the old websocket/backend transcription flow
  - recovery path for old installs is `Remove` + `Install` + `Enable`

## Current State (As-Is)

- Extension files are stored under Electron `userData` because `main.ts` constructs `ManagedExtensionService(app.getPath('userData'))`.
- Server runtime data and logs already use `~/.autobyteus/...`, creating a split storage-root contract.
- The Voice Input product model is install-only:
  - `not-installed`
  - `installing`
  - `installed`
  - `error`
- The mic becomes available immediately after install because renderer availability is derived from `status === 'installed'`.
- Transcription requests are hardcoded to English.
- Runtime invocation is one-shot `spawn(binary, args...)`.
- Runtime output is plain text only.
- Runtime release `v0.1.1` is English-only `whisper.cpp` with model `ggml-tiny.en-q5_1.bin`.

## Target State (To-Be)

- One canonical AutoByteus app-data helper computes:
  - base root
  - `server-data`
  - `extensions`
  - logs
- Voice Input install and enable are separate.
- Extension registry stores:
  - install status
  - enabled flag
  - language mode
  - runtime/model versions
  - backend kind
  - last error / health state
- Shared composer shows mic only when Voice Input is installed, enabled, and runtime-ready.
- Electron manages one local worker process per enabled Voice Input installation.
- Electron sends structured transcription requests to the worker and receives structured results.
- `Auto` is default language mode.
- `Auto` and `Chinese` use multilingual model policy.
- One bilingual install baseline supports `Auto`, `English`, and `Chinese` without separate language-specific extension packages.
- Silence/no-speech is filtered before the draft is mutated.

## Product State Model

### User-Visible States

- `Not Installed`
- `Installing`
- `Installed and Disabled`
- `Installed and Enabled`
- `Needs Attention`

### Lifecycle Actions

- `Install`
  - download runtime bundle from the pinned release
  - run local backend/model bootstrap for the current machine
  - persist `installed=true`, `enabled=false`, `languageMode=auto`
  - do not start dictation automatically
- `Enable`
  - mark extension enabled
  - lazily start worker on first use or preflight it immediately
- `Disable`
  - stop worker if running
  - keep installed assets
- `Reinstall`
  - stop worker if running
  - refresh bundle and rerun local bootstrap
  - preserve enabled flag and language mode unless reinstall fails
- `Remove`
  - stop worker
  - delete install directory
  - reset Voice Input state to default not-installed record

### Persisted State Shape

`ManagedExtensionRecord` should evolve from a single `status` field to a combined model:

- install status:
  - `not-installed | installing | installed | error`
- enabled:
  - `boolean`
- language mode:
  - `auto | en | zh`
- backend kind:
  - `mlx | faster-whisper`
- runtime metadata:
  - runtime version
  - model version
  - runtime entrypoint
  - model location / bundle location
- health metadata:
  - last error
  - last health check / inspection result

Renderer derives the user-facing state from `install status + enabled`.

## Canonical Data-Root Design

### Core Decision

Introduce one shared Electron-side app-data-path helper and make all in-scope components use it.

### Helper Responsibilities

- compute canonical base data root:
  - current product contract: `~/.autobyteus`
- expose derived paths:
  - `server-data`
  - `extensions`
  - logs
- prevent future drift between:
  - server startup
  - logger
  - extension manager
  - tests

### Resulting Layout

```text
~/.autobyteus/
  logs/
  server-data/
  extensions/
    registry.json
    voice-input/
      installation.json
      runtime/
      models/
      temp/
```

### Clean-Cut Rule

- `ManagedExtensionService` must stop accepting `userDataPath` as its storage root input.
- It should instead accept the canonical base data root or canonical extensions root from the shared helper.

## Runtime Architecture Decision

### Chosen Option

Use a local managed worker process, not a remote server and not a one-shot executable-per-request design.

### Why

- model/runtime stays warm
- cleaner structured request/response contract
- simpler no-speech handling and worker health checks
- better path to partial/streaming support later without redesigning the app boundary
- avoids open localhost ports and remote network dependencies

### Worker Transport

- Electron <-> worker transport:
  - JSON over `stdio`
- No public localhost HTTP listener
- No websocket layer

### Worker Lifetime

- created only when:
  - extension is enabled and first needed, or
  - enable path performs eager health start
- reused for subsequent transcription requests
- stopped when:
  - extension is disabled
  - extension is removed
  - app shuts down

### Worker Request Contract

Electron writes the recorded WAV into the extension temp directory and sends a structured request to the worker:

```json
{
  "requestId": "uuid",
  "type": "transcribe-file",
  "audioPath": "/abs/path/to/file.wav",
  "languageMode": "auto"
}
```

### Worker Response Contract

```json
{
  "requestId": "uuid",
  "ok": true,
  "text": "ni hao hello",
  "detectedLanguage": "zh",
  "noSpeech": false,
  "confidence": 0.87,
  "error": null
}
```

The exact fields can be adjusted during implementation, but the contract must remain structured and must carry enough information to suppress transcript insertion on no-speech / unusable output.

## Platform Backend Strategy

### Contract Principle

Electron and renderer see one Voice Input API. Platform runtime internals can differ.

### Backend Matrix

| Platform | Backend | Reason |
| --- | --- | --- |
| `darwin/arm64` | MLX-based local worker | Best fit for Apple Silicon; aligns with user direction |
| `darwin/x64` | `faster-whisper`-based bilingual worker | Retains current x64 support without MLX dependency |
| `linux/x64` | `faster-whisper`-based bilingual worker | Reuses bilingual policy similar to `phone-av-bridge` |
| `win32/x64` | `faster-whisper`-based bilingual worker | Supports Windows under the same non-MLX runtime family |

### Backend Policy

- macOS Apple Silicon backend is MLX-first.
- Remaining targets use a shared `faster-whisper` runtime family.
- `Auto` and `zh` must use multilingual model policy.
- `en` may use the same bilingual model with an English hint; no separate English-only path is required for v2.

## Runtime Repository Design

### Repository

- `AutoByteus/autobyteus-voice-runtime`

### Release Contract Evolution

Move from v1 manifest schema:

- one binary asset per platform
- one global model asset

to v2 manifest schema:

- one bundle per platform/backend
- backend metadata per platform
- platform-scoped upstream model metadata
- one app-owned manifest describing:
  - runtime version
  - backend kind
  - platform/arch
  - bundle URL + checksum
  - entrypoint path inside bundle
  - bootstrap command/contract
  - upstream model identifier(s) + expected install location metadata

### Bundle Direction

- `darwin/arm64`
  - archive containing MLX worker launcher + runtime dependencies
- `darwin/x64`, `linux/x64`, `win32/x64`
  - archive containing non-MLX worker launcher + runtime dependencies

Current `VoiceInputRuntimeService` already knows about `distributionType`; v2 should keep archive install/extract support for the worker bundle, but must stop assuming the release also carries model payloads.

### Local Bootstrap Contract

- Ownership:
  - runtime bundle owns backend-specific dependency installation and model download details
  - Electron orchestrates install state and verifies bootstrap completion
- Install sequence:
  - download and extract the runtime bundle from the pinned release
  - run a bootstrap command inside the installed runtime
  - bootstrap creates/updates `.venv`
  - bootstrap installs backend requirements
  - bootstrap downloads the bilingual model from the authoritative upstream source into the extension-owned `models/` directory
  - bootstrap writes machine-local installation metadata for later worker startup
- Model policy:
  - `darwin/arm64` -> one MLX multilingual model baseline
  - remaining targets -> one `faster-whisper` multilingual model baseline
  - `English` mode reuses the same bilingual baseline with an explicit language hint in v2
- Release policy:
  - no model archives in GitHub Release assets
  - Stage 7 must prove the release asset list stays lightweight

## Renderer / Electron / Runtime Boundary Design

### Renderer

- `extensionsStore`
  - initialize extension state
  - install / enable / disable / reinstall / remove
  - persist and expose language preference
- `voiceInputStore`
  - record audio
  - request transcription through Electron
  - merge accepted transcript into draft
  - suppress draft mutation on no-speech / unusable result

### Preload

Expose typed methods for:

- `enableExtension`
- `disableExtension`
- `updateVoiceInputSettings`
- `transcribeVoiceInput(request)`

The existing primitive `transcribeVoiceInput(audioData, language?)` signature should be replaced by a structured request shape.

### Electron Main / Services

- `ManagedExtensionService`
  - registry persistence
  - canonical path ownership
  - install / enable / disable / reinstall / remove orchestration
- `VoiceInputRuntimeService`
  - install / inspect / remove runtime bundles
  - invoke install-time local bootstrap
  - start / stop / health-check worker
  - send transcription requests to worker
- optional helper split if needed:
  - `voiceInputWorkerClient.ts`
  - `appDataPaths.ts`

## Settings UX Design

### Voice Input Card

The card should show:

- install state badge
- enable state badge or toggle
- runtime version
- model version
- `Install` / `Enable` / `Disable` / `Reinstall` / `Remove`
- `Open Folder`
- language selector when installed

### Control Rules

- `Install` visible only when not installed
- `Enable` visible when installed and disabled
- `Disable` visible when installed and enabled
- `Reinstall` visible when installed or in error
- `Remove` visible when installed or in error
- language selector disabled while install/reinstall is in progress

## Composer Behavior Design

- mic button visibility:
  - only when installed + enabled + not in error
- stop button replaces mic while recording
- status strip stays visible during:
  - recording
  - transcribing
- on result:
  - if `ok` and not `noSpeech`, append transcript to draft
  - else keep draft unchanged and surface feedback

## Separation Of Concerns

| Layer | Owns | Must Not Own |
| --- | --- | --- |
| Settings UI | extension controls and status rendering | filesystem/process logic |
| Renderer stores | lifecycle actions, language preference, recorder UI state | process spawning, path derivation |
| Preload | typed IPC bridge | product logic |
| Electron extension service | registry + install/enable/disable/remove orchestration | Vue/Pinia concerns |
| Electron runtime service | bundle install, worker lifecycle, request dispatch | UI concerns |
| Runtime repository | backend implementation, bundle packaging, release publication | desktop UI state |

## File / Module Plan

| Change ID | Change Type | Path | Purpose |
| --- | --- | --- | --- |
| `C-001` | Add | `autobyteus-web/electron/appDataPaths.ts` | Canonical base-data-root helper reused by server/logger/extensions |
| `C-002` | Modify | `autobyteus-web/electron/main.ts` | Build extension service from canonical base data root and register new IPC actions |
| `C-003` | Modify | `autobyteus-web/electron/logger.ts` | Reuse canonical path helper or shared contract where appropriate |
| `C-004` | Modify | `autobyteus-web/electron/server/baseServerManager.ts` | Reuse canonical path helper instead of private base-dir logic |
| `C-005` | Modify | `autobyteus-web/electron/extensions/types.ts` | Expand extension state, settings, and transcription contract types |
| `C-006` | Modify | `autobyteus-web/electron/extensions/managedExtensionService.ts` | Persist install state separately from enabled state and language settings |
| `C-007` | Modify or Split | `autobyteus-web/electron/extensions/voice-input/voiceInputRuntimeService.ts` | Archive install, worker lifecycle, structured transcription contract |
| `C-008` | Add if needed | `autobyteus-web/electron/extensions/voice-input/voiceInputWorkerClient.ts` | Worker process management and stdio JSON transport |
| `C-009` | Modify | `autobyteus-web/electron/extensionIpcHandlers.ts` | Add enable/disable/settings IPC handlers |
| `C-010` | Modify | `autobyteus-web/electron/preload.ts` | Expose typed lifecycle/settings/transcription requests |
| `C-011` | Modify | `autobyteus-web/types/electron.d.ts` | Match new preload API |
| `C-012` | Modify | `autobyteus-web/stores/extensionsStore.ts` | Track install state, enabled state, and language mode |
| `C-013` | Modify | `autobyteus-web/stores/voiceInputStore.ts` | Use structured request/response and enabled gating |
| `C-014` | Modify | `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` | Add enable/disable and language controls |
| `C-015` | Modify | `autobyteus-web/components/settings/ExtensionsManager.vue` | Wire the richer Voice Input card actions |
| `C-016` | Modify | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Gate the mic on enabled readiness and keep visible status |
| `C-017` | Modify | `/Users/normy/autobyteus_org/autobyteus-voice-runtime/metadata/runtime-assets.json` | Replace v1 English-only asset definition with v2 bilingual platform bundles |
| `C-018` | Modify | `/Users/normy/autobyteus_org/autobyteus-voice-runtime/scripts/*` | Build/package worker bundles and generate a manifest that points to local bootstrap metadata instead of release-hosted models |
| `C-019` | Modify | runtime-repo release workflow | Publish lightweight v2 runtime assets for real Stage 7 proof |

## Validation Strategy

### Stage 6

- unit/service tests for:
  - canonical path derivation
  - registry persistence with enabled state + language mode
  - worker lifecycle and structured response handling
  - renderer gating and settings behavior

### Stage 7

- fixture-backed app tests for:
  - install / enable / disable / remove
  - language persistence
  - no-speech suppression
  - draft insertion
- real release proof for:
  - runtime repo bundle publication
  - pinned manifest consumption
  - app-side install into canonical `~/.autobyteus/extensions`
  - no model archives in the published release asset list
  - install-time local backend/model bootstrap
  - enable + invoke against released assets

## Rejected Alternatives

| Option | Rejection |
| --- | --- |
| Keep the current one-shot CLI design and only swap to a multilingual model | Does not provide the mature worker contract, health model, or clean path to bilingual/no-speech handling the user asked for |
| Use a remote server/cloud path as the primary architecture | Adds infra/privacy/network complexity and is unnecessary for the local desktop requirement |
| Keep extension storage under Electron `userData` | Conflicts with the existing server-data base-dir contract and the user’s intended product layout |
| Add migration logic for old installs | User explicitly does not want migration/legacy handling in scope |

## Design Exit Decision

- Design basis ready for Stage 4 runtime modeling: `Yes`
- Blockers remaining before runtime modeling: `None`
