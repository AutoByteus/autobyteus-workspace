# Release Notes: Intel macOS Terminal startup

- Fixed packaged AutoByteus Terminal startup on Intel macOS where the Terminal tab could connect but never show a shell prompt because the packaged `node-pty` helper selected for x64 was not executable.
- Added macOS package validation so ARM64 and Intel x64 builds check the staged and final packaged Terminal runtime before release.
- Improved Terminal startup diagnostics so native PTY startup failures are surfaced to the UI instead of appearing as a silent hang.
