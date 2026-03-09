# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement

Voice Input currently records from the browser default microphone only. Users cannot see whether microphone permission is denied, whether there are zero audio input devices, or which input device is currently being used. This makes Voice Input hard to debug on machines with multiple devices or virtual audio inputs, and it can mask real routing problems as `No speech detected.`

This ticket adds explicit audio-source selection and microphone availability visibility to the existing Voice Input feature so users can:

1. see when no audio input devices are available,
2. see when microphone permission is denied,
3. choose a specific physical or virtual `audioinput` device, and
4. have both the settings-level test flow and the shared composer honor that selection.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Cross-layer change touching persisted extension settings, renderer capture state, settings UI, and shared composer behavior.
  - Keeps the existing runtime/transcription architecture intact.

## In-Scope Use Cases

- `UC-001`: User opens `Settings -> Extensions -> Voice Input` and sees current microphone/device availability state.
- `UC-002`: User sees an explicit `no audio input devices found` state when no `audioinput` devices are available.
- `UC-003`: User sees an explicit `microphone permission denied` state when browser/OS microphone access is blocked.
- `UC-004`: User sees `System default` plus all enumerated physical/virtual `audioinput` devices and can select one.
- `UC-005`: Voice Input persists the selected audio input device and uses it for both the settings-level test flow and the shared composer microphone flow.
- `UC-006`: If the previously selected device disappears, the UI shows that the selected source is unavailable and prompts the user to choose another one.

## Constraints / Dependencies

- The existing shared renderer capture path must remain the single source of truth; no second recording pipeline may be introduced.
- Device discovery must stay in the renderer because it depends on browser media APIs.
- The runtime/transcription contract should remain unchanged for this ticket unless investigation proves otherwise.
- Source edits remain prohibited until Stage 6 with `Code Edit Permission = Unlocked`.

## Initial Acceptance Targets

- The Voice Input settings card shows permission/no-device/unavailable-device status explicitly.
- Users can select and persist a specific `audioinput` device, including virtual devices exposed by the OS/browser.
- `voiceInputStore.startRecording()` uses the selected `deviceId` when one is configured.
- The settings test button and composer microphone button both use the same selected input device.
