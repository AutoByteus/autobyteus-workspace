# Future-State Runtime Call Stack

## Scope Basis

- Ticket: `voice-input-extension`
- Scope: `Medium`
- Design Basis: `autobyteus-web/tickets/in-progress/voice-input-extension/proposed-design.md`
- Requirements Basis: `autobyteus-web/tickets/in-progress/voice-input-extension/requirements.md`

## Conventions

- `[UI]` renderer component/view action
- `[STORE]` Pinia/composable state transition
- `[IPC]` preload/electron bridge call
- `[MAIN]` Electron main handler
- `[SERVICE]` Electron service / filesystem / process logic
- `[CI]` release/build automation path
- `[IO]` filesystem/network/process boundary

---

## UC-000: Publish AutoByteus Voice Runtime Release

### Intent

AutoByteus publishes the owned runtime contract that the desktop app will later consume for Voice Input installation.

### Call Stack

`[ENTRY][CI] .github/workflows/release-voice-runtime.yml (tag push or workflow_dispatch)`
-> checkout repository ref for runtime release
-> validate runtime version/tag format, recommended `voice-runtime-vX.Y.Z`
-> run per-platform build jobs using `autobyteus-voice-runtime/`
-> `[CI] autobyteus-voice-runtime/scripts/build-*.sh`
-> obtain pinned `whisper.cpp` source revision for the runtime project
-> configure platform build for minimal CLI package:
  -> `BUILD_SHARED_LIBS=OFF` where viable
  -> `WHISPER_BUILD_TESTS=OFF`
  -> `WHISPER_BUILD_SERVER=OFF`
  -> `WHISPER_SDL2=OFF`
  -> `WHISPER_CURL=OFF`
  -> `WHISPER_FFMPEG=OFF` on Linux
-> build `whisper-cli`
-> package runtime archive for target platform/arch
-> `[IO]` download selected v1 model asset into release workspace
-> compute checksums + sizes for runtime archives and model asset
-> `[CI] autobyteus-voice-runtime/scripts/generate-manifest.*`
-> emit runtime manifest JSON containing:
  -> runtime version
  -> supported platform/arch matrix
  -> per-artifact file name, checksum, entrypoint, archive type
  -> model file name, checksum, size, and version
-> upload artifacts with `actions/upload-artifact`
-> publish GitHub release assets with `softprops/action-gh-release`

### Output

- AutoByteus-owned runtime archives, model asset, and manifest JSON exist under the dedicated voice-runtime release/tag and form the stable install contract for the app.

---

## UC-001: Open `Settings -> Extensions`

### Intent

User opens the settings page and selects the `Extensions` section to inspect available managed extensions.

### Call Stack

`[ENTRY][UI] pages/settings.vue:onMounted()`
-> normalize `route.query.section`
-> set `activeSection = 'extensions'` when selected
-> render `components/settings/ExtensionsManager.vue`
-> `[UI] ExtensionsManager:onMounted()`
-> `[STORE] extensionsStore.initialize()`
-> if Electron bridge unavailable:
  -> set renderer status to non-electron/not-supported
  -> render `Voice Input` as unavailable
-> else:
  -> `[IPC] window.electronAPI.getExtensionsState()`
  -> `[MAIN] ipcMain.handle('extensions:get-state')`
  -> `[SERVICE] managedExtensionService.listExtensions()`
  -> load extension catalog
  -> load persisted `extensions/registry.json` if present
  -> merge catalog descriptors with installed-state metadata
  -> return normalized extension state list
-> `[STORE] extensionsStore.applyRemoteState(payload)`
-> `[UI] ExtensionsManager` renders `Voice Input` card with status/actions

### Output

- Extensions page renders deterministic extension list and current lifecycle state.

---

## UC-002: Install `Voice Input`

### Intent

User clicks `Install` for the `Voice Input` extension in Settings.

### Call Stack

`[ENTRY][UI] components/settings/VoiceInputExtensionCard.vue:@click install`
-> `[STORE] extensionsStore.installExtension('voice-input')`
-> optimistic local state becomes `installing`
-> `[IPC] window.electronAPI.installExtension('voice-input')`
-> `[MAIN] ipcMain.handle('extensions:install', extensionId)`
-> `[SERVICE] managedExtensionService.install('voice-input')`
-> resolve extension descriptor from `extensionCatalog`
-> descriptor provides app-pinned runtime release metadata:
  -> `runtimeVersion`
  -> `runtimeReleaseTag`
  -> `runtimeManifestAsset`
-> create extension root under app data:
  -> `extensions/voice-input/`
  -> `extensions/voice-input/bin/`
  -> `extensions/voice-input/models/`
  -> `extensions/voice-input/temp/`
-> write intermediate registry state = `installing`
-> delegate runtime-specific install:
  -> `[SERVICE] voiceInputRuntimeService.installRuntime(descriptor)`
  -> `[IO]` download AutoByteus runtime manifest for pinned runtime version
  -> resolve platform + arch artifact + model entries from manifest
  -> `[IO]` download runtime package into temp path
  -> `[IO]` unpack runtime package into `bin/`
  -> `[IO]` download speech model into `models/`
  -> verify checksums for downloaded runtime archive and model
  -> verify expected runtime entrypoint + model path exist
  -> return runtime metadata
-> `[SERVICE] managedExtensionService`
  -> write final registry state = `installed`
  -> publish extension state event to all windows
-> `[MAIN]` return normalized extension state
-> `[STORE] extensionsStore.applyRemoteState(payload)`
-> `[UI] ExtensionsManager` shows `Installed`

### Error Branch

