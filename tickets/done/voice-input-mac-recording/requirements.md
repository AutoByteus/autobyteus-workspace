# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `N/A`

## Metadata

- Ticket: `voice-input-mac-recording`
- Owner: `Codex`
- Branch: `codex/voice-input-mac-recording`
- Last Updated: `2026-03-10 (design-ready requirements refresh)`

## Goal / Problem Statement

The desktop Voice Input extension appears installed and enabled on macOS, but the in-app "Test Voice Input" flow cannot capture usable microphone audio. The user reports that recording starts, remains stuck with `0%` input level, and does not produce a transcript during manual testing on a Mac. This ticket investigates the end-to-end macOS capture path and fixes the defect blocking local recording.

## Scope Classification

- Classification: `Small`
- Rationale:
  - Investigation narrowed the defect to a localized macOS capture/bootstrap gap.
  - The likely fix is limited to the renderer recorder activation path and macOS packaging entitlements.
  - The runtime worker protocol and extension architecture remain valid.

## User-Reported Evidence

- Environment: `macOS` desktop app
- Surface: `Settings -> Extensions -> Voice Input -> Test Voice Input`
- Observed behavior:
  - Voice Input is shown as `Installed` and `Enabled`.
  - Recording can be started from the test panel.
  - Input level remains at `0%`.
  - No usable recording or transcript is produced.
- Screenshot evidence: provided in the task conversation on `2026-03-10`

## In-Scope Use Cases

- `UC-001`: User selects a valid macOS microphone source and starts `Test Voice Input`.
- `UC-002`: The app requests or uses microphone permission correctly on macOS.
- `UC-003`: The app captures non-zero input level while speaking into the selected device.
- `UC-004`: The test flow completes recording and hands audio to the local transcription path.
- `UC-005`: Failures in the recording path surface actionable diagnostics instead of silently staying at `0%`.

## Out Of Scope / Non-Goals

- Redesigning the Voice Input product UX beyond changes required to make investigation and diagnosis possible.
- Replacing the local transcription backend or changing runtime packaging unless the root cause requires it.
- Non-macOS platform fixes unless the investigation shows a shared defect.

## Constraints / Dependencies

- Work must be performed in a dedicated ticket branch/worktree.
- Source-code edits remain locked until the workflow reaches Stage 6.
- The investigation should use the existing Voice Input extension architecture already present in this repository.

## Assumptions

- The selected built-in microphone is a valid and available macOS audio input device.
- Voice Input assets were installed successfully enough for the test UI to render as enabled.
- The primary defect is in capture or pre-transcription handling, not in text insertion into the composer.

## Risks To Track

- The issue may depend on macOS privacy permission state outside the app.
- The failure may be reproducible only in packaged Electron runtime behavior, not browser-only tests.
- The current UI may not expose enough internal state to distinguish permission, device, worklet, and IPC failures.

## Requirements (Verifiable)

- `R-001` (Capture viability):
  - Expected outcome: On macOS, `Test Voice Input` records microphone input from the selected source and shows non-zero level when speech is present.

- `R-002` (Permission handling):
  - Expected outcome: The app detects missing or denied microphone permission and surfaces an actionable error state instead of silently remaining in `Recording`.

- `R-003` (Device selection):
  - Expected outcome: The selected audio source is the device actually used for capture, or the UI clearly reports when it cannot be used.

- `R-004` (AudioContext activation):
  - Expected outcome: The renderer recorder does not enter active recording state until the `AudioContext` is running or an explicit actionable error has been surfaced.

- `R-005` (Packaged macOS entitlement):
  - Expected outcome: The macOS packaged app declares the microphone entitlement required for hardened-runtime microphone capture in addition to the existing usage description string.

- `R-006` (Diagnostic clarity):
  - Expected outcome: Capture-path failures expose enough logging or UI diagnostics to identify whether failure occurred in permission acquisition, stream creation, audio-context activation, worklet processing, recording finalization, or IPC/runtime transcription.

- `R-007` (Frontend recovery):
  - Expected outcome: When the settings-level Voice Input test enters a bad state, the user can reset the test from the UI without reinstalling the extension or relaunching the app.

- `R-008` (Dead-recording watchdog):
  - Expected outcome: If recording starts but the recorder never receives any microphone frames, the app exits the stuck recording state automatically and surfaces an actionable recovery message.

## Acceptance Criteria

- `AC-001` Input level responds:
  - Measurable outcome: Speaking into the selected microphone updates the test input meter above `0%`.

- `AC-002` Recording completes:
  - Measurable outcome: The test flow finishes with either a transcript result or an explicit actionable capture/transcription error.

- `AC-003` AudioContext guard:
  - Measurable outcome: If the recorder audio graph cannot enter a running state, the store does not remain stuck in a false `Recording` state.

- `AC-004` macOS packaging correctness:
  - Measurable outcome: The repository macOS entitlement file includes the microphone device entitlement used by packaged builds.

- `AC-005` macOS failure visibility:
  - Measurable outcome: When recording cannot start on macOS, the UI or logs identify the failing subsystem rather than remaining indefinitely in a generic recording state.

- `AC-006` Frontend reset:
  - Measurable outcome: The settings card exposes a `Reset Test` recovery path that clears stuck recording/transcribing/error state and lets the user retry immediately.

- `AC-007` Dead-recording fail-fast:
  - Measurable outcome: If no capture frames arrive shortly after recording starts, the test no longer remains stuck indefinitely in `Recording`.
