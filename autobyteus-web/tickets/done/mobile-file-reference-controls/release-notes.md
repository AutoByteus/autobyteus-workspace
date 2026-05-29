# Candidate Release Notes — Mobile File and Reference Controls

## User-Facing Changes

- Mobile `/mobile` **Files** now browses the selected workspace/run/team-run workspace with phone-first folder navigation, lazy folder loading, filters, and full-workspace search.
- Tapping mobile workspace files opens a read-only full-screen viewer for supported text/Markdown/code, image, audio, video, PDF, CSV, and Excel content through authorized protected-resource routes.
- Mobile Files keeps the existing **Attach** action for adding workspace paths to the active run, pending team run, or next-run draft; mobile editing and desktop file operations remain desktop-only.
- Mobile Team Communication messages now show tappable `reference_files` rows and open them through the message-owned reference viewer instead of showing only an inert count.

## Operational Notes

- Android/WebView uses the desktop/server-served `/mobile` bundle. Refresh the packaged/served `mobile-web/` output after this change; reinstalling only the Android APK does not update the mobile web JavaScript.
- Physical Android device validation was not performed in this environment. Accepted validation used component/API-route coverage plus a phone-width served `/mobile/` static bundle smoke.
- Existing repo-wide `nuxi typecheck` remains red outside this change; targeted changed-scope validation passed per the review and API/E2E reports.
