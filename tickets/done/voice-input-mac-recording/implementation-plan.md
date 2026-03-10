# Implementation Plan

## Scope

- Scope classification: `Small`
- Goal:
  - restore macOS Voice Input test recording by ensuring the renderer capture graph only reports active recording after the `AudioContext` is running, while also correcting packaged macOS microphone entitlement coverage.

## Design Basis

### 1. Renderer recorder activation guard

- File target:
  - `autobyteus-web/stores/voiceInputStore.ts`
- Plan:
  - add a small helper that verifies the newly created `AudioContext` is in a usable running state before the store marks recording active;
  - explicitly call `audioContext.resume()` when the context starts `suspended` or `interrupted`;
  - fail early with an actionable error if the context still cannot run.
- Rationale:
  - the current store can set `isRecording = true` even if the worklet graph never starts processing frames.

### 2. Capture-path diagnostics improvement

- File target:
  - `autobyteus-web/stores/voiceInputStore.ts`
- Plan:
  - surface the failing audio-context state in the thrown error path so the settings test does not silently sit at `0%`;
  - add focused unit coverage for the resumed/suspended context case.
- Rationale:
  - the current path gives little evidence when the graph exists but never processes input.

### 3. macOS packaged microphone entitlement

- File target:
  - `autobyteus-web/build/entitlements.mac.plist`
- Plan:
  - add `com.apple.security.device.audio-input` to the packaged macOS entitlement set.
- Rationale:
  - packaged hardened-runtime builds should declare microphone device access explicitly alongside `NSMicrophoneUsageDescription`.

### 4. Frontend recovery for dead test state

- File targets:
  - `autobyteus-web/stores/voiceInputStore.ts`
  - `autobyteus-web/components/settings/VoiceInputExtensionCard.vue`
- Plan:
  - add a capture-start watchdog that fails fast when the recorder never receives any worklet frames;
  - add a `Reset Test` action in the settings card that clears the current test state and allows immediate retry.
- Rationale:
  - users need a reliable frontend recovery path when Voice Input gets wedged.

## Planned Work Items

| Task ID | Change | Files |
| --- | --- | --- |
| `T-001` | Guard Voice Input recording startup on `AudioContext` running state and surface explicit failure when resume does not succeed | `autobyteus-web/stores/voiceInputStore.ts` |
| `T-002` | Add unit coverage for suspended/resume recorder startup behavior | `autobyteus-web/stores/__tests__/voiceInputStore.spec.ts` |
| `T-003` | Add macOS microphone device entitlement for packaged builds | `autobyteus-web/build/entitlements.mac.plist` |
| `T-004` | Add dead-recording watchdog and explicit frontend reset path for the settings-level Voice Input test | `autobyteus-web/stores/voiceInputStore.ts`, `autobyteus-web/components/settings/VoiceInputExtensionCard.vue`, `autobyteus-web/stores/__tests__/voiceInputStore.spec.ts` |

## Verification Plan

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-mac-recording/autobyteus-web exec vitest --config vitest.config.mts run stores/__tests__/voiceInputStore.spec.ts`
- Inspect `autobyteus-web/build/entitlements.mac.plist` after the edit.

## Out Of Scope For This Ticket

- Rewriting the capture stack away from `AudioWorklet`.
- Changing the Voice Input runtime worker protocol.
- Adding a brand-new Electron media permission subsystem unless the implementation proves it is required.
