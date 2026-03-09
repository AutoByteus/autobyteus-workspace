# Future-State Runtime Call Stack Review

## Review Round 1

- Status: `Go Confirmed`
- Notes:
  - Device discovery belongs in the renderer, not Electron or the runtime worker.
  - Reusing `voiceInputStore` preserves one shared capture path for settings and composer.
  - No new runtime/server contract is required.

## Review Round 2

- Status: `Go Confirmed`
- Notes:
  - Persisting `audioInputDeviceId` in extension settings is sufficient for cross-surface reuse.
  - Permission denied, no-device, and selected-device-unavailable states can all be surfaced before runtime transcription begins.

## Conclusion

- `Go Confirmed`
- No architecture blockers found.
