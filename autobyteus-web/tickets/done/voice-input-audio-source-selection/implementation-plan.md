# Implementation Plan

## Planned Changes

1. Settings model and persistence
   - `electron/extensions/types.ts`
   - `electron/extensions/managedExtensionService.ts`
   - `stores/extensionsStore.ts`
   - `electron/preload.ts`
   - `types/electron.d.ts`

2. Renderer capture/device state
   - `stores/voiceInputStore.ts`
   - enumerate devices
   - track permission state
   - handle selected-device-unavailable and no-device cases
   - use selected `deviceId` in `getUserMedia`

3. Settings UI
   - `components/settings/VoiceInputExtensionCard.vue`
   - `components/settings/ExtensionsManager.vue`
   - add audio source selector and status copy

4. Tests
   - `stores/__tests__/voiceInputStore.spec.ts`
   - `stores/__tests__/extensionsStore.spec.ts`
   - `components/settings/__tests__/VoiceInputExtensionCard.spec.ts`
   - `electron/extensions/__tests__/managedExtensionService.spec.ts`

## Validation Targets

- Settings card shows:
  - `System default`
  - available `audioinput` devices
  - explicit permission/no-device/unavailable-device states
- Saved audio source survives a round-trip through extension settings persistence
- `startRecording()` uses the selected `deviceId`
- Settings test and composer share the same selected device path
