# Future-State Runtime Call Stack

## Scope Basis

- Ticket: `voice-input-bilingual-runtime`
- Scope: `Large`
- Design Basis: `tickets/in-progress/voice-input-bilingual-runtime/proposed-design.md`
- Requirements Basis: `tickets/in-progress/voice-input-bilingual-runtime/requirements.md`

## Conventions

- `[UI]` renderer component/view action
- `[STORE]` renderer store state/action
- `[IPC]` preload bridge call
- `[MAIN]` Electron IPC handler
- `[SERVICE]` Electron service / filesystem / process logic
- `[WORKER]` installed local Voice Input worker process
- `[CI]` runtime repository release automation
- `[IO]` filesystem/network/process boundary

---

## UC-000: Publish Bilingual Voice Runtime Release

### Intent

The dedicated runtime repository publishes the pinned lightweight runtime bundles and manifest that the desktop app will later install.

### Call Stack

`[ENTRY][CI] AutoByteus/autobyteus-voice-runtime:.github/workflows/release-voice-runtime.yml`
-> checkout runtime-repository ref for the target runtime version
-> validate tag / version contract for the release
-> run per-platform bundle jobs:
  -> `darwin/arm64`
  -> `darwin/x64`
  -> `linux/x64`
  -> `win32/x64`
-> for `darwin/arm64`:
  -> `[CI]` build/package MLX-based worker bundle
  -> include MLX bootstrap metadata for local bilingual model install
-> for remaining targets:
  -> `[CI]` build/package `faster-whisper`-based bilingual worker bundle
  -> include `faster-whisper` bootstrap metadata for local bilingual model install
-> compute checksums for:
  -> bundle archive(s)
  -> manifest JSON
-> `[CI] autobyteus-voice-runtime/scripts/generate-manifest.*`
-> emit manifest schema containing:
  -> runtime version
  -> platform + arch
  -> backend kind
  -> bundle URL + checksum + archive type
  -> worker entrypoint path
  -> bootstrap command/contract
  -> authoritative upstream model identifier(s)
-> upload artifacts
-> publish GitHub release assets under the dedicated runtime repository

### Output

- The app-owned bilingual runtime contract exists as real published lightweight release assets in `AutoByteus/autobyteus-voice-runtime`.

---

## UC-001: Open `Settings -> Extensions`

### Intent

User opens the Extensions settings area and sees the current Voice Input install/enable/language state.

### Call Stack

`[ENTRY][UI] pages/settings.vue`
-> select `extensions` section
-> render `components/settings/ExtensionsManager.vue`
-> `[STORE] extensionsStore.initialize()`
-> if Electron bridge unavailable:
  -> render desktop-only message
-> else:
  -> `[IPC] window.electronAPI.getExtensionsState()`
  -> `[MAIN] ipcMain.handle('extensions:get-state')`
  -> `[SERVICE] managedExtensionService.listExtensions()`
  -> resolve canonical base data root through shared app-data-path helper
  -> read `~/.autobyteus/extensions/registry.json` if present
  -> inspect Voice Input installation under `~/.autobyteus/extensions/voice-input`
  -> validate runtime bundle / model / worker entrypoint presence
  -> merge descriptor + persisted state + inspection result
  -> return normalized state:
    -> install status
    -> enabled flag
    -> language mode
    -> runtime/model versions
    -> error state
-> `[STORE] extensionsStore.applyRemoteState(payload)`
-> `[UI] VoiceInputExtensionCard` renders:
  -> state badge
  -> lifecycle controls
  -> language selector when installed

### Output

- Settings renders deterministic Voice Input state without assuming install implies enable.

---

## UC-002: Install Voice Input

### Intent

User installs Voice Input from the Extensions settings page.

### Call Stack

`[ENTRY][UI] VoiceInputExtensionCard:@click Install`
-> `[STORE] extensionsStore.installExtension('voice-input')`
-> optimistic renderer state = `installing`
-> `[IPC] window.electronAPI.installExtension('voice-input')`
-> `[MAIN] ipcMain.handle('extensions:install')`
-> `[SERVICE] managedExtensionService.install('voice-input')`
-> resolve extension descriptor from pinned catalog:
  -> runtime repository
  -> runtime version / tag
  -> manifest URL
