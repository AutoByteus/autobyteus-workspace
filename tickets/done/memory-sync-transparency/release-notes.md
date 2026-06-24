# Release Notes: Memory Sync Transparency

- Improved the Memory Sync Source card so **Test connection** shows its testing, success, or failure result inline beside the source action controls.
- Added explicit saved-settings connection testing when the token field is blank after saving source settings, while pasted draft tokens test the draft hub URL, source id, and token together.
- Added visible **Sync now** progress with a disabled `Syncing…` state plus clear `Current job` and `Last sync` status lines.
- Made the latest sync error visible ahead of older success timestamps, so users can see the current problem without checking logs or another page.
- Preserved unsaved source form edits and pasted draft tokens while the card refreshes status in the background.
