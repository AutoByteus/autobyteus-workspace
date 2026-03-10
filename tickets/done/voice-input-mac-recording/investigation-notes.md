# Investigation Notes

## Date

- `2026-03-10`

## User-Visible Failure

- The user reported that `Settings -> Extensions -> Voice Input -> Test Voice Input` starts recording on macOS but never captures usable audio.
- The provided screenshot shows:
  - Voice Input is installed and enabled.
  - A concrete built-in microphone is selected.
  - The test enters `Recording` state.
  - The live input meter remains at `0%`.

## Current Capture Path

1. `components/settings/VoiceInputExtensionCard.vue`
   - Starts/stops the settings-level test by calling `voiceInputStore.toggleRecording('settings-test')`.
2. `stores/voiceInputStore.ts`
   - Refreshes audio devices and permission state.
   - Calls `navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, deviceId? } })`.
   - Creates `new AudioContext({ latencyHint: 'interactive' })`.
   - Loads `workers/voice-input-recorder.worklet.js`.
   - Connects `createMediaStreamSource(stream)` -> `AudioWorkletNode('voice-input-recorder')` -> `audioContext.destination`.
   - Updates the UI input meter only when the worklet emits `capture-stats`.
3. `workers/voice-input-recorder.worklet.js`
   - Emits `capture-stats` every 8 render quanta when audio frames arrive.
   - Emits `audio-ready` only after `FLUSH`.
4. `electron` runtime services
   - Are used only after the renderer has already captured WAV bytes.

## Evidence Collected

### 1. The failure boundary is before transcription.

- The UI remains stuck at `0%`, which means the renderer never receives `capture-stats`.
- `capture-stats` come only from the worklet processor, so the failure is upstream of Electron transcription:
  - microphone permission/device opening,
  - `AudioContext` state,
  - worklet graph execution,
  - or stream delivery into the graph.

### 2. The installed runtime itself looks healthy.

- Local extension registry:
  - `~/.autobyteus/extensions/registry.json`
  - Voice Input is `installed`, `enabled`, backend `mlx`, runtime `0.3.0`.
- Local install artifact:
  - `~/.autobyteus/extensions/voice-input/installation.json`
  - runtime entrypoint and model path are present.
- The screenshot never reaches a transcription error state; it remains in recording.
- Conclusion:
  - the runtime worker is not the first failing subsystem for this report.

### 3. The code already had a prior recorded live pass on macOS with non-zero capture diagnostics.

- Historical ticket: `autobyteus-web/tickets/done/voice-input-extension/investigation-notes.md`
- Recorded live validation on `2026-03-09` documented:
  - input sample rate `48000 Hz`
  - non-zero RMS/peak
  - working settings-level microphone diagnostics
- No Voice Input source files changed after those Voice Input commits; current `HEAD` only adds a CI/notarization retry change.
- Conclusion:
  - this is likely a regression exposed by environment/package details or an unhandled runtime state, not a brand-new feature path.

### 4. The renderer recorder never explicitly resumes its `AudioContext`.

- In `stores/voiceInputStore.ts`, after creating `new AudioContext(...)`, the code:
  - loads the worklet,
  - wires the graph,
  - immediately marks recording active.
- It does **not** call `audioContext.resume()` or verify that `audioContext.state === 'running'`.
- On macOS/Chromium, `AudioContext` can remain `suspended` or become `interrupted` even when the UI action came from a click.
- If that happens:
  - the worklet graph exists,
  - `isRecording` becomes `true`,
  - but no worklet frames are processed,
  - so the input level stays `0%` and stop/flush behavior becomes fragile.
- Conclusion:
  - this is a strong code-level explanation for the exact symptom.

### 5. The packaged macOS app is signed without explicit microphone device entitlement.

- Build configuration uses `build/entitlements.mac.plist`.
- Current entitlements include:
  - `com.apple.security.cs.allow-jit`
  - `com.apple.security.cs.allow-unsigned-executable-memory`
  - `com.apple.security.cs.disable-library-validation`
  - network client/server
- Current entitlements do **not** include:
  - `com.apple.security.device.audio-input`
- Installed packaged app checked at `/Applications/AutoByteus.app` matches that entitlement set.
- The app `Info.plist` does include `NSMicrophoneUsageDescription`.
- System log inspection shows repeated `TCCAccessRequest()` activity for AutoByteus helper processes around microphone use, but no clear success/failure outcome is surfaced to the app.
- Conclusion:
  - the packaged build is missing an expected macOS microphone entitlement and should be corrected even if renderer-state handling also needs a fix.

### 6. No Electron-side media permission handler is registered.

- Search of `autobyteus-web/electron` found no `setPermissionRequestHandler` or related media-permission wiring.
- This is not necessarily the direct cause because the app reaches TCC request flow, but it reinforces that permission/error visibility is thin.

## Root-Cause Assessment

- Most likely immediate runtime cause:
  - the renderer capture graph can remain inactive because `AudioContext` is never explicitly resumed or validated before the app enters `Recording` state.
- Most likely packaged-app deployment gap:
  - macOS builds are missing `com.apple.security.device.audio-input`, which can cause inconsistent microphone behavior under hardened runtime/privacy enforcement.

## Scope Triage

- Classification: `Small`
- Rationale:
  - The likely fix is localized to the Voice Input renderer store plus macOS packaging entitlements.
  - No architecture rewrite is indicated by current evidence.
  - The runtime worker/protocol do not appear to require redesign for this ticket.
