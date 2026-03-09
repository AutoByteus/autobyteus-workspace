# Implementation Progress

## Status

- Status: `Implemented`
- Date: `2026-03-09`

## Delivered Changes

1. Persisted Voice Input audio source selection
   - Added `audioInputDeviceId: string | null` to the managed Voice Input settings model.
   - Updated extension settings persistence to support partial updates for language mode and audio source independently.

2. Added renderer-side microphone/device discovery
   - Enumerates `audioinput` devices through `navigator.mediaDevices.enumerateDevices()`.
   - Tracks microphone permission status when `navigator.permissions` supports `microphone`.
   - Registers a `devicechange` listener so hot-plugged and virtual devices refresh automatically.

3. Added explicit pre-transcription failure states
   - Permission denied
   - No audio input devices found
   - Selected audio source unavailable
   - Device open failure / unreadable source

4. Added settings UI for audio source selection
   - `System default` option
   - Enumerated physical and virtual audio sources
   - Refresh action
   - Status copy that explains permission/no-device/unavailable-device conditions

5. Reused the shared capture path
   - The settings test and the composer both read the same persisted audio source selection.
   - `getUserMedia()` now receives `deviceId: { exact }` when a specific source is selected.

## Notes

- This ticket improves user control and diagnosability for the macOS Intel issue.
- It does not independently prove the Intel transcription backend itself is healthy; that still requires a real Intel validation run.