-> resolve canonical extensions root from shared app-data helper
-> create extension root:
  -> `~/.autobyteus/extensions/voice-input/runtime/`
  -> `~/.autobyteus/extensions/voice-input/models/`
  -> `~/.autobyteus/extensions/voice-input/temp/`
-> persist registry intermediate state:
  -> install status = `installing`
  -> enabled = previous enabled or `false`
  -> language mode = previous language or `auto`
-> delegate runtime install:
  -> `[SERVICE] voiceInputRuntimeService.installRuntime(descriptor, extensionRoot)`
  -> `[IO]` download pinned runtime manifest from `AutoByteus/autobyteus-voice-runtime`
  -> resolve the platform/arch-specific bundle entry
  -> `[IO]` download platform bundle archive
  -> verify bundle checksum
  -> `[IO]` extract bundle into `runtime/`
  -> invoke runtime bootstrap command
  -> local bootstrap creates/updates `.venv`
  -> local bootstrap installs backend requirements
  -> local bootstrap downloads bilingual model assets from the authoritative upstream source into `models/`
  -> verify worker entrypoint exists
  -> verify local bootstrap completion stamp / metadata exists
  -> write `installation.json`
  -> return runtime metadata:
    -> backend kind
    -> runtime version
    -> model version
    -> worker entrypoint
-> `[SERVICE] managedExtensionService`
  -> persist final state:
    -> install status = `installed`
    -> enabled = `false`
    -> language mode = `auto` unless previous value exists
-> return normalized state list
-> `[STORE] extensionsStore.applyRemoteState(payload)`
-> `[UI] VoiceInputExtensionCard` shows `Installed and Disabled`

### Error Branch

- manifest download fails
- bundle download or checksum fails
- bundle extraction fails
- local bootstrap fails
- worker entrypoint missing
-> registry state = `error`
-> renderer keeps Voice Input unavailable and shows `Reinstall`

### Output

- Voice Input assets are installed under `~/.autobyteus/extensions/voice-input`, the bilingual backend/model baseline was prepared locally, and dictation remains disabled until explicit enable.

---

## UC-003: Enable Voice Input And Persist Language Mode

### Intent

User enables installed Voice Input and chooses `Auto`, `English`, or `Chinese`.

### Call Stack

`[ENTRY][UI] VoiceInputExtensionCard:@click Enable`
-> `[STORE] extensionsStore.enableExtension('voice-input')`
-> `[IPC] window.electronAPI.enableExtension('voice-input')`
-> `[MAIN] ipcMain.handle('extensions:enable')`
-> `[SERVICE] managedExtensionService.enable('voice-input')`
-> inspect installation health
-> if install incomplete:
  -> reject with actionable error
-> else:
  -> persist:
    -> install status = `installed`
    -> enabled = `true`
-> optionally eager-start worker health check:
  -> `[SERVICE] voiceInputRuntimeService.ensureWorkerReady(extensionRoot, settings)`
  -> start worker if not already running
  -> wait for worker hello/ready handshake
-> return normalized state list
-> `[STORE] extensionsStore.applyRemoteState(payload)`
-> `[UI] VoiceInputExtensionCard` shows `Installed and Enabled`

`[ENTRY][UI] VoiceInputExtensionCard:@change languageMode`
-> `[STORE] extensionsStore.updateVoiceInputSettings({ languageMode })`
-> `[IPC] window.electronAPI.updateVoiceInputSettings('voice-input', { languageMode })`
-> `[MAIN]` route to `managedExtensionService`
-> `[SERVICE] managedExtensionService.updateVoiceInputSettings(...)`
-> persist language mode in registry
-> if worker already running:
  -> `[SERVICE] voiceInputRuntimeService.applySettings(...)`
  -> refresh in-memory worker session settings if needed
-> return normalized state list
-> `[STORE]` updates local state

### Output