- download fails / unpack fails / required files missing
  -> registry state = `error`
  -> error message recorded
  -> renderer receives error status and `Reinstall` affordance

### Output

- `Voice Input` extension is installed into app data and visible as ready/not-ready in Settings.

---

## UC-003: Shared Composer Discovers Installed Voice Input

### Intent

When the extension is installed, the shared composer exposes the mic action for both agent and team flows.

### Call Stack

`[ENTRY][UI] components/agentInput/AgentUserInputTextArea.vue:setup()`
-> `[STORE] voiceInputStore.initialize()`
-> `[STORE] voiceInputStore` depends on `extensionsStore`
-> if `extensionsStore` not initialized:
  -> await `extensionsStore.initialize()`
-> compute `voiceInputAvailability`
-> render microphone action only when:
  -> Electron bridge exists
  -> extension `voice-input` status = `installed`
  -> runtime health = ready
-> because `AgentUserInputTextArea.vue` is reused by `AgentUserInputForm.vue` and team workspace shared composer:
  -> same mic availability applies to single-agent and team-focused-member flows

### Output

- Shared composer conditionally shows voice input control with no duplicated agent/team implementations.

---

## UC-004: Record And Transcribe Voice Into Draft

### Intent

User records speech from the shared composer, stops recording, and gets transcript text inserted into the current draft.

### Call Stack

`[ENTRY][UI] components/agentInput/AgentUserInputTextArea.vue:@click mic`
-> `[STORE] voiceInputStore.startRecording()`
-> request `navigator.mediaDevices.getUserMedia(...)`
-> if permission denied:
  -> set `recordingError`
  -> stop flow
-> create local capture pipeline (single clip WAV capture)
-> state = `recording`
-> user clicks mic again
-> `[STORE] voiceInputStore.stopRecording()`
-> finalize WAV payload
-> state = `transcribing`
-> `[IPC] window.electronAPI.transcribeVoiceInput(payload)`
-> `[MAIN] ipcMain.handle('voice-input:transcribe')`
-> `[SERVICE] voiceInputRuntimeService.transcribe(request)`
-> confirm extension installed and runtime entrypoint/model path exist
-> `[IO]` write temporary input WAV under `extensions/voice-input/temp/`
-> `[IO]` spawn local runtime process with:
  -> runtime entrypoint
  -> model path
  -> temp wav path
  -> output mode for transcript text
-> collect stdout/stderr + exit code
-> on success:
  -> parse transcript text
  -> delete temp file
  -> return transcript payload
-> on failure:
  -> delete temp file if possible
  -> return structured error
-> `[STORE] voiceInputStore.applyTranscript(result)`
-> `[STORE] activeContextStore.updateRequirement(nextDraftText)`
  -> append transcript to current draft safely
-> state = `idle`
-> `[UI] textarea` reflects updated draft content

### Error Branches

- runtime missing after prior install:
  -> renderer gets `reinstall required` error
- process exits non-zero:
  -> renderer shows transcription error
  -> existing draft text remains unchanged
- empty transcript:
  -> renderer resets to idle and preserves draft

### Output

- Transcript text appears in the current unsent draft, and manual send behavior remains unchanged.

---

## UC-005: Remove Or Reinstall Voice Input

### Intent

User removes or reinstalls the extension from Settings.

### Call Stack

`[ENTRY][UI] VoiceInputExtensionCard:@click remove/reinstall`
-> `[STORE] extensionsStore.removeExtension('voice-input')` or `reinstallExtension('voice-input')`
-> `[IPC] window.electronAPI.removeExtension('voice-input')` / `reinstallExtension('voice-input')`
-> `[MAIN]` dispatch to `managedExtensionService`
-> `[SERVICE] managedExtensionService.remove('voice-input')`
  -> delete extension subtree
  -> clear registry entry or mark not installed
  -> publish state update
-> renderer receives updated extension state
-> `[STORE] voiceInputStore` derived availability becomes false
-> `[UI] shared composer` hides microphone action

### Output

- Extension lifecycle remains user-managed and composer availability updates immediately.

---

## UC-006: Stage 7 Real Published-Runtime Proof Path

### Intent

Automated validation proves the app-managed install/discovery/invocation flow works end to end against actual published runtime assets before handoff.

### Call Stack

`[ENTRY][TEST] Stage 7 automated scenario`
-> commit and push the implementation branch that contains the runtime project and release workflow
-> dispatch or observe the dedicated `voice-runtime-v*` release workflow
-> `[CI]` workflow builds runtime assets and publishes release manifest + model + platform binaries
-> confirm the GitHub release exposes the pinned manifest asset URL expected by the app
-> create isolated temp app-data directory
-> provide app config / environment pointing to the real published manifest URL for the pinned runtime version
-> `[MAIN][SERVICE] managedExtensionService.install('voice-input')`
-> runtime service resolves pinned manifest for the published release
-> runtime binary/model download from GitHub release assets succeeds
-> runtime package unpacked into temp extension root
-> `[STORE/IPC] renderer-side integration scenario initializes extensions state`
-> composer/store sees `voice-input` installed
-> test supplies deterministic audio payload
-> `[MAIN][SERVICE] voiceInputRuntimeService.transcribe(request)` executes the real published runtime command
-> published runtime returns transcript text
-> renderer integration applies transcript into active draft
-> assertions confirm:
  -> release asset publication completed for the pinned version,
  -> install state persisted,
  -> runtime/model downloaded from published assets,
  -> composer availability toggled,
  -> runtime invoked through app-owned flow,
  -> transcript inserted into draft

### Output

- Stage 7 has app-level automated evidence for published-release build/download/install/invocation behavior without relying on the dormant backend transcription path.
