# Investigation Notes

## Date

- `2026-03-09`

## Scope

- Voice Input audio-source selection
- Microphone permission/no-device visibility
- Shared capture-path reuse for settings test and composer

## Findings

1. The current renderer capture path always uses the browser default microphone.
   - Evidence:
     - `stores/voiceInputStore.ts`
     - `navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })`
   - There is no `deviceId` support.

2. The app does not enumerate `audioinput` devices today.
   - Evidence:
     - no `enumerateDevices()` usage in `stores/voiceInputStore.ts`
     - no input-device UI in `components/settings/VoiceInputExtensionCard.vue`

3. Voice Input settings persist only language mode.
   - Evidence:
     - `electron/extensions/types.ts`
     - `electron/extensions/managedExtensionService.ts`
     - `stores/extensionsStore.ts`

4. The settings-level test surface already exists and reuses the shared store.
   - Evidence:
     - `components/settings/VoiceInputExtensionCard.vue`
     - `stores/voiceInputStore.ts`
   - This is the correct place to surface permission/no-device status and device selection.

5. The runtime/transcription contract does not need to change for this feature.
   - Device discovery and device selection are browser/renderer concerns.
   - The runtime still only receives recorded WAV bytes.

## Investigation Conclusion

- The product gap is real and independent of the specific macOS Intel root cause.
- The clean implementation is:
  - persist `audioInputDeviceId` in Voice Input settings,
  - enumerate `audioinput` devices in the renderer,
  - surface explicit permission/no-device/selected-device-unavailable states,
  - use the selected device for both the settings test and composer capture path.
