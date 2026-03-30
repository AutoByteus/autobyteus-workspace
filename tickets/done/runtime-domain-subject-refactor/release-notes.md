## What's New
- Added stronger runtime restore and history support across AutoByteus, Codex, and Claude so existing runs can be reopened more reliably after reloads and restarts.

## Improvements
- Improved team-run history and projection handling so member conversations and team configuration rehydrate more consistently from stored runs.
- Improved Codex and Claude configured-skill support so runtime skills are applied through the native runtime paths.

## Fixes
- Fixed multiple history and projection issues that could leave stored runs or team members blank after restore or page reload.
- Fixed frontend run-history contract drift so opening stored runs and teams uses the current metadata/projection schema.
