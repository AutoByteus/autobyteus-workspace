## What's New
- Stopped Agent and Team runs can now update supported model settings from Settings, with saved values applied when the same run resumes.

## Improvements
- Team model-setting edits preserve fixed run identity and divergent member choices while supporting deliberate root, nested-Team, and Agent changes.
- AutoByteus, Codex, and Claude now apply their supported saved model options consistently on the next runtime bootstrap or session restore.
- Settings clearly remains locked while a General or Application-owned run is active and safely unlocks only after verified release.

## Fixes
- Codex enum-backed options such as reasoning effort now accept current catalog values in launch and stopped-run Settings instead of incorrectly disabling Save.
- Prevented model-setting updates from writing through the General history path while the same run is still owned by an Application workflow.
- Replaced stale read-only existing-run behavior with current-schema validation, canonical failure recovery, and explicit no-write outcomes.
