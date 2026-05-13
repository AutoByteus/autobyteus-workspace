# Node Manager UI Cleanup Requirements

Status: Design-ready

## User Intent
Improve the frontend Node Manager page because the current interface feels overwhelming, busy, and too dark due to the black command backgrounds. Make the page cleaner, calmer, and easier to scan.

## Requirements
- Reduce reliance on black backgrounds in the Node Manager page, especially command/code panels.
- Preserve all current node-management information, commands, copy buttons, and forms.
- Improve page-level containment, whitespace, grouping, and scanability on wide desktop screens.
- Keep the UI compatible with the existing Nuxt/Electron runtime paths.
- Verify with an executable frontend check and a local browser screenshot.

## Acceptance Criteria
- The Node Manager page no longer appears dominated by black command blocks.
- Install and direct command areas are visually cleaner and less saturated.
- Existing command text and copy buttons remain accessible and test-selectable.
- Add Remote Node, Run Full Sync, Remote Browser Sharing, and Configured Nodes remain present.
- Relevant component tests or frontend build/type checks pass, or any unrelated blocker is documented.
- Local browser screenshot evidence shows the improved visual state.
