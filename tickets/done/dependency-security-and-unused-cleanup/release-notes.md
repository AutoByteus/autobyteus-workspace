# Release Notes — Dependency security updates

## Security

- The desktop app now runs on Electron 42.11.16 (Chromium 148, Node.js 24.19). This fixes the security issues reported for the earlier Electron 42 build.
- Security fixes in libraries the app and server use at run time, including `tar` (voice-input extraction), `undici` (local model connections), `axios` (media downloads), `protobufjs` and `markdown-it`. Every other dependency was updated to its newest compatible version.

## Housekeeping

- 17 unused dependencies were removed, which makes installs and the packaged app smaller.

## Known Limitations

- Two libraries still have known security advisories without a fix in their current versions: the server's web framework (moving to its next major version is planned) and the spreadsheet viewer's `.xlsx` reader, which has no fixed release on npm.
- The HTML sanitizer for rendered agent output stays on version 3.4.7 for now. The advisories still open for that version concern sanitizer features AutoByteus does not use.

## Notes

- No settings or saved data change. Rolling back to an earlier version is possible.
