# Release Notes — Workspace Markdown Relative Images

## What's New

- Workspace Markdown and README previews now render relative image references automatically from the Markdown file's directory.
- Supported in-workspace paths include sibling images, nested asset folders, safe parent references, spaces, and encoded path characters.
- Desktop and Phone Access previews use the existing workspace content boundary, with authorized loading for paired mobile sessions.

## Improvements

- Image bindings now refresh safely when the open document, workspace, bound node, or Phone Access credential changes.
- External, data-backed, root-relative, and generic non-workspace Markdown image behavior remains unchanged.
- Missing or rejected images stay isolated so the surrounding Markdown and image alt text remain visible.

## Fixes

- Fixed broken `assets/...` images in workspace Markdown previews that previously required opening the document in another editor.
- Hardened workspace path containment against absolute and sibling-prefix traversal requests.
- Prevented stale authorized image responses and obsolete object URLs from surviving context or credential transitions.

## Validation

- Focused frontend, server, REST E2E, and real Chromium validation passed.
- macOS arm64 Electron packaging passed and the user verified the completed task before finalization.