- Voice Input becomes eligible for use in the composer and language preference persists across restart.

---

## UC-004: Shared Composer Discovers Enabled Voice Input

### Intent

The shared composer only exposes the mic when Voice Input is installed, enabled, and healthy.

### Call Stack

`[ENTRY][UI] components/agentInput/AgentUserInputTextArea.vue:setup()`
-> `[STORE] voiceInputStore.initialize()`
-> await `extensionsStore.initialize()` if needed
-> derive `isAvailable` from:
  -> install status = `installed`
  -> enabled = `true`
  -> renderer is Electron
-> render mic button only when `isAvailable === true`
-> because the shared composer is reused by agent and team flows:
  -> one gating rule covers both pathways

### Output

- Install alone does not surface the mic; enable is required, and known error state keeps the mic hidden.

---

## UC-005: Record, Transcribe, And Insert Draft Text

### Intent

User records speech in the shared composer and receives transcript text in the draft.

### Call Stack

`[ENTRY][UI] AgentUserInputTextArea:@click mic`
-> `[STORE] voiceInputStore.startRecording()`
-> request `navigator.mediaDevices.getUserMedia(...)`
-> create local single-clip recording pipeline
-> state = `recording`
-> user clicks stop
-> `[STORE] voiceInputStore.stopRecording()`
-> finalize WAV payload
-> state = `transcribing`
-> build structured request:
  -> `audioData`
  -> `languageMode` from `extensionsStore.voiceInput.settings`
-> `[IPC] window.electronAPI.transcribeVoiceInput(request)`
-> `[MAIN] ipcMain.handle('voice-input:transcribe')`
-> `[SERVICE] managedExtensionService.transcribeVoiceInput(request)`
-> validate:
  -> extension installed
  -> extension enabled
  -> installation healthy
-> `[SERVICE] voiceInputRuntimeService.ensureWorkerReady(...)`
-> if worker not running:
  -> start worker from installed entrypoint
  -> wait for ready handshake
-> `[IO]` write temp WAV to `~/.autobyteus/extensions/voice-input/temp/...`
-> `[SERVICE] voiceInputRuntimeService.sendTranscriptionRequest(...)`
-> `[WORKER]` receive `transcribe-file` request
-> backend resolves language policy:
  -> `auto`
  -> `en`
  -> `zh`
-> backend runs bilingual transcription
-> backend computes no-speech / unusable-output decision
-> `[WORKER]` emit structured response
-> `[SERVICE]` delete temp WAV
-> `[STORE] voiceInputStore`
-> if `ok === true` and `noSpeech === false` and `text.trim().length > 0`:
  -> `[STORE] activeContextStore.updateRequirement(mergeDraftWithTranscript(...))`
-> else:
  -> keep draft unchanged
-> state = `idle`
-> `[UI]` composer shows updated draft or actionable feedback

### Output

- English, Chinese, and mixed bilingual dictation share one local app-owned flow and only mutate the draft when the result is usable.

---

## UC-006: Silence / No-Speech / Failure Handling

### Intent

Silence and runtime failures stay actionable without polluting the draft.

### Call Stack

`[ENTRY][WORKER] no-speech or unusable transcript`
-> return structured response:
  -> `ok = true` or `false` depending on backend contract
  -> `text = ''`
  -> `noSpeech = true` or actionable error
-> `[SERVICE] voiceInputRuntimeService`
-> `[STORE] voiceInputStore`
-> do not call `activeContextStore.updateRequirement(...)`
-> show renderer feedback:
  -> `No speech detected`
  -> or runtime/microphone/transcription error
-> restore UI to idle

### Output

- Silence does not become `"you"` or other draft garbage, and failures leave text messaging usable.

---

## UC-007: Disable Voice Input

### Intent

User disables Voice Input without removing installed files.

### Call Stack

`[ENTRY][UI] VoiceInputExtensionCard:@click Disable`
-> `[STORE] extensionsStore.disableExtension('voice-input')`
-> `[IPC] window.electronAPI.disableExtension('voice-input')`
-> `[MAIN] ipcMain.handle('extensions:disable')`
-> `[SERVICE] managedExtensionService.disable('voice-input')`
-> `[SERVICE] voiceInputRuntimeService.stopWorkerIfRunning(extensionRoot)`
-> persist:
  -> enabled = `false`
  -> install status remains `installed`
