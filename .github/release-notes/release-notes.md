# Release Notes

- Fixed a macOS Voice Input regression where the settings-level microphone test could get stuck at `0%` input while appearing to record.
- Added safer recorder startup handling so Voice Input does not enter a false recording state when the local audio engine is not actually running.
- Added a frontend `Reset Test` recovery action so users can clear a wedged Voice Input test without reinstalling the extension or restarting the app.
