# Release Notes — Local Video Preview Playback

## Fixes

- Fixed local videos in the Electron Files preview so supported media loads its duration and can play, pause, and seek instead of remaining black at `0:00`.
- Added a clear localized failure state with **Retry** for missing, unreadable, or unsupported video content.

## Compatibility and Security

- Preserved local image, audio, PDF, Excel, and text preview behavior while moving binary previews onto one canonical streamed local-file path.
- Restricted local binary preview requests to the active registered desktop workspace-shell main frame; child frames, unregistered windows, and identity-less requests receive no file bytes.
- Preserved valid legacy local-file attachments through automatic in-memory normalization and prevented unsupported local locators from being sent to runtime media execution.

## Validation

- All six required API/E2E scenarios passed at `98.1%` confidence, including real PDF.js XHR, Excel Fetch, video playback/seek/cancellation, failure/Retry recovery, migration/quarantine/reload behavior, and unauthorized-request denial.
- After integrating the latest `personal` base, focused Nuxt tests passed (`16` files / `96` tests), focused Electron tests passed (`4` files / `21` tests), and Electron transpilation passed.
- A local macOS ARM64 Electron app, DMG, and ZIP were built successfully with the README's unsigned/no-notarization command for hands-on verification.
- User verification passed: opening a local video in the built Electron candidate worked as intended.