-> return normalized state list
-> `[STORE] extensionsStore.applyRemoteState(payload)`
-> `[STORE] voiceInputStore.isAvailable` becomes false
-> `[UI] shared composer` hides mic

### Output

- Voice Input can be temporarily turned off without removing assets or language preference.

---

## UC-008: Reinstall Or Remove Voice Input

### Intent

User refreshes or removes the Voice Input install.

### Call Stack

`[ENTRY][UI] VoiceInputExtensionCard:@click Reinstall`
-> `[STORE] extensionsStore.reinstallExtension('voice-input')`
-> `[IPC] window.electronAPI.reinstallExtension('voice-input')`
-> `[MAIN]` dispatch to `managedExtensionService.reinstall(...)`
-> stop worker if running
-> capture current persisted settings:
  -> enabled
  -> language mode
-> remove runtime files
-> rerun install path
-> restore captured settings if reinstall succeeds
-> if `enabled === true`:
  -> worker remains lazy-start or is revalidated eagerly

`[ENTRY][UI] VoiceInputExtensionCard:@click Remove`
-> `[STORE] extensionsStore.removeExtension('voice-input')`
-> `[IPC] window.electronAPI.removeExtension('voice-input')`
-> `[MAIN]` dispatch to `managedExtensionService.remove(...)`
-> stop worker if running
-> delete `~/.autobyteus/extensions/voice-input`
-> reset registry record to default not-installed state
-> return normalized state list
-> `[STORE]` updates state
-> `[UI] mic` disappears from composer

### Output

- Reinstall refreshes the runtime safely; remove deletes Voice Input cleanly.

---

## UC-009: Open Installed Voice Input Folder

### Intent

User opens the managed Voice Input install directory from Settings.

### Call Stack

`[ENTRY][UI] VoiceInputExtensionCard:@click Open Folder`
-> `[STORE] extensionsStore.openExtensionFolder('voice-input')`
-> `[IPC] window.electronAPI.openExtensionFolder('voice-input')`
-> `[MAIN] ipcMain.handle('extensions:open-folder')`
-> `[SERVICE] managedExtensionService.getInstalledExtensionPath('voice-input')`
-> resolve canonical extension root under `~/.autobyteus/extensions/voice-input`
-> `[MAIN] shell.openPath(extensionRoot)`
-> return success or actionable error
-> `[STORE]` show toast only on failure

### Output

- Installed Voice Input exposes a direct path-opening action for debugging and support.

---

## UC-010: Real Release Validation Against Published Assets

### Intent

Stage 7 proves the lightweight runtime release and app-consumption path with real published assets.

### Call Stack

`[ENTRY][CI]` publish pinned lightweight runtime release in `AutoByteus/autobyteus-voice-runtime`
-> verify GitHub release assets exist for the target runtime version
-> verify the release asset list does not contain model archives
-> configure workspace validation to consume the published manifest URL
-> `[ENTRY][SERVICE TEST]` run app-side install/invoke proof against the real manifest
-> `[SERVICE] managedExtensionService.install('voice-input')`
-> install real bundle into canonical `~/.autobyteus/extensions`
-> run local backend/model bootstrap on the test machine
-> `[SERVICE] managedExtensionService.enable('voice-input')`
-> `[SERVICE] voiceInputRuntimeService.ensureWorkerReady(...)`
-> `[SERVICE] managedExtensionService.transcribeVoiceInput(request)`
-> `[WORKER]` return structured bilingual response
-> `[SERVICE TEST]` assert:
  -> release asset list is lightweight
  -> canonical install path
  -> local bootstrap completion
  -> enabled state transition
  -> language mode contract
  -> usable transcript / no-speech behavior for targeted fixtures
-> record published release evidence with `gh`

### Output

- Stage 7 closes on real released assets, not only on local fixtures.
