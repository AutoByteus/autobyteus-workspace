# AutoByteus 1.4.17

## What's New

- Added explicit Event Monitor absolute-path previews through the existing read-only Files/FileViewer surfaces.
- Added compact inline Event Monitor file links with generated display labels while preserving authored Markdown labels and accessibility metadata.
- Restored the visible Nodes network icon in compact left-navigation strip mode.

## Fixes

- Reject incomplete or placeholder path components such as `.`, `..`, `...`, and `…` while preserving legitimate dotted filenames.
- Keep unsupported archives, installers, application bundles, generic binaries, and unknown extensions literal and inert with no preview I/O.
- Preserve read-only, deduplicated, workspace-aware desktop/mobile preview routing and existing viewer ownership.

## Verification Notes

- Current-source repository, server, live REST, browser bootstrap/strip, Electron validator/TypeScript, and guard checks passed.
- API/E2E Round 5 remains **Blocked at 85%** because authenticated Event Monitor, paired mobile, packaged/native runtime, Windows, and full visual journeys were unavailable. These residual gaps are preserved in the archived delivery report and are not represented as passed.
