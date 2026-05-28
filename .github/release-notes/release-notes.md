# Release Notes: Mobile File and Reference Controls

## What's New

- Mobile **Files** now browses the selected workspace, agent-run workspace, or team-run workspace with phone-first navigation.
- Mobile Files can lazy-load folders, filter the current folder, and search the full workspace through the existing file-explorer search boundary.
- Tapping a mobile workspace file opens a read-only full-screen viewer for text/Markdown/code, image, audio, video, PDF, CSV, and Excel content.
- Mobile Team Communication messages now show tappable structured `reference_files` rows instead of only an inert reference count.

## Improvements

- Mobile file viewing reuses the shared file viewer and protected-resource authorization path instead of maintaining a mobile-only text preview policy.
- Mobile Files no longer falls back to an unrelated active/first workspace when a selected run's workspace root cannot be resolved.
- Team Communication reference display names and icons are shared between desktop and mobile, keeping reference presentation consistent.
- Long-lived Phone Access, File Explorer, Content Rendering, and Agent Artifact/Team Communication docs now describe the mobile Files/reference boundaries.

## Notes

- Mobile Files remains read-only: editing, rename/delete/move/create, and desktop context menus remain out of scope.
- Android/WebView receives this through the desktop/server-served `/mobile` bundle; refresh the packaged or served `mobile-web/` output before validating on a phone.
- The verified local macOS test build was unsigned/not notarized and used for pre-release user acceptance only; official release artifacts are produced by the tag-triggered GitHub Actions workflows.
