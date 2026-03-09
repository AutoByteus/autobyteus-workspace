# Proposed Design

## Summary

Add audio-input selection and explicit microphone availability status to Voice Input without changing the runtime/transcription contract.

## Design Decisions

1. Persist `audioInputDeviceId: string | null` in Voice Input settings.
   - `null` means `System default`.
2. Keep device discovery in the renderer store.
   - `navigator.mediaDevices.enumerateDevices()`
   - `navigator.permissions.query({ name: 'microphone' })` when supported
   - `devicechange` listener for hot-plugged and virtual devices
3. Reuse the existing shared Voice Input store.
   - No second microphone pipeline for the settings page
   - Settings test and composer honor the same selected device
4. Keep the runtime contract unchanged.
   - The runtime continues to receive WAV bytes only

## File Delta

- `electron/extensions/types.ts`
  - add `audioInputDeviceId` to Voice Input settings
  - make Voice Input settings update payload partial
- `electron/extensions/managedExtensionService.ts`
  - normalize and persist `audioInputDeviceId`
- `stores/extensionsStore.ts`
  - add a generic Voice Input settings update action or explicit audio-input update action
- `stores/voiceInputStore.ts`
  - enumerate devices
  - track permission state
  - detect no-device / unavailable-device conditions
  - pass `deviceId` into `getUserMedia` when selected
- `components/settings/VoiceInputExtensionCard.vue`
  - add audio source selector
  - show microphone/device availability copy
  - add refresh action
- `components/settings/ExtensionsManager.vue`
  - wire new update event

## Failure-State Contract

- `permission denied`
  - shown before recording starts
- `no audio input devices found`
  - shown before recording starts
- `selected device unavailable`
  - shown before recording starts
- `capture/transcription failure`
  - existing settings-test result surface remains in use
