# Handoff Summary

## Delivered
- Codex full access toggle auto-saves immediately and no longer displays an explicit save/check button.
- Streaming parser toggle auto-saves immediately and no longer displays an explicit save/check button.
- Both auto-save toggles disable while saving and revert to the previous persisted value if save fails; no extra save/status affordance is added.
- Remaining manual-save settings cards have a much stronger active save-button style when user action is required.

## Verification
- Targeted Nuxt component suite: Pass (7 files, 45 tests).
- Localization boundary guard: Pass.
- Localization literal audit: Pass.
- Browser route smoke: Settings page shell loaded; full card visual inspection blocked by missing backend proxy in standalone frontend dev mode.

## Docs
- No long-lived docs update required; see `docs-sync.md`.

## Release notes
- Created at `tickets/in-progress/settings-toggle-autosave/release-notes.md` for the requested desktop release.
