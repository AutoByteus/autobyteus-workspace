# Release Notes: Skill Source Reload

## User-Facing Changes

- Added a Skills page **Reload** action that refreshes the visible skill catalog after files in already configured skill source folders change on disk.
- Reload updates skill cards and cached skill-source counts without requiring an application restart.
- Reload shows in-progress, success, and failure feedback and avoids duplicate concurrent submissions.

## Scope Notes

- Reload is global for the configured skill catalog and bundled package skill roots.
- Reload refreshes catalog/UI state for browsing and future selections; it does not update skill content already materialized inside active agent runs.
